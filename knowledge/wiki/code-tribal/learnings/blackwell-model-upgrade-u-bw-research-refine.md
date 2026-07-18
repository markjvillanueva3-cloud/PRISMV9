# BLACKWELL-MODEL-UPGRADE/U-BW-RESEARCH-REFINE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-RESEARCH-REFINE (slot:alpha): retire 4 small LLMs + re-point all routing to qwen2.5-coder:32b floor + gpt-oss:120b/20b install-gated. Playwright research: 120B MoE 134 t/s >> dense 72b 29 t/s. ollama rm 3b/7b/14b+deepseek-r1:14b; anti-revert guard test proves executable surface clean. Vision/xray VLMs + nomic-embed protected. Pull 65GB to golf; dead decideRoute offloader to Hermes.

**Commit:** `74077e38cb11` · **By:** markjvillanueva3-cloud · **At:** 2026-06-04T11:30:14-05:00
**Tags:** blackwell-model-upgrade, u-bw-research-refine, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-RESEARCH-REFINE (slot:alpha): retire 4 small LLMs + re-point all routing to qwen2.5-coder:32b floor + gpt-oss:120b/20b install-gated. Playwright research: 120B MoE 134 t/s >> dense 72b 29 t/s. ollama rm 3b/7b/14b+deepseek-r1:14b; anti-revert guard test proves executable surface clean. Vision/xray VLMs + nomic-embed protected. Pull 65GB to golf; dead decideRoute offloader to Hermes.

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [BLACKWELL-MODEL-UPGRADE]/U-BW-RESEARCH-REFINE (slot:alpha): retire 4 small LLMs + re-point all routing to qwen2.5-coder:32b floor + gpt-oss:120b/20b install-gated. Playwright research: 120B MoE 134 t/s >> dense 72b 29 t/s. ollama rm 3b/7b/14b+deepseek-r1:14b; anti-revert guard test proves executable surface clean. Vision/xray VLMs + nomic-embed protected. Pull 65GB to golf; dead decideRoute offloader to Hermes.
```

## Files touched (62)
- .claude/helpers/fleet-reaper-host-presets.mjs                    |   4 +-
- .claude/helpers/fleet-reaper-host-presets.test.mjs               |  11 +-
- .claude/hooks/__tests__/ollama-cost-router.test.mjs              | 181 +++++++++++--------
- .claude/hooks/__tests__/ollama-task-offloader-autoexec.test.mjs  |   2 +-
- .claude/hooks/__tests__/posttool-ollama-rewriter-corpus.test.mjs | 267 +++++++++++++++++++++++++++++
- .claude/hooks/__tests__/prompt-rewriter-health-warn.test.mjs     |  95 ++++++++++
- .claude/hooks/bundles/lib/ollama-fuse.mjs                        |   4 +-
- .claude/hooks/claudemd-ollama-enforcer.mjs                       |   2 +-
- .claude/hooks/commit-draft-suggest.mjs                           |   2 +-
- .claude/hooks/lib/ollama-cost-router.mjs                         |  57 ++++--
_(+52 more)_


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 74077e38cb11`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-MODEL-UPGRADE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._