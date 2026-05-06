/**
 * AwarenessHookAudit — INTEL-OLLAMA-OBSIDIAN-MS0/P10-U01.
 *
 * Pure-function tests for scripts/awareness-hook-audit.mjs — the
 * non-destructive consolidator that classifies awareness hooks at
 * H:/prism/.claude/hooks/ as canonical-keep / redundant-archive / unknown.
 *
 * Pattern matches P11-U08 (StopGateChain.test.ts) and P10-U06 (Audit.test.ts):
 * dynamic import of the .mjs via pathToFileURL inside beforeAll, exercise
 * the pure exports, leave the I/O layer alone (it touches H:/prism/...
 * which we don't want tests reaching into).
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/awareness-hook-audit.mjs");

let CANONICAL_AWARENESS_HOOKS: Set<string>;
let listAwarenessHooks: any;
let classifyHook: any;
let buildMigrationPlan: any;
let renderMarkdown: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  CANONICAL_AWARENESS_HOOKS = mod.CANONICAL_AWARENESS_HOOKS;
  listAwarenessHooks = mod.listAwarenessHooks;
  classifyHook = mod.classifyHook;
  buildMigrationPlan = mod.buildMigrationPlan;
  renderMarkdown = mod.renderMarkdown;
});

describe("P10-U01 CANONICAL_AWARENESS_HOOKS", () => {
  it("is a Set with exactly the 3 canonical hook names", () => {
    expect(CANONICAL_AWARENESS_HOOKS).toBeInstanceOf(Set);
    expect(CANONICAL_AWARENESS_HOOKS.size).toBe(3);
  });

  it("contains the documented names from the milestone exit_condition", () => {
    expect(CANONICAL_AWARENESS_HOOKS.has("awareness-snapshot.mjs")).toBe(true);
    expect(CANONICAL_AWARENESS_HOOKS.has("awareness-bootstrap.mjs")).toBe(true);
    expect(CANONICAL_AWARENESS_HOOKS.has("prism-awareness-cache.mjs")).toBe(true);
  });

  it("does not include any of the known-redundant hook names", () => {
    expect(CANONICAL_AWARENESS_HOOKS.has("ai-command-awareness.mjs")).toBe(false);
    expect(CANONICAL_AWARENESS_HOOKS.has("multi-session-awareness.mjs")).toBe(false);
    expect(CANONICAL_AWARENESS_HOOKS.has("prism-awareness-bundle.mjs")).toBe(false);
  });
});

describe("P10-U01 listAwarenessHooks", () => {
  function makeAdapter(files: Record<string, string[]>) {
    return {
      existsSync: (p: string) => Object.prototype.hasOwnProperty.call(files, p),
      readdirSync: (p: string) => files[p] ?? [],
    };
  }

  it("returns [] for a non-existent directory", () => {
    const adapter = makeAdapter({});
    expect(listAwarenessHooks("/nope", adapter)).toEqual([]);
  });

  it("filters to *awareness*.mjs basenames only", () => {
    const adapter = makeAdapter({
      "/hooks": [
        "awareness-snapshot.mjs",
        "tool-awareness.mjs",
        "stop_on_failing_tests.mjs",     // not awareness, drop
        "awareness-helpers.ts",          // wrong ext, drop
        "AwarenessBootstrap.mjs",        // case-insensitive match, keep
        "README.md",                     // drop
      ],
    });
    const out = listAwarenessHooks("/hooks", adapter);
    expect(out).toContain("awareness-snapshot.mjs");
    expect(out).toContain("tool-awareness.mjs");
    expect(out).toContain("AwarenessBootstrap.mjs");
    expect(out).not.toContain("stop_on_failing_tests.mjs");
    expect(out).not.toContain("awareness-helpers.ts");
    expect(out).not.toContain("README.md");
  });

  it("returns results in sorted order", () => {
    const adapter = makeAdapter({
      "/hooks": ["zz-awareness.mjs", "aa-awareness.mjs", "mm-awareness.mjs"],
    });
    const out = listAwarenessHooks("/hooks", adapter);
    expect(out).toEqual(["aa-awareness.mjs", "mm-awareness.mjs", "zz-awareness.mjs"]);
  });

  it("tolerates non-string entries from a misbehaving fs", () => {
    const adapter = makeAdapter({
      "/hooks": ["awareness-x.mjs", null as any, undefined as any, 42 as any],
    });
    const out = listAwarenessHooks("/hooks", adapter);
    expect(out).toEqual(["awareness-x.mjs"]);
  });
});

describe("P10-U01 classifyHook", () => {
  it("returns 'canonical' for the 3 canonical hooks", () => {
    expect(classifyHook("awareness-snapshot.mjs")).toBe("canonical");
    expect(classifyHook("awareness-bootstrap.mjs")).toBe("canonical");
    expect(classifyHook("prism-awareness-cache.mjs")).toBe("canonical");
  });

  it("returns 'redundant' for non-canonical *awareness*.mjs files", () => {
    expect(classifyHook("ai-command-awareness.mjs")).toBe("redundant");
    expect(classifyHook("tool-awareness.mjs")).toBe("redundant");
    expect(classifyHook("prism-awareness-bundle.mjs")).toBe("redundant");
    expect(classifyHook("multi-session-awareness.mjs")).toBe("redundant");
  });

  it("returns 'unknown' for non-awareness or non-mjs basenames", () => {
    expect(classifyHook("stop_on_failing_tests.mjs")).toBe("unknown");
    expect(classifyHook("awareness-helpers.ts")).toBe("unknown");
    expect(classifyHook("")).toBe("unknown");
    expect(classifyHook(null as any)).toBe("unknown");
    expect(classifyHook(undefined as any)).toBe("unknown");
    expect(classifyHook(42 as any)).toBe("unknown");
  });

  it("returns 'unknown' for stop_on_* gates even when name contains 'awareness' (P11-U08 ownership)", () => {
    // stop_on_awareness_degraded.mjs lives in STOP_GATE_LIST and must NOT
    // be archived by this audit, or the stop-gate-chain breaks.
    expect(classifyHook("stop_on_awareness_degraded.mjs")).toBe("unknown");
    expect(classifyHook("stop_on_awareness_missing.mjs")).toBe("unknown");
  });
});

describe("P10-U01 buildMigrationPlan", () => {
  it("partitions a mixed list correctly", () => {
    const plan = buildMigrationPlan([
      "awareness-snapshot.mjs",
      "awareness-bootstrap.mjs",
      "prism-awareness-cache.mjs",
      "ai-command-awareness.mjs",
      "tool-awareness.mjs",
      "session-awareness.mjs",
      "stop_on_failing_tests.mjs",
    ]);
    expect(plan.keep.sort()).toEqual([
      "awareness-bootstrap.mjs",
      "awareness-snapshot.mjs",
      "prism-awareness-cache.mjs",
    ]);
    expect(plan.move.sort()).toEqual([
      "ai-command-awareness.mjs",
      "session-awareness.mjs",
      "tool-awareness.mjs",
    ]);
    expect(plan.unknown).toEqual(["stop_on_failing_tests.mjs"]);
    expect(plan.summary).toEqual({
      total: 7,
      keepCount: 3,
      moveCount: 3,
      unknownCount: 1,
    });
  });

  it("returns empty plan for empty input", () => {
    const plan = buildMigrationPlan([]);
    expect(plan.keep).toEqual([]);
    expect(plan.move).toEqual([]);
    expect(plan.unknown).toEqual([]);
    expect(plan.summary).toEqual({ total: 0, keepCount: 0, moveCount: 0, unknownCount: 0 });
  });

  it("returns empty plan for non-array input (safety fallback)", () => {
    const plan = buildMigrationPlan(null as any);
    expect(plan.keep).toEqual([]);
    expect(plan.move).toEqual([]);
    expect(plan.unknown).toEqual([]);
    expect(plan.summary.total).toBe(0);
  });

  it("never double-counts: total === keep+move+unknown", () => {
    const plan = buildMigrationPlan([
      "awareness-snapshot.mjs",
      "tool-awareness.mjs",
      "garbage.mjs",
    ]);
    expect(plan.summary.keepCount + plan.summary.moveCount + plan.summary.unknownCount)
      .toBe(plan.summary.total);
  });
});

describe("P10-U01 renderMarkdown", () => {
  it("produces a non-empty Markdown document with all four sections", () => {
    const plan = buildMigrationPlan([
      "awareness-snapshot.mjs",
      "tool-awareness.mjs",
      "garbage.mjs",
    ]);
    const md = renderMarkdown(plan);
    expect(md).toContain("# AWARENESS-HOOK-CONSOLIDATION");
    expect(md).toContain("## Summary");
    expect(md).toContain("## Canonical (KEEP");
    expect(md).toContain("## Redundant (ARCHIVE");
    expect(md).toContain("## Unknown (REVIEW");
    expect(md).toContain("## How to apply");
  });

  it("renders the canonical hook(s) under Canonical section", () => {
    const plan = buildMigrationPlan(["awareness-snapshot.mjs"]);
    const md = renderMarkdown(plan);
    expect(md).toContain("`awareness-snapshot.mjs`");
  });

  it("renders the redundant hook(s) under Redundant section", () => {
    const plan = buildMigrationPlan(["tool-awareness.mjs"]);
    const md = renderMarkdown(plan);
    expect(md).toContain("`tool-awareness.mjs`");
  });

  it("emits the summary counts in the Markdown body", () => {
    const plan = buildMigrationPlan([
      "awareness-snapshot.mjs",
      "tool-awareness.mjs",
      "session-awareness.mjs",
      "weird.mjs",
    ]);
    const md = renderMarkdown(plan);
    expect(md).toContain("**Total awareness hooks discovered:** 4");
    expect(md).toContain("**Keep (canonical):** 1");
    expect(md).toContain("**Archive (redundant):** 2");
    expect(md).toContain("**Unknown:** 1");
  });

  it("renders placeholder text when a section is empty", () => {
    const plan = buildMigrationPlan([]);
    const md = renderMarkdown(plan);
    expect(md).toContain("_(none found");
    expect(md).toContain("_(none — directory already consolidated)_");
    expect(md).toContain("_(none)_");
  });

  it("includes the operator-facing 'How to apply' steps with mv guidance", () => {
    const plan = buildMigrationPlan(["tool-awareness.mjs"]);
    const md = renderMarkdown(plan);
    expect(md).toContain("non-destructive");
    expect(md).toContain(".deprecated/");
    expect(md).toMatch(/mv .+\.claude\/hooks/);
  });

  it("ends with a trailing newline (POSIX-friendly)", () => {
    const md = renderMarkdown(buildMigrationPlan([]));
    expect(md.endsWith("\n")).toBe(true);
  });
});
