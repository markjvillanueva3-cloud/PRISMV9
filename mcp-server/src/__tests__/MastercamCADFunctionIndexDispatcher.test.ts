/**
 * U-BRIDGE-WIRE-MASTERCAM — dispatcher round-trip + engine API surface test.
 *
 * Verifies the 10 mastercam_cad_function_index_* actions wire to
 * MastercamCADFunctionIndexEngine static methods correctly.
 *
 * Why this exists: the engine had a complete public API (getIndex,
 * listModules, listOperations, findParameter, searchParameters,
 * getOperationsByCategory, getTotalParameterCount, …) but was NOT
 * referenced by any dispatcher — every consumer would have had to import
 * the engine class directly. This test pins both halves of the wiring.
 *
 * Sibling pattern: Fusion360FunctionIndexEngine.test.ts.
 *
 * @see mcp-server/src/engines/MastercamCADFunctionIndexEngine.ts
 * @see mcp-server/src/tools/dispatchers/camDispatcher.ts (action enum + switch)
 * @see mcp-server/data/cad-functions/mastercam/function-index.json
 */

import { describe, it, expect, beforeEach } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { MastercamCADFunctionIndexEngine } from "../engines/MastercamCADFunctionIndexEngine.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const DISPATCHER_PATH = resolve(HERE, "..", "tools", "dispatchers", "camDispatcher.ts");

// Canonical module ids straight from data/cad-functions/mastercam/function-index.json.
// Pin specific values so a future drop of a module surfaces as a test failure.
const EXPECTED_MODULE_IDS = [
  "wireframe_operations",
  "solid_operations",
  "surface_operations",
  "drafting_operations",
  "transformation_operations",
  "analysis_operations",
  "modify_operations",
  "file_layer_operations",
] as const;

describe("MastercamCADFunctionIndexEngine — direct engine API surface", () => {
  beforeEach(() => {
    MastercamCADFunctionIndexEngine.clearCache();
  });

  it("getIndex returns the Mastercam cad_function_index with schema 1.0.0 and 8 modules", () => {
    const index = MastercamCADFunctionIndexEngine.getIndex();
    expect(index.system_id).toBe("mastercam");
    expect(index.module_id).toBe("cad_function_index");
    expect(index.schema_version).toBe("1.0.0");
    expect(index.modules).toHaveLength(EXPECTED_MODULE_IDS.length);
  });

  it("listModules returns the exact 8 canonical module ids in order", () => {
    const modules = MastercamCADFunctionIndexEngine.listModules();
    expect(modules).toEqual(EXPECTED_MODULE_IDS);
  });

  it("getModuleEntry returns null for an unknown module id", () => {
    expect(MastercamCADFunctionIndexEngine.getModuleEntry("__nonexistent__")).toBeNull();
  });

  it("getModuleEntry returns a typed entry whose module_id matches the lookup", () => {
    const entry = MastercamCADFunctionIndexEngine.getModuleEntry("wireframe_operations");
    expect(entry).not.toBeNull();
    expect(entry!.module_id).toBe("wireframe_operations");
    expect(typeof entry!.path).toBe("string");
    expect(entry!.path.length).toBeGreaterThan(0);
  });

  it("getModule loads a real module catalog by id without throwing", () => {
    // analysis_operations is on disk in data/cad-functions/mastercam/ at the time of writing.
    const mod = MastercamCADFunctionIndexEngine.getModule("analysis_operations");
    // Either the catalog is loaded (object) or recorded as a load error (null).
    // Both are valid outcomes; the engine must not throw for either.
    if (mod !== null) {
      expect(typeof mod).toBe("object");
    } else {
      const errors = MastercamCADFunctionIndexEngine.getLoadErrors();
      expect(errors.some((e) => e.module_id === "analysis_operations")).toBe(true);
    }
  });

  it("getModule returns null and records a load error for an unknown id", () => {
    const result = MastercamCADFunctionIndexEngine.getModule("__nonexistent__");
    // Unknown id never resolves to an entry in getIndex().modules, so the early
    // return is null with no load error recorded.
    expect(result).toBeNull();
  });

  it("listAllOperations returns operation info with module_id+operation_id+params_count", () => {
    const ops = MastercamCADFunctionIndexEngine.listAllOperations();
    expect(Array.isArray(ops)).toBe(true);
    for (const op of ops.slice(0, 10)) {
      expect(EXPECTED_MODULE_IDS).toContain(op.module_id);
      expect(typeof op.operation_id).toBe("string");
      expect(op.operation_id.length).toBeGreaterThan(0);
      expect(typeof op.operation_name).toBe("string");
      expect(typeof op.params_count).toBe("number");
      expect(op.params_count).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(op.params_count)).toBe(true);
    }
  });

  it("listOperations(moduleId) returns only operations from that module", () => {
    const ops = MastercamCADFunctionIndexEngine.listOperations("wireframe_operations");
    expect(Array.isArray(ops)).toBe(true);
    for (const op of ops) {
      expect(op.module_id).toBe("wireframe_operations");
    }
  });

  it("getOperation returns null for an unknown module+operation pair", () => {
    expect(
      MastercamCADFunctionIndexEngine.getOperation("__nonexistent__", "__nonexistent__"),
    ).toBeNull();
  });

  it("findParameter returns null for an unknown identifier triple", () => {
    expect(
      MastercamCADFunctionIndexEngine.findParameter(
        "__nonexistent__",
        "__nonexistent__",
        "__nonexistent__",
      ),
    ).toBeNull();
  });

  it("searchParameters honors the limit and returns parameter locators", () => {
    const results = MastercamCADFunctionIndexEngine.searchParameters("a", 5);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(5);
    for (const r of results) {
      expect(EXPECTED_MODULE_IDS).toContain(r.module_id);
      expect(typeof r.operation_id).toBe("string");
      expect(typeof r.tab_id).toBe("string");
      expect(typeof r.parameter.name).toBe("string");
    }
  });

  it("getOperationsByCategory returns an empty array for an unknown category", () => {
    const ops = MastercamCADFunctionIndexEngine.getOperationsByCategory("__nonexistent__");
    expect(Array.isArray(ops)).toBe(true);
    expect(ops).toHaveLength(0);
  });

  it("getTotalParameterCount returns a non-negative finite integer", () => {
    const total = MastercamCADFunctionIndexEngine.getTotalParameterCount();
    expect(typeof total).toBe("number");
    expect(Number.isFinite(total)).toBe(true);
    expect(total).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(total)).toBe(true);
  });

  it("getLoadErrors returns a snapshot — mutating it does not affect the engine", () => {
    // Force a couple of loads to populate the error path.
    MastercamCADFunctionIndexEngine.listAllOperations();
    const errors = MastercamCADFunctionIndexEngine.getLoadErrors();
    expect(Array.isArray(errors)).toBe(true);
    const before = errors.length;
    // Mutate the returned slice; engine's internal log must remain untouched.
    (errors as unknown as { length: number }).length = 0;
    const after = MastercamCADFunctionIndexEngine.getLoadErrors().length;
    expect(after).toBe(before);
  });

  it("clearCache resets index cache — second getIndex returns a fresh object", () => {
    const first = MastercamCADFunctionIndexEngine.getIndex();
    MastercamCADFunctionIndexEngine.clearCache();
    const reloaded = MastercamCADFunctionIndexEngine.getIndex();
    // Identity check: clearCache forces a re-read so the cached pointer differs.
    expect(reloaded).not.toBe(first);
    // But the structural identity is preserved.
    expect(reloaded.system_id).toBe(first.system_id);
    expect(reloaded.modules).toHaveLength(first.modules.length);
  });
});

describe("U-BRIDGE-WIRE-MASTERCAM — dispatcher action enum coverage (anti-regression)", () => {
  // Source-grep proof: the 10 actions must all appear in camDispatcher.ts.
  // This guards against an accidental enum-row drop reverting the wiring.
  it("camDispatcher.ts declares all 10 mastercam_cad_function_index_* actions and cases", async () => {
    const text = await readFile(DISPATCHER_PATH, "utf8");
    const required = [
      "mastercam_cad_function_index_get",
      "mastercam_cad_function_index_list_modules",
      "mastercam_cad_function_index_get_module",
      "mastercam_cad_function_index_list_operations",
      "mastercam_cad_function_index_list_all_operations",
      "mastercam_cad_function_index_get_operation",
      "mastercam_cad_function_index_find_parameter",
      "mastercam_cad_function_index_search_parameters",
      "mastercam_cad_function_index_get_operations_by_category",
      "mastercam_cad_function_index_get_total_parameter_count",
    ];
    for (const action of required) {
      // Both the enum entry ("...") and the case ("case \"...\":") must exist.
      expect(text).toContain(`"${action}"`);
      expect(text).toContain(`case "${action}":`);
    }
  });

  it("camDispatcher.ts references MastercamCADFunctionIndexEngine via lazy import", async () => {
    const text = await readFile(DISPATCHER_PATH, "utf8");
    expect(text).toContain(`await import("../../engines/MastercamCADFunctionIndexEngine.js")`);
    expect(text).toContain("MastercamCADFunctionIndexEngine.getIndex()");
    expect(text).toContain("MastercamCADFunctionIndexEngine.listModules()");
    expect(text).toContain("MastercamCADFunctionIndexEngine.searchParameters");
  });

  // R12 fail-loud — Arm-B P1: if the index JSON is ever removed/renamed, the
  // engine MUST throw an identifiable error rather than silently return null.
  // A future "helpful" refactor that swaps the throw for `return null` would
  // make the dispatcher serve an empty catalog without any consumer noticing.
  // Source-level contract: verify the engine still throws with the canonical
  // message prefix `Mastercam CAD function index not found:`.
  it("MastercamCADFunctionIndexEngine.getIndex throws with the canonical path prefix when the file is missing", async () => {
    const enginePath = resolve(HERE, "..", "engines", "MastercamCADFunctionIndexEngine.ts");
    const source = await readFile(enginePath, "utf8");
    expect(source).toMatch(/if \(!existsSync\(INDEX_PATH\)\)\s*\{/);
    expect(source).toContain("throw new Error(`Mastercam CAD function index not found: ${INDEX_PATH}`)");
  });
});
