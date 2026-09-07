"use client";
import Link from "next/link";
import {useState} from "react";
import {Wallet, LogOut, Menu, X} from "lucide-react";
import {useWallet} from "@/components/wallet-provider";
import {shortAddress} from "@/lib/genlayer/wallet";

export function SiteHeader() {
  const {address,status,error,connect,switchToStudionet,disconnect}=useWallet(); const [open,setOpen]=useState(false);
  return <header className="mx-auto max-w-7xl px-6 py-4 md:py-6"><div className="flex items-center justify-between"><Link href="/" className="serif text-3xl font-bold">Backfill<span className="text-[var(--coral)]">.</span></Link><nav className="hidden gap-7 text-sm font-bold md:flex"><Link href="/epochs">Epochs</Link><Link href="/me">My work</Link><Link href="/docs">Method</Link></nav><div className="flex items-center gap-2">{address&&<span aria-label="Connected wallet" className="button">{shortAddress(address)}</span>}{status==="WRONG_NETWORK"&&address&&<button className="button coral" onClick={()=>void switchToStudionet()}>Switch to Studionet</button>}{address&&<button aria-label="Disconnect wallet" className="button" onClick={disconnect}><LogOut size={16}/></button>}{!address&&<button className="button" disabled={status==="CONNECTING"} onClick={()=>void connect()}><Wallet size={16}/>{status==="CONNECTING"?"Connecting…":"Connect wallet"}</button>}{error&&<span className="sr-only">{error}</span>}<button aria-label="Open menu" className="button md:hidden" onClick={()=>setOpen(!open)}>{open?<X size={16}/>:<Menu size={16}/>}</button></div></div>{open&&<nav className="mt-5 grid gap-3 border-t border-[var(--ink)]/15 pt-4 text-sm font-bold md:hidden"><Link onClick={()=>setOpen(false)} href="/epochs">Epochs</Link><Link onClick={()=>setOpen(false)} href="/me">My work</Link><Link onClick={()=>setOpen(false)} href="/docs">Method</Link></nav>}</header>;
}
