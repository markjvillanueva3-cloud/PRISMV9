# WIRING/U-WIRE-PSN-HEALTH-CHECK — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-PSN-HEALTH-CHECK (slot:romeo): PSNHealthCheckEngine -> prism_dev:psn_health_check

**Commit:** `b240aa83c060` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T14:25:06-05:00
**Tags:** wiring, u-wire-psn-health-check, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-PSN-HEALTH-CHECK (slot:romeo): PSNHealthCheckEngine -> prism_dev:psn_health_check

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [WIRING]/U-WIRE-PSN-HEALTH-CHECK (slot:romeo): PSNHealthCheckEngine -> prism_dev:psn_health_check

Third genuine-orphan wire from the classifier-aware hunt (b902ac2024). Pure static 11-leg PSN-leg
health classifier (Obsidian/PRISM-OS/Wiki/Memories/Tribal/SystemViz/Engines/Algorithms/Formulas/
NN-GNN/PRISM-AI). Caller assembles signal inputs from disk into LegInputs; engine does the
deterministic classification only (no I/O). Missing legs -> "unknown" (never fail-loud). Returns the
report + a one-line summary_line.

Verified GENUINE_ORPHAN + type-(a) self-contained (static methods, no injected infra) via
scripts/classify-engine-reachability.mjs before wiring. The engine's check() runs LegInputsSchema.parse
internally, so invalid per-leg shapes throw a ZodError the case converts to a structured error (NOT a
throws-on-every-call wire - valid/empty input returns fine).

4 round-trip tests THROUGH prism_dev: empty inputs -> all 11 legs unknown (anti-stub: always 11 legs);
spanning green/amber/red classification by documented thresholds (reference values); adversarial invalid
input -> structured error not crash; enum-accept. tsc-clean.
```

## Files touched (4)
- .../src/__tests__/devDispatcher.psn-health-check-wire.test.ts    | 99 ++++++++++++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts                       |  4 ++
- mcp-server/src/tools/dispatchers/devDispatcher.ts                | 21 ++++++-
- 3 files changed, 123 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b240aa83c060`
- Milestone envelope: `mcp-server/data/milestones/WIRING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._