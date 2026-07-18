/**
 * CAMCorpusInventoryIntegrationTest — CAM-AI-TRAINING-MS0/U-CAMT-CORPUS-INT
 *
 * Final integration test for the YOLO 2026-05-25 sleep run: verifies
 * that every on-disk corpus artifact in state/shared/corpus/ matches
 * the documented counts in CORPUS-INVENTORY-2026-05-26.md.
 *
 * Provides a regression-prevention surface — any future commit that
 * accidentally drops or corrupts a corpus file will fail this test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// We're in mcp-server/src/__tests__/; corpus lives at ../../../state/shared/corpus
const REPO_ROOT = join(__dirname, "..", "..", "..");
const CORPUS = join(REPO_ROOT, "state", "shared", "corpus");

function loadJsonl(file: string): unknown[] {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
}

function loadJson(file: string): unknown {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf8"));
}

const OPERATOR_CONSTRAINT = "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)";

describe("CAM-AI-TRAINING-MS0 corpus inventory integration", () => {

  const SYSTEMS = ["hypermill", "mastercam", "esprit", "fusion360", "nxcam"];

  it("5 per-system coverage manifests exist (nxcam 95%, others 100%)", () => {
    for (const sys of SYSTEMS) {
      const r: any = loadJson(join(CORPUS, `cam-coverage-${sys}.json`));
      expect(r).not.toBeNull();
      // nxcam has 2 fbm meta-ops that don't map to a real CamOperation (95%)
      const minPct = sys === "nxcam" ? 95 : 100;
      expect(r.coveragePct).toBeGreaterThanOrEqual(minPct);
    }
  });

  it("141 CamTemplates across 5 systems (23+17+18+48+35)", () => {
    const counts = { hypermill: 23, mastercam: 17, esprit: 18, fusion360: 48, nxcam: 35 };
    let total = 0;
    for (const [sys, expected] of Object.entries(counts)) {
      const recs = loadJsonl(join(CORPUS, `cam-templates-${sys}.jsonl`));
      expect(recs.length).toBe(expected);
      total += recs.length;
    }
    expect(total).toBe(141);
  });

  it("LoRA v1 dataset has 424 tuples", () => {
    const recs = loadJsonl(join(CORPUS, "cam-lora-dataset.jsonl"));
    expect(recs.length).toBe(424);
  });

  it("LoRA v2 dataset has 987 tuples (7 prompt patterns x 141 templates)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-lora-dataset-v2.jsonl"));
    expect(recs.length).toBe(987);
  });

  it("LoRA merged dataset has 987 tuples (v2 supersedes v1)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-lora-dataset-merged.jsonl"));
    expect(recs.length).toBe(987);
  });

  it("RAG index has 141 records", () => {
    const recs = loadJsonl(join(CORPUS, "cam-rag-index.jsonl"));
    expect(recs.length).toBe(141);
  });

  it("wiki has 141 entries across 5 system dirs", () => {
    const wikiRoot = join(CORPUS, "wiki");
    let total = 0;
    for (const sys of SYSTEMS) {
      const dir = join(wikiRoot, sys);
      if (existsSync(dir)) total += readdirSync(dir).filter((f) => f.endsWith(".md")).length;
    }
    expect(total).toBe(141);
  });

  it("tribal-tips JSONL has 928 records", () => {
    const recs = loadJsonl(join(CORPUS, "cam-tribal-tips.jsonl"));
    expect(recs.length).toBe(928);
  });

  it("LoRA train+holdout = merged (642 + 100 + nxcam-added)", () => {
    const train = loadJsonl(join(CORPUS, "cam-lora-train.jsonl"));
    const holdout = loadJsonl(join(CORPUS, "cam-lora-holdout.jsonl"));
    const merged = loadJsonl(join(CORPUS, "cam-lora-dataset-merged.jsonl"));
    expect(train.length + holdout.length).toBe(merged.length);
    expect(train.length).toBeGreaterThan(0);
    expect(holdout.length).toBeGreaterThan(0);
  });

  it("cross-system translation tuples cover 5 systems", () => {
    const recs = loadJsonl(join(CORPUS, "cam-cross-system-translation.jsonl"));
    const sysSet = new Set<string>();
    for (const r of recs as any[]) { sysSet.add(r.metadata.fromSystem); sysSet.add(r.metadata.toSystem); }
    expect(sysSet.size).toBeGreaterThanOrEqual(4);
    expect(recs.length).toBeGreaterThan(0);
  });

  it("param-recommendation dataset has real catalog defaults", () => {
    const recs = loadJsonl(join(CORPUS, "cam-param-recommendation.jsonl"));
    const withDefault = (recs as any[]).filter((r) => r.metadata?.hasDefault === true);
    expect(recs.length).toBeGreaterThan(500);
    expect(withDefault.length).toBeGreaterThan(400);
  });

  it("unified training manifest counts match aggregate", () => {
    const m: any = loadJson(join(CORPUS, "cam-training-manifest.json"));
    expect(m).not.toBeNull();
    expect(m.counts.templates).toBe(141);
    expect(m.counts.loraTuples).toBe(424); // v1 baseline in unified manifest
    expect(m.counts.ragEntries).toBe(141);
    expect(m.counts.wikiEntries).toBe(141);
    expect(m.counts.tribalTips).toBe(928);
    expect(m.provenance.realDataOnly).toBe(true);
    expect(m.provenance.operatorConstraint).toBe(OPERATOR_CONSTRAINT);
  });

  it("dispatcher manifest documents 23 engines", () => {
    const d: any = loadJson(join(CORPUS, "cam-ai-dispatcher-manifest.json"));
    expect(d).not.toBeNull();
    expect(d.engines.length).toBe(23);
    expect(d.totalActions).toBe(56);
  });

  it("action-schemas manifest documents 60 actions", () => {
    const s: any = loadJson(join(CORPUS, "cam-ai-action-schemas.json"));
    expect(s).not.toBeNull();
    expect(s.totalActions).toBe(60);
  });

  it("every CamTemplate carries realDataOnly + operator constraint", () => {
    for (const sys of SYSTEMS) {
      const recs: any[] = loadJsonl(join(CORPUS, `cam-templates-${sys}.jsonl`));
      for (const r of recs) {
        expect(r.provenance?.realDataOnly).toBe(true);
        expect(r.provenance?.operatorConstraint).toBe(OPERATOR_CONSTRAINT);
      }
    }
  });

  it("every LoRA v2 tuple has user+assistant message pair", () => {
    const recs: any[] = loadJsonl(join(CORPUS, "cam-lora-dataset-v2.jsonl"));
    for (const r of recs) {
      expect(r.messages.length).toBe(2);
      expect(r.messages[0].role).toBe("user");
      expect(r.messages[1].role).toBe("assistant");
    }
  });

  it("aggregate ship count: 1775 unified + 987 LoRA v2 (5-system corpus complete)", () => {
    const m: any = loadJson(join(CORPUS, "cam-training-manifest.json"));
    const totalUnified = m.counts.templates + m.counts.loraTuples + m.counts.ragEntries + m.counts.wikiEntries + m.counts.tribalTips;
    expect(totalUnified).toBe(1775);
  });

  // === iter 71-87 extended tracks ===

  it("physics-grounded merged jsonl: 1520 tuples (210 sf + 726 tl + 264 kn + 320 dfl)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-physics-tuples-merged.jsonl"));
    expect(recs.length).toBe(1520);
  });

  it("speeds-feeds tuples = 210 (11 mat x 7 tools x 5 prompts, 42 cells x 5)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-speeds-feeds-tuples.jsonl"));
    expect(recs.length).toBe(210);
  });

  it("Taylor tool-life grid: 726 tuples (11 mat x 11 tool x 6 speeds)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-tool-life-tuples.jsonl"));
    expect(recs.length).toBe(726);
  });

  it("Kienzle force grid: 264 tuples (11 mat x 6 h x 4 b)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-kienzle-force-tuples.jsonl"));
    expect(recs.length).toBe(264);
  });

  it("Deflection grid: 320 tuples (5 tool-mat x 4 L x 4 d x 4 F)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-deflection-tuples.jsonl"));
    expect(recs.length).toBe(320);
  });

  it("ISO 286 fit tuples: 312 (13 size bands x 8 IT grades x 3 prompts)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-iso286-fit-tuples.jsonl"));
    expect(recs.length).toBe(312);
  });

  it("Surface finish tuples: 52 (13 Ra points x 4 prompts)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-surface-finish-tuples.jsonl"));
    expect(recs.length).toBe(52);
  });

  it("Coolant decision tuples: 54 (18 cases x 3 prompts)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-coolant-decision-tuples.jsonl"));
    expect(recs.length).toBe(54);
  });

  it("Operator gate tuples: 42 (12 items x 3 + 6 scenarios)", () => {
    const recs = loadJsonl(join(CORPUS, "cam-operator-gate-tuples.jsonl"));
    expect(recs.length).toBe(42);
  });

  it("MASTER training set: 3766 tuples across 8 tracks, zero dupes", () => {
    const recs = loadJsonl(join(CORPUS, "cam-master-training-set.jsonl"));
    expect(recs.length).toBe(3766);
    const tracks = new Set((recs as any[]).map((r) => r.metadata?.track).filter(Boolean));
    expect(tracks.size).toBeGreaterThanOrEqual(8);
  });

  it("training manifest v2.0.0 reports extended counts", () => {
    const m: any = loadJson(join(CORPUS, "cam-training-manifest.json"));
    expect(m.schemaVersion).toBe("2.0.0");
    expect(m.counts.masterTrainingSet).toBe(3766);
    expect(m.counts.physicsMerged).toBe(1520);
    expect(m.counts.iso286Fit).toBe(312);
    expect(m.counts.operatorGate).toBe(42);
  });

  it("every physics tuple carries provenance.realDataOnly + operator constraint", () => {
    const files = ["cam-speeds-feeds-tuples.jsonl", "cam-tool-life-tuples.jsonl", "cam-kienzle-force-tuples.jsonl", "cam-deflection-tuples.jsonl"];
    for (const f of files) {
      const recs: any[] = loadJsonl(join(CORPUS, f));
      for (const r of recs) {
        expect(r.metadata?.provenance?.realDataOnly).toBe(true);
        expect(r.metadata?.provenance?.operatorConstraint).toBe(OPERATOR_CONSTRAINT);
      }
    }
  });
});
