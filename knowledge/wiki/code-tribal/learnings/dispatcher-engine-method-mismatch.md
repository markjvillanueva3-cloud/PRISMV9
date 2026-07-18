---
title: Dispatcher calls a method the engine doesn't define (tsc-blind via getEngine():any)
type: lesson
created: 2026-06-22
by: claude-ab0dca09 (slot:bravo)
tags: [dispatcher, integrity, runtime-bug, route-verify, bug-hunting, detector]
---

# Dispatcher->engine method-existence mismatch

## The bug class
A dispatcher handler resolves an engine then calls a method that does **not exist** on it:
```ts
const eng = await getEngine("probingProg");   // -> ProbingProgramEngine (only has generate())
return slimResponse(eng.generateWCSSetup(...)); // THROWS "eng.generateWCSSetup is not a function" at RUNTIME
```
`getEngine()` returns `any` (and lazy-imported engines are commonly typed `any`), so **tsc never catches it**. The action is reachable (in the z.enum + has a `case`) and the engine import resolves fine — it just 500s the moment it's called.

## Why the two existing detectors miss it
The dispatcher-integrity detector family has three members; this was the missing one:
- `audit-dispatcher-ghost-actions.mjs` (romeo) — action in enum with **no handler**.
- `dispatcher-import-liveness.mjs` (tango) — imported **name** is not a real export.
- `audit-dispatcher-engine-methods.mjs` (bravo, 2026-06-22) — handler calls a **method** the resolved engine doesn't define. **THIS one.**

The first run found **61** across 10 dispatchers (camDispatcher 20, cncOps 8, resourceExtraction 8, edm 7, cad 5, quality 4, pp 3, resourceHarvester 3, mill 2, feasibility 1).

## Detector design lessons
- **False positives are the dangerous direction** — the tool drives bug-fix/milestone decisions. Classify LIVE / MISSING / INDETERMINATE: a MISSING requires engine readable + class-shaped + method absent + the full `extends` chain resolvable-and-absent. Unreadable target, unresolved base, or non-class singleton -> INDETERMINATE, never a false MISSING.
- **Keyword-named methods bite the parser.** A naive "skip JS keywords" filter that excludes `export`/`type`/`enum` wrongly drops legit methods literally named `export()` (caught a false MISSING on `MetricsEngine.export`). The exclusion set must contain ONLY pure *statement* keywords ({if,for,while,switch,catch,return,throw,do}) that appear as `KW (` — value/declaration keywords are valid method names. Accidentally capturing a statement keyword as a method only enlarges the engine method set (a harmless superset = safe-direction false-negative).
- **Test through the dispatcher, not the engine.** A direct-engine test passes even with the bug, because the engine works in isolation — the defect is purely in routing. The regression test must round-trip through the registered handler (MockMCPServer capturing `server.tool(...)`).

## Fixing is usually domain-semantic, NOT a blind rename
Most findings are either (a) capability-exists-under-a-different-name, or (b) genuinely-missing capability. Re-pointing worked for the CK-MS11 probe cluster only because `probeRoutineGeneratorEngine` already had all 4 methods. For ambiguous cases (e.g. `circular_interpolation_calculate` -> bore/boss/arcFeedComp?) guessing a method in **safety-critical CNC G-code** is worse than the visible throw (a wrong method silently emits wrong G-code). Route those to the owning domain slot via the ledger; never blind-rename.

## Artifacts
- Detector: `scripts/audit-dispatcher-engine-methods.mjs` (+ `.test.mjs`, 6/6). Run: `node scripts/audit-dispatcher-engine-methods.mjs [--json|--indeterminate]`.
- Ledger: `state/shared/DISPATCHER-ENGINE-METHOD-AUDIT.{json,md}`.
- First fix: `49c76b551b` (CK-MS11 probe_*_gen). Detector: `cc03516d93`.
- Memory: [[reference_dispatcher_engine_method_audit_2026_06_22]].
