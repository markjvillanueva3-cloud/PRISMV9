/**
 * LathePartFamilyTemplateExtractorEngine.test.ts
 * ================================================
 *
 * Tests for TRAINING-LEARNING-MS0/U1. Per spec line 58: >=10 cases; reference
 * families wafer-insert / casing / shaft / flange (>=3); adversarial cases for
 * empty corpus / malformed snapshot.
 *
 * Coverage floor:
 *   - happy path
 *   - >=3 failure modes
 *   - >=2 adversarial inputs
 *   - >=3 families exercised
 *   - real reference-value assertions (NO toBeDefined()/toBeTruthy() stubs)
 *
 * 22 cases spanning 5 families x 6 failure modes x 4 adversarial inputs.
 *
 * @module __tests__/LathePartFamilyTemplateExtractorEngine
 * @milestone TRAINING-LEARNING-MS0 / MS0-U1
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  lathePartFamilyTemplateExtractorEngine,
  LATHE_TEMPLATE_FAMILIES,
  type CorpusSnapshot,
} from "../engines/LathePartFamilyTemplateExtractorEngine.js";

function makeFixtureSnapshot(): CorpusSnapshot {
  return {
    schemaVersion: 1,
    generated_at: "2026-05-12T20:00:00Z",
    corpus_root_hint: "H:/PRISM/JM DIE/CNC LATHE",
    source_index: "H:/prism/Docustrata/.index/jm-die-index-v2.json",
    total_lathe_entries: 1000,
    total_classified_entries: 850,
    classification_coverage: 0.85,
    families: {
      "wafer-insert": {
        count: 80,
        customers: { "ATF TAP": 25, AKKO: 20, ITW: 15, ALCOA: 10, OPTIMAS: 10 },
        ext_breakdown: { ".min": 40, ".mcx-8": 30, ".ipt": 10 },
        kind_breakdown: { g_code: 40, cam_project: 40 },
        sample_paths: [
          "H:/PRISM/JM DIE/CNC LATHE/ATF TAP/wafer-insert-001.min",
          "H:/PRISM/JM DIE/CNC LATHE/AKKO/wafer-insert-002.mcx-8",
        ],
        seed_macros: ["BASE WAFER INSERT MACRO.min"],
      },
      casing: {
        count: 120,
        customers: { ALCOA: 50, ITW: 30, SFS: 20, "HOLO-KROME": 20 },
        ext_breakdown: { ".min": 60, ".mcx-8": 40, ".ipt": 20 },
        kind_breakdown: { g_code: 60, cam_project: 60 },
        sample_paths: ["H:/PRISM/JM DIE/CNC LATHE/ALCOA/casing-A05.min"],
        seed_macros: ["BASIC-CASING.MIN"],
      },
      shaft: {
        count: 200,
        customers: { AGRATI: 80, ACME: 60, ARCHER: 40, ALCOA: 20 },
        ext_breakdown: { ".min": 150, ".mcx-8": 50 },
        kind_breakdown: { g_code: 150, cam_project: 50 },
        sample_paths: ["H:/PRISM/JM DIE/CNC LATHE/AGRATI/shaft-stub-001.min"],
        seed_macros: [],
      },
      flange: {
        count: 50,
        customers: { AKKO: 30, ALLFAST: 20 },
        ext_breakdown: { ".min": 30, ".mcx-8": 20 },
        kind_breakdown: { g_code: 30, cam_project: 20 },
        sample_paths: ["H:/PRISM/JM DIE/CNC LATHE/AKKO/round-flange.min"],
        seed_macros: [],
      },
      unknown: {
        count: 500,
        customers: { _TOP_LEVEL: 300, ACME: 100, AGRATI: 100 },
        ext_breakdown: { ".min": 300, ".mcx-8": 150, ".ipt": 50 },
        kind_breakdown: { g_code: 300, cam_project: 200 },
        sample_paths: ["H:/PRISM/JM DIE/CNC LATHE/9007405.MIN"],
        seed_macros: [],
      },
    },
    historical_sf_disclaimer:
      "Historical S/F values from this corpus are DATA, NOT GROUND TRUTH.",
    warnings: [],
  };
}

let tmpOutDir: string;
let prevTemplateDirEnv: string | undefined;

beforeEach(() => {
  tmpOutDir = fs.mkdtempSync(path.join(os.tmpdir(), "lathe-template-extractor-test-"));
  prevTemplateDirEnv = process.env.PRISM_LATHE_TEMPLATE_DIR;
  process.env.PRISM_LATHE_TEMPLATE_DIR = tmpOutDir;
});

afterEach(() => {
  if (prevTemplateDirEnv === undefined) {
    delete process.env.PRISM_LATHE_TEMPLATE_DIR;
  } else {
    process.env.PRISM_LATHE_TEMPLATE_DIR = prevTemplateDirEnv;
  }
  try {
    fs.rmSync(tmpOutDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe("LathePartFamilyTemplateExtractorEngine — happy path (≥3 families)", () => {
  it("catalogCorpus returns families sorted by count descending with exact counts", () => {
    const snap = makeFixtureSnapshot();
    const r = lathePartFamilyTemplateExtractorEngine.catalogCorpus({ snapshot: snap });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.total_lathe_entries).toBe(1000);
    expect(r.total_classified_entries).toBe(850);
    expect(r.classification_coverage).toBeCloseTo(0.85, 4);
    expect(r.families.length).toBe(5);
    expect(r.families[0].family).toBe("unknown");
    expect(r.families[0].count).toBe(500);
    expect(r.families[1].family).toBe("shaft");
    expect(r.families[1].count).toBe(200);
    expect(r.families[2].family).toBe("casing");
    expect(r.families[2].count).toBe(120);
    expect(r.families[3].family).toBe("wafer-insert");
    expect(r.families[3].count).toBe(80);
    expect(r.families[4].family).toBe("flange");
    expect(r.families[4].count).toBe(50);
  });

  it("extractTemplate('wafer-insert') — OSP-anchored, controller okuma_osp, exact seed", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.family).toBe("wafer-insert");
    expect(r.template.family).toBe("wafer-insert");
    expect(r.template.controller_baseline).toBe("okuma_osp");
    expect(r.template.seed_macros).toEqual(["BASE WAFER INSERT MACRO.min"]);
    expect(r.template.run_count).toBe(80);
    expect(r.template.customers_top.length).toBe(5);
    expect(r.template.customers_top[0].customer).toBe("ATF TAP");
    expect(r.template.customers_top[0].count).toBe(25);
    expect(r.template.customers_top[1].customer).toBe("AKKO");
    expect(r.template.customers_top[1].count).toBe(20);
    expect(r.template.representative_parts.length).toBe(2);
    expect(r.template.representative_parts[0]).toContain("wafer-insert-001");
    expect(r.template.ext_breakdown[".min"]).toBe(40);
    expect(r.template.historical_sf_note).toContain("DATA, NOT GROUND TRUTH");
    expect(r.template.historical_sf_note).toContain("SpeedFeedOrchestrator");
    expect(r.template.schemaVersion).toBe(1);
    expect(r.template.variability.cycle_time_sec).toBe(null);
    expect(r.template.sx_score_distribution).toBe(null);
    expect(r.template.tribal_tips.length).toBeLessThanOrEqual(10);
    expect(r.template.playbook_rules.length).toBeLessThanOrEqual(10);
  });

  it("extractTemplate('shaft') — non-OSP, controller null, empty op_sequence", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("shaft", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.family).toBe("shaft");
    expect(r.template.controller_baseline).toBe(null);
    expect(r.template.seed_macros).toEqual([]);
    expect(r.template.op_sequence).toEqual([]);
    expect(r.template.tool_variables_placeholder).toEqual([]);
    expect(r.template.vc_var_schema).toBe(null);
    expect(r.template.run_count).toBe(200);
    expect(r.template.customers_top[0].customer).toBe("AGRATI");
    expect(r.template.customers_top[0].count).toBe(80);
    expect(r.template.customers_top.length).toBe(4);
  });

  it("extractTemplate('flange') — third family meets ≥3 families floor", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("flange", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.family).toBe("flange");
    expect(r.template.run_count).toBe(50);
    expect(r.template.customers_top.length).toBe(2);
    expect(r.template.customers_top[0].customer).toBe("AKKO");
    expect(r.template.customers_top[0].count).toBe(30);
    expect(r.template.customers_top[1].customer).toBe("ALLFAST");
    expect(r.template.customers_top[1].count).toBe(20);
    expect(r.template.ext_breakdown[".min"]).toBe(30);
    expect(r.template.kind_breakdown.g_code).toBe(30);
  });

  it("extractTemplate('casing') — second OSP family, BASIC-CASING.MIN seed", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("casing", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.family).toBe("casing");
    expect(r.template.controller_baseline).toBe("okuma_osp");
    expect(r.template.seed_macros).toEqual(["BASIC-CASING.MIN"]);
    expect(r.template.run_count).toBe(120);
    expect(r.template.customers_top[0].customer).toBe("ALCOA");
    expect(r.template.customers_top[0].count).toBe(50);
  });

  it("extractAllTemplates emits 5 families, 0 skipped", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractAllTemplates({
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.extracted.length).toBe(5);
    expect(r.skipped.length).toBe(0);
    const fams = r.extracted.map((e) => e.family).sort();
    expect(fams).toEqual(["casing", "flange", "shaft", "unknown", "wafer-insert"]);
  });
});

describe("LathePartFamilyTemplateExtractorEngine — round-trip", () => {
  it("extract → write → list → get cycles a wafer-insert template intact", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshot: snap,
      outDir: tmpOutDir,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.written_to).not.toBe(null);
    expect(fs.existsSync(r.written_to as string)).toBe(true);

    const listed = lathePartFamilyTemplateExtractorEngine.listTemplates({ dir: tmpOutDir });
    expect(listed.ok).toBe(true);
    expect(listed.templates.length).toBe(1);
    expect(listed.templates[0].family).toBe("wafer-insert");
    expect(listed.templates[0].size_bytes).toBeGreaterThan(100);

    const got = lathePartFamilyTemplateExtractorEngine.getTemplate("wafer-insert", { dir: tmpOutDir });
    expect(got).not.toBe(null);
    expect(got?.family).toBe("wafer-insert");
    expect(got?.controller_baseline).toBe("okuma_osp");
    expect(got?.seed_macros).toEqual(["BASE WAFER INSERT MACRO.min"]);
    expect(got?.schemaVersion).toBe(1);
    expect(got?.run_count).toBe(80);
  });

  it("listTemplates filters out _corpus-scan.json (underscore-prefixed)", () => {
    fs.writeFileSync(
      path.join(tmpOutDir, "_corpus-scan.json"),
      JSON.stringify({ schemaVersion: 1, dummy: true }),
    );
    fs.writeFileSync(
      path.join(tmpOutDir, "shaft.json"),
      JSON.stringify({ schemaVersion: 1, family: "shaft" }),
    );
    const r = lathePartFamilyTemplateExtractorEngine.listTemplates({ dir: tmpOutDir });
    expect(r.templates.length).toBe(1);
    expect(r.templates[0].family).toBe("shaft");
  });
});

describe("LathePartFamilyTemplateExtractorEngine — failure modes (≥3)", () => {
  it("extractTemplate('nonsense') returns unknown_family error", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("nonsense", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("unknown_family");
    expect(r.family).toBe("nonsense");
  });

  it("extractTemplate(family-absent-from-snapshot) returns family_not_in_snapshot", async () => {
    const snap = makeFixtureSnapshot();
    delete (snap.families as Record<string, unknown>)["wafer-insert"];
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("family_not_in_snapshot");
    expect(r.family).toBe("wafer-insert");
  });

  it("snapshot_not_found when snapshotPath points at a missing file", async () => {
    const missing = path.join(tmpOutDir, "does-not-exist.json");
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshotPath: missing,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("snapshot_not_found");
    expect(r.detail).toBe(missing);
  });

  it("snapshot_malformed_json when snapshot file contains invalid JSON", async () => {
    const bad = path.join(tmpOutDir, "bad-snapshot.json");
    fs.writeFileSync(bad, "{not json at all");
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshotPath: bad,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("snapshot_malformed_json");
  });

  it("snapshot_missing_families when JSON lacks 'families' key", async () => {
    const noFamilies = path.join(tmpOutDir, "no-families.json");
    fs.writeFileSync(
      noFamilies,
      JSON.stringify({ schemaVersion: 1, total_lathe_entries: 0, generated_at: "x" }),
    );
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshotPath: noFamilies,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("snapshot_missing_families");
  });

  it("snapshot_wrong_schema when schemaVersion is the wrong type", async () => {
    const wrongSchema = path.join(tmpOutDir, "wrong-schema.json");
    fs.writeFileSync(
      wrongSchema,
      JSON.stringify({ schemaVersion: "1.0.0", families: {} }),
    );
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshotPath: wrongSchema,
      dryRun: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error");
    expect(r.error).toBe("snapshot_wrong_schema");
  });
});

describe("LathePartFamilyTemplateExtractorEngine — adversarial (≥2)", () => {
  it("empty corpus snapshot — catalog returns 0 entries, no division-by-zero", () => {
    const empty: CorpusSnapshot = {
      schemaVersion: 1,
      generated_at: "2026-05-12T00:00:00Z",
      corpus_root_hint: "/tmp/empty",
      source_index: "/tmp/empty/index.json",
      total_lathe_entries: 0,
      total_classified_entries: 0,
      classification_coverage: 0,
      families: {},
      warnings: [],
    };
    const r = lathePartFamilyTemplateExtractorEngine.catalogCorpus({ snapshot: empty });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.total_lathe_entries).toBe(0);
    expect(r.total_classified_entries).toBe(0);
    expect(r.classification_coverage).toBe(0);
    expect(r.families.length).toBe(0);
  });

  it("__proto__ payload in snapshot is stripped — Object.prototype not polluted", async () => {
    const poisoned = path.join(tmpOutDir, "poisoned.json");
    // Embed a __proto__ key. JSON.parse with the proto-stripping reviver must drop it.
    fs.writeFileSync(
      poisoned,
      '{"schemaVersion":1,"generated_at":"x","corpus_root_hint":"x","source_index":"x","total_lathe_entries":0,"total_classified_entries":0,"classification_coverage":0,"families":{},"__proto__":{"polluted":"evil"}}',
    );
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshotPath: poisoned,
      dryRun: true,
    });
    expect((Object.prototype as Record<string, unknown>).polluted).toBe(undefined);
    expect(({} as Record<string, unknown>).polluted).toBe(undefined);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected error (no families)");
    expect(r.error).toBe("family_not_in_snapshot");
  });

  it("path traversal in opts.outDir → outdir_escape error", async () => {
    const snap = makeFixtureSnapshot();
    const escapeDir = path.resolve(os.tmpdir(), "..", "..", "..", "etc-evil");
    delete process.env.PRISM_LATHE_TEMPLATE_OUTDIR_UNCONFINED;
    const stashed = process.env.PRISM_LATHE_TEMPLATE_DIR;
    delete process.env.PRISM_LATHE_TEMPLATE_DIR;
    try {
      const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
        snapshot: snap,
        outDir: escapeDir,
      });
      expect(r.ok).toBe(false);
      if (r.ok) throw new Error("expected error");
      expect(r.error).toBe("outdir_escape");
    } finally {
      if (stashed !== undefined) process.env.PRISM_LATHE_TEMPLATE_DIR = stashed;
    }
  });

  it("'unknown' family bucket extracts cleanly, empty tribal lookup", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("unknown", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.family).toBe("unknown");
    expect(r.template.controller_baseline).toBe(null);
    expect(r.template.tribal_tips).toEqual([]);
    expect(r.template.playbook_rules).toEqual([]);
    expect(r.template.run_count).toBe(500);
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// Unrolled per-family invariant checks — every emitted template must carry the
// canonical HISTORICAL_SF_NOTE, schemaVersion=1, null MS0 variability fields.
// One it() per family (no synthetic loops per TEST LEGITIMACY GATE).

describe("LathePartFamilyTemplateExtractorEngine — emitted template invariants per family", () => {
  it("wafer-insert template carries HISTORICAL_SF_NOTE + null variability fields", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("wafer-insert", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.historical_sf_note).toContain("DATA, NOT GROUND TRUTH");
    expect(r.template.historical_sf_note).toContain("SpeedFeedOrchestrator");
    expect(r.template.historical_sf_note).toContain("feedback_box_programs_amateur");
    expect(r.template.schemaVersion).toBe(1);
    expect(r.template.sx_score_distribution).toBe(null);
    expect(r.template.variability.cycle_time_sec).toBe(null);
    expect(r.template.variability.dim_cpk).toBe(null);
    expect(r.template.variability.tool_life_min).toBe(null);
  });

  it("casing template carries HISTORICAL_SF_NOTE + null variability fields", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("casing", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.historical_sf_note).toContain("DATA, NOT GROUND TRUTH");
    expect(r.template.schemaVersion).toBe(1);
    expect(r.template.variability.cycle_time_sec).toBe(null);
    expect(r.template.sx_score_distribution).toBe(null);
  });

  it("shaft template carries HISTORICAL_SF_NOTE + null variability fields", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("shaft", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.historical_sf_note).toContain("DATA, NOT GROUND TRUTH");
    expect(r.template.schemaVersion).toBe(1);
    expect(r.template.variability.dim_cpk).toBe(null);
    expect(r.template.variability.tool_life_min).toBe(null);
  });

  it("flange template carries HISTORICAL_SF_NOTE + null variability fields", async () => {
    const snap = makeFixtureSnapshot();
    const r = await lathePartFamilyTemplateExtractorEngine.extractTemplate("flange", {
      snapshot: snap,
      dryRun: true,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("type guard failed");
    expect(r.template.historical_sf_note).toContain("SpeedFeedOrchestrator");
    expect(r.template.schemaVersion).toBe(1);
    expect(r.template.variability.cycle_time_sec).toBe(null);
  });

  it("LATHE_TEMPLATE_FAMILIES has 12 expected family names", () => {
    expect(LATHE_TEMPLATE_FAMILIES.length).toBe(12);
    expect(LATHE_TEMPLATE_FAMILIES[0]).toBe("wafer-insert");
    expect(LATHE_TEMPLATE_FAMILIES[1]).toBe("casing");
    expect(LATHE_TEMPLATE_FAMILIES[2]).toBe("casing-counterbore");
    expect(LATHE_TEMPLATE_FAMILIES[3]).toBe("top-hat-casing");
    expect(LATHE_TEMPLATE_FAMILIES[4]).toBe("shaft");
    expect(LATHE_TEMPLATE_FAMILIES[5]).toBe("flange");
    expect(LATHE_TEMPLATE_FAMILIES[6]).toBe("bushing");
    expect(LATHE_TEMPLATE_FAMILIES[7]).toBe("tube");
    expect(LATHE_TEMPLATE_FAMILIES[8]).toBe("taptite-blank");
    expect(LATHE_TEMPLATE_FAMILIES[9]).toBe("nut-blank");
    expect(LATHE_TEMPLATE_FAMILIES[10]).toBe("electrode-rod-blank");
    expect(LATHE_TEMPLATE_FAMILIES[11]).toBe("unknown");
  });

  it("getTemplate returns null for missing file", () => {
    const got = lathePartFamilyTemplateExtractorEngine.getTemplate("wafer-insert", {
      dir: tmpOutDir,
    });
    expect(got).toBe(null);
  });

  it("getTemplate returns null when stored template's family disagrees with filename", () => {
    fs.writeFileSync(
      path.join(tmpOutDir, "wafer-insert.json"),
      JSON.stringify({ schemaVersion: 1, family: "shaft" }),
    );
    const got = lathePartFamilyTemplateExtractorEngine.getTemplate("wafer-insert", {
      dir: tmpOutDir,
    });
    expect(got).toBe(null);
  });

  it("_fetchTribalContext('unknown') returns empty arrays (empty-query short-circuit)", async () => {
    const r = await lathePartFamilyTemplateExtractorEngine._fetchTribalContext("unknown");
    expect(r.tips).toEqual([]);
    expect(r.rules).toEqual([]);
  });
});
