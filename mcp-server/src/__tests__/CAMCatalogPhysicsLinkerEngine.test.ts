/**
 * CAMCatalogPhysicsLinkerEngine tests — U-CAM-ENRICH-01
 * ======================================================
 * Verifies parameter name → physics formula pattern matching and
 * catalog-walking behavior.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMCatalogPhysicsLinkerEngine,
  camCatalogPhysicsLinkerEngine,
} from "../engines/CAMCatalogPhysicsLinkerEngine.js";

const engine = new CAMCatalogPhysicsLinkerEngine();

describe("CAMCatalogPhysicsLinkerEngine — matchParameter (Kienzle family)", () => {
  it("matches cutting_force → kienzle_cutting_force", () => {
    const r = engine.matchParameter("cutting_force");
    expect(r.matched_formulas).toContain("kienzle_cutting_force");
  });

  it("matches Fc short form", () => {
    const r = engine.matchParameter("Fc");
    expect(r.matched_formulas).toContain("kienzle_cutting_force");
  });

  it("does NOT match 'enforcement' (whole-word boundary check)", () => {
    const r = engine.matchParameter("enforcement");
    expect(r.matched_formulas).toHaveLength(0);
  });
});

describe("CAMCatalogPhysicsLinkerEngine — matchParameter (Taylor family)", () => {
  it("matches tool_life → taylor_tool_life", () => {
    const r = engine.matchParameter("tool_life");
    expect(r.matched_formulas).toContain("taylor_tool_life");
  });

  it("matches VB flank wear → taylor_tool_life", () => {
    const r = engine.matchParameter("VB");
    expect(r.matched_formulas).toContain("taylor_tool_life");
  });
});

describe("CAMCatalogPhysicsLinkerEngine — matchParameter (deflection + thermal)", () => {
  it("matches tool_deflection → tool_deflection", () => {
    const r = engine.matchParameter("tool_deflection");
    expect(r.matched_formulas).toContain("tool_deflection");
  });

  it("matches temperature → jaeger_temperature", () => {
    const r = engine.matchParameter("temperature");
    expect(r.matched_formulas).toContain("jaeger_temperature");
  });
});

describe("CAMCatalogPhysicsLinkerEngine — matchParameter (S/F/ap/ae)", () => {
  it("matches spindle_speed → spindle_rpm", () => {
    const r = engine.matchParameter("spindle_speed");
    expect(r.matched_formulas).toContain("spindle_rpm");
  });

  it("matches feed_rate → feed_rate", () => {
    const r = engine.matchParameter("feed_rate");
    expect(r.matched_formulas).toContain("feed_rate");
  });

  it("matches ap → depth_of_cut_ap", () => {
    const r = engine.matchParameter("ap");
    expect(r.matched_formulas).toContain("depth_of_cut_ap");
  });

  it("matches ae → width_of_cut_ae", () => {
    const r = engine.matchParameter("ae");
    expect(r.matched_formulas).toContain("width_of_cut_ae");
  });

  it("matches Vc → cutting_speed_vc", () => {
    const r = engine.matchParameter("Vc");
    expect(r.matched_formulas).toContain("cutting_speed_vc");
  });

  it("matches fz → chip_load_per_tooth", () => {
    const r = engine.matchParameter("fz");
    expect(r.matched_formulas).toContain("chip_load_per_tooth");
  });
});

describe("CAMCatalogPhysicsLinkerEngine — matchParameter (surface + power + chatter)", () => {
  it("matches Ra → surface_finish_ra", () => {
    const r = engine.matchParameter("Ra");
    expect(r.matched_formulas).toContain("surface_finish_ra");
  });

  it("matches scallop → surface_finish_ra", () => {
    const r = engine.matchParameter("scallop_height");
    expect(r.matched_formulas).toContain("surface_finish_ra");
  });

  it("matches power → spindle_power", () => {
    const r = engine.matchParameter("power");
    expect(r.matched_formulas).toContain("spindle_power");
  });

  it("matches chatter → chatter_stability_lobe", () => {
    const r = engine.matchParameter("chatter_detection");
    expect(r.matched_formulas).toContain("chatter_stability_lobe");
  });

  it("matches MRR → material_removal_rate", () => {
    const r = engine.matchParameter("MRR");
    expect(r.matched_formulas).toContain("material_removal_rate");
  });
});

describe("CAMCatalogPhysicsLinkerEngine — PhysicsLink shape + deduplication", () => {
  it("returned PhysicsLinks have formula_id + role + affects", () => {
    const r = engine.matchParameter("cutting_force");
    const link = r.links[0];
    expect(link.formula_id).toBeTruthy();
    expect(["input", "output", "coefficient", "constraint"]).toContain(link.role);
    expect(Array.isArray(link.affects)).toBe(true);
  });

  it("matchParameter does not duplicate the same formula", () => {
    // "force" matches multiple regex patterns under kienzle — should dedupe to 1
    const r = engine.matchParameter("cutting_force_newtons");
    const kienzleCount = r.matched_formulas.filter((f) => f === "kienzle_cutting_force").length;
    expect(kienzleCount).toBe(1);
  });

  it("empty parameter name returns no matches", () => {
    const r = engine.matchParameter("");
    expect(r.matched_formulas).toHaveLength(0);
  });
});

describe("CAMCatalogPhysicsLinkerEngine — linkAll end-to-end", () => {
  it("walks a temp catalog tree and emits a valid index", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-enrich-"));
    try {
      const fnsDir = path.join(tmpRoot, "cam-functions", "mastercam");
      fs.mkdirSync(fnsDir, { recursive: true });
      fs.writeFileSync(
        path.join(fnsDir, "test.json"),
        JSON.stringify({
          parameters: [
            { name: "spindle_speed", type: "number", unit: "rpm" },
            { name: "feed_rate", type: "number", unit: "mm_min" },
            { name: "random_unrelated_name", type: "string" },
          ],
        })
      );
      const outPath = path.join(tmpRoot, "PHYSICS_LINKS.json");
      const idx = engine.linkAll(tmpRoot, outPath);
      expect(idx.schemaVersion).toBe(1);
      expect(idx.cams.mastercam).toBeDefined();
      expect(idx.cams.mastercam.matched_params).toBeGreaterThanOrEqual(2);
      expect(fs.existsSync(outPath)).toBe(true);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("global_summary sums matches across CAMs", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-enrich-"));
    try {
      const d1 = path.join(tmpRoot, "cam-functions", "mastercam");
      const d2 = path.join(tmpRoot, "cam-functions", "hypermill");
      fs.mkdirSync(d1, { recursive: true });
      fs.mkdirSync(d2, { recursive: true });
      fs.writeFileSync(path.join(d1, "a.json"), JSON.stringify([{ name: "Ra", type: "n" }]));
      fs.writeFileSync(path.join(d2, "b.json"), JSON.stringify([{ name: "Vc", type: "n" }]));
      const idx = engine.linkAll(tmpRoot, path.join(tmpRoot, "out.json"));
      expect(idx.global_summary.total_matches).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });

  it("handles missing CAM directories without throwing", () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cam-enrich-empty-"));
    try {
      const idx = engine.linkAll(tmpRoot, path.join(tmpRoot, "out.json"));
      expect(idx.schemaVersion).toBe(1);
      for (const cam of Object.values(idx.cams)) {
        expect(cam.matched_params).toBe(0);
      }
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

describe("CAMCatalogPhysicsLinkerEngine — singleton", () => {
  it("default singleton is importable", () => {
    expect(camCatalogPhysicsLinkerEngine).toBeInstanceOf(CAMCatalogPhysicsLinkerEngine);
  });
});
