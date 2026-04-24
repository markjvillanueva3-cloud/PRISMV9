/**
 * Calculator Programming Catalog Extensions
 * Provides supplemental programming environments and merge logic.
 * Stub: original file lost to exFAT corruption (2026-04-10)
 */
export type {
  CalculatorProgrammingEnvironmentOption,
  CalculatorProgrammingToolpathOption,
} from "../data/calculatorProgrammingCatalog.js";
import type {
  CalculatorProgrammingEnvironmentOption,
  CalculatorProgrammingToolpathOption,
} from "../data/calculatorProgrammingCatalog.js";

/** Additional programming environments not in the base JSON catalog */
export const SUPPLEMENTAL_PROGRAMMING_ENVIRONMENTS: CalculatorProgrammingEnvironmentOption[] = [];

/** Additional toolpaths keyed by environment ID */
export const PROGRAMMING_ENVIRONMENT_TOOLPATH_SUPPLEMENTS: Record<string, CalculatorProgrammingToolpathOption[]> = {};

function mergeProgrammingEnvironmentToolpaths(
  environment: CalculatorProgrammingEnvironmentOption,
): CalculatorProgrammingEnvironmentOption {
  const extras = PROGRAMMING_ENVIRONMENT_TOOLPATH_SUPPLEMENTS[environment.id];
  if (!extras || extras.length === 0) return environment;
  const existingIds = new Set(environment.toolpaths.map((t) => t.id));
  const mergedToolpaths = [
    ...environment.toolpaths,
    ...extras.filter((t) => !existingIds.has(t.id)),
  ];
  return {
    ...environment,
    toolpaths: mergedToolpaths,
  };
}

export function mergeProgrammingCatalog(
  baseEnvironments: CalculatorProgrammingEnvironmentOption[],
): CalculatorProgrammingEnvironmentOption[] {
  const mergedBase = baseEnvironments.map(mergeProgrammingEnvironmentToolpaths);
  const seenEnvironmentIds = new Set(mergedBase.map((environment) => environment.id));
  const extras = SUPPLEMENTAL_PROGRAMMING_ENVIRONMENTS
    .filter((environment) => !seenEnvironmentIds.has(environment.id))
    .map(mergeProgrammingEnvironmentToolpaths);
  return [...mergedBase, ...extras];
}
