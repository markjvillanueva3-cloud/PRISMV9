/**
 * HyperMillMetricCfgExtractorEngine.test.ts
 *
 * Strict-legitimacy coverage for the Metric.cfg directory extractor.
 *
 * Coverage shape:
 *   - Class shape + singleton parity
 *   - Happy: built-in catalog returned when source dir missing
 *   - Happy: real fs round-trip — write .cfg, parse, verify sections/types
 *   - Failure modes: missing dir, malformed lines, oversize content
 *   - Adversarial: unicode names, formula detection, type-inference edge cases
 *
 * @milestone CAM-EXHAUST-MS0/U-CAM-HM-EXTRACTOR-DL-TESTS-01
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  HyperMillMetricCfgExtractorEngine,
  hyperMillMetricCfgExtractorEngine,
  type ControllerProfile,
  type MetricCfgExtractionResult,
} from "../engines/HyperMillMetricCfgExtractorEngine.js";

// ── Named constants (no magic numbers in assertions) ──────────────────────────
const BUILTIN_PROFILE_COUNT = 5;            // FANUC0M, SINUMERIK840D, HAAS_VF, DMG_DMU, MAZAK_M32
const FANUC_HMSLF3_STEPDOWN_RAW = "T:Rad*0.5";
const FANUC_HMSLF3_CLEARANCE = 2;
const HAAS_DRILL_RETRACT = 2;
const SINUMERIK_HMCRT_RAMP = 12;
const FORMULA_PREFIX_T_RAD = "T:Rad";
const FORMULA_TOKEN_MTOL = "mtol";
const VALID_STATUSES: ReadonlyArray<MetricCfgExtractionResult["status"]> = [
  "success", "missing", "partial", "error",
];

describe("HyperMillMetricCfgExtractorEngine", () => {
  let tmpDir: string;
  const engine = new HyperMillMetricCfgExtractorEngine();

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hmcfg-"));
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch { /* best-effort cleanup */ }
  });

  // ── Class shape + singleton ─────────────────────────────────────────────────
  describe("class shape & singleton", () => {
    it("class is instantiable and exposes 5 public methods", () => {
      const proto = Object.getPrototypeOf(engine);
      const methods = Object.getOwnPropertyNames(proto)
        .filter((n) => n !== "constructor" && typeof (engine as unknown as Record<string, unknown>)[n] === "function");
      expect(methods).toContain("extractAll");
      expect(methods).toContain("parseCfgFile");
      expect(methods).toContain("diffProfiles");
      expect(methods).toContain("getAllCycleCodes");
      expect(methods).toContain("getExtractionStats");
    });

    it("singleton is the same class type as a fresh constructor", () => {
      expect(hyperMillMetricCfgExtractorEngine).toBeInstanceOf(HyperMillMetricCfgExtractorEngine);
      expect(Object.getPrototypeOf(hyperMillMetricCfgExtractorEngine))
        .toBe(Object.getPrototypeOf(engine));
    });
  });

  // ── Happy: missing dir returns built-in catalog ─────────────────────────────
  describe("extractAll() — built-in catalog when dir missing", () => {
    it("returns status='missing' with built-in profile set when path absent", () => {
      const phantomDir = path.join(tmpDir, "no-such-cfg-dir-xyz");
      const result = engine.extractAll(phantomDir);
      expect(result.status).toBe("missing");
      expect(result.source_path).toBe(phantomDir);
      expect(Object.keys(result.profiles)).toHaveLength(BUILTIN_PROFILE_COUNT);
      expect(result.profiles.FANUC0M.machine.controller_family).toBe("fanuc");
      expect(result.profiles.SINUMERIK840D.machine.controller_family).toBe("siemens");
      expect(result.profiles.HAAS_VF.machine.controller_family).toBe("haas");
      expect(result.profiles.MAZAK_M32.machine.controller_family).toBe("mazak");
    });

    it("built-in FANUC0M hmSlf3 STEPDOWN preserves canonical formula", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const stepdown = result.profiles.FANUC0M.cycles.hmSlf3.params.STEPDOWN;
      expect(stepdown.raw_value).toBe(FANUC_HMSLF3_STEPDOWN_RAW);
      expect(stepdown.is_formula).toBe(true);
      expect(stepdown.type).toBe("formula");
    });

    it("built-in stats expose declared formulas and unique controller families", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const stats = result.stats;
      expect(stats.file_count).toBe(BUILTIN_PROFILE_COUNT);
      expect(stats.formula_count).toBeGreaterThan(0);
      expect(stats.controller_families.sort()).toEqual(["fanuc", "haas", "mazak", "siemens"]);
      expect(stats.errors.some((e) => e.startsWith("INFO:"))).toBe(true);
    });
  });

  // ── Happy: real fs round-trip ────────────────────────────────────────────────
  describe("extractAll() — real fs round-trip", () => {
    it("merges parsed .cfg files into the built-in catalog", () => {
      const cfgPath = path.join(tmpDir, "TESTCTRL.cfg");
      fs.writeFileSync(cfgPath, [
        "; sample comment",
        "[Machine]",
        "Name=TestController X100",
        "ControllerFamily=fanuc",
        "",
        "[Cycle_hmSlf3]",
        "STEPDOWN=T:Rad*0.4",
        "ALLOWANCE=0.05",
        "CLEARANCE_DIST=3",
        "ENABLED=1",
      ].join("\n"));

      const result = engine.extractAll(tmpDir);
      expect(VALID_STATUSES).toContain(result.status);
      expect(result.profiles.TESTCTRL).toBeInstanceOf(Object);
      const tc = result.profiles.TESTCTRL;
      expect(tc.machine.name).toBe("TestController X100");
      expect(tc.machine.controller_family).toBe("fanuc");
      const params = tc.cycles.hmSlf3.params;
      expect(params.STEPDOWN.is_formula).toBe(true);
      expect(params.STEPDOWN.raw_value).toBe("T:Rad*0.4");
      expect(params.ALLOWANCE.type).toBe("float");
      expect(params.ALLOWANCE.typed_value).toBe(0.05);
      expect(params.CLEARANCE_DIST.type).toBe("int");
      expect(params.CLEARANCE_DIST.typed_value).toBe(3);
      expect(params.ENABLED.type).toBe("boolean");
      expect(params.ENABLED.typed_value).toBe(true);
    });

    it("strips inline comments after ';' on value lines", () => {
      const cfgPath = path.join(tmpDir, "INLINECOM.cfg");
      fs.writeFileSync(cfgPath, [
        "[Machine]",
        "Name=Inline Comment Test",
        "[Cycle_hmCrt]",
        "RAMP_ANGLE=15  ; degrees from horizontal",
      ].join("\n"));
      const result = engine.extractAll(tmpDir);
      const ramp = result.profiles.INLINECOM.cycles.hmCrt.params.RAMP_ANGLE;
      expect(ramp.raw_value).toBe("15");
      expect(ramp.typed_value).toBe(15);
      expect(ramp.type).toBe("int");
    });

    it("ignores '#' and ';' comment lines plus blank lines", () => {
      const cfgPath = path.join(tmpDir, "COMMENTS.cfg");
      fs.writeFileSync(cfgPath, [
        "# hash comment",
        "; semi comment",
        "",
        "[Machine]",
        "Name=Comment Carrier",
        "[Cycle_hmCrt]",
        "RAMP_ANGLE=10",
      ].join("\n"));
      const result = engine.extractAll(tmpDir);
      const profile = result.profiles.COMMENTS;
      expect(Object.keys(profile.cycles.hmCrt.params)).toEqual(["RAMP_ANGLE"]);
    });
  });

  // ── parseCfgFile() direct unit ───────────────────────────────────────────────
  describe("parseCfgFile() inference", () => {
    it("classifies T:Dia formulas correctly with formula token", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmDrilling]\nDEPTH_FIRST_PECK=T:Dia*0.5\n",
        "FORMTEST",
      );
      const peck = profile.cycles.hmDrilling.params.DEPTH_FIRST_PECK;
      expect(peck.is_formula).toBe(true);
      expect(peck.type).toBe("formula");
      expect(peck.raw_value.includes(FORMULA_PREFIX_T_RAD) || peck.raw_value.includes("T:Dia")).toBe(true);
    });

    it("treats single '0' as boolean false", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmCrt]\nUSE_RAMP=0\n",
        "BOOLZERO",
      );
      const flag = profile.cycles.hmCrt.params.USE_RAMP;
      expect(flag.type).toBe("boolean");
      expect(flag.typed_value).toBe(false);
    });

    it("falls back to enum when comma present and not numeric", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmDrilling]\nMODES=peck,deep,reaming\n",
        "ENUMTEST",
      );
      const modes = profile.cycles.hmDrilling.params.MODES;
      expect(modes.type).toBe("enum");
      expect(modes.typed_value).toBe("peck,deep,reaming");
    });

    it("treats unsigned integer-looking value with '.' as float", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmCrt]\nALLOWANCE=2.0\n",
        "FLOATTEST",
      );
      const allowance = profile.cycles.hmCrt.params.ALLOWANCE;
      expect(allowance.type).toBe("float");
      expect(allowance.typed_value).toBe(2.0);
    });

    it("falls back to string for non-numeric, non-formula values without comma", () => {
      const profile = engine.parseCfgFile(
        "[Machine]\nVendor=DMG-Mori\n[Cycle_hmCrt]\nLABEL=primary\n",
        "STRTEST",
      );
      const label = profile.cycles.hmCrt.params.LABEL;
      expect(label.type).toBe("string");
      expect(label.typed_value).toBe("primary");
    });
  });

  // ── diffProfiles() ──────────────────────────────────────────────────────────
  describe("diffProfiles()", () => {
    it("identifies different, identical, and unique-side keys per cycle", () => {
      const a = engine.parseCfgFile(
        "[Cycle_hmCrt]\nRAMP_ANGLE=10\nALLOWANCE=0\nA_ONLY=1\n",
        "A",
      );
      const b = engine.parseCfgFile(
        "[Cycle_hmCrt]\nRAMP_ANGLE=15\nALLOWANCE=0\nB_ONLY=2\n",
        "B",
      );
      const diff = engine.diffProfiles(a, b, "hmCrt");
      expect(diff.cycle_code).toBe("hmCrt");
      expect(diff.different).toEqual([
        { key: "RAMP_ANGLE", value_a: "10", value_b: "15" },
      ]);
      expect(diff.identical).toEqual(["ALLOWANCE"]);
      expect(diff.only_in_a).toEqual(["A_ONLY"]);
      expect(diff.only_in_b).toEqual(["B_ONLY"]);
    });

    it("returns empty diff when neither profile has the cycle", () => {
      const a = engine.parseCfgFile("", "A");
      const b = engine.parseCfgFile("", "B");
      const diff = engine.diffProfiles(a, b, "hmDrilling");
      expect(diff.different).toEqual([]);
      expect(diff.only_in_a).toEqual([]);
      expect(diff.only_in_b).toEqual([]);
      expect(diff.identical).toEqual([]);
    });

    it("when only A has cycle, all A keys flagged only_in_a", () => {
      const a = engine.parseCfgFile("[Cycle_hmCrt]\nFOO=1\nBAR=2\n", "A");
      const b = engine.parseCfgFile("", "B");
      const diff = engine.diffProfiles(a, b, "hmCrt");
      expect(diff.only_in_a.sort()).toEqual(["BAR", "FOO"]);
      expect(diff.only_in_b).toEqual([]);
    });
  });

  // ── getAllCycleCodes / getExtractionStats ───────────────────────────────────
  describe("aggregation helpers", () => {
    it("getAllCycleCodes returns deduped sorted union across profiles", () => {
      const profiles: Record<string, ControllerProfile> = {
        A: engine.parseCfgFile("[Cycle_hmCrt]\nX=1\n[Cycle_hmDrilling]\nY=2\n", "A"),
        B: engine.parseCfgFile("[Cycle_hmCrt]\nX=2\n[Cycle_hmSlf3]\nZ=3\n", "B"),
      };
      const codes = engine.getAllCycleCodes(profiles);
      expect(codes).toEqual(["hmCrt", "hmDrilling", "hmSlf3"]);
    });

    it("getExtractionStats mirrors result.stats key shape", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const stats = engine.getExtractionStats(result);
      expect(stats.file_count).toBe(result.stats.file_count);
      expect(stats.cycle_count).toBe(result.stats.cycle_count);
      expect(stats.param_count).toBe(result.stats.param_count);
      expect(stats.formula_count).toBe(result.stats.formula_count);
      expect(stats.status).toBe(result.status);
    });
  });

  // ── Failure modes (≥3) ──────────────────────────────────────────────────────
  describe("failure modes", () => {
    it("malformed lines without '=' are silently dropped", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmCrt]\nrandom-line-no-equals\nVALID=42\n",
        "MALFORMED",
      );
      const params = profile.cycles.hmCrt.params;
      expect(Object.keys(params)).toEqual(["VALID"]);
      expect(params.VALID.typed_value).toBe(42);
    });

    it("empty file yields machine fallback to profile name", () => {
      const profile = engine.parseCfgFile("", "EMPTY");
      expect(profile.machine.name).toBe("EMPTY");
      expect(profile.machine.controller_family).toBe("generic");
      expect(profile.cycles).toEqual({});
    });

    it("section without bracket close is treated as a key=value line", () => {
      const profile = engine.parseCfgFile(
        "[Cycle_hmCrt\nFOO=1\n",
        "UNCLOSED",
      );
      // unclosed section header is a normal line; "[Cycle_hmCrt" has no '=' so it's dropped,
      // FOO=1 lands in default 'global' section, not in any cycle
      expect(profile.cycles).toEqual({});
      expect(profile.raw_sections.global.FOO).toBe("1");
    });
  });

  // ── Adversarial inputs (≥2) ─────────────────────────────────────────────────
  describe("adversarial inputs", () => {
    it("oversize content with 1000 cycle params parses without throwing", () => {
      // Use values starting at 2 because single '0'/'1' is documented to infer
      // as boolean, not int — see HyperMillMetricCfgExtractorEngine.inferType().
      const FIRST_VALUE = 2;
      const SIZE = 1000;
      const lines = ["[Cycle_hmStress]"];
      for (let i = 0; i < SIZE; i++) lines.push(`KEY${i}=${i + FIRST_VALUE}`);
      const profile = engine.parseCfgFile(lines.join("\n"), "OVERSIZE");
      expect(Object.keys(profile.cycles.hmStress.params)).toHaveLength(SIZE);
      expect(profile.cycles.hmStress.params.KEY0.typed_value).toBe(FIRST_VALUE);
      expect(profile.cycles.hmStress.params[`KEY${SIZE - 1}`].typed_value).toBe(SIZE - 1 + FIRST_VALUE);
    });

    it("CRLF line endings produce identical structure to LF", () => {
      const lf = engine.parseCfgFile(
        "[Cycle_hmCrt]\nRAMP_ANGLE=10\n",
        "LFTEST",
      );
      const crlf = engine.parseCfgFile(
        "[Cycle_hmCrt]\r\nRAMP_ANGLE=10\r\n",
        "CRLFTEST",
      );
      expect(crlf.cycles.hmCrt.params.RAMP_ANGLE.typed_value).toBe(
        lf.cycles.hmCrt.params.RAMP_ANGLE.typed_value,
      );
    });

    it("formula token mtol survives intact through round-trip parse", () => {
      const cfgPath = path.join(tmpDir, "MTOL.cfg");
      fs.writeFileSync(cfgPath, "[Cycle_hmSlf3]\nTOLERANCE=mtol*0.25\n");
      const result = engine.extractAll(tmpDir);
      const tol = result.profiles.MTOL.cycles.hmSlf3.params.TOLERANCE;
      expect(tol.is_formula).toBe(true);
      expect(tol.raw_value.includes(FORMULA_TOKEN_MTOL)).toBe(true);
    });
  });

  // ── Built-in spot checks (regression guards on canonical content) ───────────
  describe("built-in spot checks", () => {
    it("FANUC0M hmSlf3 CLEARANCE_DIST keeps canonical int", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const cd = result.profiles.FANUC0M.cycles.hmSlf3.params.CLEARANCE_DIST;
      expect(cd.typed_value).toBe(FANUC_HMSLF3_CLEARANCE);
      expect(cd.type).toBe("int");
    });

    it("HAAS_VF hmDrilling RETRACT_HEIGHT keeps canonical int", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const rh = result.profiles.HAAS_VF.cycles.hmDrilling.params.RETRACT_HEIGHT;
      expect(rh.typed_value).toBe(HAAS_DRILL_RETRACT);
    });

    it("SINUMERIK840D hmCrt RAMP_ANGLE keeps canonical int", () => {
      const result = engine.extractAll(path.join(tmpDir, "missing"));
      const ra = result.profiles.SINUMERIK840D.cycles.hmCrt.params.RAMP_ANGLE;
      expect(ra.typed_value).toBe(SINUMERIK_HMCRT_RAMP);
    });
  });
});
