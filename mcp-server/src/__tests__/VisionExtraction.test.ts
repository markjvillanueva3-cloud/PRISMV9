/**
 * VisionExtraction — INTEL-OLLAMA-OBSIDIAN-MS0/P21-U01.
 *
 * Pure-function tests for VisionExtractionEngine. The engine wraps Ollama
 * llama3.2-vision:11b for image+text understanding and falls back to
 * qwen2.5-coder:7b for text-only inputs. These tests exercise every pure
 * helper exhaustively + the .extract() error envelopes that don't require
 * a live Ollama server.
 *
 * Asserts:
 *   1. normalizeInput correctly classifies image / pdf / text / unknown
 *      from the file extension; safe on null/empty input.
 *   2. selectModel routes image+pdf → vision, text → qwen, with override
 *      and forceText escapes.
 *   3. encodeImageToBase64 strips data: URLs, encodes Uint8Array via
 *      Buffer.toString("base64").
 *   4. buildOllamaRequest emits the documented body shape, with images[]
 *      array only when imageB64 present.
 *   5. parseOllamaResponse maps Ollama's {response: string} body into our
 *      envelope and rejects malformed shapes.
 *   6. .extract() returns structured error envelopes on prompt missing,
 *      invalid path, unsupported extension, and PDF input.
 */

import { describe, it, expect } from "vitest";
import {
  VisionExtractionEngine,
  visionExtractionEngine,
  normalizeInput,
  selectModel,
  encodeImageToBase64,
  buildOllamaRequest,
  parseOllamaResponse,
  type InputKind,
} from "../engines/VisionExtractionEngine.js";

describe("P21-U01 normalizeInput", () => {
  it("classifies common image extensions as 'image' (ok=true)", () => {
    for (const ext of [".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp"]) {
      const n = normalizeInput(`/tmp/foo${ext}`);
      expect(n).not.toBeNull();
      expect(n!.kind).toBe("image");
      expect(n!.ok).toBe(true);
    }
  });

  it("classifies .pdf as 'pdf' (ok=true)", () => {
    const n = normalizeInput("/tmp/blueprint.pdf");
    expect(n!.kind).toBe("pdf");
    expect(n!.ok).toBe(true);
  });

  it("classifies common text extensions as 'text' (ok=true)", () => {
    for (const ext of [".txt", ".md", ".csv", ".json", ".yaml", ".yml"]) {
      const n = normalizeInput(`/tmp/notes${ext}`);
      expect(n!.kind).toBe("text");
      expect(n!.ok).toBe(true);
    }
  });

  it("returns kind='unknown' with ok=false for unsupported extensions", () => {
    const n = normalizeInput("/tmp/blob.xyz");
    expect(n!.kind).toBe("unknown");
    expect(n!.ok).toBe(false);
    expect(n!.reason).toContain("unsupported");
  });

  it("returns kind='unknown' with ok=false for paths without extensions", () => {
    const n = normalizeInput("/tmp/no-extension");
    expect(n!.kind).toBe("unknown");
    expect(n!.ok).toBe(false);
    expect(n!.reason).toContain("no extension");
  });

  it("is case-insensitive on extension", () => {
    expect(normalizeInput("/tmp/FOO.PNG")!.kind).toBe("image");
    expect(normalizeInput("/tmp/Doc.PDF")!.kind).toBe("pdf");
    expect(normalizeInput("/tmp/Notes.MD")!.kind).toBe("text");
  });

  it("returns null for non-string / empty / whitespace input", () => {
    expect(normalizeInput(null)).toBeNull();
    expect(normalizeInput(undefined)).toBeNull();
    expect(normalizeInput("")).toBeNull();
    expect(normalizeInput("   ")).toBeNull();
    expect(normalizeInput(42)).toBeNull();
  });

  it("trims whitespace before classifying", () => {
    expect(normalizeInput("  /tmp/foo.png  ")!.kind).toBe("image");
  });
});

describe("P21-U01 selectModel", () => {
  it("routes image kind to vision model", () => {
    const r = selectModel("image");
    expect(r.model).toBe("llama3.2-vision:11b");
    expect(r.reason).toContain("vision");
  });

  it("routes pdf kind to vision model", () => {
    const r = selectModel("pdf");
    expect(r.model).toBe("llama3.2-vision:11b");
  });

  it("routes text kind to qwen text model", () => {
    const r = selectModel("text");
    expect(r.model).toBe("qwen2.5-coder:7b");
    expect(r.reason).toContain("text");
  });

  it("unknown kind falls back to text model", () => {
    const r = selectModel("unknown");
    expect(r.model).toBe("qwen2.5-coder:7b");
    expect(r.reason).toContain("fallback");
  });

  it("modelOverride wins over kind-based routing", () => {
    expect(selectModel("image", { modelOverride: "custom-model" }).model).toBe("custom-model");
    expect(selectModel("text",  { modelOverride: "x" }).model).toBe("x");
  });

  it("forceText collapses image/pdf to text model", () => {
    const r = selectModel("image", { forceText: true });
    expect(r.model).toBe("qwen2.5-coder:7b");
    expect(r.reason).toContain("forceText");
  });

  it("modelOverride beats forceText", () => {
    expect(selectModel("image", { modelOverride: "X", forceText: true }).model).toBe("X");
  });
});

describe("P21-U01 encodeImageToBase64", () => {
  it("encodes a Uint8Array as base64 (4-byte JPEG header)", () => {
    // Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64") === "/9j/4A=="
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(encodeImageToBase64(bytes)).toBe("/9j/4A==");
  });

  it("strips data: URL prefix when given a string", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    expect(encodeImageToBase64(dataUrl)).toBe("iVBORw0KGgo=");
  });

  it("returns string unchanged when no data: prefix", () => {
    expect(encodeImageToBase64("iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });

  it("safe on empty input", () => {
    expect(encodeImageToBase64(new Uint8Array(0))).toBe("");
    expect(encodeImageToBase64("")).toBe("");
  });

  it("matches Buffer.toString('base64') output for known bytes", () => {
    const bytes = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]); // "Hello"
    expect(encodeImageToBase64(bytes)).toBe("SGVsbG8=");
  });
});

describe("P21-U01 buildOllamaRequest", () => {
  it("emits {model, prompt, stream:false} for text-only requests", () => {
    const body = buildOllamaRequest("qwen2.5-coder:7b", "explain X");
    expect(body).toEqual({
      model: "qwen2.5-coder:7b",
      prompt: "explain X",
      stream: false,
    });
  });

  it("adds images[] array when imageB64 is provided", () => {
    const body = buildOllamaRequest("llama3.2-vision:11b", "describe", "iVBORw0KGgo=");
    expect(body).toEqual({
      model: "llama3.2-vision:11b",
      prompt: "describe",
      stream: false,
      images: ["iVBORw0KGgo="],
    });
  });

  it("omits images[] when imageB64 is empty string", () => {
    const body = buildOllamaRequest("qwen2.5-coder:7b", "x", "") as any;
    expect(body.images).toBeUndefined();
  });

  it("omits images[] when imageB64 is undefined", () => {
    const body = buildOllamaRequest("qwen2.5-coder:7b", "x", undefined) as any;
    expect(body.images).toBeUndefined();
  });
});

describe("P21-U01 parseOllamaResponse", () => {
  it("parses a well-formed response body", () => {
    const r = parseOllamaResponse({ response: "Hello world" });
    expect(r).toEqual({ text: "Hello world", ok: true });
  });

  it("returns ok=false when 'response' field is missing", () => {
    const r = parseOllamaResponse({ done: true });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("missing");
  });

  it("returns ok=false when 'response' is non-string", () => {
    const r = parseOllamaResponse({ response: 42 });
    expect(r.ok).toBe(false);
  });

  it("returns ok=false on null / non-object input", () => {
    expect(parseOllamaResponse(null).ok).toBe(false);
    expect(parseOllamaResponse(undefined).ok).toBe(false);
    expect(parseOllamaResponse("string").ok).toBe(false);
    expect(parseOllamaResponse(42).ok).toBe(false);
  });

  it("preserves an empty-string response (rare but valid: model truncated)", () => {
    const r = parseOllamaResponse({ response: "" });
    expect(r.ok).toBe(true);
    expect(r.text).toBe("");
  });
});

describe("P21-U01 .extract() error envelopes (no live Ollama needed)", () => {
  it("returns ok=false when prompt is missing", async () => {
    const r = await visionExtractionEngine.extract({ prompt: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("prompt");
  });

  it("returns ok=false when prompt is non-string (typed-out edge)", async () => {
    const r = await visionExtractionEngine.extract({ prompt: 42 as any });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("prompt");
  });

  it("returns ok=false for invalid path (null after normalize)", async () => {
    const r = await visionExtractionEngine.extract({ prompt: "x", path: "" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("invalid path");
  });

  it("returns ok=false for unsupported extension", async () => {
    const r = await visionExtractionEngine.extract({ prompt: "x", path: "/tmp/file.xyz" });
    expect(r.ok).toBe(false);
    expect(r.error).toContain("unsupported");
    expect(r.kind).toBe("unknown");
  });

  it("rejects PDF input with a hint about P13-U03", async () => {
    const r = await visionExtractionEngine.extract({ prompt: "x", path: "/tmp/blueprint.pdf" });
    expect(r.ok).toBe(false);
    expect(r.kind).toBe("pdf");
    expect(r.error).toContain("rendered to image");
    expect(r.error).toContain("P13-U03");
  });

  it("returns durationMs and ts on every envelope", async () => {
    const r = await visionExtractionEngine.extract({ prompt: "x", path: "/tmp/file.xyz" });
    expect(typeof r.durationMs).toBe("number");
    expect(r.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof r.ts).toBe("string");
    expect(/\d{4}-\d{2}-\d{2}T/.test(r.ts)).toBe(true);
  });
});

describe("P21-U01 singleton", () => {
  it("the exported singleton is an instance of VisionExtractionEngine", () => {
    expect(visionExtractionEngine).toBeInstanceOf(VisionExtractionEngine);
  });
});
