/**
 * R9 tests for the JM Die mill miner's non-G-code skip accounting (U-SFC-MILL-PROVEN-PATH-FIX,
 * slot:oscar). Before this, mineJMDiePrograms read Mastercam .mcx-8 binaries as utf-8 garbage and
 * silently contributed 0 samples with no explanation -- an R12 silent-undercount. The miner now
 * skips non-G-code entries (Mastercam binaries + non-parseable controllers) BEFORE the file read and
 * accounts for them in skipped_programs / skipped_by_reason.
 *
 * Hermetic: the skip branch runs before any readFileSync, so skipped entries never touch the FS; the
 * G-code entries use fake paths whose ENOENT is caught by the engine's per-program try/catch.
 * See reference_oscar_mill_proven_path_broken_2026_06_21.
 */
import { describe, it, expect } from "vitest";
import { millPatternMinerEngine } from "../engines/MillPatternMinerEngine.js";

const entry = (
  filePath: string,
  controller: string,
  customer = "ACME",
  topFolder = "CNC MILL",
  programType = "mill",
) => ({ filePath, programType, controller, customer, topFolder });

describe("mineJMDiePrograms skips non-G-code entries + accounts for them (U-SFC-MILL-PROVEN-PATH-FIX)", () => {
  it("skips Mastercam .mcx-8 + .mcam binaries under a mastercam_binary reason; the haas_ngc entry is not skipped", () => {
    const r = millPatternMinerEngine.mineJMDiePrograms([
      entry("H:/jm/FONTANA/B-1289-11.mcx-8", "mastercam", "FONTANA"),
      entry("H:/jm/SFS/backstop.mcam", "mastercam", "SFS"),
      entry("H:/jm/HAAS/part.NC", "haas_ngc", "ITW"),
    ]);
    expect(r.total_programs).toBe(3);
    expect(r.skipped_programs).toBe(2);
    // exact: only the two Mastercam binaries are skipped -- the haas_ngc entry reached the parse path
    expect(r.skipped_by_reason).toEqual({ mastercam_binary: 2 });
  });

  it("skips unknown / non-parseable controllers under an unparsed_controller:<name> reason", () => {
    const r = millPatternMinerEngine.mineJMDiePrograms([
      entry("H:/jm/X/a.min", "okuma_osp", "ITW"),
      entry("H:/jm/Y/b.txt", "", "ALCOA"),
    ]);
    expect(r.skipped_programs).toBe(2);
    expect(r.skipped_by_reason).toEqual({
      "unparsed_controller:okuma_osp": 1,
      "unparsed_controller:unknown": 1,
    });
  });

  it("does NOT skip G-code controllers (haas_ngc/hurco_winmax/fanuc) -- they go to the parse path", () => {
    const r = millPatternMinerEngine.mineJMDiePrograms([
      entry("H:/jm/HAAS/a.NC", "haas_ngc"),
      entry("H:/jm/HURCO/b.hnc", "hurco_winmax"),
      entry("H:/jm/ROKU/c.nc", "fanuc"),
    ]);
    expect(r.total_programs).toBe(3);
    expect(r.skipped_programs).toBe(0);
    expect(r.skipped_by_reason).toEqual({});
  });

  it("censuses all mill entries (byCustomer) even when skipped, and ignores non-mill entries entirely", () => {
    const r = millPatternMinerEngine.mineJMDiePrograms([
      entry("H:/jm/FONTANA/a.mcx-8", "mastercam", "FONTANA"),
      entry("H:/jm/SFS/b.NC", "haas_ngc", "SFS"),
      entry("H:/jm/LATHE/c.min", "okuma_osp", "ITW", "X", "lathe"), // non-mill -> filtered before census
    ]);
    expect(r.total_programs).toBe(2); // only the 2 mill entries
    expect(r.byCustomer).toEqual({ FONTANA: 1, SFS: 1 }); // ITW (lathe) excluded
    expect(r.skipped_programs).toBe(1);
    expect(r.skipped_by_reason).toEqual({ mastercam_binary: 1 });
  });
});
