/**
 * sfcMachineBridge.ts (U-SFC-MACHINE-HOOK-SHAPE, slot:oscar, 2026-06-22)
 *
 * The machine-validation hooks (src/hooks/MachineValidationHooks.ts) read the NESTED machine shape
 * `machine.spindle.{max_rpm, power_kw}`. But the SFC orchestrate path sends FLAT top-level fields
 * `machine_max_rpm` / `machine_power_kw` (the SpeedFeedOrchestratorEngine / OrchestratorInput contract).
 * So the flat SFC payload is invisible to that hook suite: `pre-machine-completeness-gate` FALSE-BLOCKS
 * ("INCOMPLETE MACHINE DATA: spindle.max_rpm, spindle.power"), and `pre-machine-spindle-limits` /
 * `pre-machine-power-budget` silently SKIP -- so a complete, sane machine spec never reaches the gate.
 *
 * This pure helper bridges the flat spec into the nested shape the hooks expect, so they VALIDATE the
 * present spec instead of false-blocking / skipping. It is NON-destructive (returns undefined when no
 * usable spec is present -> the gate then correctly blocks genuinely-incomplete data; no safety gate is
 * weakened). normalizeParams also produces camelCase aliases, so both snake_case and camelCase are read.
 */

export interface SfcMachinePackage {
  spindle: {
    max_rpm?: number;
    power_kw?: number;
    power_continuous_kw?: number;
  };
}

function finitePositive(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Build the nested `{ spindle: { max_rpm, power_kw, power_continuous_kw } }` machine package from a flat
 * SFC params object. Returns undefined when neither a positive max_rpm nor a positive power is present
 * (so the completeness gate still blocks genuinely-incomplete machine data -- no weakening).
 */
export function buildSfcMachinePackage(params: Record<string, unknown>): SfcMachinePackage | undefined {
  const maxRpm = finitePositive(params.machine_max_rpm) ?? finitePositive(params.machineMaxRpm);
  const powerKw = finitePositive(params.machine_power_kw) ?? finitePositive(params.machinePowerKw);
  if (maxRpm === undefined && powerKw === undefined) return undefined;
  const spindle: SfcMachinePackage["spindle"] = {};
  if (maxRpm !== undefined) spindle.max_rpm = maxRpm;
  if (powerKw !== undefined) {
    spindle.power_kw = powerKw;
    spindle.power_continuous_kw = powerKw;
  }
  return { spindle };
}

/**
 * The SFC compute actions whose `pre-calculation` machine-validation hooks read the nested
 * `machine.spindle.*` shape. Both SFC entry paths share this set so NEITHER false-blocks a flat
 * machine spec:
 *   - prism_calc (calcDispatcher):      `sf_orchestrate`, `sf_quick`
 *   - prism_product (productDispatcher): `sfc_calculate`, `sfc_quick`, `sfc_compare`, `sfc_optimize`
 *
 * The product set is the one the SFC WEB PAGE drives -- `POST /api/v1/sfc/calculate` ->
 * `prism_product:sfc_calculate` -- via web/src/components/sfc/buildSfcRequest.ts, which posts the
 * FLAT `machine_max_rpm`/`machine_power_kw`. Without the bridge the completeness gate FALSE-BLOCKS
 * every web SFC calculation (verified live: flat -> blocked, nested -> full result).
 */
export const SFC_BRIDGE_ACTIONS: ReadonlySet<string> = new Set([
  "sf_orchestrate",
  "sf_quick",
  "sfc_calculate",
  "sfc_quick",
  "sfc_compare",
  "sfc_optimize",
]);

/**
 * Single shared bridge applied by BOTH the calc and product SFC dispatch paths before their
 * `pre-calculation` hooks run. Mutates `params.machine` in place with the nested package built from
 * the flat SFC spec, so the machine-validation hooks VALIDATE the present spec instead of
 * false-blocking on its absence.
 *
 * Non-destructive + no safety weakening:
 *   - returns false (no-op) when the action is not an SFC compute action,
 *   - returns false when `params.machine` is already set (never overwrites an explicit nested spec),
 *   - returns false when no positive flat machine spec is present (so a genuinely-incomplete payload
 *     STILL blocks at the completeness gate -- the bridge only reshapes a spec the caller supplied).
 *
 * @returns true iff a nested machine package was attached.
 */
export function applySfcMachineBridge(action: string, params: Record<string, unknown>): boolean {
  if (!SFC_BRIDGE_ACTIONS.has(action)) return false;
  if (params.machine !== undefined && params.machine !== null) return false;
  const pkg = buildSfcMachinePackage(params);
  if (!pkg) return false;
  params.machine = pkg;
  return true;
}
