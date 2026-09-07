# Studionet deployment evidence

Network: Studionet, chain ID 61999, RPC `https://studio.genlayer.com/api`.

The current contract pair is:

- Rounds: `0xc3F379AE897a64685e6152C2a3447ca1E477B646`
- Pool: `0x8Aff07B4c5757117F502576C1c835CBE8A4647B1`

Deployment transactions:

- Rounds deployment: `0x36329a860b74739496eefac0d2dbb00da76ee9a2e785783953ccd0402ac57606`
- Pool deployment: `0x3f1b59d945fd4622611ec25310f4f3a569ab4593c4b0adfb7784161e3ea1db74`

Canonical reads performed after deployment:

- `Rounds.get_epoch_count()` returned `0` before the live epoch was created.
- `Rounds` schema exposed the lifecycle methods and `get_epoch_count`.
- `Pool.get_pool(999)` rejected with the contract's `pool does not exist` error.

Live lifecycle transactions currently recorded:

- Epoch creation: `0xcf0c16f26b310bad39dd3b0d2b3d0cb951a78d91609efe6e378fcc7f69fa18e5`; consensus result returned epoch `1`.
- Epoch opening: `0x9e9c1b5e87149afef5d0cdb96ad575efee8cb4e176edbd60ecce844146608b74`.

The first malformed-argument epoch transaction and the first pool deployment are intentionally not used as the current deployment evidence. The current pool address is the redeployment after correcting constructor address decoding.

The remaining funded pool, claim evaluation, challenge/finalization, claim transfer, frontend hosting, and balance-change evidence are not recorded here because the installed CLI does not expose a payable message-value option and no wallet signing session was available for a safe GEN transfer. This is an explicit limitation, not a simulated result.
