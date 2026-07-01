---
name: reference_post_ship_fleet-ollama-routing-ms0-u-flor-bridge-deep-reason
description: Auto-distilled learnings from shipping FLEET-OLLAMA-ROUTING-MS0/U-FLOR-BRIDGE-DEEP-REASON (commit b6bc5de8c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.858Z
aliases: reference_post_ship_fleet-ollama-routing-ms0-u-flor-bridge-deep-reason
---


# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-BRIDGE-DEEP-REASON

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-BRIDGE-DEEP-REASON (slot:tango): opt-in deep-reasoning mode for the galaxy-reasoning bridge -- routes to the strongest INSTALLED local reasoner (gpt-oss:120b -> deepseek-r1:32b -> gpt-oss:20b), the /goal-named deep reasoning across all 34 galaxies. Fast coder default preserved (per-galaxy sweep speed); opt-in via --deep / PRISM_GALAXY_BRIDGE_DEEP=1; install-gated via /api/tags with fast fallback; explicit opts.model wins. One bridge change -> every galaxy gains the mode (R15). LIVE: --deep routed gpt-oss:120b grounded answer (not degraded); fast path unchanged qwen2.5-coder:32b. 25/25 tests (8 new: happy+3 failure+2 adversarial). Pure resolveReasoningModel + fail-soft fetchInstalledModels mirror callOllama/resolveDenseMode patterns.

**Shipped:** 2026-06-11T00:54:04-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[fleet-ollama-routing-ms0-u-flor-bridge-deep-reason]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._