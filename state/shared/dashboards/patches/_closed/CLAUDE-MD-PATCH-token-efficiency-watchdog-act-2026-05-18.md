# CLAUDE-MD-PATCH — token-efficiency / MEMORY.md watchdog ACT

**Surface:** `H:/prism/CLAUDE.md` (peer-locked — collapse work in progress, see
[[reference_claude_md_collapse_tool_2026_05_17]]). This patch-sibling carries the
doc-reflection back-flow for slot echo's 2026-05-18 token-efficiency work, to be
folded by whoever next holds the CLAUDE.md write lock. Per the patch-sibling
convention (JULIETT-12CHAT-ALLOCATION-MS0).

## Fold into `## Recent regressions` (append — closes the 2026-05-16 MEMORY.md entry)

```
- 2026-05-18 | **MEMORY.md truncation regression durably closed — watchdog now ACTS** | The 2026-05-16 "MEMORY.md crossed the 24,576-byte truncation ceiling" entry's recommended fix ("wire a durable watchdog — the one-shot is not enough") is complete. `stop-memory-size-watchdog.mjs` was patched warn→ACT: when MEMORY.md is over the WARN threshold it now auto-invokes `scripts/memory-compact.mjs` (lock-guarded, atomic, verify-after-write, self-throttled 30m, fail-soft) to rotate the oldest index entries to MEMORY-ARCHIVE.md — the index can no longer silently exceed the ceiling. MEMORY.md recompacted 25,593→19,587 B this session (31 entries archived). New knob `PRISM_MEMORY_SIZE_WATCHDOG_NO_COMPACT=1` (advisory-only). 2 reviewer P1s fixed (NaN poison-input in `lastFireAgeMs`; `archived:0` advisory diagnostic). | observed-in: 2026-05-18 echo commit (this session) | fix: see commit | verify: `echo '{}' | PRISM_MEMORY_SIZE_WATCHDOG_WARN_PCT=0.5 PRISM_MEMORY_SIZE_WATCHDOG_TTL_MS=0 node H:/prism/.claude/hooks/stop-memory-size-watchdog.mjs` deterministically emits a WARN advisory naming the auto-compaction outcome (`TTL_MS=0` bypasses the 12h advisory throttle, `WARN_PCT=0.5` forces the over-WARN path — without both env knobs the hook is throttle-state-dependent and may go silent); `node H:/prism/scripts/memory-size-watch.mjs --json` reports under-ceiling.
```

## Optional — new doctrine pointer (only if the CLAUDE.md token-economy section is next edited)

A standing token-efficiency playbook now exists:
`knowledge/wiki/architecture/backend-dev-token-efficiency.md` — query
`/wiki-query backend-dev-token-efficiency`. It consolidates RTK / Ollama-offload
/ search-first / tool-hygiene / context-retention / cache discipline into one
queryable page. A future CLAUDE.md token-economy trim can point here instead of
inlining the patterns.

## Wiki + memory (already landed — no fold needed)

- Wiki: `knowledge/wiki/architecture/backend-dev-token-efficiency.md` (new)
- Memory: `reference_token_efficiency_playbook_2026_05_18.md` → auto-feeds Obsidian
  `knowledge/memories/reference/` via `stop-obsidian-memory-feed.mjs` on Stop.
- MEMORY.md: index line added; recompacted under the 24,576-byte ceiling.
