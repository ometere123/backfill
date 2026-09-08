# Reviewer demo path

1. Connect a wallet and switch it to Studionet.
2. Open an epoch and fund its pool with exactly 1 GEN.
3. Submit a real, pre-existing public contribution URL.
4. Evaluate the claim and show the authoritative outcome. A successful eligible decision must show grounded evidence and positive weight; a bounded model/source failure must show `INCONCLUSIVE`, zero weight and a retry state.
5. Open the bounded challenge route only when canonical state and deadlines permit it.
6. Finalize the epoch after every claim is terminal, then finalize the pool.
7. For a positive-weight claim, claim GEN and show the parent receipt plus the correlated triggered child transfer. This path is not currently live-proven in the deployment evidence below.
8. For a zero-weight epoch, refund the funder's credit and show the parent receipt plus the correlated triggered child transfer. This path is live-proven in [DEPLOYMENT_EVIDENCE.md](DEPLOYMENT_EVIDENCE.md).

Live contract addresses and transaction IDs must be filled only from actual Studionet receipts. Do not present local mocks or an `INCONCLUSIVE` claim as payout evidence.
