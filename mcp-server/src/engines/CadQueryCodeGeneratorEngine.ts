/**
 * CadQueryCodeGeneratorEngine — Executable CadQuery Script Generation
 * Converts action sequences into complete, parametric CadQuery Python scripts
 * with step-by-step output and basic syntax validation.
 */
import { log } from "../utils/Logger.js";
import type { ExtractedAction } from "./VideoActionExtractorEngine.js";
import {
  cadOperationTaxonomyEngine,
} from "./CADOperationTaxonomyEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface GeneratedScript {
  script: string;
  imports: string[];
  warnings: string[];
}

export interface StepResult {
  step: number;
  code: string;
  description: string;
  cumulative: string;
}

export interface SyntaxCheckResult {
  valid: boolean;
  errors: string[];
}

// ── Engine ─────────────────────────────────────────────────────────

export class CadQueryCodeGeneratorEngine {
  /**
   * Generate a full CadQuery Python script from an action sequence.
   * Includes imports, workplane setup, and sequential operations.
   */
  generateScript(actions: ExtractedAction[]): GeneratedScript {
    const warnings: string[] = [];
    const imports = ["cadquery"];
    const lines: string[] = [];

    lines.push("import cadquery as cq");
    lines.push("");
    lines.push("# ── Video Action Replay Script ──");
    lines.push(`# Total steps: ${actions.length}`);
    lines.push("");

    let hasWorkplane = false;
    let hasSolid = false;

    for (const action of actions) {
      const ts = this._formatTimestamp(action.timestamp_s);
      lines.push(
        `# Step ${action.step_number} @${ts}: ${action.description}`,
      );

      // Auto-create workplane if needed
      if (!hasWorkplane && action.action_type === "sketch_create") {
        hasWorkplane = true;
      } else if (!hasWorkplane && this._needsWorkplane(action)) {
        lines.push("result = cq.Workplane('XY')");
        hasWorkplane = true;
      }

      const code = cadOperationTaxonomyEngine.generateCadQueryCode(action);
      if (code.startsWith("# unknown")) {
        warnings.push(
          `Step ${action.step_number}: unknown action '${action.action_type}'`,
        );
      }
      lines.push(code);

      if (this._isSolidAction(action.action_type)) {
        hasSolid = true;
      }

      lines.push("");
    }

    if (!hasSolid && actions.length > 0) {
      warnings.push("No solid-creating operation found — script may fail");
    }

    lines.push("# ── Export ──");
    lines.push("cq.exporters.export(result, 'output.step')");

    return {
      script: lines.join("\n"),
      imports,
      warnings,
    };
  }

  /**
   * Generate code incrementally — each step includes the added code
   * and the full cumulative script so far.
   */
  generateStepByStep(actions: ExtractedAction[]): StepResult[] {
    const results: StepResult[] = [];
    const cumulativeLines: string[] = [
      "import cadquery as cq",
      "",
    ];
    let hasWorkplane = false;

    for (const action of actions) {
      const ts = this._formatTimestamp(action.timestamp_s);
      const comment = `# Step ${action.step_number} @${ts}: ${action.description}`;

      // Insert workplane if needed
      if (!hasWorkplane && action.action_type === "sketch_create") {
        hasWorkplane = true;
      } else if (!hasWorkplane && this._needsWorkplane(action)) {
        cumulativeLines.push("result = cq.Workplane('XY')");
        hasWorkplane = true;
      }

      const code = cadOperationTaxonomyEngine.generateCadQueryCode(action);
      const stepCode = `${comment}\n${code}`;

      cumulativeLines.push(comment);
      cumulativeLines.push(code);
      cumulativeLines.push("");

      results.push({
        step: action.step_number,
        code: stepCode,
        description: action.description,
        cumulative: cumulativeLines.join("\n"),
      });
    }

    return results;
  }

  /**
   * Basic Python syntax validation for CadQuery scripts.
   * Checks: matching parens/brackets, indentation, known methods.
   */
  validateSyntax(script: string): SyntaxCheckResult {
    const errors: string[] = [];
    const lines = script.split("\n");

    // Check matching parentheses and brackets
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Skip comments and blank lines
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || trimmed === "") continue;

      for (const ch of line) {
        if (ch === "(") parenDepth++;
        if (ch === ")") parenDepth--;
        if (ch === "[") bracketDepth++;
        if (ch === "]") bracketDepth--;
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      if (parenDepth < 0) {
        errors.push(`Line ${lineNum}: unmatched closing parenthesis`);
        parenDepth = 0;
      }
      if (bracketDepth < 0) {
        errors.push(`Line ${lineNum}: unmatched closing bracket`);
        bracketDepth = 0;
      }

      // Check for common CadQuery errors
      if (/\.extrude\(\)/.test(line)) {
        errors.push(
          `Line ${lineNum}: extrude() requires a depth argument`,
        );
      }
      if (/\.fillet\(\)/.test(line)) {
        errors.push(
          `Line ${lineNum}: fillet() requires a radius argument`,
        );
      }
      if (/\.chamfer\(\)/.test(line)) {
        errors.push(
          `Line ${lineNum}: chamfer() requires a size argument`,
        );
      }

      // Check for mixed tabs/spaces (Python indentation issue)
      if (/^\t /.test(line) || /^ \t/.test(line)) {
        errors.push(
          `Line ${lineNum}: mixed tabs and spaces in indentation`,
        );
      }
    }

    if (parenDepth !== 0) {
      errors.push(`Unmatched parentheses: ${parenDepth} unclosed`);
    }
    if (bracketDepth !== 0) {
      errors.push(`Unmatched brackets: ${bracketDepth} unclosed`);
    }
    if (braceDepth !== 0) {
      errors.push(`Unmatched braces: ${braceDepth} unclosed`);
    }

    // Verify import
    if (!script.includes("import cadquery")) {
      errors.push("Missing 'import cadquery' statement");
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Make a script parametric by extracting numeric values
   * into named variables at the top of the script.
   */
  makeParametric(
    script: string,
    actions: ExtractedAction[],
  ): string {
    const paramDefs: string[] = [];
    const paramMap = new Map<string, string>();
    let paramScript = script;

    // Collect all parameters from actions
    for (const action of actions) {
      for (const [key, val] of Object.entries(action.parameters)) {
        if (typeof val === "number") {
          const varName = `${action.action_type}_${key}`;
          const safeName = varName.replace(/[^a-zA-Z0-9_]/g, "_");
          if (!paramMap.has(safeName)) {
            const ts = this._formatTimestamp(action.timestamp_s);
            paramDefs.push(
              `${safeName} = ${val}  # from video @${ts}`,
            );
            paramMap.set(safeName, String(val));
          }
        }
      }
    }

    if (paramDefs.length === 0) return script;

    // Insert parameter block after import
    const importEnd = script.indexOf("\n\n");
    if (importEnd >= 0) {
      const before = script.slice(0, importEnd);
      const after = script.slice(importEnd);
      paramScript = before
        + "\n\n# ── Parameters ──\n"
        + paramDefs.join("\n")
        + "\n"
        + after;
    }

    // Replace numeric literals with variable names
    for (const [varName, val] of paramMap) {
      // Replace in method calls: .extrude(25) → .extrude(varName)
      // Only replace exact numeric matches inside parens
      const numPattern = new RegExp(
        `(\\(|,\\s*)${val.replace(".", "\\.")}(\\)|,)`,
        "g",
      );
      paramScript = paramScript.replace(
        numPattern,
        (_, pre, post) => `${pre}${varName}${post}`,
      );
    }

    return paramScript;
  }

  // ── Private helpers ────────────────────────────────────────────

  private _formatTimestamp(seconds: number): string {
    const mm = Math.floor(seconds / 60);
    const ss = Math.floor(seconds % 60);
    return `${mm}:${String(ss).padStart(2, "0")}`;
  }

  private _needsWorkplane(action: ExtractedAction): boolean {
    const solidOps = [
      "extrude", "extrude_cut", "revolve", "sweep", "loft",
      "fillet", "chamfer", "hole", "shell",
    ];
    return solidOps.includes(action.action_type);
  }

  private _isSolidAction(type: string): boolean {
    return [
      "extrude", "extrude_cut", "revolve", "sweep", "loft",
    ].includes(type);
  }
}

export const cadQueryCodeGeneratorEngine = new CadQueryCodeGeneratorEngine();
