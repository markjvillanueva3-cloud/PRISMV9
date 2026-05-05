/**
 * PrintToMastercamBridge — Blueprint OCR → Mastercam C# .NET-Hook script
 * (CAD-COMPLETE-MS0/U-CADC-MC-PRINT-01)
 *
 * Thin wrapper: shared PrintToCADTranslator emits the canonical CADOperation
 * stream; mastercamCodeGeneratorEngine emits Mastercam C# code targeting the
 * NET-Hook function table.
 *
 * @engine PrintToMastercamBridge
 * @dispatcher cadDispatcher (action: print_to_mastercam)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-MC-PRINT-01
 */

import {
  mastercamCodeGeneratorEngine,
  type MastercamGenerationContext,
} from "./MastercamCodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToMastercamBridge";

export interface PrintToMastercamInput extends TranslatorInput {
  outputDir?: string;
  targetVersion?: "2023" | "2024" | "2025";
  machineGroup?: string;
  postProcessor?: string;
}

export interface PrintToMastercamOutput {
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

export class PrintToMastercamBridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToMastercamInput): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToMastercamInput): PrintToMastercamOutput {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: MastercamGenerationContext = {
      projectName: t.partName,
      units: t.units,
      machineGroup: input.machineGroup,
      postProcessor: input.postProcessor,
      outputDir: input.outputDir,
      targetVersion: input.targetVersion ?? "2024",
    };
    const script = mastercamCodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n// Material (from blueprint title block): ${t.material}\n`;
    }
    body += `// PRISM PrintToMastercamBridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToMastercamOutput["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.cs`,
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

export const printToMastercamBridge = new PrintToMastercamBridge();
