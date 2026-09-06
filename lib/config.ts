import {z} from "zod";
export const config={chainId:61999,rpc:"https://studio.genlayer.com/api",explorer:"https://explorer-studio.genlayer.com",rounds:process.env.NEXT_PUBLIC_ROUNDS_ADDRESS??"",pool:process.env.NEXT_PUBLIC_POOL_ADDRESS??""};
export const configSchema=z.object({rounds:z.string().optional(),pool:z.string().optional()});
