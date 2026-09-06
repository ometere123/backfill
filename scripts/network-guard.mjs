const expected={name:"studionet",chainId:61999,rpc:"https://studio.genlayer.com/api",explorer:"https://explorer-studio.genlayer.com"};
const actual={name:process.env.NEXT_PUBLIC_NETWORK||"studionet",chainId:Number(process.env.NEXT_PUBLIC_CHAIN_ID||61999),rpc:process.env.NEXT_PUBLIC_RPC_URL||expected.rpc,explorer:process.env.NEXT_PUBLIC_EXPLORER_URL||expected.explorer};
for(const k of Object.keys(expected)) if(actual[k]!==expected[k]) throw new Error(`Network guard failed for ${k}: ${actual[k]}`); console.log("Studionet 61999 guard passed");
