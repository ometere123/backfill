def test_pool_rejects_nonexistent_epoch_and_is_constructible(direct_deploy, direct_vm, direct_alice):
    pool = direct_deploy("contracts/backfill_pool.py", "0x" + "00" * 20)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("pool does not exist"):
        pool.get_pool(999)


def test_pool_settlement_defaults_are_idempotent_and_no_unsafe_retry_surface(direct_deploy, direct_vm, direct_alice):
    pool = direct_deploy("contracts/backfill_pool.py", "0x" + "00" * 20)
    direct_vm.sender = direct_alice
    assert pool.get_settlement(7, 3)["status"] == "NONE"
    assert pool.get_refund_settlement(7, direct_alice)["status"] == "NONE"
    assert pool.get_funder_credit(7, direct_alice) == 0
    assert pool.is_claimed(7, 3) is False
    assert not hasattr(pool, "retry_claim")
    assert not hasattr(pool, "reconcile_claim")
    assert not hasattr(pool, "reconcile_refund")


def _stub_fundable_rounds(direct_vm, epoch_id=7):
    from genlayer_py.abi import calldata

    epoch = {"epoch_id": epoch_id, "status": "CLAIMS_OPEN", "claims_close": 200}

    def cross_contract_stub(_vm, request):
        call = request.get("CallContract")
        if call and call.get("calldata", {}).get("method") == "get_epoch":
            return bytes([0]) + calldata.encode(epoch)
        return None

    direct_vm._gl_call_hook = cross_contract_stub
    direct_vm.warp("1970-01-01T00:01:40Z")
    return epoch_id


def _hex_address(address):
    return "0x" + bytes(address).hex()


def test_fund_records_exact_credit_for_one_wallet(direct_deploy, direct_vm, direct_alice):
    epoch_id = _stub_fundable_rounds(direct_vm)
    pool = direct_deploy("contracts/backfill_pool.py", "0x" + "11" * 20)
    direct_vm.sender = direct_alice
    direct_vm.value = 1_000_000_000_000_000_000
    pool.fund(epoch_id)
    assert pool.get_funder_credit(epoch_id, _hex_address(direct_alice)) == 1_000_000_000_000_000_000
    assert pool.get_pool(epoch_id)["funded"] == 1_000_000_000_000_000_000


def test_fund_tracks_multiple_wallets_and_total_exactly(direct_deploy, direct_vm, direct_alice, direct_bob):
    epoch_id = _stub_fundable_rounds(direct_vm)
    pool = direct_deploy("contracts/backfill_pool.py", "0x" + "11" * 20)
    direct_vm.sender = direct_alice
    direct_vm.value = 1_000_000_000_000_000_000
    pool.fund(epoch_id)
    direct_vm.sender = direct_bob
    direct_vm.value = 250_000_000_000_000_000
    pool.fund(epoch_id)
    assert pool.get_funder_credit(epoch_id, _hex_address(direct_alice)) == 1_000_000_000_000_000_000
    assert pool.get_funder_credit(epoch_id, _hex_address(direct_bob)) == 250_000_000_000_000_000
    assert pool.get_pool(epoch_id)["funded"] == 1_250_000_000_000_000_000
