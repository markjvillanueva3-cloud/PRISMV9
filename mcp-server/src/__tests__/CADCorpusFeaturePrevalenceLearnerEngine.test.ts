import { describe, it, expect } from "vitest";
import { CADCorpusFeaturePrevalenceLearnerEngine } from "../engines/CADCorpusFeaturePrevalenceLearnerEngine.js";
import type { CorpusManifest, CADCorpusEntry } from "../engines/CADCorpusIngestionEngine.js";
import type { PartClass } from "../engines/BlueprintVisionOCREngine.js";
import type { FeatureTemplate } from "../engines/CADClassFeatureLibraryEngine.js";

const engine = new CADCorpusFeaturePrevalenceLearnerEngine();

function entry(rel: string, partClass: PartClass): CADCorpusEntry {
  return {
    abs_path: `/abs/${rel}`,
    rel_path: rel,
    ext: ".step",
    size_bytes: 1000,
    mtime_ms: Date.now(),
    part_class: partClass,
    classifier_confidence: 0.9,
    classifier_match: undefined,
    source_bucket: undefined,
  };
}

function fakeManifest(entries: CADCorpusEntry[]): CorpusManifest {
  return {
    schema_version: "1.0.0",
    generated_at: new Date().toISOString(),
    root: "/test",
    total_entries: entries.length,
    by_class: {},
    by_format: {},
    entries,
  };
}

describe("CADCorpusFeaturePrevalenceLearnerEngine.learnPrevalence", () => {
  it("returns 0 prevalence + confident=false for class with no members", () => {
    const m = fakeManifest([]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(0);
    expect(r.positive_hits).toBe(0);
    expect(r.learned_prevalence).toBe(0);
    expect(r.confident).toBe(false);
  });

  it("returns confident=false when class_size < MIN_CORPUS_SUPPORT (4 members)", () => {
    const m = fakeManifest([
      entry("a/punch1.step", "extrude_punch"),
      entry("a/punch2.step", "extrude_punch"),
      entry("a/punch3.step", "extrude_punch"),
      entry("a/punch4.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(4);
    expect(r.confident).toBe(false);
  });

  it("returns confident=true at MIN_CORPUS_SUPPORT (5 members)", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/punch${i}.step`, "extrude_punch"));
    const r = engine.learnPrevalence(fakeManifest(ents), "extrude_punch", "central_oil_hole");
    expect(r.class_size).toBe(5);
    expect(r.confident).toBe(true);
  });

  it("computes prevalence = positives / class_size for chamfer feature", () => {
    const m = fakeManifest([
      entry("a/PUNCH 0.5x45 CHAMFER.step", "extrude_punch"),
      entry("a/PUNCH 1x45 chamfer.step", "extrude_punch"),
      entry("a/PUNCH PLAIN.step", "extrude_punch"),
      entry("a/PUNCH RAW.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "bevel_face_chamfer");
    expect(r.positive_hits).toBe(2);
    expect(r.learned_prevalence).toBeCloseTo(0.4, 3);
    expect(r.confident).toBe(true);
  });

  it("captures matched_tokens (first hit per entry)", () => {
    const m = fakeManifest([
      entry("a/PUNCH OIL HOLE THROUGH.step", "extrude_punch"),
      entry("a/PUNCH coolant hole.step", "extrude_punch"),
      entry("a/PUNCH NO OIL.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
      entry("a/PUNCH PLAIN.step", "extrude_punch"),
    ]);
    const r = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(r.positive_hits).toBe(2);
    expect(r.matched_tokens.length).toBeGreaterThan(0);
    const lower = r.matched_tokens.map((t) => t.toLowerCase());
    expect(lower.some((t) => t.includes("oil") || t.includes("coolant"))).toBe(true);
  });

  it("only counts entries of the target class (cross-class isolation)", () => {
    const m = fakeManifest([
      entry("a/PUNCH OIL HOLE.step", "extrude_punch"),
      entry("a/PUNCH OIL HOLE 2.step", "extrude_punch"),
      entry("a/PUNCH STD.step", "extrude_punch"),
      entry("a/PUNCH STD2.step", "extrude_punch"),
      entry("a/PUNCH STD3.step", "extrude_punch"),
      entry("a/DIE OIL HOLE.step", "die"),
      entry("a/DIE OIL HOLE 2.step", "die"),
    ]);
    const punchR = engine.learnPrevalence(m, "extrude_punch", "central_oil_hole");
    expect(punchR.class_size).toBe(5);
    expect(punchR.positive_hits).toBe(2);
    const dieR = engine.learnPrevalence(m, "die", "central_oil_hole");
    expect(dieR.class_size).toBe(2);
    expect(dieR.positive_hits).toBe(2);
    expect(dieR.confident).toBe(false);
  });

  it("returns 0 prevalence when feature kind has no regex tokens registered", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    // Use a kind that has no entry in FEATURE_TOKEN_REGEXES (still a valid kind)
    const r = engine.learnPrevalence(fakeManifest(ents), "extrude_punch", "anti_fretting_coating");
    expect(r.class_size).toBe(5);
    expect(r.learned_prevalence).toBe(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.learnAll", () => {
  it("returns one LearnedPrevalence per (class, feature) pair", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH ${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
        { kind: "bevel_face_chamfer", label: "chamfer", prevalence: 0.8, build_hint: "chamfer", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    expect(report.results.length).toBe(2);
    expect(report.classes_examined).toEqual(["extrude_punch"]);
  });

  it("flags divergences when learned vs hand-tuned differ by ≥ threshold", () => {
    // Hand-tuned says 0.9, but corpus shows 0% prevalence → delta = -0.9
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl, 0.2);
    expect(report.divergences.length).toBe(1);
    expect(report.divergences[0]?.delta).toBeCloseTo(-0.9, 3);
  });

  it("does NOT flag divergences for non-confident (small-corpus) results", () => {
    // Only 3 members → not confident → no divergence reported even with delta
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 3; i++) ents.push(entry(`a/PART${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl, 0.2);
    expect(report.divergences.length).toBe(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.applyLearned", () => {
  it("blends learned + hand-tuned prevalence with smoothing factor 0.7", () => {
    // Hand-tuned 0.9, learned 0.4 → blended = 0.7 * 0.4 + 0.3 * 0.9 = 0.55
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH ${i}.step`, "extrude_punch"));
    ents[0]!.rel_path = "a/PUNCH OIL HOLE.step";
    ents[1]!.rel_path = "a/PUNCH OIL HOLE 2.step";
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBeCloseTo(0.7 * 0.4 + 0.3 * 0.9, 4);
  });

  it("does NOT override hand-tuned when corpus support is insufficient", () => {
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 3; i++) ents.push(entry(`a/PUNCH${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 0.9, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBe(0.9);
  });

  it("clamps blended prevalence to [0, 1]", () => {
    // Hand-tuned 1.0, all corpus matches → blended = 1.0 * 0.7 + 1.0 * 0.3 = 1.0 (clamped if it overflowed)
    const ents: CADCorpusEntry[] = [];
    for (let i = 0; i < 5; i++) ents.push(entry(`a/PUNCH OIL HOLE ${i}.step`, "extrude_punch"));
    const tmpl: Array<{ part_class: PartClass; features: FeatureTemplate[] }> = [{
      part_class: "extrude_punch",
      features: [
        { kind: "central_oil_hole", label: "oil hole", prevalence: 1.0, build_hint: "extrude:cut", rationale: "x" },
      ],
    }];
    const report = engine.learnAll(fakeManifest(ents), tmpl);
    const blended = engine.applyLearned(tmpl, report, 0.7);
    expect(blended[0]!.features[0]!.prevalence).toBeLessThanOrEqual(1);
    expect(blended[0]!.features[0]!.prevalence).toBeGreaterThanOrEqual(0);
  });
});

describe("CADCorpusFeaturePrevalenceLearnerEngine.supportedFeatureKinds", () => {
  it("returns at least 25 feature kinds (covers tooling + turbomachinery + medical + automotive + aerospace)", () => {
    const kinds = engine.supportedFeatureKinds();
    expect(kinds.length).toBeGreaterThanOrEqual(25);
    expect(kinds.includes("central_oil_hole")).toBe(true);
    expect(kinds.includes("leading_edge_fillet")).toBe(true);
    expect(kinds.includes("biocompat_note")).toBe(true);
    expect(kinds.includes("valve_seat_angle")).toBe(true);
    expect(kinds.includes("edge_distance_callout")).toBe(true);
  });
});

// ── U-FGE03: persistLearned — durable overlay (closes the memory R12
//    "in-memory blend with no persistence path" gap) ──────────────────
describe("U-FGE03 persistLearned", () => {
  async function mkTmp() {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fge03-learn-"));
    return { dir, file: path.join(dir, "overlay.json"), fs };
  }
  function tmpl(pc: string, feats: Array<{ kind: string; prevalence: number }>) {
    return {
      part_class: pc as PartClass,
      features: feats.map((f) => ({
        kind: f.kind, label: f.kind, prevalence: f.prevalence,
        build_hint: "executeRaw", rationale: "test",
      })) as unknown as FeatureTemplate[],
    };
  }

  it("happy path — writes a well-formed overlay JSON with the exact blended values", async () => {
    const { file, fs } = await mkTmp();
    const res = await engine.persistLearned(
      [tmpl("extrude_punch", [
        { kind: "central_oil_hole", prevalence: 0.83 },
        { kind: "working_tip_taper", prevalence: 0.6 },
      ])],
      { overlayPath: file, smoothing_alpha: 0.7 },
    );
    expect(res.ok).toBe(true);
    expect(res.classes).toBe(1);
    expect(res.features_written).toBe(2);
    expect(res.skipped_non_finite).toBe(0);
    const parsed = JSON.parse(await fs.readFile(file, "utf8"));
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.source).toBe("cad_corpus_apply_learned");
    expect(parsed.smoothing_alpha).toBe(0.7);
    expect(Number.isFinite(Date.parse(parsed.generated_at))).toBe(true);
    expect(parsed.prevalence.extrude_punch.central_oil_hole).toBeCloseTo(0.83, 6);
    expect(parsed.prevalence.extrude_punch.working_tip_taper).toBeCloseTo(0.6, 6);
  });

  it("atomic — leaves NO .tmp-<pid> file behind, only the final overlay", async () => {
    const { dir, file, fs } = await mkTmp();
    await engine.persistLearned([tmpl("die", [{ kind: "central_oil_hole", prevalence: 0.5 }])], { overlayPath: file });
    const names = await fs.readdir(dir);
    expect(names.filter((n: string) => n.includes(".tmp-"))).toEqual([]);
    expect(names).toContain("overlay.json");
  });

  it("R12 — SKIPS NaN/Infinity prevalence (never persists poison) + counts skipped_non_finite", async () => {
    const { file, fs } = await mkTmp();
    const res = await engine.persistLearned(
      [tmpl("die", [
        { kind: "central_oil_hole", prevalence: NaN },
        { kind: "bevel_face_chamfer", prevalence: Infinity },
        { kind: "stepped_revolved_axis", prevalence: 0.9 },
      ])],
      { overlayPath: file },
    );
    expect(res.ok).toBe(true);
    expect(res.skipped_non_finite).toBe(2);
    expect(res.features_written).toBe(1);
    const p = JSON.parse(await fs.readFile(file, "utf8")).prevalence.die;
    // Exhaustive key assertion — proves NaN/Infinity were skipped AND
    // nothing else leaked (stronger than per-key presence checks).
    expect(Object.keys(p)).toEqual(["stepped_revolved_axis"]);
    expect(p.stepped_revolved_axis).toBeCloseTo(0.9, 6);
  });

  it("clamps out-of-range prevalence into [0,1] in the persisted JSON", async () => {
    const { file, fs } = await mkTmp();
    await engine.persistLearned([tmpl("die", [
      { kind: "central_oil_hole", prevalence: 1.7 },
      { kind: "bevel_face_chamfer", prevalence: -0.4 },
    ])], { overlayPath: file });
    const p = JSON.parse(await fs.readFile(file, "utf8")).prevalence.die;
    expect(p.central_oil_hole).toBe(1);
    expect(p.bevel_face_chamfer).toBe(0);
  });

  it("boundary — empty template list → ok:true, classes:0, empty prevalence map", async () => {
    const { file, fs } = await mkTmp();
    const res = await engine.persistLearned([], { overlayPath: file });
    expect(res.ok).toBe(true);
    expect(res.classes).toBe(0);
    expect(res.features_written).toBe(0);
    expect(JSON.parse(await fs.readFile(file, "utf8")).prevalence).toEqual({});
  });

  it("R12 fail-loud — fs failure returns ok:false + error, NEVER throws", async () => {
    const failFs = {
      mkdir: async () => undefined,
      writeFile: async () => { throw new Error("ENOSPC simulated"); },
      rename: async () => undefined,
      unlink: async () => undefined,
    };
    const res = await engine.persistLearned(
      [tmpl("die", [{ kind: "central_oil_hole", prevalence: 0.5 }])],
      { overlayPath: "/nonexistent/x.json", fsImpl: failFs as never },
    );
    expect(res.ok).toBe(false);
    expect(res.error).toContain("ENOSPC");
    expect(res.classes).toBe(0);
  });

  it("honors PRISM_CAD_PREVALENCE_OVERLAY_PATH when opts.overlayPath omitted (writer↔reader path parity)", async () => {
    const { file, fs } = await mkTmp();
    const prev = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
    process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH = file;
    try {
      const res = await engine.persistLearned([tmpl("die", [{ kind: "central_oil_hole", prevalence: 0.42 }])], {});
      expect(res.ok).toBe(true);
      expect(res.path).toBe(file);
      expect(JSON.parse(await fs.readFile(file, "utf8")).prevalence.die.central_oil_hole).toBeCloseTo(0.42, 6);
    } finally {
      if (prev === undefined) delete process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
      else process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH = prev;
    }
  });

  it("serializes through the injected fs sink with clamp+skip applied to the real payload", async () => {
    let written = "";
    const capFs = {
      mkdir: async () => undefined,
      writeFile: async (_p: string, data: string) => { written = data; },
      rename: async () => undefined,
      unlink: async () => undefined,
    };
    const res = await engine.persistLearned(
      [tmpl("die", [
        { kind: "central_oil_hole", prevalence: 2.5 },     // clamp → 1
        { kind: "bevel_face_chamfer", prevalence: NaN },    // skip
        { kind: "stepped_revolved_axis", prevalence: 0.47 },
      ])],
      { overlayPath: "/sink.json", fsImpl: capFs as never, smoothing_alpha: 0.55 },
    );
    expect(res.ok).toBe(true);
    expect(res.features_written).toBe(2);
    expect(res.skipped_non_finite).toBe(1);
    // The injected sink receives the REAL serialized transform — assert the
    // actual JSON the engine produced (clamp + NaN-skip + provenance).
    const payload = JSON.parse(written);
    expect(payload.schemaVersion).toBe("1.0.0");
    expect(payload.smoothing_alpha).toBe(0.55);
    expect(payload.prevalence.die.central_oil_hole).toBe(1);
    expect(payload.prevalence.die.stepped_revolved_axis).toBeCloseTo(0.47, 6);
    expect(Object.keys(payload.prevalence.die).sort()).toEqual(["central_oil_hole", "stepped_revolved_axis"]);
  });
});
