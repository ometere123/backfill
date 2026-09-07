import {createClient} from "genlayer-js";
import {studionet} from "genlayer-js/chains";
import {TransactionStatus, ExecutionResult} from "genlayer-js/types";
import {config} from "../config";

export type TxStage = "AWAITING_SIGNATURE" | "SUBMITTED" | "CONSENSUS" | "FINALIZED" | "EXECUTION_CONFIRMED" | "STATE_CONFIRMED" | "USER_REJECTED" | "WRONG_NETWORK" | "RPC_UNAVAILABLE" | "CONSENSUS_FAILURE" | "EXECUTION_ERROR" | "STATE_MISMATCH" | "CONTRACT_ERROR";
export type StoredTransaction = {actionKey: string; contract: string; method: string; argsFingerprint: string; hash: string; submittedAt: number; stage: TxStage};
const STORAGE_KEY = "backfill.transactions";

export const readClient = createClient({chain: studionet});
export function writeClient(address: string, provider: NonNullable<Window["ethereum"]>) { return createClient({chain: studionet, account: address as `0x${string}`, provider}); }
export function explorerTx(hash: string) { return `${config.explorer}/tx/${hash}`; }
export async function readContract(address: string, functionName: string, args: any[] = []) { if (!address) throw new Error("Contract address is not configured in this deployment"); return readClient.readContract({address: address as `0x${string}`, functionName, args}); }
export async function readEpoch(id: number) { return readContract(config.rounds, "get_epoch", [id]); }
export type CanonicalCheck = () => Promise<void>;
export type WriteServices = {waitForFinalization?: (args: {hash: string}) => Promise<any>; actionKey?: string; contract?: string; onSubmitted?: (hash: string) => void};

function fingerprint(args: any[]) { return JSON.stringify(args, (_key, value) => typeof value === "bigint" ? `${value}n` : value); }
function readStored(): StoredTransaction[] { if (typeof window === "undefined" || !window.localStorage) return []; try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } }
function writeStored(records: StoredTransaction[]) { if (typeof window !== "undefined" && window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); }
export function getPendingTransactions() { return readStored().filter(record => !["STATE_CONFIRMED", "USER_REJECTED"].includes(record.stage)); }
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

export async function resumeAndConfirm(hash: string, onStage?: (stage: TxStage) => void, canonicalCheck?: CanonicalCheck) {
  onStage?.("CONSENSUS");
  const receipt = await readClient.waitForTransactionReceipt({hash: hash as any, status: TransactionStatus.FINALIZED});
  onStage?.("FINALIZED");
  const execution = receipt.txExecutionResultName ?? (receipt as any).execution_result ?? (receipt as any).txExecutionResult;
  if (execution !== ExecutionResult.FINISHED_WITH_RETURN && execution !== "SUCCESS") { onStage?.("EXECUTION_ERROR"); throw new Error(`Consensus finalized but contract execution failed: ${execution ?? "unknown"}`); }
  onStage?.("EXECUTION_CONFIRMED");
  await canonicalCheck?.();
  onStage?.("STATE_CONFIRMED");
  return {hash, receipt};
}

export async function writeAndConfirm(client: any, address: string, functionName: string, args: any[], value = 0n, onStage?: (stage: TxStage) => void, canonicalCheck?: CanonicalCheck, services: WriteServices = {}) {
  let hash: string | undefined;
  const actionKey = services.actionKey || `${address}:${functionName}:${fingerprint(args)}`;
  try {
    onStage?.("AWAITING_SIGNATURE");
    await client.connect("studionet");
    hash = await client.writeContract({address: address as `0x${string}`, functionName, args, value});
    if (!hash) throw new Error("Write did not return a transaction hash");
    remember({actionKey, contract: services.contract || address, method: functionName, argsFingerprint: fingerprint(args), hash, submittedAt: Date.now(), stage: "SUBMITTED"});
    services.onSubmitted?.(hash);
    onStage?.("SUBMITTED");
    onStage?.("CONSENSUS");
    const receipt = services.waitForFinalization ? await services.waitForFinalization({hash}) : await readClient.waitForTransactionReceipt({hash: hash as any, status: TransactionStatus.FINALIZED});
    onStage?.("FINALIZED");
    const execution = receipt.txExecutionResultName ?? receipt.execution_result;
    if (execution !== ExecutionResult.FINISHED_WITH_RETURN && execution !== "SUCCESS") { remember({...getTransaction(hash)!, stage: "EXECUTION_ERROR"}); onStage?.("EXECUTION_ERROR"); throw new Error(`Consensus finalized but contract execution failed: ${execution ?? "unknown"}`); }
    onStage?.("EXECUTION_CONFIRMED");
    try { await canonicalCheck?.(); } catch (error) { remember({...getTransaction(hash)!, stage: "STATE_MISMATCH"}); onStage?.("STATE_MISMATCH"); throw error; }
    remember({...getTransaction(hash)!, stage: "STATE_CONFIRMED"});
    onStage?.("STATE_CONFIRMED");
    return {hash, receipt};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.toLowerCase().includes("reject")) onStage?.("USER_REJECTED");
    else if (message.toLowerCase().includes("network")) onStage?.("WRONG_NETWORK");
    else if (message.toLowerCase().includes("consensus")) onStage?.("CONSENSUS_FAILURE");
    else if (message.toLowerCase().includes("rpc") || message.toLowerCase().includes("fetch")) onStage?.("RPC_UNAVAILABLE");
    else if (hash) onStage?.("EXECUTION_ERROR");
    else onStage?.("CONTRACT_ERROR");
    throw error;
  }
}
