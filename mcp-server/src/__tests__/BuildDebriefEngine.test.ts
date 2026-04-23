/**
 * BuildDebriefEngine — dedicated per-engine test file (U-FORE-04 helper).
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { BuildDebriefEngine } from "../engines/BuildDebriefEngine.js";
import { NewCoderModeEngine } from "../engines/NewCoderModeEngine.js";
import { UserModelEngine } from "../engines/UserModelEngine.js";

function fresh() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bde-"));
  const um = new UserModelEngine(path.join(tmp, "USER_MODEL.json"));
  const mode = new NewCoderModeEngine(um);
  const engine = new BuildDebriefEngine(mode, path.join(tmp, "log.jsonl"));
  return { engine, mode, logPath: path.join(tmp, "log.jsonl") };
}

describe("BuildDebriefEngine — output shape + persistence", () => {
  it("debriefFor returns all required sections", () => {
    const { engine } = fresh();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "did the thing",
      filesCreated: ["src/engines/FooEngine.ts"],
    });
    expect(d.unitId).toBe("U-X");
    expect(d.whatChanged.length).toBeGreaterThan(0);
    expect(d.whyItChanged).toContain("did the thing");
  });

  it("expert mode renders one-liner only", () => {
    const { engine, mode } = fresh();
    mode.setMode("expert");
    const d = engine.debriefFor({ unitId: "U-X", summary: "shipped" });
    expect(engine.render(d)).toBe(d.oneLiner);
  });

  it("new mode renders multi-line long-form", () => {
    const { engine, mode } = fresh();
    mode.setMode("new");
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "added engine",
      filesCreated: ["src/engines/FooEngine.ts"],
    });
    const text = engine.render(d);
    expect(text.split("\n").length).toBeGreaterThan(3);
    expect(text).toContain("What changed");
  });

  it("new engine file flags couldBreak", () => {
    const { engine } = fresh();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "new",
      filesCreated: ["src/engines/FooEngine.ts"],
    });
    expect(d.couldBreak.some((c) => /downstream/i.test(c))).toBe(true);
  });

  it("dispatcher modification flags couldBreak", () => {
    const { engine } = fresh();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "wired",
      filesModified: ["src/tools/dispatchers/devDispatcher.ts"],
    });
    expect(d.couldBreak.some((c) => /Dispatcher/.test(c))).toBe(true);
  });

  it("failing tests surface in couldBreak", () => {
    const { engine } = fresh();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "partial",
      testsPassed: 8,
      testsTotal: 10,
    });
    expect(d.couldBreak.some((c) => /failing/i.test(c))).toBe(true);
  });

  it("persists JSONL and recent() reads newest first", () => {
    const { engine, logPath } = fresh();
    engine.debriefFor({ unitId: "U-A", summary: "a" });
    engine.debriefFor({ unitId: "U-B", summary: "b" });
    expect(fs.existsSync(logPath)).toBe(true);
    const recent = engine.recent(2);
    expect(recent[0].unitId).toBe("U-B");
  });

  it("recent() returns [] when log missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bde-empty-"));
    const um = new UserModelEngine(path.join(tmp, "UM.json"));
    const e = new BuildDebriefEngine(new NewCoderModeEngine(um), path.join(tmp, "missing.jsonl"));
    expect(e.recent()).toEqual([]);
  });

  it("recent() skips malformed rows", () => {
    const { engine, logPath } = fresh();
    engine.debriefFor({ unitId: "U-GOOD", summary: "ok" });
    fs.appendFileSync(logPath, "\n{{{broken\n", "utf-8");
    expect(engine.recent(5).some((r) => r.unitId === "U-GOOD")).toBe(true);
  });

  it("oneLiner includes partial commit sha when provided", () => {
    const { engine } = fresh();
    const d = engine.debriefFor({ unitId: "U-X", summary: "s", commitSha: "abcdef1234" });
    expect(d.oneLiner).toContain("abcdef1");
  });

  it("FAIL: missing unitId throws", () => {
    const { engine } = fresh();
    expect(() =>
      engine.debriefFor({ summary: "x" } as any)
    ).toThrow(/unitId required/);
  });

  it("FAIL: empty summary throws", () => {
    const { engine } = fresh();
    expect(() =>
      engine.debriefFor({ unitId: "U-X", summary: "" } as any)
    ).toThrow(/summary required/);
  });
});
