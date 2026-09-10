# Contract surface

`BackfillRounds`: `create_epoch`, `open_epoch`, `submit_claim`, `evaluate_claim`, `expire_unresolved_claim`, `advance_empty_epoch`, `open_challenge`, `challenge_claim`, `resolve_challenge`, `finalize_epoch`, `get_epoch`, `get_claim`, `get_claim_count`, `get_epoch_claim_id`, `get_epoch_count`.

`BackfillPool`: payable `fund`, `finalize_pool`, `claim`, `refund_unallocated`, plus `preview_claim`, `get_pool`, `get_settlement`, `get_refund_settlement`, `get_funder_credit`, and `is_claimed`.

The pool reads the typed rounds interface and never executes nondeterministic logic. Amounts are integer GEN units, calculated as `funded * claim_weight // total_weight`. A claim/refund settlement is `PENDING` after deterministic reservation and child emission; the current contract does not independently inspect the child receipt, so child finality is proven by the frontend's triggered-transaction readback rather than by changing the contract settlement to `PAID`.
