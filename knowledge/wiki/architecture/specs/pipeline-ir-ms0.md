---
title: PIPELINE-IR-MS0 — Pipeline-as-data IR for PRISM's manufacturing pipelines
type: spec
created: 2026-05-21
tags: [pipeline, ir, orchestration, coding-system, cross-domain, lima]
status: planned
slot: lima
milestone: PIPELINE-IR-MS0
---

# PIPELINE-IR-MS0 — Pipeline-as-data IR

## Origin

Operator question (2026-05-21, lima): *"can we develop our own coding system to
make the entire system more efficient across multiple domains?"* The strategic
answer identified **5 gaps**; this milestone forges **only gap #1
(Pipeline-as-data IR)** — the other 4 are follow-on, contingent on this
milestone's schema (designing them before the IR format is real is guesswork).

## Problem

PRISM has ~9 first-class manufacturing pipelines (PrintToProgram, Turning,
MultiAxis, MillTurn, EDM, Grinding, Laser, Waterjet, QuoteToShip — see
`mcp-server/CLAUDE.md` §Pipelines) plus the canonical 18-stage print-to-part
pipeline (DOMAIN-PIPELINE-MS0) and the RGS per-unit toolchains. Every one is
hand-coded imperative TypeScript: a fixed sequence of dispatcher/engine calls.

Consequences:

- A pipeline cannot be inspected, diffed, or validated **as data**.
- Adding/reordering a stage requires editing TS + a rebuild.
- No uniform dry-run, no uniform DAG visualization, no uniform cost rollup.
- Cross-domain reuse is copy-paste, not composition.

## Solution — Pipeline IR

A pipeline becomes a JSON document conforming to a Zod schema. A stage names a
`dispatcher:action`; its inputs are typed `Ref`s into pipeline params or prior
stage outputs; the whole thing is a DAG that can be topologically sorted,
cycle-checked, dry-run, and executed by one generic executor.

### Schema (U-PIR01 delivers the Zod source of truth)

```
PipelineIR {
  schemaVersion: 1
  id: string                       // "turning-print-to-program"
  domain: "mill" | "lathe" | "wedm" | "cam" | "cad" | "cross"
  description: string
  params: Record<string, ParamSpec>
  stages: Stage[]
}
Stage {
  id: string                       // unique within pipeline
  action: string                   // "prism_calc:cutting_force"
  inputs: Record<string, Ref>
  outputs?: string[]               // named outputs for downstream Refs
  condition?: Ref                  // boolean — stage skipped if false
  onError?: "fail" | "skip" | "continue"   // default "fail"
}
Ref = { lit: unknown }                       // literal value
    | { param: string }                      // pipeline param
    | { stage: string, field?: string }      // prior stage output (dotted path)
ParamSpec {
  type: "string" | "number" | "boolean" | "object"
  required: boolean
  default?: unknown
}
```

Invariants the schema + converter enforce:

1. Every `stage.id` is unique within the pipeline.
2. Every `Ref{stage}` names an **earlier** stage (DAG — no forward/cyclic refs).
3. Every `Ref{param}` names a declared `params` key.
4. `action` is `"<dispatcher>:<action>"`-shaped; existence is checked at
   dry-run (U-PIR03), not at schema-parse (the schema has no dispatcher list).

## Units

| Unit | Deliverable | Acceptance |
|------|-------------|------------|
| **U-PIR01** | `src/schemas/pipelineIRSchema.ts` (Zod v4) + 1 worked pipeline IR (`data/pipelines/turning-print-to-program.pipeline.json`) + schema test | schema parses the worked example; ≥3 negative cases (dup stage id, dangling stage Ref, undeclared param Ref); `npm run build` passes |
| **U-PIR02** | `src/engines/PipelineIRConverterEngine.ts` (validate + normalize + topo-sort + cycle/dangling detection) + 3 more pipeline IR files | converter validates all 4 IR files; rejects cycle / dangling-ref / dup-id; build + tests pass |
| **U-PIR03** | `src/engines/PipelineIRExecutorEngine.ts` + `prism_orchestrate:execute_ir_pipeline` action + schema | executor resolves the DAG; `dryRun` validates every `dispatcher:action` exists; real-run executes ≥1 pipeline; build + tests pass |

U-PIR02 depends on U-PIR01; U-PIR03 depends on U-PIR02.

## R7 — overlap with existing orchestration (surfaced, not averaged)

`prism_orchestrate` already exposes `plan_create / plan_execute / workflow_create
/ workflow_execute`. Those orchestrate **generic agent tasks / workflows** at
runtime. Pipeline-IR is narrower and stricter: a **typed, diffable, validatable
data format for the manufacturing dispatcher-call DAGs specifically**, with
`Ref` resolution, `condition` gating, topological ordering, and a dry-run that
proves every action exists before any side effect.

The dedup grep (`PIPELINE-IR|PipelineIR|execute_ir_pipeline` across
`mcp-server/`) returned zero matches 2026-05-21 — no existing pipeline-IR. If
U-PIR03 finds `workflow_execute` can host IR execution, the executor becomes a
thin adapter on top of it — but the schema (U-PIR01) and converter (U-PIR02)
stand on their own value regardless of where execution lands.

## Follow-on gaps (captured, NOT roadmap units yet)

Contingent on U-PIR01's schema; specify only after the IR format is real:

- **#2 Unified Operation IR** across mill/lathe/wedm/cam —
  `Operation = {kinematics, contact-geometry, MRR-fn, force-fn, finish-fn}`.
- **#3 Manufacturing shortcodes** — `M####/O####/F####/K####/R####/H####`
  extending the existing `E####/D##/A##/T####` DSL.
- **#4 Action-name lint** as a build gate — catches the U-AIW01 spec-vs-actual
  drift class (engines wired under non-spec action names).
- **#5 Cross-dispatcher result-shape contract** — standardize force-returning
  actions on `AtomicValue<T> = {value, confidence, source, unit?}`.

## Non-goals

- No new query language — IR is plain JSON + Zod.
- No rewrite of existing action names (regression risk — see U-AIW01 close-out).
- No god-engine — the executor is generic and small; domain logic stays in the
  dispatchers it calls.

## Cross-references

- Strategic origin: this session's "coding system" exchange (lima,
  claude-fe1db0ba).
- Sibling pattern: DOMAIN-PIPELINE-MS0 (canonical 18-stage print-to-part
  pipeline).
- RGS toolchain rules: `scripts/lib/rgs-pipeline-rules.mjs`.
- Action-drift lesson: [[u-aiw01-close-out-spec-vs-actual]].
