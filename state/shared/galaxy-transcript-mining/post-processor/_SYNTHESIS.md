# post-processor galaxy CROSS-SESSION SYNTHESIS (35 of 35 mineable, model gpt-oss:20b, 2026-06-11)

## What this galaxy is building  
- Unified CNC G‑code generation stack (Fanuc, Haas, Okuma, Siemens, Heidenhain) via PRISM post‑processors and master‑post dialects.  
- End‑to‑end CAD → STEP → 2‑D blueprint pipeline with dimensional comparison.  
- Closed‑loop validation using CIMCO Edit/Backplot, WinMax/Hurco simulators, and SIM gates (SIM‑4 – SIM‑7).  
- AI‑enhanced knowledge base: Qdrant collections (`prism_memories`, `prism_wiki`), OCR‑extracted JM prints, Obsidian sync.  
- Docker‑based LLM bridge (Ollama + NIM) with local inference offload and LoRA fine‑tuning.  
- Fleet‑wide resource hygiene: memory watchdog, fleet‑reaper, crash‑watch, soft‑relief thresholds.  
- System‑viz dashboards and architecture graph.

## Shipped capabilities  

| Capability | Commit / Path |
|------------|---------------|
| Offload gate timeout 30 s (`mode:auto`) | `46c7418df6` |
| Loop Engineering article ingestion | `401718a11c` |
| Hermes‑brain bridge + orphan‑reap | `3f0c6cb145` |
| HMEMV envelope drift fix (R12) | `4af50eec64` |
| Hermes cron prewarm & GEPA weekly tasks | `4c3fa42da1`, `bcbfc4f442` |
| Qdrant vectors seeded 17 032 (`prism_memories`) | `a165f4166e` |
| Qdrant ANN consumer rewire (ANN primary, BM25 fallback) | `4c6d8ed40c` |
| Keep‑alive nomic‑embed‑text | `78f64fda97` |
| OCR parse bug fix (truncation + leading dot/plus) | `e354869c93` |
| GPU health check (`gpu_health.py`) | – |
| LoRA runner (`U-XRAY-VL-TRAIN-RUNNER`) | `scripts/lib/blueprint-vl-train-runner.mjs` |
| SIM gates (CIMCO) | `U-CIMCO-SIM-4`, `5`, `6`, `7` |
| C# read‑report driver part 2 (`invoke-read`) | `01c53f6872` / `679565fcb5` |
| Echo roadmap v2 spec | `state/shared/specs/ECHO-FORGE-ROADMAP-2026-06-09.md` |
| Master Post Processor updates (dialect symmetry) | `7a6952b3ad` |
| PDF extraction pipeline (`streamPopulateQdrant`) | `14a3c2dd1b` |
| Content classifier recovered 31 controllers | `fbd4ad69a1` |
| CAD engines (Execution, Feedback, HeadReplay…) | multiple `CAD*Engine.ts` |
| Playbook engine + tribal knowledge | `MachiningPlaybookEngine.ts`, `TribalKnowledgeApplicatorEngine.ts` |

## Key decisions + rationale  
- **Offload gate**: extend timeout to 30 s to avoid cold‑start fail‑open.  
- **Qdrant migration**: move all memory vectors; add hybrid recall (ANN primary, BM25 fallback).  
- **Keep‑alive nomic‑embed‑text**: prevent eviction under GPU load.  
- **Hermes prewarm & GEPA weekly tasks**: eliminate 5 s cold loads on cron ticks.  
- **OCR parse bug fix**: handle truncated JSON and leading dot/plus numbers.  
- **GPU health check**: gate LoRA training on `gpu_health.py`.  
- **SIM gates**: split SIM‑4 – 7 into separate commits for CI clarity.  
- **C# read‑report driver**: single‑process `invoke-read` to avoid unreliable two‑process flow.  
- **Echo roadmap v2**: commit spec, enable looped `/checkin‑echo`.  
- **Master Post Processor updates**: unify dialect handling, add missing enums.  
- **PDF extraction pipeline**: stream‑populate Qdrant to avoid OOM on 137 MB corpus.  

## Standing operator directives  
- Push through improvements; no permission needed.  
- Fill high ROI gaps; accelerate Obsidian & Hermes capabilities.  
- Re‑register stale OCR batch task (operator‑UAC only).  
- Restart Hermes gateway as a service for unattended persistence.  
- Activate calibrated 5 h‑quota keystone after safety fix.  
- Begin closed‑loop testing of post processors for all JM machines.  
- Build posts for highest selling machines globally after closed‑loop tests.  
- Use `/checkin‑echo` wrapper; schedule recurring `/loop [5m] /goal`.  

## What is still to build (open threads)  
1. Consumer rewire integration into all 26 slots’ recall path.  
2. Continuous monitoring of `nomic‑embed‑text` residency & fallback under heavy load.  
3. Commit HMEMV03 after fresh context.  
4. Finalize SIM‑1 live‑report‑grid de‑risk; open CIMCO Edit session.  
5. Deploy Qdrant ANN primary, linear BM25 fallback across all post‑processors.  
6. Validate OCR batch overnight job completes 85 K corpus.  
7. Finalize LoRA fine‑tune (T4.1) with GPU env ready.  
8. CAD → STEP wiring: fully test `CADToSTEPPipelineEngine` and add CAD→drawing emission action.  
9. NIM migration: rewrite offload hooks to use `local‑llm‑bridge`.  
10. SlotLabel:null deep‑fix in fleet‑memory‑monitor & process‑slot‑map.  
11. Memory watchdog tuning under sustained pressure; test `tryCompact()` lock scenarios.  
12. Crash‑watch snapshot persistence verification.  
13. Docker health recovery: apply `.wslconfig`, restart WSL, verify `docker info`.  
14. Audit‑drift resolution: finalize cross‑lock fixes and orphan hook cleanup.  
15. Fleet‑reaper batch‑kill bug hardening.  
16. Obsidian/ Qdrant RAG sync: ensure new memory entries propagate to knowledge graph.  

## How to build it (patterns/sequence)  
1. **Slot claim** → `/checkin-<slot>` with `--preferSlot <slot>`.  
2. **Pre‑commit guard** → run `install-pathspec-only-hook.mjs` before any commit.  
3. **Unit build** – modify code, run unit tests (`vitest`, `node:test`).  
4. **Audit & drift check** – execute `audit-roadmap-drift.mjs`; resolve conflicts.  
5. **Commit after each file** → `git add <file>; git commit -m "<subject>"`.  
6. **Precompact** → `/precompact` if memory >90 %.  
7. **Handoff** → `/handoff-<slot>` to publish envelope.  
8. **Loop tick** – wait for `/loop [5m]`; repeat until Stop hook condition met.  

## Tools to use (dispatchers/skills/scripts/hooks/system‑viz/AI‑systems/qdrant/obsidian/ollama)  
| Category | Tool / Purpose |
|----------|----------------|
| Dispatchers | `businessDispatcher.ts`, `schedulingDispatcher.ts`, `calcDispatcher.ts`, `cadDispatcher.ts`, `devDispatcher.ts` |
| Skills / Scripts | `chat-slots.mjs`, `slot-bind-enforce.mjs`, `audit-roadmap-drift.mjs`, `fleet-task-health-watch.mjs`, `nim-docker-launcher.mjs`, `memory-compact.mjs`, `stop-memory-size-watchdog.mjs` |
| Hooks | `tribal-by-domain-inject`, `wiki-precheck-inject`, `master-index-precheck-inject`, `slot-bind-enforce.mjs`, `fleet-reaper-sweep.mjs` |
| System‑viz | `system-viz-query.mjs`, `system-viz-add-node.mjs`, `architecture-graph.json` |
| AI systems | Ollama (local LLM), NIM via `nim-docker-launcher.mjs`, `local‑llm‑bridge` |
| Qdrant | RAG in Obsidian sync (`stop-obsidian-memory-feed.mjs`) |

## Recurring findings + bugs  
- Offload gate dormant → cold‑start fail‑open; fixed by timeout extension.  
- Missing Qdrant collection for HMEMV09; seeded with 17 032 vectors.  
- Consumer rewire required to use ANN and preserve fallback.  
- `nomic‑embed‑text` evicted under GPU load → BM25 fallback; resolved by keep‑alive.  
- Hermes prewarm needed to avoid 5 s cold loads on cron ticks.  
- OCR parse bug (truncated responses, leading dot/plus) → entire extraction lost; fixed.  
- GPU health check missing → LoRA training failed; added `gpu_health.py`.  
- SIM gates commit split caused torn‑commit issues; resolved by separate commits.  
- C# read‑report driver two‑process flow unreliable; replaced with single‑process `invoke-read`.  
- Qdrant ANN fallback sometimes triggered due to missing vectors; ensured primary collection present.  
- Hermes prewarm & GEPA tasks occasionally stalled; added watchdog and keep‑alive.  
- Memory pressure 95–99 % during peak → triggers `/compact` or reaper.  
- Index lock contention (ENOBUFS) solved by commit‑after‑each‑file and slot worktrees.  
- Batch‑kill bug in fleet‑reaper (`Stop‑Process` timeout) fixed with PowerShell hardening.  
- Regex escape bug in audit‑unwired‑engines corrected.  
- SlotLabel:null prevented Build B nudge; pending deep fix.  
- CAD→drawing emission missing – engine wiring incomplete.  
- NIM offload hooks still inline Ollama – migration pending.  
- Docker ETIMEDOUT due to WSL resource pressure → resolved by `.wslconfig` and service restart.  
- Crash‑watch snapshot persistence not yet verified.
