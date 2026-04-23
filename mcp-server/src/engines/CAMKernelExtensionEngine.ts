/**
 * CAMKernelExtensionEngine — CK-MS10 + CK-MS12
 *
 * CK-MS10: Turning profile generation, 2D nesting optimization, DXF/SVG import
 * CK-MS12: Natural language CAM command interpretation, G-code diff, result cache
 *
 * Capabilities:
 * 1. Turning profile — OD/ID/face/groove/thread features to XZ polyline with approach/retract
 * 2. 2D nesting — Bottom-left fill with rotation (0/90/180/270) for sheet optimization
 * 3. DXF import — LINE/ARC/CIRCLE/POLYLINE entity extraction with layer support
 * 4. SVG import — M/L/A/C path command parsing to geometric entities
 * 5. Geometry-to-features — Parsed geometry to machining features (pockets/holes/contours)
 * 6. NL CAM — Pattern-match natural language to structured CAM operations
 * 7. G-code diff — Structural comparison (tools, S/F, lines, cycle time)
 * 8. Result cache — LRU in-memory cache (500 entries, TTL-aware)
 *
 * Actions: turning_profile, nest_2d, parse_dxf, parse_svg, geometry_to_features,
 *   nl_command, diff_gcode, cache_result, get_cached, cache_key
 *
 * @module CAMKernelExtensionEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/** 2D point in XZ or XY plane. */
export interface CKEPoint2D {
  x: number;
  y: number;
}

/** Turning feature definition (OD, ID, face, groove, thread). */
export interface CKETurningFeature {
  type: "od" | "id" | "face" | "groove" | "thread";
  od_mm?: number;
  id_mm?: number;
  length_mm: number;
  z_start?: number;
  depth_mm?: number;
  width_mm?: number;
  pitch_mm?: number;
  taper_angle_deg?: number;
}

/** Profile segment — line or arc between two points. */
export interface CKEProfileSegment {
  start: CKEPoint2D;
  end: CKEPoint2D;
  type: "line" | "arc";
  radius?: number;
  center?: CKEPoint2D;
}

/** Complete turning profile with approach/retract paths. */
export interface CKETurningProfile {
  points: CKEPoint2D[];
  segments: CKEProfileSegment[];
  approach: CKEPoint2D[];
  retract: CKEPoint2D[];
  feature_count: number;
  total_length_mm: number;
}

/** 2D part for nesting. */
export interface CKEPart2D {
  id: string;
  width: number;
  height: number;
  quantity: number;
}

/** Sheet/plate dimensions. */
export interface CKESheetDims {
  width: number;
  height: number;
}

/** Single part placement on a sheet. */
export interface CKEPlacement {
  part_id: string;
  x: number;
  y: number;
  rotation_deg: number;
  instance: number;
}

/** Nesting optimization result. */
export interface CKENestingResult {
  placements: CKEPlacement[];
  utilization_pct: number;
  parts_fitted: number;
  waste_pct: number;
  sheet_width: number;
  sheet_height: number;
}

/** Geometric entity extracted from DXF/SVG. */
export interface CKEGeomEntity {
  type: "line" | "arc" | "circle" | "polyline" | "cubic_bezier" | "point";
  layer?: string;
  points: CKEPoint2D[];
  radius?: number;
  center?: CKEPoint2D;
  start_angle_deg?: number;
  end_angle_deg?: number;
}

/** Parsed geometry collection. */
export interface CKEParsedGeometry {
  entities: CKEGeomEntity[];
  bounds: { min: CKEPoint2D; max: CKEPoint2D };
  layer_count: number;
  source_format: "dxf" | "svg";
}

/** Machining feature derived from geometry. */
export interface CKEMachiningFeature {
  type: "pocket" | "hole" | "contour" | "slot" | "boss" | "face";
  center?: CKEPoint2D;
  dimensions: Record<string, number>;
  depth_mm?: number;
}

/** Feature list result. */
export interface CKEFeatureList {
  features: CKEMachiningFeature[];
  feature_count: number;
  bounding_box: { min: CKEPoint2D; max: CKEPoint2D };
}

/** Interpreted NL command result. */
export interface CKEInterpretedCommand {
  operation: string;
  parameters: Record<string, unknown>;
  feature_type?: string;
  confidence: number;
  raw_text: string;
}

/** Single S/F change in diff. */
export interface CKESFChange {
  line: number;
  old_s?: number;
  new_s?: number;
  old_f?: number;
  new_f?: number;
}

/** G-code diff result. */
export interface CKEGCodeDiff {
  additions: number;
  removals: number;
  sf_changes: CKESFChange[];
  tool_changes: string[];
  structural_changes: string[];
  summary: string;
  program1_lines: number;
  program2_lines: number;
}

/** Cache entry with timestamp. */
interface CKECacheEntry {
  value: unknown;
  timestamp: number;
  access_time: number;
}

// ============================================================================
// NL COMMAND PATTERNS
// ============================================================================

interface NLPattern {
  regex: RegExp;
  operation: string;
  feature_type?: string;
  extractor: (m: RegExpMatchArray) => Record<string, unknown>;
}

const NL_PATTERNS: NLPattern[] = [
  {
    regex: /rough(?:ing)?\s+(?:the\s+)?pocket\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*mm\s*(?:deep)?/i,
    operation: "pocket_roughing",
    feature_type: "pocket",
    extractor: (m) => ({ depth_mm: parseFloat(m[1]), strategy: "adaptive_clearing" }),
  },
  {
    regex: /finish(?:ing)?\s+(?:the\s+)?pocket\s+(?:to\s+)?(?:Ra\s*)?(\d+(?:\.\d+)?)/i,
    operation: "pocket_finishing",
    feature_type: "pocket",
    extractor: (m) => ({ target_ra: parseFloat(m[1]), strategy: "contour_parallel" }),
  },
  {
    regex: /drill\s+(\d+)\s+holes?\s+(?:M(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*mm)\s*(through|blind)?/i,
    operation: "drilling",
    feature_type: "hole",
    extractor: (m) => ({
      hole_count: parseInt(m[1]),
      diameter_mm: m[2] ? parseFloat(m[2]) : parseFloat(m[3]),
      is_threaded: !!m[2],
      through: (m[4] || "").toLowerCase() === "through",
    }),
  },
  {
    regex: /tap\s+(?:M(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?)/i,
    operation: "tapping",
    feature_type: "hole",
    extractor: (m) => ({
      thread_size: `M${m[1]}`,
      diameter_mm: parseFloat(m[1]),
      pitch_mm: m[2] ? parseFloat(m[2]) : undefined,
    }),
  },
  {
    regex: /finish(?:ing)?\s+(?:the\s+)?(?:top\s+)?face\s+(?:to\s+)?(?:Ra\s*)?(\d+(?:\.\d+)?)/i,
    operation: "face_finishing",
    feature_type: "face",
    extractor: (m) => ({ target_ra: parseFloat(m[1]), strategy: "face_mill" }),
  },
  {
    regex: /face\s*(?:mill(?:ing)?)\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*mm/i,
    operation: "facing",
    feature_type: "face",
    extractor: (m) => ({ depth_mm: parseFloat(m[1]), strategy: "face_mill" }),
  },
  {
    regex: /(?:rough|machine)\s+(?:the\s+)?contour\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*mm\s*(?:deep|depth)?/i,
    operation: "contour_roughing",
    feature_type: "contour",
    extractor: (m) => ({ depth_mm: parseFloat(m[1]), strategy: "contour_offset" }),
  },
  {
    regex: /slot(?:ting)?\s+(\d+(?:\.\d+)?)\s*(?:mm)?\s*(?:wide|x)\s*(?:(\d+(?:\.\d+)?)\s*mm\s*(?:deep|long))?/i,
    operation: "slotting",
    feature_type: "slot",
    extractor: (m) => ({
      width_mm: parseFloat(m[1]),
      depth_mm: m[2] ? parseFloat(m[2]) : undefined,
    }),
  },
  {
    regex: /bore\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*mm\s*(?:diameter|dia)?/i,
    operation: "boring",
    feature_type: "hole",
    extractor: (m) => ({ diameter_mm: parseFloat(m[1]), strategy: "boring" }),
  },
  {
    regex: /thread(?:ing)?\s+(?:M(\d+(?:\.\d+)?)(?:\s*x\s*(\d+(?:\.\d+)?))?)\s*(?:(\d+(?:\.\d+)?)\s*mm\s*(?:deep|length))?/i,
    operation: "thread_milling",
    feature_type: "hole",
    extractor: (m) => ({
      thread_size: `M${m[1]}`,
      diameter_mm: parseFloat(m[1]),
      pitch_mm: m[2] ? parseFloat(m[2]) : undefined,
      depth_mm: m[3] ? parseFloat(m[3]) : undefined,
    }),
  },
  {
    regex: /chamfer\s+(\d+(?:\.\d+)?)\s*(?:mm|°|deg)/i,
    operation: "chamfering",
    feature_type: "contour",
    extractor: (m) => ({ chamfer_size: parseFloat(m[1]) }),
  },
  {
    regex: /deburr(?:ing)?\s+(?:the\s+)?(?:edges?|part)/i,
    operation: "deburring",
    feature_type: "contour",
    extractor: () => ({ strategy: "edge_break" }),
  },
  {
    regex: /engrav(?:e|ing)\s+[""']?(.+?)[""']?\s*(?:(\d+(?:\.\d+)?)\s*mm\s*(?:deep))?/i,
    operation: "engraving",
    feature_type: "contour",
    extractor: (m) => ({ text: m[1].trim(), depth_mm: m[2] ? parseFloat(m[2]) : 0.1 }),
  },
  {
    regex: /(?:3d|surface)\s+(?:rough(?:ing)?)\s+(?:with\s+)?(?:(\d+(?:\.\d+)?)\s*mm\s+(?:stepdown|ap))?/i,
    operation: "3d_roughing",
    feature_type: "pocket",
    extractor: (m) => ({ ap_mm: m[1] ? parseFloat(m[1]) : undefined, strategy: "adaptive_3d" }),
  },
  {
    regex: /(?:3d|surface)\s+finish(?:ing)?\s+(?:to\s+)?(?:Ra\s*)?(\d+(?:\.\d+)?)?/i,
    operation: "3d_finishing",
    feature_type: "contour",
    extractor: (m) => ({ target_ra: m[1] ? parseFloat(m[1]) : undefined, strategy: "scallop" }),
  },
];

// ============================================================================
// ENGINE
// ============================================================================

/** CAMKernelExtensionEngine — CK-MS10 + CK-MS12 implementation. */
class CAMKernelExtensionEngineImpl {
  private cache: Map<string, CKECacheEntry> = new Map();
  private readonly MAX_CACHE_SIZE = 500;

  // ==========================================================================
  // CK-MS10a: Turning Profile Generation
  // ==========================================================================

  /**
   * Generate 2D turning profile from feature list.
   * Features are processed in Z-order to build XZ polyline.
   * Approach and retract paths include safe clearance.
   */
  generateTurningProfile(
    features: CKETurningFeature[],
    options: { clearance_mm?: number; retract_x_mm?: number } = {}
  ): CKETurningProfile {
    const clearance = options.clearance_mm ?? 2.0;
    const retractX = options.retract_x_mm ?? 5.0;

    if (!features.length) {
      return {
        points: [],
        segments: [],
        approach: [],
        retract: [],
        feature_count: 0,
        total_length_mm: 0,
      };
    }

    // Sort features by z_start descending (spindle face = Z0, work extends in -Z)
    const sorted = [...features].sort((a, b) => {
      const za = a.z_start ?? 0;
      const zb = b.z_start ?? 0;
      return zb - za;
    });

    const points: CKEPoint2D[] = [];
    const segments: CKEProfileSegment[] = [];
    let currentZ = 0;
    let maxRadius = 0;

    for (const feat of sorted) {
      const zStart = feat.z_start ?? currentZ;

      switch (feat.type) {
        case "od": {
          const r = (feat.od_mm ?? 50) / 2;
          maxRadius = Math.max(maxRadius, r);
          const p1: CKEPoint2D = { x: r, y: zStart };
          const p2: CKEPoint2D = { x: r, y: zStart - feat.length_mm };
          if (feat.taper_angle_deg) {
            const taperOffset =
              feat.length_mm * Math.tan((feat.taper_angle_deg * Math.PI) / 180);
            p2.x = r - taperOffset;
          }
          points.push(p1, p2);
          segments.push({ start: p1, end: p2, type: "line" });
          currentZ = zStart - feat.length_mm;
          break;
        }
        case "id": {
          const r = (feat.id_mm ?? 20) / 2;
          const depth = feat.depth_mm ?? feat.length_mm;
          const p1: CKEPoint2D = { x: r, y: zStart };
          const p2: CKEPoint2D = { x: r, y: zStart - depth };
          points.push(p1, p2);
          segments.push({ start: p1, end: p2, type: "line" });
          currentZ = zStart - depth;
          break;
        }
        case "face": {
          const outerR = (feat.od_mm ?? 50) / 2;
          const innerR = (feat.id_mm ?? 0) / 2;
          maxRadius = Math.max(maxRadius, outerR);
          const p1: CKEPoint2D = { x: outerR, y: zStart };
          const p2: CKEPoint2D = { x: innerR, y: zStart };
          points.push(p1, p2);
          segments.push({ start: p1, end: p2, type: "line" });
          break;
        }
        case "groove": {
          const outerR = (feat.od_mm ?? 50) / 2;
          const grooveWidth = feat.width_mm ?? 3;
          const grooveDepth = feat.depth_mm ?? 2;
          const bottomR = outerR - grooveDepth;
          const p1: CKEPoint2D = { x: outerR, y: zStart };
          const p2: CKEPoint2D = { x: bottomR, y: zStart };
          const p3: CKEPoint2D = { x: bottomR, y: zStart - grooveWidth };
          const p4: CKEPoint2D = { x: outerR, y: zStart - grooveWidth };
          points.push(p1, p2, p3, p4);
          segments.push(
            { start: p1, end: p2, type: "line" },
            { start: p2, end: p3, type: "line" },
            { start: p3, end: p4, type: "line" }
          );
          currentZ = zStart - grooveWidth;
          break;
        }
        case "thread": {
          const r = (feat.od_mm ?? 20) / 2;
          const pitch = feat.pitch_mm ?? 1.5;
          maxRadius = Math.max(maxRadius, r);
          const threadDepth = pitch * 0.6134; // ISO 60deg thread depth factor
          const minorR = r - threadDepth;
          const p1: CKEPoint2D = { x: r, y: zStart };
          const p2: CKEPoint2D = { x: r, y: zStart - feat.length_mm };
          // Thread minor diameter representation
          const p3: CKEPoint2D = { x: minorR, y: zStart };
          const p4: CKEPoint2D = { x: minorR, y: zStart - feat.length_mm };
          points.push(p1, p2, p3, p4);
          segments.push(
            { start: p1, end: p2, type: "line" },
            { start: p3, end: p4, type: "line" }
          );
          currentZ = zStart - feat.length_mm;
          break;
        }
      }
    }

    // Approach path: rapid to clearance above first OD, then feed to first point
    const firstPt = points[0] ?? { x: 0, y: 0 };
    const approach: CKEPoint2D[] = [
      { x: firstPt.x + retractX, y: firstPt.y + clearance },
      { x: firstPt.x + clearance, y: firstPt.y + clearance },
      { x: firstPt.x + clearance, y: firstPt.y },
    ];

    // Retract path: pull away from last point
    const lastPt = points[points.length - 1] ?? { x: 0, y: 0 };
    const retract: CKEPoint2D[] = [
      { x: lastPt.x + clearance, y: lastPt.y },
      { x: lastPt.x + retractX, y: lastPt.y },
      { x: maxRadius + retractX, y: clearance },
    ];

    // Calculate total profile length
    let totalLen = 0;
    for (const seg of segments) {
      const dx = seg.end.x - seg.start.x;
      const dy = seg.end.y - seg.start.y;
      totalLen += Math.sqrt(dx * dx + dy * dy);
    }

    return {
      points,
      segments,
      approach,
      retract,
      feature_count: features.length,
      total_length_mm: Math.round(totalLen * 1000) / 1000,
    };
  }

  // ==========================================================================
  // CK-MS10b: 2D Nesting Optimization
  // ==========================================================================

  /**
   * Pack 2D parts onto a sheet using bottom-left fill with rotation candidates.
   * Tries 0, 90, 180, 270 deg rotations per part instance. Greedy placement.
   */
  nestParts2D(
    parts: CKEPart2D[],
    sheet: CKESheetDims,
    options: { kerf_mm?: number; margin_mm?: number } = {}
  ): CKENestingResult {
    const kerf = options.kerf_mm ?? 0;
    const margin = options.margin_mm ?? 0;

    const placements: CKEPlacement[] = [];
    // Track occupied cells in a spatial grid for fast collision check
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    const sheetArea = sheet.width * sheet.height;

    // Expand parts by quantity, sort largest-area-first for better packing
    const instances: { part: CKEPart2D; instance: number }[] = [];
    for (const p of parts) {
      for (let i = 0; i < p.quantity; i++) {
        instances.push({ part: p, instance: i + 1 });
      }
    }
    instances.sort((a, b) => {
      const areaA = a.part.width * a.part.height;
      const areaB = b.part.width * b.part.height;
      return areaB - areaA;
    });

    const rotations = [0, 90, 180, 270];
    let usedArea = 0;

    for (const inst of instances) {
      let placed = false;

      for (const rot of rotations) {
        const w =
          rot === 90 || rot === 270
            ? inst.part.height + kerf
            : inst.part.width + kerf;
        const h =
          rot === 90 || rot === 270
            ? inst.part.width + kerf
            : inst.part.height + kerf;

        if (w > sheet.width - 2 * margin || h > sheet.height - 2 * margin) {
          continue;
        }

        // Bottom-left fill: scan for first valid position
        const pos = this.findBottomLeftPosition(
          w,
          h,
          sheet,
          margin,
          occupied
        );
        if (pos) {
          placements.push({
            part_id: inst.part.id,
            x: Math.round(pos.x * 1000) / 1000,
            y: Math.round(pos.y * 1000) / 1000,
            rotation_deg: rot,
            instance: inst.instance,
          });
          occupied.push({ x: pos.x, y: pos.y, w, h });
          usedArea += inst.part.width * inst.part.height;
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Could not fit this part instance
      }
    }

    const utilization = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;

    return {
      placements,
      utilization_pct: Math.round(utilization * 100) / 100,
      parts_fitted: placements.length,
      waste_pct: Math.round((100 - utilization) * 100) / 100,
      sheet_width: sheet.width,
      sheet_height: sheet.height,
    };
  }

  /** Find bottom-left position using scan with step size for performance. */
  private findBottomLeftPosition(
    w: number,
    h: number,
    sheet: CKESheetDims,
    margin: number,
    occupied: { x: number; y: number; w: number; h: number }[]
  ): CKEPoint2D | null {
    const step = 1; // 1mm resolution
    const maxX = sheet.width - margin - w;
    const maxY = sheet.height - margin - h;

    // Collect candidate X and Y positions from existing placements + margin
    const xCandidates = new Set<number>([margin]);
    const yCandidates = new Set<number>([margin]);
    for (const r of occupied) {
      xCandidates.add(r.x + r.w);
      yCandidates.add(r.y + r.h);
    }
    // Add grid positions at step intervals
    for (let x = margin; x <= maxX; x += step) xCandidates.add(x);
    for (let y = margin; y <= maxY; y += step) yCandidates.add(y);

    const sortedY = Array.from(yCandidates).filter((v) => v <= maxY).sort((a, b) => a - b);
    const sortedX = Array.from(xCandidates).filter((v) => v <= maxX).sort((a, b) => a - b);

    for (const y of sortedY) {
      for (const x of sortedX) {
        if (!this.rectOverlapsAny(x, y, w, h, occupied)) {
          return { x, y };
        }
      }
    }
    return null;
  }

  /** Check if rect overlaps any occupied rect. */
  private rectOverlapsAny(
    x: number,
    y: number,
    w: number,
    h: number,
    occupied: { x: number; y: number; w: number; h: number }[]
  ): boolean {
    for (const r of occupied) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
        return true;
      }
    }
    return false;
  }

  // ==========================================================================
  // CK-MS10c: DXF Import
  // ==========================================================================

  /**
   * Parse DXF text content into geometric entities.
   * Supports ENTITIES section: LINE, ARC, CIRCLE, LWPOLYLINE, POLYLINE.
   */
  parseDXF(content: string): CKEParsedGeometry {
    const entities: CKEGeomEntity[] = [];
    const layers = new Set<string>();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const lines = content.split(/\r?\n/);
    let i = 0;

    const readPair = (): { code: number; value: string } | null => {
      if (i + 1 >= lines.length) return null;
      const code = parseInt(lines[i].trim(), 10);
      const value = lines[i + 1].trim();
      i += 2;
      return { code, value };
    };

    const updateBounds = (p: CKEPoint2D) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    };

    // Seek to ENTITIES section
    while (i < lines.length) {
      if (lines[i].trim() === "ENTITIES") {
        i++;
        break;
      }
      i++;
    }

    // Parse entities
    while (i < lines.length) {
      const pair = readPair();
      if (!pair) break;
      if (pair.code === 0 && pair.value === "ENDSEC") break;

      if (pair.code === 0 && pair.value === "LINE") {
        let layer = "0";
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        while (i < lines.length) {
          const p = readPair();
          if (!p) break;
          if (p.code === 0) { i -= 2; break; }
          if (p.code === 8) layer = p.value;
          if (p.code === 10) x1 = parseFloat(p.value);
          if (p.code === 20) y1 = parseFloat(p.value);
          if (p.code === 11) x2 = parseFloat(p.value);
          if (p.code === 21) y2 = parseFloat(p.value);
        }
        layers.add(layer);
        const p1: CKEPoint2D = { x: x1, y: y1 };
        const p2: CKEPoint2D = { x: x2, y: y2 };
        updateBounds(p1);
        updateBounds(p2);
        entities.push({ type: "line", layer, points: [p1, p2] });
      } else if (pair.code === 0 && pair.value === "CIRCLE") {
        let layer = "0";
        let cx = 0, cy = 0, r = 0;
        while (i < lines.length) {
          const p = readPair();
          if (!p) break;
          if (p.code === 0) { i -= 2; break; }
          if (p.code === 8) layer = p.value;
          if (p.code === 10) cx = parseFloat(p.value);
          if (p.code === 20) cy = parseFloat(p.value);
          if (p.code === 40) r = parseFloat(p.value);
        }
        layers.add(layer);
        const center: CKEPoint2D = { x: cx, y: cy };
        updateBounds({ x: cx - r, y: cy - r });
        updateBounds({ x: cx + r, y: cy + r });
        entities.push({
          type: "circle",
          layer,
          points: [center],
          radius: r,
          center,
        });
      } else if (pair.code === 0 && pair.value === "ARC") {
        let layer = "0";
        let cx = 0, cy = 0, r = 0, sa = 0, ea = 360;
        while (i < lines.length) {
          const p = readPair();
          if (!p) break;
          if (p.code === 0) { i -= 2; break; }
          if (p.code === 8) layer = p.value;
          if (p.code === 10) cx = parseFloat(p.value);
          if (p.code === 20) cy = parseFloat(p.value);
          if (p.code === 40) r = parseFloat(p.value);
          if (p.code === 50) sa = parseFloat(p.value);
          if (p.code === 51) ea = parseFloat(p.value);
        }
        layers.add(layer);
        const center: CKEPoint2D = { x: cx, y: cy };
        const startPt: CKEPoint2D = {
          x: cx + r * Math.cos((sa * Math.PI) / 180),
          y: cy + r * Math.sin((sa * Math.PI) / 180),
        };
        const endPt: CKEPoint2D = {
          x: cx + r * Math.cos((ea * Math.PI) / 180),
          y: cy + r * Math.sin((ea * Math.PI) / 180),
        };
        updateBounds(startPt);
        updateBounds(endPt);
        entities.push({
          type: "arc",
          layer,
          points: [startPt, endPt],
          radius: r,
          center,
          start_angle_deg: sa,
          end_angle_deg: ea,
        });
      } else if (
        pair.code === 0 &&
        (pair.value === "LWPOLYLINE" || pair.value === "POLYLINE")
      ) {
        let layer = "0";
        const pts: CKEPoint2D[] = [];
        let currentX = 0;
        while (i < lines.length) {
          const p = readPair();
          if (!p) break;
          if (p.code === 0) { i -= 2; break; }
          if (p.code === 8) layer = p.value;
          if (p.code === 10) currentX = parseFloat(p.value);
          if (p.code === 20) {
            const pt: CKEPoint2D = { x: currentX, y: parseFloat(p.value) };
            pts.push(pt);
            updateBounds(pt);
          }
        }
        layers.add(layer);
        if (pts.length > 0) {
          entities.push({ type: "polyline", layer, points: pts });
        }
      }
    }

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 0; maxY = 0;
    }

    return {
      entities,
      bounds: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } },
      layer_count: layers.size,
      source_format: "dxf",
    };
  }

  // ==========================================================================
  // CK-MS10c: SVG Import
  // ==========================================================================

  /**
   * Parse SVG path data into geometric entities.
   * Supports M, L, H, V, A, C, Z commands (absolute and relative).
   */
  parseSVG(content: string): CKEParsedGeometry {
    const entities: CKEGeomEntity[] = [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const updateBounds = (p: CKEPoint2D) => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    };

    // Extract path d="" attributes
    const pathRegex = /<path[^>]*\bd\s*=\s*["']([^"']+)["']/gi;
    let pathMatch: RegExpExecArray | null;
    while ((pathMatch = pathRegex.exec(content)) !== null) {
      const d = pathMatch[1];
      const parsed = this.parseSVGPathData(d);
      for (const ent of parsed) {
        entities.push(ent);
        for (const p of ent.points) updateBounds(p);
        if (ent.center) updateBounds(ent.center);
      }
    }

    // Extract <line> elements
    const lineRegex =
      /<line[^>]*x1\s*=\s*["']([^"']+)["'][^>]*y1\s*=\s*["']([^"']+)["'][^>]*x2\s*=\s*["']([^"']+)["'][^>]*y2\s*=\s*["']([^"']+)["']/gi;
    let lineMatch: RegExpExecArray | null;
    while ((lineMatch = lineRegex.exec(content)) !== null) {
      const p1: CKEPoint2D = { x: parseFloat(lineMatch[1]), y: parseFloat(lineMatch[2]) };
      const p2: CKEPoint2D = { x: parseFloat(lineMatch[3]), y: parseFloat(lineMatch[4]) };
      updateBounds(p1);
      updateBounds(p2);
      entities.push({ type: "line", points: [p1, p2] });
    }

    // Extract <circle> elements
    const circleRegex =
      /<circle[^>]*cx\s*=\s*["']([^"']+)["'][^>]*cy\s*=\s*["']([^"']+)["'][^>]*r\s*=\s*["']([^"']+)["']/gi;
    let circleMatch: RegExpExecArray | null;
    while ((circleMatch = circleRegex.exec(content)) !== null) {
      const cx = parseFloat(circleMatch[1]);
      const cy = parseFloat(circleMatch[2]);
      const r = parseFloat(circleMatch[3]);
      const center: CKEPoint2D = { x: cx, y: cy };
      updateBounds({ x: cx - r, y: cy - r });
      updateBounds({ x: cx + r, y: cy + r });
      entities.push({ type: "circle", points: [center], radius: r, center });
    }

    // Extract <rect> elements as polylines
    const rectRegex =
      /<rect[^>]*x\s*=\s*["']([^"']+)["'][^>]*y\s*=\s*["']([^"']+)["'][^>]*width\s*=\s*["']([^"']+)["'][^>]*height\s*=\s*["']([^"']+)["']/gi;
    let rectMatch: RegExpExecArray | null;
    while ((rectMatch = rectRegex.exec(content)) !== null) {
      const rx = parseFloat(rectMatch[1]);
      const ry = parseFloat(rectMatch[2]);
      const rw = parseFloat(rectMatch[3]);
      const rh = parseFloat(rectMatch[4]);
      const pts: CKEPoint2D[] = [
        { x: rx, y: ry },
        { x: rx + rw, y: ry },
        { x: rx + rw, y: ry + rh },
        { x: rx, y: ry + rh },
        { x: rx, y: ry },
      ];
      for (const p of pts) updateBounds(p);
      entities.push({ type: "polyline", points: pts });
    }

    if (minX === Infinity) {
      minX = 0; minY = 0; maxX = 0; maxY = 0;
    }

    return {
      entities,
      bounds: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } },
      layer_count: 1,
      source_format: "svg",
    };
  }

  /** Parse SVG path d-attribute into geometric entities. */
  private parseSVGPathData(d: string): CKEGeomEntity[] {
    const entities: CKEGeomEntity[] = [];
    // Tokenize: split on command letters, keeping them
    const tokens = d.match(/[MmLlHhVvAaCcSsQqTtZz][^MmLlHhVvAaCcSsQqTtZz]*/g);
    if (!tokens) return entities;

    let cx = 0, cy = 0;
    let startX = 0, startY = 0;
    const polylinePoints: CKEPoint2D[] = [];

    const nums = (s: string): number[] => {
      const matches = s.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi);
      return matches ? matches.map(Number) : [];
    };

    for (const token of tokens) {
      const cmd = token[0];
      const args = nums(token.substring(1));

      switch (cmd) {
        case "M":
          if (polylinePoints.length > 1) {
            entities.push({ type: "polyline", points: [...polylinePoints] });
          }
          polylinePoints.length = 0;
          cx = args[0] ?? 0;
          cy = args[1] ?? 0;
          startX = cx;
          startY = cy;
          polylinePoints.push({ x: cx, y: cy });
          // Subsequent pairs are implicit L
          for (let j = 2; j + 1 < args.length; j += 2) {
            cx = args[j]; cy = args[j + 1];
            polylinePoints.push({ x: cx, y: cy });
          }
          break;
        case "m":
          if (polylinePoints.length > 1) {
            entities.push({ type: "polyline", points: [...polylinePoints] });
          }
          polylinePoints.length = 0;
          cx += args[0] ?? 0;
          cy += args[1] ?? 0;
          startX = cx;
          startY = cy;
          polylinePoints.push({ x: cx, y: cy });
          for (let j = 2; j + 1 < args.length; j += 2) {
            cx += args[j]; cy += args[j + 1];
            polylinePoints.push({ x: cx, y: cy });
          }
          break;
        case "L":
          for (let j = 0; j + 1 < args.length; j += 2) {
            cx = args[j]; cy = args[j + 1];
            polylinePoints.push({ x: cx, y: cy });
          }
          break;
        case "l":
          for (let j = 0; j + 1 < args.length; j += 2) {
            cx += args[j]; cy += args[j + 1];
            polylinePoints.push({ x: cx, y: cy });
          }
          break;
        case "H":
          cx = args[0] ?? cx;
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "h":
          cx += args[0] ?? 0;
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "V":
          cy = args[0] ?? cy;
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "v":
          cy += args[0] ?? 0;
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "C":
          // Cubic bezier: store control points + endpoint
          for (let j = 0; j + 5 < args.length; j += 6) {
            const cp1: CKEPoint2D = { x: args[j], y: args[j + 1] };
            const cp2: CKEPoint2D = { x: args[j + 2], y: args[j + 3] };
            const ep: CKEPoint2D = { x: args[j + 4], y: args[j + 5] };
            entities.push({
              type: "cubic_bezier",
              points: [{ x: cx, y: cy }, cp1, cp2, ep],
            });
            cx = ep.x;
            cy = ep.y;
          }
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "c":
          for (let j = 0; j + 5 < args.length; j += 6) {
            const cp1: CKEPoint2D = { x: cx + args[j], y: cy + args[j + 1] };
            const cp2: CKEPoint2D = { x: cx + args[j + 2], y: cy + args[j + 3] };
            const ep: CKEPoint2D = { x: cx + args[j + 4], y: cy + args[j + 5] };
            entities.push({
              type: "cubic_bezier",
              points: [{ x: cx, y: cy }, cp1, cp2, ep],
            });
            cx = ep.x;
            cy = ep.y;
          }
          polylinePoints.push({ x: cx, y: cy });
          break;
        case "A":
        case "a": {
          // Arc: rx ry x-rotation large-arc sweep x y
          for (let j = 0; j + 6 < args.length; j += 7) {
            const rx = args[j];
            const ry = args[j + 1];
            const endX = cmd === "A" ? args[j + 5] : cx + args[j + 5];
            const endY = cmd === "A" ? args[j + 6] : cy + args[j + 6];
            const midX = (cx + endX) / 2;
            const midY = (cy + endY) / 2;
            entities.push({
              type: "arc",
              points: [{ x: cx, y: cy }, { x: endX, y: endY }],
              radius: Math.max(rx, ry),
              center: { x: midX, y: midY },
            });
            cx = endX;
            cy = endY;
          }
          polylinePoints.push({ x: cx, y: cy });
          break;
        }
        case "Z":
        case "z":
          cx = startX;
          cy = startY;
          polylinePoints.push({ x: cx, y: cy });
          break;
      }
    }

    if (polylinePoints.length > 1) {
      entities.push({ type: "polyline", points: [...polylinePoints] });
    }

    return entities;
  }

  // ==========================================================================
  // CK-MS10c: Geometry to Features
  // ==========================================================================

  /**
   * Convert parsed geometry into machining features.
   * Circles → holes, closed polylines → pockets/contours, open polylines → contours.
   */
  geometryToFeatures(parsed: CKEParsedGeometry): CKEFeatureList {
    const features: CKEMachiningFeature[] = [];

    for (const ent of parsed.entities) {
      switch (ent.type) {
        case "circle": {
          const dia = (ent.radius ?? 0) * 2;
          features.push({
            type: "hole",
            center: ent.center ?? ent.points[0],
            dimensions: { diameter_mm: dia },
          });
          break;
        }
        case "arc": {
          features.push({
            type: "contour",
            center: ent.center,
            dimensions: {
              radius_mm: ent.radius ?? 0,
              start_angle_deg: ent.start_angle_deg ?? 0,
              end_angle_deg: ent.end_angle_deg ?? 360,
            },
          });
          break;
        }
        case "polyline": {
          if (ent.points.length < 2) break;
          const pts = ent.points;
          const first = pts[0];
          const last = pts[pts.length - 1];
          const closed =
            Math.abs(first.x - last.x) < 0.01 &&
            Math.abs(first.y - last.y) < 0.01;

          // Calculate bounding box
          let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
          for (const p of pts) {
            if (p.x < pMinX) pMinX = p.x;
            if (p.y < pMinY) pMinY = p.y;
            if (p.x > pMaxX) pMaxX = p.x;
            if (p.y > pMaxY) pMaxY = p.y;
          }
          const width = pMaxX - pMinX;
          const height = pMaxY - pMinY;
          const area = this.polylineArea(pts);

          if (closed && pts.length >= 4) {
            // Determine if pocket or boss based on winding
            const isCCW = area > 0;
            features.push({
              type: isCCW ? "pocket" : "boss",
              center: { x: (pMinX + pMaxX) / 2, y: (pMinY + pMaxY) / 2 },
              dimensions: {
                width_mm: width,
                height_mm: height,
                area_mm2: Math.abs(area),
                vertex_count: pts.length - 1,
              },
            });
          } else {
            features.push({
              type: "contour",
              dimensions: {
                length_mm: this.polylineLength(pts),
                width_mm: width,
                height_mm: height,
              },
            });
          }
          break;
        }
        case "line": {
          if (ent.points.length >= 2) {
            const dx = ent.points[1].x - ent.points[0].x;
            const dy = ent.points[1].y - ent.points[0].y;
            features.push({
              type: "contour",
              dimensions: { length_mm: Math.sqrt(dx * dx + dy * dy) },
            });
          }
          break;
        }
        case "cubic_bezier": {
          features.push({
            type: "contour",
            dimensions: {
              type: "bezier" as unknown as number,
              control_points: ent.points.length as number,
            },
          });
          break;
        }
      }
    }

    return {
      features,
      feature_count: features.length,
      bounding_box: parsed.bounds,
    };
  }

  /** Signed area of a polyline via shoelace formula. */
  private polylineArea(pts: CKEPoint2D[]): number {
    let area = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      area += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
    }
    return area / 2;
  }

  /** Total length of a polyline. */
  private polylineLength(pts: CKEPoint2D[]): number {
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return Math.round(len * 1000) / 1000;
  }

  // ==========================================================================
  // CK-MS12a: Natural Language CAM
  // ==========================================================================

  /**
   * Interpret natural language manufacturing instruction into structured CAM operation.
   * Uses pattern matching with confidence scoring.
   */
  interpretNLCommand(text: string): CKEInterpretedCommand {
    const normalized = text.trim();

    let bestMatch: { pattern: NLPattern; match: RegExpMatchArray; score: number } | null = null;

    for (const pat of NL_PATTERNS) {
      const m = normalized.match(pat.regex);
      if (m) {
        // Score based on match coverage
        const coverage = m[0].length / normalized.length;
        const paramCount = Object.keys(pat.extractor(m)).filter(
          (k) => pat.extractor(m)[k] !== undefined
        ).length;
        const score = coverage * 0.6 + Math.min(paramCount / 4, 1) * 0.4;

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { pattern: pat, match: m, score };
        }
      }
    }

    if (bestMatch) {
      const params = bestMatch.pattern.extractor(bestMatch.match);
      // Remove undefined values
      const cleanParams: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) cleanParams[k] = v;
      }

      return {
        operation: bestMatch.pattern.operation,
        parameters: cleanParams,
        feature_type: bestMatch.pattern.feature_type,
        confidence: Math.round(bestMatch.score * 1000) / 1000,
        raw_text: normalized,
      };
    }

    // Fallback: try to extract any numeric parameters
    const numbers = normalized.match(/\d+(?:\.\d+)?/g);
    return {
      operation: "unknown",
      parameters: numbers
        ? { raw_values: numbers.map(Number) }
        : {},
      confidence: 0,
      raw_text: normalized,
    };
  }

  // ==========================================================================
  // CK-MS12b: G-Code Diff
  // ==========================================================================

  /**
   * Structural diff of two G-code programs.
   * Compares tool lists, S/F values, line counts, and operation structure.
   */
  diffGCode(program1: string, program2: string): CKEGCodeDiff {
    const lines1 = program1.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const lines2 = program2.split(/\r?\n/).filter((l) => l.trim().length > 0);

    // Extract tools
    const tools1 = this.extractTools(lines1);
    const tools2 = this.extractTools(lines2);
    const toolChanges: string[] = [];
    Array.from(tools2).forEach((t) => {
      if (!tools1.has(t)) toolChanges.push(`+${t}`);
    });
    Array.from(tools1).forEach((t) => {
      if (!tools2.has(t)) toolChanges.push(`-${t}`);
    });

    // Extract S/F per line and compare
    const sf1 = this.extractSF(lines1);
    const sf2 = this.extractSF(lines2);
    const sfChanges: CKESFChange[] = [];
    const minLen = Math.min(sf1.length, sf2.length);
    for (let i = 0; i < minLen; i++) {
      if (sf1[i].s !== sf2[i].s || sf1[i].f !== sf2[i].f) {
        const change: CKESFChange = { line: i + 1 };
        if (sf1[i].s !== sf2[i].s) {
          change.old_s = sf1[i].s;
          change.new_s = sf2[i].s;
        }
        if (sf1[i].f !== sf2[i].f) {
          change.old_f = sf1[i].f;
          change.new_f = sf2[i].f;
        }
        sfChanges.push(change);
      }
    }

    // Simple LCS-based addition/removal count
    const { additions, removals } = this.countDiffLines(lines1, lines2);

    // Structural changes
    const structural: string[] = [];
    if (lines1.length !== lines2.length) {
      structural.push(`Line count: ${lines1.length} → ${lines2.length}`);
    }
    if (tools1.size !== tools2.size) {
      structural.push(`Tool count: ${tools1.size} → ${tools2.size}`);
    }
    if (sfChanges.length > 0) {
      structural.push(`${sfChanges.length} S/F value changes`);
    }

    // Build summary
    const summaryParts: string[] = [];
    if (additions > 0) summaryParts.push(`${additions} lines added`);
    if (removals > 0) summaryParts.push(`${removals} lines removed`);
    if (toolChanges.length > 0) summaryParts.push(`${toolChanges.length} tool changes`);
    if (sfChanges.length > 0) summaryParts.push(`${sfChanges.length} S/F changes`);
    const summary = summaryParts.length > 0 ? summaryParts.join(", ") : "Programs are identical";

    return {
      additions,
      removals,
      sf_changes: sfChanges,
      tool_changes: toolChanges,
      structural_changes: structural,
      summary,
      program1_lines: lines1.length,
      program2_lines: lines2.length,
    };
  }

  /** Extract tool numbers from G-code lines. */
  private extractTools(lines: string[]): Set<string> {
    const tools = new Set<string>();
    for (const line of lines) {
      const m = line.match(/T(\d+)/i);
      if (m) tools.add(`T${m[1]}`);
    }
    return tools;
  }

  /** Extract S and F values per G-code line. */
  private extractSF(lines: string[]): { s?: number; f?: number }[] {
    let currentS: number | undefined;
    let currentF: number | undefined;
    const result: { s?: number; f?: number }[] = [];

    for (const line of lines) {
      const sm = line.match(/S(\d+(?:\.\d+)?)/i);
      const fm = line.match(/F(\d+(?:\.\d+)?)/i);
      if (sm) currentS = parseFloat(sm[1]);
      if (fm) currentF = parseFloat(fm[1]);
      result.push({ s: currentS, f: currentF });
    }
    return result;
  }

  /** Count additions and removals via simple set-difference approach. */
  private countDiffLines(
    lines1: string[],
    lines2: string[]
  ): { additions: number; removals: number } {
    // Build line frequency maps for accurate diff counting
    const freq1 = new Map<string, number>();
    const freq2 = new Map<string, number>();

    for (const l of lines1) {
      const trimmed = l.trim();
      freq1.set(trimmed, (freq1.get(trimmed) ?? 0) + 1);
    }
    for (const l of lines2) {
      const trimmed = l.trim();
      freq2.set(trimmed, (freq2.get(trimmed) ?? 0) + 1);
    }

    let removals = 0;
    let additions = 0;

    freq1.forEach((count, line) => {
      const count2 = freq2.get(line) ?? 0;
      if (count > count2) removals += count - count2;
    });
    freq2.forEach((count, line) => {
      const count1 = freq1.get(line) ?? 0;
      if (count > count1) additions += count - count1;
    });

    return { additions, removals };
  }

  // ==========================================================================
  // CK-MS12c: Result Cache
  // ==========================================================================

  /**
   * Store a pipeline result in the LRU cache.
   * Evicts oldest-accessed entries when cache exceeds MAX_CACHE_SIZE.
   */
  cacheResult(key: string, result: unknown): { cached: boolean; key: string; size: number } {
    // LRU eviction
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      let oldestKey = "";
      let oldestTime = Infinity;
      this.cache.forEach((entry, k) => {
        if (entry.access_time < oldestTime) {
          oldestTime = entry.access_time;
          oldestKey = k;
        }
      });
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const now = Date.now();
    this.cache.set(key, { value: result, timestamp: now, access_time: now });

    return { cached: true, key, size: this.cache.size };
  }

  /**
   * Retrieve a cached result if it exists and is not stale.
   * @param maxAge_ms Maximum age in milliseconds (default: 5 minutes)
   */
  getCachedResult(
    key: string,
    maxAge_ms?: number
  ): { hit: boolean; value: unknown; age_ms?: number } {
    const entry = this.cache.get(key);
    if (!entry) return { hit: false, value: null };

    const age = Date.now() - entry.timestamp;
    const maxAge = maxAge_ms ?? 300_000; // 5 min default

    if (age > maxAge) {
      this.cache.delete(key);
      return { hit: false, value: null };
    }

    // Update access time for LRU
    entry.access_time = Date.now();

    return { hit: true, value: entry.value, age_ms: age };
  }

  /**
   * Generate a deterministic cache key from input parameters.
   * Uses DJB2 hash of JSON-serialized input.
   */
  generateCacheKey(input: unknown): string {
    const str = JSON.stringify(input, Object.keys(
      typeof input === "object" && input !== null ? input : {}
    ).sort());
    return `cke_${this.djb2Hash(str)}`;
  }

  /** DJB2 string hash. */
  private djb2Hash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0x7fffffff;
    }
    return hash.toString(36);
  }

  /** Clear all cached entries. */
  clearCache(): { cleared: number } {
    const size = this.cache.size;
    this.cache.clear();
    return { cleared: size };
  }

  /** Get cache statistics. */
  cacheStats(): { size: number; max_size: number; keys: string[] } {
    return {
      size: this.cache.size,
      max_size: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of CAMKernelExtensionEngine. */
export const camKernelExtensionEngine = new CAMKernelExtensionEngineImpl();
export { CAMKernelExtensionEngineImpl as CAMKernelExtensionEngine };
