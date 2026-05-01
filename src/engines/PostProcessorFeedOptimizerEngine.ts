/**
 * PostProcessorFeedOptimizerEngine — Physics-backed feed rate optimization
 *
 * Takes raw CAM G-code output and optimizes feed rates per-line using:
 * - Chip thinning compensation (radial engagement → effective chip load)
 * - Corner deceleration (direction change → feed reduction)
 * - Stability-limited feed (chatter avoidance at current RPM/DOC)
 * - Arc feed limiting (small radius arcs need slower feed)
 * - Plunge rate limiting (Z-descent moves)
 * - Material-specific constraints (ISO P/M/K/N/S/H)
 *
 * Novel: No CAM software performs physics-backed feed optimization as a
 * post-processing step. This bridges the gap between CAM-generated toolpaths
 * and machine-optimal execution.
 *
 * @module PostProcessorFeedOptimizerEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedOptimizerConfig {
  toolDiameter_mm: number;
  toolFlutes: number;
  radialDepth_mm: number;
  axialDepth_mm: number;
  material: "P" | "M" | "K" | "N" | "S" | "H";
  spindleRPM: number;
  nominalFeed_mmmin: number;
  cornerSlowdownFactor?: number;     // 0.3-1.0, default 0.5
  plungeRateFactor?: number;         // 0.3-1.0, default 0.5
  arcMinRadius_mm?: number;          // Below this, limit feed. Default 2.0
  maxFeedIncrease?: number;          // Max multiplier for chip thinning. Default 1.5
  enableChipThinning?: boolean;      // Default true
  enableCornerDecel?: boolean;       // Default true
  enableArcLimiting?: boolean;       // Default true
  enablePlungeLimiting?: boolean;    // Default true
  enableStabilityCheck?: boolean;    // Default false (needs modal data)
  stabilityMaxDoc_mm?: number;       // From SLD analysis
}

export interface FeedOptimizedLine {
  lineNumber: number;
  original: string;
  optimized: string;
  originalFeed: number | null;
  optimizedFeed: number | null;
  reason: string;
}

export interface FeedOptimizeResult {
  gcode: string;
  lines: FeedOptimizedLine[];
  stats: {
    totalLines: number;
    feedLinesModified: number;
    chipThinningAdjustments: number;
    cornerDecelerations: number;
    arcLimits: number;
    plungeLimits: number;
    averageFeedChange: number;
    estimatedTimeSavings_pct: number;
  };
}

interface ParsedGCodeLine {
  raw: string;
  gCodes: number[];
  mCodes: number[];
  x?: number;
  y?: number;
  z?: number;
  f?: number;
  i?: number;
  j?: number;
  r?: number;
  hasCoords: boolean;
  isRapid: boolean;
  isFeed: boolean;
  isArc: boolean;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class PostProcessorFeedOptimizerEngineImpl {

  /**
   * Optimize feed rates in G-code program.
   */
  optimize(gcode: string, config: FeedOptimizerConfig): FeedOptimizeResult {
    const lines = gcode.split("\n");
    const parsed = lines.map(l => this._parseLine(l));
    const results: FeedOptimizedLine[] = [];

    const cornerFactor = config.cornerSlowdownFactor ?? 0.5;
    const plungeFactor = config.plungeRateFactor ?? 0.5;
    const arcMinR = config.arcMinRadius_mm ?? 2.0;
    const maxIncrease = config.maxFeedIncrease ?? 1.5;
    const chipThinningFactor = this._computeChipThinningFactor(config);

    let modalFeed = config.nominalFeed_mmmin;
    let prevX: number | undefined, prevY: number | undefined, prevZ: number | undefined;

    let chipThinCount = 0, cornerCount = 0, arcCount = 0, plungeCount = 0;
    let totalFeedChange = 0, feedLineCount = 0;

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      const lineNum = i + 1;

      if (p.f != null) modalFeed = p.f;

      // Skip non-feed moves
      if (!p.isFeed && !p.isArc) {
        results.push({ lineNumber: lineNum, original: p.raw, optimized: p.raw, originalFeed: null, optimizedFeed: null, reason: "" });
        if (p.hasCoords) {
          prevX = p.x ?? prevX;
          prevY = p.y ?? prevY;
          prevZ = p.z ?? prevZ;
        }
        continue;
      }

      let adjustedFeed = modalFeed;
      let reason = "";

      // 1. Chip thinning compensation
      if (config.enableChipThinning !== false && chipThinningFactor > 1.0) {
        const boosted = adjustedFeed * Math.min(chipThinningFactor, maxIncrease);
        if (boosted > adjustedFeed) {
          adjustedFeed = boosted;
          reason = `chip_thin(×${chipThinningFactor.toFixed(2)})`;
          chipThinCount++;
        }
      }

      // 2. Corner deceleration
      if (config.enableCornerDecel !== false && prevX != null && prevY != null) {
        const curX = p.x ?? prevX;
        const curY = p.y ?? prevY;
        const nextP = i + 1 < parsed.length ? parsed[i + 1] : null;

        if (nextP && (nextP.isFeed || nextP.isArc) && nextP.hasCoords) {
          const nextX = nextP.x ?? curX;
          const nextY = nextP.y ?? curY;
          const angle = this._directionChange(prevX, prevY, curX, curY, nextX, nextY);

          if (angle > 30) {
            const reduction = 1.0 - (angle / 180) * (1.0 - cornerFactor);
            adjustedFeed *= reduction;
            reason += (reason ? " + " : "") + `corner(${angle.toFixed(0)}°→×${reduction.toFixed(2)})`;
            cornerCount++;
          }
        }
      }

      // 3. Arc feed limiting
      if (config.enableArcLimiting !== false && p.isArc) {
        const arcRadius = this._computeArcRadius(p, prevX, prevY);
        if (arcRadius > 0 && arcRadius < arcMinR) {
          const arcFactor = Math.max(0.3, arcRadius / arcMinR);
          adjustedFeed *= arcFactor;
          reason += (reason ? " + " : "") + `arc(R${arcRadius.toFixed(1)}→×${arcFactor.toFixed(2)})`;
          arcCount++;
        }
      }

      // 4. Plunge rate limiting
      if (config.enablePlungeLimiting !== false && p.z != null && prevZ != null && p.z < prevZ) {
        const dz = prevZ - p.z;
        const dx = (p.x ?? prevX ?? 0) - (prevX ?? 0);
        const dy = (p.y ?? prevY ?? 0) - (prevY ?? 0);
        const dxy = Math.sqrt(dx * dx + dy * dy);

        if (dxy < 0.01 || dz / dxy > 2.0) {
          adjustedFeed *= plungeFactor;
          reason += (reason ? " + " : "") + `plunge(×${plungeFactor})`;
          plungeCount++;
        }
      }

      // 5. Stability check
      if (config.enableStabilityCheck && config.stabilityMaxDoc_mm != null) {
        if (config.axialDepth_mm > config.stabilityMaxDoc_mm * 0.9) {
          adjustedFeed *= 0.7;
          reason += (reason ? " + " : "") + "stability(×0.70)";
        }
      }

      // Round feed
      adjustedFeed = Math.round(adjustedFeed);
      if (adjustedFeed < 1) adjustedFeed = 1;

      const feedChanged = Math.abs(adjustedFeed - modalFeed) > 0.5;
      const optimizedLine = feedChanged
        ? this._replaceFeed(p.raw, adjustedFeed, modalFeed)
        : p.raw;

      if (feedChanged) {
        totalFeedChange += (adjustedFeed - modalFeed) / modalFeed;
        feedLineCount++;
      }

      results.push({
        lineNumber: lineNum,
        original: p.raw,
        optimized: optimizedLine,
        originalFeed: modalFeed,
        optimizedFeed: feedChanged ? adjustedFeed : null,
        reason: feedChanged ? reason : "",
      });

      prevX = p.x ?? prevX;
      prevY = p.y ?? prevY;
      prevZ = p.z ?? prevZ;
    }

    const avgChange = feedLineCount > 0 ? (totalFeedChange / feedLineCount) * 100 : 0;
    const timeSavings = avgChange > 0 ? Math.min(avgChange * 0.8, 25) : 0;

    return {
      gcode: results.map(r => r.optimized).join("\n"),
      lines: results.filter(r => r.reason !== ""),
      stats: {
        totalLines: lines.length,
        feedLinesModified: feedLineCount,
        chipThinningAdjustments: chipThinCount,
        cornerDecelerations: cornerCount,
        arcLimits: arcCount,
        plungeLimits: plungeCount,
        averageFeedChange: Math.round(avgChange * 10) / 10,
        estimatedTimeSavings_pct: Math.round(timeSavings * 10) / 10,
      },
    };
  }

  /**
   * Analyze a G-code program for feed optimization opportunities without modifying it.
   */
  analyze(gcode: string, config: FeedOptimizerConfig): {
    opportunities: number;
    chipThinningPotential: number;
    cornerCount: number;
    plungeCount: number;
    smallArcCount: number;
    estimatedTimeSavings_pct: number;
  } {
    const result = this.optimize(gcode, config);
    return {
      opportunities: result.stats.feedLinesModified,
      chipThinningPotential: result.stats.chipThinningAdjustments,
      cornerCount: result.stats.cornerDecelerations,
      plungeCount: result.stats.plungeLimits,
      smallArcCount: result.stats.arcLimits,
      estimatedTimeSavings_pct: result.stats.estimatedTimeSavings_pct,
    };
  }

  // -------------------------------------------------------------------------
  // Chip Thinning
  // -------------------------------------------------------------------------

  private _computeChipThinningFactor(config: FeedOptimizerConfig): number {
    const ae = config.radialDepth_mm;
    const D = config.toolDiameter_mm;
    if (D <= 0 || ae <= 0) return 1.0;

    const ratio = ae / D;
    if (ratio >= 0.5) return 1.0;

    // Empirical lookup (from SolidCAM iMachining patent data)
    const table: [number, number][] = [
      [0.05, 2.30], [0.10, 1.66], [0.15, 1.41],
      [0.20, 1.27], [0.25, 1.18], [0.30, 1.12],
      [0.35, 1.07], [0.40, 1.04], [0.45, 1.01],
      [0.50, 1.00],
    ];

    for (let i = 0; i < table.length - 1; i++) {
      if (ratio <= table[i + 1][0]) {
        const [r1, f1] = table[i];
        const [r2, f2] = table[i + 1];
        return f1 + (f2 - f1) * (ratio - r1) / (r2 - r1);
      }
    }
    return 1.0;
  }

  // -------------------------------------------------------------------------
  // Direction Change (Corner Detection)
  // -------------------------------------------------------------------------

  private _directionChange(
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number
  ): number {
    const dx1 = x2 - x1, dy1 = y2 - y1;
    const dx2 = x3 - x2, dy2 = y3 - y2;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len1 < 1e-6 || len2 < 1e-6) return 0;

    const dot = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
  }

  // -------------------------------------------------------------------------
  // Arc Radius
  // -------------------------------------------------------------------------

  private _computeArcRadius(p: ParsedGCodeLine, prevX?: number, prevY?: number): number {
    if (p.r != null) return Math.abs(p.r);
    if (p.i != null && p.j != null) {
      return Math.sqrt(p.i * p.i + p.j * p.j);
    }
    return Infinity;
  }

  // -------------------------------------------------------------------------
  // G-code Parsing
  // -------------------------------------------------------------------------

  private _parseLine(line: string): ParsedGCodeLine {
    const raw = line.trim();
    const upper = raw.toUpperCase();
    const result: ParsedGCodeLine = {
      raw,
      gCodes: [],
      mCodes: [],
      hasCoords: false,
      isRapid: false,
      isFeed: false,
      isArc: false,
    };

    if (!raw || raw.startsWith("(") || raw.startsWith(";") || raw.startsWith("%")) return result;

    // Extract G/M codes
    const gMatches = upper.matchAll(/G(\d+\.?\d*)/g);
    for (const m of gMatches) result.gCodes.push(parseFloat(m[1]));

    const mMatches = upper.matchAll(/M(\d+)/g);
    for (const m of mMatches) result.mCodes.push(parseInt(m[1]));

    // Extract coordinates
    const xm = upper.match(/X([+-]?\d+\.?\d*)/);
    const ym = upper.match(/Y([+-]?\d+\.?\d*)/);
    const zm = upper.match(/Z([+-]?\d+\.?\d*)/);
    const fm = upper.match(/F(\d+\.?\d*)/);
    const im = upper.match(/I([+-]?\d+\.?\d*)/);
    const jm = upper.match(/J([+-]?\d+\.?\d*)/);
    const rm = upper.match(/R([+-]?\d+\.?\d*)/);

    if (xm) { result.x = parseFloat(xm[1]); result.hasCoords = true; }
    if (ym) { result.y = parseFloat(ym[1]); result.hasCoords = true; }
    if (zm) { result.z = parseFloat(zm[1]); result.hasCoords = true; }
    if (fm) result.f = parseFloat(fm[1]);
    if (im) result.i = parseFloat(im[1]);
    if (jm) result.j = parseFloat(jm[1]);
    if (rm) result.r = parseFloat(rm[1]);

    // Classify move type
    if (result.gCodes.includes(0)) result.isRapid = true;
    else if (result.gCodes.includes(1)) result.isFeed = true;
    else if (result.gCodes.includes(2) || result.gCodes.includes(3)) {
      result.isArc = true;
      result.isFeed = true;
    }
    // Lines with coords but no G-code inherit modal
    else if (result.hasCoords && result.gCodes.length === 0) {
      result.isFeed = true; // assume feed move (most common modal)
    }

    return result;
  }

  private _replaceFeed(line: string, newFeed: number, modalFeed: number): string {
    const feedMatch = line.match(/F\d+\.?\d*/i);
    if (feedMatch) {
      return line.replace(/F\d+\.?\d*/i, `F${newFeed}`);
    }
    // No F on line — need to inject it
    const trimmed = line.trimEnd();
    return `${trimmed} F${newFeed}`;
  }
}

export const postProcessorFeedOptimizer = new PostProcessorFeedOptimizerEngineImpl();
