import type { SfcCalculateRequest } from "../../types/sfc";
import type { MaterialEntry } from "../../data/materials";
import type { OperationType } from "../../data/operations";
import type { MachineEntry } from "../../data/machines";
import type { SfcParams } from "./ParameterPanel";

/**
 * Build the SFC `/calculate` request from the page's current selections.
 *
 * Includes the selected machine's spindle ceiling (`spindleMaxRpm` -> `machine_max_rpm`) and
 * power (`spindlePowerKw` -> `machine_power_kw`) so the backend's rpm/power clamp actually fires.
 * Previously SfcCalculatorPage collected a machine but DISCARDED its limits, so a high-Vc material
 * (e.g. aluminum) was never RPM-capped for page customers -- it published an unreachable speed
 * (the aluminum-RPM-cap accuracy gap, spec SFC-VS-GWIZARD-HSMADVISOR-2026-06-19 s6b). The engine
 * (ProductEngine.sfcCalculate) already accepts + is tested for these fields; only the page wiring
 * was missing. A non-positive/absent spec is omitted so the engine treats it as unclamped (its
 * guard is `if (params.machine_max_rpm && ...)`).
 *
 * @param material  the selected material (id + Brinell hardness)
 * @param operation the selected operation (id)
 * @param params    the parameter-panel values (tool + cut geometry + coolant)
 * @param machine   the selected machine, or null when none is chosen (limits omitted)
 * @param optimizeFor the goal selector (cost / balanced / productivity); omitted = engine default
 * @returns the request body posted to POST /api/v1/sfc/calculate
 */
export function buildSfcCalcRequest(
  material: MaterialEntry,
  operation: OperationType,
  params: SfcParams,
  machine: MachineEntry | null,
  optimizeFor?: "cost" | "balanced" | "productivity",
): SfcCalculateRequest {
  const req: SfcCalculateRequest = {
    material: material.id,
    operation: operation.id,
    material_hardness: material.hardness,
    tool_material: params.tool_material,
    tool_diameter: params.tool_diameter,
    number_of_teeth: params.number_of_teeth,
    depth: params.depth,
    width: params.width,
    coolant: params.coolant,
  };
  if (machine) {
    if (typeof machine.spindleMaxRpm === "number" && machine.spindleMaxRpm > 0) {
      req.machine_max_rpm = machine.spindleMaxRpm;
    }
    if (typeof machine.spindlePowerKw === "number" && machine.spindlePowerKw > 0) {
      req.machine_power_kw = machine.spindlePowerKw;
    }
  }
  // Forward the tool coating when the panel selected one; an empty/absent value is omitted so the
  // engine treats it as uncoated (neutral 1.0 -- no derate), matching the machine-limit omit-pattern.
  if (params.coating) {
    req.coating = params.coating;
  }
  // Forward the goal selector when the page provides one (cost/balanced/productivity); an absent
  // value lets the engine apply its default ("balanced") recommendation.
  if (optimizeFor) {
    req.optimize_for = optimizeFor;
  }
  return req;
}
