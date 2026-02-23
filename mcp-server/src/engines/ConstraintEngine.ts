/**
 * ConstraintEngine.ts — R13-MS5: Constraint Engine Extraction
 *
 * Extracted from monolith modules:
 *   - PRISM_CALCULATOR_CONSTRAINT_ENGINE.js (7-source parameter constraints)
 *   - PRISM_PARAMETRIC_CONSTRAINT_SOLVER.js (parametric solving concepts)
 *
 * New MCP actions: apply_constraints, check_feasibility
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface ConstraintRange {
  min: number;
  max: number;
  limitedBy: string[];
}

export interface ParameterConstraints {
  rpm: ConstraintRange;
  feed: ConstraintRange;
  doc: ConstraintRange;
  woc: ConstraintRange;
  vc: ConstraintRange;
  // Metadata from constraint sources
  powerLimit?: number;
  torqueLimit?: number;
  machineRigidity?: number;
  holderRigidity?: number;
  holderRunout?: number;
  holderDamping?: number;
  workholdingRigidity?: number;
  workholdingDamping?: number;
  toolDiameter?: number;
  centerCutting?: boolean;
  thinWallMode?: boolean;
  materialKc?: number;
  materialMc?: number;
  vcRange?: { min: number; max: number };
  fzRange?: { min: number; max: number };
  controllerLookAhead?: number;
  blockProcessingRate?: number;
  rtcpCapable?: boolean;
  strategyModifiers?: Record<string, number>;
  engagementType?: string;
  compositeRigidity?: number;
  activeSources: string[];
}

export interface MachineSpec {
  spindle?: { maxRpm?: number; minRpm?: number; peakHp?: number; maxPower?: number; torque?: number; maxTorque?: number };
  maxRpm?: number; minRpm?: number;
  axes?: { x?: { maxFeed?: number }; y?: { maxFeed?: number }; z?: { maxFeed?: number } };
  rapids?: { xy?: number; xyz?: number };
  structure?: { rigidityClass?: string };
  rigidityClass?: string;
}

export interface ToolSpec {
  diameter?: number;
  material?: string;
  solidTool?: { diameter?: number; fluteLength?: number; material?: string; centerCutting?: boolean };
  indexableTool?: { cuttingDiameter?: number; maxDoc?: number };
}

export interface HolderSpec {
  maxRpm?: number;
  rigidityFactor?: number;
  rigidity?: number;
  damping?: number;
  runout?: number;
}

export interface WorkholdingSpec {
  rigidity?: number;
  damping?: number;
  thinWalls?: boolean;
}

export interface ControllerSpec {
  motion?: { lookAhead?: number; blockProcessingRate?: number };
  compensation?: { rtcpCapable?: boolean };
  fiveAxis?: { tcpc?: boolean };
}

export interface MaterialSpec {
  id?: string;
  Kc11?: number; Kc?: number;
  mc?: number;
  cuttingParams?: Record<string, { vc?: { min: number; max: number }; fz?: { min: number; max: number } }>;
}

export interface ToolpathSpec {
  maxRadialEngagement?: number;
  maxAxialEngagement?: number;
  camSystem?: string;
  strategyName?: string;
}

export interface ConstraintInputs {
  machine?: MachineSpec;
  controller?: ControllerSpec;
  tool?: ToolSpec;
  holder?: HolderSpec;
  workholding?: WorkholdingSpec;
  material?: MaterialSpec;
  toolpath?: ToolpathSpec;
}

export interface FeasibilityResult {
  feasible: boolean;
  rpm: ConstraintRange;
  feed: ConstraintRange;
  doc: ConstraintRange;
  woc: ConstraintRange;
  compositeRigidity: number;
  activeSources: string[];
  violations: Array<{ parameter: string; message: string; source: string }>;
  recommendations: string[];
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const RIGIDITY_MAP: Record<string, number> = {
  light: 0.75,
  medium: 1.0,
  heavy: 1.15,
  'ultra-rigid': 1.30,
  ultra_heavy: 1.30,
};

// ─── CONSTRAINT ENGINE ──────────────────────────────────────────────────────

export class ConstraintEngine {

  /** Apply all 7 constraint sources and return valid parameter ranges */
  applyAllConstraints(inputs: ConstraintInputs): ParameterConstraints {
    const c: ParameterConstraints = {
      rpm: { min: 0, max: Infinity, limitedBy: [] },
      feed: { min: 0, max: Infinity, limitedBy: [] },
      doc: { min: 0, max: Infinity, limitedBy: [] },
      woc: { min: 0, max: Infinity, limitedBy: [] },
      vc: { min: 0, max: Infinity, limitedBy: [] },
      activeSources: [],
    };

    if (inputs.machine) { this.applyMachine(c, inputs.machine); c.activeSources.push('machine'); }
    if (inputs.controller) { this.applyController(c, inputs.controller); c.activeSources.push('controller'); }
    if (inputs.tool) { this.applyTool(c, inputs.tool); c.activeSources.push('tool'); }
    if (inputs.holder) { this.applyHolder(c, inputs.holder); c.activeSources.push('holder'); }
    if (inputs.workholding) { this.applyWorkholding(c, inputs.workholding); c.activeSources.push('workholding'); }
    if (inputs.material) { this.applyMaterial(c, inputs.material, inputs.tool); c.activeSources.push('material'); }
    if (inputs.toolpath) { this.applyToolpath(c, inputs.toolpath); c.activeSources.push('toolpath'); }

    c.compositeRigidity = this.getCompositeRigidity(c);
    return c;
  }

  // ── SOURCE 1: MACHINE ────────────────────────────────────────────

  private applyMachine(c: ParameterConstraints, machine: MachineSpec): void {
    const spindle = machine.spindle || machine as any;

    if (spindle.maxRpm || spindle.maxRPM) {
      c.rpm.max = Math.min(c.rpm.max, spindle.maxRpm || spindle.maxRPM);
      c.rpm.limitedBy.push('spindle_max_rpm');
    }
    if (spindle.minRpm || spindle.minRPM) {
      c.rpm.min = Math.max(c.rpm.min, spindle.minRpm || spindle.minRPM);
      c.rpm.limitedBy.push('spindle_min_rpm');
    }

    // Feed from axes
    if (machine.axes) {
      const maxAxisFeed = Math.min(
        machine.axes.x?.maxFeed || Infinity,
        machine.axes.y?.maxFeed || Infinity,
        machine.axes.z?.maxFeed || Infinity,
      );
      if (maxAxisFeed < Infinity) {
        c.feed.max = Math.min(c.feed.max, maxAxisFeed);
        c.feed.limitedBy.push('axis_max_feed');
      }
    } else if (machine.rapids) {
      c.feed.max = Math.min(c.feed.max, machine.rapids.xy || machine.rapids.xyz || 25000);
      c.feed.limitedBy.push('rapid_limit');
    }

    c.powerLimit = spindle.peakHp || spindle.maxPower || 20;
    c.torqueLimit = spindle.torque || spindle.maxTorque || 100;
    c.machineRigidity = RIGIDITY_MAP[machine.structure?.rigidityClass || machine.rigidityClass || 'medium'] || 1.0;
  }

  // ── SOURCE 2: CONTROLLER ─────────────────────────────────────────

  private applyController(c: ParameterConstraints, ctrl: ControllerSpec): void {
    if (ctrl.motion?.lookAhead) c.controllerLookAhead = ctrl.motion.lookAhead;
    if (ctrl.motion?.blockProcessingRate) c.blockProcessingRate = ctrl.motion.blockProcessingRate;
    c.rtcpCapable = ctrl.compensation?.rtcpCapable || ctrl.fiveAxis?.tcpc || false;
  }

  // ── SOURCE 3: TOOL ──────────────────────────────────────────────

  private applyTool(c: ParameterConstraints, tool: ToolSpec): void {
    const diameter = tool.diameter || tool.solidTool?.diameter || tool.indexableTool?.cuttingDiameter || 12;
    c.toolDiameter = diameter;

    if (tool.solidTool?.fluteLength) {
      c.doc.max = Math.min(c.doc.max, tool.solidTool.fluteLength);
      c.doc.limitedBy.push('flute_length');
    } else if (tool.indexableTool?.maxDoc) {
      c.doc.max = Math.min(c.doc.max, tool.indexableTool.maxDoc);
      c.doc.limitedBy.push('insert_max_doc');
    }

    c.woc.max = Math.min(c.woc.max, diameter);
    c.woc.limitedBy.push('tool_diameter');
    c.centerCutting = tool.solidTool?.centerCutting !== false;
  }

  // ── SOURCE 4: HOLDER ─────────────────────────────────────────────

  private applyHolder(c: ParameterConstraints, holder: HolderSpec): void {
    if (holder.maxRpm) {
      c.rpm.max = Math.min(c.rpm.max, holder.maxRpm);
      c.rpm.limitedBy.push('holder_max_rpm');
    }
    c.holderRigidity = holder.rigidityFactor || holder.rigidity || 1.0;
    c.holderDamping = holder.damping || 1.0;
    c.holderRunout = holder.runout || 0.003;
  }

  // ── SOURCE 5: WORKHOLDING ────────────────────────────────────────

  private applyWorkholding(c: ParameterConstraints, wh: WorkholdingSpec): void {
    c.workholdingRigidity = wh.rigidity || 1.0;
    c.workholdingDamping = wh.damping || 1.0;

    if (wh.thinWalls) {
      c.thinWallMode = true;
      c.doc.max *= 0.5;
      c.woc.max *= 0.5;
      c.doc.limitedBy.push('thin_wall');
      c.woc.limitedBy.push('thin_wall');
    }
  }

  // ── SOURCE 6: MATERIAL ──────────────────────────────────────────

  private applyMaterial(c: ParameterConstraints, material: MaterialSpec, tool?: ToolSpec): void {
    const toolMat = tool?.solidTool?.material || tool?.material || 'carbide';

    if (material.cuttingParams?.[toolMat]) {
      const params = material.cuttingParams[toolMat];
      if (params.vc) c.vcRange = { min: params.vc.min || 50, max: params.vc.max || 300 };
      if (params.fz) c.fzRange = { min: params.fz.min || 0.03, max: params.fz.max || 0.3 };
    }

    c.materialKc = material.Kc11 || material.Kc || 1800;
    c.materialMc = material.mc || 0.25;
  }

  // ── SOURCE 7: TOOLPATH ──────────────────────────────────────────

  private applyToolpath(c: ParameterConstraints, tp: ToolpathSpec): void {
    if (tp.maxRadialEngagement && c.toolDiameter) {
      c.woc.max = Math.min(c.woc.max, tp.maxRadialEngagement * c.toolDiameter);
      c.woc.limitedBy.push('strategy_radial_limit');
    }
    if (tp.maxAxialEngagement) {
      c.doc.max = Math.min(c.doc.max, tp.maxAxialEngagement);
      c.doc.limitedBy.push('strategy_axial_limit');
    }
  }

  // ── COMPOSITE RIGIDITY ──────────────────────────────────────────

  /** Geometric mean of machine, holder, and workholding rigidity */
  getCompositeRigidity(c: ParameterConstraints): number {
    const m = c.machineRigidity || 1.0;
    const h = c.holderRigidity || 1.0;
    const w = c.workholdingRigidity || 1.0;
    return Math.round(Math.pow(m * h * w, 1 / 3) * 1000) / 1000;
  }

  // ── FEASIBILITY CHECK ───────────────────────────────────────────

  /** Check if proposed parameters are feasible within constraints */
  checkFeasibility(
    proposed: { rpm?: number; feed?: number; doc?: number; woc?: number },
    inputs: ConstraintInputs
  ): FeasibilityResult {
    const c = this.applyAllConstraints(inputs);
    const violations: Array<{ parameter: string; message: string; source: string }> = [];
    const recommendations: string[] = [];

    // Check each proposed parameter
    if (proposed.rpm != null) {
      if (proposed.rpm > c.rpm.max) violations.push({ parameter: 'rpm', message: `RPM ${proposed.rpm} exceeds max ${c.rpm.max}`, source: c.rpm.limitedBy.join(', ') });
      if (proposed.rpm < c.rpm.min) violations.push({ parameter: 'rpm', message: `RPM ${proposed.rpm} below min ${c.rpm.min}`, source: c.rpm.limitedBy.join(', ') });
    }
    if (proposed.feed != null) {
      if (proposed.feed > c.feed.max) violations.push({ parameter: 'feed', message: `Feed ${proposed.feed} exceeds max ${c.feed.max}`, source: c.feed.limitedBy.join(', ') });
    }
    if (proposed.doc != null) {
      if (proposed.doc > c.doc.max) violations.push({ parameter: 'doc', message: `DOC ${proposed.doc} exceeds max ${c.doc.max}`, source: c.doc.limitedBy.join(', ') });
    }
    if (proposed.woc != null) {
      if (proposed.woc > c.woc.max) violations.push({ parameter: 'woc', message: `WOC ${proposed.woc} exceeds max ${c.woc.max}`, source: c.woc.limitedBy.join(', ') });
    }

    // Power check
    if (proposed.rpm && proposed.feed && c.materialKc && c.toolDiameter) {
      const fz = proposed.feed / (proposed.rpm * 4); // Approximate 4 flutes
      const ap = proposed.doc || 1;
      const ae = proposed.woc || c.toolDiameter * 0.5;
      const kc = c.materialKc * Math.pow(fz > 0 ? fz : 0.1, -(c.materialMc || 0.25));
      const Fc = kc * ap * ae * fz / 1000;
      const Vc = Math.PI * c.toolDiameter * proposed.rpm / 60000;
      const power_kW = Fc * Vc;
      const power_hp = power_kW / 0.746;

      if (c.powerLimit && power_hp > c.powerLimit) {
        violations.push({ parameter: 'power', message: `Estimated power ${power_hp.toFixed(1)} HP exceeds limit ${c.powerLimit} HP`, source: 'spindle_power' });
        recommendations.push('Reduce RPM, feed, or depth of cut to lower power demand');
      }
    }

    // Rigidity-based recommendations
    if (c.compositeRigidity && c.compositeRigidity < 0.8) {
      recommendations.push(`Low composite rigidity (${c.compositeRigidity}) — reduce DOC and WOC by ${Math.round((1 - c.compositeRigidity) * 100)}%`);
    }
    if (c.thinWallMode) recommendations.push('Thin wall mode active — DOC and WOC reduced 50%');
    if (c.holderRunout && c.holderRunout > 0.005) recommendations.push(`Holder runout ${c.holderRunout}mm exceeds 0.005mm — consider precision holder`);

    // Clamp ranges for display
    const clampRange = (r: ConstraintRange): ConstraintRange => ({
      min: r.min, max: r.max === Infinity ? -1 : r.max, limitedBy: r.limitedBy,
    });

    return {
      feasible: violations.length === 0,
      rpm: clampRange(c.rpm),
      feed: clampRange(c.feed),
      doc: clampRange(c.doc),
      woc: clampRange(c.woc),
      compositeRigidity: c.compositeRigidity || 1.0,
      activeSources: c.activeSources,
      violations,
      recommendations,
    };
  }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const constraintEngine = new ConstraintEngine();

// ── ACTION DISPATCHER (for MCP wiring) ─────────────────────────────────────

export function executeConstraintAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case 'apply_constraints': {
      const inputs: ConstraintInputs = {
        machine: params.machine,
        controller: params.controller,
        tool: params.tool,
        holder: params.holder,
        workholding: params.workholding,
        material: params.material,
        toolpath: params.toolpath,
      };
      const c = constraintEngine.applyAllConstraints(inputs);
      return {
        rpm: { min: c.rpm.min, max: c.rpm.max === Infinity ? null : c.rpm.max, limitedBy: c.rpm.limitedBy },
        feed: { min: c.feed.min, max: c.feed.max === Infinity ? null : c.feed.max, limitedBy: c.feed.limitedBy },
        doc: { min: c.doc.min, max: c.doc.max === Infinity ? null : c.doc.max, limitedBy: c.doc.limitedBy },
        woc: { min: c.woc.min, max: c.woc.max === Infinity ? null : c.woc.max, limitedBy: c.woc.limitedBy },
        compositeRigidity: c.compositeRigidity,
        activeSources: c.activeSources,
        toolDiameter: c.toolDiameter,
        powerLimit: c.powerLimit,
        torqueLimit: c.torqueLimit,
        thinWallMode: c.thinWallMode || false,
      };
    }

    case 'check_feasibility': {
      const proposed = params.proposed || { rpm: params.rpm, feed: params.feed, doc: params.doc, woc: params.woc };
      const inputs: ConstraintInputs = {
        machine: params.machine,
        controller: params.controller,
        tool: params.tool,
        holder: params.holder,
        workholding: params.workholding,
        material: params.material,
        toolpath: params.toolpath,
      };
      return constraintEngine.checkFeasibility(proposed, inputs);
    }

    default:
      throw new Error(`Unknown constraint action: ${action}`);
  }
}
