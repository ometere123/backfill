"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ContractAction } from "@/components/contract-action";
import { config } from "@/lib/config";
import { readContract } from "@/lib/genlayer/client";

const formatLocal = (seconds: number) => {
  const date = new Date(seconds * 1000);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const formatUtc = (value: string) => {
  if (!value) return "UTC —";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "UTC —" : `UTC ${date.toISOString().slice(0, 16).replace("T", " ")}`;
};
const unix = (value: string) => Math.floor(new Date(value).getTime() / 1000);

function CreateEpoch() {
  const schedule = () => {
    const now = Math.floor(Date.now() / 1000);
    return { work: formatLocal(now - 60), open: formatLocal(now + 120), close: formatLocal(now + 1800), challenge: formatLocal(now + 3600) };
  };
  const initial = useMemo(() => schedule(), []);
  const [title, setTitle] = useState("Backfill live acceptance epoch");
  const [description, setDescription] = useState("Retroactive maintenance work with public proof");
  const [types, setTypes] = useState("software maintenance");
  const [projectScope, setProjectScope] = useState("Backfill protocol");
  const [minSources, setMinSources] = useState("2");
  const [workCutoff, setWorkCutoff] = useState(initial.work);
  const [claimsOpen, setClaimsOpen] = useState(initial.open);
  const [claimsClose, setClaimsClose] = useState(initial.close);
  const [challengeClose, setChallengeClose] = useState(initial.challenge);
  const [beforeCount, setBeforeCount] = useState(0);
  const [created, setCreated] = useState(0);

  const loadCount = async () => Number(await readContract(config.rounds, "get_epoch_count"));
  const minimumSources = Number(minSources);
  const values = [unix(workCutoff), unix(claimsOpen), unix(claimsClose), unix(challengeClose)];
  const timelineErrors = {
    work: workCutoff && claimsOpen && values[0] >= values[1] ? "Must be before claims open." : "",
    open: claimsOpen && claimsClose && values[1] >= values[2] ? "Must be before claims close." : "",
    close: claimsClose && challengeClose && values[2] >= values[3] ? "Must be before challenge close." : "",
  };
  const validation = {
    title: title.trim() ? "" : "Title is required.",
    description: description.trim() ? "" : "Description is required.",
    types: types.trim() ? "" : "Scope is required.",
    project: projectScope.trim() ? "" : "Project is required.",
    sources: Number.isInteger(minimumSources) && minimumSources >= 1 && minimumSources <= 4 ? "" : "Use 1–4 sources.",
  };
  const formError = Object.values({ ...validation, ...timelineErrors }).find(Boolean);
  const valid = !formError && values.every(Number.isFinite);
  const prepare = async () => { if (!valid) throw new Error(formError || "Complete the highlighted fields."); setBeforeCount(await loadCount()); };
  const complete = async () => { const count = await loadCount(); if (count !== beforeCount + 1) throw new Error("Epoch creation canonical readback mismatch"); setCreated(count); };

  const input = (id: string, label: string, value: string, setValue: (value: string) => void, error?: string, helper?: string) => (
    <div>
      <label className="epoch-label" htmlFor={id}>{label}</label>
      <input id={id} className="field epoch-input mt-2 w-full" value={value} onChange={(event) => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error || helper ? `${id}-hint` : undefined} />
      {(error || helper) && <p id={`${id}-hint`} className={`epoch-hint ${error ? "epoch-error" : ""}`}>{error || helper}</p>}
    </div>
  );
  const deadline = (id: string, number: string, label: string, description: string, value: string, setValue: (value: string) => void, error?: string) => (
    <div className="timeline-item">
      <div className="mono text-xs text-[var(--coral)]">{number}</div>
      <label className="epoch-label mt-2" htmlFor={id}>{label}</label>
      <p className="mt-2 text-sm leading-6 text-[#5e574d]">{description}</p>
      <input id={id} className="field epoch-input mt-4 w-full" type="datetime-local" value={value} onChange={(event) => setValue(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint`} />
      <p id={`${id}-hint`} className={`epoch-hint ${error ? "epoch-error" : ""}`}>{error || formatUtc(value)}</p>
    </div>
  );

  return <section className="epoch-form mt-16" aria-labelledby="create-epoch-heading">
    <div className="epoch-form-header">
      <div><div className="mono text-xs uppercase tracking-[.2em]">Create a new epoch</div><h2 id="create-epoch-heading" className="serif mt-3 text-4xl md:text-5xl">Publish a funding round.</h2><p className="mt-3 max-w-2xl text-sm leading-6">Freeze the scope, evidence window and challenge period before opening the round.</p></div>
      <div className="epoch-form-mark mono text-xs uppercase tracking-[.14em]">Studionet<br />Public ledger entry</div>
    </div>
    <div className="epoch-form-body">
      <section aria-labelledby="round-details-heading"><div id="round-details-heading" className="mono text-xs uppercase tracking-[.18em]">Round details</div><div className="mt-5 grid gap-5 md:grid-cols-2">
        {input("epoch-title", "Title", title, setTitle, validation.title)}
        {input("epoch-description", "Description", description, setDescription, validation.description)}
        {input("epoch-types", "Scope", types, setTypes, validation.types, "Contribution types recorded with the round.")}
        {input("epoch-project", "Project", projectScope, setProjectScope, validation.project)}
        <div className="md:max-w-xs"><label className="epoch-label" htmlFor="epoch-min-sources">Minimum independent sources</label><input id="epoch-min-sources" className="field epoch-input mt-2 w-full" type="number" min="1" max="4" step="1" value={minSources} onChange={(event) => setMinSources(event.target.value)} aria-invalid={Boolean(validation.sources)} aria-describedby="epoch-min-sources-hint" /><p id="epoch-min-sources-hint" className={`epoch-hint ${validation.sources ? "epoch-error" : ""}`}>{validation.sources || "Required grounded sources for a normal claim."}</p></div>
      </div></section>
      <section className="mt-12 border-t border-[var(--ink)] pt-7" aria-labelledby="timeline-heading"><div className="flex flex-wrap items-start justify-between gap-4"><div><div id="timeline-heading" className="mono text-xs uppercase tracking-[.18em]">Round timeline</div><p className="mt-3 text-sm text-[#5e574d]">Times are shown in your local timezone and converted to protocol Unix seconds when submitted.</p></div><button className="button button-secondary" type="button" onClick={() => { const next = schedule(); setWorkCutoff(next.work); setClaimsOpen(next.open); setClaimsClose(next.close); setChallengeClose(next.challenge); }}>Use live-demo schedule</button></div><p className="mono mt-3 text-[10px] uppercase tracking-[.12em] text-[#81796e]">Sets a short test window from the current time.</p><div className="timeline-grid mt-6">
        {deadline("work-cutoff", "01", "Work cutoff", "Completed work must pre-date this point", workCutoff, setWorkCutoff, timelineErrors.work)}
        {deadline("claims-open", "02", "Claims open", "Contributors can begin submitting", claimsOpen, setClaimsOpen, timelineErrors.open)}
        {deadline("claims-close", "03", "Claims close", "New submissions stop", claimsClose, setClaimsClose, timelineErrors.close)}
        {deadline("challenge-close", "04", "Challenge close", "Final counter-evidence deadline", challengeClose, setChallengeClose)}
      </div></section>
      <details className="advanced-details mt-10"><summary>Advanced protocol details</summary><div className="advanced-ledger mt-4"><div>Unix timestamps</div><div>work_cutoff     {unix(workCutoff)}</div><div>claims_open     {unix(claimsOpen)}</div><div>claims_close    {unix(claimsClose)}</div><div>challenge_close {unix(challengeClose)}</div><div className="mt-3">min_sources     {minimumSources}</div><div>chain_id        61999</div><div>rounds          {config.rounds || "MISSING"}</div></div></details>
      <div className="epoch-form-footer mt-10"><div className="review-line mono" aria-label="Epoch review summary"><span>Studionet 61999</span><span>{minimumSources || "—"} minimum sources</span><span>4 protocol deadlines</span></div><div className="epoch-action"><ContractAction contract="rounds" method="create_epoch" args={[title, description, types, projectScope, unix(workCutoff), unix(claimsOpen), unix(claimsClose), unix(challengeClose), 10, minimumSources]} label="Create epoch →" disabled={!valid} actionKey={`create-epoch:${title}:${description}:${claimsOpen}:${claimsClose}:${challengeClose}:${minimumSources}`} onBeforeSubmit={prepare} onComplete={complete} /></div></div>
      {!valid && <p className="epoch-error mt-4 text-right text-sm">Complete the highlighted fields and timeline before publishing this round.</p>}
      {created > 0 && <p className="mt-5 text-sm">Canonical epoch count is now {created}. <Link className="underline" href={`/epoch/${created}`}>Open epoch {created}</Link></p>}
    </div>
  </section>;
}

export default function Epochs() {
  const [ids, setIds] = useState<number[]>([]); const [error, setError] = useState("");
  const load = () => readContract(config.rounds, "get_epoch_count").then((value) => setIds(Array.from({ length: Number(value) }, (_, index) => index + 1))).catch((errorValue) => setError(errorValue instanceof Error ? errorValue.message : "Unable to read epochs"));
  useEffect(() => { void load(); }, []);
  return <div className="mx-auto max-w-7xl px-6 pb-24 pt-14"><div className="mono text-xs uppercase tracking-[.25em]">The public ledger / epochs</div><h1 className="serif mt-5 text-6xl md:text-8xl">Rounds with a memory.</h1><p className="mt-6 max-w-2xl text-lg leading-8">Authoritative epoch records from the configured Rounds contract.</p>{error ? <p className="mt-12 border-l-4 border-[var(--coral)] p-4">{error}</p> : <><div className="mt-16 grid gap-8 md:grid-cols-2">{ids.length ? ids.map((id) => <Link href={`/epoch/${id}`} className="plate block p-7" key={id}><div className="mono text-xs">EPOCH {id}</div><h2 className="serif mt-16 text-4xl">Read canonical epoch state</h2><p className="mt-4">Open deadlines, claim counts, weights and settlement actions.</p></Link>) : <p className="mono">No epochs have been created on this deployment.</p>}</div><CreateEpoch /></>}</div>;
}
