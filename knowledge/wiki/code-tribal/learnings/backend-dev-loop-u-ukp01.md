# BACKEND-DEV-LOOP/U-UKP01 — [MAIN] [BACKEND-DEV-LOOP]/U-UKP01: per-unit knowledge pack — expand Ollama+Obsidian for the unit a slot is working on

**Commit:** `b2236a1b6c7a` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T11:58:07-05:00
**Tags:** backend-dev-loop, u-ukp01, auto-distilled

## Subject
[MAIN] [BACKEND-DEV-LOOP]/U-UKP01: per-unit knowledge pack — expand Ollama+Obsidian for the unit a slot is working on

## Body
```
[MAIN] [BACKEND-DEV-LOOP]/U-UKP01: per-unit knowledge pack — expand Ollama+Obsidian for the unit a slot is working on

Closes operator directive 2026-05-18 charlie: "expand ollama and obsidian
utilization for the purpose of developing with all relevant knowledge
dedicated to the specific task and unit that a chat slot would work on in
their respective task queues".

scripts/unit-knowledge-pack.mjs — given a unit-id (or an active slot claim
resolved via state/shared/slot-task-claims.json) emits a markdown pack
that surfaces, dedicated to THAT unit: roadmap context (milestone+title)
+ master-index hits (BM25 over system-graph + pre-joined Obsidian memory
entries via the shared master-index-search-lib) + tribal tips (domain
inferred from milestone scope) + prior [<MS>]/U- commits via git log
--fixed-strings --grep + a ready-to-paste ollama-prism-bridge seed
prompt for ~0-Claude-token drill-in.

Pure decision functions + injected readers. Fail-soft on every missing
input; R12 fail-loud-as-advisory via warnings[].

32/32 node:test, real-data E2E on U-BRIDGE-WIRE-ELECTRODE.

2-reviewer scrutiny PASS. Reviewer-B P1 fixed in-session: validate
unit.milestone against /^[A-Z0-9][A-Z0-9_-]{0,80}$/ before passing to
git --grep (ROADMAP-CONSOLIDATED.json is untrusted content; argv
corruption defense). Regression test with 5 hostile inputs.
```

## Files touched (3)
- scripts/unit-knowledge-pack.mjs      | 331 +++++++++++++++++++++++++++++++++++
- scripts/unit-knowledge-pack.test.mjs | 292 ++++++++++++++++++++++++++++++
- 2 files changed, 623 insertions(+)

## Lessons surfaced in commit body
- tilization for the purpose of developing with all relevant knowledge
- tile inputs.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b2236a1b6c7a`
- Milestone envelope: `mcp-server/data/milestones/BACKEND-DEV-LOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._