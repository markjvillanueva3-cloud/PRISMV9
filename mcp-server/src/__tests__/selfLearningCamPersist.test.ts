// @ts-nocheck
/**
 * SelfLearningCAMEngine durable-persistence tests (U1: closed-loop boundary).
 *
 * Verifies the persistence boundary that makes CAM self-learning actually
 * *closed* across process restarts: learn -> saveState -> reload into a fresh
 * instance -> identical learned state. Plus the fail-loud / never-clobber
 * invariants modelled on the 2026-06-08 tribal-index fail-open clobber lesson.
 *
 * Under vitest IN_TEST is true, so constructor auto-load and autoPersist are
 * disabled; these tests drive saveState/loadState explicitly with a temp path.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SelfLearningCAMEngine } from "../engines/SelfLearningCAMEngine.js";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdtempSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

/** Fixed timestamp for deterministic observations (no Date.now in fixtures). */
const TEST_EPOCH_MS = 1_700_000_000_000;
/** Actual cutting force (N) seen on the floor; intentionally above the
 *  prediction so the Kienzle posterior measurably moves off the literature prior. */
const BASE_FORCE_ACTUAL_N = 1200;
/** PRISM-predicted cutting force (N) before machining. */
const BASE_FORCE_PRED_N = 1000;

/** A real-shaped machining observation with a consistent force residual. */
function makeObs(forceActual = BASE_FORCE_ACTUAL_N, forcePred = BASE_FORCE_PRED_N) {
  return {
    jobId: "jmd-test-001",
    machineId: "VMC-01",
    materialGroup: "P" as const,
    materialName: "4140",
    strategy: "adaptive_rough",
    geometryClass: "pocket",
    cuttingParams: {
      speed_mpm: 120,
      feed_mmtooth: 0.1,
      axial_depth_mm: 3,
      radial_depth_mm: 6,
      tool_diameter_mm: 12,
    },
    actuals: { force_N: forceActual, surface_finish_Ra_um: 1.2, tool_life_min: 45 },
    predicted: { force_N: forcePred, surface_finish_Ra_um: 1.0, tool_life_min: 50 },
    timestamp: TEST_EPOCH_MS,
  };
}

/** The P-group Kienzle priors of a never-trained engine (literature defaults). */
function literaturePriorsP() {
  return new SelfLearningCAMEngine().exportState().materialPriors.P;
}

describe("SelfLearningCAMEngine durable persistence (closed-loop boundary)", () => {
  let dir: string;
  let statePath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cam-learn-"));
    statePath = join(dir, "learned-cam-state.json");
  });
  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort temp cleanup */
    }
  });

  it("round-trips learned state: learn -> save -> fresh instance -> load -> identical", () => {
    const learner = new SelfLearningCAMEngine();
    const FORCE_STEP_N = 20;
    for (let i = 0; i < 5; i++) {
      learner.cutToLearn({ observations: [makeObs(BASE_FORCE_ACTUAL_N + i * FORCE_STEP_N, BASE_FORCE_PRED_N)] });
    }

    const saved = learner.saveState(statePath);
    expect(saved.ok).toBe(true);
    expect(saved.records).toBeGreaterThan(0);
    expect(existsSync(statePath)).toBe(true);

    const onDisk = JSON.parse(readFileSync(statePath, "utf8"));
    expect(onDisk.schemaVersion).toBe("1.0.0");
    expect(onDisk.savedAt).toMatch(/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(onDisk.records).toBe(saved.records);
    // The persisted P-group is real learning, not the literature prior.
    expect(onDisk.state.materialPriors.P).not.toEqual(literaturePriorsP());

    // A fresh engine starts at literature priors -> demonstrably different.
    const fresh = new SelfLearningCAMEngine();
    expect(fresh.exportState().materialPriors.P).not.toEqual(learner.exportState().materialPriors.P);

    const res = fresh.loadState(statePath);
    expect(res.loaded).toBe(true);

    // After load, fresh reproduces the learner's state exactly.
    expect(fresh.exportState()).toEqual(learner.exportState());
    expect(fresh.exportState().materialPriors.P).toEqual(learner.exportState().materialPriors.P);
  });

  it("absent file is a clean cold start (no clobber, priors intact)", () => {
    const e = new SelfLearningCAMEngine();
    const before = JSON.stringify(e.exportState().materialPriors);
    const res = e.loadState(join(dir, "does-not-exist.json"));
    expect(res.loaded).toBe(false);
    expect(res.reason).toBe("no-file");
    expect(JSON.stringify(e.exportState().materialPriors)).toBe(before);
  });

  it("FAILS LOUD on a corrupt file and does NOT reset learned state to empty", () => {
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });
    const learned = JSON.stringify(e.exportState().materialPriors);

    writeFileSync(statePath, "{ this is not valid json ");
    const res = e.loadState(statePath);
    expect(res.loaded).toBe(false);
    expect(res.reason).toBe("corrupt-json");

    // The anti-clobber invariant: learned posteriors survive a corrupt load.
    expect(JSON.stringify(e.exportState().materialPriors)).toBe(learned);
  });

  it("rejects a file with no .state envelope", () => {
    const e = new SelfLearningCAMEngine();
    writeFileSync(statePath, JSON.stringify({ schemaVersion: "1.0.0", savedAt: "x" }));
    const res = e.loadState(statePath);
    expect(res.loaded).toBe(false);
    expect(res.reason).toBe("no-state-envelope");
  });

  it("clobber-guard: a corrupt file is preserved aside on next save, never silently overwritten", () => {
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });

    writeFileSync(statePath, "%%% corrupt %%%");
    expect(e.loadState(statePath).reason).toBe("corrupt-json"); // marks _loadCorrupt

    const saved = e.saveState(statePath);
    expect(saved.ok).toBe(true);

    // The corrupt original was renamed aside (recoverable), not destroyed.
    const preserved = readdirSync(dir).filter((f) => f.includes(".corrupt-"));
    expect(preserved.length).toBe(1);

    // The freshly written file is valid and reloadable.
    const reborn = new SelfLearningCAMEngine();
    expect(reborn.loadState(statePath).loaded).toBe(true);
  });

  it("accepts an older schemaVersion (N-1 tolerance)", () => {
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });
    e.saveState(statePath);

    const doc = JSON.parse(readFileSync(statePath, "utf8"));
    doc.schemaVersion = "0.9.0";
    writeFileSync(statePath, JSON.stringify(doc));

    const fresh = new SelfLearningCAMEngine();
    expect(fresh.loadState(statePath).loaded).toBe(true);
  });

  it("exposes save_state / load_state through the calculate() dispatch path", () => {
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });

    const save = e.calculate("save_state", { path: statePath });
    expect(save.ok).toBe(true);
    expect(existsSync(statePath)).toBe(true);

    const fresh = new SelfLearningCAMEngine();
    const load = fresh.calculate("load_state", { path: statePath });
    expect(load.loaded).toBe(true);
    expect(fresh.exportState().materialPriors.P).toEqual(e.exportState().materialPriors.P);
  });
});

describe("SelfLearningCAMEngine production auto-persist / auto-load path", () => {
  const ENV_KEYS = ["PRISM_CAM_LEARN_AUTOSAVE", "PRISM_CAM_LEARN_STATE_PATH", "PRISM_CAM_LEARN_FORCE_LOAD"];
  let dir: string;
  let statePath: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "cam-learn-prod-"));
    statePath = join(dir, "learned-cam-state.json");
    savedEnv = {};
    for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  });
  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort temp cleanup */
    }
  });

  it("auto-persists from inside cutToLearn when autosave is enabled (the production path)", () => {
    process.env.PRISM_CAM_LEARN_AUTOSAVE = "1";
    process.env.PRISM_CAM_LEARN_STATE_PATH = statePath;
    const e = new SelfLearningCAMEngine();
    expect(existsSync(statePath)).toBe(false); // nothing written before any learning
    e.cutToLearn({ observations: [makeObs()] }); // NO explicit saveState
    expect(existsSync(statePath)).toBe(true); // autoPersist fired from inside cutToLearn
    const onDisk = JSON.parse(readFileSync(statePath, "utf8"));
    expect(onDisk.state.materialPriors.P).not.toEqual(literaturePriorsP());
  });

  it("auto-loads persisted state in the constructor (learning survives a simulated restart)", () => {
    // Capture the literature baseline BEFORE any FORCE_LOAD/STATE_PATH env is set,
    // otherwise the baseline engine would itself auto-load the persisted file.
    const literatureP = literaturePriorsP();

    process.env.PRISM_CAM_LEARN_AUTOSAVE = "1";
    process.env.PRISM_CAM_LEARN_STATE_PATH = statePath;
    const first = new SelfLearningCAMEngine();
    first.cutToLearn({ observations: [makeObs()] });
    expect(existsSync(statePath)).toBe(true);

    // A fresh process (simulated) auto-loads on construction.
    process.env.PRISM_CAM_LEARN_FORCE_LOAD = "1";
    const reborn = new SelfLearningCAMEngine();
    expect(reborn.exportState().materialPriors.P).toEqual(first.exportState().materialPriors.P);
    expect(reborn.exportState().materialPriors.P).not.toEqual(literatureP);
  });

  it("PRISM_CAM_LEARN_AUTOSAVE=0 hard-disables auto-persist (runtime knob, not frozen at import)", () => {
    process.env.PRISM_CAM_LEARN_AUTOSAVE = "0";
    process.env.PRISM_CAM_LEARN_STATE_PATH = statePath;
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });
    expect(existsSync(statePath)).toBe(false);
  });

  it("refuses an unsupported (future) schemaVersion instead of importing blind", () => {
    const e = new SelfLearningCAMEngine();
    e.cutToLearn({ observations: [makeObs()] });
    e.saveState(statePath);

    const doc = JSON.parse(readFileSync(statePath, "utf8"));
    doc.schemaVersion = "99.0.0";
    writeFileSync(statePath, JSON.stringify(doc));

    const res = new SelfLearningCAMEngine().loadState(statePath);
    expect(res.loaded).toBe(false);
    expect(res.reason).toBe("unsupported-schema");
  });
});
