/**
 * Round-trip dispatcher wiring tests for WEDM-WIRE-MS0/Batch6:
 *   U-WWB13: wedm_machine_state_ingest    → WEDMMachineStateEngine.ingest (reading + optional now_ms)
 *   U-WWB14: wedm_material_spark_resolve  → WEDMMaterialSparkDatabaseEngine.resolve (string query)
 *   U-WWB15: wedm_kalman_fuse             → WEDMKalmanFusionEngine.fuse
 *
 * Notable shape variations vs prior batches:
 *   - WWB13 has an optional 2nd arg (now_ms) — case body forwards undefined when missing
 *   - WWB14 takes a string, not an object — validates `typeof query !== "string"` instead
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/camDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/camActionSchemas.ts");

describe("WEDM-WIRE-MS0/Batch6 — action enum membership", () => {
  it("camDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"wedm_machine_state_ingest"');
    expect(src).toContain('"wedm_material_spark_resolve"');
    expect(src).toContain('"wedm_kalman_fuse"');
  });

  it("the WEDM-WIRE-MS0/Batch6 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("WEDM-WIRE-MS0/Batch6: machine state ingest + spark DB resolve + kalman fusion");
  });
});

describe("U-WWB13 — wedm_machine_state_ingest wiring (reading + optional now_ms)", () => {
  it("dispatcher case lazy-imports WEDMMachineStateEngine and calls ingest", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_machine_state_ingest"');
    expect(src).toContain("WEDMMachineStateEngine.js");
    expect(src).toContain("wedmMachineStateEngine.ingest");
  });

  it("case handler validates reading + forwards optional now_ms + wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_machine_state_ingest"[\s\S]{0,1000}reading required \(WEDMSensorReading\)/);
    expect(src).toMatch(/case "wedm_machine_state_ingest"[\s\S]{0,1000}now_ms/);
    expect(src).toMatch(/case "wedm_machine_state_ingest"[\s\S]{0,1000}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_machine_state_ingest with reading:record + optional now_ms:number", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_machine_state_ingest:");
    expect(src).toMatch(/wedm_machine_state_ingest:\s*z\.object\(\{[\s\S]{0,500}reading:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
    expect(src).toMatch(/wedm_machine_state_ingest:\s*z\.object\(\{[\s\S]{0,800}now_ms:\s*z\.number\(\)\.optional/);
  });

  it("engine source: WEDMMachineStateEngine exports the singleton + ingest method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMMachineStateEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmMachineStateEngine\s*=\s*new WEDMMachineStateEngine\(\)/);
    expect(src).toMatch(/ingest\(\s*reading:\s*WEDMSensorReading\s*,\s*nowMs\?:\s*number\s*\):\s*WEDMMachineState/);
  });
});

describe("U-WWB14 — wedm_material_spark_resolve wiring (string query)", () => {
  it("dispatcher case lazy-imports WEDMMaterialSparkDatabaseEngine and calls resolve", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_material_spark_resolve"');
    expect(src).toContain("WEDMMaterialSparkDatabaseEngine.js");
    expect(src).toContain("wedmMaterialSparkDatabaseEngine.resolve");
  });

  it("case handler validates query is a non-empty string AND wraps in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_material_spark_resolve"[\s\S]{0,1000}query string required/);
    expect(src).toMatch(/case "wedm_material_spark_resolve"[\s\S]{0,1000}typeof query !== "string"/);
    expect(src).toMatch(/case "wedm_material_spark_resolve"[\s\S]{0,1000}try\s*\{[\s\S]{0,500}catch\s*\(err\)/);
  });

  it("schema map exposes wedm_material_spark_resolve with query:string(min 1)", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_material_spark_resolve:");
    expect(src).toMatch(/wedm_material_spark_resolve:\s*z\.object\(\{[\s\S]{0,400}query:\s*z\.string\(\)\.min\(1\)/);
  });

  it("engine source: WEDMMaterialSparkDatabaseEngine exports the singleton + resolve method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMMaterialSparkDatabaseEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toContain("export const wedmMaterialSparkDatabaseEngine");
    expect(src).toMatch(/resolve\(\s*input:\s*string\s*\):\s*WEDMSparkSignature \| null/);
  });
});

describe("U-WWB15 — wedm_kalman_fuse wiring", () => {
  it("dispatcher case lazy-imports WEDMKalmanFusionEngine and calls fuse", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "wedm_kalman_fuse"');
    expect(src).toContain("WEDMKalmanFusionEngine.js");
    expect(src).toContain("wedmKalmanFusionEngine.fuse");
  });

  it("case handler validates reading param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "wedm_kalman_fuse"[\s\S]{0,800}reading required \(WEDMSensorReading\)/);
    expect(src).toMatch(/case "wedm_kalman_fuse"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "wedm_kalman_fuse"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes wedm_kalman_fuse with reading:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("wedm_kalman_fuse:");
    expect(src).toMatch(/wedm_kalman_fuse:\s*z\.object\(\{[\s\S]{0,400}reading:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: WEDMKalmanFusionEngine exports the singleton + fuse method", () => {
    const enginePath = join(process.cwd(), "src/engines/WEDMKalmanFusionEngine.ts");
    const src = readFileSync(enginePath, "utf-8");
    expect(src).toMatch(/export const wedmKalmanFusionEngine\s*=\s*new WEDMKalmanFusionEngine\(\)/);
    expect(src).toMatch(/fuse\(\s*reading:\s*WEDMSensorReading\s*\):\s*WEDMFusedState/);
  });
});
