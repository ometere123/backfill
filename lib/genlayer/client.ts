import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus, ExecutionResult} from "genlayer-js/types";
import {config} from "../config";
import type {EIP1193Provider} from "./wallet";

export type TxStage = "AWAITING_SIGNATURE" | "SUBMITTED" | "CONSENSUS" | "DECIDED" | "CONSENSUS_UNDETERMINED" | "FINALIZED" | "EXECUTION_CONFIRMED" | "STATE_CONFIRMED" | "USER_REJECTED" | "WRONG_NETWORK" | "RPC_UNAVAILABLE" | "CONSENSUS_FAILURE" | "EXECUTION_ERROR" | "STATE_MISMATCH" | "CONTRACT_ERROR";
export type StoredTransaction = {actionKey: string; account: string; chainId: string; contract: string; method: string; argsFingerprint: string; hash: string; submittedAt: number; stage: TxStage};
const STORAGE_KEY = "backfill.transactions";

export const readClient = createClient({chain: studionet});
export function writeClient(address: string, provider: EIP1193Provider) { return createClient({chain: studionet, account: address as `0x${string}`, provider}); }
export function explorerTx(hash: string) { return `${config.explorer}/tx/${hash}`; }
export async function readContract(address: string, functionName: string, args: any[] = []) { if (!address) throw new Error("Contract address is not configured in this deployment"); return readClient.readContract({address: address as `0x${string}`, functionName, args}); }
export async function readContractWithRetry(address: string, functionName: string, args: any[] = [], attempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await readContract(address, functionName, args); }
    catch (error) {
      lastError = error;
      const message = String(error instanceof Error ? error.message : error).toLowerCase();
      if (message.includes("does not exist") || message.includes("out of range") || message.includes("invalid") || message.includes("not configured")) throw error;
      if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Canonical RPC read unavailable");
}
export async function readEpoch(id: number) { return readContract(config.rounds, "get_epoch", [id]); }
export type CanonicalCheck = () => Promise<void>;
export type WriteServices = {waitForFinalization?: (args: {hash: string}) => Promise<any>; actionKey?: string; account?: string; chainId?: string; contract?: string; onSubmitted?: (hash: string) => void};

function fingerprint(args: any[]) { return JSON.stringify(args, (_key, value) => typeof value === "bigint" ? `${value}n` : value); }
function readStored(): StoredTransaction[] { if (typeof window === "undefined" || !window.localStorage) return []; try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function writeStored(records: StoredTransaction[]) { if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
const terminalStages = ["STATE_CONFIRMED", "USER_REJECTED", "CONSENSUS_UNDETERMINED", "EXECUTION_ERROR", "STATE_MISMATCH", "CONTRACT_ERROR"];
export function getPendingTransactions(account?: string, chainId?: string) { return readStored().filter(record => !terminalStages.includes(record.stage) && (!account || record.account?.toLowerCase()===account.toLowerCase()) && (!chainId || record.chainId?.toLowerCase()===chainId.toLowerCase())); }
export function getTransaction(hash: string) { return readStored().find(record => record.hash === hash); }
function remember(record: StoredTransaction) { const records = readStored().filter(item => item.actionKey !== record.actionKey); records.push(record); writeStored(records); }

export async function getTriggeredTransactionIds(hash: string) { return readClient.getTriggeredTransactionIds({hash: hash as any}); }
export function selectTriggeredTransfer(parentHash: string, ids: string[], transactions: any[], recipient: string, amount: bigint) {
  const wanted = recipient.toLowerCase();
  return ids.map((hash, index) => ({hash, transaction: transactions[index]})).find(({transaction}) => {
    const actualRecipient = String(transaction?.recipient ?? transaction?.to ?? transaction?.message?.recipient ?? "").toLowerCase();
    const actualValue = transaction?.value ?? transaction?.message?.value;
    try { return actualRecipient === wanted && BigInt(actualValue) === amount; } catch { return false; }
  });
}
export async function findTriggeredTransfer(parentHash: string, recipient: string, amount: bigint) {
  const ids = await getTriggeredTransactionIds(parentHash);
  const transactions = await Promise.all(ids.map(hash => readClient.getTransaction({hash: hash as any})));
  return selectTriggeredTransfer(parentHash, ids as string[], transactions, recipient, amount);
}

export class TransactionOutcomeError extends Error {
  constructor(public readonly stage: TxStage, message: string) { super(message); this.name = "TransactionOutcomeError"; }
}

async function waitForFinalized(hash: string, onStage?: (stage: TxStage) => void) {
  onStage?.("CONSENSUS");
  const decided = await readClient.waitForTransactionReceipt({hash: hash as any, status: TransactionStatus.ACCEPTED});
  const decision = String((decided as any).statusName ?? "");
  if (decision === "UNDETERMINED") throw new TransactionOutcomeError("CONSENSUS_UNDETERMINED", "Validators could not reach majority. This transaction was not executed.");
  if (decision === "CANCELED" || decision === "VALIDATORS_TIMEOUT" || decision === "LEADER_TIMEOUT") throw new TransactionOutcomeError("CONSENSUS_FAILURE", `Consensus ended with ${decision}.`);
  onStage?.("DECIDED");
  const receipt = decision === "FINALIZED" ? decided : await readClient.waitForTransactionReceipt({hash: hash as any, status: TransactionStatus.FINALIZED});
  onStage?.("FINALIZED");
  return receipt;
}

export async function resumeAndConfirm(hash: string, onStage?: (stage: TxStage) => void, canonicalCheck?: CanonicalCheck) {
  try {
    const receipt = await waitForFinalized(hash, onStage);
    const execution = receipt.txExecutionResultName ?? (receipt as any).execution_result ?? (receipt as any).txExecutionResult;
    if (execution !== ExecutionResult.FINISHED_WITH_RETURN && execution !== "SUCCESS") throw new TransactionOutcomeError("EXECUTION_ERROR", `Transaction finalized, but contract execution failed: ${execution ?? "unknown"}`);
    onStage?.("EXECUTION_CONFIRMED");
    try { await canonicalCheck?.(); } catch (error) { throw new TransactionOutcomeError("STATE_MISMATCH", error instanceof Error ? `Transaction succeeded, but canonical state verification failed: ${error.message}` : "Transaction succeeded, but canonical state verification failed."); }
    onStage?.("STATE_CONFIRMED");
    return {hash, receipt};
  } catch (error) {
    if (error instanceof TransactionOutcomeError && getTransaction(hash)) remember({...getTransaction(hash)!, stage: error.stage});
    throw error;
  }
}

export async function writeAndConfirm(client: any, address: string, functionName: string, args: any[], value = 0n, onStage?: (stage: TxStage) => void, canonicalCheck?: CanonicalCheck, services: WriteServices = {}) {
  let hash: string | undefined;
  const actionKey = services.actionKey || `${address}:${functionName}:${fingerprint(args)}`;
  try {
    onStage?.("AWAITING_SIGNATURE");
    hash = await client.writeContract({address: address as `0x${string}`, functionName, args, value});
    if (!hash) throw new Error("Write did not return a transaction hash");
    remember({actionKey, account: services.account || "", chainId: services.chainId || "0x0", contract: services.contract || address, method: functionName, argsFingerprint: fingerprint(args), hash, submittedAt: Date.now(), stage: "SUBMITTED"});
    services.onSubmitted?.(hash);
    onStage?.("SUBMITTED");
    onStage?.("CONSENSUS");
    const receipt = services.waitForFinalization ? await services.waitForFinalization({hash}) : await waitForFinalized(hash, onStage);
    onStage?.("FINALIZED");
    const execution = receipt.txExecutionResultName ?? receipt.execution_result;
    if (String((receipt as any).statusName ?? "") === "UNDETERMINED") { remember({...getTransaction(hash)!, stage: "CONSENSUS_UNDETERMINED"}); onStage?.("CONSENSUS_UNDETERMINED"); throw new TransactionOutcomeError("CONSENSUS_UNDETERMINED", "Validators could not reach majority. This transaction was not executed."); }
    if (execution !== ExecutionResult.FINISHED_WITH_RETURN && execution !== "SUCCESS") { remember({...getTransaction(hash)!, stage: "EXECUTION_ERROR"}); onStage?.("EXECUTION_ERROR"); throw new TransactionOutcomeError("EXECUTION_ERROR", `Transaction finalized, but contract execution failed: ${execution ?? "unknown"}`); }
    onStage?.("EXECUTION_CONFIRMED");
    try { await canonicalCheck?.(); } catch (error) { remember({...getTransaction(hash)!, stage: "STATE_MISMATCH"}); onStage?.("STATE_MISMATCH"); throw new TransactionOutcomeError("STATE_MISMATCH", error instanceof Error ? `Transaction finalized, but canonical state did not match the expected transition: ${error.message}` : "Transaction finalized, but canonical state did not match the expected transition."); }
    remember({...getTransaction(hash)!, stage: "STATE_CONFIRMED"});
    onStage?.("STATE_CONFIRMED");
    return {hash, receipt};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    let failureStage: TxStage;
    if (error instanceof TransactionOutcomeError) failureStage = error.stage;
    else if (message.toLowerCase().includes("reject")) failureStage = "USER_REJECTED";
    else if (message.toLowerCase().includes("network")) failureStage = "WRONG_NETWORK";
    else if (message.toLowerCase().includes("consensus")) failureStage = "CONSENSUS_FAILURE";
    else if (message.toLowerCase().includes("rpc") || message.toLowerCase().includes("fetch")) failureStage = "RPC_UNAVAILABLE";
    else if (hash) failureStage = "EXECUTION_ERROR";
    else failureStage = "CONTRACT_ERROR";
    if (hash && getTransaction(hash)) remember({...getTransaction(hash)!, stage: failureStage});
    onStage?.(failureStage);
    throw error;
  }
}
