---
type: "chat-session"
source: "claude-code-cli"
session_id: "12128945-07c4-4006-bb0a-28e57c89b694"
title: "You are reviewing a brand-new PRISM hook file at `H:/prism/.claude/hooks/cross-s"
date: "2026-05-14"
first_ts: "2026-05-14T01:49:57.712Z"
last_ts: "2026-05-14T01:49:58.213Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/12128945-07c4-4006-bb0a-28e57c89b694/subagents/agent-afcbe20bc997f16d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# You are reviewing a brand-new PRISM hook file at `H:/prism/.claude/hooks/cross-s

> **claude-code-cli** | 2026-05-14 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/12128945-07c4-4006-bb0a-28e57c89b694/subagents/agent-afcbe20bc997f16d8.jsonl`

## Transcript

### User | 2026-05-14T01:49:57.712Z

You are reviewing a brand-new PRISM hook file at `H:/prism/.claude/hooks/cross-session-orchestrator.mjs` for the unit COORD-MS0/U-COORD05 ("Wire Orchestrator to Hook System"). Read the file end-to-end and judge it against these REQUIREMENTS:

1. **Hook contract** — emits valid JSON to stdout on every code path; exit 0. Block path emits `{decision:"block", reason}` per PRISM PreToolUse contract; non-block emits `{continue:true}`.
2. **Matcher correctness** — only acts on Edit/Write/MultiEdit/NotebookEdit; no-ops on other tool names.
3. **NotebookEdit handling** — uses `notebook_path` (not `file_path`) for NotebookEdit tool input.
4. **Engine integration** — imports `crossSessionOrchestratorEngine` from `mcp-server/dist/engines/CrossSessionOrchestratorEngine.js` (with `PRISM_COORD_ORCH_DIST` override for tests). Methods used: `isFileClaimedByOther`, `claim`, `release`, `broadcastMessage`, `getSessionId`. Verify the method names match the engine's actual surface (see `H:/prism/mcp-server/src/engines/CrossSessionOrchestratorEngine.ts`).
5. **Defensive contract** — every failure mode (missing dist, engine throws, malformed stdin, missing file path, broadcast failure) must NOT break the harness: emit `{continue:true}` and exit 0.
6. **Knobs** — `PRISM_COORD_ORCH_DISABLE`, `PRISM_COORD_ORCH_BLOCK`, `PRISM_COORD_ORCH_TTL_MS`, `PRISM_COORD_ORCH_DIST`. Verify they all work and are documented.
7. **Tier frontmatter** — `// tier: T1` on line 2 (this hook can block under `PRISM_COORD_ORCH_BLOCK=1`, so T1 is correct).
8. **Adjacent-hook conflict** — does this hook duplicate `file-claim-guard.mjs`? Read both. They should be complementary, not redundant. file-claim-guard uses ChatBus claims (hard-block default), this hook uses AtomicClaimBroker (advisory by default, opt-in block). Confirm.
9. **Argument routing** — `--pre` vs `--post` argv: pre claims + broadcasts edit_started, post releases + broadcasts cache_invalidate.

Companion references to check:
- `H:/prism/mcp-server/src/e
... [+560 chars truncated]

### Assistant | 2026-05-14T01:49:58.213Z

You've hit your limit · resets 10:20pm (America/Chicago)
