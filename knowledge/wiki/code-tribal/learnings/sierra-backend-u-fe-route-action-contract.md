# SIERRA-BACKEND/U-FE-ROUTE-ACTION-CONTRACT — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-ACTION-CONTRACT (slot:sierra): static FE-route<->dispatcher-action verifier (found 19 live P0s)

**Commit:** `9c301a24cb72` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T08:53:14-05:00
**Tags:** sierra-backend, u-fe-route-action-contract, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-ACTION-CONTRACT (slot:sierra): static FE-route<->dispatcher-action verifier (found 19 live P0s)

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTE-ACTION-CONTRACT (slot:sierra): static FE-route<->dispatcher-action verifier (found 19 live P0s)

Layer-2 of the FE<->BE contract chain (romeo's audit-frontend-backend-contract.mjs = layer-1
mount-prefix; route-contract-*.test.ts = layer-3 behavioral). Closes the silent-failure class that
bit the specialty mount (d9b533d27): a MOUNTED router calls callTool("prism_X","action") for an
action name absent from the prism_X dispatcher -> z.enum rejects -> HTTP 200 + {error} body the SPA's
if(!res.ok) cannot detect. Fleet-wide: audits ALL 56 route files vs 100 dispatchers.

Assets:
- scripts/lib/fe-route-action-contract.mjs -- pure parser+auditor. Resolvable action set = union of
  z.enum(CONST) (spread-resolving, incl. new Set([...]) consts) + inline z.enum([...]) + case labels
  + const *_ACTIONS arrays. Object-key/ACTION_MAP dispatchers (prism_fluid_thermal/mechanical) -> 0
  parseable -> reported UNVERIFIABLE, never broken (R12). Mounted-vs-unmounted needs explicit app.use.
- scripts/audit-fe-route-action-contract.mjs -- CLI (--json --p0-only --fail-on-p0 --out <path>).
- scripts/lib/fe-route-action-contract.test.mjs -- 12 tests: pure-fn fixtures + controlled e2e
  classification + Set-const regression + LIVE parser false-negative guard.
- state/shared/FE-ROUTE-ACTION-CONTRACT-AUDIT.json -- snapshot (19 P0 / 30 INFO / 6 UNVERIFIABLE / 10 DYNAMIC).

VALIDATED on live data -- 19 P0 mounted routers (verified TRUE, not parser artifacts):
auth.ts (refresh vs real refresh_token; logout/whoami/generate_key absent), safety.ts
(validate/check_limits/collision_check vs real check_toolpath_collision -- SAFETY-CRITICAL, surfaced
by the new Set([...]) fix), admin/cost/quality/schedule/exportRoutes. Report routes each to its owning
slot for follow-on fixes. Per-file 2-arm scrutiny PASS (both P2s -- Set-const gap + doc -- fixed inline).
```

## Files touched (5)
- scripts/audit-fe-route-action-contract.mjs       |  77 ++++++
- scripts/lib/fe-route-action-contract.mjs         | 294 ++++++++++++++++++++++
- scripts/lib/fe-route-action-contract.test.mjs    | 235 +++++++++++++++++
- state/shared/FE-ROUTE-ACTION-CONTRACT-AUDIT.json | 615 +++++++++++++++++++++++++++++++++++++++++++++
- 4 files changed, 1221 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9c301a24cb72`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._