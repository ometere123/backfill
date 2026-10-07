import {describe, expect, it, vi} from "vitest";
import {getPendingTransactions, selectTriggeredTransfer, verifyTriggeredPayoutDelivery, writeAndConfirm, type PayoutDelivery, type PayoutDeliveryServices} from "../../lib/genlayer/client";
import {isPayoutSettlementActive, payoutDeliveryPresentation} from "../../lib/ui/payout-delivery";
import {nestedLeaderExecutionReceipt, nestedLeaderFailureReceipt, topLevelExecutionReceipt} from "./fixtures/studionet-receipts";

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

  it("accepts the nested Studionet leader execution result", async () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {localStorage: {getItem: (key: string) => storage.get(key) || null, setItem: (key: string, value: string) => storage.set(key, value)}});
    const {client}=fakeClient();
    const stages:string[]=[];
    const result=await writeAndConfirm(client,"0x1","open_epoch",[1],0n,s=>stages.push(s),undefined,{actionKey:"open:1",account:"0xabc",chainId:"0xf22f",waitForFinalization:async()=>nestedLeaderExecutionReceipt});
    expect(result.hash).toBe("0xabc");
    expect(stages).toContain("EXECUTION_CONFIRMED");
    expect(getPendingTransactions("0xabc","0xf22f")).toHaveLength(0);
    vi.unstubAllGlobals();
  });

  it("accepts the top-level Studionet txExecutionResult shape", async () => {
    const {client}=fakeClient(); const stages:string[]=[];
    const result=await writeAndConfirm(client,"0x1","finalize_pool",[4],0n,s=>stages.push(s),undefined,{waitForFinalization:async()=>topLevelExecutionReceipt});
    expect(result.receipt).toBe(topLevelExecutionReceipt);
    expect(stages).toContain("EXECUTION_CONFIRMED");
  });

  it("rejects a failed nested Studionet leader receipt", async () => {
    const {client}=fakeClient(); const stages:string[]=[];
    await expect(writeAndConfirm(client,"0x1","refund_unallocated",[4],0n,s=>stages.push(s),undefined,{waitForFinalization:async()=>nestedLeaderFailureReceipt})).rejects.toThrow(/execution failed: REVERTED/);
    expect(stages).toContain("EXECUTION_ERROR");
  });

  it("identifies a triggered child by parent-derived id, recipient, and exact value", () => {
    const child = selectTriggeredTransfer("0xparent", ["0xwrong", "0xchild"], [{to:"0x0000000000000000000000000000000000000002", value:2n}, {recipient:"0x0000000000000000000000000000000000000001", value:"1000000000000000000"}], "0x0000000000000000000000000000000000000001", 1000000000000000000n);
    expect(child?.hash).toBe("0xchild");
  });
});

const PH="0x"+"a".repeat(64),CH="0x"+"b".repeat(64),P=PH,Q=CH,R="0x0000000000000000000000000000000000000001",A=1000000000000000000n;
const view=(state:PayoutDelivery["state"],reason:PayoutDelivery["reason"],child=false):PayoutDelivery=>({state,reason,parentHash:PH,...(child?{childHash:CH}:{})});
const child=(x:any={})=>({recipient:R,value:String(A),statusName:"FINALIZED",txExecutionResultName:"SUCCESS",value_credited:true,...x});
const parent=(x:any={})=>({statusName:"FINALIZED",txExecutionResultName:"SUCCESS",...x});
const services=(c:any,p:any={}):PayoutDeliveryServices=>({getTriggeredTransactionIds:async h=>Object.keys(c[h]||{}),getTransaction:async h=>p[h]??(h===P||h===Q?parent():c[P]?.[h]??c[Q]?.[h])});
const verify=(c:any,p=P,s?:PayoutDeliveryServices)=>verifyTriggeredPayoutDelivery(p,R,A,s||services({[p]:{"0xc":c}}));
describe("payout presentation",()=>{
 it.each([["PENDING",true],["PAID",true],["NONE",false],[undefined,false],[null,false],["",false],["UNKNOWN",false],[1,false]])("active %j",(s,e)=>expect(isPayoutSettlementActive(s)).toBe(e));
 it("uninitiated neutral",()=>expect(payoutDeliveryPresentation(false,PH,view("CONFIRMED","DELIVERY_CONFIRMED",true))).toMatchObject({tone:"neutral"}));
 it.each(["PARENT_NOT_FINALIZED","PARENT_EXECUTION_UNVERIFIED","NO_TRIGGERED_CHILD","NO_MATCHING_CHILD","CHILD_NOT_FINALIZED","VALUE_CREDIT_UNVERIFIED","MALFORMED_CHILD"] as const)("pending %s",r=>expect(payoutDeliveryPresentation(true,PH,view("PENDING_OR_UNVERIFIED",r))).toMatchObject({tone:"pending"}));
 it.each([["PARENT_EXECUTION_FAILED","FAILED_OR_UNCREDITED"],["CHILD_EXECUTION_FAILED","FAILED_OR_UNCREDITED"],["VALUE_NOT_CREDITED","FAILED_OR_UNCREDITED"]] as const)("failed %s",(r,t)=>expect(payoutDeliveryPresentation(true,PH,view(t,r,true))).toMatchObject({tone:"failed",childHash:CH}));
 it("confirmed only",()=>expect(payoutDeliveryPresentation(true,PH,view("CONFIRMED","DELIVERY_CONFIRMED",true))).toMatchObject({tone:"confirmed",childHash:CH}));
});
describe("payout verification",()=>{
 it("confirms exact child",async()=>expect(await verify(child())).toMatchObject({state:"CONFIRMED",childHash:"0xc"}));
 it.each(["PENDING","ACCEPTED",7])("nonfinal parent %s",async s=>expect(await verifyTriggeredPayoutDelivery(P,R,A,{getTriggeredTransactionIds:vi.fn(async()=>["0xc"]),getTransaction:async h=>h===P?parent({statusName:s}):child()})).toMatchObject({reason:"PARENT_NOT_FINALIZED"}));
 it.each([["recipient",{recipient:"bad"},"NO_MATCHING_CHILD"],["amount",{value:"2"},"NO_MATCHING_CHILD"],["child pending",{statusName:"PENDING"},"CHILD_NOT_FINALIZED"],["child failed",{txExecutionResultName:"REVERTED"},"CHILD_EXECUTION_FAILED"],["uncredited",{value_credited:false},"VALUE_NOT_CREDITED"]])("fails %s",async(_,x,r)=>expect(await verify(child(x))).toMatchObject({reason:r}));
 it("fails missing, ambiguous, rescue, malformed",async()=>{expect(await verifyTriggeredPayoutDelivery(P,R,A,services({[P]:{}}))).toMatchObject({reason:"NO_TRIGGERED_CHILD"});expect(await verifyTriggeredPayoutDelivery(P,R,A,services({[P]:{"a":child(),"b":child()}}))).toMatchObject({reason:"AMBIGUOUS_MATCHING_CHILD"});expect(await verifyTriggeredPayoutDelivery(P,"bad",A,services({[P]:{"a":child()}}))).toMatchObject({reason:"MALFORMED_CHILD"});});
});