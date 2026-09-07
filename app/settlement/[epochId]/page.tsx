"use client";
import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import {config} from "@/lib/config";
import {readContract} from "@/lib/genlayer/client";
import {ContractAction} from "@/components/contract-action";

export default function Settlement() {
  const {epochId} = useParams<{epochId: string}>();
  const [epoch, setEpoch] = useState<any>();
  const [pool, setPool] = useState<any>();
  const [credit, setCredit] = useState(0);
  const [refund, setRefund] = useState<any>();
  const [account, setAccount] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const a = localStorage.getItem("backfill.account") || "";
      setAccount(a);
      const id = Number(epochId);
      const [e, p] = await Promise.all([
        readContract(config.rounds, "get_epoch", [id]),
        readContract(config.pool, "get_pool", [id]),
      ]);
      setEpoch(e); setPool(p);
      if (a) {
        setCredit(Number(await readContract(config.pool, "get_funder_credit", [id, a])));
        setRefund(await readContract(config.pool, "get_refund_settlement", [id, a]));
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to read settlement state"); }
  };
  useEffect(() => { void load(); }, [epochId]);
  const canRefund = Boolean(epoch && pool && account && pool.status === "POOL_FINALIZED" && Number(epoch.total_weight) === 0 && credit > 0 && (!refund || refund.status === "NONE"));
  return <div className="mx-auto max-w-6xl px-6 pb-24 pt-14">
    <div className="mono text-xs uppercase">Epoch {epochId} / settlement</div>
    <h1 className="serif mt-5 text-7xl leading-none">Canonical settlement state.</h1>
    {error ? <p className="mt-10 border-l-4 border-[var(--coral)] p-4">{error}</p> : !epoch || !pool ? <p className="mt-10 mono">Reading pool and epoch state…</p> : <>
      <div className="mt-12 grid gap-6 md:grid-cols-4">{[["Epoch", epoch.status], ["Pool", pool.status], ["Funded", String(pool.funded)], ["Reserved", String(Number(pool.claimed || 0) + Number(pool.refunded || 0))]].map(([k, v]) => <div className="plate p-5" key={k}><div className="mono text-xs uppercase">{k}</div><div className="serif mt-3 text-3xl break-all">{v}</div></div>)}</div>
      <div className="mt-10 flex flex-wrap gap-4">
        {epoch.status === "FINALIZED" && pool.status === "OPEN" && <ContractAction contract="pool" method="finalize_pool" args={[Number(epochId)]} label="Finalize pool" onComplete={load} />}
        {canRefund && <ContractAction contract="pool" method="refund_unallocated" args={[Number(epochId)]} label="Refund zero-weight pool" onComplete={load} actionKey={`refund:${epochId}:${account.toLowerCase()}`} />}
        <div className="plate p-5 text-sm">Connected funder credit: {credit} wei<br />Refund settlement: {refund?.status || "NONE"}{refund?.identity && <><br />Identity: {refund.identity}</>}</div>
      </div>
      <p className="mt-5 text-sm">Native payout/refund transfers are emitted as triggered child transactions. The page preserves the parent hash and settlement identity; child receipt correlation is performed from the transaction record.</p>
    </>}
  </div>;
}
