---
type: "chat-session"
source: "claude-code-cli"
session_id: "7d35a49c-1358-4f17-9e2a-8b2d6d9bfb1f"
title: "forge-audit-v2 /forge-audit-v2 speed-and-feed calculation engines + decisioning "
date: "2026-06-01"
first_ts: "2026-06-01T15:29:57.600Z"
last_ts: "2026-06-01T15:32:25.486Z"
cwd: "H:\\PRISM"
messages: 5
user_msgs: 5
assistant_msgs: 0
raw_file: "H:/.claude/projects/H--prism/7d35a49c-1358-4f17-9e2a-8b2d6d9bfb1f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:24"
---

# forge-audit-v2 /forge-audit-v2 speed-and-feed calculation engines + decisioning 

> **claude-code-cli** | 2026-06-01 | 5 msgs (5 user / 0 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/7d35a49c-1358-4f17-9e2a-8b2d6d9bfb1f.jsonl`

## Transcript

### User | 2026-06-01T15:29:59.754Z

<command-message>forge-audit-v2</command-message>
<command-name>/forge-audit-v2</command-name>
<command-args>speed-and-feed calculation engines + decisioning pipelines — re-measure the SF×PSN composition gap by running `node scripts/sf-psn-leverage-rank.mjs` against the baseline in state/shared/sf-psn-leverage-rank.json, and check progress on the SF-PSN-WIRE-MS0 milestone units. Baseline 2026-05-22: 96.6% composition gap, 3 PSN surfaces missing.</command-args>

### User | 2026-06-01T15:29:59.754Z

# Forge Audit v2 — Boris-discipline edition

`/forge-audit-v2` is the audit-specialized sibling of `/forge7`. It applies the Boris Cherny "verification + parallel + composite chain" doctrine specifically to system-wide audit work, plus the Thariq HTML-output pattern, the cyrilXBT recurring-workflow pattern, and the Karpathy anti-drift checkpoint.

Reads `H:/prism/state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` for the canonical patterns.

## What's new vs `/forge-audit`

| Pattern | v1 (current /forge-audit) | v2 (this skill) |
|---|---|---|
| Verification feedback loop | implicit | **HARD GATE** — every finding declares its own re-measurement tool |
| Peer review of audit findings | manual `/peer-review` | Auto-dispatched subagent challenges findings, blocks completion until verified |
| Output format | Markdown only | **HTML + Markdown both** (Thariq pattern) |
| Re-run schedule | one-shot, drift accumulates | **Self-schedules `/loop` for 7-day re-run** (cyrilXBT pattern) |
| Regression flow | findings sit in audit doc | **Auto-appends regressions to `H:/prism/CLAUDE.md`** (Boris CLAUDE.md back-flow) |
| Subagent isolation | shares main tree | **`isolation: worktree` default** for any subagent that touches >2 files |
| Anti-drift | none | **`/karpathy` checkpoint at unit 5, 10, 15** |
| Compounding-gains tax | optional | **MUST emit ≥1 re-runnable measurement tool** |

## Args

`/forge-audit-v2 <scope-brief>` — example briefs:

- `/forge-audit-v2 hook stack memory utilization` (this session: identified 423 hooks → xmalloc OOMs)
- `/forge-audit-v2 system synergy ratio` (this session: produced `system-synergy-map.mjs` → 22.2% baseline)
- `/forge-audit-v2 unwired engines by domain leverage`
- `/forge-audit-v2 frontend merge readiness`

## The 7-Phase Audit Loop

### PHASE 0 — Preflight

```bash
# Tools (run in single Bash message, parallel where independent):
node H:/prism/scripts/update-prism-inventory.mjs
node H:/prism/scripts/build-state-snapshot.mjs
node H:/pris
... [+11108 chars truncated]

### User | 2026-06-01T15:30:36.546Z

[Request interrupted by user]

### User | 2026-06-01T15:32:25.486Z

<command-name>/login</command-name>
            <command-message>login</command-message>
            <command-args></command-args>

### User | 2026-06-01T15:32:25.486Z

<local-command-stdout>Login successful</local-command-stdout>
