"use client";
import Link from "next/link";
import {useEffect, useState} from "react";
import {Wallet, LogOut} from "lucide-react";
import {config} from "@/lib/config";
import {connectWallet, disconnectWallet, shortAddress} from "@/lib/genlayer/wallet";

export function SiteHeader() {
  const [address, setAddress] = useState(""); const [error, setError] = useState("");
  useEffect(() => {
    if (!window.ethereum) return;
    const refresh = async () => { const accounts = await window.ethereum!.request({method: "eth_accounts"}) as string[]; setAddress(accounts[0] || ""); if (accounts[0]) localStorage.setItem("backfill.account", accounts[0]); else disconnectWallet(); };
    const chain = (id: string) => setError(id.toLowerCase() === `0x${config.chainId.toString(16)}` ? "" : `Wrong network. Switch to Studionet ${config.chainId}.`);
    const accountsChanged = (accounts: string[]) => { setAddress(accounts[0] || ""); if (accounts[0]) localStorage.setItem("backfill.account", accounts[0]); else disconnectWallet(); };
    refresh().catch(() => undefined); window.ethereum.request({method: "eth_chainId"}).then(chain).catch(() => undefined);
    window.ethereum.on?.("accountsChanged", accountsChanged); window.ethereum.on?.("chainChanged", chain); window.ethereum.on?.("disconnect", disconnectWallet);
    return () => { window.ethereum?.removeListener?.("accountsChanged", accountsChanged); window.ethereum?.removeListener?.("chainChanged", chain); window.ethereum?.removeListener?.("disconnect", disconnectWallet); };
  }, []);
  async function connect() { try { setError(""); setAddress(await connectWallet()); } catch (e) { setError(e instanceof Error ? e.message : "Wallet unavailable"); } }
  function disconnect() { disconnectWallet(); setAddress(""); }
  return <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6"><Link href="/" className="serif text-3xl font-bold">Backfill<span className="text-[var(--coral)]">.</span></Link><nav className="hidden gap-7 text-sm font-bold md:flex"><Link href="/epochs">Epochs</Link><Link href="/me">My work</Link><Link href="/docs">Method</Link></nav><div className="flex items-center gap-2">{error && <span className="mr-3 max-w-56 text-xs text-[var(--coral)]">{error}</span>}{address && <button aria-label="Disconnect wallet" className="button" onClick={disconnect}><LogOut size={16}/></button>}<button className="button" onClick={connect}><Wallet size={16}/>{address ? shortAddress(address) : "Connect wallet"}</button></div></header>;
}
