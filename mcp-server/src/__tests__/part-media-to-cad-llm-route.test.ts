/**
 * PartMediaToCADEngine LLM-route migration test
 * (FREE-AI-MIGRATION/U-PARTMEDIA-TO-CAD-LLM-ROUTE, slot:india).
 *
 * Verifies the engine's per-frame vision call was migrated from a DIRECT paid Claude Vision
 * call (new Anthropic({apiKey}).messages.create, gated on ANTHROPIC_API_KEY) to the free
 * Ollama-first llmEngine.queryVision substrate. Under VITEST, queryVision's default provider
 * paths are net-disabled -> model:"offline"; analyzeFrame THROWS on offline, which the
 * generateFromMedia per-frame try/catch records as a warning + emptyPrimitive (this engine's
 * documented always-returns-degraded contract). The OLD ANTHROPIC_API_KEY pre-call gate
 * (which threw before any frame) is gone.
 *
 * Properties proven:
 *  1. SEAM FIX -- with NO key the engine no longer throws "ANTHROPIC_API_KEY not set"; it
 *     reaches the free substrate and degrades per-frame.
 *  2. ROUTING -- the per-frame warning is the migrated "No vision AI provider available"
 *     message, reachable only via the queryVision offline path.
 *  3. R12 HONESTY -- zero successful frames -> meta.model "offline", total_vision_calls 0,
 *     consensus.confidence 0, and a loud "NOT based on real part data" warning.
 *  4. PRE-EXISTING GUARD intact -- no images and no video still fails fast.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { partMediaToCADEngine } from "../engines/PartMediaToCADEngine.js";

const NO_PROVIDER = /No vision AI provider available/i;

let tmpDir: string;
let pngPath: string;
let savedKey: string | undefined;

beforeAll(() => {
  // No ANTHROPIC_API_KEY -> queryVision's claude rung is skipped -> deterministic offline
  // (paired with VITEST net-disable of both vision provider paths).
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-partmedia-test-"));
  pngPath = path.join(tmpDir, "part.png");
  fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]));
});

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
});

describe("PartMediaToCADEngine -> free llmEngine.queryVision substrate", () => {
  it("file image + no key: routes through queryVision (seam removed), degrades offline, reports the real provider (R12)", async () => {
    const result = await partMediaToCADEngine.generateFromMedia({
      images: [{ kind: "file", path: pngPath }],
    });
    // offline under hermeticity -> no frame succeeded
    expect(result.meta.total_vision_calls).toBe(0);
    expect(result.meta.model).toBe("offline"); // R12: real provider, not a hardcoded "claude-..."
    const warn = result.warnings.join(" | ");
    // ROUTING: the per-frame failure is the migrated queryVision offline message
    expect(warn).toMatch(NO_PROVIDER);
    // R12: the all-frames-offline loud warning fired
    expect(warn).toMatch(/NOT based on real part data/i);
    // SEAM: the old pre-call ANTHROPIC_API_KEY gate is gone (it would have thrown before any frame)
    expect(warn).not.toMatch(/ANTHROPIC_API_KEY not set/);
  });

  it("base64 image source also routes through the free substrate (offline -> degraded)", async () => {
    const result = await partMediaToCADEngine.generateFromMedia({
      images: [{
        kind: "base64",
        data: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"),
        mediaType: "image/png",
      }],
    });
    expect(result.meta.total_vision_calls).toBe(0);
    expect(result.warnings.join(" | ")).toMatch(NO_PROVIDER);
  });

  it("url source: a failed fetch (!ok) degrades to a per-frame warning (the new in-engine URL fetch path)", async () => {
    // Stub the EXTERNAL network only (test convention: mock external deps); the SUT engine runs for real.
    const orig = global.fetch;
    global.fetch = vi.fn(async () => ({ ok: false, status: 404 })) as any;
    try {
      const result = await partMediaToCADEngine.generateFromMedia({
        images: [{ kind: "url", url: "https://example.com/missing.png" }],
      });
      expect(result.meta.total_vision_calls).toBe(0);
      expect(result.warnings.join(" | ")).toMatch(/image URL fetch failed: 404/);
    } finally {
      global.fetch = orig;
    }
  });

  it("url source: a successful fetch -> base64 -> queryVision (offline -> degraded), proving the url->vision wiring", async () => {
    const orig = global.fetch;
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    const fetchSpy = vi.fn(async () => ({ ok: true, status: 200, arrayBuffer: async () => pngBytes }));
    global.fetch = fetchSpy as any;
    try {
      const result = await partMediaToCADEngine.generateFromMedia({
        images: [{ kind: "url", url: "https://example.com/part.png" }],
      });
      // the url branch was taken (bytes fetched) and routed into queryVision (offline under hermeticity)
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.meta.total_vision_calls).toBe(0);
      expect(result.warnings.join(" | ")).toMatch(NO_PROVIDER);
    } finally {
      global.fetch = orig;
    }
  });

  it("zero successful frames -> consensus confidence 0 surfaced as an operator warning (R12 degraded, never silent)", async () => {
    const result = await partMediaToCADEngine.generateFromMedia({
      images: [{ kind: "file", path: pngPath }],
    });
    expect(result.consensus.confidence).toBe(0);
    expect(result.warnings.join(" | ")).toMatch(/NOT based on real part data|operator MUST verify/i);
  });

  it("no images and no extractable video still fails fast at the pre-existing guard (never reaches a provider)", async () => {
    await expect(
      partMediaToCADEngine.generateFromMedia({}),
    ).rejects.toThrow(/no images and no extractable video frames/i);
  });
});
