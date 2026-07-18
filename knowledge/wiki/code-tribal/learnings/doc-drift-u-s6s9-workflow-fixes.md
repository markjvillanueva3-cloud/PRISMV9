# DOC-DRIFT/U-S6S9-WORKFLOW-FIXES — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S6S9-WORKFLOW-FIXES: verified retired-model + host-spec doc fixes (tracked subset)

**Commit:** `7719e5a636c2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:09:01-05:00
**Tags:** doc-drift, u-s6s9-workflow-fixes, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S6S9-WORKFLOW-FIXES: verified retired-model + host-spec doc fixes (tracked subset)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [DOC-DRIFT]/U-S6S9-WORKFLOW-FIXES: verified retired-model + host-spec doc fixes (tracked subset)

From the doc-drift-sweep workflow (7 agents, adversarially verified). Every
OLD string verified verbatim before replace (0 fail-loud). Doc/comment only,
no runtime change; 3 .mjs node --check clean:
- fleet-hygiene CLAUDE.md + MEMORY.md: 'RTX 4080S 16GB' -> 'RTX PRO 6000
  Blackwell 96GB' (THIS box, host-spec fact per operator pc-spec mandate)
- feedback_scrutiny_3of3_readonly.md:25: pre-flight deepseek-r1:14b ->
  qwen2.5-coder:32b (matches live scrutiny-3way.mjs:151); C: synced
- commit-reviewer-dispatch.mjs x2 + prism-awareness-bundle.mjs + prompt-rewrite-test.mjs:
  stale retired-model comments/examples -> 32b / gpt-oss:120b

ALSO fixed but gitignored (live-on-disk only): 6 slash commands
(ask-local/autopilot/autopilot-full/forge/forge2/local-health) retired tags -> Blackwell roster.

DEFERRED to golf (fleet-reaper owner): host-presets.mjs:39/63 + fleet-reaper-home/work.md
tier-model lines + COMMANDS_DIGEST:260/261 — entangled with a latent code
inconsistency (all 3 host presets prewarm 32b despite home=16GB/work=8GB). Needs
golf to fix code+desc together (R15). DOC-DRIFT S6-S9 papa-applicable subset.
```

## Files touched (7)
- .claude/helpers/commit-reviewer-dispatch.mjs                   |  4 ++--
- .claude/helpers/prism-awareness-bundle.mjs                     |  2 +-
- .claude/helpers/prompt-rewrite-test.mjs                        |  2 +-
- knowledge/memories/feedback/feedback_scrutiny_3of3_readonly.md | 26 ++++++++++++++++++--------
- mcp-server/src/engines/fleet-hygiene/CLAUDE.md                 |  4 ++--
- mcp-server/src/engines/fleet-hygiene/MEMORY.md                 |  2 +-
- 6 files changed, 25 insertions(+), 15 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 7719e5a636c2`
- Milestone envelope: `mcp-server/data/milestones/DOC-DRIFT.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._