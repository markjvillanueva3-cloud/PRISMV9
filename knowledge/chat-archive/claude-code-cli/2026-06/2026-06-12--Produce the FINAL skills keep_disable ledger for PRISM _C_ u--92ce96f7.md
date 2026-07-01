---
type: "chat-session"
source: "claude-code-cli"
session_id: "92ce96f7-8b16-4104-bca3-e476095177f9"
title: "Produce the FINAL skills keep/disable ledger for PRISM (C: user-global + H: proj"
date: "2026-06-12"
first_ts: "2026-06-12T12:43:51.433Z"
last_ts: "2026-06-12T12:47:54.466Z"
cwd: "H:\\prism-slot-golf"
messages: 32
user_msgs: 14
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-golf/92ce96f7-8b16-4104-bca3-e476095177f9/subagents/workflows/wf_0a66e9c5-cd3/agent-a30b08b59cd8ef0ee.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# Produce the FINAL skills keep/disable ledger for PRISM (C: user-global + H: proj

> **claude-code-cli** | 2026-06-12 | 32 msgs (14 user / 18 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/92ce96f7-8b16-4104-bca3-e476095177f9/subagents/workflows/wf_0a66e9c5-cd3/agent-a30b08b59cd8ef0ee.jsonl`

## Transcript

### User | 2026-06-12T12:43:51.433Z

Produce the FINAL skills keep/disable ledger for PRISM (C: user-global + H: project commands). Ground from this telemetry+bucket analysis (telemetry is NULL — structural proxies only):
null

Prior-audit context (avoid recommending already-done work):
{}

Rules: (a) DISABLE = move to commands-archive, never delete (PRISM rule: never delete, only disable). (b) Keep all 26-slot NATO wrappers, domain wizards, core dev pipeline. (c) Each disable needs a concrete reason+bucket. (d) Quantify: how many disable, how many keep, est tokens saved per UserPromptSubmit (each archived skill cuts ~50-200 token re-inject; the skill-auto-trigger reads the manifest). Output the structured ledger.

### Assistant | 2026-06-12T12:43:57.883Z

I'll analyze the skills inventory systematically before producing the ledger. Let me examine the actual skills on disk.

### Assistant | 2026-06-12T12:43:59.068Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:43:59.635Z

[tool_use: Bash]

### User | 2026-06-12T12:44:04.616Z

[tool_result] 375
0

### User | 2026-06-12T12:44:07.156Z

[tool_result] COMMANDS_DIGEST.md
advisor-strategy.md
agi-cad-generate.md
approvals.md
ask-local.md
audit-viz-first.md
awareness-snapshot.md
batch-optimize.md
big-blob-hunt.md
biz-health.md
brain-recall.md
build-brief.md
build-state.md
cad-corpus.md
cad-dfm-generate.md
cad-dfm.md
cad-explain.md
cad-extract.md
cad-feature-recognize.md
cad-from-blueprint.md
cad-from-photo.md
cad-from-text.md
cad-rag.md
cad-review.
... [+975 chars truncated]

### Assistant | 2026-06-12T12:44:10.382Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:44:10.405Z

[tool_use: Glob]

### User | 2026-06-12T12:44:13.322Z

[tool_result] .claude\commands\ingest.md
.claude\commands\vendor.md
.claude\commands\prints.md
.claude\commands\tooling.md
.claude\commands\process-docs.md
.claude\commands\material-stock.md
.claude\commands\my-shop.md
.claude\commands\erp-health.md
.claude\commands\self-improve.md
.claude\commands\advisor-strategy.md
.claude\commands\claude-flow-help.md
.claude\commands\claude-flow-memory.md
.claude\commands\c
... [+2964 chars truncated]

### User | 2026-06-12T12:44:22.081Z

[tool_result] 375

### Assistant | 2026-06-12T12:44:24.588Z

Let me get the full list efficiently.

### Assistant | 2026-06-12T12:44:25.859Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:44:26.901Z

[tool_use: Bash]

### User | 2026-06-12T12:44:30.315Z

[tool_result] 375 /tmp/skills_list.txt
COMMANDS_DIGEST.md
advisor-strategy.md
agi-cad-generate.md
approvals.md
ask-local.md
audit-viz-first.md
awareness-snapshot.md
batch-optimize.md
big-blob-hunt.md
biz-health.md
brain-recall.md
build-brief.md
build-state.md
cad-corpus.md
cad-dfm-generate.md
cad-dfm.md
cad-explain.md
cad-extract.md
cad-feature-recognize.md
cad-from-blueprint.md
cad-from-photo.md
cad-from-text.
... [+6164 chars truncated]

### User | 2026-06-12T12:44:39.709Z

[tool_result] _flat-variants/
analysis/
automation/
forge2.md
github/
hooks/
monitoring/
optimization/
rgs2.md
rgs3.md
sparc/
---
29

### Assistant | 2026-06-12T12:44:42.017Z

Now let me check a sample of suspicious skills to classify them properly.

### Assistant | 2026-06-12T12:44:44.668Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:44:46.425Z

[tool_use: Bash]

### User | 2026-06-12T12:44:52.819Z

[tool_result] === capture-claude-credentials ===
---
description: Snapshot ~/.claude/.credentials.json into a per-account vault (ZEBRA-ACCOUNT-CYCLE-MS0/U1). One-time per account; reusable until the OAuth refresh token expires.
allowed-tools: [Bash]
---

=== college-extract ===
---
name: college-extract
description: Execute a per-course AUTOGEN-SPEC from state/shared/college-course-specs/ — drives live extracti
... [+3882 chars truncated]

### User | 2026-06-12T12:44:57.853Z

[tool_result] === go ===
---
name: go
description: Composite gate — fast-build + tsc + affected tests + hook coverage + lint. Run before committing a non-trivial change. Reports PASS/FAIL per stage and the first failing line in each failing stage. Fast path: 30-90 s on a warm cache. Backstop for /loop iter-gate (Boris pattern). No new engines; pure composition over existing dispatcher actions + npm scripts.

... [+3146 chars truncated]

### Assistant | 2026-06-12T12:45:01.988Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:45:03.953Z

[tool_use: Bash]

### User | 2026-06-12T12:45:07.179Z

[tool_result] Exit code 1
=== college-extract ===
---
name: college-extract
description: Execute a per-course AUTOGEN-SPEC from state/shared/college-course-specs/ — drives live extraction (Playwright/WebFetch/PDF-OCR) + builds the spec's named engines/algorithms/formulas/skills/hooks/nodes + re-runs coverage audit. Wraps the lima execution loop documented in each spec.
triggers:
  - college-extract
  - extract 
... [+2556 chars truncated]

### User | 2026-06-12T12:45:15.308Z

[tool_result] === forge-supervised ===
---
description: Supervised /forge-triple wrapper — runs /forge-triple (engine+skill+hook trio) then /scrutiny-gate end-of-task automatically, then writes a close-out record. The "no rogue forge" front-end — every forged trio passes the 3-of-3 gate before commit.
allowed-tools: Bash, Read, TodoWrite, Task
composes_with:
  - "/close-out-audit"
  - "/forge-triple"
=== integr
... [+2850 chars truncated]

### Assistant | 2026-06-12T12:45:18.170Z

Now I have enough signal to produce the full ledger. Let me do one final check on the `_flat-variants` archive and the `smart-*` / `startup-*` / `handoff-*` wrapper counts to confirm exact totals.

### Assistant | 2026-06-12T12:45:21.733Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:45:23.023Z

[tool_use: Bash]

### User | 2026-06-12T12:45:34.402Z

[tool_result] 29
---already archived flat variants:
cam-fixture.md
cam-post-lint.md
cam-toolpath-check.md
cam-workholding.md
grinder-harden.md
grinder-learn.md
grinder-optimize.md
grinder-studio.md
grinder-validate.md
lathe-harden.md
lathe-learn.md
lathe-optimize.md
lathe-validate.md
mill-harden.md
mill-learn.md
mill-optimize.md
mill-validate.md
sinker-harden.md
sinker-learn.md
sinker-optimize.md
sinker-studio.
... [+136 chars truncated]

### User | 2026-06-12T12:45:34.517Z

[tool_result] smart-* wrappers:
25
startup-* wrappers:
27
handoff-* wrappers:
27
checkin-* wrappers:
27
precompact-* wrappers:
27
galaxy-buildout-* wrappers:
25

### Assistant | 2026-06-12T12:45:40.207Z

I have all the data needed. Now I'll produce the structured ledger.

The 375 skills break down as follows after analysis:

**NATO wrapper families (keep all — fleet-required):**
- checkin-* : 27, startup-* : 27, handoff-* : 27, precompact-* : 27, smart-* : 25, galaxy-buildout-* : 25 = 158 wrappers

**Already archived in _flat-variants:** 29 (grinder/sinker/welder domain duplicates + cam/wedm flat copies)

**Core dev pipeline, domain wizards, hygiene:** ~120 keepers

**Disable candidates identified:** ~40 skills across 6 buckets

### Assistant | 2026-06-12T12:47:50.278Z

[tool_use: StructuredOutput]

### User | 2026-06-12T12:47:54.466Z

[tool_result] Structured output provided successfully
