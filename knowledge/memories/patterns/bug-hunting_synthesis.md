---
name: bug-hunting_synthesis
description: "[auto-synth · verify] Compounding synthesis of the bug-hunting domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: bug-hunting
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:54:27.075Z
  sourceHash: 8694d0500f66
  advisoryOnly: true
  mustHumanVerify: true
---

# bug-hunting — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distillation after every ship** – each “post‑ship” commit (e.g., QUOTING‑SYNERGY, GALAXY‑CONTEXT‑FILL, CAD‑COMPLETE, CATALOG‑APP‑WIRING) generates a distilled learning memo that is immediately wired into the central wiki/brain. This creates a self‑reinforcing loop of knowledge capture. [3][4][9][15][16][17][22][24]  
- **Galaxy‑level MEMORY.md as a “connected brain”** – every galaxy must contain a 4‑axis `MEMORY.md` (UP, DOWN, LEFT, RIGHT) cloned from the master template; missing axes break semantic recall. [7][18]  
- **Context‑economy via index injection toggle** – `PRISM_MEMORY_INDEX_INJECT=0` is deliberately used to keep per‑prompt injections cheap and avoid bloating the embedding cache. [5]  
- **Enrichment of recall through A3 indexing** – only the domain body text (headings, heuristics, rules) is indexed, lifting “buried” brains in hybrid search. [9]  
- **Baseline consolidation of post‑processors** – all mill/turning post‑processors are unified under a single baseline (Hurco for mills, Okuma LB3000 / Multus B250IIW for turning). [8]  
- **Holder taxonomy standardization** – a canonical holder axis separates taper size from contact type; this schema is reused across tooling DB builds and wiring modules. [14][19][20][21][24]  

## Key decisions & rules
| Decision / Rule | Rationale / Effect |
|-----------------|--------------------|
| **Lock reclamation commit** `U-OBS-BRAIN-LOCK‑RECLAIM` – clears a 32‑byte dead‑lock that halted all five brain‑refresh pipelines. [2] | Guarantees pipeline availability; must be re‑run after any future lock‑related crash. |
| **Disable memory index injection** (`PRISM_MEMORY_INDEX_INJECT=0`) as an intentional setting, not a bug. [5] | Saves compute and prevents accidental context leakage. |
| **Enforce 4‑axis brain template** for every galaxy `MEMORY.md`. [18] | Enables full semantic recall; missing axes trigger validation errors. |
| **Register the Brain Refresh scheduled task on each host** – otherwise auto‑refresh silently rots. [10] | Ensures continuous synthesis updates across the fleet. |
| **Truncate master `MEMORY.md` at 24 576 bytes** (pointer‑only discipline). [23] | Prevents context overflow; downstream modules must handle truncation gracefully. |
| **Use A3 enrichment indexing** – index only domain body, not boilerplate header. [9] | Improves recall relevance and reduces noise in hybrid search. |
| **Consolidate post‑processor baselines** to Hurco / Okuma LB3000 / Multus B250IIW. [8] | Simplifies maintenance and guarantees consistent machining behavior. |
| **Standard holder taxonomy (taper × contact)** applied across tooling DB, wiring, and fusion modules. [14][19][20][21][24] | Guarantees interoperability of holder‑selection engines. |

## Open threads
- **Brain‑refresh task registration automation** – current fix is manual; a watchdog or host‑bootstrap script is needed to guarantee the scheduled task is always present after new node provisioning. [10]  
- **Memory truncation impact** – the silent 24 KB ceiling may be cutting off critical bug‑hunting context for large galaxy memories; explore dynamic chunking or external memory stores. [23]  
- **Sparse galaxy memories** – despite a full fill run, some galaxies still lack complete `MEMORY.md` sections (e.g., missing “shared specs”); need a periodic audit and auto‑completion routine. [7][15]  
- **Lock‑reclamation monitoring** – the lock fix resolved the immediate deadlock but no long‑term guardrails exist to detect similar NUL‑byte corruptions early. Implement health checks on brain‑refresh pipelines. [2]  
- **Index injection toggle scope** – while `PRISM_MEMORY_INDEX_INJECT=0` is intentional, verify that downstream modules (e.g., post‑processor selection) do not rely on per‑prompt injections for critical lookups. [5]  
- **Integration of CAD asset generation with bug‑hunting** – the delta‑CAD pipeline produces high‑ROI assets but their linkage to bug‑hunting traceability is undefined; define a mapping schema. [4]
