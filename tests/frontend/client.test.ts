import {describe, expect, it, vi} from "vitest";
import {getPendingTransactions, selectTriggeredTransfer, writeAndConfirm} from "../../lib/genlayer/client";

function fakeClient(receipt:any={txExecutionResultName:"FINISHED_WITH_RETURN"}) {
  const client:any={
    connect:vi.fn(async()=>undefined),
    writeContract:vi.fn(async()=>"0xabc"),
  };
  return {client, receipt};
}

describe("write transaction safety", () => {
  it("persists the hash immediately and retains it when finalization fails", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {localStorage: {getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value)}});
    const {client}=fakeClient();
    const submitted:string[]=[];
    await expect(writeAndConfirm(client,"0x0000000000000000000000000000000000000001","fund",[7],0n,undefined,undefined,{actionKey:"resume-me",waitForFinalization:async()=>{expect(getPendingTransactions()[0].hash).toBe("0xabc"); throw new Error("rpc unavailable")},onSubmitted:hash=>submitted.push(hash)})).rejects.toThrow(/rpc unavailable/);
    expect(submitted).toEqual(["0xabc"]);
    expect(getPendingTransactions().find(item=>item.actionKey==="resume-me")?.hash).toBe("0xabc");
    vi.unstubAllGlobals();
  });
  it("sends payable value in wei and rereads canonical state", async () => {
    const {client,receipt}=fakeClient();
    const stages:string[]=[]; let canonical=0; let request:any;
    client.writeContract=vi.fn(async(input:any)=>{request=input; return "0xabc";});
    const result=await writeAndConfirm(client,"0x0000000000000000000000000000000000000001","fund",[7],1000000000000000000n,s=>stages.push(s),async()=>{canonical++;},{waitForFinalization:async()=>receipt});
    expect(request.value).toBe(1000000000000000000n);
    expect(client.connect).not.toHaveBeenCalled();
    expect(request.fees).toBeUndefined();
    expect(result.hash).toBe("0xabc");
    expect(canonical).toBe(1);
    expect(stages).toContain("EXECUTION_CONFIRMED");
  });

  it("surfaces rejected wallet transactions", async () => {
    const {client}=fakeClient(); client.writeContract=vi.fn(async()=>{throw new Error("User rejected the request")});
    const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s))).rejects.toThrow(/rejected/);
    expect(stages).toContain("USER_REJECTED");
  });

  it("does not report success for reverted execution", async () => {
    const {client}=fakeClient({txExecutionResultName:"REVERTED"}); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s),undefined,{waitForFinalization:async()=>({txExecutionResultName:"REVERTED"})})).rejects.toThrow(/execution failed/);
    expect(stages).toContain("EXECUTION_ERROR");
  });

  it("surfaces consensus failure after submission", async () => {
    const {client}=fakeClient(); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s),undefined,{waitForFinalization:async()=>{throw new Error("consensus failed")}})).rejects.toThrow(/consensus/);
    expect(stages).toContain("CONSENSUS_FAILURE");
  });

  it("classifies an undetermined post-submission transaction and allows a fresh attempt", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {localStorage: {getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value)}});
    const {client}=fakeClient(); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","evaluate_claim",[3],0n,s=>stages.push(s),undefined,{actionKey:"evaluate:3",account:"0xabc",chainId:"0xf22f",waitForFinalization:async()=>({statusName:"UNDETERMINED"})})).rejects.toThrow(/not executed/);
    expect(stages).toContain("CONSENSUS_UNDETERMINED");
    expect(getPendingTransactions("0xabc","0xf22f")).toHaveLength(0);
    expect(JSON.parse(storage.get("backfill.transactions") || "[]")[0]).toMatchObject({hash:"0xabc",stage:"CONSENSUS_UNDETERMINED",account:"0xabc",chainId:"0xf22f"});
    vi.unstubAllGlobals();
  });

  it("identifies a triggered child by parent-derived id, recipient, and exact value", () => {
    const child = selectTriggeredTransfer("0xparent", ["0xwrong", "0xchild"], [{to:"0x0000000000000000000000000000000000000002", value:2n}, {recipient:"0x0000000000000000000000000000000000000001", value:"1000000000000000000"}], "0x0000000000000000000000000000000000000001", 1000000000000000000n);
    expect(child?.hash).toBe("0xchild");
  });
});
