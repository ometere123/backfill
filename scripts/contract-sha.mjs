import {readFile,writeFile} from "node:fs/promises"; import {createHash} from "node:crypto";
const files=["contracts/backfill_rounds.py","contracts/backfill_pool.py"]; const hashes={}; for(const f of files) hashes[f]=createHash("sha256").update(await readFile(f)).digest("hex"); console.log(JSON.stringify(hashes,null,2));
