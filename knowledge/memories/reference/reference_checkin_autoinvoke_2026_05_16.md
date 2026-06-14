---
name: reference-checkin-autoinvoke-2026-05-16
description: "/checkin pipeline — named-only surfaces (Steps 8-11 + High-ROI) converted to auto-invoked steps 6k/6l via checkin-recall.mjs, cost routed through Obsidian local indexes + Ollama curl distill."
aliases: reference_checkin_autoinvoke_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.059Z
---


# /checkin auto-invoke rollout + checkin-recall.mjs (2026-05-16, slot bravo claude-339c8ff7)

**Shipped: commit `23bf928cf`** (2 files, 374 ins). NOTE: concurrent peer commit `3567ed0cd` (MemoryConflictResolverEngine) transiently absorbed an earlier snapshot from the shared main tree — index thrash; `23bf928cf` is the authoritative final version (P1 fixes incl). Lesson: the shared `H:/prism` tree thrashes the index under concurrent peers — commit with one atomic `git add -f <files> && git commit`, don't interleave diagnostics.

**User directive:** "ensure the checkin slash command pipelines auto invoke every slash command and tool call" + "make sure were utilizing obsidian and ollama to help with the token cost". Chosen scope: full 6i/6j-pattern rollout + deterministic gate, always-fire-all.

**Problem:** `checkin.md` Steps 8-11 + the High-ROI table NAMED ~30 capability surfaces in passive reference tables but never INVOKED them ("named-not-invoked" regression class — checkin.md:220 already formalized it; Steps 6i/6j were prior point-fixes for tribal_search + cot_reason).

**Shipped:**
- **`scripts/checkin-recall.mjs`** (NEW helper) — single composition point. Subcommands: `recall --source <master-index|memory|wiki|skill|tribal> --query --limit --ollama-distill` and `roi-gate --args --topic`. COMPOSES `master-index-search-lib.mjs` (reuse, not reinvent). Token-cost design: recall runs over **local Obsidian/graph indexes** (zero Claude tokens); distill offloads to **local Ollama** so Claude only reads ≤3 distilled bullets/source.
- **`checkin.md`** — new §6k (vault+master-index+memory+wiki+skill+tribal recall, Ollama-distilled) + §6l (deterministic High-ROI roi-gate), §Report lines, Steps 8-11 reframed as WHAT-reference, §6i marked superseded.

**Key gotchas hit + fixed (all verified):**
1. **`system-graph.json` is 324MB** — over `master-index-search-lib`'s 200MB `PRISM_GRAPH_MAX_BYTES` cap → `loadGraph` returns null. Master-index recall must shell out to `scripts/system-viz-query.mjs find` (purpose-built streaming query), NOT the lib.
2. **node `fetch` to localhost:11434 FAILS on this Windows box** ("fetch failed") — Ollama distill MUST use a `curl` subprocess (documented [[reference_ollama_pipeline_ms0_2026_05_15|OLLAMA-PIPELINE-MS0]] pattern). A fetch-based distill silently falls back to raw every call → the "use Ollama for token cost" directive would be silently unmet. Verify: distill via curl produces real LLM bullets in ~1.4s.
3. **`system-viz-query find` is whole-query SUBSTRING match** — multi-word natural queries miss. Helper tries full query, then retries with the most-distinctive single token.
4. **Hyphenated topic slugs** (`bravo-blueprint-ocr-training-ms1`) — `tokenize`'s regex keeps `-`, so the slug stays one 32-char token. The recallGraph fallback splits on all non-alphanumerics instead.
5. **P1 (scrutiny-caught): roiGate substring match** — `"feedback"` matched keyword `"feed"` → false `prism_safety:*` trigger. Fixed: word-boundary regex (`kwMatch`).
6. **P1 (scrutiny-caught): `tokenize` ASCII-only** — unicode queries mangled silently. Fixed: `\p{L}\p{N}` with `u` flag.

**Follow-on (same session):** `/autopilot-full` + `/yolo-mode` skills (at `H:/.claude/commands/` — harness config dir, NOT a git repo; C: and H: copies are the SAME linked file) given a "MODERN TOOLING LAYER" / "Modern Tooling" section each — RTK, Ollama offload, /system-viz-first, Obsidian wiki/memory/tribal, modern hook stack, scrutiny gates, session-continuity, checkin-recall.mjs. Also fixed autopilot-full stale `cd /c/PRISM/mcp-server` → `H:/prism` + refreshed the stale AI-routing (codellama→qwen2.5-coder) + HOOKS LEVERAGED tables.

**Doctrine:** any pipeline doc that NAMES a capability surface must also fire it (helper invocation or gate) — named-only = silent no-op. Route recall/summarize cost through local compute (Obsidian indexes + Ollama curl), reserve Claude for judgment. Sister: [[reference_ollama_pipeline_ms0_2026_05_15]], [[reference_precompact_bare_node_enoent_2026_05_16]] (same process.execPath lesson, dogfooded here), [[feedback_checkin_loop_goal_utilization_audit_2026_05_16]].
