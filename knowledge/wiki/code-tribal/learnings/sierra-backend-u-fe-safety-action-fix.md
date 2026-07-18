# SIERRA-BACKEND/U-FE-SAFETY-ACTION-FIX — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SAFETY-ACTION-FIX (slot:sierra): wire safety routes to real prism_safety actions (3 P0 -> 0)

**Commit:** `afb187c6c3c3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T09:05:57-05:00
**Tags:** sierra-backend, u-fe-safety-action-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SAFETY-ACTION-FIX (slot:sierra): wire safety routes to real prism_safety actions (3 P0 -> 0)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-SAFETY-ACTION-FIX (slot:sierra): wire safety routes to real prism_safety actions (3 P0 -> 0)

Fixes the 3 SAFETY-CRITICAL safety.ts P0s found by U-FE-ROUTE-ACTION-CONTRACT (surfaced once the
new Set([...]) parser fix made prism_safety verifiable). The router called 3 actions absent from the
135-action prism_safety dispatcher (validate, check_limits, collision_check) -> z.enum reject -> silent
HTTP-200+{error} the SPA cannot detect, on safety endpoints.

- /collision    -> real `check_toolpath_collision` (was `collision_check`).
- /check-limits -> real `get_safe_cutting_limits` (was `check_limits`).
- /validate     -> honest 501. prism_safety has NO holistic validate action, only SPECIFIC validators
  (validate_spindle_speed/_tool_clearance/_rapid_moves/_workholding_setup...). Mapping to any ONE would
  falsely report full-parameter validation -- a safety hazard (R12). Fail loud > fabricate a mapping.

SPA impact: zero regression (web/src calls no /api/v1/safety/* today). Verified: safety.ts 3 P0 -> 0
(total 15 -> 12); safety-route-contract.test.ts 4/4 (real-action mappings + 501 + dead-action oracle);
tsc clean for touched files. /knowledge/search (prism_knowledge:search) unchanged -- already resolved.
```

## Files touched (4)
- mcp-server/src/__tests__/safety-route-contract.test.ts | 102 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/safety.ts                        |  32 +++++++-----
- state/shared/FE-ROUTE-ACTION-CONTRACT-AUDIT.json       |  69 ++------------------------
- 3 files changed, 125 insertions(+), 78 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show afb187c6c3c3`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._