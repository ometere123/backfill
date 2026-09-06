const required=["NEXT_PUBLIC_RPC_URL","NEXT_PUBLIC_EXPLORER_URL","NEXT_PUBLIC_CHAIN_ID"];
for(const k of required) if(process.env[k]&&((k.endsWith("URL")&&!process.env[k].startsWith("https://"))||(k.endsWith("ID")&&process.env[k]!=="61999"))) throw new Error(`Invalid ${k}`); console.log("Environment validation passed");
