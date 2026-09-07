import {describe,expect,it,vi} from "vitest";
import {ensureStudionet,normalizeWalletError,STUDIONET_CHAIN_ID} from "../../lib/genlayer/wallet";

function provider(initial="0xf22f"){
  let chain=initial;const calls:string[]=[];
  const value:any={calls,request:vi.fn(async({method}:any)=>{calls.push(method);if(method==="eth_chainId")return chain;if(method==="wallet_switchEthereumChain"){chain=STUDIONET_CHAIN_ID;return null}return []})};
  return value;
}

describe("simple injected Studionet wallet flow",()=>{
  it("does not switch when already on 61999 and rereads the chain",async()=>{const p=provider();await ensureStudionet(p);expect(p.calls).toEqual(["eth_chainId","eth_chainId"])});
  it("switches another chain, and adds Studionet after 4902",async()=>{const p=provider("0x1");p.request=vi.fn(async({method}:any)=>{p.calls.push(method);if(method==="eth_chainId")return p.calls.filter((x:string)=>x===method).length>1?STUDIONET_CHAIN_ID:"0x1";if(method==="wallet_switchEthereumChain"&&p.calls.filter((x:string)=>x===method).length===1){const e:any=new Error("unknown chain");e.code=4902;throw e}return null});await ensureStudionet(p);expect(p.calls).toEqual(["eth_chainId","wallet_switchEthereumChain","wallet_addEthereumChain","wallet_switchEthereumChain","eth_chainId"])});
  it("keeps network-switch rejection distinct from transaction rejection",async()=>{const p=provider("0x1");p.request=vi.fn(async({method}:any)=>{p.calls.push(method);if(method==="eth_chainId")return "0x1";const e:any=new Error("rejected");e.code=4001;throw e});await expect(ensureStudionet(p)).rejects.toThrow("Network switch rejected");expect(normalizeWalletError({code:4001,message:"user rejected transaction"})).toBe("Transaction rejected in wallet.")});
  it("normalizes unsupported switching without exposing provider details",()=>{expect(normalizeWalletError({code:-32601,message:"method not found"})).toContain("does not support automatic network switching")});
});
