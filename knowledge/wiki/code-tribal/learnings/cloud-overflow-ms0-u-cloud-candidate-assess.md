# CLOUD-OVERFLOW-MS0/U-CLOUD-CANDIDATE-ASSESS — [MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-CLOUD-CANDIDATE-ASSESS (slot:papa): cloud-model benchmark harness on the verifiable battery

**Commit:** `8a0fcc9a2073` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:59:24-05:00
**Tags:** cloud-overflow-ms0, u-cloud-candidate-assess, auto-distilled

## Subject
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-CLOUD-CANDIDATE-ASSESS (slot:papa): cloud-model benchmark harness on the verifiable battery

## Body
```
[MAIN-FORCE] [CLOUD-OVERFLOW-MS0]/U-CLOUD-CANDIDATE-ASSESS (slot:papa): cloud-model benchmark harness on the verifiable battery

Completes 'add GLM-5 as a benchmarked candidate' -- scripts/assess-cloud-candidate.mjs runs
PRISM's VERIFIABLE capability battery (lib/ollama-capability-battery.mjs -- R8, the same
measuring stick the local Ollama probe uses) against any OpenRouter model(s) and scores real
correctness (each case has a known answer + code verify()). Produces a per-model pass-rate /
avg-latency / cost matrix + delta-vs-baseline -- the evidence required before a candidate is
promoted to a routing rung in model-routing-policy.mjs.

SAFE BY DEFAULT: dry-run unless --run; --run POSTs to OpenRouter (third party) + spends real
money for paid models, so the dry-run prints plan + upper-bound cost first (the full glm-5.2
battery is ~$0.006). Reuses callOpenRouter (key redaction, fail-soft). A failed/errored/thrown
call counts as a FAIL, never silently skipped (R12). Pure core (buildRunPlan /
estimatePlanCostUsd / runAssessment[injected caller] / renderReport) exported + 8 hermetic
tests; dry-run CLI smoke-tested live (36 calls, $0.0058 est).

A/B a candidate live: node scripts/assess-cloud-candidate.mjs --models glm-5.2,nemotron-super-free --run
```

## Files touched (3)
- scripts/assess-cloud-candidate.mjs      | 207 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/assess-cloud-candidate.test.mjs |  92 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 299 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8a0fcc9a2073`
- Milestone envelope: `mcp-server/data/milestones/CLOUD-OVERFLOW-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._