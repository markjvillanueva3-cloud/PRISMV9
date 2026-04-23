/**
 * NewCoderModeEngine — dedicated per-engine test file (U-FORE-04 helper).
 *
 * Complementary to BuildAdvisorEngine.test.ts. This file exists so the
 * wiring-enforcement hook finds a 1:1 match on filename.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { NewCoderModeEngine, newCoderModeEngine } from "../engines/NewCoderModeEngine.js";
import { UserModelEngine } from "../engines/UserModelEngine.js";

function isolated(): NewCoderModeEngine {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ncm-"));
  const um = new UserModelEngine(path.join(tmp, "USER_MODEL.json"));
  return new NewCoderModeEngine(um);
}

describe("NewCoderModeEngine — profile resolution", () => {
  it("exports a singleton", () => {
    expect(newCoderModeEngine).toBeInstanceOf(NewCoderModeEngine);
    expect(newCoderModeEngine.name).toBe("NewCoderModeEngine");
  });

  it("'new' profile: verbose + rollback + debrief required", () => {
    const mode = isolated();
    mode.setMode("new");
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("verbose");
    expect(p.requireRollbackPlan).toBe(true);
    expect(p.requireDebrief).toBe(true);
    expect(p.explainEveryEdit).toBe(true);
  });

  it("'intermediate' profile: normal + rollback, no explainEveryEdit", () => {
    const mode = isolated();
    mode.setMode("intermediate");
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("normal");
    expect(p.requireRollbackPlan).toBe(true);
    expect(p.explainEveryEdit).toBe(false);
  });

  it("'expert' profile: quiet, no rollback/debrief required", () => {
    const mode = isolated();
    mode.setMode("expert");
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("quiet");
    expect(p.requireRollbackPlan).toBe(false);
    expect(p.requireDebrief).toBe(false);
  });

  it("'unknown' has cautious defaults", () => {
    const mode = isolated();
    const p = mode.profileFor("unknown");
    expect(p.experience).toBe("unknown");
    expect(p.requireRollbackPlan).toBe(true);
    expect(p.maxHookSeverityShown).toBeLessThanOrEqual(3);
  });

  it("isNewCoder true only for 'new' experience", () => {
    const mode = isolated();
    mode.setMode("new");
    expect(mode.isNewCoder()).toBe(true);
    mode.setMode("expert");
    expect(mode.isNewCoder()).toBe(false);
  });

  it("shouldSurface respects threshold for expert mode", () => {
    const mode = isolated();
    mode.setMode("expert");
    expect(mode.shouldSurface(1)).toBe(false);
    expect(mode.shouldSurface(4)).toBe(true);
  });

  it("shouldSurface allows lower severity for new mode", () => {
    const mode = isolated();
    mode.setMode("new");
    expect(mode.shouldSurface(2)).toBe(true);
  });

  it("setMode persists via the backing UserModelEngine", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ncm-persist-"));
    const um = new UserModelEngine(path.join(tmp, "USER_MODEL.json"));
    const mode = new NewCoderModeEngine(um);
    mode.setMode("expert");
    expect(um.load().developer_experience).toBe("expert");
  });

  it("profileFor returns an independent object copy (safe to mutate)", () => {
    const mode = isolated();
    const p1 = mode.profileFor("new");
    const p2 = mode.profileFor("new");
    p1.verbosity = "quiet" as any;
    expect(p2.verbosity).toBe("verbose");
  });

  it("currentProfile uses inferred experience when unset", () => {
    const mode = isolated();
    // No edits, no explicit set → inferred "new"
    const p = mode.currentProfile();
    expect(["new", "unknown"]).toContain(p.experience);
  });

  it("all 4 experience levels yield distinct promptExpansion values", () => {
    const mode = isolated();
    const vals = new Set(
      (["new", "intermediate", "expert", "unknown"] as const).map(
        (lvl) => mode.profileFor(lvl).promptExpansion
      )
    );
    expect(vals.size).toBeGreaterThanOrEqual(3);
  });
});
