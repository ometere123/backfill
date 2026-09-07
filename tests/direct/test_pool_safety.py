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
    assert not hasattr(pool, "retry_claim")
    assert not hasattr(pool, "reconcile_claim")
    assert not hasattr(pool, "reconcile_refund")
