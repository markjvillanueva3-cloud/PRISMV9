/**
 * PRISM Manufacturing Intelligence — Optimization Tier & Consent System Engine
 * POST-ULT-MS6: U01–U07 Consolidated
 *
 * THE critical gate for all downstream optimization. Ensures PRISM never
 * modifies user intent without explicit, informed consent.
 *
 * Architecture:
 *   U01 OptimizationTierSchema      — 4-tier system with per-tier feature flags
 *   U02 UserIntentDetector          — Parse G-code to identify user decisions
 *   U03 ChangeClassifier            — Classify every modification into its tier
 *   U04 ChangeExplanationEngine     — Human-readable explanations with physics basis
 *   U05 DiffPreviewGenerator        — Visual diff summary by category
 *   U06 PerSuggestionApproval       — Accept/reject individual changes or categories
 *   U07 FusionPluginIntegration     — Plugin interface with intent metadata
 *
 * Dispatcher actions:
 *   get_tier_config, set_tier, detect_intent, classify_changes,
 *   generate_diff, apply_approval, get_next_tier_preview
 *
 * DESIGN PRINCIPLE: The user's G-code represents their engineering judgment.
 * Operation order, tool selection, strategy choice, and retract heights are
 * SACRED — they reflect real-world constraints (fixturing, access, thermal
 * sequencing) that PRISM cannot infer from code alone.
 *
 * @version 1.0.0
 * @module OptimizationTierEngine
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type OptimizationTier = 1 | 2 | 3 | 4;

export interface TierConfig {
  tier: OptimizationTier;
  // Tier 1: Format only — never changes machining behavior
  format_translation: boolean;
  purchase_option_codes: boolean;
  safe_start_end_blocks: boolean;
  // Tier 2: Physics-based speed/feed — same toolpath, better parameters
  physics_speed_feed: boolean;
  line_by_line_adaptive: boolean;
  chatter_free_rpm: boolean;
  power_torque_budget: boolean;
  stability_lobe_analysis: boolean;
  thermal_budget: boolean;
  deflection_limits: boolean;
  wear_tracking: boolean;
  // Tier 3: Motion optimization — changes tool motion (requires approval)
  rapid_repositioning: boolean;
  retract_optimization: boolean;
  air_cut_elimination: boolean;
  hsm_code_injection: boolean;
  subprogram_detection: boolean;
  tool_change_position: boolean;
  // Tier 4: Structural changes — explicit opt-in only
  operation_reorder: boolean;
  tool_selection: boolean;
  strategy_alternatives: boolean;
  hole_pattern_optimization: boolean;
}

export interface UserIntent {
  operation_count: number;
  operation_order: string[];
  tool_selections: ToolSelection[];
  strategy_indicators: StrategyIndicator[];
  retract_heights: RetractHeight[];
  linking_moves: LinkingMove[];
  sacred_elements: string[];
}

export interface ToolSelection {
  tool_number: number;
  tool_comment?: string;
  first_use_line: number;
  operations_using: number;
}

export type StrategyType =
  | "adaptive"
  | "conventional"
  | "trochoidal"
  | "hsm"
  | "rest_machining"
  | "finishing"
  | "drilling"
  | "tapping"
  | "boring"
  | "unknown";

export interface StrategyIndicator {
  operation_index: number;
  strategy: StrategyType;
  evidence: string;
  confidence: number;
}

export interface RetractHeight {
  line_number: number;
  z_value: number;
  type: "safe_z" | "clearance" | "retract_plane" | "home";
}

export interface LinkingMove {
  from_line: number;
  to_line: number;
  type: "rapid" | "feed_retract" | "helical" | "ramp";
  distance_mm: number;
}

export type ChangeCategory =
  | "speed_feed"
  | "motion_rapid"
  | "motion_retract"
  | "air_cut"
  | "hsm_code"
  | "subprogram"
  | "tool_change_pos"
  | "op_reorder"
  | "tool_select"
  | "strategy"
  | "hole_sequence";

export interface ProposedChange {
  id: string;
  category: ChangeCategory;
  tier_required: OptimizationTier;
  line_numbers: number[];
  original_code: string[];
  proposed_code: string[];
  explanation: ChangeExplanation;
  approved: boolean | null;
  impact: ChangeImpact;
}

export interface ChangeExplanation {
  what: string;
  why: string;
  physics_basis: string;
  tradeoffs: string[];
}

export interface ChangeImpact {
  time_saved_sec: number;
  tool_life_impact_percent: number;
  surface_finish_impact: "improved" | "unchanged" | "slightly_rougher";
  risk_level: "none" | "low" | "medium";
}

export interface DiffPreview {
  tier: OptimizationTier;
  total_changes: number;
  changes_by_category: Record<string, number>;
  total_time_saved_sec: number;
  total_tool_life_impact_percent: number;
  summary_lines: string[];
  changes: ProposedChange[];
  unapproved_count: number;
  next_tier_preview?: string;
}

export interface ApprovalDecision {
  change_ids?: string[];
  categories?: ChangeCategory[];
  action: "approve" | "reject";
  remember_preference: boolean;
}

export interface FusionPluginManifest {
  engine_id: string;
  version: string;
  capabilities: string[];
  tier_support: OptimizationTier[];
  intent_metadata_version: string;
  api_surface: FusionApiEndpoint[];
}

export interface FusionApiEndpoint {
  name: string;
  description: string;
  input_schema: Record<string, string>;
  output_schema: Record<string, string>;
}

/**
 * Physics data passed alongside a change for explanation generation.
 */
export interface PhysicsContext {
  chip_thinning_factor?: number;
  radial_engagement_pct?: number;
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  tool_diameter_mm?: number;
  spindle_rpm?: number;
  feed_per_tooth?: number;
  material_hardness_hrc?: number;
  stability_margin?: number;
  deflection_um?: number;
  power_kw?: number;
  torque_nm?: number;
  temperature_c?: number;
  tool_life_remaining_pct?: number;
}

// ============================================================================
// INTERNAL PARSING TYPES
// ============================================================================

interface ParsedGCodeLine {
  index: number;
  raw: string;
  trimmed: string;
  g_codes: number[];
  m_codes: number[];
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  f?: number;
  s?: number;
  t?: number;
  r?: number;
  is_comment: boolean;
  is_rapid: boolean;
  is_linear_feed: boolean;
  is_arc: boolean;
  is_tool_change: boolean;
  comment_text?: string;
}

// ============================================================================
// CATEGORY → TIER MAPPING
// ============================================================================

const CATEGORY_TIER_MAP: Record<ChangeCategory, OptimizationTier> = {
  speed_feed: 2,
  motion_rapid: 3,
  motion_retract: 3,
  air_cut: 3,
  hsm_code: 3,
  subprogram: 3,
  tool_change_pos: 3,
  op_reorder: 4,
  tool_select: 4,
  strategy: 4,
  hole_sequence: 4,
};

// ============================================================================
// CATEGORY DISPLAY NAMES
// ============================================================================

const CATEGORY_DISPLAY: Record<ChangeCategory, string> = {
  speed_feed: "Speed & Feed Optimization",
  motion_rapid: "Rapid Repositioning",
  motion_retract: "Retract Optimization",
  air_cut: "Air Cut Elimination",
  hsm_code: "HSM Code Injection",
  subprogram: "Subprogram Detection",
  tool_change_pos: "Tool Change Position",
  op_reorder: "Operation Reorder",
  tool_select: "Tool Selection",
  strategy: "Strategy Alternative",
  hole_sequence: "Hole Sequence Optimization",
};

// ============================================================================
// SAVED PREFERENCES
// ============================================================================

interface SavedPreference {
  category: ChangeCategory;
  action: "approve" | "reject";
  timestamp: string;
}

// ============================================================================
// G-CODE PARSER
// ============================================================================

function parseGCodeLine(raw: string, index: number): ParsedGCodeLine {
  const trimmed = raw.trim();
  const isComment =
    trimmed.startsWith("(") ||
    trimmed.startsWith(";") ||
    trimmed.startsWith("%") ||
    trimmed.length === 0;

  let commentText: string | undefined;
  const parenMatch = trimmed.match(/\((.+?)\)/);
  if (parenMatch) commentText = parenMatch[1];
  if (trimmed.startsWith(";")) commentText = trimmed.slice(1).trim();

  // Extract G codes
  const gCodes: number[] = [];
  const gMatches = trimmed.matchAll(/G(\d{1,3}(?:\.\d)?)/gi);
  for (const m of gMatches) gCodes.push(parseFloat(m[1]));

  // Extract M codes
  const mCodes: number[] = [];
  const mMatches = trimmed.matchAll(/M(\d{1,3})/gi);
  for (const m of mMatches) mCodes.push(parseInt(m[1]));

  // Extract axis words
  const extract = (letter: string): number | undefined => {
    const m = trimmed.match(new RegExp(`${letter}(-?[\\d.]+)`, "i"));
    return m ? parseFloat(m[1]) : undefined;
  };

  const x = extract("X");
  const y = extract("Y");
  const z = extract("Z");
  const a = extract("A");
  const b = extract("B");
  const c = extract("C");
  const f = extract("F");
  const s = extract("S");
  const r = extract("R");

  const tMatch = trimmed.match(/T(\d+)/i);
  const t = tMatch ? parseInt(tMatch[1]) : undefined;

  const isRapid = gCodes.includes(0) || gCodes.includes(0.0);
  const isLinearFeed = gCodes.includes(1);
  const isArc = gCodes.includes(2) || gCodes.includes(3);
  const isToolChange = mCodes.includes(6);

  return {
    index,
    raw,
    trimmed,
    g_codes: gCodes,
    m_codes: mCodes,
    x, y, z, a, b, c, f, s, t, r,
    is_comment: isComment,
    is_rapid: isRapid,
    is_linear_feed: isLinearFeed,
    is_arc: isArc,
    is_tool_change: isToolChange,
    comment_text: commentText,
  };
}

function parseGCode(gcode: string): ParsedGCodeLine[] {
  return gcode.split("\n").map((line, i) => parseGCodeLine(line, i));
}

// ============================================================================
// OPTIMIZATION TIER ENGINE
// ============================================================================

export class OptimizationTierEngine {
  private currentTier: OptimizationTier = 2;
  private savedPreferences: SavedPreference[] = [];
  private changeIdCounter = 0;

  // --------------------------------------------------------------------------
  // U01: TIER SCHEMA
  // --------------------------------------------------------------------------

  /**
   * Build the complete TierConfig for a given optimization tier.
   * Each flag is deterministically set based on the tier threshold.
   */
  getTierConfig(tier: OptimizationTier): TierConfig {
    return {
      tier,
      // Tier 1: Always on — format translation only
      format_translation: true,
      purchase_option_codes: true,
      safe_start_end_blocks: true,
      // Tier 2: Physics-based S/F
      physics_speed_feed: tier >= 2,
      line_by_line_adaptive: tier >= 2,
      chatter_free_rpm: tier >= 2,
      power_torque_budget: tier >= 2,
      stability_lobe_analysis: tier >= 2,
      thermal_budget: tier >= 2,
      deflection_limits: tier >= 2,
      wear_tracking: tier >= 2,
      // Tier 3: Motion optimization
      rapid_repositioning: tier >= 3,
      retract_optimization: tier >= 3,
      air_cut_elimination: tier >= 3,
      hsm_code_injection: tier >= 3,
      subprogram_detection: tier >= 3,
      tool_change_position: tier >= 3,
      // Tier 4: Structural
      operation_reorder: tier === 4,
      tool_selection: tier === 4,
      strategy_alternatives: tier === 4,
      hole_pattern_optimization: tier === 4,
    };
  }

  /**
   * Set the active optimization tier. Returns the resulting config.
   */
  setTier(tier: OptimizationTier): TierConfig {
    if (tier < 1 || tier > 4 || !Number.isInteger(tier)) {
      throw new Error(`Invalid tier: ${tier}. Must be 1, 2, 3, or 4.`);
    }
    this.currentTier = tier;
    return this.getTierConfig(tier);
  }

  /**
   * Get the currently active tier.
   */
  getCurrentTier(): OptimizationTier {
    return this.currentTier;
  }

  // --------------------------------------------------------------------------
  // U02: USER INTENT DETECTOR
  // --------------------------------------------------------------------------

  /**
   * Parse G-code to identify every user decision that PRISM must respect.
   *
   * The output is a complete map of the programmer's intent:
   * - Operation sequence (which tools in which order)
   * - Tool selections (which tool numbers and any associated comments)
   * - Strategy indicators (adaptive, trochoidal, HSM, etc.)
   * - Retract heights (safe Z, clearance planes)
   * - Linking moves (how the programmer transitions between cuts)
   * - Sacred elements (human-readable summary of untouchable decisions)
   */
  detectUserIntent(gcode: string): UserIntent {
    const lines = parseGCode(gcode);
    const toolSelections = this.detectToolSelections(lines);
    const operationOrder = this.detectOperationOrder(lines, toolSelections);
    const strategyIndicators = this.detectStrategies(lines);
    const retractHeights = this.detectRetractHeights(lines);
    const linkingMoves = this.detectLinkingMoves(lines);
    const sacredElements = this.buildSacredElements(
      operationOrder,
      toolSelections,
      strategyIndicators,
      retractHeights
    );

    return {
      operation_count: toolSelections.length || 1,
      operation_order: operationOrder,
      tool_selections: toolSelections,
      strategy_indicators: strategyIndicators,
      retract_heights: retractHeights,
      linking_moves: linkingMoves,
      sacred_elements: sacredElements,
    };
  }

  /**
   * Detect all tool selections in the program.
   * Looks for T<n> M6 patterns and associated comments.
   */
  private detectToolSelections(lines: ParsedGCodeLine[]): ToolSelection[] {
    const selections: ToolSelection[] = [];
    const toolUsageCount = new Map<number, number>();

    for (const line of lines) {
      if (line.t !== undefined && line.is_tool_change) {
        const toolNum = line.t;
        const existing = selections.find((s) => s.tool_number === toolNum);

        // Look for comment on same line or adjacent lines
        let comment: string | undefined = line.comment_text;
        if (!comment && line.index > 0) {
          const prevLine = lines[line.index - 1];
          if (prevLine?.is_comment) comment = prevLine.comment_text;
        }
        if (!comment && line.index < lines.length - 1) {
          const nextLine = lines[line.index + 1];
          if (nextLine?.is_comment) comment = nextLine.comment_text;
        }

        if (!existing) {
          selections.push({
            tool_number: toolNum,
            tool_comment: comment,
            first_use_line: line.index + 1,
            operations_using: 1,
          });
        } else {
          existing.operations_using++;
        }
      }

      // Also count tool references without M6 (e.g., T<n> alone for preload)
      if (line.t !== undefined && !line.is_tool_change) {
        toolUsageCount.set(
          line.t,
          (toolUsageCount.get(line.t) || 0) + 1
        );
      }
    }

    return selections;
  }

  /**
   * Determine the programmed operation order from tool change sequence.
   */
  private detectOperationOrder(
    lines: ParsedGCodeLine[],
    toolSelections: ToolSelection[]
  ): string[] {
    const order: string[] = [];
    const toolChangeLines = lines.filter(
      (l) => l.is_tool_change && l.t !== undefined
    );

    for (const tcl of toolChangeLines) {
      const sel = toolSelections.find((s) => s.tool_number === tcl.t);
      const label = sel?.tool_comment
        ? `T${tcl.t} (${sel.tool_comment})`
        : `T${tcl.t}`;
      order.push(label);
    }

    return order;
  }

  /**
   * Detect machining strategies by analyzing G-code motion patterns.
   *
   * Strategy detection heuristics:
   * - Adaptive/high-efficiency: low ae (radial), high ap (axial), consistent feed
   * - Trochoidal: repeated circular arc patterns (G2/G3) with small radial steps
   * - HSM: high feed rates with tangential arc entry/exit, no sharp corners
   * - Conventional: constant stepover, uniform depth passes
   * - Finishing: very small depth, high RPM, low feed
   * - Drilling: G81/G83/G73 canned cycles
   * - Tapping: G84/G74 rigid tapping
   * - Boring: G76/G85/G86/G87/G88/G89 boring cycles
   * - Rest machining: operations following larger tools at same Z depths
   */
  private detectStrategies(lines: ParsedGCodeLine[]): StrategyIndicator[] {
    const strategies: StrategyIndicator[] = [];
    let currentOp = 0;

    // Split into operations (delimited by tool changes)
    const opBoundaries: number[] = [0];
    for (const line of lines) {
      if (line.is_tool_change) opBoundaries.push(line.index);
    }
    opBoundaries.push(lines.length);

    for (let b = 0; b < opBoundaries.length - 1; b++) {
      const start = opBoundaries[b];
      const end = opBoundaries[b + 1];
      const opLines = lines.slice(start, end);

      if (opLines.length === 0) continue;

      const strategy = this.classifyOperationStrategy(opLines, currentOp);
      if (strategy) strategies.push(strategy);
      currentOp++;
    }

    return strategies;
  }

  /**
   * Classify a single operation's strategy based on its G-code patterns.
   */
  private classifyOperationStrategy(
    opLines: ParsedGCodeLine[],
    opIndex: number
  ): StrategyIndicator | null {
    const feedMoves = opLines.filter((l) => l.is_linear_feed);
    const arcMoves = opLines.filter((l) => l.is_arc);
    const rapidMoves = opLines.filter((l) => l.is_rapid);
    const totalMotion = feedMoves.length + arcMoves.length;

    if (totalMotion === 0) return null;

    // Check for canned drilling cycles: G81, G82, G83, G73
    const hasDrillingCycle = opLines.some((l) =>
      l.g_codes.some((g) => [73, 81, 82, 83].includes(g))
    );
    if (hasDrillingCycle) {
      return {
        operation_index: opIndex,
        strategy: "drilling",
        evidence: `Canned drilling cycle detected (G${opLines.find((l) => l.g_codes.some((g) => [73, 81, 82, 83].includes(g)))?.g_codes.find((g) => [73, 81, 82, 83].includes(g))})`,
        confidence: 0.95,
      };
    }

    // Check for tapping: G84, G74
    const hasTapping = opLines.some((l) =>
      l.g_codes.some((g) => [74, 84].includes(g))
    );
    if (hasTapping) {
      return {
        operation_index: opIndex,
        strategy: "tapping",
        evidence: `Rigid tapping cycle detected (G${opLines.find((l) => l.g_codes.some((g) => [74, 84].includes(g)))?.g_codes.find((g) => [74, 84].includes(g))})`,
        confidence: 0.95,
      };
    }

    // Check for boring cycles: G76, G85-G89
    const hasBoring = opLines.some((l) =>
      l.g_codes.some((g) => [76, 85, 86, 87, 88, 89].includes(g))
    );
    if (hasBoring) {
      return {
        operation_index: opIndex,
        strategy: "boring",
        evidence: "Boring cycle detected",
        confidence: 0.90,
      };
    }

    // Collect feed rates and spindle speeds for pattern analysis
    const feedRates = feedMoves
      .filter((l) => l.f !== undefined)
      .map((l) => l.f as number);
    const spindleSpeeds = opLines
      .filter((l) => l.s !== undefined)
      .map((l) => l.s as number);

    // Collect Z depths for depth-of-cut analysis
    const zValues = opLines
      .filter((l) => l.z !== undefined && !l.is_rapid && !l.is_comment)
      .map((l) => l.z as number);

    // Arc-to-feed ratio for trochoidal detection
    const arcRatio = totalMotion > 0 ? arcMoves.length / totalMotion : 0;

    // Trochoidal: high proportion of arcs with consistent feed
    if (arcRatio > 0.3 && arcMoves.length > 10) {
      const feedStdDev = this.standardDeviation(feedRates);
      const feedMean = this.mean(feedRates);
      const feedCV = feedMean > 0 ? feedStdDev / feedMean : 1;

      if (feedCV < 0.15) {
        return {
          operation_index: opIndex,
          strategy: "trochoidal",
          evidence: `${(arcRatio * 100).toFixed(0)}% arc moves (${arcMoves.length}), consistent feed rate (CV=${(feedCV * 100).toFixed(1)}%)`,
          confidence: Math.min(0.9, 0.5 + arcRatio),
        };
      }
    }

    // Adaptive/high-efficiency: many Z-level passes at varying depths with
    // consistent feed and high spindle speeds
    if (zValues.length > 5) {
      const uniqueZ = [...new Set(zValues.map((z) => Math.round(z * 100) / 100))];
      const zSteps = [];
      const sortedZ = [...uniqueZ].sort((a, b) => b - a); // descending (less negative first)
      for (let i = 1; i < sortedZ.length; i++) {
        zSteps.push(Math.abs(sortedZ[i] - sortedZ[i - 1]));
      }

      // Adaptive: many Z levels, large axial depth steps, consistent feed
      if (uniqueZ.length > 3 && zSteps.length > 0) {
        const maxStep = Math.max(...zSteps);
        const avgStep = this.mean(zSteps);

        // Large axial depths with consistency suggest adaptive clearing
        if (avgStep > 1.0 && maxStep / avgStep < 2.5) {
          const feedCV =
            feedRates.length > 2
              ? this.standardDeviation(feedRates) / this.mean(feedRates)
              : 1;
          if (feedCV < 0.2) {
            return {
              operation_index: opIndex,
              strategy: "adaptive",
              evidence: `${uniqueZ.length} Z-levels, avg step ${avgStep.toFixed(1)}mm, consistent feed (CV=${(feedCV * 100).toFixed(1)}%)`,
              confidence: 0.75,
            };
          }
        }
      }
    }

    // HSM detection: high feed rates, arc entry/exit patterns, no sharp corners
    const maxFeed = feedRates.length > 0 ? Math.max(...feedRates) : 0;
    const maxRpm = spindleSpeeds.length > 0 ? Math.max(...spindleSpeeds) : 0;
    if (maxFeed > 3000 && maxRpm > 8000 && arcMoves.length > 5) {
      return {
        operation_index: opIndex,
        strategy: "hsm",
        evidence: `High feed (F${maxFeed}), high RPM (S${maxRpm}), ${arcMoves.length} arc transitions`,
        confidence: 0.70,
      };
    }

    // Finishing: very consistent Z, low feed, high RPM, small depth increments
    if (zValues.length > 3) {
      const zRange = Math.max(...zValues) - Math.min(...zValues);
      if (zRange < 2.0 && maxRpm > 5000 && feedRates.length > 0) {
        const avgFeed = this.mean(feedRates);
        if (avgFeed < 500) {
          return {
            operation_index: opIndex,
            strategy: "finishing",
            evidence: `Small Z range (${zRange.toFixed(2)}mm), high RPM (S${maxRpm}), low feed (F${avgFeed.toFixed(0)})`,
            confidence: 0.70,
          };
        }
      }
    }

    // Rest machining: comments often indicate, or small tool following large
    const hasRestComment = opLines.some(
      (l) =>
        l.comment_text &&
        /rest|residual|remaining|cleanup/i.test(l.comment_text)
    );
    if (hasRestComment) {
      return {
        operation_index: opIndex,
        strategy: "rest_machining",
        evidence: `Comment indicates rest machining: "${opLines.find((l) => l.comment_text && /rest|residual|remaining|cleanup/i.test(l.comment_text))?.comment_text}"`,
        confidence: 0.80,
      };
    }

    // Conventional: uniform stepovers, constant depth — the default fallback
    // for milling operations with motion
    if (feedMoves.length > 10) {
      return {
        operation_index: opIndex,
        strategy: "conventional",
        evidence: `${feedMoves.length} linear feed moves, standard pattern`,
        confidence: 0.50,
      };
    }

    return {
      operation_index: opIndex,
      strategy: "unknown",
      evidence: `${totalMotion} motion commands, no clear pattern match`,
      confidence: 0.20,
    };
  }

  /**
   * Detect retract heights — Z values used for safe positioning.
   * Distinguishes between safe Z, clearance planes, retract planes, and home.
   */
  private detectRetractHeights(lines: ParsedGCodeLine[]): RetractHeight[] {
    const retractHeights: RetractHeight[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.z === undefined || line.is_comment) continue;

      // Retract plane from canned cycles (R value)
      if (line.r !== undefined && line.g_codes.some((g) => [73, 81, 82, 83, 84, 85, 86, 87, 88, 89].includes(g))) {
        const key = `retract_plane:${line.r}`;
        if (!seen.has(key)) {
          seen.add(key);
          retractHeights.push({
            line_number: line.index + 1,
            z_value: line.r,
            type: "retract_plane",
          });
        }
      }

      // Rapid Z moves upward are retract candidates
      if (line.is_rapid && line.z !== undefined) {
        // Check if this is an upward rapid (retract)
        const prevZLine = lines
          .slice(0, i)
          .reverse()
          .find((l) => l.z !== undefined && !l.is_comment);
        if (prevZLine && prevZLine.z !== undefined && line.z > prevZLine.z) {
          const delta = line.z - prevZLine.z;

          let type: RetractHeight["type"] = "safe_z";
          if (line.z > 200) {
            type = "home";
          } else if (delta > 50) {
            type = "clearance";
          } else if (line.g_codes.includes(28) || line.g_codes.includes(30)) {
            type = "home";
          }

          const key = `${type}:${line.z}`;
          if (!seen.has(key)) {
            seen.add(key);
            retractHeights.push({
              line_number: line.index + 1,
              z_value: line.z,
              type,
            });
          }
        }
      }
    }

    return retractHeights;
  }

  /**
   * Detect linking moves — transitions between cutting passes.
   * These represent the programmer's chosen linking strategy.
   */
  private detectLinkingMoves(lines: ParsedGCodeLine[]): LinkingMove[] {
    const linkingMoves: LinkingMove[] = [];
    let prevX = 0, prevY = 0, prevZ = 0;
    let inCutting = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.is_comment) continue;

      const x = line.x ?? prevX;
      const y = line.y ?? prevY;
      const z = line.z ?? prevZ;

      if (line.is_linear_feed || line.is_arc) {
        inCutting = true;
      } else if (line.is_rapid && inCutting) {
        // Transition from cutting to rapid — this is a linking move start
        const linkStart = i;

        // Scan forward to find end of linking (next cutting move)
        let linkEnd = i;
        let endX = x, endY = y, endZ = z;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          if (nextLine.is_comment) continue;
          if (nextLine.is_linear_feed || nextLine.is_arc) {
            linkEnd = j;
            endX = nextLine.x ?? endX;
            endY = nextLine.y ?? endY;
            endZ = nextLine.z ?? endZ;
            break;
          }
          if (nextLine.x !== undefined) endX = nextLine.x;
          if (nextLine.y !== undefined) endY = nextLine.y;
          if (nextLine.z !== undefined) endZ = nextLine.z;
        }

        if (linkEnd > linkStart) {
          const dist = Math.sqrt(
            (endX - prevX) ** 2 + (endY - prevY) ** 2 + (endZ - prevZ) ** 2
          );

          // Classify linking move type
          const linkLines = lines.slice(linkStart, linkEnd);
          const hasHelical = linkLines.some((l) => l.is_arc && l.z !== undefined);
          const hasFeedRetract = linkLines.some(
            (l) => l.is_linear_feed && l.z !== undefined && (l.z ?? 0) > prevZ
          );

          let type: LinkingMove["type"] = "rapid";
          if (hasHelical) type = "helical";
          else if (hasFeedRetract) type = "feed_retract";

          // Check for ramp entry (linear feed with simultaneous XY and Z)
          const hasRamp = linkLines.some(
            (l) =>
              l.is_linear_feed &&
              l.z !== undefined &&
              (l.x !== undefined || l.y !== undefined)
          );
          if (hasRamp && !hasHelical) type = "ramp";

          if (dist > 0.1) {
            linkingMoves.push({
              from_line: linkStart + 1,
              to_line: linkEnd + 1,
              type,
              distance_mm: Math.round(dist * 100) / 100,
            });
          }
        }

        inCutting = false;
      }

      prevX = x;
      prevY = y;
      prevZ = z;
    }

    return linkingMoves;
  }

  /**
   * Build the sacred elements list — human-readable descriptions of every
   * user decision that PRISM must not modify without explicit consent.
   */
  private buildSacredElements(
    operationOrder: string[],
    toolSelections: ToolSelection[],
    strategies: StrategyIndicator[],
    retractHeights: RetractHeight[]
  ): string[] {
    const sacred: string[] = [];

    if (operationOrder.length > 0) {
      sacred.push(
        `Operation sequence: ${operationOrder.join(" → ")} (${operationOrder.length} operations)`
      );
    }

    for (const ts of toolSelections) {
      const desc = ts.tool_comment
        ? `Tool T${ts.tool_number} "${ts.tool_comment}"`
        : `Tool T${ts.tool_number}`;
      sacred.push(
        `${desc} — selected by programmer (first use: line ${ts.first_use_line})`
      );
    }

    for (const si of strategies) {
      if (si.confidence >= 0.5) {
        sacred.push(
          `Op ${si.operation_index + 1} strategy: ${si.strategy} (confidence: ${(si.confidence * 100).toFixed(0)}% — ${si.evidence})`
        );
      }
    }

    for (const rh of retractHeights) {
      sacred.push(
        `Retract height Z${rh.z_value} (${rh.type}) — line ${rh.line_number}`
      );
    }

    if (sacred.length === 0) {
      sacred.push("No explicit user decisions detected — minimal program");
    }

    return sacred;
  }

  // --------------------------------------------------------------------------
  // U03: CHANGE CLASSIFIER
  // --------------------------------------------------------------------------

  /**
   * Classify a proposed change into its required optimization tier.
   * This is the enforcement gate — a change CANNOT be applied unless
   * the current tier >= the change's required tier.
   */
  classifyChange(
    category: ChangeCategory,
    lineNumbers: number[],
    originalCode: string[],
    proposedCode: string[],
    explanation: ChangeExplanation,
    impact: ChangeImpact
  ): ProposedChange {
    const tierRequired = CATEGORY_TIER_MAP[category];

    return {
      id: this.generateChangeId(category),
      category,
      tier_required: tierRequired,
      line_numbers: lineNumbers,
      original_code: originalCode,
      proposed_code: proposedCode,
      explanation,
      approved: null,
      impact,
    };
  }

  /**
   * Batch-classify an array of raw change descriptors.
   */
  classifyChanges(
    changes: Array<{
      category: ChangeCategory;
      line_numbers: number[];
      original_code: string[];
      proposed_code: string[];
      explanation: ChangeExplanation;
      impact: ChangeImpact;
    }>
  ): ProposedChange[] {
    return changes.map((c) =>
      this.classifyChange(
        c.category,
        c.line_numbers,
        c.original_code,
        c.proposed_code,
        c.explanation,
        c.impact
      )
    );
  }

  /**
   * Filter changes to only those allowed by the current tier.
   */
  filterByTier(
    changes: ProposedChange[],
    tier?: OptimizationTier
  ): ProposedChange[] {
    const activeTier = tier ?? this.currentTier;
    return changes.filter((c) => c.tier_required <= activeTier);
  }

  /**
   * Check if a specific change is allowed under the current tier.
   */
  isChangeAllowed(change: ProposedChange): boolean {
    return change.tier_required <= this.currentTier;
  }

  // --------------------------------------------------------------------------
  // U04: CHANGE EXPLANATION ENGINE
  // --------------------------------------------------------------------------

  /**
   * Generate a human-readable explanation for a proposed change.
   * Includes the "what", "why", physics basis, and tradeoffs.
   *
   * This is where we earn the user's trust — every change must have
   * a clear, defensible explanation rooted in cutting physics.
   */
  generateExplanation(
    category: ChangeCategory,
    originalValues: Record<string, number | string>,
    proposedValues: Record<string, number | string>,
    physics: PhysicsContext
  ): ChangeExplanation {
    switch (category) {
      case "speed_feed":
        return this.explainSpeedFeedChange(originalValues, proposedValues, physics);
      case "motion_rapid":
        return this.explainRapidChange(originalValues, proposedValues, physics);
      case "motion_retract":
        return this.explainRetractChange(originalValues, proposedValues, physics);
      case "air_cut":
        return this.explainAirCutChange(originalValues, proposedValues, physics);
      case "hsm_code":
        return this.explainHsmChange(originalValues, proposedValues, physics);
      case "subprogram":
        return this.explainSubprogramChange(originalValues, proposedValues);
      case "tool_change_pos":
        return this.explainToolChangePositionChange(originalValues, proposedValues);
      case "op_reorder":
        return this.explainOpReorderChange(originalValues, proposedValues);
      case "tool_select":
        return this.explainToolSelectChange(originalValues, proposedValues, physics);
      case "strategy":
        return this.explainStrategyChange(originalValues, proposedValues, physics);
      case "hole_sequence":
        return this.explainHoleSequenceChange(originalValues, proposedValues);
      default:
        return {
          what: `Changed ${category}`,
          why: "Optimization based on analysis",
          physics_basis: "General machining principles",
          tradeoffs: [],
        };
    }
  }

  private explainSpeedFeedChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    physics: PhysicsContext
  ): ChangeExplanation {
    const origF = Number(orig["feed"] || 0);
    const newF = Number(proposed["feed"] || 0);
    const origS = Number(orig["speed"] || 0);
    const newS = Number(proposed["speed"] || 0);

    const parts: string[] = [];
    if (origF !== newF && origF > 0) parts.push(`feed F${origF} → F${newF}`);
    if (origS !== newS && origS > 0) parts.push(`speed S${origS} → S${newS}`);

    const what = `Changed ${parts.join(", ")}`;

    // Build physics-based "why"
    let why: string;
    let physicsBasis: string;
    const tradeoffs: string[] = [];

    if (physics.chip_thinning_factor && physics.chip_thinning_factor > 1.0) {
      const pct = ((physics.chip_thinning_factor - 1) * 100).toFixed(0);
      const ae = physics.radial_engagement_pct ?? 0;
      why = `${ae}% radial engagement → chip thinning factor ${physics.chip_thinning_factor.toFixed(2)}x requires ${pct}% feed compensation`;
      physicsBasis = "Martellotti (1941) chip thinning compensation — actual chip thickness decreases with reduced radial engagement, requiring proportionally higher feed to maintain effective chip load";
    } else if (physics.stability_margin !== undefined) {
      why = `Stability margin ${(physics.stability_margin * 100).toFixed(0)}% — RPM adjusted to avoid chatter lobe`;
      physicsBasis = "Altintas & Budak (1995) stability lobe theory — certain RPM/depth combinations amplify regenerative vibration; selecting stable pockets eliminates chatter without reducing MRR";
    } else if (physics.deflection_um !== undefined) {
      why = `Tool deflection ${physics.deflection_um.toFixed(1)}μm at current parameters — feed adjusted to stay within ${physics.tool_diameter_mm ? (physics.tool_diameter_mm * 0.01 * 1000).toFixed(0) : "10"}μm limit`;
      physicsBasis = "Euler-Bernoulli beam deflection — cutting force is proportional to chip load; reducing feed decreases deflection proportionally for slender tools";
    } else if (physics.power_kw !== undefined) {
      why = `Spindle power ${physics.power_kw.toFixed(1)}kW — parameters adjusted to stay within machine power budget`;
      physicsBasis = "Specific cutting energy (kc) model — power = kc × MRR; feed/speed balanced to maximize MRR within available spindle power";
    } else {
      why = "Parameters optimized based on material properties and tool geometry";
      physicsBasis = "Manufacturer recommended cutting data adjusted for actual engagement conditions";
    }

    // Tradeoffs
    if (newF > origF * 1.15) {
      tradeoffs.push("Higher feed rate — may increase audible cutting noise");
    }
    if (newF > origF * 1.3) {
      tradeoffs.push("Significantly higher feed — monitor first part carefully");
    }
    if (newS !== origS && newS > 0) {
      tradeoffs.push("RPM change may affect surface finish wavelength");
    }
    if (physics.tool_life_remaining_pct !== undefined && physics.tool_life_remaining_pct < 30) {
      tradeoffs.push(`Tool life at ${physics.tool_life_remaining_pct}% — conservative parameters recommended`);
    }

    return { what, why, physics_basis: physicsBasis, tradeoffs };
  }

  private explainRapidChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    _physics: PhysicsContext
  ): ChangeExplanation {
    const origDist = Number(orig["distance_mm"] || 0);
    const newDist = Number(proposed["distance_mm"] || 0);
    const saved = origDist - newDist;

    return {
      what: `Repositioned rapid traverse: ${origDist.toFixed(1)}mm → ${newDist.toFixed(1)}mm (${saved.toFixed(1)}mm shorter)`,
      why: `Reordered positioning moves to minimize total rapid travel distance`,
      physics_basis: "Traveling salesman optimization — shortest-path rapid repositioning reduces non-cutting time without affecting cut quality",
      tradeoffs: [
        "Machine axes will follow a different rapid path",
        "Verify no interference with fixtures or clamps in new rapid path",
      ],
    };
  }

  private explainRetractChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    _physics: PhysicsContext
  ): ChangeExplanation {
    const origZ = Number(orig["retract_z"] || 0);
    const newZ = Number(proposed["retract_z"] || 0);

    return {
      what: `Reduced retract height: Z${origZ} → Z${newZ}`,
      why: `Part geometry allows lower retract — saves ${Math.abs(origZ - newZ).toFixed(1)}mm of Z travel per retract`,
      physics_basis: "Minimum clearance calculation — retract height needs only to clear the highest feature in the rapid path plus safety margin",
      tradeoffs: [
        "Lower retract height — ensure no tall clamps or fixtures in path",
        "Reduced clearance above workpiece during repositioning",
      ],
    };
  }

  private explainAirCutChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    _physics: PhysicsContext
  ): ChangeExplanation {
    const lines = Number(orig["air_cut_lines"] || 0);
    const timeSaved = Number(proposed["time_saved_sec"] || 0);

    return {
      what: `Eliminated ${lines} air-cutting lines (tool in feed mode but not engaging material)`,
      why: `Detected feed-rate moves through empty space — converting to rapid saves ${timeSaved.toFixed(1)} seconds`,
      physics_basis: "Engagement analysis — comparing programmed toolpath against stock model reveals moves where cutter-location is entirely outside material envelope",
      tradeoffs: [
        "Assumes stock model is accurate — incorrect stock could mean skipping actual cuts",
        "First-article verification recommended",
      ],
    };
  }

  private explainHsmChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    _physics: PhysicsContext
  ): ChangeExplanation {
    const code = String(proposed["hsm_code"] || "G187");

    return {
      what: `Injected HSM control code: ${code}`,
      why: "High-speed machining mode enables look-ahead and corner deceleration management for smoother motion",
      physics_basis: "CNC look-ahead buffering — HSM mode (e.g., Haas G187 P1/P2/P3, Fanuc AI Nano, Siemens CYCLE832) enables the control to read ahead and plan acceleration/deceleration profiles for smoother, faster cornering",
      tradeoffs: [
        "HSM mode may slightly round sharp internal corners",
        "Verify controller supports the specific HSM code",
        String(orig["current_mode"] || "") ? `Currently in ${orig["current_mode"]} mode` : "",
      ].filter((t) => t.length > 0),
    };
  }

  private explainSubprogramChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>
  ): ChangeExplanation {
    const repeatCount = Number(orig["repeat_count"] || 0);
    const linesSaved = Number(proposed["lines_saved"] || 0);

    return {
      what: `Extracted ${repeatCount} repeated patterns into subprogram — ${linesSaved} lines reduced`,
      why: "Repeated G-code blocks replaced with subprogram call (M98/M97) for maintainability and program size reduction",
      physics_basis: "No machining change — subprogram call produces identical tool motion; reduces program memory usage and edit maintenance burden",
      tradeoffs: [
        "Controller must support subprogram calling (M98/M97)",
        "Debugging requires navigating into subprogram",
      ],
    };
  }

  private explainToolChangePositionChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>
  ): ChangeExplanation {
    const origPos = String(orig["position"] || "");
    const newPos = String(proposed["position"] || "");

    return {
      what: `Moved tool change position: ${origPos} → ${newPos}`,
      why: "Repositioned tool change location closer to the next operation's first cut to reduce rapid travel after tool change",
      physics_basis: "Tool change positioning optimization — ATC operation time is fixed, but the rapid move from tool change position to first cut is variable and can be minimized",
      tradeoffs: [
        "New tool change position must have sufficient clearance for ATC operation",
        "Verify tool changer arm/turret clears workpiece and fixtures at new position",
      ],
    };
  }

  private explainOpReorderChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>
  ): ChangeExplanation {
    const origOrder = String(orig["order"] || "");
    const newOrder = String(proposed["order"] || "");

    return {
      what: `Reordered operations: ${origOrder} → ${newOrder}`,
      why: "Grouping operations by tool reduces tool changes; thermal sequencing prevents part distortion",
      physics_basis: "Tool change time elimination — each avoided tool change saves 5-15 seconds; thermal sequencing (roughing before finishing) prevents residual stress distortion from affecting finished surfaces",
      tradeoffs: [
        "CAUTION: Operation order may reflect deliberate engineering decisions",
        "Fixturing access, chip evacuation, and measurement requirements may dictate sequence",
        "User's original order may account for constraints not visible in G-code",
        "REQUIRES EXPLICIT USER APPROVAL",
      ],
    };
  }

  private explainToolSelectChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    physics: PhysicsContext
  ): ChangeExplanation {
    const origTool = String(orig["tool"] || "");
    const newTool = String(proposed["tool"] || "");

    const tradeoffs = [
      "CAUTION: Tool selection reflects programmer's judgment and shop inventory",
      "Suggested tool must be verified as available in the tool magazine",
      "REQUIRES EXPLICIT USER APPROVAL",
    ];

    if (physics.tool_diameter_mm) {
      tradeoffs.push(
        `Suggested diameter: ${physics.tool_diameter_mm}mm — verify holder and gauge length compatibility`
      );
    }

    return {
      what: `Suggested tool change: ${origTool} → ${newTool}`,
      why: "Alternative tool may offer better performance for the detected cutting strategy and material combination",
      physics_basis: "Tool selection optimization — matching tool geometry (helix angle, flute count, coating) to the specific operation type, material, and engagement conditions",
      tradeoffs,
    };
  }

  private explainStrategyChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>,
    _physics: PhysicsContext
  ): ChangeExplanation {
    const origStrategy = String(orig["strategy"] || "");
    const newStrategy = String(proposed["strategy"] || "");

    return {
      what: `Suggested strategy change: ${origStrategy} → ${newStrategy}`,
      why: "Alternative machining strategy may offer better performance or surface quality for the detected feature geometry",
      physics_basis: "Machining strategy selection — different strategies (adaptive, trochoidal, HSM, conventional) optimize for different objectives: MRR, surface finish, tool life, and vibration avoidance",
      tradeoffs: [
        "CAUTION: Strategy choice reflects deep process knowledge",
        "CAM system may have been configured for specific strategy for valid reasons",
        "Material behavior, fixture rigidity, and machine capability all factor into strategy selection",
        "REQUIRES EXPLICIT USER APPROVAL — this changes the fundamental cutting approach",
      ],
    };
  }

  private explainHoleSequenceChange(
    orig: Record<string, number | string>,
    proposed: Record<string, number | string>
  ): ChangeExplanation {
    const origSeq = String(orig["sequence"] || "");
    const newSeq = String(proposed["sequence"] || "");
    const timeSaved = Number(proposed["time_saved_sec"] || 0);

    return {
      what: `Optimized hole sequence: ${origSeq} → ${newSeq}`,
      why: `Nearest-neighbor sequencing reduces rapid travel between holes — saves ${timeSaved.toFixed(1)} seconds`,
      physics_basis: "Traveling salesman problem (nearest-neighbor heuristic) — minimizing total rapid distance between hole positions reduces non-cutting time without affecting hole quality",
      tradeoffs: [
        "Hole sequence may be deliberate (e.g., alternating to prevent thermal distortion)",
        "Dowel pin holes may need to be drilled before clearance holes for alignment",
        "REQUIRES EXPLICIT USER APPROVAL if original sequence appears deliberate",
      ],
    };
  }

  // --------------------------------------------------------------------------
  // U05: DIFF PREVIEW GENERATOR
  // --------------------------------------------------------------------------

  /**
   * Generate a complete diff preview showing all proposed changes,
   * categorized by type and tier, with aggregate impact metrics.
   */
  generateDiffPreview(
    changes: ProposedChange[],
    tier: OptimizationTier
  ): DiffPreview {
    // Filter to only changes at or below the active tier
    const eligibleChanges = changes.filter((c) => c.tier_required <= tier);

    // Count by category
    const changesByCategory: Record<string, number> = {};
    for (const c of eligibleChanges) {
      changesByCategory[c.category] = (changesByCategory[c.category] || 0) + 1;
    }

    // Aggregate impacts
    let totalTimeSaved = 0;
    let totalToolLifeImpact = 0;
    let unapprovedCount = 0;

    for (const c of eligibleChanges) {
      totalTimeSaved += c.impact.time_saved_sec;
      totalToolLifeImpact += c.impact.tool_life_impact_percent;
      if (c.approved === null) unapprovedCount++;
    }

    // Generate summary lines
    const summaryLines = this.generateSummaryLines(
      eligibleChanges,
      changesByCategory,
      totalTimeSaved,
      totalToolLifeImpact,
      tier
    );

    // Generate next tier preview
    const nextTierPreview = this.generateNextTierPreviewText(changes, tier);

    return {
      tier,
      total_changes: eligibleChanges.length,
      changes_by_category: changesByCategory,
      total_time_saved_sec: Math.round(totalTimeSaved * 10) / 10,
      total_tool_life_impact_percent: Math.round(totalToolLifeImpact * 10) / 10,
      summary_lines: summaryLines,
      changes: eligibleChanges,
      unapproved_count: unapprovedCount,
      next_tier_preview: nextTierPreview,
    };
  }

  /**
   * Generate human-readable summary lines for the diff preview.
   */
  private generateSummaryLines(
    changes: ProposedChange[],
    byCategory: Record<string, number>,
    totalTime: number,
    totalToolLife: number,
    tier: OptimizationTier
  ): string[] {
    const lines: string[] = [];
    const tierNames = ["", "Format Only", "Physics S/F", "Motion Optimization", "Structural Changes"];

    lines.push(`═══ PRISM Optimization Preview — Tier ${tier}: ${tierNames[tier]} ═══`);
    lines.push(`Total changes: ${changes.length}`);
    lines.push("");

    // Group by tier within the preview
    const tierGroups = new Map<OptimizationTier, ProposedChange[]>();
    for (const c of changes) {
      if (!tierGroups.has(c.tier_required)) tierGroups.set(c.tier_required, []);
      tierGroups.get(c.tier_required)!.push(c);
    }

    for (const [t, group] of [...tierGroups.entries()].sort((a, b) => a[0] - b[0])) {
      lines.push(`── Tier ${t}: ${tierNames[t]} (${group.length} changes) ──`);
      const catCounts = new Map<ChangeCategory, number>();
      for (const c of group) {
        catCounts.set(c.category, (catCounts.get(c.category) || 0) + 1);
      }
      for (const [cat, count] of catCounts) {
        const display = CATEGORY_DISPLAY[cat] || cat;
        const catTime = group
          .filter((c) => c.category === cat)
          .reduce((sum, c) => sum + c.impact.time_saved_sec, 0);
        lines.push(`  ${display}: ${count} change${count > 1 ? "s" : ""}${catTime > 0 ? ` (${catTime.toFixed(1)}s saved)` : ""}`);
      }
      lines.push("");
    }

    // Aggregate metrics
    if (totalTime > 0) {
      const minutes = Math.floor(totalTime / 60);
      const seconds = Math.round(totalTime % 60);
      lines.push(
        `Total time saved: ${minutes > 0 ? `${minutes}m ` : ""}${seconds}s`
      );
    }

    if (totalToolLife !== 0) {
      const direction = totalToolLife > 0 ? "improvement" : "reduction";
      lines.push(
        `Tool life impact: ${Math.abs(totalToolLife).toFixed(1)}% ${direction}`
      );
    }

    // Approval status
    const approved = changes.filter((c) => c.approved === true).length;
    const rejected = changes.filter((c) => c.approved === false).length;
    const pending = changes.filter((c) => c.approved === null).length;

    if (pending > 0 || rejected > 0) {
      lines.push("");
      lines.push(
        `Approval status: ${approved} approved, ${rejected} rejected, ${pending} pending`
      );
    }

    // Risk summary
    const mediumRisk = changes.filter((c) => c.impact.risk_level === "medium");
    if (mediumRisk.length > 0) {
      lines.push("");
      lines.push(
        `⚠ ${mediumRisk.length} change${mediumRisk.length > 1 ? "s" : ""} with MEDIUM risk — review carefully`
      );
    }

    return lines;
  }

  /**
   * Generate a teaser for what the next tier would unlock.
   */
  private generateNextTierPreviewText(
    allChanges: ProposedChange[],
    currentTier: OptimizationTier
  ): string | undefined {
    if (currentTier >= 4) return undefined;

    const nextTier = (currentTier + 1) as OptimizationTier;
    const nextTierChanges = allChanges.filter(
      (c) => c.tier_required === nextTier
    );

    if (nextTierChanges.length === 0) return undefined;

    const tierNames = ["", "Format Only", "Physics S/F", "Motion Optimization", "Structural Changes"];
    const totalTime = nextTierChanges.reduce(
      (sum, c) => sum + c.impact.time_saved_sec,
      0
    );

    let preview = `Tier ${nextTier} (${tierNames[nextTier]}) available — ${nextTierChanges.length} additional change${nextTierChanges.length > 1 ? "s" : ""}`;
    if (totalTime > 0) {
      preview += ` could save ${totalTime.toFixed(1)}s`;
    }

    return preview;
  }

  /**
   * Get preview of what the next tier would unlock (action endpoint).
   */
  getNextTierPreview(
    allChanges: ProposedChange[]
  ): { available: boolean; tier?: OptimizationTier; preview?: string; change_count?: number; categories?: string[] } {
    if (this.currentTier >= 4) {
      return { available: false };
    }

    const nextTier = (this.currentTier + 1) as OptimizationTier;
    const nextChanges = allChanges.filter((c) => c.tier_required === nextTier);

    if (nextChanges.length === 0) {
      return { available: false };
    }

    const categories = [
      ...new Set(nextChanges.map((c) => CATEGORY_DISPLAY[c.category] || c.category)),
    ];

    return {
      available: true,
      tier: nextTier,
      preview: this.generateNextTierPreviewText(allChanges, this.currentTier),
      change_count: nextChanges.length,
      categories,
    };
  }

  // --------------------------------------------------------------------------
  // U06: PER-SUGGESTION APPROVAL
  // --------------------------------------------------------------------------

  /**
   * Apply an approval decision to a set of changes.
   * Supports approving/rejecting individual changes by ID or entire categories.
   * Optionally saves the preference for future sessions.
   */
  applyApproval(
    changes: ProposedChange[],
    decision: ApprovalDecision
  ): {
    changes: ProposedChange[];
    affected_count: number;
    affected_ids: string[];
  } {
    const affectedIds: string[] = [];

    for (const change of changes) {
      let affected = false;

      // Match by specific change IDs
      if (decision.change_ids && decision.change_ids.includes(change.id)) {
        affected = true;
      }

      // Match by category
      if (
        decision.categories &&
        decision.categories.includes(change.category)
      ) {
        affected = true;
      }

      // Only apply to changes that haven't already been decided
      // (unless explicitly re-deciding)
      if (affected) {
        change.approved = decision.action === "approve";
        affectedIds.push(change.id);
      }
    }

    // Save preference if requested
    if (decision.remember_preference && decision.categories) {
      for (const cat of decision.categories) {
        this.savedPreferences.push({
          category: cat,
          action: decision.action,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      changes,
      affected_count: affectedIds.length,
      affected_ids: affectedIds,
    };
  }

  /**
   * Auto-apply saved preferences to a set of changes.
   * Returns the changes with any remembered preferences applied.
   */
  applyRememberedPreferences(changes: ProposedChange[]): {
    changes: ProposedChange[];
    auto_applied_count: number;
  } {
    let autoApplied = 0;

    for (const change of changes) {
      if (change.approved !== null) continue; // already decided

      // Find the most recent preference for this category
      const pref = this.savedPreferences
        .filter((p) => p.category === change.category)
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

      if (pref) {
        change.approved = pref.action === "approve";
        autoApplied++;
      }
    }

    return { changes, auto_applied_count: autoApplied };
  }

  /**
   * Get all saved preferences.
   */
  getSavedPreferences(): SavedPreference[] {
    return [...this.savedPreferences];
  }

  /**
   * Clear saved preferences, optionally for a specific category.
   */
  clearPreferences(category?: ChangeCategory): number {
    if (category) {
      const before = this.savedPreferences.length;
      this.savedPreferences = this.savedPreferences.filter(
        (p) => p.category !== category
      );
      return before - this.savedPreferences.length;
    }
    const count = this.savedPreferences.length;
    this.savedPreferences = [];
    return count;
  }

  /**
   * Get only the approved changes from a set, ready for application.
   */
  getApprovedChanges(changes: ProposedChange[]): ProposedChange[] {
    return changes.filter(
      (c) => c.approved === true && c.tier_required <= this.currentTier
    );
  }

  /**
   * Get a summary of the approval state.
   */
  getApprovalSummary(changes: ProposedChange[]): {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    blocked_by_tier: number;
    ready_to_apply: number;
  } {
    const eligible = changes.filter((c) => c.tier_required <= this.currentTier);
    const blocked = changes.filter((c) => c.tier_required > this.currentTier);

    return {
      total: changes.length,
      approved: eligible.filter((c) => c.approved === true).length,
      rejected: eligible.filter((c) => c.approved === false).length,
      pending: eligible.filter((c) => c.approved === null).length,
      blocked_by_tier: blocked.length,
      ready_to_apply: eligible.filter((c) => c.approved === true).length,
    };
  }

  // --------------------------------------------------------------------------
  // U07: FUSION PLUGIN INTEGRATION
  // --------------------------------------------------------------------------

  /**
   * Generate the plugin manifest for Fusion 360 / external CAM integration.
   * Describes the engine's capabilities, supported tiers, and API surface.
   */
  getPluginManifest(): FusionPluginManifest {
    return {
      engine_id: "prism-optimization-tier-engine",
      version: "1.0.0",
      capabilities: [
        "tier-based-optimization",
        "user-intent-detection",
        "change-classification",
        "physics-based-explanation",
        "per-suggestion-approval",
        "diff-preview-generation",
        "preference-persistence",
      ],
      tier_support: [1, 2, 3, 4],
      intent_metadata_version: "1.0",
      api_surface: [
        {
          name: "get_tier_config",
          description: "Get feature flags for a specific optimization tier",
          input_schema: { tier: "OptimizationTier (1-4)" },
          output_schema: { config: "TierConfig" },
        },
        {
          name: "set_tier",
          description: "Set the active optimization tier",
          input_schema: { tier: "OptimizationTier (1-4)" },
          output_schema: { config: "TierConfig" },
        },
        {
          name: "detect_intent",
          description: "Parse G-code to identify user decisions and sacred elements",
          input_schema: { gcode: "string" },
          output_schema: { intent: "UserIntent" },
        },
        {
          name: "classify_changes",
          description: "Classify proposed changes into optimization tiers",
          input_schema: { changes: "RawChangeDescriptor[]" },
          output_schema: { classified: "ProposedChange[]" },
        },
        {
          name: "generate_diff",
          description: "Generate visual diff preview with impact metrics",
          input_schema: { changes: "ProposedChange[]", tier: "OptimizationTier" },
          output_schema: { preview: "DiffPreview" },
        },
        {
          name: "apply_approval",
          description: "Approve or reject individual changes or categories",
          input_schema: { changes: "ProposedChange[]", decision: "ApprovalDecision" },
          output_schema: { result: "ApprovalResult" },
        },
        {
          name: "get_next_tier_preview",
          description: "Preview what the next tier would unlock",
          input_schema: { changes: "ProposedChange[]" },
          output_schema: { preview: "NextTierPreview" },
        },
      ],
    };
  }

  /**
   * Export intent metadata in the Fusion plugin interchange format.
   * This is the data structure that external CAM systems use to understand
   * what PRISM considers sacred about the user's program.
   */
  exportIntentMetadata(intent: UserIntent): {
    version: string;
    timestamp: string;
    sacred_count: number;
    operations: Array<{
      index: number;
      tool: string;
      strategy: string;
      confidence: number;
    }>;
    constraints: Array<{
      type: string;
      value: string;
      line: number;
    }>;
    sacred_elements: string[];
  } {
    const operations = intent.tool_selections.map((ts, i) => {
      const strategy = intent.strategy_indicators.find(
        (si) => si.operation_index === i
      );
      return {
        index: i,
        tool: ts.tool_comment
          ? `T${ts.tool_number} (${ts.tool_comment})`
          : `T${ts.tool_number}`,
        strategy: strategy?.strategy || "unknown",
        confidence: strategy?.confidence || 0,
      };
    });

    const constraints: Array<{ type: string; value: string; line: number }> = [];
    for (const rh of intent.retract_heights) {
      constraints.push({
        type: rh.type,
        value: `Z${rh.z_value}`,
        line: rh.line_number,
      });
    }

    return {
      version: "1.0",
      timestamp: new Date().toISOString(),
      sacred_count: intent.sacred_elements.length,
      operations,
      constraints,
      sacred_elements: intent.sacred_elements,
    };
  }

  /**
   * Validate that a set of proposed changes does not violate any sacred
   * elements from the detected user intent.
   */
  validateAgainstIntent(
    changes: ProposedChange[],
    intent: UserIntent
  ): {
    valid: boolean;
    violations: Array<{
      change_id: string;
      sacred_element: string;
      severity: "warning" | "block";
    }>;
  } {
    const violations: Array<{
      change_id: string;
      sacred_element: string;
      severity: "warning" | "block";
    }> = [];

    for (const change of changes) {
      // Tier 4 changes always need explicit validation against intent
      if (change.category === "op_reorder") {
        violations.push({
          change_id: change.id,
          sacred_element: `Operation sequence: ${intent.operation_order.join(" → ")}`,
          severity: "block",
        });
      }

      if (change.category === "tool_select") {
        const affectedTools = change.line_numbers;
        for (const ts of intent.tool_selections) {
          if (affectedTools.includes(ts.first_use_line)) {
            violations.push({
              change_id: change.id,
              sacred_element: `Tool T${ts.tool_number}${ts.tool_comment ? ` "${ts.tool_comment}"` : ""} — selected by programmer`,
              severity: "block",
            });
          }
        }
      }

      if (change.category === "strategy") {
        violations.push({
          change_id: change.id,
          sacred_element: "Machining strategy — reflects programmer's process knowledge",
          severity: "block",
        });
      }

      // Tier 3: retract changes need to check against user's retract heights
      if (change.category === "motion_retract") {
        for (const rh of intent.retract_heights) {
          if (change.line_numbers.includes(rh.line_number)) {
            violations.push({
              change_id: change.id,
              sacred_element: `Retract height Z${rh.z_value} (${rh.type}) at line ${rh.line_number}`,
              severity: "warning",
            });
          }
        }
      }
    }

    return {
      valid: violations.filter((v) => v.severity === "block").length === 0,
      violations,
    };
  }

  // --------------------------------------------------------------------------
  // DISPATCHED ACTION HANDLER
  // --------------------------------------------------------------------------

  /**
   * Main dispatch handler for engine actions.
   * Routes action names to the appropriate method.
   */
  handleAction(
    action: string,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    switch (action) {
      case "get_tier_config": {
        const tier = (params["tier"] as OptimizationTier) ?? this.currentTier;
        return { config: this.getTierConfig(tier) };
      }

      case "set_tier": {
        const tier = params["tier"] as OptimizationTier;
        if (!tier) return { error: "Missing required parameter: tier" };
        return { config: this.setTier(tier) };
      }

      case "detect_intent": {
        const gcode = params["gcode"] as string;
        if (!gcode) return { error: "Missing required parameter: gcode" };
        return { intent: this.detectUserIntent(gcode) };
      }

      case "classify_changes": {
        const rawChanges = params["changes"] as Array<{
          category: ChangeCategory;
          line_numbers: number[];
          original_code: string[];
          proposed_code: string[];
          explanation: ChangeExplanation;
          impact: ChangeImpact;
        }>;
        if (!rawChanges) return { error: "Missing required parameter: changes" };
        return { classified: this.classifyChanges(rawChanges) };
      }

      case "generate_diff": {
        const changes = params["changes"] as ProposedChange[];
        const tier = (params["tier"] as OptimizationTier) ?? this.currentTier;
        if (!changes) return { error: "Missing required parameter: changes" };
        return { preview: this.generateDiffPreview(changes, tier) };
      }

      case "apply_approval": {
        const changes = params["changes"] as ProposedChange[];
        const decision = params["decision"] as ApprovalDecision;
        if (!changes || !decision) {
          return { error: "Missing required parameters: changes, decision" };
        }
        return this.applyApproval(changes, decision);
      }

      case "get_next_tier_preview": {
        const changes = params["changes"] as ProposedChange[];
        if (!changes) return { error: "Missing required parameter: changes" };
        return this.getNextTierPreview(changes);
      }

      case "get_plugin_manifest": {
        return { manifest: this.getPluginManifest() };
      }

      case "export_intent_metadata": {
        const intent = params["intent"] as UserIntent;
        if (!intent) return { error: "Missing required parameter: intent" };
        return { metadata: this.exportIntentMetadata(intent) };
      }

      case "validate_against_intent": {
        const changes = params["changes"] as ProposedChange[];
        const intent = params["intent"] as UserIntent;
        if (!changes || !intent) {
          return { error: "Missing required parameters: changes, intent" };
        }
        return this.validateAgainstIntent(changes, intent);
      }

      case "get_approval_summary": {
        const changes = params["changes"] as ProposedChange[];
        if (!changes) return { error: "Missing required parameter: changes" };
        return { summary: this.getApprovalSummary(changes) };
      }

      case "apply_remembered_preferences": {
        const changes = params["changes"] as ProposedChange[];
        if (!changes) return { error: "Missing required parameter: changes" };
        return this.applyRememberedPreferences(changes);
      }

      case "get_approved_changes": {
        const changes = params["changes"] as ProposedChange[];
        if (!changes) return { error: "Missing required parameter: changes" };
        return { approved: this.getApprovedChanges(changes) };
      }

      case "clear_preferences": {
        const category = params["category"] as ChangeCategory | undefined;
        const cleared = this.clearPreferences(category);
        return { cleared_count: cleared };
      }

      default:
        return {
          error: `Unknown action: ${action}`,
          valid_actions: [
            "get_tier_config",
            "set_tier",
            "detect_intent",
            "classify_changes",
            "generate_diff",
            "apply_approval",
            "get_next_tier_preview",
            "get_plugin_manifest",
            "export_intent_metadata",
            "validate_against_intent",
            "get_approval_summary",
            "apply_remembered_preferences",
            "get_approved_changes",
            "clear_preferences",
          ],
        };
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  private generateChangeId(category: ChangeCategory): string {
    this.changeIdCounter++;
    const ts = Date.now().toString(36);
    return `${category}-${ts}-${this.changeIdCounter.toString().padStart(4, "0")}`;
  }

  private mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const avg = this.mean(values);
    const squaredDiffs = values.map((v) => (v - avg) ** 2);
    return Math.sqrt(squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1));
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const optimizationTierEngine = new OptimizationTierEngine();
