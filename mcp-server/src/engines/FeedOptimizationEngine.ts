/**
 * FeedOptimizationEngine — Reverse-engineered from PRISM v8.89 monolith
 *
 * Real-time feed optimization pipeline: G-force corner limiting,
 * arc feed correction, dynamic depth feed, direction change decel,
 * chip thinning compensation, and 8-level aggressiveness system.
 */

// ---------------------------------------------------------------------------
// Aggressiveness System (8 levels from monolith)
// ---------------------------------------------------------------------------

interface AggressivenessLevel {
  feed: number;     // Feed multiplier
  speed: number;    // Speed multiplier
  corner: number;   // Corner feed factor (lower = more aggressive cornering)
  doc: number;      // Depth of cut multiplier
  description: string;
}

const AGGRESSIVENESS_LEVELS: Record<number, AggressivenessLevel> = {
  1: { feed: 0.50, speed: 0.70, corner: 0.85, doc: 0.50, description: "Ultra-conservative — new material/setup proving" },
  2: { feed: 0.65, speed: 0.80, corner: 0.80, doc: 0.65, description: "Conservative — thin walls, tight tolerances" },
  3: { feed: 0.80, speed: 0.90, corner: 0.70, doc: 0.80, description: "Moderate — general-purpose machining" },
  4: { feed: 0.90, speed: 0.95, corner: 0.60, doc: 0.90, description: "Standard — proven setups" },
  5: { feed: 1.00, speed: 1.00, corner: 0.50, doc: 1.00, description: "Full — catalog parameters" },
  6: { feed: 1.10, speed: 1.05, corner: 0.45, doc: 1.10, description: "Aggressive — rigid setup, known material" },
  7: { feed: 1.25, speed: 1.10, corner: 0.40, doc: 1.25, description: "Very aggressive — production optimization" },
  8: { feed: 1.50, speed: 1.15, corner: 0.35, doc: 1.50, description: "Maximum — competition/record runs" },
};

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export interface FeedOptimizationResult {
  optimizedFeed: number;     // mm/min
  baseFeed: number;
  multiplier: number;
  appliedFactors: Array<{
    name: string;
    factor: number;
    reason: string;
  }>;
  warnings: string[];
}

export interface CornerDynamicsResult {
  maxFeedAtCorner: number;   // mm/min
  gForce: number;            // G
  feedReduction: number;     // percent
  decelDistance: number;      // mm before corner
  accelDistance: number;      // mm after corner
  cornerTime: number;        // seconds
  recommendation: string;
}

export interface ArcFeedResult {
  correctedFeed: number;
  correction: number;        // multiplier
  effectiveChipLoad: number; // mm
  reason: string;
}

export interface BalanceGradeResult {
  centrifugalForce: number;       // N
  gForce: number;
  maxSafeRPM: number;
  requiredGrade: string;          // e.g. "G2.5"
  permissibleUnbalance: number;   // g·mm
  safeForInsert: boolean;
  holderRecommendation: string;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class FeedOptimizationEngineImpl {

  /**
   * Main feed optimization pipeline — applies all factors in sequence.
   */
  optimizeFeed(params: {
    baseFeed: number;            // mm/min
    aggressiveness?: number;     // 1-8
    toolDiameter?: number;       // mm
    radialEngagement?: number;   // mm (ae)
    currentDepth?: number;       // mm (current Z depth)
    fullDepth?: number;          // mm (total depth)
    cornerRadius?: number;       // mm (0 = sharp corner)
    maxGForce?: number;          // G limit (default 2)
    arcRadius?: number;          // mm (arc being cut)
    isInsideArc?: boolean;
  }): FeedOptimizationResult {
    let feed = params.baseFeed;
    const factors: FeedOptimizationResult["appliedFactors"] = [];
    const warnings: string[] = [];
    const aggLevel = params.aggressiveness ?? 5;
    const settings = AGGRESSIVENESS_LEVELS[aggLevel] ?? AGGRESSIVENESS_LEVELS[5];

    // 1. Aggressiveness
    feed *= settings.feed;
    if (settings.feed !== 1.0) {
      factors.push({ name: "Aggressiveness", factor: settings.feed, reason: `Level ${aggLevel}: ${settings.description}` });
    }

    // 2. Chip thinning compensation
    if (params.toolDiameter && params.radialEngagement) {
      const ctf = this.calculateChipThinningFactor(params.radialEngagement, params.toolDiameter);
      if (ctf > 1.01) {
        feed *= ctf;
        factors.push({ name: "Chip Thinning", factor: ctf, reason: `ae/D = ${(params.radialEngagement / params.toolDiameter * 100).toFixed(0)}% — compensate thinner chip` });
      }
    }

    // 3. Dynamic depth feed
    if (params.currentDepth !== undefined && params.fullDepth && params.fullDepth > 0) {
      const depthRatio = params.currentDepth / params.fullDepth;
      const depthFactor = 1 + (1 - depthRatio) * 0.5; // Up to 50% increase near surface
      feed *= depthFactor;
      factors.push({ name: "Dynamic Depth", factor: Math.round(depthFactor * 100) / 100, reason: `${(depthRatio * 100).toFixed(0)}% depth — lighter cut allows higher feed` });
    }

    // 4. G-force corner limiting
    if (params.cornerRadius !== undefined && params.cornerRadius > 0) {
      const maxG = params.maxGForce ?? 2;
      const feedMS = feed / 60000; // mm/min to m/s
      const gForce = (feedMS * feedMS) / (params.cornerRadius / 1000 * 9.81);
      if (gForce > maxG) {
        const maxVelocity = Math.sqrt(maxG * 9.81 * (params.cornerRadius / 1000));
        const gFactor = (maxVelocity * 60000) / feed;
        feed *= gFactor;
        factors.push({ name: "G-Force Limit", factor: Math.round(gFactor * 100) / 100, reason: `Corner R${params.cornerRadius}mm — ${gForce.toFixed(1)}G exceeds ${maxG}G limit` });
        if (gForce > maxG * 2) {
          warnings.push(`Very sharp corner (R${params.cornerRadius}mm) — consider adding fillet`);
        }
      }
    }

    // 5. Arc feed correction
    if (params.arcRadius && params.toolDiameter) {
      const toolRadius = params.toolDiameter / 2;
      const arcCorr = this.calculateArcFeedCorrection(params.arcRadius, toolRadius, params.isInsideArc ?? false);
      if (Math.abs(arcCorr.correction - 1.0) > 0.01) {
        feed *= arcCorr.correction;
        factors.push({ name: "Arc Correction", factor: arcCorr.correction, reason: arcCorr.reason });
      }
    }

    const multiplier = params.baseFeed > 0 ? feed / params.baseFeed : 1;
    return {
      optimizedFeed: Math.round(feed),
      baseFeed: params.baseFeed,
      multiplier: Math.round(multiplier * 1000) / 1000,
      appliedFactors: factors,
      warnings,
    };
  }

  /**
   * Calculate chip thinning factor.
   * CTF = D / (2 × sqrt(ae × (D - ae))) when ae < D/2
   */
  calculateChipThinningFactor(ae: number, toolDiameter: number): number {
    if (ae <= 0 || toolDiameter <= 0) return 1.0;
    const aeRatio = ae / toolDiameter;
    if (aeRatio >= 0.5) return 1.0;

    const ctf = toolDiameter / (2 * Math.sqrt(ae * (toolDiameter - ae)));
    return Math.min(ctf, 2.0); // Cap at 2x
  }

  /**
   * Calculate corner dynamics — deceleration, feed reduction, timing.
   */
  calculateCornerDynamics(params: {
    feedRate: number;        // mm/min
    cornerAngle: number;     // degrees (180 = straight, 90 = right angle)
    maxAcceleration?: number; // mm/s² (default 5000)
    maxGForce?: number;       // G (default 2)
    toolDiameter?: number;    // mm
  }): CornerDynamicsResult {
    const feedMMS = params.feedRate / 60; // mm/s
    const maxAccel = params.maxAcceleration ?? 5000;
    const maxG = params.maxGForce ?? 2;
    const cornerAngleRad = (180 - params.cornerAngle) * Math.PI / 180;

    // Effective corner radius from machine look-ahead
    const effectiveRadius = Math.max(0.1, feedMMS * feedMMS / (maxG * 9810));

    // G-force at programmed feed
    const gForce = (feedMMS * feedMMS) / (effectiveRadius * 9810);

    // Max feed at this corner
    const maxFeedMMS = Math.sqrt(maxG * 9810 * effectiveRadius);
    const maxFeedMMMin = maxFeedMMS * 60;

    // Direction change factor
    const dirFactor = Math.max(0.3, Math.cos(cornerAngleRad / 2));
    const adjustedMaxFeed = maxFeedMMMin * dirFactor;

    // Deceleration/acceleration distances
    const decelDistance = (feedMMS * feedMMS - maxFeedMMS * maxFeedMMS) / (2 * maxAccel);
    const accelDistance = decelDistance; // Symmetric

    // Corner time
    const cornerTime = Math.abs(decelDistance) / ((feedMMS + maxFeedMMS) / 2) * 2;

    const feedReduction = (1 - adjustedMaxFeed / params.feedRate) * 100;

    let recommendation: string;
    if (feedReduction < 10) recommendation = "Minimal slowdown — machine handles smoothly";
    else if (feedReduction < 30) recommendation = "Moderate decel — normal for this geometry";
    else if (feedReduction < 60) recommendation = "Significant slowdown — consider adding corner radius";
    else recommendation = "Severe decel — add fillet radius or reduce programmed feed";

    return {
      maxFeedAtCorner: Math.round(Math.max(adjustedMaxFeed, 1)),
      gForce: Math.round(gForce * 10) / 10,
      feedReduction: Math.round(Math.max(feedReduction, 0) * 10) / 10,
      decelDistance: Math.round(Math.max(decelDistance, 0) * 10) / 10,
      accelDistance: Math.round(Math.max(accelDistance, 0) * 10) / 10,
      cornerTime: Math.round(cornerTime * 1000) / 1000,
      recommendation,
    };
  }

  /**
   * Calculate arc feed correction for inside/outside arcs.
   */
  calculateArcFeedCorrection(arcRadius: number, toolRadius: number, isInside: boolean): ArcFeedResult {
    if (arcRadius <= toolRadius && isInside) {
      return { correctedFeed: 0, correction: 0, effectiveChipLoad: 0, reason: "Arc radius smaller than tool — impossible geometry" };
    }
    if (arcRadius <= 0) {
      return { correctedFeed: 1, correction: 1, effectiveChipLoad: 0, reason: "No arc correction needed" };
    }

    const ratio = toolRadius / arcRadius;
    if (ratio < 0.05) {
      return { correctedFeed: 1, correction: 1, effectiveChipLoad: 0, reason: "Arc large enough — no correction needed" };
    }

    let correction: number;
    let reason: string;
    if (isInside) {
      // Inside arc: effective radius smaller, tool moves faster
      correction = arcRadius / (arcRadius - toolRadius);
      reason = `Inside arc R${arcRadius}mm — increase feed ${((correction - 1) * 100).toFixed(0)}% to maintain chip load`;
    } else {
      // Outside arc: effective radius larger, reduce feed
      correction = arcRadius / (arcRadius + toolRadius);
      reason = `Outside arc R${arcRadius}mm — reduce feed ${((1 - correction) * 100).toFixed(0)}% to maintain chip load`;
    }

    return {
      correctedFeed: Math.round(correction * 1000) / 1000,
      correction: Math.round(correction * 1000) / 1000,
      effectiveChipLoad: 0,
      reason,
    };
  }

  /**
   * ISO 1940 balance grade calculator — centrifugal force, max RPM, grade selection.
   */
  calculateBalanceGrade(params: {
    rpm: number;
    holderMass: number;         // kg (holder + tool)
    toolDiameter?: number;      // mm
    insertMass?: number;        // grams (for insert retention)
    holderType?: "shrink_fit" | "hydraulic" | "er_collet" | "side_lock" | "weldon" | "milling_chuck";
  }): BalanceGradeResult {
    const rpm = params.rpm;
    const holderMass = params.holderMass;
    const toolDia = params.toolDiameter ?? 20;
    const insertMass = params.insertMass ?? 5;
    const holderType = params.holderType ?? "er_collet";
    const warnings: string[] = [];

    // Centrifugal force on insert: F = m × ω² × r
    const massKg = insertMass / 1000;
    const radiusM = (toolDia / 2) / 1000;
    const omega = (2 * Math.PI * rpm) / 60;
    const centrifugalForce = massKg * omega * omega * radiusM;
    const gForce = centrifugalForce / (massKg * 9.81);

    // Max safe RPM (250G with safety factor 2.5 → 100G effective)
    const safeG = 100;
    const maxSafeRPM = radiusM > 0
      ? Math.round((60 / (2 * Math.PI)) * Math.sqrt((safeG * 9.81) / radiusM) / 100) * 100
      : 50000;

    // ISO 1940 balance grades
    const grades: Array<{ grade: string; eper: number; minRpm: number; application: string }> = [
      { grade: "G40",  eper: 40,   minRpm: 0,     application: "Car wheels, crankshafts" },
      { grade: "G16",  eper: 16,   minRpm: 3000,  application: "Tool holders, grinding wheels" },
      { grade: "G6.3", eper: 6.3,  minRpm: 8000,  application: "Standard machining" },
      { grade: "G2.5", eper: 2.5,  minRpm: 15000, application: "High-speed machining" },
      { grade: "G1.0", eper: 1.0,  minRpm: 25000, application: "Very high-speed, precision" },
      { grade: "G0.4", eper: 0.4,  minRpm: 40000, application: "Ultra-high-speed, micro machining" },
    ];

    // Select required grade based on RPM
    let requiredGrade = grades[0];
    for (const g of grades) {
      if (rpm >= g.minRpm) requiredGrade = g;
    }

    // Holder type max RPM recommendations
    const holderMaxRPM: Record<string, number> = {
      shrink_fit: 40000, hydraulic: 30000, er_collet: 20000,
      side_lock: 10000, weldon: 8000, milling_chuck: 25000,
    };
    const holderMax = holderMaxRPM[holderType] ?? 20000;

    // Permissible unbalance: U_per = (G × M × 9549) / n [g·mm]
    const permissibleUnbalance = (requiredGrade.eper * holderMass * 1000 * 9549) / rpm;

    const safeForInsert = gForce <= safeG;
    if (!safeForInsert) {
      warnings.push(`Centrifugal force ${Math.round(gForce)}G exceeds safe insert retention limit (${safeG}G)`);
    }
    if (rpm > holderMax) {
      warnings.push(`RPM ${rpm} exceeds ${holderType} holder limit of ${holderMax} RPM`);
    }

    let holderRecommendation: string;
    if (rpm <= 8000) holderRecommendation = "Any holder type suitable at this RPM";
    else if (rpm <= 15000) holderRecommendation = "ER collet, milling chuck, or hydraulic recommended";
    else if (rpm <= 25000) holderRecommendation = "Hydraulic or shrink-fit required for balance";
    else holderRecommendation = "Shrink-fit mandatory — consider G2.5 or better balanced assembly";

    return {
      centrifugalForce: Math.round(centrifugalForce * 100) / 100,
      gForce: Math.round(gForce),
      maxSafeRPM,
      requiredGrade: requiredGrade.grade,
      permissibleUnbalance: Math.round(permissibleUnbalance * 10) / 10,
      safeForInsert,
      holderRecommendation,
      warnings,
    };
  }

  /**
   * List aggressiveness levels.
   */
  listAggressivenessLevels(): Array<{ level: number; feed: number; speed: number; description: string }> {
    return Object.entries(AGGRESSIVENESS_LEVELS).map(([level, a]) => ({
      level: parseInt(level), feed: a.feed, speed: a.speed, description: a.description,
    }));
  }
}

export const feedOptimizationEngine = new FeedOptimizationEngineImpl();
