---
name: error-learn-loop-discipline
category: code-tribal
domain: backend-dev
tags: [error-learn, qdrant, pre-warn, post-tool-use, capture, prism-development, ai-development]
last_updated: 2026-05-18
---

# Error-Learn Loop Discipline — auto-capture, pre-warn, promote

PRISM's error-learn loop captures every error that hits a chat, stores it, and pre-warns the NEXT chat that's about to do something similar. Three layers compose into a system that compounds across sessions.

## The three layers

| Layer | Hook | Trigger | Purpose |
|-------|------|---------|---------|
| Capture | `error-pattern-capture.mjs` | PostToolUse on error | Detect 6 error classes (fork-storm, rg-timeout, git-lock, edit-mismatch, tsc-error, test-fail); record to ledger |
| Pre-warn | `error-block-prewarn.mjs` | PreToolUse | Qdrant-search for similar prior errors; inject warning into the tool input |
| Store | `error-learn-store.mjs` | PostToolUse + Stop | Bulk-write the ledger to Qdrant for cross-session recall |

The 2026-05-15 ext-extension added 6 detectors to error-pattern-capture. The 6 classes cover ~80% of recurring PRISM dev errors.

## What gets captured

Each error record:

```json
{
  ts: "2026-05-18T19:45:00Z",
  chatId: "claude-XXXX",
  slot: "lima",
  errorClass: "git-lock-contention",
  toolName: "Bash",
  command: "<truncated to 200 chars>",
  errorMessage: "<truncated to 500 chars>",
  context: { /* surrounding chat-state */ }
}
```

Append-only to `mcp-server/data/state/error-memory.json` + `error-ledger.jsonl`. Qdrant ingestion happens in the Stop-hook batch.

## What gets pre-warned

Before a tool call, the pre-warn hook:
1. Embed the tool args via Ollama nomic-embed
2. Cosine-search Qdrant for the top-3 similar prior errors
3. If similarity > threshold (default 0.75): inject `## ⚠ Similar prior errors` block into the prompt
4. The chat sees the warning BEFORE the tool runs and can adjust

Example: about to run `git commit` while `.git/index.lock` exists → pre-warn surfaces the 2026-05-18 git-lock incident → the chat runs `rm -f .git/index.lock` first.

## The /learn-from-mistake skill

Operator-triggered (not auto-fire). Captures a specific lesson into both the error ledger AND a memory file:

```
/learn-from-mistake "shouldn't have skipped the per-file scrutiny gate on the dispatcher change"
```

The skill:
1. Writes a `feedback_<topic>.md` memory file
2. Indexes in MEMORY.md
3. Adds to error-pattern-capture's allow-list so it can fire pre-warn next time
4. Flows to Obsidian on next Stop

## error-pattern-promote — Stop hook

Captured errors that recur ≥3 times get promoted to a "high-frequency pattern" status, surfaced in CLAUDE.md `## Recent regressions` as a candidate. Operator approves promotion via commit; auto-promotion is advisory only.

The 2026-05-15 commit `049eb81c4` fixed the promotion grouping (was never firing because of a key mismatch).

## Qdrant integration

Error-ledger entries flow to Qdrant collection `error-memory` on Stop. Schema:

- vector: 768-d nomic-embed of (command + errorMessage)
- payload: {chatId, slot, ts, errorClass, command, errorMessage, context}

Pre-warn query is HNSW cosine over this collection, filtered by recency window (default last 30 days).

## The 6 detector classes (2026-05-15 extension)

1. **fork-storm** — > 50 child processes spawned in 10s
2. **rg-timeout** — Grep tool returned timeout
3. **git-lock** — `.git/index.lock` blocking, "fatal: Unable to create"
4. **edit-mismatch** — Edit tool "old_string" not found
5. **tsc-error** — Build failed with TS errors
6. **test-fail** — Vitest/node:test reported failures

Each detector has its own regex + context capture. Detection runs per-PostToolUse; ~5ms overhead.

## Knobs

- `PRISM_ERROR_LEARN_DISABLE=1` — disable all 3 layers
- `PRISM_ERROR_PREWARN_THRESHOLD=0.75` — adjust similarity cutoff
- `PRISM_ERROR_PREWARN_K=3` — top-K results to inject
- `PRISM_ERROR_LEARN_VERBOSE=1` — log captures to telemetry

## When the loop is silent

Capture is firing but pre-warn shows nothing? Three causes:

1. **Qdrant unhealthy** — pre-warn falls through silently. Check `docker ps | grep qdrant`.
2. **Threshold too high** — `PRISM_ERROR_PREWARN_THRESHOLD=0.65` widens recall.
3. **No prior errors of this class** — fresh class, no Qdrant entries. First error triggers capture; future ones recall.

## Anti-patterns

- **Bypassing pre-warn injections** — they're load-bearing context; treat as if user typed them
- **Treating captured errors as "fixed by chat XX"** — capture records the EVENT, not the fix
- **Manual ledger edits** — capture should be auto; manual edits desync Qdrant
- **Disabling capture in dev** — the loop only helps if it's always-on

## Related

- [[regression-prevention-doctrine]] — promoted errors → Recent regressions
- [[memory-curation-discipline]] — error-feedback memory files
- [[embedding-and-rag-patterns]] — Qdrant + nomic-embed underlies pre-warn
- [[hook-lifecycle-anatomy]] — capture (PostToolUse) + pre-warn (PreToolUse) + store (Stop)
- CLAUDE.md "error-learn-loop extension"
- feedback_always_capture_lessons.md
