# RESUME — "continue posts"

**Trigger phrase:** `continue posts` (any chat, any session)
**Roadmap:** `PPG-WIRE-MS0` — Post Processor Generator (sidecar bridge + dialect branches)
**Branch / worktree:** `work/cam-exhaust-ms0` on `H:/prism`
**Last touched:** 2026-05-01 (claude-b3e2c3e6)
**Last commits on roadmap:**
- `0a27b63a6 [MAIN] PPG-WIRE-MS0/U-PPGM07+08: per-block S/F sidecar — schema 1.1.0`
- `f3c2c09a6 [MAIN] PPG-WIRE-MS0/U-PPGM-SPRINT1: sidecar bridge + patent rename`
- `0236ca452 [MAIN] PPG-WIRE-MS0/U-PPGW10: Hurco V11 branch in master_post_by_machine auto-router`

---

## STATUS

### ✓ DONE — Sprint 1 (U-PPGM-SPRINT1)
Shipped 2026-05-01 in commit `f3c2c09a6`. 19 files, 39,154 insertions:
- U-PPGM01 schema, U-PPGM02 builder, U-PPGM03 pure-JS loader (Rhino-portable),
  U-PPGM04 NoInlinePhysics gate + hook, U-PPGM05 round-trip integration test,
  U-PPGM06 migration guide.
- U-PPGM111 patent-sensitive rename SolidCAMiMachining → PrismPathConstantEngagement
  (8 identifier renames + JSDoc scrub + 13-case test).

### ✓ DONE — Sprint 2 partial (U-PPGM07+08)
Shipped 2026-05-01 in commit `0a27b63a6`. 3 files, 543 insertions:
- U-PPGM07 schema bump 1.0.0 → 1.1.0 (additive): `block_annotations[]` carrying
  per-block S/F + physics_basis + canonical-constant references.
- U-PPGM08 builder threading: `buildAndSeal({block_annotations})` defensive-clones,
  threads through canonicalize() seal, tamper-detected by SHA verify.
- 35 new tests (PostPhysicsSidecarBlockAnnotations.test.ts); 104/104 green
  across the 4 sidecar suites.

### ✗ DEFERRED — U-PPGW11/U-PPGW12 (dialect branches)
Investigation 2026-05-01 found these units as originally described **require
non-existent target engines**:
- `U-PPGW11` (Hurco UltiMotion): UltiMotion is an internal `use_ultimotion?`
  flag inside `HurcoV11MillMasterPostEngine`, not a separate post engine.
  Existing branch already covers `HURCO/VMX24/VM30I/V11`.
- `U-PPGW12` (Okuma OSP-P300/P500): No `OkumaOSP*MasterPostEngine` exists.
  `OkumaB250LatheMasterPostEngine` is hardwired to OSP-P300L (P300 implicit).
  Existing branch covers `OKUMA/LB250`.
Wiring branches to nonexistent engines = stub creation (hook-blocked) or
duplicate routing with no behavior change. Reopen these units only after a
target post engine is built (e.g., a separate Okuma OSP-P500 master post
when JM Die acquires that controller).

---

## NEXT ACTIONS (continue here)

### Sprint 2 remaining — U-PPGM09..U-PPGM13

**U-PPGM09** — pure-JS loader block lookup
File: `mcp-server/src/cps/loadPhysicsSidecar.ts`
Add: `getBlockAnnotation(sidecar, block_id) → BlockAnnotation | null` — pure-JS,
Rhino-portable, no Node-specific APIs. Tolerates `block_annotations: undefined`
(returns null). Add to existing test file `loadPhysicsSidecar.test.ts`.

**U-PPGM10** — NoInlinePhysics gate hardening
File: `mcp-server/src/hooks/noInlinePhysicsConstants.ts` +
      `mcp-server/src/engines/NoInlinePhysicsConstantsEngine.ts`
When a `.cps` post emits a numeric S/F literal in a block, require that the
sidecar's `block_annotations[]` carries an entry for that block_id with
matching emitted values. Mismatch fails closed. Test in
`NoInlinePhysicsConstantsEngine.test.ts`.

**U-PPGM11** — full round-trip integration test
File: NEW `mcp-server/src/__tests__/PostPhysicsSidecar.blockRoundTrip.integration.test.ts`
Builder → file → pure-JS loader → block lookup → tamper detection chain. ≥1
happy path + ≥3 failure modes + ≥2 adversarial.

**U-PPGM12** — migration doc update
File: `mcp-server/data/docs/ppg/MIGRATION-sidecar-bridge.md`
Append "1.1.0 — block_annotations[]" section. Document: schema bump rationale,
backward compat (1.0.0 sidecars still parse), absence vs empty-array semantics,
loader behavior on `undefined`.

**U-PPGM13** — HurcoV11 master post integration
File: `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts`
Have `generateProgram()` populate `block_annotations[]` for each emitted block
(N100, N110, ...) with the physics chain that produced its S/F (kienzle for
Fc-derived, taylor for life-derived, empirical_table for catalog lookups).
Smallest viable proof of round-trip.

**HARDEN BLOCKER** — `HurcoV11MillMasterPostEngine.ts:420` has a pre-existing
bug: `CANONICAL_KIENZLE.kc1_1[op.material_iso]` should be
`CANONICAL_KIENZLE[op.material_iso].kc1_1`. Causes 65/66 of the engine's own
unit tests to fail. **Fix this before U-PPGM13** or the integration test will
fail under unrelated breakage. Track as PPG-HARDEN/U-HARDEN01 if a separate
unit is preferred.

---

## PRE-EXISTING FOLLOWUPS (NOT in any current sprint scope)
Do NOT fix these as part of "continue posts" — separate cleanup units:

| Location | Issue | Status |
|---|---|---|
| `PhysicsSidecarBuilderEngine.ts:137,172` | Zod discriminated-union narrowing | Pre-existing TS error |
| `PrismPathConstantEngagementEngine.ts:334-336,482` | `MaterialEntry` shape — `kc1_1`/`mc`/`vc_base_roughing` missing on type | Inherited from clone source (now committed); track under PPG-HARDEN |
| `SolidCAMAIOrchestrationEngine.ts:260,296` | `selectStrategy`/`calculateOptimalLevel` don't exist on wrapped singletons | Pre-existing brokenness — engine is WIRE-EXEMPT (orphan) |
| `HurcoV11MillMasterPostEngine.ts:420` | `CANONICAL_KIENZLE.kc1_1[iso]` swapped | 65/66 tests fail; blocks U-PPGM13 |

---

## PRE-EXISTING FOLLOWUPS (NOT in any current sprint scope)
Do NOT fix these as part of "continue posts" — they're separate cleanup units:

| Location | Issue | Status |
|---|---|---|
| `PhysicsSidecarBuilderEngine.ts:137,172` | Zod discriminated-union narrowing | Pre-existing TS error |
| `PrismPathConstantEngagementEngine.ts:334-336,482` | `MaterialEntry` shape — `kc1_1`/`mc`/`vc_base_roughing` missing on type | Inherited verbatim from clone |
| `SolidCAMAIOrchestrationEngine.ts:254,290` | `selectStrategy`/`calculateOptimalLevel` don't exist on wrapped singletons | Pre-existing brokenness — engine is WIRE-EXEMPT (orphan with no dispatcher import) |

---

## VERIFICATION COMMANDS
```bash
cd H:/prism/mcp-server
"H:/Tools/nodejs/npx.cmd" vitest run \
  src/__tests__/PostPhysicsSidecar.integration.test.ts \
  src/__tests__/PostPhysicsSidecarSchema.test.ts \
  src/__tests__/PostPhysicsSidecarBlockAnnotations.test.ts \
  src/__tests__/PhysicsSidecarBuilderEngine.test.ts \
  src/__tests__/PrismPathConstantEngagementEngine.test.ts          # 117/117 expected
"H:/Tools/nodejs/npx.cmd" tsc --noEmit 2>&1 | \
  grep -E "PrismPath|sidecar|SolidCAMAI|NoInlinePhysics|PhysicsSidecar|loadPhysicsSidecar" # only pre-existing
```

---

## SCRUTINY GATE STATE
- claude-b0b6f0bd (2026-04-30): U-PPGM111 PASS recorded.
- claude-b3e2c3e6 (2026-05-01): U-PPGM-SPRINT1 + U-PPGM07+08 PASS recorded.
Each new chat starts fresh and will need its own scrutiny mark before Stop.

---

## HOW THE TRIGGER WORKS
- User types `continue posts` (or any chat says "continue posts")
- That chat's startup macro reads its per-agent handoff (`HANDOFF-claude-<id>-<topic>.md`)
- If no per-chat handoff matches: read THIS file (`state/shared/RESUME_POSTS.md`) and execute Sprint 1 commit first, then proceed to MS5.

**This file lives on the H: drive at the canonical PRISM shared-state location.** Do not move.
