/**
 * dispatcherMiddleware -- schema-coverage observability
 * (U-DISPATCHER-SCHEMA-FAILLOUD, slot:bravo 2026-06-22).
 *
 * Closes the DISPATCHER-CAPABILITY-ASSESSMENT-2026-06-22 P1: validateActionParams
 * silently returned valid:true for actions with NO registered schema, hiding the
 * gap where unvalidated input reaches engines. The fix is ADDITIVE + NON-blocking:
 * a `schemaMissing` flag + runtime coverage counters (getSchemaCoverageStats),
 * NOT a throw (throwing would mass-break the ~40% of schema-less actions).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import {
  validateActionParams,
  getSchemaCoverageStats,
  resetSchemaCoverageStats,
} from "../utils/dispatcherMiddleware.js";

const SCHEMAS = {
  do_thing: z.object({ n: z.number(), name: z.string() }),
};

describe("dispatcherMiddleware schema-coverage observability", () => {
  beforeEach(() => resetSchemaCoverageStats());

  it("no schema -> passes through valid BUT flags schemaMissing + counts passthrough", () => {
    const r = validateActionParams("no_schema_action", { anything: 1 }, SCHEMAS);
    expect(r.valid).toBe(true);
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ anything: 1 }); // back-compat: raw params still passed through
    expect(r.schemaMissing).toBe(true);
    expect(getSchemaCoverageStats()).toEqual({
      validated: 0,
      passthrough: 1,
      missingActions: ["no_schema_action"],
    });
  });

  it("matching schema + valid params -> validated, schemaMissing absent (undefined)", () => {
    const r = validateActionParams("do_thing", { n: 5, name: "ok" }, SCHEMAS);
    expect(r.valid).toBe(true);
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ n: 5, name: "ok" });
    expect(r.schemaMissing).toBe(undefined); // success path never sets the flag
    expect(getSchemaCoverageStats()).toEqual({ validated: 1, passthrough: 0, missingActions: [] });
  });

  it("schema + INVALID params -> valid:false, real per-field errors, NOT a passthrough", () => {
    const r = validateActionParams("do_thing", { n: "not-a-number" }, SCHEMAS);
    expect(r.valid).toBe(false);
    expect(r.success).toBe(false);
    expect(r.schemaMissing).toBe(undefined);
    // Both fields fail: n is the wrong type, name is missing -> the error paths name them.
    const failedPaths = (r.errors ?? []).map((i) => String(i.path[0])).sort();
    expect(failedPaths).toEqual(["n", "name"]);
    expect(r.errorMessage).toContain("n:");
    expect(r.errorMessage).toContain("name");
    // A failed parse is counted as neither validated nor passthrough.
    expect(getSchemaCoverageStats()).toEqual({ validated: 0, passthrough: 0, missingActions: [] });
  });

  it("missingActions dedupes per action; passthrough counts every call", () => {
    validateActionParams("ghost_a", {}, SCHEMAS);
    validateActionParams("ghost_a", {}, SCHEMAS); // same action again
    validateActionParams("ghost_b", {}, SCHEMAS);
    expect(getSchemaCoverageStats()).toEqual({
      validated: 0,
      passthrough: 3,
      missingActions: ["ghost_a", "ghost_b"], // sorted + deduped
    });
  });

  it("mixed traffic: validated + passthrough counted independently", () => {
    validateActionParams("do_thing", { n: 1, name: "a" }, SCHEMAS); // validated
    validateActionParams("do_thing", { n: 2, name: "b" }, SCHEMAS); // validated
    validateActionParams("orphan", {}, SCHEMAS);                    // passthrough
    expect(getSchemaCoverageStats()).toEqual({
      validated: 2,
      passthrough: 1,
      missingActions: ["orphan"],
    });
  });

  it("resetSchemaCoverageStats clears counters + actions", () => {
    validateActionParams("orphan", {}, SCHEMAS);
    resetSchemaCoverageStats();
    expect(getSchemaCoverageStats()).toEqual({ validated: 0, passthrough: 0, missingActions: [] });
  });
});
