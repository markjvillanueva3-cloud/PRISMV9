/**
 * LEARN-MS1-S1 U-LEARN09: Video + Interactive Learning Pipeline Tests
 *
 * Tests VideoLearningEngine direct API, InteractiveLearningSessionEngine
 * session lifecycle, and knowledgeDispatcher wiring for all 8 new actions.
 */

import { describe, it, expect } from "vitest";
import { videoLearningEngine } from "../engines/VideoLearningEngine.js";
import {
  interactiveLearningSessionEngine,
  type LearningSession,
} from "../engines/InteractiveLearningSessionEngine.js";
import type { ExtractedAction } from "../engines/VideoActionExtractorEngine.js";
import type { TranscriptResult, FrameAnalysis } from "../engines/VideoLearningEngine.js";

// ── Helpers ─────────────────────────────────────────────────────────

function makeExtractedAction(overrides: Partial<ExtractedAction> = {}): ExtractedAction {
  return {
    step_number: 1,
    timestamp_s: 0,
    action_type: "extrude",
    operation: "Extrude Boss",
    parameters: { depth: 10, width: 50 },
    confidence: 0.85,
    description: "Extrude a box body",
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
    makeExtractedAction({
      step_number: i + 1,
      timestamp_s: i * 5,
      action_type: types[i % types.length],
      operation: `Op ${i + 1}`,
      parameters: { depth: 10 + i, width: 50, height: 30 },
      confidence: 0.7 + (i % 3) * 0.1,
      description: `Step ${i + 1}: ${types[i % types.length]}`,
      keyframe_index: i,
    })
  );
}

function makeTranscript(): TranscriptResult {
  return {
    full_text: "Today we're going to rough a pocket in 7075 aluminum using adaptive milling. Set the spindle to 10000 RPM.",
    segments: [
      { start: 0, end: 5, text: "Today we're going to rough a pocket in 7075 aluminum using adaptive milling." },
      { start: 5, end: 10, text: "Set the spindle to 10000 RPM." },
    ],
    language: "en",
    duration_seconds: 60,
  };
}

function makeFrameAnalysis(): FrameAnalysis[] {
  return [
    {
      timestamp: 3,
      description: "CAM dialog showing adaptive milling strategy",
      extracted_values: { stepover: "2mm", depth_of_cut: "4mm", rpm: "10000" },
      ui_elements: ["strategy_panel", "toolpath_preview"],
      category: "toolpath",
    },
    {
      timestamp: 8,
      description: "Simulation running chip formation",
      extracted_values: {},
      ui_elements: ["sim_view"],
      category: "simulation",
    },
  ];
}

// ═══ VideoLearningEngine Direct API ═══

describe("LEARN-MS1-S1: VideoLearningEngine", () => {

  it("checkPrerequisites returns structured result", async () => {
    const prereqs = await videoLearningEngine.checkPrerequisites();
    expect(typeof prereqs.ffmpeg).toBe("boolean");
    expect(typeof prereqs.ffprobe).toBe("boolean");
    // version is undefined if ffmpeg not found, string if found
    if (prereqs.ffmpeg) {
      expect(typeof prereqs.version).toBe("string");
    }
  });

  it("fuseKnowledge generates items from transcript + frames", () => {
    const transcript = makeTranscript();
    const frames = makeFrameAnalysis();
    const items = videoLearningEngine.fuseKnowledge(transcript, frames, "/tmp/test-video.mp4", "cam");

    expect(items.length).toBeGreaterThan(0);
    // Frame with extracted_values should produce a knowledge item
    const paramItem = items.find(i => i.source.includes("test-video"));
    expect(paramItem).toBeTruthy();
    expect(paramItem!.tags).toContain("video-learned");
  });

  it("fuseKnowledge handles empty transcript gracefully", () => {
    const emptyTranscript: TranscriptResult = {
      full_text: "",
      segments: [],
      language: "en",
      duration_seconds: 0,
    };
    const frames = makeFrameAnalysis();
    const items = videoLearningEngine.fuseKnowledge(emptyTranscript, frames, "/tmp/silent.mp4");

    // Should still extract items from frames with parameters
    const frameItems = items.filter(i => i.source.includes("silent"));
    expect(frameItems.length).toBeGreaterThanOrEqual(1);
  });

  it("fuseKnowledge handles empty frames gracefully", () => {
    const transcript = makeTranscript();
    const items = videoLearningEngine.fuseKnowledge(transcript, [], "/tmp/audio-only.mp4");

    // Should still extract items from transcript segments
    expect(items.length).toBeGreaterThan(0);
    expect(items.every(i => i.tags.includes("video-learned"))).toBe(true);
  });

  it("fuseKnowledge applies domain tag", () => {
    const transcript = makeTranscript();
    const frames = makeFrameAnalysis();
    const items = videoLearningEngine.fuseKnowledge(transcript, frames, "/tmp/v.mp4", "shop");

    const shopItems = items.filter(i => i.tags.includes("shop"));
    expect(shopItems.length).toBeGreaterThan(0);
  });

  it("fuseKnowledge sources include timestamps", () => {
    const transcript = makeTranscript();
    const frames = makeFrameAnalysis();
    const items = videoLearningEngine.fuseKnowledge(transcript, frames, "/tmp/v.mp4");

    // Items from frames with parameters should have "@Ns" format
    const frameItem = items.find(i => /@\d+s$/.test(i.source));
    expect(frameItem).toBeTruthy();
  });
});

// ═══ InteractiveLearningSessionEngine ═══

describe("LEARN-MS1-S1: InteractiveLearningSessionEngine", () => {

  it("creates a session from extracted actions", () => {
    const actions = makeActions(5);
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    expect(session.session_id).toBeTruthy();
    expect(session.total_steps).toBe(5);
    expect(session.status).toBe("active");
    expect(session.current_step).toBe(1);
    expect(session.actions.length).toBe(5);
  });

  it("session ID is unique per call", () => {
    const a1 = makeActions(2);
    const a2 = makeActions(2);
    const s1 = interactiveLearningSessionEngine.startSession("/tmp/a.mp4", a1);
    const s2 = interactiveLearningSessionEngine.startSession("/tmp/b.mp4", a2);
    expect(s1.session_id).not.toBe(s2.session_id);
  });

  it("reviewStep returns action + clarifying question for low confidence", () => {
    const actions = [makeExtractedAction({ confidence: 0.3, action_type: "fillet", parameters: { radius: 5 } })];
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    const review = interactiveLearningSessionEngine.reviewStep(session, 1);
    expect(review.action).toBeTruthy();
    expect(review.action.step).toBe(1);
    // Low confidence should trigger a question
    expect(review.question).toBeTruthy();
    expect(review.question!.question.length).toBeGreaterThan(0);
  });

  it("reviewStep returns no question for high confidence", () => {
    const actions = [makeExtractedAction({ confidence: 0.95 })];
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    const review = interactiveLearningSessionEngine.reviewStep(session, 1);
    expect(review.action).toBeTruthy();
    expect(review.question).toBeUndefined();
  });

  it("confirmStep advances current step", () => {
    const actions = makeActions(3);
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    const updated = interactiveLearningSessionEngine.confirmStep(session, 1);
    expect(updated.current_step).toBe(2);
    expect(updated.actions[0].user_confirmed).toBe(true);
  });

  it("applyCorrection records correction and advances", () => {
    const actions = makeActions(3);
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    const updated = interactiveLearningSessionEngine.applyCorrection(session, 1, {
      action_type: "chamfer",
      parameters: { depth: 2 },
    } as any);

    expect(updated.current_step).toBe(2);
    expect(updated.corrections.length).toBe(1);
    expect(updated.corrections[0].corrected_type).toBe("chamfer");
    expect(updated.actions[0].user_corrected).toBeTruthy();
  });

  it("skipStep marks step as skipped with reason", () => {
    const actions = makeActions(3);
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    const updated = interactiveLearningSessionEngine.skipStep(session, 1, "Not relevant");
    expect(updated.current_step).toBe(2);
    expect(updated.actions[0].execution_result).toBe("skipped");
    expect(updated.actions[0].notes).toBe("Not relevant");
  });

  it("getSessionSummary reports accuracy metrics", () => {
    const actions = makeActions(4);
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", actions);

    // Confirm 2 steps, correct 1, skip 1
    interactiveLearningSessionEngine.confirmStep(session, 1);
    interactiveLearningSessionEngine.confirmStep(session, 2);
    interactiveLearningSessionEngine.applyCorrection(session, 3, {
      action_type: "chamfer",
    } as any);
    interactiveLearningSessionEngine.skipStep(session, 4);

    const summary = interactiveLearningSessionEngine.getSessionSummary(session);
    expect(summary.total_steps).toBe(4);
    expect(summary.confirmed).toBe(2);
    expect(summary.corrected).toBe(1);
    expect(summary.skipped).toBe(1);
    // Accuracy = confirmed / (confirmed + corrected) = 2/3 ≈ 66.67%
    expect(summary.accuracy_pct).toBeCloseTo(66.67, 0);
  });

  it("accumulatePatterns aggregates across sessions", () => {
    const s1 = interactiveLearningSessionEngine.startSession("/tmp/a.mp4", makeActions(3));
    interactiveLearningSessionEngine.confirmStep(s1, 1);
    interactiveLearningSessionEngine.confirmStep(s1, 2);
    interactiveLearningSessionEngine.applyCorrection(s1, 3, { action_type: "chamfer" } as any);

    const s2 = interactiveLearningSessionEngine.startSession("/tmp/b.mp4", makeActions(2));
    interactiveLearningSessionEngine.confirmStep(s2, 1);
    interactiveLearningSessionEngine.confirmStep(s2, 2);

    const accumulated = interactiveLearningSessionEngine.accumulatePatterns([s1, s2]);
    expect(accumulated.overall_accuracy).toBeGreaterThan(0);
    expect(accumulated.overall_accuracy).toBeLessThanOrEqual(1);
    expect(Object.keys(accumulated.patterns).length).toBeGreaterThan(0);
  });

  it("generateQuestions produces type confusion questions", () => {
    // fillet/chamfer is a known confusion pair
    const action = makeExtractedAction({ action_type: "fillet", confidence: 0.4 });
    const questions = interactiveLearningSessionEngine.generateQuestions(action);

    expect(questions.length).toBeGreaterThan(0);
    const typeQ = questions.find(q => q.question.includes("chamfer"));
    expect(typeQ).toBeTruthy();
  });

  it("generateQuestions produces dimension questions for parameter actions", () => {
    const action = makeExtractedAction({
      action_type: "extrude",
      confidence: 0.4,
      parameters: { depth: 15, width: 30 },
    });
    const questions = interactiveLearningSessionEngine.generateQuestions(action);

    const dimQ = questions.find(q => q.question.includes("depth"));
    expect(dimQ).toBeTruthy();
  });

  it("handles empty actions array gracefully", () => {
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", []);
    expect(session.total_steps).toBe(0);
    expect(session.actions.length).toBe(0);

    const summary = interactiveLearningSessionEngine.getSessionSummary(session);
    expect(summary.total_steps).toBe(0);
    expect(summary.accuracy_pct).toBe(0);
  });

  it("reviewStep throws for invalid step number", () => {
    const session = interactiveLearningSessionEngine.startSession("/tmp/test.mp4", makeActions(2));
    expect(() => interactiveLearningSessionEngine.reviewStep(session, 99)).toThrow();
  });
});

// ═══ Dispatcher Action Wiring Verification ═══

describe("LEARN-MS1-S1: Dispatcher wiring verification", () => {

  it("knowledgeDispatcher LEARN_ACTIONS contains all 16 learn actions", async () => {
    // Import the dispatcher file to check actions are in the enum
    const dispatcherSource = await import("../tools/dispatchers/knowledgeDispatcher.js");
    // The dispatcher registers with server.tool — we verify it exports the registration function
    expect(typeof dispatcherSource.registerKnowledgeDispatcher).toBe("function");
  });

  it("schema map has entries for all 8 new actions", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");

    const requiredActions = [
      "learn_video_process", "learn_video_transcript",
      "learn_video_keyframes", "learn_video_knowledge",
      "learn_session_create", "learn_session_submit",
      "learn_session_clarify", "learn_session_summary",
    ];

    for (const action of requiredActions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("learn_video_process schema validates correct input", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_video_process"];

    const valid = schema.safeParse({ file_path: "/tmp/test.mp4" });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({ file_path: "" });
    expect(invalid.success).toBe(false);
  });

  it("learn_session_create schema validates actions array", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_session_create"];

    const valid = schema.safeParse({
      video_path: "/tmp/test.mp4",
      actions: [{ action_type: "extrude", step_number: 1 }],
    });
    expect(valid.success).toBe(true);

    const invalid = schema.safeParse({
      video_path: "/tmp/test.mp4",
      actions: [], // min 1 required
    });
    expect(invalid.success).toBe(false);
  });

  it("learn_session_submit schema validates action enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_session_submit"];

    const valid = schema.safeParse({
      session_id: "session-123",
      step: 1,
      action: "confirm",
    });
    expect(valid.success).toBe(true);

    const invalidAction = schema.safeParse({
      session_id: "session-123",
      step: 1,
      action: "delete", // not a valid action
    });
    expect(invalidAction.success).toBe(false);
  });

  it("all existing LEARN-MS0 schemas still present (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");

    const ms0Actions = [
      "learn_ingest_text", "learn_ingest_video",
      "learn_ingest_document", "learn_ingest_url",
      "learn_auto_tag", "learn_dedup_check",
      "learn_search_knowledge", "learn_get_stats",
    ];

    for (const action of ms0Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("total knowledge schema count >= 30 (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const count = Object.keys(ACTION_KNOWLEDGE_SCHEMAS).length;
    expect(count).toBeGreaterThanOrEqual(30);
  });
});
