/**
 * ModelRouterEngine — tier classification + routing decision tests
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P20-U03
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ModelRouterEngine,
  modelRouterEngine,
  type TaskInput,
} from "../engines/ModelRouterEngine.js";

describe("ModelRouterEngine — tier classification", () => {
  let r: ModelRouterEngine;

  beforeEach(() => {
    r = new ModelRouterEngine();
  });

  it("routes embed kind to tier 0 (nomic-embed-text)", () => {
    const d = r.routeForTask({ kind: "embed" });
    expect(d).toEqual({
      tier: 0,
      model: "nomic-embed-text",
      kind: "embed",
      reason: "kind=embed",
      fallback: null,
    });
  });

  it("routes embed even when complexity=complex (kind dominates)", () => {
    const d = r.routeForTask({ kind: "embed", complexity: "complex", promptTokens: 99999 });
    expect(d.tier).toBe(0);
    expect(d.model).toBe("nomic-embed-text");
  });

  it("routes vision kind to tier 4 (llama3.2-vision)", () => {
    const d = r.routeForTask({ kind: "vision" });
    expect(d.tier).toBe(4);
    expect(d.model).toBe("llama3.2-vision:11b");
    expect(d.kind).toBe("vision");
  });

  it("routes hasImage=true to tier 4 regardless of declared kind", () => {
    const d = r.routeForTask({ kind: "code", hasImage: true });
    expect(d.tier).toBe(4);
    expect(d.reason).toContain("hasImage=true");
  });

  it("AUTO-routes safety domain to tier 6 (consensus) by default", () => {
    const d = r.routeForTask({ kind: "reason", domain: "safety" });
    expect(d.tier).toBe(6);
    expect(d.model).toBe("consensus");
    expect(d.kind).toBe("consensus");
    expect(d.reason).toContain("AUTO-CONSENSUS");
  });

  it("safety domain with consensus=false falls back to tier 5 (claude-only)", () => {
    const d = r.routeForTask({ kind: "reason", domain: "safety", consensus: false });
    expect(d.tier).toBe(5);
    expect(d.model).toBe("claude");
    expect(d.reason).toContain("consensus=false");
  });

  it("AUTO-consensus fires for physics/kienzle/taylor/deflection/thermal/compliance/manufacturing-novel", () => {
    for (const dom of ["physics", "kienzle", "taylor", "deflection", "thermal", "compliance", "manufacturing-novel"]) {
      const d = r.routeForTask({ kind: "code", domain: dom });
      expect(d.tier).toBe(6);
      expect(d.model).toBe("consensus");
    }
  });

  it("safety domain match is case-insensitive (auto-consensus still fires)", () => {
    const d = r.routeForTask({ kind: "code", domain: "SAFETY" });
    expect(d.tier).toBe(6);
  });

  it("non-safety domains do NOT escalate", () => {
    const d = r.routeForTask({ kind: "code", domain: "marketing" });
    expect(d.tier).toBe(1);
  });

  it("routes needsChainOfThought=true to tier 3 (deepseek-r1)", () => {
    const d = r.routeForTask({ kind: "reason", needsChainOfThought: true });
    expect(d.tier).toBe(3);
    expect(d.model).toBe("deepseek-r1:14b");
    expect(d.fallback).toBe("qwen2.5-coder:32b");
  });

  it("routes complexity=complex to tier 3", () => {
    const d = r.routeForTask({ kind: "code", complexity: "complex" });
    expect(d.tier).toBe(3);
    expect(d.reason).toBe("complexity=complex");
  });

  it("routes promptTokens > 6000 to tier 3 (large-context override)", () => {
    const d = r.routeForTask({ kind: "code", promptTokens: 6500 });
    expect(d.tier).toBe(3);
    expect(d.reason).toContain("6000");
  });

  it("routes complexity=medium to tier 2", () => {
    const d = r.routeForTask({ kind: "code", complexity: "medium" });
    expect(d.tier).toBe(2);
    expect(d.model).toBe("qwen2.5-coder:14b");
  });

  it("routes promptTokens > 3000 (but <= 6000) to tier 2", () => {
    const d = r.routeForTask({ kind: "code", promptTokens: 3500 });
    expect(d.tier).toBe(2);
  });

  it("routes simple/general task to tier 1 (qwen-7b default)", () => {
    const d = r.routeForTask({ kind: "general" });
    expect(d.tier).toBe(1);
    expect(d.model).toBe("qwen2.5-coder:7b");
    expect(d.fallback).toBe("qwen2.5-coder:14b");
  });

  it("routes review kind with no signals to tier 1", () => {
    const d = r.routeForTask({ kind: "review" });
    expect(d.tier).toBe(1);
  });
});

describe("ModelRouterEngine — forceTier override", () => {
  it("respects forceTier=0 even for code kind", () => {
    const r = new ModelRouterEngine();
    const d = r.routeForTask({ kind: "code", forceTier: 0 });
    expect(d.tier).toBe(0);
    expect(d.model).toBe("nomic-embed-text");
    expect(d.reason).toBe("forceTier=0");
  });

  it("respects forceTier=5 for embed kind", () => {
    const r = new ModelRouterEngine();
    const d = r.routeForTask({ kind: "embed", forceTier: 5 });
    expect(d.tier).toBe(5);
    expect(d.model).toBe("claude");
  });

  it("rejects forceTier=-1", () => {
    const r = new ModelRouterEngine();
    expect(() => r.routeForTask({ kind: "code", forceTier: -1 })).toThrow(/forceTier/);
  });

  it("rejects forceTier=7", () => {
    const r = new ModelRouterEngine();
    expect(() => r.routeForTask({ kind: "code", forceTier: 7 })).toThrow(/forceTier/);
  });

  it("forceTier=6 routes to consensus tier", () => {
    const r = new ModelRouterEngine();
    const d = r.routeForTask({ kind: "code", forceTier: 6 });
    expect(d.tier).toBe(6);
    expect(d.model).toBe("consensus");
    expect(d.kind).toBe("consensus");
    expect(d.fallback).toBe("claude");
  });

  it("rejects non-integer forceTier", () => {
    const r = new ModelRouterEngine();
    expect(() => r.routeForTask({ kind: "code", forceTier: 2.5 })).toThrow(/forceTier/);
  });
});

describe("ModelRouterEngine — adjustable thresholds (P23 hook)", () => {
  let r: ModelRouterEngine;

  beforeEach(() => {
    r = new ModelRouterEngine();
  });

  it("default thresholds are 3000/6000", () => {
    expect(r.getThresholds()).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("setThresholds tunes routing — tier-2 boundary at custom largeContextTokens", () => {
    r.setThresholds({ largeContextTokens: 1000, complexContextTokens: 2000 });
    const below = r.routeForTask({ kind: "code", promptTokens: 999 });
    const above = r.routeForTask({ kind: "code", promptTokens: 1500 });
    expect(below.tier).toBe(1);
    expect(above.tier).toBe(2);
  });

  it("setThresholds tunes routing — tier-3 boundary at custom complexContextTokens", () => {
    r.setThresholds({ largeContextTokens: 1000, complexContextTokens: 2000 });
    const above = r.routeForTask({ kind: "code", promptTokens: 2500 });
    expect(above.tier).toBe(3);
  });

  it("rejects non-positive largeContextTokens", () => {
    expect(() => r.setThresholds({ largeContextTokens: 0 })).toThrow(/largeContextTokens/);
    expect(() => r.setThresholds({ largeContextTokens: -1 })).toThrow(/largeContextTokens/);
  });

  it("rejects complexContextTokens <= largeContextTokens", () => {
    expect(() => r.setThresholds({ largeContextTokens: 5000, complexContextTokens: 5000 }))
      .toThrow(/complexContextTokens must exceed largeContextTokens/);
  });

  it("resetThresholds restores defaults", () => {
    r.setThresholds({ largeContextTokens: 100, complexContextTokens: 200 });
    r.resetThresholds();
    expect(r.getThresholds()).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("getThresholds returns a copy (no aliasing)", () => {
    const t1 = r.getThresholds();
    t1.largeContextTokens = 99999;
    expect(r.getThresholds().largeContextTokens).toBe(3000);
  });
});

describe("ModelRouterEngine — input validation", () => {
  let r: ModelRouterEngine;

  beforeEach(() => {
    r = new ModelRouterEngine();
  });

  it("rejects missing input", () => {
    expect(() => r.routeForTask(null as unknown as TaskInput)).toThrow(/TaskInput required/);
  });

  it("rejects unknown kind", () => {
    expect(() => r.routeForTask({ kind: "unknown" as TaskInput["kind"] })).toThrow(/invalid kind/);
  });

  it("rejects unknown complexity", () => {
    expect(() => r.routeForTask({ kind: "code", complexity: "extreme" as TaskInput["complexity"] }))
      .toThrow(/invalid complexity/);
  });

  it("rejects negative promptTokens", () => {
    expect(() => r.routeForTask({ kind: "code", promptTokens: -1 })).toThrow(/promptTokens/);
  });

  it("rejects non-finite promptTokens", () => {
    expect(() => r.routeForTask({ kind: "code", promptTokens: Number.NaN })).toThrow(/promptTokens/);
    expect(() => r.routeForTask({ kind: "code", promptTokens: Number.POSITIVE_INFINITY })).toThrow(/promptTokens/);
  });
});

describe("ModelRouterEngine — selection precedence", () => {
  let r: ModelRouterEngine;

  beforeEach(() => {
    r = new ModelRouterEngine();
  });

  it("forceTier beats every other signal", () => {
    const d = r.routeForTask({
      kind: "embed",
      hasImage: true,
      domain: "safety",
      needsChainOfThought: true,
      complexity: "complex",
      promptTokens: 99999,
      forceTier: 1,
    });
    expect(d.tier).toBe(1);
  });

  it("embed beats vision when both present (kind=embed wins because rule 2 < rule 3)", () => {
    const d = r.routeForTask({ kind: "embed", hasImage: true });
    expect(d.tier).toBe(0);
  });

  it("vision beats safety domain (image extraction is task-shaped, not semantic)", () => {
    const d = r.routeForTask({ kind: "code", hasImage: true, domain: "safety" });
    expect(d.tier).toBe(4);
  });

  it("safety AUTO-consensus beats CoT (multi-eyes wins over single reasoning tier)", () => {
    const d = r.routeForTask({ kind: "reason", domain: "physics", needsChainOfThought: true });
    expect(d.tier).toBe(6);
  });

  it("safety with consensus=false beats CoT (claude-only escalate)", () => {
    const d = r.routeForTask({ kind: "reason", domain: "physics", needsChainOfThought: true, consensus: false });
    expect(d.tier).toBe(5);
  });

  it("CoT beats large-token complexity bump", () => {
    const d = r.routeForTask({ kind: "code", needsChainOfThought: true, promptTokens: 5000 });
    expect(d.tier).toBe(3);
    expect(d.reason).toContain("needsChainOfThought");
  });
});

describe("ModelRouterEngine — consensus flag (tier-6 multi-model)", () => {
  let r: ModelRouterEngine;

  beforeEach(() => {
    r = new ModelRouterEngine();
  });

  it("consensus=true routes to tier 6 even on simple code task", () => {
    const d = r.routeForTask({ kind: "code", consensus: true });
    expect(d).toEqual({
      tier: 6,
      model: "consensus",
      kind: "consensus",
      reason: "consensus=true (multi-model)",
      fallback: "claude",
    });
  });

  it("consensus=true outranks safety domain (multi-eyes wins over single-Claude)", () => {
    const d = r.routeForTask({ kind: "code", consensus: true, domain: "safety" });
    expect(d.tier).toBe(6);
  });

  it("consensus=true outranks needsChainOfThought", () => {
    const d = r.routeForTask({ kind: "reason", consensus: true, needsChainOfThought: true });
    expect(d.tier).toBe(6);
  });

  it("consensus=false (or omitted) does NOT route to tier 6", () => {
    const d1 = r.routeForTask({ kind: "code", consensus: false });
    const d2 = r.routeForTask({ kind: "code" });
    expect(d1.tier).toBe(1);
    expect(d2.tier).toBe(1);
  });

  it("forceTier overrides consensus flag", () => {
    const d = r.routeForTask({ kind: "code", consensus: true, forceTier: 1 });
    expect(d.tier).toBe(1);
    expect(d.reason).toBe("forceTier=1");
  });

  it("vision wins over consensus (image extraction is task-shaped)", () => {
    const d = r.routeForTask({ kind: "code", hasImage: true, consensus: true });
    expect(d.tier).toBe(4);
  });

  it("embed wins over consensus (cheap embedding never needs 3 models)", () => {
    const d = r.routeForTask({ kind: "embed", consensus: true });
    expect(d.tier).toBe(0);
  });
});

describe("ModelRouterEngine — singleton + helper", () => {
  it("modelRouterEngine singleton works identically to fresh instance", () => {
    const a = modelRouterEngine.routeForTask({ kind: "code" });
    const b = new ModelRouterEngine().routeForTask({ kind: "code" });
    expect(a).toEqual(b);
  });

  it("classifyTier returns same tier as routeForTask", () => {
    const r = new ModelRouterEngine();
    const input: TaskInput = { kind: "reason", needsChainOfThought: true };
    expect(r.classifyTier(input)).toBe(r.routeForTask(input).tier);
  });
});

describe("ModelRouterEngine — loadFromState (P23-U02 wiring)", () => {
  it("returns false when file is missing (defaults remain)", async () => {
    const r = new ModelRouterEngine();
    const ok = await r.loadFromState("H:/prism-iooms0/no-such-file-here.json");
    expect(ok).toBe(false);
    expect(r.getThresholds()).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });
  });

  it("loads and applies valid persisted thresholds", async () => {
    const { promises: fs } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-router-"));
    const file = path.join(dir, "router-thresholds.json");
    await fs.writeFile(file, JSON.stringify({ largeContextTokens: 1500, complexContextTokens: 4500 }));

    const r = new ModelRouterEngine();
    const ok = await r.loadFromState(file);
    expect(ok).toBe(true);
    expect(r.getThresholds()).toEqual({ largeContextTokens: 1500, complexContextTokens: 4500 });

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("rejects file with invariant violation (complex<=large) and keeps current state", async () => {
    const { promises: fs } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-router-"));
    const file = path.join(dir, "bad.json");
    await fs.writeFile(file, JSON.stringify({ largeContextTokens: 5000, complexContextTokens: 5000 }));

    const r = new ModelRouterEngine();
    const ok = await r.loadFromState(file);
    expect(ok).toBe(false);
    expect(r.getThresholds()).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("returns false on corrupt JSON and keeps defaults", async () => {
    const { promises: fs } = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "prism-router-"));
    const file = path.join(dir, "corrupt.json");
    await fs.writeFile(file, "{not valid");

    const r = new ModelRouterEngine();
    const ok = await r.loadFromState(file);
    expect(ok).toBe(false);
    expect(r.getThresholds()).toEqual({ largeContextTokens: 3000, complexContextTokens: 6000 });

    await fs.rm(dir, { recursive: true, force: true });
  });
});
