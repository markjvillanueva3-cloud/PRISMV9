# TEST-INTEGRITY/U-RIGOR-JUDGE-HERMES-MODEL-FIX — [MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-HERMES-MODEL-FIX (slot:alpha): fix ollama --model forwarded to hermes fallback (HTTP 400) + octopus 2-voice consensus validates the judge

**Commit:** `02641a95ca2c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T09:04:45-05:00
**Tags:** test-integrity, u-rigor-judge-hermes-model-fix, auto-distilled

## Subject
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-HERMES-MODEL-FIX (slot:alpha): fix ollama --model forwarded to hermes fallback (HTTP 400) + octopus 2-voice consensus validates the judge

## Body
```
[MAIN-FORCE] [TEST-INTEGRITY]/U-RIGOR-JUDGE-HERMES-MODEL-FIX (slot:alpha): fix ollama --model forwarded to hermes fallback (HTTP 400) + octopus 2-voice consensus validates the judge

BUG (auto-fix-inline, surfaced running an octopus 2nd voice): callJudge forwarded the OLLAMA --model id (e.g. gpt-oss:120b) to the Hermes proxy on fallback -> HTTP 400 (different model namespace). Fix: hermes uses its own default (or an explicit --hermes-model); the ollama --model never reaches hermes. Live-verified: --model=gpt-oss:120b now degrades to hermes-default (verdict returned) instead of 400. OCTOPUS VALIDATION (operator directive: utilize octopus for validation): re-judged both extremes with TWO distinct voices -- xAI Grok + Ollama qwen2.5-coder:32b -- UNANIMOUS consensus confirming the judge: SelfLearningCAMEngine WEAK (Grok 15 / qwen 20, neither would catch a regression), sfc-runout RIGOROUS (Grok 85 / qwen 85, both would). The validator is consensus-validated. gpt-oss:120b would not load cold under live fleet GPU pressure (R12: reported). Consensus recorded in TEST-RIGOR-AUDIT-2026-06-24.md.
```

## Files touched (3)
- scripts/test-rigor-judge.mjs                      |  6 +++++-
- state/shared/specs/TEST-RIGOR-AUDIT-2026-06-24.md | 18 ++++++++++++++++++
- 2 files changed, 23 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tilize octopus for validation): re-judged both extremes with TWO distinct voices -- xAI Grok + Ollama qwen2.5-coder:32b -- UNANIMOUS consensus confirming the judge: SelfLearningCAMEngine WEAK (Grok 15 / qwen 20, neither would catch a regression), sfc-runout RIGOROUS (Grok 85 / qwen 85, both would). The validator is consensus-validated. gpt-oss:120b would not load cold under live fleet GPU pressure (R

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 02641a95ca2c`
- Milestone envelope: `mcp-server/data/milestones/TEST-INTEGRITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._