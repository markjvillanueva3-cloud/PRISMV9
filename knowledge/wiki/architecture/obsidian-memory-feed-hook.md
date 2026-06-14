---
title: Obsidian Memory Feed (dedicated Stop hook)
type: architecture
status: shipped
owner: alpha
created: 2026-05-18
---

# Obsidian Memory Feed — dedicated Stop hook

## Problem

Auto-memory files (`C:/Users/wompu/.claude/projects/H--PRISM/memory/*.md`) are
the canonical cross-session memory. They must mirror into the Obsidian vault
(`H:/prism/knowledge/memories/<type>/`) so the `[[wikilink]]` graph and RAG
recall stay current. The only thing spawning the sync was
`stop-obsidian-memory-extract.mjs` — but it gated the spawn behind a 5-min
rate-limit + transcript + ≥5-message + Ollama-extraction path. Across 13
concurrent chats that path is almost always gated, so the feed was effectively
unreliable.

## Design

`.claude/hooks/stop-obsidian-memory-feed.mjs` — a dedicated single-purpose Stop
hook:

- Spawns `scripts/obsidian-memory-sync.mjs --quiet` **detached**, never blocks
  Stop, always emits `{continue:true}`.
- **Own throttle stamp** `H:/prism/.claude/cache/obsidian-memory-feed-last.json`
  (default 3 min, `PRISM_OBSIDIAN_FEED_INTERVAL_MS`). Single shared path ⇒
  GLOBAL throttle: one sync per window fleet-wide. The sync rewrites the whole
  vault from the whole memory dir (idempotent), so per-chat stamping would only
  cause an I/O storm.
- Stamp recorded **only on a real spawn** — a spawn failure retries next Stop.
- R12 fail-loud: spawn failure writes an auditable `.err` breadcrumb (never
  blocks Stop).
- Knobs: `PRISM_OBSIDIAN_FEED_DISABLE=1`, `PRISM_OBSIDIAN_FEED_INTERVAL_MS=N`.
- Decoupled from Ollama entirely (the extract hook still does Ollama session
  learnings — separate concern).

Wired as an individual Stop entry in `C:` + `H:` settings.json after
`stop-obsidian-memory-extract` (timeout 3000ms). Not bundled.

## Two bugs fixed in `obsidian-memory-sync.mjs` while wiring this

1. **Type mis-routing (silent).** `parseMemoryFile()` only parsed FLAT
   `type: x`. The auto-memory frontmatter format nests it
   (`metadata:\n  type: reference`). So `metadata.type` was always undefined →
   `getTargetDir(undefined)` → `memories/` root for EVERY memory. Fixed with an
   any-indentation `type:` fallback regex `/^\s*type:\s*([A-Za-z_-]+)/m` (gated
   on `!metadata.type` so flat files are byte-unchanged) + a drop of the junk
   whitespace-only `metadata` key the flat regex captured.
2. **Concurrent-write corruption.** No lock + bare `fs.writeFileSync`. Both the
   extract hook and this hook spawn the sync on Stop; 13 chats stopping near
   together → interleaved partial writes. Fixed with an O_EXCL lockfile
   (`.obsidian-memory-sync.lock`, 120s stale-break, released in `finally`); a
   second concurrent run skips losslessly.

Plus a non-destructive `reconcileLegacyRoot()`: root `*.md` with a correctly
typed twin is MOVED (not deleted — [[feedback_never_delete_only_disable]]) to
`memories/_legacy-root/`. First run moved 265 stale dupes; routing health after:
reference 200 / feedback 80 / project 34 / user 6.

## Safety properties

- Never blocks Stop (detached spawn, top-level try/catch, always `{continue:true}`).
- Idempotent sync + lock ⇒ no corruption under fleet concurrency.
- Non-destructive cleanup (move, never delete).
- Flat-format memory files are byte-identical after the parser fix
  (regression-relevant: the fallback is gated on `!metadata.type`).

## Provenance

- User directive 2026-05-18: "memories should auto feed into obsidian memories.
  this should be a stop hook."
- Per-file scrutiny: 2 reviewers PASS/PASS; both P1s (corruption, legacy
  mis-files) + the P2 (fail-loud breadcrumb) fixed in-session and re-verified.
- Memory: [[feedback_auto_memory_feeds_obsidian_stophook]]. Sibling:
  `stop-obsidian-memory-extract.mjs` (Ollama session-learnings — different concern).
