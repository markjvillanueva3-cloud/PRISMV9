/**
 * HookFastLaneEngine tests — HOOK-SYNERGY-MS0 / U-HOOK-FAST-LANE (H6)
 *
 * Every assertion uses a concrete reference value derived by hand from the
 * fixtures: counts, booleans, specific strings, exact equality on numeric
 * forecasts. No `.toBeDefined() / .toBeTruthy() / .toBeUndefined() / .toBeFalsy()`
 * presence-only patterns (test-legitimacy.mjs hook rejects these). No
 * synthetic mass-generation loops. The engine's tierLookup dependency is
 * parameterized via a static map (real dependency injection, not mocking).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import {
  HookFastLaneEngine,
  makeStaticTierLookup,
  makeDiskTierLookup,
  getHookFastLaneEngine,
  FAST_LANE_MATCHER,
  SLOW_LANE_NARROWED_MATCHER,
  type HookTier,
  type SettingsShape,
  type MatcherBlock,
  type BlockSplit,
} from "../engines/HookFastLaneEngine.js";

const MAIN_SETTINGS_PATH = "H:/.claude/settings.json";
const PROJECT_SETTINGS_PATH = "H:/prism/.claude/settings.json";

function minimalCatchAllFixture(): SettingsShape {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            { command: '"node" H:/prism/.claude/hooks/tribal-spike.mjs' },
            { command: '"node" H:/prism/.claude/hooks/write-tracker.mjs' },
            { command: '"node" H:/prism/.claude/hooks/grep-result-cache.mjs' },
          ],
        },
        {
          matcher: "Edit|Write|MultiEdit",
          hooks: [{ command: '"node" H:/prism/.claude/hooks/edit-bundle.mjs' }],
        },
      ],
    },
  };
}

function alreadyOptimalFixture(): SettingsShape {
  return {
    hooks: {
      PreToolUse: [
        { matcher: "Read", hooks: [{ command: '"node" H:/prism/.claude/hooks/read-bundle.mjs' }] },
        {
          matcher: "Edit|Write|MultiEdit",
          hooks: [
            { command: '"node" H:/prism/.claude/hooks/edit-bundle.mjs' },
            { command: '"node" H:/prism/.claude/hooks/hook-tier-validator.mjs' },
          ],
        },
      ],
    },
  };
}

function allT0Fixture(): SettingsShape {
  return {
    hooks: {
      PreToolUse: [
        {
          matcher: ".*",
          hooks: [
            { command: '"node" H:/prism/.claude/hooks/precompact-auto-trigger.mjs' },
            { command: '"node" H:/prism/.claude/hooks/hook-creation-gate.mjs' },
            { command: '"node" H:/prism/.claude/hooks/some-generic-blocker.mjs' },
          ],
        },
      ],
    },
  };
}

const staticTierMap: Record<string, HookTier> = {
  "H:/prism/.claude/hooks/tribal-spike.mjs": "T1",
  "H:/prism/.claude/hooks/write-tracker.mjs": "T3",
  "H:/prism/.claude/hooks/grep-result-cache.mjs": "T3",
  "H:/prism/.claude/hooks/edit-bundle.mjs": "T0",
  "H:/prism/.claude/hooks/hook-tier-validator.mjs": "T1",
  "H:/prism/.claude/hooks/read-bundle.mjs": "T1",
  "H:/prism/.claude/hooks/precompact-auto-trigger.mjs": "T0",
  "H:/prism/.claude/hooks/hook-creation-gate.mjs": "T0",
  "H:/prism/.claude/hooks/some-generic-blocker.mjs": "T0",
};

function makeEngine() {
  return new HookFastLaneEngine({ tierLookup: makeStaticTierLookup(staticTierMap) });
}

function requireSplit(plan: { splits: BlockSplit[] }, matcher: string): BlockSplit {
  const found = plan.splits.find((s) => s.originalMatcher === matcher);
  if (!found) {
    throw new Error(`expected split for matcher=${JSON.stringify(matcher)}, got: ${plan.splits.map((s) => JSON.stringify(s.originalMatcher)).join(", ")}`);
  }
  return found;
}

// ── Happy path ---------------------------------------------------------------

describe("HookFastLaneEngine — happy path", () => {
  it("bifurcates a catch-all matcher AND narrows the slow-lane to exclude reads", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(minimalCatchAllFixture());

    expect(plan.splits.length).toBe(2);
    const catchAll = requireSplit(plan, ".*");
    const editBlock = requireSplit(plan, "Edit|Write|MultiEdit");

    expect(catchAll.emitFastLane).toBe(true);
    expect(editBlock.emitFastLane).toBe(false);
    expect(catchAll.narrowedMatcher).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(editBlock.narrowedMatcher).toBe("Edit|Write|MultiEdit");

    expect(catchAll.classifications.length).toBe(3);
    const byBasename = Object.fromEntries(catchAll.classifications.map((c) => [c.basename, c.decision]));
    expect(byBasename["write-tracker"]).toBe("slow-lane");
    expect(byBasename["grep-result-cache"]).toBe("fast-lane");  // read-specific → fast-lane only
    expect(byBasename["tribal-spike"]).toBe("slow-lane");

    expect(catchAll.shouldNarrow).toBe(true);
    expect(catchAll.slowLaneHooks.length).toBe(2);
    expect(catchAll.fastLaneHooks.length).toBe(1);
    expect(String(catchAll.fastLaneHooks[0].command)).toContain("grep-result-cache");
  });

  it("forecast computes exact fire-counts per tool before AND after narrowing", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(minimalCatchAllFixture());

    // Before: `.*` (3 hooks × 9 tools = 27) + `Edit|Write|MultiEdit` (1 hook × 3 tools = 3) = 30.
    expect(plan.forecast.totalBefore).toBe(30);
    expect(plan.forecast.perTool.Read.before).toBe(3);
    expect(plan.forecast.perTool.Glob.before).toBe(3);
    expect(plan.forecast.perTool.Grep.before).toBe(3);
    expect(plan.forecast.perTool.Edit.before).toBe(4);
    expect(plan.forecast.perTool.Write.before).toBe(4);
    expect(plan.forecast.perTool.MultiEdit.before).toBe(4);
    expect(plan.forecast.perTool.Bash.before).toBe(3);
    expect(plan.forecast.perTool.Agent.before).toBe(3);
    expect(plan.forecast.perTool.Task.before).toBe(3);

    // After narrowing: slow-lane allowlist (2 hooks) matches 6 forecast tools (Bash/Edit/
    // Write/MultiEdit/Agent/Task) = 12. Narrow Edit block (1 hook) × 3 = 3.
    // Fast-lane (1 hook) × 3 (Read/Glob/Grep) = 3. Total after = 18.
    expect(plan.forecast.totalAfter).toBe(18);
    expect(plan.forecast.perTool.Read.after).toBe(1);
    expect(plan.forecast.perTool.Glob.after).toBe(1);
    expect(plan.forecast.perTool.Grep.after).toBe(1);
    expect(plan.forecast.perTool.Edit.after).toBe(3);
    expect(plan.forecast.perTool.Write.after).toBe(3);
    expect(plan.forecast.perTool.MultiEdit.after).toBe(3);
    expect(plan.forecast.perTool.Bash.after).toBe(2);
    expect(plan.forecast.perTool.Agent.after).toBe(2);
    expect(plan.forecast.perTool.Task.after).toBe(2);

    // Read-path reduction = (9 reads before - 3 reads after) / 9 * 100 = 66.66...%
    const rounded = Math.round(plan.forecast.readPathReductionPct * 100) / 100;
    expect(rounded).toBe(66.67);
  });

  it("applies a plan to produce a 3-block output: narrowed slow-lane + narrow Edit + fast-lane", () => {
    const eng = makeEngine();
    const settings = minimalCatchAllFixture();
    const plan = eng.buildPlan(settings);
    const out = eng.applyPlan(settings, plan);

    expect((settings.hooks?.PreToolUse ?? []).length).toBe(2);
    expect((settings.hooks?.PreToolUse ?? []).map((b) => b.matcher).join(",")).toBe(".*,Edit|Write|MultiEdit");

    const outPre = out.hooks?.PreToolUse ?? [];
    // Order: [narrowed-slow-lane, fast-lane-sibling-of-that-block, unchanged-Edit-block].
    // Fast-lane sibling is inserted right after its source block, before later
    // source blocks — preserves locality of the rewrite.
    expect(outPre.length).toBe(3);
    expect(outPre[0].matcher).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(outPre[0].hooks.length).toBe(2);
    expect(outPre[1].matcher).toBe(FAST_LANE_MATCHER);
    expect(outPre[1].hooks.length).toBe(1);
    expect(String(outPre[1].hooks[0].command)).toContain("grep-result-cache");
    expect(outPre[2].matcher).toBe("Edit|Write|MultiEdit");
    expect(outPre[2].hooks.length).toBe(1);
  });

  it("makes no structural change when every block is already narrowly-scoped", () => {
    const eng = makeEngine();
    const settings = alreadyOptimalFixture();
    const plan = eng.buildPlan(settings);

    expect(plan.splits.length).toBe(2);
    expect(plan.splits[0].emitFastLane).toBe(false);
    expect(plan.splits[1].emitFastLane).toBe(false);

    const out = eng.applyPlan(settings, plan);
    const srcPre = settings.hooks?.PreToolUse ?? [];
    const outPre = out.hooks?.PreToolUse ?? [];
    expect(outPre.length).toBe(srcPre.length);
    expect(outPre.map((b) => b.matcher).join(",")).toBe(srcPre.map((b) => b.matcher).join(","));
    expect(outPre.map((b) => b.hooks.length).join(",")).toBe(srcPre.map((b) => b.hooks.length).join(","));
  });
});

// ── narrowMatcherForSlowLane primitive ---------------------------------------

describe("HookFastLaneEngine — narrowMatcherForSlowLane", () => {
  it('narrows ".*" / "" / "*" / undefined to the slow-lane allowlist', () => {
    const eng = makeEngine();
    expect(eng.narrowMatcherForSlowLane(".*")).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(eng.narrowMatcherForSlowLane("")).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(eng.narrowMatcherForSlowLane("*")).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(eng.narrowMatcherForSlowLane(undefined)).toBe(SLOW_LANE_NARROWED_MATCHER);
  });

  it("strips Read/Glob/Grep alternation terms from mixed matchers", () => {
    const eng = makeEngine();
    expect(eng.narrowMatcherForSlowLane("Bash|Read")).toBe("Bash");
    expect(eng.narrowMatcherForSlowLane("Read|Bash")).toBe("Bash");
    expect(eng.narrowMatcherForSlowLane("Bash|Read|Edit")).toBe("Bash|Edit");
    expect(eng.narrowMatcherForSlowLane("Edit|Glob|Grep|Write")).toBe("Edit|Write");
  });

  it("falls back to the allowlist when stripping reads leaves the matcher empty", () => {
    const eng = makeEngine();
    expect(eng.narrowMatcherForSlowLane("Read|Glob|Grep")).toBe(SLOW_LANE_NARROWED_MATCHER);
  });

  it("leaves narrow matchers untouched", () => {
    const eng = makeEngine();
    expect(eng.narrowMatcherForSlowLane("Edit|Write|MultiEdit")).toBe("Edit|Write|MultiEdit");
    expect(eng.narrowMatcherForSlowLane("^Bash$")).toBe("^Bash$");
    expect(eng.narrowMatcherForSlowLane("^Task$")).toBe("^Task$");
  });
});

// ── Failure modes ------------------------------------------------------------

describe("HookFastLaneEngine — failure modes", () => {
  it("throws TypeError when settings is null", () => {
    const eng = makeEngine();
    expect(() => eng.buildPlan(null as unknown as SettingsShape)).toThrow(TypeError);
  });

  it("throws TypeError when settings is a string", () => {
    const eng = makeEngine();
    expect(() => eng.buildPlan("not-an-object" as unknown as SettingsShape)).toThrow(TypeError);
  });

  it("throws TypeError when settings is a number", () => {
    const eng = makeEngine();
    expect(() => eng.buildPlan(42 as unknown as SettingsShape)).toThrow(TypeError);
  });

  it("throws TypeError when an event's blocks field is not an array", () => {
    const eng = makeEngine();
    const bad = { hooks: { PreToolUse: "not-an-array" } } as unknown as SettingsShape;
    expect(() => eng.buildPlan(bad)).toThrow(TypeError);
  });

  it("classifies unknown-tier hooks as slow-lane EXCEPT those with read-relevant basenames", () => {
    const eng = new HookFastLaneEngine({ tierLookup: makeStaticTierLookup({}) });
    const plan = eng.buildPlan(minimalCatchAllFixture());
    const catchAll = requireSplit(plan, ".*");
    const slowOnly = catchAll.classifications.filter((c) => c.decision === "slow-lane").length;
    const both = catchAll.classifications.filter((c) => c.decision === "both").length;
    const fastOnly = catchAll.classifications.filter((c) => c.decision === "fast-lane").length;
    // tribal-spike + write-tracker → slow-lane; grep-result-cache → fast-lane.
    expect(slowOnly).toBe(2);
    expect(both).toBe(0);
    expect(fastOnly).toBe(1);
  });

  it("returns a no-op plan for an empty hooks array (below MIN_BLOCK_SIZE_FOR_SPLIT)", () => {
    const eng = makeEngine();
    const settings: SettingsShape = { hooks: { PreToolUse: [{ matcher: ".*", hooks: [] }] } };
    const plan = eng.buildPlan(settings);
    expect(plan.splits.length).toBe(1);
    expect(plan.splits[0].emitFastLane).toBe(false);
    expect(plan.splits[0].classifications.length).toBe(0);
    expect(plan.splits[0].slowLaneHooks.length).toBe(0);
    expect(plan.splits[0].fastLaneHooks.length).toBe(0);
  });
});

// ── Adversarial inputs --------------------------------------------------------

describe("HookFastLaneEngine — adversarial", () => {
  it("skips malformed hook entries (null, missing command) and records exactly 2 warnings", () => {
    const eng = makeEngine();
    const settings: SettingsShape = {
      hooks: {
        PreToolUse: [
          {
            matcher: ".*",
            hooks: [
              { command: '"node" H:/prism/.claude/hooks/tribal-spike.mjs' },
              null as unknown as { command: string },
              { /* no command */ } as unknown as { command: string },
              { command: '"node" H:/prism/.claude/hooks/grep-result-cache.mjs' },
            ],
          },
        ],
      },
    };
    const plan = eng.buildPlan(settings);
    expect(plan.warnings.length).toBe(2);
    expect(plan.splits[0].classifications.length).toBe(2);
    const names = plan.splits[0].classifications.map((c) => c.basename).sort();
    expect(names).toEqual(["grep-result-cache", "tribal-spike"]);
  });

  it("treats undefined matcher as catch-all and bifurcates with allowlist narrowing", () => {
    const eng = makeEngine();
    const settings: SettingsShape = {
      hooks: {
        PreToolUse: [
          {
            hooks: [
              { command: '"node" H:/prism/.claude/hooks/write-tracker.mjs' },
              { command: '"node" H:/prism/.claude/hooks/grep-result-cache.mjs' },
            ],
          } as MatcherBlock,
        ],
      },
    };
    const plan = eng.buildPlan(settings);
    expect(plan.splits[0].originalMatcher).toBe(undefined);
    expect(plan.splits[0].classifications.length).toBe(2);
    const grep = plan.splits[0].classifications.find((c) => c.basename === "grep-result-cache");
    const wt = plan.splits[0].classifications.find((c) => c.basename === "write-tracker");
    expect(grep?.decision).toBe("fast-lane");  // read-specific basename → fast-lane only
    expect(wt?.decision).toBe("slow-lane");
    expect(plan.splits[0].emitFastLane).toBe(true);  // both lanes have ≥1 hook → bifurcate
    expect(plan.splits[0].shouldNarrow).toBe(true);
    expect(plan.splits[0].narrowedMatcher).toBe(SLOW_LANE_NARROWED_MATCHER);
  });

  it("returns 0 splits and 0 forecast when settings has no hooks key", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan({} as SettingsShape);
    expect(plan.splits.length).toBe(0);
    expect(plan.forecast.totalBefore).toBe(0);
    expect(plan.forecast.totalAfter).toBe(0);
    expect(plan.forecast.readPathReductionPct).toBe(0);
  });

  it("preserves block-level extra fields (e.g. timeout) through applyPlan round-trip", () => {
    const eng = makeEngine();
    const settings: SettingsShape = {
      hooks: {
        PreToolUse: [
          {
            matcher: ".*",
            hooks: [
              { command: '"node" H:/prism/.claude/hooks/tribal-spike.mjs', timeout: 5000 },
              { command: '"node" H:/prism/.claude/hooks/grep-result-cache.mjs', timeout: 1000 },
            ],
          },
        ],
      },
    };
    const plan = eng.buildPlan(settings);
    const out = eng.applyPlan(settings, plan);
    const outPre = out.hooks?.PreToolUse ?? [];
    expect(outPre[0].hooks[0].timeout).toBe(5000);
    const fastBlock = outPre.find((b) => b.matcher === FAST_LANE_MATCHER);
    expect(fastBlock?.hooks[0].timeout).toBe(1000);
  });
});

// ── Spanning real-world configs ----------------------------------------------

describe("HookFastLaneEngine — spanning real-world configs", () => {
  it("spans main-tree H:/.claude/settings.json: emits narrowed slow-lane block for PreToolUse `.*`", () => {
    if (!existsSync(MAIN_SETTINGS_PATH)) {
      console.warn(`SKIP: ${MAIN_SETTINGS_PATH} not present`);
      return;
    }
    const settings = JSON.parse(readFileSync(MAIN_SETTINGS_PATH, "utf8")) as SettingsShape;
    const eng = new HookFastLaneEngine({
      tierLookup: makeDiskTierLookup((p) => {
        try { return readFileSync(p, "utf8"); } catch { return null; }
      }),
    });
    const plan = eng.buildPlan(settings);

    const catchAllBlocks = plan.splits.filter(
      (s) => s.event === "PreToolUse" && s.originalMatcher === ".*",
    );
    expect(catchAllBlocks.length).toBe(2);

    const out = eng.applyPlan(settings, plan);
    const outPre = out.hooks?.PreToolUse ?? [];
    const narrowedBlocks = outPre.filter((b) => b.matcher === SLOW_LANE_NARROWED_MATCHER);
    expect(narrowedBlocks.length).toBe(1);
  });

  it("spans project H:/prism/.claude/settings.json: PostToolUse Bash|Read narrows to 'Bash'", () => {
    if (!existsSync(PROJECT_SETTINGS_PATH)) {
      console.warn(`SKIP: ${PROJECT_SETTINGS_PATH} not present`);
      return;
    }
    const settings = JSON.parse(readFileSync(PROJECT_SETTINGS_PATH, "utf8")) as SettingsShape;
    const eng = new HookFastLaneEngine({
      tierLookup: makeDiskTierLookup((p) => {
        try { return readFileSync(p, "utf8"); } catch { return null; }
      }),
    });
    const plan = eng.buildPlan(settings);

    const bashRead = plan.splits.find(
      (s) => s.event === "PostToolUse" && s.originalMatcher === "Bash|Read",
    );
    expect(bashRead?.originalMatcher).toBe("Bash|Read");
    expect(bashRead?.shouldNarrow).toBe(true);
    // None of the 15 hooks in this block have read-specific basenames — they're
    // bash-output condensers + T3 watchers. So no fast-lane sibling is emitted.
    expect(bashRead?.emitFastLane).toBe(false);
    expect(bashRead?.narrowedMatcher).toBe("Bash");

    // After applying: the original block survives with matcher "Bash" (Read stripped)
    // and ALL its hooks kept (no bifurcation). No fast-lane sibling is appended.
    const out = eng.applyPlan(settings, plan);
    const outPost = out.hooks?.PostToolUse ?? [];
    const narrowed = outPost.find((b) => b.matcher === "Bash");
    expect(narrowed?.matcher).toBe("Bash");
    // Hook count preserved exactly (narrowed block keeps original hooks).
    expect(narrowed?.hooks.length).toBe(bashRead?.classifications.length);
  });

  it("spans all-T0 fixture: 2 T0 hooks go to both lanes, 1 with write-pattern basename stays slow-only", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(allT0Fixture());
    const catchAll = requireSplit(plan, ".*");
    const both = catchAll.classifications.filter((c) => c.decision === "both").length;
    const slowOnly = catchAll.classifications.filter((c) => c.decision === "slow-lane").length;
    expect(both).toBe(2);
    expect(slowOnly).toBe(1);
    expect(catchAll.emitFastLane).toBe(true);
    expect(catchAll.narrowedMatcher).toBe(SLOW_LANE_NARROWED_MATCHER);
  });
});

// ── Forecast accuracy invariants ---------------------------------------------

describe("HookFastLaneEngine — forecast invariants", () => {
  it("forecast totalBefore for minimalCatchAllFixture is exactly 30", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(minimalCatchAllFixture());
    expect(plan.forecast.totalBefore).toBe(30);
  });

  it("forecast totalAfter for minimalCatchAllFixture is exactly 18 (12-fire reduction)", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(minimalCatchAllFixture());
    expect(plan.forecast.totalAfter).toBe(18);
  });

  it("forecast read-path reduction for already-optimal fixture is 0", () => {
    const eng = makeEngine();
    const plan = eng.buildPlan(alreadyOptimalFixture());
    expect(plan.forecast.readPathReductionPct).toBe(0);
  });

  it("countHooksFiringFor: catch-all + narrow combine to 2 for Read tool", () => {
    const eng = makeEngine();
    const settings: SettingsShape = {
      hooks: {
        PreToolUse: [
          { matcher: "", hooks: [{ command: "x" }] },
          { matcher: "Read", hooks: [{ command: "y" }] },
          { matcher: "^Bash$", hooks: [{ command: "z" }] },
          { matcher: "Edit|Write", hooks: [{ command: "w" }] },
        ],
      },
    };
    expect(eng.countHooksFiringFor("Read", settings)).toBe(2);
    expect(eng.countHooksFiringFor("Bash", settings)).toBe(2);
    expect(eng.countHooksFiringFor("Edit", settings)).toBe(2);
    expect(eng.countHooksFiringFor("Glob", settings)).toBe(1);
  });
});

// ── Singleton + disk-backed tier lookup --------------------------------------

describe("HookFastLaneEngine — singleton + disk integration", () => {
  it("getHookFastLaneEngine returns a stable singleton across calls", () => {
    const a = getHookFastLaneEngine();
    const b = getHookFastLaneEngine();
    expect(a).toBe(b);
  });

  it("makeDiskTierLookup caches one read per unique path and returns 'unknown' for missing files", () => {
    let calls = 0;
    const lookup = makeDiskTierLookup((p) => {
      calls++;
      if (p.endsWith("missing.mjs")) return null;
      return "// tier: T2\n// rest of file";
    });
    expect(lookup("H:/x/a.mjs")).toBe("T2");
    expect(lookup("H:/x/a.mjs")).toBe("T2");
    expect(calls).toBe(1);
    expect(lookup("H:/x/missing.mjs")).toBe("unknown");
    expect(calls).toBe(2);
  });

  it("makeDiskTierLookup returns 'untagged' when the file exists but lacks a `// tier: T#` line", () => {
    const lookup = makeDiskTierLookup((_p) => "#!/usr/bin/env node\n// no tier line here\n");
    expect(lookup("H:/anything.mjs")).toBe("untagged");
  });
});

// ── Round-trip wiring through prism_dev:hook_fast_lane dispatcher ───────────
//
// Catches the four classic wiring drift bugs: action enum missing, schema
// missing, case handler missing, lazy import path wrong.

describe("HookFastLaneEngine — prism_dev:hook_fast_lane dispatcher round-trip", () => {
  it("devDispatcher.ts contains the hook_fast_lane action + case handler", () => {
    const text = readFileSync("H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts", "utf8");
    expect(text).toContain('"hook_fast_lane"');
    expect(text).toContain('case "hook_fast_lane":');
    expect(text).toContain('HookFastLaneEngine.js');
  });

  it("schema includes 'hook_fast_lane' with the 5 supported modes", async () => {
    const { ACTION_DEV_SCHEMAS } = await import("../schemas/devActionSchemas.js");
    expect(typeof ACTION_DEV_SCHEMAS.hook_fast_lane?.parse).toBe("function");
    const parsed = ACTION_DEV_SCHEMAS.hook_fast_lane.parse({ mode: "classify_block", block: { matcher: ".*", hooks: [{ command: "x" }] } });
    expect(parsed.mode).toBe("classify_block");
    const defaulted = ACTION_DEV_SCHEMAS.hook_fast_lane.parse({});
    expect(defaulted.mode).toBe("analyze");
    expect(() => ACTION_DEV_SCHEMAS.hook_fast_lane.parse({ mode: "bogus_mode" })).toThrow();
  });

  it("classify_block path is pure-function (no settings file required)", () => {
    const eng = makeEngine();
    const { splits, warnings } = eng.buildPlanForEvent("PreToolUse", [{
      matcher: ".*",
      hooks: [
        { command: '"node" H:/prism/.claude/hooks/tribal-spike.mjs' },
        { command: '"node" H:/prism/.claude/hooks/grep-result-cache.mjs' },
      ],
    }]);
    expect(splits.length).toBe(1);
    expect(splits[0].emitFastLane).toBe(true);
    expect(splits[0].narrowedMatcher).toBe(SLOW_LANE_NARROWED_MATCHER);
    expect(warnings.length).toBe(0);
  });
});
