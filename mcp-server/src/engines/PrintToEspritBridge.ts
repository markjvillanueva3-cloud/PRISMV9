/**
 * PrintToEspritBridge — Blueprint OCR → DP Technology Esprit VB script
 * (CAD-COMPLETE-MS0/U-CADC-ESP-PRINT-01)
 *
 * Thin wrapper: shared PrintToCADTranslator emits the canonical CADOperation
 * stream; espritCodeGeneratorEngine emits Esprit VB targeting the COM API.
 *
 * @engine PrintToEspritBridge
 * @dispatcher cadDispatcher (action: print_to_esprit)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-ESP-PRINT-01
 */

import {
  espritCodeGeneratorEngine,
  type EspritGenerationContext,
} from "./EspritCodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToEspritBridge";

export interface PrintToEspritInput extends TranslatorInput {
  outputDir?: string;
  documentTemplate?: string;
  targetVersion?: "2023" | "2024" | "2025";
}

export interface PrintToEspritOutput {
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

export class PrintToEspritBridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToEspritInput): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToEspritInput): PrintToEspritOutput {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: EspritGenerationContext = {
      projectName: t.partName,
      units: t.units,
      outputDir: input.outputDir,
      targetVersion: input.targetVersion ?? "2024",
      documentTemplate: input.documentTemplate,
    };
    const script = espritCodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n' Material (from blueprint title block): ${t.material}\n`;
    }
    body += `' PRISM PrintToEspritBridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToEspritOutput["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.esprit.vb`,
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

export const printToEspritBridge = new PrintToEspritBridge();
