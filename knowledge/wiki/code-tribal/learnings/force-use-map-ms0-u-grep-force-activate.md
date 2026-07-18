# FORCE-USE-MAP-MS0/U-GREP-FORCE-ACTIVATE — [MAIN-FORCE] [FORCE-USE-MAP-MS0]/U-GREP-FORCE-ACTIVATE (slot:alpha): light the latent grep force-deny (cap-safe name->path resolver)

**Commit:** `39f414eb2d62` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T16:49:49-05:00
**Tags:** force-use-map-ms0, u-grep-force-activate, auto-distilled

## Subject
[MAIN-FORCE] [FORCE-USE-MAP-MS0]/U-GREP-FORCE-ACTIVATE (slot:alpha): light the latent grep force-deny (cap-safe name->path resolver)

## Body
```
[MAIN-FORCE] [FORCE-USE-MAP-MS0]/U-GREP-FORCE-ACTIVATE (slot:alpha): light the latent grep force-deny (cap-safe name->path resolver)

The grep-index-first force-deny (deny an exact-asset-name Grep, name the file to Read -- 50-80%
token win) shipped LATENT: it needs a graph hit carrying a file PATH, but the cap-safe find-cache
nodes carry NONE (verified 345,174 nodes, 0 with path) and the 728MB graph that does exceeds V8's
512MiB string cap. Closes that gap:
- scripts/lib/code-index-name-resolver.mjs (+9 tests): cap-safe (MAX 50MB, fail-soft) loader +
  pure name->path index from CODE_SYSTEM_INDEX.json (943KB, 4180 catalogued assets). Keys by short
  name AND file-stem, repo-relative via _meta.root, EXACT-key-only (no substring -> no over-fire).
- grep-index-first.mjs: decideForceGraphRead takes a resolvePaths fallback; cached once per process
  (getResolvePaths); wired at the call site. Backward-compatible (no resolvePaths -> legacy behavior).
- +6 force-branch tests (21 total); FORCE-USE-MAP.md gap marked CLOSED.

LIVE validated end-to-end: Grep AHPEngine/calcDispatcher -> DENY + path; substring Engine,
uncatalogued names, regex/multi-word, re-grep (deny-once) -> ALLOW. 48/48 tests, 2-arm scrutiny PASS
(0 P0/P1; fires only on the repo root cwd, fails safe-dormant otherwise). Deferred P2: double-extension
file-stem strip (no such names in the live .ts corpus).
```

## Files touched (6)
- .claude/hooks/grep-index-first-force.test.mjs |  34 ++++++++++++++++++++++++++++++++++
- .claude/hooks/grep-index-first.mjs            |  38 ++++++++++++++++++++++++++++++--------
- scripts/lib/code-index-name-resolver.mjs      |  93 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/code-index-name-resolver.test.mjs | 101 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/specs/FORCE-USE-MAP.md           |  22 ++++++++++++----------
- 5 files changed, 270 insertions(+), 18 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 39f414eb2d62`
- Milestone envelope: `mcp-server/data/milestones/FORCE-USE-MAP-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._