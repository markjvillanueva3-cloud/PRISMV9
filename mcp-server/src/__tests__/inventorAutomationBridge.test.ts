/**
 * inventorAutomationBridge.test.ts
 * Mock-mode tests for InventorAutomationBridge (E2480).
 * All tests run with PRISM_CAD_MOCK=1 — no Inventor installation required.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Force mock mode before importing the engine
beforeAll(() => {
  process.env["PRISM_CAD_MOCK"] = "1";
});

afterAll(() => {
  delete process.env["PRISM_CAD_MOCK"];
});

// Dynamic import so env var is set before module-level code runs
let bridge: import("../engines/InventorAutomationBridge.js").InventorAutomationBridge;

beforeAll(async () => {
  const mod = await import("../engines/InventorAutomationBridge.js");
  // Use a fresh instance per test run (not the singleton) to isolate state
  bridge = new mod.InventorAutomationBridge();
});

// ── Singleton export ────────────────────────────────────────────────────────

describe("singleton export", () => {
  it("exports inventorAutomationBridge singleton", async () => {
    const mod = await import("../engines/InventorAutomationBridge.js");
    expect(mod.inventorAutomationBridge).toBeDefined();
    expect(mod.inventorAutomationBridge).toBeInstanceOf(mod.InventorAutomationBridge);
  });
});

// ── open ────────────────────────────────────────────────────────────────────

describe("open()", () => {
  it("returns AtomicValue with opened=true in mock mode", async () => {
    const result = await bridge.open("C:/parts/die.ipt");
    expect(result.value.opened).toBe(true);
    expect(result.value.filePath).toBe("C:/parts/die.ipt");
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe("mock");
  });

  it("accepts .iam assembly path", async () => {
    const result = await bridge.open("C:/assemblies/fixture.iam");
    expect(result.value.opened).toBe(true);
    expect(result.value.filePath).toContain(".iam");
  });

  it("accepts .idw drawing path", async () => {
    const result = await bridge.open("C:/drawings/blueprint.idw");
    expect(result.value.opened).toBe(true);
  });
});

// ── getParameters ────────────────────────────────────────────────────────────

describe("getParameters()", () => {
  it("returns InventorParameters shape", async () => {
    const result = await bridge.getParameters();
    expect(result.value).toBeDefined();
    expect(Array.isArray(result.value.modelParameters)).toBe(true);
    expect(Array.isArray(result.value.iProperties)).toBe(true);
  });

  it("contains model parameters with required fields", async () => {
    const { value } = await bridge.getParameters();
    const p = value.modelParameters[0];
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("value");
    expect(p).toHaveProperty("unit");
    expect(p).toHaveProperty("expression");
    expect(typeof p.isKey).toBe("boolean");
    expect(typeof p.isILogic).toBe("boolean");
  });

  it("contains iProperties with set/name/value", async () => {
    const { value } = await bridge.getParameters();
    const prop = value.iProperties[0];
    expect(prop).toHaveProperty("set");
    expect(prop).toHaveProperty("name");
    expect(prop).toHaveProperty("value");
  });

  it("exposes partNumber, revision, material top-level", async () => {
    const { value } = await bridge.getParameters();
    expect(typeof value.partNumber).toBe("string");
    expect(typeof value.revision).toBe("string");
    expect(typeof value.material).toBe("string");
  });

  it("exposes iAssembly/iPart/iMate/iLogic flags as booleans", async () => {
    const { value } = await bridge.getParameters();
    expect(typeof value.iAssemblyMember).toBe("boolean");
    expect(typeof value.iPartMember).toBe("boolean");
    expect(typeof value.hasIMate).toBe("boolean");
    expect(typeof value.hasILogic).toBe("boolean");
  });

  it("mock fixture partNumber is JM-MOCK-001", async () => {
    const { value } = await bridge.getParameters();
    expect(value.partNumber).toBe("JM-MOCK-001");
  });
});

// ── getModelTree ─────────────────────────────────────────────────────────────

describe("getModelTree()", () => {
  it("returns InventorModelTree shape", async () => {
    const result = await bridge.getModelTree();
    expect(result.value).toBeDefined();
    expect(typeof result.value.rootName).toBe("string");
    expect(typeof result.value.fileType).toBe("string");
    expect(typeof result.value.featureCount).toBe("number");
    expect(Array.isArray(result.value.features)).toBe(true);
    expect(Array.isArray(result.value.components)).toBe(true);
  });

  it("mock returns 4 features", async () => {
    const { value } = await bridge.getModelTree();
    expect(value.featureCount).toBe(4);
    expect(value.features).toHaveLength(4);
  });

  it("each feature has index/name/type/suppressed/healthStatus/children", async () => {
    const { value } = await bridge.getModelTree();
    for (const f of value.features) {
      expect(f).toHaveProperty("index");
      expect(f).toHaveProperty("name");
      expect(f).toHaveProperty("type");
      expect(typeof f.suppressed).toBe("boolean");
      expect(["healthy", "warning", "error", "unknown"]).toContain(f.healthStatus);
      expect(Array.isArray(f.children)).toBe(true);
    }
  });

  it("mock fileType is ipt", async () => {
    const { value } = await bridge.getModelTree();
    expect(value.fileType).toBe("ipt");
  });
});

// ── exportSTEP ────────────────────────────────────────────────────────────────

describe("exportSTEP()", () => {
  it("returns exported=true with output path in mock", async () => {
    const result = await bridge.exportSTEP("C:/output/die.stp");
    expect(result.value.exported).toBe(true);
    expect(result.value.outputPath).toBe("C:/output/die.stp");
  });

  it("reports AP214 format", async () => {
    const { value } = await bridge.exportSTEP("C:/output/die.stp");
    expect(value.format).toBe("AP214");
  });

  it("confidence is 1.0 in mock", async () => {
    const result = await bridge.exportSTEP("/tmp/out.stp");
    expect(result.confidence).toBe(1.0);
  });
});

// ── getMassProperties ─────────────────────────────────────────────────────────

describe("getMassProperties()", () => {
  it("returns mass properties shape", async () => {
    const result = await bridge.getMassProperties();
    const mp = result.value;
    expect(typeof mp.mass).toBe("number");
    expect(typeof mp.volume).toBe("number");
    expect(Array.isArray(mp.centerOfMass)).toBe(true);
    expect(mp.centerOfMass).toHaveLength(3);
    expect(mp.momentsOfInertia).toBeDefined();
    expect(typeof mp.densityUsed).toBe("number");
  });

  it("moments of inertia has Ixx Iyy Izz Ixy Iyz Ixz", async () => {
    const { value } = await bridge.getMassProperties();
    const moi = value.momentsOfInertia;
    expect(typeof moi.Ixx).toBe("number");
    expect(typeof moi.Iyy).toBe("number");
    expect(typeof moi.Izz).toBe("number");
    expect(typeof moi.Ixy).toBe("number");
    expect(typeof moi.Iyz).toBe("number");
    expect(typeof moi.Ixz).toBe("number");
  });

  it("mock mass is positive", async () => {
    const { value } = await bridge.getMassProperties();
    expect(value.mass).toBeGreaterThan(0);
    expect(value.volume).toBeGreaterThan(0);
  });
});

// ── close ──────────────────────────────────────────────────────────────────────

describe("close()", () => {
  it("returns closed=true in mock", async () => {
    const result = await bridge.close();
    expect(result.value.closed).toBe(true);
    expect(result.confidence).toBe(1.0);
    expect(result.source).toBe("mock");
  });
});

// ── Full lifecycle (open → tree → STEP → close) ──────────────────────────────

describe("full lifecycle", () => {
  it("open → getParameters → getModelTree → exportSTEP → getMassProperties → close", async () => {
    const b = new (await import("../engines/InventorAutomationBridge.js")).InventorAutomationBridge();

    const opened = await b.open("C:/jmdie/die-block.ipt");
    expect(opened.value.opened).toBe(true);

    const params = await b.getParameters();
    expect(params.value.modelParameters.length).toBeGreaterThan(0);

    const tree = await b.getModelTree();
    expect(tree.value.featureCount).toBeGreaterThan(0);

    const step = await b.exportSTEP("C:/output/die-block.stp");
    expect(step.value.exported).toBe(true);

    const mass = await b.getMassProperties();
    expect(mass.value.mass).toBeGreaterThan(0);

    const closed = await b.close();
    expect(closed.value.closed).toBe(true);
  });

  it("completes full lifecycle in under 30 seconds", async () => {
    const start = Date.now();
    const b = new (await import("../engines/InventorAutomationBridge.js")).InventorAutomationBridge();
    await b.open("C:/parts/test.ipt");
    await b.getParameters();
    await b.getModelTree();
    await b.exportSTEP("C:/out/test.stp");
    await b.getMassProperties();
    await b.close();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(30_000);
  });
});

// ── AtomicValue structure ─────────────────────────────────────────────────────

describe("AtomicValue contract", () => {
  it("all methods return {value, confidence, source} shape", async () => {
    const b = new (await import("../engines/InventorAutomationBridge.js")).InventorAutomationBridge();
    const results = await Promise.all([
      b.open("x.ipt"),
      b.getParameters(),
      b.getModelTree(),
      b.exportSTEP("x.stp"),
      b.getMassProperties(),
      b.close(),
    ]);
    for (const r of results) {
      expect(r).toHaveProperty("value");
      expect(typeof r.confidence).toBe("number");
      expect(r.confidence).toBeGreaterThanOrEqual(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
      expect(typeof r.source).toBe("string");
      expect(r.source.length).toBeGreaterThan(0);
    }
  });
});

describe("InventorAutomationBridge — dispatcher wiring (camDispatcher.ts)", () => {
  const INV_AUTO_ACTIONS = [
    "cam_inventor_automation_open",
    "cam_inventor_automation_get_parameters",
    "cam_inventor_automation_get_model_tree",
    "cam_inventor_automation_export_step",
    "cam_inventor_automation_get_mass_properties",
    "cam_inventor_automation_close",
  ] as const;

  const ACTION_COUNT_EXPECTED = 6;

  const dispatcherPath = `${process.cwd()}/src/tools/dispatchers/camDispatcher.ts`.replace(/\\/g, "/");

  const readDispatcher = async (): Promise<string> => {
    const fs = await import("node:fs/promises");
    return fs.readFile(dispatcherPath, "utf-8");
  };

  it("registers all 6 cam_inventor_automation_* enum entries", async () => {
    const src = await readDispatcher();
    expect(INV_AUTO_ACTIONS.length).toBe(ACTION_COUNT_EXPECTED);
    for (const action of INV_AUTO_ACTIONS) {
      expect(src).toContain(`"${action}"`);
    }
  });

  it("declares the _invAutoBridge singleton", async () => {
    const src = await readDispatcher();
    expect(src).toMatch(/_invAutoBridge\s*:\s*any/);
  });

  it("registers an invAutoBridge case in the lazy getter switch", async () => {
    const src = await readDispatcher();
    const re =
      /case\s+"invAutoBridge"\s*:\s*return\s+_invAutoBridge\s*\?\?=\s*\(await\s+import\(\s*"\.\.\/\.\.\/engines\/InventorAutomationBridge\.js"\s*\)\)\.inventorAutomationBridge/;
    expect(re.test(src)).toBe(true);
  });

  it("declares matching case statements for every action", async () => {
    const src = await readDispatcher();
    for (const action of INV_AUTO_ACTIONS) {
      const re = new RegExp(`case\\s+"${action}"\\s*:`);
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body resolves the engine via getEngine(\"invAutoBridge\")", async () => {
    const src = await readDispatcher();
    for (const action of INV_AUTO_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?getEngine\\("invAutoBridge"\\)[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("every case body awaits the async engine call", async () => {
    const src = await readDispatcher();
    const ASYNC_PATTERNS: Record<string, RegExp> = {
      "cam_inventor_automation_open": /await\s+engine\.open\(/,
      "cam_inventor_automation_get_parameters": /await\s+engine\.getParameters\(/,
      "cam_inventor_automation_get_model_tree": /await\s+engine\.getModelTree\(/,
      "cam_inventor_automation_export_step": /await\s+engine\.exportSTEP\(/,
      "cam_inventor_automation_get_mass_properties": /await\s+engine\.getMassProperties\(/,
      "cam_inventor_automation_close": /await\s+engine\.close\(/,
    };
    for (const [action, pattern] of Object.entries(ASYNC_PATTERNS)) {
      const re = new RegExp(`case\\s+"${action}"\\s*:[\\s\\S]*?break;`);
      const body = src.match(re)?.[0] ?? "";
      expect(body).toMatch(pattern);
    }
  });

  it("open case accepts file_path|filePath fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_automation_open"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toMatch(/params\.file_path\s*\?\?\s*params\.filePath/);
    expect(body).toContain("opened");
  });

  it("export_step case accepts output_path|outputPath fallback", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_automation_export_step"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toMatch(/params\.output_path\s*\?\?\s*params\.outputPath/);
    expect(body).toContain("exported");
  });

  it("each case sets result.success to true (consistent dispatcher contract)", async () => {
    const src = await readDispatcher();
    for (const action of INV_AUTO_ACTIONS) {
      const re = new RegExp(
        `case\\s+"${action}"\\s*:[\\s\\S]*?success:\\s*true[\\s\\S]*?break;`,
      );
      expect(re.test(src)).toBe(true);
    }
  });

  it("close case is idempotent — has no required parameters", async () => {
    const src = await readDispatcher();
    const re = /case\s+"cam_inventor_automation_close"\s*:[\s\S]*?break;/;
    const body = src.match(re)?.[0] ?? "";
    expect(body).toContain("await engine.close()");
    expect(body).toContain("closed");
  });
});
