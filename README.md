# Backfill

Backfill is a retroactive public-goods funding ledger for critical open-source infrastructure. Completed work enters; public evidence decides; deterministic pool math settles the epoch.

## Status

This repository is deployment-ready for GenLayer Studionet 61999. No funded deployment is claimed here: contract addresses and transaction IDs remain unset until a funded signer performs the deployment.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run test
npm run contracts:compile
npm run build
npm run dev
```

Set `NEXT_PUBLIC_ROUNDS_ADDRESS` and `NEXT_PUBLIC_POOL_ADDRESS` after deploying. The app never stores a key and never owns authoritative state.

## Network

The only supported network is Studionet: chain ID `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`, currency `GEN`.

## Lifecycle

Create and open a round, fund the pool, submit a completed contribution, evaluate it through the contract's leader/validator evidence flow, optionally challenge it, finalize rounds, finalize the pool, then claim the deterministic pro-rata amount. See [docs/REVIEWER_DEMO.md](docs/REVIEWER_DEMO.md).
