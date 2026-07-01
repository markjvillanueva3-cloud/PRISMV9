# OLLAMA-ROUTING/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO-P2 — [MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO-P2 (slot:alpha): close the lone 3-of-3 P2 on b2d527b126 -- mirror the first loop's `matrix || {}` guard in excludeNoSignalModels' second loop (defense-in-depth; safe today since allModels stays empty on a null matrix, but a foot-gun if the first guard is ever refactored). All 3 arms PASSED the parent commit; this is the strictly-additive hardening. 12/12 probe tests unchanged.

**Commit:** `81ad651188e4` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T11:55:27-05:00
**Tags:** ollama-routing, u-alpha-ollama-probe-null-not-zero-p2, auto-distilled

## Subject
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO-P2 (slot:alpha): close the lone 3-of-3 P2 on b2d527b126 -- mirror the first loop's `matrix || {}` guard in excludeNoSignalModels' second loop (defense-in-depth; safe today since allModels stays empty on a null matrix, but a foot-gun if the first guard is ever refactored). All 3 arms PASSED the parent commit; this is the strictly-additive hardening. 12/12 probe tests unchanged.

## Body
```
[MAIN-FORCE] [OLLAMA-ROUTING]/U-ALPHA-OLLAMA-PROBE-NULL-NOT-ZERO-P2 (slot:alpha): close the lone 3-of-3 P2 on b2d527b126 -- mirror the first loop's `matrix || {}` guard in excludeNoSignalModels' second loop (defense-in-depth; safe today since allModels stays empty on a null matrix, but a foot-gun if the first guard is ever refactored). All 3 arms PASSED the parent commit; this is the strictly-additive hardening. 12/12 probe tests unchanged.
```

## Files touched (2)
- scripts/ollama-capability-probe.mjs | 2 +-
- 1 file changed, 1 insertion(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 81ad651188e4`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-ROUTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._