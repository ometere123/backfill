import json

import pytest


BASE = "https://github.com/example"


def _epoch_args():
    return ("Maintenance", "Critical open-source infrastructure", "bug fix,release", "example/project", 100, 100, 200, 300, 10, 2)


def _urls():
    return (BASE + "/repo", BASE + "/pull/1", "https://docs.example.org/release", "https://security.example.net/advisory")


def test_create_open_boundaries_and_authorization(direct_vm, direct_deploy, direct_alice, direct_bob):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:00Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    with direct_vm.prank(direct_bob), direct_vm.expect_revert("creator"):
        rounds.open_epoch(epoch_id)
    with direct_vm.expect_revert("cannot be opened yet"):
        rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:01:40Z")
    rounds.open_epoch(epoch_id)
    assert rounds.get_epoch(epoch_id)["status"] == "CLAIMS_OPEN"


def test_invalid_duplicate_and_hostile_urls_rejected(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:02:00Z")
    with direct_vm.expect_revert("HTTPS"):
        rounds.submit_claim(epoch_id, "x", "bug", "http://localhost/repo", _urls()[1], _urls()[2], _urls()[3])
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    assert rounds.get_claim(claim_id)["status"] == "SUBMITTED"
    with direct_vm.expect_revert("duplicate"):
        rounds.submit_claim(epoch_id, "Fix again", "bug", *_urls())


def test_strict_deadline_and_claim_source_bounds(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("invalid epoch deadlines"):
        rounds.create_epoch("x", "scope", "bug", "project", 100, 100, 200, 200, 10, 2)
    with direct_vm.expect_revert("invalid epoch bounds"):
        rounds.create_epoch("x", "scope", "bug", "project", 100, 100, 200, 300, 10, 5)


def test_duplicate_signal_cannot_receive_positive_weight(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args()); rounds.open_epoch(epoch_id); direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    for index, url in enumerate(_urls(), start=1): direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    decision = {"eligibility": "ELIGIBLE", "attribution": "CONFIRMED", "completion": "CONFIRMED_BEFORE_CUTOFF", "scope_match": "YES", "impact_band": "MATERIAL", "duplicate_signal": "POSSIBLE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "duplicate signal is present"}
    direct_vm.mock_llm(r"evidence reviewer", json.dumps(decision)); rounds.evaluate_claim(claim_id)
    claim = rounds.get_claim(claim_id)
    assert claim["status"] == "INELIGIBLE" and claim["weight"] == 0


def test_oversized_input_and_deadline_rejected(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("scope"):
        rounds.create_epoch("x", "a" * 2401, "bug", "project", 100, 100, 200, 300, 10, 2)
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:03:20Z")
    with direct_vm.expect_revert("closed"):
        rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())


def test_evaluation_requires_grounded_independent_sources_and_sets_weight(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    for index, url in enumerate(_urls(), start=1):
        direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    decision = {"eligibility": "ELIGIBLE", "attribution": "CONFIRMED", "completion": "CONFIRMED_BEFORE_CUTOFF", "scope_match": "YES", "impact_band": "MATERIAL", "duplicate_signal": "NONE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "independent evidence supports the claim"}
    direct_vm.mock_llm(r"evidence reviewer", json.dumps(decision))
    rounds.evaluate_claim(claim_id)
    claim = rounds.get_claim(claim_id)
    assert claim["status"] == "ELIGIBLE"
    assert claim["weight"] == 3
    assert claim["attempts"] == 1


def test_malformed_or_inconclusive_evaluation_is_retryable_zero_weight(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    for url in _urls():
        direct_vm.mock_web(url, {"status": 503, "body": ""})
    direct_vm.mock_llm(r"public-goods evidence reviewer", "not-json")
    rounds.evaluate_claim(claim_id)
    claim = rounds.get_claim(claim_id)
    assert claim["status"] == "INCONCLUSIVE"
    assert claim["weight"] == 0
    assert claim["attempts"] == 1


def test_challenge_is_single_use_and_resolution_cannot_increase_weight(direct_vm, direct_deploy, direct_alice, direct_bob):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    for index, url in enumerate(_urls(), start=1):
        direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    decision = {"eligibility": "ELIGIBLE", "attribution": "CONFIRMED", "completion": "CONFIRMED_BEFORE_CUTOFF", "scope_match": "YES", "impact_band": "MATERIAL", "duplicate_signal": "NONE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "supported"}
    direct_vm.mock_llm(r"evidence reviewer", json.dumps(decision))
    rounds.evaluate_claim(claim_id)
    direct_vm.warp("1970-01-01T00:03:20Z")
    rounds.open_challenge(epoch_id)
    with direct_vm.prank(direct_bob):
        rounds.challenge_claim(claim_id, "out of scope", "https://counter.example.edu/evidence")
    with direct_vm.expect_revert("cannot be challenged"):
        rounds.challenge_claim(claim_id, "out of scope", "https://counter2.example.edu/evidence")
    challenge_decision = dict(decision); challenge_decision["eligibility"] = "INELIGIBLE"; challenge_decision["scope_match"] = "NO"; challenge_decision["impact_band"] = "NONE"; challenge_decision["evidence"] = [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}]
    direct_vm.clear_mocks()
    for index, url in enumerate(_urls(), start=1):
        direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    direct_vm.mock_web("counter.example.edu", {"status": 200, "body": "counter evidence says out of scope"})
    direct_vm.mock_llm(r"counter\.example\.edu", json.dumps(challenge_decision))
    rounds.resolve_challenge(claim_id)
    claim = rounds.get_claim(claim_id)
    assert claim["status"] == "INELIGIBLE"
    assert claim["weight"] == 0
    assert claim["challenge_status"] == "UPHELD"


def test_epoch_finalization_requires_terminal_claims(direct_vm, direct_deploy, direct_alice):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice
    direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args())
    rounds.open_epoch(epoch_id)
    direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    direct_vm.warp("1970-01-01T00:03:20Z")
    with direct_vm.expect_revert("terminal"):
        rounds.open_challenge(epoch_id)
    assert rounds.get_claim(claim_id)["status"] == "SUBMITTED"


def test_epoch_local_claim_index_and_zero_weight_challenge_ceiling(direct_vm, direct_deploy, direct_alice, direct_bob):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice; direct_vm.warp("1970-01-01T00:01:40Z")
    epoch_id = rounds.create_epoch(*_epoch_args()); rounds.open_epoch(epoch_id); direct_vm.warp("1970-01-01T00:02:00Z")
    claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    assert rounds.get_epoch_claim_id(epoch_id, 0) == claim_id
    for index, url in enumerate(_urls(), start=1): direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    ineligible = {"eligibility": "INELIGIBLE", "attribution": "UNCLEAR", "completion": "UNCLEAR", "scope_match": "NO", "impact_band": "NONE", "duplicate_signal": "NONE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "not enough qualifying scope"}
    direct_vm.mock_llm(r"evidence reviewer", json.dumps(ineligible)); rounds.evaluate_claim(claim_id); assert rounds.get_claim(claim_id)["weight"] == 0
    direct_vm.warp("1970-01-01T00:03:20Z"); rounds.open_challenge(epoch_id)
    with direct_vm.prank(direct_bob): rounds.challenge_claim(claim_id, "out of scope", "https://counter.example.edu/evidence")
    direct_vm.clear_mocks()
    for index, url in enumerate(_urls(), start=1): direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    direct_vm.mock_web("https://counter.example.edu/evidence", {"status": 200, "body": "counter evidence"})
    upgraded = {"eligibility": "ELIGIBLE", "attribution": "CONFIRMED", "completion": "CONFIRMED_BEFORE_CUTOFF", "scope_match": "YES", "impact_band": "MATERIAL", "duplicate_signal": "NONE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "apparently eligible"}
    direct_vm.mock_llm(r"counter\.example\.edu", json.dumps(upgraded)); rounds.resolve_challenge(claim_id)
    claim = rounds.get_claim(claim_id); assert claim["weight"] == 0; assert claim["challenge_status"] == "REJECTED"; assert claim["status"] == "INELIGIBLE"


def test_inconclusive_challenge_preserves_original_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    rounds = direct_deploy("contracts/backfill_rounds.py")
    direct_vm.sender = direct_alice; direct_vm.warp("1970-01-01T00:01:40Z"); epoch_id = rounds.create_epoch(*_epoch_args()); rounds.open_epoch(epoch_id); direct_vm.warp("1970-01-01T00:02:00Z"); claim_id = rounds.submit_claim(epoch_id, "Fix", "bug", *_urls())
    for index, url in enumerate(_urls(), start=1): direct_vm.mock_web(url, {"status": 200, "body": f"source {index} confirms completed attribution before cutoff"})
    decision = {"eligibility": "ELIGIBLE", "attribution": "CONFIRMED", "completion": "CONFIRMED_BEFORE_CUTOFF", "scope_match": "YES", "impact_band": "MATERIAL", "duplicate_signal": "NONE", "evidence": [{"source": 1, "excerpt": "source 1 confirms"}, {"source": 3, "excerpt": "source 3 confirms"}], "reason": "supported"}
    direct_vm.mock_llm(r"evidence reviewer", json.dumps(decision)); rounds.evaluate_claim(claim_id); assert rounds.get_claim(claim_id)["weight"] == 3
    direct_vm.warp("1970-01-01T00:03:20Z"); rounds.open_challenge(epoch_id)
    with direct_vm.prank(direct_bob): rounds.challenge_claim(claim_id, "out of scope", "https://counter.example.edu/evidence")
    direct_vm.clear_mocks()
    for url in _urls(): direct_vm.mock_web(url, {"status": 503, "body": ""})
    direct_vm.mock_web("https://counter.example.edu/evidence", {"status": 503, "body": ""}); rounds.resolve_challenge(claim_id)
    claim = rounds.get_claim(claim_id); assert claim["status"] == "ELIGIBLE"; assert claim["weight"] == 3; assert claim["challenge_status"] == "INCONCLUSIVE"
