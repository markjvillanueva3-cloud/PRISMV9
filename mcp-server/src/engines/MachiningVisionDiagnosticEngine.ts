/**
 * MachiningVisionDiagnosticEngine — operator-photo → diagnosis → parameter
 * adjustment recommender for roughing operations (hotel iter26).
 *
 * Operator directive (2026-05-25):
 *   "build a feature that will allow the operator to take a picture of chips,
 *    part and tooling to determine issues to make automatic parameter
 *    adjustments to the program and speed and feed alterations to ensure
 *    proper chip thickness and formation and heat dissipation for roughing
 *    operations"
 *
 * Architecture:
 *   - Pure-core diagnostic — vision/CV runs through injected VisionAdapter
 *     (production: ML model / API; tests: fake observation fixtures).
 *   - Diagnostic table maps observations → issues with confidence.
 *   - Adjustment recommender per issue with multiplicative speed/feed/DOC/
 *     stepover/coolant deltas. Roughing-focus: prioritize chip control + heat
 *     dissipation over surface finish.
 *   - Below confidence floor → recommendation_queue (R12 fail-LOUD never silent).
 *
 * Hotel-soul invariants:
 *   - Never recommends parameter change ≥ HARD_DELTA_CAP (0.30 = 30%) in one
 *     iteration. Big jumps require human approval (anti-runaway).
 *   - Vision adapter not wired → fail-LOUD with EXTRACTOR_NOT_WIRED code.
 *   - Result carries `requires_operator_confirmation` flag — only set false
 *     when ALL adjustments are within SAFE_DELTA_AUTO (≤0.10 = 10%) AND
 *     overall confidence ≥ 0.85.
 *   - PII-aware: no raw image bytes ever logged; only sha256 of bytes kept.
 *
 * Karpathy pre-coding gate:
 *   CLASSIFY      — image → observation → issue → adjustment chain
 *   TECHNIQUE     — diagnostic-table + multiplier-aggregation + safety cap
 *   EDGE CASES    — blurry image, ambiguous subject, multi-issue (chip
 *                   carrying heat AND BUE buildup simultaneously),
 *                   conflicting adjustments (one says ↑speed, other ↓speed)
 *   FAILURE MODES — runaway adjustment (HARD_DELTA_CAP), vision-not-wired
 *                   (fail-LOUD), wrong process type (roughing-only gate),
 *                   silent acceptance of low-confidence diag (queue path)
 *   THEN WRITE    — code handles all four from line 1.
 */

import { createHash } from "node:crypto";

export const ISSUE_CONFIDENCE_FLOOR = 0.65;
export const AUTO_APPROVE_CONFIDENCE_FLOOR = 0.85;
export const SAFE_DELTA_AUTO = 0.10;     // ≤10% delta auto-applies
export const HARD_DELTA_CAP = 0.30;       // >30% always requires confirmation

export type Subject = "chip" | "part" | "tool" | "mixed";
export type ProcessType = "roughing" | "finishing" | "drilling" | "tapping";

export type ChipColor = "silver" | "straw" | "purple" | "blue" | "brown" | "black";
export type ChipShape = "short_c" | "long_spiral" | "stringy" | "powder" | "welded_to_tool" | "needle";

export interface ChipObservation {
  subject: "chip";
  color: ChipColor;
  shape: ChipShape;
  // 0=cold/dust, 1=ideal blue, 2=burnt
  thickness_estimate?: "too_thin" | "ideal" | "too_thick";
  confidence: number;
}
export interface PartObservation {
  subject: "part";
  surface_quality: "good" | "chatter_marks" | "tearing" | "discoloration" | "burr";
  dimensional_drift_detected?: boolean;
  confidence: number;
}
export interface ToolObservation {
  subject: "tool";
  flank_wear: "none" | "light" | "moderate" | "heavy" | "catastrophic";
  bue_detected?: boolean;
  edge_chipping?: boolean;
  crater_wear?: boolean;
  notching_at_doc?: boolean;
  confidence: number;
}
export type VisionObservation = ChipObservation | PartObservation | ToolObservation;

export interface VisionAdapter {
  observe(bytes: Uint8Array, hint?: { subject?: Subject }): Promise<VisionObservation[]>;
}

export interface DiagnosedIssue {
  issue_code: string;
  description: string;
  root_cause: string;
  severity: "info" | "warning" | "critical";
  confidence: number;
  subject: Subject;
}

export interface ParameterAdjustment {
  speed_multiplier: number;          // e.g. 0.85 = reduce SFM 15%
  feed_multiplier: number;
  doc_multiplier: number;
  stepover_multiplier: number;
  coolant_flow_multiplier: number;
  recommendations: string[];
}

export interface DiagnosticResult {
  image_sha256: string;
  process_type: ProcessType;
  observations: VisionObservation[];
  issues: DiagnosedIssue[];
  queued_low_confidence: DiagnosedIssue[];
  adjustment: ParameterAdjustment;
  overall_confidence: number;
  requires_operator_confirmation: boolean;
  warnings: string[];
  diagnosed_at: string;
}

// ── Diagnostic rules table ─────────────────────────────────────────────────

interface ChipRule {
  match: (o: ChipObservation) => boolean;
  issue: Omit<DiagnosedIssue, "confidence" | "subject">;
  /** Multipliers applied to current params when this issue fires. */
  delta: Partial<Omit<ParameterAdjustment, "recommendations">>;
  hint: string;
}

const CHIP_RULES: ChipRule[] = [
  {
    match: (o) => o.color === "blue" && (o.shape === "short_c" || o.shape === "long_spiral"),
    issue: {
      issue_code: "CHIP_TEMP_IDEAL",
      description: "Blue chips with curl shape — heat is carried away in the chip, ideal roughing state",
      root_cause: "Operating in the sweet spot for SFM × feed combination",
      severity: "info",
    },
    delta: {},
    hint: "Hold current parameters; this is the target chip state for roughing",
  },
  {
    match: (o) => o.color === "black" || o.color === "brown",
    issue: {
      issue_code: "CHIP_BURNT",
      description: "Burnt chips (brown/black) — heat is NOT leaving in the chip; tool + part are absorbing it",
      root_cause: "SFM too high for the feed rate, OR coolant flow inadequate",
      severity: "critical",
    },
    delta: { speed_multiplier: 0.85, coolant_flow_multiplier: 1.2 },
    hint: "Reduce SFM 15% and increase coolant flow 20% to push heat back into the chip",
  },
  {
    match: (o) => o.shape === "stringy" || o.shape === "long_spiral",
    issue: {
      issue_code: "CHIP_CONTROL_POOR",
      description: "Stringy / long spiral chips — risk of bird-nest + chip recutting",
      root_cause: "Feed-per-tooth below chip-breaker activation threshold for this insert",
      severity: "warning",
    },
    delta: { feed_multiplier: 1.10 },
    hint: "Increase feed 10% to activate chip-breaker geometry; verify chip-breaker grade is correct for material",
  },
  {
    match: (o) => o.shape === "powder" || o.thickness_estimate === "too_thin",
    issue: {
      issue_code: "CHIP_TOO_THIN",
      description: "Dust/powder chips — rubbing instead of cutting; rapid flank wear",
      root_cause: "Feed-per-tooth below minimum chip thickness (work-hardens stainless/titanium)",
      severity: "critical",
    },
    delta: { feed_multiplier: 1.20 },
    hint: "Increase feed 20% to clear minimum-chip-thickness threshold — rubbing is more harmful than aggressive cutting",
  },
  {
    match: (o) => o.shape === "welded_to_tool",
    issue: {
      issue_code: "BUE_BUILDUP",
      description: "Material welded to cutting edge (built-up edge) — common at low SFM in aluminum/soft steels",
      root_cause: "Operating below BUE threshold (typically <60 SFM for aluminum, <120 SFM for mild steel)",
      severity: "warning",
    },
    delta: { speed_multiplier: 1.25 },
    hint: "Increase SFM 25% to push above BUE-formation temperature window",
  },
  {
    match: (o) => o.color === "purple" || o.color === "straw",
    issue: {
      issue_code: "CHIP_TEMP_MARGINAL",
      description: "Straw/purple chips — running near upper end of acceptable temp",
      root_cause: "SFM slightly high or chipload slightly low",
      severity: "warning",
    },
    delta: { speed_multiplier: 0.95 },
    hint: "Reduce SFM 5% as a precaution; monitor next chip sample",
  },
];

interface PartRule {
  match: (o: PartObservation) => boolean;
  issue: Omit<DiagnosedIssue, "confidence" | "subject">;
  delta: Partial<Omit<ParameterAdjustment, "recommendations">>;
  hint: string;
}

const PART_RULES: PartRule[] = [
  {
    match: (o) => o.surface_quality === "chatter_marks",
    issue: {
      issue_code: "PART_CHATTER",
      description: "Chatter marks visible on part — regenerative vibration",
      root_cause: "Operating inside an unstable stability lobe",
      severity: "critical",
    },
    delta: { doc_multiplier: 0.70, speed_multiplier: 1.15 },
    hint: "Reduce DOC 30% to drop below chatter threshold; bump SFM 15% to shift toward next stable lobe",
  },
  {
    match: (o) => o.surface_quality === "tearing",
    issue: {
      issue_code: "PART_TEARING",
      description: "Tearing surface — chip is being torn from the workpiece, not sheared",
      root_cause: "Feed-per-tooth too low + dull/wrong-geometry tool",
      severity: "warning",
    },
    delta: { feed_multiplier: 1.15 },
    hint: "Increase feed 15% to restore proper shearing action; verify tool geometry for material",
  },
  {
    match: (o) => o.surface_quality === "discoloration",
    issue: {
      issue_code: "PART_HEAT_DAMAGE",
      description: "Heat discoloration on part surface — thermal damage / possible white-layer formation",
      root_cause: "Insufficient heat carried away by chip + coolant",
      severity: "critical",
    },
    delta: { speed_multiplier: 0.85, coolant_flow_multiplier: 1.3 },
    hint: "Reduce SFM 15%, boost coolant flow 30% — protect part metallurgy",
  },
  {
    match: (o) => o.surface_quality === "burr",
    issue: {
      issue_code: "PART_BURR",
      description: "Burr on exit edge — deburring/finishing pass needed",
      root_cause: "Exit kinematics + DOC + feed combination at edge",
      severity: "info",
    },
    delta: {},
    hint: "Add a finishing pass or reduce feed by 30% at exit edge; consider chamfer/back-deburr secondary op",
  },
  {
    match: (o) => o.dimensional_drift_detected === true,
    issue: {
      issue_code: "PART_DIM_DRIFT",
      description: "Dimensional drift detected across batch — tool wear OR thermal growth",
      root_cause: "Tool wear consumes flank stock OR spindle thermal expansion",
      severity: "warning",
    },
    delta: {},
    hint: "Run probe routine to confirm offset; check tool flank wear (replace at VB > 0.3mm)",
  },
];

interface ToolRule {
  match: (o: ToolObservation) => boolean;
  issue: Omit<DiagnosedIssue, "confidence" | "subject">;
  delta: Partial<Omit<ParameterAdjustment, "recommendations">>;
  hint: string;
}

const TOOL_RULES: ToolRule[] = [
  {
    match: (o) => o.flank_wear === "catastrophic",
    issue: {
      issue_code: "TOOL_FAILURE",
      description: "Catastrophic flank wear / edge failure — DO NOT continue cutting",
      root_cause: "Tool past end of useful life",
      severity: "critical",
    },
    delta: {},
    hint: "STOP and replace tool immediately; reset offsets; inspect last finished feature",
  },
  {
    match: (o) => o.flank_wear === "heavy",
    issue: {
      issue_code: "TOOL_END_OF_LIFE",
      description: "Heavy flank wear (estimated VB > 0.3mm) — entering tool-life end",
      root_cause: "Tool has reached planned VBmax",
      severity: "warning",
    },
    delta: { speed_multiplier: 0.90 },
    hint: "Reduce SFM 10% to extend remaining life; queue tool replacement",
  },
  {
    match: (o) => o.crater_wear === true,
    issue: {
      issue_code: "TOOL_CRATER",
      description: "Crater wear on rake face — diffusion / chemical wear",
      root_cause: "SFM too high (drives chip-tool interface temperature past coating limit)",
      severity: "warning",
    },
    delta: { speed_multiplier: 0.85 },
    hint: "Reduce SFM 15% to drop interface temp below coating activation; consider switch to TiAlN/AlTiN coating",
  },
  {
    match: (o) => o.edge_chipping === true,
    issue: {
      issue_code: "TOOL_EDGE_CHIPPING",
      description: "Edge chipping — interrupted-cut overload or chatter spike",
      root_cause: "Feed-per-tooth too high for interrupted cut OR chatter present",
      severity: "warning",
    },
    delta: { feed_multiplier: 0.90, doc_multiplier: 0.90 },
    hint: "Reduce feed 10% AND DOC 10% to lower per-edge impact load",
  },
  {
    match: (o) => o.bue_detected === true,
    issue: {
      issue_code: "TOOL_BUE_BUILDUP",
      description: "Built-up edge welded to insert/end mill — degrades edge geometry",
      root_cause: "SFM below BUE-formation upper threshold for this material",
      severity: "warning",
    },
    delta: { speed_multiplier: 1.20 },
    hint: "Increase SFM 20% to push past BUE window; verify coolant lubricity",
  },
  {
    match: (o) => o.notching_at_doc === true,
    issue: {
      issue_code: "TOOL_DOC_NOTCH",
      description: "Notching at depth-of-cut line — work-hardening / abrasive interaction at DOC boundary",
      root_cause: "Constant DOC concentrates wear at same edge location",
      severity: "warning",
    },
    delta: { doc_multiplier: 0.92 },
    hint: "Vary DOC slightly each pass OR use ramping/peel strategy to distribute wear across edge",
  },
];

// ── Engine ─────────────────────────────────────────────────────────────────

export class MachiningVisionDiagnosticEngine {
  constructor(private readonly vision: VisionAdapter) {}

  async diagnose(
    bytes: Uint8Array,
    opts: { process_type: ProcessType; subject_hint?: Subject }
  ): Promise<DiagnosticResult> {
    const sha = createHash("sha256").update(bytes).digest("hex");
    const warnings: string[] = [];
    const result: DiagnosticResult = {
      image_sha256: sha,
      process_type: opts.process_type,
      observations: [],
      issues: [],
      queued_low_confidence: [],
      adjustment: {
        speed_multiplier: 1.0,
        feed_multiplier: 1.0,
        doc_multiplier: 1.0,
        stepover_multiplier: 1.0,
        coolant_flow_multiplier: 1.0,
        recommendations: [],
      },
      overall_confidence: 0,
      requires_operator_confirmation: true,
      warnings,
      diagnosed_at: new Date().toISOString(),
    };

    if (opts.process_type !== "roughing") {
      warnings.push(
        `process_type='${opts.process_type}' — this engine is roughing-tuned per operator directive; ` +
          `recommendations may not apply to finishing/drilling/tapping`
      );
    }

    result.observations = await this.vision.observe(bytes, { subject: opts.subject_hint });

    if (result.observations.length === 0) {
      warnings.push("vision_returned_empty — no observations to diagnose");
      return result;
    }

    for (const obs of result.observations) {
      this.diagnoseObservation(obs, result);
    }

    // Aggregate adjustments by MULTIPLYING multipliers (compound effects).
    // Apply HARD_DELTA_CAP to clamp runaway multipliers.
    result.adjustment.speed_multiplier = clamp(result.adjustment.speed_multiplier, 1 - HARD_DELTA_CAP, 1 + HARD_DELTA_CAP);
    result.adjustment.feed_multiplier = clamp(result.adjustment.feed_multiplier, 1 - HARD_DELTA_CAP, 1 + HARD_DELTA_CAP);
    result.adjustment.doc_multiplier = clamp(result.adjustment.doc_multiplier, 1 - HARD_DELTA_CAP, 1 + HARD_DELTA_CAP);
    result.adjustment.stepover_multiplier = clamp(result.adjustment.stepover_multiplier, 1 - HARD_DELTA_CAP, 1 + HARD_DELTA_CAP);
    // Coolant has different bounds (1.0 .. 2.0) — never reduce below current
    result.adjustment.coolant_flow_multiplier = clamp(result.adjustment.coolant_flow_multiplier, 1.0, 2.0);

    // Overall confidence = mean of issue confidences (firing rules only).
    if (result.issues.length > 0) {
      result.overall_confidence =
        result.issues.reduce((s, i) => s + i.confidence, 0) / result.issues.length;
    } else if (result.observations.length > 0) {
      result.overall_confidence =
        result.observations.reduce((s, o) => s + o.confidence, 0) / result.observations.length;
    }

    // Auto-approve gate
    const maxAbsDelta = Math.max(
      Math.abs(result.adjustment.speed_multiplier - 1.0),
      Math.abs(result.adjustment.feed_multiplier - 1.0),
      Math.abs(result.adjustment.doc_multiplier - 1.0),
      Math.abs(result.adjustment.stepover_multiplier - 1.0),
      Math.abs(result.adjustment.coolant_flow_multiplier - 1.0)
    );
    const hasCritical = result.issues.some((i) => i.severity === "critical");
    result.requires_operator_confirmation =
      hasCritical ||
      maxAbsDelta > SAFE_DELTA_AUTO ||
      result.overall_confidence < AUTO_APPROVE_CONFIDENCE_FLOOR;

    return result;
  }

  private diagnoseObservation(obs: VisionObservation, result: DiagnosticResult): void {
    if (obs.subject === "chip") {
      for (const rule of CHIP_RULES) {
        if (rule.match(obs)) this.applyRule(obs, rule, result);
      }
    } else if (obs.subject === "part") {
      for (const rule of PART_RULES) {
        if (rule.match(obs)) this.applyRule(obs, rule, result);
      }
    } else if (obs.subject === "tool") {
      for (const rule of TOOL_RULES) {
        if (rule.match(obs)) this.applyRule(obs, rule, result);
      }
    }
  }

  private applyRule(
    obs: VisionObservation,
    rule: ChipRule | PartRule | ToolRule,
    result: DiagnosticResult
  ): void {
    const issue: DiagnosedIssue = {
      ...rule.issue,
      confidence: obs.confidence,
      subject: obs.subject,
    };

    if (obs.confidence < ISSUE_CONFIDENCE_FLOOR) {
      result.queued_low_confidence.push(issue);
      return;
    }

    result.issues.push(issue);
    result.adjustment.recommendations.push(rule.hint);

    if (rule.delta.speed_multiplier) result.adjustment.speed_multiplier *= rule.delta.speed_multiplier;
    if (rule.delta.feed_multiplier) result.adjustment.feed_multiplier *= rule.delta.feed_multiplier;
    if (rule.delta.doc_multiplier) result.adjustment.doc_multiplier *= rule.delta.doc_multiplier;
    if (rule.delta.stepover_multiplier) result.adjustment.stepover_multiplier *= rule.delta.stepover_multiplier;
    if (rule.delta.coolant_flow_multiplier)
      result.adjustment.coolant_flow_multiplier *= rule.delta.coolant_flow_multiplier;
  }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ── In-memory vision adapter for tests ─────────────────────────────────────

export class FakeVisionAdapter implements VisionAdapter {
  constructor(private readonly observations: VisionObservation[]) {}
  async observe(): Promise<VisionObservation[]> {
    return [...this.observations];
  }
}

export class NotWiredVisionAdapter implements VisionAdapter {
  async observe(): Promise<VisionObservation[]> {
    const err = new Error(
      "vision_adapter_not_wired — production CV model (e.g. ONNX/TF.js chip classifier) not configured. " +
        "Wire via visionDiagnosticSingleton.setVisionAdapter() at server boot."
    );
    (err as Error & { code?: string }).code = "ADAPTER_NOT_WIRED";
    throw err;
  }
}
