/**
 * VideoLearningEngine.analyzeKeyframes LLM-route migration test
 * (FREE-AI-MIGRATION/U-VIDEO-LEARNING-LLM-ROUTE, slot:india).
 *
 * Verifies the multi-image keyframe batch call was migrated from a DIRECT paid Claude Vision
 * fetch (POST api.anthropic.com/v1/messages, model claude-haiku-4-5, gated on ANTHROPIC_API_KEY
 * with warn-and-return-[]) to the free Ollama-first llmEngine.queryVision substrate. The engine
 * dynamic-imports the SAME llmEngine singleton, so vi.spyOn(llmEngine, "queryVision") intercepts
 * the real call.
 *
 * Properties proven:
 *  1. SEAM FIX + ROUTING -- with NO key the engine no longer early-returns [] without a provider;
 *     it now CALLS queryVision (the migration). Offline -> the batch is skipped (no fabrication, R12).
 *  2. MULTI-IMAGE BATCH -- all frames in a batch are sent as one queryVision call's images[].
 *  3. SUCCESS PATH -- a valid JSON-array answer is parsed into FrameAnalysis[] with the real frame
 *     timestamp mapped over the model-reported one.
 *  4. EDGE -- no frames -> [] with zero provider calls.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { videoLearningEngine } from "../engines/VideoLearningEngine.js";
import type { KeyframeInfo } from "../engines/VideoLearningEngine.js";
import { llmEngine } from "../engines/LLMEngine.js";

const engine = videoLearningEngine;

let tmpDir: string;
let frameA: KeyframeInfo;
let frameB: KeyframeInfo;
let savedKey: string | undefined;

beforeAll(() => {
  // No ANTHROPIC_API_KEY -> queryVision's claude rung is skipped -> deterministic offline
  // (paired with VITEST net-disable). Proves the migration works with no Claude key.
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-videolearn-test-"));
  const a = path.join(tmpDir, "kf0.png");
  const b = path.join(tmpDir, "kf1.png");
  fs.writeFileSync(a, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01]));
  fs.writeFileSync(b, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x02]));
  frameA = { path: a, timestamp: 12 };
  frameB = { path: b, timestamp: 34 };
});

afterEach(() => { vi.restoreAllMocks(); });

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
});

describe("VideoLearningEngine.analyzeKeyframes -> free llmEngine.queryVision substrate", () => {
  it("routes the batch through queryVision (seam removed: no key no longer early-returns []); offline -> [] (R12 no fabrication)", async () => {
    const spy = vi.spyOn(llmEngine, "queryVision"); // call through -> offline under VITEST
    const result = await engine.analyzeKeyframes([frameA, frameB], { title: "Test", domain: "milling" });
    // MIGRATION proof: the OLD code with no key returned [] WITHOUT calling a provider; now it calls queryVision.
    expect(spy).toHaveBeenCalledTimes(1);
    const arg = spy.mock.calls[0][0];
    expect(arg.images).toHaveLength(2);   // multi-image batch routed as images[]
    expect(arg.complexity).toBe("high");
    // offline under hermeticity -> batch skipped, zero fabricated analyses
    expect(result).toHaveLength(0);
  });

  it("success path: a valid JSON-array answer is parsed into FrameAnalysis[] with the real frame timestamp mapped", async () => {
    vi.spyOn(llmEngine, "queryVision").mockResolvedValue({
      answer: '[{"timestamp": 0, "description": "extruding a pocket", "extracted_values": {"depth_mm": "25"}, "ui_elements": ["toolbar"], "category": "parameters"}]',
      context_used: [],
      model: "qwen2.5vl:7b (ollama)",
      tokens_used: { input: 10, output: 20 },
      duration_ms: 5,
      cached: false,
    });
    const result = await engine.analyzeKeyframes([frameA], { title: "Test" });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("parameters");
    expect(result[0].extracted_values.depth_mm).toBe("25");
    // the engine overrides the model-reported timestamp with the REAL frame timestamp
    expect(result[0].timestamp).toBe(frameA.timestamp);
  });

  it("multi-image batch: all frames in one batch go in a single queryVision call as images[]", async () => {
    const spy = vi.spyOn(llmEngine, "queryVision").mockResolvedValue({
      answer: "[]",
      context_used: [],
      model: "qwen2.5vl (ollama)",
      tokens_used: { input: 1, output: 1 },
      duration_ms: 1,
      cached: false,
    });
    await engine.analyzeKeyframes([frameA, frameB], {}, 4); // batchSize 4 -> one batch of 2
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].images).toHaveLength(2);
  });

  it("a non-JSON answer (no array) is silently skipped -- no fabricated FrameAnalysis (parse contract)", async () => {
    vi.spyOn(llmEngine, "queryVision").mockResolvedValue({
      answer: "I can see a CAM toolbar but cannot extract structured values.",
      context_used: [],
      model: "qwen2.5vl (ollama)",
      tokens_used: { input: 5, output: 9 },
      duration_ms: 3,
      cached: false,
    });
    const result = await engine.analyzeKeyframes([frameA], {});
    // no JSON-array match -> the batch contributes nothing, and the engine does NOT throw or fabricate
    expect(result).toHaveLength(0);
  });

  it("no frames -> returns [] without invoking any vision provider (no wasted call)", async () => {
    const spy = vi.spyOn(llmEngine, "queryVision");
    const result = await engine.analyzeKeyframes([], {});
    expect(spy).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });
});
