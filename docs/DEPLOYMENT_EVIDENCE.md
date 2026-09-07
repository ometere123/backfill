# Backfill deployment evidence

This record separates executable local/CI evidence from live Studionet evidence.

## Reviewed source and network

- Git commit: `be2e018273099c5a6f96b80ff74929885d0ab098`
- Network: GenLayer Studionet, chain ID `61999`
- RPC: `https://studio.genlayer.com/api`
- Explorer: `https://explorer-studio.genlayer.com`
- `genlayer-js`: `1.1.8`
- CLI: `0.39.2`
- CLI signer: `0xb29ead15b1e8a2420fae84de974088f67a15ccc2` (key not recorded)

## Fresh deployment

Rounds:

- Address: `0xAF9C5681E33Ba589acA973DFDFd8819C8E25Ade3`
- Deployment tx: `0xb68094bbb64e403b4fbb9ff5b3e1817c63b592a73ab61e7331daae94df859811`
- Explorer: https://explorer-studio.genlayer.com/tx/0xb68094bbb64e403b4fbb9ff5b3e1817c63b592a73ab61e7331daae94df859811
- Source: 22,004 bytes; SHA-256 `0d3aa7fb01bb19056072b5d888f4d30a1e8fbf0a3f44be0ea4dd39450d099f89`
- Receipt: FINALIZED, `MAJORITY_AGREE`, leader execution `SUCCESS`.
- Schema: includes epoch-local claim indexing, challenge, evaluation, and finalization methods.

Pool:

- Address: `0xDe2D2726E225F981ED5D8Bd241b4Ad0Aa9146918`
- Deployment tx: `0x26b39e339670efc981357d3c0d39db6371e87cf91efde1a63cd22c8d872982f7`
- Explorer: https://explorer-studio.genlayer.com/tx/0x26b39e339670efc981357d3c0d39db6371e87cf91efde1a63cd22c8d872982f7
- Source: 7,089 bytes; SHA-256 `3137a11ea7cd4905f39318df17ddced368e95e50b92169549c0fef6a4261f76c`
- Receipt: FINALIZED, `MAJORITY_AGREE`, leader execution `SUCCESS`.
- Schema: constructor `rounds_address: string`; `fund` is payable; funder-credit and settlement views are present.
- Rounds binding: deployment calldata was `{"args":[addr#af9c5681e33ba589aca973dfdfd8819c8e25ade3,]}`, exactly the final Rounds address.

SDK source parity was checked byte-for-byte for both deployed source responses: both equal the final main files and their recorded byte counts/hashes.

The previous pair is superseded pre-hardening and is not current lifecycle evidence:

- `0xd08Af2Eb6541B449907d8be614E0A43c2D3De7eA`
- `0xa189bc1D51255B1d15bD391A00979455c2D52aa2`

## Local and CI evidence

- `npm ci`: passed.
- `npm run network:guard`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 8 passed across 2 files.
- `python -m pytest tests/direct -q`: 11 passed.
- `python -m py_compile contracts/backfill_rounds.py contracts/backfill_pool.py`: passed.
- `npm run build`: passed.
- `genvm-lint` `0.11.0` fast lint: passed for both contracts, with view return-type warnings.
- Direct harness runtime is pinned to GenVM `v0.2.16` in `tests/direct/conftest.py`.
- CI: [run 34143595383](https://github.com/ometere123/backfill/actions/runs/34143595383) passed all configured steps.
- Clean-install audit after pinning Vitest `3.2.6`: zero vulnerabilities reported.

These checks do not prove native GEN movement or browser-wallet lifecycle state.

## Settlement safety boundary

Studionet `genlayer-js@1.1.8` writes do not receive a separate transaction-fee object. Payable value is passed independently. Native transfers are emitted as triggered child transactions; the contract records deterministic `PENDING` settlement and reserves accounting before emission because the contract cannot safely read a child receipt. The frontend correlates parent and child transaction IDs through the SDK. No unsafe balance-delta retry is exposed.
