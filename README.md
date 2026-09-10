# Backfill

Backfill is a retroactive public-goods funding ledger for critical open-source infrastructure. Completed work enters; public evidence decides; deterministic pool math settles the epoch.

## Status

The revised contracts are freshly deployed to GenLayer Studionet 61999. Current addresses, receipts, source hashes, and the fresh zero-claim refund lifecycle are recorded in [docs/DEPLOYMENT_EVIDENCE.md](docs/DEPLOYMENT_EVIDENCE.md). Historical browser-wallet evidence from superseded pairs is retained separately. Positive-weight payout evidence remains unverified because the fresh lifecycle intentionally submitted zero claims.

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

The checked-in `.env.example` points at the current reviewed pair. The app never stores a key and never owns authoritative state.

## Network

The only supported network is Studionet: chain ID `61999`, RPC `https://studio.genlayer.com/api`, explorer `https://explorer-studio.genlayer.com`, currency `GEN`.

## Lifecycle

Create and open a round, fund the pool, submit a completed contribution, evaluate it through the contract's leader/validator evidence flow, optionally challenge it, finalize rounds, finalize the pool, then claim the deterministic pro-rata amount. See [docs/REVIEWER_DEMO.md](docs/REVIEWER_DEMO.md).
