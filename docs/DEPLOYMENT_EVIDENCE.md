# Backfill deployment evidence

This file separates evidence from local tests. It records only transactions and readbacks that were actually observed.

## Reviewed deployment

- Reviewed contract commit: `b977d5282e90b557d50f278cc4a8726962b31680`
- Network: GenLayer Studionet, chain ID `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- Rounds: `0xd08Af2Eb6541B449907d8be614E0A43c2D3De7eA`
- Rounds deployment transaction: `0xc0dcddce7a6ce1a857db25a12aeaed3730fb9ed1a8ade7a46d1c1a2946453429`
- Pool: `0xa189bc1D51255B1d15bD391A00979455c2D52aa2`
- Pool deployment transaction: `0xc27559cf4fab7c0a88c72796f59009a45ee9af2db4c0e9103752ec06f5f3a43b`

Explorer links:

- [Rounds deployment](https://explorer-studio.genlayer.com/tx/0xc0dcddce7a6ce1a857db25a12aeaed3730fb9ed1a8ade7a46d1c1a2946453429)
- [Pool deployment](https://explorer-studio.genlayer.com/tx/0xc27559cf4fab7c0a88c72796f59009a45ee9af2db4c0e9103752ec06f5f3a43b)

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

Studionet uses the installed `genlayer-js@1.1.8` write path without a separate transaction-fee object. The frontend keeps payable `value` separate and submits the SDK write directly. A browser wallet session is still required before live frontend writes can be accepted as demonstrated evidence.
