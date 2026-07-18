/**
 * PrintToHyperCADSBridge — STEP File to AC Python Import+Heal+Workpiece Pipeline (E1161)
 *
 * Chains: file validation → import script → heal script → stock model assignment.
 * Takes a STEP file path and material specification, outputs a complete AC Python
 * script sequence that imports, heals, and prepares the part for CAM.
 *
 * Validates:
 *   - STEP file extension (.stp / .step)
 *   - Material lookup against HyperMillMaterialPhysicsBridge
 *
 * @engine PrintToHyperCADSBridge
 * @shortcode E1161
 * @dispatcher camDispatcher (via cam_hyperCADS_import action)
 * @milestone HM-REV-MS0 / U-HMR02
 */

import {
  hyperCADSAutomationEngine,
  type CADSImportParams,
  type CADSHealParams,
  type CADSScriptResult,
} from "./HyperCADSAutomationEngine.js";
import { HyperMillMaterialPhysicsBridge } from "./HyperMillMaterialPhysicsBridge.js";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Bridge input: STEP file path + material + optional settings */
export interface BridgeInput {
  /** Absolute path to STEP file (.stp or .step) */
  step_file_path: string;
  /** Material name or ISO group (e.g. "316L", "Ti-6Al-4V", "P", "M") */
  material: string;
  /** Import tolerance in mm (default 0.01) */
  tolerance_mm?: number;
  /** Heal stitch tolerance in mm (default 0.01) */
  stitch_tolerance_mm?: number;
  /** Heal tolerance in mm (default 0.05) */
  heal_tolerance_mm?: number;
  /** Assign imported body as workpiece */
  set_as_workpiece?: boolean;
  /** Part name (defaults to filename stem) */
  part_name?: string;
  /** Run geometry healing after import */
  run_heal?: boolean;
}

/** Bridge output */
export interface BridgeOutput {
  /** Combined AC Python script (import + heal if requested) */
  script: string;
  /** Number of script lines */
  line_count: number;
  /** Operations included */
  operations: string[];
  /** Resolved material ISO group */
  material_iso_group: string | null;
  /** Material kc1.1 from CANONICAL_KIENZLE */
  material_kc1_1: number | null;
  /** Validation warnings */
  warnings: string[];
  /** Whether mock mode is active */
  mock_mode: boolean;
  /** Part name used */
  part_name: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_STEP_EXTENSIONS = [".stp", ".step"];

function validateStepPath(filePath: string): { valid: boolean; warning?: string } {
  const lower = filePath.toLowerCase();
  const hasValidExt = VALID_STEP_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      warning: `File "${filePath}" does not have a .stp or .step extension — PrintToHyperCADSBridge expects STEP format`,
    };
  }
  return { valid: true };
}

function extractPartName(filePath: string): string {
  const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "part";
  return fileName.replace(/\.(stp|step|igs|iges)$/i, "");
}

// ─── Bridge Engine ────────────────────────────────────────────────────────────

/**
 * PrintToHyperCADSBridge — chains STEP validation, import script, heal script.
 * Validates material against HyperMillMaterialPhysicsBridge.
 */
export class PrintToHyperCADSBridge {
  private readonly materialBridge: HyperMillMaterialPhysicsBridge;

  constructor() {
    this.materialBridge = new HyperMillMaterialPhysicsBridge();
  }

  /**
   * Build a chained AC Python script: import STEP → heal → set workpiece.
   *
   * @param input - Bridge input (STEP path, material, tolerances)
   * @returns BridgeOutput with combined script and resolved material info
   */
  buildBridgeScript(input: BridgeInput): BridgeOutput {
    const warnings: string[] = [];
    const operations: string[] = [];

    // 1. Validate STEP file extension
    const extCheck = validateStepPath(input.step_file_path);
    if (!extCheck.valid && extCheck.warning) {
      warnings.push(extCheck.warning);
    }

    // 2. Resolve material
    const matResult = this.materialBridge.resolve(input.material);
    let materialIsoGroup: string | null = null;
    let materialKc1_1: number | null = null;

    if (!matResult.found) {
      warnings.push(`Material "${input.material}" not found in MaterialRegistry — proceeding with defaults`);
    } else {
      materialIsoGroup = matResult.iso_group;
      materialKc1_1 = matResult.kc1_1;
    }

    // 3. Derive part name
    const partName = input.part_name ?? extractPartName(input.step_file_path);

    // 4. Build import script
    const importParams: CADSImportParams = {
      file_path: input.step_file_path,
      format: "STEP",
      tolerance_mm: input.tolerance_mm ?? 0.01,
      part_name: partName,
      set_as_workpiece: input.set_as_workpiece ?? true,
    };

    const importResult = hyperCADSAutomationEngine.generateImportScript(importParams);
    warnings.push(...importResult.warnings);
    operations.push(...importResult.operations);

    let combinedScript = importResult.script;

    // 5. Optionally chain heal
    if (input.run_heal !== false) {
      const healParams: CADSHealParams = {
        body_name: partName,
        stitch_tolerance_mm: input.stitch_tolerance_mm ?? 0.01,
        heal_tolerance_mm: input.heal_tolerance_mm ?? 0.05,
        align_normals: true,
        remove_duplicates: true,
      };

      const healResult = hyperCADSAutomationEngine.generateHealScript(healParams);
      warnings.push(...healResult.warnings);
      operations.push(...healResult.operations);

      // Append heal block (remove its header to avoid duplicate imports)
      const healLines = healResult.script.split("\n");
      const healBody = healLines.slice(7); // skip header lines (7 header lines)
      combinedScript += "\n" + healBody.join("\n");
    }

    // 6. Material info comment at end
    if (materialIsoGroup) {
      combinedScript += [
        "",
        `# Material: ${input.material} → ISO ${materialIsoGroup} (kc1.1=${materialKc1_1} N/mm²)`,
        `print(f"[PRISM] Material: ${input.material} | ISO: ${materialIsoGroup} | kc1.1: ${materialKc1_1} N/mm²")`,
      ].join("\n");
    }

    const totalLines = combinedScript.split("\n").length;

    return {
      script: combinedScript,
      line_count: totalLines,
      operations,
      material_iso_group: materialIsoGroup,
      material_kc1_1: materialKc1_1,
      warnings,
      mock_mode: process.env["HYPERMILL_MOCK"] === "true",
      part_name: partName,
    };
  }

  /**
   * Validate only (no script generation) — check STEP path and material.
   *
   * @param stepFilePath - Path to check
   * @param material - Material to look up
   * @returns Validation result
   */
  validate(stepFilePath: string, material: string): { valid: boolean; warnings: string[]; material_iso_group: string | null } {
    const warnings: string[] = [];
    const extCheck = validateStepPath(stepFilePath);
    if (!extCheck.valid && extCheck.warning) warnings.push(extCheck.warning);

    const matResult = this.materialBridge.resolve(material);
    if (!matResult.found) {
      warnings.push(`Material "${material}" not found in MaterialRegistry`);
    }

    return {
      valid: extCheck.valid && matResult.found,
      warnings,
      material_iso_group: matResult.found ? matResult.iso_group : null,
    };
  }
}

/** Singleton export */
export const printToHyperCADSBridge = new PrintToHyperCADSBridge();
