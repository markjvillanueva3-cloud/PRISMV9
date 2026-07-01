# GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-A4 — [MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A4 (slot:echo): pre-bash-graph-inject hook — narrow PreToolUse:Bash graph-context injector

**Commit:** `dc8fd902ee61` · **By:** markjvillanueva3-cloud · **At:** 2026-05-22T16:55:21-05:00
**Tags:** graph-octopus-autowire-ms0, u-go-a4, auto-distilled

## Subject
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A4 (slot:echo): pre-bash-graph-inject hook — narrow PreToolUse:Bash graph-context injector

## Body
```
[MAIN] [GRAPH-OCTOPUS-AUTOWIRE-MS0]/U-GO-A4 (slot:echo): pre-bash-graph-inject hook — narrow PreToolUse:Bash graph-context injector

PreToolUse:Bash hook, NARROW: deriveGraphKeys({tool:'bash'}) returns []
for any non-file-search verb (git/npm/node/build), so ~95% of bash
invocations stay silent. Only file-search verbs (grep/rg/find/cat/head/
tail/ls) derive keys → runMasterIndexSearch → inject top-3 graph nodes.
Fail-open every path; advisory-only; never blocks. Knobs:
PRISM_PRE_BASH_GRAPH_INJECT=0, PRISM_PRE_BASH_GRAPH_TOPK.
11/11 tests green. 2-of-2 scrutiny PASS, 0 P0/P1. Wiring is U-GO-A6.
```

## Files touched (5)
- .claude/hooks/compression-precompact.mjs           |   9 --
- .claude/hooks/pre-bash-graph-inject.mjs            | 138 +++++++++++++++++++++
- .claude/hooks/pre-bash-graph-inject.test.mjs       | 121 ++++++++++++++++++
- .../milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json     |  11 +-
- 4 files changed, 267 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dc8fd902ee61`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-OCTOPUS-AUTOWIRE-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._