# TOKEN-SAVINGS/U-OLLAMA-DRIFT-GUARD-BYSOURCE-HARDEN — [MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-DRIFT-GUARD-BYSOURCE-HARDEN (slot:alpha): drift-guard ignores a corrupt non-object bySource (arm-C P2)

**Commit:** `2ca92f74c587` · **By:** markjvillanueva3-cloud · **At:** 2026-06-20T22:46:07-05:00
**Tags:** token-savings, u-ollama-drift-guard-bysource-harden, auto-distilled

## Subject
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-DRIFT-GUARD-BYSOURCE-HARDEN (slot:alpha): drift-guard ignores a corrupt non-object bySource (arm-C P2)

## Body
```
[MAIN-FORCE] [TOKEN-SAVINGS]/U-OLLAMA-DRIFT-GUARD-BYSOURCE-HARDEN (slot:alpha): drift-guard ignores a corrupt non-object bySource (arm-C P2)

3-of-3 arm C flagged that findUntrackedBridges' bySource activity check used
Object.keys(v.bySource).length > 0, which is truthy for a non-empty STRING or
ARRAY -- so a structurally-corrupt stats file could emit one spurious
untracked-bridge advisory. Unreachable via the legitimate writer (always a plain
object) but a cheap correctness hardening for the exact false-positive resistance
the guard exists for. Added typeof===object && !Array.isArray guard. +1
regression test (corrupt string/array bySource -> not flagged). 41/41.
```

## Files touched (3)
- scripts/__tests__/ollama-offload-dashboard.test.mjs | 10 ++++++++++
- scripts/ollama-offload-dashboard.mjs                |  2 +-
- 2 files changed, 11 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2ca92f74c587`
- Milestone envelope: `mcp-server/data/milestones/TOKEN-SAVINGS.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._