---
name: reference_post_ship_local-llm-ms1-u-numctx-hotel-miner-route
description: Auto-distilled learnings from shipping LOCAL-LLM-MS1/U-NUMCTX-HOTEL-MINER-ROUTE (commit 2ae59c6aa). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.928Z
aliases: reference_post_ship_local-llm-ms1-u-numctx-hotel-miner-route
---


# LOCAL-LLM-MS1/U-NUMCTX-HOTEL-MINER-ROUTE

[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-HOTEL-MINER-ROUTE (slot:india): clone the proven MCP overlay onto the 3rd + last live per-domain miner -- completes the fleet-wide apply-to-all (hotel + india + galaxy all route opt-in PRISM_LOCAL_LLM_VIA_MCP, fail-soft, numCtx=32768 + numPredict=16384). ALSO fixes a latent hotel defect: it called main() UNCONDITIONALLY (no fn importable without running the CLI) -- added india's __isMain guard so ollama is testable + the CLI still self-runs. 6/6 hermetic routing tests (also prove the guard), 1-reviewer PASS (overlay shape already 2-arm-PASSed on galaxy)

**Shipped:** 2026-06-09T20:42:40-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[local-llm-ms1-u-numctx-hotel-miner-route]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._