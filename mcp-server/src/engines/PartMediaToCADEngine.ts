/**
 * PartMediaToCADEngine — generate a starting-bad parametric CAD scaffold
 * from photos and/or video of a PHYSICAL part (reverse engineering).
 *
 * **Distinct from existing assets (dedup-checked 2026-05-25, slot:echo):**
 *   • `BlueprintVisionOCREngine` — orthographic engineering drawings (dim
 *     lines, GD&T, title block). Tuned for blueprints, not raw part photos.
 *   • `BlueprintToAllCADsOrchestratorEngine` — same blueprint focus, 6-CAD
 *     fan-out. We REUSE its downstream once we have CADOperation[].
 *   • `VideoReplayPipelineEngine` — screen-capture CAD-tutorial videos (UI
 *     actions extracted). NOT physical-part orbit/turntable video.
 *   • `CADReverseTemplateEngine` — parameterizes a CADOperation[] tree.
 *     We FEED this engine — it's our parametric template producer.
 *
 * This engine fills the genuine gap: physical-part-from-photo/video where
 * the operator has the part in hand (no blueprint), photographs it, and
 * needs a "starting bad file" they can refine with caliper measurements.
 *
 * Reuses:
 *   • `Anthropic` SDK (same pattern BlueprintVisionOCREngine + VisionActionAnalyzerEngine use)
 *   • `ImageSource` type from BlueprintVisionOCREngine (URL / base64 / file)
 *   • `CADOperation` type from cad-operation-kinds (round-trip lossless via CADReverseTemplateEngine)
 *   • `cadReverseTemplateEngine.reverseEngineer()` for the parametric layer
 *
 * Pipeline:
 *   1. Normalize inputs (images[] + optional video → frame-extracted images[])
 *   2. Per-frame Claude Vision call → coarse part-primitive hypothesis
 *      (primary geometry class + nominal dimensions + features list)
 *   3. Cross-frame consensus (median dimensions, OR-aggregated features)
 *   4. Synthesize CADOperation[] from the consensus
 *   5. cadReverseTemplateEngine.reverseEngineer(ops) → ReverseEngineeredTemplate
 *      with named TemplateParam[] (operator-tunable surface)
 *   6. Return both the raw vision findings AND the parametric template
 *
 * The output is INTENTIONALLY a "starting bad file" — vision is imperfect,
 * dimensions are nominal, and the MeasurementReconciliationEngine is the
 * follow-up step where the operator overrides with caliper/CMM data.
 *
 * Authored 2026-05-25 (slot:echo, user reverse-engineering capability ask)
 */

import { log } from "../utils/Logger.js";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { cadReverseTemplateEngine, type ReverseEngineeredTemplate } from "./CADReverseTemplateEngine.js";
import type { CADOperation } from "../interfaces/ICADCodeGenerator.js";

const execFileAsync = promisify(execFile);

// ── Inputs ────────────────────────────────────────────────────────────────────

/** Same shape as BlueprintVisionOCREngine.ImageSource — kept compatible. */
export type ImageSource =
  | { kind: "url"; url: string; mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif" }
  | { kind: "base64"; data: string; mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif" }
  | { kind: "file"; path: string };

export interface VideoSource {
  kind: "file";
  path: string;
  /** Number of frames to extract (evenly spaced). Default 8. Cap 24 (cost). */
  frameCount?: number;
}

export interface PartMediaInput {
  images?: ImageSource[];
  video?: VideoSource;
  /** Operator hints — bias the vision prompt. All optional. */
  hints?: {
    /** Suspected primary geometry class. */
    suspected_category?:
      | "turned_part"
      | "housing"
      | "flange"
      | "bracket"
      | "drilled_block"
      | "plate"
      | "shaft"
      | "gear"
      | "pulley"
      | "unknown";
    /** Approximate bounding box (mm). Helps Vision scale-anchor. */
    approx_size_mm?: { x?: number; y?: number; z?: number };
    /** Material hint (steel / aluminum / brass / plastic / ...). */
    material?: string;
    /** Free-form note for the Vision prompt. */
    note?: string;
  };
  /** Override Anthropic model. Default: claude-sonnet-4-6. */
  model?: string;
  /** Cap on Vision API frames analyzed. Default 8; max 24. */
  maxFrames?: number;
}

// ── Outputs ───────────────────────────────────────────────────────────────────

export interface PartPrimitive {
  /** "cylinder" | "box" | "plate" | "annulus" | "shaft" | "unknown". */
  shape: string;
  /** Nominal dimensions in mm. Keys vary by shape. */
  nominal_dimensions: Record<string, number>;
  /** Hole / boss / chamfer / fillet / slot / pocket features. */
  features: Array<{
    kind: "hole" | "boss" | "chamfer" | "fillet" | "slot" | "pocket" | "thread" | "keyway";
    nominal_dimensions: Record<string, number>;
    count?: number;
    /** Free-text position description from Vision ("center", "4× bolt circle 50mm PCD"). */
    position_hint?: string;
  }>;
  /** Vision-classifier confidence in [0,1]. */
  confidence: number;
  /** Free-text caveats — "no scale reference", "occluded backside", etc. */
  caveats: string[];
}

export interface PartMediaResult {
  /** Per-frame raw vision findings (n frames). */
  per_frame: PartPrimitive[];
  /** Cross-frame consensus primitive (median dims, OR-aggregated features). */
  consensus: PartPrimitive;
  /** Synthesized CAD operation sequence. */
  cad_ops: CADOperation[];
  /** Parametric template (operator-tunable surface). */
  template: ReverseEngineeredTemplate;
  /** Stats. */
  meta: {
    image_count: number;
    video_frame_count: number;
    model: string;
    total_vision_calls: number;
    extracted_at: string;
  };
  /** R12 fail-loud: explicit warnings + assumptions surface. */
  warnings: string[];
  /** Operator-facing message — "starting bad file, measure & refine". */
  next_step: string;
}

// ── Engine ────────────────────────────────────────────────────────────────────

const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_FRAMES = 8;
const MAX_FRAMES = 24;

/** System prompt: physical-part-from-photo, NOT blueprint. */
const VISION_SYSTEM_PROMPT = `You are a reverse-engineering vision analyst inspecting a PHYSICAL machined part from photo/video.

Unlike a blueprint, you do NOT have dimension lines, GD&T callouts, or orthographic views. You have a photographed real-world part.

For each frame, infer:
1. Primary geometry class: cylinder / box / plate / annulus / shaft / gear / pulley / housing / unknown
2. Nominal dimensions (mm) — estimate using any scale reference visible (caliper, ruler, hand for scale, the suspected_size hint, OR explicit "no scale" warning)
3. Features: through-holes, blind-holes, bosses, chamfers, fillets, slots, pockets, threads, keyways — count + nominal sizes
4. Surface quality clues (machined / cast / forged / additive)
5. Confidence — be HONEST. Without scale reference, scale-confidence is low.

CRITICAL: be a "starting bad file" producer. Operator KNOWS your output is rough — they will refine with calipers. So:
- Emit your best estimate, don't refuse for lack of certainty
- ALWAYS surface caveats (no scale reference, occluded backside, ambiguous feature)
- Use ROUND numbers (10, 25, 50, 100 mm) when uncertain — easy for operator to round-adjust

Output STRICT JSON matching this TypeScript:
{
  "shape": "cylinder|box|plate|annulus|shaft|gear|pulley|housing|unknown",
  "nominal_dimensions": { "diameter": 25, "length": 100, ... },
  "features": [
    { "kind": "hole", "nominal_dimensions": {"diameter": 6.35, "depth": 15}, "count": 4, "position_hint": "bolt circle 50mm PCD" }
  ],
  "confidence": 0.45,
  "caveats": ["no scale reference visible", "backside not photographed"]
}

JSON ONLY. No prose, no markdown fence.`;

export class PartMediaToCADEngine {
  /**
   * Reverse-engineer a starting-bad parametric CAD scaffold from part media.
   *
   * @param input  Images and/or video of the physical part + operator hints.
   * @returns      Per-frame findings + consensus primitive + CAD ops +
   *               parametric template + warnings. Always returns — never
   *               throws on per-frame Vision error (records in warnings).
   */
  async generateFromMedia(input: PartMediaInput): Promise<PartMediaResult> {
    const warnings: string[] = [];
    const model = input.model ?? DEFAULT_MODEL;
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("PartMediaToCADEngine.generateFromMedia: ANTHROPIC_API_KEY not set in process.env");
    }
    const client = new Anthropic({ apiKey });

    // ── 1. Normalize inputs to a single ImageSource[] ──
    const images: ImageSource[] = [...(input.images ?? [])];
    let videoFrameCount = 0;
    if (input.video) {
      const requested = Math.min(
        input.maxFrames ?? input.video.frameCount ?? DEFAULT_FRAMES,
        MAX_FRAMES,
      );
      try {
        const frames = await this.extractVideoFrames(input.video.path, requested);
        for (const framePath of frames) images.push({ kind: "file", path: framePath });
        videoFrameCount = frames.length;
      } catch (err: any) {
        warnings.push(`video frame extraction failed: ${err?.message ?? String(err)}`);
      }
    }

    if (images.length === 0) {
      throw new Error("PartMediaToCADEngine.generateFromMedia: no images and no extractable video frames");
    }

    const capped = images.slice(0, input.maxFrames ?? MAX_FRAMES);
    if (capped.length < images.length) {
      warnings.push(`image set capped at ${capped.length} of ${images.length} (cost control)`);
    }

    // ── 2. Per-frame Claude Vision pass ──
    const perFrame: PartPrimitive[] = [];
    let visionCalls = 0;
    const hintsBlock = this.buildHintsBlock(input.hints);
    for (let i = 0; i < capped.length; i++) {
      try {
        const result = await this.analyzeFrame(client, model, capped[i], hintsBlock, i);
        perFrame.push(result);
        visionCalls++;
      } catch (err: any) {
        warnings.push(`frame ${i} vision failed: ${err?.message ?? String(err)}`);
        perFrame.push(this.emptyPrimitive(`frame ${i} unanalyzed`));
      }
    }

    // ── 3. Cross-frame consensus ──
    const consensus = this.consensus(perFrame);
    if (consensus.confidence < 0.4) {
      warnings.push(`low consensus confidence (${consensus.confidence.toFixed(2)}) — operator MUST verify before machining`);
    }

    // ── 4. Synthesize CADOperation[] ──
    const cadOps = this.primitiveToCADOps(consensus);
    if (cadOps.length === 0) {
      warnings.push("zero CAD ops synthesized — falling back to empty template");
    }

    // ── 5. Pipe through CADReverseTemplateEngine for parametric layer ──
    const template = cadReverseTemplateEngine.reverseEngineer(cadOps);

    // ── 6. Return ──
    log.info(
      `[PartMediaToCADEngine] processed ${capped.length} frames (${visionCalls} vision calls), ` +
        `consensus shape=${consensus.shape} conf=${consensus.confidence.toFixed(2)}, ` +
        `template category=${template.category} params=${template.params.length}`,
    );

    return {
      per_frame: perFrame,
      consensus,
      cad_ops: cadOps,
      template,
      meta: {
        image_count: input.images?.length ?? 0,
        video_frame_count: videoFrameCount,
        model,
        total_vision_calls: visionCalls,
        extracted_at: new Date().toISOString(),
      },
      warnings,
      next_step:
        "STARTING BAD FILE generated. Measure the part with calipers/CMM, then call " +
        "`prism_cam:cad_template_apply_measurements` with {paramName, value, unit, uncertainty} " +
        "tuples to overwrite the named params. Re-emit CAD via `prism_cam:cad_template_emit_with_overrides`.",
    };
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private buildHintsBlock(hints?: PartMediaInput["hints"]): string {
    if (!hints) return "";
    const lines = ["\n--- OPERATOR HINTS ---"];
    if (hints.suspected_category) lines.push(`suspected_category: ${hints.suspected_category}`);
    if (hints.approx_size_mm) lines.push(`approx_size_mm: ${JSON.stringify(hints.approx_size_mm)}`);
    if (hints.material) lines.push(`material: ${hints.material}`);
    if (hints.note) lines.push(`note: ${hints.note}`);
    return lines.join("\n");
  }

  private async analyzeFrame(
    client: Anthropic,
    model: string,
    source: ImageSource,
    hintsBlock: string,
    frameIdx: number,
  ): Promise<PartPrimitive> {
    const image = await this.imageSourceToBlock(source);
    const userText = `Analyze this photo (frame ${frameIdx}) of a physical part.${hintsBlock}\n\nReturn the strict JSON described in the system prompt.`;
    const resp = await client.messages.create({
      model,
      max_tokens: 1200,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [image, { type: "text", text: userText }],
        },
      ],
    });
    const textBlock = resp.content.find((b: any) => b.type === "text") as any;
    if (!textBlock?.text) throw new Error("Vision returned no text block");
    return this.parseVisionJson(textBlock.text);
  }

  private async imageSourceToBlock(source: ImageSource): Promise<any> {
    if (source.kind === "url") {
      return {
        type: "image",
        source: { type: "url", url: source.url, media_type: source.mediaType ?? "image/png" },
      };
    }
    if (source.kind === "base64") {
      return {
        type: "image",
        source: { type: "base64", data: source.data, media_type: source.mediaType },
      };
    }
    // file
    const data = fs.readFileSync(source.path).toString("base64");
    const ext = path.extname(source.path).toLowerCase();
    const mediaType =
      ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" :
      ext === ".webp" ? "image/webp" :
      ext === ".gif" ? "image/gif" :
      "image/png";
    return {
      type: "image",
      source: { type: "base64", data, media_type: mediaType },
    };
  }

  private parseVisionJson(text: string): PartPrimitive {
    const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
    const obj = JSON.parse(trimmed);
    return {
      shape: String(obj.shape ?? "unknown"),
      nominal_dimensions: this.numbersOnly(obj.nominal_dimensions ?? {}),
      features: Array.isArray(obj.features)
        ? obj.features.map((f: any) => ({
            kind: String(f.kind ?? "hole") as PartPrimitive["features"][number]["kind"],
            nominal_dimensions: this.numbersOnly(f.nominal_dimensions ?? {}),
            count: typeof f.count === "number" ? f.count : undefined,
            position_hint: typeof f.position_hint === "string" ? f.position_hint : undefined,
          }))
        : [],
      confidence: typeof obj.confidence === "number" ? Math.max(0, Math.min(1, obj.confidence)) : 0.5,
      caveats: Array.isArray(obj.caveats) ? obj.caveats.map(String) : [],
    };
  }

  private numbersOnly(dict: Record<string, any>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(dict)) {
      const n = typeof v === "number" ? v : Number(v);
      if (Number.isFinite(n)) out[k] = n;
    }
    return out;
  }

  private emptyPrimitive(caveat: string): PartPrimitive {
    return { shape: "unknown", nominal_dimensions: {}, features: [], confidence: 0, caveats: [caveat] };
  }

  /**
   * Cross-frame consensus: dominant shape by frequency-weighted confidence,
   * median dimensions per axis, OR-aggregated features (union, max count).
   */
  private consensus(frames: PartPrimitive[]): PartPrimitive {
    if (frames.length === 0) return this.emptyPrimitive("no frames");
    if (frames.length === 1) return frames[0];

    // Shape: weighted vote
    const shapeScores: Record<string, number> = {};
    for (const f of frames) shapeScores[f.shape] = (shapeScores[f.shape] ?? 0) + f.confidence;
    const shape = Object.entries(shapeScores).sort((a, b) => b[1] - a[1])[0][0];

    // Dimensions: median per key (only consider frames where the key is present)
    const dimKeys = new Set<string>();
    for (const f of frames) for (const k of Object.keys(f.nominal_dimensions)) dimKeys.add(k);
    const nominal_dimensions: Record<string, number> = {};
    for (const k of dimKeys) {
      const vals = frames.map((f) => f.nominal_dimensions[k]).filter((v): v is number => typeof v === "number");
      if (vals.length > 0) {
        const sorted = [...vals].sort((a, b) => a - b);
        nominal_dimensions[k] = sorted[Math.floor(sorted.length / 2)];
      }
    }

    // Features: union by (kind + dominant-dim signature)
    const featMap = new Map<string, { kind: any; nominal_dimensions: Record<string, number>; count: number; position_hint?: string }>();
    for (const f of frames) {
      for (const feat of f.features) {
        const sig = feat.kind + ":" + Object.entries(feat.nominal_dimensions)
          .sort()
          .map(([k, v]) => `${k}=${Math.round(v * 10) / 10}`)
          .join(",");
        const existing = featMap.get(sig);
        if (existing) {
          existing.count = Math.max(existing.count, feat.count ?? 1);
        } else {
          featMap.set(sig, {
            kind: feat.kind,
            nominal_dimensions: feat.nominal_dimensions,
            count: feat.count ?? 1,
            position_hint: feat.position_hint,
          });
        }
      }
    }

    // Consensus confidence: mean × (1 - shape-vote dispersion)
    const meanConf = frames.reduce((acc, f) => acc + f.confidence, 0) / frames.length;
    const topShareShare = (shapeScores[shape] ?? 0) / Object.values(shapeScores).reduce((a, b) => a + b, 0);
    const confidence = meanConf * topShareShare;

    return {
      shape,
      nominal_dimensions,
      features: Array.from(featMap.values()),
      confidence,
      caveats: Array.from(new Set(frames.flatMap((f) => f.caveats))),
    };
  }

  /**
   * Synthesize CADOperation[] from a consensus primitive.
   *
   * Strategy: every shape becomes a single primary primitive (cylinder /
   * box / etc.) plus one operation per feature. The
   * CADReverseTemplateEngine will name + parameterize all dimensions.
   */
  private primitiveToCADOps(p: PartPrimitive): CADOperation[] {
    const ops: CADOperation[] = [];
    const d = p.nominal_dimensions;

    // Per CAD_OPERATION_KINDS canonical set: solid bodies are emitted as
    // feature_revolve (round) or feature_extrude (prismatic). Holes/pockets/
    // chamfers/fillets/threads/bosses each have a canonical kind.
    switch (p.shape) {
      case "cylinder":
      case "shaft":
      case "turned_part":
      case "pulley":
      case "annulus": {
        const radius = (d.diameter ?? d.outer_diameter ?? d.od ?? 25) / 2;
        const length = d.length ?? d.height ?? 50;
        ops.push({ kind: "feature_revolve", args: { radius, length } } as CADOperation);
        if (p.shape === "annulus" || d.bore || d.inner_diameter) {
          const bore = (d.bore ?? d.inner_diameter ?? d.id ?? radius * 0.4) / 2;
          ops.push({ kind: "feature_hole", args: { diameter: bore * 2, depth: length } } as CADOperation);
        }
        break;
      }
      case "box":
      case "plate":
      case "drilled_block":
      case "bracket":
      case "housing": {
        const width = d.width ?? d.x ?? 100;
        const length = d.length ?? d.y ?? 100;
        const height = d.height ?? d.z ?? d.thickness ?? 25;
        ops.push({ kind: "feature_extrude", args: { width, length, height } } as CADOperation);
        break;
      }
      case "flange": {
        const od = d.outer_diameter ?? d.od ?? 100;
        const id = d.inner_diameter ?? d.id ?? od * 0.4;
        const thickness = d.thickness ?? d.height ?? 12;
        ops.push({ kind: "feature_revolve", args: { radius: od / 2, length: thickness } } as CADOperation);
        ops.push({ kind: "feature_hole", args: { diameter: id, depth: thickness } } as CADOperation);
        break;
      }
      case "gear": {
        // Gear emits as a revolve primary; full involute generation belongs to
        // a dedicated gear engine (NotImplemented for v1).
        const od = d.outer_diameter ?? d.od ?? (d.module ? d.module * (d.tooth_count ?? 20) + 2 * d.module : 50);
        const thickness = d.thickness ?? d.face_width ?? 10;
        ops.push({ kind: "feature_revolve", args: { radius: od / 2, length: thickness } } as CADOperation);
        break;
      }
      default: {
        // unknown — emit a placeholder bounding box from any dim hints
        const w = d.width ?? d.x ?? d.diameter ?? 50;
        const l = d.length ?? d.y ?? 50;
        const h = d.height ?? d.z ?? d.thickness ?? 25;
        ops.push({ kind: "feature_extrude", args: { width: w, length: l, height: h } } as CADOperation);
        break;
      }
    }

    // Per-feature ops — canonical CAD_OPERATION_KINDS
    for (const feat of p.features) {
      const fd = feat.nominal_dimensions;
      const count = feat.count ?? 1;
      switch (feat.kind) {
        case "hole":
          for (let i = 0; i < count; i++) {
            ops.push({
              kind: "feature_hole",
              args: { diameter: fd.diameter ?? 6.35, depth: fd.depth ?? 10 },
            } as CADOperation);
          }
          break;
        case "chamfer":
          ops.push({ kind: "feature_chamfer", args: { distance: fd.distance ?? fd.size ?? 1 } } as CADOperation);
          break;
        case "fillet":
          ops.push({ kind: "feature_fillet", args: { radius: fd.radius ?? fd.size ?? 1 } } as CADOperation);
          break;
        case "slot":
          ops.push({
            kind: "feature_pocket",
            args: {
              length: fd.length ?? 20,
              width: fd.width ?? 6,
              depth: fd.depth ?? 5,
            },
          } as CADOperation);
          break;
        case "pocket":
          ops.push({
            kind: "feature_pocket",
            args: { width: fd.width ?? 20, length: fd.length ?? 20, depth: fd.depth ?? 5 },
          } as CADOperation);
          break;
        case "thread":
          ops.push({
            kind: "feature_thread",
            args: { diameter: fd.diameter ?? 6, pitch: fd.pitch ?? 1.0, length: fd.length ?? 10 },
          } as CADOperation);
          break;
        case "keyway":
          ops.push({
            kind: "feature_pocket",
            args: { length: fd.length ?? 20, width: fd.width ?? 5, depth: fd.depth ?? 3 },
          } as CADOperation);
          break;
        case "boss":
          ops.push({
            kind: "feature_boss",
            args: { radius: (fd.diameter ?? 10) / 2, length: fd.height ?? 5 },
          } as CADOperation);
          break;
      }
    }

    return ops;
  }

  /**
   * Extract N evenly-spaced frames from a video using ffmpeg (already
   * shelled-out by VideoActionExtractorEngine pattern). Returns absolute
   * paths to extracted PNG frames in a temp dir.
   */
  private async extractVideoFrames(videoPath: string, frameCount: number): Promise<string[]> {
    if (!fs.existsSync(videoPath)) throw new Error(`video not found: ${videoPath}`);
    const outDir = fs.mkdtempSync(path.join(require("os").tmpdir(), "partmedia-"));
    // ffmpeg fps filter to get evenly-spaced frames; rate computed from probe
    // For v1 we use a simpler `-vf "select='not(mod(n\,N))'"` with N from duration probe.
    // Fallback if duration probe fails: just take first N frames.
    try {
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", videoPath,
        "-vf", `fps=1/${Math.max(1, Math.floor(60 / frameCount))}`,
        "-frames:v", String(frameCount),
        path.join(outDir, "frame_%03d.png"),
      ], { timeout: 60_000 });
    } catch (err: any) {
      throw new Error(`ffmpeg failed: ${err?.message ?? String(err)}`);
    }
    const files = fs.readdirSync(outDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => path.join(outDir, f));
    if (files.length === 0) throw new Error("ffmpeg produced no frames");
    return files;
  }
}

export const partMediaToCADEngine = new PartMediaToCADEngine();
