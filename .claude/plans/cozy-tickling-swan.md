# PPG-WIRE-MS5/U-PPGW-OkumaMill — OkumaOSPMillMasterPostEngine

## Context

Closing the last open lane from PPG-WIRE-MS0 follow-ups. Today the dispatcher action
`master_post_by_machine` HARD-REJECTs any `OSP-P300M`/`OSP-P500M` machine_model with
the message *"no Okuma mill master post engine exists yet. Track under
PPG-WIRE-MS5/U-PPGW-OkumaMill"* (`mcp-server/src/tools/dispatchers/camDispatcher.ts:5444-5454`).
The reject is correct safety behaviour but blocks every Okuma-mill flow downstream.

The remaining post engines (`HurcoV11MillMasterPostEngine`, `OkumaB250LatheMasterPostEngine`,
`MitsubishiMV1200RWireEDMMasterPostEngine`) all emit `block_annotations` and route through
`sealMasterPostOutput` for sidecar+verify. We need an Okuma-OSP-mill engine in the same
shape so OSP-P300M/P500M flows light up end-to-end (post → sidecar → tier gate).

OSP-P300/P500 mill dialect is already authored in `ControllerDialectEngine.ts:711-789`
(G15 H1 work offsets, G81/G83/G84/G85 canned cycles, G65 P88xx probing, G05.1 Q1 nano
smoothing on P500, IJK incremental arcs, M98/M99 subprograms). The engine consumes
that dialect rather than re-encoding mill syntax.

Outcome: OSP-P300M/P500M `master_post_by_machine` calls return `{ engine_output, sidecar, verify? }`
identical in shape to Hurco/B250; the HARD-REJECT branch is replaced by the engine
import; new dedicated action `master_post_okuma_osp` exposes the engine directly.

## Approach

**One engine, two OSP families, dialect-driven syntax, sidecar-ready from line 1.**

- Modeled directly on `HurcoV11MillMasterPostEngine` (mill controller, 581 lines, the
  canonical mill post template) — same `BlockAnnotation[]` flow established by
  `MS0/U-PPGM13` and the `vc_mpm`/`fpt_mm`/`ap_mm`/`ae_mm`/`S_rpm`/`F_mmpm` emitted
  shape that `verifyBlockAnnotations` expects.
- Pulls program-start/safe-start/work-offset/tool-change/canned-cycle/probing/sub-program
  syntax from `ControllerDialectEngine.dialects[okuma_osp_p300|okuma_osp_p500]` rather
  than hardcoding mill G-codes — keeps a single source of truth and inherits the
  P500-specific Super-NURBS / G05.1 Q1 / 5-axis-TCPC features for free.
- Tribal knowledge: small inline pool (~6 tips: G15 H1 vs G54, G05.1 Q1 nano-smooth on
  P500 only, G65 P8810 probing macro IDs, M98 P{n}{nnnn} sub-call format, V/VC variable
  scoping, no per-tooth feed in G94). JM Die archive has no Okuma-mill programs (Multus
  is mill-turn; mill side is Haas) — deeper tribal mining is intentionally deferred to
  the separate `PPG-WIRE-MS5/U-PPGW-OkumaMill-Tribal` sub-unit.
- Same physics gate as Hurco: Vc, fz, Kienzle Fc, spindle-RPM ceiling — drawn from
  `CANONICAL_KIENZLE` and `CANONICAL_TAYLOR`, no inlining.

## Files

### Created

- `mcp-server/src/engines/OkumaOSPMillMasterPostEngine.ts` (~600 lines)
  - Class `OkumaOSPMillMasterPostEngine`
  - Singleton export `okumaOSPMillMasterPostEngine`
  - Config: `OkumaOSPMillPostConfig { program_number, osp_family: "P300" | "P500", program_comment?, use_super_nurbs?, coolant_mode?, work_offset_index?, units?, safe_z_mm?, tool_change_position? }`
  - Op shape: `MillOperation` mirrors Hurco's (reuse the type structurally — same fields)
  - Output: `OkumaOSPMillPostOutput { gcode, program_number, total_lines, estimated_cycle_min, tools_used, warnings, physics_checks, tribal_tips_applied, block_annotations }`
  - `generateProgram(operations, config?)`:
    - Fetches dialect via `controllerDialectEngine.getDialect(cfg.osp_family === "P500" ? "okuma_osp_p500" : "okuma_osp_p300")`
    - Header: `O{N} ({comment})`, `(MACHINE: OKUMA OSP-{family}M)`, `(GENERATED: ISO timestamp)`
    - Safe start: dialect.safe_start (`G90 G21 G17 G40 G80`)
    - Work offset: dialect.work_offsets.format with H index from config
    - For each op: tool-change (`T{n}` then `M6` per dialect.tool_change_sequence), `N{100+i*10} S{rpm} M3 F{feed} (...)` spindle-start (matches Hurco label format so verifyBlockAnnotations works unchanged), coolant (M8/M7/M9 per dialect), toolpath (G0/G1/G2/G3 with IJK incremental arcs), retract
    - Per-op `BlockAnnotation` with vc_mpm/fpt_mm/ap_mm/ae_mm/S_rpm/F_mmpm + `physics_basis: "kienzle"` + `source_constants: ["CANONICAL_KIENZLE.{iso}", "CANONICAL_TAYLOR.{iso}"]`
    - Footer: `M5`, `M9`, `G91 G28 Z0`, `G28 X0 Y0`, `M30`
  - Physics checks identical to Hurco (Vc, chip load, Kienzle Fc, spindle ceiling — ceiling defaults to 12000 RPM for OSP-P300/15000 for OSP-P500 per Multus B250 + MB-V series spec; configurable)
  - `getStats()` reports `machine: "Okuma OSP-{family}M"`, `controller: "OSP-{family}M"`, plus tip count + features

- `mcp-server/src/__tests__/OkumaOSPMillMasterPostEngine.test.ts` (~30 unit cases)
  - Header + safe-start emission
  - Per-op `N{label} S{rpm} M3 F{feed}` matches block_annotation block_id
  - P300 vs P500 family: G05.1 Q1 only when `use_super_nurbs && osp_family === "P500"`
  - Work offset: `G15 H1` default, `G15 H{n}` when `work_offset_index` set
  - Tool change: `T{n}` then `M6` (two lines, not combined like Hurco)
  - Multi-op label progression N100, N110, N120
  - Physics gate: Vc/chip-load/Fc/RPM ceiling pass and fail cases per ISO group
  - `block_annotations` length matches `operations.length`
  - `vc_mpm`/`fpt_mm` math matches `π·D·N/1000` and `F/(N·z)`
  - `source_constants` references CANONICAL_KIENZLE.{iso} and CANONICAL_TAYLOR.{iso}
  - Tribal tips applied only when iso/op-type matches

- `mcp-server/src/__tests__/OkumaOSPMillMasterPostEngine.SidecarIntegration.test.ts` (~10 round-trip cases)
  - End-to-end: operations → engine → `sealMasterPostOutput` → sidecar v1.1.0 sealed → `verifyBlockAnnotations` PASS
  - All 4 tier verdicts (sim/proven_out/production/shop_floor) on clean input
  - shop_floor HARD_BLOCK on S drift; proven_out WARN on same drift
  - SHA tamper of returned sidecar invalidates `PhysicsSidecarBuilderEngine.verify()`
  - P500 with super-NURBS path
  - Empty operations → empty annotations passed through

### Modified

- `mcp-server/src/tools/dispatchers/camDispatcher.ts`
  - **Add new action** `master_post_okuma_osp`:
    - Schema enum + Zod params (same shape as `master_post_hurco_v11` + `verify_tier?` opt-in)
    - Lazy import of `okumaOSPMillMasterPostEngine`
    - Wires through `sealMasterPostOutput` (consistent with U-PPGM15 pattern for Hurco/B250)
  - **Replace HARD-REJECT branch in `master_post_by_machine` (camDispatcher.ts:5449-5454)**:
    - The OSP-P300M/P500M check no longer returns `{success: false, error: "..."}`. Instead it imports `okumaOSPMillMasterPostEngine`, runs it through `sealMasterPostOutput`, and returns the same `{ engine_output, sidecar, verify? }` shape that the Hurco/B250 branches now return.
    - Router infers `osp_family` from `model` (`"OSP-P300"` → "P300", `"OSP-P500"` → "P500"; default "P300" if ambiguous).
    - Update the unsupported-machine error message: drop the "OSP-P300M/P500M are explicitly NOT supported" sentence; mention they're now wired.
  - **Update `master_post_by_machine` action description** + dispatcher tool description so the supported-mills list now includes OSP-P300M/P500M.

- `mcp-server/src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts`
  - Replace existing OSP-P*M HARD-REJECT assertions with engine-routes-through-seal assertions (mirror Hurco/B250 mirror-route patterns already in this file).
  - Verify both `OSP-P300M` and `OSP-P500M` pass through the new branch and the family is inferred correctly.

- `mcp-server/data/milestones/PPG-WIRE-MS5.json` (or create envelope if absent)
  - Append `U-PPGW-OkumaMill` shipped entry; bump `completed_units`.

- `state/shared/RESUME_POSTS.md`
  - Update commits list and NEXT ACTIONS to reflect U-PPGW-OkumaMill done; remaining open lanes: U-PPGM16 (WEDM schema) + U-PPGW-OkumaMill-Tribal (deferred).

### Reused (no edits, just imports)

- `mcp-server/src/physics/constants.ts` — `CANONICAL_KIENZLE`, `CANONICAL_TAYLOR`, `ISOGroup`
- `mcp-server/src/schemas/postPhysicsSidecarSchema.ts` — `BlockAnnotation` type
- `mcp-server/src/engines/ControllerDialectEngine.ts` — `controllerDialectEngine.getDialect("okuma_osp_p300" | "okuma_osp_p500")` + `ControllerDialect` type
- `mcp-server/src/cps/sealMasterPostOutput.ts` — `sealMasterPostOutput()` (the U-PPGM15 helper)
- `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` — read-only template reference for `MillOperation` shape and physics-check structure

## Key Design Decisions

1. **One engine, family flag (not two engines).** OSP-P300 and OSP-P500 differ on five fields
   (Super-NURBS, look-ahead-blocks, work-offset count, axes, memory). All can be modelled
   with a single `osp_family` config flag pulling the right `ControllerDialect` row. Two
   engines would force duplicate physics-check logic.
2. **Dialect-driven, not hardcoded.** All mill G-codes route through `ControllerDialectEngine`.
   This is the pattern the lathe equivalent (`OkumaB250LatheMasterPostEngine`) violates and
   the reason changing OSP syntax requires touching multiple files. New engine starts clean.
3. **Defer JM Die tribal mining.** Archive has no Okuma-mill source programs to harvest from.
   Build the engine on the existing dialect knowledge + a small built-in tip pool now;
   open a separate `U-PPGW-OkumaMill-Tribal` unit for when source programs arrive.
4. **N-label format identical to Hurco** (`N100, N110, ...`). `verifyBlockAnnotations`
   already parses these labels generically — no gate changes needed.
5. **Replace the HARD-REJECT branch in the same commit as the engine** so there's no
   intermediate state where the branch claims "no engine exists" but the engine exists.

## Verification

```bash
# 1. Build clean
cd H:/prism/mcp-server && rtk npm run build:fast

# 2. New unit + integration tests pass
cd H:/prism/mcp-server && rtk npx vitest run \
  src/__tests__/OkumaOSPMillMasterPostEngine.test.ts \
  src/__tests__/OkumaOSPMillMasterPostEngine.SidecarIntegration.test.ts

# 3. Updated mirror-route test passes (HARD-REJECT → engine path)
cd H:/prism/mcp-server && rtk npx vitest run \
  src/__tests__/integration/MasterPostByMachineExpanded.integration.test.ts

# 4. Existing PPG suites still green (no regression)
cd H:/prism/mcp-server && rtk npx vitest run \
  src/__tests__/sealMasterPostOutput.test.ts \
  src/__tests__/HurcoV11SidecarIntegration.test.ts \
  src/__tests__/OkumaB250LatheMasterPostEngine.SidecarIntegration.test.ts \
  src/__tests__/PostPhysicsSidecarBlockAnnotations.test.ts \
  src/__tests__/PostPhysicsSidecar.blockRoundTrip.integration.test.ts \
  src/__tests__/verifyBlockAnnotations.test.ts

# 5. Stop hooks (must not block):
#    - duplication-hard-block: new engine name unique
#    - test-legitimacy: no toBeUndefined()/skip in new tests
#    - stop_on_unwired_assets: dispatcher import + master_post_by_machine branch wired
#    - test-startsWith rule: test files start with "OkumaOSPMillMasterPostEngine"

# 6. Commit format
git add -A
git commit -m "[MAIN] PPG-WIRE-MS5/U-PPGW-OkumaMill: OkumaOSPMillMasterPostEngine + dispatcher seal"
# (branch = work/cam-exhaust-ms0; scope mismatch → [MAIN] override per CLAUDE.md)

# 7. Scrutiny ledger
node .claude/scripts/scrutiny-mark.mjs --session-id <id> --self --agent --notes "U-PPGW-OkumaMill"
```

## Out of Scope (explicit)

- JM Die tribal mining for Okuma mill — archive has none; deferred to `U-PPGW-OkumaMill-Tribal`.
- 5-axis TCPC paths on P500 (`G43.5`) — engine accepts the dialect's TCPC mapping but the
  test surface stays 3-axis. 5-axis coverage belongs to the existing 5-axis lane.
- WEDM schema extension (U-PPGM16) — separate open lane; this plan doesn't touch
  block_annotation schema.
- Push of the existing 1-ahead commit `f382c3935` — separate session-end action.
