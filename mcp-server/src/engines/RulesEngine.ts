/**
 * RulesEngine.ts — R13-MS1: Rules Engine + Machining Rules Extraction
 *
 * Extracted from monolith modules:
 *   - PRISM_INTELLIGENT_DECISION_ENGINE.js (confidence, optimization, reasoning)
 *   - PRISM_CALCULATOR_CONSTRAINT_ENGINE.js (parameter constraints from 7 sources)
 *   - PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE.js (WOC/DOC rules, material factors, vendor data)
 *
 * New MCP actions: evaluate_rules, rule_search, evaluate_machining_rules, get_parameter_constraints
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface CuttingContext {
  material?: { id?: string; name?: string; family?: string; hardness?: number; Kc11?: number; Kc?: number; mc?: number };
  tool?: { diameter?: number; type?: string; flutes?: number; material?: string; solidTool?: any; indexableTool?: any };
  machine?: { spindle?: any; axes?: any; rapids?: any; structure?: any; rigidityClass?: string };
  controller?: { motion?: any; compensation?: any; fiveAxis?: any };
  holder?: { maxRpm?: number; rigidityFactor?: number; rigidity?: number; damping?: number; runout?: number };
  workholding?: { thinWalls?: boolean; [k: string]: any };
  toolpath?: { camSystem?: string; strategyName?: string; maxRadialEngagement?: number; maxAxialEngagement?: number };
  operation?: string;
  dimensions?: any;
  tolerance?: number;
  finish?: number;
  quantity?: number;
}

export interface RuleResult {
  applies: boolean;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, any>;
}

export interface MachiningRule {
  id: string;
  category: string;
  condition: (ctx: CuttingContext) => boolean;
  action: (ctx: CuttingContext) => RuleResult;
  severity: 'info' | 'warning' | 'critical';
  source: 'monolith' | 'empirical' | 'handbook';
  confidence: number; // 0.0-1.0
}

export interface ParameterConstraints {
  rpm: { min: number; max: number; limitedBy: string[] };
  feed: { min: number; max: number; limitedBy: string[] };
  doc: { min: number; max: number; limitedBy: string[] };
  woc: { min: number; max: number; limitedBy: string[] };
  vc: { min: number; max: number; limitedBy: string[] };
  powerLimit?: number;
  torqueLimit?: number;
  machineRigidity?: number;
  holderRigidity?: number;
  holderDamping?: number;
  holderRunout?: number;
  workholdingRigidity?: number;
  workholdingDamping?: number;
  thinWallMode?: boolean;
  toolDiameter?: number;
  centerCutting?: boolean;
  controllerLookAhead?: number;
  blockProcessingRate?: number;
  rtcpCapable?: boolean;
  materialKc?: number;
  materialMc?: number;
  vcRange?: { min: number; max: number };
  fzRange?: { min: number; max: number };
  strategyModifiers?: Record<string, any>;
  engagementType?: string;
}

export interface ConfidenceResult {
  score: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  factors: Record<string, number>;
  recommendation: string;
  canProceedAutomatically: boolean;
}

export interface ReasoningChain {
  decision: string;
  timestamp: string;
  steps: Array<{ id: number; action: string; reason: string; data?: any; timestamp: string }>;
  conclusion: string | null;
  alternativesConsidered: Array<{ name: string; rejectionReason: string }>;
  confidence: number | null;
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLDS = { HIGH: 85, MEDIUM: 60, LOW: 40, VERY_LOW: 20 } as const;

const WOC_DEFAULTS: Record<string, { min: number; optimal: number; max: number }> = {
  adaptive_roughing: { min: 0.08, optimal: 0.10, max: 0.15 },
  conventional_roughing: { min: 0.30, optimal: 0.50, max: 0.65 },
  hsm_roughing: { min: 0.05, optimal: 0.08, max: 0.12 },
  trochoidal: { min: 0.08, optimal: 0.12, max: 0.18 },
  volumill: { min: 0.07, optimal: 0.10, max: 0.15 },
  semi_finish: { min: 0.15, optimal: 0.25, max: 0.35 },
  rest_machining: { min: 0.20, optimal: 0.30, max: 0.40 },
  finish_parallel: { min: 0.05, optimal: 0.10, max: 0.20 },
  finish_scallop: { min: 0.03, optimal: 0.08, max: 0.15 },
  finish_waterline: { min: 0.10, optimal: 0.15, max: 0.25 },
  finish_contour: { min: 0.02, optimal: 0.05, max: 0.10 },
  pencil: { min: 0.05, optimal: 0.10, max: 0.15 },
  pocket_spiral: { min: 0.35, optimal: 0.50, max: 0.70 },
  pocket_zigzag: { min: 0.40, optimal: 0.55, max: 0.70 },
  pocket_adaptive: { min: 0.08, optimal: 0.10, max: 0.15 },
  slot_plunge: { min: 0.90, optimal: 1.00, max: 1.00 },
  slot_ramping: { min: 0.90, optimal: 1.00, max: 1.00 },
  face_milling: { min: 0.50, optimal: 0.70, max: 0.80 },
  default: { min: 0.25, optimal: 0.40, max: 0.60 },
};

const DOC_DEFAULTS: Record<string, { base: string; min: number; optimal: number; max: number; prioritizeLoc: boolean }> = {
  adaptive_roughing: { base: 'loc', min: 0.8, optimal: 1.0, max: 1.0, prioritizeLoc: true },
  hsm_roughing: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },
  trochoidal: { base: 'loc', min: 0.8, optimal: 1.0, max: 1.0, prioritizeLoc: true },
  volumill: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },
  conventional_roughing: { base: 'loc', min: 0.5, optimal: 0.85, max: 1.0, prioritizeLoc: true },
  semi_finish: { base: 'diameter', min: 0.3, optimal: 0.5, max: 0.8, prioritizeLoc: false },
  rest_machining: { base: 'diameter', min: 0.5, optimal: 0.8, max: 1.2, prioritizeLoc: false },
  finish_parallel: { base: 'fixed', min: 0.1, optimal: 0.2, max: 0.5, prioritizeLoc: false },
  finish_scallop: { base: 'fixed', min: 0.05, optimal: 0.15, max: 0.3, prioritizeLoc: false },
  finish_waterline: { base: 'fixed', min: 0.1, optimal: 0.25, max: 0.5, prioritizeLoc: false },
  finish_contour: { base: 'fixed', min: 0.05, optimal: 0.1, max: 0.2, prioritizeLoc: false },
  pencil: { base: 'fixed', min: 0.02, optimal: 0.05, max: 0.1, prioritizeLoc: false },
  pocket_spiral: { base: 'loc', min: 0.5, optimal: 0.8, max: 1.0, prioritizeLoc: true },
  pocket_zigzag: { base: 'loc', min: 0.5, optimal: 0.8, max: 1.0, prioritizeLoc: true },
  pocket_adaptive: { base: 'loc', min: 0.85, optimal: 1.0, max: 1.0, prioritizeLoc: true },
  slot_plunge: { base: 'loc', min: 0.3, optimal: 0.5, max: 0.6, prioritizeLoc: false },
  slot_ramping: { base: 'loc', min: 0.5, optimal: 0.7, max: 0.85, prioritizeLoc: false },
  face_milling: { base: 'fixed', min: 0.5, optimal: 1.0, max: 2.0, prioritizeLoc: false },
  default: { base: 'loc', min: 0.5, optimal: 0.75, max: 1.0, prioritizeLoc: false },
};

const MATERIAL_FACTORS: Record<string, { wocFactor: number; docFactor: number; speedFactor: number; maxLocMult: number }> = {
  aluminum: { wocFactor: 1.2, docFactor: 1.2, speedFactor: 1.5, maxLocMult: 1.0 },
  aluminum_alloy: { wocFactor: 1.1, docFactor: 1.1, speedFactor: 1.4, maxLocMult: 1.0 },
  mild_steel: { wocFactor: 1.0, docFactor: 1.0, speedFactor: 1.0, maxLocMult: 1.0 },
  carbon_steel: { wocFactor: 0.95, docFactor: 0.95, speedFactor: 0.95, maxLocMult: 1.0 },
  alloy_steel: { wocFactor: 0.85, docFactor: 0.9, speedFactor: 0.85, maxLocMult: 1.0 },
  tool_steel: { wocFactor: 0.7, docFactor: 0.8, speedFactor: 0.7, maxLocMult: 0.95 },
  stainless_304: { wocFactor: 0.7, docFactor: 0.85, speedFactor: 0.65, maxLocMult: 0.9 },
  stainless_316: { wocFactor: 0.65, docFactor: 0.8, speedFactor: 0.6, maxLocMult: 0.9 },
  stainless_17_4: { wocFactor: 0.55, docFactor: 0.75, speedFactor: 0.5, maxLocMult: 0.85 },
  cast_iron: { wocFactor: 0.9, docFactor: 1.0, speedFactor: 0.85, maxLocMult: 1.0 },
  titanium: { wocFactor: 0.5, docFactor: 0.9, speedFactor: 0.4, maxLocMult: 1.0 },
  titanium_6al4v: { wocFactor: 0.45, docFactor: 0.85, speedFactor: 0.35, maxLocMult: 1.0 },
  inconel: { wocFactor: 0.35, docFactor: 0.7, speedFactor: 0.25, maxLocMult: 0.8 },
  inconel_718: { wocFactor: 0.3, docFactor: 0.65, speedFactor: 0.2, maxLocMult: 0.8 },
  hastelloy: { wocFactor: 0.3, docFactor: 0.65, speedFactor: 0.2, maxLocMult: 0.75 },
  hardened_steel: { wocFactor: 0.4, docFactor: 0.5, speedFactor: 0.35, maxLocMult: 0.8 },
  copper: { wocFactor: 1.1, docFactor: 1.1, speedFactor: 1.3, maxLocMult: 1.0 },
  brass: { wocFactor: 1.15, docFactor: 1.15, speedFactor: 1.4, maxLocMult: 1.0 },
  bronze: { wocFactor: 1.0, docFactor: 1.0, speedFactor: 1.2, maxLocMult: 1.0 },
  plastic: { wocFactor: 1.3, docFactor: 1.3, speedFactor: 1.8, maxLocMult: 1.0 },
};

const TOOL_TYPE_FACTORS: Record<string, { wocMult: number; docMult: number }> = {
  endmill: { wocMult: 1.0, docMult: 1.0 },
  endmill_roughing: { wocMult: 0.9, docMult: 1.1 },
  endmill_finishing: { wocMult: 1.1, docMult: 0.8 },
  endmill_ball: { wocMult: 0.8, docMult: 0.7 },
  endmill_bullnose: { wocMult: 0.9, docMult: 0.85 },
  endmill_chamfer: { wocMult: 0.7, docMult: 0.5 },
  face_mill: { wocMult: 1.2, docMult: 0.6 },
  drill: { wocMult: 1.0, docMult: 1.0 },
  reamer: { wocMult: 0.5, docMult: 0.3 },
};

const FLUTE_FACTORS: Record<number, { wocMult: number; docMult: number; chipSpace: string }> = {
  2: { wocMult: 1.1, docMult: 1.0, chipSpace: 'excellent' },
  3: { wocMult: 1.0, docMult: 1.0, chipSpace: 'good' },
  4: { wocMult: 0.95, docMult: 0.95, chipSpace: 'moderate' },
  5: { wocMult: 0.9, docMult: 0.9, chipSpace: 'limited' },
  6: { wocMult: 0.85, docMult: 0.85, chipSpace: 'limited' },
};

const RIGIDITY_FACTORS: Record<string, { wocMult: number; docMult: number }> = {
  very_rigid: { wocMult: 1.1, docMult: 1.1 },
  rigid: { wocMult: 1.0, docMult: 1.0 },
  moderate: { wocMult: 0.85, docMult: 0.85 },
  light: { wocMult: 0.7, docMult: 0.7 },
};

const VENDOR_RECOMMENDATIONS: Record<string, { sfm: { min: number; recommended: number; max: number }; ipt: { min: number; recommended: number; max: number }; ae_roughing: number; ae_adaptive: number; ap_roughing_mult: number; notes: string }> = {
  aluminum: { sfm: { min: 800, recommended: 1200, max: 2000 }, ipt: { min: 0.002, recommended: 0.004, max: 0.008 }, ae_roughing: 0.50, ae_adaptive: 0.10, ap_roughing_mult: 1.0, notes: 'Uncoated or ZrN. Full LOC for roughing.' },
  mild_steel: { sfm: { min: 300, recommended: 450, max: 600 }, ipt: { min: 0.001, recommended: 0.003, max: 0.005 }, ae_roughing: 0.40, ae_adaptive: 0.10, ap_roughing_mult: 1.0, notes: 'TiAlN coating. Full LOC for adaptive roughing.' },
  stainless_304: { sfm: { min: 150, recommended: 280, max: 400 }, ipt: { min: 0.001, recommended: 0.002, max: 0.004 }, ae_roughing: 0.30, ae_adaptive: 0.08, ap_roughing_mult: 0.9, notes: 'Maintain chip load, avoid dwelling.' },
  titanium_6al4v: { sfm: { min: 80, recommended: 150, max: 250 }, ipt: { min: 0.001, recommended: 0.002, max: 0.003 }, ae_roughing: 0.15, ae_adaptive: 0.08, ap_roughing_mult: 1.0, notes: 'High coolant pressure. AlTiN or uncoated.' },
  inconel_718: { sfm: { min: 40, recommended: 80, max: 150 }, ipt: { min: 0.0005, recommended: 0.001, max: 0.002 }, ae_roughing: 0.08, ae_adaptive: 0.05, ap_roughing_mult: 0.8, notes: 'Ceramic for roughing. Heat sensitive.' },
  hardened_steel: { sfm: { min: 100, recommended: 200, max: 350 }, ipt: { min: 0.0005, recommended: 0.001, max: 0.002 }, ae_roughing: 0.10, ae_adaptive: 0.05, ap_roughing_mult: 0.8, notes: 'Ceramic or CBN. Light cuts, high speed.' },
};

const MACHINE_RIGIDITY_MAP: Record<string, number> = {
  light: 0.75, medium: 1.0, heavy: 1.15, 'ultra-rigid': 1.30, ultra_heavy: 1.30,
};

// ─── RULES ENGINE CLASS ─────────────────────────────────────────────────────

export class RulesEngine {
  private rules: MachiningRule[] = [];

  constructor() {
    this.loadBuiltInRules();
  }

  // ── RULE MANAGEMENT ────────────────────────────────────────────────────

  loadBuiltInRules(): void {
    this.rules = [
      // Safety rules
      {
        id: 'SAFETY_001', category: 'safety', severity: 'critical', source: 'handbook', confidence: 1.0,
        condition: (ctx) => {
          const rpm = ctx.machine?.spindle?.maxRpm;
          const holderMax = ctx.holder?.maxRpm;
          return !!(rpm && holderMax && rpm > holderMax);
        },
        action: () => ({ applies: true, severity: 'critical', message: 'Spindle RPM exceeds holder balance rating. Risk of holder failure.' }),
      },
      {
        id: 'SAFETY_002', category: 'safety', severity: 'critical', source: 'handbook', confidence: 1.0,
        condition: (ctx) => {
          const doc = ctx.toolpath?.maxAxialEngagement;
          const fluteLen = ctx.tool?.solidTool?.fluteLength;
          return !!(doc && fluteLen && doc > fluteLen * 1.05);
        },
        action: () => ({ applies: true, severity: 'critical', message: 'DOC exceeds flute length. Tool shank will contact workpiece.' }),
      },
      {
        id: 'SAFETY_003', category: 'safety', severity: 'warning', source: 'empirical', confidence: 0.9,
        condition: (ctx) => !!(ctx.workholding?.thinWalls),
        action: () => ({ applies: true, severity: 'warning', message: 'Thin wall workpiece detected. DOC and WOC reduced 50% for deflection control.' }),
      },
      // Material rules
      {
        id: 'MAT_001', category: 'material', severity: 'warning', source: 'handbook', confidence: 0.95,
        condition: (ctx) => {
          const name = (ctx.material?.name || ctx.material?.family || '').toLowerCase();
          return name.includes('stainless') || name.includes('304') || name.includes('316');
        },
        action: () => ({ applies: true, severity: 'warning', message: 'Stainless steel: maintain chip load to prevent work hardening. Avoid dwelling.' }),
      },
      {
        id: 'MAT_002', category: 'material', severity: 'warning', source: 'handbook', confidence: 0.95,
        condition: (ctx) => {
          const name = (ctx.material?.name || ctx.material?.family || '').toLowerCase();
          return name.includes('titanium') || name.includes('ti-6al-4v') || name.includes('6al4v');
        },
        action: () => ({ applies: true, severity: 'warning', message: 'Titanium: high coolant pressure required. Use AlTiN coating or uncoated carbide.' }),
      },
      {
        id: 'MAT_003', category: 'material', severity: 'info', source: 'empirical', confidence: 0.85,
        condition: (ctx) => {
          const name = (ctx.material?.name || ctx.material?.family || '').toLowerCase();
          return name.includes('inconel') || name.includes('hastelloy');
        },
        action: () => ({ applies: true, severity: 'warning', message: 'Superalloy: ceramic inserts for roughing, carbide for finishing. Aggressive coolant required.' }),
      },
      // Operation rules
      {
        id: 'OP_001', category: 'operation', severity: 'info', source: 'empirical', confidence: 0.9,
        condition: (ctx) => {
          const op = (ctx.operation || '').toLowerCase();
          return op.includes('adaptive') || op.includes('hsm') || op.includes('trochoidal');
        },
        action: () => ({ applies: true, severity: 'info', message: 'HSM/Adaptive: use LOW radial engagement (8-15% of D) with FULL axial depth (100% LOC).' }),
      },
      {
        id: 'OP_002', category: 'operation', severity: 'warning', source: 'handbook', confidence: 0.95,
        condition: (ctx) => {
          const op = (ctx.operation || '').toLowerCase();
          const flutes = ctx.tool?.flutes || 4;
          return (op.includes('slot') || op.includes('plunge')) && flutes > 3;
        },
        action: () => ({ applies: true, severity: 'warning', message: 'Full-width slotting with >3 flutes: chip evacuation limited. Consider 2-3 flute tool or reduced DOC.' }),
      },
      // Tool rules
      {
        id: 'TOOL_001', category: 'tool', severity: 'warning', source: 'empirical', confidence: 0.85,
        condition: (ctx) => {
          const diameter = ctx.tool?.diameter || 12;
          const stickout = ctx.tool?.solidTool?.stickout || ctx.tool?.solidTool?.fluteLength || diameter * 3;
          return stickout / diameter > 4;
        },
        action: (ctx) => {
          const ratio = ((ctx.tool?.solidTool?.stickout || (ctx.tool?.diameter || 12) * 5) / (ctx.tool?.diameter || 12)).toFixed(1);
          return { applies: true, severity: 'warning', message: `Tool L/D ratio ${ratio}:1 exceeds 4:1. Risk of chatter. Reduce DOC or use vibration-damped holder.` };
        },
      },
    ];
  }

  evaluateRules(ctx: CuttingContext, categories?: string[]): Array<{ rule: string; category: string; severity: string; message: string; confidence: number }> {
    const applicable = this.rules.filter(r => {
      if (categories && !categories.includes(r.category)) return false;
      try { return r.condition(ctx); } catch { return false; }
    });
    return applicable.map(r => {
      const result = r.action(ctx);
      return { rule: r.id, category: r.category, severity: result.severity, message: result.message, confidence: r.confidence };
    });
  }

  getRulesByCategory(category: string): Array<{ id: string; category: string; severity: string; source: string; confidence: number }> {
    return this.rules.filter(r => r.category === category).map(r => ({
      id: r.id, category: r.category, severity: r.severity, source: r.source, confidence: r.confidence,
    }));
  }

  searchRules(keyword: string): Array<{ id: string; category: string; severity: string }> {
    const kw = keyword.toLowerCase();
    return this.rules
      .filter(r => r.id.toLowerCase().includes(kw) || r.category.toLowerCase().includes(kw))
      .map(r => ({ id: r.id, category: r.category, severity: r.severity }));
  }

  // ── CONFIDENCE SCORING ─────────────────────────────────────────────────

  calculateConfidence(factors: {
    dataQuality?: number; matchQuality?: number; experienceData?: number;
    constraintsSatisfied?: number; edgeCaseFactor?: number;
  }): ConfidenceResult {
    const { dataQuality = 0.5, matchQuality = 0.5, experienceData = 0.5, constraintsSatisfied = 1.0, edgeCaseFactor = 1.0 } = factors;
    const weights = { dataQuality: 0.25, matchQuality: 0.30, experienceData: 0.15, constraintsSatisfied: 0.20, edgeCaseFactor: 0.10 };

    const score = Math.round((
      dataQuality * weights.dataQuality +
      matchQuality * weights.matchQuality +
      experienceData * weights.experienceData +
      constraintsSatisfied * weights.constraintsSatisfied +
      edgeCaseFactor * weights.edgeCaseFactor
    ) * 100);

    let level: ConfidenceResult['level'] = 'VERY_LOW';
    if (score >= CONFIDENCE_THRESHOLDS.HIGH) level = 'HIGH';
    else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) level = 'MEDIUM';
    else if (score >= CONFIDENCE_THRESHOLDS.LOW) level = 'LOW';

    const recommendations: Record<string, string> = {
      HIGH: 'Proceed with high confidence. Decision is well-supported by data.',
      MEDIUM: 'Proceed with caution. Review parameters before running.',
      LOW: 'User review recommended. Some aspects need verification.',
      VERY_LOW: 'Manual confirmation required. Insufficient data for reliable decision.',
    };

    return { score, level, factors: { dataQuality, matchQuality, experienceData, constraintsSatisfied, edgeCaseFactor }, recommendation: recommendations[level], canProceedAutomatically: score >= CONFIDENCE_THRESHOLDS.MEDIUM };
  }

  assessDataQuality(input: Record<string, any>): { quality: number; missingRequired: string[]; missingOptional: string[] } {
    const requiredFields = ['material', 'operation', 'dimensions'];
    const optionalFields = ['tolerance', 'finish', 'machine', 'tool', 'quantity'];
    let requiredScore = 0, optionalScore = 0;
    for (const f of requiredFields) { if (input[f] != null && input[f] !== '') requiredScore++; }
    for (const f of optionalFields) { if (input[f] != null && input[f] !== '') optionalScore++; }
    return {
      quality: (requiredScore / requiredFields.length) * 0.7 + (optionalScore / optionalFields.length) * 0.3,
      missingRequired: requiredFields.filter(f => !input[f]),
      missingOptional: optionalFields.filter(f => !input[f]),
    };
  }

  // ── PARAMETER CONSTRAINTS (from PRISM_CALCULATOR_CONSTRAINT_ENGINE) ────

  applyAllConstraints(ctx: CuttingContext): ParameterConstraints {
    const constraints: ParameterConstraints = {
      rpm: { min: 0, max: Infinity, limitedBy: [] },
      feed: { min: 0, max: Infinity, limitedBy: [] },
      doc: { min: 0, max: Infinity, limitedBy: [] },
      woc: { min: 0, max: Infinity, limitedBy: [] },
      vc: { min: 0, max: Infinity, limitedBy: [] },
    };

    this.applyMachineConstraints(constraints, ctx.machine);
    this.applyControllerConstraints(constraints, ctx.controller);
    this.applyToolConstraints(constraints, ctx.tool);
    this.applyHolderConstraints(constraints, ctx.holder);
    this.applyWorkholdingConstraints(constraints, ctx.workholding);
    this.applyMaterialConstraints(constraints, ctx.material, ctx.tool);
    this.applyToolpathConstraints(constraints, ctx.toolpath);

    return constraints;
  }

  private applyMachineConstraints(c: ParameterConstraints, machine?: CuttingContext['machine']): void {
    if (!machine) return;
    const spindle = machine.spindle || machine;
    if (spindle.maxRpm) { c.rpm.max = Math.min(c.rpm.max, spindle.maxRpm); c.rpm.limitedBy.push('spindle_max_rpm'); }
    if (spindle.minRpm) { c.rpm.min = Math.max(c.rpm.min, spindle.minRpm); c.rpm.limitedBy.push('spindle_min_rpm'); }
    if (machine.axes) {
      const maxFeed = Math.min(machine.axes.x?.maxFeed || Infinity, machine.axes.y?.maxFeed || Infinity, machine.axes.z?.maxFeed || Infinity);
      c.feed.max = Math.min(c.feed.max, maxFeed); c.feed.limitedBy.push('axis_max_feed');
    } else if (machine.rapids) {
      c.feed.max = Math.min(c.feed.max, machine.rapids.xy || machine.rapids.xyz || 25000); c.feed.limitedBy.push('rapid_limit');
    }
    c.powerLimit = spindle.peakHp || spindle.maxPower || 20;
    c.torqueLimit = spindle.torque || spindle.maxTorque || 100;
    c.machineRigidity = MACHINE_RIGIDITY_MAP[machine.structure?.rigidityClass || machine.rigidityClass || 'medium'] || 1.0;
  }

  private applyControllerConstraints(c: ParameterConstraints, controller?: CuttingContext['controller']): void {
    if (!controller) return;
    if (controller.motion?.lookAhead) c.controllerLookAhead = controller.motion.lookAhead;
    if (controller.motion?.blockProcessingRate) c.blockProcessingRate = controller.motion.blockProcessingRate;
    c.rtcpCapable = controller.compensation?.rtcpCapable || controller.fiveAxis?.tcpc || false;
  }

  private applyToolConstraints(c: ParameterConstraints, tool?: CuttingContext['tool']): void {
    if (!tool) return;
    const diameter = tool.diameter || tool.solidTool?.diameter || tool.indexableTool?.cuttingDiameter || 12;
    c.toolDiameter = diameter;
    if (tool.solidTool?.fluteLength) { c.doc.max = Math.min(c.doc.max, tool.solidTool.fluteLength); c.doc.limitedBy.push('flute_length'); }
    else if (tool.indexableTool?.maxDoc) { c.doc.max = Math.min(c.doc.max, tool.indexableTool.maxDoc); c.doc.limitedBy.push('insert_max_doc'); }
    c.woc.max = Math.min(c.woc.max, diameter); c.woc.limitedBy.push('tool_diameter');
    c.centerCutting = tool.solidTool?.centerCutting !== false;
  }

  private applyHolderConstraints(c: ParameterConstraints, holder?: CuttingContext['holder']): void {
    if (!holder) return;
    if (holder.maxRpm) { c.rpm.max = Math.min(c.rpm.max, holder.maxRpm); c.rpm.limitedBy.push('holder_max_rpm'); }
    c.holderRigidity = holder.rigidityFactor || holder.rigidity || 1.0;
    c.holderDamping = holder.damping || 1.0;
    c.holderRunout = holder.runout || 0.003;
  }

  private applyWorkholdingConstraints(c: ParameterConstraints, workholding?: CuttingContext['workholding']): void {
    if (!workholding) return;
    c.workholdingRigidity = 1.0;
    c.workholdingDamping = 1.0;
    if (workholding.thinWalls) {
      c.thinWallMode = true;
      c.doc.max *= 0.5; c.woc.max *= 0.5;
      c.doc.limitedBy.push('thin_wall'); c.woc.limitedBy.push('thin_wall');
    }
  }

  private applyMaterialConstraints(c: ParameterConstraints, material?: CuttingContext['material'], tool?: CuttingContext['tool']): void {
    if (!material) return;
    c.materialKc = material.Kc11 || material.Kc || 1800;
    c.materialMc = material.mc || 0.25;
  }

  private applyToolpathConstraints(c: ParameterConstraints, toolpath?: CuttingContext['toolpath']): void {
    if (!toolpath) return;
    if (toolpath.maxRadialEngagement && c.toolDiameter) {
      c.woc.max = Math.min(c.woc.max, toolpath.maxRadialEngagement * c.toolDiameter);
      c.woc.limitedBy.push('strategy_engagement_limit');
    }
    if (toolpath.maxAxialEngagement) {
      c.doc.max = Math.min(c.doc.max, toolpath.maxAxialEngagement);
      c.doc.limitedBy.push('strategy_axial_limit');
    }
  }

  getCompositeRigidity(c: ParameterConstraints): number {
    return Math.pow((c.machineRigidity || 1.0) * (c.holderRigidity || 1.0) * (c.workholdingRigidity || 1.0), 1 / 3);
  }

  // ── CUTTING PARAMETER RULES (from PRISM_INTELLIGENT_CUTTING_PARAM_ENGINE) ─

  getOptimalEngagement(ctx: CuttingContext): {
    woc: { value_mm: number; percent_of_diameter: number; range: { min: number; max: number } };
    doc: { value_mm: number; percent_of_loc: number; uses_full_loc: boolean; range: { min: number; max: number } };
    vendor?: { sfm: { min: number; recommended: number; max: number }; ipt: { min: number; recommended: number; max: number }; notes: string };
    confidence: ConfidenceResult;
  } {
    const op = (ctx.operation || 'default').toLowerCase().replace(/[\s-]/g, '_');
    const diameter = ctx.tool?.diameter || 12;
    const loc = ctx.tool?.solidTool?.fluteLength || diameter * 2;
    const materialName = (ctx.material?.name || ctx.material?.family || 'default').toLowerCase().replace(/[\s-]/g, '_');
    const toolType = (ctx.tool?.type || 'endmill').toLowerCase().replace(/[\s-]/g, '_');
    const flutes = ctx.tool?.flutes || 4;
    const rigidity = (ctx.machine?.rigidityClass || ctx.machine?.structure?.rigidityClass || 'rigid').toLowerCase().replace(/[\s-]/g, '_');

    // WOC calculation
    const wocConfig = WOC_DEFAULTS[op] || WOC_DEFAULTS.default;
    let wocMult = wocConfig.optimal;
    const matFactor = MATERIAL_FACTORS[materialName] || MATERIAL_FACTORS.mild_steel || { wocFactor: 1.0, docFactor: 1.0 };
    const toolFactor = TOOL_TYPE_FACTORS[toolType] || TOOL_TYPE_FACTORS.endmill || { wocMult: 1.0, docMult: 1.0 };
    const fluteFactor = FLUTE_FACTORS[flutes] || FLUTE_FACTORS[4] || { wocMult: 1.0, docMult: 1.0 };
    const rigFactor = RIGIDITY_FACTORS[rigidity] || RIGIDITY_FACTORS.rigid || { wocMult: 1.0, docMult: 1.0 };

    wocMult *= matFactor.wocFactor * toolFactor.wocMult * fluteFactor.wocMult * rigFactor.wocMult;
    const wocMm = Math.max(0.05, Math.min(diameter, wocMult * diameter));

    // DOC calculation
    const docConfig = DOC_DEFAULTS[op] || DOC_DEFAULTS.default;
    let docMm: number;
    if (docConfig.prioritizeLoc) {
      docMm = loc * docConfig.optimal * matFactor.docFactor * toolFactor.docMult * fluteFactor.docMult * rigFactor.docMult;
      docMm = Math.min(docMm, loc * (matFactor.maxLocMult || 1.0));
    } else if (docConfig.base === 'diameter') {
      docMm = diameter * docConfig.optimal * matFactor.docFactor * toolFactor.docMult;
    } else {
      docMm = docConfig.optimal * matFactor.docFactor;
    }
    docMm = Math.max(0.02, docMm);

    // Vendor recommendation
    const vendorKey = Object.keys(VENDOR_RECOMMENDATIONS).find(k => materialName.includes(k));
    const vendor = vendorKey ? VENDOR_RECOMMENDATIONS[vendorKey] : undefined;

    // Confidence
    const confidence = this.calculateConfidence({
      dataQuality: ctx.material?.name ? 0.8 : 0.4,
      matchQuality: vendor ? 0.9 : 0.6,
      experienceData: 0.7,
      constraintsSatisfied: 0.9,
      edgeCaseFactor: ctx.workholding?.thinWalls ? 0.6 : 1.0,
    });

    return {
      woc: { value_mm: Math.round(wocMm * 1000) / 1000, percent_of_diameter: Math.round(wocMm / diameter * 1000) / 10, range: { min: wocConfig.min * diameter, max: wocConfig.max * diameter } },
      doc: { value_mm: Math.round(docMm * 1000) / 1000, percent_of_loc: Math.round(docMm / loc * 1000) / 10, uses_full_loc: docConfig.prioritizeLoc, range: { min: docConfig.min * (docConfig.prioritizeLoc ? loc : diameter), max: docConfig.max * (docConfig.prioritizeLoc ? loc : diameter) } },
      vendor: vendor ? { sfm: vendor.sfm, ipt: vendor.ipt, notes: vendor.notes } : undefined,
      confidence,
    };
  }

  // ── REASONING CHAIN ────────────────────────────────────────────────────

  createReasoningChain(decision: string): ReasoningChain {
    return { decision, timestamp: new Date().toISOString(), steps: [], conclusion: null, alternativesConsidered: [], confidence: null };
  }

  addReasoningStep(chain: ReasoningChain, action: string, reason: string, data?: any): ReasoningChain {
    chain.steps.push({ id: chain.steps.length + 1, action, reason, data, timestamp: new Date().toISOString() });
    return chain;
  }

  explainReasoning(chain: ReasoningChain): string {
    let out = `DECISION: ${chain.decision}\n\nREASONING STEPS:\n`;
    for (const s of chain.steps) {
      out += `${s.id}. ${s.action}\n   Because: ${s.reason}\n`;
      if (s.data) out += `   Data: ${JSON.stringify(s.data)}\n`;
      out += '\n';
    }
    if (chain.alternativesConsidered.length > 0) {
      out += 'ALTERNATIVES CONSIDERED:\n';
      for (const a of chain.alternativesConsidered) out += `- ${a.name}: ${a.rejectionReason}\n`;
      out += '\n';
    }
    out += `CONCLUSION: ${chain.conclusion}\nCONFIDENCE: ${chain.confidence}%\n`;
    return out;
  }

  // ── STATIC DATA ACCESSORS ─────────────────────────────────────────────

  getMaterialFactors(): Record<string, any> { return { ...MATERIAL_FACTORS }; }
  getWocDefaults(): Record<string, any> { return { ...WOC_DEFAULTS }; }
  getDocDefaults(): Record<string, any> { return { ...DOC_DEFAULTS }; }
  getVendorRecommendations(): Record<string, any> { return { ...VENDOR_RECOMMENDATIONS }; }
  getToolTypeFactors(): Record<string, any> { return { ...TOOL_TYPE_FACTORS }; }
  getRuleCount(): number { return this.rules.length; }
  getRuleCategories(): string[] { return [...new Set(this.rules.map(r => r.category))]; }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const rulesEngine = new RulesEngine();

// ── ACTION DISPATCHER (for MCP wiring) ─────────────────────────────────────

export function executeRulesAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case 'evaluate_rules': {
      const ctx: CuttingContext = {
        material: params.material,
        tool: params.tool,
        machine: params.machine,
        controller: params.controller,
        holder: params.holder,
        workholding: params.workholding,
        toolpath: params.toolpath,
        operation: params.operation,
        dimensions: params.dimensions,
        tolerance: params.tolerance,
        finish: params.finish,
        quantity: params.quantity,
      };
      const categories = params.categories as string[] | undefined;
      const results = rulesEngine.evaluateRules(ctx, categories);
      const confidence = rulesEngine.calculateConfidence({
        dataQuality: rulesEngine.assessDataQuality(params).quality,
        matchQuality: results.length > 0 ? 0.8 : 0.5,
        experienceData: 0.7,
        constraintsSatisfied: results.filter(r => r.severity === 'critical').length === 0 ? 1.0 : 0.5,
        edgeCaseFactor: params.workholding?.thinWalls ? 0.6 : 1.0,
      });
      return {
        rules_evaluated: rulesEngine.getRuleCount(),
        results,
        triggered: results.length,
        critical: results.filter(r => r.severity === 'critical').length,
        warnings: results.filter(r => r.severity === 'warning').length,
        info: results.filter(r => r.severity === 'info').length,
        confidence,
        categories_available: rulesEngine.getRuleCategories(),
      };
    }

    case 'rule_search': {
      const keyword = params.keyword || params.query || params.search || '';
      const category = params.category;
      if (category) {
        return { results: rulesEngine.getRulesByCategory(category), total: rulesEngine.getRulesByCategory(category).length, search_type: 'category' };
      }
      const results = rulesEngine.searchRules(keyword);
      return { results, total: results.length, keyword, search_type: 'keyword' };
    }

    case 'evaluate_machining_rules': {
      const ctx: CuttingContext = {
        material: params.material,
        tool: params.tool,
        machine: params.machine,
        operation: params.operation,
        workholding: params.workholding,
      };
      const engagement = rulesEngine.getOptimalEngagement(ctx);
      const rules = rulesEngine.evaluateRules(ctx, ['safety', 'material', 'operation', 'tool']);
      const chain = rulesEngine.createReasoningChain(`Machining rules for ${params.operation || 'unknown'} on ${params.material?.name || 'unknown material'}`);
      rulesEngine.addReasoningStep(chain, 'Evaluate safety rules', `${rules.filter(r => r.severity === 'critical').length} critical, ${rules.filter(r => r.severity === 'warning').length} warnings`);
      rulesEngine.addReasoningStep(chain, 'Calculate optimal engagement', `WOC=${engagement.woc.value_mm}mm (${engagement.woc.percent_of_diameter}% D), DOC=${engagement.doc.value_mm}mm`);
      if (engagement.vendor) {
        rulesEngine.addReasoningStep(chain, 'Apply vendor data', engagement.vendor.notes);
      }
      chain.conclusion = `${rules.filter(r => r.severity === 'critical').length === 0 ? 'Safe to proceed' : 'Critical issues found'} — confidence ${engagement.confidence.level}`;
      chain.confidence = engagement.confidence.score;
      return {
        engagement,
        rules_triggered: rules,
        reasoning: rulesEngine.explainReasoning(chain),
        material_factors: params.material?.name ? MATERIAL_FACTORS[(params.material.name || '').toLowerCase().replace(/[\s-]/g, '_')] : null,
      };
    }

    case 'get_parameter_constraints': {
      const ctx: CuttingContext = {
        material: params.material,
        tool: params.tool,
        machine: params.machine,
        controller: params.controller,
        holder: params.holder,
        workholding: params.workholding,
        toolpath: params.toolpath,
      };
      const constraints = rulesEngine.applyAllConstraints(ctx);
      const compositeRigidity = rulesEngine.getCompositeRigidity(constraints);
      return {
        constraints,
        composite_rigidity: Math.round(compositeRigidity * 1000) / 1000,
        constraint_sources: {
          machine: !!params.machine,
          controller: !!params.controller,
          tool: !!params.tool,
          holder: !!params.holder,
          workholding: !!params.workholding,
          material: !!params.material,
          toolpath: !!params.toolpath,
        },
        active_sources: Object.entries({
          machine: !!params.machine, controller: !!params.controller, tool: !!params.tool,
          holder: !!params.holder, workholding: !!params.workholding, material: !!params.material, toolpath: !!params.toolpath,
        }).filter(([, v]) => v).map(([k]) => k),
        feasible: constraints.rpm.min < constraints.rpm.max && constraints.feed.min < constraints.feed.max && constraints.doc.min < constraints.doc.max,
      };
    }

    default:
      throw new Error(`Unknown rules action: ${action}`);
  }
}
