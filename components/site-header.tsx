"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, Wallet, X } from "lucide-react";
import { useWallet } from "@/components/wallet-provider";
import { shortAddress } from "@/lib/genlayer/wallet";

export function SiteHeader() {
  const { address, status, error, connect, switchToStudionet, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const walletMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!details) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (walletMenuRef.current && !walletMenuRef.current.contains(event.target as Node)) setDetails(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetails(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [details]);

  return <header className="site-header mx-auto max-w-7xl px-6 py-4 md:py-5">
    <div className="flex items-center justify-between">
      <Link href="/" className="serif text-2xl font-bold md:text-3xl">Backfill<span className="text-[var(--coral)]">.</span></Link>
      <nav className="hidden gap-6 text-sm font-bold md:flex"><Link href="/epochs">Epochs</Link><Link href="/me">My work</Link><Link href="/docs">Method</Link></nav>
      <div className="flex items-center gap-2">
        {address && <div ref={walletMenuRef} className="wallet-menu-anchor">
          <button className={`button wallet-trigger ${status === "WRONG_NETWORK" ? "wallet-trigger-wrong" : ""}`} onClick={() => setDetails(!details)} aria-expanded={details} aria-haspopup="menu" aria-label={status === "WRONG_NETWORK" ? `Wrong network, ${address}` : `Connected wallet ${address}`}>
            <span className="wallet-dot" aria-hidden="true" /><span className="truncate">{shortAddress(address)}</span><ChevronDown className={`wallet-chevron ${details ? "wallet-chevron-open" : ""}`} size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
          {details && <div className="wallet-menu border border-[var(--ink)] bg-[var(--paper)] p-4 text-sm" role="menu" aria-label="Wallet menu">
            <div className="mono text-xs uppercase">{status === "WRONG_NETWORK" ? "Wrong network" : "Connected"}</div>
            <div className="mt-2 break-all">{address}</div>
            <div className="mt-1">{status === "CONNECTED" ? "GenLayer Studionet · chain 61999" : "Switch to Studionet to enable writes"}</div>
            <button className="button mt-4" role="menuitem" onClick={disconnect}><LogOut size={15} />Disconnect</button>
          </div>}
        </div>}
        {!address && <button className="button" disabled={status === "CONNECTING"} onClick={() => void connect()}><Wallet size={15} />{status === "CONNECTING" ? "Connecting…" : "Connect wallet"}</button>}
        {status === "WRONG_NETWORK" && address && <button className="button coral" onClick={() => void switchToStudionet()}>Switch to Studionet</button>}
        <button aria-label="Open menu" className="button md:hidden" onClick={() => setOpen(!open)}>{open ? <X size={16} /> : <Menu size={16} />}</button>
      </div>
    </div>
    {(error || status === "WRONG_NETWORK") && <div className="mt-3 border-l-4 border-[var(--coral)] px-3 py-2 text-sm">{error || "Switch to GenLayer Studionet (61999)."}</div>}
    {open && <nav className="mt-5 grid gap-3 border-t border-[var(--ink)]/15 pt-4 text-sm font-bold md:hidden"><Link onClick={() => setOpen(false)} href="/epochs">Epochs</Link><Link onClick={() => setOpen(false)} href="/me">My work</Link><Link onClick={() => setOpen(false)} href="/docs">Method</Link></nav>}
  </header>;
}
