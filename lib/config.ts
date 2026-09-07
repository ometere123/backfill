import {z} from "zod";
const canonicalRounds="0xAF9C5681E33Ba589acA973DFDFd8819C8E25Ade3";
const canonicalPool="0xDe2D2726E225F981ED5D8Bd241b4Ad0Aa9146918";
export const config={chainId:Number(process.env.NEXT_PUBLIC_CHAIN_ID??61999),rpc:process.env.NEXT_PUBLIC_RPC_URL??"https://studio.genlayer.com/api",explorer:process.env.NEXT_PUBLIC_EXPLORER_URL??"https://explorer-studio.genlayer.com",rounds:canonicalRounds,pool:canonicalPool};
export const configSchema=z.object({rounds:z.string().optional(),pool:z.string().optional()});
