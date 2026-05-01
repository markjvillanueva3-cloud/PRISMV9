/**
 * VideoReplayPipelineEngine — Real End-to-End Video-to-CAD Pipeline
 * Orchestrates: Video → FFmpeg → Claude Vision → Actions → CadQuery → STEP/STL
 *
 * Entry points:
 *  - runFullPipeline()    — from video file (full pipeline)
 *  - runFromDescription() — from text description (demo mode)
 *  - runFromActions()     — from pre-built actions (programmatic)
 *  - executeCadQuery()    — standalone CadQuery execution
 */
import { log } from "../utils/Logger.js";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ExtractedAction } from "./VideoActionExtractorEngine.js";
import {
  videoActionExtractorEngine,
} from "./VideoActionExtractorEngine.js";
import {
  cadQueryCodeGeneratorEngine,
} from "./CadQueryCodeGeneratorEngine.js";
import {
  visionActionAnalyzerEngine,
} from "./VisionActionAnalyzerEngine.js";

const execFileAsync = promisify(execFile);

const PYTHON =
  "C:/Users/Admin.DIGITALSTORM-PC/AppData/Local/Programs/" +
  "Python/Python312/python.exe";

const CADQUERY_EXECUTOR = path.resolve(
  import.meta.dirname,
  "../../scripts/cadquery-executor.py",
);

// ── Types ──────────────────────────────────────────────────────────

export interface PipelineOptions {
  output_dir?: string;
  output_format?: "step" | "stl" | "both";
  parametric?: boolean;
  model?: "claude-sonnet-4-20250514" | "claude-opus-4-20250514";
  frame_interval_s?: number;
  max_frames?: number;
  dry_run?: boolean;
  description_mode?: boolean;
}

export interface PipelineResult {
  success: boolean;
  mode: "video" | "description" | "actions";
  steps_completed: string[];
  actions_extracted: number;
  actions_executed: number;
  generated_script: string;
  geometry?: {
    volume_mm3: number;
    bounding_box: [number, number, number];
    face_count: number;
    edge_count: number;
    is_valid: boolean;
  };
  output_file?: string;
  report: string;
  timing: Record<string, number>;
  errors: string[];
  api_calls?: number;
  tokens_used?: number;
}

export interface CadQueryResult {
  success: boolean;
  volume_mm3?: number;
  bounding_box?: [number, number, number];
  face_count?: number;
  edge_count?: number;
  vertex_count?: number;
  is_valid?: boolean;
  execution_time_ms: number;
  output_file?: string;
  error?: string;
}

export interface PrerequisiteStatus {
  ffmpeg: boolean;
  python: boolean;
  cadquery: boolean;
  api_key: boolean;
  all_ok: boolean;
}

// ── Engine ─────────────────────────────────────────────────────────

export class VideoReplayPipelineEngine {
  /**
   * Check all required tools/services are available.
   */
  async checkPrerequisites(): Promise<PrerequisiteStatus> {
    const status: PrerequisiteStatus = {
      ffmpeg: false,
      python: false,
      cadquery: false,
      api_key: false,
      all_ok: false,
    };

    // Check FFmpeg
    try {
      const { stdout } = await execFileAsync("ffmpeg", ["-version"], {
        timeout: 5000,
      });
      status.ffmpeg = stdout.includes("ffmpeg version");
    } catch {
      status.ffmpeg = false;
    }

    // Check Python
    try {
      const { stdout } = await execFileAsync(PYTHON, ["--version"], {
        timeout: 5000,
      });
      status.python = stdout.includes("Python 3");
    } catch {
      // Try fallback "python" command
      try {
        const { stdout } = await execFileAsync("python", ["--version"], {
          timeout: 5000,
        });
        status.python = stdout.includes("Python 3");
      } catch {
        status.python = false;
      }
    }

    // Check CadQuery
    if (status.python) {
      try {
        const pyCmd = fs.existsSync(PYTHON) ? PYTHON : "python";
        const { stdout } = await execFileAsync(
          pyCmd,
          ["-c", "import cadquery; print(cadquery.__version__)"],
          { timeout: 15000 },
        );
        status.cadquery = stdout.trim().length > 0;
      } catch {
        status.cadquery = false;
      }
    }

    // Check API key
    status.api_key = !!(
      process.env.ANTHROPIC_API_KEY &&
      process.env.ANTHROPIC_API_KEY.length > 10
    );

    status.all_ok =
      status.ffmpeg && status.python && status.cadquery && status.api_key;

    return status;
  }

  /**
   * FULL PIPELINE: Video file → STEP/STL geometry.
   *
   * Steps:
   *  1. Validate inputs & prerequisites
   *  2. Extract keyframes (FFmpeg)
   *  3. Analyze frames with Claude Vision
   *  4. Validate action sequence
   *  5. Generate CadQuery script
   *  6. Execute CadQuery via Python
   *  7. Verify geometry
   *  8. Generate report
   */
  async runFullPipeline(
    videoPath: string,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    const timing: Record<string, number> = {};
    const steps: string[] = [];
    const errors: string[] = [];
    let script = "";
    let totalApiCalls = 0;
    let totalTokens = 0;

    const outputDir =
      options?.output_dir ||
      path.join(process.env.TEMP || "C:/tmp", `prism-replay-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFormat = options?.output_format || "step";
    const outputExt = outputFormat === "stl" ? ".stl" : ".step";
    const outputFile = path.join(outputDir, `replay_result${outputExt}`);

    // Step 1: Validate inputs
    const t1 = Date.now();
    if (!fs.existsSync(videoPath)) {
      return this.failResult(
        "video",
        `Video file not found: ${videoPath}`,
        steps,
        timing,
      );
    }

    const prereqs = await this.checkPrerequisites();
    if (!prereqs.ffmpeg) {
      errors.push("FFmpeg not available");
    }
    if (!prereqs.api_key) {
      errors.push("ANTHROPIC_API_KEY not set");
    }
    if (!prereqs.ffmpeg || !prereqs.api_key) {
      return this.failResult("video", errors.join("; "), steps, timing);
    }
    timing["1_validate"] = Date.now() - t1;
    steps.push("validate_inputs");

    // Step 2: Extract keyframes
    const t2 = Date.now();
    let frames: string[];
    try {
      frames = await visionActionAnalyzerEngine.extractKeyframes(
        videoPath,
        path.join(outputDir, "frames"),
        options?.frame_interval_s ?? 2,
      );
      if (options?.max_frames && frames.length > options.max_frames) {
        frames = frames.slice(0, options.max_frames);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.failResult("video", `Keyframe extraction: ${msg}`, steps, timing);
    }
    timing["2_extract_keyframes"] = Date.now() - t2;
    steps.push("extract_keyframes");
    log.info(`[ReplayPipeline] Extracted ${frames.length} keyframes`);

    // Step 3: Analyze frames with Vision
    const t3 = Date.now();
    let actions: ExtractedAction[];
    try {
      actions = await visionActionAnalyzerEngine.analyzeLocalFrames(
        frames,
        { model: options?.model },
      );
      totalApiCalls = Math.max(0, frames.length - 1);
      totalTokens = totalApiCalls * 1500;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return this.failResult("video", `Vision analysis: ${msg}`, steps, timing);
    }
    timing["3_vision_analysis"] = Date.now() - t3;
    steps.push("vision_analysis");
    log.info(`[ReplayPipeline] ${actions.length} actions from Vision API`);

    // Steps 4-8: shared with other entry points
    return this.runFromActionsInternal(
      actions,
      "video",
      options,
      outputFile,
      outputDir,
      steps,
      timing,
      errors,
      totalApiCalls,
      totalTokens,
    );
  }

  /**
   * Demo mode: text description → CadQuery → STEP/STL.
   * Skips video/vision steps; parses description into actions via keyword classifier.
   *
   * Example: "Create a 50x30mm rectangle, extrude 25mm, fillet edges 3mm"
   */
  async runFromDescription(
    description: string,
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    const timing: Record<string, number> = {};
    const steps: string[] = [];
    const errors: string[] = [];

    if (!description || description.trim().length === 0) {
      return this.failResult(
        "description",
        "Empty description provided",
        steps,
        timing,
      );
    }

    const outputDir =
      options?.output_dir ||
      path.join(process.env.TEMP || "C:/tmp", `prism-replay-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFormat = options?.output_format || "step";
    const outputExt = outputFormat === "stl" ? ".stl" : ".step";
    const outputFile = path.join(outputDir, `replay_result${outputExt}`);

    // Parse description into actions
    const t1 = Date.now();
    const phrases = description
      .split(/[,;.]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const actions: ExtractedAction[] = [];
    let stepNum = 1;

    for (const phrase of phrases) {
      const classified = videoActionExtractorEngine.classifyAction(phrase);
      if (classified.action_type !== "unknown") {
        actions.push({
          step_number: stepNum++,
          timestamp_s: 0,
          action_type: classified.action_type,
          operation: classified.action_type,
          parameters: classified.parameters,
          confidence: classified.confidence,
          description: phrase,
          keyframe_index: 0,
        });
      }
    }
    timing["1_parse_description"] = Date.now() - t1;
    steps.push("parse_description");

    if (actions.length === 0) {
      return this.failResult(
        "description",
        "No valid CAD operations parsed from description",
        steps,
        timing,
      );
    }

    return this.runFromActionsInternal(
      actions,
      "description",
      options,
      outputFile,
      outputDir,
      steps,
      timing,
      errors,
      0,
      0,
    );
  }

  /**
   * Programmatic mode: pre-built ExtractedAction[] → CadQuery → STEP/STL.
   * Skips video AND classification.
   */
  async runFromActions(
    actions: ExtractedAction[],
    options?: PipelineOptions,
  ): Promise<PipelineResult> {
    const timing: Record<string, number> = {};
    const steps: string[] = [];
    const errors: string[] = [];

    const outputDir =
      options?.output_dir ||
      path.join(process.env.TEMP || "C:/tmp", `prism-replay-${Date.now()}`);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFormat = options?.output_format || "step";
    const outputExt = outputFormat === "stl" ? ".stl" : ".step";
    const outputFile = path.join(outputDir, `replay_result${outputExt}`);

    return this.runFromActionsInternal(
      actions,
      "actions",
      options,
      outputFile,
      outputDir,
      steps,
      timing,
      errors,
      0,
      0,
    );
  }

  /**
   * Execute a CadQuery Python script via subprocess.
   * Returns geometry metrics parsed from stdout JSON.
   */
  async executeCadQuery(
    script: string,
    outputPath?: string,
  ): Promise<CadQueryResult> {
    const pyExe = fs.existsSync(PYTHON) ? PYTHON : "python";
    const startMs = Date.now();

    // Write script to temp file
    const tmpDir = process.env.TEMP || "C:/tmp";
    fs.mkdirSync(tmpDir, { recursive: true });
    const tmpScript = path.join(tmpDir, `cq_script_${Date.now()}.py`);
    fs.writeFileSync(tmpScript, script, "utf-8");

    try {
      const args = [CADQUERY_EXECUTOR, "--file", tmpScript];
      if (outputPath) {
        // Ensure output directory exists
        const outDir = path.dirname(outputPath);
        fs.mkdirSync(outDir, { recursive: true });
        args.push("--output", outputPath);
      }

      let stdout: string;
      let usedExecutor = true;

      // Try using cadquery-executor.py if it exists
      if (fs.existsSync(CADQUERY_EXECUTOR)) {
        const result = await execFileAsync(pyExe, args, {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        });
        stdout = result.stdout;
      } else {
        // Fallback: run script directly and extract metrics inline
        usedExecutor = false;
        const inlineCode = this.buildInlineExecutor(script, outputPath);
        const result = await execFileAsync(pyExe, ["-c", inlineCode], {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        });
        stdout = result.stdout;
      }

      const elapsed = Date.now() - startMs;
      const parsed = JSON.parse(stdout.trim().split("\n").pop() || "{}");

      return {
        success: parsed.success === true,
        volume_mm3: parsed.volume_mm3,
        bounding_box: parsed.bounding_box,
        face_count: parsed.face_count,
        edge_count: parsed.edge_count,
        vertex_count: parsed.vertex_count,
        is_valid: parsed.is_valid,
        execution_time_ms: elapsed,
        output_file: parsed.output_file || outputPath,
        error: parsed.error,
      };
    } catch (err: unknown) {
      const elapsed = Date.now() - startMs;
      // Try to parse JSON from stderr or stdout
      const errObj = err as { stdout?: string; stderr?: string; message?: string };
      let errorMsg = errObj.message || String(err);

      // The executor exits with code 1 on failure but still outputs JSON
      if (errObj.stdout) {
        try {
          const lastLine = errObj.stdout.trim().split("\n").pop() || "";
          const parsed = JSON.parse(lastLine);
          return {
            success: false,
            execution_time_ms: elapsed,
            error: parsed.error || errorMsg,
          };
        } catch {
          // JSON parse failed, use raw error
        }
      }

      return {
        success: false,
        execution_time_ms: elapsed,
        error: errorMsg,
      };
    } finally {
      // Clean up temp script
      try {
        fs.unlinkSync(tmpScript);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  // ── Private Helpers ───────────────────────────────────────────────

  /**
   * Shared pipeline logic for steps 4-8 (validate → generate → execute → verify → report).
   */
  private async runFromActionsInternal(
    actions: ExtractedAction[],
    mode: "video" | "description" | "actions",
    options: PipelineOptions | undefined,
    outputFile: string,
    outputDir: string,
    steps: string[],
    timing: Record<string, number>,
    errors: string[],
    apiCalls: number,
    tokensUsed: number,
  ): Promise<PipelineResult> {
    // Step 4: Validate action sequence
    const t4 = Date.now();
    const validated = videoActionExtractorEngine.validateSequence(actions);
    const cleanActions = validated.cleaned_actions;
    if (validated.warnings.length > 0) {
      errors.push(...validated.warnings);
    }
    timing["4_validate_sequence"] = Date.now() - t4;
    steps.push("validate_sequence");

    // Step 5: Generate CadQuery script
    const t5 = Date.now();
    const generated = cadQueryCodeGeneratorEngine.generateScript(cleanActions);
    let script = generated.script;
    if (generated.warnings.length > 0) {
      errors.push(...generated.warnings);
    }

    if (options?.parametric) {
      script = cadQueryCodeGeneratorEngine.makeParametric(
        script,
        cleanActions,
      );
    }
    timing["5_generate_script"] = Date.now() - t5;
    steps.push("generate_script");

    log.info(
      `[ReplayPipeline] Generated CadQuery script ` +
      `(${script.split("\n").length} lines)`,
    );

    // Step 6: Execute CadQuery (unless dry_run)
    let geometry: PipelineResult["geometry"] | undefined;
    let actualOutput: string | undefined;

    if (!options?.dry_run) {
      const t6 = Date.now();
      const prereqs = await this.checkPrerequisites();
      if (!prereqs.python || !prereqs.cadquery) {
        errors.push(
          "Python/CadQuery not available — skipping execution. " +
          "Set dry_run=true to generate code only.",
        );
      } else {
        const cqResult = await this.executeCadQuery(script, outputFile);
        timing["6_execute_cadquery"] = Date.now() - t6;
        steps.push("execute_cadquery");

        if (cqResult.success) {
          geometry = {
            volume_mm3: cqResult.volume_mm3 || 0,
            bounding_box: cqResult.bounding_box || [0, 0, 0],
            face_count: cqResult.face_count || 0,
            edge_count: cqResult.edge_count || 0,
            is_valid: cqResult.is_valid ?? false,
          };
          actualOutput = cqResult.output_file;
          steps.push("verify_geometry");
        } else {
          errors.push(`CadQuery execution failed: ${cqResult.error}`);
        }
      }
    } else {
      steps.push("dry_run_skip_execution");
    }

    // Step 8: Generate report
    const report = this.generateReport(
      mode,
      cleanActions,
      script,
      geometry,
      actualOutput,
      timing,
      errors,
      apiCalls,
      tokensUsed,
    );
    steps.push("generate_report");

    return {
      success: errors.filter((e) => !e.startsWith("Step ")).length === 0
        && (!!geometry || !!options?.dry_run),
      mode,
      steps_completed: steps,
      actions_extracted: actions.length,
      actions_executed: cleanActions.length,
      generated_script: script,
      geometry,
      output_file: actualOutput,
      report,
      timing,
      errors,
      api_calls: apiCalls,
      tokens_used: tokensUsed,
    };
  }

  /** Build inline Python code for CadQuery execution when executor script is missing. */
  private buildInlineExecutor(script: string, outputPath?: string): string {
    // Escape the script for embedding in Python string
    const escaped = script
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/\n/g, "\\n");

    let code = `
import cadquery as cq
import json, time, sys

code = '${escaped}'
namespace = {"cq": cq, "cadquery": cq, "math": __import__("math")}
start = time.perf_counter()
try:
    exec(code, namespace)
    elapsed = (time.perf_counter() - start) * 1000
    result = namespace.get("result") or namespace.get("part")
    if result is None:
        for k in reversed(list(namespace.keys())):
            obj = namespace[k]
            if hasattr(obj, "val") and hasattr(obj, "faces"):
                result = obj
                break
    if result is None:
        print(json.dumps({"success": False, "error": "No result found"}))
        sys.exit(1)
    bb = result.val().BoundingBox()
    metrics = {
        "success": True,
        "volume_mm3": round(result.val().Volume(), 4),
        "bounding_box": [round(bb.xlen,4), round(bb.ylen,4), round(bb.zlen,4)],
        "face_count": len(result.val().Faces()),
        "edge_count": len(result.val().Edges()),
        "vertex_count": len(result.val().Vertices()),
        "is_valid": result.val().isValid(),
        "execution_time_ms": round(elapsed, 2)
    }`;

    if (outputPath) {
      const escapedPath = outputPath.replace(/\\/g, "\\\\");
      code += `
    from cadquery import exporters
    exporters.export(result, '${escapedPath}')
    metrics["output_file"] = '${escapedPath}'`;
    }

    code += `
    print(json.dumps(metrics))
except Exception as e:
    elapsed = (time.perf_counter() - start) * 1000
    print(json.dumps({
        "success": False,
        "error": f"{type(e).__name__}: {str(e)}",
        "execution_time_ms": round(elapsed, 2)
    }))
    sys.exit(1)
`;
    return code;
  }

  /** Generate a markdown report summarizing the pipeline run. */
  private generateReport(
    mode: string,
    actions: ExtractedAction[],
    script: string,
    geometry: PipelineResult["geometry"] | undefined,
    outputFile: string | undefined,
    timing: Record<string, number>,
    errors: string[],
    apiCalls: number,
    tokensUsed: number,
  ): string {
    const lines: string[] = [];
    lines.push("# Video Replay Pipeline Report");
    lines.push("");
    lines.push(`**Mode:** ${mode}`);
    lines.push(`**Date:** ${new Date().toISOString()}`);
    lines.push("");

    // Actions
    lines.push("## Actions Extracted");
    lines.push(`Total: ${actions.length}`);
    for (const a of actions) {
      lines.push(
        `  ${a.step_number}. ${a.action_type} — ${a.description} ` +
        `(confidence: ${(a.confidence * 100).toFixed(0)}%)`,
      );
    }
    lines.push("");

    // Generated Script
    lines.push("## Generated CadQuery Script");
    lines.push("```python");
    lines.push(script);
    lines.push("```");
    lines.push("");

    // Geometry
    if (geometry) {
      lines.push("## Geometry Results");
      lines.push(`- **Volume:** ${geometry.volume_mm3.toFixed(2)} mm^3`);
      lines.push(
        `- **Bounding Box:** ${geometry.bounding_box[0].toFixed(2)} x ` +
        `${geometry.bounding_box[1].toFixed(2)} x ` +
        `${geometry.bounding_box[2].toFixed(2)} mm`,
      );
      lines.push(`- **Faces:** ${geometry.face_count}`);
      lines.push(`- **Edges:** ${geometry.edge_count}`);
      lines.push(`- **Valid:** ${geometry.is_valid}`);
      if (outputFile) {
        lines.push(`- **Output:** ${outputFile}`);
      }
      lines.push("");
    }

    // API usage
    if (apiCalls > 0) {
      lines.push("## API Usage");
      lines.push(`- **Calls:** ${apiCalls}`);
      lines.push(`- **Tokens (est):** ${tokensUsed}`);
      lines.push("");
    }

    // Timing
    lines.push("## Timing");
    for (const [step, ms] of Object.entries(timing)) {
      lines.push(`- ${step}: ${ms}ms`);
    }
    const totalMs = Object.values(timing).reduce((a, b) => a + b, 0);
    lines.push(`- **Total:** ${totalMs}ms`);
    lines.push("");

    // Errors/Warnings
    if (errors.length > 0) {
      lines.push("## Warnings/Errors");
      for (const e of errors) {
        lines.push(`- ${e}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /** Build a failed PipelineResult */
  private failResult(
    mode: "video" | "description" | "actions",
    error: string,
    steps: string[],
    timing: Record<string, number>,
  ): PipelineResult {
    return {
      success: false,
      mode,
      steps_completed: steps,
      actions_extracted: 0,
      actions_executed: 0,
      generated_script: "",
      report: `# Pipeline Failed\n\n**Error:** ${error}`,
      timing,
      errors: [error],
    };
  }
}

// ── Singleton Export ────────────────────────────────────────────────

export const videoReplayPipelineEngine = new VideoReplayPipelineEngine();
