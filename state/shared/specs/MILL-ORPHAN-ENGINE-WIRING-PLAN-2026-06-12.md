# Mill orphan-engine wiring plan (slot:bravo, 2026-06-12) -- RECONCILED against the live audit

> R13 logical-order planning artifact: the verifiable PLAN before the risky dispatcher edit.
> **REVISED 2026-06-12 (R12):** the original target list came from a recon AGENT's dig, not a
> script run. A live `scripts/audit-unwired-engines.mjs` run + per-engine grep CORRECTED it.
> 5 of the original 6 targets were FALSE POSITIVES. Read the reconciliation below before wiring.

## Reconciliation: recon DIG vs authoritative audit (the R12 correction)

The recon agent flagged 6 "genuinely orphaned" mill engines. The live audit
(`state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`, regenerated 2026-06-12 -- 3754 engines,
64 UNWIRED) plus a per-engine consumer grep proved only **ONE** is a real wire target:

| Original recon target | Live-audit verdict | Evidence (grepped 2026-06-12) |
|-----------------------|--------------------|-------------------------------|
| `CounterfactualMillEngine` | **TRUE ORPHAN -> wire** | refs ONLY in itself + its own test + 2 doc files. In the 64-UNWIRED set (line 75, 17KB real engine). |
| `HyperMillKienzleMappingEngine` | WIRED-VIA-REGISTRY (not orphan) | imported by `registries/PhysicsMappingRegistry.ts:28`. NOT in the 64-UNWIRED set. |
| `HyperMillSpeedFeedMappingEngine` | WIRED-VIA-REGISTRY | `PhysicsMappingRegistry.ts:33`. |
| `HyperMillDeflectionThermalMappingEngine` | WIRED-VIA-REGISTRY | `PhysicsMappingRegistry.ts:38`. |
| `HyperMillSurfaceQualityMappingEngine` | WIRED-VIA-REGISTRY | `PhysicsMappingRegistry.ts:43`. |
| `HyperMillNonCAMMappingEngine` | WIRED-VIA-REGISTRY | `PhysicsMappingRegistry.ts:48`. |

**Plus one new finding from the audit (NOT a wire target):**

| Engine | Verdict | Evidence |
|--------|---------|----------|
| `MillPrintToProgramEngine` | **STUB -> DEPRECATE (do NOT wire)** | size_kb:1 in the audit; system-viz roost `ghost.priority.u-ppgm50` = "U-PPGM50 - Deprecate MillPrintToProgramEngine stub". It IS referenced in `millDispatcher.ts` + `millActionSchemas.ts` but the real print->program logic lives elsewhere (`MillMasterOrchestratorFacadeEngine`). Wiring a 1KB stub would be the opposite of R15. Defer to the existing U-PPGM50 deprecation roost. |

**Lesson (R12 -- captured as [[reference_bravo_mill_orphan_reconciliation_2026_06_12]]):** an agent's "genuinely
orphaned, zero consumers" claim is NOT authoritative -- the audit script's consumer set includes
**registries** (`reference_audit_wired_via_engine_2026_06_10` extended it to engine->engine; it already
covered registry/route/singleton). Always reconcile a recon orphan list against a live audit run +
a per-engine grep before wiring. The original plan's own Caveat #2 ("re-confirm with a live run")
is exactly what caught this.

## The ONE real target: CounterfactualMillEngine

- **Path:** `mcp-server/src/engines/CounterfactualMillEngine.ts:97` (`export class CounterfactualMillEngine`)
- **Singleton:** `counterfactualMillEngine` (line 464) -- already exported, ready to import.
- **Entry API (READ from source, not guessed):**
  `analyze(baseline: MillingBaselineParams): CounterfactualAnalysisResult`
  - `MillingBaselineParams` (lines 26-37): `{ cutting_speed_mpm, feed_per_tooth_mm, axial_depth_mm, radial_depth_mm, tool_diameter_mm, number_of_teeth, material_iso_group: "P"|"M"|"K"|"N"|"S"|"H", hardness_hrc?, operation: "roughing"|"semi-finishing"|"finishing", engagement_type?: "conventional"|"climb"|"trochoidal" }`
  - `CounterfactualAnalysisResult` (lines 65-79): `{ baseline, baseline_estimates, scenarios[], best_scenario_id, worst_scenario_id, recommendations[], confidence }`
  - Also public: `generateSingleCounterfactual(baseline, parameter, newValue): CounterfactualScenario` (line 130).
- **Purpose:** "what-if" scenarios (speed/feed/depth/engagement variations) -> predicted force/tool-life/MRR/deflection deltas + risk + recommendation. Directly useful for the self-improving SFC ("change one param, see the physics delta").

### PREREQUISITE (R13 comprehensive -- do FIRST, in the same unit)
The engine **INLINES physics constants** (lines 81-95): `KIENZLE_KC1_1`, `KIENZLE_MC`, `TAYLOR_C`,
`TAYLOR_N`. Values are CORRECT (kc1.1 P:1800/M:2100/K:1100/N:700/S:2800/H:3200 = canonical) but
inlined -- a `stop_on_inlined_constants.mjs` violation if the engine block is touched. Before/with
wiring, refactor these to import from `mcp-server/src/physics/constants.ts` (confirm the export
shape there first -- `CANONICAL_KIENZLE` exists at constants.ts:34; verify Taylor C/n exports or
add them). Wiring without this fix leaves a latent convention violation in a now-reachable engine.

### Wire procedure (WIRE -> TEST -> VALIDATE, R15) -- on a FRESH low-context session
1. **Refactor inlined constants** -> import from `constants.ts` (prerequisite above). Build green.
2. **Add action** `mill_counterfactual_analyze` to `MILL_ACTIONS` in `millDispatcher.ts` (confirm no
   collision vs the existing ~399). Optionally `mill_counterfactual_single` for `generateSingleCounterfactual`.
3. **Add handler** -- lazy `await import("../../engines/CounterfactualMillEngine.js")`, call
   `counterfactualMillEngine.analyze(validatedInput)`, return the result. Match the surrounding
   lazy-import handler shape exactly (R11).
4. **Schema** -- add the `MillingBaselineParams` Zod schema to `millActionSchemas.ts` (the dispatcher
   validates per-action; mirror an existing physics-input schema). Enum-guard `material_iso_group`,
   `operation`, `engagement_type`; positive-number-guard the dimensions.
5. **TEST** -- round-trip THROUGH the dispatcher (pattern: `millDispatcher.printToProgram.test.ts`).
   Assert real physics: happy (P-steel roughing -> non-empty scenarios, force>0, ranked) + >=3 failure
   (zero/negative dims -> structured error, bad ISO group, missing required field) + >=2 adversarial
   (trochoidal-already-set -> no trochoidal scenario; H-material high-speed -> "critical"/"avoid").
6. **VALIDATE** -- `npm run build:fast` green; re-run `audit-unwired-engines.mjs`, confirm
   `CounterfactualMillEngine` drops OUT of the 64-UNWIRED set (62 -> ... after this + any peers).

## Caveats (R12)
- Edits a 217KB+ `millDispatcher.ts` -- do on a FRESH, low-context session with the 3-of-3 scrutiny
  tier recovered (it was rate-limited 2026-06-12). Heavy-context dispatcher edits risk a spiral (R6).
- `MillPrintToProgramEngine` is a DEPRECATION target (U-PPGM50), NOT a wire target -- do not "wire" it.
- The 5 HyperMill*MappingEngine are WIRED-VIA-REGISTRY -- leave them alone (verified, not orphans).
