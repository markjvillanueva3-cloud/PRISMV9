/**
 * InteractiveLearningSessionEngine — Interactive CAD Video Tutorial Learning
 * Manages sessions where a user guides the system through extracted video actions,
 * reviewing, correcting mistakes, and teaching the system to improve over time.
 *
 * Pipeline: extracted actions → user review → corrections → pattern accumulation
 */
import { log } from "../utils/Logger.js";
import type { ExtractedAction, CADActionType } from "./VideoActionExtractorEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export interface LearningSession {
  session_id: string;
  video_path: string;
  started_at: string;
  status: "active" | "paused" | "completed" | "abandoned";
  current_step: number;
  total_steps: number;
  actions: LearningAction[];
  corrections: Correction[];
  confidence_improvements: { action_type: string; before: number; after: number }[];
}

export interface LearningAction {
  step: number;
  extracted: ExtractedAction;
  user_confirmed: boolean;
  user_corrected?: ExtractedAction;
  executed: boolean;
  execution_result?: "pass" | "fail" | "skipped";
  notes?: string;
}

export interface Correction {
  step: number;
  original_type: string;
  corrected_type: string;
  original_params: Record<string, any>;
  corrected_params: Record<string, any>;
  reason?: string;
}

export interface ClarifyingQuestion {
  question: string;
  context: string;
  options?: string[];
  default_answer?: string;
  confidence_without_answer: number;
}

export interface SessionSummary {
  total_steps: number;
  confirmed: number;
  corrected: number;
  skipped: number;
  accuracy_pct: number;
  patterns_learned: string[];
}

export interface AccumulatedPatterns {
  patterns: Record<string, {
    correct_count: number;
    correction_count: number;
    common_corrections: string[];
  }>;
  overall_accuracy: number;
}

// ── Dimension/parameter question templates ──────────────────────────

const DIMENSION_PARAMS = ["depth", "height", "width", "radius", "diameter", "length", "angle", "offset"];

const TYPE_CONFUSION_PAIRS: [CADActionType, CADActionType][] = [
  ["extrude", "revolve"],
  ["extrude", "extrude_cut"],
  ["fillet", "chamfer"],
  ["boolean_union", "boolean_subtract"],
  ["sketch_line", "sketch_spline"],
  ["sketch_arc", "sketch_circle"],
  ["sweep", "loft"],
  ["pattern_linear", "pattern_circular"],
  ["toolpath_2d", "toolpath_3d"],
];

// ── Engine ──────────────────────────────────────────────────────────

export class InteractiveLearningSessionEngine {
  /**
   * Create a new learning session from extracted actions
   */
  startSession(videoPath: string, actions: ExtractedAction[]): LearningSession {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const learningActions: LearningAction[] = actions.map((a, i) => ({
      step: i + 1,
      extracted: { ...a },
      user_confirmed: false,
      executed: false,
    }));

    const session: LearningSession = {
      session_id: sessionId,
      video_path: videoPath,
      started_at: new Date().toISOString(),
      status: "active",
      current_step: 1,
      total_steps: actions.length,
      actions: learningActions,
      corrections: [],
      confidence_improvements: [],
    };

    log.info(`[InteractiveLearning] Session ${sessionId} started with ${actions.length} actions`);
    return session;
  }

  /**
   * Present a step for user review, optionally generating a clarifying question
   */
  reviewStep(
    session: LearningSession,
    stepNumber: number
  ): { action: LearningAction; question?: ClarifyingQuestion } {
    const action = session.actions.find(a => a.step === stepNumber);
    if (!action) {
      throw new Error(`Step ${stepNumber} not found in session ${session.session_id}`);
    }

    let question: ClarifyingQuestion | undefined;
    if (action.extracted.confidence < 0.6) {
      const questions = this.generateQuestions(action.extracted);
      if (questions.length > 0) {
        question = questions[0];
      }
    }

    return { action, question };
  }

  /**
   * Apply a user correction to a specific step
   */
  applyCorrection(
    session: LearningSession,
    stepNumber: number,
    correction: Partial<ExtractedAction>
  ): LearningSession {
    const actionIdx = session.actions.findIndex(a => a.step === stepNumber);
    if (actionIdx === -1) {
      throw new Error(`Step ${stepNumber} not found in session ${session.session_id}`);
    }

    const action = session.actions[actionIdx];
    const original = action.extracted;

    // Build corrected action
    const corrected: ExtractedAction = { ...original, ...correction };
    action.user_corrected = corrected;
    action.user_confirmed = false;

    // Record correction
    const correctionRecord: Correction = {
      step: stepNumber,
      original_type: original.action_type,
      corrected_type: corrected.action_type,
      original_params: { ...original.parameters },
      corrected_params: { ...corrected.parameters },
      reason: `User corrected step ${stepNumber}`,
    };
    session.corrections.push(correctionRecord);

    // Track confidence improvement
    if (correction.confidence && correction.confidence > original.confidence) {
      session.confidence_improvements.push({
        action_type: original.action_type,
        before: original.confidence,
        after: correction.confidence,
      });
    }

    // Advance step
    if (session.current_step === stepNumber && stepNumber < session.total_steps) {
      session.current_step = stepNumber + 1;
    }

    log.info(`[InteractiveLearning] Correction applied at step ${stepNumber}: ${original.action_type} → ${corrected.action_type}`);
    return session;
  }

  /**
   * Skip a step with optional reason
   */
  skipStep(session: LearningSession, stepNumber: number, reason?: string): LearningSession {
    const action = session.actions.find(a => a.step === stepNumber);
    if (!action) {
      throw new Error(`Step ${stepNumber} not found`);
    }

    action.execution_result = "skipped";
    action.notes = reason || "Skipped by user";

    if (session.current_step === stepNumber && stepNumber < session.total_steps) {
      session.current_step = stepNumber + 1;
    }

    log.info(`[InteractiveLearning] Step ${stepNumber} skipped: ${reason || "no reason"}`);
    return session;
  }

  /**
   * User confirms the extracted action is correct
   */
  confirmStep(session: LearningSession, stepNumber: number): LearningSession {
    const action = session.actions.find(a => a.step === stepNumber);
    if (!action) {
      throw new Error(`Step ${stepNumber} not found`);
    }

    action.user_confirmed = true;

    if (session.current_step === stepNumber && stepNumber < session.total_steps) {
      session.current_step = stepNumber + 1;
    }

    log.info(`[InteractiveLearning] Step ${stepNumber} confirmed`);
    return session;
  }

  /**
   * Generate context-appropriate clarifying questions for uncertain extractions
   */
  generateQuestions(action: ExtractedAction): ClarifyingQuestion[] {
    const questions: ClarifyingQuestion[] = [];

    // Dimension questions — check each parameter for numeric values
    for (const param of DIMENSION_PARAMS) {
      if (action.parameters[param] !== undefined) {
        const val = action.parameters[param];
        questions.push({
          question: `The ${param} appears to be ${val}mm — is this correct?`,
          context: `Extracted from ${action.action_type} at step ${action.step_number}`,
          options: ["Yes", `No, it should be different`],
          default_answer: "Yes",
          confidence_without_answer: action.confidence,
        });
      }
    }

    // Type confusion questions — check if this action type has a common confusion pair
    for (const [typeA, typeB] of TYPE_CONFUSION_PAIRS) {
      if (action.action_type === typeA || action.action_type === typeB) {
        const other = action.action_type === typeA ? typeB : typeA;
        questions.push({
          question: `Is this operation a ${action.action_type} or a ${other}?`,
          context: `Low confidence (${(action.confidence * 100).toFixed(0)}%) on action type classification`,
          options: [action.action_type, other],
          default_answer: action.action_type,
          confidence_without_answer: action.confidence,
        });
        break; // Only one type question
      }
    }

    // Generic parameter question for low confidence with no dimensions
    if (questions.length === 0 && action.confidence < 0.5) {
      questions.push({
        question: `I detected a "${action.action_type}" operation — can you confirm the parameters?`,
        context: `Very low confidence (${(action.confidence * 100).toFixed(0)}%) on extraction`,
        confidence_without_answer: action.confidence,
      });
    }

    // Cap at 3 most relevant
    return questions.slice(0, 3);
  }

  /**
   * Summarize session results
   */
  getSessionSummary(session: LearningSession): SessionSummary {
    let confirmed = 0;
    let corrected = 0;
    let skipped = 0;

    for (const action of session.actions) {
      if (action.execution_result === "skipped") {
        skipped++;
      } else if (action.user_corrected) {
        corrected++;
      } else if (action.user_confirmed) {
        confirmed++;
      }
    }

    const reviewed = confirmed + corrected;
    const accuracy_pct = reviewed > 0 ? (confirmed / reviewed) * 100 : 0;

    // Extract patterns from corrections
    const patterns_learned: string[] = [];
    const correctionsByType = new Map<string, number>();
    for (const c of session.corrections) {
      if (c.original_type !== c.corrected_type) {
        const key = `${c.original_type} → ${c.corrected_type}`;
        correctionsByType.set(key, (correctionsByType.get(key) || 0) + 1);
      }
      // Check for parameter adjustments
      for (const param of Object.keys(c.corrected_params)) {
        const orig = c.original_params[param];
        const corr = c.corrected_params[param];
        if (typeof orig === "number" && typeof corr === "number" && orig !== corr) {
          const pctDiff = ((corr - orig) / orig) * 100;
          if (Math.abs(pctDiff) > 5) {
            patterns_learned.push(`${param} often needs ${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(0)}% adjustment`);
          }
        }
      }
    }

    for (const [key, count] of correctionsByType) {
      if (count >= 1) {
        patterns_learned.push(`Common misclassification: ${key} (${count}x)`);
      }
    }

    return {
      total_steps: session.total_steps,
      confirmed,
      corrected,
      skipped,
      accuracy_pct: Math.round(accuracy_pct * 100) / 100,
      patterns_learned,
    };
  }

  /**
   * Aggregate learning across multiple sessions
   */
  accumulatePatterns(sessions: LearningSession[]): AccumulatedPatterns {
    const patterns: Record<string, {
      correct_count: number;
      correction_count: number;
      common_corrections: string[];
    }> = {};

    let totalConfirmed = 0;
    let totalCorrected = 0;

    for (const session of sessions) {
      for (const action of session.actions) {
        const type = action.extracted.action_type;
        if (!patterns[type]) {
          patterns[type] = { correct_count: 0, correction_count: 0, common_corrections: [] };
        }

        if (action.user_confirmed && !action.user_corrected) {
          patterns[type].correct_count++;
          totalConfirmed++;
        } else if (action.user_corrected) {
          patterns[type].correction_count++;
          totalCorrected++;

          // Track what it was corrected to
          const correctedType = action.user_corrected.action_type;
          if (correctedType !== type) {
            const desc = `Often corrected to ${correctedType}`;
            if (!patterns[type].common_corrections.includes(desc)) {
              patterns[type].common_corrections.push(desc);
            }
          }

          // Track parameter corrections
          for (const param of Object.keys(action.user_corrected.parameters)) {
            const orig = action.extracted.parameters[param];
            const corr = action.user_corrected.parameters[param];
            if (typeof orig === "number" && typeof corr === "number" && orig !== corr) {
              const pctDiff = ((corr - orig) / orig) * 100;
              const desc = `${param} often needs ${pctDiff > 0 ? "+" : ""}${pctDiff.toFixed(0)}% adjustment`;
              if (!patterns[type].common_corrections.includes(desc)) {
                patterns[type].common_corrections.push(desc);
              }
            }
          }
        }
      }
    }

    const total = totalConfirmed + totalCorrected;
    const overall_accuracy = total > 0 ? totalConfirmed / total : 0;

    return { patterns, overall_accuracy };
  }
}

export const interactiveLearningSessionEngine = new InteractiveLearningSessionEngine();
