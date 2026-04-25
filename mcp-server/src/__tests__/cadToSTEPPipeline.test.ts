/**
 * cadToSTEPPipeline.test.ts — CAD-GROUND-TRUTH-MS0/U-CGT03 unit tests
 *
 * All tests run in MOCK mode (PRISM_CAD_MOCK=1) so the pipeline short-circuits
 * to fixture-backed bridges and writes a synthetic AP242 STEP header at the
 * output path so validation exercises the same code path as a live export.
 */

process.env["PRISM_CAD_MOCK"] = "1";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  CADToSTEPPipelineEngine,
  cadToSTEPPipelineEngine,
  type CADStrategy,
  type StepSchemaName,
} from "../engines/CADToSTEPPipelineEngine.js";

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-cgt03-"));
});

afterEach(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    // best-effort cleanup; ignore
  }
});

function fresh(): CADToSTEPPipelineEngine {
  return new CADToSTEPPipelineEngine();
}

function outPath(name: string): string {
  return path.join(tmpRoot, name);
}

describe("CADToSTEPPipelineEngine — singleton sanity", () => {
  it("exports cadToSTEPPipelineEngine as a CADToSTEPPipelineEngine instance", () => {
    expect(cadToSTEPPipelineEngine).toBeInstanceOf(CADToSTEPPipelineEngine);
  });

  it("listSupportedExtensions returns all 12 supported CAD extensions", () => {
    const exts = fresh().listSupportedExtensions();
    expect(exts.length).toBe(12);
    expect(exts).toContain(".sldprt");
    expect(exts).toContain(".ipt");
    expect(exts).toContain(".FCStd");
    expect(exts).toContain(".mcx-8");
    expect(exts).toContain(".f3d");
    expect(exts).toContain(".hmc");
  });
});

describe("selectStrategy() — strategy chain per format", () => {
  it("native-bridge is always the primary strategy", () => {
    const eng = fresh();
    for (const ext of eng.listSupportedExtensions()) {
      const chain = eng.selectStrategy(ext);
      expect(chain[0]).toBe<CADStrategy>("native-bridge");
    }
  });

  it("FCStd has native-parser-fallback before manual-trigger", () => {
    const chain = fresh().selectStrategy(".FCStd");
    expect(chain).toEqual(["native-bridge", "native-parser-fallback", "manual-trigger"]);
  });

  it("f3d has native-parser-fallback (Fusion archive parser is registered)", () => {
    const chain = fresh().selectStrategy(".f3d");
    expect(chain).toContain<CADStrategy>("native-parser-fallback");
  });

  it("sldprt skips parser-fallback and goes directly to manual-trigger", () => {
    const chain = fresh().selectStrategy(".sldprt");
    expect(chain).toEqual(["native-bridge", "manual-trigger"]);
  });
});

describe("runPipeline() — happy path per format (mock mode)", () => {
  const cases = [
    { src: "part.sldprt", out: "part.step", bridge: "solidworks", ext: ".sldprt" },
    { src: "asm.iam", out: "asm.step", bridge: "inventor", ext: ".iam" },
    { src: "model.FCStd", out: "model.step", bridge: "freecad", ext: ".FCStd" },
    { src: "tooling.mcx-8", out: "tooling.step", bridge: "mastercam", ext: ".mcx-8" },
    { src: "design.f3d", out: "design.step", bridge: "fusion360", ext: ".f3d" },
    { src: "ops.hmc", out: "ops.step", bridge: "hypermill", ext: ".hmc" },
  ] as const;

  for (const c of cases) {
    it(`${c.ext} → ${c.bridge} → success with native-bridge`, async () => {
      const r = await fresh().runPipeline({
        filePath: c.src,
        outputPath: outPath(c.out),
      });
      expect(r.success).toBe(true);
      expect(r.bridge).toBe(c.bridge);
      expect(r.ext).toBe(c.ext);
      expect(r.strategyUsed).toBe<CADStrategy>("native-bridge");
      expect(r.validation.valid).toBe(true);
      expect(r.validation.schema).toBe<StepSchemaName>("AP242");
      expect(r.attempts).toHaveLength(1);
      expect(r.attempts[0]?.ok).toBe(true);
    });
  }
});

describe("runPipeline() — error paths and edge cases", () => {
  it("returns structured failure (no throw) when output parent dir is missing", async () => {
    const r = await fresh().runPipeline({
      filePath: "x.sldprt",
      outputPath: "/nonexistent-parent-dir-xyz/out.step",
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Output parent directory does not exist/);
    expect(r.bridge).toBeNull();
    expect(r.attempts).toEqual([]);
  });

  it("returns structured failure for unsupported extension", async () => {
    const r = await fresh().runPipeline({
      filePath: "report.xlsx",
      outputPath: outPath("report.step"),
    });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Unsupported CAD extension/);
    expect(r.bridge).toBeNull();
    expect(r.ext).toBeNull();
  });

  it("Zod rejects empty filePath (programmer error throws)", async () => {
    await expect(
      fresh().runPipeline({ filePath: "", outputPath: outPath("x.step") }),
    ).rejects.toThrow(/filePath/);
  });

  it("Zod rejects empty outputPath", async () => {
    await expect(
      fresh().runPipeline({ filePath: "a.sldprt", outputPath: "" }),
    ).rejects.toThrow(/outputPath/);
  });

  it("validate=false skips validation and still reports success", async () => {
    const r = await fresh().runPipeline({
      filePath: "a.sldprt",
      outputPath: outPath("a.step"),
      validate: false,
    });
    expect(r.success).toBe(true);
    expect(r.validation.valid).toBe(false);
    expect(r.validation.issues).toContain("validation skipped");
  });
});

describe("validateSTEP() — ISO-10303 header sniff", () => {
  it("detects AP242 from AUTOMOTIVE_DESIGN with 242 marker", () => {
    const file = outPath("ap242.step");
    fs.writeFileSync(
      file,
      `ISO-10303-21;
HEADER;
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 242 1 1 4 }'));
ENDSEC;`,
    );
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(true);
    expect(v.schema).toBe<StepSchemaName>("AP242");
  });

  it("detects AP214 from AUTOMOTIVE_DESIGN without 242 marker", () => {
    const file = outPath("ap214.step");
    fs.writeFileSync(
      file,
      `ISO-10303-21;
HEADER;
FILE_SCHEMA(('AUTOMOTIVE_DESIGN { 1 0 10303 214 1 1 1 1 }'));
ENDSEC;`,
    );
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(true);
    expect(v.schema).toBe<StepSchemaName>("AP214");
  });

  it("detects AP203E2 (config-controlled design, edition 2)", () => {
    const file = outPath("ap203e2.step");
    fs.writeFileSync(
      file,
      `ISO-10303-21;
HEADER;
FILE_SCHEMA(('CONFIG_CONTROL_DESIGN_203E2'));
ENDSEC;`,
    );
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(true);
    expect(v.schema).toBe<StepSchemaName>("AP203E2");
  });

  it("rejects file missing ISO-10303 magic", () => {
    const file = outPath("not-step.txt");
    fs.writeFileSync(file, "this is not a STEP file");
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(false);
    expect(v.schema).toBe<StepSchemaName>("unknown");
    expect(v.issues[0]).toMatch(/Missing ISO-10303-21 magic/);
  });

  it("rejects file with magic but no FILE_SCHEMA token", () => {
    const file = outPath("malformed.step");
    fs.writeFileSync(file, "ISO-10303-21;\nHEADER;\nENDSEC;");
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(false);
    expect(v.issues).toContain("FILE_SCHEMA token not found");
  });

  it("returns structured error when file does not exist", () => {
    const v = fresh().validateSTEP(outPath("missing.step"));
    expect(v.valid).toBe(false);
    expect(v.inspectedBytes).toBe(0);
    expect(v.issues[0]).toMatch(/File does not exist/);
  });

  it("rejects directories (not regular files)", () => {
    const dir = outPath("a-dir");
    fs.mkdirSync(dir);
    const v = fresh().validateSTEP(dir);
    expect(v.valid).toBe(false);
    expect(v.issues[0]).toMatch(/Not a regular file/);
  });

  it("flags unrecognized schema string", () => {
    const file = outPath("weird.step");
    fs.writeFileSync(
      file,
      `ISO-10303-21;
HEADER;
FILE_SCHEMA(('SOME_FUTURE_SCHEMA_999'));
ENDSEC;`,
    );
    const v = fresh().validateSTEP(file);
    expect(v.valid).toBe(false);
    expect(v.schema).toBe<StepSchemaName>("unknown");
    expect(v.issues[0]).toMatch(/Unrecognized schema string/);
  });
});

describe("runBatch() — multi-file orchestration", () => {
  it("processes a mixed-format batch and reports per-strategy / per-ext counts", async () => {
    const items = [
      { filePath: "a.sldprt", outputPath: outPath("a.step") },
      { filePath: "b.ipt", outputPath: outPath("b.step") },
      { filePath: "c.FCStd", outputPath: outPath("c.step") },
      { filePath: "d.f3d", outputPath: outPath("d.step") },
    ];
    const summary = await fresh().runBatch({ items });
    expect(summary.total).toBe(4);
    expect(summary.ok).toBe(4);
    expect(summary.failed).toBe(0);
    expect(summary.byStrategy["native-bridge"]).toBe(4);
    expect(summary.byExt[".sldprt"]?.ok).toBe(1);
    expect(summary.byExt[".f3d"]?.ok).toBe(1);
    expect(summary.results).toHaveLength(4);
  });

  it("continues on per-item failure when continueOnError=true", async () => {
    const summary = await fresh().runBatch({
      items: [
        { filePath: "ok.sldprt", outputPath: outPath("ok.step") },
        { filePath: "bad.xlsx", outputPath: outPath("bad.step") },
        { filePath: "ok2.ipt", outputPath: outPath("ok2.step") },
      ],
    });
    expect(summary.total).toBe(3);
    expect(summary.ok).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.results[1]?.success).toBe(false);
    expect(summary.results[2]?.success).toBe(true);
  });

  it("stops on first failure when continueOnError=false", async () => {
    const summary = await fresh().runBatch({
      items: [
        { filePath: "bad.xlsx", outputPath: outPath("bad.step") },
        { filePath: "would-be-ok.sldprt", outputPath: outPath("would-be-ok.step") },
      ],
      continueOnError: false,
    });
    expect(summary.total).toBe(2);
    expect(summary.failed).toBe(1);
    // Second item never ran:
    expect(summary.results).toHaveLength(1);
  });

  it("Zod rejects empty batch", async () => {
    await expect(fresh().runBatch({ items: [] })).rejects.toThrow(/at least one item/);
  });
});

describe("Determinism + reproducibility (mock mode)", () => {
  it("identical input produces identical PipelineResult shape across runs", async () => {
    const r1 = await fresh().runPipeline({
      filePath: "x.sldprt",
      outputPath: outPath("x1.step"),
    });
    const r2 = await fresh().runPipeline({
      filePath: "x.sldprt",
      outputPath: outPath("x2.step"),
    });
    expect(r1.success).toBe(r2.success);
    expect(r1.bridge).toBe(r2.bridge);
    expect(r1.ext).toBe(r2.ext);
    expect(r1.strategyUsed).toBe(r2.strategyUsed);
    expect(r1.validation.schema).toBe(r2.validation.schema);
    expect(r1.attempts.length).toBe(r2.attempts.length);
  });

  it("synthetic mock STEP header is byte-identical across runs", async () => {
    const a = outPath("ident-a.step");
    const b = outPath("ident-b.step");
    await fresh().runPipeline({ filePath: "x.sldprt", outputPath: a });
    await fresh().runPipeline({ filePath: "x.sldprt", outputPath: b });
    const ba = fs.readFileSync(a);
    const bb = fs.readFileSync(b);
    expect(Buffer.compare(ba, bb)).toBe(0);
  });
});
