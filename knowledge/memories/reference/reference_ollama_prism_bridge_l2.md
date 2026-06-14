---
name: reference-ollama-prism-bridge-l2
description: "OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2 — ollama-prism-bridge.mjs: the Ollama agentic harness that runs the call→execute→feed-back loop over 3 read-only PRISM knowledge tools."
aliases: reference_ollama_prism_bridge_l2
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.239Z
---


2026-05-18 slot charlie. Built `scripts/ollama-prism-bridge.mjs`
([[reference_ollama_expand_ms0|OLLAMA-EXPAND-MS0]]/U-OE-BRIDGE-L2) — Layer 2 of the Ollama→PRISM bridge
ladder. Ollama is a model server, not an MCP client; this is the **harness**
that makes a local model use tools like Claude Code. It advertises 3
READ-ONLY knowledge tools (`viz_search`, `wiki_lookup`, `read_excerpt`) to an
Ollama model via `/api/chat` `tools`, then runs the call→execute→feed-back
agent loop until a final answer — all locally, ~0 Claude tokens. 86-case
`node:test` suite incl. real-data E2E + a `main()` subprocess oracle. Skill
`/ollama-bridge`.

**Why:** answers the operator question "hook Ollama up to PRISM MCP like
Claude Code". The honest answer is a harness, not a config flag — and the
high-value, reliable version is the read-only knowledge surface, not the live
MCP dispatchers (see scope note below).

**How to apply:** for a multi-step "where is X / how does Y work / what wires
to Z" investigation, run `node scripts/ollama-prism-bridge.mjs "<question>"`
instead of chaining Grep/Read/Agent in the Claude context. See [[ask-local]],
[[reference_ollama_expand_ms0]].

**Lessons (R12):**
- Per-file scrutiny caught a real P0: a `chatImpl` that THREW (vs. returning
  `{ok:false}`) escaped `runAgentLoop` as an uncaught exception with an
  undocumented exit code. Both chat call sites are now try/catch-wrapped to
  fail loud. A regression-oracle test guards it. Lesson: in an injected-dep
  design, the injected dep can fail in a way the production impl "never"
  does — wrap the call, don't trust the contract.
- Scrutiny caught a P1 the hermetic tests could not: `WIKI_INDEX_REL` pointed
  at `knowledge/wiki/architecture/index.md`, which does not exist (the
  catalog index is `knowledge/wiki/index.md`). Every `wiki_lookup` would have
  silently returned "file not found". Only the real-data E2E running the real
  `buildToolImpls()` against the real wiki index catches an integration-path
  bug like this. ALWAYS ship a real-data E2E for a pure-core + injected-deps
  design — recurring PRISM lesson.
- Arm-A test reviewer hallucinated: it "reviewed" vitest/fake-timer tests
  that do not exist in the `node:test` file. Arm-B's review was accurate and
  thorough. Lesson: cross-check a reviewer's cited symbols against the file
  before acting on its findings.

**Honest scope:** this L2 wires Ollama to PRISM's read-only KNOWLEDGE surface
(graph + wiki + files) — the reliable, server-free 80% that delivers the
token-saving win. It does NOT wire the live `prism_calc` / `prism_session`
MCP dispatchers as tools — that is Layer 2b (`U-OE-BRIDGE-L2B`), queued: the
MCP server on port 3100 exposes no plain HTTP route, so its transport surface
must be resolved first. Spec: `state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md`.

## Related
[[reference_ollama_expand_ms0]] · [[reference_ollama_pipeline_ms0_2026_05_15]] · [[ask-local]]
