import {EpochState} from "@/components/epoch-state";
export default async function Epoch({params}:{params:Promise<{id:string}>}){const {id}=await params;return <div className="mx-auto max-w-7xl px-6 pb-24 pt-14"><EpochState id={Number(id)}/></div>}
