import {z} from "zod";
export const config={chainId:Number(process.env.NEXT_PUBLIC_CHAIN_ID??61999),rpc:process.env.NEXT_PUBLIC_RPC_URL??"https://studio.genlayer.com/api",explorer:process.env.NEXT_PUBLIC_EXPLORER_URL??"https://explorer-studio.genlayer.com",rounds:process.env.NEXT_PUBLIC_ROUNDS_ADDRESS??"",pool:process.env.NEXT_PUBLIC_POOL_ADDRESS??""};
export const configSchema=z.object({rounds:z.string().optional(),pool:z.string().optional()});
