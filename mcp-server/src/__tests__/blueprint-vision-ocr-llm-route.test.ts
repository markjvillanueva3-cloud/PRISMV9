/**
 * BlueprintVisionOCREngine LLM-route migration test
 * (FREE-AI-MIGRATION/U-BLUEPRINT-VISION-OCR-LLM-ROUTE, slot:india).
 *
 * Verifies the engine's vision chokepoint `callVision` was migrated from a DIRECT paid
 * Claude Vision call (new Anthropic().messages.create) to the free Ollama-first
 * llmEngine.queryVision substrate. Under VITEST, queryVision's default provider paths are
 * net-disabled -> it returns model:"offline", and callVision THROWS on offline (R12: a
 * blueprint OCR read needs a REAL provider, never a stub parsed into bogus dimensions).
 *
 * Properties proven:
 *  1. ROUTING -- analyzeBlueprint(file) + quickExtract reach the migrated
 *     "No vision AI provider available" throw, reachable only via the queryVision offline path.
 *     The OLD SDK call would throw a network/SDK error, not this message.
 *  2. SEAM FIX -- the old getClient() "ANTHROPIC_API_KEY not set" pre-call gate is gone; the
 *     base64 path (which also went through getClient) now reaches the free substrate with no key.
 *  3. PRE-EXISTING GUARDS intact -- a missing image file and a URL source still fail fast at
 *     resolveImage, never reaching a provider.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { blueprintVisionOCREngine } from "../engines/BlueprintVisionOCREngine.js";

const NO_PROVIDER = /No vision AI provider available/i;
const OLD_KEY_GATE = /ANTHROPIC_API_KEY not set/;

let tmpDir: string;
let pngPath: string;
let savedKey: string | undefined;

beforeAll(() => {
  // No ANTHROPIC_API_KEY -> the queryVision claude rung is skipped -> deterministic offline
  // (paired with VITEST net-disable of both vision provider paths).
  savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-bp-vision-test-"));
  pngPath = path.join(tmpDir, "blueprint.png");
  // resolveImage only does fs.readFileSync().toString("base64") -- any bytes are valid input.
  fs.writeFileSync(pngPath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03]));
});

afterAll(() => {
  if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
});

describe("BlueprintVisionOCREngine -> free llmEngine.queryVision substrate", () => {
  it("analyzeBlueprint(file) routes through queryVision; offline -> throws no-provider (R12), not the old key gate", async () => {
    let msg = "";
    try {
      await blueprintVisionOCREngine.analyzeBlueprint({
        image: { type: "file", path: pngPath },
        blueprint_type: "wire_edm",
      });
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    // routed through queryVision (offline under hermeticity) -- the migrated throw, not an SDK error.
    expect(msg).toMatch(NO_PROVIDER);
    // SEAM: the old getClient() pre-call ANTHROPIC_API_KEY gate is gone.
    expect(msg).not.toMatch(OLD_KEY_GATE);
  });

  it("quickExtract also routes through queryVision and fails loud offline", async () => {
    await expect(
      blueprintVisionOCREngine.quickExtract({ image: { type: "file", path: pngPath } }),
    ).rejects.toThrow(NO_PROVIDER);
  });

  it("base64 image source (no file) also reaches the free substrate -- proves the getClient key gate was removed", async () => {
    let msg = "";
    try {
      await blueprintVisionOCREngine.analyzeBlueprint({
        image: {
          type: "base64",
          data: Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64"),
          media_type: "image/png",
        },
      });
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    expect(msg).toMatch(NO_PROVIDER);
    expect(msg).not.toMatch(OLD_KEY_GATE);
  });

  it("a missing image file fails fast at the pre-existing resolveImage guard (never reaches a provider)", async () => {
    let msg = "";
    try {
      await blueprintVisionOCREngine.analyzeBlueprint({
        image: { type: "file", path: path.join(tmpDir, "does-not-exist.png") },
      });
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    expect(msg).toMatch(/Image file not found/i);
    expect(msg).not.toMatch(NO_PROVIDER); // proves the file guard precedes the provider call
  });

  it("a URL image source still rejects with the unchanged resolveImage guidance (never reaches a provider)", async () => {
    let msg = "";
    try {
      await blueprintVisionOCREngine.analyzeBlueprint({
        image: { type: "url", url: "https://example.com/blueprint.png" },
      });
    } catch (e: any) {
      msg = String(e?.message ?? e);
    }
    expect(msg).toMatch(/URL image sources require the API to fetch/i);
    expect(msg).not.toMatch(NO_PROVIDER);
  });
});
