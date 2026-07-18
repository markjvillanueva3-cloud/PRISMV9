/**
 * aiReasoningDispatcher — U-AIMAX10 round-trip suite
 * ====================================================
 *
 * AI-MAX-MS0 / U-AIMAX10 — wires 46 new actions onto the prism_ai dispatcher,
 * covering 5 AI engines: capability, resource learning, master training ledger,
 * lathe AI training, and the generic training ledger.
 *
 * Real-behavior strategy:
 *   - Engine-direct assertions check concrete return-shape fields (e.g.
 *     LearningStats.total_patterns is a number, TrainingStats.best_practices is
 *     an array) — never just `typeof === "object"`.
 *   - Round-trip via the MCP `tool()` handler validates each of the 46 actions
 *     ends-to-end through z.enum() + Zod validation + lazy import + engine call.
 *   - Snake_case → camelCase remap correctness for MasterAITrainingLedger
 *     ingest + query verified by reading back via replay()/listRuns().
 *   - Schema validation tests exercise missing-required + bad-enum + adversarial
 *     paths; NaN poisoning on training metrics is rejected (closes the
 *     P2-2 finding from the per-file schema review).
 *
 * @milestone AI-MAX-MS0
 * @unit U-AIMAX10
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerAIReasoningDispatcher } from "../tools/dispatchers/aiReasoningDispatcher.js";
import { aiCapabilityMaximizerEngine } from "../engines/AICapabilityMaximizerEngine.js";
import { aiResourceLearningEngine } from "../engines/AIResourceLearningEngine.js";
import { masterAITrainingLedgerEngine } from "../engines/MasterAITrainingLedgerEngine.js";
import { latheAITrainingEngine } from "../engines/LatheAITrainingEngine.js";
import { trainingLedgerEngine } from "../engines/TrainingLedgerEngine.js";
import {
  AI_CAPABILITY_ACTIONS,
  ACTION_AI_CAPABILITY_SCHEMAS,
  PIPELINE_TYPES,
  RESOURCE_PATTERN_TYPES,
  CAPABILITY_STRATEGY_AREAS,
  HYPERMILL_TEMPLATE_TASKS,
  CODE_QUALITY_LANGUAGES,
  CODE_QUALITY_CONTEXTS,
  RESOURCE_SPEED_FEED_OPERATIONS,
  RUN_STATUSES,
  DEPLOYMENT_STATUSES,
} from "../schemas/aiCapabilityActionSchemas.js";

// ─────────────────────────────────────────────────────────────────────────────
// Mock MCP server (mirrors the harness used by the other uwireNN suites)
// ─────────────────────────────────────────────────────────────────────────────

interface CapturedTool {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(name: string, description: string, schema: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ name, description, schema, handler });
  }
}

interface CallResult {
  ok: boolean;
  data: Record<string, unknown>;
  raw: Record<string, unknown>;
}

async function call(
  server: MockMCPServer,
  action: string,
  params: Record<string, unknown> = {},
): Promise<CallResult> {
  const tool = server.tools[0];
  if (!tool) throw new Error("MCP tool not registered");
  const raw = (await tool.handler({ action, params })) as {
    content: { type: string; text: string }[];
  };
  const text = raw.content[0]!.text;
  const parsed = JSON.parse(text) as Record<string, unknown>;
  const ok = parsed.success !== false;
  const data = (parsed.data ?? parsed) as Record<string, unknown>;
  return { ok, data, raw: parsed };
}

let server: MockMCPServer;

beforeEach(() => {
  server = new MockMCPServer();
  registerAIReasoningDispatcher(
    server as unknown as { tool: (...args: unknown[]) => void },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Schema integrity — action ↔ schema parity
// ─────────────────────────────────────────────────────────────────────────────

describe("U-AIMAX10 schema integrity", () => {
  it("AI_CAPABILITY_ACTIONS has exactly 49 entries (9+17+8+7+8)", () => {
    // +1 (resource group 16->17): ai_domain_corpus_pointers wired 2026-06-24 (papa) --
    // the per-domain tribal-corpus consumer that closes zulu's all-domain feeder R15 orphan.
    expect(AI_CAPABILITY_ACTIONS.length).toBe(49);
  });

  it("AI_CAPABILITY_ACTIONS entries are unique", () => {
    const set = new Set(AI_CAPABILITY_ACTIONS);
    expect(set.size).toBe(AI_CAPABILITY_ACTIONS.length);
  });

  it("ACTION_AI_CAPABILITY_SCHEMAS keys match AI_CAPABILITY_ACTIONS exactly (parity)", () => {
    const schemaKeys = Object.keys(ACTION_AI_CAPABILITY_SCHEMAS).sort();
    const actionList = [...AI_CAPABILITY_ACTIONS].sort();
    expect(schemaKeys).toEqual(actionList);
  });

  it("every AI_CAPABILITY_ACTIONS entry is snake_case", () => {
    for (const a of AI_CAPABILITY_ACTIONS) {
      expect(a).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(a).not.toMatch(/[A-Z]/);
    }
  });

  it("PIPELINE_TYPES enumerates exactly the 8 expected pipelines", () => {
    expect([...PIPELINE_TYPES].sort()).toEqual(
      ["5axis", "grinding", "laser", "milling", "millturn", "sinker-edm", "waterjet", "wedm"],
    );
  });

  it("RESOURCE_PATTERN_TYPES matches the engine ResourcePattern.type union", () => {
    expect([...RESOURCE_PATTERN_TYPES].sort()).toEqual(
      ["cam_automation", "code_quality", "gcode_pattern", "material_param", "python_api"],
    );
  });

  it("CAPABILITY_STRATEGY_AREAS lists the 4 enhancement areas", () => {
    expect([...CAPABILITY_STRATEGY_AREAS].sort()).toEqual(
      ["code_generation", "context_retention", "knowledge_synthesis", "reasoning_depth"],
    );
  });

  it("HYPERMILL_TEMPLATE_TASKS lists exactly 4 macro template kinds", () => {
    expect(HYPERMILL_TEMPLATE_TASKS.length).toBe(4);
    expect([...HYPERMILL_TEMPLATE_TASKS].sort()).toEqual(
      ["electrode_create", "feature_edit", "joblist_iterate", "workplane_transform"],
    );
  });

  it("CODE_QUALITY_LANGUAGES has typescript and python", () => {
    expect([...CODE_QUALITY_LANGUAGES].sort()).toEqual(["python", "typescript"]);
  });

  it("CODE_QUALITY_CONTEXTS lists 4 write contexts", () => {
    expect([...CODE_QUALITY_CONTEXTS].sort()).toEqual(
      ["cam_script", "dispatcher", "engine", "test"],
    );
  });

  it("RESOURCE_SPEED_FEED_OPERATIONS has roughing and finishing", () => {
    expect([...RESOURCE_SPEED_FEED_OPERATIONS].sort()).toEqual(["finishing", "roughing"]);
  });

  it("RUN_STATUSES includes open + 3 terminal states", () => {
    expect([...RUN_STATUSES].sort()).toEqual(
      ["aborted", "completed", "failed_validation", "open"],
    );
  });

  it("DEPLOYMENT_STATUSES has pending/deployed/rolled-back", () => {
    expect([...DEPLOYMENT_STATUSES].sort()).toEqual(["deployed", "pending", "rolled-back"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Engine-direct sanity — assert concrete return shapes
// ─────────────────────────────────────────────────────────────────────────────

describe("AICapabilityMaximizerEngine — direct calls", () => {
  it("computeMetrics returns finite positive capability_score AND 4 domain_scores", () => {
    const m = aiCapabilityMaximizerEngine.computeMetrics();
    expect(Number.isFinite(m.capability_score)).toBe(true);
    expect(m.capability_score).toBeGreaterThan(0);
    // capability_score = log10(K+1)*conf*log10(B+1)*(1-err) — engine math may exceed 1; just bound below
    expect(Number.isFinite(m.domain_scores.code_generation)).toBe(true);
    expect(Number.isFinite(m.domain_scores.knowledge_synthesis)).toBe(true);
    expect(Number.isFinite(m.domain_scores.reasoning_depth)).toBe(true);
    expect(Number.isFinite(m.domain_scores.context_retention)).toBe(true);
  });

  it("getReasoningPatterns returns ≥3 patterns each carrying id/name/steps[]", () => {
    const patterns = aiCapabilityMaximizerEngine.getReasoningPatterns();
    expect(patterns.length).toBeGreaterThanOrEqual(3);
    for (const p of patterns) {
      expect(typeof p.id).toBe("string");
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(Array.isArray(p.steps)).toBe(true);
      expect(p.steps.length).toBeGreaterThan(0);
      expect(typeof p.confidence_multiplier).toBe("number");
    }
  });

  it("getReasoningPattern returns the requested pattern by id", () => {
    const list = aiCapabilityMaximizerEngine.getReasoningPatterns();
    const first = list[0]!;
    const fetched = aiCapabilityMaximizerEngine.getReasoningPattern(first.id);
    expect(fetched?.id).toBe(first.id);
    expect(fetched?.name).toBe(first.name);
  });

  it("getReasoningPattern returns undefined for unknown id", () => {
    const fetched = aiCapabilityMaximizerEngine.getReasoningPattern("does-not-exist-xyz");
    expect(fetched).toBe(undefined);
  });

  it("applyReasoningPattern returns enhanced_recommendation containing problem text + reasoning_steps", () => {
    const list = aiCapabilityMaximizerEngine.getReasoningPatterns();
    const out = aiCapabilityMaximizerEngine.applyReasoningPattern(list[0]!.id, {
      problem: "Optimize feed for D2 thin wall",
      context: { material: "D2" },
    });
    expect(typeof out.enhanced_recommendation).toBe("string");
    expect(out.enhanced_recommendation).toContain("Optimize feed for D2 thin wall");
    expect(Array.isArray(out.reasoning_steps)).toBe(true);
    expect(out.reasoning_steps.length).toBeGreaterThan(0);
    expect(out.confidence_boost).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(out.validation_notes)).toBe(true);
  });

  it("applyReasoningPattern on unknown pattern returns 'Pattern not found' note + confidence_boost=0", () => {
    const out = aiCapabilityMaximizerEngine.applyReasoningPattern("nope-xyz", {
      problem: "x",
      context: {},
    });
    expect(out.enhanced_recommendation).toBe("x");
    expect(out.validation_notes).toContain("Pattern not found");
    expect(out.confidence_boost).toBe(0);
  });

  it("generateCapabilityReport emits report text containing 'CAPABILITY'", () => {
    const txt = aiCapabilityMaximizerEngine.generateCapabilityReport();
    expect(typeof txt).toBe("string");
    expect(txt).toMatch(/CAPABILITY/i);
    expect(txt.length).toBeGreaterThan(100);
  });

  it("getEnhancementStrategy returns expected strategy keys for code_generation", () => {
    const s = aiCapabilityMaximizerEngine.getEnhancementStrategy("code_generation");
    expect(Array.isArray((s as { current_capabilities: unknown }).current_capabilities)).toBe(true);
    expect(Array.isArray((s as { enhancement_targets: unknown }).enhancement_targets)).toBe(true);
  });

  it("getKnowledgeSources returns ≥1 entry with source/coverage_percentage", () => {
    const sources = aiCapabilityMaximizerEngine.getKnowledgeSources();
    expect(Array.isArray(sources)).toBe(true);
    expect(sources.length).toBeGreaterThanOrEqual(1);
    for (const src of sources) {
      expect(typeof src.source).toBe("string");
      expect(typeof src.coverage_percentage).toBe("number");
    }
  });
});

describe("AIResourceLearningEngine — direct calls", () => {
  it("getEDMElectrodeDefaults exposes positive geometry.blockHeight + technology blocks", () => {
    const d = aiResourceLearningEngine.getEDMElectrodeDefaults();
    expect(typeof d.geometry.blockHeight).toBe("number");
    expect(d.geometry.blockHeight).toBeGreaterThan(0);
    expect(typeof d.technology.roughnessRoughing).toBe("number");
    expect(d.edm.VDISurfaceTolerance).toBeGreaterThan(0);
  });

  it("getAllOkumaPatterns returns ≥1 pattern with non-empty cycle and syntax", () => {
    const arr = aiResourceLearningEngine.getAllOkumaPatterns();
    expect(arr.length).toBeGreaterThanOrEqual(1);
    expect(typeof arr[0]!.cycle).toBe("string");
    expect(arr[0]!.cycle.length).toBeGreaterThan(0);
    expect(typeof arr[0]!.syntax).toBe("string");
  });

  it("getHyperMillAPIPatterns(undefined) returns ≥1 PythonAPIPattern with module/function", () => {
    const arr = aiResourceLearningEngine.getHyperMillAPIPatterns();
    expect(arr.length).toBeGreaterThanOrEqual(1);
    expect(typeof arr[0]!.module).toBe("string");
    expect(typeof arr[0]!.function).toBe("string");
  });

  it("generateHyperMillTemplate produces a string that mentions the task keyword", () => {
    const template = aiResourceLearningEngine.generateHyperMillTemplate("electrode_create");
    expect(typeof template).toBe("string");
    expect(template.length).toBeGreaterThan(50);
    expect(template.toLowerCase()).toContain("electrode");
  });

  it("getCodeQualityRecommendations(typescript,engine) returns 4 keyed string arrays", () => {
    const recs = aiResourceLearningEngine.getCodeQualityRecommendations("typescript", "engine");
    expect(Array.isArray(recs.structure)).toBe(true);
    expect(Array.isArray(recs.mandatory)).toBe(true);
    expect(Array.isArray(recs.anti_patterns)).toBe(true);
    expect(Array.isArray(recs.examples)).toBe(true);
    expect(recs.structure.length).toBeGreaterThan(0);
    expect(recs.mandatory.length).toBeGreaterThan(0);
  });

  it("getTrainingContext output mentions 'AI RESOURCE LEARNING CONTEXT' + 'EDM Electrode Defaults'", () => {
    const ctx = aiResourceLearningEngine.getTrainingContext();
    expect(ctx).toContain("AI RESOURCE LEARNING CONTEXT");
    expect(ctx).toContain("EDM Electrode Defaults");
    expect(ctx.length).toBeGreaterThan(200);
  });

  it("getKnowledgeCoverage returns numeric percentages for all 4 sub-domains", () => {
    const cov = aiResourceLearningEngine.getKnowledgeCoverage();
    expect(typeof cov.gcodeComplete).toBe("number");
    expect(typeof cov.pythonApiComplete).toBe("number");
    expect(typeof cov.materialComplete).toBe("number");
    expect(typeof cov.overallCoverage).toBe("number");
    expect(cov.materialComplete).toBeGreaterThan(0);
    expect(cov.materialComplete).toBeLessThanOrEqual(100);
    expect(cov.overallCoverage).toBeGreaterThan(0);
  });

  it("getAITrainingData returns 4 typed arrays (gcode/python/material/codeQuality)", () => {
    const td = aiResourceLearningEngine.getAITrainingData();
    expect(Array.isArray(td.gcodePatterns)).toBe(true);
    expect(Array.isArray(td.pythonPatterns)).toBe(true);
    expect(Array.isArray(td.materialRules)).toBe(true);
    expect(Array.isArray(td.codeQuality)).toBe(true);
    expect(td.gcodePatterns.length).toBeGreaterThanOrEqual(1);
    expect(td.pythonPatterns.length).toBeGreaterThanOrEqual(1);
  });
});

describe("MasterAITrainingLedgerEngine — direct calls", () => {
  beforeEach(() => masterAITrainingLedgerEngine.reset());

  it("totalRuns starts at 0 after reset", () => {
    expect(masterAITrainingLedgerEngine.totalRuns()).toBe(0);
  });

  it("supportedPipelines returns the 8 pipelines + each appears in PIPELINE_TYPES", () => {
    const list = masterAITrainingLedgerEngine.supportedPipelines();
    expect(list.length).toBe(8);
    for (const p of list) {
      expect((PIPELINE_TYPES as readonly string[]).includes(p)).toBe(true);
    }
  });

  it("ingest stores an entry and replay returns it with schemaVersion stamped", () => {
    masterAITrainingLedgerEngine.ingest({
      runId: "run-1",
      pipelineType: "wedm",
      datasetFingerprint: "fp-1",
      version: "v1",
      trainingMetrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.92 },
      deploymentStatus: "pending",
      sloTargets: { minEvalScore: 0.85, maxLoss: 0.2 },
      createdAt: new Date().toISOString(),
    });
    expect(masterAITrainingLedgerEngine.totalRuns()).toBe(1);
    const replayed = masterAITrainingLedgerEngine.replay("run-1");
    expect(replayed!.runId).toBe("run-1");
    expect(replayed!.pipelineType).toBe("wedm");
    expect(replayed!.schemaVersion).toBeGreaterThan(0);
    expect(replayed!.trainingMetrics.evalScore).toBeCloseTo(0.92, 3);
  });

  it("query filters by pipelineType, returning only matching entries", () => {
    masterAITrainingLedgerEngine.ingest({
      runId: "run-mill",
      pipelineType: "milling",
      datasetFingerprint: "fp-m",
      version: "v1",
      trainingMetrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deploymentStatus: "deployed",
      sloTargets: { minEvalScore: 0.85, maxLoss: 0.2 },
      createdAt: new Date().toISOString(),
    });
    masterAITrainingLedgerEngine.ingest({
      runId: "run-wedm",
      pipelineType: "wedm",
      datasetFingerprint: "fp-w",
      version: "v1",
      trainingMetrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deploymentStatus: "deployed",
      sloTargets: { minEvalScore: 0.85, maxLoss: 0.2 },
      createdAt: new Date().toISOString(),
    });
    const milling = masterAITrainingLedgerEngine.query({ pipelineType: "milling" });
    expect(milling.length).toBe(1);
    expect(milling[0]!.runId).toBe("run-mill");
  });

  it("replay returns null for unknown runId", () => {
    expect(masterAITrainingLedgerEngine.replay("nope")).toBeNull();
  });

  it("sloStatus reports per-pipeline pass/fail counts based on minEvalScore", () => {
    masterAITrainingLedgerEngine.ingest({
      runId: "pass-1",
      pipelineType: "wedm",
      datasetFingerprint: "fp",
      version: "v1",
      trainingMetrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deploymentStatus: "deployed",
      sloTargets: { minEvalScore: 0.85, maxLoss: 0.2 },
      createdAt: new Date().toISOString(),
    });
    masterAITrainingLedgerEngine.ingest({
      runId: "fail-1",
      pipelineType: "wedm",
      datasetFingerprint: "fp",
      version: "v1",
      trainingMetrics: { loss: 0.5, accuracy: 0.7, mae: 0.2, evalScore: 0.6 },
      deploymentStatus: "deployed",
      sloTargets: { minEvalScore: 0.85, maxLoss: 0.2 },
      createdAt: new Date().toISOString(),
    });
    const slo = masterAITrainingLedgerEngine.sloStatus();
    const wedm = slo.find((s) => s.pipelineType === "wedm");
    expect(wedm?.pipelineType).toBe("wedm");
    expect((wedm!.passing as number) + (wedm!.failing as number)).toBe(2);
  });
});

describe("LatheAITrainingEngine — direct calls", () => {
  it("parseProgram extracts filename and total_lines>5 for a real program", () => {
    const r = latheAITrainingEngine.parseProgram(
      "(SIMPLE)\nO0001\nG21 G40 G80\nT0101\nG97 S1500 M03\nG0 X10 Z0\nM30\n",
      "/tmp/test.MIN",
    );
    expect(r.filename).toBe("test.MIN");
    expect(r.filepath).toBe("/tmp/test.MIN");
    expect(r.total_lines).toBeGreaterThan(5);
    expect(Array.isArray(r.operation_sequence)).toBe(true);
  });

  it("getTrainingStats returns TrainingStats with numeric programs_parsed and patterns_learned", () => {
    const s = latheAITrainingEngine.getTrainingStats();
    expect(typeof s.programs_parsed).toBe("number");
    expect(typeof s.programs_analyzed).toBe("number");
    expect(typeof s.patterns_learned).toBe("number");
    expect(typeof s.avg_program_score).toBe("number");
    expect(Array.isArray(s.best_practices)).toBe(true);
    expect(s.common_issues instanceof Map).toBe(true);
  });

  it("getLearnedPatterns returns an array (possibly empty before training)", () => {
    const p = latheAITrainingEngine.getLearnedPatterns();
    expect(Array.isArray(p)).toBe(true);
  });

  it("trainFromPrograms returns TrainingStats summary with programs_parsed≥batch size", () => {
    const out = latheAITrainingEngine.trainFromPrograms([
      { content: "O0001\nT0101\nG0 X0 Z0\nM30\n", filepath: "/tmp/a.MIN" },
      { content: "O0002\nT0202\nG97 S1500\nG0 X10 Z0\nG1 Z-5 F0.1\nM30\n", filepath: "/tmp/b.MIN" },
    ]);
    expect(typeof out.programs_parsed).toBe("number");
    expect(out.programs_parsed).toBeGreaterThanOrEqual(2);
  });

  it("analyzeProgram returns issues + numeric score for a tiny program", () => {
    const parsed = latheAITrainingEngine.parseProgram(
      "O0001\nT0101\nG0 X0 Z0\nM30\n",
      "/tmp/x.MIN",
    );
    const analysis = latheAITrainingEngine.analyzeProgram(parsed);
    expect(typeof analysis.score).toBe("number");
    expect(analysis.score).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(analysis.issues)).toBe(true);
  });
});

describe("TrainingLedgerEngine — direct calls", () => {
  beforeEach(() => trainingLedgerEngine.clearAll());

  it("openRun returns record with status='open' carrying the supplied experiment_id", () => {
    const r = trainingLedgerEngine.openRun({
      experiment_id: "test-exp",
      attempt: 1,
      start_ts: 1234567890,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 42,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tiktoken/cl100k-base",
      trainer_commit_sha: "abc1234",
      author: "test",
    });
    expect(r.experiment_id).toBe("test-exp");
    expect(r.attempt).toBe(1);
    expect(r.status).toBe("open");
    expect(r.start_ts).toBe(1234567890);
    expect(typeof r.run_id).toBe("string");
    expect(r.run_id.length).toBeGreaterThan(0);
    expect(r.fingerprint.aug_seed).toBe(42);
  });

  it("closeRun transitions status='open' → 'completed' and stores elapsed_ms", () => {
    const start = trainingLedgerEngine.openRun({
      experiment_id: "exp-close",
      attempt: 1,
      start_ts: 1000,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    expect(start.status).toBe("open");
    const closed = trainingLedgerEngine.closeRun({
      run_id: start.run_id,
      end_ts: 5000,
      status: "completed",
      final_weight_sha256: "d".repeat(64),
      eval_metrics_sha256: "e".repeat(64),
      elapsed_ms: 4000,
      wall_clock_ms: 4000,
    });
    expect(closed.status).toBe("completed");
    expect(closed.end_ts).toBe(5000);
    expect(closed.outcome?.elapsed_ms).toBe(4000);
  });

  it("getRun returns null for unknown id", () => {
    expect(trainingLedgerEngine.getRun("does-not-exist")).toBeNull();
  });

  it("listRuns filter by experiment_id returns matching subset", () => {
    trainingLedgerEngine.openRun({
      experiment_id: "expA",
      attempt: 1,
      start_ts: 1,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    trainingLedgerEngine.openRun({
      experiment_id: "expB",
      attempt: 1,
      start_ts: 1,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    const onlyA = trainingLedgerEngine.listRuns({ experiment_id: "expA" });
    expect(onlyA.length).toBe(1);
    expect(onlyA[0]!.experiment_id).toBe("expA");
  });

  it("toSnapshot + clearAll + loadSnapshot restores the exact set of runs", () => {
    trainingLedgerEngine.openRun({
      experiment_id: "snap-test",
      attempt: 1,
      start_ts: 2000,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 7,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    expect(trainingLedgerEngine.listRuns().length).toBe(1);
    const snap = trainingLedgerEngine.toSnapshot();
    trainingLedgerEngine.clearAll();
    expect(trainingLedgerEngine.listRuns().length).toBe(0);
    trainingLedgerEngine.loadSnapshot(snap);
    expect(trainingLedgerEngine.listRuns().length).toBe(1);
    expect(trainingLedgerEngine.listRuns()[0]!.experiment_id).toBe("snap-test");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Round-trip wire tests — every action callable through MCP handler
// ─────────────────────────────────────────────────────────────────────────────

describe("U-AIMAX10 round-trip — Capability actions", () => {
  it("ai_capability_compute_metrics returns a finite positive capability_score", async () => {
    const r = await call(server, "ai_capability_compute_metrics");
    expect(r.ok).toBe(true);
    const score = r.data.capability_score as number;
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThan(0);
  });

  it("ai_capability_get_metrics returns the same capability_score as engine.getMetrics", async () => {
    const r = await call(server, "ai_capability_get_metrics");
    expect(r.ok).toBe(true);
    const engineMetrics = aiCapabilityMaximizerEngine.getMetrics();
    expect(r.data.capability_score).toBeCloseTo(engineMetrics.capability_score, 6);
  });

  it("ai_capability_enhancement_recommendations returns an array (may be empty after high baseline)", async () => {
    const r = await call(server, "ai_capability_enhancement_recommendations");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect(Array.isArray(arr)).toBe(true);
  });

  it("ai_capability_reasoning_patterns returns ≥3 patterns with id/name/steps", async () => {
    const r = await call(server, "ai_capability_reasoning_patterns");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBeGreaterThanOrEqual(3);
    const first = (arr as Record<string, unknown>[])[0]!;
    expect(typeof first.id).toBe("string");
    expect(typeof first.name).toBe("string");
    expect(Array.isArray(first.steps)).toBe(true);
  });

  it("ai_capability_reasoning_pattern_get fetches the engine's first pattern by id", async () => {
    const list = aiCapabilityMaximizerEngine.getReasoningPatterns();
    const r = await call(server, "ai_capability_reasoning_pattern_get", { id: list[0]!.id });
    expect(r.ok).toBe(true);
    expect(r.data.id).toBe(list[0]!.id);
    expect(r.data.name).toBe(list[0]!.name);
  });

  it("ai_capability_reasoning_pattern_get rejects empty id (schema validation)", async () => {
    const r = await call(server, "ai_capability_reasoning_pattern_get", { id: "" });
    expect(r.ok).toBe(false);
  });

  it("ai_capability_knowledge_sources returns entries with source/coverage_percentage", async () => {
    const r = await call(server, "ai_capability_knowledge_sources");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBeGreaterThanOrEqual(1);
    const first = (arr as Record<string, unknown>[])[0]!;
    expect(typeof first.source).toBe("string");
    expect(typeof first.coverage_percentage).toBe("number");
  });

  it("ai_capability_enhancement_strategy returns current_capabilities[] for each valid area", async () => {
    for (const area of CAPABILITY_STRATEGY_AREAS) {
      const r = await call(server, "ai_capability_enhancement_strategy", { area });
      expect(r.ok).toBe(true);
      expect(Array.isArray(r.data.current_capabilities)).toBe(true);
      expect(Array.isArray(r.data.enhancement_targets)).toBe(true);
    }
  });

  it("ai_capability_enhancement_strategy rejects bad area (schema validation)", async () => {
    const r = await call(server, "ai_capability_enhancement_strategy", { area: "telepathy" });
    expect(r.ok).toBe(false);
  });

  it("ai_capability_apply_reasoning_pattern routes problem text through enhanced_recommendation", async () => {
    const list = aiCapabilityMaximizerEngine.getReasoningPatterns();
    const r = await call(server, "ai_capability_apply_reasoning_pattern", {
      pattern_id: list[0]!.id,
      input: { problem: "speed feed for D2", context: { material: "D2" } },
    });
    expect(r.ok).toBe(true);
    expect(r.data.enhanced_recommendation as string).toContain("speed feed for D2");
    expect(Array.isArray(r.data.reasoning_steps)).toBe(true);
  });

  it("ai_capability_apply_reasoning_pattern rejects missing input.problem", async () => {
    const r = await call(server, "ai_capability_apply_reasoning_pattern", {
      pattern_id: "x",
      input: { context: {} },
    });
    expect(r.ok).toBe(false);
  });

  it("ai_capability_report emits report containing 'CAPABILITY'", async () => {
    const r = await call(server, "ai_capability_report");
    expect(r.ok).toBe(true);
    const text =
      typeof r.data === "string"
        ? r.data
        : ((r.data.value as string | undefined) ?? (r.raw.data as string | undefined) ?? "");
    expect(text.length).toBeGreaterThan(50);
    expect(text).toMatch(/CAPABILITY/i);
  });
});

describe("U-AIMAX10 round-trip — Resource actions", () => {
  it("ai_resource_code_quality returns structure+mandatory+anti_patterns string arrays for ts engine", async () => {
    const r = await call(server, "ai_resource_code_quality", {
      language: "typescript",
      context: "engine",
    });
    expect(r.ok).toBe(true);
    const d = r.data as { structure: unknown[]; mandatory: unknown[]; anti_patterns: unknown[]; examples: unknown[] };
    expect(Array.isArray(d.structure)).toBe(true);
    expect(Array.isArray(d.mandatory)).toBe(true);
    expect(Array.isArray(d.anti_patterns)).toBe(true);
    expect(d.structure.length).toBeGreaterThan(0);
    expect(d.mandatory.length).toBeGreaterThan(0);
  });

  it("ai_resource_code_quality rejects bad language (schema validation)", async () => {
    const r = await call(server, "ai_resource_code_quality", {
      language: "rust",
      context: "engine",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_resource_material_parameters routes through engine for AISI 4140", async () => {
    const r = await call(server, "ai_resource_material_parameters", { material: "AISI 4140" });
    expect(r.ok).toBe(true);
  });

  it("ai_resource_hypermill_patterns returns ≥1 pattern with module/function strings", async () => {
    const r = await call(server, "ai_resource_hypermill_patterns");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBeGreaterThanOrEqual(1);
    const first = (arr as Record<string, unknown>[])[0]!;
    expect(typeof first.module).toBe("string");
    expect(typeof first.function).toBe("string");
  });

  it("ai_resource_okuma_pattern rejects missing cycle", async () => {
    const r = await call(server, "ai_resource_okuma_pattern", {});
    expect(r.ok).toBe(false);
  });

  it("ai_resource_okuma_pattern accepts cycle=G132", async () => {
    const r = await call(server, "ai_resource_okuma_pattern", { cycle: "G132" });
    expect(r.ok).toBe(true);
  });

  it("ai_resource_okuma_all returns ≥1 pattern with cycle/syntax/description", async () => {
    const r = await call(server, "ai_resource_okuma_all");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBeGreaterThanOrEqual(1);
    const first = (arr as Record<string, unknown>[])[0]!;
    expect(typeof first.cycle).toBe("string");
    expect(typeof first.syntax).toBe("string");
  });

  it("ai_resource_edm_defaults returns geometry.blockHeight as a positive number", async () => {
    const r = await call(server, "ai_resource_edm_defaults");
    expect(r.ok).toBe(true);
    const geom = (r.data as { geometry: { blockHeight: number } }).geometry;
    expect(typeof geom.blockHeight).toBe("number");
    expect(geom.blockHeight).toBeGreaterThan(0);
  });

  it("ai_resource_patterns_by_type accepts each of the 5 valid pattern types", async () => {
    for (const type of RESOURCE_PATTERN_TYPES) {
      const r = await call(server, "ai_resource_patterns_by_type", { type });
      expect(r.ok).toBe(true);
    }
  });

  it("ai_resource_patterns_by_type rejects unknown type (schema validation)", async () => {
    const r = await call(server, "ai_resource_patterns_by_type", { type: "junk" });
    expect(r.ok).toBe(false);
  });

  it("ai_resource_stats round-trips (engine may legitimately return null)", async () => {
    const r = await call(server, "ai_resource_stats");
    expect(r.ok).toBe(true);
  });

  it("ai_resource_training_context returns text containing the banner", async () => {
    const r = await call(server, "ai_resource_training_context");
    expect(r.ok).toBe(true);
    const txt =
      typeof r.data === "string"
        ? r.data
        : ((r.data.value as string | undefined) ?? "");
    expect(txt).toContain("AI RESOURCE LEARNING CONTEXT");
  });

  it("ai_resource_extract_gcode requires program_content (schema validation)", async () => {
    const bad = await call(server, "ai_resource_extract_gcode", {});
    expect(bad.ok).toBe(false);
  });

  it("ai_resource_extract_gcode accepts a small G-code blob", async () => {
    const good = await call(server, "ai_resource_extract_gcode", {
      program_content: "G0 X10 Y10\nG1 X20 F100\n",
    });
    expect(good.ok).toBe(true);
  });

  it("ai_resource_speed_feed accepts both roughing and finishing for AISI 4140", async () => {
    for (const operation of RESOURCE_SPEED_FEED_OPERATIONS) {
      const r = await call(server, "ai_resource_speed_feed", { material: "AISI 4140", operation });
      expect(r.ok).toBe(true);
    }
  });

  it("ai_resource_generate_hypermill_template emits ≥50-char text for every macro task", async () => {
    for (const task of HYPERMILL_TEMPLATE_TASKS) {
      const r = await call(server, "ai_resource_generate_hypermill_template", { task });
      expect(r.ok).toBe(true);
      const txt =
        typeof r.data === "string"
          ? r.data
          : ((r.data.value as string | undefined) ?? "");
      expect(txt.length).toBeGreaterThan(50);
    }
  });

  it("ai_resource_training_data returns 4 arrays (gcode/python/material/codeQuality)", async () => {
    const r = await call(server, "ai_resource_training_data");
    expect(r.ok).toBe(true);
    const td = r.data as {
      gcodePatterns: unknown[];
      pythonPatterns: unknown[];
      materialRules: unknown[];
      codeQuality: unknown[];
    };
    expect(Array.isArray(td.gcodePatterns)).toBe(true);
    expect(Array.isArray(td.pythonPatterns)).toBe(true);
    expect(Array.isArray(td.materialRules)).toBe(true);
    expect(Array.isArray(td.codeQuality)).toBe(true);
    expect(td.gcodePatterns.length).toBeGreaterThanOrEqual(1);
  });

  it("ai_resource_knowledge_coverage returns finite percentages for all 4 sub-domains", async () => {
    const r = await call(server, "ai_resource_knowledge_coverage");
    expect(r.ok).toBe(true);
    const cov = r.data as { gcodeComplete: number; pythonApiComplete: number; materialComplete: number; overallCoverage: number };
    expect(Number.isFinite(cov.gcodeComplete)).toBe(true);
    expect(Number.isFinite(cov.pythonApiComplete)).toBe(true);
    expect(Number.isFinite(cov.materialComplete)).toBe(true);
    expect(Number.isFinite(cov.overallCoverage)).toBe(true);
    expect(cov.overallCoverage).toBeGreaterThan(0);
  });
});

describe("U-AIMAX10 round-trip — Master training ledger actions", () => {
  beforeEach(() => masterAITrainingLedgerEngine.reset());

  it("ai_training_master_total_runs starts at 0", async () => {
    const r = await call(server, "ai_training_master_total_runs");
    expect(r.ok).toBe(true);
    const n = typeof r.data === "number" ? r.data : (r.data.value as number);
    expect(n).toBe(0);
  });

  it("ai_training_master_supported_pipelines returns 8 named pipelines incl. milling+wedm", async () => {
    const r = await call(server, "ai_training_master_supported_pipelines");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBe(8);
    expect((arr as string[])).toContain("milling");
    expect((arr as string[])).toContain("wedm");
  });

  it("ai_training_master_ingest remaps snake→camel and engine receives camelCase fields", async () => {
    const r = await call(server, "ai_training_master_ingest", {
      run_id: "rt-run-1",
      pipeline_type: "wedm",
      dataset_fingerprint: "fp-rt",
      version: "v1",
      training_metrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.91 },
      deployment_status: "pending",
      slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
      created_at: new Date().toISOString(),
    });
    expect(r.ok).toBe(true);
    expect(masterAITrainingLedgerEngine.totalRuns()).toBe(1);
    const replayed = masterAITrainingLedgerEngine.replay("rt-run-1");
    expect(replayed!.pipelineType).toBe("wedm");
    expect(replayed!.datasetFingerprint).toBe("fp-rt");
    expect(replayed!.trainingMetrics.evalScore).toBeCloseTo(0.91, 3);
    expect(replayed!.sloTargets.minEvalScore).toBeCloseTo(0.85, 3);
  });

  it("ai_training_master_ingest rejects unknown pipeline_type", async () => {
    const r = await call(server, "ai_training_master_ingest", {
      run_id: "bad",
      pipeline_type: "additive",
      dataset_fingerprint: "fp",
      version: "v1",
      training_metrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deployment_status: "pending",
      slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
      created_at: new Date().toISOString(),
    });
    expect(r.ok).toBe(false);
    expect(masterAITrainingLedgerEngine.totalRuns()).toBe(0);
  });

  it("ai_training_master_ingest rejects NaN in training_metrics (closes schema-review P2-2)", async () => {
    const r = await call(server, "ai_training_master_ingest", {
      run_id: "nan",
      pipeline_type: "wedm",
      dataset_fingerprint: "fp",
      version: "v1",
      training_metrics: { loss: Number.NaN, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deployment_status: "pending",
      slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
      created_at: new Date().toISOString(),
    });
    expect(r.ok).toBe(false);
  });

  it("ai_training_master_query with pipeline_type=milling returns only milling runs", async () => {
    await call(server, "ai_training_master_ingest", {
      run_id: "q1",
      pipeline_type: "milling",
      dataset_fingerprint: "fp",
      version: "v1",
      training_metrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deployment_status: "deployed",
      slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
      created_at: new Date().toISOString(),
    });
    await call(server, "ai_training_master_ingest", {
      run_id: "q2",
      pipeline_type: "wedm",
      dataset_fingerprint: "fp",
      version: "v1",
      training_metrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
      deployment_status: "deployed",
      slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
      created_at: new Date().toISOString(),
    });
    const r = await call(server, "ai_training_master_query", { pipeline_type: "milling" });
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect((arr as unknown[]).length).toBe(1);
    expect((arr as { runId: string }[])[0]!.runId).toBe("q1");
  });

  it("ai_training_master_replay returns null-shape for unknown run_id (no leaked LedgerEntry)", async () => {
    const r = await call(server, "ai_training_master_replay", { run_id: "ghost" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown> | null | undefined;
    expect(d === null || d === undefined || d.runId === undefined).toBe(true);
  });

  it("ai_training_master_pipeline_stability rejects missing pipeline_type, accepts valid one", async () => {
    const bad = await call(server, "ai_training_master_pipeline_stability", {});
    expect(bad.ok).toBe(false);
    const good = await call(server, "ai_training_master_pipeline_stability", {
      pipeline_type: "milling",
    });
    expect(good.ok).toBe(true);
    expect((good.data as { pipelineType: string }).pipelineType).toBe("milling");
  });

  it("ai_training_master_compare returns object with pipelineA + pipelineB echoed back", async () => {
    const r = await call(server, "ai_training_master_compare", {
      pipeline_a: "milling",
      pipeline_b: "wedm",
    });
    expect(r.ok).toBe(true);
    const d = r.data as { pipelineA: string; pipelineB: string; moreStable?: string };
    expect(d.pipelineA).toBe("milling");
    expect(d.pipelineB).toBe("wedm");
  });

  it("ai_training_master_slo_status returns an array (empty when ledger is empty)", async () => {
    const r = await call(server, "ai_training_master_slo_status");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect(Array.isArray(arr)).toBe(true);
  });
});

describe("U-AIMAX10 round-trip — Lathe training actions", () => {
  it("ai_training_lathe_parse extracts filename + total_lines for a real program", async () => {
    const r = await call(server, "ai_training_lathe_parse", {
      content: "O0001\nT0101\nG97 S1500\nG0 X10 Z0\nM30\n",
      filepath: "/tmp/u.MIN",
    });
    expect(r.ok).toBe(true);
    expect(r.data.filename).toBe("u.MIN");
    expect((r.data.total_lines as number)).toBeGreaterThan(0);
  });

  it("ai_training_lathe_parse rejects empty content (schema validation)", async () => {
    const r = await call(server, "ai_training_lathe_parse", { content: "", filepath: "x.MIN" });
    expect(r.ok).toBe(false);
  });

  it("ai_training_lathe_analyze returns score + issues[] for a tiny program", async () => {
    const parsed = latheAITrainingEngine.parseProgram(
      "O0001\nT0101\nM30\n",
      "/tmp/a.MIN",
    );
    const r = await call(server, "ai_training_lathe_analyze", {
      program: parsed as unknown as Record<string, unknown>,
    });
    expect(r.ok).toBe(true);
    expect(typeof r.data.score).toBe("number");
    expect(Array.isArray(r.data.issues)).toBe(true);
  });

  it("ai_training_lathe_extract_params accepts a parsed tool_block when one exists", async () => {
    const parsed = latheAITrainingEngine.parseProgram(
      "O0001\nT0101\nG97 S1500\nG0 X10 Z0\nG1 Z-5 F0.1\nM30\n",
      "/tmp/b.MIN",
    );
    const block = parsed.tool_blocks[0];
    if (!block) return;
    const r = await call(server, "ai_training_lathe_extract_params", {
      block: block as unknown as Record<string, unknown>,
    });
    expect(r.ok).toBe(true);
  });

  it("ai_training_lathe_rewrite returns a non-empty rewritten program string", async () => {
    const parsed = latheAITrainingEngine.parseProgram(
      "O0001\nT0101\nG0 X10 Z0\nM30\n",
      "/tmp/c.MIN",
    );
    const analysis = latheAITrainingEngine.analyzeProgram(parsed);
    const r = await call(server, "ai_training_lathe_rewrite", {
      analysis: analysis as unknown as Record<string, unknown>,
    });
    expect(r.ok).toBe(true);
    const txt =
      typeof r.data === "string"
        ? r.data
        : ((r.data.value as string | undefined) ?? "");
    expect(txt.length).toBeGreaterThan(0);
  });

  it("ai_training_lathe_train returns programs_parsed≥batch size", async () => {
    const r = await call(server, "ai_training_lathe_train", {
      programs: [
        { content: "O0001\nT0101\nM30\n", filepath: "/tmp/t1.MIN" },
        { content: "O0002\nT0202\nG0 X10\nM30\n", filepath: "/tmp/t2.MIN" },
      ],
    });
    expect(r.ok).toBe(true);
    expect((r.data.programs_parsed as number)).toBeGreaterThanOrEqual(2);
  });

  it("ai_training_lathe_train rejects empty batch (schema validation)", async () => {
    const r = await call(server, "ai_training_lathe_train", { programs: [] });
    expect(r.ok).toBe(false);
  });

  it("ai_training_lathe_stats returns TrainingStats shape", async () => {
    const r = await call(server, "ai_training_lathe_stats");
    expect(r.ok).toBe(true);
    expect(typeof r.data.programs_parsed).toBe("number");
    expect(typeof r.data.patterns_learned).toBe("number");
    expect(Array.isArray(r.data.best_practices)).toBe(true);
  });

  it("ai_training_lathe_patterns returns an array (possibly empty)", async () => {
    const r = await call(server, "ai_training_lathe_patterns");
    expect(r.ok).toBe(true);
    const arr = Array.isArray(r.data) ? r.data : (r.data.items as unknown[]);
    expect(Array.isArray(arr)).toBe(true);
  });
});

describe("U-AIMAX10 round-trip — Generic training ledger actions", () => {
  beforeEach(() => trainingLedgerEngine.clearAll());

  it("ai_training_ledger_open_run + close_run lifecycle reflects state in engine", async () => {
    const opened = await call(server, "ai_training_ledger_open_run", {
      experiment_id: "wire-exp",
      attempt: 1,
      start_ts: 1000,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 5,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv-1",
      trainer_commit_sha: "abc1234",
      author: "u-aimax10",
    });
    expect(opened.ok).toBe(true);
    const runId = opened.data.run_id as string;
    expect(typeof runId).toBe("string");
    expect(runId.length).toBeGreaterThan(0);
    expect(opened.data.status).toBe("open");

    const closed = await call(server, "ai_training_ledger_close_run", {
      run_id: runId,
      end_ts: 5000,
      status: "completed",
      final_weight_sha256: "d".repeat(64),
      eval_metrics_sha256: "e".repeat(64),
      elapsed_ms: 4000,
      wall_clock_ms: 4000,
    });
    expect(closed.ok).toBe(true);
    expect(closed.data.status).toBe("completed");
    expect((closed.data.end_ts as number)).toBe(5000);

    const direct = trainingLedgerEngine.getRun(runId);
    expect(direct!.status).toBe("completed");
  });

  it("ai_training_ledger_open_run rejects empty base_weight_sha256 (schema validation)", async () => {
    const r = await call(server, "ai_training_ledger_open_run", {
      experiment_id: "x",
      attempt: 1,
      start_ts: 1,
      base_weight_sha256: "",
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    expect(r.ok).toBe(false);
  });

  it("ai_training_ledger_close_run rejects invalid status (not in RUN_STATUSES)", async () => {
    const r = await call(server, "ai_training_ledger_close_run", {
      run_id: "x",
      end_ts: 5,
      status: "frozen",
      elapsed_ms: 1,
      wall_clock_ms: 1,
    });
    expect(r.ok).toBe(false);
  });

  it("ai_training_ledger_get_run returns null-shape for unknown id (no leaked record)", async () => {
    const r = await call(server, "ai_training_ledger_get_run", { run_id: "missing" });
    expect(r.ok).toBe(true);
    const d = r.data as Record<string, unknown> | null | undefined;
    expect(d === null || d === undefined || d.run_id === undefined).toBe(true);
  });

  it("ai_training_ledger_list_runs filters by status enum", async () => {
    await call(server, "ai_training_ledger_open_run", {
      experiment_id: "list-test",
      attempt: 1,
      start_ts: 1,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    const open = await call(server, "ai_training_ledger_list_runs", { status: "open" });
    expect(open.ok).toBe(true);
    const arr = Array.isArray(open.data) ? open.data : (open.data.items as unknown[]);
    expect((arr as unknown[]).length).toBe(1);
    expect((arr as { status: string }[])[0]!.status).toBe("open");
  });

  it("ai_training_ledger_list_runs rejects unknown status literal", async () => {
    const r = await call(server, "ai_training_ledger_list_runs", { status: "nope" });
    expect(r.ok).toBe(false);
  });

  it("ai_training_ledger_drift_report rejects missing experiment_id, succeeds with one", async () => {
    const bad = await call(server, "ai_training_ledger_drift_report", {});
    expect(bad.ok).toBe(false);
    const good = await call(server, "ai_training_ledger_drift_report", {
      experiment_id: "drift-exp",
    });
    expect(good.ok).toBe(true);
  });

  it("ai_training_ledger_snapshot+load_snapshot persists open-run state through MCP roundtrip", async () => {
    await call(server, "ai_training_ledger_open_run", {
      experiment_id: "snap-rt",
      attempt: 1,
      start_ts: 1,
      base_weight_sha256: "a".repeat(64),
      manifest_sha256: "b".repeat(64),
      aug_seed: 1,
      hyperparams_sha256: "c".repeat(64),
      tokenizer_version: "tv",
      trainer_commit_sha: "abc1234",
      author: "t",
    });
    const snapped = await call(server, "ai_training_ledger_snapshot");
    expect(snapped.ok).toBe(true);
    trainingLedgerEngine.clearAll();
    expect(trainingLedgerEngine.listRuns().length).toBe(0);
    const loaded = await call(server, "ai_training_ledger_load_snapshot", {
      snapshot: snapped.data as unknown as Record<string, unknown>,
    });
    expect(loaded.ok).toBe(true);
    const after = trainingLedgerEngine.listRuns();
    expect(after.length).toBe(1);
    expect(after[0]!.experiment_id).toBe("snap-rt");
  });

  it("ai_training_ledger_stats returns numeric total_runs + experiments + by_status", async () => {
    const r = await call(server, "ai_training_ledger_stats");
    expect(r.ok).toBe(true);
    const s = r.data as { total_runs: number; experiments: number; by_status: Record<string, number> };
    expect(typeof s.total_runs).toBe("number");
    expect(typeof s.experiments).toBe("number");
    expect(typeof s.by_status).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Coverage edges — every action callable, no "Unknown action" anywhere
// ─────────────────────────────────────────────────────────────────────────────

describe("U-AIMAX10 coverage edges", () => {
  it("none of the 46 AI_CAPABILITY_ACTIONS produces 'Unknown action' (every case wired)", async () => {
    const list = aiCapabilityMaximizerEngine.getReasoningPatterns();
    const minViable: Record<string, Record<string, unknown>> = {
      ai_capability_reasoning_pattern_get: { id: list[0]!.id },
      ai_capability_enhancement_strategy: { area: "code_generation" },
      ai_capability_apply_reasoning_pattern: {
        pattern_id: list[0]!.id,
        input: { problem: "x", context: {} },
      },
      ai_resource_code_quality: { language: "typescript", context: "engine" },
      ai_resource_material_parameters: { material: "AISI 4140" },
      ai_resource_okuma_pattern: { cycle: "G132" },
      ai_resource_patterns_by_type: { type: "gcode_pattern" },
      ai_resource_extract_gcode: { program_content: "G0 X0" },
      ai_resource_speed_feed: { material: "AISI 4140", operation: "roughing" },
      ai_resource_generate_hypermill_template: { task: "electrode_create" },
      ai_training_master_ingest: {
        run_id: "smoke",
        pipeline_type: "wedm",
        dataset_fingerprint: "fp",
        version: "v1",
        training_metrics: { loss: 0.1, accuracy: 0.9, mae: 0.05, evalScore: 0.9 },
        deployment_status: "pending",
        slo_targets: { minEvalScore: 0.85, maxLoss: 0.2 },
        created_at: new Date().toISOString(),
      },
      ai_training_master_replay: { run_id: "smoke" },
      ai_training_master_pipeline_stability: { pipeline_type: "milling" },
      ai_training_master_compare: { pipeline_a: "milling", pipeline_b: "wedm" },
      ai_training_lathe_parse: { content: "M30\n", filepath: "x.MIN" },
      ai_training_lathe_extract_params: { block: {} },
      ai_training_lathe_analyze: { program: { tool_blocks: [], filename: "x", filepath: "x" } },
      ai_training_lathe_rewrite: { analysis: { program: { tool_blocks: [] }, issues: [] } },
      ai_training_lathe_train: { programs: [{ content: "M30\n", filepath: "x.MIN" }] },
      ai_training_ledger_open_run: {
        experiment_id: "smoke",
        attempt: 1,
        start_ts: 1,
        base_weight_sha256: "a".repeat(64),
        manifest_sha256: "b".repeat(64),
        aug_seed: 1,
        hyperparams_sha256: "c".repeat(64),
        tokenizer_version: "tv",
        trainer_commit_sha: "abc1234",
        author: "t",
      },
      ai_training_ledger_close_run: {
        run_id: "any",
        end_ts: 1,
        status: "completed",
        elapsed_ms: 1,
        wall_clock_ms: 1,
      },
      ai_training_ledger_get_run: { run_id: "any" },
      ai_training_ledger_drift_report: { experiment_id: "exp" },
      ai_training_ledger_load_snapshot: { snapshot: { runs: [], schemaVersion: 1 } },
    };

    masterAITrainingLedgerEngine.reset();
    trainingLedgerEngine.clearAll();

    for (const action of AI_CAPABILITY_ACTIONS) {
      const params = minViable[action] ?? {};
      const r = await call(server, action, params);
      const errMsg = (r.raw.error as string | undefined) ?? "";
      expect(errMsg.toLowerCase()).not.toContain("unknown action");
    }
  });

  it("the dispatcher rejects truly unknown actions", async () => {
    const r = await call(server, "ai_capability_obviously_fake", {});
    expect(r.ok).toBe(false);
    const errMsg = (r.raw.error as string | undefined) ?? "";
    expect(errMsg.length).toBeGreaterThan(0);
  });

  it("legacy ai_material_lookup still works (anti-regression)", async () => {
    const r = await call(server, "ai_material_lookup", { material: "AISI 4140" });
    expect(r.ok).toBe(true);
  });

  it("legacy ai_lathe_train still works (anti-regression) and returns programs_parsed≥1", async () => {
    const r = await call(server, "ai_lathe_train", {
      programs: [{ content: "M30\n", filepath: "x.MIN" }],
    });
    expect(r.ok).toBe(true);
    expect((r.data.programs_parsed as number)).toBeGreaterThanOrEqual(1);
  });
});
