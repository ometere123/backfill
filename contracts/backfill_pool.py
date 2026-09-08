# v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import json
from datetime import datetime, timezone
from genlayer import *


def _now():
    return int(datetime.now(timezone.utc).timestamp())


def _fail(message):
    raise gl.vm.UserError("[EXPECTED] " + message)


def _json(value):
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def _load(raw):
    return json.loads(raw)


def _address_key(address):
    return str(address).lower()


@gl.contract_interface
class Rounds:
    class View:
        def get_epoch(self, epoch_id: int) -> dict: ...
        def get_claim(self, claim_id: int) -> dict: ...


@gl.evm.contract_interface
class Recipient:
    class View:
        pass
    class Write:
        pass


class BackfillPool(gl.Contract):
    rounds: Address
    pools: TreeMap[u256, str]
    funder_credit: TreeMap[str, u256]
    refunded: TreeMap[str, bool]
    settlements: TreeMap[str, str]

    def __init__(self, rounds_address: str):
        # Direct harnesses may pass strings; network ABI decoding supplies Address values.
        self.rounds = rounds_address if hasattr(rounds_address, "as_bytes") else Address(rounds_address)

    def _pool(self, epoch_id):
        if not self.pools.get(epoch_id):
            _fail("pool does not exist")
        return _load(self.pools[epoch_id])

    def _save_pool(self, pool):
        self.pools[pool["epoch_id"]] = _json(pool)

    def _rounds(self):
        return Rounds(self.rounds).view()

    def _settlement(self, key):
        raw = self.settlements.get(key)
        return _load(raw) if raw else {"status": "NONE", "amount": 0, "attempts": 0, "identity": key}

    @gl.public.write.payable
    def fund(self, epoch_id: int):
        epoch = self._rounds().get_epoch(epoch_id)
        if epoch["status"] not in ("CLAIMS_OPEN", "EVALUATING", "CHALLENGE") or _now() >= epoch["claims_close"]:
            _fail("funding is closed for this epoch")
        if gl.message.value <= 0:
            _fail("funding value must be positive")
        pool = _load(self.pools[epoch_id]) if self.pools.get(epoch_id) else {"epoch_id": epoch_id, "funded": 0, "reserved": 0, "refunded": 0, "total_weight": 0, "status": "OPEN"}
        pool["funded"] += int(gl.message.value)
        key = str(epoch_id) + "|" + _address_key(gl.message.sender_address)
        self.funder_credit[key] = self.funder_credit.get(key, 0) + gl.message.value
        self._save_pool(pool)

    @gl.public.write
    def finalize_pool(self, epoch_id: int):
        pool = self._pool(epoch_id)
        epoch = self._rounds().get_epoch(epoch_id)
        if epoch["status"] != "FINALIZED" or pool["status"] != "OPEN":
            _fail("pool cannot be finalized")
        pool["status"] = "POOL_FINALIZED"; pool["total_weight"] = epoch["total_weight"]; self._save_pool(pool)

    @gl.public.write
    def claim(self, epoch_id: int, claim_id: int):
        pool = self._pool(epoch_id)
        claim = self._rounds().get_claim(claim_id)
        if pool["status"] != "POOL_FINALIZED" or claim["epoch_id"] != epoch_id or claim["status"] != "ELIGIBLE":
            _fail("claim is not finalized and eligible")
        key = str(epoch_id) + "|" + str(claim_id)
        settlement = self._settlement(key)
        if settlement["status"] != "NONE":
            _fail("claim already initiated")
        if pool["total_weight"] <= 0:
            _fail("epoch has no distributable weight")
        amount = (int(pool["funded"]) * int(claim["weight"])) // int(pool["total_weight"])
        if amount <= 0 or int(pool["reserved"]) + amount > int(pool["funded"]):
            _fail("pool cannot cover claim")
        recipient = Recipient(Address(claim["claimant"]))
        settlement = {"status": "PENDING", "type": "CLAIM", "epoch_id": epoch_id, "claim_id": claim_id, "recipient": claim["claimant"], "amount": amount, "attempts": int(settlement["attempts"]) + 1, "identity": "claim:" + str(epoch_id) + ":" + str(claim_id)}
        self.settlements[key] = _json(settlement)
        # Studionet exposes this emitted transfer as a triggered child transaction.
        # The contract cannot read that child receipt, so the reservation remains
        # PENDING and there is deliberately no unsafe balance-based retry.
        pool["reserved"] += amount
        self._save_pool(pool)
        recipient.emit_transfer(value=u256(amount))

    @gl.public.write
    def refund_unallocated(self, epoch_id: int):
        pool = self._pool(epoch_id)
        epoch = self._rounds().get_epoch(epoch_id)
        if pool["status"] != "POOL_FINALIZED" or epoch["total_weight"] != 0:
            _fail("only zero-weight finalized pools are refundable")
        key = str(epoch_id) + "|" + _address_key(gl.message.sender_address)
        if self.refunded.get(key):
            _fail("funder credit already refunded")
        credit = int(self.funder_credit.get(key, 0))
        if credit <= 0 or int(pool["refunded"]) + credit > int(pool["funded"]):
            _fail("no refundable credit")
        settlement_key = str(epoch_id) + "|refund|" + _address_key(gl.message.sender_address)
        settlement = self._settlement(settlement_key)
        if settlement["status"] == "NONE":
            settlement = {"status": "PENDING", "type": "REFUND", "epoch_id": epoch_id, "funder": _address_key(gl.message.sender_address), "recipient": str(gl.message.sender_address), "amount": credit, "attempts": 1, "identity": "refund:" + str(epoch_id) + ":" + _address_key(gl.message.sender_address)}
            self.settlements[settlement_key] = _json(settlement)
            self.refunded[key] = True
            pool["refunded"] += credit
            self._save_pool(pool)
            Recipient(gl.message.sender_address).emit_transfer(value=u256(credit))
        elif settlement["status"] == "PENDING":
            _fail("refund already pending; child receipt must be reconciled externally")
        else:
            _fail("funder credit already refunded")

    @gl.public.view
    def preview_claim(self, epoch_id: int, claim_id: int):
        pool = self._pool(epoch_id); claim = self._rounds().get_claim(claim_id)
        if pool["total_weight"] <= 0:
            return 0
        return (int(pool["funded"]) * int(claim["weight"])) // int(pool["total_weight"])

    @gl.public.view
    def get_pool(self, epoch_id: int): return self._pool(epoch_id)

    @gl.public.view
    def get_settlement(self, epoch_id: int, claim_id: int):
        return self._settlement(str(epoch_id) + "|" + str(claim_id))

    @gl.public.view
    def get_refund_settlement(self, epoch_id: int, funder: str):
        return self._settlement(str(epoch_id) + "|refund|" + _address_key(funder))

    @gl.public.view
    def get_funder_credit(self, epoch_id: int, funder: str):
        return int(self.funder_credit.get(str(epoch_id) + "|" + _address_key(funder), 0))

    @gl.public.view
    def is_claimed(self, epoch_id: int, claim_id: int):
        return self._settlement(str(epoch_id) + "|" + str(claim_id))["status"] in ("PENDING", "PAID")
