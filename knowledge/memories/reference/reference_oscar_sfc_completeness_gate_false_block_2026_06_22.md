---
name: oscar-sfc-completeness-gate-false-block-2026-06-22
description: "FOUND (via e2e visual pass): the pre-machine-completeness-gate FALSE-BLOCKS the SFC default JM preset -- it reads nested spindle.* but the SFC sends flat machine_max_rpm/machine_power_kw. Surfaced (U-SFC-SURFACE-BLOCKED) but NOT yet fixed (safety-hook edit, fresh-session)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.698Z
aliases: reference_oscar_sfc_completeness_gate_false_block_2026_06_22
---


**Finding (slot:oscar, 2026-06-22, via the live e2e Playwright visual pass).** Clicking Calculate on the SFC `/speed-feed` page with the DEFAULT JM preset (Haas VF-2, machine_max_rpm 8100, machine_power_kw 22.4) returns `POST /api/v1/speed-feed/orchestrate => 200` with a GATE BLOCK, not a result:
`{ result: { blocked: true, blocker: "pre-machine-completeness-gate", reason: "INCOMPLETE MACHINE DATA: Critical machine fields missing: spindle.max_rpm, spindle.power" } }`.

**Surfaced + shipped:** `U-SFC-SURFACE-BLOCKED` (this session) makes the block VISIBLE in the UI (was fail-silent -- the page rendered nothing). So the operator now SEES the block. But the underlying false-block is NOT yet fixed.

**Root cause (verified by reading the gate):** `MachineValidationHooks.ts` `pre-machine-completeness-gate` handler (line ~437-468) extracts `pkg = d.machinePackage ?? d.machine ?? {}`, `spindle = pkg.spindle ?? {}`, then blocks if `!spindle.max_rpm` or no `spindle.power_kw/power_continuous_kw/power`. It reads ONLY the NESTED `machine.spindle.*` shape. But the SFC orchestrate payload (from SpeedFeedPage + the orchestrator input contract) sends FLAT top-level fields `machine_max_rpm` / `machine_power_kw`. So `pkg.spindle` is empty -> both critical fields "missing" -> the gate BLOCKS a payload that actually HAS the data. This is a FALSE-positive block (field-name/shape mismatch), not genuinely-incomplete data. (Also: the orchestrate path sends no `machine_id`, so `handbook-limit-guard` is skipped -- consistent with a flat, id-less payload.)

**Fix (NOT yet done -- fresh session, SAFETY-HOOK so physics/safety-reviewer MANDATORY):**
- Option A (surgical, preferred): in the completeness gate, ALSO recognize the flat fields --
  `const maxRpm = spindle.max_rpm ?? d.machine_max_rpm ?? d.max_rpm;`
  `const powerKw = spindle.power_kw ?? spindle.power_continuous_kw ?? spindle.power ?? d.machine_power_kw ?? d.max_power;`
  This is ADDITIVE + safety-PRESERVING (still blocks when neither shape has the data) -- it fixes a false-block, NOT a weakening. **MUST FIRST verify `ctx.target.data` actually carries `machine_max_rpm` in the sf_orchestrate path** (trace route `/api/v1/speed-feed/orchestrate` -> dispatcher -> gate invocation); if the route strips flat fields, fix on the route side instead (build a nested `machine.spindle` from the flat fields before the gate -- "normalize in the dispatcher" pattern).
- Option B: the SFC route builds a nested machinePackage from the flat machine_* fields before the gate runs.

**DEEPER ROOT-CAUSE (verified 2026-06-22, calcDispatcher.ts:1383-1389):** the sf_orchestrate pre-calculation hooks run with `hookCtx.target.data = params` (the normalized orchestrate params -- flat `machine_max_rpm`/`machine_power_kw` ARE present in `d`, confirmed; normalizeParams also adds camelCase `machineMaxRpm`). The ENTIRE machine-validation hook suite (MachineValidationHooks.ts) reads the NESTED `machine.spindle.*` / `machinePackage.spindle.*` shape:
- `pre-machine-completeness-gate` (line 448): finds nothing nested -> FALSE-BLOCKS ("incomplete").
- `pre-machine-spindle-limits` (line 73) + `pre-machine-power-budget`: find nothing nested -> SKIP ("no machine spindle max_rpm available -- skipped" = pass-by-skip).
So the flat SFC payload is INVISIBLE to the whole machine-safety hook layer. The completeness gate's block is currently the ONLY thing stopping an un-hook-validated calc (the orchestrator engine's OWN internal rpm/power clamping still applies -- SpeedFeedOrchestratorEngine.compute line ~2728 clamps rpm to machine.max_rpm from the flat field -- so safety is not entirely lost, but the pre-calc HOOK layer is bypassed).

**Two fix options (REVISED -- Option B is more correct but riskier):**
- **Option B (correct, comprehensive, R13):** in calcDispatcher before line 1385, build a nested `params.machine = { spindle: { max_rpm: machine_max_rpm, power_kw: machine_power_kw, ... } }` from the flat fields so ALL machine hooks VALIDATE (not just unblock completeness). RISK: the spindle-limits/power-budget hooks would then ACTIVELY run instead of skip -> may surface REAL over-speed/power blocks that are currently masked by skip (and only caught by the engine's internal clamp). That is arguably MORE correct safety, but it is a behavior change -> physics-reviewer + operator awareness + tests for the newly-active blocks.
- **Option A (partial):** loosen ONLY the completeness gate to read flat fields (`spindle.max_rpm ?? d.machine_max_rpm ?? d.machineMaxRpm`, power similarly). Unblocks the calc, but leaves spindle-limits/power-budget still skipping -> the hook safety layer still doesn't validate SFC calcs. Surgical but incomplete.

**Why deferred:** this is now a SAFETY-ARCHITECTURE decision (whether the pre-calc hook layer should validate SFC calcs at all, and the consequences of turning it on), touching `critical`/`blocking` safety hooks, at the tail of an 11-iteration session. It needs fresh context + physics/safety-reviewer + operator awareness + real tests. This is the #1 "prove SFC works 100%" blocker -- the UI cannot produce ANY result for the default machine until at least Option A lands. The fail-SILENT half was already fixed this session (U-SFC-SURFACE-BLOCKED -- the block is now visible).

Related: [[reference_sfc_speed_feed_bugs_2026_05_31]] (Bug 4 family), [[reference_oscar_speedfeed_material_aware_fixed_2026_06_22]]. Hook: `mcp-server/src/hooks/MachineValidationHooks.ts:437`.
