---
name: physics-constants-discipline
category: software-engineering
domain: backend-dev
tags: [physics, constants, kienzle, taylor, safety, canonical-source, prism-development, ai-development]
last_updated: 2026-05-18
---

# Physics Constants Discipline — never inline, always import

PRISM ships safety-critical physics. Cutting force, tool life, deflection, thermal — every formula depends on per-material constants. **Inlined physics constants are the highest-leverage safety failure mode** because they get copied with a typo, become stale relative to canonical values, and survive every code review (they look like data, not bugs).

## The single canonical source

`mcp-server/src/physics/constants.ts` is the ONLY place physics constants live. Every engine that consumes them imports:

```ts
import {
  CANONICAL_KIENZLE,
  TAYLOR_COEFFICIENTS,
  MATERIAL_PROPERTIES,
} from "../physics/constants.js";
```

If you find yourself typing `const kc11 = 1800` anywhere outside this file, STOP. The duplication-hard-block hook auto-detects this pattern and rejects.

## Canonical values (PRISM 2026)

ISO group kc1.1 (the Kienzle force coefficient at 1mm × 1mm chip, base units):

- P (steel): 1800
- M (stainless): 2100
- K (cast iron): 1100
- N (non-ferrous): 700
- S (high-temp / superalloy): 2800
- H (hardened steel): 3200

These are referenced from peer-reviewed sources + JM Die shop-floor validation. Do NOT round, paraphrase, or "tweak" them in a derived calculation.

## The pre-commit hook rail

Three layers enforce non-inlining:

1. **`duplication-hard-block.mjs` (PreToolUse:Write/Edit)** — pattern-matches `kc11`, `kienzle`, `taylor`, `c_taylor`, etc. inside source files; blocks the write.
2. **`comprehensive-build-enforce.mjs`** — runs grep over the diff for the same patterns; rejects placeholder + inline-constant violations.
3. **`physics-review-agent` (subagent)** — invoked by the per-file scrutiny gate; reads source files end-to-end and flags any numeric literal that looks like a physics constant.

A new engine that imports correctly passes all three silently. An engine with inlined constants gets blocked at layer 1.

## When you legitimately need a number

Three legitimate exceptions:

1. **Numerical method internals** — Newton iteration tolerance (`1e-9`), Runge-Kutta step (`0.01`). These are math, not physics. Inline OK.
2. **Algorithm parameters with no physical meaning** — neural network learning rate, conformal alpha, k-fold count. Inline OK.
3. **Unit conversions** — `mm_to_inch = 25.4`. Inline borderline; prefer a `UNITS` constants file.

If the number IS a physical constant (material property, force coefficient, thermal property), it goes in `constants.ts` — no exceptions.

## The "tweaked value" anti-pattern

Tempting: "the Kienzle 1800 is too high for THIS aluminum alloy; let me use 1750 inline". WRONG.

Right path:
1. The aluminum alloy has its OWN kc11 in the material database (`MATERIAL_PROPERTIES[alloy].kc11`).
2. If the alloy isn't in the DB, ADD it to `constants.ts` with a citation. The DB grows; inline tweaks rot.
3. If the tweak is wrong (it usually is — caused by misreading documentation), having the canonical value upstream prevents the propagation.

## Imports must be type-checked

```ts
// Wrong: any-cast loses checking
const k = (CANONICAL_KIENZLE as any).P;

// Right: typed access
import { CANONICAL_KIENZLE, type ISOGroup } from "../physics/constants.js";
const k: number = CANONICAL_KIENZLE.P;  // or CANONICAL_KIENZLE[isoGroup as ISOGroup]
```

Type-checked access catches when a constant's structure changes (e.g., a new field added to `CANONICAL_KIENZLE.P` returning an object instead of a number).

## The safety-physics agent invocation rule

For ANY edit to a file classified as CRITICAL (CLAUDE.md lists these — Kienzle coefficients, Taylor constants, tolerance logic, force/thermal calcs, safety validators), invoke the `safety-physics` agent BEFORE the edit. Returns PASS/FAIL with S(x) score. HARD BLOCK if S(x) < 0.70.

The agent reads the diff, validates against canonical sources, computes the S(x) for the affected operations, and decides PASS/FAIL. Don't skip this for "small" edits — small edits to physics constants are how shop-floor disasters happen.

## What goes IN constants.ts

- ISO-group kc11 / kc12 coefficients
- Taylor tool-life C and n exponents per material+tool combo
- Young's modulus, Poisson's ratio, density per material
- Thermal conductivity, specific heat capacity
- Wear coefficients (Archard, etc.)
- Stress thresholds (yield, UTS) per material
- ABRASIVENESS, WORK_HARDENING_INDEX per material

What does NOT go in constants.ts (lives elsewhere):
- Tool dimensions → tool catalog (CSV/DB)
- Machine envelopes → ShopConfigurationEngine
- Customer-specific parameters → per-customer LoRA / catalog
- Algorithm hyperparameters → algorithm config files

## Verification command

Before committing any physics-touching edit:

```bash
grep -r "kc11\|kienzle\|taylor\|c_taylor" mcp-server/src/engines/ | grep -v "physics/constants"
```

Zero hits = clean. Any hit = a candidate for refactor to import.

## Related

- [[safety-tier-discipline]] — the S(x) gate
- [[regression-prevention-doctrine]] — inline-constant regressions in the ledger
- [[engine-creation-playbook]] — Step 2 forbids inline constants
- [[per-file-scrutiny-gate]] — physics-review-agent
- CLAUDE.md "SAFETY (NEVER inline Kienzle/Taylor/material constants)"
- `mcp-server/src/physics/constants.ts` — the canonical source
