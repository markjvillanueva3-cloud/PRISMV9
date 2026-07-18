# BLACKWELL-TOKEN-SYNERGY-MS0/U-BW-SYNTH-MODEL-RESOLVE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-SYNTH-MODEL-RESOLVE (slot:alpha): host-aware synthesis-model resolver. scripts/lib/host-aware-synthesis-model.mjs routes local synthesis scripts to the best INSTALLED model for the host (qwen2.5-coder:32b on the 96GB Blackwell) instead of hardcoding 7b/3b — via host-class.mjs (detectHostClass) + the U-BW-BEST-TIER-REACH cost-router (search_synthesis->best). Reuse-not-fork (R8). Fail-soft: ollama-down->script fallback, never a phantom uninstalled model; honest source tags (override/blackwell-best/router/fallback). The proven R13 core for the pending galaxy-*-synthesis + ask-ollama wiring. 13/13 hermetic tests, 2-reviewer PASS 0 P0/P1.

**Commit:** `ae2fbfdff851` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T07:49:40-05:00
**Tags:** blackwell-token-synergy-ms0, u-bw-synth-model-resolve, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-SYNTH-MODEL-RESOLVE (slot:alpha): host-aware synthesis-model resolver. scripts/lib/host-aware-synthesis-model.mjs routes local synthesis scripts to the best INSTALLED model for the host (qwen2.5-coder:32b on the 96GB Blackwell) instead of hardcoding 7b/3b — via host-class.mjs (detectHostClass) + the U-BW-BEST-TIER-REACH cost-router (search_synthesis->best). Reuse-not-fork (R8). Fail-soft: ollama-down->script fallback, never a phantom uninstalled model; honest source tags (override/blackwell-best/router/fallback). The proven R13 core for the pending galaxy-*-synthesis + ask-ollama wiring. 13/13 hermetic tests, 2-reviewer PASS 0 P0/P1.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-TOKEN-SYNERGY-MS0]/U-BW-SYNTH-MODEL-RESOLVE (slot:alpha): host-aware synthesis-model resolver. scripts/lib/host-aware-synthesis-model.mjs routes local synthesis scripts to the best INSTALLED model for the host (qwen2.5-coder:32b on the 96GB Blackwell) instead of hardcoding 7b/3b — via host-class.mjs (detectHostClass) + the U-BW-BEST-TIER-REACH cost-router (search_synthesis->best). Reuse-not-fork (R8). Fail-soft: ollama-down->script fallback, never a phantom uninstalled model; honest source tags (override/blackwell-best/router/fallback). The proven R13 core for the pending galaxy-*-synthesis + ask-ollama wiring. 13/13 hermetic tests, 2-reviewer PASS 0 P0/P1.
```

## Files touched (3)
- scripts/lib/host-aware-synthesis-model.mjs      | 122 +++++++++++++++++++++++++++++++++++++
- scripts/lib/host-aware-synthesis-model.test.mjs | 150 ++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 272 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ae2fbfdff851`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-TOKEN-SYNERGY-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._