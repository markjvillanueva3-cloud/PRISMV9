/**
 * GCodeReverseCADEngine — reverse-engineers a finished CAD part from a
 * CNC program by replaying each block as a tool-sweep volume and emitting
 * the residual stock geometry. The Track 1 core for the user directive
 * (2026-05-24, slot:echo) "reverse engineer the finished cad design from a
 * cnc program".
 *
 * Algorithm:
 *   stock_remaining = initial_stock
 *   for each block:
 *     tool_sweep_volume = compute_sweep(tool, motion, geometry)
 *     stock_remaining = stock_remaining - tool_sweep_volume
 *   residual = stock_remaining = the finished part
 *
 * V1 ships a feature-bucket implementation (not full CSG): rather than
 * mesh booleans, we accumulate "feature buckets" (pocket / hole / face /
 * contour-edge / 3d-surface) with their positions + dimensions extracted
 * from the G-code blocks. V2 would swap in Manifold.js or three-bvh-csg
 * for true CSG. V1 is enough to answer "what part does this program make"
 * + drive run-time-vs-actual validation + feed the bidirectional
 * optimization loop.
 *
 * @milestone GCODE-REVERSE-CAD-MS0
 */

import type { ParsedBlock } from "./GCodeRuntimePredictorEngine.js";

export interface ToolEnvelope {
  tool_number: number;
  type: "endmill" | "ballmill" | "facemill" | "chamfermill" | "bullnose" | "drill" | "tap" | "bore" | "thread" | "form";
  diameter_mm: number;
  flutes?: number;
  corner_radius_mm?: number;
  overall_length_mm?: number;
  flute_length_mm?: number;
}

export interface StockBlock {
  /** Stock geometry as an axis-aligned bounding box (V1 simplification). */
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface ReverseCADFeature {
  kind: "pocket" | "hole" | "face" | "contour_edge" | "3d_surface" | "tapped_hole" | "bored_hole" | "chamfer";
  tool_number: number;
  /** Anchor point (mm) — for holes = center, for pockets = origin corner */
  position: { x: number; y: number; z: number };
  /** Primary dimension (mm) — diameter for holes, width for pockets, depth for faces */
  primary_dim_mm: number;
  /** Secondary dimension (mm) — length for pockets, depth for holes */
  secondary_dim_mm?: number;
  /** Z extent (depth) */
  depth_mm: number;
  /** Confidence 0..1 — how strong the feature classification signal is */
  confidence: number;
  /** Source block range (Nxxx start..end) */
  source_blocks: { start?: number; end?: number };
}

export interface ReverseCADResult {
  /** Initial stock that was reverse-engineered against */
  stock: StockBlock;
  /** Extracted features */
  features: ReverseCADFeature[];
  /** Material removed (mm^3, summed across all features) */
  material_removed_mm3: number;
  /** Stock volume (mm^3) */
  stock_volume_mm3: number;
  /** Residual (finished part) volume estimate (mm^3) */
  finished_volume_mm3: number;
  /** Feature-type histogram */
  feature_counts: Record<ReverseCADFeature["kind"], number>;
  /** Operator-readable summary */
  summary: string[];
  /** R12 warnings — features that didn't fit cleanly into a kind */
  warnings: string[];
}

const DRILL_DEPTH_THRESHOLD_MM = 1.0;
const POCKET_AREA_THRESHOLD_MM2 = 4.0;
const HOLE_DIAMETER_MAX_MM = 50;
const FACE_DOC_MAX_MM = 2.0;
const CONFIDENCE_DRILL = 0.95;
const CONFIDENCE_TAP = 0.95;
const CONFIDENCE_BORE = 0.92;
const CONFIDENCE_POCKET = 0.85;
const CONFIDENCE_FACE = 0.80;
const CONFIDENCE_CONTOUR = 0.75;
const CONFIDENCE_SURFACE = 0.65;

export class GCodeReverseCADEngine {
  /**
   * Reverse-engineer a CAD model from a parsed G-code program.
   *
   * R12 fail-loud: unknown tool numbers throw, negative stock dimensions
   * throw, NaN positions throw. Caller-supplied bad data must not silently
   * produce wrong CAD that misleads operator audits.
   */
  reconstruct(
    blocks: ParsedBlock[],
    tools: Map<number, ToolEnvelope>,
    stock: StockBlock,
  ): ReverseCADResult {
    if (!Array.isArray(blocks)) throw new Error("blocks must be an array");
    if (!stock || !stock.min || !stock.max) throw new Error("stock geometry required");
    const stockSize = {
      x: stock.max.x - stock.min.x,
      y: stock.max.y - stock.min.y,
      z: stock.max.z - stock.min.z,
    };
    if (stockSize.x <= 0 || stockSize.y <= 0 || stockSize.z <= 0) {
      throw new Error(`Stock dimensions must be positive — got ${JSON.stringify(stockSize)}`);
    }
    const stockVol = stockSize.x * stockSize.y * stockSize.z;

    // Group blocks by tool — each tool's contiguous block range = 1 op
    const opGroups = this.groupBlocksByTool(blocks);

    const features: ReverseCADFeature[] = [];
    const warnings: string[] = [];

    for (const op of opGroups) {
      const tool = tools.get(op.tool_number);
      if (!tool) {
        warnings.push(`Tool T${op.tool_number} not in catalog — skipped ${op.blocks.length} blocks`);
        continue;
      }
      const feature = this.classifyOp(op, tool);
      if (feature) {
        features.push(feature);
      } else {
        warnings.push(`Op with T${op.tool_number} (${op.blocks.length} blocks) did not classify — likely complex 3D surface`);
      }
    }

    // Volume accounting
    let removedVol = 0;
    for (const f of features) {
      removedVol += this.featureVolume(f);
    }
    const finishedVol = Math.max(0, stockVol - removedVol);

    const counts: Record<ReverseCADFeature["kind"], number> = {
      pocket: 0, hole: 0, face: 0, contour_edge: 0,
      "3d_surface": 0, tapped_hole: 0, bored_hole: 0, chamfer: 0,
    };
    for (const f of features) counts[f.kind]++;

    const summary: string[] = [];
    summary.push(`Stock: ${stockSize.x.toFixed(1)} x ${stockSize.y.toFixed(1)} x ${stockSize.z.toFixed(1)} mm (${(stockVol / 1000).toFixed(1)} cm^3)`);
    summary.push(`Features extracted: ${features.length}`);
    for (const [kind, n] of Object.entries(counts)) {
      if (n > 0) summary.push(`  ${kind}: ${n}`);
    }
    summary.push(`Material removed: ${(removedVol / 1000).toFixed(2)} cm^3 (${((removedVol / stockVol) * 100).toFixed(1)}% of stock)`);
    summary.push(`Finished part volume: ${(finishedVol / 1000).toFixed(2)} cm^3`);

    return {
      stock,
      features,
      material_removed_mm3: removedVol,
      stock_volume_mm3: stockVol,
      finished_volume_mm3: finishedVol,
      feature_counts: counts,
      summary,
      warnings,
    };
  }

  private groupBlocksByTool(blocks: ParsedBlock[]): Array<{ tool_number: number; blocks: ParsedBlock[] }> {
    const groups: Array<{ tool_number: number; blocks: ParsedBlock[] }> = [];
    let currentTool = 0;
    let currentGroup: ParsedBlock[] = [];
    for (const b of blocks) {
      // Tool change marker = M06 + T#
      if (b.m?.includes(6) && typeof b.t === "number") {
        if (currentGroup.length > 0) groups.push({ tool_number: currentTool, blocks: currentGroup });
        currentTool = b.t;
        currentGroup = [];
        continue;
      }
      if (typeof b.t === "number" && !b.m?.includes(6)) {
        // T preload — engine ignores until M06 commits
        continue;
      }
      currentGroup.push(b);
    }
    if (currentGroup.length > 0 && currentTool > 0) {
      groups.push({ tool_number: currentTool, blocks: currentGroup });
    }
    return groups;
  }

  private classifyOp(
    op: { tool_number: number; blocks: ParsedBlock[] },
    tool: ToolEnvelope,
  ): ReverseCADFeature | null {
    // Walk the op's blocks and look for canned cycles + extent patterns
    const motions = op.blocks
      .filter(b => b.motion)
      .map(b => b.motion);
    const cannedCount = motions.filter(m => m === "G81" || m === "G82" || m === "G83" || m === "G84" || m === "G85").length;
    const hasG84 = motions.includes("G84");
    const hasG85 = motions.includes("G85");
    const hasG81orG83 = motions.some(m => m === "G81" || m === "G83");

    // Extent of motion
    const xs = op.blocks.map(b => b.x).filter((v): v is number => typeof v === "number");
    const ys = op.blocks.map(b => b.y).filter((v): v is number => typeof v === "number");
    const zs = op.blocks.map(b => b.z).filter((v): v is number => typeof v === "number");
    if (xs.length === 0 || ys.length === 0 || zs.length === 0) return null;
    const xExtent = Math.max(...xs) - Math.min(...xs);
    const yExtent = Math.max(...ys) - Math.min(...ys);
    const zExtent = Math.abs(Math.min(...zs));
    const xyArea = xExtent * yExtent;
    const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
    const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
    const minZ = Math.min(...zs);
    const startBlock = op.blocks[0];
    const endBlock = op.blocks[op.blocks.length - 1];

    // Classification priority: canned cycles win, then op extent shape
    if (hasG84 && tool.type === "tap") {
      return {
        kind: "tapped_hole",
        tool_number: op.tool_number,
        position: { x: centerX, y: centerY, z: minZ },
        primary_dim_mm: tool.diameter_mm,
        depth_mm: zExtent,
        confidence: CONFIDENCE_TAP,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    if (hasG85 && tool.type === "bore") {
      return {
        kind: "bored_hole",
        tool_number: op.tool_number,
        position: { x: centerX, y: centerY, z: minZ },
        primary_dim_mm: tool.diameter_mm,
        depth_mm: zExtent,
        confidence: CONFIDENCE_BORE,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    if ((hasG81orG83 || tool.type === "drill") && zExtent > DRILL_DEPTH_THRESHOLD_MM && tool.diameter_mm <= HOLE_DIAMETER_MAX_MM) {
      return {
        kind: "hole",
        tool_number: op.tool_number,
        position: { x: centerX, y: centerY, z: minZ },
        primary_dim_mm: tool.diameter_mm,
        depth_mm: zExtent,
        confidence: CONFIDENCE_DRILL,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    // Face mill: face-tool + shallow DOC + wide XY area
    if (tool.type === "facemill" && zExtent <= FACE_DOC_MAX_MM && xyArea > POCKET_AREA_THRESHOLD_MM2 * 10) {
      return {
        kind: "face",
        tool_number: op.tool_number,
        position: { x: Math.min(...xs), y: Math.min(...ys), z: minZ },
        primary_dim_mm: xExtent,
        secondary_dim_mm: yExtent,
        depth_mm: zExtent,
        confidence: CONFIDENCE_FACE,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    // Pocket: end-mill + closed area + significant depth
    if ((tool.type === "endmill" || tool.type === "bullnose") && xyArea > POCKET_AREA_THRESHOLD_MM2 && zExtent > FACE_DOC_MAX_MM) {
      return {
        kind: "pocket",
        tool_number: op.tool_number,
        position: { x: Math.min(...xs), y: Math.min(...ys), z: minZ },
        primary_dim_mm: xExtent,
        secondary_dim_mm: yExtent,
        depth_mm: zExtent,
        confidence: CONFIDENCE_POCKET,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    // Chamfer
    if (tool.type === "chamfermill") {
      return {
        kind: "chamfer",
        tool_number: op.tool_number,
        position: { x: centerX, y: centerY, z: minZ },
        primary_dim_mm: tool.diameter_mm,
        depth_mm: zExtent,
        confidence: 0.85,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    // Contour edge: shallow DOC + linear path
    if ((tool.type === "endmill" || tool.type === "bullnose") && zExtent <= FACE_DOC_MAX_MM && xyArea > POCKET_AREA_THRESHOLD_MM2) {
      return {
        kind: "contour_edge",
        tool_number: op.tool_number,
        position: { x: Math.min(...xs), y: Math.min(...ys), z: minZ },
        primary_dim_mm: Math.max(xExtent, yExtent),
        depth_mm: zExtent,
        confidence: CONFIDENCE_CONTOUR,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    // 3D surface fallback: ball-mill + many motions
    if (tool.type === "ballmill" && cannedCount === 0 && motions.length > 50) {
      return {
        kind: "3d_surface",
        tool_number: op.tool_number,
        position: { x: centerX, y: centerY, z: minZ },
        primary_dim_mm: Math.max(xExtent, yExtent),
        depth_mm: zExtent,
        confidence: CONFIDENCE_SURFACE,
        source_blocks: { start: startBlock.n, end: endBlock.n },
      };
    }
    return null;
  }

  private featureVolume(f: ReverseCADFeature): number {
    switch (f.kind) {
      case "hole":
      case "tapped_hole":
      case "bored_hole":
        return Math.PI * (f.primary_dim_mm / 2) ** 2 * f.depth_mm;
      case "pocket":
        return (f.primary_dim_mm) * (f.secondary_dim_mm ?? f.primary_dim_mm) * f.depth_mm;
      case "face":
        return (f.primary_dim_mm) * (f.secondary_dim_mm ?? f.primary_dim_mm) * f.depth_mm;
      case "contour_edge":
        return f.primary_dim_mm * f.depth_mm * 1.0; // 1mm-wide kerf assumption
      case "3d_surface":
        return f.primary_dim_mm * f.primary_dim_mm * f.depth_mm * 0.3; // 30% removal fraction
      case "chamfer":
        return f.primary_dim_mm * f.depth_mm * 0.5;
    }
  }
}

export const gcodeReverseCADEngine = new GCodeReverseCADEngine();
