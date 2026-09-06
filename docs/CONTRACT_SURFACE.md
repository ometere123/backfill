# Contract surface

`BackfillRounds`: `create_epoch`, `open_epoch`, `submit_claim`, `evaluate_claim`, `open_challenge`, `challenge_claim`, `finalize_epoch`, `get_epoch`, `get_claim`, `get_claim_count`.

`BackfillPool`: payable `fund`, `finalize_pool`, `claim`, plus `preview_claim` and `get_pool`.

The pool reads the typed rounds interface and never executes nondeterministic logic. Amounts are integer GEN units, calculated as `funded * claim_weight // total_weight`.
