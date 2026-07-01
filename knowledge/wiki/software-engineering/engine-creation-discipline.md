---
name: engine-creation-discipline
category: software-engineering
domain: backend-dev
tags: [engine, creation, duplication, ENGINE_DIGEST, singleton, stubs, physics-constants, prism-development, ai-development]
last_updated: 2026-05-19
---

# Engine Creation Discipline — what to do BEFORE writing a new engine

PRISM has 3284 engines. ~1900 of them duplicate or partially-overlap something else. The duplication tax compounds: every duplicate divides recall, splits maintenance, and confuses future wiring. CLAUDE.md is explicit — `duplicationGuardEngine.mustCheckBeforeCreating()` **THROWS** on duplicates, and the `duplication-hard-block` PreToolUse hook will hard-block your Write call. This wiki names the pre-creation discipline (which is mostly "search first"), the naming + file-structure conventions, the singleton vs class decision, the test contract that won't get hook-rejected, and the rails that make a new engine ship-worthy. It is the pre-wiring complement to [[dispatcher-action-design]].

## The first question — does it already exist?

Before writing one line of new engine code, you owe four checks. Skip none.

### Check 1: ENGINE_DIGEST.md

```bash
grep -i "<keyword>" mcp-server/data/docs/ENGINE_DIGEST.md
```

ENGINE_DIGEST is the 1-line-per-engine index. If any match has the role you're about to fill, **read that engine**. Extend it instead.

### Check 2: duplicationGuardEngine (the THROW-on-duplicate gate)

```typescript
import { duplicationGuardEngine } from "mcp-server/src/engines/DuplicationGuardEngine.js";

const check = duplicationGuardEngine.checkBeforeCreating({
  assetType: "engine",
  proposedName: "MyEngine",
  keywords: ["cutting", "force", "kienzle"],
  description: "Computes per-tooth cutting force via Kienzle model",
});

if (!check.shouldProceed) {
  // check.matches[0] is the existing engine to use instead
  throw new Error(`Duplicate of ${check.matches[0].name}`);
}
```

The methods `mustCheckBeforeCreating()` and `mustNotReExtract()` **throw** if a similar engine exists — you cannot bypass without explicit override. The `duplication-hard-block` PreToolUse hook fires on Write/Edit to engine files and runs the same check.

### Check 3: Master-index search-gate

```
/master-index <keyword>
```

The `master-index-search-gate` PreToolUse hook fires on creation intent (detected by keyword) and surfaces existing similar assets across the system-graph. If you ignore the result and proceed to a name that conflicts, the `duplication-hard-block` will trip.

### Check 4: Cross-session asset registry + already-extracted log

```
mcp-server/data/state/extraction-log.json
mcp-server/data/state/cross-session-asset-registry.json
```

Pre-extracted topic-clusters: Mastercam (45 engines), hyperMILL (25), Okuma (63), Fanuc (35), Haas (28), Titans (42). These are **already done** — `mustNotReExtract()` throws if you try to re-mine them.

### The /dedup skill

```
/dedup <proposed-engine-description>
```

One-shot wrapping of checks 1-4. Run it before EVERY new asset. It's not optional discipline — it's the canonical pre-creation step.

## Naming + file structure

### Naming convention

```
src/engines/<DomainPascalCase>Engine.ts
```

- Camel-PascalCase, ending in `Engine`.
- Domain-prefixed for clarity (`KienzleForceModelEngine`, `MachineUtilizationDashboardEngine`).
- Avoid generic names (`Helper`, `Utility`, `Common`) — they're impossible to dedup against.
- Test file: `src/__tests__/<EngineName>.test.ts` (or domain-scoped subdirectory).

### File location

| What | Where |
|---|---|
| Engine source | `mcp-server/src/engines/<Name>Engine.ts` |
| Singleton wrapper (if any) | `mcp-server/src/engines/<Name>EngineSingleton.ts` |
| Tests | `mcp-server/src/__tests__/<Name>.test.ts` |
| Frontend (if has a UI) | `mcp-server/web/components/<Name>.tsx` + merge plan |
| Wiki entry | `knowledge/wiki/architecture/engines/<name>.md` (auto-regenerated, don't hand-write) |

Engines created OUTSIDE `mcp-server/src/engines/` are invisible to the engine inventory script and the master-index — they appear as orphans. Honor the location.

## Class vs singleton — the decision

```typescript
// Stateless / per-call computation — a class
export class KienzleForceModelEngine {
  computeForce(input: KienzleInput): number { ... }
}
export const kienzleForceModelEngine = new KienzleForceModelEngine();

// Shared-state / cache / connection — a singleton via Singleton suffix
export class QdrantMemoryEngine { ... }
export class QdrantMemoryEngineSingleton {
  private static instance: QdrantMemoryEngine | null = null;
  static get(): QdrantMemoryEngine { ... }
}
```

Rule of thumb:

- **No cache + no I/O + pure computation** → plain class + module-level singleton instance (`export const engineX = new EngineX()`).
- **DB/network/file I/O + cache** → `<Name>Engine` + `<Name>EngineSingleton` pair. The Singleton is what consumers import; the inner Engine is the testable target.
- The singleton wrapper IS the wire-exempt rationale ([[dispatcher-action-design]] §WIRE-EXEMPT) — wire the singleton's method, mark the inner engine `WIRE-EXEMPT: wrapped by <Singleton>` if its API isn't directly exposed.

## The no-stub rail

The `comprehensive-build-enforce` PreToolUse hook **HARD BLOCKS** stub/placeholder engines. What it rejects:

- Methods returning literal `null` / `0` / `[]` / `{}` with no real computation
- Methods that throw `"Not implemented"`
- Test files with only `expect(...).toBeDefined()` assertions
- Function bodies under 5 LOC where the spec clearly demands more

The block is non-bypassable via `PRISM_HOOK_PROFILE`. If a method genuinely doesn't have an implementation yet, **don't ship the engine**; finish it first or work in a feature branch.

## The no-inline-constants rail

```typescript
// ❌ HARD BLOCKED — Kienzle constants inline
const kc11 = 1800;  // P-group steel
const mc = 0.28;
return kc11 * h_avg ** (1 - mc);

// ✓ Canonical import
import { CANONICAL_KIENZLE, KIENZLE_MC } from "../physics/constants.js";
return CANONICAL_KIENZLE.P * h_avg ** (1 - KIENZLE_MC.P);
```

Physics constants (Kienzle kc1.1, Taylor coefficients, material properties, thermal coefficients) live ONLY in `mcp-server/src/physics/constants.ts`. Inlining is HARD BLOCKED by the physics-constants-discipline hook and rejected in 3-of-3 scrutiny. CLAUDE.md is explicit: `NEVER inline Kienzle/Taylor/material constants`.

When you find a calculation requiring a constant not yet in `constants.ts`, **add it there first** (with a citation + ISO source), then import.

## Test contract — real values, not stubs

The `placeholder-test-rejection` hook blocks test files with these patterns:

```typescript
// ❌ REJECTED
expect(result).toBeDefined();
expect(result).not.toBeNull();
expect(typeof result).toBe("number");
expect(result.length).toBeGreaterThan(0);

// ✓ REAL VALUE / ALGEBRAIC INVARIANT
expect(result.force).toBeCloseTo(2840.3, 1);  // Kienzle reference value, ISO 8688
expect(result.scaled / input.feed).toBeCloseTo(result.specific, 3);  // invariant
```

Every test asserts either:
1. A **real reference value** (from a textbook, ISO standard, published paper, or independently-verified shop measurement), OR
2. An **algebraic invariant** (a relationship between inputs and outputs that holds by construction)

Stub assertions like `toBeDefined()` are rejected. See [[test-design-real-values]] for the full pattern + recipes.

## The WIRE TO ALL SOURCES wiring plan

Per CLAUDE.md §ENGINE WIRING (2026-04-28 directive): plan EVERY dispatcher this engine will wire to **before** writing the engine. Common pairings:

| Engine type | Wires to |
|---|---|
| Memory engine | `prism_memory` + `prism_guard` (error-ledger) |
| Physics engine | `prism_calc` + `prism_safety` (if safety-relevant) |
| CAM engine | `prism_cam` + vendor-specialized (`prism_mastercam`, etc.) |
| Reasoning engine | `prism_ai` + `prism_intelligence` |
| CAD engine | `prism_cad` + vendor-specialized |
| WEDM | `prism_cam` + `prism_wedm` (if exists) |

Write the wiring in the SAME commit as the engine. `stop_on_unwired_assets.mjs` HARD BLOCKS Stop on zero-dispatcher orphans. If genuine wire-exempt: name the rationale in a comment.

## Per-file scrutiny gate for new engines

Engines are CRITICAL-classified by default. CLAUDE.md §PER-FILE SCRUTINY GATE requires:

1. **Self-cross-check** — re-read against spec, walk every path + edge + assumption
2. **Two parallel reviewer agents** — `physics-review-agent` for physics engines, `code-analyzer` for generic; plus an independent `reviewer` as arm B
3. **Both verdicts PASS** before generating the next file in the build
4. **End-of-task 3-of-3 Stop gate** is additive (not a replacement)

A new engine that skips per-file scrutiny will be caught by the Stop gate, but compound errors propagate. Do it per-file.

## Already-extracted topic clusters — DO NOT RE-MINE

```
Mastercam(45 engines)  hyperMILL(25)  Okuma(63)  Fanuc(35)  Haas(28)  Titans of CNC(42)
```

Full log: `mcp-server/data/state/extraction-log.json`. `duplicationGuardEngine.mustNotReExtract()` throws when you try to re-mine. Reading from these vendors → extend the existing engines, don't create new ones.

## Anti-patterns

- **Skipping `duplicationGuardEngine.mustCheckBeforeCreating`** — hook will block; you'll burn a Write attempt.
- **Generic name (`Helper`, `Common`, `Util`)** — impossible to dedup; future audits flag as orphan.
- **Singleton when stateless** → over-engineering; just export a module-level const instance.
- **Plain class when there's a cache or DB connection** → multiple instances each cache independently; memory leak class.
- **Stub method returning `null`/`0`/`[]`** → `comprehensive-build-enforce` HARD BLOCK.
- **Inline Kienzle/Taylor/material constant** → physics-discipline hook HARD BLOCK.
- **Test with `toBeDefined()` only** → `placeholder-test-rejection` hook HARD BLOCK.
- **Wiring to one dispatcher** when multiple are natural consumers → fails WIRE TO ALL SOURCES rule.
- **Creating in a non-canonical directory** → orphan in inventory + master-index.
- **Re-mining a pre-extracted vendor** (Mastercam/hyperMILL/Okuma/Fanuc/Haas/Titans) → `mustNotReExtract` throws.
- **No wiki entry for the engine** → invisible to recall-injection on future prompts (the auto-regen wiki entry per-engine should land via post-commit hook; if it doesn't, file a bug).

## Checklist — before writing ANY new engine

- [ ] Ran `/dedup <description>` — no existing match?
- [ ] `duplicationGuardEngine.checkBeforeCreating({...}).shouldProceed === true`?
- [ ] Checked `ENGINE_DIGEST.md` by domain keyword?
- [ ] Topic is NOT in the already-extracted vendor cluster?
- [ ] Naming follows `<Domain>PascalCase + Engine.ts` convention?
- [ ] File location is `mcp-server/src/engines/`?
- [ ] Class vs Singleton choice matches the state/I/O pattern?
- [ ] All physics constants imported from `src/physics/constants.ts` (none inline)?
- [ ] Test file has REAL reference values OR algebraic invariants (no `toBeDefined()` stubs)?
- [ ] Per-file scrutiny dispatched (2 parallel reviewer agents)?
- [ ] Wiring plan: which dispatcher(s) consume this engine, written in the same commit?
- [ ] Commit subject is `[<SCOPE>]/U-<ID>: <terse>` per [[commit-message-conventions]]?

## Recipe — the canonical new-engine workflow

1. `/dedup <description>` → confirm no match
2. `grep -i "<keyword>" mcp-server/data/docs/ENGINE_DIGEST.md` → confirm no match
3. Write engine + test
4. Per-file scrutiny: 2 parallel reviewer agents on engine, 2 on test
5. Wire to dispatcher(s) — same commit
6. Wire to ALL natural dispatchers — per WIRE TO ALL SOURCES rule
7. Build + test (`npm run build && npx vitest run`)
8. Commit via pathspec with `[SCOPE]/U-<ID>: <terse>` subject
9. Verify auto-generated wiki entry landed
10. End-of-session 3-of-3 Stop gate

## Related

- [[dispatcher-action-design]] — the wiring layer (after the engine is built)
- [[test-design-real-values]] — the test contract spec
- [[physics-constants-discipline]] — canonical constants doctrine
- [[fail-loud-r12-patterns]] — what to do when a method genuinely fails (NOT stubs)
- [[per-file-scrutiny-gate]] — the 2-reviewer gate for CRITICAL files
- [[commit-message-conventions]] — subject format
- [[reference_predict_with_trend_2026_05_17]] — the "method addition vs new engine" decision (R8 dedup-preflight)
- [[reference_u_wire_energy_2026_05_17]] — canonical-constants migration as wiring prerequisite
- CLAUDE.md §MANDATORY SELF-AWARENESS — duplicationGuardEngine block
- CLAUDE.md §ENGINE WIRING — WIRE TO ALL SOURCES rule
- CLAUDE.md §SAFETY — no inline constants + no stub engines
- `mcp-server/data/docs/ENGINE_DIGEST.md` — the live engine index
- `mcp-server/data/state/extraction-log.json` — already-extracted clusters
