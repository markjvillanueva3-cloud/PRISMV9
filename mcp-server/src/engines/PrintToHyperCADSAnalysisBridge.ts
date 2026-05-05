/**
 * PrintToHyperCADSAnalysisBridge — Blueprint OCR → hyperCAD-S Python script
 * (CAD-COMPLETE-MS0/U-CADC-HC-PRINT-01)
 *
 * Sister to the existing PrintToHyperCADSBridge (which takes a STEP file path
 * and produces import+heal scripts). This variant takes a BlueprintAnalysis
 * (or profiles/dimensions) like the other 5 print bridges, so hyperCAD-S can
 * be a first-class member of PrintToAllCADsOrchestrator's target list.
 *
 * Thin wrapper: shared PrintToCADTranslator emits the canonical CADOperation
 * stream; hyperCADSCodeGeneratorEngine emits Python targeting the hcad API.
 *
 * @engine PrintToHyperCADSAnalysisBridge
 * @dispatcher cadDispatcher (action: print_to_hypercads_analysis)
 * @milestone CAD-COMPLETE-MS0 / U-CADC-HC-PRINT-01
 */

import {
  hyperCADSCodeGeneratorEngine,
  type HyperCADSGenerationContext,
} from "./HyperCADSCodeGeneratorEngine.js";
import {
  translateBlueprintToOps,
  validateTranslatorInput,
  PRINT_BRIDGE_SUPPORTED_OPS,
  type TranslatorInput,
  type ValidationResult,
} from "./PrintToCADTranslator.js";
import type { CADOperationKind } from "../interfaces/ICADCodeGenerator.js";

const BRIDGE_VERSION = "1.0.0";
const LABEL = "PrintToHyperCADSAnalysisBridge";

export interface PrintToHyperCADSAnalysisInput extends TranslatorInput {
  outputDir?: string;
  targetVersion?: "2023" | "2024" | "2025";
}

export interface PrintToHyperCADSAnalysisOutput {
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

export class PrintToHyperCADSAnalysisBridge {
  readonly version = BRIDGE_VERSION;

  validate(input: PrintToHyperCADSAnalysisInput): ValidationResult {
    return validateTranslatorInput(input);
  }

  buildBridgeScript(input: PrintToHyperCADSAnalysisInput): PrintToHyperCADSAnalysisOutput {
    const t = translateBlueprintToOps(input, LABEL);

    const ctx: HyperCADSGenerationContext = {
      projectName: t.partName,
      units: t.units,
      outputDir: input.outputDir,
      targetVersion: input.targetVersion ?? "2024",
    };
    const script = hyperCADSCodeGeneratorEngine.buildScript(t.ops, ctx);

    const warnings = [...t.warnings];
    for (const w of script.warnings) {
      warnings.push(`[generator/${w.kind}@op${w.opIndex}] ${w.message}`);
    }

    // Prepend imports so the emitted script is actually runnable
    // (HyperCADSCodeGeneratorEngine puts imports on `script.imports`, not `body`).
    const importBlock = script.imports.length > 0 ? script.imports.join("\n") + "\n\n" : "";
    let body = importBlock + script.body;
    if (!body.endsWith("\n")) body += "\n";
    if (t.material) {
      body += `\n# Material (from blueprint title block): ${t.material}\n`;
    }
    body += `# PRISM PrintToHyperCADSAnalysisBridge v${BRIDGE_VERSION} — ${t.ops.length} ops, ${t.validProfileCount} profiles, ${t.dimensionCount} dims\n`;

    const parameters: PrintToHyperCADSAnalysisOutput["parameters"] = {};
    for (const [name, info] of script.parameters) {
      parameters[name] = info;
    }

    return {
      script: body,
      filename: script.filename || `${t.partName}.hcad.py`,
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

export const printToHyperCADSAnalysisBridge = new PrintToHyperCADSAnalysisBridge();
