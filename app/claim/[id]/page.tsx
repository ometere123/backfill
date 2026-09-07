import {ClaimState} from "@/components/claim-state";
export default async function Claim({params}:{params:Promise<{id:string}>}){const {id}=await params;return <div className="mx-auto max-w-5xl px-6 pb-24 pt-14"><ClaimState id={Number(id)}/></div>}
