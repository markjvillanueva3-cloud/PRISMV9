# JULIETT-12CHAT-ALLOCATION-MS0/U-MEMORY-COMPRESS-V2-DOC — [MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2-DOC: wiki entry for the shipped unit

**Commit:** `8486d8934465` · **By:** markjvillanueva3-cloud · **At:** 2026-05-19T22:01:08-05:00
**Tags:** juliett-12chat-allocation-ms0, u-memory-compress-v2-doc, auto-distilled

## Subject
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2-DOC: wiki entry for the shipped unit

## Body
```
[MAIN] [JULIETT-12CHAT-ALLOCATION-MS0]/U-MEMORY-COMPRESS-V2-DOC: wiki entry for the shipped unit

4-surface doc-reflection per feedback_reflect_all_changes_post_update:
  surface 1 — CLAUDE.md: no entry added (this is a unit ship, not a regression; the JULIETT-12CHAT-ALLOCATION-MS0 section in CLAUDE.md already exists at a milestone level)
  surface 2 — Wiki: knowledge/wiki/architecture/u-memory-compress-v2.md (THIS commit) — pure-core API surface, decision matrix, wiring, knobs, 74-test coverage breakdown, per-file scrutiny round 1+2 trace, rollback path
  surface 3 — Memory (auto-feed): C:/Users/wompu/.claude/projects/H--PRISM/memory/reference_u_memory_compress_v2_2026_05_19.md (in C: auto-memory dir, not tracked by H:/prism repo; stop-obsidian-memory-feed.mjs Stop hook replicates to knowledge/memories/reference/ on next session end)
  surface 4 — MEMORY.md index pointer: added in same C: dir (live integration test of the gate I just shipped — 199-byte append on a 13277 B file, well under 22000 B target, gate correctly allowed; post-edit status ok, 11100 B headroom)

Cross-refs: code commit 3798922e49 (the source + tests).
```

## Files touched (4)
- .../wiki/architecture/u-memory-compress-v2.md      | 167 +++++++++++++
- .../__tests__/fleet-reaper-bg-throttle.test.mjs    | 261 +++++++++++++++++++++
- scripts/lib/bg-app-throttle.mjs                    | 222 ++++++++++++++++++
- 3 files changed, 650 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8486d8934465`
- Milestone envelope: `mcp-server/data/milestones/JULIETT-12CHAT-ALLOCATION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._