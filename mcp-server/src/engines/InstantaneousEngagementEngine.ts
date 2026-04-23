/**
 * InstantaneousEngagementEngine
 *
 * Computes the instantaneous radial engagement (ae), axial engagement (ap),
 * effective cutting diameter, and engagement angle at every point along a toolpath.
 * This is the foundation for variable speed/feed optimization.
 *
 * KEY INSIGHT: A single S/F is always wrong. In 3D roughing:
 * - Step-down decreases as tool approaches part surface (less ap)
 * - Corners spike radial engagement from 10% to 180° (slotting)
 * - Ball end mills: effective diameter changes with depth (D_eff = 2*sqrt(R²-(R-ap)²))
 * - Scallop height varies the effective ae on 3D surfaces
 * - Thin features have less material → less engagement → can go faster
 *
 * This engine analyzes toolpath geometry to determine engagement at each block,
 * enabling per-block S/F optimization in the post processor.
 *
 * Physics models used:
 * - Chip thinning: h_actual = fz * sin(arccos(1 - ae/R))
 * - Engagement angle: theta = arccos(1 - ae/R) for peripheral, pi for slotting
 * - Ball end effective diameter: D_eff = 2 * sqrt(D/2)² - (D/2 - ap)²)
 * - Corner engagement: geometric intersection of tool path with stock boundary
 * - Force scaling: F ∝ ae * ap * fz^(1-mc) (Kienzle)
 * - Optimal feed: fz_opt = fz_nominal * (theta_target / theta_actual)
 * - Optimal speed: n_opt = (Vc * 1000) / (pi * D_eff) for ball end mills
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolpathBlock {
  /** Block number or index */
  id: number;
  /** G-code type: G0=rapid, G1=linear, G2=CW arc, G3=CCW arc */
  move_type: "G0" | "G1" | "G2" | "G3";
  /** End position */
  x: number;
  y: number;
  z: number;
  /** Arc center (for G2/G3) */
  i?: number;
  j?: number;
  k?: number;
  /** Arc radius (alternative to IJK) */
  r?: number;
  /** Programmed feed rate mm/min */
  feed_mm_min?: number;
  /** Programmed spindle speed RPM */
  spindle_rpm?: number;
}

export interface ToolGeometry {
  type: "flat_endmill" | "ball_endmill" | "bull_nose" | "drill" | "insert_mill" | "face_mill";
  diameter_mm: number;
  corner_radius_mm?: number;
  flute_count: number;
  flute_length_mm: number;
  helix_angle_deg?: number;
  /** Max recommended chip load (fz) mm/tooth */
  max_fz_mm?: number;
  /** Max recommended depth (ap) mm */
  max_ap_mm?: number;
}

export interface StockGeometry {
  /** Bounding box of remaining stock */
  min_x: number; max_x: number;
  min_y: number; max_y: number;
  min_z: number; max_z: number;
  /** Original stock top surface Z */
  stock_top_z: number;
}

export interface CuttingConditions {
  /** Target surface speed m/min */
  target_Vc_m_min: number;
  /** Target chip load mm/tooth */
  target_fz_mm: number;
  /** Target radial engagement as fraction of diameter (0-1) */
  target_ae_fraction: number;
  /** Maximum allowed engagement angle degrees */
  max_engagement_deg?: number;
  /** Specific cutting force coefficient kc1.1 N/mm² */
  kc1_1?: number;
  /** Kienzle exponent mc */
  mc?: number;
}

export interface EngagementResult {
  block_id: number;
  /** Instantaneous radial engagement mm */
  ae_mm: number;
  /** Instantaneous axial engagement mm */
  ap_mm: number;
  /** Engagement angle degrees (0-360) */
  engagement_angle_deg: number;
  /** Effective cutting diameter mm (relevant for ball end mills) */
  effective_diameter_mm: number;
  /** Actual chip thickness considering chip thinning mm */
  actual_chip_thickness_mm: number;
  /** Chip thinning factor (1.0 = no thinning, >1 = feed should increase) */
  chip_thinning_factor: number;
  /** Recommended spindle speed RPM for this engagement */
  recommended_rpm: number;
  /** Recommended feed rate mm/min for this engagement */
  recommended_feed_mm_min: number;
  /** Recommended feed per tooth mm */
  recommended_fz_mm: number;
  /** Estimated cutting force N */
  estimated_force_N: number;
  /** Force ratio vs nominal (1.0 = nominal) */
  force_ratio: number;
  /** Is this a corner engagement (>90° engagement) */
  is_corner: boolean;
  /** Engagement classification */
  classification: "rapid" | "air_cut" | "light" | "nominal" | "heavy" | "corner" | "slotting";
}

export interface VariableSpeedFeedResult {
  /** Per-block engagement analysis */
  blocks: EngagementResult[];
  /** Summary statistics */
  summary: {
    total_blocks: number;
    cutting_blocks: number;
    rapid_blocks: number;
    min_engagement_deg: number;
    max_engagement_deg: number;
    avg_engagement_deg: number;
    min_ae_mm: number;
    max_ae_mm: number;
    min_ap_mm: number;
    max_ap_mm: number;
    rpm_range: { min: number; max: number };
    feed_range: { min: number; max: number };
    force_range: { min: number; max: number };
    corners_detected: number;
    /** Estimated time savings vs constant S/F (%) */
    time_savings_pct: number;
    /** Estimated force reduction vs constant S/F (%) */
    force_reduction_pct: number;
  };
  /** Optimized G-code blocks with variable S/F */
  optimized_blocks: Array<{
    block_id: number;
    original_feed: number;
    optimized_feed: number;
    original_rpm: number;
    optimized_rpm: number;
    reason: string;
  }>;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

class InstantaneousEngagementEngineImpl {
  /**
   * Analyze a toolpath and compute engagement at every block.
   * Returns per-block optimal S/F recommendations.
   */
  analyzeToolpath(
    blocks: ToolpathBlock[],
    tool: ToolGeometry,
    stock: StockGeometry,
    conditions: CuttingConditions
  ): VariableSpeedFeedResult {
    const results: EngagementResult[] = [];
    const optimized: VariableSpeedFeedResult["optimized_blocks"] = [];

    let prevBlock: ToolpathBlock | null = null;
    const nominalRpm = (conditions.target_Vc_m_min * 1000) / (Math.PI * tool.diameter_mm);
    const nominalFeed = conditions.target_fz_mm * tool.flute_count * nominalRpm;
    const targetAe = conditions.target_ae_fraction * tool.diameter_mm;
    const targetEngagement = this._engagementAngle(targetAe, tool.diameter_mm);
    const maxEngagement = conditions.max_engagement_deg || 180;

    for (const block of blocks) {
      if (block.move_type === "G0") {
        // Rapid — no cutting
        results.push(this._rapidResult(block.id));
        prevBlock = block;
        continue;
      }

      // Estimate engagement from geometry
      const ae = this._estimateRadialEngagement(block, prevBlock, tool, stock);
      const ap = this._estimateAxialEngagement(block, tool, stock);
      const engAngle = this._engagementAngle(ae, tool.diameter_mm);
      const effectiveDiam = this._effectiveDiameter(tool, ap);
      const chipThinning = this._chipThinningFactor(ae, tool.diameter_mm);
      const actualChipThickness = conditions.target_fz_mm / chipThinning;

      // Compute optimal S/F for this engagement
      const optRpm = this._optimalRpm(conditions.target_Vc_m_min, effectiveDiam);
      const optFz = this._optimalFz(conditions.target_fz_mm, chipThinning, engAngle, maxEngagement);
      const optFeed = optFz * tool.flute_count * optRpm;

      // Force estimation (Kienzle)
      const kc = conditions.kc1_1 || 2000;
      const mc = conditions.mc || 0.25;
      const force = kc * ap * Math.pow(Math.max(actualChipThickness, 0.001), 1 - mc);
      const nominalForce = kc * ap * Math.pow(conditions.target_fz_mm, 1 - mc);
      const forceRatio = nominalForce > 0 ? force / nominalForce : 1;

      const isCorner = engAngle > 90;
      const classification = this._classifyEngagement(engAngle, ae, tool.diameter_mm);

      results.push({
        block_id: block.id,
        ae_mm: ae,
        ap_mm: ap,
        engagement_angle_deg: engAngle,
        effective_diameter_mm: effectiveDiam,
        actual_chip_thickness_mm: actualChipThickness,
        chip_thinning_factor: chipThinning,
        recommended_rpm: Math.round(optRpm),
        recommended_feed_mm_min: Math.round(optFeed),
        recommended_fz_mm: Number(optFz.toFixed(4)),
        estimated_force_N: Math.round(force),
        force_ratio: Number(forceRatio.toFixed(3)),
        is_corner: isCorner,
        classification,
      });

      // Track optimization delta
      const origFeed = block.feed_mm_min || nominalFeed;
      const origRpm = block.spindle_rpm || nominalRpm;
      if (Math.abs(optFeed - origFeed) / origFeed > 0.05 || Math.abs(optRpm - origRpm) / origRpm > 0.05) {
        let reason = "";
        if (chipThinning > 1.1) reason = `chip thinning x${chipThinning.toFixed(2)} — increase feed`;
        else if (isCorner) reason = `corner engagement ${engAngle.toFixed(0)}° — reduce feed`;
        else if (effectiveDiam < tool.diameter_mm * 0.9) reason = `effective D=${effectiveDiam.toFixed(1)}mm — increase RPM`;
        else if (ae < targetAe * 0.5) reason = `light engagement ${ae.toFixed(2)}mm — increase feed`;
        else reason = `engagement ${engAngle.toFixed(0)}° — adjust S/F`;

        optimized.push({
          block_id: block.id,
          original_feed: Math.round(origFeed),
          optimized_feed: Math.round(optFeed),
          original_rpm: Math.round(origRpm),
          optimized_rpm: Math.round(optRpm),
          reason,
        });
      }

      prevBlock = block;
    }

    // Summary
    const cuttingBlocks = results.filter(r => r.classification !== "rapid");
    const summary = this._computeSummary(results, cuttingBlocks, nominalFeed, nominalRpm);

    return { blocks: results, summary, optimized_blocks: optimized };
  }

  /**
   * Quick analysis: given just ae/ap/tool, compute optimal S/F.
   * Used by the progressive speed/feed calculator at any tier.
   */
  computeOptimalSF(input: {
    ae_mm: number;
    ap_mm: number;
    tool_diameter_mm: number;
    tool_type: ToolGeometry["type"];
    corner_radius_mm?: number;
    flute_count: number;
    target_Vc_m_min: number;
    target_fz_mm: number;
    kc1_1?: number;
    mc?: number;
  }): {
    rpm: number;
    feed_mm_min: number;
    fz_mm: number;
    engagement_angle_deg: number;
    effective_diameter_mm: number;
    chip_thinning_factor: number;
    actual_chip_thickness_mm: number;
    force_N: number;
    power_kW: number;
    classification: string;
  } {
    const tool: ToolGeometry = {
      type: input.tool_type,
      diameter_mm: input.tool_diameter_mm,
      corner_radius_mm: input.corner_radius_mm,
      flute_count: input.flute_count,
      flute_length_mm: 0,
    };

    const engAngle = this._engagementAngle(input.ae_mm, input.tool_diameter_mm);
    const effectiveDiam = this._effectiveDiameter(tool, input.ap_mm);
    const chipThinning = this._chipThinningFactor(input.ae_mm, input.tool_diameter_mm);
    const optRpm = this._optimalRpm(input.target_Vc_m_min, effectiveDiam);
    const optFz = this._optimalFz(input.target_fz_mm, chipThinning, engAngle, 180);
    const optFeed = optFz * input.flute_count * optRpm;
    const actualChip = input.target_fz_mm / chipThinning;

    const kc = input.kc1_1 || 2000;
    const mc = input.mc || 0.25;
    const force = kc * input.ap_mm * Math.pow(Math.max(actualChip, 0.001), 1 - mc);
    const Vc = (Math.PI * effectiveDiam * optRpm) / 1000;
    const power = (force * Vc) / (60 * 1000); // kW

    return {
      rpm: Math.round(optRpm),
      feed_mm_min: Math.round(optFeed),
      fz_mm: Number(optFz.toFixed(4)),
      engagement_angle_deg: Number(engAngle.toFixed(1)),
      effective_diameter_mm: Number(effectiveDiam.toFixed(2)),
      chip_thinning_factor: Number(chipThinning.toFixed(3)),
      actual_chip_thickness_mm: Number(actualChip.toFixed(4)),
      force_N: Math.round(force),
      power_kW: Number(power.toFixed(3)),
      classification: this._classifyEngagement(engAngle, input.ae_mm, input.tool_diameter_mm),
    };
  }

  /**
   * Compute effective cutting diameter for ball end mills.
   * At shallow ap, the effective diameter is much smaller than nominal.
   * D_eff = 2 * sqrt(R² - (R - ap)²) for ball end mills.
   * For flat end mills, D_eff = D always.
   * For bull nose, D_eff depends on whether ap is in the radius zone.
   */
  private _effectiveDiameter(tool: ToolGeometry, ap: number): number {
    if (tool.type === "ball_endmill") {
      const R = tool.diameter_mm / 2;
      if (ap >= R) return tool.diameter_mm;
      // D_eff = 2 * sqrt(R² - (R - ap)²) = 2 * sqrt(2*R*ap - ap²)
      return 2 * Math.sqrt(2 * R * ap - ap * ap);
    }

    if (tool.type === "bull_nose" && tool.corner_radius_mm) {
      const cr = tool.corner_radius_mm;
      const flatDiam = tool.diameter_mm - 2 * cr;
      if (ap >= cr) return tool.diameter_mm;
      // In the radius zone
      return flatDiam + 2 * Math.sqrt(2 * cr * ap - ap * ap);
    }

    // Flat end mill, face mill, insert mill, drill
    return tool.diameter_mm;
  }

  /**
   * Chip thinning factor.
   * When ae < D/2, actual chip thickness < programmed fz.
   * Must increase feed to maintain target chip thickness.
   * Factor = 1 / sin(arccos(1 - ae/R)) = D / (2 * sqrt(ae * (D - ae)))
   */
  private _chipThinningFactor(ae: number, D: number): number {
    if (ae <= 0 || ae >= D) return 1.0;
    const R = D / 2;
    const ratio = ae / R;
    if (ratio >= 1) return 1.0;
    const sinTheta = Math.sqrt(ratio * (2 - ratio));
    if (sinTheta <= 0.001) return 1.0;
    return 1.0 / sinTheta;
  }

  /**
   * Engagement angle in degrees.
   * theta = arccos(1 - ae/R) for climb milling.
   * Full slot = 180°.
   */
  private _engagementAngle(ae: number, D: number): number {
    if (ae <= 0) return 0;
    const R = D / 2;
    if (ae >= D) return 180;
    const cosArg = 1 - ae / R;
    return (Math.acos(Math.max(-1, Math.min(1, cosArg))) * 180) / Math.PI;
  }

  /**
   * Optimal RPM from surface speed and effective diameter.
   * n = (Vc * 1000) / (pi * D_eff)
   */
  private _optimalRpm(Vc: number, Deff: number): number {
    if (Deff <= 0.1) return 0;
    return (Vc * 1000) / (Math.PI * Deff);
  }

  /**
   * Optimal feed per tooth accounting for chip thinning and engagement limits.
   * - Chip thinning: increase fz to maintain target chip thickness
   * - Corner protection: reduce fz when engagement exceeds limit
   */
  private _optimalFz(
    targetFz: number,
    chipThinningFactor: number,
    engagementDeg: number,
    maxEngagementDeg: number
  ): number {
    let fz = targetFz * chipThinningFactor; // compensate for chip thinning

    // Corner protection: reduce feed when approaching max engagement
    if (engagementDeg > maxEngagementDeg * 0.8) {
      const cornerFactor = maxEngagementDeg / engagementDeg;
      fz *= Math.min(1.0, cornerFactor);
    }

    // Full slotting: reduce to 70% of nominal (high force, poor chip evacuation)
    if (engagementDeg >= 170) {
      fz = Math.min(fz, targetFz * 0.7);
    }

    return fz;
  }

  /**
   * Estimate radial engagement from toolpath geometry.
   * This is a simplified geometric estimation — full dexel simulation
   * would be more accurate but this covers the common cases.
   */
  private _estimateRadialEngagement(
    block: ToolpathBlock,
    prevBlock: ToolpathBlock | null,
    tool: ToolGeometry,
    stock: StockGeometry
  ): number {
    if (!prevBlock) return tool.diameter_mm * 0.5; // default 50% for first cut

    // Detect direction change (corner)
    const dx = block.x - prevBlock.x;
    const dy = block.y - prevBlock.y;

    // Simple heuristic: check if tool is near stock boundary
    const distToXEdge = Math.min(
      Math.abs(block.x - stock.min_x),
      Math.abs(block.x - stock.max_x)
    );
    const distToYEdge = Math.min(
      Math.abs(block.y - stock.min_y),
      Math.abs(block.y - stock.max_y)
    );
    const nearEdge = Math.min(distToXEdge, distToYEdge);

    // If near edge of stock, engagement is roughly the distance to edge
    if (nearEdge < tool.diameter_mm) {
      return Math.min(nearEdge, tool.diameter_mm);
    }

    // Default: use target ae fraction
    return tool.diameter_mm * 0.5;
  }

  /**
   * Estimate axial engagement from Z position relative to stock.
   */
  private _estimateAxialEngagement(
    block: ToolpathBlock,
    tool: ToolGeometry,
    stock: StockGeometry
  ): number {
    // How deep below stock top
    const depthFromTop = stock.stock_top_z - block.z;
    if (depthFromTop <= 0) return 0;

    // Limited by flute length
    return Math.min(depthFromTop, tool.flute_length_mm, tool.max_ap_mm || 999);
  }

  private _classifyEngagement(engDeg: number, ae: number, D: number): EngagementResult["classification"] {
    if (engDeg <= 0) return "air_cut";
    if (engDeg < 30) return "light";
    if (engDeg < 90) return "nominal";
    if (engDeg < 150) return "heavy";
    if (ae >= D * 0.95) return "slotting";
    return "corner";
  }

  private _rapidResult(blockId: number): EngagementResult {
    return {
      block_id: blockId,
      ae_mm: 0, ap_mm: 0, engagement_angle_deg: 0,
      effective_diameter_mm: 0, actual_chip_thickness_mm: 0,
      chip_thinning_factor: 1, recommended_rpm: 0,
      recommended_feed_mm_min: 0, recommended_fz_mm: 0,
      estimated_force_N: 0, force_ratio: 0,
      is_corner: false, classification: "rapid",
    };
  }

  private _computeSummary(
    all: EngagementResult[],
    cutting: EngagementResult[],
    nomFeed: number,
    nomRpm: number
  ): VariableSpeedFeedResult["summary"] {
    if (cutting.length === 0) {
      return {
        total_blocks: all.length, cutting_blocks: 0, rapid_blocks: all.length,
        min_engagement_deg: 0, max_engagement_deg: 0, avg_engagement_deg: 0,
        min_ae_mm: 0, max_ae_mm: 0, min_ap_mm: 0, max_ap_mm: 0,
        rpm_range: { min: 0, max: 0 }, feed_range: { min: 0, max: 0 },
        force_range: { min: 0, max: 0 }, corners_detected: 0,
        time_savings_pct: 0, force_reduction_pct: 0,
      };
    }

    const engs = cutting.map(c => c.engagement_angle_deg);
    const aes = cutting.map(c => c.ae_mm);
    const aps = cutting.map(c => c.ap_mm);
    const rpms = cutting.map(c => c.recommended_rpm);
    const feeds = cutting.map(c => c.recommended_feed_mm_min);
    const forces = cutting.map(c => c.estimated_force_N);

    // Time savings: sum of (block_length / optimized_feed) vs (block_length / constant_feed)
    // Simplified: average feed increase → proportional time savings
    const avgOptFeed = feeds.reduce((a, b) => a + b, 0) / feeds.length;
    const timeSavings = nomFeed > 0 ? Math.max(0, ((avgOptFeed - nomFeed) / nomFeed) * 100) : 0;

    // Force reduction: corners now have reduced feed → lower peak force
    const maxForceConst = Math.max(...cutting.map(c => {
      const kc = 2000;
      return kc * c.ap_mm * Math.pow(Math.max(c.ae_mm * 0.001, 0.001), 0.75);
    }));
    const maxForceOpt = Math.max(...forces);
    const forceReduction = maxForceConst > 0 ? Math.max(0, ((maxForceConst - maxForceOpt) / maxForceConst) * 100) : 0;

    return {
      total_blocks: all.length,
      cutting_blocks: cutting.length,
      rapid_blocks: all.filter(r => r.classification === "rapid").length,
      min_engagement_deg: Math.min(...engs),
      max_engagement_deg: Math.max(...engs),
      avg_engagement_deg: Number((engs.reduce((a, b) => a + b, 0) / engs.length).toFixed(1)),
      min_ae_mm: Number(Math.min(...aes).toFixed(3)),
      max_ae_mm: Number(Math.max(...aes).toFixed(3)),
      min_ap_mm: Number(Math.min(...aps).toFixed(3)),
      max_ap_mm: Number(Math.max(...aps).toFixed(3)),
      rpm_range: { min: Math.min(...rpms), max: Math.max(...rpms) },
      feed_range: { min: Math.min(...feeds), max: Math.max(...feeds) },
      force_range: { min: Math.min(...forces), max: Math.max(...forces) },
      corners_detected: cutting.filter(c => c.is_corner).length,
      time_savings_pct: Number(timeSavings.toFixed(1)),
      force_reduction_pct: Number(forceReduction.toFixed(1)),
    };
  }

  /**
   * CWE-enhanced engagement computation.
   * Uses CWEZBuffer algorithm for actual engagement geometry instead of
   * simple heuristic estimation. More accurate for curved walls, rest stock,
   * and multi-pass scenarios where engagement varies within a single block.
   *
   * Returns the same structure as computeOptimalSF but with CWE-derived
   * actual chip thickness that can be passed directly to Kienzle force model.
   */
  computeOptimalSFWithCWE(input: {
    ae_mm: number;
    ap_mm: number;
    tool_diameter_mm: number;
    tool_type: ToolGeometry["type"];
    corner_radius_mm?: number;
    flute_count: number;
    target_Vc_m_min: number;
    target_fz_mm: number;
    kc1_1?: number;
    mc?: number;
    /** Current tool position for CWE */
    current_position: { x: number; y: number; z: number; feed_angle?: number };
    /** Previous tool positions for Z-buffer surface tracking */
    previous_positions?: Array<{ x: number; y: number; z: number; feed_angle?: number }>;
  }): {
    rpm: number;
    feed_mm_min: number;
    fz_mm: number;
    engagement_angle_deg: number;
    effective_diameter_mm: number;
    chip_thinning_factor: number;
    actual_chip_thickness_mm: number;
    force_N: number;
    power_kW: number;
    classification: string;
    cwe_engagement_ratio: number;
    cwe_max_engagement_deg: number;
    cwe_method: string;
  } {
    // Run CWE Z-buffer analysis
    let cweResult: { avg_engagement_angle: number; max_engagement_angle: number; engagement_ratio: number; effective_radial_depth: number; calculation_method: string } | null = null;
    try {
      const { CWEZBuffer } = require("../algorithms/CWEZBuffer.js");
      const cwe = new CWEZBuffer();
      const cweInput = {
        tool_diameter: input.tool_diameter_mm,
        n_axial_slices: Math.max(5, Math.ceil(input.ap_mm / 0.5)),
        angular_resolution: 5,
        current_position: input.current_position,
        previous_positions: input.previous_positions || [],
        depth_of_cut: input.ap_mm,
        width_of_cut: input.ae_mm,
      };
      const validation = cwe.validate(cweInput);
      if (validation.valid) {
        cweResult = cwe.calculate(cweInput);
      }
    } catch { /* CWE algorithm not available — fall back to analytical */ }

    // Use CWE engagement if available, otherwise analytical
    const ae = cweResult ? cweResult.effective_radial_depth : input.ae_mm;
    const tool: ToolGeometry = {
      type: input.tool_type,
      diameter_mm: input.tool_diameter_mm,
      corner_radius_mm: input.corner_radius_mm,
      flute_count: input.flute_count,
      flute_length_mm: 0,
    };

    const engAngle = cweResult ? cweResult.avg_engagement_angle : this._engagementAngle(ae, input.tool_diameter_mm);
    const effectiveDiam = this._effectiveDiameter(tool, input.ap_mm);
    const chipThinning = this._chipThinningFactor(ae, input.tool_diameter_mm);
    const optRpm = this._optimalRpm(input.target_Vc_m_min, effectiveDiam);
    const optFz = this._optimalFz(input.target_fz_mm, chipThinning, engAngle, 180);
    const optFeed = optFz * input.flute_count * optRpm;

    // Actual chip thickness from CWE engagement geometry
    // h_actual = fz × sin(arccos(1 - ae/R)) — the CWE-corrected value
    const R = input.tool_diameter_mm / 2;
    const aeR = Math.min(ae / R, 2);
    const sinTheta = Math.sqrt(Math.max(0, aeR * (2 - aeR)));
    const actualChip = sinTheta > 0.001 ? input.target_fz_mm * sinTheta : input.target_fz_mm;

    const kc = input.kc1_1 || 2000;
    const mc = input.mc || 0.25;
    const force = kc * input.ap_mm * Math.pow(Math.max(actualChip, 0.001), 1 - mc);
    const Vc = (Math.PI * effectiveDiam * optRpm) / 1000;
    const power = (force * Vc) / (60 * 1000);

    return {
      rpm: Math.round(optRpm),
      feed_mm_min: Math.round(optFeed),
      fz_mm: Number(optFz.toFixed(4)),
      engagement_angle_deg: Number(engAngle.toFixed(1)),
      effective_diameter_mm: Number(effectiveDiam.toFixed(2)),
      chip_thinning_factor: Number(chipThinning.toFixed(3)),
      actual_chip_thickness_mm: Number(actualChip.toFixed(4)),
      force_N: Math.round(force),
      power_kW: Number(power.toFixed(3)),
      classification: this._classifyEngagement(engAngle, ae, input.tool_diameter_mm),
      cwe_engagement_ratio: cweResult ? Number(cweResult.engagement_ratio.toFixed(4)) : 0,
      cwe_max_engagement_deg: cweResult ? Number(cweResult.max_engagement_angle.toFixed(1)) : 0,
      cwe_method: cweResult ? cweResult.calculation_method : "analytical_fallback",
    };
  }
}

export const instantaneousEngagementEngine = new InstantaneousEngagementEngineImpl();
export { InstantaneousEngagementEngineImpl };
