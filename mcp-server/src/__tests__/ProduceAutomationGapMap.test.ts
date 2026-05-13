/**
 * ProduceAutomationGapMap.test.ts — vitest companion for scripts/produce-automation-gap-map.mjs
 *
 * Real reference-value assertions, no placeholder presence-only checks.
 * Tested unit: ACP-MS0 / P0-U05 — Produce gap map document.
 */
import { describe, it, expect } from "vitest";
import {
  readJsonSafe,
  readTextSafe,
  extractWiredHookBasenames,
  extractScriptInvocations,
  extractSkillsWithTriggers,
  dispatcherList,
  extractGateMatchers,
  classifyGaps,
  renderMarkdown,
} from "../../../scripts/produce-automation-gap-map.mjs";

describe("readJsonSafe", () => {
  it("returns null for a missing file (not throws)", () => {
    const result = readJsonSafe("Z:/this-path-does-not-exist-12345.json");
    expect(result).toBe(null);
  });
  it("returns the parsed slash-commands-inventory.json with schemaVersion=1 and >100 commands", () => {
    const j = readJsonSafe("H:/prism/state/shared/slash-commands-inventory.json");
    expect(j).not.toBe(null);
    expect(j.schemaVersion).toStrictEqual(1);
    expect(j.total).toBeGreaterThanOrEqual(100);
    expect(Array.isArray(j.records)).toBe(true);
    expect(j.records.length).toStrictEqual(j.total);
  });
  it("returns null when parsing an .mjs file as JSON (not throws)", () => {
    const result = readJsonSafe("H:/prism/scripts/produce-automation-gap-map.mjs");
    expect(result).toBe(null);
  });
});

describe("extractWiredHookBasenames", () => {
  it("captures exactly the foo-bar.mjs from a synthetic settings blob", () => {
    const text = `{"hooks":{"PreToolUse":[{"command":"node H:/prism/.claude/hooks/foo-bar.mjs"}]}}`;
    const result = extractWiredHookBasenames(text);
    expect([...result]).toEqual(["foo-bar.mjs"]);
  });
  it("returns empty Set with size===0 on empty input", () => {
    const result = extractWiredHookBasenames("");
    expect(result.size).toStrictEqual(0);
  });
  it("dedupes two refs to a.mjs and surfaces a.mjs + b.mjs (size 2)", () => {
    const text = "x .claude/hooks/a.mjs y .claude/hooks/a.mjs z .claude/hooks/b.mjs";
    const result = extractWiredHookBasenames(text);
    expect(result.size).toStrictEqual(2);
    expect([...result].sort()).toEqual(["a.mjs", "b.mjs"]);
  });
  it("returns Set with size===0 for null/undefined", () => {
    expect(extractWiredHookBasenames(null as any).size).toStrictEqual(0);
    expect(extractWiredHookBasenames(undefined as any).size).toStrictEqual(0);
  });
});

describe("extractScriptInvocations", () => {
  it("extracts exactly foo-bar.mjs from a node invocation string", () => {
    const text = "node H:/prism/scripts/foo-bar.mjs --flag";
    expect([...extractScriptInvocations(text)]).toEqual(["foo-bar.mjs"]);
  });
  it("returns Set of size 0 on empty input", () => {
    expect(extractScriptInvocations("").size).toStrictEqual(0);
  });
  it("dedupes repeated invocations — 3 occurrences across 2 unique names yields size 2", () => {
    const text = "scripts/x.mjs scripts/x.mjs scripts/y.mjs";
    const out = extractScriptInvocations(text);
    expect(out.size).toStrictEqual(2);
    expect([...out].sort()).toEqual(["x.mjs", "y.mjs"]);
  });
});

describe("extractSkillsWithTriggers", () => {
  it("filters 3 input records to exactly 1 with non-empty triggers; name preserved", () => {
    const inv = {
      records: [
        { name: "with-trig", triggers: ["foo"], source: "project", bucket: "x" },
        { name: "no-trig", triggers: [], source: "user", bucket: "y" },
        { name: "no-field", source: "user", bucket: "z" },
      ],
    };
    const out = extractSkillsWithTriggers(inv);
    expect(out.length).toStrictEqual(1);
    expect(out[0].name).toStrictEqual("with-trig");
    expect(out[0].triggers).toEqual(["foo"]);
  });
  it("returns [] (length 0) for null / empty obj / bad shape — no throw", () => {
    expect(extractSkillsWithTriggers(null).length).toStrictEqual(0);
    expect(extractSkillsWithTriggers({}).length).toStrictEqual(0);
    expect(extractSkillsWithTriggers({ records: "not-array" } as any).length).toStrictEqual(0);
  });
});

describe("dispatcherList", () => {
  it("dedupes 3 references to 2 dispatchers and returns them sorted ascending", () => {
    const wi = {
      engines: {
        0: { engine: "A", dispatchers: [{ dispatcher: "d2", actions: [] }, { dispatcher: "d1", actions: [] }] },
        1: { engine: "B", dispatchers: [{ dispatcher: "d1", actions: [] }] },
      },
    };
    const out = dispatcherList(wi);
    expect(out).toEqual(["d1", "d2"]);
    expect(out.length).toStrictEqual(2);
  });
  it("returns [] (exact length 0) on null/{}/missing engines", () => {
    expect(dispatcherList(null).length).toStrictEqual(0);
    expect(dispatcherList({}).length).toStrictEqual(0);
    expect(dispatcherList({ engines: null } as any).length).toStrictEqual(0);
  });
  it("ignores engines with no dispatchers field", () => {
    const wi = {
      engines: {
        0: { engine: "A", dispatchers: [{ dispatcher: "x", actions: [] }] },
        1: { engine: "B" }, // no dispatchers
      },
    } as any;
    expect(dispatcherList(wi)).toEqual(["x"]);
  });
});

describe("extractGateMatchers", () => {
  it("reads PreToolUse matchers and returns them in declaration order", () => {
    const s = { hooks: { PreToolUse: [{ matcher: "Edit" }, { matcher: "Bash" }, { matcher: "Read" }] } };
    expect(extractGateMatchers(s)).toEqual(["Edit", "Bash", "Read"]);
  });
  it("returns [] on null/{}/missing PreToolUse — no throw", () => {
    expect(extractGateMatchers(null).length).toStrictEqual(0);
    expect(extractGateMatchers({}).length).toStrictEqual(0);
    expect(extractGateMatchers({ hooks: {} } as any).length).toStrictEqual(0);
  });
  it("skips entries with no matcher field", () => {
    const s = { hooks: { PreToolUse: [{ matcher: "Edit" }, { hooks: [] }] } } as any;
    expect(extractGateMatchers(s)).toEqual(["Edit"]);
  });
});

describe("classifyGaps", () => {
  const allEightKeys = [
    "UNTRIGGERED_SKILLS",
    "HOOKS_NOT_WIRED",
    "SCRIPTS_NOT_INVOKED",
    "SKILLS_WITHOUT_HOOKS",
    "ENGINES_UNWIRED",
    "DISPATCHERS_NO_HOOK_GATE",
    "BROKEN_CHAINS",
    "ORPHAN_AUTO_GEN",
  ];

  it("returns exactly 8 gap classes, all arrays, when given empty inputs", () => {
    const gaps = classifyGaps({
      slashInventory: { schemaVersion: 1, total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: { hooks: { PreToolUse: [] } },
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: [],
    } as any);
    expect(Object.keys(gaps).sort()).toEqual([...allEightKeys].sort());
    for (const k of allEightKeys) {
      expect(Array.isArray(gaps[k as keyof typeof gaps])).toBe(true);
    }
  });

  it("tolerates fully-undefined inputs and still returns the 8-class shape", () => {
    const gaps = classifyGaps(undefined as any);
    expect(Object.keys(gaps).sort()).toEqual([...allEightKeys].sort());
  });

  it("HOOKS_NOT_WIRED contains unwired.mjs but NOT wired.mjs (exact count 1)", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: { hooks: { PreToolUse: [] } },
      settingsText: ".claude/hooks/wired.mjs",
      hooksOnDisk: ["wired.mjs", "unwired.mjs"],
      scriptsOnDisk: [],
    } as any);
    expect(gaps.HOOKS_NOT_WIRED).toEqual(["unwired.mjs"]);
    expect(gaps.HOOKS_NOT_WIRED.length).toStrictEqual(1);
  });

  it("SCRIPTS_NOT_INVOKED contains unused.mjs but NOT used.mjs (exact count 1)", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: null,
      settingsText: "node H:/prism/scripts/used.mjs",
      hooksOnDisk: [],
      scriptsOnDisk: ["used.mjs", "unused.mjs"],
    } as any);
    expect(gaps.SCRIPTS_NOT_INVOKED).toEqual(["unused.mjs"]);
  });

  it("Excludes underscore-prefixed scripts (one-shot helpers) — _helper.mjs absent, real.mjs present", () => {
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: { engines: {} },
      settingsJson: null,
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: ["_helper.mjs", "real.mjs"],
    } as any);
    expect(gaps.SCRIPTS_NOT_INVOKED).toEqual(["real.mjs"]);
  });

  it("ENGINES_UNWIRED reports count 2 from a 3-engine sample (1 wired, 2 unwired)", () => {
    const wi = {
      engines: {
        0: { engine: "E1", wired: false, dispatchers: [] },
        1: { engine: "E2", wired: true, dispatchers: [{ dispatcher: "d1", actions: [] }] },
        2: { engine: "E3", wired: false, dispatchers: [] },
      },
    };
    const gaps = classifyGaps({
      slashInventory: { total: 0, records: [] },
      engineWiring: wi,
      settingsJson: null,
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: [],
    } as any);
    // First entry is the __count__: <N> message; subsequent entries are samples
    const countLine = gaps.ENGINES_UNWIRED[0];
    expect(countLine).toContain("__count__: 2");
    expect(gaps.ENGINES_UNWIRED.some((s: string) => s.includes("E1"))).toBe(true);
    expect(gaps.ENGINES_UNWIRED.some((s: string) => s.includes("E3"))).toBe(true);
    expect(gaps.ENGINES_UNWIRED.some((s: string) => s.includes("E2"))).toBe(false);
  });

  it("SKILLS_WITHOUT_HOOKS surfaces the count of records lacking structured triggers", () => {
    const gaps = classifyGaps({
      slashInventory: {
        total: 3,
        records: [
          { name: "a", triggers: ["x"] },
          { name: "b" },
          { name: "c", triggers: [] },
        ],
      },
      engineWiring: { engines: {} },
      settingsJson: null,
      settingsText: "",
      hooksOnDisk: [],
      scriptsOnDisk: [],
    } as any);
    // 2 of 3 lack triggers
    expect(gaps.SKILLS_WITHOUT_HOOKS[0]).toContain("__count__: 2 of 3");
  });
});

describe("renderMarkdown", () => {
  const emptyGaps = {
    UNTRIGGERED_SKILLS: [],
    HOOKS_NOT_WIRED: [],
    SCRIPTS_NOT_INVOKED: [],
    SKILLS_WITHOUT_HOOKS: [],
    ENGINES_UNWIRED: [],
    DISPATCHERS_NO_HOOK_GATE: [],
    BROKEN_CHAINS: [],
    ORPHAN_AUTO_GEN: [],
  };
  const emptySummary = {
    generated_at: "2026-01-01T00:00:00Z",
    schema_version: 1,
    commands_total: 0,
    hooks_total: 0,
    scripts_total: 0,
    hooks_wired: 0,
    scripts_invoked: 0,
    engines_wired: 0,
    engines_unwired: 0,
  };
  it("produces an H1 title 'PRISM Automation Gap Map' anchored to start of line", () => {
    const md = renderMarkdown(emptyGaps as any, emptySummary as any);
    expect(md.split("\n")[0]).toStrictEqual("# PRISM Automation Gap Map");
  });
  it("emits exactly 8 '## <CLASS>' section headers", () => {
    const md = renderMarkdown(emptyGaps as any, emptySummary as any);
    const classHeaderCount = (md.match(/^## [A-Z_]+$/gm) ?? []).length;
    expect(classHeaderCount).toStrictEqual(8);
  });
  it("renders the dependency-chain note referencing P0-U02 and P0-U03", () => {
    const md = renderMarkdown(emptyGaps as any, emptySummary as any);
    expect(md).toMatch(/P0-U02 \(hooks inventory\)/);
    expect(md).toMatch(/P0-U03 \(scripts inventory\)/);
  });
  it("renders the empty-section placeholder '_(none — surface clean)_' for every empty gap class", () => {
    const md = renderMarkdown(emptyGaps as any, emptySummary as any);
    const emptyPlaceholderCount = (md.match(/_\(none — surface clean\)_/g) ?? []).length;
    expect(emptyPlaceholderCount).toStrictEqual(8);
  });
  it("renders summary table rows with exact commands_total value", () => {
    const md = renderMarkdown(emptyGaps as any, { ...emptySummary, commands_total: 663 } as any);
    expect(md).toMatch(/\| Slash commands inventoried \| 663 \|/);
  });
});
