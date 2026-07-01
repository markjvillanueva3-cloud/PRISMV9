# SYNERGY-SUBSTRATE-MS0/U-SHI01 — [MAIN] [SYNERGY-SUBSTRATE-MS0]/U-SHI01: substrate-health SessionStart injector

**Commit:** `01ff65a7347f` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T00:06:27-05:00
**Tags:** synergy-substrate-ms0, u-shi01, auto-distilled

## Subject
[MAIN] [SYNERGY-SUBSTRATE-MS0]/U-SHI01: substrate-health SessionStart injector

## Body
```
[MAIN] [SYNERGY-SUBSTRATE-MS0]/U-SHI01: substrate-health SessionStart injector

Surfaces declared-vs-actual drift in every chat's SessionStart context without
explicit invocation. Compounds with today's earlier ship of declared-vs-actual.mjs
(commit aad2152f7f) — the gate I shipped runs only inside /forge7 §Phase 0.2;
this hook extends its reach to EVERY session.

Discipline:
- ADVISORY only, NEVER blocking — emits additionalContext + exits 0 on any error
- Cache at state/shared/.cache/substrate-health-last.json, TTL 2h (PRISM_SUBSTRATE_HEALTH_TTL_MS)
- spawnSync timeout 8s — declared-vs-actual.mjs is sub-second; cache hit path ~5-15ms
- Pure formatDigest export — 27 hermetic tests; main() gated by isInvokedDirectly()
  so tests don't pollute stdout
- Knob: PRISM_SUBSTRATE_HEALTH_INJECT=0

Per-file scrutiny (2 reviewers, 4 P1s fixed in-session):
- P1#1 (rev-A): case-insensitive path compare — Windows accepts H:/Prism vs h:/prism,
  fixed via path.relative()===''
- P1#2 (rev-A): formatDigest({summary:{}}) rendered "undefined" — strict ok===true
  + Number.isFinite&&>=0 coerce; 4 regression-guard tests
- P1#1 (rev-B): hardcoded PRISM_ROOT — added process.env.PRISM_ROOT override
- P1#2 (rev-B): unbounded JSON.parse on cache — 1MB MAX_CACHE_BYTES cap
  (hostile-payload class; sister to ask-ollama 80MB graph cap)

Wired in user-global C:/Users/wompu/.claude/settings.json SessionStart[0].hooks
at index 23 (after awareness-snapshot-inject, sibling injector). Auto-mirrored
to H:/.claude/settings.json via c-to-h-mirror.

E2E verified: drift 341 / MCP clean / 336 hooks orphan-on-disk → digest renders
in <50ms cache-hit path. 27/27 tests PASS.

Wiki: knowledge/wiki/architecture/substrate-health-inject.md (pending).
Memory: reference_substrate_health_inject_2026_05_19.md (pending).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Files touched (3)
- .claude/hooks/substrate-health-inject.mjs      | 201 ++++++++++++++++++
- .claude/hooks/substrate-health-inject.test.mjs | 277 +++++++++++++++++++++++++
- 2 files changed, 478 insertions(+)

## Lessons surfaced in commit body
- tile-payload class; sister to ask-ollama 80MB graph cap)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 01ff65a7347f`
- Milestone envelope: `mcp-server/data/milestones/SYNERGY-SUBSTRATE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._