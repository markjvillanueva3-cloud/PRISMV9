/**
 * VisionActionAnalyzerEngine — Real Claude Vision API Integration
 * Analyzes video keyframes using Claude Vision to extract CAD operations
 * with actual visual understanding, replacing keyword-based classification.
 *
 * Pipeline: video → FFmpeg keyframes → Claude Vision analysis → ExtractedAction[]
 */
import { log } from "../utils/Logger.js";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import type { ExtractedAction, CADActionType } from "./VideoActionExtractorEngine.js";

const execFileAsync = promisify(execFile);

// ── Types ──────────────────────────────────────────────────────────

export interface FrameAnalysis {
  operation: string;
  parameters: Record<string, number | string>;
  description: string;
  software_detected: string;
  confidence: number;
  ocr_values: string[];
  raw_response?: string;
}

export interface FramePairAnalysis {
  action_type: string;
  parameters: Record<string, number | string>;
  description: string;
  what_changed: string;
  confidence: number;
  is_significant: boolean;
}

export interface VideoAnalysisResult {
  actions: ExtractedAction[];
  frames_analyzed: number;
  software_detected: string;
  total_api_calls: number;
  total_tokens_used: number;
  processing_time_ms: number;
}

export interface CostEstimate {
  frames: number;
  api_calls: number;
  estimated_tokens: number;
  estimated_cost_usd: number;
}

// ── Constants ──────────────────────────────────────────────────────

const VALID_CAD_ACTIONS: CADActionType[] = [
  "sketch_create", "sketch_line", "sketch_arc", "sketch_circle",
  "sketch_rectangle", "sketch_spline", "sketch_dimension", "sketch_constraint",
  "sketch_trim", "sketch_offset", "sketch_mirror", "sketch_close",
  "extrude", "extrude_cut", "revolve", "sweep", "loft",
  "fillet", "chamfer", "shell", "draft", "hole",
  "boolean_union", "boolean_subtract", "boolean_intersect",
  "pattern_linear", "pattern_circular", "mirror_body",
  "assembly_insert", "assembly_mate", "assembly_constrain",
  "toolpath_create", "toolpath_2d", "toolpath_3d", "toolpath_drill",
  "parameter_set", "material_assign",
  "view_change", "selection", "menu_navigate", "unknown",
];

const MEDIA_TYPE_MAP: Record<string, "image/jpeg" | "image/png" | "image/gif" | "image/webp"> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const SINGLE_FRAME_PROMPT = `You are analyzing a screenshot from a CAD/CAM software tutorial.
Describe exactly what CAD operation is being performed in this frame.

Respond ONLY with valid JSON (no markdown fences):
{
  "operation": "extrude|fillet|sketch_rectangle|revolve|chamfer|shell|hole|sweep|loft|sketch_circle|sketch_line|sketch_create|extrude_cut|boolean_union|boolean_subtract|pattern_linear|pattern_circular|mirror_body|view_change|unknown",
  "parameters": {"depth_mm": 25, "radius_mm": 3},
  "description": "Extruding a rectangular sketch by 25mm",
  "software_detected": "FreeCAD|Fusion360|OnShape|SolidWorks|unknown",
  "confidence": 0.85,
  "ui_elements_visible": ["toolbar", "dimension_input", "3d_viewport"],
  "ocr_values": ["25.00", "mm"]
}`;

const FRAME_PAIR_PROMPT = `Compare these two screenshots from a CAD tutorial. Frame 1 is BEFORE, Frame 2 is AFTER.
Identify what CAD operation was performed between frame 1 and frame 2.

Respond ONLY with valid JSON (no markdown fences):
{
  "action_type": "extrude|fillet|sketch_rectangle|revolve|chamfer|shell|hole|sweep|loft|sketch_circle|sketch_line|sketch_create|extrude_cut|boolean_union|boolean_subtract|pattern_linear|pattern_circular|mirror_body|view_change|unknown",
  "parameters": {"depth_mm": 25, "width_mm": 50},
  "description": "A rectangular pocket was cut 25mm deep",
  "what_changed": "A pocket appeared on the top face of the block",
  "confidence": 0.85,
  "is_significant": true
}

Set is_significant=false if only the viewing angle, zoom, or selection changed (no geometry modification).`;

// ── Engine ─────────────────────────────────────────────────────────

export class VisionActionAnalyzerEngine {
  private client: Anthropic | null = null;
  private defaultModel = "claude-sonnet-4-20250514";

  /** Lazy-init the Anthropic client */
  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error(
          "ANTHROPIC_API_KEY not set. Load .env or set the environment variable.",
        );
      }
      this.client = new Anthropic({ apiKey });
    }
    return this.client;
  }

  /** Get media type from file extension */
  private getMediaType(filePath: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    const ext = path.extname(filePath).toLowerCase();
    return MEDIA_TYPE_MAP[ext] || "image/jpeg";
  }

  /** Read and base64-encode an image file */
  private readImageBase64(imagePath: string): string {
    if (!fs.existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    const buffer = fs.readFileSync(imagePath);
    return buffer.toString("base64");
  }

  /** Call Claude Vision API with retry logic */
  private async callVisionAPI(
    messages: Anthropic.MessageCreateParamsNonStreaming["messages"],
    model?: string,
  ): Promise<{ text: string; tokens_used: number }> {
    const client = this.getClient();
    const modelId = model || this.defaultModel;
    const maxRetries = 1;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startMs = Date.now();
        const response = await client.messages.create({
          model: modelId,
          max_tokens: 1024,
          messages,
        });

        const elapsed = Date.now() - startMs;
        const text =
          response.content[0]?.type === "text" ? response.content[0].text : "";
        const tokensUsed =
          (response.usage?.input_tokens || 0) +
          (response.usage?.output_tokens || 0);

        log.info(
          `[VisionAnalyzer] API call: ${elapsed}ms, ${tokensUsed} tokens (model: ${modelId})`,
        );

        return { text, tokens_used: tokensUsed };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        log.warn(
          `[VisionAnalyzer] API call attempt ${attempt + 1} failed: ${lastError.message}`,
        );
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    }

    throw lastError || new Error("Vision API call failed after retries");
  }

  /** Parse JSON from Claude response, handling markdown fences */
  private parseJSON<T>(text: string): T {
    let cleaned = text.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    try {
      return JSON.parse(cleaned) as T;
    } catch {
      throw new Error(`Failed to parse Vision API response as JSON: ${cleaned.substring(0, 200)}`);
    }
  }

  // ── Public Methods ────────────────────────────────────────────────

  /**
   * Analyze a single frame using Claude Vision.
   * Identifies the CAD operation, parameters, software, and OCR values.
   */
  async analyzeFrame(
    imagePath: string,
    previousDescription?: string,
  ): Promise<FrameAnalysis> {
    const base64 = this.readImageBase64(imagePath);
    const mediaType = this.getMediaType(imagePath);

    let prompt = SINGLE_FRAME_PROMPT;
    if (previousDescription) {
      prompt += `\n\nPrevious step context: ${previousDescription}`;
    }

    const { text, tokens_used } = await this.callVisionAPI([
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ]);

    const parsed = this.parseJSON<{
      operation: string;
      parameters: Record<string, number | string>;
      description: string;
      software_detected: string;
      confidence: number;
      ui_elements_visible?: string[];
      ocr_values?: string[];
    }>(text);

    return {
      operation: parsed.operation || "unknown",
      parameters: parsed.parameters || {},
      description: parsed.description || "",
      software_detected: parsed.software_detected || "unknown",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      ocr_values: parsed.ocr_values || [],
      raw_response: text,
    };
  }

  /**
   * Analyze a consecutive pair of frames to detect what changed.
   * More accurate than single-frame analysis because it sees the delta.
   */
  async analyzeFramePair(
    beforePath: string,
    afterPath: string,
    model?: string,
  ): Promise<FramePairAnalysis> {
    const beforeB64 = this.readImageBase64(beforePath);
    const afterB64 = this.readImageBase64(afterPath);
    const beforeType = this.getMediaType(beforePath);
    const afterType = this.getMediaType(afterPath);

    const { text } = await this.callVisionAPI(
      [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: beforeType, data: beforeB64 },
            },
            {
              type: "image",
              source: { type: "base64", media_type: afterType, data: afterB64 },
            },
            { type: "text", text: FRAME_PAIR_PROMPT },
          ],
        },
      ],
      model,
    );

    const parsed = this.parseJSON<{
      action_type: string;
      parameters: Record<string, number | string>;
      description: string;
      what_changed: string;
      confidence: number;
      is_significant: boolean;
    }>(text);

    return {
      action_type: parsed.action_type || "unknown",
      parameters: parsed.parameters || {},
      description: parsed.description || "",
      what_changed: parsed.what_changed || "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      is_significant: parsed.is_significant !== false,
    };
  }

  /**
   * Extract keyframes from a video file using FFmpeg.
   * @param videoPath - Path to the video file
   * @param outputDir - Directory to write frame images
   * @param intervalSec - Seconds between keyframes (default: 2)
   * @returns Array of extracted frame file paths
   */
  async extractKeyframes(
    videoPath: string,
    outputDir: string,
    intervalSec: number = 2,
  ): Promise<string[]> {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Create output directory if it doesn't exist
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPattern = path.join(outputDir, "frame_%04d.jpg");
    const fpsFilter = `fps=1/${intervalSec}`;

    log.info(
      `[VisionAnalyzer] Extracting keyframes from ${videoPath} every ${intervalSec}s`,
    );

    try {
      await execFileAsync("ffmpeg", [
        "-i", videoPath,
        "-vf", fpsFilter,
        "-q:v", "2",
        "-y",
        outputPattern,
      ], { timeout: 120000 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`FFmpeg keyframe extraction failed: ${msg}`);
    }

    // Collect output files in sorted order
    const files = fs.readdirSync(outputDir)
      .filter((f) => f.startsWith("frame_") && f.endsWith(".jpg"))
      .sort()
      .map((f) => path.join(outputDir, f));

    log.info(`[VisionAnalyzer] Extracted ${files.length} keyframes`);
    return files;
  }

  /**
   * Full video analysis pipeline:
   *  1. Extract keyframes via FFmpeg
   *  2. Analyze consecutive frame pairs with Claude Vision
   *  3. Filter non-significant changes
   *  4. Build ExtractedAction[] sequence
   */
  async processVideo(
    videoPath: string,
    options?: {
      interval_s?: number;
      model?: string;
      max_frames?: number;
      output_dir?: string;
    },
  ): Promise<VideoAnalysisResult> {
    const startMs = Date.now();
    const interval = options?.interval_s ?? 2;
    const model = options?.model;
    const maxFrames = options?.max_frames ?? 200;

    // Step 1: Extract keyframes
    const outputDir =
      options?.output_dir ||
      path.join(
        process.env.TEMP || "/tmp",
        `prism-vision-${Date.now()}`,
      );

    let frames = await this.extractKeyframes(videoPath, outputDir, interval);
    if (frames.length > maxFrames) {
      log.warn(
        `[VisionAnalyzer] Limiting from ${frames.length} to ${maxFrames} frames`,
      );
      frames = frames.slice(0, maxFrames);
    }

    // Step 2: Analyze frame pairs
    const actions = await this.analyzeLocalFrames(frames, { model });

    // Detect software from first frame if possible
    let software = "unknown";
    if (frames.length > 0) {
      try {
        const firstFrame = await this.analyzeFrame(frames[0]);
        software = firstFrame.software_detected;
      } catch {
        // Non-critical, continue
      }
    }

    const totalApiCalls = Math.max(0, frames.length - 1) + (frames.length > 0 ? 1 : 0);
    const elapsed = Date.now() - startMs;

    // Rough token estimate: ~1500 per pair call
    const tokensEstimate = totalApiCalls * 1500;

    log.info(
      `[VisionAnalyzer] Pipeline complete: ${actions.length} actions from ${frames.length} frames in ${elapsed}ms`,
    );

    return {
      actions,
      frames_analyzed: frames.length,
      software_detected: software,
      total_api_calls: totalApiCalls,
      total_tokens_used: tokensEstimate,
      processing_time_ms: elapsed,
    };
  }

  /**
   * Analyze pre-extracted frames (skips FFmpeg step).
   * Processes consecutive pairs and builds an ordered action list.
   */
  async analyzeLocalFrames(
    framePaths: string[],
    options?: { model?: string },
  ): Promise<ExtractedAction[]> {
    if (framePaths.length < 2) {
      log.warn("[VisionAnalyzer] Need at least 2 frames for pair analysis");
      return [];
    }

    const actions: ExtractedAction[] = [];
    let stepNumber = 1;

    for (let i = 0; i < framePaths.length - 1; i++) {
      const beforePath = framePaths[i];
      const afterPath = framePaths[i + 1];

      log.info(
        `[VisionAnalyzer] Analyzing pair ${i + 1}/${framePaths.length - 1}: ${path.basename(beforePath)} → ${path.basename(afterPath)}`,
      );

      try {
        const pair = await this.analyzeFramePair(beforePath, afterPath, options?.model);

        // Skip non-significant changes (view rotations, selections, etc.)
        if (!pair.is_significant) {
          log.info(`[VisionAnalyzer] Skipping non-significant change at pair ${i + 1}`);
          continue;
        }

        // Map the action_type string to a valid CADActionType
        const actionType = this.mapToCADActionType(pair.action_type);

        actions.push({
          step_number: stepNumber++,
          timestamp_s: i * 2, // approximate based on frame index
          action_type: actionType,
          operation: pair.action_type,
          parameters: pair.parameters,
          confidence: pair.confidence,
          description: pair.description,
          ui_context: pair.what_changed,
          keyframe_index: i,
          requires_previous: stepNumber > 2,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`[VisionAnalyzer] Failed to analyze pair ${i + 1}: ${msg}`);
      }
    }

    return actions;
  }

  /**
   * Estimate API cost for a video WITHOUT processing it.
   * Uses ffprobe to get video duration, then calculates frame/call counts.
   */
  async estimateCost(
    videoPath: string,
    intervalSec: number = 2,
  ): Promise<CostEstimate> {
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }

    // Get video duration via ffprobe
    let durationSec = 0;
    try {
      const { stdout } = await execFileAsync("ffprobe", [
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        videoPath,
      ], { timeout: 15000 });

      const info = JSON.parse(stdout);
      durationSec = parseFloat(info.format?.duration || "0");
    } catch {
      throw new Error("ffprobe failed — is FFmpeg installed and on PATH?");
    }

    const frames = Math.max(1, Math.ceil(durationSec / intervalSec));
    const apiCalls = Math.max(0, frames - 1); // pair analysis
    const estimatedTokens = apiCalls * 1500; // ~1500 tokens per vision call
    // claude-sonnet-4-20250514 pricing: ~$3/M input + $15/M output, estimate ~$0.006 per call
    const estimatedCostUsd = apiCalls * 0.006;

    return {
      frames,
      api_calls: apiCalls,
      estimated_tokens: estimatedTokens,
      estimated_cost_usd: Math.round(estimatedCostUsd * 1000) / 1000,
    };
  }

  // ── Private Helpers ───────────────────────────────────────────────

  /** Map a free-form action string from Vision API to a valid CADActionType */
  private mapToCADActionType(raw: string): CADActionType {
    const normalized = raw.toLowerCase().replace(/[^a-z0-9_]/g, "_");

    // Direct match
    if (VALID_CAD_ACTIONS.includes(normalized as CADActionType)) {
      return normalized as CADActionType;
    }

    // Fuzzy mapping for common Vision API responses
    const mapping: Record<string, CADActionType> = {
      extrude: "extrude",
      extrusion: "extrude",
      pad: "extrude",
      pocket: "extrude_cut",
      cut: "extrude_cut",
      fillet: "fillet",
      round: "fillet",
      chamfer: "chamfer",
      bevel: "chamfer",
      revolve: "revolve",
      revolution: "revolve",
      sweep: "sweep",
      loft: "loft",
      shell: "shell",
      hollow: "shell",
      hole: "hole",
      drill: "hole",
      sketch: "sketch_create",
      rectangle: "sketch_rectangle",
      rect: "sketch_rectangle",
      circle: "sketch_circle",
      line: "sketch_line",
      arc: "sketch_arc",
      spline: "sketch_spline",
      mirror: "mirror_body",
      pattern: "pattern_linear",
      linear_pattern: "pattern_linear",
      circular_pattern: "pattern_circular",
      union: "boolean_union",
      combine: "boolean_union",
      subtract: "boolean_subtract",
      intersect: "boolean_intersect",
      view: "view_change",
      rotate_view: "view_change",
      zoom: "view_change",
      select: "selection",
      menu: "menu_navigate",
    };

    // Try prefix matching
    for (const [key, val] of Object.entries(mapping)) {
      if (normalized.includes(key)) {
        return val;
      }
    }

    return "unknown";
  }
}

// ── Singleton Export ────────────────────────────────────────────────

export const visionActionAnalyzerEngine = new VisionActionAnalyzerEngine();
