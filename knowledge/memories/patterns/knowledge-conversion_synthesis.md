---
name: knowledge-conversion_synthesis
description: "[auto-synth · verify] Compounding synthesis of the knowledge-conversion domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: knowledge-conversion
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:50.351Z
  sourceHash: 790a85fcffa0
  advisoryOnly: true
  mustHumanVerify: true
---

# knowledge-conversion — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distillation after each ship** – every “U‑COURSE‑FORGE” module produces a distilled learning summary (e.g., docs, dispatcher, expr, FEM, etc.) that feeds the next conversion step【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-doc-reflection】.  
- **Layered course‑to‑node conversion pipeline** – starts with `OperatorSplittingMethod` (P1) → `LinearStateSpaceModel` (P6) → specialized converters (FDM, FEM, GD, LAG) each adding a new surface to the node model【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-p1】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-p6】.  
- **Documentation reflection** – every conversion module mirrors its API into a “doc‑ref” surface, extending documentation automatically and keeping code & docs in sync【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-doc-reflection】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-fdm-doc-reflection】.  
- **Stub emission & bulk generation** – the `STUBS‑EMITTER` consumes “forge proposals” and emits ready‑to‑compile stubs; a 13‑case CLI test suite validates the emitter output【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-stubs-emitter】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-stubs-emitter-tests】.  
- **Operator‑actionable design** – proposals are expressed as operator/action pairs, enabling a uniform dispatcher to route data and actions across lanes (C, D, E)【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-proposals】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-dispatcher-design】.  
- **Safe sandboxed evaluation** – the `SafeExpressionEvaluator` (Option A) is the keystone for evaluating user‑provided expressions without side effects【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-expr】.  

## Key decisions & rules
| Decision | Rationale / Rule | Source |
|----------|------------------|--------|
| **Dispatcher wiring** – centralize routing logic in a single dispatcher rather than scattering per‑lane code. | Improves maintainability and enforces the operator/action contract. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-dispatcher-design】 |
| **Use `SafeExpressionEvaluator` (Option A)** as the only allowed expression engine. | Guarantees sandboxing, deterministic results, and prevents code injection. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-expr】 |
| **OperatorSplittingMethod** is the canonical first‑conversion algorithm for turning a course into a node model. | Provides a mathematically sound decomposition that other converters build upon. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-p1】 |
| **LinearStateSpaceModel** must be applied as the third conversion step to capture linear dynamics before adding domain‑specific surfaces. | Completes the core state‑space representation, enabling later FEM/GD extensions. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-p6】 |
| **Bulk stub emission** via `STUBS‑EMITTER` is mandatory for any new forge proposal; emitted stubs must pass the 13‑case CLI test suite before integration. | Guarantees consistency and reduces manual boilerplate. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-stubs-emitter】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-stubs-emitter-tests】 |
| **Documentation surfaces** must be kept in sync with code via the `DOC‑REFLECTION` modules; any API change triggers an auto‑distilled doc update. | Ensures up‑to‑date developer docs and supports automated knowledge extraction. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-doc-reflection】【reference/reference_post_ship_knowledge-conversion-ms0-u-course-forge-fdm-doc-reflection】 |
| **Deferred tail handling** – when a conversion yields a “deferred tail”, the CLAUDE.md doctrine pointer must be consulted to resolve it. | Provides a canonical reference for ambiguous or incomplete conversions. | 【reference/reference_post_ship_knowledge-conversion-ms0-u-kc-e1-deferred-tail】 |

## Open threads
- **Deferred‑tail resolution strategy** – while the CLAUDE.md pointer is noted, concrete tooling or automated fallback for deferred tails remains undefined【reference/reference_post_ship_knowledge-conversion-ms0-u-kc-e1-deferred-tail】.  
- **LoRA training rotation closure (KIP03)** – outcome indicated but integration steps with the forge pipeline are not yet documented【reference/reference_post_ship_knowledge-conversion-ms0-u-kip03】.  
- **Session‑summary refresh (LOOP‑bc83bbdb‑SUMMARY‑V2)** – a refreshed summary exists, but its impact on downstream routing and documentation pipelines is still being evaluated【reference/reference_post_ship_knowledge-conversion-ms0-u-loop-bc83bbdb-summary-v2】.  
- **Scaling knowledge‑accretion iterations** – iterations 10–13 have been drafted, yet the process for incorporating these deeper layers into the existing forge modules has not been formalized【reference/reference_knowledge-conversion_iter10_deepsource_2026_06_14】【reference/reference_knowledge-conversion_iter13_deepsource_2026_06_14】.
