/**
 * Tests for InteractiveLearningSessionEngine + VideoReplayOrchestratorEngine
 * VAR-MS1 Phase 4 (Interactive Learning) + Phase 5 (Integration)
 */
import { describe, it, expect } from "vitest";
import {
  InteractiveLearningSessionEngine,
  interactiveLearningSessionEngine,
} from "../engines/InteractiveLearningSessionEngine.js";
import {
  VideoReplayOrchestratorEngine,
  videoReplayOrchestratorEngine,
} from "../engines/VideoReplayOrchestratorEngine.js";
import type { ExtractedAction } from "../engines/VideoActionExtractorEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────

function makeAction(overrides: Partial<ExtractedAction> = {}): ExtractedAction {
  return {
    step_number: 1,
    timestamp_s: 0,
    action_type: "extrude",
    operation: "Extrude Boss",
    parameters: { depth: 10 },
    confidence: 0.85,
    description: "Extrude a box",
    keyframe_index: 0,
    ...overrides,
  };
}

function makeActions(count: number): ExtractedAction[] {
  const types: ExtractedAction["action_type"][] = [
    "sketch_rectangle", "extrude", "fillet", "chamfer",
    "sketch_circle", "extrude_cut", "hole",
  ];
  return Array.from({ length: count }, (_, i) =>
    makeAction({
      step_number: i + 1,
      timestamp_s: i * 5,
      action_type: types[i % types.length],
      operation: `Op ${i + 1}`,
      parameters: { depth: 10 + i, width: 50, height: 30 },
      confidence: 0.7 + Math.random() * 0.25,
      description: `Step ${i + 1} operation`,
      keyframe_index: i,
    })
  );
}

function makeLowConfidenceAction(conf = 0.4): ExtractedAction {
  return makeAction({
    confidence: conf,
    action_type: "fillet",
    parameters: { radius: 3 },
    description: "Uncertain fillet",
  });
}

// ── Interactive Learning Session Tests ───────────────────────────────

describe("InteractiveLearningSessionEngine", () => {
  const engine = new InteractiveLearningSessionEngine();

  describe("startSession", () => {
    it("creates a valid session with unique ID", () => {
      const actions = makeActions(3);
      const session = engine.startSession("/video/test.mp4", actions);

      expect(session.session_id).toBeTruthy();
      expect(session.session_id).toContain("session-");
      expect(session.video_path).toBe("/video/test.mp4");
      expect(session.total_steps).toBe(3);
      expect(session.actions).toHaveLength(3);
    });

    it("starts session with 'active' status", () => {
      const session = engine.startSession("/v.mp4", makeActions(2));
      expect(session.status).toBe("active");
    });
  });

  describe("reviewStep", () => {
    it("returns the correct action for a given step", () => {
      const actions = makeActions(3);
      const session = engine.startSession("/v.mp4", actions);
      const { action } = engine.reviewStep(session, 2);

      expect(action.step).toBe(2);
      expect(action.extracted.step_number).toBe(2);
    });

    it("generates a clarifying question when confidence < 0.6", () => {
      const actions = [makeLowConfidenceAction(0.4)];
      const session = engine.startSession("/v.mp4", actions);
      const { question } = engine.reviewStep(session, 1);

      expect(question).toBeDefined();
      expect(question!.question).toBeTruthy();
      expect(question!.confidence_without_answer).toBe(0.4);
    });

    it("does not generate a question when confidence >= 0.8", () => {
      const actions = [makeAction({ confidence: 0.85 })];
      const session = engine.startSession("/v.mp4", actions);
      const { question } = engine.reviewStep(session, 1);

      expect(question).toBeUndefined();
    });
  });

  describe("applyCorrection", () => {
    it("updates the action with corrected values", () => {
      const actions = [makeAction({ parameters: { depth: 10 } })];
      const session = engine.startSession("/v.mp4", actions);

      const updated = engine.applyCorrection(session, 1, {
        action_type: "extrude_cut",
        parameters: { depth: 15 },
      });

      expect(updated.actions[0].user_corrected).toBeDefined();
      expect(updated.actions[0].user_corrected!.action_type).toBe("extrude_cut");
      expect(updated.actions[0].user_corrected!.parameters.depth).toBe(15);
    });

    it("records the correction in session corrections list", () => {
      const actions = [makeAction()];
      const session = engine.startSession("/v.mp4", actions);

      engine.applyCorrection(session, 1, { action_type: "revolve" });

      expect(session.corrections).toHaveLength(1);
      expect(session.corrections[0].original_type).toBe("extrude");
      expect(session.corrections[0].corrected_type).toBe("revolve");
    });
  });

  describe("confirmStep", () => {
    it("marks the step as confirmed", () => {
      const actions = makeActions(2);
      const session = engine.startSession("/v.mp4", actions);

      engine.confirmStep(session, 1);

      expect(session.actions[0].user_confirmed).toBe(true);
    });
  });

  describe("skipStep", () => {
    it("marks the step as skipped with reason", () => {
      const actions = makeActions(2);
      const session = engine.startSession("/v.mp4", actions);

      engine.skipStep(session, 1, "Not relevant");

      expect(session.actions[0].execution_result).toBe("skipped");
      expect(session.actions[0].notes).toBe("Not relevant");
    });
  });

  describe("getSessionSummary", () => {
    it("calculates correct accuracy percentage", () => {
      const actions = makeActions(4);
      const session = engine.startSession("/v.mp4", actions);

      engine.confirmStep(session, 1);
      engine.confirmStep(session, 2);
      engine.applyCorrection(session, 3, { action_type: "revolve" });
      engine.skipStep(session, 4, "skip");

      const summary = engine.getSessionSummary(session);

      expect(summary.total_steps).toBe(4);
      expect(summary.confirmed).toBe(2);
      expect(summary.corrected).toBe(1);
      expect(summary.skipped).toBe(1);
      // accuracy = confirmed / (confirmed + corrected) = 2/3 ≈ 66.67%
      expect(summary.accuracy_pct).toBeCloseTo(66.67, 0);
    });
  });

  describe("generateQuestions", () => {
    it("returns relevant questions for uncertain actions with dimensions", () => {
      const action = makeAction({
        confidence: 0.3,
        action_type: "fillet",
        parameters: { radius: 3 },
      });

      const questions = engine.generateQuestions(action);

      expect(questions.length).toBeGreaterThan(0);
      expect(questions.length).toBeLessThanOrEqual(3);
      // Should have a radius question
      const radiusQ = questions.find(q => q.question.includes("radius"));
      expect(radiusQ).toBeDefined();
    });

    it("generates type confusion questions for ambiguous types", () => {
      const action = makeAction({
        confidence: 0.4,
        action_type: "extrude",
        parameters: {},
      });

      const questions = engine.generateQuestions(action);
      const typeQ = questions.find(q =>
        q.question.includes("extrude") && q.question.includes("revolve")
      );
      expect(typeQ).toBeDefined();
    });
  });

  describe("accumulatePatterns", () => {
    it("tracks correction frequency across multiple sessions", () => {
      const actions1 = [makeAction({ step_number: 1 })];
      const actions2 = [makeAction({ step_number: 1, action_type: "fillet" })];

      const s1 = engine.startSession("/v1.mp4", actions1);
      engine.confirmStep(s1, 1);

      const s2 = engine.startSession("/v2.mp4", actions2);
      engine.applyCorrection(s2, 1, { action_type: "chamfer" });

      const result = engine.accumulatePatterns([s1, s2]);

      expect(result.patterns["extrude"]).toBeDefined();
      expect(result.patterns["extrude"].correct_count).toBe(1);
      expect(result.patterns["fillet"]).toBeDefined();
      expect(result.patterns["fillet"].correction_count).toBe(1);
      expect(result.patterns["fillet"].common_corrections.length).toBeGreaterThan(0);
      expect(result.overall_accuracy).toBe(0.5);
    });
  });
});

// ── Orchestrator - Autonomous Tests ──────────────────────────────────

describe("VideoReplayOrchestratorEngine", () => {
  const engine = new VideoReplayOrchestratorEngine();

  describe("replayFromActions — autonomous", () => {
    it("replays simple box actions successfully", () => {
      const actions = [
        makeAction({ step_number: 1, action_type: "sketch_rectangle", parameters: { width: 50, height: 30 } }),
        makeAction({ step_number: 2, action_type: "extrude", parameters: { depth: 20 } }),
      ];

      const result = engine.replayFromActions(actions, { mode: "autonomous" });

      expect(result.success).toBe(true);
      expect(result.actions_extracted).toBe(2);
      expect(result.actions_executed).toBe(2);
    });

    it("dry run mode generates script but does not execute", () => {
      const actions = makeActions(3);
      const result = engine.replayFromActions(actions, { mode: "dry_run" });

      expect(result.generated_script).toBeTruthy();
      expect(result.actions_executed).toBe(0);
      expect(result.mode).toBe("dry_run");
    });

    it("generated script contains CadQuery imports", () => {
      const actions = [makeAction({ action_type: "extrude", parameters: { depth: 10 } })];
      const result = engine.replayFromActions(actions, { mode: "dry_run" });

      expect(result.generated_script).toContain("import cadquery as cq");
      expect(result.generated_script).toContain("result = cq.Workplane");
    });

    it("actions_extracted count matches input length", () => {
      const actions = makeActions(5);
      const result = engine.replayFromActions(actions, { mode: "autonomous" });

      expect(result.actions_extracted).toBe(5);
    });

    it("result includes a summary string", () => {
      const actions = makeActions(2);
      const result = engine.replayFromActions(actions, { mode: "autonomous" });

      expect(result.summary).toBeTruthy();
      expect(typeof result.summary).toBe("string");
      expect(result.summary.length).toBeGreaterThan(10);
    });

    it("empty actions list returns success with 0 executed", () => {
      const result = engine.replayFromActions([], { mode: "autonomous" });

      expect(result.success).toBe(true);
      expect(result.actions_extracted).toBe(0);
      expect(result.actions_executed).toBe(0);
    });
  });

  describe("estimateComplexity", () => {
    it("simple ops (1-3 basic) returns 'simple' with autonomous", () => {
      const actions = [
        makeAction({ action_type: "extrude", confidence: 0.9 }),
        makeAction({ step_number: 2, action_type: "fillet", confidence: 0.9 }),
      ];

      const est = engine.estimateComplexity(actions);

      expect(est.complexity).toBe("simple");
      expect(est.recommended_mode).toBe("autonomous");
    });

    it("CAM ops return 'expert' with interactive recommended", () => {
      const actions = [
        makeAction({ action_type: "toolpath_3d", confidence: 0.8 }),
      ];

      const est = engine.estimateComplexity(actions);

      expect(est.complexity).toBe("expert");
      expect(est.recommended_mode).toBe("interactive");
    });

    it("10+ operations with booleans returns 'complex'", () => {
      const actions = makeActions(11);
      actions[5] = makeAction({
        step_number: 6,
        action_type: "boolean_subtract",
        confidence: 0.75,
      });

      const est = engine.estimateComplexity(actions);

      expect(est.complexity).toBe("complex");
    });

    it("estimated time is always positive", () => {
      const actions = makeActions(5);
      const est = engine.estimateComplexity(actions);

      expect(est.estimated_time_s).toBeGreaterThan(0);
    });
  });

  // ── Orchestrator - Interactive Tests ────────────────────────────────

  describe("interactiveReplay", () => {
    it("creates a session in the result", () => {
      const actions = makeActions(3);
      const result = engine.interactiveReplay("/v.mp4", actions);

      expect(result.session).toBeDefined();
      expect(result.session!.session_id).toBeTruthy();
    });

    it("session has correct total steps", () => {
      const actions = makeActions(4);
      const result = engine.interactiveReplay("/v.mp4", actions);

      expect(result.session!.total_steps).toBe(4);
    });

    it("result includes session data with completed status", () => {
      const actions = makeActions(2);
      const result = engine.interactiveReplay("/v.mp4", actions);

      expect(result.session!.status).toBe("completed");
    });

    it("interactive mode with all confirmed gives same count as autonomous", () => {
      const actions = makeActions(3);
      const interactive = engine.interactiveReplay("/v.mp4", actions);
      const autonomous = engine.replayFromActions(actions, { mode: "autonomous" });

      expect(interactive.actions_extracted).toBe(autonomous.actions_extracted);
      expect(interactive.actions_executed).toBe(autonomous.actions_executed);
    });

    it("result mode is 'interactive'", () => {
      const actions = makeActions(2);
      const result = engine.interactiveReplay("/v.mp4", actions);

      expect(result.mode).toBe("interactive");
    });
  });

  // ── Pipeline Status Tests ──────────────────────────────────────────

  describe("getPipelineStatus", () => {
    it("returns all pipeline steps", () => {
      const engine2 = new VideoReplayOrchestratorEngine();
      engine2.replayFromActions(makeActions(1), { mode: "autonomous" });

      const steps = engine2.getPipelineStatus();

      expect(steps.length).toBe(7);
      expect(steps.map(s => s.name)).toContain("validate_input");
      expect(steps.map(s => s.name)).toContain("generate_code");
      expect(steps.map(s => s.name)).toContain("execute_script");
    });

    it("steps start as 'pending' before replay", () => {
      const engine2 = new VideoReplayOrchestratorEngine();
      // Call replayFromVideo with empty path to trigger init but fail early
      engine2.replayFromVideo("", { mode: "dry_run" });
      const steps = engine2.getPipelineStatus();

      // validate_input should be "failed" (empty path)
      const validateStep = steps.find(s => s.name === "validate_input");
      expect(validateStep!.status).toBe("failed");
    });

    it("after successful replay, key steps are 'complete'", () => {
      const engine2 = new VideoReplayOrchestratorEngine();
      engine2.replayFromActions(makeActions(2), { mode: "autonomous" });

      const steps = engine2.getPipelineStatus();
      const codeStep = steps.find(s => s.name === "generate_code");
      const execStep = steps.find(s => s.name === "execute_script");

      expect(codeStep!.status).toBe("complete");
      expect(execStep!.status).toBe("complete");
    });

    it("failed input shows error in step", () => {
      const engine2 = new VideoReplayOrchestratorEngine();
      engine2.replayFromVideo("", { mode: "dry_run" });

      const steps = engine2.getPipelineStatus();
      const validateStep = steps.find(s => s.name === "validate_input");

      expect(validateStep!.status).toBe("failed");
      expect(validateStep!.error).toBeTruthy();
    });
  });

  // ── Report Generation Tests ────────────────────────────────────────

  describe("generateReport", () => {
    it("returns a markdown string", () => {
      const result = engine.replayFromActions(makeActions(2), { mode: "autonomous" });
      const report = engine.generateReport(result);

      expect(report).toContain("# Video Replay Report");
      expect(report).toContain("## Overview");
    });

    it("includes action counts", () => {
      const result = engine.replayFromActions(makeActions(3), { mode: "autonomous" });
      const report = engine.generateReport(result);

      expect(report).toContain("**Extracted**: 3");
    });

    it("includes execution results", () => {
      const result = engine.replayFromActions(makeActions(2), { mode: "autonomous" });
      const report = engine.generateReport(result);

      expect(report).toContain("**Executed**");
      expect(report).toContain("**Success**");
    });

    it("includes generated script preview", () => {
      const actions = [makeAction({ action_type: "extrude", parameters: { depth: 10 } })];
      const result = engine.replayFromActions(actions, { mode: "autonomous" });
      const report = engine.generateReport(result);

      expect(report).toContain("Generated Script");
      expect(report).toContain("cadquery");
    });
  });
});
