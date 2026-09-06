# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from datetime import datetime, timezone

class Rounds(gl.contract_interface):
    def get_epoch(self, epoch_id: int): ...
    def get_claim(self, claim_id: int): ...

class BackfillPool(gl.Contract):
    def __init__(self, rounds_address: str):
        self.rounds = Address(rounds_address); self.pools = TreeMap(); self.claimed = TreeMap(); self.funder_credit = TreeMap()

    @gl.public.write.payable
    def fund(self, epoch_id: int):
        assert gl.message.value > 0
        p = self.pools.get(epoch_id, {"epoch_id": epoch_id, "funded": 0, "claimed": 0, "refunded": 0, "finalized": False, "total_weight": 0})
        p["funded"] += gl.message.value; self.pools[epoch_id] = p
        self.funder_credit[str(epoch_id) + "|" + str(gl.message.sender)] = self.funder_credit.get(str(epoch_id) + "|" + str(gl.message.sender), 0) + gl.message.value

    @gl.public.write
    def finalize_pool(self, epoch_id: int):
        p = self.pools[epoch_id]; e = gl.get_contract_at(self.rounds, Rounds).get_epoch(epoch_id); assert e["status"] == "FINALIZED" and not p["finalized"]
        p["finalized"] = True; p["total_weight"] = e["total_weight"]; self.pools[epoch_id] = p

    @gl.public.write
    def claim(self, epoch_id: int, claim_id: int):
        p = self.pools[epoch_id]; c = gl.get_contract_at(self.rounds, Rounds).get_claim(claim_id); assert p["finalized"] and c["epoch_id"] == epoch_id and c["status"] == "ELIGIBLE" and not self.claimed.get(str(epoch_id) + "|" + str(claim_id))
        assert p["total_weight"] > 0
        amount = p["funded"] * c["weight"] // p["total_weight"]; assert amount > 0 and p["claimed"] + amount <= p["funded"]
        self.claimed[str(epoch_id) + "|" + str(claim_id)] = True; p["claimed"] += amount; self.pools[epoch_id] = p
        gl.message.send(c["claimant"], amount)

    @gl.public.view
    def preview_claim(self, epoch_id: int, claim_id: int):
        p = self.pools[epoch_id]; c = gl.get_contract_at(self.rounds, Rounds).get_claim(claim_id); return 0 if not p["total_weight"] else p["funded"] * c["weight"] // p["total_weight"]
    @gl.public.view
    def get_pool(self, epoch_id: int): return self.pools[epoch_id]
