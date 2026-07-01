---
type: "chat-session"
source: "claude-code-cli"
session_id: "b1a71f80-e277-41b1-bede-855ba3f58757"
title: "can you make the default model fable ultracode?"
date: "2026-06-09"
first_ts: "2026-06-09T17:54:45.191Z"
last_ts: "2026-06-09T18:00:42.246Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 9
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/b1a71f80-e277-41b1-bede-855ba3f58757.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:39"
---

# can you make the default model fable ultracode?

> **claude-code-cli** | 2026-06-09 | 21 msgs (9 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b1a71f80-e277-41b1-bede-855ba3f58757.jsonl`

## Transcript

### User | 2026-06-09T17:56:17.996Z

can you make the default model fable ultracode?

### Assistant | 2026-06-09T17:57:02.740Z

I'll use the configuration skill to do this properly, since changing the default model and enabling a session mode both touch the harness settings.

### Assistant | 2026-06-09T17:57:03.167Z

[tool_use: Skill]

### User | 2026-06-09T17:57:06.515Z

[tool_result] Launching skill: update-config

### User | 2026-06-09T17:57:04.913Z

# Update Config Skill

Modify Claude Code configuration by updating settings.json files.

## When Hooks Are Required (Not Memory)

If the user wants something to happen automatically in response to an EVENT, they need a **hook** configured in settings.json. Memory/preferences cannot trigger automated actions.

**These require hooks:**
- "Before compacting, ask me what to preserve" → PreCompact hook
- "After writing files, run prettier" → PostToolUse hook with Write|Edit matcher
- "When I run bash commands, log them" → PreToolUse hook with Bash matcher
- "Always run tests after code changes" → PostToolUse hook

**Hook events:** PreToolUse, PostToolUse, PreCompact, PostCompact, Stop, Notification, SessionStart

## CRITICAL: Read Before Write

**Always read the existing settings file before making changes.** Merge new settings with existing ones - never replace the entire file.

## CRITICAL: Use AskUserQuestion for Ambiguity

When the user's request is ambiguous, use AskUserQuestion to clarify:
- Which settings file to modify (user/project/local)
- Whether to add to existing arrays or replace them
- Specific values when multiple options exist

## Decision: /config command vs Direct Edit

**Suggest the `/config` slash command** for these simple settings:
- `theme`, `editorMode`, `verbose`, `model`
- `language`, `alwaysThinkingEnabled`
- `permissions.defaultMode`

**Edit settings.json directly** for:
- Hooks (PreToolUse, PostToolUse, etc.)
- Complex permission rules (allow/deny arrays)
- Environment variables
- MCP server configuration
- Plugin configuration

## Workflow

1. **Clarify intent** - Ask if the request is ambiguous
2. **Read existing file** - Use Read tool on the target settings file
3. **Merge carefully** - Preserve existing settings, especially arrays
4. **Edit file** - Use Edit tool (if file doesn't exist, ask user to create it first)
5. **Confirm** - Tell user what was changed

## Merging Arrays (Important!)

When adding to permission arrays or hook array
... [+137053 chars truncated]

### Assistant | 2026-06-09T17:57:51.718Z

Now I understand both settings. Let me read the current global settings file before editing it (per the read-before-merge rule). The PRISM CLAUDE.md is explicit that I edit `C:\Users\wompu\.claude\settings.json` only — the `c-to-h-mirror` hook replicates to H: automatically.

### Assistant | 2026-06-09T17:57:51.834Z

[tool_use: Read]

### User | 2026-06-09T17:57:57.541Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1456 of 1793 total (26151 tokens, cap 25000). Call Read with offset=1457 limit=1456 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+57865 chars truncated]

### Assistant | 2026-06-09T17:58:40.167Z

I have what I need from the top of the file — `"model": "opus"` is at line 64. Let me verify there's no existing `ultracode`/`enableWorkflows`/`effortLevel` key elsewhere in the file before I merge (to avoid a duplicate JSON key).

### Assistant | 2026-06-09T17:58:41.026Z

[tool_use: Grep]

### User | 2026-06-09T17:58:46.493Z

[tool_result] 1785:  "effortLevel": "xhigh",

### Assistant | 2026-06-09T17:59:13.112Z

The file already has `"effortLevel": "xhigh"` (line 1785) and no existing `ultracode`/`enableWorkflows` key, so this is a clean merge. Let me change the model and add the two flags together at line 64.

### Assistant | 2026-06-09T17:59:13.747Z

[tool_use: Edit]

### User | 2026-06-09T17:59:13.766Z

[tool_result] <tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>

### Assistant | 2026-06-09T17:59:21.392Z

[tool_use: Read]

### User | 2026-06-09T17:59:22.693Z

[tool_result] 60	  "includeCoAuthoredBy": false,
61	  "permissions": {
62	    "defaultMode": "bypassPermissions"
63	  },
64	  "model": "opus",
65	  "enabledMcpjsonServers": [
66	    "prism",
67	    "claude-flow"
68	  ],
69	  "skillOverrides": {

### Assistant | 2026-06-09T17:59:27.364Z

[tool_use: Edit]

### User | 2026-06-09T17:59:33.852Z

[tool_result] The file C:\Users\wompu\.claude\settings.json has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-09T17:59:50.490Z

Done. Here's what I changed in `C:\Users\wompu\.claude\settings.json` (auto-mirrored to `H:` by the `c-to-h-mirror` hook):

```jsonc
"model": "fable",        // was "opus"
"ultracode": true,       // new — xhigh effort + standing workflow orchestration
"enableWorkflows": true, // new — ultracode requires workflows enabled
```
`"effortLevel": "xhigh"` was already set, which ultracode also wants.

**On your question — yes, Fable 5 is available in Claude Code.** Model id `claude-fable-5`, alias `fable`. It's a current model and selectable via `/model`, the `model` setting, or `--model fable`. You already saw the `/model` menu this session (you kept Opus 4.8) — if Fable appears in that list, your plan has it.

Two things to flag honestly:

1. **This applies to new sessions, not this one.** The current session is still locked to Opus 4.8 (the `/model` you ran). To switch right now, run `/model` and pick Fable; otherwise it takes effect next launch.

2. **I have *not* verified that Fable 5 supports `xhigh` effort / ultracode.** Ultracode's requirement is literally "workflows enabled + an xhigh-capable model." Fable is positioned as a fast/light model, and I don't have confirmation it's xhigh-capable. If it isn't, the `ultracode: true` flag will silently no-op — you'll know because you *won't* see an "ultracode is on" system-reminder at session start. If that happens, ultracode reliably needs Opus (which is confirmed xhigh-capable), so you'd want `model: opus` for ultracode runs and Fable for everything else.

Want me to set up the reliable combination instead — keep `model` on Fable for speed but leave ultracode off until we confirm Fable supports it, or pin Opus specifically so ultracode is guaranteed to engage? Easiest way to verify: start a fresh session and check for the "ultracode is on" reminder.

### Assistant | 2026-06-09T18:00:21.432Z

The config change is in place and mirrored to `H:`. The Stop-hook output above is unrelated background fleet-hygiene noise (scheduled-task audit, memory→wiki suggestions, a duplicate MCP daemon) — none of it touches the model/ultracode change, and it's golf-slot hygiene territory rather than your request, so I'm leaving it alone.

Summary of what's done:
- **Default model → Fable** (`"model": "fable"`)
- **Ultracode enabled** (`"ultracode": true` + `"enableWorkflows": true`; `effortLevel: xhigh` was already set)

Reminder of the two caveats: it applies to **new sessions** (this one stays Opus 4.8 unless you `/model` to Fable now), and I haven't verified Fable supports `xhigh`/ultracode — confirm next session by watching for the "ultracode is on" reminder. If it's absent, ping me and I'll pin Opus for ultracode runs.

### User | 2026-06-09T18:00:39.337Z

[Request interrupted by user]
