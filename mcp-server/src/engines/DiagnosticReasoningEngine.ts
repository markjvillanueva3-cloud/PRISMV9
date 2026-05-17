/**
 * DiagnosticReasoningEngine — Machine Alarm & Troubleshooting for PRISM
 * =====================================================================
 * Provides diagnostic reasoning capabilities:
 *   - Machine alarm interpretation and root cause analysis
 *   - Fault tree analysis (FTA)
 *   - Failure mode and effects analysis (FMEA)
 *   - Symptom-based diagnosis
 *   - Probabilistic fault isolation
 *   - Repair recommendation with cost/time tradeoffs
 *   - Predictive maintenance suggestions
 *
 * This engine helps operators and maintenance staff quickly
 * diagnose and resolve machine issues.
 *
 * @module engines/DiagnosticReasoningEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Alarm severity */
export type AlarmSeverity = "info" | "warning" | "fault" | "critical" | "emergency";

/** Machine alarm */
export interface MachineAlarm {
  alarm_code: string;
  message: string;
  severity: AlarmSeverity;
  timestamp: string;
  machine_id: string;
  machine_type: string;
  controller: string;  // e.g., "Fanuc", "Siemens", "Okuma OSP"
  axis?: string;
  spindle?: string;
  additional_data?: Record<string, unknown>;
}

/** Symptom observation */
export interface Symptom {
  id: string;
  description: string;
  observed: boolean;
  confidence: number;  // How certain we are of this observation
  source: "alarm" | "operator" | "sensor" | "visual" | "audio";
}

/** Possible cause */
export interface PossibleCause {
  id: string;
  description: string;
  probability: number;  // 0-1
  evidence_for: string[];
  evidence_against: string[];
  typical_symptoms: string[];
  test_to_confirm: string;
}

/** Diagnosis result */
export interface DiagnosisResult {
  diagnosis_id: string;
  primary_diagnosis: PossibleCause;
  differential_diagnoses: PossibleCause[];
  confidence: number;
  reasoning_trace: DiagnosticReasoning[];
  recommended_actions: RepairAction[];
  estimated_downtime: {
    best_case_minutes: number;
    expected_minutes: number;
    worst_case_minutes: number;
  };
  safety_warnings: string[];
}

/** Diagnostic reasoning step */
export interface DiagnosticReasoning {
  step: number;
  hypothesis: string;
  evidence: string[];
  probability_update: { before: number; after: number };
  conclusion: string;
}

/** Repair action */
export interface RepairAction {
  action_id: string;
  description: string;
  priority: number;  // 1 = highest
  estimated_time_minutes: number;
  estimated_cost: number;
  parts_required: Array<{
    part: string;
    quantity: number;
    in_stock: boolean;
    cost: number;
  }>;
  skill_level_required: "operator" | "maintenance" | "specialist" | "oem";
  tools_required: string[];
  safety_precautions: string[];
  success_probability: number;
}

/** Fault tree node */
export interface FaultTreeNode {
  id: string;
  event: string;
  type: "top" | "intermediate" | "basic" | "undeveloped";
  gate?: "AND" | "OR" | "XOR";
  probability?: number;
  children?: FaultTreeNode[];
}

/** FMEA entry */
export interface FMEAEntry {
  id: string;
  component: string;
  failure_mode: string;
  effect: string;
  cause: string;
  severity: number;  // 1-10
  occurrence: number;  // 1-10
  detection: number;  // 1-10
  rpn: number;  // Risk Priority Number = S × O × D
  recommended_action: string;
  current_controls: string[];
}

/** Machine health status */
export interface MachineHealthStatus {
  machine_id: string;
  overall_health: number;  // 0-100
  subsystems: Array<{
    name: string;
    health: number;
    trend: "improving" | "stable" | "degrading";
    alerts: string[];
  }>;
  maintenance_due: Array<{
    task: string;
    due_date: string;
    urgency: "overdue" | "due_soon" | "scheduled";
  }>;
  predicted_failures: Array<{
    component: string;
    probability: number;
    estimated_time_to_failure: string;
    impact: string;
  }>;
}

// ============================================================================
// ALARM KNOWLEDGE BASE
// ============================================================================

interface AlarmKnowledge {
  pattern: RegExp | string;
  controller?: string[];
  severity: AlarmSeverity;
  category: string;
  possible_causes: Array<{
    cause: string;
    probability: number;
    symptoms: string[];
    fix: string;
  }>;
  immediate_actions: string[];
  safety_critical: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class DiagnosticReasoningEngine {
  // Common alarm patterns and their diagnostics
  private static readonly ALARM_KNOWLEDGE: AlarmKnowledge[] = [
    // Servo/Axis alarms
    {
      pattern: /servo.*alarm|axis.*error|SV\d+|AL\d{3,4}/i,
      category: "servo",
      severity: "fault",
      possible_causes: [
        {
          cause: "Servo amplifier overload",
          probability: 0.3,
          symptoms: ["Motor hot", "Jerky motion", "Position error"],
          fix: "Check for mechanical binding, reduce rapid speeds, check motor temperature",
        },
        {
          cause: "Encoder feedback error",
          probability: 0.25,
          symptoms: ["Position drift", "Following error", "Inconsistent position"],
          fix: "Check encoder cable, clean encoder, verify encoder mounting",
        },
        {
          cause: "Motor overheating",
          probability: 0.2,
          symptoms: ["Motor hot to touch", "Thermal fault after extended operation"],
          fix: "Clean motor cooling vents, check coolant flow, reduce duty cycle",
        },
        {
          cause: "Cable damage",
          probability: 0.15,
          symptoms: ["Intermittent fault", "Fault during specific axis movement"],
          fix: "Inspect power and feedback cables, check connectors, replace damaged cables",
        },
        {
          cause: "Drive parameter mismatch",
          probability: 0.1,
          symptoms: ["Oscillation", "Instability at certain speeds"],
          fix: "Verify drive parameters match motor specs, retune servo loop",
        },
      ],
      immediate_actions: ["Stop all motion", "Note axis and position", "Check for mechanical obstruction"],
      safety_critical: true,
    },
    // Spindle alarms
    {
      pattern: /spindle.*alarm|spindle.*error|SP\d+/i,
      category: "spindle",
      severity: "fault",
      possible_causes: [
        {
          cause: "Spindle bearing failure",
          probability: 0.25,
          symptoms: ["Abnormal noise", "Vibration", "Heat"],
          fix: "Replace spindle bearings - requires specialist",
        },
        {
          cause: "Spindle drive fault",
          probability: 0.3,
          symptoms: ["Speed deviation", "Unable to reach commanded speed"],
          fix: "Check drive parameters, replace drive if failed",
        },
        {
          cause: "Coolant system failure",
          probability: 0.2,
          symptoms: ["Spindle overheating", "Coolant warning"],
          fix: "Check coolant pump, level, and flow to spindle chiller",
        },
        {
          cause: "Tool unclamp failure",
          probability: 0.15,
          symptoms: ["Tool won't release", "Drawbar issue"],
          fix: "Check drawbar pressure, clean toolholder interface, check belleville springs",
        },
        {
          cause: "Orientation failure",
          probability: 0.1,
          symptoms: ["Cannot orient spindle", "Tool change failure"],
          fix: "Check orientation sensor, verify spindle can rotate freely",
        },
      ],
      immediate_actions: ["Stop spindle immediately", "Do not attempt tool change", "Check for tool breakage"],
      safety_critical: true,
    },
    // Coolant alarms
    {
      pattern: /coolant|flood|mist|through.*spindle|TSC/i,
      category: "coolant",
      severity: "warning",
      possible_causes: [
        {
          cause: "Low coolant level",
          probability: 0.4,
          symptoms: ["Low level alarm", "Pump cavitation"],
          fix: "Add coolant to tank, check for leaks",
        },
        {
          cause: "Pump failure",
          probability: 0.25,
          symptoms: ["No flow", "Motor running but no pressure"],
          fix: "Check pump motor, inspect impeller, check for clogs",
        },
        {
          cause: "Filter clogged",
          probability: 0.2,
          symptoms: ["Reduced flow", "Pressure drop"],
          fix: "Replace or clean coolant filters",
        },
        {
          cause: "Nozzle blockage",
          probability: 0.15,
          symptoms: ["Uneven flow", "Some nozzles not working"],
          fix: "Clear nozzle blockages, check flexible lines",
        },
      ],
      immediate_actions: ["Check coolant level visually", "Listen for pump operation"],
      safety_critical: false,
    },
    // Hydraulic alarms
    {
      pattern: /hydraulic|HYD|clamp|unclamp/i,
      category: "hydraulic",
      severity: "fault",
      possible_causes: [
        {
          cause: "Low hydraulic pressure",
          probability: 0.35,
          symptoms: ["Pressure gauge low", "Slow clamping"],
          fix: "Check hydraulic oil level, inspect pump, check for leaks",
        },
        {
          cause: "Hydraulic leak",
          probability: 0.25,
          symptoms: ["Oil on floor", "Dropping oil level"],
          fix: "Locate and repair leak, check all fittings and hoses",
        },
        {
          cause: "Pump failure",
          probability: 0.2,
          symptoms: ["No pressure buildup", "Motor running continuously"],
          fix: "Replace hydraulic pump - usually requires specialist",
        },
        {
          cause: "Solenoid valve failure",
          probability: 0.2,
          symptoms: ["Specific function not working", "Valve stuck"],
          fix: "Test and replace faulty solenoid valve",
        },
      ],
      immediate_actions: ["Check hydraulic pressure gauge", "Look for leaks", "Do not release clamped workpiece"],
      safety_critical: true,
    },
    // Overtravel alarms
    {
      pattern: /overtravel|OT|limit.*switch|soft.*limit/i,
      category: "overtravel",
      severity: "critical",
      possible_causes: [
        {
          cause: "Program error - commanded position beyond limits",
          probability: 0.35,
          symptoms: ["Alarm during program run", "Near axis limit"],
          fix: "Check program, verify work offset, check tool offset",
        },
        {
          cause: "Incorrect work offset",
          probability: 0.3,
          symptoms: ["First move causes alarm", "After setup change"],
          fix: "Re-establish work offset, check all G54-G59 values",
        },
        {
          cause: "Limit switch malfunction",
          probability: 0.2,
          symptoms: ["Alarm far from actual limit", "Intermittent"],
          fix: "Check limit switch, clean or replace, check wiring",
        },
        {
          cause: "Reference position lost",
          probability: 0.15,
          symptoms: ["After power loss", "Position doesn't match display"],
          fix: "Re-home machine, re-establish reference position",
        },
      ],
      immediate_actions: ["Do not force movement", "Note displayed position", "Check physical position visually"],
      safety_critical: true,
    },
    // Emergency stop
    {
      pattern: /e-?stop|emergency|EMG/i,
      category: "estop",
      severity: "emergency",
      possible_causes: [
        {
          cause: "E-stop button pressed",
          probability: 0.5,
          symptoms: ["Red button engaged", "Operator initiated"],
          fix: "Determine reason for E-stop, clear condition, reset button",
        },
        {
          cause: "Safety interlock triggered",
          probability: 0.3,
          symptoms: ["Door open", "Guard not in position"],
          fix: "Close all doors and guards, verify interlocks",
        },
        {
          cause: "Safety relay failure",
          probability: 0.2,
          symptoms: ["Cannot reset E-stop", "Relay not clicking"],
          fix: "Check safety relay module, may require replacement",
        },
      ],
      immediate_actions: ["Ensure area is safe", "Identify source of E-stop", "Check all doors and guards"],
      safety_critical: true,
    },
    // Tool-related alarms
    {
      pattern: /tool.*life|tool.*broken|tool.*wear|tool.*change/i,
      category: "tooling",
      severity: "warning",
      possible_causes: [
        {
          cause: "Tool life expired",
          probability: 0.4,
          symptoms: ["Counter reached limit", "Scheduled replacement"],
          fix: "Replace tool, reset tool life counter",
        },
        {
          cause: "Tool breakage detected",
          probability: 0.3,
          symptoms: ["Sudden load change", "Tool probe failure"],
          fix: "Remove broken tool, check for damage to work, replace tool",
        },
        {
          cause: "Tool offset error",
          probability: 0.2,
          symptoms: ["Incorrect dimensions", "Collision during first cut"],
          fix: "Re-measure and enter correct tool offset",
        },
        {
          cause: "Tool magazine error",
          probability: 0.1,
          symptoms: ["Wrong tool selected", "Magazine jam"],
          fix: "Check magazine, verify tool pocket assignments",
        },
      ],
      immediate_actions: ["Stop program", "Inspect tool visually", "Check part for damage"],
      safety_critical: false,
    },
  ];

  // Controller-specific alarm decoding
  private static readonly CONTROLLER_ALARM_PREFIXES: Record<string, Record<string, string>> = {
    fanuc: {
      "PS": "Program/Sequence error",
      "SR": "Servo alarm",
      "SV": "Servo alarm",
      "SP": "Spindle alarm",
      "OT": "Overtravel",
      "OH": "Overheat",
      "DS": "Data server",
      "IO": "I/O error",
      "MC": "Machine",
    },
    siemens: {
      "1": "Interface",
      "2": "Interpolator",
      "3": "Axis",
      "4": "PLC",
      "5": "Servo",
      "6": "Spindle",
      "10": "Safety",
      "21": "Drive",
    },
    okuma: {
      "A": "Axis",
      "B": "Spindle",
      "C": "Magazine",
      "D": "Communication",
      "E": "Emergency",
      "F": "Feed",
      "P": "Program",
    },
  };

  /**
   * Diagnose from machine alarm
   */
  static diagnose(alarm: MachineAlarm, additionalSymptoms: Symptom[] = []): DiagnosisResult {
    const diagnosisId = `diag-${Date.now()}`;

    log.info("[DiagnosticReasoning] Starting diagnosis", {
      diagnosis_id: diagnosisId,
      alarm_code: alarm.alarm_code,
      controller: alarm.controller,
    });

    // Find matching alarm knowledge
    const knowledge = this.findAlarmKnowledge(alarm);

    // Collect all symptoms
    const symptoms = this.extractSymptoms(alarm, knowledge, additionalSymptoms);

    // Bayesian update of cause probabilities based on symptoms
    const causes = this.updateCauseProbabilities(knowledge, symptoms);

    // Sort by probability
    causes.sort((a, b) => b.probability - a.probability);

    // Generate reasoning trace
    const reasoningTrace = this.generateReasoningTrace(causes, symptoms);

    // Generate repair actions for top causes
    const actions = this.generateRepairActions(causes.slice(0, 3), alarm);

    // Estimate downtime
    const downtime = this.estimateDowntime(causes[0], actions);

    // Safety warnings
    const safetyWarnings = knowledge?.safety_critical
      ? this.getSafetyWarnings(alarm, knowledge)
      : [];

    log.info("[DiagnosticReasoning] Diagnosis complete", {
      primary_cause: causes[0]?.description,
      probability: causes[0]?.probability,
      num_differentials: causes.length - 1,
    });

    return {
      diagnosis_id: diagnosisId,
      primary_diagnosis: causes[0],
      differential_diagnoses: causes.slice(1),
      confidence: causes[0]?.probability ?? 0.5,
      reasoning_trace: reasoningTrace,
      recommended_actions: actions,
      estimated_downtime: downtime,
      safety_warnings: safetyWarnings,
    };
  }

  /**
   * Diagnose from symptoms only (no alarm)
   */
  static diagnoseFromSymptoms(
    machineType: string,
    symptoms: Symptom[]
  ): DiagnosisResult {
    const diagnosisId = `diag-symp-${Date.now()}`;

    log.info("[DiagnosticReasoning] Starting symptom-based diagnosis", {
      diagnosis_id: diagnosisId,
      num_symptoms: symptoms.length,
    });

    // Find all possible causes that match symptoms
    const allCauses: PossibleCause[] = [];

    for (const knowledge of this.ALARM_KNOWLEDGE) {
      for (const cause of knowledge.possible_causes) {
        const matchingSymptoms = symptoms.filter(s =>
          s.observed && cause.symptoms.some(cs =>
            cs.toLowerCase().includes(s.description.toLowerCase()) ||
            s.description.toLowerCase().includes(cs.toLowerCase())
          )
        );

        if (matchingSymptoms.length > 0) {
          const baseProbability = cause.probability;
          const symptomBoost = matchingSymptoms.length / cause.symptoms.length;
          const adjustedProbability = Math.min(0.95, baseProbability * (1 + symptomBoost));

          allCauses.push({
            id: `${knowledge.category}-${cause.cause.replace(/\s+/g, "-")}`,
            description: cause.cause,
            probability: adjustedProbability,
            evidence_for: matchingSymptoms.map(s => s.description),
            evidence_against: [],
            typical_symptoms: cause.symptoms,
            test_to_confirm: cause.fix.split(",")[0],  // First step is usually diagnostic
          });
        }
      }
    }

    // Merge and sort
    allCauses.sort((a, b) => b.probability - a.probability);
    const uniqueCauses = this.deduplicateCauses(allCauses);

    // Generate trace and actions
    const reasoningTrace = this.generateReasoningTrace(uniqueCauses, symptoms);
    const actions = this.generateRepairActions(uniqueCauses.slice(0, 3), {
      alarm_code: "SYMPTOM",
      message: symptoms.map(s => s.description).join(", "),
      severity: "warning",
      timestamp: new Date().toISOString(),
      machine_id: "unknown",
      machine_type: machineType,
      controller: "unknown",
    });

    return {
      diagnosis_id: diagnosisId,
      primary_diagnosis: uniqueCauses[0] ?? {
        id: "unknown",
        description: "Unable to determine cause from symptoms",
        probability: 0.3,
        evidence_for: [],
        evidence_against: [],
        typical_symptoms: [],
        test_to_confirm: "Contact machine manufacturer or specialist",
      },
      differential_diagnoses: uniqueCauses.slice(1),
      confidence: uniqueCauses[0]?.probability ?? 0.3,
      reasoning_trace: reasoningTrace,
      recommended_actions: actions,
      estimated_downtime: {
        best_case_minutes: 30,
        expected_minutes: 120,
        worst_case_minutes: 480,
      },
      safety_warnings: ["Unknown fault - exercise caution", "Verify machine is safe before troubleshooting"],
    };
  }

  /**
   * Build fault tree for a failure mode
   */
  static buildFaultTree(
    topEvent: string,
    machineType: string
  ): FaultTreeNode {
    log.info("[DiagnosticReasoning] Building fault tree", { topEvent });

    // Example fault tree for common failures
    if (topEvent.toLowerCase().includes("spindle") &&
        topEvent.toLowerCase().includes("fail")) {
      return {
        id: "top",
        event: "Spindle Failure",
        type: "top",
        gate: "OR",
        children: [
          {
            id: "int1",
            event: "Mechanical Failure",
            type: "intermediate",
            gate: "OR",
            children: [
              { id: "basic1", event: "Bearing Failure", type: "basic", probability: 0.15 },
              { id: "basic2", event: "Spindle Shaft Damage", type: "basic", probability: 0.05 },
              { id: "basic3", event: "Drawbar Failure", type: "basic", probability: 0.08 },
            ],
          },
          {
            id: "int2",
            event: "Electrical Failure",
            type: "intermediate",
            gate: "OR",
            children: [
              { id: "basic4", event: "Drive Failure", type: "basic", probability: 0.12 },
              { id: "basic5", event: "Encoder Failure", type: "basic", probability: 0.10 },
              { id: "basic6", event: "Motor Winding Failure", type: "basic", probability: 0.08 },
            ],
          },
          {
            id: "int3",
            event: "Cooling System Failure",
            type: "intermediate",
            gate: "AND",
            children: [
              { id: "basic7", event: "Chiller Failure", type: "basic", probability: 0.10 },
              { id: "basic8", event: "No Operator Intervention", type: "basic", probability: 0.30 },
            ],
          },
        ],
      };
    }

    // Generic fault tree
    return {
      id: "top",
      event: topEvent,
      type: "top",
      gate: "OR",
      children: [
        { id: "basic1", event: "Mechanical cause", type: "undeveloped" },
        { id: "basic2", event: "Electrical cause", type: "undeveloped" },
        { id: "basic3", event: "Software/control cause", type: "undeveloped" },
        { id: "basic4", event: "Operator error", type: "undeveloped" },
      ],
    };
  }

  /**
   * Calculate fault tree probability
   */
  static calculateFaultTreeProbability(tree: FaultTreeNode): number {
    if (tree.type === "basic" && tree.probability !== undefined) {
      return tree.probability;
    }

    if (!tree.children || tree.children.length === 0) {
      return 0.1;  // Default for undeveloped events
    }

    const childProbs = tree.children.map(c => this.calculateFaultTreeProbability(c));

    switch (tree.gate) {
      case "OR":
        // P(A OR B) = 1 - (1-P(A)) * (1-P(B))
        return 1 - childProbs.reduce((acc, p) => acc * (1 - p), 1);
      case "AND":
        // P(A AND B) = P(A) * P(B)
        return childProbs.reduce((acc, p) => acc * p, 1);
      case "XOR":
        // Exclusive OR
        return childProbs.reduce((acc, p, i) =>
          acc + p * childProbs.filter((_, j) => j !== i).reduce((a, q) => a * (1 - q), 1), 0);
      default:
        return Math.max(...childProbs);
    }
  }

  /**
   * Perform FMEA analysis
   */
  static performFMEA(
    components: Array<{
      name: string;
      function: string;
      failure_modes: Array<{
        mode: string;
        effect: string;
        cause: string;
        controls: string[];
      }>;
    }>
  ): FMEAEntry[] {
    log.info("[DiagnosticReasoning] Performing FMEA", {
      num_components: components.length,
    });

    const entries: FMEAEntry[] = [];
    let idCounter = 1;

    for (const component of components) {
      for (const fm of component.failure_modes) {
        // Estimate severity, occurrence, detection
        const severity = this.estimateSeverity(fm.effect);
        const occurrence = this.estimateOccurrence(fm.cause);
        const detection = this.estimateDetection(fm.controls);

        const rpn = severity * occurrence * detection;

        entries.push({
          id: `FMEA-${idCounter++}`,
          component: component.name,
          failure_mode: fm.mode,
          effect: fm.effect,
          cause: fm.cause,
          severity,
          occurrence,
          detection,
          rpn,
          recommended_action: this.suggestFMEAAction(rpn, severity, occurrence, detection),
          current_controls: fm.controls,
        });
      }
    }

    // Sort by RPN descending
    entries.sort((a, b) => b.rpn - a.rpn);

    return entries;
  }

  /**
   * Assess machine health
   */
  static assessMachineHealth(
    machineId: string,
    recentAlarms: MachineAlarm[],
    maintenanceRecords: Array<{
      task: string;
      last_performed: string;
      interval_days: number;
    }>,
    sensorData?: Record<string, number>
  ): MachineHealthStatus {
    log.info("[DiagnosticReasoning] Assessing machine health", { machine_id: machineId });

    // Analyze alarms
    const alarmCount = recentAlarms.length;
    const severityCounts = {
      critical: recentAlarms.filter(a => a.severity === "critical").length,
      fault: recentAlarms.filter(a => a.severity === "fault").length,
      warning: recentAlarms.filter(a => a.severity === "warning").length,
    };

    // Calculate overall health
    let healthScore = 100;
    healthScore -= severityCounts.critical * 20;
    healthScore -= severityCounts.fault * 10;
    healthScore -= severityCounts.warning * 2;
    healthScore = Math.max(0, healthScore);

    // Analyze maintenance
    const now = new Date();
    const maintenanceDue = maintenanceRecords.map(m => {
      const lastDate = new Date(m.last_performed);
      const dueDate = new Date(lastDate.getTime() + m.interval_days * 24 * 60 * 60 * 1000);
      const daysOverdue = (now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000);

      let urgency: "overdue" | "due_soon" | "scheduled";
      if (daysOverdue > 0) {
        urgency = "overdue";
        healthScore -= Math.min(20, daysOverdue * 0.5);
      } else if (daysOverdue > -7) {
        urgency = "due_soon";
      } else {
        urgency = "scheduled";
      }

      return {
        task: m.task,
        due_date: dueDate.toISOString().split("T")[0],
        urgency,
      };
    });

    // Subsystem analysis
    const subsystems = this.analyzeSubsystems(recentAlarms, sensorData);

    // Predicted failures
    const predictions = this.predictFailures(recentAlarms, maintenanceDue, sensorData);

    return {
      machine_id: machineId,
      overall_health: Math.max(0, Math.min(100, healthScore)),
      subsystems,
      maintenance_due: maintenanceDue,
      predicted_failures: predictions,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static findAlarmKnowledge(alarm: MachineAlarm): AlarmKnowledge | undefined {
    for (const knowledge of this.ALARM_KNOWLEDGE) {
      const pattern = knowledge.pattern instanceof RegExp
        ? knowledge.pattern
        : new RegExp(knowledge.pattern, "i");

      if (pattern.test(alarm.alarm_code) || pattern.test(alarm.message)) {
        return knowledge;
      }
    }
    return undefined;
  }

  private static extractSymptoms(
    alarm: MachineAlarm,
    knowledge: AlarmKnowledge | undefined,
    additionalSymptoms: Symptom[]
  ): Symptom[] {
    const symptoms: Symptom[] = [
      {
        id: "alarm",
        description: `${alarm.alarm_code}: ${alarm.message}`,
        observed: true,
        confidence: 1.0,
        source: "alarm",
      },
    ];

    // Add axis/spindle info as symptoms
    if (alarm.axis) {
      symptoms.push({
        id: "axis",
        description: `Fault on ${alarm.axis} axis`,
        observed: true,
        confidence: 1.0,
        source: "alarm",
      });
    }

    if (alarm.spindle) {
      symptoms.push({
        id: "spindle",
        description: `Fault on ${alarm.spindle} spindle`,
        observed: true,
        confidence: 1.0,
        source: "alarm",
      });
    }

    // Add additional symptoms
    symptoms.push(...additionalSymptoms);

    return symptoms;
  }

  private static updateCauseProbabilities(
    knowledge: AlarmKnowledge | undefined,
    symptoms: Symptom[]
  ): PossibleCause[] {
    if (!knowledge) {
      return [{
        id: "unknown",
        description: "Unknown alarm - consult machine manual",
        probability: 0.5,
        evidence_for: [],
        evidence_against: [],
        typical_symptoms: [],
        test_to_confirm: "Check alarm code in machine manual",
      }];
    }

    return knowledge.possible_causes.map(cause => {
      let probability = cause.probability;

      // Bayesian update based on symptoms
      for (const symptom of symptoms) {
        const matches = cause.symptoms.some(s =>
          s.toLowerCase().includes(symptom.description.toLowerCase()) ||
          symptom.description.toLowerCase().includes(s.toLowerCase())
        );

        if (symptom.observed && matches) {
          // Symptom matches - increase probability
          probability *= 1.5;
        } else if (symptom.observed && !matches) {
          // Symptom observed but not typical - slight decrease
          probability *= 0.9;
        }
      }

      // Normalize to max 0.95
      probability = Math.min(0.95, probability);

      return {
        id: cause.cause.replace(/\s+/g, "-").toLowerCase(),
        description: cause.cause,
        probability,
        evidence_for: symptoms
          .filter(s => s.observed && cause.symptoms.some(cs =>
            cs.toLowerCase().includes(s.description.toLowerCase())))
          .map(s => s.description),
        evidence_against: [],
        typical_symptoms: cause.symptoms,
        test_to_confirm: cause.fix.split(",")[0],
      };
    });
  }

  private static generateReasoningTrace(
    causes: PossibleCause[],
    symptoms: Symptom[]
  ): DiagnosticReasoning[] {
    const trace: DiagnosticReasoning[] = [];
    let step = 1;

    // Initial observation
    trace.push({
      step: step++,
      hypothesis: "Initial alarm/symptom analysis",
      evidence: symptoms.filter(s => s.observed).map(s => s.description),
      probability_update: { before: 0.5, after: 0.5 },
      conclusion: `${symptoms.length} symptoms observed`,
    });

    // Top 3 hypotheses
    for (const cause of causes.slice(0, 3)) {
      trace.push({
        step: step++,
        hypothesis: cause.description,
        evidence: cause.evidence_for,
        probability_update: {
          before: cause.probability * 0.7,
          after: cause.probability,
        },
        conclusion: cause.evidence_for.length > 0
          ? `Supported by ${cause.evidence_for.length} matching symptoms`
          : "No direct symptom match, based on alarm pattern",
      });
    }

    // Final conclusion
    trace.push({
      step: step++,
      hypothesis: "Most likely cause determination",
      evidence: [causes[0]?.description ?? "Unknown"],
      probability_update: {
        before: causes[0]?.probability ?? 0.5,
        after: causes[0]?.probability ?? 0.5,
      },
      conclusion: `Primary diagnosis: ${causes[0]?.description ?? "Unknown"} (${((causes[0]?.probability ?? 0.5) * 100).toFixed(0)}% confidence)`,
    });

    return trace;
  }

  private static generateRepairActions(
    causes: PossibleCause[],
    alarm: MachineAlarm
  ): RepairAction[] {
    const actions: RepairAction[] = [];
    let priority = 1;

    for (const cause of causes) {
      // Find the fix from knowledge base
      const knowledge = this.findAlarmKnowledge(alarm);
      const causeFix = knowledge?.possible_causes.find(c => c.cause === cause.description)?.fix;

      if (causeFix) {
        const steps = causeFix.split(",").map(s => s.trim());

        actions.push({
          action_id: `action-${priority}`,
          description: steps[0],
          priority: priority++,
          estimated_time_minutes: this.estimateRepairTime(cause.description),
          estimated_cost: this.estimateRepairCost(cause.description),
          parts_required: this.estimatePartsRequired(cause.description),
          skill_level_required: this.determineSkillLevel(cause.description),
          tools_required: this.estimateToolsRequired(cause.description),
          safety_precautions: this.getSafetyPrecautions(alarm),
          success_probability: cause.probability * 0.8,
        });
      }
    }

    return actions;
  }

  private static estimateDowntime(
    cause: PossibleCause | undefined,
    actions: RepairAction[]
  ): { best_case_minutes: number; expected_minutes: number; worst_case_minutes: number } {
    if (!cause || actions.length === 0) {
      return { best_case_minutes: 15, expected_minutes: 60, worst_case_minutes: 240 };
    }

    const baseTime = actions[0]?.estimated_time_minutes ?? 30;

    return {
      best_case_minutes: Math.round(baseTime * 0.5),
      expected_minutes: baseTime,
      worst_case_minutes: Math.round(baseTime * 3),
    };
  }

  private static getSafetyWarnings(alarm: MachineAlarm, knowledge: AlarmKnowledge): string[] {
    const warnings: string[] = [];

    if (knowledge.severity === "emergency" || knowledge.severity === "critical") {
      warnings.push("CRITICAL: Machine must be fully stopped before any inspection");
      warnings.push("Lockout/tagout procedures required");
    }

    warnings.push(...knowledge.immediate_actions.map(a => `Immediate: ${a}`));

    if (knowledge.category === "servo" || knowledge.category === "spindle") {
      warnings.push("Warning: Rotating components - ensure all motion has stopped");
    }

    if (knowledge.category === "hydraulic") {
      warnings.push("Warning: High pressure fluid - release pressure before disconnecting");
    }

    return warnings;
  }

  private static estimateRepairTime(causeDescription: string): number {
    const desc = causeDescription.toLowerCase();

    if (desc.includes("bearing") || desc.includes("spindle")) return 480;  // 8 hours
    if (desc.includes("motor") || desc.includes("drive")) return 240;  // 4 hours
    if (desc.includes("cable") || desc.includes("connector")) return 60;  // 1 hour
    if (desc.includes("filter") || desc.includes("level")) return 15;  // 15 min
    if (desc.includes("parameter") || desc.includes("software")) return 30;  // 30 min

    return 60;  // Default 1 hour
  }

  private static estimateRepairCost(causeDescription: string): number {
    const desc = causeDescription.toLowerCase();

    if (desc.includes("bearing")) return 5000;
    if (desc.includes("drive") || desc.includes("amplifier")) return 3000;
    if (desc.includes("motor")) return 2500;
    if (desc.includes("encoder")) return 1500;
    if (desc.includes("pump")) return 800;
    if (desc.includes("cable")) return 200;
    if (desc.includes("filter")) return 50;

    return 500;  // Default
  }

  private static estimatePartsRequired(causeDescription: string): RepairAction["parts_required"] {
    const desc = causeDescription.toLowerCase();
    const parts: RepairAction["parts_required"] = [];

    if (desc.includes("bearing")) {
      parts.push({ part: "Spindle bearings (set)", quantity: 1, in_stock: false, cost: 2000 });
    }
    if (desc.includes("encoder")) {
      parts.push({ part: "Encoder unit", quantity: 1, in_stock: false, cost: 1200 });
    }
    if (desc.includes("cable")) {
      parts.push({ part: "Servo cable assembly", quantity: 1, in_stock: true, cost: 150 });
    }
    if (desc.includes("filter")) {
      parts.push({ part: "Coolant filter element", quantity: 1, in_stock: true, cost: 35 });
    }

    return parts;
  }

  private static determineSkillLevel(causeDescription: string): RepairAction["skill_level_required"] {
    const desc = causeDescription.toLowerCase();

    if (desc.includes("bearing") || desc.includes("spindle shaft")) return "oem";
    if (desc.includes("drive") || desc.includes("motor") || desc.includes("encoder")) return "specialist";
    if (desc.includes("cable") || desc.includes("pump") || desc.includes("valve")) return "maintenance";
    if (desc.includes("filter") || desc.includes("level") || desc.includes("parameter")) return "operator";

    return "maintenance";
  }

  private static estimateToolsRequired(causeDescription: string): string[] {
    const desc = causeDescription.toLowerCase();
    const tools: string[] = ["Multimeter"];

    if (desc.includes("bearing") || desc.includes("spindle")) {
      tools.push("Bearing puller", "Torque wrench", "Alignment laser");
    }
    if (desc.includes("encoder")) {
      tools.push("Oscilloscope", "Feeler gauge");
    }
    if (desc.includes("cable")) {
      tools.push("Wire strippers", "Crimping tool", "Heat shrink gun");
    }
    if (desc.includes("hydraulic")) {
      tools.push("Pressure gauge", "Wrenches");
    }

    return tools;
  }

  private static getSafetyPrecautions(alarm: MachineAlarm): string[] {
    return [
      "Ensure machine is powered off or in safe mode",
      "Follow lockout/tagout procedures",
      "Wear appropriate PPE",
      "Verify all motion has stopped before working on machine",
    ];
  }

  private static deduplicateCauses(causes: PossibleCause[]): PossibleCause[] {
    const seen = new Set<string>();
    const unique: PossibleCause[] = [];

    for (const cause of causes) {
      const key = cause.description.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cause);
      }
    }

    return unique;
  }

  private static estimateSeverity(effect: string): number {
    const eff = effect.toLowerCase();
    if (eff.includes("safety") || eff.includes("injury")) return 10;
    if (eff.includes("scrap") || eff.includes("crash")) return 9;
    if (eff.includes("major") || eff.includes("significant")) return 7;
    if (eff.includes("minor") || eff.includes("slight")) return 4;
    if (eff.includes("none") || eff.includes("minimal")) return 2;
    return 5;
  }

  private static estimateOccurrence(cause: string): number {
    const c = cause.toLowerCase();
    if (c.includes("common") || c.includes("frequent")) return 8;
    if (c.includes("occasional")) return 5;
    if (c.includes("rare") || c.includes("unlikely")) return 2;
    return 5;
  }

  private static estimateDetection(controls: string[]): number {
    if (controls.length === 0) return 10;
    const hasAutomatic = controls.some(c =>
      c.toLowerCase().includes("automatic") || c.toLowerCase().includes("sensor"));
    const hasManual = controls.some(c =>
      c.toLowerCase().includes("inspection") || c.toLowerCase().includes("check"));

    if (hasAutomatic) return 3;
    if (hasManual) return 6;
    return 8;
  }

  private static suggestFMEAAction(rpn: number, s: number, o: number, d: number): string {
    if (rpn > 200 || s >= 9) {
      return "CRITICAL: Immediate action required - redesign or add redundant safety";
    }
    if (rpn > 100) {
      if (d > 7) return "Add automatic detection/monitoring system";
      if (o > 5) return "Implement preventive maintenance to reduce occurrence";
      return "Review and improve current controls";
    }
    if (rpn > 50) {
      return "Monitor and address during next scheduled maintenance";
    }
    return "Current controls adequate - continue monitoring";
  }

  private static analyzeSubsystems(
    alarms: MachineAlarm[],
    sensorData?: Record<string, number>
  ): MachineHealthStatus["subsystems"] {
    const subsystems: MachineHealthStatus["subsystems"] = [
      { name: "Spindle", health: 100, trend: "stable", alerts: [] },
      { name: "Axes/Servos", health: 100, trend: "stable", alerts: [] },
      { name: "Coolant", health: 100, trend: "stable", alerts: [] },
      { name: "Hydraulics", health: 100, trend: "stable", alerts: [] },
      { name: "Tool Changer", health: 100, trend: "stable", alerts: [] },
    ];

    // Degrade health based on alarms
    for (const alarm of alarms) {
      const knowledge = this.findAlarmKnowledge(alarm);
      if (!knowledge) continue;

      const subsystem = subsystems.find(s =>
        s.name.toLowerCase().includes(knowledge.category) ||
        knowledge.category.includes(s.name.toLowerCase())
      );

      if (subsystem) {
        const penalty = alarm.severity === "critical" ? 25 :
          alarm.severity === "fault" ? 15 :
          alarm.severity === "warning" ? 5 : 2;
        subsystem.health = Math.max(0, subsystem.health - penalty);
        subsystem.alerts.push(`${alarm.alarm_code}: ${alarm.message}`);
        if (subsystem.health < 80) subsystem.trend = "degrading";
      }
    }

    return subsystems;
  }

  private static predictFailures(
    alarms: MachineAlarm[],
    maintenance: MachineHealthStatus["maintenance_due"],
    sensorData?: Record<string, number>
  ): MachineHealthStatus["predicted_failures"] {
    const predictions: MachineHealthStatus["predicted_failures"] = [];

    // Predict based on alarm patterns
    const alarmCategories = new Map<string, number>();
    for (const alarm of alarms) {
      const knowledge = this.findAlarmKnowledge(alarm);
      if (knowledge) {
        alarmCategories.set(
          knowledge.category,
          (alarmCategories.get(knowledge.category) ?? 0) + 1
        );
      }
    }

    for (const [category, count] of alarmCategories) {
      if (count >= 3) {
        predictions.push({
          component: category.charAt(0).toUpperCase() + category.slice(1),
          probability: Math.min(0.8, count * 0.15),
          estimated_time_to_failure: count >= 5 ? "Days" : "Weeks",
          impact: `${category} failure will cause machine downtime`,
        });
      }
    }

    // Predict based on overdue maintenance
    for (const maint of maintenance.filter(m => m.urgency === "overdue")) {
      predictions.push({
        component: maint.task.split(" ")[0],
        probability: 0.4,
        estimated_time_to_failure: "Weeks",
        impact: `Delayed ${maint.task} may lead to component failure`,
      });
    }

    return predictions.sort((a, b) => b.probability - a.probability);
  }
}

// Export singleton
export const diagnosticReasoningEngine = new DiagnosticReasoningEngine();

// ============================================================================
// DISPATCH SHIM — prism_intelligence:diagnose_failure (INTEL-OLLAMA-OBSIDIAN-MS0/P5-U05)
// ============================================================================

/**
 * Normalize a free-form symptom entry (string | partial object) into a Symptom.
 * Strings become operator-observed symptoms at full confidence; objects keep
 * any provided fields and fall back to safe defaults.
 */
function normalizeSymptom(raw: unknown, idx: number): Symptom {
  if (typeof raw === "string") {
    return {
      id: `sym-${idx}`,
      description: raw,
      observed: true,
      confidence: 1,
      source: "operator",
    };
  }
  const o = (raw ?? {}) as Partial<Symptom> & { description?: string };
  return {
    id: o.id ?? `sym-${idx}`,
    description: String(o.description ?? ""),
    observed: o.observed ?? true,
    confidence: typeof o.confidence === "number" ? o.confidence : 1,
    source: o.source ?? "operator",
  };
}

/**
 * Dispatch entry for `prism_intelligence:diagnose_failure`.
 *
 * Routes to {@link DiagnosticReasoningEngine.diagnose} when an alarm is supplied
 * in `context.alarm`, otherwise to
 * {@link DiagnosticReasoningEngine.diagnoseFromSymptoms}. This is the rich
 * alarm-knowledge-base / fault-tree flavor — distinct from the simpler
 * IntelligenceEngine `failure_diagnose` symptom matcher.
 *
 * @param action  Dispatcher action name (only "diagnose_failure" is handled).
 * @param params  `{ symptoms, context }` — symptoms is string[] | Symptom[];
 *                context may carry `{ alarm, machine_type }`.
 * @returns DiagnosisResult (primary + differentials + repair actions).
 */
export function diagnosticReasoning(
  action: string,
  params: Record<string, unknown>,
): DiagnosisResult {
  if (action !== "diagnose_failure") {
    throw new Error(
      `[DiagnosticReasoningEngine] unsupported action '${action}' (only 'diagnose_failure')`,
    );
  }

  const rawSymptoms = params.symptoms;
  const symptomList: unknown[] = Array.isArray(rawSymptoms)
    ? rawSymptoms
    : rawSymptoms != null
      ? [rawSymptoms]
      : [];
  const symptoms = symptomList.map((s, i) => normalizeSymptom(s, i));

  const context = (params.context ?? {}) as {
    alarm?: MachineAlarm;
    machine_type?: string;
  };

  if (context.alarm && context.alarm.alarm_code) {
    return DiagnosticReasoningEngine.diagnose(context.alarm, symptoms);
  }

  if (symptoms.length === 0) {
    throw new Error(
      "[DiagnosticReasoningEngine] diagnose_failure requires non-empty 'symptoms' or a 'context.alarm'",
    );
  }

  const machineType = context.machine_type ?? "unknown";
  return DiagnosticReasoningEngine.diagnoseFromSymptoms(machineType, symptoms);
}
