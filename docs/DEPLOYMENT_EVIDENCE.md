# Backfill deployment evidence

This document separates deterministic local/CI evidence from fresh Studionet deployment evidence. The browser lifecycle is intentionally not claimed here until it has been run against this exact pair with the injected wallet.

## Reviewed deployment

- Network: GenLayer Studionet
- Chain ID: `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Frontend SDK: `genlayer-js@1.1.8`
- CLI: `genlayer@0.39.2`
- CLI signer: `0xb29ead15b1e8a2420fae84de974088f67a15ccc2` (private key intentionally not recorded)

### Rounds

- Address: `0x8b4b7Bf6247211b0a8A82f6cfBFb5552c5E98E2C`
- Deployment transaction: `0x4e72ef1edf64fd29d3404eb5a158b91ada60e18cbd7959c55e87679b33572d93`
- Explorer: https://explorer-studio.genlayer.com/tx/0x4e72ef1edf64fd29d3404eb5a158b91ada60e18cbd7959c55e87679b33572d93
- Receipt: `FINALIZED`; consensus `MAJORITY_AGREE`; leader execution `SUCCESS`
- Source bytes: `24610`
- Source SHA-256: `4cd80d7a5dde6a0f3f00abb773d39932f0dd7f2ee74e3562b44b2752b583e5ec`
- SDK `getContractCode` parity: exact byte equality with `contracts/backfill_rounds.py`

### Pool

- Address: `0xd37396910d67CfD19e5aCBc1dA2D5a888fE404F3`
- Deployment transaction: `0x0011d3154dfa755c3bc762ba63deb6ed7a4346d56df6580a1c739d47f27db91e`
- Explorer: https://explorer-studio.genlayer.com/tx/0x0011d3154dfa755c3bc762ba63deb6ed7a4346d56df6580a1c739d47f27db91e
- Receipt: `FINALIZED`; consensus `MAJORITY_AGREE`; leader execution `SUCCESS`
- Source bytes: `7215`
- Source SHA-256: `2b988d4a1ad4f7aa3395d858a76a31458e013686031a23d94395e125226d7404`
- SDK `getContractCode` parity: exact byte equality with `contracts/backfill_pool.py`
- Constructor binding: deployment calldata contains `addr#8b4b7bf6247211b0a8a82f6cfbfb5552c5e98e2c`, the exact Rounds address above.

Both deployment receipts were separately queried at `FINALIZED`; `result: 6` and leader execution `SUCCESS` were present. The previous AF9/De2 pair and all earlier pairs are superseded pre-final-acceptance deployments and are not current evidence.

## Deterministic verification

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: 17 tests passed across 3 files
- pinned direct harness: `16 passed` (`genlayer-test==0.29.2`, GenVM `v0.2.16`)
- pinned Python compilation: passed
- `npm run build`: passed; network guard passed for Studionet 61999
- `npm run contract:sha`: passed with the hashes above
- `genvm-lint lint` for both contracts: passed, with only missing view return-type warnings

The Windows GenVM linter schema extraction was blocked by a permissions error in the user cache; the mandatory clean Ubuntu CI schema gate remains the authoritative reproducible schema check. The local npm shim was also broken, so npm scripts were run through the installed Node/npm CLI binary without changing the repository.

## Settlement boundary

The Pool records a deterministic `PENDING` reservation before emitting a native GEN child transaction. The contract does not use wallet balance deltas and does not expose an unsafe retry. A browser acceptance run must correlate the parent to the exact triggered child using `genlayer-js@1.1.8`, then record recipient, value, child status, and Explorer link. No native payout or refund is claimed here until that child evidence exists.
