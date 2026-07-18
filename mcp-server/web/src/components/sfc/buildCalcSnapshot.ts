import type { MaterialEntry } from "../../data/materials";
import type { OperationType } from "../../data/operations";
import type { SfcCalculateResult } from "../../types/sfc";
import type { SfcParams } from "./ParameterPanel";
import type { CalcSnapshot } from "./comparison-types";

/**
 * Build a CalcSnapshot for the comparison/history list from the page's current selections + result.
 *
 * Pure (id + ts are passed in, not generated here) so the snapshot shape -- including the optimization
 * GOAL -- is unit-testable without rendering the page. Recording `optimizeFor` lets history/comparison
 * disambiguate two calcs that differ only by goal (cost vs productivity produce different numbers from the
 * same material/op/params), and lets `handleReloadFromHistory` restore the goal it was computed under.
 *
 * @param material   the selected material
 * @param operation  the selected operation
 * @param toolName   the selected tool's display name (or undefined)
 * @param params     the parameter-panel values
 * @param optimizeFor the optimization goal this calc used
 * @param result     the calc result
 * @param id         caller-generated unique id (impure -- kept out of this pure fn)
 * @param ts         caller-generated timestamp (impure -- kept out of this pure fn)
 */
export function buildCalcSnapshot(
  material: MaterialEntry,
  operation: OperationType,
  toolName: string | undefined,
  params: SfcParams,
  optimizeFor: "cost" | "balanced" | "productivity",
  result: SfcCalculateResult,
  id: string,
  ts: number,
): CalcSnapshot {
  return {
    id,
    materialName: material.name,
    materialId: material.id,
    materialGroup: material.group,
    operationLabel: operation.label,
    operationId: operation.id,
    toolName,
    params: { ...params },
    optimizeFor,
    result,
    ts,
  };
}
