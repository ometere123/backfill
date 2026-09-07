def test_pool_rejects_nonexistent_epoch_and_is_constructible(direct_deploy, direct_vm, direct_alice):
    pool = direct_deploy("contracts/backfill_pool.py", "0x" + "00" * 20)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("pool does not exist"):
        pool.get_pool(999)
