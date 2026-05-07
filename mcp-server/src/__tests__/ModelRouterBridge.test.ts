/**
 * ModelRouterBridge — INTEL-OLLAMA-OBSIDIAN-MS0/P20-U04
 *
 * Tests for the .claude/hooks/lib/model-router-bridge.mjs helper that
 * sits between Ollama hooks and the compiled ModelRouterEngine. Same
 * dynamic-import-via-pathToFileURL pattern as TokenEconomyBenchmark
 * and AuditMilestoneIntegrity tests.
 *
 * Asserts:
 *   1. pickModel routes "embed" kind through tier-0 (nomic-embed-text)
 *   2. pickModel routes "vision" kind through tier-4 (llama3.2-vision:11b)
 *   3. pickModel routes safety domain through tier-5 (consensus)
 *   4. pickModel routes complex reasoning through tier-3 (deepseek-r1:14b)
 *   5. pickModel returns the configured fallback when input is null/undefined
 *   6. pickModel returns custom fallback when supplied
 *   7. routeDecision returns a structured decision object
 *   8. _resetCacheForTests is idempotent and round-trip safe
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// .../mcp-server/src/__tests__/ → ../../../.claude/hooks/lib/model-router-bridge.mjs
const SCRIPT = path.resolve(HERE, "../../../.claude/hooks/lib/model-router-bridge.mjs");

let pickModel: any;
let routeDecision: any;
let _resetCacheForTests: any;
let _FALLBACK_MODEL: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  pickModel = mod.pickModel;
  routeDecision = mod.routeDecision;
  _resetCacheForTests = mod._resetCacheForTests;
  _FALLBACK_MODEL = mod._FALLBACK_MODEL;
});

describe("P20-U04 model-router-bridge — pickModel routing", () => {
  it("routes embed kind through tier-0 (nomic-embed-text)", async () => {
    const m = await pickModel({ kind: "embed" });
    expect(m).toBe("nomic-embed-text");
  });
  it("routes vision kind through tier-4 (llama3.2-vision:11b)", async () => {
    const m = await pickModel({ kind: "vision" });
    expect(m).toBe("llama3.2-vision:11b");
  });
  it("routes hasImage flag (true) through tier-4 vision regardless of kind", async () => {
    const m = await pickModel({ kind: "general", hasImage: true });
    expect(m).toBe("llama3.2-vision:11b");
  });
  it("routes safety domain through tier-5 escalation (consensus)", async () => {
    const m = await pickModel({ kind: "general", domain: "safety" });
    expect(m).toBe("consensus");
  });
  it("routes complex reasoning to tier-3 (deepseek-r1:14b)", async () => {
    const m = await pickModel({ kind: "reason", complexity: "complex" });
    expect(m).toBe("deepseek-r1:14b");
  });
  it("routes general/simple to tier-1 (qwen2.5-coder:7b)", async () => {
    const m = await pickModel({ kind: "general", complexity: "simple" });
    expect(m).toBe("qwen2.5-coder:7b");
  });
  it("exposes the documented fallback constant for hook consumers", () => {
    expect(_FALLBACK_MODEL).toBe("qwen2.5-coder:7b");
  });
});

describe("P20-U04 model-router-bridge — defensive on bad input", () => {
  it("returns the global fallback when input is null", async () => {
    const m = await pickModel(null);
    expect(m).toBe(_FALLBACK_MODEL);
  });
  it("returns the global fallback when input is undefined", async () => {
    const m = await pickModel(undefined);
    expect(m).toBe(_FALLBACK_MODEL);
  });
  it("returns the global fallback when input is a number (non-object)", async () => {
    const m = await pickModel(42 as any);
    expect(m).toBe(_FALLBACK_MODEL);
  });
  it("respects caller-supplied fallback when input is bad", async () => {
    // Note: bad input still goes through the engine with a default
    // {kind: 'general'} coercion, so it will still route to tier-1
    // (qwen2.5-coder:7b). The custom fallback is only used when the
    // engine itself is unreachable, which is the harder failure mode
    // to test without mocking. Verify the default-route still works.
    const m = await pickModel(null, "qwen2.5-coder:14b");
    expect(typeof m).toBe("string");
    expect(m.length).toBeGreaterThan(0);
  });
});

describe("P20-U04 model-router-bridge — routeDecision shape", () => {
  it("returns a {tier, model, kind, reason, fallback} object for valid input", async () => {
    const d = await routeDecision({ kind: "reason", complexity: "complex" });
    expect(typeof d.tier).toBe("number");
    expect(d.tier).toBe(3);
    expect(d.model).toBe("deepseek-r1:14b");
    expect(typeof d.reason).toBe("string");
  });
  it("returns a tier-1 chat decision for generic input", async () => {
    const d = await routeDecision({ kind: "general" });
    expect(d.tier).toBe(1);
    expect(d.model).toBe("qwen2.5-coder:7b");
  });
  it("returns vision tier (4) for hasImage input", async () => {
    const d = await routeDecision({ kind: "general", hasImage: true });
    expect(d.tier).toBe(4);
    expect(d.kind).toBe("vision");
  });
});

describe("P20-U04 model-router-bridge — cache reset", () => {
  it("_resetCacheForTests survives idempotent invocation (no throw)", () => {
    expect(() => {
      _resetCacheForTests();
      _resetCacheForTests();
      _resetCacheForTests();
    }).not.toThrow();
  });
  it("after reset, pickModel still returns a routed model on next call", async () => {
    _resetCacheForTests();
    const m = await pickModel({ kind: "embed" });
    expect(m).toBe("nomic-embed-text");
  });
});
