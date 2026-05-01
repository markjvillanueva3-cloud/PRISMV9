import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

import {
  CAMTrainingExtractionAggregatorEngine,
  type AggregationSpec,
  type ExtractionTip,
  type KnowledgeStoreDoc,
  type AggregatedExtraction,
} from "../engines/CAMTrainingExtractionAggregatorEngine.js";

function makeTip(over: Partial<ExtractionTip> = {}): ExtractionTip {
  return {
    title: over.title ?? "Tip Title",
    body: over.body ?? "Tip body content.",
    category: over.category ?? "machine_setup",
    tags: over.tags ?? ["setup"],
    confidence: over.confidence ?? 90,
    ...over,
  };
}

function writeKsDoc(dir: string, basename: string, doc: KnowledgeStoreDoc): void {
  writeFileSync(path.join(dir, `${basename}.json`), JSON.stringify(doc));
}

function quickSpec(unitId: string, ksDoc: string): AggregationSpec {
  return {
    unit_id: unitId,
    title: unitId,
    cam_platform: "hypermill",
    output_basename: `${unitId}.json`,
    sources: [{ knowledge_store_doc: ksDoc }],
  };
}

describe("CAMTrainingExtractionAggregatorEngine", () => {
  let tmp: string;
  let ksDir: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), "cam-train-agg-"));
    ksDir = path.join(tmp, "knowledge_store");
    mkdirSync(ksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe("dedupKey", () => {
    it("produces a stable sha1 hex digest of exactly 40 chars for the same input", () => {
      const tip = makeTip({ title: "Stable", body: "Body" });
      const k1 = CAMTrainingExtractionAggregatorEngine.dedupKey(tip);
      const k2 = CAMTrainingExtractionAggregatorEngine.dedupKey(tip);
      expect(k1).toBe(k2);
      expect(k1).toHaveLength(40);
      expect(/^[0-9a-f]{40}$/.test(k1)).toBe(true);
    });

    it("ignores leading/trailing whitespace in title and body", () => {
      const a = CAMTrainingExtractionAggregatorEngine.dedupKey(makeTip({ title: "  A  ", body: "  B  " }));
      const b = CAMTrainingExtractionAggregatorEngine.dedupKey(makeTip({ title: "A", body: "B" }));
      expect(a).toBe(b);
    });

    it("changes when body changes by even one character", () => {
      const a = CAMTrainingExtractionAggregatorEngine.dedupKey(makeTip({ title: "T", body: "Body." }));
      const b = CAMTrainingExtractionAggregatorEngine.dedupKey(makeTip({ title: "T", body: "Body!" }));
      expect(a).not.toBe(b);
    });

    it("treats empty title/body as the dedup key for sha1('::') so missing-content tips collide deterministically", () => {
      // sha1("::") computed via node:crypto reference implementation
      const empty = CAMTrainingExtractionAggregatorEngine.dedupKey({ title: "", body: "" });
      expect(empty).toBe("f62e0ea6edbc4288ff84c8da24f410ecf986229d");
    });
  });

  describe("loadKnowledgeStoreDoc", () => {
    it("loads a valid JSON doc and exposes its tips array", () => {
      writeKsDoc(ksDir, "doc-a", { tips: [makeTip({ title: "X", body: "Y" })] });
      const out = CAMTrainingExtractionAggregatorEngine.loadKnowledgeStoreDoc(ksDir, "doc-a");
      expect(out.tips?.[0]?.title).toBe("X");
      expect(out.tips?.[0]?.body).toBe("Y");
    });

    it("throws an error mentioning the missing path when file is absent", () => {
      try {
        CAMTrainingExtractionAggregatorEngine.loadKnowledgeStoreDoc(ksDir, "doc-missing");
        throw new Error("should have thrown");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        expect(msg).toContain("doc-missing");
        expect(msg).toMatch(/source doc missing/i);
      }
    });

    it("throws with the underlying parse-error message when JSON is malformed", () => {
      writeFileSync(path.join(ksDir, "doc-bad.json"), "{not-json");
      try {
        CAMTrainingExtractionAggregatorEngine.loadKnowledgeStoreDoc(ksDir, "doc-bad");
        throw new Error("should have thrown");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        expect(msg).toMatch(/invalid JSON/i);
        expect(msg).toContain("doc-bad");
      }
    });
  });

  describe("aggregate — counts and ordering", () => {
    it("totals.tips equals the number of unique tips across sources after dedup", () => {
      writeKsDoc(ksDir, "doc-1", {
        tips: [makeTip({ title: "T1", body: "B1" }), makeTip({ title: "T2", body: "B2" })],
        formulas: [{ name: "F1", expression: "x = 1" }],
        parameter_tables: [{ name: "Tbl1", rows: [{ a: 1 }] }],
        extraction_stats: { source_pdf: "/p1.pdf", page_count: 10, tips_unique: 2, formulas_total: 1, tables_total: 1 },
      });
      writeKsDoc(ksDir, "doc-2", {
        tips: [makeTip({ title: "T3", body: "B3" })],
        formulas: [{ name: "F2", expression: "y = 2" }],
        parameter_tables: [],
        extraction_stats: { source_pdf: "/p2.pdf", page_count: 20, tips_unique: 1, formulas_total: 1, tables_total: 0 },
      });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(
        {
          unit_id: "U-COUNTS", title: "Counts", cam_platform: "hypermill", output_basename: "counts.json",
          sources: [{ knowledge_store_doc: "doc-1" }, { knowledge_store_doc: "doc-2" }],
        },
        ksDir,
      );
      expect(out.totals.source_documents).toBe(2);
      expect(out.totals.tips).toBe(3);
      expect(out.totals.formulas).toBe(2);
      expect(out.totals.parameter_tables).toBe(1);
      expect(out.tips.map((t) => t.title)).toEqual(["T1", "T2", "T3"]);
      expect(out.tips.map((t) => t._source_doc)).toEqual(["doc-1", "doc-1", "doc-2"]);
      expect(out.formulas.map((f) => f._source_doc)).toEqual(["doc-1", "doc-2"]);
    });

    it("dedups identical tips appearing in multiple sources, keeping the first source's provenance", () => {
      const sharedTip = makeTip({ title: "Shared", body: "Body" });
      writeKsDoc(ksDir, "doc-1", { tips: [sharedTip] });
      writeKsDoc(ksDir, "doc-2", { tips: [sharedTip, makeTip({ title: "Unique", body: "U" })] });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(
        {
          unit_id: "U-DEDUP", title: "Dedup", cam_platform: "hypermill", output_basename: "dedup.json",
          sources: [{ knowledge_store_doc: "doc-1" }, { knowledge_store_doc: "doc-2" }],
        },
        ksDir,
      );
      expect(out.totals.tips).toBe(2);
      expect(out.tips[0].title).toBe("Shared");
      expect(out.tips[0]._source_doc).toBe("doc-1");
      expect(out.tips[1].title).toBe("Unique");
      expect(out.tips[1]._source_doc).toBe("doc-2");
    });

    it("preserves duplicate formulas and tables (no dedup applied to those entries)", () => {
      writeKsDoc(ksDir, "doc-1", {
        formulas: [{ name: "F", expression: "x" }, { name: "F", expression: "x" }],
        parameter_tables: [{ name: "T" }, { name: "T" }],
      });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-PRESV", "doc-1"), ksDir);
      expect(out.totals.formulas).toBe(2);
      expect(out.totals.parameter_tables).toBe(2);
      expect(out.formulas.every((f) => f._source_doc === "doc-1")).toBe(true);
      expect(out.parameter_tables.every((t) => t._source_doc === "doc-1")).toBe(true);
    });

    it("falls back to array length when extraction_stats is absent and emits null source_pdf/page_count", () => {
      writeKsDoc(ksDir, "doc-nostats", {
        tips: [makeTip({ title: "A", body: "B" }), makeTip({ title: "C", body: "D" })],
      });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-NOSTATS", "doc-nostats"), ksDir);
      expect(out.source_documents).toHaveLength(1);
      expect(out.source_documents[0].tips_unique).toBe(2);
      expect(out.source_documents[0].source_pdf).toBeNull();
      expect(out.source_documents[0].page_count).toBeNull();
      expect(out.source_documents[0].formulas_total).toBe(0);
      expect(out.source_documents[0].tables_total).toBe(0);
    });

    it("emits zero counts and an empty arrays manifest entry for fully empty sources", () => {
      writeKsDoc(ksDir, "doc-empty", { tips: [], formulas: [], parameter_tables: [] });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-EMPTY", "doc-empty"), ksDir);
      expect(out.totals).toEqual({ source_documents: 1, tips: 0, formulas: 0, parameter_tables: 0 });
      expect(out.tips).toHaveLength(0);
      expect(out.formulas).toHaveLength(0);
      expect(out.parameter_tables).toHaveLength(0);
      expect(out.source_documents[0].tips_unique).toBe(0);
    });

    it("propagates a 'source doc missing' error mentioning the offending basename", () => {
      const spec: AggregationSpec = {
        unit_id: "U-X", title: "X", cam_platform: "hypermill", output_basename: "x.json",
        sources: [{ knowledge_store_doc: "doc-nope" }],
      };
      try {
        CAMTrainingExtractionAggregatorEngine.aggregate(spec, ksDir);
        throw new Error("should have thrown");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        expect(msg).toContain("doc-nope");
      }
    });
  });

  describe("writeArtifact", () => {
    it("writes the JSON, creates parent dirs, removes the temp suffix file, and the reloaded content matches", () => {
      writeKsDoc(ksDir, "doc-1", { tips: [makeTip({ title: "X", body: "Y", tags: ["a"] })] });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-W", "doc-1"), ksDir);
      const outPath = path.join(tmp, "deeply", "nested", "out.json");
      CAMTrainingExtractionAggregatorEngine.writeArtifact(out, outPath);
      expect(existsSync(outPath)).toBe(true);
      expect(existsSync(`${outPath}.tmp`)).toBe(false);
      const reloaded = JSON.parse(readFileSync(outPath, "utf8")) as AggregatedExtraction;
      expect(reloaded.unit_id).toBe("U-W");
      expect(reloaded.totals.tips).toBe(1);
      expect(reloaded.tips[0].title).toBe("X");
    });

    it("overwrites a stale artifact in place with the new content", () => {
      writeKsDoc(ksDir, "doc-1", { tips: [makeTip({ title: "Fresh", body: "F" })] });
      const out = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-OW", "doc-1"), ksDir);
      const outPath = path.join(tmp, "out.json");
      writeFileSync(outPath, "{ \"unit_id\": \"stale\" }");
      CAMTrainingExtractionAggregatorEngine.writeArtifact(out, outPath);
      const reloaded = JSON.parse(readFileSync(outPath, "utf8")) as AggregatedExtraction;
      expect(reloaded.unit_id).toBe("U-OW");
      expect(reloaded.tips[0].title).toBe("Fresh");
    });
  });

  describe("assembleUnifiedCorpus", () => {
    function aggregateUnit(unitId: string, ksDocBase: string, tips: ExtractionTip[]): AggregatedExtraction {
      writeKsDoc(ksDir, ksDocBase, { tips });
      return CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec(unitId, ksDocBase), ksDir);
    }

    it("counts tips_unique by deduping across units (shared sha1 keys collapse)", () => {
      const sharedTip = makeTip({ title: "Shared", body: "Shared" });
      const a = aggregateUnit("U-A", "doc-a", [sharedTip, makeTip({ title: "T1", body: "B1" })]);
      const b = aggregateUnit("U-B", "doc-b", [sharedTip, makeTip({ title: "T2", body: "B2" })]);
      const corpus = CAMTrainingExtractionAggregatorEngine.assembleUnifiedCorpus([a, b]);
      expect(corpus.unit_count).toBe(2);
      expect(corpus.totals.tips_unique).toBe(3); // Shared, T1, T2
      expect(corpus.units.map((u) => u.unit_id)).toEqual(["U-A", "U-B"]);
      expect(corpus.units[0].tips).toBe(2);
      expect(corpus.units[1].tips).toBe(2);
    });

    it("cross_references[tag] lists every unit_id whose tips carry the tag, sorted ascending", () => {
      const a = aggregateUnit("U-Y", "doc-y", [makeTip({ title: "T1", body: "B1", tags: ["alpha", "beta"] })]);
      const b = aggregateUnit("U-X", "doc-x", [makeTip({ title: "T2", body: "B2", tags: ["alpha"] })]);
      const corpus = CAMTrainingExtractionAggregatorEngine.assembleUnifiedCorpus([a, b]);
      expect(corpus.cross_references.alpha).toEqual(["U-X", "U-Y"]);
      expect(corpus.cross_references.beta).toEqual(["U-Y"]);
      expect(Object.keys(corpus.cross_references)).toEqual(["alpha", "beta"]); // tag keys sorted
    });

    it("ignores empty-string tags so they do not appear as cross-reference keys", () => {
      const a = aggregateUnit("U-C", "doc-c", [makeTip({ title: "T", body: "B", tags: ["", "ok"] })]);
      const corpus = CAMTrainingExtractionAggregatorEngine.assembleUnifiedCorpus([a]);
      expect(corpus.cross_references.ok).toEqual(["U-C"]);
      expect(Object.prototype.hasOwnProperty.call(corpus.cross_references, "")).toBe(false);
    });

    it("aggregates formula and table counts across units (no dedup applied to those)", () => {
      writeKsDoc(ksDir, "doc-fa", {
        tips: [makeTip()],
        formulas: [{ name: "F1", expression: "x" }, { name: "F2", expression: "y" }],
        parameter_tables: [{ name: "T1" }],
      });
      writeKsDoc(ksDir, "doc-fb", {
        tips: [makeTip({ title: "different", body: "different" })],
        formulas: [{ name: "F3", expression: "z" }],
        parameter_tables: [{ name: "T2" }, { name: "T3" }],
      });
      const a = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-FA", "doc-fa"), ksDir);
      const b = CAMTrainingExtractionAggregatorEngine.aggregate(quickSpec("U-FB", "doc-fb"), ksDir);
      const corpus = CAMTrainingExtractionAggregatorEngine.assembleUnifiedCorpus([a, b]);
      expect(corpus.totals.formulas).toBe(3);
      expect(corpus.totals.parameter_tables).toBe(3);
    });
  });

  describe("getPhase4Specs", () => {
    it("includes all 11 milestone-spec'd PHASE-4 unit ids", () => {
      const specs = CAMTrainingExtractionAggregatorEngine.getPhase4Specs();
      const ids = specs.map((s) => s.unit_id).sort();
      expect(ids).toEqual([
        "U-CAM59", "U-CAM60", "U-CAM61", "U-CAM62", "U-CAM63",
        "U-CAM64", "U-CAM65", "U-CAM66", "U-CAM67", "U-CAM68",
        "U-CAM69",
      ]);
    });

    it("every spec lists at least one source doc and a unique output_basename", () => {
      const specs = CAMTrainingExtractionAggregatorEngine.getPhase4Specs();
      const seen = new Set<string>();
      for (const s of specs) {
        expect(s.sources.length).toBeGreaterThanOrEqual(1);
        expect(seen.has(s.output_basename)).toBe(false);
        seen.add(s.output_basename);
      }
      expect(seen.size).toBe(specs.length);
    });

    it("each cam_platform value is one of the canonical strings", () => {
      const allowed = new Set(["hypermill", "inventorcam", "fusion", "mastercam"]);
      const specs = CAMTrainingExtractionAggregatorEngine.getPhase4Specs();
      const platforms = specs.map((s) => s.cam_platform);
      for (const p of platforms) expect(allowed.has(p)).toBe(true);
      // Both hyperMILL and InventorCAM are represented
      expect(platforms.includes("hypermill")).toBe(true);
      expect(platforms.includes("inventorcam")).toBe(true);
    });

    it("output_basenames follow the milestone-spec'd naming convention", () => {
      const expected: Record<string, string> = {
        "U-CAM59": "hypermill-cam-manual-extracted.json",
        "U-CAM60": "hypermill-tool-db-extracted.json",
        "U-CAM61": "hypermill-virtual-machining-extracted.json",
        "U-CAM62": "hypermill-automation-extracted.json",
        "U-CAM63": "inventorcam-2.5d-training-extracted.json",
        "U-CAM64": "inventorcam-3d-hsm-hsr-extracted.json",
        "U-CAM65": "inventorcam-5axis-training-extracted.json",
        "U-CAM66": "inventorcam-multiaxis-extracted.json",
        "U-CAM67": "inventorcam-turning-millturn-extracted.json",
        "U-CAM68": "inventorcam-specialty-extracted.json",
        "U-CAM69": "hypermill-batch-extracted.json",
      };
      const specs = CAMTrainingExtractionAggregatorEngine.getPhase4Specs();
      for (const s of specs) expect(s.output_basename).toBe(expected[s.unit_id]);
    });
  });
});
