---
name: post-processor_synthesis
description: "[auto-synth · verify] Compounding synthesis of the post-processor domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: post-processor
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:58:21.728Z
  sourceHash: 5bf23435a7b5
  advisoryOnly: true
  mustHumanVerify: true
---

# post-processor — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Vector‑store failure fallback** – When `prism_memory:semantic_search` cannot reach Qdrant, the system falls back to a write‑hook index + master `MEMORY.md` instead of aborting [1].  
- **Singleton connection bug** – The `QdrantMemoryEngineSingleton` was never calling `store.connect()`, leaving the whole semantic search surface dead until a manual fix restored it [20].  
- **Keep‑alive omission in Ollama calls** – The bridge that invokes `/api/generate` omitted the `keep_alive` flag, causing cold‑start latency and occasional timeouts; the bug was patched fleet‑wide [7].  
- **Per‑galaxy doctrine directories only** – Engine code lives flat; each galaxy folder under `mcp-server/src/engines/<galaxy>/` contains just `CLAUDE.md`, `MEMORY.md`, `PATHS.md`, and `TOOLBELT.md` (doctrine), never source files [11].  
- **Galaxy‑specific git commit handling** – Since 2026‑05‑30 each chat galaxy writes its own commits directly to the integration branch instead of relying on a central “golf” integrator [23].  
- **Knowledge accretion iterations** – The post‑processor domain follows a scheduled deep‑source iteration cadence (e.g., iter12, iter16) that drafts next‑layer reputable research and updates the galaxy’s doctrinal files [6][19].  
- **Buildout checklist per slot** – Every slot runs an 11‑step buildout script that creates sentinel files (`CLAUDE.md`, `MEMORY.md`, etc.) for its assigned galaxy (e.g., hermes‑zulu on bravo) [13][14].  
- **Refresh fallback model** – When the primary LLM (`gpt‑oss:120b`) is unavailable, `galaxy-synthesis-refresh.mjs` forces a warm fallback to `qwen2.5‑coder:32b` [24].

## Key decisions & rules
1. **Fallback hierarchy for semantic search** – Primary path uses Qdrant; on failure immediately switch to the write‑hook index + master `MEMORY.md` (no retry loop) [1].  
2. **Ensure singleton connection at startup** – `QdrantMemoryEngineSingleton.connect()` must be invoked during server init; guard with a health check that aborts start if the call fails [20].  
3. **Always include `keep_alive` in Ollama generation requests** – Default to a 30‑second keep‑alive unless overridden by explicit config; centralize this flag in `galaxy-reasoning-bridge.mjs` [7].  
4. **Doctrine‑only galaxy folders** – Enforce that `mcp-server/src/engines/<galaxy>/` contains only the four doctrinal markdown files; any source code must reside in the shared flat namespace (e.g., `cad-fusion-live-ms0`) [11].  
5. **Per‑galaxy commit policy** – Each galaxy’s CI pipeline pushes directly to the integration branch; the “golf” integrator is disabled for all future slots [23].  
6. **Iterative knowledge accretion schedule** – Post‑processor iterations are locked to a bi‑weekly cadence (iter12 → iter16 …); each iteration must produce updated `CLAUDE.md` and `MEMORY.md` with cited reputable sources [6][19].  
7. **Buildout verification** – After the 11‑step script runs, verify presence of sentinel files (`CLAUDE.md`, `MEMORY.md`, `PATHS.md`, `TOOLBELT.md`) before marking the galaxy as “ready” [13][14].  
8. **Warm‑model fallback rule** – If the primary LLM health check fails during synthesis refresh, automatically invoke `--model qwen2.5-coder:32b` and log the event for post‑mortem analysis [24].

## Open threads
- **Automated Qdrant outage detection & alerting** – Current fallbacks are reactive; a proactive monitor that triggers the write‑hook path before client requests hit errors is still missing.  
- **Standardizing keep‑alive across all AI backends** – Ollama was patched, but other generation services (e.g., OpenAI, Anthropic) lack a unified keep‑alive policy.  
- **Sync strategy for shared tree vs. slot worktrees** – Files may exist only in the integration tree (`cad-fusion-live-ms0`) and not in a slot’s worktree, leading to “recover+extend” manual steps [10][12]; a deterministic sync mechanism is needed.  
- **Versioning & deprecation of knowledge‑accretion iterations** – As iter16 supersedes iter12, the policy for retiring older doctrinal content (and its citations) remains undefined.  
- **Performance impact of warm‑model fallback** – Early tests show acceptable latency with `qwen2.5-coder:32b`, but systematic benchmarking against production loads is pending.  
- **Extending doctrine‑only rule to future sub‑galaxies** – New post‑processor micro‑domains (e.g., error‑model calibration) will need clear placement guidelines—whether they belong in the flat namespace or get their own doctrinal folder.
