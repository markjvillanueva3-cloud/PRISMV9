# RESUME — "continue posts"

**Trigger phrase:** `continue posts` (any chat, any session)
**Roadmap:** `PPG-WIRE-MS0` — Post Processor Generator (sidecar bridge + dialect branches)
**Branch / worktree:** `work/cam-exhaust-ms0` on `H:/prism`
**Last touched:** 2026-05-01 (claude-b913f3b9)
**Last commits on roadmap:**
- `b60ec9260 [MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill: OkumaOSPMillMasterPostEngine + sidecar seal`
- `f382c3935 [MAIN] PPG-WIRE-MS0/U-PPGM15: camDispatcher seals sidecar + opt-in gate for master_post_*`
- `a3013ecf9 [MAIN] PPG-WIRE-MS0/U-PPGM14-rename: OkumaB250 sidecar test filename`
- `a1b6b9976 [MAIN] PPG-WIRE-MS0/U-PPGM14: OkumaB250 emits block_annotations[]`
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

### ✓ DONE — Sprint 3 sidecar bridge wiring (U-PPGM14, U-PPGM15)
- `a1b6b9976` U-PPGM14 — OkumaB250Lathe emits block_annotations[] (G97 ops only;
  G96 CSS bypasses gate via anonymous-block rule)
- `f382c3935` U-PPGM15 — camDispatcher seals sidecar + opt-in `verify_tier`
  through `sealMasterPostOutput` for `master_post_hurco_v11` and
  `master_post_okuma_b250`. Single-call dispatcher contract returns
  `{ engine_output, sidecar, verify? }`.
- 442/442 across 16 PPG-related test files. Zero regression.

### ✓ DONE — PPG-WIRE-MS5/U-PPGW-OkumaMill (this session)
Shipped 2026-05-01 (claude-b913f3b9). 4 files created, 4 modified:
- **CREATED** `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts` —
  consumes `controllerDialectEngine.getDialect("okuma_osp_p300|p500")`;
  `osp_family` config flag selects 3-axis (P300M / MB-V) vs 5-axis
  (P500M / MU-V); BlockAnnotation flow + Kienzle/Taylor physics gate
  identical to HurcoV11. Spindle ceilings 12000 P300 / 15000 P500.
  Super-NURBS (G05.1 Q1/Q0) bracket only on P500.
- **CREATED** `OkumaOSPMillMasterPostEngine.test.ts` — 45 unit cases
- **CREATED** `OkumaOSPMillMasterPostEngine.SidecarIntegration.test.ts` —
  12 round-trip cases (single + multi op, 4-tier sweep, S/F drift
  HARD_BLOCK, SHA tamper, P500 Super-NURBS path)
- **CREATED** `mcp-server/data/milestones/PPG-WIRE-MS5.json` envelope
- **MODIFIED** `camActionSchemas.ts` — new `master_post_okuma_osp` Zod schema
- **MODIFIED** `camDispatcher.ts` — new action enum + case handler;
  REPLACED OSP-P*M HARD-REJECT branch in `master_post_by_machine` with
  router-side family inference + sealMasterPostOutput
- **MODIFIED** `MasterPostByMachineExpanded.integration.test.ts` —
  flipped HARD-REJECT assertions to engine-route assertions
- 217/217 across 9 PPG-related suites + 156/156 across 4 master_post
  integration suites + 77/77 prism-post-inventory anti-regression.
  Total **450/450** verified. Build:fast clean. tsc --noEmit shows no
  errors at lines 5380-5530 (my edit window).

### Milestone status: PPG-WIRE-MS0 — 13/13 + Sprint 2 (20/20) + Sprint 3 (M14, M15)
### Milestone status: PPG-WIRE-MS5 — 1/2 (U-PPGW-OkumaMill done, tribal deferred)

---

## NEXT ACTIONS (continue here)

**Successor candidates — both genuinely open:**

**PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal** — Tribal knowledge for Okuma mill
Companion to U-PPGW-OkumaMill (just shipped). Currently the engine ships
with ~6 inline OSP-mill tips. JM Die archive has no Okuma-mill source
programs (Multus is mill-turn; CNC MILL is Haas) — start by running
`/pdf-learn` on Okuma OSP-P300M/P500M operator manuals when available,
or by extracting tips from `okuma-dialect-knowledge.ts` (lathe-side) that
also apply to mill (V/VC variables, parentheses comments, M-code rules).

**PPG-WIRE-MS6/U-PPGM16** — WEDM block_annotation schema extension
The Mitsubishi MV1200R wire EDM engine remains the ONLY engine still
bypassed by the seal because its physics envelope (wire feed rate, gap
voltage, on/off times) doesn't fit the S_rpm/F_mmpm shape. Extend
`postPhysicsSidecarSchema.ts` with an optional `wedm_emitted` shape and
populate it from MitsubishiMV1200RWireEDMMasterPostEngine.

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
