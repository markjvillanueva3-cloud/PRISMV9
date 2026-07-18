# BUILD-FIX/U-CAM-DUP-ROUTE — [MAIN-FORCE] [BUILD-FIX]/U-CAM-DUP-ROUTE (slot:india): remove duplicate lathe_master_post_route from prism_cam ACTIONS enum + its dead generic case -> fixes the no-dup anti-regression across ~7 cam wire tests

**Commit:** `1e5c5b541b45` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T06:01:18-05:00
**Tags:** build-fix, u-cam-dup-route, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-FIX]/U-CAM-DUP-ROUTE (slot:india): remove duplicate lathe_master_post_route from prism_cam ACTIONS enum + its dead generic case -> fixes the no-dup anti-regression across ~7 cam wire tests

## Body
```
[MAIN-FORCE] [BUILD-FIX]/U-CAM-DUP-ROUTE (slot:india): remove duplicate lathe_master_post_route from prism_cam ACTIONS enum + its dead generic case -> fixes the no-dup anti-regression across ~7 cam wire tests

WHAT: the prism_cam camDispatcher ACTIONS z.enum declared `lathe_master_post_route`
TWICE -> `new Set(ACTIONS).size (2197) !== ACTIONS.length (2198)`, failing the
`new Set(ACTIONS).size === ACTIONS.length` anti-regression assertion shared by ~7 cam
wire test files (lathe-lora-script-wire, bobcad-bridge-wire, dnc-family-wire, catia,
fusion-multiaxis, hybrid-program-compose, inventor-tool-export). Surfaced root-causing
the india-AI backlog item camDispatcher.lathe-lora-script-wire (1/10).

ROOT CAUSE: two registrations of the same action --
- GROUP A (canonical, KEPT): enum entry in the lathe master-post group (line ~1175,
  with lathe_master_post_machines/controllers) + a DETAILED case handler (~line 4243)
  calling latheMasterPostRouterEngine.route({machineId, operation, controller, program,
  options:{strictMode,includeComments,lineNumbers,...}}).
- GROUP B (duplicate, REMOVED): a 2nd enum entry (~line 2371) + a DEAD generic case
  (~line 20433) `(latheMasterPostRouterEngine as any).route?.(params) ?? {note:"method
  not callable"}`. JS switch takes the FIRST match (4243 < 20433) so group B's case was
  unreachable dead code.

FIX (R7 keep the better/canonical, R16 remove the dead code too): removed group B's enum
entry + dead case (both replaced with explanatory comments), keeping group A intact.

VERIFY: zero behavior change (the detailed handler already won by switch-order; only a
redundant enum entry + unreachable dead code removed). lathe_master_post_route now appears
ONCE in the enum + ONE case. Authoritative tsc 0 errors. 3 cam no-dup files 39/39 (88/88
across the broader cam wire set per scrutiny). Schema contract intact
(latheMasterPostActionSchemas maps the action). No test pins an exact prism_cam count
(all use >=N or the Set.size===length no-dup check this fixes), so 2198->2197 breaks
nothing. Per-file 2-arm scrutiny (wiring-review-agent + code-analyzer) PASS, 0 findings.
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/camDispatcher.ts | 15 +++++++++------
- 1 file changed, 9 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1e5c5b541b45`
- Milestone envelope: `mcp-server/data/milestones/BUILD-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._