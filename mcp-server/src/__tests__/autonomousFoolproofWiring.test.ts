/**
 * AUTONOMOUS-FOOLPROOF wiring sanity test — U-AF10.
 *
 * Validates that all 8 U-AF hook scripts are wired into
 * .claude/settings.json with the correct event matchers and
 * blocking semantics. Without this test, a hook can be silently
 * unhooked by an accidental settings edit and the overnight
 * autonomous run loses safety nets without any signal.
 *
 * @milestone AUTONOMOUS-FOOLPROOF-MS0
 * @unit U-AF10
 */

import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const SETTINGS_PATH = path.resolve(__dirname, "../../../.claude/settings.json");

interface HookEntry {
  type: string;
  command: string;
  timeout?: number;
  continueOnError?: boolean;
}

interface MatcherBlock {
  matcher: string;
  hooks: HookEntry[];
}

interface SettingsJson {
  hooks: {
    PreToolUse?: MatcherBlock[];
    PostToolUse?: MatcherBlock[];
    Stop?: MatcherBlock[];
    [other: string]: MatcherBlock[] | undefined;
  };
}

function loadSettings(): SettingsJson {
  const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
  return JSON.parse(raw);
}

function findHook(blocks: MatcherBlock[] | undefined, scriptBasename: string): HookEntry | null {
  if (!blocks) return null;
  for (const block of blocks) {
    for (const h of block.hooks ?? []) {
      if (typeof h.command === "string" && h.command.includes(scriptBasename)) {
        return h;
      }
    }
  }
  return null;
}

function findHookInMatcher(
  blocks: MatcherBlock[] | undefined,
  matcherSubstring: string,
  scriptBasename: string,
): HookEntry | null {
  if (!blocks) return null;
  for (const block of blocks) {
    if (typeof block.matcher !== "string") continue;
    if (!block.matcher.includes(matcherSubstring)) continue;
    for (const h of block.hooks ?? []) {
      if (typeof h.command === "string" && h.command.includes(scriptBasename)) {
        return h;
      }
    }
  }
  return null;
}

describe("U-AF10 settings.json wiring sanity", () => {
  it("settings.json parses as valid JSON", () => {
    expect(() => loadSettings()).not.toThrow();
  });

  it("hooks block exists with PreToolUse/PostToolUse/Stop", () => {
    const s = loadSettings();
    expect(Array.isArray(s.hooks.PreToolUse)).toBe(true);
    expect(Array.isArray(s.hooks.PostToolUse)).toBe(true);
    expect(Array.isArray(s.hooks.Stop)).toBe(true);
  });
});

describe("U-AF10 PreToolUse:Read wiring", () => {
  it("ollama-engine-api-extractor wired on Read matcher", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Read", "ollama-engine-api-extractor.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF06 extractor is non-blocking (advisory cache write)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Read", "ollama-engine-api-extractor.mjs");
    expect(h?.continueOnError).toBe(true);
  });
});

describe("U-AF10 PreToolUse:Bash wiring", () => {
  it("tsc-baseline-regression-gate wired on Bash matcher", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Bash", "tsc-baseline-regression-gate.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF02 tsc gate BLOCKS on regression (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Bash", "tsc-baseline-regression-gate.mjs");
    expect(h?.continueOnError).toBe(false);
  });

  it("ollama-reviewer-second-opinion wired on Bash matcher", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Bash", "ollama-reviewer-second-opinion.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF08 reviewer BLOCKS on FAIL verdict (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Bash", "ollama-reviewer-second-opinion.mjs");
    expect(h?.continueOnError).toBe(false);
  });
});

describe("U-AF10 PreToolUse:Edit/Write wiring", () => {
  it("ollama-schema-engine-sync-gate wired on Edit|Write|MultiEdit matcher", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Edit", "ollama-schema-engine-sync-gate.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF07 schema-sync gate BLOCKS on enum drift (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PreToolUse, "Edit", "ollama-schema-engine-sync-gate.mjs");
    expect(h?.continueOnError).toBe(false);
  });
});

describe("U-AF10 PostToolUse wiring", () => {
  it("anti-regression-auto-sweep wired on Bash|Read matcher", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PostToolUse, "Bash", "anti-regression-auto-sweep.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF05 sweep is non-blocking (post-commit, records to ledger only)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PostToolUse, "Bash", "anti-regression-auto-sweep.mjs");
    expect(h?.continueOnError).toBe(true);
  });

  it("U-AF05 sweep timeout >=120s (vitest run for U-AF/U-WIRE suite)", () => {
    const s = loadSettings();
    const h = findHookInMatcher(s.hooks.PostToolUse, "Bash", "anti-regression-auto-sweep.mjs");
    expect((h?.timeout ?? 0)).toBeGreaterThanOrEqual(120000);
  });
});

describe("U-AF10 Stop wiring (3 hooks)", () => {
  it("autonomous-loop-watchdog wired on Stop", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "autonomous-loop-watchdog.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF01 watchdog BLOCKS on idle (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "autonomous-loop-watchdog.mjs");
    expect(h?.continueOnError).toBe(false);
  });

  it("reviewer-fail-latch wired on Stop", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "reviewer-fail-latch.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF03 fail-latch BLOCKS subsequent units (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "reviewer-fail-latch.mjs");
    expect(h?.continueOnError).toBe(false);
  });

  it("cost-ceiling-stop wired on Stop", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "cost-ceiling-stop.mjs");
    expect(h).not.toBeNull();
  });

  it("U-AF04 cost ceiling BLOCKS over caps (continueOnError:false)", () => {
    const s = loadSettings();
    const h = findHook(s.hooks.Stop, "cost-ceiling-stop.mjs");
    expect(h?.continueOnError).toBe(false);
  });
});

describe("U-AF10 hook script files exist on disk", () => {
  const hookFiles = [
    "autonomous-loop-watchdog.mjs",
    "tsc-baseline-regression-gate.mjs",
    "reviewer-fail-latch.mjs",
    "cost-ceiling-stop.mjs",
    "anti-regression-auto-sweep.mjs",
    "ollama-engine-api-extractor.mjs",
    "ollama-schema-engine-sync-gate.mjs",
    "ollama-reviewer-second-opinion.mjs",
  ];

  for (const f of hookFiles) {
    it(`${f} exists`, () => {
      const p = path.resolve(__dirname, "../../../.claude/hooks", f);
      expect(fs.existsSync(p)).toBe(true);
    });
  }
});

describe("U-AF10 initializer + yolo-mode command", () => {
  it("init-autonomous-state.mjs exists in repo (committed)", () => {
    const p = path.resolve(__dirname, "../../../.claude/scripts/init-autonomous-state.mjs");
    expect(fs.existsSync(p)).toBe(true);
  });

  // Note: .claude/commands/ is gitignored. yolo-mode.md is a local artifact;
  // we only assert content invariants when the file is present (skip otherwise).
  const yoloPath = path.resolve(__dirname, "../../../.claude/commands/yolo-mode.md");
  const yoloPresent = fs.existsSync(yoloPath);

  it.runIf(yoloPresent)("yolo-mode.md mentions all 8 U-AF units when present", () => {
    const content = fs.readFileSync(yoloPath, "utf8");
    for (const u of ["U-AF01", "U-AF02", "U-AF03", "U-AF04", "U-AF05", "U-AF06", "U-AF07", "U-AF08"]) {
      expect(content).toContain(u);
    }
  });

  it.runIf(yoloPresent)("yolo-mode.md sets PRISM_AUTONOMOUS=1 when present", () => {
    const content = fs.readFileSync(yoloPath, "utf8");
    expect(content).toContain("PRISM_AUTONOMOUS=1");
  });

  it.runIf(yoloPresent)("yolo-mode.md mentions the initializer script when present", () => {
    const content = fs.readFileSync(yoloPath, "utf8");
    expect(content).toContain("init-autonomous-state.mjs");
  });
});

describe("U-AF10 contract: full safety net wired", () => {
  it("all 8 U-AF hooks present in settings.json (count check)", () => {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf8");
    const expectedHooks = [
      "autonomous-loop-watchdog",
      "tsc-baseline-regression-gate",
      "reviewer-fail-latch",
      "cost-ceiling-stop",
      "anti-regression-auto-sweep",
      "ollama-engine-api-extractor",
      "ollama-schema-engine-sync-gate",
      "ollama-reviewer-second-opinion",
    ];
    for (const name of expectedHooks) {
      expect(raw).toContain(name);
    }
  });
});
