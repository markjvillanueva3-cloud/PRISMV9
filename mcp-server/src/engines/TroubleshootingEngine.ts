/**
 * TroubleshootingEngine — Manufacturing Intelligence Layer
 *
 * Diagnoses manufacturing problems from symptoms using rule-based
 * reasoning and fault tree analysis. Composes InverseSolverEngine + ForensicEngine.
 *
 * Actions: troubleshoot_diagnose, troubleshoot_root_cause, troubleshoot_corrective_action
 */

// ============================================================================
// TYPES
// ============================================================================

export type Symptom =
  | "chatter_marks" | "poor_surface_finish" | "dimensional_error"
  | "tool_breakage" | "excessive_wear" | "burrs"
  | "built_up_edge" | "chip_welding" | "vibration"
  | "thermal_damage" | "workpiece_movement" | "taper_error"
  | "roundness_error" | "thread_failure" | "drill_wandering";

export interface DiagnosisInput {
  symptoms: Symptom[];
  operation_type: string;
  material_iso_group: string;
  tool_type?: string;
  spindle_rpm?: number;
  feed_rate_mmmin?: number;
  depth_of_cut_mm?: number;
  coolant_active?: boolean;
  tool_age_min?: number;
}

export interface Diagnosis {
  primary_cause: string;
  confidence: number;                // 0–100
  all_causes: RankedCause[];
  corrective_actions: CorrectiveAction[];
  related_symptoms: Symptom[];
}

export interface RankedCause {
  cause: string;
  probability: number;               // 0–1.0
  category: "tooling" | "parameters" | "fixturing" | "machine" | "material" | "coolant";
  evidence: string[];
}

export interface CorrectiveAction {
  action: string;
  priority: "immediate" | "short_term" | "long_term";
  expected_improvement: string;
  estimated_time_min: number;
}

export interface RootCauseAnalysis {
  symptom_chain: string[];
  root_cause: string;
  contributing_factors: string[];
  fishbone: Record<string, string[]>;  // Ishikawa diagram categories
}

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

interface FaultRule {
  symptoms: Symptom[];
  cause: string;
  category: RankedCause["category"];
  conditions: (input: DiagnosisInput) => boolean;
  probability: number;
  actions: CorrectiveAction[];
}

const FAULT_RULES: FaultRule[] = [
  {
    symptoms: ["chatter_marks", "vibration"],
    cause: "Regenerative chatter — spindle speed in unstable lobe",
    category: "parameters",
    conditions: () => true,
    probability: 0.85,
    actions: [
      { action: "Change spindle RPM by ±10% to move out of chatter lobe", priority: "immediate", expected_improvement: "Eliminates chatter", estimated_time_min: 2 },
      { action: "Reduce depth of cut by 30%", priority: "immediate", expected_improvement: "Reduces cutting force below stability limit", estimated_time_min: 2 },
      { action: "Use variable-helix or variable-pitch end mill", priority: "short_term", expected_improvement: "Disrupts regenerative wave", estimated_time_min: 10 },
    ],
  },
  {
    symptoms: ["poor_surface_finish"],
    cause: "Feed rate too high for finishing operation",
    category: "parameters",
    conditions: (i) => (i.feed_rate_mmmin || 0) > 500,
    probability: 0.70,
    actions: [
      { action: "Reduce feed rate by 40-50%", priority: "immediate", expected_improvement: "Ra improvement 2-4x", estimated_time_min: 2 },
      { action: "Add spring pass (zero-depth finishing pass)", priority: "short_term", expected_improvement: "Removes deflection error", estimated_time_min: 5 },
    ],
  },
  {
    symptoms: ["poor_surface_finish", "built_up_edge"],
    cause: "Built-up edge from low cutting speed",
    category: "parameters",
    conditions: (i) => i.material_iso_group === "P" || i.material_iso_group === "M",
    probability: 0.75,
    actions: [
      { action: "Increase cutting speed by 20-30%", priority: "immediate", expected_improvement: "BUE elimination", estimated_time_min: 2 },
      { action: "Switch to coated insert (TiAlN or AlCrN)", priority: "short_term", expected_improvement: "Reduced adhesion tendency", estimated_time_min: 10 },
    ],
  },
  {
    symptoms: ["tool_breakage"],
    cause: "Excessive cutting force — depth of cut or feed too high",
    category: "parameters",
    conditions: (i) => (i.depth_of_cut_mm || 0) > 5,
    probability: 0.65,
    actions: [
      { action: "Reduce depth of cut by 50%", priority: "immediate", expected_improvement: "Prevents catastrophic failure", estimated_time_min: 2 },
      { action: "Verify tool engagement before cutting — check for air cuts first", priority: "immediate", expected_improvement: "Safety verification", estimated_time_min: 5 },
      { action: "Upgrade to higher toughness grade insert", priority: "short_term", expected_improvement: "Increased breakage resistance", estimated_time_min: 10 },
    ],
  },
  {
    symptoms: ["tool_breakage", "chip_welding"],
    cause: "Chip evacuation failure — recutting chips causing overload",
    category: "coolant",
    conditions: (i) => !i.coolant_active,
    probability: 0.70,
    actions: [
      { action: "Enable through-spindle coolant or air blast", priority: "immediate", expected_improvement: "Chip evacuation restored", estimated_time_min: 5 },
      { action: "Reduce depth of cut to create smaller chips", priority: "immediate", expected_improvement: "Chips can escape flute", estimated_time_min: 2 },
    ],
  },
  {
    symptoms: ["excessive_wear"],
    cause: "Cutting speed too high for tool grade / material combination",
    category: "tooling",
    conditions: () => true,
    probability: 0.75,
    actions: [
      { action: "Reduce cutting speed by 15-20%", priority: "immediate", expected_improvement: "Tool life increase 2-3x (Taylor equation)", estimated_time_min: 2 },
      { action: "Switch to more wear-resistant coating (TiAlN or AlCrN)", priority: "short_term", expected_improvement: "Tool life increase 1.5-2x", estimated_time_min: 10 },
    ],
  },
  {
    symptoms: ["dimensional_error", "taper_error"],
    cause: "Tool deflection under cutting load",
    category: "tooling",
    conditions: () => true,
    probability: 0.70,
    actions: [
      { action: "Use larger diameter tool or shorter overhang", priority: "short_term", expected_improvement: "Deflection ∝ L³/D⁴ — dramatic improvement", estimated_time_min: 10 },
      { action: "Reduce radial depth of cut", priority: "immediate", expected_improvement: "Linear force reduction", estimated_time_min: 2 },
      { action: "Add finishing pass with light cut", priority: "immediate", expected_improvement: "Removes deflection error from roughing", estimated_time_min: 5 },
    ],
  },
  {
    symptoms: ["workpiece_movement"],
    cause: "Insufficient clamping force for cutting loads",
    category: "fixturing",
    conditions: () => true,
    probability: 0.80,
    actions: [
      { action: "STOP MACHINE — verify clamping before continuing (SAFETY)", priority: "immediate", expected_improvement: "Prevents part ejection / injury", estimated_time_min: 10 },
      { action: "Increase clamping force or add additional clamp points", priority: "immediate", expected_improvement: "Prevents workpiece shift", estimated_time_min: 15 },
      { action: "Reduce cutting forces — lower depth of cut and feed", priority: "immediate", expected_improvement: "Reduces force on fixture", estimated_time_min: 2 },
    ],
  },
  {
    symptoms: ["thermal_damage"],
    cause: "Excessive heat generation — insufficient cooling",
    category: "coolant",
    conditions: (i) => i.material_iso_group === "S" || i.material_iso_group === "H",
    probability: 0.80,
    actions: [
      { action: "Enable high-pressure through-spindle coolant", priority: "immediate", expected_improvement: "Dramatically reduces cutting temperature", estimated_time_min: 5 },
      { action: "Reduce cutting speed by 20%", priority: "immediate", expected_improvement: "Lower heat generation", estimated_time_min: 2 },
      { action: "Use ceramic or CBN tooling rated for high temperature", priority: "short_term", expected_improvement: "Thermal stability at cutting zone", estimated_time_min: 10 },
    ],
  },
  {
    symptoms: ["burrs"],
    cause: "Dull tool or excessive feed at exit edge",
    category: "tooling",
    conditions: (i) => (i.tool_age_min || 0) > 30,
    probability: 0.65,
    actions: [
      { action: "Replace tool — sharp edge reduces burr formation", priority: "immediate", expected_improvement: "Significant burr reduction", estimated_time_min: 5 },
      { action: "Add chamfer pass at part edges", priority: "short_term", expected_improvement: "Controlled edge break", estimated_time_min: 5 },
      { action: "Reduce feed rate at exit moves", priority: "immediate", expected_improvement: "Less material pushed vs cut", estimated_time_min: 2 },
    ],
  },
  {
    symptoms: ["drill_wandering"],
    cause: "No pilot hole / center drill — drill deflects at entry",
    category: "parameters",
    conditions: () => true,
    probability: 0.75,
    actions: [
      { action: "Add center drill operation (90° or 120° spot)", priority: "immediate", expected_improvement: "Eliminates entry wandering", estimated_time_min: 3 },
      { action: "Use split-point drill geometry", priority: "short_term", expected_improvement: "Self-centering design", estimated_time_min: 5 },
      { action: "Reduce feed rate for first 2mm of drill entry", priority: "immediate", expected_improvement: "Controlled entry", estimated_time_min: 2 },
    ],
  },
  {
    symptoms: ["roundness_error"],
    cause: "Machine spindle runout or bearing wear",
    category: "machine",
    conditions: () => true,
    probability: 0.60,
    actions: [
      { action: "Check spindle runout with dial indicator", priority: "immediate", expected_improvement: "Identifies spindle issue", estimated_time_min: 15 },
      { action: "Use boring operation instead of drilling for critical diameters", priority: "short_term", expected_improvement: "Boring corrects roundness", estimated_time_min: 10 },
      { action: "Schedule spindle maintenance / bearing inspection", priority: "long_term", expected_improvement: "Restores machine accuracy", estimated_time_min: 480 },
    ],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class TroubleshootingEngine {
  diagnose(input: DiagnosisInput): Diagnosis {
    const matchingRules: { rule: FaultRule; score: number }[] = [];

    for (const rule of FAULT_RULES) {
      const symptomOverlap = rule.symptoms.filter(s => input.symptoms.includes(s)).length;
      if (symptomOverlap === 0) continue;

      const symptomScore = symptomOverlap / rule.symptoms.length;
      const conditionMet = rule.conditions(input) ? 1 : 0.5;
      const score = symptomScore * conditionMet * rule.probability;

      matchingRules.push({ rule, score });
    }

    matchingRules.sort((a, b) => b.score - a.score);

    const allCauses: RankedCause[] = matchingRules.map(({ rule, score }) => ({
      cause: rule.cause,
      probability: Math.round(score * 100) / 100,
      category: rule.category,
      evidence: rule.symptoms.filter(s => input.symptoms.includes(s)).map(s => `Symptom match: ${s}`),
    }));

    const primary = matchingRules[0];
    const relatedSymptoms = primary
      ? primary.rule.symptoms.filter(s => !input.symptoms.includes(s)) as Symptom[]
      : [];

    return {
      primary_cause: primary ? primary.rule.cause : "No matching diagnosis found",
      confidence: primary ? Math.round(primary.score * 100) : 0,
      all_causes: allCauses.slice(0, 5),
      corrective_actions: primary ? primary.rule.actions : [],
      related_symptoms: relatedSymptoms,
    };
  }

  rootCause(input: DiagnosisInput): RootCauseAnalysis {
    const diag = this.diagnose(input);
    const fishbone: Record<string, string[]> = {
      Man: [], Machine: [], Method: [], Material: [], Measurement: [], Environment: [],
    };

    for (const cause of diag.all_causes) {
      switch (cause.category) {
        case "parameters": fishbone.Method.push(cause.cause); break;
        case "tooling": fishbone.Machine.push(cause.cause); break;
        case "fixturing": fishbone.Machine.push(cause.cause); break;
        case "machine": fishbone.Machine.push(cause.cause); break;
        case "material": fishbone.Material.push(cause.cause); break;
        case "coolant": fishbone.Environment.push(cause.cause); break;
      }
    }

    // Add standard contributing factors
    if (input.tool_age_min && input.tool_age_min > 60) fishbone.Machine.push("Tool approaching end of life");
    if (!input.coolant_active) fishbone.Environment.push("No coolant — increased thermal load");

    return {
      symptom_chain: input.symptoms.map(s => s.replace(/_/g, " ")),
      root_cause: diag.primary_cause,
      contributing_factors: diag.all_causes.slice(1, 4).map(c => c.cause),
      fishbone,
    };
  }

  correctiveActions(input: DiagnosisInput): CorrectiveAction[] {
    const diag = this.diagnose(input);
    // Collect all unique actions from top 3 diagnoses
    const allActions: CorrectiveAction[] = [];
    const seen = new Set<string>();

    for (const cause of diag.all_causes.slice(0, 3)) {
      const rule = FAULT_RULES.find(r => r.cause === cause.cause);
      if (rule) {
        for (const a of rule.actions) {
          if (!seen.has(a.action)) {
            seen.add(a.action);
            allActions.push(a);
          }
        }
      }
    }

    // Sort: immediate first, then short_term, then long_term
    const priorityOrder = { immediate: 0, short_term: 1, long_term: 2 };
    allActions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return allActions;
  }
}

export const troubleshootingEngine = new TroubleshootingEngine();
