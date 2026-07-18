---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c3adfc7-d056-43fd-9301-bf5fa366ceb8"
title: "Enumerate PRISM HOOKS relevant to the \"discovery\" domain (anti-duplication, sear"
date: "2026-05-29"
first_ts: "2026-05-29T13:34:19.617Z"
last_ts: "2026-05-29T13:37:22.052Z"
cwd: "H:\\prism-slot-tango"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-aeb09eccb976f4d82.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:12"
---

# Enumerate PRISM HOOKS relevant to the "discovery" domain (anti-duplication, sear

> **claude-code-cli** | 2026-05-29 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/2c3adfc7-d056-43fd-9301-bf5fa366ceb8/subagents/agent-aeb09eccb976f4d82.jsonl`

## Transcript

### User | 2026-05-29T13:34:19.617Z

Enumerate PRISM HOOKS relevant to the "discovery" domain (anti-duplication, search-first/master-index injection, audit/coverage, orphan detection, awareness injection). MCP is DOWN — use Glob/Grep/Read only. Work in shared tree H:/prism.

Glob H:/prism/.claude/hooks/*.mjs and Grep their first ~40 lines for keywords: duplication, dedup, master-index, master_index, awareness, inventory, audit, orphan, unwired, coverage, discovery, build-create, capability, dispatcher-map, search-first, audit-viz.

For each matching hook report: hook-filename | event type (PreToolUse / UserPromptSubmit / SessionStart / Stop — infer from filename suffix or by grepping H:/prism/.claude/settings.json for where it's wired) | 1-line purpose. Also note for each whether it appears WIRED in H:/prism/.claude/settings.json (grep the filename in settings.json) — mark [WIRED] or [unwired].

Known high-relevance ones to confirm: duplication-hard-block, dedup-auto-invoke, master-index-precheck-inject, awareness-snapshot-inject, inventory-check-guard, build-create-detector, ai-feature-recommend, master-index-search-gate, audit-viz-first (whatever its real filename is). 

Return "## Discovery-relevant hooks" as a compact list, most relevant first, ≤25 entries. No preamble. Feeds galaxy CLAUDE.md + TOOLBELT.md.

### Assistant | 2026-05-29T13:34:39.200Z

I'll enumerate the discovery-domain hooks. Let me start by globbing the hooks directory and grepping settings.json.

### Assistant | 2026-05-29T13:34:40.012Z

[tool_use: Glob]

### Assistant | 2026-05-29T13:34:44.446Z

[tool_use: Grep]

### User | 2026-05-29T13:34:46.811Z

[tool_result] H:/prism/.claude/hooks\agent-boundary-guard.mjs
H:/prism/.claude/hooks\agent-pid-tracker.mjs
H:/prism/.claude/hooks\agent-registry-load.mjs
H:/prism/.claude/hooks\agent-rules-inject.mjs
H:/prism/.claude/hooks\agent-util-log.mjs
H:/prism/.claude/hooks\agent-vs-direct.mjs
H:/prism/.claude/hooks\agent-worktree-stale-unlock.mjs
H:/prism/.claude/hooks\aggressive-killer-stop.mjs
H:/prism/.claude/hooks\a
... [+4754 chars truncated]

### User | 2026-05-29T13:34:52.735Z

[tool_result] Found 120 files limit: 120
H:\prism\.claude\hooks\foxtrot-mill-awareness-inject.test.mjs
H:\prism\.claude\hooks\foxtrot-mill-awareness-inject.mjs
H:\prism\.claude\hooks\india-awareness-inject.mjs
H:\prism\.claude\hooks\delta-cad-awareness-inject.mjs
H:\prism\.claude\hooks\charlie-quoting-awareness-inject.test.mjs
H:\prism\.claude\hooks\charlie-quoting-awareness-inject.mjs
H:\prism\.claude\hooks\ec
... [+6319 chars truncated]

### Assistant | 2026-05-29T13:35:02.401Z

The grep hit 120 files (many are tests and unrelated injectors). Let me narrow to the core discovery hooks and read their headers + check settings.json wiring. I'll grep settings.json for the key filenames and read the headers of the high-relevance candidates.

### Assistant | 2026-05-29T13:35:05.331Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:35:06.940Z

[tool_use: Glob]

### User | 2026-05-29T13:35:09.115Z

[tool_result] H:/prism/.claude/hooks\ai-duplication-guard.mjs
H:/prism/.claude/hooks\build-create-detector.mjs
H:/prism/.claude/hooks\capability-manifest-surface.mjs
H:/prism/.claude/hooks\capability-reminder.mjs
H:/prism/.claude/hooks\dedup-auto-invoke.mjs
H:/prism/.claude/hooks\duplication-hard-block.mjs
H:/prism/.claude/hooks\master-index-search-gate.mjs
H:/prism/.claude/hooks\stop-auto-wire.mjs
H:/prism/.cl
... [+487 chars truncated]

### User | 2026-05-29T13:35:15.054Z

[tool_result] 133:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/inventory-check-guard.mjs",
272:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-auto-wire.mjs",
317:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop_on_orphan_children.mjs",
332:            "command": "\"H:/.claude/bin/portable-node\" H:/prism
... [+486 chars truncated]

### Assistant | 2026-05-29T13:35:19.821Z

Note `duplication-hard-block.mjs` and `dedup-auto-invoke.mjs` were NOT found in settings.json by my grep (only the 8 listed appeared). Let me check those plus a few more directly, and read the headers of the key hooks to get purposes.

### Assistant | 2026-05-29T13:35:23.930Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:35:24.414Z

[tool_use: Bash]

### User | 2026-05-29T13:35:29.324Z

[tool_result] 317:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop_on_orphan_children.mjs",

### User | 2026-05-29T13:35:48.708Z

[tool_result] ===== duplication-hard-block =====
#!/usr/bin/env node
// tier: T0
/**
 * duplication-hard-block.mjs — PreToolUse hook (U-AWARE07)
 *
 * HARD BLOCK if attempting to create an asset that:
 * 1. EXACTLY matches an existing engine name in the engines index
 * 2. EXISTS in the cross-session asset registry (built by another chat)
 *
 * This is the final gate - blocks Write operations that would create 
... [+13916 chars truncated]

### Assistant | 2026-05-29T13:35:56.525Z

Several key hooks (`duplication-hard-block`, `dedup-auto-invoke`, `build-create-detector`, `master-index-precheck-inject`, `awareness-snapshot-inject`, `audit-awareness-inject`, `node-capability-inject`, `capability-manifest-surface`, `capability-reminder`, `ai-duplication-guard`, `close-out-audit-suggest`, `pre-grep-graph-inject`) didn't appear in my settings.json grep. The c-to-h-mirror keeps C: and H: in sync, but some hooks wire only via bundles or the C: settings. Let me check the C: settings.json and the sessionstart/posttool bundles for these.

### Assistant | 2026-05-29T13:35:58.785Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:36:00.084Z

[tool_use: Grep]

### User | 2026-05-29T13:36:14.069Z

[tool_result] 218:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/awareness-snapshot-inject.mjs",
1092:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/pre-grep-graph-inject.mjs",
1190:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/close-out-audit-suggest.mjs",
1212:            "command": "\"H:/.claude/bin/portable-n
... [+177 chars truncated]

### User | 2026-05-29T13:36:17.259Z

[tool_result] Found 2 files
H:\prism\.claude\hooks\bundles\edit-bundle.mjs
H:\prism\.claude\hooks\bundles\lib\obsidian-cache.mjs

### Assistant | 2026-05-29T13:36:21.890Z

The C: settings.json (the canonical edit target, mirrored to H:) wires several of these. Let me confirm the remaining ones — `duplication-hard-block`, `dedup-auto-invoke`, `build-create-detector`, `audit-awareness-inject`, `ai-duplication-guard`, `capability-manifest-surface`, `capability-reminder` — in C: settings, and check the edit-bundle for which are bundled.

### Assistant | 2026-05-29T13:36:24.397Z

[tool_use: Grep]

### Assistant | 2026-05-29T13:36:25.746Z

[tool_use: Grep]

### User | 2026-05-29T13:36:33.880Z

[tool_result] 188:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/inventory-check-guard.mjs",
957:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/grep-index-first.mjs",

### User | 2026-05-29T13:36:34.707Z

[tool_result] 31:  { path: `${HOOK_BASE}/duplication-hard-block.mjs`,         timeout: 3000 },
46:  { path: `${HOOK_BASE}/dedup-auto-invoke.mjs`,              timeout: 3000, cacheable: true },
47:  { path: `${HOOK_BASE}/build-create-detector.mjs`,          timeout: 2000, cacheable: true },

### Assistant | 2026-05-29T13:36:40.442Z

I now have the wiring picture. `duplication-hard-block`, `dedup-auto-invoke`, and `build-create-detector` are wired via the `edit-bundle.mjs` (PreToolUse:Edit/Write bundle). The remaining ones (`audit-awareness-inject`, `ai-duplication-guard`, `capability-manifest-surface`, `capability-reminder`) aren't in either settings.json or the bundle — likely unwired. Let me do one final check for those four plus the `.deprecated` awareness hooks to confirm unwired status.

### Assistant | 2026-05-29T13:36:43.850Z

[tool_use: Bash]

### User | 2026-05-29T13:36:56.383Z

[tool_result] === H: settings ===
0
=== C: settings ===
0
=== individual presence H: ===
audit-awareness-inject: 
ai-duplication-guard: 
capability-manifest-surface: 
capability-reminder:

### Assistant | 2026-05-29T13:37:22.052Z

Confirmed: `audit-awareness-inject`, `ai-duplication-guard`, `capability-manifest-surface`, and `capability-reminder` are not wired in either settings.json or any bundle (unwired on-disk). I have everything needed.

## Discovery-relevant hooks

| Hook | Event | Wired? | Purpose |
|---|---|---|---|
| `duplication-hard-block.mjs` | PreToolUse:Edit/Write (via edit-bundle) | [WIRED] | T0 HARD BLOCK on Write that exactly matches an existing engine name or a cross-session-registry asset. Final anti-dup gate. |
| `ai-duplication-guard.mjs` | PreToolUse | [unwired] | T0 HARD BLOCK (permissionDecision deny) on duplicate engines/formulas/algorithms/skills/hooks/actions via registry + FS scan + Levenshtein. On-disk only. |
| `dedup-auto-invoke.mjs` | PreToolUse:Edit/Write (via edit-bundle) | [WIRED] | T1 runs duplication check before Write, surfaces similar assets as additionalContext (delegates to `helpers/duplication-guard.mjs`). |
| `master-index-search-gate.mjs` | PreToolUse:Write | [WIRED] (H: line 509) | T1 searches MASTER_INDEX_COMPACT.md for similar engines/algorithms before create, warns on dup. |
| `build-create-detector.mjs` | PreToolUse:Edit/Write (via edit-bundle) | [WIRED] | T1 detects build/create/implement intent, triggers mandatory self-awareness checks (BASELINE_INVENTORY, MASTER_INDEX, SelfAwareness, DuplicationGuard). |
| `inventory-check-guard.mjs` | UserPromptSubmit | [WIRED] (H: 133, C: 188) | T2 detects build/create/audit intent, injects live PRISM inventory counts + saturation-category warning. |
| `master-index-precheck-inject.mjs` | UserPromptSubmit | [WIRED] (C: 1212) | T2 injects top-K master-index/system-graph hits before Grep/Glob/Agent fire — search-first token saver. Backed by MasterIndexEngine. |
| `node-capability-inject.mjs` | UserPromptSubmit | [WIRED] (C: 1248) | T2 100%-coverage routing — injects wiki+pointer entries for every explicitly-named graph node in the prompt (complements BM25 top-K injectors). |
| `awareness-snapshot-inject.mjs`
... [+2640 chars truncated]
