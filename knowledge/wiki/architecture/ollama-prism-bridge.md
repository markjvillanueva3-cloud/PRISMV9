---
title: OLLAMA-EXPAND-MS0 — ollama-prism-bridge (Ollama→PRISM agentic harness)
type: architecture
milestone: OLLAMA-EXPAND-MS0
unit: U-OE-BRIDGE-L2
created: 2026-05-18
slot: charlie
---

# `ollama-prism-bridge` — Ollama → PRISM agentic harness (Layer 2)

## What it answers

The operator question: *"can we hook Ollama up to the PRISM MCP server so it
gets access to it like Claude Code?"*

The honest answer (full design: [`state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`](../../../state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md)):
**Ollama is a model server, not an MCP client.** It has `/api/generate`,
`/api/chat`, `/api/embeddings` — no agent loop, no tool orchestration, no way
to "connect to MCP". What makes a model *use tools like Claude Code* is a
**harness** that runs the call→execute→feed-back loop. `ollama-prism-bridge.mjs`
is that harness — Layer 2 of the bridge ladder (Layer 1 = `ask-ollama.mjs`).

## Deliverable — `scripts/ollama-prism-bridge.mjs` (U-OE-BRIDGE-L2)

The harness advertises three READ-ONLY PRISM knowledge tools to an Ollama
model via the `/api/chat` `tools` parameter, then loops: the model picks a
tool → the harness executes it → the result is fed back → repeat until the
model gives a final answer. The whole investigation runs locally, so a
multi-step "where is X / how does Y work / what wires to Z" question costs
**~0 Claude tokens** — only the final compact answer returns.

| Tool | Offloads | Backed by |
|---|---|---|
| `viz_search` | ranked search of the ~27 MB system-viz graph | `ask-ollama.mjs` graph search (reused) |
| `wiki_lookup` | keyword search of the architecture wiki index | `knowledge/wiki/index.md` |
| `read_excerpt` | a byte-capped excerpt of a repo source file | `ask-ollama.mjs` `readFileCapped` (reused) |

```
node scripts/ollama-prism-bridge.mjs "where is cutting force computed?" --trace
```

## Design

Pure functions (exported, unit-tested) + a thin impure shell whose I/O deps
(`chatImpl`, `toolImpls`) are injected — the agent loop is testable without a
live model. 86-case `node:test` suite incl. real-data E2E against the on-disk
graph + wiki + a repo file, and a `main()` subprocess oracle for exit-code
wiring. Reuses `ask-ollama.mjs` exports (`loadGraph`, `searchGraph`,
`renderHits`, `readFileCapped`, `truncate`) — no re-extraction.

### Safety properties

- **Read-only by construction.** The only three tools are file/graph reads.
  There is no write or exec path. Tool results are untrusted model input, but
  the worst outcome of a hostile repo file is a wrong answer — never a write.
- **`confinePath`** — `read_excerpt` paths are confined to the repo by a
  two-layer check: lexical (`resolve` + `relative`, rejects `..` traversal and
  absolute-outside paths) then physical (`realpathSync` resolves symlinks /
  junctions and re-checks containment). A small model cannot be coaxed into
  reading outside the repository.
- **Frozen allowlist** — `TOOL_NAMES` is `Object.freeze`d; an unknown tool is
  rejected before execution and the error is fed back so the model recovers.
- **Hard caps** — agent-loop iteration cap (`MAX_CALLS_CEIL` 12, default 6),
  per `/api/chat` timeout, and `TOOL_RESULT_MAX_CHARS` (16 KB) on every tool
  result re-entering the context window.
- **Fail-loud (R12)** — a thrown `chatImpl`, an unreachable Ollama, an HTTP
  error, a malformed message all become explicit `{ok:false,error}` (exit 3),
  never an uncaught crash.

### What per-file scrutiny caught (and the build fixed)

1. **P0** — a `chatImpl` that *threw* (vs. returning `{ok:false}`) escaped
   `runAgentLoop` as an uncaught exception → undocumented exit 1 + a raw
   stack trace. Fixed: both `chatImpl` call sites wrapped in try/catch →
   fail-loud `{ok:false,error}`. A regression oracle test now guards it.
2. **P1** — `WIKI_INDEX_REL` pointed at `knowledge/wiki/architecture/index.md`,
   which does not exist (the catalog index is `knowledge/wiki/index.md`;
   `architecture/` holds per-entry leaf files). Every `wiki_lookup` would have
   returned `ERROR: file not found`. Fixed + a real-data E2E regression oracle.
3. **P1** — `confinePath` was lexical-only; a symlink inside the repo pointing
   out could escape. Fixed with `realpathSync` hardening.

The lesson: a "pure core + injected deps" design **must** ship a real-data
E2E — the wiki path bug passed every hermetic test and was only caught by the
E2E running the real `buildToolImpls()` against the real wiki index.

## Exit codes

`0` ok (answer produced, even if the tool-call cap was hit) · `2` usage error
· `3` infrastructure failure (Ollama unreachable / chat error).

## Honest scope — what this is NOT

This L2 connects Ollama to PRISM's read-only **knowledge surface** (graph +
wiki + files). It does **not** wire the live `prism_calc` / `prism_session`
MCP dispatchers as tools — that is **Layer 2b** (`U-OE-BRIDGE-L2B`), a
separate follow-on. The MCP server on port 3100 exposes no plain HTTP route;
its transport surface must be resolved first, and the value of dispatcher
tools is correctness, not token-saving. The knowledge-surface tools are the
reliable, server-free 80% that delivers the token-saving win — which is the
stated goal.

## Skill

`/ollama-bridge` (`.claude/commands/ollama-bridge.md`) — documents when to
reach for the bridge instead of burning Claude tokens on a graph/wiki/file
investigation.

## L2B follow-up (2026-05-18, slot charlie) — leaf-file scan, 33× wiki recall

`U-OE-BRIDGE-L2B-WIKI-LEAVES` (commit `94d4d0feac`). The `wiki_lookup` tool
previously read **only** `knowledge/wiki/index.md` (722 curated entries). The
system has **22,734 leaf `.md` files** under `knowledge/wiki/architecture/`
(per-engine, per-action, per-formula docs auto-generated from `system-graph.json`)
— ≈31.5× more knowledge surface, all invisible to Ollama. L2B adds a
filename-only leaf-scan: `listWikiLeafFiles({root,maxDepth,readdirImpl,statImpl})`
(pure, dep-injected, fail-soft, excludes `_*.md`, 5-deep recursion-capped,
symlink-loop defense via `seen` Set) + `scoreLeafFilenames(leaves,tokens)` (pure
substring scoring) + a 5-min TTL per-process cache. `wiki_lookup` now returns
INDEX body + LEAF body (capped at 6 leaves so they don't crowd the curated
index). R12 fail-loud: `(note: wiki leaf directory not found — only index.md
was searched)` when the leaves dir is absent. **Live**:
`wiki_lookup({name:"kienzle force"})` returns 7 index lines PLUS 6 leaf paths
including `engines/physics/kienzleforcemodelengine.md` and
`formulas/formula-constants-kienzleforce.md` — net-new knowledge for the model
to drill via `read_excerpt`. 9 new tests (96 total, 95 PASS). 2-arm per-file
scrutiny PASS/PASS. Memory: [[reference_ollama_expand_charlie_iter_2026_05_18]].

L2B differs from L2b's original "live MCP dispatcher tools" framing: HTTP /mcp
transport (POST :3100/mcp StreamableHTTPServerTransport) was reconfirmed
blocked (initialize + tools/call both timeout). L2B closed the higher-leverage
real gap; the MCP-dispatcher path stays queued for after the SDK transport is
unblocked.

## Related

- `scripts/ollama-prism-bridge.mjs` · `scripts/__tests__/ollama-prism-bridge.test.mjs`
- [[ollama-expand-ms0]] — Layer 1 (`ask-ollama.mjs`)
- [[ollama-pipeline-ms0]] — the passive Ollama pipeline-injector hooks
- `state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md` — the layered design + honest scope
