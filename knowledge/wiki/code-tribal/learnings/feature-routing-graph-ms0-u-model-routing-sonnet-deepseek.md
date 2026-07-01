# FEATURE-ROUTING-GRAPH-MS0/U-MODEL-ROUTING-SONNET-DEEPSEEK — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-SONNET-DEEPSEEK (slot:alpha): coding classes -> newest Sonnet @ max; reasoning offload -> deepseek-r1:32b (+ coherence-guard names dup)

**Commit:** `4110384930be` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:33:29-05:00
**Tags:** feature-routing-graph-ms0, u-model-routing-sonnet-deepseek, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-SONNET-DEEPSEEK (slot:alpha): coding classes -> newest Sonnet @ max; reasoning offload -> deepseek-r1:32b (+ coherence-guard names dup)

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-SONNET-DEEPSEEK (slot:alpha): coding classes -> newest Sonnet @ max; reasoning offload -> deepseek-r1:32b (+ coherence-guard names dup)

Operator directive 2026-06-18: coding tasks on newest Sonnet + max settings; deepseek-r1 for Ollama reasoning (cloud-if-free fallback). Applied to the feature-routing graph: build.modelTier + fix.modelTier -> newest Sonnet (claude-sonnet-4-6) at MAX effort as the coding default, Opus reserved ONLY for deep architecture / safety-critical judgment (R7 escape kept). Reasoning-offload dims -> deepseek-r1:32b: plan (deep-reasoning draft), fix (reasoning error-triage), review (advisory pre-flight, upgraded from :14b). R12 FINDINGS: (1) deepseek-r1 IS live in Ollama -- deepseek-r1:14b AND :32b both present (16 models) -- so the CLAUDE.md ':14b tags retired 2026-06-04' line is STALE; no cloud fallback needed; flag for golf (root CLAUDE.md is golf-only). (2) qwen3-coder:30b now available (newer coder model -- future upgrade for the code-text offload). Spec 1a/1b tables synced; JSON regenerated; 48/48 lib tests. ALSO folded the arm-C P3 fix from U-CONTEXT-STRATEGY-LENS: extracted pure assertCatalogCoherence() that NAMES missing/extra/dup substrates (the prior inline guard left dup:[] empty) + 2 R9 tests. R7 CONFLICT SURFACED (not silently resolved): the LIVE model-tier-advisor (model-routing-policy.mjs + claude-tier-router.mjs, india's U-MODEL-ROUTE-POLICY) still routes BUILD->Opus by design -- contradicts this directive. The graph doctrine (route-inject) now says Sonnet-for-coding; aligning the live router fleet-wide is higher-blast-radius + india's domain -> recommend operator confirm before flipping. Both are advisory (neither force-switches).
```

## Files touched (6)
- scripts/generate-feature-routing-graph.mjs  | 17 ++++++-----------
- scripts/lib/feature-routing-graph.mjs       | 31 ++++++++++++++++++++++++++-----
- scripts/lib/feature-routing-graph.test.mjs  | 18 +++++++++++++++++-
- state/shared/feature-routing-graph.json     | 10 +++++-----
- state/shared/specs/FEATURE-ROUTING-GRAPH.md | 10 +++++-----
- 5 files changed, 59 insertions(+), 27 deletions(-)

## Lessons surfaced in commit body
- till routes BUILD->Opus by design -- contradicts this directive. The graph doctrine (route-inject) now says Sonnet-for-coding; aligning the live router fleet-wide is higher-blast-radius + india's domain -> recommend operator confirm before flipping. Both are advisory (neither force-switches).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4110384930be`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._