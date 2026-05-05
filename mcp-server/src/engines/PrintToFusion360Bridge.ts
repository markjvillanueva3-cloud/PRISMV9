/**
 * PrintToFusion360Bridge — Blueprint OCR → Fusion 360 Python script
 * (CAD-COMPLETE-MS0/U-CADC-FUS-PRINT-01)
 *
 * Thin wrapper: delegates blueprint→ops translation to the shared
 * PrintToCADTranslator, then hands the op stream to fusion360CodeGeneratorEngine
 * for Python emission.
 *
 * @engine PrintToFusion360Bridge
 * @dispatcher cadDispatcher (action: print_to_fusion360)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-FUS-PRINT-01
 */

import {
  fusion360CodeGeneratorEngine,
  type Fusion360GenerationContext,
} from "./Fusion360CodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToFusion360Bridge";

export interface PrintToFusion360Input extends TranslatorInput {
  outputDir?: string;
  targetVersion?: "2023" | "2024" | "2025";
}

export interface PrintToFusion360Output {
  script: string;
  filename: string;
  opsEmitted: number;
  unsupported: string[];
  warnings: string[];
  partName: string;
  material: string | null;
  units: "mm" | "in";
  parameters: Record<string, { value: number | string | boolean; unit: string; description?: string }>;
  provenance: {
    source: "blueprint_analysis" | "profiles" | "dimensions_only" | "mixed";
    dimensionCount: number;
    profileCount: number;
    bridgeVersion: string;
    generatorVersion: string;
    timestamp: string;
  };
}

export class PrintToFusion360Bridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToFusion360Input): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToFusion360Input): PrintToFusion360Output {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: Fusion360GenerationContext = {
      projectName: t.partName,
      units: t.units === "in" ? "in" : "mm",
      outputDir: input.outputDir,
      targetVersion: input.targetVersion ?? "2024",
      componentName: t.partName,
    };
    const script = fusion360CodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n# Material (from blueprint title block): ${t.material}\n`;
    }
    body += `# PRISM PrintToFusion360Bridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToFusion360Output["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.py`,
      opsEmitted: t.ops.length,
      unsupported: t.unsupported,
      warnings,
      partName: t.partName,
      material: t.material,
      units: t.units,
      parameters,
      provenance: {
        source: t.source,
        dimensionCount: t.dimensionCount,
        profileCount: t.profileCount,
        bridgeVersion: BRIDGE_VERSION,
        generatorVersion: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    };
  }

  supportedOperations(): readonly CADOperationKind[] {
    return PRINT_BRIDGE_SUPPORTED_OPS;
  }
}

export const printToFusion360Bridge = new PrintToFusion360Bridge();
