---
title: OLLAMA-EXPAND-MS0 — ask-ollama local query service
type: architecture
milestone: OLLAMA-EXPAND-MS0
created: 2026-05-18
slot: charlie
---

# OLLAMA-EXPAND-MS0 — `ask-ollama` local query service

## Problem

PRISM's Ollama offload layer is heavily built — 20 wired Ollama hooks, the
`ollama-task-offloader` firing ~1478×/24h — yet the measured **offload rate
is 10.2%** (target 30%). In a representative 24h window the offloader
*suggested* 536 offloads that were **kept on Claude anyway**. Root cause:
every Ollama hook is **advisory** — it classifies a task and prints a
suggestion, but it cannot *force* the model to actually route the work to
Ollama. Suggestions that require Claude to act are mostly ignored.

The fix is not another suggester. It is an **active, explicit callable** that
Claude invokes via Bash, so the token-heavy input is processed in a
subprocess and only a compact answer enters the Claude context window.

## Deliverable — `scripts/ask-ollama.mjs` (U-OE01)

A local Ollama query service with five modes:

| Mode | What it offloads | Needs the model? |
|---|---|---|
| `viz <query>` | ranked keyword search of the ~27 MB system-viz graph | no (search is pure local code) |
| `viz <query> --synth` | …plus an Ollama-synthesized paragraph | yes |
| `summarize <file>` | digest a large file (body stays in subprocess) | yes |
| `explain <file>` | plain-language code explanation | yes |
| `triage <file>` | root-cause a build/test/error dump | yes |
| `ask <question>` | general question, no PRISM context | yes |

This answers the operator question *"can we copy the entire system-viz to
Ollama?"* — not literally (a 27 MB graph far exceeds any 7B context window),
but the useful way: `viz` searches the on-disk graph **in the subprocess**
and returns ~12 compact hits, so a "where is X / what handles Y" lookup
costs **~0 Claude tokens** instead of injecting graph chunks.

### Design

Pure functions (exported, unit-tested) + a thin impure shell whose I/O deps
(`loadGraph`, `callOllama`, `readFileCapped`) are injectable. 55-case
`node:test` suite incl. **two real-data E2E tests** against the on-disk
graph (the "hermetic fakes don't prove wiring" rule). Single model
`qwen2.5-coder:3b` for every mode + `keep_alive:"10m"` — on a
memory-pressured host, one warm small model beats three 7B models
cold-load-thrashing the page file.

### What the live E2E caught (and the build fixed)

1. **Multi-word search returned nothing** — the first cut delegated to
   `system-viz-query.mjs find`, which does single-token substring match;
   "kienzle cutting force" matched no node. Replaced with an in-process
   ranked multi-keyword scorer (`tokenizeQuery` → `scoreNode` → `searchGraph`).
2. **2-minute cold load** — the probe measured `load_ms: 113573` for a
   1.9 GB model: the host is at ~96% commit pressure. The timeout was
   raised to 180 s, the model held warm via `keep_alive`, and `viz`
   default made search-only (no model) so it is always fast and reliable.
3. **`loadGraph` OOM** (scrutiny arm B P1) — the fallback `system-graph.json`
   is ~370 MB; `readFileSync`+`JSON.parse` on it would OOM a 4 GB heap.
   Added an 80 MB `MAX_GRAPH_BYTES` cap: an over-cap candidate is `stat`-ed
   and **skipped, never read**, with an actionable "regenerate" error.

## Skill

`/ask-local` (`.claude/commands/ask-local.md`) — documents the routing rule
so post-`/compact` chats reach for the tool instead of re-deriving.

## Exit codes

`0` ok · `2` usage / missing input file · `3` infra failure (graph
unreadable, or Ollama unreachable in a mode that needs it). `viz` without
`--synth` never needs Ollama; `viz --synth` degrades to plain hits + exit 0.

## Future — the Ollama→PRISM-MCP bridge

Making Ollama call PRISM's dispatcher tools "like Claude Code" needs a
harness (Ollama is a model server, not an MCP client). Layered design +
honest scope in `state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`.
`ask-ollama.mjs` is Layer 1 of that ladder.

## Related

- `scripts/ask-ollama.mjs` · `scripts/__tests__/ask-ollama.test.mjs`
- CLAUDE.md §OLLAMA OFFLOAD DASHBOARD — fleet offload telemetry
- `.claude/hooks/ollama-task-offloader.mjs` — the passive suggester this complements
- [[ollama-pipeline-ms0]] — the pipeline-injector hooks
