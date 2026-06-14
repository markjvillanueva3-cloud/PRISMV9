/**
 * Tests for verify-hook-refs.mjs (HOOK-SYNERGY-MS0 / U-H1.0)
 *
 * Covers the 5 exported pure functions. IO-heavy main() is exercised live in
 * the parent commit by the operator running `node scripts/verify-hook-refs.mjs --check`
 * (the script's first live run surfaced 392 disk-unwired hooks — proof of
 * end-to-end function on real data).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  collectSettingsRefs,
  extractMjsPath,
  normalizePath,
  classifyRef,
  parseTier,
  collectBundleMembers,
  findUnwiredDiskHooks,
} from "./verify-hook-refs.mjs";

describe("extractMjsPath(command)", () => {
  test("extracts a quoted Windows path", () => {
    const r = extractMjsPath('"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/foo.mjs');
    assert.equal(r, "H:/prism/.claude/hooks/foo.mjs");
  });
  test("extracts an unquoted Windows path", () => {
    const r = extractMjsPath("node H:/prism/.claude/hooks/bar.mjs --json");
    assert.equal(r, "H:/prism/.claude/hooks/bar.mjs");
  });
  test("extracts a relative ./ path", () => {
    const r = extractMjsPath("node ./hooks/baz.mjs");
    assert.equal(r, "./hooks/baz.mjs");
  });
  test("returns null when no .mjs token present", () => {
    assert.equal(extractMjsPath("echo hello"), null);
    assert.equal(extractMjsPath("npm run build"), null);
  });
  test("returns null for empty / non-string input", () => {
    assert.equal(extractMjsPath(""), null);
    assert.equal(extractMjsPath(null), null);
    assert.equal(extractMjsPath(undefined), null);
    assert.equal(extractMjsPath(42), null);
  });
  test("first .mjs wins on multi-path command", () => {
    const r = extractMjsPath("node H:/a.mjs && node H:/b.mjs");
    assert.equal(r, "H:/a.mjs");
  });
});

describe("normalizePath(p)", () => {
  test("converts backslashes to forward slashes", () => {
    const r = normalizePath("H:\\prism\\.claude\\hooks\\foo.mjs");
    assert.match(r, /H:\/prism\/\.claude\/hooks\/foo\.mjs$/);
  });
  test("absolute paths are returned as absolute", () => {
    const r = normalizePath("H:/prism/foo.mjs");
    assert.ok(r.includes("foo.mjs"));
  });
  test("empty / non-string input returns empty", () => {
    assert.equal(normalizePath(""), "");
    assert.equal(normalizePath(null), "");
    assert.equal(normalizePath(undefined), "");
  });
});

describe("parseTier(src)", () => {
  test("reads `// tier: T3` first-line annotation", () => {
    assert.equal(parseTier("// tier: T3\nimport ..."), "T3");
  });
  test("reads `// tier: T0` (blocker tier)", () => {
    assert.equal(parseTier("// tier: T0\n"), "T0");
  });
  test("uppercases inconsistent tier letter", () => {
    assert.equal(parseTier("// tier: t2"), "T2");
  });
  test("returns null when no tier annotation present", () => {
    assert.equal(parseTier("// regular comment\nimport ..."), null);
  });
  test("returns null on empty / non-string", () => {
    assert.equal(parseTier(""), null);
    assert.equal(parseTier(null), null);
    assert.equal(parseTier(undefined), null);
  });
  test("only scans first 50 lines (caps cost)", () => {
    const body = Array.from({ length: 60 }, () => "// noise\n").join("") + "// tier: T1\n";
    assert.equal(parseTier(body), null, "annotation past line 50 must NOT match");
  });
});

describe("collectSettingsRefs(settings)", () => {
  test("returns [] for null / non-object", () => {
    assert.deepEqual(collectSettingsRefs(null), []);
    assert.deepEqual(collectSettingsRefs("bogus"), []);
    assert.deepEqual(collectSettingsRefs(42), []);
    assert.deepEqual(collectSettingsRefs({}), []);
  });
  test("flattens a typical Stop chain", () => {
    const s = {
      hooks: {
        Stop: [
          {
            matcher: "",
            hooks: [
              { type: "command", command: "node H:/prism/.claude/hooks/a.mjs", timeout: 3000 },
              { type: "command", command: '"node" H:/prism/.claude/hooks/b.mjs', timeout: 5000 },
            ],
          },
        ],
      },
    };
    const refs = collectSettingsRefs(s);
    assert.equal(refs.length, 2);
    assert.equal(refs[0].event, "Stop");
    assert.equal(refs[0].mjsPath, "H:/prism/.claude/hooks/a.mjs");
    assert.equal(refs[0].timeout, 3000);
    assert.equal(refs[1].mjsPath, "H:/prism/.claude/hooks/b.mjs");
  });
  test("skips entries without an .mjs token", () => {
    const s = {
      hooks: {
        Stop: [
          {
            hooks: [
              { command: "echo hi" },
              { command: "node H:/prism/.claude/hooks/c.mjs" },
            ],
          },
        ],
      },
    };
    const refs = collectSettingsRefs(s);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].mjsPath, "H:/prism/.claude/hooks/c.mjs");
  });
  test("preserves group + index for re-targeting", () => {
    const s = {
      hooks: {
        PreToolUse: [
          {
            hooks: [
              { command: "node H:/prism/.claude/hooks/p0.mjs" },
              { command: "node H:/prism/.claude/hooks/p1.mjs" },
            ],
          },
          {
            hooks: [{ command: "node H:/prism/.claude/hooks/p2.mjs" }],
          },
        ],
      },
    };
    const refs = collectSettingsRefs(s);
    assert.equal(refs.length, 3);
    assert.equal(refs[0].group, 0);
    assert.equal(refs[0].index, 0);
    assert.equal(refs[1].group, 0);
    assert.equal(refs[1].index, 1);
    assert.equal(refs[2].group, 1);
    assert.equal(refs[2].index, 0);
  });
});

describe("classifyRef(ref, opts) — pure with injected IO", () => {
  const baseRef = {
    event: "Stop",
    group: 0,
    index: 0,
    matcher: "",
    command: "node /fake/foo.mjs",
    mjsPath: "/fake/foo.mjs",
    timeout: 3000,
  };

  test("MISSING file → SETTINGS_TO_MISSING_FILE", () => {
    const r = classifyRef(baseRef, {
      exists: () => false,
      readSrc: () => "",
    });
    assert.equal(r.state, "SETTINGS_TO_MISSING_FILE");
  });
  test("present file with tier → OK", () => {
    const r = classifyRef(baseRef, {
      exists: () => true,
      readSrc: () => "// tier: T3\nimport fs ...",
    });
    assert.equal(r.state, "OK");
    assert.equal(r.tier, "T3");
  });
  test("present file WITHOUT tier → MISSING_TIER_FRONTMATTER", () => {
    const r = classifyRef(baseRef, {
      exists: () => true,
      readSrc: () => "// just a comment\nimport ...",
    });
    assert.equal(r.state, "MISSING_TIER_FRONTMATTER");
    assert.equal(r.tier, null);
  });
  test("invalid path token → INVALID_PATH", () => {
    const r = classifyRef({ ...baseRef, mjsPath: "" }, {
      exists: () => true,
      readSrc: () => "// tier: T3\n",
    });
    assert.equal(r.state, "INVALID_PATH");
  });
  test("preserves original ref fields in classified result", () => {
    const r = classifyRef(baseRef, {
      exists: () => true,
      readSrc: () => "// tier: T0\n",
    });
    assert.equal(r.event, "Stop");
    assert.equal(r.group, 0);
    assert.equal(r.timeout, 3000);
  });
});

describe("collectBundleMembers(bundleSources) — iter18", () => {
  test("returns empty set on non-array input", () => {
    assert.equal(collectBundleMembers(null).size, 0);
    assert.equal(collectBundleMembers("bogus").size, 0);
    assert.equal(collectBundleMembers(undefined).size, 0);
  });
  test("extracts `${HOOK_BASE}/<name>.mjs` template-literal refs", () => {
    const src = "const HOOK_BASE='H:/prism/.claude/hooks';\n" +
      "const list=[\n" +
      "  { path: `${HOOK_BASE}/foo.mjs` },\n" +
      "  { path: `${HOOK_BASE}/bar.mjs` },\n" +
      "];";
    const r = collectBundleMembers([src]);
    assert.equal(r.has("foo.mjs"), true);
    assert.equal(r.has("bar.mjs"), true);
  });
  test("extracts relative-import-style `../<name>.mjs`", () => {
    const src = 'import { x } from "../some-hook.mjs";';
    const r = collectBundleMembers([src]);
    assert.equal(r.has("some-hook.mjs"), true);
  });
  test("excludes the hook-runner.mjs plumbing helper", () => {
    const src = 'import { runHook } from "./lib/hook-runner.mjs";';
    const r = collectBundleMembers([src]);
    assert.equal(r.has("hook-runner.mjs"), false);
  });
  test("dedups multiple references to the same hook", () => {
    const src = "`${HOOK_BASE}/dup.mjs` and `${HOOK_BASE}/dup.mjs` twice";
    const r = collectBundleMembers([src]);
    assert.equal(r.has("dup.mjs"), true);
    assert.equal(r.size, 1);
  });
  test("scans across multiple sources", () => {
    const a = "`${HOOK_BASE}/alpha.mjs`";
    const b = "`${HOOK_BASE}/beta.mjs`";
    const r = collectBundleMembers([a, b]);
    assert.equal(r.size, 2);
    assert.equal(r.has("alpha.mjs"), true);
    assert.equal(r.has("beta.mjs"), true);
  });
  test("ignores non-string entries in the source list", () => {
    const r = collectBundleMembers(["`${HOOK_BASE}/good.mjs`", null, 42, undefined]);
    assert.equal(r.size, 1);
  });
});

describe("findUnwiredDiskHooks(diskFiles, wiredAbsSet, bundleMembers) — iter18 update", () => {
  test("excludes bundle members from the unwired set", () => {
    const disk = ["/abs/foo.mjs", "/abs/bar.mjs", "/abs/baz.mjs"].map((p) => p);
    const wired = new Set([normalizePath("/abs/foo.mjs")]);
    const bundleMembers = new Set(["bar.mjs"]);
    const unwired = findUnwiredDiskHooks(disk, wired, bundleMembers);
    const basenames = unwired.map((p) => p.split("/").pop());
    assert.equal(basenames.includes("foo.mjs"), false);     // wired
    assert.equal(basenames.includes("bar.mjs"), false);     // bundle
    assert.equal(basenames.includes("baz.mjs"), true);      // genuinely orphan
  });
  test("excludes KNOWN_DISK_ONLY entries (alpha-slot-reaper-guardian)", () => {
    const disk = ["/abs/alpha-slot-reaper-guardian.mjs"];
    const unwired = findUnwiredDiskHooks(disk, new Set(), new Set());
    assert.equal(unwired.length, 0);
  });
  test("excludes test files + dotfiles + underscore-prefixed helpers", () => {
    const disk = [
      "/abs/foo.test.mjs",
      "/abs/_helper.mjs",
      "/abs/.hidden.mjs",
      "/abs/real-hook.mjs",
    ];
    const unwired = findUnwiredDiskHooks(disk, new Set(), new Set());
    const basenames = unwired.map((p) => p.split("/").pop());
    assert.deepEqual(basenames, ["real-hook.mjs"]);
  });
  test("3rd param defaults to empty Set (back-compat with iter17 call sites)", () => {
    const disk = ["/abs/foo.mjs"];
    const unwired = findUnwiredDiskHooks(disk, new Set()); // no 3rd arg
    assert.equal(unwired.length, 1);
  });
});
