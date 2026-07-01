---
session: claude-77971357
topic: lima-u-regen-viz-faillod
written_at: 2026-05-17T03:50:44.340Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-77971357
status: active
---

# HANDOFF: claude-77971357
Updated: 2026-05-17T03:50:44.340Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-77971357

## STATE
lima session 77971357 pre-compact. Last shipped U-FEEDBACK-FORCING b1e599d5fc. system-viz refreshed to 145440 nodes / 700547 edges / 331MB. Drift 175 to 11. Next queued unit: U-REGEN-VIZ-MERGE-FAILLOUD (spec at state/shared/specs/U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN-2026-05-17.md). Slot lima, branch cad-fusion-live-ms0, no active claim, no active loop. Deferred: U-RIE-ADAPTER, U-CALIBRATION, U-TRANSFER (RGS-TOOL-AUTOINVOKE-MS1 P1). Sister to precompact-handoff bare-node-spawnSync fix CLAUDE.md 2026-05-16 commit 5c4778b59.

## RESUME
Next: ship U-REGEN-VIZ-MERGE-FAILLOUD per state/shared/specs/U-REGEN-VIZ-MERGE-FAILLOUD-FIX-PLAN-2026-05-17.md. Bug: regen-viz.mjs spawned merge step fail-silent under 4GB heap + 97% commit pressure; parent emits cryptic 'merge failed', continues post-merge against stale graph, exits 0. Reproduced 2026-05-17 lima. Fix: capture spawn stdout+stderr, pass --max-old-space-size=8192, fail-loud on non-zero, 0-delta sanity assert, sweep all sub-stage spawns. Tests: regen-viz-merge-faillod.test.mjs (happy + 3 failure + 2 adversarial). Claim slot lock first.

## CONTEXT

