/**
 * EngagementDynamicsEngine — Real-Time Engagement Calculation
 *
 * Phase 0.26: Dynamic Adaptive Machining
 *
 * Calculates instantaneous radial and axial engagement from toolpath geometry.
 * As the tool moves through varying stock conditions, engagement changes
 * moment-to-moment. This engine computes those values for downstream
 * parameter adaptation.
 *
 * Key insight: In 3D adaptive/trochoidal toolpaths, engagement varies
 * continuously. A single "engagement" value is meaningless — we need
 * engagement profiles per segment.
 *
 * @module engines/EngagementDynamicsEngine
 */

export interface ToolpathPoint {
  x: number;
  y: number;
  z: number;
  feedrate?: number;
  toolAxis?: { i: number; j: number; k: number };
}

export interface ToolpathSegment {
  id: string;
  points: ToolpathPoint[];
  type: "linear" | "arc" | "helix" | "rapid";
  toolDiameter: number;
  depthOfCut: number;
}

export interface EngagementState {
  segmentId: string;
  pointIndex: number;
  radialEngagement: number; // 0-1 (0% to 100% of diameter)
  axialEngagement: number; // actual depth in mm
  effectiveChipLoad: number;
  materialRemovalRate: number; // mm³/min
  cuttingForceEstimate: number; // N (Kienzle-based)
  engagementAngle: number; // degrees
  entryAngle: number; // degrees
  exitAngle: number; // degrees
}

export interface EngagementProfile {
  segmentId: string;
  states: EngagementState[];
  peakEngagement: number;
  avgEngagement: number;
  engagementVariance: number;
  criticalPoints: number[]; // indices where engagement spikes
}

export interface StockModel {
  type: "block" | "cylinder" | "mesh";
  bounds: { min: ToolpathPoint; max: ToolpathPoint };
  material: string;
  // For mesh-based stock tracking
  voxelResolution?: number;
  voxelData?: Uint8Array;
}

class EngagementDynamicsEngine {
  private currentStock: StockModel | null = null;
  private engagementHistory: EngagementProfile[] = [];

  /**
   * Initialize stock model for engagement calculations
   */
  initializeStock(stock: StockModel): void {
    this.currentStock = stock;
    this.engagementHistory = [];
  }

  /**
   * Calculate engagement for a single point based on tool position and stock
   */
  calculatePointEngagement(
    point: ToolpathPoint,
    prevPoint: ToolpathPoint | null,
    toolDiameter: number,
    axialDepth: number,
    feedPerTooth: number,
    flutes: number
  ): Omit<EngagementState, "segmentId" | "pointIndex"> {
    // Direction of cut
    const dx = prevPoint ? point.x - prevPoint.x : 0;
    const dy = prevPoint ? point.y - prevPoint.y : 0;
    const stepLength = Math.sqrt(dx * dx + dy * dy);

    // Estimate radial engagement from step-over or geometry
    // In real implementation, this would query the stock model
    const radialEngagement = this.estimateRadialEngagement(
      point,
      toolDiameter,
      stepLength
    );

    // Calculate engagement angle (wrap angle)
    const engagementAngle = Math.acos(1 - 2 * radialEngagement) * (180 / Math.PI);

    // Entry and exit angles for force calculations
    const entryAngle = 90 - engagementAngle / 2;
    const exitAngle = 90 + engagementAngle / 2;

    // Effective chip load varies with engagement
    // At low engagement, effective chip load increases due to chip thinning
    const chipThinningFactor = radialEngagement < 0.5
      ? Math.sqrt(radialEngagement * 2)
      : 1;
    const effectiveChipLoad = feedPerTooth / chipThinningFactor;

    // Material removal rate
    const feedrate = point.feedrate || (feedPerTooth * flutes * 1000);
    const materialRemovalRate = radialEngagement * toolDiameter * axialDepth * feedrate;

    // Kienzle-based cutting force estimate
    // Fc = kc1.1 * b * h^(1-mc)
    // Simplified: assume kc1.1 = 2000 MPa, mc = 0.25 for steel
    const kc11 = 2000; // Should come from material database
    const mc = 0.25;
    const chipWidth = axialDepth;
    const chipThickness = effectiveChipLoad * Math.sin(engagementAngle * Math.PI / 180);
    const cuttingForceEstimate = kc11 * chipWidth * Math.pow(chipThickness, 1 - mc);

    return {
      radialEngagement,
      axialEngagement: axialDepth,
      effectiveChipLoad,
      materialRemovalRate,
      cuttingForceEstimate,
      engagementAngle,
      entryAngle,
      exitAngle,
    };
  }

  /**
   * Estimate radial engagement from geometry
   * In a full implementation, this would use CSG/voxel stock tracking
   */
  private estimateRadialEngagement(
    point: ToolpathPoint,
    toolDiameter: number,
    stepLength: number
  ): number {
    // Heuristic: engagement based on step-over ratio
    // This is a simplification — real implementation uses stock model
    if (stepLength === 0) return 0.5; // Assume 50% for plunge/first cut

    const stepOverRatio = stepLength / toolDiameter;

    // Clamp to valid range
    return Math.min(1, Math.max(0.05, stepOverRatio));
  }

  /**
   * Calculate engagement profile for entire segment
   */
  calculateSegmentProfile(
    segment: ToolpathSegment,
    feedPerTooth: number,
    flutes: number
  ): EngagementProfile {
    const states: EngagementState[] = [];

    for (let i = 0; i < segment.points.length; i++) {
      const point = segment.points[i];
      const prevPoint = i > 0 ? segment.points[i - 1] : null;

      const engagement = this.calculatePointEngagement(
        point,
        prevPoint,
        segment.toolDiameter,
        segment.depthOfCut,
        feedPerTooth,
        flutes
      );

      states.push({
        segmentId: segment.id,
        pointIndex: i,
        ...engagement,
      });
    }

    // Calculate statistics
    const engagements = states.map(s => s.radialEngagement);
    const peakEngagement = Math.max(...engagements);
    const avgEngagement = engagements.reduce((a, b) => a + b, 0) / engagements.length;
    const variance = engagements.reduce((sum, e) => sum + Math.pow(e - avgEngagement, 2), 0) / engagements.length;

    // Find critical points (engagement > avg + 2*std)
    const stdDev = Math.sqrt(variance);
    const threshold = avgEngagement + 2 * stdDev;
    const criticalPoints = states
      .filter(s => s.radialEngagement > threshold)
      .map(s => s.pointIndex);

    const profile: EngagementProfile = {
      segmentId: segment.id,
      states,
      peakEngagement,
      avgEngagement,
      engagementVariance: variance,
      criticalPoints,
    };

    this.engagementHistory.push(profile);
    return profile;
  }

  /**
   * Get recommended feed adjustment based on engagement
   * Core of PRISM Forces adaptive feed (physics-based, patent-clean)
   */
  getAdaptiveFeedFactor(engagement: EngagementState, targetChipLoad: number): number {
    // Goal: maintain constant chip load despite varying engagement
    // If engagement drops, we can increase feed
    // If engagement rises, we must reduce feed

    const actualChipLoad = engagement.effectiveChipLoad;
    const ratio = targetChipLoad / actualChipLoad;

    // Clamp adjustment to reasonable range (0.5x to 2x)
    return Math.min(2.0, Math.max(0.5, ratio));
  }

  /**
   * Calculate optimal feed for each point to maintain constant chip load
   */
  calculateAdaptiveFeedProfile(
    profile: EngagementProfile,
    targetChipLoad: number,
    baseFeedrate: number
  ): number[] {
    return profile.states.map(state => {
      const factor = this.getAdaptiveFeedFactor(state, targetChipLoad);
      return baseFeedrate * factor;
    });
  }

  /**
   * Detect engagement patterns that require special handling
   */
  detectEngagementPatterns(profile: EngagementProfile): {
    hasSlotting: boolean;
    hasTrochoidal: boolean;
    hasRamping: boolean;
    avgEngagementClass: "light" | "medium" | "heavy" | "full";
  } {
    const hasSlotting = profile.peakEngagement > 0.95;
    const hasTrochoidal = profile.engagementVariance > 0.1;
    const hasRamping = profile.states.some((s, i) =>
      i > 0 && Math.abs(s.axialEngagement - profile.states[i - 1].axialEngagement) > 0.1
    );

    let avgEngagementClass: "light" | "medium" | "heavy" | "full";
    if (profile.avgEngagement < 0.25) avgEngagementClass = "light";
    else if (profile.avgEngagement < 0.5) avgEngagementClass = "medium";
    else if (profile.avgEngagement < 0.9) avgEngagementClass = "heavy";
    else avgEngagementClass = "full";

    return { hasSlotting, hasTrochoidal, hasRamping, avgEngagementClass };
  }

  /**
   * Get engagement history for analysis
   */
  getEngagementHistory(): EngagementProfile[] {
    return [...this.engagementHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.engagementHistory = [];
  }
}

export const engagementDynamicsEngine = new EngagementDynamicsEngine();
