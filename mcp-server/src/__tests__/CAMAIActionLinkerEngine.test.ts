/**
 * CAMAIActionLinkerEngine tests — U-CAM-ENRICH-03
 * =================================================
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMAIActionLinkerEngine,
  camAIActionLinkerEngine,
} from "../engines/CAMAIActionLinkerEngine.js";

const engine = new CAMAIActionLinkerEngine();

describe("CAMAIActionLinkerEngine — actionsForFormulas", () => {
  it("maps kienzle_cutting_force → cam_ml_predict_baseline + cam_enrich_match_parameter + universal route", () => {
    const r = engine.actionsForFormulas(["kienzle_cutting_force"], "cutting_force");
    const actions = r.map((a) => a.action);
    expect(actions).toContain("cam_ml_predict_baseline");
    expect(actions).toContain("cam_enrich_match_parameter");
    expect(actions).toContain("cam_function_route");
  });

  it("maps feed_rate → baseline + lora regressors + universal route", () => {
    const r = engine.actionsForFormulas(["feed_rate"], "feed_rate");
    const actions = r.map((a) => a.action);
    expect(actions).toContain("cam_ml_predict_baseline");
    expect(actions).toContain("cam_ml_predict_lora");
    expect(actions).toContain("cam_function_route");
  });

  it("maps cutting_speed_vc → baseline + tool_select_for_cam", () => {
    const r = engine.actionsForFormulas(["cutting_speed_vc"], "Vc");
    const actions = r.map((a) => a.action);
    expect(actions).toContain("cam_ml_predict_baseline");
    expect(actions).toContain("cam_tool_select_for_cam");
  });

  it("surface_finish_ra includes the tribal-tip linker action", () => {
    const r = engine.actionsForFormulas(["surface_finish_ra"], "Ra");
    const actions = r.map((a) => a.action);
    expect(actions).toContain("cam_enrich_link_single_tip");
  });

  it("empty formula list produces zero actions (no universal injection)", () => {
    const r = engine.actionsForFormulas([], "random_param");
    expect(r).toHaveLength(0);
  });

  it("deduplicates actions when multiple formulas share the same action", () => {
    // feed_rate + spindle_rpm both map to cam_ml_predict_baseline
    const r = engine.actionsForFormulas(["feed_rate", "spindle_rpm"], "x");
    const baselineCount = r.filter((a) => a.action === "cam_ml_predict_baseline").length;
    expect(baselineCount).toBe(1);
  });

  it("substitutes $PARAM in parameter_mapping values", () => {
    const r = engine.actionsForFormulas(["kienzle_cutting_force"], "Fc");
    const baseline = r.find((a) => a.action === "cam_ml_predict_baseline");
    expect(baseline?.parameter_mapping?.["vector.features.cutting_force"]).toBe("Fc");
  });

  it("universal route action uses intent → param substitution", () => {
    const r = engine.actionsForFormulas(["feed_rate"], "feed_rate_mmpm");
    const route = r.find((a) => a.action === "cam_function_route");
    expect(route?.parameter_mapping?.intent).toBe("feed_rate_mmpm");
  });

  it("every emitted action names the prism_cam dispatcher", () => {
    const r = engine.actionsForFormulas(["taylor_tool_life", "tool_deflection"], "x");
    for (const a of r) expect(a.dispatcher).toBe("prism_cam");
  });

  it("unknown formula_id is silently skipped (no throw, no action)", () => {
    const r = engine.actionsForFormulas(["not_a_real_formula"], "x");
    // No formulas matched → no universal action either
    expect(r).toHaveLength(0);
  });

  it("preserves pre_conditions on copied actions (does not mutate templates)", () => {
    const r = engine.actionsForFormulas(["taylor_tool_life"], "T");
    const lora = r.find((a) => a.action === "cam_ml_predict_lora");
    expect(lora?.pre_conditions).toEqual(["lora adapter exists for target cam"]);
    // Second call should also see pre_conditions — proves no mutation
    const r2 = engine.actionsForFormulas(["taylor_tool_life"], "T");
    const lora2 = r2.find((a) => a.action === "cam_ml_predict_lora");
    expect(lora2?.pre_conditions).toEqual(["lora adapter exists for target cam"]);
  });
});

describe("CAMAIActionLinkerEngine — linkAll end-to-end", () => {
  it("reads a physics-links index and emits an AI-actions index", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-actions-"));
    try {
      const physIdxPath = path.join(tmp, "phys.json");
      fs.writeFileSync(physIdxPath, JSON.stringify({
        schemaVersion: 1,
        generated_at: new Date().toISOString(),
        cams: {
          mastercam: {
            source_files: [], total_params_scanned: 10, matched_params: 2, coverage_pct: 20,
            matches: [
              { cam_slug: "mastercam", source_file: "a.json", param_path: "params/0",
                param_name: "feed_rate", physics_links: [],
                matched_formulas: ["feed_rate", "spindle_rpm"] },
              { cam_slug: "mastercam", source_file: "a.json", param_path: "params/1",
                param_name: "Ra", physics_links: [],
                matched_formulas: ["surface_finish_ra"] },
            ],
          },
        },
        global_summary: { total_cams: 1, total_matches: 2, formula_usage: {} },
      }));
      const outPath = path.join(tmp, "ai.json");
      const idx = engine.linkAll(physIdxPath, outPath);
      expect(idx.total_params).toBe(2);
      expect(idx.total_actions).toBeGreaterThan(0);
      expect(idx.by_cam_param.mastercam).toHaveLength(2);
      expect(fs.existsSync(outPath)).toBe(true);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("returns empty index when physics file is missing", () => {
    const idx = engine.linkAll("/nonexistent/phys.json", "/tmp/out.json");
    expect(idx.total_params).toBe(0);
    expect(Object.keys(idx.by_cam_param)).toHaveLength(0);
  });

  it("summary tallies match by_cam_param counts", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-actions-"));
    try {
      const physIdxPath = path.join(tmp, "phys.json");
      fs.writeFileSync(physIdxPath, JSON.stringify({
        schemaVersion: 1,
        generated_at: new Date().toISOString(),
        cams: {
          mastercam: {
            source_files: [], total_params_scanned: 5, matched_params: 1, coverage_pct: 20,
            matches: [{ cam_slug: "mastercam", source_file: "x.json", param_path: "p",
              param_name: "fr", physics_links: [], matched_formulas: ["feed_rate"] }],
          },
          hypermill: {
            source_files: [], total_params_scanned: 5, matched_params: 1, coverage_pct: 20,
            matches: [{ cam_slug: "hypermill", source_file: "y.json", param_path: "p",
              param_name: "vc", physics_links: [], matched_formulas: ["cutting_speed_vc"] }],
          },
        },
        global_summary: { total_cams: 2, total_matches: 2, formula_usage: {} },
      }));
      const idx = engine.linkAll(physIdxPath, path.join(tmp, "ai.json"));
      expect(idx.summary.per_cam_count.mastercam).toBe(1);
      expect(idx.summary.per_cam_count.hypermill).toBe(1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("CAMAIActionLinkerEngine — singleton", () => {
  it("default singleton is importable", () => {
    expect(camAIActionLinkerEngine).toBeInstanceOf(CAMAIActionLinkerEngine);
  });
});
