from pathlib import Path
import ast

ROOT=Path(__file__).parents[2]
def source(name): return (ROOT/"contracts"/name).read_text()
def test_contracts_compile_to_ast():
    for name in ("backfill_rounds.py","backfill_pool.py"): ast.parse(source(name))
def test_retroactivity_and_evidence_gates_are_source_enforced():
    s=source("backfill_rounds.py")
    assert "CONFIRMED_BEFORE_CUTOFF" in s and "attribution" in s and "scope_match" in s
    assert "primary_url" in s and "claim_fingerprint" in s
def test_pool_conservation_and_exact_once():
    s=source("backfill_pool.py")
    assert "p[\"claimed\"] + amount <= p[\"funded\"]" in s
    assert "not self.claimed.get" in s and "total_weight" in s
