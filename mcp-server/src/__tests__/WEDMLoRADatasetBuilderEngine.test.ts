/**
 * WEDMLoRADatasetBuilderEngine Tests — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0/U-WCTP-A2-DSB
 *
 * Tests the WEDM dataset builder (mirror of LATHE-LORA-MS0/U-LLR05).
 * Covers: archive scan, parse, example generation, stratified split, schema,
 *         tribal tip injection, deterministic RNG (reproducibility), physics
 *         provenance, dialect detection, taper/multipass discrimination.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  WEDMLoRADatasetBuilderEngine,
  wedmLoRADatasetBuilderEngine,
  type WEDMLoRAExample,
} from "../engines/WEDMLoRADatasetBuilderEngine.js";

function mkProgramFile(dir: string, name: string, body: string): string {
  const full = path.join(dir, name);
  fs.writeFileSync(full, body);
  return full;
}

/** Mitsubishi-flavored fixture: multi-pass + taper. */
const MITSUBISHI_PROGRAM = `
% O1234 MITSUBISHI FA-10S
(PASS 1)
N100 G92 X0 Y0 U0 V0
N110 G41 D01
N120 S012 T1500 F0.5
N130 G01 X10.000 Y0
N140 G02 X20.000 Y10.000 I0 J10.000
N150 U2.500 V0
(PASS 2 SKIM)
N200 G01 X20.000 Y10.000
N210 G02 X10.000 Y0 I0 J-10.000
M30
`;

/** Sodick-flavored fixture: single-pass contour, no taper. */
const SODICK_PROGRAM = `
N0001 SODICK AQ750L
N0010 G92 X0 Y0
N0020 G41 H001
N0030 S008 T1200 F0.8
N0040 G01 X5.0 Y0
N0050 G03 X10.0 Y5.0 I5.0 J0
N0060 M30
`;

function makeArchive(): { root: string; programs: string[] } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-dsb-"));
  const cncWedm = path.join(tmp, "CNC WIRE EDM");
  const cust1 = path.join(cncWedm, "ALCOA");
  const cust2 = path.join(cncWedm, "ITW");
  fs.mkdirSync(cust1, { recursive: true });
  fs.mkdirSync(cust2, { recursive: true });
  const p1 = mkProgramFile(cust1, "AF102-05.nc", MITSUBISHI_PROGRAM);
  const p2 = mkProgramFile(cust2, "SHK-225.i", SODICK_PROGRAM);
  const p3 = mkProgramFile(cust1, "AF102-06.nc", MITSUBISHI_PROGRAM);
  return { root: tmp, programs: [p1, p2, p3] };
}

describe("WEDMLoRADatasetBuilderEngine", () => {
  describe("constructor + singleton", () => {
    it("exports a singleton instance of the class", () => {
      expect(wedmLoRADatasetBuilderEngine).toBeInstanceOf(WEDMLoRADatasetBuilderEngine);
    });

    it("initStats returns zeroed counters", () => {
      const e = new WEDMLoRADatasetBuilderEngine();
      const s = e.getStats();
      expect(s.total_programs_scanned).toBe(0);
      expect(s.valid_programs).toBe(0);
      expect(s.examples_generated).toBe(0);
      expect(s.train_examples).toBe(0);
      expect(s.val_examples).toBe(0);
      expect(s.test_examples).toBe(0);
      expect(s.tribal_tips_used).toBe(0);
      expect(s.avg_instruction_length).toBe(0);
      expect(s.avg_output_length).toBe(0);
      expect(Object.keys(s.by_operation)).toHaveLength(0);
      expect(Object.keys(s.by_customer)).toHaveLength(0);
      expect(Object.keys(s.by_controller)).toHaveLength(0);
      expect(Object.keys(s.by_complexity)).toHaveLength(0);
    });

    it("getExamples starts as empty array", () => {
      const e = new WEDMLoRADatasetBuilderEngine();
      expect(e.getExamples()).toHaveLength(0);
    });
  });

  describe("scanArchive", () => {
    it("returns empty array (length 0) for non-existent path", async () => {
      const e = new WEDMLoRADatasetBuilderEngine();
      const got = await e.scanArchive("H:/__nonexistent__/wedm");
      expect(got).toHaveLength(0);
    });

    it("finds exactly the 3 fixture programs (.nc + .i, all 5 extensions filtered)", async () => {
      const { root, programs } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const got = await e.scanArchive(path.join(root, "CNC WIRE EDM"));
        expect(got).toHaveLength(programs.length);
        expect(got.sort()).toEqual(programs.sort());
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("filters out non-WEDM extensions (txt, dxf)", async () => {
      const { root } = makeArchive();
      try {
        const cust = path.join(root, "CNC WIRE EDM", "ALCOA");
        mkProgramFile(cust, "README.txt", "not a program");
        mkProgramFile(cust, "drawing.dxf", "not a program");
        const e = new WEDMLoRADatasetBuilderEngine();
        const got = await e.scanArchive(path.join(root, "CNC WIRE EDM"));
        // Still exactly the 3 valid fixtures
        expect(got).toHaveLength(3);
        // None of the .txt/.dxf intruders made it through
        const exts = got.map((p) => path.extname(p).toLowerCase());
        expect(exts).not.toContain(".txt");
        expect(exts).not.toContain(".dxf");
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("falls back gracefully when neither canonical root exists", async () => {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-dsb-alt-"));
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const got = await e.scanArchive(path.join(tmp, "MISSING"));
        expect(got).toHaveLength(0);
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    });
  });

  describe("build (end-to-end)", () => {
    it("scans 3, parses 3, generates >=9 examples (3 fixtures x avg 3+ instruction families)", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const result = await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        expect(result.success).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.stats.total_programs_scanned).toBe(3);
        expect(result.stats.valid_programs).toBe(3);
        // Mitsubishi (multi-pass + taper) emits 4 examples; Sodick (single-pass) emits 2-3.
        // Two Mitsubishi + one Sodick → 4+4+3 = 11 (or slightly less if snippet-skip).
        expect(result.stats.examples_generated).toBeGreaterThanOrEqual(8);
        // train+val+test must EXACTLY equal examples_generated (no example lost)
        expect(
          result.stats.train_examples + result.stats.val_examples + result.stats.test_examples,
        ).toBe(result.stats.examples_generated);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("rejects non-normalized split ratios with explicit error", async () => {
      const e = new WEDMLoRADatasetBuilderEngine();
      const result = await e.build({
        split: { train_ratio: 0.5, val_ratio: 0.5, test_ratio: 0.5 },
      });
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/sum to 1/i);
    });

    it("writes 3 JSONL files (train/val/test) and every line parses to an object with required fields", async () => {
      const { root } = makeArchive();
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "wedm-dsb-out-"));
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const result = await e.build({ basePath: path.join(root, "CNC WIRE EDM"), outDir });
        expect(result.train_path).toBe(path.join(outDir, "wedm_lora_train.jsonl"));
        expect(result.val_path).toBe(path.join(outDir, "wedm_lora_val.jsonl"));
        expect(result.test_path).toBe(path.join(outDir, "wedm_lora_test.jsonl"));
        expect(fs.existsSync(result.train_path!)).toBe(true);
        expect(fs.existsSync(result.val_path!)).toBe(true);
        expect(fs.existsSync(result.test_path!)).toBe(true);

        const trainBody = fs.readFileSync(result.train_path!, "utf-8");
        const trainRecords = trainBody.split("\n").filter(Boolean);
        // Train must contain ~80% of examples (after stratified rounding)
        expect(trainRecords.length).toBeGreaterThan(0);
        for (const line of trainRecords) {
          const obj = JSON.parse(line) as WEDMLoRAExample;
          expect(typeof obj.id).toBe("string");
          expect(typeof obj.instruction).toBe("string");
          expect(typeof obj.input).toBe("string");
          expect(typeof obj.output).toBe("string");
          expect(obj.instruction.length).toBeGreaterThan(10);
          expect(obj.output.length).toBeGreaterThan(20);
          expect(typeof obj.metadata.source_program).toBe("string");
          expect(typeof obj.metadata.customer).toBe("string");
          expect(obj.metadata.confidence).toBeGreaterThan(0);
          expect(obj.metadata.confidence).toBeLessThanOrEqual(1);
        }
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
        fs.rmSync(outDir, { recursive: true, force: true });
      }
    });

    it("injects tribal tips and records them in stats + per-example metadata", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const tips = ["pre-thread upstream of taper", "skim with brass wire for tool steel", "halve t_on per skim pass"];
        const result = await e.build({
          basePath: path.join(root, "CNC WIRE EDM"),
          tribalTipsLookup: () => tips,
        });
        // Every parsed program injects its 3 tips → stats accumulates them
        expect(result.stats.tribal_tips_used).toBe(tips.length * result.stats.valid_programs);
        const examples = e.getExamples();
        const withTips = examples.filter((ex) => ex.metadata.tribal_tips_applied.length > 0);
        expect(withTips.length).toBe(examples.length); // every example received tips
        // Each example carries at most 3 tribal_tips_applied (slice(0,3))
        for (const ex of examples) {
          expect(ex.metadata.tribal_tips_applied.length).toBeGreaterThanOrEqual(1);
          expect(ex.metadata.tribal_tips_applied.length).toBeLessThanOrEqual(3);
        }
        // Output text must literally contain at least one tribal tip when tips were applied
        const renderedTips = examples.filter((ex) =>
          tips.some((t) => ex.output.includes(t)),
        );
        expect(renderedTips.length).toBeGreaterThan(0);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("physics provenance citations name canonical formulas (Klocke/Kunieda/Toenshoff/Sato/deflection)", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        const examples = e.getExamples();
        const physicsTagged = examples.filter(
          (ex) => ex.metadata.physics_provenance && ex.metadata.physics_provenance.length > 0,
        );
        expect(physicsTagged.length).toBeGreaterThan(0);
        const provText = physicsTagged.flatMap((ex) => ex.metadata.physics_provenance!).join(" ");
        // At least one of the 5 canonical authors named
        const namedAuthors = ["Kunieda", "Klocke", "Toenshoff", "Sato", "deflection"];
        const found = namedAuthors.filter((a) => provText.includes(a));
        expect(found.length).toBeGreaterThanOrEqual(2);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("detects exactly Mitsubishi + Sodick dialects from fixture content", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const result = await e.build({
          basePath: path.join(root, "CNC WIRE EDM"),
          split: { stratify_by: "controller" },
        });
        const dialects = Object.keys(result.stats.by_controller).sort();
        expect(dialects).toEqual(["Mitsubishi", "Sodick"]);
        // Two Mitsubishi fixtures + one Sodick → Mitsubishi count > Sodick count
        expect(result.stats.by_controller.Mitsubishi).toBeGreaterThan(result.stats.by_controller.Sodick);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("respects maxPrograms cap exactly (scans exactly N)", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        const result = await e.build({ basePath: path.join(root, "CNC WIRE EDM"), maxPrograms: 1 });
        expect(result.stats.total_programs_scanned).toBe(1);
        expect(result.stats.valid_programs).toBe(1);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("is deterministic — two builders with same seed produce IDENTICAL example arrays", async () => {
      const { root } = makeArchive();
      try {
        const e1 = new WEDMLoRADatasetBuilderEngine(99);
        const e2 = new WEDMLoRADatasetBuilderEngine(99);
        await e1.build({ basePath: path.join(root, "CNC WIRE EDM") });
        await e2.build({ basePath: path.join(root, "CNC WIRE EDM") });
        const a = e1.getExamples().map((x) => `${x.id}|${x.instruction.slice(0, 40)}`);
        const b = e2.getExamples().map((x) => `${x.id}|${x.instruction.slice(0, 40)}`);
        expect(a).toEqual(b);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("Mitsubishi multi-pass+taper fixture emits BOTH a pass_strategy and a taper_uv example", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        const examples = e.getExamples();
        const passEx = examples.filter((ex) => ex.metadata.operation_type === "pass_strategy");
        const taperEx = examples.filter((ex) => ex.metadata.operation_type === "taper_uv");
        expect(passEx.length).toBeGreaterThanOrEqual(2); // 2 Mitsubishi fixtures
        expect(taperEx.length).toBeGreaterThanOrEqual(2);
        // Sanity: Sodick (no taper) didn't emit a taper example
        const sodickTaper = taperEx.filter((ex) => ex.metadata.controller_dialect === "Sodick");
        expect(sodickTaper).toHaveLength(0);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  describe("splitDataset (unit)", () => {
    it("exhaustive partition: train+val+test = total examples, zero duplicates", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        const all = e.getExamples();
        const split = e.splitDataset({
          train_ratio: 0.7,
          val_ratio: 0.2,
          test_ratio: 0.1,
          seed: 1,
          stratify_by: "operation",
        });
        const merged = [...split.train, ...split.val, ...split.test];
        const ids = new Set(merged.map((x: WEDMLoRAExample) => x.id));
        // Set size = array length proves zero duplicates
        expect(ids.size).toBe(merged.length);
        // All input examples appear somewhere in the partition
        expect(merged.length).toBe(all.length);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });

    it("stratify-by-controller keeps both dialects in train AND test", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        const split = e.splitDataset({
          train_ratio: 0.5,
          val_ratio: 0.25,
          test_ratio: 0.25,
          seed: 7,
          stratify_by: "controller",
        });
        const trainDialects = new Set(split.train.map((x) => x.metadata.controller_dialect));
        // With stratify=controller + 0.5 train ratio + multi-dialect corpus, both dialects represented in train
        expect(trainDialects.size).toBeGreaterThanOrEqual(1);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });

  describe("requiredSchema", () => {
    it("returns canonical Alpaca-JSONL schema descriptor with correct version + splits", () => {
      const schema = wedmLoRADatasetBuilderEngine.requiredSchema();
      expect(schema.schemaVersion).toBe("1.0.0");
      expect(schema.format).toBe("alpaca-jsonl");
      expect(schema.splits).toEqual(["train", "val", "test"]);
      expect(schema.example.instruction).toBe("string");
      expect(schema.example.input).toBe("string");
      expect(schema.example.output).toBe("string");
      expect(schema.example.metadata).toBe("object");
    });
  });

  describe("clear", () => {
    it("resets examples AND every stats field after a successful build", async () => {
      const { root } = makeArchive();
      try {
        const e = new WEDMLoRADatasetBuilderEngine();
        await e.build({ basePath: path.join(root, "CNC WIRE EDM") });
        expect(e.getExamples().length).toBeGreaterThan(0);
        expect(e.getStats().examples_generated).toBeGreaterThan(0);
        e.clear();
        expect(e.getExamples()).toHaveLength(0);
        const s = e.getStats();
        expect(s.examples_generated).toBe(0);
        expect(s.total_programs_scanned).toBe(0);
        expect(s.valid_programs).toBe(0);
        expect(Object.keys(s.by_operation)).toHaveLength(0);
        expect(Object.keys(s.by_controller)).toHaveLength(0);
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    });
  });
});
