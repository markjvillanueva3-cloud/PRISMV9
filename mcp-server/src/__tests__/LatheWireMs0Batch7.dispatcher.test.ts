/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch7:
 *   U-LWB16: lathe_print_program_emit     → LathePrintProgramEmitterEngine.emit (program + options)
 *   U-LWB17: lathe_print_program_signoff  → LathePrintProgramSignoffEngine.generatePackage
 *   U-LWB18: lathe_print_ingest           → LathePrintIngestPipelineEngine.ingest (anonymous-typed input)
 *
 * LWB18 has the unique anonymous-object input shape: {raw_text, filename?, format?, page_count?}.
 * The schema models it with a typed inner z.object() carrying those fields.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");

describe("LATHE-WIRE-MS0/Batch7 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_print_program_emit"');
    expect(src).toContain('"lathe_print_program_signoff"');
    expect(src).toContain('"lathe_print_ingest"');
  });

  it("the LATHE-WIRE-MS0/Batch7 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch7: print pipeline (emit + signoff + ingest)");
  });
});

describe("U-LWB16 — lathe_print_program_emit wiring (program + options)", () => {
  it("dispatcher case lazy-imports LathePrintProgramEmitterEngine and calls emit", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_program_emit"');
    expect(src).toContain("LathePrintProgramEmitterEngine.js");
    expect(src).toContain("lathePrintProgramEmitterEngine.emit");
  });

  it("case handler validates program AND options AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_program_emit"[\s\S]{0,1200}program required \(ToolpathProgram\)/);
    expect(src).toMatch(/case "lathe_print_program_emit"[\s\S]{0,1200}options required \(EmitOptions\)/);
    expect(src).toMatch(/case "lathe_print_program_emit"[\s\S]{0,1200}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_program_emit with program + options records", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_program_emit:");
    expect(src).toMatch(/lathe_print_program_emit:\s*z\.object\(\{[\s\S]{0,500}program:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/lathe_print_program_emit:\s*z\.object\(\{[\s\S]{0,500}options:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePrintProgramEmitterEngine exports the singleton + emit method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintProgramEmitterEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintProgramEmitterEngine\s*=\s*new LathePrintProgramEmitterEngine\(\)/);
    expect(src).toMatch(/emit\(\s*program:\s*ToolpathProgram\s*,\s*options:\s*EmitOptions\s*\):\s*EmittedProgram/);
  });
});

describe("U-LWB17 — lathe_print_program_signoff wiring", () => {
  it("dispatcher case lazy-imports LathePrintProgramSignoffEngine and calls generatePackage", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_program_signoff"');
    expect(src).toContain("LathePrintProgramSignoffEngine.js");
    expect(src).toContain("lathePrintProgramSignoffEngine.generatePackage");
  });

  it("case handler validates input param AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_program_signoff"[\s\S]{0,800}input required \(SignoffInput\)/);
    expect(src).toMatch(/case "lathe_print_program_signoff"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_program_signoff with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_program_signoff:");
    expect(src).toMatch(/lathe_print_program_signoff:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LathePrintProgramSignoffEngine exports the singleton + generatePackage method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintProgramSignoffEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintProgramSignoffEngine\s*=\s*new LathePrintProgramSignoffEngine\(\)/);
    expect(src).toMatch(/generatePackage\(\s*input:\s*SignoffInput\s*\):\s*SignoffPackage/);
  });
});

describe("U-LWB18 — lathe_print_ingest wiring (anonymous-typed input)", () => {
  it("dispatcher case lazy-imports LathePrintIngestPipelineEngine and calls ingest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_print_ingest"');
    expect(src).toContain("LathePrintIngestPipelineEngine.js");
    expect(src).toContain("lathePrintIngestPipelineEngine.ingest");
  });

  it("case handler validates input AND input.raw_text non-empty AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_print_ingest"[\s\S]{0,1500}input required \(\{raw_text/);
    expect(src).toMatch(/case "lathe_print_ingest"[\s\S]{0,1500}input\.raw_text non-empty string required/);
    expect(src).toMatch(/case "lathe_print_ingest"[\s\S]{0,1500}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes lathe_print_ingest with typed input.raw_text + format enum", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_print_ingest:");
    expect(src).toMatch(/lathe_print_ingest:\s*z\.object\(\{[\s\S]{0,1200}raw_text:\s*z\.string\(\)\.min\(1\)/);
    expect(src).toMatch(/lathe_print_ingest:\s*z\.object\(\{[\s\S]{0,1200}format:\s*z\.enum\(\["pdf",\s*"image",\s*"dxf",\s*"text"\]\)\.optional/);
  });

  it("engine source: LathePrintIngestPipelineEngine exports the singleton + ingest method", () => {
    const enginePath = join(process.cwd(), "src/engines/LathePrintIngestPipelineEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const lathePrintIngestPipelineEngine\s*=\s*new LathePrintIngestPipelineEngine\(\)/);
    expect(src).toMatch(/ingest\(\s*input:\s*\{/);
  });
});
