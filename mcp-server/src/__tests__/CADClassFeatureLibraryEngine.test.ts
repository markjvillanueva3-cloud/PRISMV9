import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { CADClassFeatureLibraryEngine } from "../engines/CADClassFeatureLibraryEngine.js";

const engine = new CADClassFeatureLibraryEngine();

describe("CADClassFeatureLibraryEngine.templateFor", () => {
  it("returns extrude_punch template with 6 ordered features", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t === null).toBe(false);
    expect(t!.part_class).toBe("extrude_punch");
    expect(t!.features.length).toBe(6);
  });

  it("first punch feature is the stepped revolved axis (build root)", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t!.features[0]!.kind).toBe("stepped_revolved_axis");
    expect(t!.features[0]!.prevalence).toBe(1.0);
    expect(t!.features[0]!.build_hint).toBe("revolveStepProfile");
  });

  it("punch template includes working-tip taper at 0.85 prevalence with 2.0° default", () => {
    const t = engine.templateFor("extrude_punch");
    const taper = t!.features.find((f) => f.kind === "working_tip_taper");
    expect(taper?.prevalence).toBe(0.85);
    expect(taper?.typical_angle_deg).toBe(2.0);
    expect(taper?.build_hint).toBe("extrudeTapered");
  });

  it("punch template includes central_oil_hole at 0.9 prevalence with Ø1.27mm", () => {
    const t = engine.templateFor("extrude_punch");
    const oil = t!.features.find((f) => f.kind === "central_oil_hole");
    expect(oil?.prevalence).toBe(0.9);
    expect(oil?.typical_size_mm).toBe(1.27);
  });

  it("punch template includes cross-drilled relief at 0.7 prevalence with Ø1.524mm", () => {
    const t = engine.templateFor("extrude_punch");
    const relief = t!.features.find((f) => f.kind === "cross_drilled_relief_holes");
    expect(relief?.prevalence).toBe(0.7);
    expect(relief?.typical_size_mm).toBe(1.524);
    expect(relief?.build_hint).toBe("crossDrillHoles");
  });

  it("punch template carries visual-fidelity notes about the 2nd-attempt failures", () => {
    const t = engine.templateFor("extrude_punch");
    expect(t!.visual_fidelity_notes.length).toBeGreaterThanOrEqual(3);
    const blob = t!.visual_fidelity_notes.join(" ").toLowerCase();
    expect(blob.includes("detail a")).toBe(true);
    expect(blob.includes("orientation")).toBe(true);
  });

  it("returns null for classes without a template (no shadow fallbacks)", () => {
    const t = engine.templateFor("plate");
    expect(t === null).toBe(true);
  });

  it("die template has ejector_pin_hole at 0.9 prevalence with Ø4.76mm", () => {
    const t = engine.templateFor("die");
    const ej = t!.features.find((f) => f.kind === "ejector_pin_hole");
    expect(ej?.prevalence).toBe(0.9);
    expect(ej?.typical_size_mm).toBe(4.76);
  });

  it("shaft template has end-chamfer at 0.95 prevalence (near-universal)", () => {
    const t = engine.templateFor("shaft");
    const ch = t!.features.find((f) => f.kind === "bevel_face_chamfer");
    expect(ch?.prevalence).toBe(0.95);
    expect(ch?.typical_angle_deg).toBe(45);
  });

  it("blisk template has all 3 airfoil-fillet features at prevalence 1.0", () => {
    const t = engine.templateFor("blisk");
    const le = t!.features.find((f) => f.kind === "leading_edge_fillet");
    const te = t!.features.find((f) => f.kind === "trailing_edge_fillet");
    const root = t!.features.find((f) => f.kind === "blade_root_fillet");
    expect(le?.prevalence).toBe(1.0);
    expect(te?.prevalence).toBe(1.0);
    expect(root?.prevalence).toBe(1.0);
  });

  it("medical_implant template flags biocompat + polish at prevalence 1.0", () => {
    const t = engine.templateFor("medical_implant");
    const bio = t!.features.find((f) => f.kind === "biocompat_note");
    const polish = t!.features.find((f) => f.kind === "polish_callout");
    expect(bio?.prevalence).toBe(1.0);
    expect(polish?.prevalence).toBe(1.0);
  });
});

describe("CADClassFeatureLibraryEngine.classesCovered", () => {
  it("covers at least 6 classes (punch, die, shaft, blisk, medical_implant, valve_body)", () => {
    const classes = engine.classesCovered();
    expect(classes.length).toBeGreaterThanOrEqual(6);
    const hasAll = ["extrude_punch", "die", "shaft", "blisk", "medical_implant", "valve_body"]
      .every((c) => classes.includes(c as never));
    expect(hasAll).toBe(true);
  });
});

describe("CADClassFeatureLibraryEngine.predictVisualFidelity", () => {
  it("returns score 1.0 when every template feature is in the plan (full fidelity)", () => {
    const t = engine.templateFor("extrude_punch")!;
    const allKinds = t.features.map((f) => f.kind);
    const result = engine.predictVisualFidelity("extrude_punch", allKinds);
    expect(result.score).toBe(1);
    expect(result.missing.length).toBe(0);
  });

  it("predicts the 2nd JM Die attempt at score ≈ 0.55 (revolve + oil + cross-drill only)", () => {
    // 2nd attempt: revolveStepProfile + central oil hole + cross-drilled relief.
    // Missing: working_tip_taper (0.85), bevel_face_chamfer (0.8), shoulder_fillet (0.6)
    // Covered prevalence: 1.0 + 0.9 + 0.7 = 2.6 / total 4.95 = 0.525
    const result = engine.predictVisualFidelity("extrude_punch", [
      "stepped_revolved_axis",
      "central_oil_hole",
      "cross_drilled_relief_holes",
    ]);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.score).toBeLessThan(0.6);
    expect(result.missing.length).toBe(3);
    const missingKinds = result.missing.map((f) => f.kind);
    expect(missingKinds.includes("working_tip_taper")).toBe(true);
    expect(missingKinds.includes("bevel_face_chamfer")).toBe(true);
  });

  it("returns score 0 + empty arrays for unknown class", () => {
    const result = engine.predictVisualFidelity("plate", ["stepped_revolved_axis"]);
    expect(result.score).toBe(0);
    expect(result.template_total).toBe(0);
    expect(result.missing.length).toBe(0);
  });

  it("planned_covered exactly equals sum of matched prevalences", () => {
    const result = engine.predictVisualFidelity("extrude_punch", ["stepped_revolved_axis", "central_oil_hole"]);
    // 1.0 (axis) + 0.9 (oil) = 1.9
    expect(Math.round(result.planned_covered * 100) / 100).toBe(1.9);
  });

  it("missing list excludes features that ARE in the plan", () => {
    const result = engine.predictVisualFidelity("extrude_punch", ["stepped_revolved_axis"]);
    const missingKinds = result.missing.map((f) => f.kind);
    expect(missingKinds.includes("stepped_revolved_axis")).toBe(false);
  });
});

describe("CADClassFeatureLibraryEngine.buildSequenceFor", () => {
  it("returns features at or above default 0.5 threshold (drops only the 0.6 shoulder_fillet at threshold 0.7)", () => {
    const seq = engine.buildSequenceFor("extrude_punch", 0.7);
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("shoulder_fillet")).toBe(false);
    expect(kinds.includes("stepped_revolved_axis")).toBe(true);
    expect(kinds.includes("working_tip_taper")).toBe(true);
  });

  it("default threshold 0.5 includes shoulder_fillet (prevalence 0.6)", () => {
    const seq = engine.buildSequenceFor("extrude_punch");
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("shoulder_fillet")).toBe(true);
  });

  it("threshold 1.0 returns only the 100%-prevalence root features", () => {
    const seq = engine.buildSequenceFor("extrude_punch", 1.0);
    expect(seq.length).toBe(1);
    expect(seq[0]!.kind).toBe("stepped_revolved_axis");
  });

  it("returns empty array for unknown classes (no extrapolation)", () => {
    const seq = engine.buildSequenceFor("plate");
    expect(seq.length).toBe(0);
  });

  it("blisk default sequence emits LE/TE/root fillets in order before optional balance hole", () => {
    const seq = engine.buildSequenceFor("blisk");
    const kinds = seq.map((f) => f.kind);
    expect(kinds.includes("leading_edge_fillet")).toBe(true);
    expect(kinds.includes("trailing_edge_fillet")).toBe(true);
    expect(kinds.includes("blade_root_fillet")).toBe(true);
  });
});

// ── buildSequenceForEvidence — wires LIVE corpus into build sequence ──

describe("CADClassFeatureLibraryEngine.buildSequenceForEvidence", () => {
  // Corpus matched to TOOLING_PUNCH_FEATURES (extrude_punch template). Counts
  // mirror the real cad-corpus-step-geometry-report.json shape for punch-class
  // parts (kinds match template kinds 1:1).
  const punchCorpus = {
    per_class: [
      {
        part_class: "extrude_punch",
        files_examined: 75,
        feature_evidence_counts: {
          central_oil_hole: 71,            // 0.947 — template prev 0.9
          bevel_face_chamfer: 38,          // 0.507 — template prev 0.8
          stepped_revolved_axis: 35,       // 0.467 — template prev 1.0 (DRIFT signal)
          working_tip_taper: 33,           // 0.440 — template prev 0.85 (DRIFT signal at 0.5+)
          cross_drilled_relief_holes: 28,  // 0.373 — template prev 0.7
          shoulder_fillet: 16,             // 0.213 — template prev 0.6 — below 0.3 default
        },
      },
    ],
  };

  it("ranks features by evidence_ratio descending (extrude_punch: oil_hole top)", () => {
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus });
    expect(r.corpus_class_found).toBe(true);
    expect(r.sequence.length).toBeGreaterThan(0);
    expect(r.sequence[0]!.kind).toBe("central_oil_hole");
    expect(r.sequence[0]!.evidence_ratio).toBeCloseTo(71 / 75, 4);
    expect(r.sequence[0]!.source).toBe("corpus");
  });

  it("filters out features below min_evidence_ratio default 0.3", () => {
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus });
    const kinds = r.sequence.map((s) => s.kind);
    // shoulder_fillet ratio 16/75 = 0.213 < 0.3 — must be excluded
    expect(kinds.includes("shoulder_fillet")).toBe(false);
    // central_oil_hole ratio 71/75 = 0.947 ≥ 0.3 — must be included
    expect(kinds.includes("central_oil_hole")).toBe(true);
    // cross_drilled_relief_holes ratio 28/75 = 0.373 ≥ 0.3 — included
    expect(kinds.includes("cross_drilled_relief_holes")).toBe(true);
  });

  it("respects custom min_evidence_ratio threshold", () => {
    const tight = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus, min_evidence_ratio: 0.9 });
    expect(tight.sequence.length).toBe(1);
    expect(tight.sequence[0]!.kind).toBe("central_oil_hole");

    const loose = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus, min_evidence_ratio: 0.1 });
    const looseKinds = loose.sequence.map((s) => s.kind);
    expect(looseKinds.includes("shoulder_fillet")).toBe(true);
  });

  it("emits drift caveats when template_prevalence ≥0.7 but corpus_ratio < min_ratio", () => {
    // stepped_revolved_axis: prev=1.0, ratio=35/75=0.467 — below default 0.3? no.
    // At min_ratio=0.5: 0.467 < 0.5 AND prev=1.0 ≥ 0.7 → drift fires.
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus, min_evidence_ratio: 0.5 });
    const drifts = r.caveats.filter((c) => c.includes("drift:"));
    expect(drifts.some((c) => c.includes("stepped_revolved_axis"))).toBe(true);
    // working_tip_taper: prev=0.85, ratio=0.440 < 0.5 → also drift
    expect(drifts.some((c) => c.includes("working_tip_taper"))).toBe(true);
  });

  it("falls back to template prevalence when corpus_report is null (with caveat)", () => {
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: null });
    expect(r.corpus_class_found).toBe(false);
    expect(r.caveats.some((c) => c.includes("missing or malformed"))).toBe(true);
    expect(r.sequence.length).toBeGreaterThan(0);
    expect(r.sequence[0]!.source).toBe("template_fallback");
  });

  it("falls back when corpus has no entry for the requested part_class", () => {
    // Corpus has only extrude_punch, ask for shaft → no entry → template fallback
    const r = engine.buildSequenceForEvidence("shaft", { corpus_report: punchCorpus });
    expect(r.corpus_class_found).toBe(false);
    expect(r.caveats.some((c) => c.includes('no entry for part_class "shaft"'))).toBe(true);
    expect(r.sequence.length).toBeGreaterThan(0);
    expect(r.sequence[0]!.source).toBe("template_fallback");
  });

  it("returns empty sequence with caveat when neither template nor corpus has the class", () => {
    const r = engine.buildSequenceForEvidence("plate", { corpus_report: punchCorpus });
    expect(r.sequence.length).toBe(0);
    expect(r.corpus_class_found).toBe(false);
    expect(r.caveats.some((c) => c.includes('no template for part_class "plate"'))).toBe(true);
  });

  it("handles malformed corpus (non-array per_class) by falling back loudly", () => {
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: { per_class: "broken" } as never });
    expect(r.corpus_class_found).toBe(false);
    expect(r.caveats.some((c) => c.includes("malformed"))).toBe(true);
  });

  it("rejects corpus entries with non-positive files_examined (no divide-by-zero)", () => {
    const badCorpus = {
      per_class: [{ part_class: "extrude_punch", files_examined: 0, feature_evidence_counts: { central_oil_hole: 71 } }],
    };
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: badCorpus });
    expect(r.corpus_class_found).toBe(false);
    expect(r.caveats.some((c) => c.includes("invalid"))).toBe(true);
    for (const s of r.sequence) {
      expect(Number.isFinite(s.evidence_ratio)).toBe(true);
    }
  });

  it("when corpus class found but no features clear min_ratio, falls back with corpus_class_found=true", () => {
    const sparseCorpus = {
      per_class: [{ part_class: "extrude_punch", files_examined: 100, feature_evidence_counts: { central_oil_hole: 2, bevel_face_chamfer: 1 } }],
    };
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: sparseCorpus, min_evidence_ratio: 0.3 });
    expect(r.corpus_class_found).toBe(true);
    expect(r.sequence.length).toBeGreaterThan(0);
    expect(r.sequence[0]!.source).toBe("template_fallback");
    expect(r.caveats.some((c) => c.includes("min_evidence_ratio"))).toBe(true);
  });

  it("ties broken by template prevalence (preserves build-axis-first when ratios equal)", () => {
    const tieCorpus = {
      per_class: [
        {
          part_class: "extrude_punch",
          files_examined: 100,
          feature_evidence_counts: {
            central_oil_hole: 50,      // template prevalence 0.9
            bevel_face_chamfer: 50,    // template prevalence 0.8
          },
        },
      ],
    };
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: tieCorpus, min_evidence_ratio: 0.4 });
    expect(r.sequence[0]!.kind).toBe("central_oil_hole");
    expect(r.sequence[1]!.kind).toBe("bevel_face_chamfer");
  });

  it("evidence_ratio + evidence_count are exposed on every sequence entry for caller diagnostics", () => {
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: punchCorpus });
    for (const s of r.sequence) {
      expect(typeof s.evidence_count).toBe("number");
      expect(typeof s.evidence_ratio).toBe("number");
      expect(s.evidence_ratio).toBeGreaterThanOrEqual(0);
      expect(s.evidence_ratio).toBeLessThanOrEqual(1);
      expect(["corpus", "template_fallback"]).toContain(s.source);
    }
  });

  // P1 regression: NaN-poisoning from a hostile/corrupt corpus must NOT
  // silently suppress the drift caveat surface (which is the load-bearing
  // diagnostic of this whole method). Number({nested: 5}) → NaN.
  it("NaN-poison regression: corrupt count value treated as 0 + emits caveat", () => {
    const poisoned = {
      per_class: [
        {
          part_class: "extrude_punch",
          files_examined: 75,
          feature_evidence_counts: {
            central_oil_hole: { nested: 5 } as never, // → Number(...) = NaN
            bevel_face_chamfer: 71,
            stepped_revolved_axis: "garbage" as never, // → NaN
          },
        },
      ],
    };
    const r = engine.buildSequenceForEvidence("extrude_punch", { corpus_report: poisoned });
    expect(r.corpus_class_found).toBe(true);
    // Drift caveat must STILL fire for stepped_revolved_axis (template prev=1.0 ≥ 0.7,
    // count=0 after NaN-coercion → ratio=0 < default 0.3) — the load-bearing fail-loud.
    const drifts = r.caveats.filter((c) => c.includes("drift:"));
    expect(drifts.some((c) => c.includes("stepped_revolved_axis"))).toBe(true);
    // Corrupt caveats must surface so operators can identify+fix bad corpus entries.
    const corrupts = r.caveats.filter((c) => c.includes("corrupt corpus count"));
    expect(corrupts.length).toBeGreaterThanOrEqual(2);
    expect(corrupts.some((c) => c.includes("central_oil_hole"))).toBe(true);
    expect(corrupts.some((c) => c.includes("stepped_revolved_axis"))).toBe(true);
    // central_oil_hole filtered out of ranked (NaN→0, 0/75=0 < 0.3) so the only
    // ranked entry should be bevel_face_chamfer (71/75 = 0.947).
    expect(r.sequence.length).toBeGreaterThan(0);
    for (const s of r.sequence) {
      expect(Number.isFinite(s.evidence_ratio)).toBe(true);
      expect(Number.isFinite(s.evidence_count)).toBe(true);
    }
  });
});

// ── U-FGE03: learned-prevalence overlay auto-applied on the DEFAULT
//    build-sequence path (closes memory R12 "not auto-blended into the
//    live build-sequence templates" gap) ──────────────────────────────
describe("U-FGE03 overlay auto-apply", () => {
  let tmpDir = "";
  let overlayFile = "";

  async function writeOverlay(prevalence: Record<string, Record<string, number>>) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(overlayFile, JSON.stringify({
      schemaVersion: "1.0.0", generated_at: new Date().toISOString(),
      source: "cad_corpus_apply_learned", smoothing_alpha: 0.7, prevalence,
    }), "utf8");
    engine.clearOverlayCache();
  }

  // Each test points the overlay path at a per-test tmp file (NEVER the
  // real data/state default) and clears the module-singleton cache after,
  // so a written overlay can never leak into a sibling test.
  beforeAll(async () => {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fge03-lib-"));
    overlayFile = path.join(tmpDir, "overlay.json");
    process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH = overlayFile;
  });
  afterEach(async () => {
    const fs = await import("node:fs/promises");
    await fs.rm(overlayFile, { force: true });
    delete process.env.PRISM_CAD_PREVALENCE_OVERLAY_DISABLE;
    engine.clearOverlayCache();
  });

  it("REGRESSION PIN — no overlay file → templateFor returns the EXACT static template (byte-identical, backward-compat)", async () => {
    engine.clearOverlayCache();
    const t = engine.templateFor("extrude_punch")!;
    const stat = engine.templateForStatic("extrude_punch")!;
    // Pre-U-FGE03 known static prevalences — these MUST be unchanged when
    // no overlay exists (every FGE01/02 test depends on this).
    const axis = t.features.find((f) => f.kind === "stepped_revolved_axis")!;
    const oil = t.features.find((f) => f.kind === "central_oil_hole")!;
    expect(axis.prevalence).toBe(1.0);
    expect(oil.prevalence).toBe(0.9);
    expect(t).toEqual(stat);
    expect(engine.overlayStatus().present).toBe(false);
  });

  it("valid overlay → DEFAULT templateFor prevalence is overridden + expected_feature_count recomputed", async () => {
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.2 } });
    const t = engine.templateFor("extrude_punch")!;
    const oil = t.features.find((f) => f.kind === "central_oil_hole")!;
    expect(oil.prevalence).toBe(0.2);
    // Invariant: expected_feature_count = Σ prevalence (predictVisualFidelity
    // covered/total ≤ 1 must still hold under the overlay).
    const sum = t.features.reduce((s, f) => s + f.prevalence, 0);
    expect(t.expected_feature_count).toBeCloseTo(sum, 6);
  });

  it("overlay propagates to buildSequenceFor — a feature dropped below threshold is excluded from the DEFAULT sequence", async () => {
    const before = engine.buildSequenceFor("extrude_punch", 0.5).map((f) => f.kind);
    expect(before).toContain("central_oil_hole"); // static 0.9 ≥ 0.5
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.2 } });
    const after = engine.buildSequenceFor("extrude_punch", 0.5).map((f) => f.kind);
    expect(after).not.toContain("central_oil_hole"); // overlaid 0.2 < 0.5
  });

  it("DISABLE knob → overlay ignored, static template returned even though the file exists", async () => {
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.01 } });
    process.env.PRISM_CAD_PREVALENCE_OVERLAY_DISABLE = "1";
    engine.clearOverlayCache();
    const oil = engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!;
    expect(oil.prevalence).toBe(0.9); // static, not 0.01
    const st = engine.overlayStatus();
    expect(st.disabled).toBe(true);
    expect(st.applied).toBe(false);
  });

  it("R12 — corrupt JSON overlay → static template + surfaced error (never silently applies garbage)", async () => {
    const fs = await import("node:fs/promises");
    await fs.writeFile(overlayFile, "{ this is not valid json ", "utf8");
    engine.clearOverlayCache();
    const oil = engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!;
    expect(oil.prevalence).toBe(0.9); // static fallback
    expect(typeof engine.overlayStatus().error).toBe("string");
    expect(engine.overlayStatus().error!.length).toBeGreaterThan(0);
  });

  it("R12 — shape-invalid overlay (prevalence is an array) → static + surfaced error", async () => {
    const fs = await import("node:fs/promises");
    await fs.writeFile(overlayFile, JSON.stringify({ schemaVersion: "1.0.0", prevalence: [] }), "utf8");
    engine.clearOverlayCache();
    const oil = engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!;
    expect(oil.prevalence).toBe(0.9);
    expect(engine.overlayStatus().error).toContain("shape invalid");
  });

  it("LIBRARY purity — applying an overlay does not mutate the shared static const", async () => {
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.05 } });
    expect(engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!.prevalence).toBe(0.05);
    // templateForStatic must STILL report the original static value — proves
    // applyOverlay cloned and never mutated LIBRARY.
    expect(engine.templateForStatic("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!.prevalence).toBe(0.9);
  });

  it("mtime cache invalidates when a peer rewrites the overlay (no manual clear needed)", async () => {
    const fsp = await import("node:fs/promises");
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.3 } });
    expect(engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!.prevalence).toBe(0.3);
    // Rewrite with a guaranteed-later mtime, do NOT clearOverlayCache.
    await new Promise((r) => setTimeout(r, 15));
    await fsp.writeFile(overlayFile, JSON.stringify({
      schemaVersion: "1.0.0", generated_at: new Date().toISOString(),
      source: "cad_corpus_apply_learned", smoothing_alpha: 0.7,
      prevalence: { extrude_punch: { central_oil_hole: 0.77 } },
    }), "utf8");
    expect(engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!.prevalence).toBe(0.77);
  });

  it("P1-1 REGRESSION — buildSequenceForEvidence drift caveat compares STATIC (not overlay-blended) prevalence vs corpus", async () => {
    // Overlay drives central_oil_hole's blended prevalence DOWN to 0.1.
    // If the FGE01 drift baseline used the overlaid value (0.1 < 0.7 DRIFT
    // threshold) the drift caveat would NOT fire — silently blinding the
    // retrain signal. Using STATIC (0.9 ≥ 0.7) it MUST fire.
    await writeOverlay({ extrude_punch: { central_oil_hole: 0.1 } });
    const r = engine.buildSequenceForEvidence("extrude_punch", {
      corpus_report: {
        per_class: [{
          part_class: "extrude_punch",
          files_examined: 100,
          feature_evidence_counts: { central_oil_hole: 3 }, // ratio 0.03 ≪ min
        }],
      },
      min_evidence_ratio: 0.3,
    });
    const driftFired = r.caveats.some(
      (c) => c.includes("drift") && c.includes("central_oil_hole"),
    );
    expect(driftFired).toBe(true);
  });

  it("overlayStatus reports the full lifecycle (absent → present → disabled)", async () => {
    engine.clearOverlayCache();
    expect(engine.overlayStatus().present).toBe(false);
    await writeOverlay({ die: { central_oil_hole: 0.5 } });
    const present = engine.overlayStatus();
    expect(present.present).toBe(true);
    expect(present.applied).toBe(true);
    expect(present.classes_count).toBe(1);
    expect(present.source).toBe("cad_corpus_apply_learned");
    process.env.PRISM_CAD_PREVALENCE_OVERLAY_DISABLE = "1";
    engine.clearOverlayCache();
    expect(engine.overlayStatus().applied).toBe(false);
  });
});

// ── U-FGE03: dispatcher round-trip — the persist→status→default-path
//    wiring proof (closes P0-1: persistLearned must be reachable) ──────
describe("U-FGE03 dispatcher round-trip (cad_corpus_apply_learned persist + cad_corpus_overlay_status)", () => {
  it("persist:true via cadDispatcher writes the overlay; overlay_status + default build_sequence reflect it", async () => {
    const os = await import("node:os");
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "fge03-disp-"));
    const file = path.join(dir, "overlay.json");
    const prevEnv = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
    process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH = file;

    const dispatcherMod = await import("../tools/dispatchers/cadDispatcher.js");
    const registerFn =
      (dispatcherMod as unknown as Record<string, unknown>).registerCadDispatcher ??
      (dispatcherMod as unknown as Record<string, unknown>).default;
    let capturedHandler:
      | ((a: { action: string; params: Record<string, unknown> }) => Promise<unknown>)
      | null = null;
    const sink = (
      _n: string, _m: unknown, _s: unknown,
      h: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>,
    ) => { capturedHandler = h; };
    const mockServer = { registerTool: sink, tool: sink };
    try {
      if (typeof registerFn === "function") {
        try { (registerFn as (s: unknown) => void)(mockServer); } catch { /* shape variance */ }
      }
      expect(typeof capturedHandler).toBe("function");
      const rawCall = capturedHandler as unknown as (a: { action: string; params: Record<string, unknown> }) => Promise<{ content?: Array<{ text: string }> }>;
      // MCP tool responses are {content:[{type:'text',text:JSON}]} — unwrap.
      const call = async (a: { action: string; params: Record<string, unknown> }) => {
        const resp = await rawCall(a);
        const text = resp?.content?.[0]?.text;
        expect(typeof text).toBe("string");
        return JSON.parse(text as string) as { success?: boolean; data?: Record<string, unknown> };
      };

      // 1. apply_learned with persist:true — empty report ⇒ blended == hand-tuned,
      //    then durably persisted.
      const handTuned = [{
        part_class: "extrude_punch",
        features: [{ kind: "central_oil_hole", label: "oil", prevalence: 0.33, build_hint: "executeRaw", rationale: "rt" }],
      }];
      const applied = await call({
        action: "cad_corpus_apply_learned",
        params: {
          hand_tuned_templates: handTuned,
          report: { generated_at: "t", corpus_size: 0, classes_examined: [], results: [], divergences: [] },
          smoothing_alpha: 0.7, persist: true,
        },
      });
      expect(applied.success).toBe(true);
      const persisted = (applied.data as { persisted: { ok: boolean; path: string } }).persisted;
      expect(persisted.ok).toBe(true);
      expect(persisted.path).toBe(file);

      // 2. overlay_status reports the persisted overlay as present + applied.
      const status = await call({ action: "cad_corpus_overlay_status", params: {} });
      expect(status.success).toBe(true);
      expect((status.data as { present: boolean; applied: boolean }).present).toBe(true);
      expect((status.data as { applied: boolean }).applied).toBe(true);

      // 3. default build_sequence now reflects the persisted prevalence.
      engine.clearOverlayCache();
      const oil = engine.templateFor("extrude_punch")!.features.find((f) => f.kind === "central_oil_hole")!;
      expect(oil.prevalence).toBeCloseTo(0.33, 6);
    } finally {
      if (prevEnv === undefined) delete process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
      else process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH = prevEnv;
      engine.clearOverlayCache();
    }
  });
});
