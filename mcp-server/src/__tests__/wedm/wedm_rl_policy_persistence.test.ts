/**
 * WEDMRLPolicyPersistence tests — WEDM AGI Phase 3 / P3-MS3 / U-P3-13.
 *
 * Covers:
 *  - Envelope schema (schemaVersion, generatedAt, description, policy)
 *  - Save / load round-trip (policy survives across engine instances)
 *  - Validation rejections for malformed files
 *  - Seed file integrity at data/state/WEDM_RL_POLICY.json
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WEDMRLPolicyFile,
  WEDM_RL_POLICY_FILENAME,
  WEDM_RL_POLICY_SCHEMA_VERSION,
  defaultPolicyPath,
  loadWEDMRLPolicy,
  readWEDMRLPolicyFile,
  saveWEDMRLPolicy,
} from "../../engines/WEDMRLPolicyPersistence.js";
import {
  WEDMRLControllerEngine,
  WEDM_RL_ACTIONS,
  type RLAction,
} from "../../engines/WEDMRLControllerEngine.js";
import type {
  UnknownMaterialFeatures,
  WEDMCutTarget,
  WEDMRecipe,
} from "../../engines/WEDMFewShotEngine.js";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const D2_FEATURES: UnknownMaterialFeatures = {
  label: "D2",
  hardness_HRC: 60,
  thermal_conductivity_W_per_mK: 20,
  melting_point_C: 1420,
  density_g_per_cm3: 7.7,
  iso_group: "P",
};

const TARGET: WEDMCutTarget = { target_ra_um: 2.5, target_mrr_mm3_per_min: 18 };

const BASE_RECIPE: WEDMRecipe = {
  peak_current_A: 8,
  pulse_on_us: 10,
  pulse_off_us: 40,
  wire_tension_N: 10,
};

function tmpFile(): string {
  return path.join(
    os.tmpdir(),
    `wedm-rl-policy-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
  );
}

function actionById(id: string): RLAction {
  const a = WEDM_RL_ACTIONS.find((x) => x.id === id);
  if (!a) throw new Error(`unknown action id: ${id}`);
  return a;
}

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe("WEDMRLPolicyPersistence — constants", () => {
  it("schema version is 1", () => {
    expect(WEDM_RL_POLICY_SCHEMA_VERSION).toBe(1);
  });

  it("filename matches convention", () => {
    expect(WEDM_RL_POLICY_FILENAME).toBe("WEDM_RL_POLICY.json");
  });

  it("defaultPolicyPath points into data/state", () => {
    const p = defaultPolicyPath();
    expect(p).toMatch(/WEDM_RL_POLICY\.json$/);
    expect(p).toMatch(/state/);
  });
});

describe("WEDMRLPolicyPersistence — seed file at data/state/", () => {
  const SEED_PATH = path.join(
    process.cwd(),
    "data",
    "state",
    "WEDM_RL_POLICY.json",
  );

  it("seed file exists and is valid JSON", () => {
    expect(fs.existsSync(SEED_PATH)).toBe(true);
    const raw = fs.readFileSync(SEED_PATH, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("seed file has the expected envelope", () => {
    const file = readWEDMRLPolicyFile(SEED_PATH)!;
    expect(file.schemaVersion).toBe(1);
    expect(typeof file.generatedAt).toBe("string");
    expect(file.description).toMatch(/WEDM RL/i);
    expect(file.policy.dim).toBe(9);
    expect(file.policy.version).toBe(0);
  });

  it("seed file has 9 arms with zero pulls", () => {
    const file = readWEDMRLPolicyFile(SEED_PATH)!;
    expect(Object.keys(file.policy.pulls).length).toBe(9);
    for (const id of Object.keys(file.policy.pulls)) {
      expect(file.policy.pulls[id]).toBe(0);
    }
  });

  it("seed file has θ = 0 across every arm (cold-start)", () => {
    const file = readWEDMRLPolicyFile(SEED_PATH)!;
    for (const id of Object.keys(file.policy.theta)) {
      expect(file.policy.theta[id]).toHaveLength(9);
      for (const v of file.policy.theta[id]) expect(v).toBeCloseTo(0, 8);
    }
  });
});

describe("WEDMRLPolicyPersistence — save / load round-trip", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  });

  it("save() writes a valid envelope to disk", async () => {
    const engine = new WEDMRLControllerEngine();
    await saveWEDMRLPolicy(engine, tmp);
    const raw = fs.readFileSync(tmp, "utf-8");
    const file = JSON.parse(raw) as WEDMRLPolicyFile;
    expect(file.schemaVersion).toBe(1);
    expect(file.policy.dim).toBe(9);
  });

  it("generatedAt is an ISO timestamp of roughly now", async () => {
    const engine = new WEDMRLControllerEngine();
    const before = Date.now();
    await saveWEDMRLPolicy(engine, tmp);
    const file = JSON.parse(fs.readFileSync(tmp, "utf-8")) as WEDMRLPolicyFile;
    const parsed = Date.parse(file.generatedAt);
    const after = Date.now();
    expect(parsed).toBeGreaterThanOrEqual(before - 1);
    expect(parsed).toBeLessThanOrEqual(after + 1);
  });

  it("save → load roundtrip preserves pulls and version", async () => {
    const a = new WEDMRLControllerEngine();
    const state = {
      features: D2_FEATURES,
      target: TARGET,
      lastRecipe: BASE_RECIPE,
    };
    // Pull one arm 3 times.
    for (let i = 0; i < 3; i++) {
      a.update(state, actionById("Ip+0_Ton+0"), 0.7);
    }
    await saveWEDMRLPolicy(a, tmp);

    const b = new WEDMRLControllerEngine();
    loadWEDMRLPolicy(b, tmp);
    const restored = b.snapshot();
    expect(restored.version).toBe(3);
    expect(restored.pulls["Ip+0_Ton+0"]).toBe(3);
    expect(restored.meanReward["Ip+0_Ton+0"]).toBeCloseTo(0.7, 4);
  });

  it("load() returns null when the file does not exist", () => {
    const engine = new WEDMRLControllerEngine();
    const absent = path.join(os.tmpdir(), "does-not-exist-WEDM_RL_POLICY.json");
    expect(loadWEDMRLPolicy(engine, absent)).toBeNull();
  });

  it("readWEDMRLPolicyFile() returns null when the file does not exist", () => {
    const absent = path.join(os.tmpdir(), "does-not-exist-WEDM_RL_POLICY.json");
    expect(readWEDMRLPolicyFile(absent)).toBeNull();
  });
});

describe("WEDMRLPolicyPersistence — validation", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  });

  it("rejects malformed JSON (not a JSON object)", () => {
    fs.writeFileSync(tmp, "null", "utf-8");
    const engine = new WEDMRLControllerEngine();
    expect(() => loadWEDMRLPolicy(engine, tmp)).toThrow();
  });

  it("rejects files with wrong schemaVersion", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 999,
        generatedAt: new Date().toISOString(),
        description: "bogus",
        policy: { dim: 9, version: 0, pulls: {}, meanReward: {}, alpha: 1, lambda: 1, theta: {} },
      }),
      "utf-8",
    );
    const engine = new WEDMRLControllerEngine();
    expect(() => loadWEDMRLPolicy(engine, tmp)).toThrow(/schemaVersion/i);
  });

  it("rejects files missing the policy object", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        description: "bogus",
      }),
      "utf-8",
    );
    const engine = new WEDMRLControllerEngine();
    expect(() => loadWEDMRLPolicy(engine, tmp)).toThrow(/policy/i);
  });

  it("rejects a policy with mismatched context dim", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        description: "bogus",
        policy: {
          dim: 42, // wrong
          version: 0,
          pulls: {},
          meanReward: {},
          alpha: 1,
          lambda: 1,
          theta: {},
        },
      }),
      "utf-8",
    );
    const engine = new WEDMRLControllerEngine();
    expect(() => loadWEDMRLPolicy(engine, tmp)).toThrow(/dim/i);
  });

  it("rejects missing generatedAt", () => {
    fs.writeFileSync(
      tmp,
      JSON.stringify({
        schemaVersion: 1,
        description: "no timestamp",
        policy: { dim: 9, version: 0, pulls: {}, meanReward: {}, alpha: 1, lambda: 1, theta: {} },
      }),
      "utf-8",
    );
    const engine = new WEDMRLControllerEngine();
    expect(() => loadWEDMRLPolicy(engine, tmp)).toThrow(/generatedAt/i);
  });
});

describe("WEDMRLPolicyPersistence — write semantics", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = tmpFile();
  });

  afterEach(() => {
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  });

  it("save() creates parent directory if missing", async () => {
    const nested = path.join(os.tmpdir(), `wedm-rl-${Date.now()}`, "nested", "WEDM_RL_POLICY.json");
    const engine = new WEDMRLControllerEngine();
    await saveWEDMRLPolicy(engine, nested);
    expect(fs.existsSync(nested)).toBe(true);
    // cleanup
    fs.unlinkSync(nested);
    fs.rmdirSync(path.dirname(nested));
    fs.rmdirSync(path.dirname(path.dirname(nested)));
  });

  it("save() is overwrite-safe (can be called repeatedly)", async () => {
    const engine = new WEDMRLControllerEngine();
    await saveWEDMRLPolicy(engine, tmp);
    const firstSize = fs.statSync(tmp).size;
    await saveWEDMRLPolicy(engine, tmp);
    const secondSize = fs.statSync(tmp).size;
    expect(Math.abs(firstSize - secondSize)).toBeLessThan(200); // timestamp drift only
  });

  it("save() returns the path it wrote to", async () => {
    const engine = new WEDMRLControllerEngine();
    const out = await saveWEDMRLPolicy(engine, tmp);
    expect(out).toBe(tmp);
  });
});
