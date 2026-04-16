import programmingCatalogJson from "./calculatorProgrammingCatalog.json";
import { mergeProgrammingCatalog } from "../shared/calculatorProgrammingCatalogExtensions";

export type CalculatorProgrammingMachineMode =
  | "mill"
  | "lathe"
  | "edm"
  | "wire_edm"
  | "laser"
  | "waterjet";

export interface CalculatorProgrammingToolpathOption {
  id: string;
  label: string;
  path: string;
  summary: string;
  operationId: string;
}

export interface CalculatorProgrammingEnvironmentOption {
  id: string;
  mode: CalculatorProgrammingMachineMode;
  label: string;
  vendor: string;
  kind: "manual" | "cam" | "nesting";
  summary: string;
  badge: string;
  toolpaths: CalculatorProgrammingToolpathOption[];
}

export const CALCULATOR_PROGRAMMING_ENVIRONMENTS =
  mergeProgrammingCatalog(
    programmingCatalogJson as CalculatorProgrammingEnvironmentOption[],
  );

export function getCalculatorProgrammingEnvironments(
  mode?: CalculatorProgrammingMachineMode,
): CalculatorProgrammingEnvironmentOption[] {
  if (!mode) return CALCULATOR_PROGRAMMING_ENVIRONMENTS;
  return CALCULATOR_PROGRAMMING_ENVIRONMENTS.filter((e) => e.mode === mode);
}