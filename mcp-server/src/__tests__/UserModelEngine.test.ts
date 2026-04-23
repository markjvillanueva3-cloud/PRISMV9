/**
 * UserModelEngine — dedicated per-engine test file (U-FORE-04 helper).
 *
 * The canonical behavior tests live in BuildAdvisorEngine.test.ts where
 * UserModelEngine is exercised alongside its consumers. This file exists
 * so the wiring-enforcement hook detects matching coverage at the
 * expected filename.
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  UserModelEngine,
  userModelEngine,
  USER_MODEL_DEFAULT,
} from "../engines/UserModelEngine.js";

function fresh(): UserModelEngine {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-ded-"));
  return new UserModelEngine(path.join(tmp, "USER_MODEL.json"));
}

describe("UserModelEngine — defaults + lifecycle", () => {
  it("exports a singleton instance with correct class + name", () => {
    expect(userModelEngine).toBeInstanceOf(UserModelEngine);
    expect(userModelEngine.name).toBe("UserModelEngine");
  });

  it("first load returns schemaVersion 1 defaults", () => {
    const um = fresh();
    const m = um.load();
    expect(m.schemaVersion).toBe(1);
    expect(m.developer_experience).toBe("unknown");
    expect(m.edit_history).toEqual([]);
  });

  it("update() merges partial fields + updates timestamp", () => {
    const um = fresh();
    const before = Date.now();
    const m = um.update({ verbosity_preference: "verbose" });
    expect(m.verbosity_preference).toBe("verbose");
    expect(m.updated_at).toBeGreaterThanOrEqual(before);
  });

  it("setExperience persists + survives reload", () => {
    const um = fresh();
    um.setExperience("intermediate");
    const reloaded = um.reload();
    expect(reloaded.developer_experience).toBe("intermediate");
  });

  it("recordEdit appends entries and caps at 200", () => {
    const um = fresh();
    for (let i = 0; i < 250; i++) um.recordEdit("engine", i % 5 === 0 ? "revert" : "ok");
    expect(um.load().edit_history.length).toBe(200);
  });

  it("inferExperience returns 'new' when <20 edits logged", () => {
    const um = fresh();
    for (let i = 0; i < 5; i++) um.recordEdit("engine", "ok");
    expect(um.inferExperience()).toBe("new");
  });

  it("inferExperience returns 'expert' on low revert ratio", () => {
    const um = fresh();
    for (let i = 0; i < 50; i++) um.recordEdit("engine", "ok");
    expect(um.inferExperience()).toBe("expert");
  });

  it("inferExperience returns 'new' on high revert ratio", () => {
    const um = fresh();
    for (let i = 0; i < 30; i++) um.recordEdit("engine", i % 3 === 0 ? "revert" : "ok");
    expect(um.inferExperience()).toBe("new");
  });

  it("reset() clears persisted state back to defaults", () => {
    const um = fresh();
    um.setExperience("expert");
    um.reset();
    const m = um.load();
    expect(m.developer_experience).toBe(USER_MODEL_DEFAULT.developer_experience);
  });

  it("recordEdit includes timestamp and kind on each entry", () => {
    const um = fresh();
    um.recordEdit("test", "ok");
    const last = um.load().edit_history[0];
    expect(last.kind).toBe("test");
    expect(last.outcome).toBe("ok");
    expect(typeof last.ts).toBe("number");
  });

  it("handles corrupt JSON on disk by falling back to defaults", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-bad-"));
    const p = path.join(tmp, "USER_MODEL.json");
    fs.writeFileSync(p, "not-json", "utf-8");
    const um = new UserModelEngine(p);
    expect(um.load().developer_experience).toBe("unknown");
  });

  it("writeAtomic creates nested directories when missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-nest-"));
    const deep = path.join(tmp, "a", "b", "c", "USER_MODEL.json");
    const um = new UserModelEngine(deep);
    um.setExperience("new");
    expect(fs.existsSync(deep)).toBe(true);
  });
});
