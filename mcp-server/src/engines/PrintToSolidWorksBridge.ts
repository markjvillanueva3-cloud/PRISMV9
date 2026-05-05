/**
 * PrintToSolidWorksBridge — Blueprint OCR → SolidWorks VBA macro
 * (CAD-COMPLETE-MS0/U-CADC-SW-PRINT-01)
 *
 * Thin wrapper: shared PrintToCADTranslator emits the canonical CADOperation
 * stream; solidWorksCodeGeneratorEngine emits VBA targeting the SolidWorks
 * COM API (sldworks.swApp).
 *
 * @engine PrintToSolidWorksBridge
 * @dispatcher cadDispatcher (action: print_to_solidworks)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-SW-PRINT-01
 */

import {
  solidWorksCodeGeneratorEngine,
  type SolidWorksGenerationContext,
} from "./SolidWorksCodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToSolidWorksBridge";

export interface PrintToSolidWorksInput extends TranslatorInput {
  outputDir?: string;
  templatePath?: string;
}

export interface PrintToSolidWorksOutput {
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

export class PrintToSolidWorksBridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToSolidWorksInput): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToSolidWorksInput): PrintToSolidWorksOutput {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: SolidWorksGenerationContext = {
      partName: t.partName,
      units: t.units,
      templatePath: input.templatePath,
      outputDir: input.outputDir,
    };
    const script = solidWorksCodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n' Material (from blueprint title block): ${t.material}\n`;
    }
    body += `' PRISM PrintToSolidWorksBridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToSolidWorksOutput["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.swp`,
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

export const printToSolidWorksBridge = new PrintToSolidWorksBridge();
