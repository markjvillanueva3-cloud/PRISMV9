---
title: HIGH-ROI-HOOKS-MS0
type: architecture
status: shipped
date: 2026-05-18
slot: delta
tags: [hooks, token-efficiency, backend-dev, caching]
---

# HIGH-ROI-HOOKS-MS0

Three hook activations targeting **backend-dev token efficiency without quality
loss**. Shipped 2026-05-18 (slot delta, `/checkin-delta /loop`). The PRISM hook
surface is saturated (533 hooks on disk, ~162 wired) — so the milestone is
deliberately small: two genuinely-new hooks filling *verified* gaps, plus the
activation of one good orphan. Padding to a larger count would have meant
duplicating existing hooks (R7/R8/R12).

## Why only the token-saving axis

The work order named four axes — backend-dev efficiency, token saving, context
retention, Obsidian routing. Audit found **context retention and Obsidian
routing are already saturated** (`precompact-dossier`, `handoff-memory-seed-stop`,
`compaction-survival-auto`, `session-start-auto-resume`, `ollama-obsidian-rag`,
`memory-mirror-to-vault`, `stop-obsidian-memory-feed`). The only hook class that
*net*-saves tokens is a **PreToolUse blocker** — it prevents a tool call's
output from ever reaching context. Both new hooks are PreToolUse blockers.

## U-HRH01 — `build-cache-guard.mjs`

Build/test result cache with edit-invalidation. Closes a verified gap:
`bash-result-cache.mjs` explicitly rejects any command containing `npm`/`node`,
so `npm run build`, `npx vitest run`, `tsc` — PRISM's most-repeated, most-verbose
tool calls — were never cached.

- **PreToolUse:Bash** — a redundant build/test re-run, when the cached result is
  a confirmed PASS within TTL with no source edit since, is `deny`d with the
  cached digest. The verbose redundant build never runs.
- **PostToolUse:Bash** — captures the result (`ok: true|false|null`).
- **PostToolUse:Edit|Write|MultiEdit|NotebookEdit** — bumps a per-session
  source-edit stamp; a source edit invalidates every cached build.
- **Safety:** only a confirmed PASS is ever denied; a cached FAIL or an
  ambiguous result always re-runs. Compound commands (`cmd && npm run build`)
  are never denied. The edit stamp lives in its own per-session file — no arm
  can clobber it via an RMW race. Count-based deny-loop escape.
- 34 tests (7 subprocess oracles). Knobs: `PRISM_BUILD_CACHE_TTL_MS` (300000),
  `PRISM_BUILD_CACHE_GUARD_DISABLE`, `PRISM_BUILD_CACHE_DIR` (test isolation).

## U-HRH02 — `mcp-readonly-cache.mjs`

The MCP-tier sibling of `bash-result-cache`. PRISM dev makes hundreds of
`mcp__prism…` dispatcher calls per session and re-issues identical read-only
ones; each re-call re-emits a large JSON envelope already in context.

- **PreToolUse:`mcp__prism*`** — an identical re-call of a read-only dispatcher
  action within TTL is `deny`d (the prior result is in context).
- **Safety:** the read-only classifier requires a read suffix
  (`read|status|query|get|list|search|stats|summary|lookup|dashboard|info|
  coverage|history|inventory|health`) **and** no mutating-verb token (~95-verb
  gate). Conservative by design — and even a misclassification only *delays*
  (never drops) a re-issued mutating call, because `deny` is soft and the
  count-based escape passes the retry.
- 25 tests (9 subprocess oracles). Knobs: `PRISM_MCP_CACHE_TTL_MS` (180000),
  `PRISM_MCP_READONLY_CACHE_DISABLE`, `PRISM_MCP_CACHE_DIR` (test isolation).

## U-HRH03 — activate `tsc-error-dedup.mjs`

An existing, well-built, **orphaned** hook (built, never wired — one of ~370
orphan hooks). PostToolUse:Bash; detects `tsc` output and injects a condensed
summary (top files / top error codes) so Claude acts on a digest instead of
re-scanning hundreds of raw error lines. Wired into the PostToolUse:Bash matcher
alongside `build-cache-guard`. No new code — pure activation.

## Wiring

All wired in `settings.json` (C: → mirrored to H:). `build-cache-guard` ×3
(PreToolUse:Bash, PostToolUse:Bash, PostToolUse:Edit…); `mcp-readonly-cache` ×1
(PreToolUse:`^mcp__prism.*`); `tsc-error-dedup` ×1 (PostToolUse:Bash).

## Related

- Sibling: `bash-result-cache.mjs` (read-only Bash probe cache).
- Telemetry: all three append to `.claude/cache/hook-telemetry.jsonl`.
- Memory: [[reference_high_roi_hooks_ms0]].
