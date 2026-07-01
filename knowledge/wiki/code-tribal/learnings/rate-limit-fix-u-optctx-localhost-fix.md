# RATE-LIMIT-FIX/U-OPTCTX-LOCALHOST-FIX — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OPTCTX-LOCALHOST-FIX (slot:bravo): activate optimal-context-inject -- localhost->127 (wired-but-broken dormant hook)

**Commit:** `51fc3ee9d36c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T22:15:46-05:00
**Tags:** rate-limit-fix, u-optctx-localhost-fix, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OPTCTX-LOCALHOST-FIX (slot:bravo): activate optimal-context-inject -- localhost->127 (wired-but-broken dormant hook)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [RATE-LIMIT-FIX]/U-OPTCTX-LOCALHOST-FIX (slot:bravo): activate optimal-context-inject -- localhost->127 (wired-but-broken dormant hook)

3rd wired-but-broken hook fixed (of 4 wired of the 33 localhost callers): optimal-context-inject.mjs fires on every prompt + calls /api/embeddings to recommend relevant engines, but line 19 hardcoded http://localhost:11434 -> IPv6-unreachable -> fail-soft {continue:true} with NO context. Fix: process.env.OLLAMA_URL || http://127.0.0.1:11434 (env-overridable). Uses EMBEDDINGS (nomic, fast/cheap) -> no /api/chat contention risk; additive + fail-soft -> low blast radius. LIVE-VALIDATED: test prompt now yields 149-char additionalContext (DeepAIIntelligenceEngine/MetaAIOrchestrator recommendations) vs empty before.

HONESTY (R8/R12): this localhost->IPv6 bug was FIRST found 2026-05-30 ([[reference_ollama_hooks_localhost_ipv6_bug_2026_05_30]], 'fleet-wide all 26 chats') -- my reference_ollama_localhost_ipv6_2026_06_09 wrongly called the 06-09 instance 'first'. The 05-30 fix was INCOMPLETE or REGRESSED: 33 files still hardcode localhost 10 days later. The systemic re-audit + the incomplete-prior-fix finding is the real value -- a one-time hook fix does not hold fleet-wide; needs the env-var (done) + a lint guard against new localhost:11434 hardcodes.
```

## Files touched (2)
- .claude/hooks/optimal-context-inject.mjs | 6 +++++-
- 1 file changed, 5 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- wrongly called the 06-09 instance 'first'. The 05-30 fix was INCOMPLETE or REGRESSED: 33 files still hardcode localhost 10 days later. The systemic re-audit + the incomplete-prior-fix finding is the real value -- a one-time hook fix does not hold fleet-wide; needs the env-var (done) + a lint guard against new localhost:11434 hardcodes.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 51fc3ee9d36c`
- Milestone envelope: `mcp-server/data/milestones/RATE-LIMIT-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._