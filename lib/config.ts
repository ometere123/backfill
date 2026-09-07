import {z} from "zod";
const canonicalRounds="0xAF9C5681E33Ba589acA973DFDFd8819C8E25Ade3";
const canonicalPool="0xDe2D2726E225F981ED5D8Bd241b4Ad0Aa9146918";
const staleRounds="0xd08Af2Eb6541B449907d8be614E0A43c2D3De7eA";
const stalePool="0xa189bc1D51255B1d15bD391A00979455c2D52aa2";
const envRounds=process.env.NEXT_PUBLIC_ROUNDS_ADDRESS;
const envPool=process.env.NEXT_PUBLIC_POOL_ADDRESS;
export const config={chainId:Number(process.env.NEXT_PUBLIC_CHAIN_ID??61999),rpc:process.env.NEXT_PUBLIC_RPC_URL??"https://studio.genlayer.com/api",explorer:process.env.NEXT_PUBLIC_EXPLORER_URL??"https://explorer-studio.genlayer.com",rounds:envRounds&&envRounds.toLowerCase()!==staleRounds.toLowerCase()?envRounds:canonicalRounds,pool:envPool&&envPool.toLowerCase()!==stalePool.toLowerCase()?envPool:canonicalPool};
export const configSchema=z.object({rounds:z.string().optional(),pool:z.string().optional()});
