# Architecture

Backfill is a browser plus two Intelligent Contracts system. `BackfillRounds` owns immutable epoch policy, frozen claim evidence, consensus evaluation, challenges and final settlement weights. `BackfillPool` owns native GEN funding, finalized settlement snapshots, exact-once claims and conservation checks.

The browser is an untrusted client. It validates form shape for usability only and reads authoritative state from GenLayer. There is no database, backend verdict service, GitHub proxy, auth server or private key. Wallets sign directly through the EIP-1193 provider.

The trust boundary is explicit: untrusted URLs and page text enter only the nondeterministic evidence block; deterministic storage changes happen after consensus; transfers happen only after finalized pool state and exact-once marking. Pool settlements are recorded as `PENDING` before the native child transfer is emitted; the frontend correlates that parent with the actual triggered child transaction. The contract does not infer payment success from wallet balance deltas and does not expose an unsafe retry.
