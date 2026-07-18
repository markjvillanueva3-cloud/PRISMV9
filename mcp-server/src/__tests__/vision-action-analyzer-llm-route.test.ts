/**
 * VisionActionAnalyzerEngine LLM-route migration test
 * (FREE-AI-MIGRATION/U-VISION-ACTION-ANALYZER-LLM-ROUTE, slot:india).
 *
 * Verifies the engine's vision chokepoint `callVisionAPI` was migrated from a DIRECT paid Claude
 * Vision call (new Anthropic().messages.create) to the free Ollama-first llmEngine.queryVision
 * substrate. Under VITEST, queryVision's default provider paths are net-disabled -> it returns
 * model:"offline", and callVisionAPI THROWS on offline (R12: a frame read needs a REAL provider,
 * never a stub). Exercised through the REAL public methods (analyzeFrame / analyzeFramePair),
 * which read temp image files from disk -> base64 -> route to queryVision.
 *
 * Properties proven:
 *  1. ROUTING -- the failure is the migrated "No vision AI provider available" message, reachable
 *     only via the queryVision offline path. The OLD SDK call would throw a network/SDK error.
 *  2. SEAM FIX -- the old getClient() "ANTHROPIC_API_KEY not set" pre-call gate is gone (the free
 *     path is reached with no key).
 *  3. PRE-EXISTING GUARD intact -- a missing image file still fails fast (does not reach a provider).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { visionActionAnalyzerEngine } from "../engines/VisionActionAnalyzerEngine.js";

const NO_PROVIDER = /No vision AI provider available/i;
const OLD_KEY_GATE = /ANTHROPIC_API_KEY not set/;

let tmpDir: string;
let framePng: string;
let frameBPng: string;
let savedKey: string | undefined;

beforeAll(() => {
  // No ANTHROPIC_API_KEY -> the queryVision claude rung is skipped -> deterministic offline.
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-vision-test-"));
  framePng = path.join(tmpDir, "frame.png");
  frameBPng = path.join(tmpDir, "frameB.png");
  // readImageBase64 only does fs.readFileSync().toString("base64") -- any bytes are valid input.
  fs.writeFileSync(framePng, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]));
  fs.writeFileSync(frameBPng, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x04, 0x05, 0x06]));
});

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
});

describe("VisionActionAnalyzerEngine -> free llmEngine.queryVision substrate", () => {
  it("analyzeFrame routes through queryVision; offline -> throws the no-provider error (R12), not the old key gate", async () => {
    let msg = "";
    try {
      await visionActionAnalyzerEngine.analyzeFrame(framePng);
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    // routed through queryVision (offline under hermeticity) -- the migrated throw, not an SDK error.
    expect(msg).toMatch(NO_PROVIDER);
    // SEAM: the old getClient() pre-call ANTHROPIC_API_KEY gate is gone.
    expect(msg).not.toMatch(OLD_KEY_GATE);
  });

  it("analyzeFramePair (two images) also routes through queryVision and fails loud offline", async () => {
    await expect(
      visionActionAnalyzerEngine.analyzeFramePair(framePng, frameBPng),
    ).rejects.toThrow(NO_PROVIDER);
  });

  it("a missing image file still fails fast at the pre-existing guard (never reaches a provider)", async () => {
    let msg = "";
    try {
      await visionActionAnalyzerEngine.analyzeFrame(path.join(tmpDir, "does-not-exist.png"));
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    expect(msg).toMatch(/Image file not found/i);
    expect(msg).not.toMatch(NO_PROVIDER); // proves the file guard precedes the provider call
  });
});
