// scripts/hook-wiring-vs-fire-categorize.test.mjs
// Pure-function tests for U-OBF-F4 categorizer. Real reference values + edge
// cases + adversarial inputs per CLAUDE.md test discipline.
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractWiredBasenames,
  categorize,
} from "./hook-wiring-vs-fire-categorize.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// extractWiredBasenames
// ─────────────────────────────────────────────────────────────────────────────

describe("extractWiredBasenames", () => {
  it("extracts a single hook command from a flat object", () => {
    const settings = {
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: "node .claude/hooks/foo.mjs" }] },
        ],
      },
    };
    assert.deepEqual(extractWiredBasenames(settings), ["foo"]);
  });

  it("handles forward and backslash path separators", () => {
    const settings = {
      a: "node .claude\\hooks\\bar.mjs",
      b: "node .claude/hooks/baz.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["bar", "baz"]);
  });

  it("dedupes when a hook is wired under multiple matchers", () => {
    const settings = {
      a: "node .claude/hooks/foo.mjs",
      b: "node .claude/hooks/foo.mjs",
      c: "node .claude/hooks/foo.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["foo"]);
  });

  it("returns sorted basenames", () => {
    const settings = {
      a: "node .claude/hooks/charlie.mjs",
      b: "node .claude/hooks/alpha.mjs",
      c: "node .claude/hooks/bravo.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["alpha", "bravo", "charlie"]);
  });

  it("ignores non-.mjs files referenced under hooks/", () => {
    const settings = {
      a: "node .claude/hooks/foo.js",
      b: "node .claude/hooks/bar.mjs",
      c: "node .claude/hooks/baz.ts",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["bar"]);
  });

  it("ignores .mjs references outside a hooks/ segment", () => {
    const settings = {
      a: "node .claude/helpers/per-agent-handoff.mjs",
      b: "node scripts/foo.mjs",
      c: "node .claude/hooks/real-hook.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["real-hook"]);
  });

  it("recurses into arrays of strings + nested objects", () => {
    const settings = {
      top: [
        { command: "node .claude/hooks/a.mjs" },
        { command: "node .claude/hooks/b.mjs" },
        { nested: [{ command: "node .claude/hooks/c.mjs" }] },
      ],
    };
    assert.deepEqual(extractWiredBasenames(settings), ["a", "b", "c"]);
  });

  it("handles the absolute-path windows shape from H:/.claude/settings.json", () => {
    const settings = {
      cmd: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/octopus.mjs',
    };
    assert.deepEqual(extractWiredBasenames(settings), ["octopus"]);
  });

  it("extracts multiple hooks from a single command line", () => {
    const settings = {
      cmd: "node .claude/hooks/first.mjs && node .claude/hooks/second.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), ["first", "second"]);
  });

  it("returns [] on null input", () => {
    assert.deepEqual(extractWiredBasenames(null), []);
  });

  it("returns [] on undefined input", () => {
    assert.deepEqual(extractWiredBasenames(undefined), []);
  });

  it("returns [] on non-object input (number / string / boolean)", () => {
    assert.deepEqual(extractWiredBasenames(42), []);
    assert.deepEqual(extractWiredBasenames("foo"), []);
    assert.deepEqual(extractWiredBasenames(true), []);
  });

  it("returns [] when no hook references exist", () => {
    const settings = { env: { FOO: "bar" }, permissions: { allow: ["read"] } };
    assert.deepEqual(extractWiredBasenames(settings), []);
  });

  it("handles hyphens, underscores, dots in basename", () => {
    const settings = {
      a: "node .claude/hooks/my-hook-name.mjs",
      b: "node .claude/hooks/my_hook_name.mjs",
      c: "node .claude/hooks/my.hook.name.mjs",
    };
    assert.deepEqual(extractWiredBasenames(settings), [
      "my-hook-name",
      "my.hook.name",
      "my_hook_name",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// categorize
// ─────────────────────────────────────────────────────────────────────────────

describe("categorize", () => {
  it("splits zero-fire into wired-but-silent vs unwired-on-disk", () => {
    const r = categorize({
      zeroFire: ["a", "b", "c", "d"],
      wiredBasenames: ["a", "c", "x"],
    });
    assert.deepEqual(r.wiredButSilent, ["a", "c"]);
    assert.deepEqual(r.unwiredOnDisk, ["b", "d"]);
    assert.deepEqual(r.counts, {
      totalZeroFire: 4,
      wiredButSilent: 2,
      unwiredOnDisk: 2,
      totalWired: 3,
    });
  });

  it("handles empty zero-fire list", () => {
    const r = categorize({ zeroFire: [], wiredBasenames: ["a", "b"] });
    assert.deepEqual(r.wiredButSilent, []);
    assert.deepEqual(r.unwiredOnDisk, []);
    assert.equal(r.counts.totalZeroFire, 0);
    assert.equal(r.counts.totalWired, 2);
  });

  it("handles empty wired list — every zero-fire is unwired-on-disk", () => {
    const r = categorize({ zeroFire: ["a", "b", "c"], wiredBasenames: [] });
    assert.deepEqual(r.wiredButSilent, []);
    assert.deepEqual(r.unwiredOnDisk, ["a", "b", "c"]);
  });

  it("handles complete overlap — every zero-fire is wired-but-silent", () => {
    const r = categorize({
      zeroFire: ["a", "b", "c"],
      wiredBasenames: ["a", "b", "c"],
    });
    assert.deepEqual(r.wiredButSilent, ["a", "b", "c"]);
    assert.deepEqual(r.unwiredOnDisk, []);
  });

  it("dedupes duplicates in zero-fire input", () => {
    const r = categorize({
      zeroFire: ["a", "a", "b", "b", "b"],
      wiredBasenames: ["a"],
    });
    assert.deepEqual(r.wiredButSilent, ["a"]);
    assert.deepEqual(r.unwiredOnDisk, ["b"]);
    assert.equal(r.counts.totalZeroFire, 2);
  });

  it("outputs sorted arrays", () => {
    const r = categorize({
      zeroFire: ["charlie", "alpha", "bravo"],
      wiredBasenames: ["bravo", "alpha", "charlie"],
    });
    assert.deepEqual(r.wiredButSilent, ["alpha", "bravo", "charlie"]);
  });

  it("treats null/undefined inputs as empty arrays", () => {
    const r1 = categorize({ zeroFire: null, wiredBasenames: null });
    assert.deepEqual(r1.wiredButSilent, []);
    assert.deepEqual(r1.unwiredOnDisk, []);
    assert.deepEqual(r1.counts, {
      totalZeroFire: 0,
      wiredButSilent: 0,
      unwiredOnDisk: 0,
      totalWired: 0,
    });
    const r2 = categorize({});
    assert.deepEqual(r2.wiredButSilent, []);
    assert.deepEqual(r2.unwiredOnDisk, []);
  });

  it("treats non-array inputs (string, object) as empty arrays", () => {
    const r = categorize({ zeroFire: "not-an-array", wiredBasenames: { a: 1 } });
    assert.deepEqual(r.wiredButSilent, []);
    assert.deepEqual(r.unwiredOnDisk, []);
  });

  it("preserves counts even when buckets are empty", () => {
    const r = categorize({ zeroFire: [], wiredBasenames: [] });
    assert.deepEqual(r.counts, {
      totalZeroFire: 0,
      wiredButSilent: 0,
      unwiredOnDisk: 0,
      totalWired: 0,
    });
  });

  it("handles large adversarial input (1000 wired + 1000 zero-fire, half overlap)", () => {
    const wired = Array.from({ length: 1000 }, (_, i) => `hook${i}`);
    const zero = Array.from({ length: 1000 }, (_, i) => `hook${i + 500}`);
    const r = categorize({ zeroFire: zero, wiredBasenames: wired });
    // overlap is hook500..hook999 = 500 names
    assert.equal(r.wiredButSilent.length, 500);
    assert.equal(r.unwiredOnDisk.length, 500);
    assert.equal(r.counts.totalZeroFire, 1000);
    assert.equal(r.counts.totalWired, 1000);
    // First overlap entry
    assert.equal(r.wiredButSilent[0], "hook500");
  });

  it("regression: counts.wiredButSilent + counts.unwiredOnDisk === counts.totalZeroFire", () => {
    // Conservation invariant — every zero-fire must land in exactly one bucket.
    for (const [zf, wired] of [
      [["a", "b", "c"], ["a"]],
      [["x", "y"], []],
      [[], ["q", "r"]],
      [["a", "b", "c", "d", "e"], ["a", "b", "c", "d", "e"]],
    ]) {
      const r = categorize({ zeroFire: zf, wiredBasenames: wired });
      assert.equal(
        r.counts.wiredButSilent + r.counts.unwiredOnDisk,
        r.counts.totalZeroFire,
        `conservation broke for zeroFire=${JSON.stringify(zf)} wired=${JSON.stringify(wired)}`
      );
    }
  });
});
