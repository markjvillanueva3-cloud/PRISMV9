/**
 * U-FORE-04 tests — UserModelEngine + NewCoderModeEngine +
 *                   BuildAdvisorEngine + BuildDebriefEngine
 *
 * Coverage floor per engine: happy path + ≥3 failure modes + ≥2 adversarial.
 * Variability: exercises all 4 DeveloperExperience levels
 * (new / intermediate / expert / unknown) through the advisor + debrief
 * so the mode-to-output mapping is stable.
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  UserModelEngine,
  USER_MODEL_DEFAULT,
  type DeveloperExperience,
} from "../engines/UserModelEngine.js";
import { NewCoderModeEngine } from "../engines/NewCoderModeEngine.js";
import { BuildAdvisorEngine } from "../engines/BuildAdvisorEngine.js";
import { BuildDebriefEngine } from "../engines/BuildDebriefEngine.js";

function freshUserModel(): UserModelEngine {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-"));
  return new UserModelEngine(path.join(tmp, "USER_MODEL.json"));
}

function freshDebriefLog(): { engine: BuildDebriefEngine; logPath: string; mode: NewCoderModeEngine } {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "debrief-"));
  const logPath = path.join(tmp, "log.jsonl");
  const user = freshUserModel();
  const mode = new NewCoderModeEngine(user);
  return { engine: new BuildDebriefEngine(mode, logPath), logPath, mode };
}

// ─── UserModelEngine ────────────────────────────────────────────────

describe("UserModelEngine — persistence + inference", () => {
  it("returns defaults on first load", () => {
    const um = freshUserModel();
    const m = um.load();
    expect(m.schemaVersion).toBe(1);
    expect(m.developer_experience).toBe("unknown");
    expect(m.edit_history).toEqual([]);
  });

  it("update() merges and persists atomically", () => {
    const um = freshUserModel();
    um.update({ developer_experience: "new", verbosity_preference: "verbose" });
    const reloaded = um.reload();
    expect(reloaded.developer_experience).toBe("new");
    expect(reloaded.verbosity_preference).toBe("verbose");
    expect(reloaded.updated_at).toBeGreaterThan(0);
  });

  it("setExperience() overrides inference", () => {
    const um = freshUserModel();
    um.setExperience("expert");
    expect(um.inferExperience()).toBe("expert");
  });

  it("recordEdit caps history at 200", () => {
    const um = freshUserModel();
    for (let i = 0; i < 205; i++) um.recordEdit("engine", "ok");
    expect(um.load().edit_history.length).toBe(200);
  });

  it("infers 'new' with <20 edits", () => {
    const um = freshUserModel();
    for (let i = 0; i < 10; i++) um.recordEdit("engine", "ok");
    expect(um.inferExperience()).toBe("new");
  });

  it("infers 'expert' with many edits and low revert ratio", () => {
    const um = freshUserModel();
    for (let i = 0; i < 50; i++) um.recordEdit("engine", "ok");
    expect(um.inferExperience()).toBe("expert");
  });

  it("infers 'new' with high revert ratio", () => {
    const um = freshUserModel();
    for (let i = 0; i < 30; i++) um.recordEdit("engine", i % 3 === 0 ? "revert" : "ok");
    expect(um.inferExperience()).toBe("new");
  });

  it("infers 'intermediate' with moderate revert ratio", () => {
    const um = freshUserModel();
    for (let i = 0; i < 50; i++) um.recordEdit("engine", i % 10 === 0 ? "revert" : "ok");
    expect(um.inferExperience()).toBe("intermediate");
  });

  it("reset() restores defaults but keeps updated_at > 0", () => {
    const um = freshUserModel();
    um.setExperience("new");
    um.reset();
    const m = um.load();
    expect(m.developer_experience).toBe(USER_MODEL_DEFAULT.developer_experience);
    expect(m.updated_at).toBeGreaterThan(0);
  });

  it("ADV: survives corrupt JSON on disk", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-corrupt-"));
    const p = path.join(tmp, "USER_MODEL.json");
    fs.writeFileSync(p, "not-json-{{{", "utf-8");
    const um = new UserModelEngine(p);
    expect(um.load().developer_experience).toBe("unknown");
  });

  it("ADV: survives missing directory (writeAtomic creates it)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "um-mkdir-"));
    const deep = path.join(tmp, "a", "b", "c", "USER_MODEL.json");
    const um = new UserModelEngine(deep);
    um.setExperience("expert");
    expect(fs.existsSync(deep)).toBe(true);
  });
});

// ─── NewCoderModeEngine ─────────────────────────────────────────────

describe("NewCoderModeEngine — mode profile selection", () => {
  it("new → verbose, requires rollback + debrief", () => {
    const um = freshUserModel();
    um.setExperience("new");
    const mode = new NewCoderModeEngine(um);
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("verbose");
    expect(p.requireRollbackPlan).toBe(true);
    expect(p.requireDebrief).toBe(true);
    expect(p.explainEveryEdit).toBe(true);
    expect(mode.isNewCoder()).toBe(true);
  });

  it("expert → quiet, no rollback, no debrief required", () => {
    const um = freshUserModel();
    um.setExperience("expert");
    const mode = new NewCoderModeEngine(um);
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("quiet");
    expect(p.requireRollbackPlan).toBe(false);
    expect(p.requireDebrief).toBe(false);
    expect(mode.isNewCoder()).toBe(false);
  });

  it("intermediate → normal + rollback", () => {
    const um = freshUserModel();
    um.setExperience("intermediate");
    const mode = new NewCoderModeEngine(um);
    const p = mode.currentProfile();
    expect(p.verbosity).toBe("normal");
    expect(p.requireRollbackPlan).toBe(true);
  });

  it("unknown → cautious defaults", () => {
    const um = freshUserModel();
    const mode = new NewCoderModeEngine(um);
    // Inferred from empty history → "new" (because <20 edits)
    const p = mode.currentProfile();
    expect(["new", "unknown"]).toContain(p.experience);
  });

  it("shouldSurface respects severity threshold", () => {
    const um = freshUserModel();
    um.setExperience("expert");
    const mode = new NewCoderModeEngine(um);
    // expert threshold = 4 → severity 3 is hidden, 4+ surfaces
    expect(mode.shouldSurface(3)).toBe(false);
    expect(mode.shouldSurface(4)).toBe(true);
  });

  it("setMode persists and returns new profile", () => {
    const um = freshUserModel();
    const mode = new NewCoderModeEngine(um);
    const p = mode.setMode("expert");
    expect(p.experience).toBe("expert");
    expect(um.load().developer_experience).toBe("expert");
  });
});

// ─── BuildAdvisorEngine ─────────────────────────────────────────────

describe("BuildAdvisorEngine — tailored advice", () => {
  function advisor(exp: DeveloperExperience) {
    const um = freshUserModel();
    um.setExperience(exp);
    const mode = new NewCoderModeEngine(um);
    return new BuildAdvisorEngine(mode);
  }

  it("new mode requires rollback — blocks without it", () => {
    const a = advisor("new");
    const advice = a.adviseFor({ unitId: "U-X", title: "demo" });
    expect(advice.requiresRollbackPlan).toBe(true);
    expect(advice.blockers.length).toBeGreaterThan(0);
    expect(a.isSafeToStart(advice)).toBe(false);
  });

  it("new mode accepts when rollbackPlan provided", () => {
    const a = advisor("new");
    const advice = a.adviseFor({
      unitId: "U-X",
      rollbackPlan: "git reset --soft HEAD~1 then restore files",
    });
    expect(advice.blockers).toEqual([]);
    expect(advice.sections.rollback).toContain("git reset");
  });

  it("expert mode has no rollback blocker", () => {
    const a = advisor("expert");
    const advice = a.adviseFor({ unitId: "U-X" });
    expect(advice.blockers).toEqual([]);
    expect(advice.requiresRollbackPlan).toBe(false);
  });

  it("new mode checklist is longer than expert", () => {
    const newAdvice = advisor("new").adviseFor({
      unitId: "U-X",
      rollbackPlan: "revert commit",
    });
    const expertAdvice = advisor("expert").adviseFor({ unitId: "U-X" });
    expect(newAdvice.sections.checklist.length).toBeGreaterThan(
      expertAdvice.sections.checklist.length
    );
  });

  it("surfaces severity-4+ gap findings for new mode", () => {
    const a = advisor("new");
    const advice = a.adviseFor({
      unitId: "U-X",
      rollbackPlan: "revert",
      gapReport: {
        filePath: "x.ts",
        findings: [
          { patternId: "silent_catch", title: "Empty catch", severity: 4, filePath: "x.ts", fix: "log error" },
          { patternId: "todo", title: "TODO", severity: 2, filePath: "x.ts", fix: "complete" },
        ],
        highestSeverity: 4,
        totalChecked: 15,
        totalHits: 2,
        durationMs: 10,
      },
    });
    // new mode threshold = 2 → both surface
    expect(advice.sections.warnings.length).toBe(2);
  });

  it("expert mode hides low-severity findings", () => {
    const a = advisor("expert");
    const advice = a.adviseFor({
      unitId: "U-X",
      gapReport: {
        filePath: "x.ts",
        findings: [
          { patternId: "todo", title: "TODO", severity: 2, filePath: "x.ts", fix: "complete" },
          { patternId: "silent_catch", title: "Empty catch", severity: 4, filePath: "x.ts", fix: "log error" },
        ],
        highestSeverity: 4,
        totalChecked: 15,
        totalHits: 2,
        durationMs: 10,
      },
    });
    // expert threshold = 4 → only severity 4+ surfaces
    expect(advice.sections.warnings.length).toBe(1);
    expect(advice.sections.warnings[0]).toContain("silent_catch");
  });

  it("adds impact warning for high riskLevel", () => {
    const a = advisor("expert");
    const advice = a.adviseFor({ unitId: "U-X", riskLevel: "critical" });
    expect(advice.sections.warnings.some((w) => /critical/i.test(w))).toBe(true);
  });

  it("FAIL: empty unitId throws", () => {
    const a = advisor("expert");
    expect(() => a.adviseFor({ unitId: "" } as any)).toThrow(/unitId required/);
  });

  it("FAIL: null input throws", () => {
    const a = advisor("expert");
    // @ts-expect-error
    expect(() => a.adviseFor(null)).toThrow(/must be an object/);
  });

  it("FAIL: missing unitId throws", () => {
    const a = advisor("expert");
    expect(() => a.adviseFor({ title: "no id" } as any)).toThrow(/unitId required/);
  });

  it("ADV: extreme filesTouched count still renders", () => {
    const a = advisor("intermediate");
    const files = new Array(500).fill(0).map((_, i) => `src/engines/F${i}.ts`);
    const advice = a.adviseFor({
      unitId: "U-X",
      rollbackPlan: "revert",
      filesTouched: files,
    });
    expect(advice).toBeDefined();
    expect(advice.sections.checklist.length).toBeGreaterThan(0);
  });

  it("ADV: debriefPromise present only when required", () => {
    const newA = advisor("new");
    const exp = advisor("expert");
    const a1 = newA.adviseFor({ unitId: "U-X", rollbackPlan: "revert" });
    const a2 = exp.adviseFor({ unitId: "U-X" });
    expect(a1.sections.debriefPromise).toBeDefined();
    expect(a2.sections.debriefPromise).toBeUndefined();
  });
});

// ─── BuildDebriefEngine ─────────────────────────────────────────────

describe("BuildDebriefEngine — post-unit summary", () => {
  it("produces long-form debrief for new mode", () => {
    const { engine, mode } = freshDebriefLog();
    mode.setMode("new");
    const d = engine.debriefFor({
      unitId: "U-X",
      title: "demo",
      summary: "Added foo engine",
      filesCreated: ["src/engines/FooEngine.ts"],
    });
    const rendered = engine.render(d);
    expect(rendered).toContain("What changed");
    expect(rendered).toContain("Why");
    expect(rendered.length).toBeGreaterThan(d.oneLiner.length);
  });

  it("produces one-liner for expert mode", () => {
    const { engine, mode } = freshDebriefLog();
    mode.setMode("expert");
    const d = engine.debriefFor({ unitId: "U-X", summary: "shipped" });
    expect(engine.render(d)).toBe(d.oneLiner);
  });

  it("flags couldBreak for new engine files", () => {
    const { engine } = freshDebriefLog();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "new engine",
      filesCreated: ["src/engines/FooEngine.ts"],
    });
    expect(d.couldBreak.some((c) => c.includes("downstream"))).toBe(true);
  });

  it("flags couldBreak for dispatcher modification", () => {
    const { engine } = freshDebriefLog();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "wired",
      filesModified: ["src/tools/dispatchers/devDispatcher.ts"],
    });
    expect(d.couldBreak.some((c) => c.includes("Dispatcher"))).toBe(true);
  });

  it("flags failing tests in couldBreak", () => {
    const { engine } = freshDebriefLog();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "tests still failing",
      testsPassed: 18,
      testsTotal: 20,
    });
    expect(d.couldBreak.some((c) => /failing/i.test(c))).toBe(true);
  });

  it("persists to log and reads back via recent()", () => {
    const { engine, logPath } = freshDebriefLog();
    engine.debriefFor({ unitId: "U-A", summary: "a" });
    engine.debriefFor({ unitId: "U-B", summary: "b" });
    expect(fs.existsSync(logPath)).toBe(true);
    const recent = engine.recent(5);
    expect(recent.length).toBe(2);
    expect(recent[0].unitId).toBe("U-B"); // newest first
  });

  it("recent() returns empty when log missing", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "empty-"));
    const e = new BuildDebriefEngine(
      new NewCoderModeEngine(freshUserModel()),
      path.join(tmp, "missing.jsonl")
    );
    expect(e.recent()).toEqual([]);
  });

  it("FAIL: null input throws", () => {
    const { engine } = freshDebriefLog();
    // @ts-expect-error
    expect(() => engine.debriefFor(null)).toThrow(/must be an object/);
  });

  it("FAIL: missing summary throws", () => {
    const { engine } = freshDebriefLog();
    expect(() =>
      engine.debriefFor({ unitId: "U-X", summary: "" } as any)
    ).toThrow(/summary required/);
  });

  it("FAIL: missing unitId throws", () => {
    const { engine } = freshDebriefLog();
    expect(() =>
      engine.debriefFor({ summary: "x" } as any)
    ).toThrow(/unitId required/);
  });

  it("ADV: recent() skips malformed rows", () => {
    const { engine, logPath } = freshDebriefLog();
    engine.debriefFor({ unitId: "U-GOOD", summary: "ok" });
    fs.appendFileSync(logPath, "\n{{{not-json}}}\n", "utf-8");
    const recent = engine.recent(5);
    expect(recent.some((r) => r.unitId === "U-GOOD")).toBe(true);
  });

  it("ADV: oneLiner includes partial commit sha when provided", () => {
    const { engine } = freshDebriefLog();
    const d = engine.debriefFor({
      unitId: "U-X",
      summary: "s",
      commitSha: "abcdef1234567890",
    });
    expect(d.oneLiner).toContain("abcdef1");
  });
});

// ─── Dispatcher round-trip ──────────────────────────────────────────

describe("U-FORE-04 — dispatcher round-trip", () => {
  it("devDispatcher exposes user_model + coder_mode + build_advise + build_debrief actions", () => {
    const disp = fs.readFileSync(
      path.join(process.cwd(), "src/tools/dispatchers/devDispatcher.ts"),
      "utf-8"
    );
    expect(disp).toContain('"user_model_get"');
    expect(disp).toContain('"user_model_set_experience"');
    expect(disp).toContain('"coder_mode_current"');
    expect(disp).toContain('"build_advise"');
    expect(disp).toContain('"build_debrief"');
    expect(disp).toContain("UserModelEngine.js");
    expect(disp).toContain("BuildAdvisorEngine.js");
    expect(disp).toContain("BuildDebriefEngine.js");
  });
});
