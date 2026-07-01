# COMPACTION-OPTIMAL/P1-P2 — [MAIN] [COMPACTION-OPTIMAL]/P1-P2: TTL 60→180s, HP-bar single-source, dynamic slots, Stop sidecar, drop dead compression hook

**Commit:** `7dc2702e23e3` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T16:53:50-05:00
**Tags:** compaction-optimal, p1-p2, auto-distilled

## Subject
[MAIN] [COMPACTION-OPTIMAL]/P1-P2: TTL 60→180s, HP-bar single-source, dynamic slots, Stop sidecar, drop dead compression hook

## Body
```
[MAIN] [COMPACTION-OPTIMAL]/P1-P2: TTL 60→180s, HP-bar single-source, dynamic slots, Stop sidecar, drop dead compression hook

P1a — staleness TTL 60s→180s in all three readers (DEFAULT_STALE_TTL_MS,
statusline TOKEN_AWARENESS_SIDECAR_TTL_MS, precompact SIDECAR_TTL_MS, kept
equal). 60s false-flagged healthy sidecars stale on any turn over a minute.
P1b — statusline HP bar: readTokenAwarenessSidecar now returns the sidecar
even when stale (annotated _stale), so the bar shows the SAME ctx number the
injected token-awareness block shows (with a ⚠stale flag) instead of silently
swapping to its own estimateCtx() — closes the bar/tracker divergence.
P2b — statusline SLOT_NAMES derives from the loaded chat-slots object (keys
seeded from chat-slots.mjs SLOT_NAMES) — renders all 26 slots, not a stale 12.
P2c — compression-precompact.mjs marked + unwired from the PreCompact chain:
it was wired on PreCompact but triggered on input.prompt (absent on PreCompact
events) so it no-opped 100% of fires; its SESSION_COMPRESSED output had no
reader; redundant with the canonical precompact-handoff. File preserved.

P2a (token-awareness-sidecar wired on Stop) is a ~/.claude/settings.json
change — applied + mirrored C:→H:, outside this repo so not in this commit.

Tests: token-awareness-state 46/46, precompact-auto-trigger 14/14 — both
fixture-updated for the 180s TTL, assertions unchanged. settings.json
JSON-validated on C: and H:.
```

## Files touched (7)
- .../__tests__/precompact-auto-trigger.test.mjs     |  6 +++---
- .claude/hooks/compression-precompact.mjs           |  9 ++++++++
- .claude/hooks/precompact-auto-trigger.mjs          |  5 ++++-
- .claude/statusline.mjs                             | 25 ++++++++++++++++------
- .../lib/__tests__/token-awareness-state.test.mjs   | 10 +++++----
- scripts/lib/token-awareness-state.mjs              | 11 +++++++---
- 6 files changed, 48 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7dc2702e23e3`
- Milestone envelope: `mcp-server/data/milestones/COMPACTION-OPTIMAL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._