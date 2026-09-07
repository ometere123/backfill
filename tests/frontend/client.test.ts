import {describe, expect, it, vi} from "vitest";
import {writeAndConfirm} from "../../lib/genlayer/client";

const feeEstimate={distribution:{validators:1n},feeValue:42n};

function fakeClient(receipt:any={txExecutionResultName:"FINISHED_WITH_RETURN"}) {
  const client:any={
    connect:vi.fn(async()=>undefined),
    writeContract:vi.fn(async()=>"0xabc"),
  };
  return {client, receipt};
}

describe("write transaction safety", () => {
  it("estimates protocol fees separately from payable value and rereads canonical state", async () => {
    const {client,receipt}=fakeClient();
    const stages:string[]=[]; let canonical=0; let request:any;
    client.writeContract=vi.fn(async(input:any)=>{request=input; return "0xabc";});
    const result=await writeAndConfirm(client,"0x0000000000000000000000000000000000000001","fund",[7],1000000000000000000n,s=>stages.push(s),async()=>{canonical++;},{
      estimateFees:async()=>feeEstimate,
      waitForFinalization:async()=>receipt,
    });
    expect(request.value).toBe(1000000000000000000n);
    expect(request.fees).toEqual(feeEstimate);
    expect(result.hash).toBe("0xabc");
    expect(canonical).toBe(1);
    expect(stages).toContain("EXECUTION_CONFIRMED");
  });

  it("surfaces rejected wallet transactions", async () => {
    const {client}=fakeClient(); client.writeContract=vi.fn(async()=>{throw new Error("User rejected the request")});
    const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s),undefined,{estimateFees:async()=>feeEstimate})).rejects.toThrow(/rejected/);
    expect(stages).toContain("USER_REJECTED");
  });

  it("does not report success for reverted execution", async () => {
    const {client}=fakeClient({txExecutionResultName:"REVERTED"}); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s),undefined,{estimateFees:async()=>feeEstimate,waitForFinalization:async()=>({txExecutionResultName:"REVERTED"})})).rejects.toThrow(/execution failed/);
    expect(stages).toContain("EXECUTION_ERROR");
  });

  it("surfaces consensus failure after submission", async () => {
    const {client}=fakeClient(); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","x",[],0n,s=>stages.push(s),undefined,{estimateFees:async()=>feeEstimate,waitForFinalization:async()=>{throw new Error("consensus failed")}})).rejects.toThrow(/consensus/);
    expect(stages).toContain("CONSENSUS_FAILURE");
  });
});
