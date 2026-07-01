# H-DRIVE-VAULT-SYNERGY/U-8 — [MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-8 (slot:papa): coverage anti-rot gate -- flags uncategorized top-level H:/ domains

**Commit:** `4f8faac80ae8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T04:35:30-05:00
**Tags:** h-drive-vault-synergy, u-8, auto-distilled

## Subject
[MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-8 (slot:papa): coverage anti-rot gate -- flags uncategorized top-level H:/ domains

## Body
```
[MAIN-FORCE] [H-DRIVE-VAULT-SYNERGY]/U-8 (slot:papa): coverage anti-rot gate -- flags uncategorized top-level H:/ domains

Loop iteration 14 (H-DRIVE backlog). scripts/h-drive-coverage-gate.mjs: a READ-ONLY watchdog that
detects 2nd-brain coverage rot -- a NEW top-level H:/ folder that the U-1 indexer's coverage map
(state/shared/H-DRIVE-COVERAGE.json) has not yet categorized. Cheap shallow scan (readdir of H:/ +
small JSON read, no walk/PowerShell) vs the saved map, reusing classifyTopLevel (R8). A dir is a
GAP iff substantive (skip:false) AND a real worktree-clone (has .git) AND absent from the map's
'H:/ top-level' scope (case-insensitive). exit 0 clean / 1 drift / 2 measurement-failure (R12 --
never reports clean when it could not measure). Pure exports findUncoveredDomains/readLiveTopLevel/
loadCoverage/makeGitCloneCheck. Live: 'OK -- 40 covered, 147 live, 0 uncovered' (map currently
complete). CLI is the CI/cron/pre-commit surface; an in-session Stop advisory is [SCOPED]-DEFERRED
(fleet-wide harness change best made from a main-tree session; the daily U-2 reindex already bounds
drift to ~24h).

17 node:test cases incl. 3 subprocess (spawnSync) exit-code oracles + a real-data integration test.

Per-file scrutiny: arm A (code-analyzer) + arm B (reviewer). Round 1: arm B FAIL on 3 P1s --
(1) FALSE-NEGATIVE: PRISM_FLOW (a standalone Claude-Flow V3 product with NO .git) was mis-classified
worktree-clone by the name-only regex and silently swallowed. FIX: an injectable isWorktreeClone
predicate (default checks a real .git) -- a clone-by-name with no .git now goes to an advisory
'suspectClones' bucket (surfaced in a NOTE, NOT gating ok -- 5 of 6 such dirs are prism-derived
debris that must not cry wolf). PRISM_FLOW is now visible, never lost. (2) docstring overclaimed a
Stop-hook surface that does not exist -> corrected to DEFERRED + documented the delegated limitation.
(3) main()/exit-codes untested -> 3 subprocess oracles added. Plus A-P2: entrypoint guard made
case-insensitive (Windows path-case silent-no-op). Round 2: BOTH arms PASS, 0 P0/P1.

Routed: the 6 prism-named dirs without .git (PRISM_FLOW + 5 debris) are a U-1 taxonomy nuance
(name-only clone heuristic) -> surfaced by the gate's NOTE for operator triage. Reuses
h-drive-to-vault.mjs conventions (H_ROOT, MAP_JSON, TOP_LEVEL_SCOPE label).
```

## Files touched (3)
- scripts/h-drive-coverage-gate.mjs      | 203 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/h-drive-coverage-gate.test.mjs | 221 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 424 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4f8faac80ae8`
- Milestone envelope: `mcp-server/data/milestones/H-DRIVE-VAULT-SYNERGY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._