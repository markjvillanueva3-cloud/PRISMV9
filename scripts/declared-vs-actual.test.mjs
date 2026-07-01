/**
 * scripts/declared-vs-actual.test.mjs
 *
 * Hermetic node:test suite. No real filesystem reads — every I/O function
 * gets injected via readImpl / readdirImpl so the suite can run anywhere.
 *
 * Includes a "regression guard" integration test that pins today's actual
 * 2026-05-19 bug class: enabledMcpjsonServers listed "prism-mcp-server"
 * (typo'd name) while .mcp.json declared "prism" + "prism_safe". A revert
 * of the script that loses dormant_declared_not_configured detection must
 * fail this test.
 *
 * Run: node --test scripts/declared-vs-actual.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMcpDrift,
  findScaffoldedEmpty,
  diffSettings,
  levenshtein,
  auditHooks,
  extractWiredHookBasenames,
  buildReport,
  readJsonFile,
  listHookFiles,
  runReport,
} from "./declared-vs-actual.mjs";

const SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "declared-vs-actual.mjs"
);

// ─── getMcpDrift ──────────────────────────────────────────────────────────

test("getMcpDrift: identical sets → no drift", () => {
  const r = getMcpDrift(["a", "b", "c"], ["a", "b", "c"]);
  assert.deepEqual(r.dormant_declared_not_configured, []);
  assert.deepEqual(r.dormant_configured_not_declared, []);
  assert.deepEqual(r.typo_candidates, []);
});

test("getMcpDrift: declared-not-configured surfaces (today's bug class)", () => {
  const r = getMcpDrift(
    ["prism-mcp-server", "claude-flow"],
    ["prism", "prism_safe", "claude-flow"]
  );
  assert.deepEqual(r.dormant_declared_not_configured, ["prism-mcp-server"]);
  // prism-mcp-server → prism is distance 11 (way past typo threshold) so no
  // candidate — correct: it's a different name, not a typo
  assert.equal(r.typo_candidates.length, 0);
});

test("getMcpDrift: typo candidates within threshold", () => {
  // "prims" → "prism" is a transposition (m↔s); classical Levenshtein
  // scores this as 2 (two substitutions). Still well under our typo
  // threshold of 4, so the candidate should surface.
  const r = getMcpDrift(["prims"], ["prism", "prism_safe"]);
  assert.equal(r.typo_candidates.length, 1);
  assert.equal(r.typo_candidates[0].declared, "prims");
  assert.equal(r.typo_candidates[0].candidate, "prism");
  assert.equal(r.typo_candidates[0].distance, 2);
});

test("getMcpDrift: picks BEST typo candidate when multiple in range", () => {
  // "claude_flow" close to "claude-flow" (1) AND "claude-flo" (2)
  const r = getMcpDrift(["claude_flow"], ["claude-flo", "claude-flow"]);
  assert.equal(r.typo_candidates.length, 1);
  assert.equal(r.typo_candidates[0].candidate, "claude-flow");
  assert.equal(r.typo_candidates[0].distance, 1);
});

test("getMcpDrift: configured-not-declared surfaces", () => {
  const r = getMcpDrift(["prism"], ["prism", "prism_safe", "claude-flow"]);
  assert.deepEqual(r.dormant_configured_not_declared, ["prism_safe", "claude-flow"]);
});

test("getMcpDrift: empty inputs return clean drift", () => {
  const r = getMcpDrift([], []);
  assert.deepEqual(r.dormant_declared_not_configured, []);
  assert.deepEqual(r.dormant_configured_not_declared, []);
  assert.deepEqual(r.typo_candidates, []);
});

test("getMcpDrift: tolerates non-array inputs", () => {
  const r = getMcpDrift(null, undefined);
  assert.deepEqual(r.declared_in_settings, []);
  assert.deepEqual(r.configured_in_mcp_json, []);
});

// ─── findScaffoldedEmpty ──────────────────────────────────────────────────

test("findScaffoldedEmpty: empty strings only", () => {
  const r = findScaffoldedEmpty({ A: "x", B: "", C: "", D: "y" });
  assert.deepEqual(r, ["B", "C"]);
});

test("findScaffoldedEmpty: empty object", () => {
  assert.deepEqual(findScaffoldedEmpty({}), []);
});

test("findScaffoldedEmpty: ignores non-string falsy values", () => {
  const r = findScaffoldedEmpty({ A: 0, B: null, C: false, D: "", E: undefined });
  assert.deepEqual(r, ["D"]);
});

test("findScaffoldedEmpty: handles null/undefined input", () => {
  assert.deepEqual(findScaffoldedEmpty(null), []);
  assert.deepEqual(findScaffoldedEmpty(undefined), []);
  assert.deepEqual(findScaffoldedEmpty("not an object"), []);
});

test("findScaffoldedEmpty: pins today's class (SUPABASE/FIGMA)", () => {
  const r = findScaffoldedEmpty({
    PATH: "/usr/bin",
    SUPABASE_PROJECT_URL: "",
    SUPABASE_ANON_KEY: "",
    FIGMA_FILE_KEY: "",
    LINEAR_PROJECT: "PRISM",
  });
  assert.deepEqual(r, ["FIGMA_FILE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PROJECT_URL"]);
});

// ─── diffSettings ─────────────────────────────────────────────────────────

test("diffSettings: identical objects → no drift", () => {
  const r = diffSettings({ a: 1, b: "x" }, { a: 1, b: "x" });
  assert.deepEqual(r.keys_only_in_user, []);
  assert.deepEqual(r.keys_only_in_project, []);
  assert.deepEqual(r.value_diffs, []);
});

test("diffSettings: keys only in user", () => {
  const r = diffSettings({ a: 1, statusLine: { x: 1 } }, { a: 1 });
  assert.deepEqual(r.keys_only_in_user, ["statusLine"]);
  assert.deepEqual(r.keys_only_in_project, []);
});

test("diffSettings: keys only in project", () => {
  const r = diffSettings({ a: 1 }, { a: 1, projectOnly: 42 });
  assert.deepEqual(r.keys_only_in_project, ["projectOnly"]);
});

test("diffSettings: value diff (primitive)", () => {
  const r = diffSettings({ a: 1 }, { a: 2 });
  assert.equal(r.value_diffs.length, 1);
  assert.equal(r.value_diffs[0].key, "a");
  assert.equal(r.value_diffs[0].user, 1);
  assert.equal(r.value_diffs[0].project, 2);
});

test("diffSettings: value diff (nested object summarized)", () => {
  const r = diffSettings({ a: { x: 1, y: 2 } }, { a: { x: 1, y: 99 } });
  assert.equal(r.value_diffs.length, 1);
  assert.equal(r.value_diffs[0].key, "a");
  assert.match(String(r.value_diffs[0].user), /object\(2 keys\)/);
});

test("diffSettings: deep equal arrays not flagged", () => {
  const r = diffSettings(
    { servers: ["a", "b", "c"] },
    { servers: ["a", "b", "c"] }
  );
  assert.deepEqual(r.value_diffs, []);
});

test("diffSettings: array length diff flagged", () => {
  const r = diffSettings({ a: ["x", "y"] }, { a: ["x", "y", "z"] });
  assert.equal(r.value_diffs.length, 1);
});

test("diffSettings: handles empty / null inputs", () => {
  assert.deepEqual(diffSettings({}, {}).value_diffs, []);
  assert.deepEqual(diffSettings(null, null).value_diffs, []);
});

test("diffSettings: REGRESSION — same-length-different-keys not falsely equal", () => {
  // Reviewer P2: `{a:1, c:2}` vs `{a:1, b:undefined}` both have length 2;
  // the prior deepEqual would short-circuit via `b[c] === undefined` matching
  // `a[c] === undefined`. The hasOwnProperty guard prevents the silent equal.
  // Strong pin: BOTH keys must surface as one-sided (reviewer P3).
  const r = diffSettings({ a: 1, c: 2 }, { a: 1, b: undefined });
  assert.ok(
    r.keys_only_in_user.includes("c"),
    "c (user-only) must be in keys_only_in_user"
  );
  assert.ok(
    r.keys_only_in_project.includes("b"),
    "b (project-only) must be in keys_only_in_project"
  );
});

// ─── levenshtein ──────────────────────────────────────────────────────────

test("levenshtein: identical strings", () => {
  assert.equal(levenshtein("abc", "abc"), 0);
});

test("levenshtein: single insert", () => {
  assert.equal(levenshtein("abc", "abcd"), 1);
});

test("levenshtein: single substitute", () => {
  assert.equal(levenshtein("abc", "abd"), 1);
});

test("levenshtein: empty strings", () => {
  assert.equal(levenshtein("", "abc"), 3);
  assert.equal(levenshtein("abc", ""), 3);
  assert.equal(levenshtein("", ""), 0);
});

test("levenshtein: real-world (prims → prism = transposition, classical=2)", () => {
  // Classical Levenshtein treats transposition as 2 substitutions.
  // (Damerau-Levenshtein would score 1 — we chose classical for simplicity.)
  assert.equal(levenshtein("prims", "prism"), 2);
});

test("levenshtein: prism-mcp-server → prism (definitely not a typo)", () => {
  // 11 deletes — far above the typo threshold of 4
  assert.ok(levenshtein("prism-mcp-server", "prism") > 4);
});

// ─── auditHooks ───────────────────────────────────────────────────────────

test("auditHooks: all wired", () => {
  const r = auditHooks(["a.mjs", "b.mjs"], ["a.mjs", "b.mjs"]);
  assert.deepEqual(r.unwired_on_disk, []);
  assert.equal(r.wired_count, 2);
  assert.equal(r.on_disk_count, 2);
});

test("auditHooks: orphans on disk", () => {
  const r = auditHooks(["a.mjs", "b.mjs", "c.mjs"], ["a.mjs"]);
  assert.deepEqual(r.unwired_on_disk, ["b.mjs", "c.mjs"]);
});

test("auditHooks: tolerates non-array inputs", () => {
  const r = auditHooks(null, undefined);
  assert.equal(r.wired_count, 0);
  assert.equal(r.on_disk_count, 0);
  assert.deepEqual(r.unwired_on_disk, []);
});

// ─── extractWiredHookBasenames ────────────────────────────────────────────

test("extractWiredHookBasenames: extracts .mjs paths", () => {
  const hooks = {
    SessionStart: [
      { matcher: "", hooks: [
        { type: "command", command: '"node" H:/x/y/foo.mjs' },
        { type: "command", command: '"node" /a/b/bar.mjs --flag' },
      ]},
    ],
  };
  const r = extractWiredHookBasenames(hooks);
  assert.deepEqual(r.sort(), ["bar.mjs", "foo.mjs"]);
});

test("extractWiredHookBasenames: empty / null returns []", () => {
  assert.deepEqual(extractWiredHookBasenames({}), []);
  assert.deepEqual(extractWiredHookBasenames(null), []);
  assert.deepEqual(extractWiredHookBasenames("not-object"), []);
});

test("extractWiredHookBasenames: dedups across events", () => {
  // Real settings.json commands ALWAYS have a path separator before the
  // basename (e.g. "node H:/prism/.claude/hooks/foo.mjs"). The hardened
  // regex requires that boundary to suppress the hostile-input class
  // (a command containing `echo "fake.mjs"` should NOT register a hook).
  const hooks = {
    SessionStart: [{ matcher: "", hooks: [{ type: "command", command: 'node /x/y/foo.mjs' }] }],
    Stop: [{ matcher: "", hooks: [{ type: "command", command: 'node /a/b/foo.mjs --flag' }] }],
  };
  const r = extractWiredHookBasenames(hooks);
  assert.deepEqual(r, ["foo.mjs"]);
});

test("extractWiredHookBasenames: tolerates malformed entries", () => {
  const hooks = {
    SessionStart: [
      { matcher: "", hooks: [
        { type: "command" /* no command field */ },
        { type: "command", command: null },
        { type: "command", command: 12345 },
        { type: "command", command: 'node /a/b/real.mjs' },
      ]},
    ],
  };
  const r = extractWiredHookBasenames(hooks);
  assert.deepEqual(r, ["real.mjs"]);
});

test("extractWiredHookBasenames: REGRESSION — bare basename without path-separator is NOT extracted", () => {
  // Hostile-input class (reviewer P1): a command string containing a
  // .mjs token in an echo arg, comment, or env-var name must NOT inflate
  // wired_count. The path-separator boundary in the regex enforces this.
  const hooks = {
    SessionStart: [
      { matcher: "", hooks: [
        { type: "command", command: 'echo "fake-hook.mjs"' },
        { type: "command", command: 'COMMENT mock.mjs --input=stub.mjs' },
        { type: "command", command: 'node /real/path/legit.mjs' },
      ]},
    ],
  };
  const r = extractWiredHookBasenames(hooks);
  assert.deepEqual(r, ["legit.mjs"]);
});

test("extractWiredHookBasenames: handles backslash paths (Windows)", () => {
  const hooks = {
    SessionStart: [{ matcher: "", hooks: [
      { type: "command", command: 'node H:\\PRISM\\.claude\\hooks\\winhook.mjs' },
    ]}],
  };
  const r = extractWiredHookBasenames(hooks);
  assert.deepEqual(r, ["winhook.mjs"]);
});

// ─── buildReport ──────────────────────────────────────────────────────────

test("buildReport: blocking_count counts only dormant_declared_not_configured", () => {
  const r = buildReport({
    mcp: {
      dormant_declared_not_configured: ["x"],
      dormant_configured_not_declared: ["y"],
      typo_candidates: [],
    },
    env: { scaffolded_empty: ["A"] },
    settings: { drift: { keys_only_in_user: [], keys_only_in_project: [], value_diffs: [] } },
    hooks: { unwired_on_disk: [] },
    hostName: "test",
  });
  assert.equal(r.summary.blocking_count, 1);
  assert.equal(r.summary.ok, false);
  assert.equal(r.summary.drift_count, 3); // x + y + A
});

test("buildReport: ok=true when no blocking drift", () => {
  const r = buildReport({
    mcp: {
      dormant_declared_not_configured: [],
      dormant_configured_not_declared: [],
      typo_candidates: [],
    },
    env: { scaffolded_empty: [] },
    settings: { drift: { keys_only_in_user: [], keys_only_in_project: [], value_diffs: [] } },
    hooks: { unwired_on_disk: [] },
    hostName: "test",
  });
  assert.equal(r.summary.blocking_count, 0);
  assert.equal(r.summary.ok, true);
});

test("buildReport: schemaVersion + host + generatedAt present", () => {
  const r = buildReport({
    mcp: {},
    env: {},
    settings: { drift: {} },
    hooks: {},
    hostName: "h1",
    nowIso: "2026-05-19T00:00:00.000Z",
  });
  assert.equal(r.schemaVersion, "1.0.0");
  assert.equal(r.host, "h1");
  assert.equal(r.generatedAt, "2026-05-19T00:00:00.000Z");
});

test("buildReport: scaffolded-empty is advisory, not blocking", () => {
  const r = buildReport({
    mcp: { dormant_declared_not_configured: [], dormant_configured_not_declared: [], typo_candidates: [] },
    env: { scaffolded_empty: ["A", "B"] },
    settings: { drift: { keys_only_in_user: [], keys_only_in_project: [], value_diffs: [] } },
    hooks: { unwired_on_disk: [] },
    hostName: "h",
  });
  assert.equal(r.summary.blocking_count, 0);
  assert.equal(r.summary.drift_count, 2);
  assert.equal(r.summary.ok, true);
});

// ─── I/O wrappers (with injected readers) ─────────────────────────────────

test("readJsonFile: ENOENT returns null", async () => {
  const fake = async () => {
    const e = new Error("nope");
    e.code = "ENOENT";
    throw e;
  };
  const r = await readJsonFile("/missing", fake);
  assert.equal(r, null);
});

test("readJsonFile: malformed JSON throws with path", async () => {
  const fake = async () => "{ not json";
  await assert.rejects(
    readJsonFile("/x", fake),
    /readJsonFile.*JSON parse failed/
  );
});

test("readJsonFile: parses valid JSON", async () => {
  const fake = async () => '{"a":1}';
  assert.deepEqual(await readJsonFile("/x", fake), { a: 1 });
});

test("readJsonFile: non-ENOENT errors re-throw", async () => {
  const fake = async () => {
    const e = new Error("permission denied");
    e.code = "EACCES";
    throw e;
  };
  await assert.rejects(readJsonFile("/x", fake), /permission denied/);
});

test("listHookFiles: ENOENT returns empty", async () => {
  const fake = async () => {
    const e = new Error();
    e.code = "ENOENT";
    throw e;
  };
  assert.deepEqual(await listHookFiles("/x", fake), []);
});

test("listHookFiles: filters non-mjs and sorts", async () => {
  const fake = async () => ["b.mjs", "a.mjs", "c.txt", "d.js"];
  assert.deepEqual(await listHookFiles("/x", fake), ["a.mjs", "b.mjs"]);
});

// ─── runReport — end-to-end with hermetic readers ─────────────────────────

test("runReport: clean fleet (no drift)", async () => {
  const files = {
    "/u/.claude/settings.json": JSON.stringify({
      enabledMcpjsonServers: ["prism", "prism_safe", "claude-flow"],
      env: { A: "set" },
      hooks: { SessionStart: [{ matcher: "", hooks: [{ type: "command", command: "node /x/y/foo.mjs" }] }] },
    }),
    "/p/.claude/settings.json": JSON.stringify({
      enabledMcpjsonServers: ["prism", "prism_safe", "claude-flow"],
      env: { A: "set" },
      hooks: { SessionStart: [{ matcher: "", hooks: [{ type: "command", command: "node /x/y/foo.mjs" }] }] },
    }),
    "/p/.mcp.json": JSON.stringify({
      mcpServers: { prism: {}, prism_safe: {}, "claude-flow": {} },
    }),
  };
  const readImpl = async (p) => {
    if (files[p] !== undefined) return files[p];
    const e = new Error("ENOENT"); e.code = "ENOENT"; throw e;
  };
  const readdirImpl = async () => ["foo.mjs"];

  const r = await runReport({
    userSettingsPath: "/u/.claude/settings.json",
    projectSettingsPath: "/p/.claude/settings.json",
    mcpJsonPath: "/p/.mcp.json",
    hooksDir: "/p/.claude/hooks",
    hostName: "test-host",
    readImpl,
    readdirImpl,
  });
  assert.equal(r.summary.ok, true);
  assert.equal(r.summary.blocking_count, 0);
});

test("runReport: REGRESSION GUARD — catches today's actual bug class", async () => {
  // Reproduces the pre-fix 2026-05-19 state: enabledMcpjsonServers had
  // "prism-mcp-server" (wrong key), and .mcp.json declares prism + prism_safe
  // + claude-flow. The fix added "prism" + "prism_safe" to the enable list
  // and dropped "prism-mcp-server". A revert of this script that loses
  // dormant_declared_not_configured detection must fail this test.
  const files = {
    "/u/.claude/settings.json": JSON.stringify({
      enabledMcpjsonServers: ["prism-mcp-server", "claude-flow"],
      env: {
        SUPABASE_PROJECT_URL: "",
        SUPABASE_ANON_KEY: "",
        FIGMA_FILE_KEY: "",
      },
    }),
    "/p/.claude/settings.json": JSON.stringify({
      enabledMcpjsonServers: ["prism-mcp-server", "claude-flow"],
      env: {
        SUPABASE_PROJECT_URL: "",
        SUPABASE_ANON_KEY: "",
        FIGMA_FILE_KEY: "",
      },
    }),
    "/p/.mcp.json": JSON.stringify({
      mcpServers: { prism: {}, prism_safe: {}, "claude-flow": {} },
    }),
  };
  const readImpl = async (p) => {
    if (files[p] !== undefined) return files[p];
    const e = new Error("ENOENT"); e.code = "ENOENT"; throw e;
  };
  const readdirImpl = async () => [];

  const r = await runReport({
    userSettingsPath: "/u/.claude/settings.json",
    projectSettingsPath: "/p/.claude/settings.json",
    mcpJsonPath: "/p/.mcp.json",
    hooksDir: "/p/.claude/hooks",
    hostName: "h",
    readImpl,
    readdirImpl,
  });

  // (1) Bogus declared key surfaces as BLOCKING dormancy — EXACT pin
  // (reviewer P1: includes() lets a noisy revert still pass; pin the array)
  assert.deepEqual(
    r.mcp.dormant_declared_not_configured,
    ["prism-mcp-server"],
    "exactly one declared-not-configured: the typo'd name"
  );
  // (2) prism + prism_safe are configured but not declared → advisory
  // Sort-order may vary; pin by Set equality
  assert.deepEqual(
    new Set(r.mcp.dormant_configured_not_declared),
    new Set(["prism", "prism_safe"])
  );
  // (3) ALL THREE empty Supabase/Figma keys must surface
  assert.deepEqual(
    new Set(r.env.scaffolded_empty),
    new Set(["FIGMA_FILE_KEY", "SUPABASE_ANON_KEY", "SUPABASE_PROJECT_URL"])
  );
  // (4) Overall must be BLOCKING with exactly 1 blocking item
  assert.equal(r.summary.blocking_count, 1);
  assert.equal(r.summary.ok, false);
});

test("runReport: missing .mcp.json doesn't crash", async () => {
  const files = {
    "/u/.claude/settings.json": JSON.stringify({
      enabledMcpjsonServers: ["prism"],
    }),
  };
  const readImpl = async (p) => {
    if (files[p] !== undefined) return files[p];
    const e = new Error("ENOENT"); e.code = "ENOENT"; throw e;
  };
  const readdirImpl = async () => {
    const e = new Error("ENOENT"); e.code = "ENOENT"; throw e;
  };

  const r = await runReport({
    userSettingsPath: "/u/.claude/settings.json",
    projectSettingsPath: "/p/.claude/settings.json",
    mcpJsonPath: "/p/.mcp.json",
    hooksDir: "/p/.claude/hooks",
    hostName: "h",
    readImpl,
    readdirImpl,
  });
  // prism is declared but no .mcp.json to configure it → blocking
  assert.ok(r.mcp.dormant_declared_not_configured.includes("prism"));
  assert.equal(r.summary.ok, false);
});

test("runReport: malformed settings.json throws", async () => {
  const readImpl = async () => "{ broken json";
  const readdirImpl = async () => [];
  await assert.rejects(
    runReport({
      userSettingsPath: "/u",
      projectSettingsPath: "/p",
      mcpJsonPath: "/m",
      hooksDir: "/h",
      hostName: "h",
      readImpl,
      readdirImpl,
    }),
    /JSON parse failed/
  );
});

// ─── CLI subprocess tests — load-bearing for the P0 + P1 reviewer fixes ───

test("CLI: --strick (typo) rejected with exit 2 and stderr message", () => {
  const res = spawnSync(process.execPath, [SCRIPT_PATH, "--strick"], {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(res.status, 2, `expected exit 2, got ${res.status}`);
  assert.match(res.stderr, /unknown flag/i, "stderr must name the unknown flag");
  assert.match(res.stderr, /--strick/, "stderr must echo the offending flag");
});

test("CLI: --help exits 0 with usage text fully drained", () => {
  const res = spawnSync(process.execPath, [SCRIPT_PATH, "--help"], {
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(res.status, 0, `expected exit 0, got ${res.status}`);
  assert.match(res.stdout, /Usage: declared-vs-actual\.mjs/);
  assert.match(res.stdout, /Exit codes:/);
  // Drain check: the LAST line of help mentions exit code 2.
  // If `process.exit()` had pre-empted the drain, the tail would be missing.
  assert.match(res.stdout, /2 = reader error or unknown flag/);
});

test("CLI: multiple unknown flags — first one wins, exits 2", () => {
  const res = spawnSync(
    process.execPath,
    [SCRIPT_PATH, "--frist-bogus", "--second-bogus"],
    { encoding: "utf8", timeout: 10000 }
  );
  assert.equal(res.status, 2);
  assert.match(res.stderr, /--frist-bogus/);
});
