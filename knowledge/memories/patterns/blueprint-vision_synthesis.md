---
name: blueprint-vision_synthesis
description: "[auto-synth · verify] Compounding synthesis of the blueprint-vision domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: blueprint-vision
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:54:18.537Z
  sourceHash: bd1126a696cf
  advisoryOnly: true
  mustHumanVerify: true
---

# blueprint-vision — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Missing engine implementations** – The alpha‑seed lists 21 `CAD*Engine` classes that do not exist in the codebase (`mcp-server/src/engines/blueprint-vision/`) [1].
- **Central dispatcher surface** – All ~40 blueprint‑vision actions are routed through `cadDispatcher.ts`, making it the primary integration point for new features [2].
- **Confidence gating divergence** – Shipped confidence thresholds use a 0.70 OCR floor plus conformal drift, not the seed’s 0.85/0.95/0.99 values [3].
- **OCR as the bottleneck** – The training corpus is fully blocked on GPU‑OCR (12 321 prints, 0 text‑ready) and requires a concurrent pipeline to free up resources [4][5][6][22].
- **Concurrent OCR model choice** – A smaller model (`qwen3‑vl:8b‑instruct`, later `qwen2.5vl`) enables OCR to run alongside the chat fleet without dedicated idle hosts [5][22].
- **Overnight batch readiness** – After shipping 5 of 6 pre‑test blockers, the OCR pipeline is armed for unattended nightly runs [6].
- **Compounding brain synthesis** – Per‑galaxy `*_synthesis.md` files distill memories into reusable patterns; they rely on a fully linked `MEMORY.md` that follows the Master‑brain template (4 axes) [10][24].
- **Lock & task registration hygiene** – Corrupt `.brain-refresh.lock` files and unregistered refresh tasks have caused pipeline deadlocks, later fixed via reclamation commits [12][18].

## Key decisions & rules
| Decision | Rule / Implementation |
|----------|-----------------------|
| Use `cadDispatcher.ts` as the sole entry point for blueprint‑vision actions. | Route all new action handlers through this dispatcher; avoid parallel surfaces [2]. |
| Set confidence thresholds to **0.70 OCR floor + conformal drift**. | Do not apply seed’s higher gates; enforce the shipped values in all validation pipelines [3]. |
| Run OCR concurrently with the chat fleet using a lightweight model. | Deploy `qwen3‑vl:8b‑instruct` (or newer `qwen2.5vl`) and rely on GPU concurrency rather than idle hosts [5][22]. |
| Schedule OCR as an overnight unattended batch after blocker resolution. | Trigger the pipeline only when the host is quiet; monitor for the final remaining blocker before full automation [6]. |
| Do not reference the non‑existent `CAD*Engine` classes. | Remove or replace any imports of those 21 engine names; implement concrete engines as needed [1]. |
| Enforce the Master‑brain template linkage in every galaxy’s `MEMORY.md`. | All four axes (UP, DOWN, LEFT, RIGHT) must be present for a “connected brain” [10]. |
| Consolidate post‑processor baselines to Hurco (mills) and Okuma LB3000 / Multus B250IIW (turning). | Use these as the default pipelines across all machines [11]. |
| Reclaim corrupted brain locks and ensure refresh tasks are registered on every host. | Apply lock‑reclaim commits and verify task registration during deployment [12][18]. |

## Open threads
- **Engine implementation** – Provide concrete implementations for the 21 `CAD*Engine` classes referenced in the seed but missing from the repository [1].
- **Final OCR blocker** – Identify and resolve the last of the six pre‑test blockers to achieve a fully automated nightly OCR run [6].
- **Confidence fine‑tuning** – Validate that the 0.70 floor + conformal drift thresholds meet downstream quality requirements; adjust per‑field if needed.
- **GPU‑OCR scaling** – Benchmark concurrent OCR impact on chat fleet latency and explore further model optimizations or resource partitioning.
- **Fusion tooling DB population** – Execute the build plan to populate holder‑by‑type‑brand and tooling‑by‑material‑type‑brand databases [15].
- **Holder taper×contact integration** – Incorporate the canonical taper/contact categorization into CAM pipelines and verify against BCV=CAT bug fix [16].
- **Galaxy synthesis task registration** – Ensure the `*_synthesis.md` refresh task is registered on all hosts to prevent silent rot [18].
- **Training corpus text extraction** – Complete OCR conversion of the 12 321 prints, then feed the resulting text into model training pipelines.
