import {createClient} from "genlayer-js"; import {studionet} from "genlayer-js/chains";
declare global{interface Window{ethereum?:{request(args:{method:string;params?:unknown[]}):Promise<any>}}}
export const shortAddress=(a:string)=>`${a.slice(0,6)}…${a.slice(-4)}`;
export async function connectWallet(){if(!window.ethereum) throw new Error("No wallet provider detected"); const accounts=await window.ethereum.request({method:"eth_requestAccounts"}) as string[]; if(!accounts[0]) throw new Error("Wallet returned no account"); const client=createClient({chain:studionet,account:accounts[0] as `0x${string}`,provider:window.ethereum}); await client.connect("studionet"); return accounts[0];}
