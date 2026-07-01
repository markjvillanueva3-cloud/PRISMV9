# FLEET-OLLAMA-ROUTING-MS0/U-FLOR-BRIDGE-DEEP-REASON — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-BRIDGE-DEEP-REASON (slot:tango): opt-in deep-reasoning mode for the galaxy-reasoning bridge -- routes to the strongest INSTALLED local reasoner (gpt-oss:120b -> deepseek-r1:32b -> gpt-oss:20b), the /goal-named deep reasoning across all 34 galaxies. Fast coder default preserved (per-galaxy sweep speed); opt-in via --deep / PRISM_GALAXY_BRIDGE_DEEP=1; install-gated via /api/tags with fast fallback; explicit opts.model wins. One bridge change -> every galaxy gains the mode (R15). LIVE: --deep routed gpt-oss:120b grounded answer (not degraded); fast path unchanged qwen2.5-coder:32b. 25/25 tests (8 new: happy+3 failure+2 adversarial). Pure resolveReasoningModel + fail-soft fetchInstalledModels mirror callOllama/resolveDenseMode patterns.

**Commit:** `b6bc5de8cd7e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T00:54:04-05:00
**Tags:** fleet-ollama-routing-ms0, u-flor-bridge-deep-reason, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-BRIDGE-DEEP-REASON (slot:tango): opt-in deep-reasoning mode for the galaxy-reasoning bridge -- routes to the strongest INSTALLED local reasoner (gpt-oss:120b -> deepseek-r1:32b -> gpt-oss:20b), the /goal-named deep reasoning across all 34 galaxies. Fast coder default preserved (per-galaxy sweep speed); opt-in via --deep / PRISM_GALAXY_BRIDGE_DEEP=1; install-gated via /api/tags with fast fallback; explicit opts.model wins. One bridge change -> every galaxy gains the mode (R15). LIVE: --deep routed gpt-oss:120b grounded answer (not degraded); fast path unchanged qwen2.5-coder:32b. 25/25 tests (8 new: happy+3 failure+2 adversarial). Pure resolveReasoningModel + fail-soft fetchInstalledModels mirror callOllama/resolveDenseMode patterns.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-OLLAMA-ROUTING-MS0]/U-FLOR-BRIDGE-DEEP-REASON (slot:tango): opt-in deep-reasoning mode for the galaxy-reasoning bridge -- routes to the strongest INSTALLED local reasoner (gpt-oss:120b -> deepseek-r1:32b -> gpt-oss:20b), the /goal-named deep reasoning across all 34 galaxies. Fast coder default preserved (per-galaxy sweep speed); opt-in via --deep / PRISM_GALAXY_BRIDGE_DEEP=1; install-gated via /api/tags with fast fallback; explicit opts.model wins. One bridge change -> every galaxy gains the mode (R15). LIVE: --deep routed gpt-oss:120b grounded answer (not degraded); fast path unchanged qwen2.5-coder:32b. 25/25 tests (8 new: happy+3 failure+2 adversarial). Pure resolveReasoningModel + fail-soft fetchInstalledModels mirror callOllama/resolveDenseMode patterns.
```

## Files touched (3)
- scripts/lib/galaxy-reasoning-bridge.mjs      | 71 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- scripts/lib/galaxy-reasoning-bridge.test.mjs | 62 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-
- 2 files changed, 129 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6bc5de8cd7e`
- Milestone envelope: `mcp-server/data/milestones/FLEET-OLLAMA-ROUTING-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._