# Security model

- URLs are HTTPS-only, length-bounded, credential-free and reject obvious local targets.
- Claim fingerprints prevent exact primary-link replay within an epoch.
- Epoch policy and evidence are frozen on-chain; evaluation cannot mutate submitted URLs.
- A claim must be terminal before finalization; challenges cannot increase payout.
- Pool claims mark exact-once state before transfer and enforce `claimed + amount <= funded`.
- No private keys, mnemonics, wallet exports or secrets are accepted by the frontend.
- GEN accounting is integer-only. Rounding dust remains in the pool under the documented unallocated policy.

This is not an independent smart-contract audit. The contracts should receive specialist review before material funds are used.
