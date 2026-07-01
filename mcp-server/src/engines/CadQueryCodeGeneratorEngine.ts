/**
 * CadQueryCodeGeneratorEngine — CadQuery Script Generation + Execution
 *
 * Generates CadQuery Python scripts from video action sequences or natural-
 * language descriptions, executes them via cadquery-executor.py, and returns
 * geometry metrics + STEP/STL exports.
 *
 * Two-layer architecture:
 *   TypeScript (this engine): script generation, syntax validation, prompt
 *   Python (cadquery-executor.py): CadQuery 2.x + OpenCascade solid modeling
 *
 * Prompt source: CADQUERY_CODEGEN_PROMPT adapted from CQAsk / cad_prompts.py
 */
import { spawn } from "child_process";
import { writeFileSync, unlinkSync, rmdirSync, mkdtempSync } from "fs";
import * as path from "path";
import * as os from "os";
import { log } from "../utils/Logger.js";
import { PATHS } from "../constants.js";
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

export interface CadQueryExecutionResult {
  success: boolean;
  volume_mm3?: number;
  bounding_box?: [number, number, number];
  center?: [number, number, number];
  face_count?: number;
  edge_count?: number;
  vertex_count?: number;
  is_valid?: boolean;
  execution_time_ms?: number;
  output_file?: string;
  output_files?: string[];
  error?: string;
  traceback?: string;
}

// ── Prompt ─────────────────────────────────────────────────────────
// Ported from H:/prism/cad-engine/src/prompts/cad_prompts.py
// Pipeline: NL description → LLM (with this prompt) → CadQuery code

export const CADQUERY_CODEGEN_PROMPT = `\
You are an expert CadQuery programmer generating executable Python code for
3D part creation. Translate the feature description into CadQuery 2.x code.

RULES:
1. Output ONLY executable Python code — no explanations or markdown fences.
2. Final result MUST be assigned to \`result\` (cq.Workplane).
3. NEVER use show_object(), show(), display(), or visualization functions.
4. Always \`import cadquery as cq\` at the top.
5. Default unit is millimeters. Build parametrically when dimensions are given.
6. For complex parts, build step-by-step using CadQuery's fluent API.

CadQuery API Reference:

WORKPLANE CREATION:
  cq.Workplane("XY" | "XZ" | "YZ")

2D SKETCHING:
  .center(x, y) — shift local origin
  .rect(xLen, yLen) — rectangle
  .circle(radius) — circle
  .ellipse(x_radius, y_radius) — ellipse
  .slot2D(length, diameter) — rounded slot
  .polygon(nSides, diameter) — regular polygon
  .polyline([(x1,y1), ...]) — polyline from points
  .spline([(x1,y1), ...]) — spline through points
  .lineTo(x, y) / .line(dx, dy) — draw line
  .hLine(dist) / .vLine(dist) — horizontal/vertical line
  .hLineTo(x) / .vLineTo(y) — line to coordinate
  .threePointArc(p1, p2) — arc through 3 points
  .sagittaArc(endPoint, sag) — arc by sagitta
  .radiusArc(endPoint, radius) — arc by radius
  .tangentArcPoint(endpoint) — tangent arc
  .moveTo(x, y) — move without drawing
  .polarLine(distance, angle) — line at angle
  .parametricCurve(func) — spline from function
  .mirrorX() / .mirrorY() — mirror sketch
  .close() — close wire
  .offset2D(d) — offset wire

3D OPERATIONS:
  .extrude(distance) — extrude sketch
  .cut(shape) — boolean subtract
  .union(shape) — boolean add
  .intersect(shape) — boolean intersect
  .revolve(angleDegrees, axisStart, axisEnd) — revolve sketch
  .sweep(path, isFrenet=True, transition='transformed') — sweep along path
  .loft(ruled=False, combine=True) — loft between sections
  .shell(thickness) — hollow shell
  .fillet(radius) — fillet edges
  .chamfer(distance) — chamfer edges
  .hole(diameter, depth=None) — through or blind hole

SELECTORS (for .faces(), .edges(), .vertices()):
  ">Z" — topmost, "<Z" — bottommost
  ">X", "<X", ">Y", "<Y" — directional extremes
  "|Z" — parallel to Z axis
  "#Z" — perpendicular to Z axis
  ">>Z[-2]" — second from top
  Combine: .faces(">Z").edges("|X")

POSITIONING:
  .translate((x, y, z))
  .rotate((ax, ay, az), (bx, by, bz), angleDeg)
  .mirror("XY" | "XZ" | "YZ")

PATTERNS:
  .rarray(xSpacing, ySpacing, xCount, yCount) — rectangular array
  .polarArray(radius, startAngle, angle, count) — polar/circular array
  .pushPoints([(x1,y1), ...]) — place at specific points

ASSEMBLIES:
  assy = cq.Assembly()
  assy.add(part, name="...", loc=cq.Location((x,y,z)))

GEAR GENERATION (via cq_gears):
  import cq_gears
  cq_gears.SpurGear(module, teeth_number, width, pressure_angle=20.0,
                    helix_angle=0.0, bore_d=0)
  cq_gears.BevelGear(module, teeth_number, cone_angle, face_width,
                     pressure_angle=20.0, bore_d=0)
  cq_gears.RackGear(module, length, width, height, pressure_angle=20.0)
  cq_gears.RingGear(module, teeth_number, width, rim_width,
                    pressure_angle=20.0, bore_d=0)
  cq_gears.Worm(module, lead_angle, n_threads, length,
                pressure_angle=20.0, bore_d=0)
  result = cq.Workplane('XY').gear(gear_object)

AIRFOIL GENERATION (via parafoil):
  import parafoil
  foil = parafoil.NACAAirfoil("2412", chord_length)
  foil = parafoil.CamberThicknessAirfoil(inlet_angle, outlet_angle,
                                          chord_length, angle_units="deg")
  coords = foil.get_coords()
  result = cq.Workplane('XY').polyline(coords).close().extrude(span)

EXAMPLES:

Box with hole:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .rect(50, 30).extrude(10)
      .faces(">Z").workplane().hole(8))

Flanged cylinder:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .circle(20).extrude(5)
      .faces(">Z").workplane()
      .circle(10).extrude(30)
      .faces(">Z").workplane().hole(6))

Bracket with fillets:
  import cadquery as cq
  result = (cq.Workplane("XY")
      .rect(40, 60).extrude(5)
      .faces(">Z").workplane()
      .center(0, 20)
      .rect(10, 40).extrude(30)
      .edges("|Z").fillet(3))
`;

// ── Executor paths ────────────────────────────────────────────────

const EXECUTOR_SCRIPT = path.resolve(
  PATHS.PRISM_ROOT,
  "mcp-server",
  "scripts",
  "cadquery-executor.py",
);

// ── Engine ─────────────────────────────────────────────────────────

export class CadQueryCodeGeneratorEngine {
  /**
   * Return the CadQuery code generation prompt for LLM-assisted code synthesis.
   * Use as system prompt when calling an LLM to generate CadQuery from NL descriptions.
   */
  getCodeGenPrompt(): string {
    return CADQUERY_CODEGEN_PROMPT;
  }

  /**
   * Execute a CadQuery Python script via cadquery-executor.py.
   * Returns geometry metrics (volume, bbox, topology) and optional STEP/STL export.
   */
  async executeScript(
    script: string,
    options?: { output_path?: string; format?: "step" | "stl" | "both" },
  ): Promise<CadQueryExecutionResult> {
    // Write script to temp file to avoid CLI arg quoting issues on Windows
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "prism-cq-"));
    const tmpFile = path.join(tmpDir, "script.py");
    writeFileSync(tmpFile, script, "utf-8");

    const args = [EXECUTOR_SCRIPT, "--file", tmpFile];
    if (options?.output_path) {
      args.push("--output", options.output_path);
    }
    if (options?.format) {
      args.push("--format", options.format);
    }

    return new Promise<CadQueryExecutionResult>((resolve) => {
      const chunks: Buffer[] = [];
      const errChunks: Buffer[] = [];
      const proc = spawn(PATHS.PYTHON, args, {
        timeout: 60_000,
        cwd: path.dirname(EXECUTOR_SCRIPT),
      });

      proc.stdout.on("data", (d: Buffer) => chunks.push(d));
      proc.stderr.on("data", (d: Buffer) => errChunks.push(d));

      const cleanup = () => {
        try { unlinkSync(tmpFile); } catch { /* ignore */ }
        try { rmdirSync(tmpDir); } catch { /* ignore */ }
      };

      proc.on("close", (code) => {
        cleanup();
        const stdout = Buffer.concat(chunks).toString().trim();
        const stderr = Buffer.concat(errChunks).toString().trim();

        // Executor returns JSON even on failure (exit code 1) — try parsing first
        if (stdout) {
          try {
            const parsed = JSON.parse(stdout) as CadQueryExecutionResult;
            resolve(parsed);
            return;
          } catch {
            log.warn(`[CadQueryExecutor] Invalid JSON: ${stdout.slice(0, 200)}`);
          }
        }

        // No parseable output — fallback to generic error
        if (code !== 0 || !stdout) {
          log.warn(`[CadQueryExecutor] exit=${code} stderr=${stderr}`);
          resolve({
            success: false,
            error: stderr || `Process exited with code ${code}`,
          });
          return;
        }

        resolve({ success: false, error: `Invalid executor output: ${stdout.slice(0, 200)}` });
      });

      proc.on("error", (err) => {
        cleanup();
        log.error(`[CadQueryExecutor] spawn error: ${err.message}`);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Generate a CadQuery script from actions, then execute it.
   * Convenience method combining generateScript() + executeScript().
   */
  async generateAndExecute(
    actions: ExtractedAction[],
    options?: { output_path?: string; format?: "step" | "stl" | "both" },
  ): Promise<{ script: GeneratedScript; execution: CadQueryExecutionResult }> {
    const script = this.generateScript(actions);
    const execution = await this.executeScript(script.script, options);
    return { script, execution };
  }

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

      const code = this._actionToCode(action);
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

      const code = this._actionToCode(action);
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

  /**
   * Translate a single extracted CAD action into a CadQuery Python expression.
   * Returns a real cadquery line for emittable ops, a descriptive comment for ops
   * with no single-line cadquery equivalent (assembly/CAM/pattern/boolean across
   * bodies), or "# unknown action '<type>'" for unrecognized types (the caller
   * surfaces those as warnings). Geometry params are read from action.parameters.
   */
  private _actionToCode(action: ExtractedAction): string {
    const p = action.parameters || {};
    const n = (key: string, dflt: number): number => {
      const v = p[key];
      const parsed = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
      return Number.isFinite(parsed) ? parsed : dflt;
    };
    const str = (key: string, dflt: string): string => {
      const v = p[key];
      return typeof v === "string" && v ? v : typeof v === "number" ? String(v) : dflt;
    };

    switch (action.action_type) {
      // -- Sketch --
      case "sketch_create":
        return `result = cq.Workplane('${str("plane", "XY")}')`;
      case "sketch_line":
        return `result = result.lineTo(${n("x", 0)}, ${n("y", 0)})`;
      case "sketch_arc":
        return `result = result.threePointArc((${n("mid_x", 0)}, ${n("mid_y", 0)}), (${n("end_x", 0)}, ${n("end_y", 0)}))`;
      case "sketch_circle":
        return `result = result.circle(${n("radius", n("diameter", 10) / 2)})`;
      case "sketch_rectangle":
        return `result = result.rect(${n("width", 10)}, ${n("height", 10)})`;
      case "sketch_spline":
        return `result = result.spline([(0, 0), (${n("x", 10)}, ${n("y", 10)})])  # approximate spline`;
      case "sketch_offset":
        return `result = result.offset2D(${n("distance", 1)})`;
      case "sketch_close":
        return `result = result.close()`;
      case "sketch_dimension":
      case "sketch_constraint":
        return `# ${action.action_type} (implicit in parametric CadQuery)`;
      case "sketch_trim":
      case "sketch_mirror":
        return `# ${action.action_type} (no direct CadQuery op; encode geometrically)`;

      // -- Solid features --
      case "extrude":
        return `result = result.extrude(${n("distance", n("depth", 10))})`;
      case "extrude_cut":
        return `result = result.cutBlind(-${Math.abs(n("distance", n("depth", 10)))})`;
      case "revolve":
        return `result = result.revolve(${n("angle", 360)})`;
      case "sweep":
        return `# sweep: result = result.sweep(path)  # define the path wire first`;
      case "loft":
        return `result = result.loft()`;
      case "fillet":
        return `result = result.edges().fillet(${n("radius", 1)})`;
      case "chamfer":
        return `result = result.edges().chamfer(${n("distance", n("radius", 1))})`;
      case "shell":
        return `result = result.shell(${-Math.abs(n("thickness", 2))})`;
      case "draft":
        return `# draft ${n("angle", 3)}deg (apply via tapered extrude in CadQuery)`;
      case "hole":
        return `result = result.faces('>Z').workplane().hole(${n("diameter", n("radius", 3) * 2)})`;

      // -- Boolean (across bodies) --
      case "boolean_union":
        return `# boolean_union: result = result.union(other_solid)`;
      case "boolean_subtract":
        return `# boolean_subtract: result = result.cut(other_solid)`;
      case "boolean_intersect":
        return `# boolean_intersect: result = result.intersect(other_solid)`;

      // -- Pattern / mirror --
      case "pattern_linear":
        return `# pattern_linear: result = result.rarray(${n("spacing_x", 10)}, ${n("spacing_y", 10)}, ${n("count_x", 2)}, ${n("count_y", 1)})`;
      case "pattern_circular":
        return `# pattern_circular: result = result.polarArray(${n("radius", 10)}, 0, 360, ${n("count", 4)})`;
      case "mirror_body":
        return `result = result.mirror('${str("plane", "XY")}')`;

      // -- Assembly (separate cq.Assembly graph) --
      case "assembly_insert":
      case "assembly_mate":
      case "assembly_constrain":
        return `# ${action.action_type}: build via cq.Assembly().add(...).constrain(...)`;

      // -- CAM ops (not CadQuery geometry) --
      case "toolpath_create":
      case "toolpath_2d":
      case "toolpath_3d":
      case "toolpath_drill":
        return `# ${action.action_type} (CAM operation; not emitted to CadQuery geometry)`;

      // -- Parametric --
      case "parameter_set":
        return `${str("name", "param")} = ${n("value", 0)}`;
      case "material_assign":
        return `# material: ${str("material", str("name", "unspecified"))}`;

      // -- UI / no-op --
      case "view_change":
      case "selection":
      case "menu_navigate":
        return `# (UI: ${action.operation || action.action_type})`;

      case "unknown":
      default:
        return `# unknown action '${action.action_type}'`;
    }
  }
}

export const cadQueryCodeGeneratorEngine = new CadQueryCodeGeneratorEngine();
