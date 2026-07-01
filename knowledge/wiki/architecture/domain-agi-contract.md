---
title: Domain AGI Contract — unified orchestrate(intent) Zod surface
tags: [architecture, schema, agi, router, multi-domain]
milestone: INFRA-AGI-ROUTER-MS2
unit: P0-U01
shipped: 2026-05-20
commit: 76073333d3
---

# Domain AGI Contract

Single Zod contract — `DomainAGIIntent` + `DomainAGIResult` at schema version
**1.0.0** — that the `ProcessIntelligenceRouterEngine` dispatches across the
three domain AGIs:

- `MillingAGIMasterEngine`
- `LatheAGIKnowledgeUnificationEngine`
- `WireEDMAGIOrchestrator`

The contract makes a unified `orchestrate(intent: DomainAGIIntent): Promise<DomainAGIResult>`
surface possible. U02 / U03 / U04 ship the per-domain adapter wiring;
U05 builds the router itself + deprecates the prior opaque-body surface.

## Files

| Path | Role |
|------|------|
| `mcp-server/src/schemas/domainAGIContract.ts` | Schema + helpers (single source of truth) |
| `mcp-server/src/__tests__/domainAGIContract.test.ts` | 40-case validation suite |

## Intent shape

```ts
DomainAGIIntent = {
  schemaVersion: "1.0.0",       // z.literal — version-pinned
  domain: "mill" | "lathe" | "wedm",
  action: <one of the per-domain action enums>,
  blueprint?: { path?, sha256?, notes? },   // refine: at-least-one of path/sha256
  features: FeatureRef[],                   // default []
  material: string,                         // min(1) — non-empty
  machine?: { id, rigidity_tier?, controller? },
  constraints: { cycle_time_max_min?, cost_max_usd?, safety_floor?, ... },
  consensusRequired: boolean,               // default false
}
```

### Cross-field invariant (intent)

A `superRefine` enforces that `action` belongs to the declared `domain`.
The base `z.union([MillAction, LatheAction, WedmAction])` accepts any of the 25
action verbs; the superRefine narrows to the domain-specific subset.

**Refactor-safe guard:** `if (!validator) return;` placed before
`validator.safeParse(intent.action)` so a future change of the base schema to
`.passthrough()` never throws `Cannot read properties of undefined`.

### Action enums (10/9/6)

| Domain | Actions |
|--------|---------|
| `mill` | roughing, finishing, drilling, boring, tapping, thread_milling, facing, contouring, pocketing, engraving |
| `lathe` | turning, threading, parting, facing, grooving, boring, drilling, knurling, chamfering |
| `wedm` | rough_cut, skim_pass, taper_cut, start_hole, no_core_cut, corner_strategy |

Three verbs (`drilling`, `boring`, `facing`) belong to BOTH mill and lathe;
`domainForAction()` returns `null` for them — callers must use the explicit
`domain` field, never infer.

## Result shape

```ts
DomainAGIResult = {
  schemaVersion: "1.0.0",
  success: boolean,
  decisions: Decision[],         // {kind, value, confidence∈[0,1], source, rationale?, alternatives?, consensus_audit_id?}
  gcode?: string,
  simResult?: { ... },
  confidence: number,            // ∈[0,1], pipeline-level rollup
  outcomes: OutcomeEvent[],      // canonical OutcomeEventSchema re-use (anti-drift)
  error?: { code, message, stage? },
  warnings: string[],            // default []
}
```

### Cross-field invariant (result)

A `superRefine` enforces that `success === false` implies `error` is populated.
The inverse (`success === true` requires `error` absent) is NOT enforced — an
over-defensive caller MAY include `error: undefined`. The inverse test
explicitly pins the absent-case to catch a future maintainer who flips the
predicate direction.

## Helpers (exported)

```ts
domainForAction(action: string): DomainKindT | null
// "roughing" → "mill"
// "turning" → "lathe"
// "drilling" → null  (ambiguous mill↔lathe)
// "unknown" → null

actionsForDomain(domain: DomainKindT): readonly string[]
// "mill" → readonly tuple of 10 action verbs
// "lathe" → readonly tuple of 9
// "wedm" → readonly tuple of 6
```

## OutcomeEvent re-use (anti-drift)

`DomainAGIResult.outcomes` is `z.array(OutcomeEventSchema)` — direct import of
the canonical schema at `mcp-server/src/schemas/outcomeEventSchema.ts`. Avoids
re-declaring the OutcomeEvent shape (which evolved from 1.0.0 → 1.1.0 with
`cross_process_decision` + `consensus_audit_id`). Forward-compat: the union
literal `z.union([z.literal("1.0.0"), z.literal("1.1.0")])` accepts both.

## CrossProcessAIBridge co-existence

The prior `CrossProcessAIBridge.AIOrchestrateRequest` schema (`mcp-server/src/engines/CrossProcessAIBridge.ts`)
carries opaque per-domain bodies:

```ts
AIOrchestrateRequest = {
  intent: string,             // free-form
  mill_request?:  Record<string, unknown>,
  lathe_request?: Record<string, unknown>,
  wedm_request?:  Record<string, unknown>,
}
```

`DomainAGIContract` STRUCTURES that opaque body — same intent surface, now
typed. The two contracts CO-EXIST in U01; U05 will explicitly deprecate or
wrap CrossProcessAIBridge. JSDoc on `DomainAGIIntentSchema` includes
`@see CrossProcessAIBridge` so consumers know the relationship.

## Test coverage (40/40 PASS)

| Group | Cases |
|-------|-------|
| Valid mill intents | 5 |
| Valid lathe intents | 5 |
| Valid wedm intents | 5 |
| Invalid rejection paths | 5 (version drift, cross-domain action, bad domain, missing material, empty material) |
| `domainForAction` helper | 5 |
| `actionsForDomain` helper | 3 |
| `DomainAGIResult` (incl. inverse success=true) | 7 |
| Schema metadata invariants | 5 |

**Silent-pass pin** — the "rejects action not belonging to the named domain" test
asserts `issues.find(i => i.path.join('.')==='action' && i.code==='custom')`.
Deleting the superRefine flips the test red (the base z.union's noisy error
noise would otherwise satisfy a weaker regex).

**Inverse invariant** — the "accepts success=true with NO error field" test
pins the asymmetric `success=false ⇒ error required` invariant by exercising
its inverse.

## Scrutiny

**Per-file gate (4 reviewers in parallel):**
- Schema arm A (code-analyzer): PASS
- Schema arm B (reviewer): FAIL → 2 P0 fixed (consensusRequired.default + validator guard) + 3 P1 fixed
- Test arm A (test-review-agent): PASS
- Test arm B (reviewer): PASS + 2 P1 fixed (silent-pass pin + inverse test)

**3-of-3 Stop gate:** PASS × 3 (arm A reviewer, arm B reviewer independent,
arm C code-analyzer). Ledger keyed `claude-0ea589c9`.

## Deferred P1-P2s

| ID | Concern | Defer to |
|----|---------|----------|
| P1 | `z.union` noisy error UX on unknown action | U02 adapter cleanup |
| P1 | `MachineRefSchema.controller` free-form (should be enum) | U02-U04 + registry |
| P1 | `CrossProcessAIBridge` deprecation | U05 (router unit) |
| P1 | `DecisionSchema.dependency` discriminator (serial/parallel) | U05 (router-internal) |
| P2 | DoS hardening — `.max()` caps on free-text + arrays | U02-U04 (before adapter ship) |
| P2 | `error.code` free-form (should be enum) | `U-AGI-ROUTER-ERROR-CODE-ENUM` MS3 |
| P2 | Action-enum dispatcher anti-drift test | U02-U04 adapter ship |

## Pointers

- Commit: `76073333d3`
- Milestone envelope: `mcp-server/data/milestones/INFRA-AGI-ROUTER-MS2.json`
- Handoff: `state/shared/handoffs/HANDOFF-claude-0ea589c9-charlie-infra-agi-router-ms2.md`
- Memory: `knowledge/memories/reference/reference_infra_agi_router_ms2_p0_u01_2026_05_20.md`
- Inbox: `state/shared/RECENT-SHIPMENTS-2026-05-20.md` (awaiting golf-slot CLAUDE.md promotion)
- Sibling: [[outcome-event-schema-1-1-0]] (anti-drift re-use target)
- Sibling: [[crossprocessaibridge]] (the surface this supersedes)
