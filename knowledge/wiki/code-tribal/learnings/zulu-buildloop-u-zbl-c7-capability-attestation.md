# ZULU-BUILDLOOP/U-ZBL-C7-CAPABILITY-ATTESTATION — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C7-CAPABILITY-ATTESTATION (slot:zulu, operator 'build for bravo'): ZuluCapabilityAttestationEngine -- outcome-correlated trust scores

**Commit:** `269e4956e1b9` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T19:36:26-05:00
**Tags:** zulu-buildloop, u-zbl-c7-capability-attestation, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C7-CAPABILITY-ATTESTATION (slot:zulu, operator 'build for bravo'): ZuluCapabilityAttestationEngine -- outcome-correlated trust scores

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-C7-CAPABILITY-ATTESTATION (slot:zulu, operator 'build for bravo'): ZuluCapabilityAttestationEngine -- outcome-correlated trust scores

C7 of the hermes-zulu capability queue. Closes the feedback gap in
ZuluTaskAuctionEngine: domain_match (highest bid weight) trusts SOUL-declared
domain expertise completely with NO outcome loop. This engine correlates a
slot's declared affinity against its actual task-outcome history and emits an
AttestationScore {slot, domain, declared_affinity, empirical_success_rate,
sample_n, ci_lower/upper, confidence, bid_modifier, over_claim} plus an advisory
multiplicative bid_modifier the auction applies to domain_match.

- Credibility uses the WILSON score interval LOWER bound (not the point
  estimate): n=1 success -> lower ~0.207, NOT an overconfident 1.0; small n ->
  wide interval -> conservative modifier. Hand-verified refs (8/10 -> [0.490,
  0.943]) pinned in tests.
- bid_modifier is ALWAYS > 0 (in [0.5, 1.25]) -- NEVER a veto; the
  ZuluFleetGovernor authority hierarchy is unchanged. Below MIN_SAMPLE_N (20)
  the score is 'insufficient' and the modifier is NEUTRAL 1.0 (R12 honest: an
  unproven slot is never penalized on thin evidence).
- over_claim flags a declared-but-empirically-discredited self-claim (the
  principal C8 soul-amendment signal).
- declared_affinity is CALLER-supplied (the auction already loads souls) -- this
  engine reads no soul YAML itself (decoupled + honest).
- Durable outcome store clones C2/C5 discipline: schemaVersion-tagged, atomic
  tmp+rename, fail-closed on corrupt/schema-mismatch, per-pair ring capped.
- Wired prism_session: attestation_record_outcome / attestation_score /
  attestation_score_all / attestation_bid_modifier. Actions 387->391.
- 26 tests (22 engine + 4 dispatcher round-trip). esbuild-clean, 0 tsc errors in
  C7 files. Full Zulu suite 221/221.

DEDUP-verified NEW (TrustRegionEngine = numerical optimization; ZeroTrust* =
security telemetry; no AttestationScore/empirical_success_rate anywhere). R9
caught two test errors pre-ship (a confidence-bucket boundary -> fixed code to
>= buckets; a transposed Wilson upper-bound ref 0.9331->0.9433 -> fixed test).

3-of-3 scrutiny PENDING (reviewer agents rate-limited, reset 8pm CT 2026-06-15);
batched with C5+C6 for the next agent-available window before clearance.
```

## Files touched (5)
- mcp-server/src/__tests__/ZuluCapabilityAttestationEngine.dispatch.test.ts |  85 +++++++++++++++++++++
- mcp-server/src/__tests__/ZuluCapabilityAttestationEngine.test.ts          | 217 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/ZuluCapabilityAttestationEngine.ts                 | 430 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                     |  37 +++++++++
- 4 files changed, 769 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 269e4956e1b9`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._