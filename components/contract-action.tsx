"use client";
import {useEffect, useState} from "react";
import {config} from "@/lib/config";
import {connectWallet, normalizeWalletError} from "@/lib/genlayer/wallet";
import {explorerTx, getPendingTransactions, resumeAndConfirm, writeClient, writeAndConfirm, type TxStage} from "@/lib/genlayer/client";
import {TxLifecycle} from "@/components/tx-lifecycle";

export function ContractAction({contract, method, args, value = 0n, label, onComplete, onBeforeSubmit, actionKey}: {contract: "rounds" | "pool"; method: string; args: unknown[]; value?: bigint; label: string; onComplete?: () => Promise<void> | void; onBeforeSubmit?: () => Promise<void> | void; actionKey?: string}) {
  const [stage, setStage] = useState<TxStage>(); const [error, setError] = useState(""); const [hash, setHash] = useState(""); const [busy, setBusy] = useState(false);
  const address = contract === "rounds" ? config.rounds : config.pool;
  const effectiveActionKey = actionKey || `${address}:${method}:${JSON.stringify(args, (_key, item) => typeof item === "bigint" ? `${item}n` : item)}`;
  useEffect(() => { const pending = getPendingTransactions().find(item => item.actionKey === effectiveActionKey); if (!pending) return; setHash(pending.hash); setStage(pending.stage); setBusy(true); void resumeAndConfirm(pending.hash, setStage, async () => { await onComplete?.(); }).catch(e => setError(e instanceof Error ? e.message : "Unable to resume transaction")).finally(() => setBusy(false)); }, [effectiveActionKey]);
  async function submit() {
    if (busy) return;
    if (!address) { setError(`${contract} contract address is not configured`); return; }
    try { setBusy(true); setError(""); await onBeforeSubmit?.(); const {address: account,provider} = await connectWallet(); await writeAndConfirm(writeClient(account, provider), address, method, args, value, setStage, async () => { await onComplete?.(); }, {actionKey: effectiveActionKey, contract: address, onSubmitted: setHash}); }
    catch (e) { setError(normalizeWalletError(e)); }
    finally { setBusy(false); }
  }
  return <div><button disabled={busy} className="button coral disabled:opacity-50" onClick={submit}>{busy ? "Waiting for finality…" : label}</button><TxLifecycle stage={stage}/>{hash && <p className="mt-3 text-xs">Transaction: <a className="underline" target="_blank" rel="noreferrer" href={explorerTx(hash)}>{hash}</a></p>}{error && <p className="mt-3 text-sm text-[var(--coral)]">{error}</p>}</div>;
}
