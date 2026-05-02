/**
 * Round-trip dispatcher wiring tests for LATHE-WIRE-MS0/Batch9:
 *   U-LWB22: lathe_masterpost_emit      → LatheMasterPostAPIEngine.emit (static)
 *   U-LWB23: lathe_masterpost_validate  → LatheMasterPostAPIEngine.validate (static)
 *   U-LWB24: lathe_masterpost_audit     → LatheMasterPostAPIEngine.audit (static)
 *
 * All three actions delegate to static methods on a single engine
 * (LatheMasterPostAPIEngine, exported as the singleton-as-class-alias
 * `latheMasterPostAPIEngine = LatheMasterPostAPIEngine`).
 *
 * Note: lathe_masterpost_route was already wired in Batch8, but it points at
 * the separate LatheMasterPostRouterEngine — the API engine has its own
 * route() method that we deliberately do NOT expose here to avoid action-name
 * collision. emit/validate/audit are the new public surface.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DISPATCHER_PATH = join(process.cwd(), "src/tools/dispatchers/turningDispatcher.ts");
const SCHEMA_PATH = join(process.cwd(), "src/schemas/turningActionSchemas.ts");
const ENGINE_PATH = join(process.cwd(), "src/engines/LatheMasterPostAPIEngine.ts");

describe("LATHE-WIRE-MS0/Batch9 — action enum membership", () => {
  it("turningDispatcher ACTIONS array includes the 3 new actions", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('"lathe_masterpost_emit"');
    expect(src).toContain('"lathe_masterpost_validate"');
    expect(src).toContain('"lathe_masterpost_audit"');
  });

  it("the LATHE-WIRE-MS0/Batch9 milestone tag is present in the enum block", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain("LATHE-WIRE-MS0/Batch9: master post API (emit + validate + audit)");
  });
});

describe("U-LWB22 — lathe_masterpost_emit wiring", () => {
  it("dispatcher case lazy-imports LatheMasterPostAPIEngine and calls emit", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_emit"');
    expect(src).toContain("LatheMasterPostAPIEngine.js");
    expect(src).toContain("latheMasterPostAPIEngine.emit");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_emit"[\s\S]{0,800}input required \(EmitInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_emit"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_emit"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_emit with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_emit:");
    expect(src).toMatch(/lathe_masterpost_emit:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: LatheMasterPostAPIEngine alias points at class with static emit()", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/export const latheMasterPostAPIEngine\s*=\s*LatheMasterPostAPIEngine/);
    expect(src).toMatch(/static\s+emit\(\s*input:\s*EmitInput\s*\):\s*EmitResult/);
  });
});

describe("U-LWB23 — lathe_masterpost_validate wiring", () => {
  it("dispatcher case lazy-imports LatheMasterPostAPIEngine and calls validate", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_validate"');
    expect(src).toContain("LatheMasterPostAPIEngine.js");
    expect(src).toContain("latheMasterPostAPIEngine.validate");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_validate"[\s\S]{0,800}input required \(ValidateInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_validate"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_validate"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_validate with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_validate:");
    expect(src).toMatch(/lathe_masterpost_validate:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: static validate() exists on LatheMasterPostAPIEngine", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/static\s+validate\(\s*input:\s*ValidateInput\s*\):\s*ValidateResult/);
  });
});

describe("U-LWB24 — lathe_masterpost_audit wiring", () => {
  it("dispatcher case lazy-imports LatheMasterPostAPIEngine and calls audit", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toContain('case "lathe_masterpost_audit"');
    expect(src).toContain("LatheMasterPostAPIEngine.js");
    expect(src).toContain("latheMasterPostAPIEngine.audit");
  });

  it("case handler validates input param AND wraps engine call in try/catch", () => {
    const src = readFileSync(DISPATCHER_PATH, "utf-8");
    expect(src).toMatch(/case "lathe_masterpost_audit"[\s\S]{0,800}input required \(AuditInput\)/);
    expect(src).toMatch(/case "lathe_masterpost_audit"[\s\S]{0,800}try\s*\{[\s\S]{0,400}catch\s*\(err\)/);
    expect(src).toMatch(/case "lathe_masterpost_audit"[\s\S]{0,800}\(err as Error\)\.message/);
  });

  it("schema map exposes lathe_masterpost_audit with input:record", () => {
    const src = readFileSync(SCHEMA_PATH, "utf-8");
    expect(src).toContain("lathe_masterpost_audit:");
    expect(src).toMatch(/lathe_masterpost_audit:\s*z\.object\(\{[\s\S]{0,400}input:\s*z\.record\(z\.string\(\),\s*z\.unknown\(\)\)/);
  });

  it("engine source: static audit() exists on LatheMasterPostAPIEngine", () => {
    const src = readFileSync(ENGINE_PATH, "utf-8");
    expect(src).toMatch(/static\s+audit\(\s*input:\s*AuditInput\s*\):\s*AuditResult/);
  });
});
