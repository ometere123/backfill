"use client";
import Link from "next/link";
import {useState} from "react";
import {Wallet, LogOut, Menu, X} from "lucide-react";
import {useWallet} from "@/components/wallet-provider";
import {shortAddress} from "@/lib/genlayer/wallet";

export function SiteHeader() {
  const {address,status,error,connect,disconnect}=useWallet(); const [open,setOpen]=useState(false);
  return <header className="mx-auto max-w-7xl px-6 py-6"><div className="flex items-center justify-between"><Link href="/" className="serif text-3xl font-bold">Backfill<span className="text-[var(--coral)]">.</span></Link><nav className="hidden gap-7 text-sm font-bold md:flex"><Link href="/epochs">Epochs</Link><Link href="/me">My work</Link><Link href="/docs">Method</Link></nav><div className="flex items-center gap-2">{status==="WRONG_NETWORK"&&<span className="mr-2 hidden max-w-56 text-xs text-[var(--coral)] sm:inline">Wrong network · switch to Studionet</span>}{error&&<span className="mr-2 hidden max-w-56 text-xs text-[var(--coral)] sm:inline">{error}</span>}{address&&<span aria-label="Connected wallet" className="button">{shortAddress(address)}</span>}{address&&<button aria-label="Disconnect wallet" className="button" onClick={disconnect}><LogOut size={16}/></button>}{!address&&<button className="button" disabled={status==="CONNECTING"} onClick={()=>void connect()}><Wallet size={16}/>{status==="CONNECTING"?"Connecting…":"Connect wallet"}</button>}<button aria-label="Open menu" className="button md:hidden" onClick={()=>setOpen(!open)}>{open?<X size={16}/>:<Menu size={16}/>}</button></div></div>{open&&<nav className="mt-5 grid gap-3 border-t border-[var(--ink)]/15 pt-4 text-sm font-bold md:hidden"><Link onClick={()=>setOpen(false)} href="/epochs">Epochs</Link><Link onClick={()=>setOpen(false)} href="/me">My work</Link><Link onClick={()=>setOpen(false)} href="/docs">Method</Link></nav>}</header>;
}
