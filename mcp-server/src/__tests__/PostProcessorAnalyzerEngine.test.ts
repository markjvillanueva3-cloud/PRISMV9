/**
 * PostProcessorAnalyzerEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Parses Fusion 360 `.cps` post-processor files: extracts controller/vendor/model,
 * certification level, version, supported canned cycles (onCycle* handlers + CYCLE_
 * case labels), motion handlers, custom properties, and capability flags
 * (milling/turning/multi-axis/probing).
 *
 * The engine's public contract is fs-backed (analyzeFile reads + stats a path,
 * analyzeDirectory walks a tree), so these tests write real temp `.cps` fixtures and
 * assert HAND-TRACED extraction values (R9) -- each fails if a regex, capability
 * heuristic, friendly-name conversion, or the directory aggregation changes.
 * 3 spanning controllers (Haas mill / Okuma lathe / Siemens 5-axis) cover the
 * variability floor; minimal/non-existent cover edge + failure paths.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  postProcessorAnalyzerEngine,
  PostProcessorAnalyzerEngine,
} from "../engines/PostProcessorAnalyzerEngine.js";

// ── Fixture .cps contents (every asserted value is hand-traced from these) ──
const HAAS_MILL = `description = "HAAS Next Generation Control";
vendor = "Haas Automation";
model = "VF-2";
certificationLevel = 2;
extension = "nc";
postVersion: "1.5"
function onRapid(x, y, z) {}
function onLinear(x, y, z, feed) {}
function onCircular(cw, cx, cy, cz, x, y, z, feed) {}
function onCycleDrilling() {}
function onCyclePeck() {}
properties.writeMachine = { type: "boolean", value: true, description: "Write machine info" };
`;

const OKUMA_LATHE = `description = "OKUMA OSP-P300 Lathe";
vendor = "Okuma";
extension = "min";
function onCycleTurning() {}
G96 S200 M3
`;

const SIEMENS_5AX = `description = "SINUMERIK 840D sl 5-Axis Mill";
vendor = "Siemens";
function onLinear(x, y, z, feed) {}
function onLinear5D(x, y, z, dx, dy, dz, feed) {}
G43.4
`;

const PROBING = `description = "FANUC Probing Post";
vendor = "Fanuc";
function onProbing() {}
G65 P9810
`;

const MINIMAL = `// empty post stub
`;

// cycles declared ONLY as CYCLE_ case labels (no onCycle* functions) -- isolates the 2nd cycle branch
const CASE_CYCLES = `description = "Siemens Cycle Post";
vendor = "Siemens";
switch (cycleType) {
  case "CYCLE_DRILLING": drill(); break;
  case "CYCLE_POCKET_MILLING": pocket(); break;
}
`;

let dir3 = ""; // holds exactly the 3 spanning posts + a non-.cps file (aggregation test)
let misc = ""; // holds the probing + minimal posts (probing-aggregation + unknown-controller fallback)
let p = {
  haas: "", okuma: "", siemens: "", probing: "", minimal: "", caseCycles: "",
};

beforeAll(() => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "echo-cps-"));
  // record the root for cleanup BEFORE any mkdir/write can throw (else a mid-setup throw leaks the dir)
  (globalThis as Record<string, unknown>).__echoCpsRoot = root;
  dir3 = path.join(root, "posts3");
  fs.mkdirSync(dir3);
  p.haas = path.join(dir3, "haas-mill.cps");
  p.okuma = path.join(dir3, "okuma-lathe.cps");
  p.siemens = path.join(dir3, "siemens-5ax.cps");
  fs.writeFileSync(p.haas, HAAS_MILL, "utf8");
  fs.writeFileSync(p.okuma, OKUMA_LATHE, "utf8");
  fs.writeFileSync(p.siemens, SIEMENS_5AX, "utf8");
  fs.writeFileSync(path.join(dir3, "notes.txt"), "not a post", "utf8"); // must be ignored

  misc = path.join(root, "misc");
  fs.mkdirSync(misc);
  p.probing = path.join(misc, "probing.cps");
  p.minimal = path.join(misc, "minimal.cps");
  fs.writeFileSync(p.probing, PROBING, "utf8");
  fs.writeFileSync(p.minimal, MINIMAL, "utf8");

  // standalone fixture written at the temp ROOT (not inside dir3/misc) so it never perturbs an aggregation count
  p.caseCycles = path.join(root, "case-cycles.cps");
  fs.writeFileSync(p.caseCycles, CASE_CYCLES, "utf8");
});

afterAll(() => {
  const root = (globalThis as Record<string, unknown>).__echoCpsRoot as string;
  if (root) fs.rmSync(root, { recursive: true, force: true });
});

describe("PostProcessorAnalyzerEngine", () => {
  describe("analyzeFile() -- Haas mill: full header + cycles + handlers + custom props", () => {
    it("extracts every header field, inferred controller, and file metadata", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.haas)!;
      expect(info.filename).toBe("haas-mill.cps");
      expect(info.description).toBe("HAAS Next Generation Control");
      expect(info.vendor).toBe("Haas Automation");
      expect(info.model).toBe("VF-2");
      expect(info.certification_level).toBe(2);
      expect(info.file_extension).toBe("nc");
      expect(info.version).toBe("1.5"); // postVersion: "1.5"
      expect(info.controller).toBe("haas"); // inferred from description/vendor
      expect(info.line_count).toBe(HAAS_MILL.split(/\r?\n/).length);
      expect(info.size_bytes).toBe(Buffer.byteLength(HAAS_MILL, "utf8"));
    });

    it("extracts onCycle* handlers as friendly cycle names + motion handlers in order", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.haas)!;
      expect(info.supported_cycles).toEqual(["drilling", "peck"]); // onCycleDrilling/onCyclePeck
      expect(info.motion_handlers).toEqual(["onRapid", "onLinear", "onCircular"]);
    });

    it("extracts cycles from CYCLE_ case labels too (the 2nd cycle-extraction branch)", () => {
      // no onCycle* functions -> all cycles come from `case "CYCLE_*"` labels, _-split + lowercased
      const info = postProcessorAnalyzerEngine.analyzeFile(p.caseCycles)!;
      expect(info.supported_cycles).toEqual(["drilling", "pocket milling"]);
    });

    it("extracts custom properties (name/type/default/description)", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.haas)!;
      expect(info.custom_properties).toEqual([
        { name: "writeMachine", type: "boolean", default_value: "true", description: "Write machine info" },
      ]);
    });

    it("flags milling-only capability for the Haas mill post", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.haas)!;
      expect(info.has_milling).toBe(true); // onLinear/onCircular present
      expect(info.has_turning).toBe(false);
      expect(info.has_multi_axis).toBe(false);
      expect(info.has_probing).toBe(false);
    });
  });

  describe("controller + capability variability (>=3 spanning posts)", () => {
    it("Okuma lathe -> controller okuma, turning capability (G96/onCycleTurning)", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.okuma)!;
      expect(info.controller).toBe("okuma"); // OKUMA/OSP keyword
      expect(info.has_turning).toBe(true);
      expect(info.has_milling).toBe(false);
      expect(info.supported_cycles).toEqual(["turning"]);
      expect(info.file_extension).toBe("min");
    });

    it("Siemens 5-axis -> controller siemens, multi-axis (onLinear5D/G43.4) + milling", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.siemens)!;
      expect(info.controller).toBe("siemens"); // SINUMERIK keyword
      expect(info.has_multi_axis).toBe(true);
      expect(info.has_milling).toBe(true); // 5-axis is milling (onLinear substring of onLinear5D)
      expect(info.motion_handlers).toEqual(["onLinear", "onLinear5D"]);
    });

    it("Fanuc probing post -> controller fanuc, probing capability (onProbing/G65)", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.probing)!;
      expect(info.controller).toBe("fanuc");
      expect(info.has_probing).toBe(true);
    });
  });

  describe("edge + failure paths", () => {
    it("a minimal/empty post returns all-null header, empty arrays, no capabilities", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(p.minimal)!;
      expect(info.description).toBeNull();
      expect(info.vendor).toBeNull();
      expect(info.controller).toBeNull();
      expect(info.version).toBeNull();
      expect(info.supported_cycles).toEqual([]);
      expect(info.motion_handlers).toEqual([]);
      expect(info.custom_properties).toEqual([]);
      expect(info.has_milling).toBe(false);
      expect(info.has_turning).toBe(false);
      expect(info.has_multi_axis).toBe(false);
      expect(info.has_probing).toBe(false);
      expect(info.line_count).toBe(2); // "// empty post stub" + trailing ""
    });

    it("returns null for an unreadable / non-existent file (no throw)", () => {
      const info = postProcessorAnalyzerEngine.analyzeFile(path.join(dir3, "does-not-exist.cps"));
      expect(info).toBeNull();
    });
  });

  describe("analyzeDirectory() -- walk + aggregate", () => {
    it("counts only .cps files and aggregates by controller + capability", () => {
      const summary = postProcessorAnalyzerEngine.analyzeDirectory(dir3);
      expect(summary.total_posts).toBe(3); // notes.txt ignored
      expect(summary.by_controller).toEqual({ haas: 1, okuma: 1, siemens: 1 });
      expect(summary.by_capability).toEqual({ milling: 2, turning: 1, multi_axis: 1, probing: 0 });
      expect(summary.posts).toHaveLength(3);
    });

    it("returns a zeroed summary for a non-existent directory (no throw)", () => {
      const summary = postProcessorAnalyzerEngine.analyzeDirectory(path.join(dir3, "nope", "missing"));
      expect(summary.total_posts).toBe(0);
      expect(summary.posts).toEqual([]);
      expect(summary.by_controller).toEqual({});
      expect(summary.scan_duration_ms).toBe(0);
    });

    it("aggregates a probing post + counts a header-less post under 'unknown' controller", () => {
      // misc/ holds probing.cps (fanuc, probing) + minimal.cps (no controller AND no vendor -> 'unknown')
      const summary = postProcessorAnalyzerEngine.analyzeDirectory(misc);
      expect(summary.total_posts).toBe(2);
      expect(summary.by_controller).toEqual({ fanuc: 1, unknown: 1 }); // null controller ?? null vendor ?? 'unknown'
      expect(summary.by_capability).toEqual({ milling: 0, turning: 0, multi_axis: 0, probing: 1 });
    });
  });

  describe("class + singleton parity", () => {
    it("a fresh instance analyzes a post identically to the exported singleton", () => {
      const fresh = new PostProcessorAnalyzerEngine();
      expect(fresh.analyzeFile(p.haas)).toEqual(postProcessorAnalyzerEngine.analyzeFile(p.haas));
    });
  });
});
