# TEST-INTEGRITY/U-RIGOR-FLOOR-ADVISORY — [MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-FLOOR-ADVISORY (slot:alpha): critical-domain test-rigor floor (advisory) + wire CI legitimacy gate

**Commit:** `266812bce7fd` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:05:04-05:00
**Tags:** test-integrity, u-rigor-floor-advisory, auto-distilled

## Subject
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-FLOOR-ADVISORY (slot:alpha): critical-domain test-rigor floor (advisory) + wire CI legitimacy gate

## Body
```
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-FLOOR-ADVISORY (slot:alpha): critical-domain test-rigor floor (advisory) + wire CI legitimacy gate

Orthogonal axis to the existing fake-test BLOCK (placeholder/synthetic/mocked-SUT): catches SHALLOW real-but-thin tests for the 7 critical domains. New pure scoreTestRigor + detectShallowCriticalTest in test-legitimacy-core.mjs (shared by the PreToolUse hook AND ci-test-legitimacy-scan). ADVISORY-ONLY (never hard-blocks): corpus calibration (scripts/measure-test-rigor-corpus.mjs) MEASURED that a hard block on no-failure-mode+no-adversarial false-positives 42.6% of critical-domain tests -- positive reference-value tests are the R9 gold standard, not shallow; the thin-band advisory fires on 1.5% (25/1656). Wired non-blocking into test-legitimacy.mjs (both entrypoints); the fake-test BLOCK path is verified unchanged and still blocking. Also wires ci-test-legitimacy-scan into ci.yml -- the env-flag-proof durable CI backstop. Validation: 14/14 new + 7/7 existing tests; unanimous PASS across 4 model arms (Opus reviewer max + Sonnet analyzer + Hermes/Grok + Ollama qwen). Hard semantic judgment (would-it-fail-if-regressed) deferred to a planned AI rigor judge (Unit 2). Builds on prior in-flight test-legitimacy hardening (presence-dominance calibration + critical-domain wiring + Edit-fragment splice).
```

## Files touched (6)
- .claude/helpers/lib/test-legitimacy-core.mjs      |  97 ++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/__tests__/test-rigor-floor.test.mjs | 149 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/test-legitimacy.mjs                 |  85 ++++++++++++++++++++++++++++++++---
- .github/workflows/ci.yml                          |   8 ++++
- scripts/measure-test-rigor-corpus.mjs             | 133 +++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 5 files changed, 465 insertions(+), 7 deletions(-)

## Lessons surfaced in commit body
- till blocking. Also wires ci-test-legitimacy-scan into ci.yml -- the env-flag-proof durable CI backstop. Validation: 14/14 new + 7/7 existing tests; unanimous PASS across 4 model arms (Opus reviewer max + Sonnet analyzer + Hermes/Grok + Ollama qwen). Hard semantic judgment (would-it-fail-if-regressed) deferred to a planned AI rigor judge (Unit 2). Builds on prior in-flight test-legitimacy hardening (

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 266812bce7fd`
- Milestone envelope: `mcp-server/data/milestones/TEST-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._