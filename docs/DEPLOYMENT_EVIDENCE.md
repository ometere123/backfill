# Backfill deployment evidence

This document separates deterministic local/CI evidence from fresh Studionet deployment evidence. It records the portions of the browser lifecycle that are actually proven against this exact pair with the injected wallet. It does not claim an eligible payout where no eligible claim was produced.

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
- `npm run test`: 20 tests passed across 3 files
- pinned direct harness: `18 passed` (`genlayer-test==0.29.2`, GenVM `v0.2.16`)
- pinned Python compilation: passed
- `npm run build`: passed; network guard passed for Studionet 61999
- `npm run contract:sha`: passed with the hashes above
- `genvm-lint lint` for both contracts: passed, with only missing view return-type warnings

The Windows GenVM linter schema extraction was blocked by a permissions error in the user cache; the mandatory clean Ubuntu CI schema gate remains the authoritative reproducible schema check. The local npm shim was also broken, so npm scripts were run through the installed Node/npm CLI binary without changing the repository.

## Fresh browser-wallet lifecycle evidence

All hashes below are from the injected wallet `0xfcef676044658B5402f590daBe9E04A0F640522f` on Studionet 61999. Every listed parent was observed as `FINALIZED` in the production frontend and/or Explorer; native child observations are recorded separately.

### Epoch 7 forensic evaluation evidence

Epoch 7 was created specifically for a fresh positive-claim attempt using four pinned, real HTTPS sources: a pinned GenLayer CLI commit, its pinned raw implementation file, official GenLayer transaction documentation, and an independent authoritative corroborating page. The claim was submitted through the production frontend and discovered as global claim ID `3`.

- Create epoch 7: [`0x6b8410c228dbcf3dbe217a21936736c35067c373eb177843090154dacd46b690`](https://explorer-studio.genlayer.com/tx/0x6b8410c228dbcf3dbe217a21936736c35067c373eb177843090154dacd46b690)
- Open epoch 7: [`0x83a3881b8a2649da0693442e8ace08b08933c32e92ef145ed9287eeb0385b680`](https://explorer-studio.genlayer.com/tx/0x83a3881b8a2649da0693442e8ace08b08933c32e92ef145ed9287eeb0385b680)
- Fund exactly 1 GEN: [`0xb0f15985f60226a90cef8da6be4fb7438a90ee27a0c51f94e9a2b9fc31444678`](https://explorer-studio.genlayer.com/tx/0xb0f15985f60226a90cef8da6be4fb7438a90ee27a0c51f94e9a2b9fc31444678)
- Submit claim 3: [`0x271c05795e0e794e38ec4470a5f68c94aafec0c4f56cc144201f0ac506402e27`](https://explorer-studio.genlayer.com/tx/0x271c05795e0e794e38ec4470a5f68c94aafec0c4f56cc144201f0ac506402e27)
- Evaluate claim 3: [`0x2483e9f9d686afb1a23f411bb6fb21f1394cada656ca968badf519c4e4d5b5cc`](https://explorer-studio.genlayer.com/tx/0x2483e9f9d686afb1a23f411bb6fb21f1394cada656ca968badf519c4e4d5b5cc)

The evaluation receipt was `FINALIZED`, consensus `Accepted`, and GenVM execution `SUCCESS`. Its leader equivalence output decodes to the bounded envelope `{"kind":"RETRYABLE_ERROR","code":"LLM_MALFORMED"}`. The Explorer's raw consensus data shows two agreeing validator receipts with successful execution and the same accepted consensus round; the leader receipt also reports successful execution and contains the same bounded error envelope. This is therefore not evidenced as validator disagreement, an execution revert, or a protocol-level `UNDETERMINED` transaction.

The leader and validator receipt detail exposes only the bounded code. Stdout is empty, stderr contains only the GenVM pickling-storage warning, and `raw_error`, `error_code`, and `error_description` are null. The Explorer does not expose the original model response or parser exception. Consequently, this live receipt cannot distinguish among a missing JSON field, invalid enum, malformed evidence array, grounding failure, or another model/parser-shape issue. No narrower root cause is claimed.

After reload, canonical claim state was:

- Claim ID: `3`; status: `INCONCLUSIVE`
- Weight: `0`; impact band: `NONE`
- Reason/last error: `LLM_MALFORMED`
- Evidence: none stored
- Pool: `OPEN`; funded amount: `1000000000000000000` wei (`1.0000 GEN`)
- Funder credit: `1000000000000000000` wei (`1.0000 GEN`)
- No payout child transaction exists because the claim has zero weight.

The production claim page exposes the terminal canonical state and the finalized evaluation parent hash. The live UI did not expose the attempts field directly; the observed state transition proves one accepted evaluation execution, but no claim is made about an unexposed numeric attempt counter beyond the canonical terminal `INCONCLUSIVE` result.

> Live testing proves epoch creation, pool funding, canonical funder-credit reconciliation, finalized evaluation failure handling, retry exhaustion, and terminal `INCONCLUSIVE` state. No eligible claim was produced during the live run, so positive-weight payout and triggered payout-transfer evidence remain unverified. This is an unexercised outcome branch, not evidence that the payout path failed.

### Zero-weight refund path (Epoch 4)

- Create: [`0xc5d0e8f8974833b8165e83341e95e35697d447bf0f461fe25d79fef7f5c89330`](https://explorer-studio.genlayer.com/tx/0xc5d0e8f8974833b8165e83341e95e35697d447bf0f461fe25d79fef7f5c89330), canonical epoch `4`
- Open: [`0xf6d38722e346753be840f2038933c0aee26413b8cf5de781f887f6a248eea9fb`](https://explorer-studio.genlayer.com/tx/0xf6d38722e346753be840f2038933c0aee26413b8cf5de781f887f6a248eea9fb)
- Fund exactly 1 GEN: [`0x34102c9701e7058b2894427ae14d9bdecba640fb144e235fe3e580c44b827b7d`](https://explorer-studio.genlayer.com/tx/0x34102c9701e7058b2894427ae14d9bdecba640fb144e235fe3e580c44b827b7d)
- Submit claim, epoch-local claim ID `1`: [`0xc6aca0f709cecaebfae72eb2e96739d8167ce5e98b19992c167fe39323c3bd86`](https://explorer-studio.genlayer.com/tx/0xc6aca0f709cecaebfae72eb2e96739d8167ce5e98b19992c167fe39323c3bd86)
- Evaluation attempts: [`0xb56ab33e715cbe7f731f7238d67815feedf2f6821a00a7c0f343d86586f7715a`](https://explorer-studio.genlayer.com/tx/0xb56ab33e715cbe7f731f7238d67815feedf2f6821a00a7c0f343d86586f7715a), [`0x6bbfa3570bb25e80313af134f9f8f03bdd1adc2faca675a92d8d5588dcfaf1d2`](https://explorer-studio.genlayer.com/tx/0x6bbfa3570bb25e80313af134f9f8f03bdd1adc2faca675a92d8d5588dcfaf1d2), [`0xc8f89661b70a491ac0553655a2033d08aea7d87f200c6ee3fe5c4eedd7724a95`](https://explorer-studio.genlayer.com/tx/0xc8f89661b70a491ac0553655a2033d08aea7d87f200c6ee3fe5c4eedd7724a95)
- Open challenge: [`0x3b7b221038ab6dbbfa1e996eb724ebaba2030df788e9086a3d80dd36639d3b71`](https://explorer-studio.genlayer.com/tx/0x3b7b221038ab6dbbfa1e996eb724ebaba2030df788e9086a3d80dd36639d3b71)
- Finalize epoch: [`0x9dc33f3e7e757f7c7a93dfc07f862fa8972af819bb2aff238711be2a21e95bea`](https://explorer-studio.genlayer.com/tx/0x9dc33f3e7e757f7c7a93dfc07f862fa8972af819bb2aff238711be2a21e95bea)
- Finalize pool: [`0x0a095bbe5f4d62afa02230130ac0543c5783be96cf9e404f379d9daa5dcac458`](https://explorer-studio.genlayer.com/tx/0x0a095bbe5f4d62afa02230130ac0543c5783be96cf9e404f379d9daa5dcac458)
- Refund parent: [`0x2ceb8e7e96d7624731b31d53745fed1659168c6cb4700c3e6645a0de74ecb6b1`](https://explorer-studio.genlayer.com/tx/0x2ceb8e7e96d7624731b31d53745fed1659168c6cb4700c3e6645a0de74ecb6b1)
- Triggered refund child: [`0xa873823007f97c1c680fa12fa607e38ebc362989f21b7ba0d518a27f907d8b57`](https://explorer-studio.genlayer.com/tx/0xa873823007f97c1c680fa12fa607e38ebc362989f21b7ba0d518a27f907d8b57)

Refund readback: Pool `POOL_FINALIZED`, funded `1000000000000000000`, funder credit `1000000000000000000`, total weight `0`, settlement `PENDING`, identity `refund:4:0xfcef676044658b5402f590dabe9e04a0f640522f`. The child was returned by `getTriggeredTransactionIds(parent)`, had parent `0x2ceb…`, sender Pool `0xd373…`, recipient `0xfcef…`, value `1000000000000000000`, `FINALIZED`, and `value_credited: true`. The production settlement page was reloaded and displayed the parent link, child link, exact recipient, exact wei amount, and `FINALIZED` child result after reload.

### Fresh eligible-payout attempt (Epochs 5 and 6)

Epoch 5 creation [`0x14e743b4512fd18f087409b1fdacf979c95814d274ecdd4ee93e0eede8837267`](https://explorer-studio.genlayer.com/tx/0x14e743b4512fd18f087409b1fdacf979c95814d274ecdd4ee93e0eede8837267) succeeded, but its open attempt [`0x68c81789220efc28fe5a447811ad6f4135795fa1e8acdf8928e7e84a0c024f96`](https://explorer-studio.genlayer.com/tx/0x68c81789220efc28fe5a447811ad6f4135795fa1e8acdf8928e7e84a0c024f96) finalized with contract execution failure because the claims window had already closed; canonical state remained `DRAFT`. It was not reused.

Epoch 6 was created with a fresh longer window:

- Create: [`0x224e39e6956ce0412d2b18a6968cfee7a3f7d2986fd8339d250ae49d99e6fc82`](https://explorer-studio.genlayer.com/tx/0x224e39e6956ce0412d2b18a6968cfee7a3f7d2986fd8339d250ae49d99e6fc82), canonical epoch `6`
- Open: [`0xabfb1a49afe4501d778675f2f73f45db82c429490f367db3762bdc118d5dd3b5`](https://explorer-studio.genlayer.com/tx/0xabfb1a49afe4501d778675f2f73f45db82c429490f367db3762bdc118d5dd3b5)
- Fund exactly 1 GEN: [`0x97c32c4bae1527d25765e488f79a04ec75ebba170e8a4bf771ff1df2458396cc`](https://explorer-studio.genlayer.com/tx/0x97c32c4bae1527d25765e488f79a04ec75ebba170e8a4bf771ff1df2458396cc); canonical pool funded and credit both increased to `1000000000000000000`
- Submit claim, discovered through `get_epoch_claim_id(6, 0)`, canonical claim ID `2`: [`0x56eb6dcd10b04f7cce010d5ef98924f8edde88b97f525cb995e5e783d6ff48cd`](https://explorer-studio.genlayer.com/tx/0x56eb6dcd10b04f7cce010d5ef98924f8edde88b97f525cb995e5e783d6ff48cd)
- Evaluation attempt 1: [`0x0ab8c4ae6999ab39dbbfe70a7586c590626b8e84f34a5fd7afab1d58dd8a57c3`](https://explorer-studio.genlayer.com/tx/0x0ab8c4ae6999ab39dbbfe70a7586c590626b8e84f34a5fd7afab1d58dd8a57c3)
- Evaluation retry 2: [`0x0dee06bc13d1391daa224497fc35072a41a978082f5d30cde4216da1f429698a`](https://explorer-studio.genlayer.com/tx/0x0dee06bc13d1391daa224497fc35072a41a978082f5d30cde4216da1f429698a)

Both accepted evaluations produced canonical `INCONCLUSIVE`, `weight = 0`, `last_error = LLM_MALFORMED`; attempts are `2` and the claim remains retryable. No eligible claim exists in the current deployment, so no payout parent or payout child transaction can truthfully be recorded. This is an explicit remaining limitation, not a simulated payout.

## Settlement boundary

The Pool records a deterministic `PENDING` reservation before emitting a native GEN child transaction. The contract does not use wallet balance deltas and does not expose an unsafe retry. The Epoch 4 refund child was correlated with `genlayer-js@1.1.8` and is recorded above. No payout is claimed because the fresh eligible-claim attempt remained `INCONCLUSIVE` with zero weight.
