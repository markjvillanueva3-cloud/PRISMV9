---
source: project
section: RGS-TOOL-AUTOINVOKE (MS0+MS1) — per-roadmap-unit toolchain enrichment
slug: rgs-tool-autoinvoke-ms0-ms1-per-roadmap-unit-toolchain-enric
indexed_at: 2026-06-06T05:19:15.677Z
---

## RGS-TOOL-AUTOINVOKE (MS0+MS1) — per-roadmap-unit toolchain enrichment

Attaches self-correcting toolchain to every open roadmap unit (4,404 units); rule table `scripts/lib/rgs-pipeline-rules.mjs`; sidecar `state/shared/roadmap-tool-plans.json`. MS1 fixed 10 P0s after fake-reader audit ("pure-core+injected-readers MUST ship a real-data E2E" lesson). Shipped U-CRON nightly replan + U-DOMAIN-RULES (mill/lathe/wedm/cam/cad pipeline rules) + U-DISPATCHER (`prism_dev:roadmap_tool_plan_{query,build,coverage}`). Knobs: `PRISM_RGS_TOOL_PLAN_INJECT`, `PRISM_RGS_OUTCOME_RECORD_DISABLE`. Wiki: [[rgs-tool-autoinvoke-ms0]] · [[rgs-tool-autoinvoke-ms1]]. Memory: [[reference_rgs_tool_autoinvoke_ms0_2026_05_16]] · [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] · [[reference_u_dispatcher_2026_05_16]].
