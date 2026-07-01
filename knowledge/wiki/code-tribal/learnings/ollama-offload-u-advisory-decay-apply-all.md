# OLLAMA-OFFLOAD/U-ADVISORY-DECAY-APPLY-ALL — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-APPLY-ALL (slot:sierra): wire advisory-decay into wiki-read-offload + nav-rerank (R15 apply-to-all, 2 of 3 remaining siblings)

**Commit:** `7c184bc97cf3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T12:13:57-05:00
**Tags:** ollama-offload, u-advisory-decay-apply-all, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-APPLY-ALL (slot:sierra): wire advisory-decay into wiki-read-offload + nav-rerank (R15 apply-to-all, 2 of 3 remaining siblings)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OLLAMA-OFFLOAD]/U-ADVISORY-DECAY-APPLY-ALL (slot:sierra): wire advisory-decay into wiki-read-offload + nav-rerank (R15 apply-to-all, 2 of 3 remaining siblings)

Completes the decay-gate apply-to-all for the advisory-offload class beyond the 2 proven-noise hooks (large-read-digest 05906647ad 3-of-3 PASS + grep-index-first 8f373e9e43). These two are byte-identical clones of that pattern: after bumpStats (probe counter advances), call decayDecision(HOOK_KEY,{statsPath:STATS_PATH}); if !fire, suppress the advisory (continue, no additionalContext). STATS_PATH made env-overridable (PRISM_WIKI_OFFLOAD_STATS_PATH / PRISM_NAV_RERANK_STATS_PATH) so read-path==write-path + hermetic testing.

Both are INSUFFICIENT-DATA today (wiki=no-telemetry, nav=insufficient) so decay is a no-op (fire:true) -- this ARMS them: when either accumulates >=50 injections at <5% conversion it self-suppresses (with a 1-in-20 self-revival probe), instead of flooding context like large-read did (0/122). Future-proofs the whole advisory class against the next 0/N noise leak (clause-4 inefficiency prevention).

VALIDATED: wiki 20/20 + nav 21/21 existing tests pass (no regression from the wire) + 2 new nav decay subprocess tests (muted-on-noise / insufficient-fires) = nav 23/23. LIVE decayDecision confirms both no-op fire:true now (correct fail-safe). nav has a dedicated decay test (representative twin clone); wiki relies on existing-tests + the byte-identical pattern proven 2x (large-read 3-of-3 + grep-index). SCOPED remaining: ollama-route-recommender (different shape -- no STATS_PATH const, 278 lines -- warrants its own read+wire, not a rushed clone).
```

## Files touched (4)
- .claude/hooks/nav-rerank-advisory.mjs        | 24 +++++++++++++++++++++++-
- .claude/hooks/nav-rerank-advisory.test.mjs   | 50 ++++++++++++++++++++++++++++++++++++++++++++++++++
- .claude/hooks/wiki-read-offload-advisory.mjs | 32 +++++++++++++++++++++++++++-----
- 3 files changed, 100 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7c184bc97cf3`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-OFFLOAD.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._