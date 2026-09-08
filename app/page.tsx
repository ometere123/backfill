"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, CircleDollarSign, ShieldCheck } from "lucide-react";
import { config } from "@/lib/config";
import { readContract } from "@/lib/genlayer/client";

export default function Home() {
  const [epochCount, setEpochCount] = useState<number>();
  useEffect(() => { readContract(config.rounds, "get_epoch_count").then((value) => setEpochCount(Number(value))).catch(() => setEpochCount(undefined)); }, []);

  return <div className="grain">
    <section className="mx-auto max-w-7xl px-6 pb-16 pt-7 md:pb-20 md:pt-10">
      <div className="grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-end">
        <div><div className="mono mb-6 text-xs uppercase tracking-[.25em]">Retroactive public goods</div><h1 className="serif max-w-4xl text-5xl leading-[.96] md:text-7xl">Fund the work after it proves its worth.</h1><p className="mt-6 max-w-xl text-base leading-7 md:text-lg">No promise deck. No pre-award pitch. Completed work enters. Public evidence decides.</p><div className="mt-7 flex flex-wrap gap-3"><Link className="button primary" href="/epochs">Browse the ledger <ArrowUpRight size={17} /></Link><Link className="button" href="/docs">How Backfill works</Link></div></div>
        <div className="plate relative p-5 md:rotate-2"><div className="mono text-xs uppercase">Backfill ledger / live</div><div className="my-6 flex items-center justify-between"><span className="serif text-4xl">←</span><div className="h-px flex-1 bg-[var(--ink)]" /><span className="serif text-4xl">→</span></div><p className="serif text-2xl leading-tight">A public record for the maintenance that keeps the commons alive.</p><div className="mt-7 grid grid-cols-3 gap-2 text-center mono text-[10px] uppercase"><span className="border border-[var(--ink)] p-2">Evidence</span><span className="border border-[var(--ink)] p-2">Consensus</span><span className="border border-[var(--ink)] p-2">Settlement</span></div></div>
      </div>
      <div className="mt-10 grid gap-3 border-y border-[var(--ink)] py-3 text-xs uppercase tracking-[.16em] md:grid-cols-4"><span>STUDIONET {config.chainId}</span><span>{epochCount === undefined ? "Ledger unavailable" : `${epochCount} epoch${epochCount === 1 ? "" : "s"}`}</span><a className="underline" href={`${config.explorer}/address/${config.rounds}`} target="_blank">Rounds → Explorer</a><a className="underline" href={`${config.explorer}/address/${config.pool}`} target="_blank">Pool → Explorer</a></div>
    </section>
    <section className="border-y border-[var(--ink)] bg-[#e9e0d1]"><div className="mx-auto grid max-w-7xl gap-0 md:grid-cols-3">{[[BookOpen, "Already happened", "Claims point to public work that predates the round."], [ShieldCheck, "Evidence decides", "Validators independently read the same public sources."], [CircleDollarSign, "Weights settle", "Impact becomes a bounded weight. The pool settles deterministically."]].map(([Icon, title, body], index) => { const I = Icon as typeof BookOpen; return <div key={index} className="border-r border-[var(--ink)] p-6 last:border-r-0"><I size={20} /><h2 className="serif mt-6 text-2xl">{title as string}</h2><p className="mt-3 leading-6">{body as string}</p></div>; })}</div></section>
    <section className="mx-auto max-w-7xl px-6 py-14 md:py-16"><div className="mono text-xs uppercase tracking-[.2em]">How a round moves</div><div className="mt-6 grid gap-4 md:grid-cols-4">{[["01", "Freeze scope"], ["02", "Submit completed work"], ["03", "Verify public evidence"], ["04", "Settle the funded pool"]].map(([number, title]) => <div className="border-t-2 border-[var(--ink)] pt-3" key={number}><span className="mono text-xs">{number}</span><h2 className="serif mt-6 text-2xl">{title}</h2></div>)}</div></section>
  </div>;
}
