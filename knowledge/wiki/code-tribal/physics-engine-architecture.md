---
name: physics-engine-architecture
category: code-tribal
domain: backend-dev
tags: [physics, engine-architecture, kienzle, taylor, sld, deflection, thermal, prism-development, ai-development]
last_updated: 2026-05-18
---

# Physics Engine Architecture — how Kienzle / Taylor / SLD compose

PRISM's manufacturing physics is a stack of engines, each owning one law. Composition produces the operator-facing answer ("cycle time X seconds, cost Y, tool life Z hours, surface finish W μm"). Understanding the stack lets you wire new physics correctly.

## The stack (mill physics, canonical)

```
operator request (material, feature, tool)
        │
        ▼
1. MaterialPropertyEngine      → kc11, kc12, density, hardness, abrasiveness
2. KienzleForceEngine          → cutting force F_c, F_n, F_f from (kc11, chip area, lead angle)
3. TaylorToolLifeEngine        → tool life T from (C, n, V, F, AP) per Taylor C-V^n=T
4. SLDEngine (chatter)         → stable cutting depth from spindle dynamics + tool geometry
5. DeflectionEngine            → tool tip deflection from F_c, tool stickout, EI
6. ThermalEngine               → cutting zone temperature from F_c, V, conductivity
7. WearEngine                  → wear progression from V, F, contact length
8. ChatterStabilityLobeEngine  → SLD lobes for spindle RPM optimization
9. OmegaEngine                 → composite Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L
10. SafetyValidator            → S(x) gate; BLOCKED if S < 0.70
```

Each engine has a clean input/output contract. The orchestrator (`SpeedFeedOrchestrator`, `SafetyCutValidator`, etc.) composes them.

## The "no inline constants" rail at every layer

Per [[physics-constants-discipline]]: every engine imports constants from `mcp-server/src/physics/constants.ts`. Inline literals in physics engines = hard-block.

```ts
// Wrong — would be blocked by duplication-hard-block
const kc11 = 1800;
const force = kc11 * chipArea;

// Right — type-checked import
import { CANONICAL_KIENZLE } from "../physics/constants.js";
const kc11 = CANONICAL_KIENZLE[material.isoGroup];
const force = kc11 * chipArea;
```

## Composition order matters

Reordering the stack produces wrong physics:

- Material BEFORE force: force depends on material's kc11; can't compute first
- Force BEFORE deflection: deflection depends on force magnitude
- Tool life BEFORE thermal: thermal accelerates wear; coupling matters
- SLD BEFORE chatter lobes: chatter lobes ARE SLD computed across RPM

The orchestrator enforces order. New engines added to the stack must declare their inputs (which prior engines they depend on).

## The "single law per engine" rule

Each physics engine owns ONE physical phenomenon. Don't combine:

- WRONG: `ForceAndWearEngine` that returns both force and wear
- RIGHT: `KienzleForceEngine` + `WearEngine` + `WearCouplingEngine` (if coupling matters)

Single-responsibility lets you swap models per material/operation. A new wear model (e.g. for PCD inserts) only touches the WearEngine.

## ISO-group abstraction

Materials are classified into 6 ISO groups (P/M/K/N/S/H). Physics engines key on the group, not the specific alloy:

```ts
const isoGroup = MaterialPropertyEngine.getIsoGroup(material.name);
const kc11 = CANONICAL_KIENZLE[isoGroup];
```

Alloy-specific tweaks live in `MATERIAL_PROPERTIES[alloy]` overrides, NOT in physics-engine logic.

## Per-engine output schema

Every physics engine returns a standardized envelope:

```ts
{
  result: { /* the primary computed value */ },
  inputs: { /* the inputs used, for audit */ },
  assumptions: { /* what was assumed (e.g. "perfectly rigid tool") */ },
  uncertainty: { /* point estimate + uncertainty band */ },
  safetyTier: "shop_floor" | "prototype" | "research",
  safetyScore: number,  // S(x)
  warnings: string[],
}
```

The orchestrator merges all engines' envelopes; the composite Ω is computed; the safety gate decides PASS/BLOCKED.

## The "auto-derive Ω from cog.metrics" pattern

`prism_omega:auto_score` reads the cog.metrics (R/C/P/L) from upstream telemetry and derives Ω. S comes from material via `computeSafetyScore`. Explicit overrides per-call supported when context demands.

Don't compute Ω inside individual physics engines. They emit their slice (force, life, wear); the orchestrator composes.

## Safety-physics agent invocation

The `safety-physics` agent reads a diff touching physics engines and validates:
- No inline constants
- Constants imports type-check
- Composition order intact
- S(x) score for the affected operations ≥ 0.70

Invoke BEFORE any edit to CRITICAL-classified files (Kienzle coefficients, Taylor constants, tolerance logic, force/thermal calcs). HARD BLOCK if S(x) < 0.70.

## The 15 scientific domains coverage

PRISM's creative-reasoning engine spans 15 domains (control theory, materials science, robotics, ML, precision, etc.) with 120+ formulas/algorithms (PID, LQR, Kalman, Johnson-Cook, NURBS, S-curve, CNN, K-means, Abbe error). The physics stack is the largest single domain but not the only one.

Cross-domain composition: e.g. an adaptive-feed engine combines KienzleForce (physics) + Bayesian inference (statistics) + Q-learning (RL) + conformal prediction (UQ).

## When to ADD a new physics engine

- A new phenomenon previously not modeled (e.g. mass-flow during lubricant change)
- A new material class with fundamentally different physics (e.g. CFRP requires new force model)
- A new operation regime (e.g. high-speed machining > 30k RPM has different thermal coupling)

When NOT to add:
- A small correction to existing model → extend the existing engine
- A material-specific tweak → goes in MATERIAL_PROPERTIES override
- An algorithmic variant of an existing law → algorithm class, not engine

## Calibration vs derivation

Physics constants are DERIVED from canonical sources (peer-reviewed papers, JM Die validation). They are NOT calibrated per-customer — that's a different mechanism (per-customer LoRA via [[lora-fine-tuning-patterns]]).

If a customer's actual cutting force differs from canonical by > 10%, the action is:
1. Investigate why (tool wear? coolant? machine geometry?)
2. NOT: tweak the kc11 inline

## Related

- [[physics-constants-discipline]] — never inline; canonical constants.ts
- [[safety-tier-discipline]] — Ω + S(x) thresholds
- [[engine-creation-playbook]] — 8-step recipe applies to physics engines too
- [[per-file-scrutiny-gate]] — physics-review-agent enforces the rails
- CLAUDE.md "SAFETY" + "PRISM creative reasoning"
- `mcp-server/src/physics/constants.ts` — single source of truth
