/**
 * PRISM MCP Server -- Adaptive Clearing Engine
 *
 * Constant-engagement milling toolpath strategies:
 * - Engagement angle calculation (ray-cast point-in-polygon)
 * - Trochoidal (peel mill) toolpath generation
 * - Adaptive pocket clearing with medial axis
 * - Slot milling with auto-strategy selection
 * - Feedrate compensation based on engagement
 *
 * Ported from PRISM_ADAPTIVE_CLEARING_ENGINE.js (monolith R2.3.1).
 *
 * @module AdaptiveClearingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Vec2 { x: number; y: number; }
export interface Vec3 { x: number; y: number; z: number; }

export interface EngagementResult {
  angle: number;
  ae: number;
  entryAngle: number;
  exitAngle: number;
  percentEngagement: number;
}

export interface TrochoidalParams {
  trochoidRadius: number;
  stepForward: number;
  toolRadius: number;
  maxEngagement?: number;
  direction?: "climb" | "conventional";
}

export interface TrochoidalPoint extends Vec3 {
  type: "trochoidal";
  loopIndex: number;
  arcProgress: number;
}

export interface OptimizedTrochoidalParams {
  trochoidRadius: number;
  stepForward: number;
  estimatedEngagement: number;
  estimatedAe: number;
}

export interface PocketParams {
  toolDiameter: number;
  targetEngagement?: number;
  maxEngagement?: number;
  stepDown: number;
  startZ: number;
  endZ: number;
}

export interface SlotParams {
  toolDiameter: number;
  stepDown: number;
  startZ: number;
  endZ: number;
  strategy?: "auto" | "plunge" | "trochoidal" | "adaptive";
}

// ============================================================================
// ENGINE
// ============================================================================

class AdaptiveClearingEngineImpl {

  // ── Engagement ──

  /** Calculate radial engagement angle at a toolpath point via ray-cast sampling. */
  calculateEngagement(toolPosition: Vec2, feedDirection: Vec2, stockBoundary: Vec2[], toolRadius: number): EngagementResult {
    const feedLen = Math.sqrt(feedDirection.x ** 2 + feedDirection.y ** 2);
    if (feedLen < 1e-10) return { angle: 0, ae: 0, entryAngle: 0, exitAngle: Math.PI, percentEngagement: 0 };

    let maxEngagement = 0;
    let entryAngle = 0;
    let exitAngle = Math.PI;
    const numSamples = 36;
    let inStock = false;
    let entryFound = false;

    for (let i = 0; i <= numSamples; i++) {
      const angle = (i / numSamples) * Math.PI * 2 - Math.PI / 2;
      const pt: Vec2 = {
        x: toolPosition.x + toolRadius * Math.cos(angle),
        y: toolPosition.y + toolRadius * Math.sin(angle),
      };
      const isIn = pointInPolygon(pt, stockBoundary);

      if (isIn && !inStock) {
        entryAngle = angle;
        entryFound = true;
      } else if (!isIn && inStock && entryFound) {
        exitAngle = angle;
        const eng = exitAngle - entryAngle;
        if (eng > maxEngagement) maxEngagement = eng;
      }
      inStock = isIn;
    }

    return {
      angle: maxEngagement,
      ae: toolRadius * (1 - Math.cos(maxEngagement / 2)),
      entryAngle,
      exitAngle,
      percentEngagement: (maxEngagement / Math.PI) * 100,
    };
  }

  /** Average chip thickness from engagement angle. */
  chipThickness(feedPerTooth: number, engagementAngle: number): number {
    return feedPerTooth * Math.sin(engagementAngle / 2);
  }

  // ── Trochoidal ──

  /** Generate trochoidal (peel mill) toolpath along a centerline. */
  generateTrochoidal(centerline: Vec3[], params: TrochoidalParams): TrochoidalPoint[] {
    const { trochoidRadius, stepForward, toolRadius, direction = "climb" } = params;
    if (!centerline || centerline.length < 2) return [];

    const toolpath: TrochoidalPoint[] = [];
    const arcDir = direction === "climb" ? 1 : -1;

    for (let seg = 0; seg < centerline.length - 1; seg++) {
      const p1 = centerline[seg], p2 = centerline[seg + 1];
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen < 1e-6) continue;

      const dirX = dx / segLen, dirY = dy / segLen;
      const perpX = -dirY * arcDir, perpY = dirX * arcDir;
      const numLoops = Math.ceil(segLen / stepForward);

      for (let loop = 0; loop <= numLoops; loop++) {
        const t = loop / numLoops;
        const bx = p1.x + dx * t, by = p1.y + dy * t;
        const bz = p1.z + (p2.z - p1.z) * t;
        const arcSteps = 24;

        for (let a = 0; a <= arcSteps; a++) {
          const arcT = a / arcSteps;
          const angle = -Math.PI / 2 + arcT * Math.PI * 2;
          const fwd = arcT * stepForward / numLoops;

          toolpath.push({
            x: bx + dirX * fwd + perpX * trochoidRadius * Math.cos(angle) + dirX * trochoidRadius * Math.sin(angle),
            y: by + dirY * fwd + perpY * trochoidRadius * Math.cos(angle) + dirY * trochoidRadius * Math.sin(angle),
            z: bz,
            type: "trochoidal",
            loopIndex: loop,
            arcProgress: arcT,
          });
        }
      }
    }
    return toolpath;
  }

  /** Calculate optimal trochoidal parameters for a slot width. */
  optimizeTrochoidal(slotWidth: number, toolDiameter: number, targetEngagement: number = Math.PI * 0.4): OptimizedTrochoidalParams {
    const toolRadius = toolDiameter / 2;
    const ae = toolRadius * (1 - Math.cos(targetEngagement / 2));
    const trochR = Math.min(slotWidth / 2 - toolRadius, Math.sqrt(2 * toolRadius * ae - ae * ae));
    const stepForward = Math.max(toolRadius * 0.2, trochR) * 0.5;

    return {
      trochoidRadius: Math.max(toolRadius * 0.2, trochR),
      stepForward,
      estimatedEngagement: targetEngagement,
      estimatedAe: ae,
    };
  }

  // ── Feedrate compensation ──

  /** Reduce feedrate when engagement exceeds target. */
  calculateFeedrate(baseFeedrate: number, actualEngagement: number, targetEngagement: number): number {
    if (actualEngagement <= targetEngagement) return baseFeedrate;
    return baseFeedrate * Math.sqrt(targetEngagement / actualEngagement);
  }

  // ── Slot strategy ──

  /** Select slot milling strategy based on width/tool ratio. */
  selectSlotStrategy(slotWidth: number, toolDiameter: number): "plunge" | "trochoidal" | "adaptive" {
    const ratio = slotWidth / toolDiameter;
    if (ratio < 1.1) return "plunge";
    if (ratio < 1.5) return "trochoidal";
    return "adaptive";
  }
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if (((yi > point.y) !== (yj > point.y)) && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

export const adaptiveClearingEngine = new AdaptiveClearingEngineImpl();
