# OBSIDIAN-VAULT-SYNERGY/U-OBS-MEMPATH-PORTABILITY — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMPATH-PORTABILITY (slot:alpha): route 4 live memory-path hooks through resolveObsidianMemDir() — the 'fully wired to ENTIRE H drive' clause

**Commit:** `b45f08e732d7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T05:30:37-05:00
**Tags:** obsidian-vault-synergy, u-obs-mempath-portability, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMPATH-PORTABILITY (slot:alpha): route 4 live memory-path hooks through resolveObsidianMemDir() — the 'fully wired to ENTIRE H drive' clause

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMPATH-PORTABILITY (slot:alpha): route 4 live memory-path hooks through resolveObsidianMemDir() — the 'fully wired to ENTIRE H drive' clause

Discovery queue item #5. Four LIVE hot hooks hardcoded the C: memory dir
('C:/Users/wompu/.claude/projects/H--prism/memory'), each a latent re-strand of
the U-OBS-MEMDIR-HOMEDIR split-brain (home != wompu / casing differs):
  - precompact-memo-emit.mjs:68      MEMORY_DIR (PreCompact episodic-trace writer)
  - stop-auto-capture-per-slot.mjs:39 MEMORY_DIR (Stop per-slot memory writer)
  - stop-memory-size-watchdog.mjs:47  MEMORY_MD fallback (Stop MEMORY.md watchdog)
  - psn-leg-state-inject.mjs:531      memPath (UserPromptSubmit PSN-leg health)
Now single-sourced via the pure resolveObsidianMemDir() (homedir-derived, honors
PRISM_OBSIDIAN_MEM_DIR/PRISM_MEMORY_DIR). cag-router done last fire (c7e346da99).

Triage (R8): only these 4 had hardcoded CODE consts — the other discovery-named
hits (memory-mirror-to-vault, stop-obsidian-memory-feed, stop-obsidian-memory-extract,
stop_on_user_correction) are comments/directive-strings, and pretool-memory-size-gate
is a test fixture (left untouched).

Validated: all 4 node --check clean + RUNTIME-smoked (echo minimal stdin -> exit 0,
proving the ../../scripts/lib/obsidian-mem-dir.mjs import resolves at runtime, not just
syntactically). MEMORY.md path byte-identical to the old literal. Default behavior
unchanged on this box; portable + no re-split-brain if PRISM_MEMORY_DIR is set.
```

## Files touched (5)
- .claude/hooks/precompact-memo-emit.mjs       | 15 ++++++++++++---
- .claude/hooks/psn-leg-state-inject.mjs       |  3 ++-
- .claude/hooks/stop-auto-capture-per-slot.mjs |  3 ++-
- .claude/hooks/stop-memory-size-watchdog.mjs  |  3 ++-
- 4 files changed, 18 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b45f08e732d7`
- Milestone envelope: `mcp-server/data/milestones/OBSIDIAN-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._