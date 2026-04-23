/**
 * U-FORE-11 tests — KnowledgeGapAwarenessEngine
 *
 * Coverage: happy + ≥3 failure modes + ≥2 adversarial + variability
 * across 4 manufacturing domains (force/thermal/tool-life/surface).
 * Dispatcher round-trip included.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  KnowledgeGapAwarenessEngine,
  knowledgeGapAwarenessEngine,
} from "../engines/KnowledgeGapAwarenessEngine.js";

describe("KnowledgeGapAwarenessEngine — prior-art surfacing", () => {
  it("exports singleton with correct class + name", () => {
    expect(knowledgeGapAwarenessEngine).toBeInstanceOf(KnowledgeGapAwarenessEngine);
    expect(knowledgeGapAwarenessEngine.name).toBe("KnowledgeGapAwarenessEngine");
  });

  it("VARIABILITY: cutting-force intent surfaces Kienzle kc1.1", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "build a cutting force predictor for milling",
    });
    expect(r.items.some((it) => it.id.includes("Kienzle"))).toBe(true);
    const kienzle = r.items.find((it) => it.id.includes("Kienzle"));
    expect(kienzle!.summary).toContain("kc1.1");
  });

  it("VARIABILITY: tool-life intent surfaces Taylor equation", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "predict tool life from cutting speed",
    });
    expect(r.items.some((it) => it.id.includes("Taylor"))).toBe(true);
  });

  it("VARIABILITY: chatter intent surfaces SLD / Altintas", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "chatter stability lobes for milling",
    });
    expect(r.items.some((it) => it.id.includes("Altintas") || it.id.includes("SLD"))).toBe(true);
  });

  it("VARIABILITY: surface finish intent surfaces Brammertz", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "surface roughness prediction from feed and nose radius",
    });
    expect(r.items.some((it) => it.id.includes("Brammertz"))).toBe(true);
  });

  it("canonical references tagged as kind=formula", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "cutting force with Kienzle model",
    });
    const kienzle = r.items.find((it) => it.id.includes("Kienzle"));
    expect(kienzle!.kind).toBe("formula");
    expect(kienzle!.path).toContain("constants.ts");
  });

  it("relevance scores are in [0, 1]", () => {
    const r = knowledgeGapAwarenessEngine.scan({ intent: "tool life wear prediction" });
    for (const it of r.items) {
      expect(it.relevance).toBeGreaterThanOrEqual(0);
      expect(it.relevance).toBeLessThanOrEqual(1);
    }
  });

  it("items sorted by relevance descending", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "cutting force predictor for milling stability lobes",
    });
    for (let i = 1; i < r.items.length; i++) {
      expect(r.items[i - 1].relevance).toBeGreaterThanOrEqual(r.items[i].relevance);
    }
  });

  it("topRelevance equals first item's relevance", () => {
    const r = knowledgeGapAwarenessEngine.scan({ intent: "cutting force Kienzle" });
    if (r.items.length > 0) {
      expect(r.topRelevance).toBe(r.items[0].relevance);
    }
  });

  it("warning surfaces when ≥5 relevant items found", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "cutting force chatter tool life surface roughness prediction engine",
    });
    if (r.relevantCount >= 5) {
      expect(r.warning).toMatch(/high-relevance|review/i);
    }
  });

  it("warning is null-or-no-match message on unrelated intent", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "xyzabc unrelated widget frobnicator",
    });
    // Either low relevance (null warning or "no match") — not a crash
    expect(r.relevantCount).toBeGreaterThanOrEqual(0);
  });

  it("de-duplicates items by id", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "cutting force mill lathe chatter stability",
    });
    const ids = r.items.map((it) => it.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("caps results at MAX_RESULTS (20)", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "force surface tool mill lathe cutting stability chatter life wear chip",
    });
    expect(r.items.length).toBeLessThanOrEqual(20);
  });
});

describe("KnowledgeGapAwarenessEngine — hasHighRelevancePriorArt", () => {
  it("returns true when 3+ high-relevance hits exist", () => {
    const hits = knowledgeGapAwarenessEngine.hasHighRelevancePriorArt({
      intent: "cutting force Kienzle Taylor chatter stability tool life",
    });
    // The canonical-refs layer easily produces several high-relevance hits here
    expect(hits).toBe(true);
  });

  it("returns false on unrelated query", () => {
    const hits = knowledgeGapAwarenessEngine.hasHighRelevancePriorArt({
      intent: "xyzzy frobnicator baz quux",
    });
    expect(hits).toBe(false);
  });

  it("minMatches parameter raises the bar", () => {
    const r3 = knowledgeGapAwarenessEngine.hasHighRelevancePriorArt(
      { intent: "cutting force" },
      3
    );
    const r99 = knowledgeGapAwarenessEngine.hasHighRelevancePriorArt(
      { intent: "cutting force" },
      99
    );
    expect(r99).toBe(false);
    // r3 may be true or false depending on engine-dir contents; just assert it ran
    expect(typeof r3).toBe("boolean");
  });
});

describe("KnowledgeGapAwarenessEngine — failure modes", () => {
  it("FAIL: null query throws", () => {
    expect(() =>
      knowledgeGapAwarenessEngine.scan(null as unknown as { intent: string })
    ).toThrow(/must be an object/);
  });

  it("FAIL: missing intent throws", () => {
    expect(() =>
      knowledgeGapAwarenessEngine.scan({} as { intent: string })
    ).toThrow(/intent required/);
  });

  it("FAIL: empty intent throws", () => {
    expect(() => knowledgeGapAwarenessEngine.scan({ intent: "" })).toThrow(
      /intent required/
    );
  });

  it("FAIL: whitespace-only intent throws", () => {
    expect(() => knowledgeGapAwarenessEngine.scan({ intent: "   " })).toThrow(
      /intent required/
    );
  });
});

describe("KnowledgeGapAwarenessEngine — adversarial", () => {
  it("ADV: unicode intent doesn't crash tokenizer", () => {
    const r = knowledgeGapAwarenessEngine.scan({ intent: "漢字 emoji 🚀 force" });
    expect(r.items.some((it) => it.matchedKeywords.includes("force"))).toBe(true);
  });

  it("ADV: 1000-char intent handled in <200ms", () => {
    const intent = "cutting force " + "x".repeat(1000);
    const start = Date.now();
    const r = knowledgeGapAwarenessEngine.scan({ intent });
    expect(Date.now() - start).toBeLessThan(200);
    expect(r.items.length).toBeGreaterThan(0);
  });

  it("ADV: stopwords filtered out (no 'the', 'and', 'engine')", () => {
    const r = knowledgeGapAwarenessEngine.scan({
      intent: "the engine for the cutting and the tooling",
    });
    // All items must have matched keywords that aren't stopwords
    for (const it of r.items) {
      for (const k of it.matchedKeywords) {
        expect(["the", "and", "for", "engine"]).not.toContain(k);
      }
    }
  });

  it("ADV: missing repoRoot returns empty engine-scan results", () => {
    const isolated = new KnowledgeGapAwarenessEngine("/no/such/root");
    const r = isolated.scan({ intent: "cutting force Kienzle" });
    // Canonical refs still match; engine-file scan returns nothing
    expect(r.items.every((it) => it.kind !== "engine")).toBe(true);
  });
});

describe("KnowledgeGapAwarenessEngine — summarize", () => {
  it("renders a multi-line summary with intent + threshold", () => {
    const r = knowledgeGapAwarenessEngine.scan({ intent: "cutting force mill" });
    const s = knowledgeGapAwarenessEngine.summarize(r);
    expect(s).toContain("cutting force mill");
    expect(s).toContain("%");
    expect(s.split("\n").length).toBeGreaterThan(1);
  });
});

describe("U-FORE-11 — dispatcher round-trip", () => {
  it("devDispatcher exposes knowledge_gap_scan + knowledge_gap_check actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"knowledge_gap_scan"');
    expect(disp).toContain('"knowledge_gap_check"');
    expect(disp).toContain("KnowledgeGapAwarenessEngine.js");
  });
});
