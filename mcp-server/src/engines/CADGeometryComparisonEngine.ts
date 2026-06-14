/**
 * CADGeometryComparisonEngine — Format-Agnostic CAD Comparison
 * CAD-COMPLETE-MS0/U-CADC26
 *
 * Compare original CAD file vs AI-regenerated geometry:
 *   - STEP: Volume via B-Rep, face/edge count, bounding box
 *   - DXF: 2D area, entity count, layer structure
 *   - STL: Mesh volume, triangle count, surface area
 *   - IGES: Surface area, entity count, bounding box
 *
 * Metrics:
 *   - Volume delta % (threshold: <5%)
 *   - Bounding box delta % (threshold: <2%)
 *   - Topology similarity via Jaccard (threshold: >0.8)
 *   - Feature count delta % (threshold: <20%)
 *
 * 100% pass rate REQUIRED — machined parts go into aircraft/medical/automotive.
 */

import { log } from "../utils/Logger.js";
import type { BaseEngine, EngineInfo, EngineCapability } from "./BaseEngine.js";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/** Supported CAD formats */
export type CADFormat = "STEP" | "DXF" | "STL" | "IGES" | "UNKNOWN";

/** Bounding box representation */
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
}

/** Topology metrics */
export interface TopologyMetrics {
  faceCount: number;
  edgeCount: number;
  vertexCount: number;
  shellCount: number;
  solidCount: number;
  entityTypes: Record<string, number>;
}

/** Feature list extracted from geometry */
export interface ExtractedFeatures {
  features: string[];
  count: number;
  hierarchy: string[];
}

/** Geometry metrics extracted from a CAD file */
export interface GeometryMetrics {
  format: CADFormat;
  filePath: string;
  fileSize: number;
  hash: string;
  volume: number; // mm³ -- interpret via volumeMethod (STEP/IGES report a bbox proxy, NOT solid volume)
  /** How `volume` was derived: solid (true B-rep, n/a yet), mesh (STL signed-tet integration), bbox-proxy (STEP/IGES bounding-box volume), or none (2D/empty). */
  volumeMethod?: "solid" | "mesh" | "bbox-proxy" | "none";
  surfaceArea: number; // mm²
  boundingBox: BoundingBox;
  topology: TopologyMetrics;
  features: ExtractedFeatures;
  extractionTimeMs: number;
  parseWarnings: string[];
  parseErrors: string[];
}

/** Comparison thresholds (configurable) */
export interface ComparisonThresholds {
  volumeDeltaPercent: number; // default 5%
  bboxDeltaPercent: number; // default 2%
  topologySimilarityMin: number; // default 0.8 (Jaccard)
  featureCountDeltaPercent: number; // default 20%
}

/** Single metric comparison result */
export interface MetricComparison {
  metric: string;
  original: number;
  generated: number;
  delta: number;
  deltaPercent: number;
  threshold: number;
  passed: boolean;
  details: string;
}

/** Complete comparison result */
export interface ComparisonResult {
  originalFile: string;
  generatedFile: string;
  timestamp: string;
  overallPassed: boolean;
  passRate: number;
  metrics: MetricComparison[];
  originalMetrics: GeometryMetrics;
  generatedMetrics: GeometryMetrics;
  topologySimilarity: number;
  recommendations: string[];
  comparisonTimeMs: number;
}

/**
 * Control-point-cloud Hausdorff result (an APPROXIMATION of true surface Hausdorff:
 * it measures distance over the B-rep CARTESIAN_POINT control net, not tessellated
 * surface samples). This is the MEANINGFUL shape-fidelity metric that the count-weighted
 * topology Jaccard is not -- point COUNT parity does not imply shape match.
 */
export interface HausdorffResult {
  fileA: string;
  fileB: string;
  unitA: string;
  unitB: string;
  pointsA: number;
  pointsB: number;
  sampledA: number;
  sampledB: number;
  directedAtoBMm: number;
  directedBtoAMm: number;
  hausdorffMm: number;
  chamferMeanMm: number;
  bboxDiagonalMm: number;
  hausdorffPercentOfDiagonal: number;
  passed: boolean;
  threshold: number;
  note: string;
}

/**
 * Bidirectional Hausdorff + mean Chamfer distance between two 3D point clouds.
 * Pure + deterministic (brute-force nearest-neighbor, no RNG).
 * directed(A,B) = max over a in A of (min over b in B of |a-b|);
 * hausdorff = max(directed(A,B), directed(B,A)). Empty cloud -> Infinity.
 */
export function hausdorffPointClouds(
  a: ReadonlyArray<readonly [number, number, number]>,
  b: ReadonlyArray<readonly [number, number, number]>,
): { directedAtoB: number; directedBtoA: number; hausdorff: number; chamferMean: number } {
  if (a.length === 0 || b.length === 0) {
    return { directedAtoB: Infinity, directedBtoA: Infinity, hausdorff: Infinity, chamferMean: Infinity };
  }
  const directed = (
    src: ReadonlyArray<readonly [number, number, number]>,
    dst: ReadonlyArray<readonly [number, number, number]>,
  ): { max: number; mean: number } => {
    let maxMin = 0;
    let sumMin = 0;
    for (const p of src) {
      let min = Infinity;
      for (const q of dst) {
        const dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2];
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < min) min = d2;
      }
      const d = Math.sqrt(min);
      if (d > maxMin) maxMin = d;
      sumMin += d;
    }
    return { max: maxMin, mean: sumMin / src.length };
  };
  const ab = directed(a, b);
  const ba = directed(b, a);
  return {
    directedAtoB: ab.max,
    directedBtoA: ba.max,
    hausdorff: Math.max(ab.max, ba.max),
    chamferMean: (ab.mean + ba.mean) / 2,
  };
}

/** Batch comparison input */
export interface BatchComparisonInput {
  pairs: Array<{ original: string; generated: string }>;
  thresholds?: Partial<ComparisonThresholds>;
  partType?: string;
  material?: string;
}

/** Batch comparison result */
export interface BatchComparisonResult {
  totalPairs: number;
  passed: number;
  failed: number;
  errors: number;
  passRate: number;
  results: ComparisonResult[];
  failedFiles: Array<{ file: string; reason: string }>;
  errorFiles: Array<{ file: string; error: string }>;
  aggregateMetrics: {
    avgVolumeDelta: number;
    avgBboxDelta: number;
    avgTopologySimilarity: number;
    avgFeatureDelta: number;
  };
  totalTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_THRESHOLDS: ComparisonThresholds = {
  volumeDeltaPercent: 5,
  bboxDeltaPercent: 2,
  topologySimilarityMin: 0.8,
  featureCountDeltaPercent: 20,
};

/** STEP entity patterns for parsing */
const STEP_ENTITY_PATTERNS: Record<string, RegExp> = {
  CLOSED_SHELL: /CLOSED_SHELL\s*\(/gi,
  OPEN_SHELL: /OPEN_SHELL\s*\(/gi,
  ADVANCED_FACE: /ADVANCED_FACE\s*\(/gi,
  FACE_SURFACE: /FACE_SURFACE\s*\(/gi,
  EDGE_CURVE: /EDGE_CURVE\s*\(/gi,
  ORIENTED_EDGE: /ORIENTED_EDGE\s*\(/gi,
  VERTEX_POINT: /VERTEX_POINT\s*\(/gi,
  CARTESIAN_POINT: /CARTESIAN_POINT\s*\(/gi,
  B_SPLINE_SURFACE: /B_SPLINE_SURFACE[_A-Z]*\s*\(/gi,
  CYLINDRICAL_SURFACE: /CYLINDRICAL_SURFACE\s*\(/gi,
  CONICAL_SURFACE: /CONICAL_SURFACE\s*\(/gi,
  SPHERICAL_SURFACE: /SPHERICAL_SURFACE\s*\(/gi,
  TOROIDAL_SURFACE: /TOROIDAL_SURFACE\s*\(/gi,
  PLANE: /(?<!\w)PLANE\s*\(/gi,
  MANIFOLD_SOLID_BREP: /MANIFOLD_SOLID_BREP\s*\(/gi,
  BREP_WITH_VOIDS: /BREP_WITH_VOIDS\s*\(/gi,
  CIRCLE: /(?<!\w)CIRCLE\s*\(/gi,
  ELLIPSE: /(?<!\w)ELLIPSE\s*\(/gi,
  LINE: /(?<!\w)LINE\s*\(/gi,
};

/** DXF entity patterns */
const DXF_ENTITY_PATTERNS: Record<string, RegExp> = {
  LINE: /^\s*LINE\s*$/gim,
  CIRCLE: /^\s*CIRCLE\s*$/gim,
  ARC: /^\s*ARC\s*$/gim,
  POLYLINE: /^\s*POLYLINE\s*$/gim,
  LWPOLYLINE: /^\s*LWPOLYLINE\s*$/gim,
  SPLINE: /^\s*SPLINE\s*$/gim,
  ELLIPSE: /^\s*ELLIPSE\s*$/gim,
  INSERT: /^\s*INSERT\s*$/gim,
  TEXT: /^\s*TEXT\s*$/gim,
  MTEXT: /^\s*MTEXT\s*$/gim,
  DIMENSION: /^\s*DIMENSION\s*$/gim,
  SOLID: /^\s*SOLID\s*$/gim,
  "3DFACE": /^\s*3DFACE\s*$/gim,
};

/** STL patterns */
const STL_FACET_PATTERN = /facet\s+normal/gi;
const STL_VERTEX_PATTERN = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gi;

/** IGES entity type codes */
const IGES_ENTITY_TYPES: Record<number, string> = {
  100: "CIRCULAR_ARC",
  102: "COMPOSITE_CURVE",
  104: "CONIC_ARC",
  106: "COPIOUS_DATA",
  108: "PLANE",
  110: "LINE",
  112: "PARAMETRIC_SPLINE_CURVE",
  114: "PARAMETRIC_SPLINE_SURFACE",
  116: "POINT",
  118: "RULED_SURFACE",
  120: "SURFACE_OF_REVOLUTION",
  122: "TABULATED_CYLINDER",
  124: "TRANSFORMATION_MATRIX",
  126: "RATIONAL_BSPLINE_CURVE",
  128: "RATIONAL_BSPLINE_SURFACE",
  142: "CURVE_ON_PARAMETRIC_SURFACE",
  144: "TRIMMED_SURFACE",
  186: "MANIFOLD_SOLID_BREP",
  314: "COLOR_DEFINITION",
  402: "ASSOCIATIVITY",
  406: "PROPERTY",
};

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

class CADGeometryComparisonEngine implements BaseEngine {
  readonly info: EngineInfo = {
    name: "CADGeometryComparisonEngine",
    version: "1.0.0",
    domain: "cad_comparison",
    description: "Format-agnostic CAD geometry comparison for regeneration testing",
  };

  private thresholds: ComparisonThresholds = { ...DEFAULT_THRESHOLDS };

  getCapabilities(): EngineCapability[] {
    return [
      { name: "geometry_extract", description: "Extract metrics from CAD file" },
      { name: "geometry_compare", description: "Compare two CAD files" },
      { name: "geometry_batch_compare", description: "Batch comparison of file pairs" },
      { name: "geometry_set_thresholds", description: "Configure comparison thresholds" },
      { name: "geometry_format_detect", description: "Detect CAD format from file" },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") {
      return "Input must be an object";
    }
    return null;
  }

  /**
   * Configure comparison thresholds
   */
  setThresholds(thresholds: Partial<ComparisonThresholds>): ComparisonThresholds {
    this.thresholds = { ...this.thresholds, ...thresholds };
    log.info(`[CADGeometryComparisonEngine] Thresholds updated:`, this.thresholds);
    return this.thresholds;
  }

  /**
   * Get current thresholds
   */
  getThresholds(): ComparisonThresholds {
    return { ...this.thresholds };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FORMAT DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Detect CAD format from file extension and content
   */
  detectFormat(filePath: string): CADFormat {
    const ext = path.extname(filePath).toLowerCase();

    switch (ext) {
      case ".step":
      case ".stp":
        return "STEP";
      case ".dxf":
        return "DXF";
      case ".stl":
        return "STL";
      case ".iges":
      case ".igs":
        return "IGES";
      default:
        // Try content-based detection
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, "utf-8").slice(0, 500).toUpperCase();
          if (content.includes("ISO-10303-21")) return "STEP";
          if (content.includes("$ACADVER") || content.includes("SECTION")) return "DXF";
          if (content.includes("SOLID") || content.includes("FACET")) return "STL";
          if (content.includes("S      1G") || content.includes("1H,")) return "IGES";
        }
        return "UNKNOWN";
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // METRIC EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Extract geometry metrics from a CAD file
   */
  extractMetrics(filePath: string): GeometryMetrics {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    // Basic file info
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
    const format = this.detectFormat(filePath);

    if (format === "UNKNOWN") {
      errors.push(`Unknown CAD format for file: ${filePath}`);
    }

    let metrics: Partial<GeometryMetrics>;

    switch (format) {
      case "STEP":
        metrics = this.extractSTEPMetrics(content, warnings, errors);
        break;
      case "DXF":
        metrics = this.extractDXFMetrics(content, warnings, errors);
        break;
      case "STL":
        metrics = this.extractSTLMetrics(content, warnings, errors);
        break;
      case "IGES":
        metrics = this.extractIGESMetrics(content, warnings, errors);
        break;
      default:
        metrics = this.getEmptyMetrics();
        errors.push("Cannot extract metrics from unknown format");
    }

    return {
      format,
      filePath,
      fileSize: stats.size,
      hash,
      volume: metrics.volume ?? 0,
      volumeMethod: metrics.volumeMethod ?? "none",
      surfaceArea: metrics.surfaceArea ?? 0,
      boundingBox: metrics.boundingBox ?? this.getEmptyBoundingBox(),
      topology: metrics.topology ?? this.getEmptyTopology(),
      features: metrics.features ?? { features: [], count: 0, hierarchy: [] },
      extractionTimeMs: Date.now() - startTime,
      parseWarnings: warnings,
      parseErrors: errors,
    };
  }

  private getEmptyBoundingBox(): BoundingBox {
    return {
      minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0,
      sizeX: 0, sizeY: 0, sizeZ: 0,
    };
  }

  private getEmptyTopology(): TopologyMetrics {
    return {
      faceCount: 0, edgeCount: 0, vertexCount: 0,
      shellCount: 0, solidCount: 0, entityTypes: {},
    };
  }

  private getEmptyMetrics(): Partial<GeometryMetrics> {
    return {
      volume: 0,
      surfaceArea: 0,
      boundingBox: this.getEmptyBoundingBox(),
      topology: this.getEmptyTopology(),
      features: { features: [], count: 0, hierarchy: [] },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  private extractSTEPMetrics(
    content: string,
    warnings: string[],
    errors: string[]
  ): Partial<GeometryMetrics> {
    const entityTypes: Record<string, number> = {};

    // Count entity types
    for (const [entityName, pattern] of Object.entries(STEP_ENTITY_PATTERNS)) {
      const matches = content.match(pattern);
      entityTypes[entityName] = matches?.length ?? 0;
    }

    // Topology counts
    const faceCount = (entityTypes.ADVANCED_FACE ?? 0) + (entityTypes.FACE_SURFACE ?? 0);
    const edgeCount = (entityTypes.EDGE_CURVE ?? 0) + (entityTypes.ORIENTED_EDGE ?? 0);
    const vertexCount = entityTypes.VERTEX_POINT ?? 0;
    const shellCount = (entityTypes.CLOSED_SHELL ?? 0) + (entityTypes.OPEN_SHELL ?? 0);
    const solidCount = (entityTypes.MANIFOLD_SOLID_BREP ?? 0) + (entityTypes.BREP_WITH_VOIDS ?? 0);

    // Resolve the STEP length unit and normalize all geometry to MILLIMETRES so an
    // inch-authored file compares correctly against a mm reference. A unit-blind
    // comparator reports a 25.4x-confounded delta (UNITS-FIRST safety rail).
    // U-CAD-COMPARE-UNIT-NORMALIZE.
    const { scale, unit } = this.detectStepLengthScaleToMm(content);
    if (unit !== "mm") {
      warnings.push(`STEP length unit '${unit}' normalized to mm (scale x${scale})`);
    }
    // Extract bounding box from CARTESIAN_POINT entities (normalized to mm)
    const bbox = this.extractBoundingBoxFromSTEP(content, scale);

    // BBOX-PROXY volume: this is the bounding-BOX volume, NOT true solid volume -- a STEP
    // B-rep solid fills only a fraction of its bbox (e.g. blisk.stp's 451.5M mm3 is its
    // 1206.9x1206.9x310 box, not the slender disk+blades). Tagged volumeMethod:"bbox-proxy"
    // so no consumer mistakes it for solid volume; the comparator gates on bbox+topology.
    const volume = bbox.sizeX * bbox.sizeY * bbox.sizeZ;
    warnings.push("STEP volume is a bounding-box proxy (NOT true solid volume) -- gate on bbox/topology, not raw volume");

    // Estimate surface area (rough: 2*(xy + xz + yz))
    const surfaceArea = 2 * (
      bbox.sizeX * bbox.sizeY +
      bbox.sizeX * bbox.sizeZ +
      bbox.sizeY * bbox.sizeZ
    );

    // Extract features
    const features = this.extractSTEPFeatures(content, entityTypes);

    if (faceCount === 0) {
      warnings.push("No faces detected in STEP file");
    }
    if (solidCount === 0) {
      warnings.push("No solid bodies detected in STEP file");
    }

    return {
      volume,
      volumeMethod: "bbox-proxy",
      surfaceArea,
      boundingBox: bbox,
      topology: {
        faceCount,
        edgeCount,
        vertexCount,
        shellCount,
        solidCount,
        entityTypes,
      },
      features,
    };
  }

  private extractBoundingBoxFromSTEP(content: string, scaleToMm = 1.0): BoundingBox {
    const pointPattern = /CARTESIAN_POINT\s*\([^)]*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)/gi;
    const points: Array<[number, number, number]> = [];

    let match;
    while ((match = pointPattern.exec(content)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const z = parseFloat(match[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        points.push([x, y, z]);
      }
    }

    if (points.length === 0) {
      return this.getEmptyBoundingBox();
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const [x, y, z] of points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    const s = scaleToMm;
    return {
      minX: minX * s, maxX: maxX * s, minY: minY * s, maxY: maxY * s, minZ: minZ * s, maxZ: maxZ * s,
      sizeX: (maxX - minX) * s,
      sizeY: (maxY - minY) * s,
      sizeZ: (maxZ - minZ) * s,
    };
  }

  /** Parse all CARTESIAN_POINT coords from STEP content as an mm-scaled point cloud. */
  private extractPointCloudFromSTEP(content: string, scaleToMm: number): Array<[number, number, number]> {
    const re = /CARTESIAN_POINT\s*\([^)]*,\s*\(\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*\)/gi;
    const pts: Array<[number, number, number]> = [];
    for (const m of content.matchAll(re)) {
      const x = parseFloat(m[1]), y = parseFloat(m[2]), z = parseFloat(m[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) pts.push([x * scaleToMm, y * scaleToMm, z * scaleToMm]);
    }
    return pts;
  }

  /** Deterministic stride downsample to at most `cap` points (no RNG -- reproducible). */
  private strideSample<T>(arr: T[], cap: number): T[] {
    if (cap <= 0 || arr.length <= cap) return arr;
    const stride = Math.ceil(arr.length / cap);
    const out: T[] = [];
    for (let i = 0; i < arr.length; i += stride) out.push(arr[i]);
    return out;
  }

  /**
   * Control-point-cloud Hausdorff distance between two STEP files (unit-normalized to mm).
   * APPROXIMATION of true surface Hausdorff: it uses the B-rep CARTESIAN_POINT control net,
   * not tessellated surface samples -- for exact surface distance, tessellate via a CAD kernel.
   * Reports the distance in mm and as a % of file-A's bbox diagonal (size-normalized
   * shape-fidelity). This is the MEANINGFUL shape gate that the count-weighted topology
   * Jaccard is not: matching CARTESIAN_POINT COUNT does not imply matching SHAPE.
   *
   * @param fileA reference STEP path
   * @param fileB candidate STEP path
   * @param opts.sampleCap max points per cloud (deterministic stride sample; default 4000)
   * @param opts.thresholdPercent pass if hausdorff <= this % of bbox diagonal (default 1.0)
   */
  computeSurfaceHausdorff(
    fileA: string,
    fileB: string,
    opts?: { sampleCap?: number; thresholdPercent?: number },
  ): HausdorffResult {
    const cap = opts?.sampleCap ?? 4000;
    const thr = opts?.thresholdPercent ?? 1.0;
    const ca = fs.readFileSync(fileA, "utf8");
    const cb = fs.readFileSync(fileB, "utf8");
    const ua = this.detectStepLengthScaleToMm(ca);
    const ub = this.detectStepLengthScaleToMm(cb);
    const cloudA = this.extractPointCloudFromSTEP(ca, ua.scale);
    const cloudB = this.extractPointCloudFromSTEP(cb, ub.scale);
    const sa = this.strideSample(cloudA, cap);
    const sb = this.strideSample(cloudB, cap);
    const h = hausdorffPointClouds(sa, sb);
    const bb = this.extractBoundingBoxFromSTEP(ca, ua.scale);
    const diag = Math.sqrt(bb.sizeX ** 2 + bb.sizeY ** 2 + bb.sizeZ ** 2);
    const pct =
      diag > 0 && Number.isFinite(h.hausdorff)
        ? (h.hausdorff / diag) * 100
        : h.hausdorff === 0
          ? 0
          : 100;
    return {
      fileA,
      fileB,
      unitA: ua.unit,
      unitB: ub.unit,
      pointsA: cloudA.length,
      pointsB: cloudB.length,
      sampledA: sa.length,
      sampledB: sb.length,
      directedAtoBMm: h.directedAtoB,
      directedBtoAMm: h.directedBtoA,
      hausdorffMm: h.hausdorff,
      chamferMeanMm: h.chamferMean,
      bboxDiagonalMm: diag,
      hausdorffPercentOfDiagonal: pct,
      passed: Number.isFinite(pct) && pct <= thr,
      threshold: thr,
      note: "Control-point-cloud Hausdorff (approx of surface Hausdorff; tessellate for exact). % is of file-A bbox diagonal.",
    };
  }

  /**
   * Resolve a STEP file's LENGTH unit to a scale factor converting the model's raw
   * coordinate values to MILLIMETRES. STEP geometry is authored in the unit declared
   * by its GLOBAL_UNIT_ASSIGNED_CONTEXT; comparing an inch-authored model against a mm
   * reference without this normalization yields a 25.4x-confounded delta (UNITS-FIRST).
   * CAUTION: an inch model STILL contains SI_UNIT(.MILLI.,.METRE.) -- it is the BASE of
   * the inch CONVERSION_BASED_UNIT -- so the length-conversion unit NAME (inch/foot, NOT
   * the angle DEGREE/RADIAN conversions) must be checked BEFORE the SI prefix.
   * @returns scale (multiply raw coords to get mm) + the detected unit label.
   */
  private detectStepLengthScaleToMm(content: string): { scale: number; unit: string } {
    if (/CONVERSION_BASED_UNIT\s*\(\s*'\s*INCH\s*'/i.test(content)) return { scale: 25.4, unit: "inch" };
    if (/CONVERSION_BASED_UNIT\s*\(\s*'\s*FOOT\s*'/i.test(content)) return { scale: 304.8, unit: "foot" };
    if (/SI_UNIT\s*\(\s*\.MILLI\.\s*,\s*\.METRE\./i.test(content)) return { scale: 1.0, unit: "mm" };
    if (/SI_UNIT\s*\(\s*\.CENTI\.\s*,\s*\.METRE\./i.test(content)) return { scale: 10.0, unit: "cm" };
    if (/SI_UNIT\s*\(\s*\.MICRO\.\s*,\s*\.METRE\./i.test(content)) return { scale: 0.001, unit: "micron" };
    // bare metre (no SI prefix), reached only after the prefixed cases above
    if (/SI_UNIT\s*\([^)]*\.METRE\./i.test(content)) return { scale: 1000.0, unit: "m" };
    return { scale: 1.0, unit: "unknown-assume-mm" };
  }

  private extractSTEPFeatures(content: string, entityTypes: Record<string, number>): ExtractedFeatures {
    const features: string[] = [];

    // Detect feature types based on geometry patterns
    if (entityTypes.CYLINDRICAL_SURFACE > 0) {
      features.push("cylinder");
      if (content.match(/HOLE/i)) features.push("hole");
    }
    if (entityTypes.CONICAL_SURFACE > 0) features.push("cone");
    if (entityTypes.SPHERICAL_SURFACE > 0) features.push("sphere");
    if (entityTypes.TOROIDAL_SURFACE > 0) features.push("torus");
    if (entityTypes.B_SPLINE_SURFACE > 0) features.push("freeform_surface");
    if (entityTypes.PLANE > 0) features.push("planar_face");
    if (entityTypes.CIRCLE > 0) features.push("circular_profile");
    if (entityTypes.ELLIPSE > 0) features.push("elliptical_profile");

    // Look for common die/mold features
    if (content.match(/FILLET/i)) features.push("fillet");
    if (content.match(/CHAMFER/i)) features.push("chamfer");
    if (content.match(/POCKET/i)) features.push("pocket");
    if (content.match(/BOSS/i)) features.push("boss");
    if (content.match(/RIB/i)) features.push("rib");
    if (content.match(/SLOT/i)) features.push("slot");
    if (content.match(/THREAD/i)) features.push("thread");

    return {
      features,
      count: features.length,
      hierarchy: ["solid", "shell", "face", "edge", "vertex"],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DXF EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  private extractDXFMetrics(
    content: string,
    warnings: string[],
    errors: string[]
  ): Partial<GeometryMetrics> {
    const entityTypes: Record<string, number> = {};

    // Count entity types
    for (const [entityName, pattern] of Object.entries(DXF_ENTITY_PATTERNS)) {
      const matches = content.match(pattern);
      entityTypes[entityName] = matches?.length ?? 0;
    }

    // Extract bounding box from coordinate values
    const bbox = this.extractBoundingBoxFromDXF(content);

    // Calculate 2D area (for flat DXF)
    const area = bbox.sizeX * bbox.sizeY;

    // Count total entities
    const totalEntities = Object.values(entityTypes).reduce((a, b) => a + b, 0);

    // Extract features
    const features: string[] = [];
    if (entityTypes.CIRCLE > 0) features.push("circle");
    if (entityTypes.ARC > 0) features.push("arc");
    if (entityTypes.LINE > 0) features.push("line");
    if (entityTypes.POLYLINE > 0 || entityTypes.LWPOLYLINE > 0) features.push("polyline");
    if (entityTypes.SPLINE > 0) features.push("spline");
    if (entityTypes.DIMENSION > 0) features.push("dimension");

    if (totalEntities === 0) {
      warnings.push("No entities detected in DXF file");
    }

    return {
      volume: 0, // DXF is 2D
      volumeMethod: "none",
      surfaceArea: area,
      boundingBox: bbox,
      topology: {
        faceCount: 0,
        edgeCount: totalEntities,
        vertexCount: 0,
        shellCount: 0,
        solidCount: 0,
        entityTypes,
      },
      features: {
        features,
        count: features.length,
        hierarchy: ["layer", "entity"],
      },
    };
  }

  private extractBoundingBoxFromDXF(content: string): BoundingBox {
    // DXF coordinates are in group codes 10,11,12,13 (X) 20,21,22,23 (Y) 30,31,32,33 (Z)
    const coordPattern = /^\s*(1[0-3]|2[0-3]|3[0-3])\s*\n\s*([-\d.eE+]+)/gim;
    const coords: { x: number[]; y: number[]; z: number[] } = { x: [], y: [], z: [] };

    let match;
    while ((match = coordPattern.exec(content)) !== null) {
      const code = parseInt(match[1]);
      const value = parseFloat(match[2]);
      if (!isNaN(value)) {
        if (code >= 10 && code <= 13) coords.x.push(value);
        else if (code >= 20 && code <= 23) coords.y.push(value);
        else if (code >= 30 && code <= 33) coords.z.push(value);
      }
    }

    if (coords.x.length === 0) {
      return this.getEmptyBoundingBox();
    }

    const minX = Math.min(...coords.x);
    const maxX = Math.max(...coords.x);
    const minY = Math.min(...(coords.y.length > 0 ? coords.y : [0]));
    const maxY = Math.max(...(coords.y.length > 0 ? coords.y : [0]));
    const minZ = Math.min(...(coords.z.length > 0 ? coords.z : [0]));
    const maxZ = Math.max(...(coords.z.length > 0 ? coords.z : [0]));

    return {
      minX, maxX, minY, maxY, minZ, maxZ,
      sizeX: maxX - minX,
      sizeY: maxY - minY,
      sizeZ: maxZ - minZ,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STL EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  private extractSTLMetrics(
    content: string,
    warnings: string[],
    errors: string[]
  ): Partial<GeometryMetrics> {
    // Count facets
    const facetMatches = content.match(STL_FACET_PATTERN);
    const facetCount = facetMatches?.length ?? 0;

    // Extract vertices and compute bounding box
    const vertices: Array<[number, number, number]> = [];
    let match;
    const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gi;
    while ((match = vertexRegex.exec(content)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const z = parseFloat(match[3]);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        vertices.push([x, y, z]);
      }
    }

    const bbox = this.computeBoundingBoxFromVertices(vertices);

    // Compute volume using signed tetrahedron method (approximate for mesh)
    const volume = this.computeSTLVolume(content);

    // Estimate surface area (triangle count * avg triangle area)
    const surfaceArea = this.computeSTLSurfaceArea(content);

    if (facetCount === 0) {
      warnings.push("No facets detected in STL file");
    }

    return {
      volume: Math.abs(volume),
      volumeMethod: "mesh",
      surfaceArea,
      boundingBox: bbox,
      topology: {
        faceCount: facetCount,
        edgeCount: facetCount * 3, // Each triangle has 3 edges (shared)
        vertexCount: vertices.length / 3, // 3 vertices per facet
        shellCount: 1,
        solidCount: 1,
        entityTypes: { FACET: facetCount, VERTEX: vertices.length },
      },
      features: {
        features: ["mesh", "triangulated"],
        count: 2,
        hierarchy: ["solid", "facet", "vertex"],
      },
    };
  }

  private computeBoundingBoxFromVertices(vertices: Array<[number, number, number]>): BoundingBox {
    if (vertices.length === 0) {
      return this.getEmptyBoundingBox();
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const [x, y, z] of vertices) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    return {
      minX, maxX, minY, maxY, minZ, maxZ,
      sizeX: maxX - minX,
      sizeY: maxY - minY,
      sizeZ: maxZ - minZ,
    };
  }

  private computeSTLVolume(content: string): number {
    // Signed tetrahedron volume method
    // For each triangle, compute volume of tetrahedron with origin
    const facetPattern = /facet\s+normal[^]*?endfacet/gi;
    const facets = content.match(facetPattern) ?? [];
    let totalVolume = 0;

    for (const facet of facets) {
      const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gi;
      const verts: Array<[number, number, number]> = [];

      let match;
      while ((match = vertexRegex.exec(facet)) !== null) {
        verts.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
      }

      if (verts.length === 3) {
        // Signed volume = (v1 · (v2 × v3)) / 6
        const [v1, v2, v3] = verts;
        const cross = [
          v2[1] * v3[2] - v2[2] * v3[1],
          v2[2] * v3[0] - v2[0] * v3[2],
          v2[0] * v3[1] - v2[1] * v3[0],
        ];
        const vol = (v1[0] * cross[0] + v1[1] * cross[1] + v1[2] * cross[2]) / 6;
        totalVolume += vol;
      }
    }

    return totalVolume;
  }

  private computeSTLSurfaceArea(content: string): number {
    const facetPattern = /facet\s+normal[^]*?endfacet/gi;
    const facets = content.match(facetPattern) ?? [];
    let totalArea = 0;

    for (const facet of facets) {
      const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/gi;
      const verts: Array<[number, number, number]> = [];

      let match;
      while ((match = vertexRegex.exec(facet)) !== null) {
        verts.push([parseFloat(match[1]), parseFloat(match[2]), parseFloat(match[3])]);
      }

      if (verts.length === 3) {
        // Triangle area = 0.5 * |AB × AC|
        const [a, b, c] = verts;
        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const cross = [
          ab[1] * ac[2] - ab[2] * ac[1],
          ab[2] * ac[0] - ab[0] * ac[2],
          ab[0] * ac[1] - ab[1] * ac[0],
        ];
        const area = 0.5 * Math.sqrt(cross[0] ** 2 + cross[1] ** 2 + cross[2] ** 2);
        totalArea += area;
      }
    }

    return totalArea;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // IGES EXTRACTION
  // ─────────────────────────────────────────────────────────────────────────

  private extractIGESMetrics(
    content: string,
    warnings: string[],
    errors: string[]
  ): Partial<GeometryMetrics> {
    const entityTypes: Record<string, number> = {};

    // Parse IGES directory entries (columns 73-80 contain entity type)
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.length >= 80 && line[72] === "D") {
        const entityType = parseInt(line.slice(0, 8).trim());
        if (!isNaN(entityType) && IGES_ENTITY_TYPES[entityType]) {
          const typeName = IGES_ENTITY_TYPES[entityType];
          entityTypes[typeName] = (entityTypes[typeName] ?? 0) + 1;
        }
      }
    }

    // Count topology
    const faceCount = (entityTypes.TRIMMED_SURFACE ?? 0) + (entityTypes.RATIONAL_BSPLINE_SURFACE ?? 0);
    const edgeCount =
      (entityTypes.LINE ?? 0) +
      (entityTypes.RATIONAL_BSPLINE_CURVE ?? 0) +
      (entityTypes.COMPOSITE_CURVE ?? 0);
    const vertexCount = entityTypes.POINT ?? 0;
    const solidCount = entityTypes.MANIFOLD_SOLID_BREP ?? 0;

    // Extract bounding box from parameter data
    const bbox = this.extractBoundingBoxFromIGES(content);

    // Estimate volume and surface area from bbox
    const volume = bbox.sizeX * bbox.sizeY * bbox.sizeZ;
    const surfaceArea = 2 * (
      bbox.sizeX * bbox.sizeY +
      bbox.sizeX * bbox.sizeZ +
      bbox.sizeY * bbox.sizeZ
    );

    // Extract features
    const features: string[] = [];
    if (entityTypes.CIRCULAR_ARC > 0) features.push("arc");
    if (entityTypes.LINE > 0) features.push("line");
    if (entityTypes.RATIONAL_BSPLINE_SURFACE > 0) features.push("bspline_surface");
    if (entityTypes.TRIMMED_SURFACE > 0) features.push("trimmed_surface");
    if (entityTypes.SURFACE_OF_REVOLUTION > 0) features.push("revolved_surface");
    if (entityTypes.RULED_SURFACE > 0) features.push("ruled_surface");

    const totalEntities = Object.values(entityTypes).reduce((a, b) => a + b, 0);
    if (totalEntities === 0) {
      warnings.push("No recognized entities in IGES file");
    }

    return {
      volume,
      volumeMethod: "bbox-proxy",
      surfaceArea,
      boundingBox: bbox,
      topology: {
        faceCount,
        edgeCount,
        vertexCount,
        shellCount: 0,
        solidCount,
        entityTypes,
      },
      features: {
        features,
        count: features.length,
        hierarchy: ["solid", "surface", "curve", "point"],
      },
    };
  }

  private extractBoundingBoxFromIGES(content: string): BoundingBox {
    // IGES parameter data contains coordinates in P records
    const coordPattern = /([-\d.eE+]+)\s*,\s*([-\d.eE+]+)\s*,\s*([-\d.eE+]+)/g;
    const points: Array<[number, number, number]> = [];

    let match;
    while ((match = coordPattern.exec(content)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      const z = parseFloat(match[3]);
      if (
        !isNaN(x) && !isNaN(y) && !isNaN(z) &&
        Math.abs(x) < 1e6 && Math.abs(y) < 1e6 && Math.abs(z) < 1e6
      ) {
        points.push([x, y, z]);
      }
    }

    return this.computeBoundingBoxFromVertices(points);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compare two CAD files
   */
  compare(originalPath: string, generatedPath: string, thresholds?: Partial<ComparisonThresholds>): ComparisonResult {
    const startTime = Date.now();
    const effectiveThresholds = { ...this.thresholds, ...thresholds };

    // Extract metrics from both files
    const originalMetrics = this.extractMetrics(originalPath);
    const generatedMetrics = this.extractMetrics(generatedPath);

    const metrics: MetricComparison[] = [];

    // 1. Volume comparison
    const volumeDelta = Math.abs(generatedMetrics.volume - originalMetrics.volume);
    const volumeDeltaPercent = originalMetrics.volume > 0
      ? (volumeDelta / originalMetrics.volume) * 100
      : (generatedMetrics.volume > 0 ? 100 : 0);

    // Volume is method-tagged (defect-1 fix): STEP/IGES report a bbox PROXY, not solid
    // volume. A proxy-vs-proxy delta is consistent (both bbox); a proxy-vs-mesh delta is
    // apples-to-oranges -> mark ADVISORY (passed) on a method mismatch so it never
    // false-fails the gate, and annotate the proxy nature so the number is never trusted as solid.
    const volMethodA = originalMetrics.volumeMethod ?? "none";
    const volMethodB = generatedMetrics.volumeMethod ?? "none";
    const volMethodMismatch = volMethodA !== volMethodB;
    const volIsProxy = volMethodA === "bbox-proxy" || volMethodB === "bbox-proxy";
    metrics.push({
      metric: "Volume",
      original: originalMetrics.volume,
      generated: generatedMetrics.volume,
      delta: volumeDelta,
      deltaPercent: volumeDeltaPercent,
      threshold: effectiveThresholds.volumeDeltaPercent,
      passed: volMethodMismatch ? true : volumeDeltaPercent <= effectiveThresholds.volumeDeltaPercent,
      details: volMethodMismatch
        ? `ADVISORY (not gated): volume methods differ (${volMethodA} vs ${volMethodB}) -- not comparable; raw delta ${volumeDeltaPercent.toFixed(2)}%`
        : `${volumeDeltaPercent.toFixed(2)}% delta (threshold: ${effectiveThresholds.volumeDeltaPercent}%${volIsProxy ? "; bbox-proxy, not solid volume" : ""})`,
    });

    // 2. Bounding box comparison (max of X, Y, Z deltas)
    const bboxDeltas = [
      this.computeDeltaPercent(originalMetrics.boundingBox.sizeX, generatedMetrics.boundingBox.sizeX),
      this.computeDeltaPercent(originalMetrics.boundingBox.sizeY, generatedMetrics.boundingBox.sizeY),
      this.computeDeltaPercent(originalMetrics.boundingBox.sizeZ, generatedMetrics.boundingBox.sizeZ),
    ];
    const maxBboxDelta = Math.max(...bboxDeltas);

    metrics.push({
      metric: "Bounding Box",
      original: originalMetrics.boundingBox.sizeX + originalMetrics.boundingBox.sizeY + originalMetrics.boundingBox.sizeZ,
      generated: generatedMetrics.boundingBox.sizeX + generatedMetrics.boundingBox.sizeY + generatedMetrics.boundingBox.sizeZ,
      delta: maxBboxDelta,
      deltaPercent: maxBboxDelta,
      threshold: effectiveThresholds.bboxDeltaPercent,
      passed: maxBboxDelta <= effectiveThresholds.bboxDeltaPercent,
      details: `Max axis delta: ${maxBboxDelta.toFixed(2)}% (X:${bboxDeltas[0].toFixed(1)}%, Y:${bboxDeltas[1].toFixed(1)}%, Z:${bboxDeltas[2].toFixed(1)}%)`,
    });

    // 3. Topology similarity (Jaccard index of entity types)
    const topologySimilarity = this.computeTopologyJaccard(
      originalMetrics.topology.entityTypes,
      generatedMetrics.topology.entityTypes
    );

    metrics.push({
      metric: "Topology",
      original: Object.values(originalMetrics.topology.entityTypes).reduce((a, b) => a + b, 0),
      generated: Object.values(generatedMetrics.topology.entityTypes).reduce((a, b) => a + b, 0),
      delta: 1 - topologySimilarity,
      deltaPercent: (1 - topologySimilarity) * 100,
      threshold: effectiveThresholds.topologySimilarityMin,
      passed: topologySimilarity >= effectiveThresholds.topologySimilarityMin,
      details: `Jaccard similarity: ${topologySimilarity.toFixed(3)} (threshold: ${effectiveThresholds.topologySimilarityMin})`,
    });

    // 4. Feature count comparison
    const featureCountDelta = Math.abs(generatedMetrics.features.count - originalMetrics.features.count);
    const featureCountDeltaPercent = originalMetrics.features.count > 0
      ? (featureCountDelta / originalMetrics.features.count) * 100
      : (generatedMetrics.features.count > 0 ? 100 : 0);

    metrics.push({
      metric: "Feature Count",
      original: originalMetrics.features.count,
      generated: generatedMetrics.features.count,
      delta: featureCountDelta,
      deltaPercent: featureCountDeltaPercent,
      threshold: effectiveThresholds.featureCountDeltaPercent,
      passed: featureCountDeltaPercent <= effectiveThresholds.featureCountDeltaPercent,
      details: `${originalMetrics.features.count} → ${generatedMetrics.features.count} (${featureCountDeltaPercent.toFixed(1)}% delta)`,
    });

    // Overall result
    const passedCount = metrics.filter(m => m.passed).length;
    const passRate = passedCount / metrics.length;
    const overallPassed = metrics.every(m => m.passed);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, originalMetrics, generatedMetrics);

    return {
      originalFile: originalPath,
      generatedFile: generatedPath,
      timestamp: new Date().toISOString(),
      overallPassed,
      passRate,
      metrics,
      originalMetrics,
      generatedMetrics,
      topologySimilarity,
      recommendations,
      comparisonTimeMs: Date.now() - startTime,
    };
  }

  private computeDeltaPercent(original: number, generated: number): number {
    if (original === 0) return generated === 0 ? 0 : 100;
    return Math.abs((generated - original) / original) * 100;
  }

  private computeTopologyJaccard(
    original: Record<string, number>,
    generated: Record<string, number>
  ): number {
    const allKeys = new Set([...Object.keys(original), ...Object.keys(generated)]);
    if (allKeys.size === 0) return 1; // Both empty = identical

    let intersection = 0;
    let union = 0;

    for (const key of allKeys) {
      const a = original[key] ?? 0;
      const b = generated[key] ?? 0;
      intersection += Math.min(a, b);
      union += Math.max(a, b);
    }

    return union > 0 ? intersection / union : 1;
  }

  private generateRecommendations(
    metrics: MetricComparison[],
    original: GeometryMetrics,
    generated: GeometryMetrics
  ): string[] {
    const recommendations: string[] = [];

    for (const m of metrics) {
      if (!m.passed) {
        switch (m.metric) {
          case "Volume":
            recommendations.push(`Volume delta ${m.deltaPercent.toFixed(1)}% exceeds ${m.threshold}% — verify extrusion depths, pocket depths, or boolean operations`);
            break;
          case "Bounding Box":
            recommendations.push(`Bounding box delta ${m.deltaPercent.toFixed(1)}% exceeds ${m.threshold}% — check overall part dimensions`);
            break;
          case "Topology":
            recommendations.push(`Topology similarity ${(1 - m.delta).toFixed(3)} below ${m.threshold} — verify face/edge/vertex counts match`);
            break;
          case "Feature Count":
            recommendations.push(`Feature count ${original.features.count} → ${generated.features.count} — missing or extra features detected`);
            break;
        }
      }
    }

    // Feature-specific recommendations
    const missingFeatures = original.features.features.filter(
      f => !generated.features.features.includes(f)
    );
    if (missingFeatures.length > 0) {
      recommendations.push(`Missing features: ${missingFeatures.join(", ")}`);
    }

    const extraFeatures = generated.features.features.filter(
      f => !original.features.features.includes(f)
    );
    if (extraFeatures.length > 0) {
      recommendations.push(`Extra features detected: ${extraFeatures.join(", ")}`);
    }

    if (recommendations.length === 0) {
      recommendations.push("All metrics within tolerance — geometry comparison passed");
    }

    return recommendations;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // BATCH COMPARISON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Compare multiple file pairs
   */
  batchCompare(input: BatchComparisonInput): BatchComparisonResult {
    const startTime = Date.now();
    const results: ComparisonResult[] = [];
    const failedFiles: Array<{ file: string; reason: string }> = [];
    const errorFiles: Array<{ file: string; error: string }> = [];

    let volumeDeltas: number[] = [];
    let bboxDeltas: number[] = [];
    let topologySims: number[] = [];
    let featureDeltas: number[] = [];

    for (const pair of input.pairs) {
      try {
        const result = this.compare(pair.original, pair.generated, input.thresholds);
        results.push(result);

        // Collect metrics for aggregation
        const volMetric = result.metrics.find(m => m.metric === "Volume");
        const bboxMetric = result.metrics.find(m => m.metric === "Bounding Box");
        const topoMetric = result.metrics.find(m => m.metric === "Topology");
        const featMetric = result.metrics.find(m => m.metric === "Feature Count");

        if (volMetric) volumeDeltas.push(volMetric.deltaPercent);
        if (bboxMetric) bboxDeltas.push(bboxMetric.deltaPercent);
        if (topoMetric) topologySims.push(1 - topoMetric.delta);
        if (featMetric) featureDeltas.push(featMetric.deltaPercent);

        if (!result.overallPassed) {
          const failedMetrics = result.metrics.filter(m => !m.passed).map(m => m.metric);
          failedFiles.push({
            file: pair.original,
            reason: `Failed: ${failedMetrics.join(", ")}`,
          });
        }
      } catch (err) {
        errorFiles.push({
          file: pair.original,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const passed = results.filter(r => r.overallPassed).length;
    const failed = failedFiles.length;
    const errors = errorFiles.length;
    const passRate = input.pairs.length > 0 ? passed / input.pairs.length : 0;

    return {
      totalPairs: input.pairs.length,
      passed,
      failed,
      errors,
      passRate,
      results,
      failedFiles,
      errorFiles,
      aggregateMetrics: {
        avgVolumeDelta: this.average(volumeDeltas),
        avgBboxDelta: this.average(bboxDeltas),
        avgTopologySimilarity: this.average(topologySims),
        avgFeatureDelta: this.average(featureDeltas),
      },
      totalTimeMs: Date.now() - startTime,
    };
  }

  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT SINGLETON
// ═══════════════════════════════════════════════════════════════════════════

export const cadGeometryComparisonEngine = new CADGeometryComparisonEngine();
export default cadGeometryComparisonEngine;
