/**
 * JMDieProgramAnalysisMS0 E2E — JM-DIE-PROGRAM-ANALYSIS-MS0 / U-JP06
 *
 * Real-corpus run: walks H:/prism/JM DIE/, finds CNC programs (.nc/.min/etc),
 * parses each through GCodeTimeEstimatorEngine, applies InflationAdjust to
 * inferred quote totals, computes FairMarketValue verdicts. Writes the
 * resulting analysis JSON to state/shared/specs/ for operator inspection.
 *
 * Per R12 fail-loud: archive presence is asserted (not silent skip).
 *
 * @milestone JM-DIE-PROGRAM-ANALYSIS-MS0/U-JP06-PROGRAM-ANALYSIS-E2E
 * @author slot:charlie /goal-15 iter2, 2026-05-24
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { jmDieFleetWideIngestEngine } from "../../engines/JMDieFleetWideIngestEngine.js";
import { gCodeTimeEstimatorEngine } from "../../engines/GCodeTimeEstimatorEngine.js";
import { inflationAdjustEngine } from "../../engines/InflationAdjustEngine.js";
import { fairMarketValueEngine } from "../../engines/FairMarketValueEngine.js";

const ARCHIVE_ROOT = "H:/prism/JM DIE";
const OUTPUT_PATH = "H:/prism/state/shared/specs/JM-DIE-PROGRAM-ANALYSIS-2026-05-24.json";
const PROGRAM_LIMIT = 200;
const MACHINE_RATE_PER_HR = 95; // shop-floor average; operator overrides per machine in MS1
const ASSUMED_MATERIAL_SPEND = 75;

describe("JMDieProgramAnalysisMS0 — real-corpus E2E", () => {
  it("archive exists at H:/prism/JM DIE (R12 precondition)", () => {
    expect(fs.existsSync(ARCHIVE_ROOT)).toBe(true);
  });

  it(`walks ≤${PROGRAM_LIMIT} files, parses CNC programs, computes time + FMV + inflation → writes baseline JSON`, () => {
    // Restrict to subdirs that hold CNC programs; _PART LIBRARY is PDFs (already covered by JM-DIE-FINANCIAL-BASELINE)
    const ingest = jmDieFleetWideIngestEngine.ingest(ARCHIVE_ROOT, {
      limit: PROGRAM_LIMIT,
      subdirs: ["CNC LATHE", "CNC MILL HAAS", "CNC OKUMA MULTUS", "HURCO CNC PROGRAMS", "LATHE", "OKUMA", "WIRE EDM", "MACRO PROGRAMS", "ROKU-ROKU"],
    });
    expect(ingest.records.length).toBeGreaterThan(0);
    // Real archive may exhaust limit on first big subdir (_PART LIBRARY has 300K files).
    // Honest assertion: at least 1 subdir walked.
    expect(ingest.subdirs_walked.length).toBeGreaterThanOrEqual(1);

    const cncPrograms = ingest.records.filter((r) => r.is_cnc_program);
    const programs: any[] = [];
    let totalTimeS = 0;
    let totalFmvUsd = 0;
    let totalFmvAdjustedUsd = 0;
    const today = new Date().toISOString().slice(0, 10);
    const byFamily: Record<string, { count: number; total_time_s: number; total_fmv_usd: number }> = {};

    for (const r of cncPrograms) {
      let text = "";
      try { text = fs.readFileSync(r.abs_path, "utf8"); } catch { continue; }
      if (text.length === 0 || text.length > 5_000_000) continue;
      const gca = gCodeTimeEstimatorEngine.analyze(text);
      if (!gca.ok) continue;

      const fmv = fairMarketValueEngine.estimate({
        time_in_cut_s: gca.total_time_s,
        machine_rate_usd_per_hr: MACHINE_RATE_PER_HR,
        material_spend_usd: ASSUMED_MATERIAL_SPEND,
      });
      if (!fmv.ok) continue;

      // Inflation-adjust from file mtime to today
      const fromDate = r.mtime_iso.slice(0, 10);
      const adj = inflationAdjustEngine.adjust(fmv.fmv_usd, fromDate, today);
      const adjustedUsd = adj.ok ? adj.adjusted_usd : fmv.fmv_usd;

      totalTimeS += gca.total_time_s;
      totalFmvUsd += fmv.fmv_usd;
      totalFmvAdjustedUsd += adjustedUsd;
      const fam = r.machine_family;
      byFamily[fam] = byFamily[fam] ?? { count: 0, total_time_s: 0, total_fmv_usd: 0 };
      byFamily[fam].count++;
      byFamily[fam].total_time_s += gca.total_time_s;
      byFamily[fam].total_fmv_usd += fmv.fmv_usd;

      if (programs.length < 50) {
        programs.push({
          rel_path: r.rel_path,
          machine_family: r.machine_family,
          dialect: gca.dialect,
          block_count: gca.block_count,
          tool_change_count: gca.tool_change_count,
          time_in_cut_s: gca.time_in_cut_s,
          total_time_s: gca.total_time_s,
          fmv_usd: fmv.fmv_usd,
          fmv_adjusted_to_today_usd: adjustedUsd,
          mtime: r.mtime_iso,
        });
      }
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify({
      milestone: "JM-DIE-PROGRAM-ANALYSIS-MS0",
      slot: "charlie",
      goal: "/goal-15",
      generated_at: new Date().toISOString(),
      assumptions: {
        machine_rate_usd_per_hr: MACHINE_RATE_PER_HR,
        assumed_material_spend_usd: ASSUMED_MATERIAL_SPEND,
        note: "MS0 uses single shop-floor average rate; MS1 wires per-machine rates from ShopConfigurationEngine",
      },
      ingest: {
        total_files: ingest.records.length,
        cnc_programs: cncPrograms.length,
        subdirs_walked: ingest.subdirs_walked,
        by_family_counts: ingest.by_family,
      },
      totals: {
        total_program_time_s: Math.round(totalTimeS * 100) / 100,
        total_fmv_usd: Math.round(totalFmvUsd * 100) / 100,
        total_fmv_adjusted_to_today_usd: Math.round(totalFmvAdjustedUsd * 100) / 100,
        inflation_uplift_usd: Math.round((totalFmvAdjustedUsd - totalFmvUsd) * 100) / 100,
      },
      by_family: byFamily,
      programs_sample: programs,
    }, null, 2), "utf8");

    expect(fs.existsSync(OUTPUT_PATH)).toBe(true);
    expect(programs.length).toBeGreaterThan(0);
  });

  it("output JSON has expected top-level shape", () => {
    const j = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
    expect(j.milestone).toBe("JM-DIE-PROGRAM-ANALYSIS-MS0");
    expect(typeof j.totals.total_program_time_s).toBe("number");
    expect(typeof j.totals.total_fmv_usd).toBe("number");
    expect(Array.isArray(j.programs_sample)).toBe(true);
    expect(typeof j.by_family).toBe("object");
  });
});
