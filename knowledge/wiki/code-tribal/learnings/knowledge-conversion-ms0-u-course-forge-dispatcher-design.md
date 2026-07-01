# KNOWLEDGE-CONVERSION-MS0/U-COURSE-FORGE-DISPATCHER-DESIGN — [MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-DISPATCHER-DESIGN: wiring decision record for the 7 course-forge nodes

**Commit:** `177f0acae264` · **By:** markjvillanueva3-cloud · **At:** 2026-05-17T14:30:15-05:00
**Tags:** knowledge-conversion-ms0, u-course-forge-dispatcher-design, auto-distilled

## Subject
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-DISPATCHER-DESIGN: wiring decision record for the 7 course-forge nodes

## Body
```
[MAIN] [KNOWLEDGE-CONVERSION-MS0]/U-COURSE-FORGE-DISPATCHER-DESIGN: wiring decision record for the 7 course-forge nodes

Converts the implicit 7x WIRE-EXEMPT deferral into an explicit,
analyzed, operator-decidable record.

The blocker (R12 fail-loud): 5 of the 7 nodes take JS closures as their
primary input (objective fn, derivative fn, Lagrangian, substep
integrators). A closure cannot cross the JSON boundary of an MCP
dispatcher action — so naive {action,params} wiring is structurally
impossible for them, not skipped work.

Three options laid out:
- A: build a sandboxed expression-evaluator (NO eval/Function) so
  closure inputs arrive as expression strings — matches the existing
  opt_gradient_descent/num_ode_solve precedent; security-sensitive,
  deserves its own unit + 3-of-3 scrutiny.
- B: JSON-native partial wiring NOW — LinearStateSpaceModel matrix ops
  + FiniteDifferenceMethod array ops (no closures, no evaluator).
- C: leave WIRE-EXEMPT permanently — treat as library-internal
  numerical primitives consumed by other (wired) engines.

Recommendation: B now + A as a follow-up unit; C is the honest
fallback with this doc as the recorded decision.

Not shipping wiring code this iteration: it needs either the
security-reviewed evaluator (Option A) or an edit to the
heavily-peer-claimed algorithmDispatcher (collision risk under the
current fork-storm). The decision record is the correct deliverable.

Advisory + mustHumanVerify. HTML twin rendered.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (3)
- .../U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.html   | 154 +++++++++++++++++++++
- .../U-COURSE-FORGE-DISPATCHER-WIRING-DESIGN.md     | 118 ++++++++++++++++
- 2 files changed, 272 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 177f0acae264`
- Milestone envelope: `mcp-server/data/milestones/KNOWLEDGE-CONVERSION-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._