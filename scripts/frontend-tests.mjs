import {readFile} from "node:fs/promises";
const files=["app/page.tsx","app/epochs/page.tsx","app/epoch/[id]/page.tsx","app/submit/[epochId]/page.tsx","app/claim/[id]/page.tsx","app/challenge/[id]/page.tsx","app/settlement/[epochId]/page.tsx","lib/genlayer/client.ts","components/site-header.tsx"];
for(const file of files){const text=await readFile(file,"utf8"); if(!text.includes("export default") && !text.includes("export function")) throw new Error(`Missing route/component export: ${file}`);}
const submit=await readFile("app/submit/[epochId]/page.tsx","utf8"); if(!submit.includes("z.object")||!submit.includes("writeAndConfirm")||!submit.includes("TxLifecycle")) throw new Error("Submit flow missing validation or real transaction lifecycle");
const client=await readFile("lib/genlayer/client.ts","utf8"); for(const token of ["TransactionStatus.FINALIZED","ExecutionResult.FINISHED_WITH_RETURN","connect(\"studionet\")"]) if(!client.includes(token)) throw new Error(`Client missing ${token}`);
console.log(`Frontend smoke checks passed (${files.length} surfaces)`);
