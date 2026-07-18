---
title: Backend Dev Token-Efficiency Playbook
tags: [token-efficiency, backend-dev, ollama, rtk, context-retention, playbook, memory-md, cache]
created: 2026-05-18
slot: echo
chat: claude-fbf28cc9
type: playbook
related: [audit-token-savings-2026-05-17, audit-token-context-memory-2026-05-16, ollama-pipeline-ms0, obsidian-memory-feed-hook]
---

# Backend Dev Token-Efficiency Playbook

The one queryable how-to for spending **fewer tokens per unit of PRISM backend work without losing quality**. Query it (`/wiki-query backend-dev-token-efficiency`) before re-deriving token discipline from a 600-line CLAUDE.md.

> Audits (`audit-token-savings-2026-05-17`, `audit-token-context-memory-2026-05-16`) are point-in-time **findings**. This is the standing **operating procedure**. The audits answer "what's broken today"; this answers "how do I work cheaply".

Three levers, in ROI order: **(1) don't re-derive context you already have · (2) route cheap work off Claude · (3) keep the conversation in cache.**

---

## 1 — Don't re-derive: search-first discipline (biggest silent sink)

Re-deriving a fact already indexed is the largest avoidable token cost in PRISM. Always hit the index first.

| Want | Use (cheap) | NOT (expensive) |
|---|---|---|
| "where is X / what handles Y" | `prism_session:master_index_query`, `/master-index` | Grep/Glob/Agent sweep |
| engine / dispatcher / action facts | `ENGINE_DIGEST.md`, `DISPATCHER_DIGEST.md`, `/wiki-query <name>` | reading source files |
| "is X built / wired / orphan" | `BUILD_STATE.json`, `/system-viz` query | manual cross-reference |
| past decision / lesson / pattern | `knowledge/wiki/`, memory-recall keyword in prompt | re-investigation from scratch |
| counts (engines, hooks, …) | `PRISM-INVENTORY-LATEST.md` | counting files |

`master-index-precheck-inject` and `wiki-precheck-inject` already inject top hits on every UserPromptSubmit — **read those injections before reaching for a tool**. They are pre-paid; ignoring them and re-searching pays twice.

## 2 — Route cheap work off Claude

Claude tokens are paid; local Ollama (`qwen2.5-coder` on `H:/Tools/ollama`) is free. The default routing rule (see [[feedback_ollama_token_routing]]):

> If a task can be done by `qwen2.5-coder:7b` at acceptable quality — classification, summary, lint, format, route, docstring, diff-summary, error-triage, simple code — route to Ollama. Reserve Claude for deep reasoning, novel synthesis, physics validation, safety decisions, 100K+-context understanding.

Skills: `/ollama-explain` `/ollama-summarize` `/ollama-docstring` `/ollama-classify` `/ollama-error-triage` `/ollama-diff-summary` `/ollama-test-stub` (+ `OllamaHookBridgeEngine`). Pipeline wiring: [[ollama-pipeline-ms0]].

**Anti-pattern:** sending an Ollama-routable task to Claude "to be safe." A wrong Ollama output costs one retry; an over-used Claude compounds across every session. Current fleet offload is **~10%** (`audit-token-savings-2026-05-17` measured 9.6%) against a **30% healthy target** — the single largest unspent token-saving surface PRISM ships. Check yours: `node scripts/ollama-offload-dashboard.mjs`.

## 3 — RTK prefix on bash

`rtk` wraps ~100 commands and strips redundant output. Use it on every bash call (the hook auto-rewrites most, but be explicit in `&&` chains):

| Command class | Typical saving |
|---|---|
| `vitest run` | ~99% |
| `npm run build` | ~80% |
| `git` / `gh` / `tsc` / `docker` | 60–90% |

Skip only when output is already <500 chars. `command <cmd>` bypasses for raw output. Install/verify: `/rtk-setup`.

## 4 — Tool-call hygiene

- **Parallelize independent tool calls** in one message — one round-trip, not N.
- **Partial reads** — `Read` with `offset`/`limit` when you know the region; don't slurp a 2000-line file for 30 lines.
- **Glob/Grep over Bash** `find`/`grep` — structured, capped, permission-integrated.
- **Don't re-read after `Edit`/`Write`** — the harness tracks file state; a re-read is pure cost. (`Edit`/`Write` error loudly if they failed.)
- **Narrow globs** — `**/*` from repo root can return thousands of paths; scope the `path` arg.

## 5 — Context retention: keep state cheap and reachable

Lost context forces re-derivation — the most expensive failure. Defenses:

- **MEMORY.md must stay < 24,576 bytes.** The Anthropic harness silently truncates the auto-loaded MEMORY.md past that ceiling — freshest entries become unreachable fleet-wide. `scripts/memory-compact.mjs` rotates oldest index entries to `MEMORY-ARCHIVE.md`; `stop-memory-size-watchdog.mjs` now **auto-invokes it** on every over-threshold Stop (the ACT step — see §6). Keep index entries to ≤200-char one-line pointers; detail lives in the linked topic file.
- **Per-agent handoffs** — `HANDOFF-<slot>-<topic>.md` via `per-agent-handoff.mjs`; `/compact` auto-writes it.
- **`/compact` cadence** — every 2–3 units, not at the context wall. `/precompact` before the limit.
- **CLEAR-not-COMPACT** — prefer `/clear` for a fresh token budget; ~11 bypass systems (handoffs, terminal-pin, Obsidian memory+wiki, master-index, build-state, per-unit specs, chat-bus, slot-task-claim, RGS tool-plan) reconstruct working state, so a cleared chat loses far less than its token cost. See [[reference_juliett_12chat_allocation_2026_05_17]].
- **Prompt-cache 5-min TTL** — the Anthropic prompt cache expires after 5 min idle. In a `/loop`, a wake-up past 300 s reads the whole conversation uncached (slower + costlier). Pace loop iterations to stay inside the cache window; never `ScheduleWakeup` between `/loop` iterations ([[feedback_no_schedule_wakeup_in_loop]]).

## 6 — The dominant failure mode: writer-without-reader

`audit-token-savings-2026-05-17`'s load-bearing insight:

> **PRISM's token-saving infrastructure is mostly write-only.** RTK has writers but (had) no installed filter; Ollama has classifiers but most suggestions never surface; caches have populators but no reader-hooks; watchdogs *measure* but don't *act*. A measurement system exists, but the conversion step measurement → action is unwired.

When you build or audit a savings mechanism, **close the loop**: a detector must trigger an action, a classifier's output must reach a decision, a cache must have a reader. A measurement that nothing consumes saves zero tokens.

Worked example (this entry's sibling change, 2026-05-18, slot echo): `stop-memory-size-watchdog.mjs` previously only *warned* when MEMORY.md neared the truncation ceiling — a textbook measurement-without-action. It was patched to invoke `memory-compact.mjs` directly (lock-guarded, atomic, self-throttled, fail-soft). Detection now triggers the fix automatically; the context-retention regression cannot silently recur.

## Re-measure your own token health

```bash
node scripts/token-savings-rank.mjs --json --history       # consolidated savings scorecard
node scripts/ollama-offload-dashboard.mjs                   # offload rate (target >= 30%)
node scripts/memory-size-watch.mjs --json                   # MEMORY.md vs 24576-byte ceiling
rtk gain                                                    # RTK token savings to date
```

## Cross-refs

- Findings audits: [[audit-token-savings-2026-05-17]] · [[audit-token-context-memory-2026-05-16]]
- Routing doctrine: [[feedback_ollama_token_routing]] · [[ollama-pipeline-ms0]]
- Low-token Obsidian-vault protocol: [[feedback_obsidian_low_token_2nd_brain_protocol]]
- Context-retention machinery: [[reference_session_continuity_stack_2026_05_15]] · [[obsidian-memory-feed-hook]]
- Loop discipline: [[feedback_no_schedule_wakeup_in_loop]] · [[reference_juliett_12chat_allocation_2026_05_17]]
