"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ContractAction } from "@/components/contract-action";
import { config } from "@/lib/config";
import { readContract, readContractWithRetry } from "@/lib/genlayer/client";
import { formatGen, genToWei } from "@/lib/genlayer/amounts";
import { shortAddress } from "@/lib/genlayer/wallet";
import { useWallet } from "@/components/wallet-provider";

type Epoch = { title: string; scope: string; status: string; claim_count: number; total_weight: number; work_cutoff: number; claims_open: number; claims_close: number; challenge_close: number; min_sources: number };
type Claim = { id: number; title: string; status: string; claimant: string; impact_band: string; weight: number };
const date = (value: number) => new Date(value * 1000).toISOString();

export function EpochState({ id }: { id: number }) {
  const [epoch, setEpoch] = useState<Epoch>();
  const [pool, setPool] = useState<any>();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimsReadError, setClaimsReadError] = useState("");
  const [credit, setCredit] = useState<bigint>(0n);
  const [error, setError] = useState("");
  const [poolReadError, setPoolReadError] = useState("");
  const [creditReadError, setCreditReadError] = useState("");
  const { address } = useWallet();

  const load = async () => {
    try {
      const current = await readContract(config.rounds, "get_epoch", [id]) as Epoch;
      setEpoch(current);
      try {
        const rows: Claim[] = [];
        for (let index = 0; index < Number(current.claim_count); index += 1) {
          const claimId = Number(await readContract(config.rounds, "get_epoch_claim_id", [id, index]));
          rows.push({ ...await readContract(config.rounds, "get_claim", [claimId]) as Claim, id: claimId });
        }
        setClaims(rows);
        setClaimsReadError("");
      } catch (claimsError) {
        setClaimsReadError(claimsError instanceof Error ? claimsError.message : "Claim records could not be verified.");
      }
      try {
        const currentPool = await readContractWithRetry(config.pool, "get_pool", [id]);
        setPool(currentPool);
        setPoolReadError("");
      } catch (poolError) {
        const message = poolError instanceof Error ? poolError.message : String(poolError);
        if (message.toLowerCase().includes("does not exist")) { setPool(undefined); setPoolReadError(""); }
        else setPoolReadError("Pool state could not be verified; showing the last known canonical value.");
      }
      if (address) {
        try {
          setCredit(BigInt(String(await readContractWithRetry(config.pool, "get_funder_credit", [id, address]))));
          setCreditReadError("");
        } catch {
          setCreditReadError("Funder credit could not be verified right now.");
        }
      } else {
        setCredit(0n); setCreditReadError("");
      }
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : "Unable to read epoch");
    }
  };

  useEffect(() => { void load(); }, [id, address]);

  if (error) return <p className="border-l-4 border-[var(--coral)] p-4">{error}</p>;
  if (!epoch) return <p className="mono">Reading canonical epoch state…</p>;

  const now = Math.floor(Date.now() / 1000);
  const openReady = epoch.status === "DRAFT" && now >= Number(epoch.claims_open);
  const beforeClose = now < Number(epoch.claims_close);
  const settlementReady = Boolean(pool);
  const claimsTerminal = claims.every((claim) => ["ELIGIBLE", "INELIGIBLE", "INCONCLUSIVE"].includes(claim.status));
  const confirmFund = async () => {
    const after: any = await readContractWithRetry(config.pool, "get_pool", [id]);
    const currentCredit = address ? BigInt(String(await readContractWithRetry(config.pool, "get_funder_credit", [id, address]))) : 0n;
    if (BigInt(String(after.funded)) !== BigInt(String(pool?.funded || 0)) + genToWei(1) || currentCredit !== credit + genToWei(1)) throw new Error("Funding canonical readback mismatch");
    await load();
  };

  const actionArea = () => {
    if (epoch.status === "DRAFT" && openReady) return <><p className="mt-3 max-w-xl text-sm leading-6">This epoch is currently in DRAFT. Open it to begin accepting claims.</p><div className="mt-5"><ContractAction contract="rounds" method="open_epoch" args={[id]} label="Open epoch" onComplete={load} /></div></>;
    if (epoch.status === "DRAFT") return <><p className="mt-3 max-w-xl text-sm leading-6">This epoch is currently in DRAFT and will open when the claims window begins.</p><span className="button mt-5 cursor-default opacity-60">Opens in {Math.max(0, Number(epoch.claims_open) - now)}s</span></>;
    if ((epoch.status === "CLAIMS_OPEN" || epoch.status === "EVALUATING") && beforeClose) return <><p className="mt-3 max-w-xl text-sm leading-6">Funding is open while this round accepts claims. Contributors may submit completed work before the claims deadline.</p><div className="mt-5 flex flex-wrap items-start gap-3"><ContractAction contract="pool" method="fund" args={[id]} value={genToWei(1)} label="Fund pool with 1 GEN" onComplete={confirmFund} /><Link className="button primary self-start" href={`/submit/${id}`}>Submit a claim</Link></div></>;
    if (epoch.status === "CLAIMS_OPEN" && now >= Number(epoch.claims_close) && Number(epoch.claim_count) === 0) return <><p className="mt-3 max-w-xl text-sm leading-6">The claims window closed without submissions. Advance this empty round into its challenge phase so the funded pool can settle safely.</p><div className="mt-5"><ContractAction contract="rounds" method="advance_empty_epoch" args={[id]} label="Advance empty epoch" onComplete={load} /></div></>;
    if (epoch.status === "EVALUATING" && now >= Number(epoch.claims_close) && claimsTerminal) return <><p className="mt-3 max-w-xl text-sm leading-6">Claims are closed and every claim has a terminal result. Open the challenge window for independent counter-evidence.</p><div className="mt-5"><ContractAction contract="rounds" method="open_challenge" args={[id]} label="Open challenge window" onComplete={load} /></div></>;
    if (epoch.status === "CHALLENGE" && now >= Number(epoch.challenge_close) && claimsTerminal) return <><p className="mt-3 max-w-xl text-sm leading-6">The challenge deadline has passed and all claims are terminal. Finalize the epoch allocation.</p><div className="mt-5"><ContractAction contract="rounds" method="finalize_epoch" args={[id]} label="Finalize epoch" onComplete={load} /></div></>;
    if (epoch.status === "FINALIZED") return <><p className="mt-3 max-w-xl text-sm leading-6">This epoch is finalized. The pool can now complete its settlement step.</p><div className="mt-5"><ContractAction contract="pool" method="finalize_pool" args={[id]} label="Finalize pool" onComplete={load} /></div></>;
    return <p className="mt-3 max-w-xl text-sm leading-6">The next lifecycle action will become available when the canonical deadlines and claim states permit it.</p>;
  };

  return <div>
    <div className="mono text-xs uppercase tracking-[.2em]">Epochs / Epoch {id}</div>
    <div className="mt-4 flex flex-wrap justify-between gap-4 mono text-xs uppercase"><span>{epoch.status}</span><span>Work cutoff {date(Number(epoch.work_cutoff))}</span></div>
    <h1 className="serif mt-6 max-w-5xl text-6xl leading-none md:text-8xl">{epoch.title}</h1>
    <p className="mt-8 max-w-2xl text-xl leading-8">{epoch.scope}</p>
    <div className="mt-10 grid gap-4 md:grid-cols-4">{[["Status", epoch.status], ["Claims", String(epoch.claim_count)], ["Total weight", String(epoch.total_weight)], ["Min sources", String(epoch.min_sources)]].map(([key, value]) => <div className="plate p-5" key={key}><div className="mono text-xs uppercase">{key}</div><div className="serif mt-3 text-3xl">{value}</div></div>)}</div>

    <section className="mt-12 border-t-2 border-[var(--ink)] pt-5" aria-labelledby="claims-heading">
      <div id="claims-heading" className="mono text-xs uppercase">Claims in this epoch</div>
      <div className="mt-4 grid gap-3">{claims.length ? claims.map((claim) => <Link className="plate block p-4" href={`/claim/${claim.id}`} key={claim.id}><div className="mono text-xs">CLAIM {claim.id} / {claim.status}</div><div className="serif mt-2 text-2xl">{claim.title}</div><div className="mt-2 text-sm">{shortAddress(claim.claimant)} · {claim.impact_band} · weight {claim.weight}</div></Link>) : Number(epoch.claim_count) > 0 ? <p className="border-l-4 border-[var(--coral)] p-4 text-sm">{claimsReadError || "Claims are indexed, but their canonical dossiers are not available yet."}</p> : <p className="text-sm">No claims have been submitted.</p>}</div>
    </section>

    <div className="mt-12 grid gap-10 border-t-2 border-[var(--ink)] pt-6 md:grid-cols-2">
      <section aria-labelledby="configuration-heading"><div id="configuration-heading" className="mono text-xs uppercase">Contract configuration</div><div className="mt-5 space-y-3 text-sm"><p className="break-all"><span className="mono mr-2 text-xs uppercase text-[#81796e]">Rounds</span>{config.rounds || "MISSING"}</p><p className="break-all"><span className="mono mr-2 text-xs uppercase text-[#81796e]">Pool</span>{config.pool || "MISSING"}</p><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">State</span>{poolReadError || <>Pool {pool?.status || "not created"}</>}</p><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">Funded</span>{poolReadError ? "—" : formatGen(BigInt(pool?.funded || 0))}</p><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">Credit</span>{creditReadError || formatGen(credit)}</p></div></section>
      <section aria-labelledby="deadlines-heading"><div id="deadlines-heading" className="mono text-xs uppercase">Deadlines</div><div className="mt-5 space-y-3 text-sm"><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">Claims open</span>{date(Number(epoch.claims_open))}</p><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">Claims close</span>{date(Number(epoch.claims_close))}</p><p><span className="mono mr-2 text-xs uppercase text-[#81796e]">Challenge close</span>{date(Number(epoch.challenge_close))}</p></div></section>
    </div>

    <section className="next-action mt-10 border-t-2 border-[var(--ink)] pt-6" aria-labelledby="next-action-heading"><div className="mono text-xs uppercase tracking-[.18em]">Next action</div><h2 id="next-action-heading" className="serif mt-3 text-3xl">Move this round forward.</h2>{actionArea()}{settlementReady && <Link className="button mt-5 ml-2 inline-block" href={`/settlement/${id}`}>View pool &amp; settlement</Link>}</section>
  </div>;
}
