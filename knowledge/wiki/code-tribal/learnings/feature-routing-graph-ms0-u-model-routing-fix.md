# FEATURE-ROUTING-GRAPH-MS0/U-MODEL-ROUTING-FIX — [MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-FIX (slot:alpha): CORRECT -- reasoning=ALWAYS Opus (never deepseek); coding=Sonnet + coder-ensemble

**Commit:** `36bd078066a8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-17T20:41:12-05:00
**Tags:** feature-routing-graph-ms0, u-model-routing-fix, auto-distilled

## Subject
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-FIX (slot:alpha): CORRECT -- reasoning=ALWAYS Opus (never deepseek); coding=Sonnet + coder-ensemble

## Body
```
[MAIN-FORCE] [FEATURE-ROUTING-GRAPH-MS0]/U-MODEL-ROUTING-FIX (slot:alpha): CORRECT -- reasoning=ALWAYS Opus (never deepseek); coding=Sonnet + coder-ensemble

Operator correction 2026-06-18: I misread the prior directive. (1) REASONING is ALWAYS Claude Opus, NEVER deepseek -- reverted deepseek-r1 from the reasoning dims: plan + review now carry NO local reasoner (ollama 'no'; the 5-lens / 3-Claude-arm reasoning IS Opus), fix root-cause stays Opus with qwen2.5-coder only for mechanical diff-summary. deepseek-r1 is a REASONING model and must not do reasoning. (2) CODING = newest Sonnet (Claude tier) + a CODER ENSEMBLE run TOGETHER to cover more ground in one pass: qwen2.5-coder:32b + qwen3-coder:30b combined, paired with Sonnet; deepseek-CODER is not yet pulled locally (only deepseek-r1 reasoning is) -> pull it or use cloud-if-free. build/fix modelTier stays Sonnet-max-for-coding / Opus-for-deep-arch+reasoning (correct under this directive). Test corrected (R9, not weakened): plan/review legitimately excluded from the 'real ollama' check since reasoning offloads nothing locally; + a new guard asserting reasoning classes never name a local reasoner / deepseek. 49/49 lib tests, regen clean, spec 1a/1b synced. Supersedes the deepseek-r1-in-reasoning parts of the prior commit.
```

## Files touched (5)
- scripts/lib/feature-routing-graph.mjs       |  8 ++++----
- scripts/lib/feature-routing-graph.test.mjs  | 23 +++++++++++++++++++++--
- state/shared/feature-routing-graph.json     |  8 ++++----
- state/shared/specs/FEATURE-ROUTING-GRAPH.md |  8 ++++----
- 4 files changed, 33 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 36bd078066a8`
- Milestone envelope: `mcp-server/data/milestones/FEATURE-ROUTING-GRAPH-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._