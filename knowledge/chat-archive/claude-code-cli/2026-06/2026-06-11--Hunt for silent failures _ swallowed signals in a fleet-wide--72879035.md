---
type: "chat-session"
source: "claude-code-cli"
session_id: "72879035-e0ca-4192-9498-ed9720495151"
title: "Hunt for silent failures / swallowed signals in a fleet-wide Ollama fallback cha"
date: "2026-06-11"
first_ts: "2026-06-11T14:33:49.811Z"
last_ts: "2026-06-11T14:33:51.046Z"
cwd: "H:\\prism-slot-india"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a46645b349381db58.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Hunt for silent failures / swallowed signals in a fleet-wide Ollama fallback cha

> **claude-code-cli** | 2026-06-11 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/72879035-e0ca-4192-9498-ed9720495151/subagents/agent-a46645b349381db58.jsonl`

## Transcript

### User | 2026-06-11T14:33:49.811Z

Hunt for silent failures / swallowed signals in a fleet-wide Ollama fallback change-set in PRISM at H:/prism (main tree). The WHOLE POINT of this change is to STOP a silent failure — so verify the new path can't itself swallow the signal. Read each file end-to-end.

CONTEXT: implements the operator's ask "sonnet agents being the fallback if ollama fails". Plan: H:/prism/state/shared/specs/OLLAMA-FLEET-AUDIT-2026-06-11.md (P0-3 site 2, FM-2). Before this change, when local Ollama generation failed, scripts/ask-ollama.mjs dead-ended at exitCode 3 with a cryptic `[ask-ollama] <error>` and (in --json mode) emitted a NON-JSON error string that any JSON consumer would fail to parse silently.

CHANGED FILES (uncommitted, branch cad-fusion-live-ms0):
1. H:/prism/scripts/ask-ollama.mjs — added `buildFallbackSignal()` and wired it at the two `if (!gen.ok)` generation-failure return sites. Returns exitCode 3 with an actionable "you are the fallback" directive (human) or `{lane:"claude", ollamaUnavailable:true, fellBack:true}` JSON (--json).
2. H:/prism/mcp-server/src/engines/OllamaHookBridgeEngine.ts — DEFAULT_CONFIG.baseUrl now `process.env.OLLAMA_URL || "http://127.0.0.1:11434"`.
3+4. Two test files updated.

HUNT FOR (with evidence/file:line):
- PRODUCTION REACHABILITY: ask-ollama main() at ~line 941 does `(exitCode===0 ? console.log : console.error)(output); process.exit(exitCode)`. So the fallback directive goes to STDERR on exit 3. When Claude runs the suggested command via the Bash tool, does stderr surface to Claude, or is the directive silently lost? Is stderr the right stream, or should a fallback-but-actionable result go to stdout?
- Does any PROGRAMMATIC caller of ask-ollama treat any non-empty output as a successful Ollama answer (and would now ingest the fallback directive as if it were the real answer)? Grep the repo for callers that spawn/exec ask-ollama and read its output.
- Is there a remaining silent-swallow: e.g. the graph-load failure sites (viz/rerank `i
... [+320 chars truncated]

### Assistant | 2026-06-11T14:33:51.046Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
