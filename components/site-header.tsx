"use client";

import Link from "next/link";
import {useState} from "react";
import {LogOut,Menu,Wallet,X} from "lucide-react";
import {useWallet} from "@/components/wallet-provider";
import {shortAddress} from "@/lib/genlayer/wallet";

export function SiteHeader(){
  const {address,status,error,connect,switchToStudionet,disconnect}=useWallet();
  const [open,setOpen]=useState(false);const [details,setDetails]=useState(false);
  return <header className="mx-auto max-w-7xl px-6 py-4 md:py-6"><div className="flex items-center justify-between"><Link href="/" className="serif text-3xl font-bold">Backfill<span className="text-[var(--coral)]">.</span></Link><nav className="hidden gap-7 text-sm font-bold md:flex"><Link href="/epochs">Epochs</Link><Link href="/me">My work</Link><Link href="/docs">Method</Link></nav><div className="flex items-center gap-2">{address&&status!=="WRONG_NETWORK"&&<button className="button" onClick={()=>setDetails(!details)} aria-expanded={details}>● {shortAddress(address)}⌄</button>}{address&&status==="WRONG_NETWORK"&&<button className="button" onClick={()=>setDetails(!details)} aria-expanded={details}>● Wrong network⌄</button>}{!address&&<button className="button" disabled={status==="CONNECTING"} onClick={()=>void connect()}><Wallet size={16}/>{status==="CONNECTING"?"Connecting…":"Connect wallet"}</button>}{address&&<button aria-label="Disconnect wallet" className="button" onClick={disconnect}><LogOut size={16}/></button>}{status==="WRONG_NETWORK"&&address&&<button className="button coral" onClick={()=>void switchToStudionet()}>Switch to Studionet</button>}<button aria-label="Open menu" className="button md:hidden" onClick={()=>setOpen(!open)}>{open?<X size={16}/>:<Menu size={16}/>}</button></div></div>{details&&address&&<div className="mt-3 border border-[var(--ink)] bg-[var(--paper)] p-4 text-sm"><div className="mono text-xs uppercase">Connected</div><div className="mt-2 break-all">{address}</div><div className="mt-1">{status==="CONNECTED"?"GenLayer Studionet · chain 61999":"Switch to Studionet to enable writes"}</div></div>}{(error||status==="WRONG_NETWORK")&&<div className="mt-3 border-l-4 border-[var(--coral)] px-3 py-2 text-sm">{error||"Switch to GenLayer Studionet (61999)."}</div>}{open&&<nav className="mt-5 grid gap-3 border-t border-[var(--ink)]/15 pt-4 text-sm font-bold md:hidden"><Link onClick={()=>setOpen(false)} href="/epochs">Epochs</Link><Link onClick={()=>setOpen(false)} href="/me">My work</Link><Link onClick={()=>setOpen(false)} href="/docs">Method</Link></nav>}</header>;
}
