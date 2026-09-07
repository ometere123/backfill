import {z} from "zod";
const canonicalRounds="0x0a32C44825ff98169813701748BE863109EAAD49";
const canonicalPool="0x5263056F1db6649c32A4EF6C4c4F5237ed3441e6";
export const config={chainId:Number(process.env.NEXT_PUBLIC_CHAIN_ID??61999),rpc:process.env.NEXT_PUBLIC_RPC_URL??"https://studio.genlayer.com/api",explorer:process.env.NEXT_PUBLIC_EXPLORER_URL??"https://explorer-studio.genlayer.com",rounds:canonicalRounds,pool:canonicalPool};
export const configSchema=z.object({rounds:z.string().optional(),pool:z.string().optional()});
