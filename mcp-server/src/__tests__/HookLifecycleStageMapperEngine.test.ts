/**
 * HookLifecycleStageMapperEngine.test.ts — ACP-MS0/P0-U02 coverage.
 *
 * Real-value assertions across:
 *   - classifyHookStage() pure function: 12 inputs spanning every stage + the
 *     tier/event precedence rules (T4 dominates everything, PreCompact wins
 *     over tier, etc.)
 *   - buildInventory() end-to-end against a tmp-fixture registry + tmp
 *     milestones dir + tmp hooks dir, asserting:
 *       • per-stage counts match the fixture's distribution
 *       • per-status counts match (wired / orphan / disabled / planned)
 *       • ccmPlanned detection adds entries that don't exist on disk
 *       • ccmDeclaredBy carries the right milestone id
 *   - filterByStage / filterByStatus return the expected subset
 *   - renderMarkdown emits a parseable summary with stage + status counts
 *   - throws descriptive Error on missing/malformed registry
 *   - gracefully degrades on missing milestones dir (no throw, console.error
 *     observable but doesn't kill the inventory)
 *
 * @milestone ACP-MS0 / P0-U02
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  classifyHookStage,
  HookLifecycleStageMapperEngine,
  hookLifecycleStageMapperEngine,
} from "../engines/HookLifecycleStageMapperEngine.js";

// ───────────────────────────────────────────────────────────────────────────
// Fixture builders

interface FixtureHook {
  id: string;
  file?: string;
  wired?: boolean;
  disabled?: boolean;
  events?: string[];
  tier?: string | null;
  description?: string;
  /** if true, omit the on-disk .mjs file (simulate planned/orphan). */
  skipOnDisk?: boolean;
}

function writeRegistryFixture(
  root: string,
  hooks: FixtureHook[],
  hookFilenamesOnDisk: string[],
): {
  registryPath: string;
  hooksDir: string;
  milestonesDir: string;
} {
  const registryPath = path.join(root, "HOOK_REGISTRY.json");
  const hooksDir = path.join(root, "hooks");
  const milestonesDir = path.join(root, "milestones");
  fs.mkdirSync(hooksDir, { recursive: true });
  fs.mkdirSync(milestonesDir, { recursive: true });

  fs.writeFileSync(
    registryPath,
    JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-05-13T00:00:00Z",
      generatedBy: "fixture",
      repoRoot: root,
      hooksDir: "hooks",
      hooks: hooks.map((h) => ({
        id: h.id,
        file: h.file ?? `hooks/${h.id}.mjs`,
        wired: h.wired ?? false,
        disabled: h.disabled ?? false,
        events: h.events ?? [],
        description: h.description ?? `fixture ${h.id}`,
        descriptionInferred: false,
        tier: h.tier ?? null,
        sizeBytes: 100,
        lines: 10,
      })),
      skipped: [],
    }),
    "utf8",
  );

  // Write on-disk .mjs files for hooks whose skipOnDisk is false.
  for (const fname of hookFilenamesOnDisk) {
    fs.writeFileSync(path.join(hooksDir, fname), "// fixture hook\n", "utf8");
  }

  return { registryPath, hooksDir, milestonesDir };
}

function writeMilestoneEnvelope(
  milestonesDir: string,
  id: string,
  protectiveHook: string,
): void {
  fs.writeFileSync(
    path.join(milestonesDir, `${id}.json`),
    JSON.stringify({
      id,
      title: `fixture milestone ${id}`,
      forge_triple: {
        protective_hook: protectiveHook,
        mcp_action: `prism_fixture:${id}`,
        skill_command: `/${id.toLowerCase()}`,
      },
    }),
    "utf8",
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Per-test isolation

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "prism-hook-lifecycle-"));
});

afterEach(() => {
  try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ───────────────────────────────────────────────────────────────────────────
// classifyHookStage — pure function unit coverage

describe("classifyHookStage (pure)", () => {
  it("UserPromptSubmit T2 injector → authoring", () => {
    expect(classifyHookStage(["UserPromptSubmit"], "T2", false)).toBe("authoring");
  });

  it("SessionStart T2 → authoring", () => {
    expect(classifyHookStage(["SessionStart"], "T2", false)).toBe("authoring");
  });

  it("PreToolUse T0 → pre_execution (blocking gate)", () => {
    expect(classifyHookStage(["PreToolUse"], "T0", false)).toBe("pre_execution");
  });

  it("PreToolUse T1 → pre_execution (soft gate)", () => {
    expect(classifyHookStage(["PreToolUse"], "T1", false)).toBe("pre_execution");
  });

  it("PostToolUse T3 observer → post_execution", () => {
    expect(classifyHookStage(["PostToolUse"], "T3", false)).toBe("post_execution");
  });

  it("Stop T0 → turn_end_gate (critical blocker)", () => {
    expect(classifyHookStage(["Stop"], "T0", false)).toBe("turn_end_gate");
  });

  it("Stop T3 → post_execution (non-blocking Stop observer)", () => {
    expect(classifyHookStage(["Stop"], "T3", false)).toBe("post_execution");
  });

  it("PreCompact wins over tier — even T0 → context_boundary", () => {
    expect(classifyHookStage(["PreCompact"], "T0", false)).toBe("context_boundary");
  });

  it("T4 dominates events — T4 + PreToolUse → async_background", () => {
    expect(classifyHookStage(["PreToolUse"], "T4", false)).toBe("async_background");
  });

  it("T4 + Stop → async_background (T4 wins over Stop)", () => {
    expect(classifyHookStage(["Stop"], "T4", false)).toBe("async_background");
  });

  it("disabled hook always → unclassified regardless of events/tier", () => {
    expect(classifyHookStage(["PreToolUse"], "T0", true)).toBe("unclassified");
  });

  it("zero events + no tier → unclassified (orphan)", () => {
    expect(classifyHookStage([], null, false)).toBe("unclassified");
  });

  it("PreCompact dominance is independent of T4 placement", () => {
    // PreCompact is checked BEFORE T4 (intentional — boundary handler has its own lane)
    expect(classifyHookStage(["PreCompact"], "T4", false)).toBe("context_boundary");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// buildInventory — end-to-end against fixture

describe("HookLifecycleStageMapperEngine.buildInventory", () => {
  it("builds an inventory with correct per-stage and per-status counts", () => {
    const fixture: FixtureHook[] = [
      // 2 authoring hooks
      { id: "ctx-inject-a", wired: true, events: ["UserPromptSubmit"], tier: "T2" },
      { id: "ctx-inject-b", wired: true, events: ["SessionStart"], tier: "T2" },
      // 3 pre_execution hooks (one disabled — counts as unclassified)
      { id: "pre-gate-a", wired: true, events: ["PreToolUse"], tier: "T0" },
      { id: "pre-gate-b", wired: true, events: ["PreToolUse"], tier: "T1" },
      { id: "pre-gate-c", wired: true, events: ["PreToolUse"], tier: "T0", disabled: true },
      // 1 turn_end_gate
      { id: "stop-block", wired: true, events: ["Stop"], tier: "T0" },
      // 1 post_execution (non-T0 Stop)
      { id: "stop-obs", wired: true, events: ["Stop"], tier: "T3" },
      // 1 post_execution (PostToolUse)
      { id: "lint-after", wired: true, events: ["PostToolUse"], tier: "T3" },
      // 1 context_boundary
      { id: "compact-handler", wired: true, events: ["PreCompact"], tier: "T4" },
      // 1 async_background (T4 + PreToolUse → still async)
      { id: "async-job", wired: true, events: ["PreToolUse"], tier: "T4" },
      // 1 orphan (not wired, no events)
      { id: "orphan-helper", wired: false, events: [], tier: "T3" },
    ];
    const onDisk = fixture.map((h) => `${h.id}.mjs`);
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(tmpRoot, fixture, onDisk);

    const inv = new HookLifecycleStageMapperEngine().buildInventory({
      registryPath, hooksDir, milestonesDir,
    });

    expect(inv.schemaVersion).toBe(1);
    expect(inv.total_hooks).toBe(11);
    // Per-stage tallies (no planned in this fixture):
    expect(inv.by_stage.authoring).toBe(2);
    expect(inv.by_stage.pre_execution).toBe(2);          // 3 PreToolUse - 1 disabled
    expect(inv.by_stage.turn_end_gate).toBe(1);
    expect(inv.by_stage.post_execution).toBe(2);          // stop-obs + lint-after
    expect(inv.by_stage.context_boundary).toBe(1);
    expect(inv.by_stage.async_background).toBe(1);
    expect(inv.by_stage.unclassified).toBe(2);            // disabled pre-gate-c + orphan-helper
    // Per-status tallies. Status precedence: disabled > wired > orphan (per
    // engine constructor logic). pre-gate-c is wired:true AND disabled:true,
    // so it gets status:disabled — 1 disabled, 9 wired, 1 orphan.
    expect(inv.by_status.wired).toBe(9);
    expect(inv.by_status.orphan).toBe(1);
    expect(inv.by_status.disabled).toBe(1);
    expect(inv.by_status.planned).toBe(0);                // no milestone envelopes in this fixture
  });

  it("counts disabled status correctly when wired+disabled both true", () => {
    const fixture: FixtureHook[] = [
      { id: "live", wired: true, events: ["Stop"], tier: "T0" },
      { id: "off", wired: true, disabled: true, events: ["Stop"], tier: "T0" },
    ];
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    const inv = hookLifecycleStageMapperEngine.buildInventory({
      registryPath, hooksDir, milestonesDir,
    });
    expect(inv.by_status.wired).toBe(1);
    expect(inv.by_status.disabled).toBe(1);
    expect(inv.by_stage.turn_end_gate).toBe(1);           // live
    expect(inv.by_stage.unclassified).toBe(1);            // off (disabled → unclassified stage)
  });

  it("detects CCM-planned hooks declared by milestone forge_triple but absent on disk", () => {
    const fixture: FixtureHook[] = [
      { id: "existing-gate", wired: true, events: ["Stop"], tier: "T0" },
    ];
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    // One milestone declares a planned hook NOT on disk.
    writeMilestoneEnvelope(milestonesDir, "FIXTURE-MS0", "planned-acp-gate");
    // Second milestone declares an EXISTING hook (should NOT count as planned).
    writeMilestoneEnvelope(milestonesDir, "FIXTURE-MS1", "existing-gate");

    const inv = hookLifecycleStageMapperEngine.buildInventory({
      registryPath, hooksDir, milestonesDir,
    });

    expect(inv.total_hooks).toBe(2);              // 1 existing + 1 planned-only
    expect(inv.ccm_planned_count).toBe(1);
    expect(inv.by_status.planned).toBe(1);
    const planned = inv.entries.find((e) => e.ccmPlanned);
    expect(planned?.id).toBe("planned-acp-gate");
    expect(planned?.ccmDeclaredBy).toBe("FIXTURE-MS0");
    expect(planned?.status).toBe("planned");
    expect(planned?.primaryStage).toBe("unclassified");
    // Existing hook gets its milestone id attached but ccmPlanned=false.
    const existing = inv.entries.find((e) => e.id === "existing-gate");
    expect(existing?.ccmPlanned).toBe(false);
    expect(existing?.ccmDeclaredBy).toBe("FIXTURE-MS1");
  });

  it("gracefully degrades when milestones dir is absent", () => {
    const fixture: FixtureHook[] = [
      { id: "solo-hook", wired: true, events: ["Stop"], tier: "T0" },
    ];
    const { registryPath, hooksDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    const inv = hookLifecycleStageMapperEngine.buildInventory({
      registryPath,
      hooksDir,
      milestonesDir: path.join(tmpRoot, "does-not-exist"),
    });
    expect(inv.total_hooks).toBe(1);
    expect(inv.ccm_planned_count).toBe(0);
  });

  it("throws descriptive Error on missing registry path", () => {
    const bogusPath = path.join(tmpRoot, "does-not-exist.json");
    expect(() => hookLifecycleStageMapperEngine.buildInventory({
      registryPath: bogusPath,
      hooksDir: path.join(tmpRoot, "hooks"),
      milestonesDir: path.join(tmpRoot, "milestones"),
    })).toThrow(/registry not readable/);
  });

  it("throws descriptive Error on malformed registry JSON", () => {
    const badPath = path.join(tmpRoot, "bad.json");
    fs.writeFileSync(badPath, "not valid json {{", "utf8");
    fs.mkdirSync(path.join(tmpRoot, "hooks"), { recursive: true });
    fs.mkdirSync(path.join(tmpRoot, "milestones"), { recursive: true });
    expect(() => hookLifecycleStageMapperEngine.buildInventory({
      registryPath: badPath,
      hooksDir: path.join(tmpRoot, "hooks"),
      milestonesDir: path.join(tmpRoot, "milestones"),
    })).toThrow(/registry JSON malformed/);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// filterByStage / filterByStatus

describe("filter methods", () => {
  it("filterByStage returns only matching entries", () => {
    const fixture: FixtureHook[] = [
      { id: "a", wired: true, events: ["UserPromptSubmit"], tier: "T2" },
      { id: "b", wired: true, events: ["UserPromptSubmit"], tier: "T2" },
      { id: "c", wired: true, events: ["Stop"], tier: "T0" },
    ];
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    const engine = new HookLifecycleStageMapperEngine();
    const inv = engine.buildInventory({ registryPath, hooksDir, milestonesDir });
    expect(engine.filterByStage(inv, "authoring").length).toBe(2);
    expect(engine.filterByStage(inv, "turn_end_gate").length).toBe(1);
    expect(engine.filterByStage(inv, "post_execution").length).toBe(0);
  });

  it("filterByStatus returns only matching entries", () => {
    const fixture: FixtureHook[] = [
      { id: "w", wired: true, events: ["Stop"], tier: "T0" },
      { id: "o", wired: false, events: [], tier: "T3" },
    ];
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    const engine = new HookLifecycleStageMapperEngine();
    const inv = engine.buildInventory({ registryPath, hooksDir, milestonesDir });
    expect(engine.filterByStatus(inv, "wired").map((e) => e.id)).toEqual(["w"]);
    expect(engine.filterByStatus(inv, "orphan").map((e) => e.id)).toEqual(["o"]);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// renderMarkdown

describe("renderMarkdown", () => {
  it("emits a markdown summary with stage + status sections + counts", () => {
    const fixture: FixtureHook[] = [
      { id: "a", wired: true, events: ["UserPromptSubmit"], tier: "T2" },
      { id: "b", wired: true, events: ["Stop"], tier: "T0" },
      { id: "c", wired: false, events: [], tier: null },
    ];
    const { registryPath, hooksDir, milestonesDir } = writeRegistryFixture(
      tmpRoot, fixture, fixture.map((h) => `${h.id}.mjs`),
    );
    writeMilestoneEnvelope(milestonesDir, "FIXTURE-MS9", "planned-hook-x");
    const engine = new HookLifecycleStageMapperEngine();
    const inv = engine.buildInventory({ registryPath, hooksDir, milestonesDir });
    const md = engine.renderMarkdown(inv);
    expect(md).toContain("# Hook Lifecycle Inventory");
    expect(md).toContain("**Total hooks**: 4");      // 3 fixture + 1 planned
    expect(md).toContain("**CCM-planned");
    expect(md).toContain("**authoring**: 1");
    expect(md).toContain("**turn_end_gate**: 1");
    expect(md).toContain("**unclassified**: 2");     // orphan + planned (both classify unclassified)
    expect(md).toContain("CCM-planned hooks (declared, not yet built)");
    expect(md).toContain("planned-hook-x");
    expect(md).toContain("FIXTURE-MS9");
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Singleton sanity

// ───────────────────────────────────────────────────────────────────────────
// Registry shape compat — the real HOOK_REGISTRY.json stores events[] as
// array of objects { event, matcher, ... } not flat strings.

describe("registry events[] object normalization", () => {
  it("accepts events[] as Array<{event,matcher,...}> from real registry shape", () => {
    const registryPath = path.join(tmpRoot, "REG.json");
    const hooksDir = path.join(tmpRoot, "hooks");
    const milestonesDir = path.join(tmpRoot, "milestones");
    fs.mkdirSync(hooksDir, { recursive: true });
    fs.mkdirSync(milestonesDir, { recursive: true });
    fs.writeFileSync(
      registryPath,
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-05-13T00:00:00Z",
        hooks: [
          // Real-registry shape — array of event-detail objects, not strings.
          {
            id: "real-pre",
            file: "hooks/real-pre.mjs",
            wired: true,
            disabled: false,
            tier: "T1",
            events: [
              { event: "PreToolUse", matcher: "Edit|Write", timeout: null, type: "command", layer: "user", disabled: false },
              { event: "PreToolUse", matcher: "Edit|Write", timeout: null, type: "command", layer: "project", disabled: false },
            ],
          },
          {
            id: "real-stop",
            file: "hooks/real-stop.mjs",
            wired: true,
            disabled: false,
            tier: "T0",
            events: [{ event: "Stop", matcher: "", timeout: 30000, type: "command", layer: "user", disabled: false }],
          },
          // Mixed: malformed entry should be skipped, valid entry preserved.
          {
            id: "real-session",
            file: "hooks/real-session.mjs",
            wired: true,
            disabled: false,
            tier: "T2",
            events: [
              null,
              "SessionStart",  // string fallback path
              { event: "SessionStart", matcher: "" },  // duplicate de-duped
              { matcher: "no-event-field" },  // missing event key → skipped
            ],
          },
        ],
      }),
      "utf8",
    );
    fs.writeFileSync(path.join(hooksDir, "real-pre.mjs"), "// stub", "utf8");
    fs.writeFileSync(path.join(hooksDir, "real-stop.mjs"), "// stub", "utf8");
    fs.writeFileSync(path.join(hooksDir, "real-session.mjs"), "// stub", "utf8");

    const inv = hookLifecycleStageMapperEngine.buildInventory({
      registryPath, hooksDir, milestonesDir,
    });
    expect(inv.total_hooks).toBe(3);
    // Verify event names extracted from the object shape land in the entry.
    const pre = inv.entries.find((e) => e.id === "real-pre");
    expect(pre?.events).toEqual(["PreToolUse"]);
    expect(pre?.primaryStage).toBe("pre_execution");

    const stop = inv.entries.find((e) => e.id === "real-stop");
    expect(stop?.events).toEqual(["Stop"]);
    expect(stop?.primaryStage).toBe("turn_end_gate");

    const session = inv.entries.find((e) => e.id === "real-session");
    expect(session?.events).toEqual(["SessionStart"]);    // de-duplicated
    expect(session?.primaryStage).toBe("authoring");
  });
});

describe("singleton export", () => {
  it("exports a working singleton with buildInventory", () => {
    expect(typeof hookLifecycleStageMapperEngine.buildInventory).toBe("function");
    expect(typeof hookLifecycleStageMapperEngine.filterByStage).toBe("function");
    expect(typeof hookLifecycleStageMapperEngine.renderMarkdown).toBe("function");
  });
});
