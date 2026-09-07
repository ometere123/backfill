"use client";
import {useState} from "react";
import {useParams} from "next/navigation";
import {z} from "zod";
import {ArrowUpRight} from "lucide-react";
import {TxLifecycle} from "@/components/tx-lifecycle";
import type {TxStage} from "@/lib/genlayer/client";
import {config} from "@/lib/config";
import {connectWallet} from "@/lib/genlayer/wallet";
import {readContract, writeClient, writeAndConfirm} from "@/lib/genlayer/client";

const schema = z.object({title: z.string().min(3).max(180), type: z.string().min(2).max(120), repo: z.string().url().startsWith("https://"), primary: z.string().url().startsWith("https://"), secondary: z.string().url().startsWith("https://"), corroboration: z.string().url().startsWith("https://")});

export default function Submit() {
  const {epochId} = useParams<{epochId: string}>(); const [stage, setStage] = useState<TxStage>(); const [error, setError] = useState(""); const [claimId, setClaimId] = useState<number>(); const [hash, setHash] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const parsed = schema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!parsed.success) { setError("Add valid HTTPS URLs and a clear contribution title."); return; }
    if (!config.rounds) { setError("Rounds contract address is not configured in this deployment."); return; }
    try {
      setError(""); const account = await connectWallet(); const epoch = Number(epochId); const before: any = await readContract(config.rounds, "get_epoch", [epoch]);
      const result = await writeAndConfirm(writeClient(account, window.ethereum!), config.rounds, "submit_claim", [epoch, parsed.data.title, parsed.data.type, parsed.data.repo, parsed.data.primary, parsed.data.secondary, parsed.data.corroboration], 0n, setStage, async () => {
        const after: any = await readContract(config.rounds, "get_epoch", [epoch]); if (Number(after.claim_count) <= Number(before.claim_count)) throw new Error("Finalized write did not increase the epoch claim count");
        let found: number | undefined; for (let index = 0; index < Number(after.claim_count); index++) { const id = Number(await readContract(config.rounds, "get_epoch_claim_id", [epoch, index])); const claim: any = await readContract(config.rounds, "get_claim", [id]); if (Number(claim.epoch_id) === epoch && String(claim.claimant).toLowerCase() === account.toLowerCase() && claim.status === "SUBMITTED") found = id; }
        if (found === undefined) throw new Error("Canonical readback did not find the submitted claim"); setClaimId(found);
      }, {actionKey: `submit:${epoch}:${account.toLowerCase()}`, contract: config.rounds});
      setHash(result.hash);
    } catch (err) { setError(err instanceof Error ? err.message : "Transaction failed"); }
  }
  return <div className="mx-auto max-w-4xl px-6 pb-24 pt-14"><div className="mono text-xs uppercase tracking-[.2em]">Epoch {epochId} / contribution intake</div><h1 className="serif mt-5 text-6xl leading-none md:text-8xl">Show us what already happened.</h1><p className="mt-7 max-w-2xl text-lg leading-8">Your evidence is public, frozen at submission, and independently checked. The model never chooses a payout amount.</p><form onSubmit={submit} className="intake-form mt-14 grid gap-5"><label>Contribution title<input name="title" placeholder="A release pipeline fix that unblocked…"/></label><label>Contribution type<input name="type" placeholder="release engineering"/></label><label>Canonical repository URL<input name="repo" placeholder="https://github.com/org/repo"/></label><label>Primary contribution URL<input name="primary" placeholder="https://github.com/org/repo/pull/123"/></label><label>Secondary evidence URL<input name="secondary" placeholder="https://github.com/org/repo/releases/tag/v1.2.3"/></label><label>Corroboration URL<input name="corroboration" placeholder="https://independent.example.org/evidence"/></label>{error&&<p className="border-l-4 border-[var(--coral)] bg-[#ff5a4715] p-4 text-sm">{error}</p>}<button disabled={!!stage && !["CONTRACT_ERROR","STATE_MISMATCH"].includes(stage)} className="button primary w-fit disabled:opacity-50" type="submit">Freeze evidence <ArrowUpRight size={18}/></button></form><TxLifecycle stage={stage}/>{hash&&<p className="mt-5 break-all">Submitted transaction: {hash}</p>}{claimId&&<p className="mt-2">Claim {claimId} verified in canonical state. <a className="underline" href={`/claim/${claimId}`}>Open dossier</a></p>}</div>;
}
