/**
 * IdeaBlockGovernanceEngine — vitest suite
 * OBSIDIAN-INTELLIGENCE-MS3 / E4 — auto-tag IdeaBlocks with 4 governance axes.
 *
 * Test seam: pluggable ClassifierFn injected via constructor.
 */

import { describe, it, expect } from "vitest";
import {
  buildClassifyPrompt,
  tryParseGovernanceJson,
  IdeaBlockGovernanceEngine,
  GovernanceTagsSchema,
  IdeaBlockGovernanceErrorClassSchema,
  type ClassifierFn,
  type ClassifierResult,
} from "../engines/IdeaBlockGovernanceEngine.js";

// ---------- enum + schema invariants ----------

describe("IdeaBlockGovernanceErrorClassSchema", () => {
  it("exposes all 6 canonical error classes", () => {
    const values = IdeaBlockGovernanceErrorClassSchema.options;
    expect(values).toContain("ollama-unreachable");
    expect(values).toContain("json-parse-failed");
    expect(values).toContain("schema-violation");
    expect(values).toContain("empty-input");
    expect(values).toContain("low-confidence");
    expect(values).toContain("timeout");
  });
});

describe("GovernanceTagsSchema", () => {
  it("validates a complete valid object", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "public",
      version_state: "current",
      product_line: "sfc",
      export_control: "none",
      confidence: 0.92,
    });
    expect(r.success).toBe(true);
  });

  it("rejects out-of-enum clearance", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "top-secret",
      version_state: "current",
      product_line: "sfc",
      export_control: "none",
      confidence: 0.9,
    });
    expect(r.success).toBe(false);
  });

  it("rejects confidence > 1", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "public",
      version_state: "current",
      product_line: "sfc",
      export_control: "none",
      confidence: 1.5,
    });
    expect(r.success).toBe(false);
  });

  it("rejects confidence < 0", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "public",
      version_state: "current",
      product_line: "sfc",
      export_control: "none",
      confidence: -0.1,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown export_control value", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "internal",
      version_state: "draft",
      product_line: "wedm",
      export_control: "TOP-SECRET",
      confidence: 0.8,
    });
    expect(r.success).toBe(false);
  });

  it("rejects extra fields (.strict mode)", () => {
    const r = GovernanceTagsSchema.safeParse({
      clearance: "public",
      version_state: "current",
      product_line: "sfc",
      export_control: "none",
      confidence: 0.9,
      extra: "field",
    });
    expect(r.success).toBe(false);
  });
});

// ---------- buildClassifyPrompt ----------

describe("buildClassifyPrompt", () => {
  it("includes the full enum lists for all 4 axes", () => {
    const p = buildClassifyPrompt("Q?", "A.");
    expect(p).toContain("public");
    expect(p).toContain("confidential");
    expect(p).toContain("deprecated");
    expect(p).toContain("master-post");
    expect(p).toContain("ITAR");
  });

  it("embeds the question and answer payload", () => {
    const p = buildClassifyPrompt("What is X?", "X is the answer to all things.");
    expect(p).toContain("What is X?");
    expect(p).toContain("X is the answer to all things.");
  });

  it("truncates oversized input to bound prompt length", () => {
    const huge = "a".repeat(20_000);
    const p = buildClassifyPrompt(huge, huge);
    // Prompt body MUST be < input × 2 + boilerplate (rough bound)
    expect(p.length).toBeLessThan(20_000);
  });
});

// ---------- tryParseGovernanceJson ----------

describe("tryParseGovernanceJson", () => {
  it("parses a clean JSON object with clearance key", () => {
    const obj = tryParseGovernanceJson('{"clearance":"public","x":1}');
    expect(obj).not.toBeNull();
    expect(obj!.clearance).toBe("public");
  });

  it("returns null on empty / non-string input", () => {
    expect(tryParseGovernanceJson("")).toBeNull();
    expect(tryParseGovernanceJson(undefined as unknown as string)).toBeNull();
  });

  it("strips prose surrounding the JSON object", () => {
    const obj = tryParseGovernanceJson('Here is your answer: {"clearance":"internal"} (end)');
    expect(obj!.clearance).toBe("internal");
  });

  it("hostile-payload safe: skips bogus brace before real one", () => {
    const obj = tryParseGovernanceJson('{"bogus":"no_clearance_key"} {"clearance":"public"}');
    expect(obj).not.toBeNull();
    expect(obj!.clearance).toBe("public");
  });

  it("returns first parseable object (with clearance) preferred over any earlier non-clearance one", () => {
    const obj = tryParseGovernanceJson('{"a":1} text {"clearance":"public","b":2}');
    expect(obj!.clearance).toBe("public");
  });

  it("returns null when no JSON object found", () => {
    expect(tryParseGovernanceJson("no braces here, just prose")).toBeNull();
  });

  it("handles nested braces correctly (depth-aware)", () => {
    const obj = tryParseGovernanceJson('{"clearance":"public","nested":{"a":1,"b":2}}');
    expect(obj!.clearance).toBe("public");
  });

  it("handles braces inside strings without breaking depth count", () => {
    const obj = tryParseGovernanceJson('{"clearance":"public","note":"with } brace"}');
    expect(obj!.clearance).toBe("public");
  });
});

// ---------- IdeaBlockGovernanceEngine ----------

function stubClassifier(text: string, ok = true): ClassifierFn {
  return async (_prompt: string): Promise<ClassifierResult> => ({ ok, text });
}

const validTagPayload = {
  clearance: "internal" as const,
  version_state: "current" as const,
  product_line: "mill" as const,
  export_control: "none" as const,
  confidence: 0.88,
};

describe("IdeaBlockGovernanceEngine.classify", () => {
  it("returns empty-input on missing question/answer", async () => {
    const e = new IdeaBlockGovernanceEngine({ classifier: stubClassifier("") });
    const r1 = await e.classify({ question: "", answer: "x" });
    const r2 = await e.classify({ question: "x", answer: "" });
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.error).toBe("empty-input");
    expect(r2.ok).toBe(false);
    if (!r2.ok) expect(r2.error).toBe("empty-input");
  });

  it("returns ok:true and tagged payload on valid Ollama response", async () => {
    const e = new IdeaBlockGovernanceEngine({
      classifier: stubClassifier(JSON.stringify(validTagPayload)),
    });
    const r = await e.classify({ question: "How do we cut?", answer: "Use 4-flute end mill." });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tags.clearance).toBe("internal");
      expect(r.tags.product_line).toBe("mill");
      expect(r.tags.confidence).toBeCloseTo(0.88);
    }
  });

  it("returns json-parse-failed on raw text that isn't parseable JSON", async () => {
    const e = new IdeaBlockGovernanceEngine({ classifier: stubClassifier("not json at all, just prose") });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("json-parse-failed");
  });

  it("returns schema-violation when Ollama emits invalid enum value", async () => {
    const bad = JSON.stringify({ ...validTagPayload, clearance: "secret" });
    const e = new IdeaBlockGovernanceEngine({ classifier: stubClassifier(bad) });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("schema-violation");
  });

  it("returns low-confidence when score < floor", async () => {
    const low = JSON.stringify({ ...validTagPayload, confidence: 0.3 });
    const e = new IdeaBlockGovernanceEngine({ classifier: stubClassifier(low), confidenceFloor: 0.7 });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("low-confidence");
  });

  it("returns ollama-unreachable when classifier throws", async () => {
    const e = new IdeaBlockGovernanceEngine({
      classifier: async () => { throw new Error("ECONNREFUSED"); },
    });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("ollama-unreachable");
      expect(r.detail).toContain("ECONNREFUSED");
    }
  });

  it("returns ollama-unreachable when classifier returns ok:false", async () => {
    const e = new IdeaBlockGovernanceEngine({
      classifier: async () => ({ ok: false, error: "model-overloaded" }),
    });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("ollama-unreachable");
  });

  it("respects custom confidenceFloor parameter", async () => {
    const mid = JSON.stringify({ ...validTagPayload, confidence: 0.55 });
    const lowFloor = new IdeaBlockGovernanceEngine({ classifier: stubClassifier(mid), confidenceFloor: 0.5 });
    const highFloor = new IdeaBlockGovernanceEngine({ classifier: stubClassifier(mid), confidenceFloor: 0.7 });
    const r1 = await lowFloor.classify({ question: "Q", answer: "A" });
    const r2 = await highFloor.classify({ question: "Q", answer: "A" });
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(false);
  });

  it("classifies all 4 axes independently per Ollama output", async () => {
    const payload = {
      clearance: "confidential" as const,
      version_state: "deprecated" as const,
      product_line: "wedm" as const,
      export_control: "ITAR" as const,
      confidence: 0.95,
    };
    const e = new IdeaBlockGovernanceEngine({ classifier: stubClassifier(JSON.stringify(payload)) });
    const r = await e.classify({ question: "Q", answer: "A" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.tags.clearance).toBe("confidential");
      expect(r.tags.version_state).toBe("deprecated");
      expect(r.tags.product_line).toBe("wedm");
      expect(r.tags.export_control).toBe("ITAR");
    }
  });

  it("8-fixture relay gate: engine faithfully relays classifier output for all 4 axes (8/8)", async () => {
    // This test validates the ENGINE's contract (faithful pass-through of
    // classifier output to schema-validated tags). The envelope's 85%
    // accuracy target is for the REAL Ollama classifier — that's a
    // separate, slower integration test outside this unit suite.
    type Fixture = {
      q: string;
      a: string;
      stub: { clearance: string; version_state: string; product_line: string; export_control: string };
    };
    const fixtures: Fixture[] = [
      { q: "feed per tooth?", a: "chip load / RPM",         stub: { clearance: "public",       version_state: "current",    product_line: "other",       export_control: "none" } },
      { q: "JM Die op note",  a: "4-flute on tool steel",   stub: { clearance: "internal",     version_state: "current",    product_line: "mill",        export_control: "none" } },
      { q: "WEDM voltage",    a: "80V thin wall",            stub: { clearance: "public",       version_state: "current",    product_line: "wedm",        export_control: "none" } },
      { q: "Customer ABC",    a: "5 clamps 2000 lbf",        stub: { clearance: "confidential", version_state: "current",    product_line: "other",       export_control: "none" } },
      { q: "SFC pricing",     a: "$99/seat/mo",              stub: { clearance: "internal",     version_state: "draft",      product_line: "sfc",         export_control: "none" } },
      { q: "Lathe groove",    a: "2mm carbide insert",       stub: { clearance: "public",       version_state: "current",    product_line: "lathe",       export_control: "none" } },
      { q: "Master Post",     a: "G65 P9810",                stub: { clearance: "public",       version_state: "deprecated", product_line: "master-post", export_control: "none" } },
      { q: "ITAR fixture",    a: "ECCN 8A012",               stub: { clearance: "confidential", version_state: "current",    product_line: "other",       export_control: "ITAR" } },
    ];

    let correct = 0;
    await Promise.all(fixtures.map(async (fx) => {
      const classifier: ClassifierFn = async () => ({
        ok: true,
        text: JSON.stringify({ ...fx.stub, confidence: 0.9 }),
      });
      const e = new IdeaBlockGovernanceEngine({ classifier });
      const r = await e.classify({ question: fx.q, answer: fx.a });
      if (
        r.ok &&
        r.tags.clearance === fx.stub.clearance &&
        r.tags.version_state === fx.stub.version_state &&
        r.tags.product_line === fx.stub.product_line &&
        r.tags.export_control === fx.stub.export_control
      ) {
        correct++;
      }
    }));
    expect(correct).toBe(8); // engine relays 8/8 faithfully — that's the contract
  });
});
