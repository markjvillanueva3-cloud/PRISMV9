---
name: reference-viz-first-redirect-glob
description: "PreToolUse:Glob|Grep hook injects top-5 system-viz graph hits as additionalContext BEFORE the search runs — answer the user's 'use /system-viz as master index before trying anything else' directive."
aliases: reference_viz_first_redirect_glob
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.035Z
---


# viz-first-redirect — Glob|Grep PreToolUse hook

User directive 2026-05-15: *"make it so searches by claude use /system-viz as a master index before trying anything else."*

Closes the loop on the system-viz-first audit doctrine ([[feedback_system_viz_first_audit]]): the prior `audit-viz-first-inject` UserPromptSubmit hook fires on PROMPT-level audit keywords; this new hook fires on TOOL-level Glob/Grep calls so Claude sees the canonical graph answer even when the user prompt didn't trigger audit keywords.

## What it does

| Step | Action |
|---|---|
| 1 | PreToolUse fires on every `Glob` and `Grep` call |
| 2 | Extract `tool_input.pattern`; strip path components + extension to a leaf identifier |
| 3 | Run `scripts/system-viz-query.mjs find <probe>` with 1500ms default timeout (cold-cache friendly; warm-cache <100ms) |
| 4 | Parse top-5 hits, inject as `hookSpecificOutput.additionalContext` markdown block |
| 5 | Claude sees the graph answer BEFORE the Grep/Glob runs and decides whether the search is even needed |

## Selectivity (when it SKIPS — won't help)

- **Grep with any regex metachar** (`.`, `*`, `+`, `?`, `^`, `$`, etc.) — already targeted
- **Glob with pure-extension wildcard** (`**/*.ts`, `*.mjs`, `**/*`) — viz can't help disambiguate file types
- **Pattern <3 chars or >80 chars** — too short to discriminate / too long to be a noun

## Knobs

- `PRISM_VIZ_FIRST_REDIRECT_DISABLE=1` — no-op
- `PRISM_VIZ_FIRST_REDIRECT_K=N` — top-K hits to inject (default 5, max 10)
- `PRISM_VIZ_FIRST_REDIRECT_TIMEOUT_MS=N` — subprocess timeout (default 1500, max 5000)
- `PRISM_VIZ_FIRST_REDIRECT_VERBOSE=1` — log all skip reasons to `hook-fire-counts.jsonl`

## Wiring

`PreToolUse[13]` (matcher `Glob|Grep`) in BOTH `C:/Users/Mark Villanueva/.claude/settings.json` AND `H:/.claude/settings.json` (auto-mirrored by c-to-h-mirror). Timeout 2500ms. Sits alongside `search-optimizer.mjs` + `grep-index-first.mjs`.

## Live verification

Smoke-tested on `OllamaHookBridgeEngine` → 5 hits (canonical L5 engine + L6 test + L8 wiki + L10 architecture + L9 ghost-milestone). Smoke-tested on `KienzleForceModel` → 5 hits (L5 engine + L6 core_algos + L8 wiki + L10 architecture + L9 milestone). 19/19 hermetic tests pass via `node --test`.

## Related

- [[feedback_system_viz_first_audit]] — the audit-first doctrine this enforces at tool level
- [[reference_system_viz]] — the underlying live 3D system map + query adapter
- [[reference_master_index_surface]] — the parallel UserPromptSubmit injection
- [[reference_blueprint_ocr_training_ms1_collision]] — same shared-tree commit-absorption pattern hit again this session (d06cdefa9 commit message says CHECKIN-UPGRADE-MS0 but contains my U-P3 files; files correct + tracked)
