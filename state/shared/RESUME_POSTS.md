# RESUME — "continue posts"

**Trigger phrase:** `continue posts` (any chat, any session)
**Roadmap:** `PPG-WIRE-MS0` — Post Processor Generator (sidecar bridge + dialect branches)
**Branch / worktree:** `work/cam-exhaust-ms0` on `H:/prism`
**Last touched:** 2026-05-01 (claude-b3e2c3e6)
**Last commits on roadmap:**
- `f722bd13c [MAIN] PPG-WIRE-MS0/U-PPGW11+12: Hurco UltiMotion router-infer + Okuma OSP-P*L alias-expand`
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

### ✓ DONE — Sprint 2 complete (U-PPGM07..M13 + U-HARDEN01)
All 7 Sprint 2 units shipped 2026-05-01:
- `0a27b63a6` U-PPGM07+08 — schema 1.1.0 + builder threading (35 tests)
- `070db820d` U-PPGM09 — pure-JS getBlockAnnotation Rhino-portable lookup (24 tests)
- `569d52b73` U-PPGM10 — verifyBlockAnnotations gate (G-code vs sidecar, 39 tests)
- `87c18f4ec` U-PPGM11 — full round-trip integration test (10 tests)
- `a1af7a857` U-PPGM12 — MIGRATION doc 1.1.0 section (~180 lines)
- `76937747b` U-PPGM13 + U-HARDEN01 — HurcoV11 emits block_annotations[];
  fixes the kc1_1+mc inline bug as prerequisite (recovered 36 failing tests)
- 411/411 across 14 PPG-related test files. Zero regression.

### ✓ DONE — U-PPGW11/U-PPGW12 (router-side interpretation)
Shipped 2026-05-01 in commit `f722bd13c`. 2 files, +396/-4. User chose
router-side interpretation over building new master post engines.
- **U-PPGW11**: Hurco alias-expand (VMX/VM10/VM20/MAX31/ULTIMAX/ULTIMOTION)
  + UltiMotion router-infer (force `use_ultimotion=false` for ULTIMAX legacy
  control; "ULTIMOTION" identifier wins when both substrings present).
- **U-PPGW12**: Okuma OSP-P*L lathe alias-expand (LB200/LB300, OSP-P300L,
  OSP-P500L with `_`/`-` separators) + OSP-P300M/P500M mill controller
  hard-reject (precedes lathe match) with PPG-WIRE-MS5/U-PPGW-OkumaMill
  pointer for the proper future home.
- **Acknowledged risk**: OkumaB250 engine hardwired to LB250II-M tribal
  knowledge; LB200/LB300 may emit slightly off codes — accepted per the
  alias-expand interpretation.
- 35 new tests; 141/141 across 4 routing suites. Engine round-trip NOT
  exercised due to pre-existing HurcoV11 kc1_1 bug at line 420.

### Milestone status: PPG-WIRE-MS0 — 13/13 (was 11/11)
U-PPGW11/U-PPGW12 added to `shipped_followup[]` in milestone JSON.

---

## NEXT ACTIONS (continue here)

### PPG-WIRE-MS0 is COMPLETE. Pick a successor:

**PPG-WIRE-MS5/U-PPGW-OkumaMill** — Build OkumaOSPMillMasterPostEngine
File: NEW `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts`
Currently the master_post_by_machine auto-router HARD-rejects OSP-P300M /
OSP-P500M (mill controllers) because no Okuma-mill master post exists.
ControllerDialectEngine has full dialect data (canned cycles, probing,
TCPC, HSC mode, NURBS) — consume that data to emit Okuma-mill G-code.
Same shape as OkumaB250LatheMasterPostEngine but for OSP-PxxxM.
Wire to camDispatcher (replace the hard-reject branch with a route).
Carries block_annotations[] from day one (schema 1.1.0).

**PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal** — Tribal knowledge for Okuma mill
Companion to the engine above. Mine JM Die's program archive at
`H:/PRISM/JM DIE/CNC MILL/` for Okuma-mill program files, run /pdf-learn
on any Okuma operator manuals, populate the engine's tribal knowledge
section.

**Other open PPG follow-ups (lower priority):**
- Wire HurcoV11's block_annotations through camDispatcher's
  master_post_hurco_v11 action so callers can emit + verify in one round-trip
- Repeat the U-PPGM13 wiring for OkumaB250Lathe + MitsubishiMV1200R
  (currently they have NO per-block telemetry; sidecar would HARD_BLOCK
  shop_floor for any of their emitted S/F lines)

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
