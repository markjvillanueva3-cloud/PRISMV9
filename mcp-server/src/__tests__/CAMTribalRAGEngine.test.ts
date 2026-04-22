/**
 * CAMTribalRAGEngine tests — U-CAM-ML-06
 * =========================================
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMTribalRAGEngine,
  camTribalRAGEngine,
  tokenize,
} from "../engines/CAMTribalRAGEngine.js";

function makeTipsFile(dir: string, slug: string, tips: Array<{ id: string; title: string; body: string; tags?: string[]; ops?: string[] }>) {
  const filename = path.join(dir, `${slug}-cam-tips.ts`);
  const blocks = tips
    .map(
      (t) => `{
    id: "${t.id}",
    title: "${t.title}",
    body: "${t.body}",
    tags: [${(t.tags ?? []).map((x) => JSON.stringify(x)).join(", ")}],
    operation_types: [${(t.ops ?? []).map((x) => JSON.stringify(x)).join(", ")}],
  }`
    )
    .join(",\n  ");
  fs.writeFileSync(filename, `export const ${slug}Tips = [\n  ${blocks}\n];\n`);
  return filename;
}

function setupCorpus() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "rag-"));
  makeTipsFile(tmp, "mastercam", [
    { id: "mc-001", title: "Dynamic milling chip load", body: "Use feed per tooth 0.004 inch for steel roughing with carbide end mill. Axial depth 1.5xD.", tags: ["milling", "carbide"], ops: ["roughing"] },
    { id: "mc-002", title: "Surface finish Ra 32", body: "Finishing pass at 0.002 inch per tooth with small stepover gives Ra 32 microinch on tool steel.", tags: ["finishing"], ops: ["finishing"] },
    { id: "mc-003", title: "Tool deflection limit", body: "Keep tool deflection below 0.0005 inch for accurate slotting. Reduce stickout.", tags: ["deflection"], ops: ["slotting"] },
  ]);
  makeTipsFile(tmp, "hypermill", [
    { id: "hm-001", title: "Five-axis swarf toolpath", body: "Use swarf machining for flank finishing on impeller blades. Maintain constant tool engagement.", tags: ["5axis", "swarf"], ops: ["finishing"] },
    { id: "hm-002", title: "Chip load for titanium", body: "Titanium Ti-6Al-4V needs chip load 0.003 inch per tooth and coolant under pressure to evacuate chips.", tags: ["titanium"], ops: ["roughing"] },
  ]);
  return tmp;
}

describe("CAMTribalRAGEngine — tokenize()", () => {
  it("lowercases + splits on non-alphanumeric", () => {
    expect(tokenize("Chip-Load, Per Tooth!")).toEqual(["chip", "load", "per", "tooth"]);
  });

  it("filters stopwords and single-char tokens", () => {
    expect(tokenize("the a of tool")).toEqual(["tool"]);
  });

  it("preserves numerics and underscores (drops 1-char tokens)", () => {
    // "N" is 1-char so it's filtered
    expect(tokenize("kc1_1 coefficient 1800 N/mm2")).toEqual(["kc1_1", "coefficient", "1800", "mm2"]);
  });

  it("handles Unicode symbols (micro, °)", () => {
    expect(tokenize("depth 12µm at 45°")).toContain("depth");
  });
});

describe("CAMTribalRAGEngine — buildIndex()", () => {
  const engine = new CAMTribalRAGEngine();

  it("builds a vocabulary + IDF + per-tip sparse vectors", () => {
    const dir = setupCorpus();
    try {
      const outPath = path.join(dir, "rag.json");
      const idx = engine.buildIndex({ dataDir: dir, outPath, minDocFrequency: 1 });
      expect(idx.tips.length).toBe(5);
      expect(idx.vocabulary.length).toBeGreaterThan(10);
      expect(idx.idf.length).toBe(idx.vocabulary.length);
      for (const t of idx.tips) {
        expect(t.terms.length).toBeGreaterThan(0);
        expect(t.terms.length).toBe(t.weights.length);
        // L2 norm of weights should be ~1 (cosine-ready)
        const l2 = Math.sqrt(t.weights.reduce((s, w) => s + w * w, 0));
        expect(l2).toBeCloseTo(1, 4);
      }
      expect(fs.existsSync(outPath)).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("respects minDocFrequency — drops singleton tokens", () => {
    const dir = setupCorpus();
    try {
      const idx = engine.buildIndex({
        dataDir: dir,
        outPath: path.join(dir, "rag.json"),
        minDocFrequency: 3, // Only very common tokens survive
      });
      expect(idx.vocabulary.length).toBeLessThan(15);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("per_cam_count reflects scanned tip files", () => {
    const dir = setupCorpus();
    try {
      const idx = engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      expect(idx.summary.per_cam_count.mastercam).toBe(3);
      expect(idx.summary.per_cam_count.hypermill).toBe(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("truncates body to excerpt length + appends ellipsis", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rag-excerpt-"));
    try {
      makeTipsFile(dir, "mastercam", [
        { id: "mc-long", title: "T", body: "x".repeat(500), tags: [], ops: [] },
      ]);
      const idx = engine.buildIndex({
        dataDir: dir,
        outPath: path.join(dir, "rag.json"),
        bodyExcerptLen: 50,
        minDocFrequency: 1,
      });
      const t = idx.tips.find((x) => x.tip_id === "mc-long");
      expect(t?.body_excerpt.length).toBe(51); // 50 + ellipsis
      expect(t?.body_excerpt.endsWith("…")).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });
});

describe("CAMTribalRAGEngine — retrieve()", () => {
  const engine = new CAMTribalRAGEngine();

  it("returns top-k by cosine similarity", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      const hits = engine.retrieve("chip load per tooth for titanium", { topK: 2 });
      expect(hits.length).toBe(2);
      // Titanium tip should rank highest
      expect(hits[0].tip_id).toBe("hm-002");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("honours cam_slug filter", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      // Query mastercam-only for a term that exists in mastercam tips
      const hits = engine.retrieve("tooth carbide steel", { cam_slug: "mastercam" });
      expect(hits.length).toBeGreaterThan(0);
      for (const h of hits) expect(h.cam_slug).toBe("mastercam");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("empty query → empty result", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      expect(engine.retrieve("")).toEqual([]);
      expect(engine.retrieve("the of a")).toEqual([]); // stopwords only
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("out-of-vocab query → empty result (no throw)", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      expect(engine.retrieve("xyzzy plugh frobnicate")).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("respects minScore filter", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      const hits = engine.retrieve("chip load", { minScore: 0.99 });
      // Almost nothing should score above 0.99 — tips have diverse vocab
      expect(hits.length).toBeLessThan(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("retrieveForParameter() combines param + feature + material into query", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      const hits = engine.retrieveForParameter({
        param_name: "chip load",
        material: "titanium",
        topK: 1,
      });
      expect(hits.length).toBe(1);
      expect(hits[0].tip_id).toBe("hm-002"); // titanium tip
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });
});

describe("CAMTribalRAGEngine — persistence + latency", () => {
  const engine = new CAMTribalRAGEngine();

  it("loadIndex() returns cached index after buildIndex()", () => {
    const dir = setupCorpus();
    try {
      const built = engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      engine.invalidate();
      const loaded = engine.loadIndex(path.join(dir, "rag.json"));
      expect(loaded?.tips.length).toBe(built.tips.length);
      expect(loaded?.vocabulary.length).toBe(built.vocabulary.length);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("loadIndex() returns null for missing file", () => {
    const engine2 = new CAMTribalRAGEngine();
    expect(engine2.loadIndex("/nonexistent/path.json")).toBeNull();
  });

  it("retrieve latency is well under 50ms budget for small index", () => {
    const dir = setupCorpus();
    try {
      engine.buildIndex({ dataDir: dir, outPath: path.join(dir, "rag.json"), minDocFrequency: 1 });
      const t0 = performance.now();
      for (let i = 0; i < 20; i++) engine.retrieve("chip load feed per tooth carbide");
      const elapsed = (performance.now() - t0) / 20;
      expect(elapsed).toBeLessThan(50);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      engine.invalidate();
    }
  });

  it("singleton is importable + constructor-less instances work", () => {
    expect(camTribalRAGEngine).toBeInstanceOf(CAMTribalRAGEngine);
    expect(camTribalRAGEngine.name).toBe("CAMTribalRAGEngine");
  });
});
