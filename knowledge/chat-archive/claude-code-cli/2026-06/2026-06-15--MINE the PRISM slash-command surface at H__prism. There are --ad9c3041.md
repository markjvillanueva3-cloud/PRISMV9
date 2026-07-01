---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "MINE the PRISM slash-command surface at H:/prism. There are 732 files in `.claud"
date: "2026-06-15"
first_ts: "2026-06-15T05:30:25.103Z"
last_ts: "2026-06-15T05:39:34.430Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 9
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3de3c012fbd680b5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# MINE the PRISM slash-command surface at H:/prism. There are 732 files in `.claud

> **claude-code-cli** | 2026-06-15 | 19 msgs (9 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a3de3c012fbd680b5.jsonl`

## Transcript

### User | 2026-06-15T05:30:25.103Z

MINE the PRISM slash-command surface at H:/prism. There are 732 files in `.claude/commands/*.md` and 386 in `C:/Users/wompu/.claude/commands/*.md` (1118 total). MANY are per-slot DUPLICATES across 26 NATO slots (checkin-<slot>, handoff-<slot>, precompact-<slot>, startup-<slot>, smart-<slot>, galaxy-buildout-<slot>, galaxy-verify-<slot>). DO NOT enumerate all 1118 — collapse to DISTINCT FAMILIES (target 80-120). Use Glob to list names and `grep` the frontmatter `description:` line in bulk rather than reading whole bodies (token discipline).

For each family extract: family pattern, taskClass (one of: locate|build|plan|recall|learn|quote|physics|review|fix|orchestrate|session|domain), one-line purpose, costTier (free|low|mid|high), invoke (/skill | script | dispatcher), autoInvoke (true if it SHOULD fire automatically on matching context without the operator typing it).

Return ONLY a single fenced ```json block with this shape (no prose outside it):
{"totalDistinct": <n>, "autoInvokable": ["family", ...], "families": [{"family":"...","taskClass":"...","purpose":"...","costTier":"...","invoke":"...","autoInvoke":true|false}, ...]}
Be exhaustive on the family list; keep each entry compact.

### Assistant | 2026-06-15T05:30:39.398Z

[tool_use: Glob]

### Assistant | 2026-06-15T05:30:39.403Z

[tool_use: Bash]

### User | 2026-06-15T05:31:12.728Z

[tool_result] .claude\commands\ingest.md
.claude\commands\vendor.md
.claude\commands\prints.md
.claude\commands\tooling.md
.claude\commands\process-docs.md
.claude\commands\material-stock.md
.claude\commands\my-shop.md
.claude\commands\template.md
.claude\commands\wedm-ai-advisor.md
.claude\commands\wedm-batch.md
.claude\commands\wedm-compare.md
.claude\commands\wedm-controller.md
.claude\commands\wedm-cost.md

... [+3090 chars truncated]

### User | 2026-06-15T05:31:37.506Z

[tool_result] _archive
_self-awareness-protocol.md
acquire-models.md
action-help.md
action-search.md
activate-local.md
addtomatrix.md
ai-analyze.md
ai-optimize.md
ai-reason.md
ai-train-india.md
algorithm-inspect.md
analysis
approvals.md
aps-setup.md
audit-duplicates.md
audit-task.md
auto-commit.md
autopilot.md
autopilot-camk.md
autopilot-full.md
auto-speed-feed.md
auto-speed-feed-lathe.md
aware.md
awareness-che
... [+404 chars truncated]

### Assistant | 2026-06-15T05:31:45.894Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:31:46.303Z

[tool_use: Bash]

### User | 2026-06-15T05:32:22.708Z

[tool_result] 390

### User | 2026-06-15T05:33:53.452Z

[tool_result] 736

### Assistant | 2026-06-15T05:33:58.844Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:33:58.860Z

[tool_use: Bash]

### User | 2026-06-15T05:34:58.089Z

[tool_result] description: "Approval workflow manager"
description: "Build + Test + Review pipeline in one command"
description: "Focused post-generation quality cleanup"
description: "Generate a comprehensive manufacturing quote with physics-backed estimation, DfM feedback, secondary ops, and price breaks"
description: "Look up secondary operations (anodize, heat treat, plating, NDT, grinding) — pricing, specs
... [+6828 chars truncated]

### User | 2026-06-15T05:34:58.387Z

[tool_result] description: "Approval workflow manager"
description: "Build + Test + Review pipeline in one command"
description: "Claude Advisor strategy router"
description: "ERP persistence health check"
description: "Extract structured data from POs, invoices, and RFQs. Auto-classify documents, review pending extractions, and approve or reject."
description: "Focused post-generation quality cleanup"
descript
... [+9374 chars truncated]

### Assistant | 2026-06-15T05:35:01.943Z

Let me grab all descriptions in bulk efficiently.

### Assistant | 2026-06-15T05:35:03.010Z

[tool_use: Bash]

### Assistant | 2026-06-15T05:35:03.648Z

[tool_use: Bash]

### User | 2026-06-15T05:35:22.258Z

[tool_result] [fork-storm-breaker] fork-storm guard: 606 live bash.exe >= ceiling 400. New Bash spawns are PAUSED to protect the MCP server (:3100) from process-storm starvation -- the "api server error" root cause. The storm drains within seconds; WAIT briefly, then retry. Do NOT fan out more agents/bash right now. Override only if you are certain: append [SCOPED] / --force-spawn, raise PRISM_FORKSTORM_CEILING
... [+39 chars truncated]

### User | 2026-06-15T05:35:51.238Z

[tool_result] description: Compare codex frontend builds (cqask/ui, mcp-cadquery/frontend) against main mcp-server/web; output port-vs-sandbox decision with React-version alignment plan
description: Compare Wire EDM programs, parameters, and results
description: Compose existing PRISM primitives into solution candidates for a typed input→output problem with bounded-depth enumeration
description: Comprehensive l
... [+26272 chars truncated]

### Assistant | 2026-06-15T05:39:34.430Z

Now I have all the data needed. Let me compile the collapsed family taxonomy.

```json
{
  "totalDistinct": 112,
  "autoInvokable": [
    "checkin-<slot>",
    "startup-<slot>",
    "handoff-<slot>",
    "precompact-<slot>",
    "fleet-reaper",
    "auto-speed-feed",
    "auto-speed-feed-lathe",
    "auto-commit",
    "context-budget",
    "stop-check",
    "core/pre-flight",
    "core/session-state",
    "core/error-learner",
    "self-awareness-protocol",
    "hook-stats",
    "pressure",
    "context-integrity",
    "pre-review"
  ],
  "families": [
    {
      "family": "checkin-<slot>",
      "taskClass": "session",
      "purpose": "Per-NATO-slot session check-in ritual; re-arms monitors, syncs fleet state, surfaces open tasks for that chat slot",
      "costTier": "free",
      "invoke": "/checkin-alpha … /checkin-zulu",
      "autoInvoke": true
    },
    {
      "family": "startup-<slot>",
      "taskClass": "session",
      "purpose": "Ultra-fast per-slot session bootstrap; loads awareness surface, galaxy docs, and open gap list for a given chat slot",
      "costTier": "free",
      "invoke": "/startup-alpha … /startup-zulu",
      "autoInvoke": true
    },
    {
      "family": "handoff-<slot>",
      "taskClass": "session",
      "purpose": "Session continuity / handoff protocol — writes resume state so next session can continue seamlessly in the named slot",
      "costTier": "free",
      "invoke": "/handoff-alpha … /handoff-zulu",
      "autoInvoke": true
    },
    {
      "family": "precompact-<slot>",
      "taskClass": "session",
      "purpose": "Pre-compact session continuation handoff — snapshots context before /compact so the slot can resume without loss",
      "costTier": "free",
      "invoke": "/precompact-alpha … /precompact-zulu",
      "autoInvoke": true
    },
    {
      "family": "smart-<slot>",
      "taskClass": "orchestrate",
      "purpose": "Per-slot smart router — routes any query to the most token-efficient PRISM path for tha
... [+55538 chars truncated]
