# Deployment

## Target

Studionet only: chain ID `61999`; RPC `https://studio.genlayer.com/api`; explorer `https://explorer-studio.genlayer.com`.

## Prepare

Install the stable GenLayer CLI/testing tools, set the network explicitly, and keep signer material outside Git. Compile and lint the exact files in `contracts/`, then deploy `backfill_rounds.py`. Deploy `backfill_pool.py` with the finalized rounds address as constructor input. Put only those public addresses in `.env.local`.

```bash
genlayer network set studionet
npm run network:guard
npm run contracts:compile
npm run contract:sha
```

The repository does not fabricate deployment receipts. Record the Git SHA, contract source hashes, deployment transaction IDs, finalized execution results and explorer links in the operator's release record after the signer completes the actions.
