# Backfill deployment evidence

This file separates evidence from local tests. It records only transactions and readbacks that were actually observed.

## Reviewed deployment

- Reviewed contract commit: `b0b25a4efad3e2ff70f0382271274957a948e3c0`
- Network: GenLayer Studionet, chain ID `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Rounds: `0xd08Af2Eb6541B449907d8be614E0A43c2D3De7eA`
- Rounds deployment transaction: `0xc0dcddce7a6ce1a857db25a12aeaed3730fb9ed1a8ade7a46d1c1a2946453429`
- Pool: `0xA4DAfAcd536d5Ec52935C7d474b3E0D87B97Bf1d`
- Pool deployment transaction: `0xc3fbf32e6df3b0c9143bbde4d076d52cffe602ceb45cfdcdeb159d349d5ac3ea`

Explorer links:

- [Rounds deployment](https://explorer-studio.genlayer.com/tx/0xc0dcddce7a6ce1a857db25a12aeaed3730fb9ed1a8ade7a46d1c1a2946453429)
- [Pool deployment](https://explorer-studio.genlayer.com/tx/0xc3fbf32e6df3b0c9143bbde4d076d52cffe602ceb45cfdcdeb159d349d5ac3ea)

## Live readbacks

`genlayer schema` returned the expected public methods for both contracts. The pool schema includes `fund` as payable and exposes `get_settlement`, `reconcile_claim`, `retry_claim`, `refund_unallocated`, and `reconcile_refund`.

The first typed-argument pool deployment attempts were rejected as evidence because their finalized receipts contained constructor argument errors. They are intentionally not listed as the current deployment.

## Local executable evidence

- `python -m pytest tests/direct -q`: 8 passed.
- `node scripts/frontend-tests.mjs`: passed.
- `node_modules\\.bin\\vitest.cmd run`: 6 passed.
- `node_modules\\.bin\\tsc.cmd --noEmit`: passed.
- `node_modules\\.bin\\eslint.cmd .`: passed.
- `node_modules\\.bin\\next.cmd build`: passed.
- `C:\\Users\\USER\\AppData\\Local\\Python\\pythoncore-3.14-64\\python.exe -m py_compile contracts/backfill_rounds.py contracts/backfill_pool.py`: passed.

These local tests do not prove native GEN movement. No wallet-funded lifecycle, balance reconciliation, public frontend URL, or payout transaction is claimed here because those artifacts were not independently observed in this environment.

## Known deployment limitations

The checked-in `genlayer-js` is `1.1.8`, whose installed client exposes `estimateTransactionGas` but not the fee-estimation method documented by current GenLayer SDK documentation. The frontend therefore refuses an unpriced write instead of submitting without protocol fees. A browser wallet session and a newer compatible SDK are required before live frontend writes can be accepted as demonstrated evidence.
