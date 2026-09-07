import {config} from "../config";
export type EIP1193Provider={request(args:{method:string;params?:unknown[]}):Promise<unknown>;on?:(event:string,listener:(value:unknown)=>void)=>void;removeListener?:(event:string,listener:(value:unknown)=>void)=>void};
type Eip6963Detail={provider:EIP1193Provider;info?:{name?:string;rdns?:string}};
declare global{interface Window{ethereum?:EIP1193Provider}}
export const shortAddress=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`;
const studionetChainId=`0x${config.chainId.toString(16)}`;

async function announcedProviders():Promise<EIP1193Provider[]>{
  if(typeof window==="undefined"||typeof window.addEventListener!=="function"||typeof window.removeEventListener!=="function"||typeof window.dispatchEvent!=="function")return [];
  const found:EIP1193Provider[]=[];
  const listener=(event:Event)=>{const detail=(event as CustomEvent<Eip6963Detail>).detail;if(detail?.provider&&!found.includes(detail.provider))found.push(detail.provider);};
  window.addEventListener("eip6963:announceProvider",listener);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise(resolve=>setTimeout(resolve,0));
  window.removeEventListener("eip6963:announceProvider",listener);
  return found;
}
export async function getInjectedProvider():Promise<EIP1193Provider>{
  if(typeof window==="undefined")throw new Error("No injected wallet provider detected.");
  const candidates=[...(Array.isArray((window.ethereum as EIP1193Provider&{providers?:EIP1193Provider[]}|undefined)?.providers)?(window.ethereum as EIP1193Provider&{providers:EIP1193Provider[]}).providers:[]),...(await announcedProviders())];
  if(window.ethereum&&!candidates.includes(window.ethereum))candidates.push(window.ethereum);
  if(!candidates[0])throw new Error("No injected wallet provider detected.");
  for(const provider of candidates){try{const accounts=await provider.request({method:"eth_accounts"}) as string[];if(accounts?.length)return provider;}catch{}}
  return candidates[0];
}
export async function ensureStudionet(provider:EIP1193Provider){
  let chainId=String(await provider.request({method:"eth_chainId"}));
  if(chainId.toLowerCase()===studionetChainId)return;
  try{await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:studionetChainId}]});}
  catch(error){const code=(error as {code?:number})?.code;if(code===4902){await provider.request({method:"wallet_addEthereumChain",params:[{chainId:studionetChainId,chainName:"GenLayer Studionet",nativeCurrency:{name:"GEN",symbol:"GEN",decimals:18},rpcUrls:[config.rpc],blockExplorerUrls:[config.explorer]}]});await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:studionetChainId}]});}else if(code===4001)throw new Error("Transaction rejected in wallet.");else throw new Error("Switch your injected wallet to GenLayer Studionet (61999).");}
  chainId=String(await provider.request({method:"eth_chainId"}));
  if(chainId.toLowerCase()!==studionetChainId)throw new Error("Wallet is not on GenLayer Studionet (61999).");
}
export function normalizeWalletError(error:unknown){const code=(error as {code?:number})?.code;const message=String((error as {message?:unknown})?.message??error).toLowerCase();if(code===4001||message.includes("user rejected"))return "Transaction rejected in wallet.";if(message.includes("unsupported")||message.includes("not supported"))return "Switch your wallet manually to Studionet 61999.";if(message.includes("chain")||message.includes("network"))return "Switch your injected wallet to GenLayer Studionet (61999).";if(message.includes("rpc")||message.includes("fetch")||message.includes("timeout"))return "Studionet RPC is currently unavailable.";return "Wallet transaction could not be submitted.";}
export async function connectWallet(){const provider=await getInjectedProvider();const accounts=await provider.request({method:"eth_requestAccounts"}) as string[];if(!accounts[0])throw new Error("Wallet returned no account.");await ensureStudionet(provider);if(typeof localStorage!=="undefined")localStorage.setItem("backfill.account",accounts[0]);return {address:accounts[0],provider};}
export function disconnectWallet(){if(typeof window!=="undefined")localStorage.removeItem("backfill.account");}
