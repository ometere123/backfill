import {describe,expect,it,vi} from "vitest";
import {discoverInjectedWallets,ensureStudionet,normalizeWalletError} from "../../lib/genlayer/wallet";
describe("injected wallet registry",()=>{
 it("retains multiple EIP-6963 wallet identities",async()=>{
  const p1:any={request:vi.fn(async()=>[])};const p2:any={request:vi.fn(async()=>[])};const listeners:any[]=[];
  const windowMock:any={addEventListener:(_n:string,fn:any)=>listeners.push(fn),removeEventListener:vi.fn()};windowMock.dispatchEvent=()=>{listeners[0]({detail:{info:{uuid:"u1",name:"Wallet One",rdns:"com.one",icon:"data:one"},provider:p1}});listeners[0]({detail:{info:{uuid:"u2",name:"Wallet Two",rdns:"com.two",icon:"data:two"},provider:p2}})};vi.stubGlobal("window",windowMock);
  const wallets=await discoverInjectedWallets();expect(wallets.map(w=>w.name)).toEqual(["Wallet One","Wallet Two"]);expect(wallets[0].rdns).toBe("com.one");vi.unstubAllGlobals();
 });
 it("switches known chains and adds unknown Studionet",async()=>{let chain="0x1";const calls:string[]=[];const provider:any={request:vi.fn(async({method}:any)=>{calls.push(method);if(method==="eth_chainId")return chain;if(method==="wallet_switchEthereumChain"&&calls.filter(x=>x===method).length===1){const e:any=new Error("missing");e.code=4902;throw e}if(method==="wallet_addEthereumChain")return null;if(method==="wallet_switchEthereumChain"){chain="0xf22f";return null}return null})};await ensureStudionet(provider);expect(calls).toEqual(["eth_chainId","wallet_switchEthereumChain","wallet_addEthereumChain","wallet_switchEthereumChain","eth_chainId"])});
 it("distinguishes switch rejection and unsupported switching",async()=>{const p:any={request:vi.fn(async({method}:any)=>{if(method==="eth_chainId")return "0x1";const e:any=new Error("user rejected switch");e.code=4001;throw e})};await expect(ensureStudionet(p)).rejects.toThrow("Network switch rejected");expect(normalizeWalletError({code:-32601})).toContain("does not support")});
});
