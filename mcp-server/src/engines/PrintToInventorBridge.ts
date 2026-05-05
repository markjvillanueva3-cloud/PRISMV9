/**
 * PrintToInventorBridge — Blueprint OCR → Autodesk Inventor iLogic VB.NET script
 * (CAD-COMPLETE-MS0/U-CADC-INV-PRINT-01)
 *
 * Thin wrapper: shared PrintToCADTranslator emits the canonical CADOperation
 * stream; inventorCADCodeGeneratorEngine emits iLogic VB.NET code that drives
 * Inventor's COM API.
 *
 * @engine PrintToInventorBridge
 * @dispatcher cadDispatcher (action: print_to_inventor)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-INV-PRINT-01
 */

import {
  inventorCADCodeGeneratorEngine,
  type InventorCADContext,
} from "./InventorCADCodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToInventorBridge";

export interface PrintToInventorInput extends TranslatorInput {
  outputPath?: string;
  templatePath?: string;
  documentType?: "part" | "assembly" | "drawing";
}

export interface PrintToInventorOutput {
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

export class PrintToInventorBridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToInventorInput): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToInventorInput): PrintToInventorOutput {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: InventorCADContext = {
      documentType: input.documentType ?? "part",
      units: t.units,
      templatePath: input.templatePath,
      outputPath: input.outputPath,
    };
    const script = inventorCADCodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    let body = script.body;
    if (t.material) {
      body += `\n' Material (from blueprint title block): ${t.material}\n`;
    }
    body += `' PRISM PrintToInventorBridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToInventorOutput["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.iLogicVb`,
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

export const printToInventorBridge = new PrintToInventorBridge();
