---
name: reference_wiring_reachability_dispatch_2026_06_13
description: "Wiring (romeo) Phase-2 deep-research anchor — dispatcher/command pattern (GoF), dependency-graph + reachability analysis for orphan/unwired detection, dead-code elimination / tree-shaking (Rollup/Closure), AST tooling (ts-morph/SWC), call-graph construction, lazy-import + code-splitting, and the dispatch-shape taxonomy (switch/case vs lookup-table vs ARRAY-membership FOO_ACTIONS.includes — the 2026-06-11 audit-detector lesson). Written 2026-06-13 slot:zulu Phase-2."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.267Z
aliases: reference_wiring_reachability_dispatch_2026_06_13
---


**Context:** Phase-2 anchor for the wiring galaxy (romeo — engine→dispatcher wiring closure, unwired/orphan
rescue), per the 2026-06-13 knowledge-max `/goal`. Spec: `FLEET-KNOWLEDGE-MAX-ROADMAP-2026-06-13.md` §romeo.

## The wiring problem (PRISM's orphan/unwired closure)
- An engine is "wired" only when a consumer reaches it: dispatcher action, route, registry, orchestrator,
  singleton, **or another engine** (engine→engine consumption — the 2026-06-10 audit fix: 89 "unwired" → 66
  truly-dormant + 23 library-layer). The audit must recognize ALL consumer kinds or it false-flags.
- **Dispatch-shape taxonomy** (an action-handler audit must recognize all): (1) `switch/case`, (2) lookup-table
  key, (3) plain-object key, (4) **ARRAY-membership** `FOO_ACTIONS.includes(action)` forwarding to a sub-engine
  (no literal `case` exists — the 2026-06-11 false-positive that blocked sessions). Comment-strip must be
  string/URL-aware or it flips to a dangerous false-NEGATIVE.

## Methods (the CS behind it — world-leading wiring tooling)
- **Dependency-graph + reachability analysis:** build the import/call graph, mark roots (dispatchers/entrypoints),
  BFS/DFS reachability → unreachable = orphan. (Classic dead-code analysis.)
- **Dead-code elimination / tree-shaking** (Rollup, Closure Compiler, esbuild): static ESM analysis of used
  exports — the same reachability principle, applied at bundle time.
- **AST tooling** (ts-morph / SWC / TS Compiler API): parse → find call sites + action enums + lazy imports →
  verify the dispatcher schema + action enum + import all match (a test must invoke THROUGH the dispatcher, R15).
- **Call-graph construction** + def-use chains for precise consumer detection (beats name-heuristic, which is
  advisory only — the synergy-audit's 65 unattributed-by-name engines).
- **Lazy-import + code-splitting** patterns: dispatchers lazy-import engines (the high-contention bundle pattern);
  wiring must follow the dynamic import to confirm the link.

## Integration (romeo)
- Consumes tango (discovery — what exists) + dormant-data (victor — no-consumer engines) → wires them into the
  right dispatcher. Next deep-research (roadmap §romeo): a ts-morph-based call-graph reachability pass to replace
  name-heuristic consumer classification; codify the 4-shape dispatch detector as the canonical audit.

Sources (canonical): Gamma et al. *Design Patterns* (Command pattern); compiler dead-code / reachability analysis
(dragon book); Rollup / Closure Compiler tree-shaking docs; ts-morph / TS Compiler API. Cross-referenced to PRISM
repo lessons ([[reference_stop_unwired_array_dispatch_fix_2026_06_11]], [[reference_audit_wired_via_engine_2026_06_10]]).
