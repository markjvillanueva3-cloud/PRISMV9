---
name: reference_hermes_app_viz_roost_2026_06_05
description: Hermes desktop app now surfaced in /system-viz (ghost.hermes_app roost + bridges edge to PRISM MCP tr.mcp) — P4 of the app-incorporation synergy
metadata:
  type: reference
---

HERMES-APP-INCORPORATION-MS0/U-HERMES-VIZ-ROOST (slot:bravo, commit ab2ccf42a4). `scripts/generate-hermes-features.mjs` surfaces the external Nous Hermes desktop app in `/system-viz`: a `ghost.hermes_app` ghost-roost under `ghost.planned_features`, a `hermes-capability.native-mcp` node with a **`bridges` edge to `tr.mcp`** (PRISM MCP :3100), + one child per skill(24)/cron(0)/output-lane(5). Names-only/no-readFileSync safety (state.db/.env/auth.json/config.yaml never opened). Dual-wired regen-viz FAST[] + merge-augmentations (loadOptional/versions/splice, byte-matched filename). 21/21 tests, live 31 nodes/32 edges, 2-reviewer PASS. Completes P1 vault output lanes (knowledge/hermes-outputs/{research,notes,diagrams,scratch,sessions}). Remaining synergy phases P0/P2/P3 edit the external app on C: and need operator GUI verification (plan flags OPEN QUESTIONS). Wiki [[hermes-app-viz-roost]]. Spec: state/shared/specs/HERMES-APP-INCORPORATION-PLAN-2026-06-02.md.
