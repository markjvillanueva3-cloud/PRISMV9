// activate-before-build-precheck.test.mjs — node:test suite
//
// U-ACTIVATE-BEFORE-BUILD-PRECHECK (JULIETT-12CHAT-ALLOCATION-MS0)
//
// Covers the pure-core (classifyPath, buildQuery, renderBlock, clampedTopK,
// searchWithTimeout, decide) PLUS a real-subprocess CLI smoke that proves the
// stdin→stdout wiring + script-guard work in the published artifact (per the
// "pure core + injected deps design MUST ship a subprocess oracle" lesson
// captured in [[reference_slot_bind_enforce_2026_05_18]]).
//
// Per-file scrutiny round 1: added P0/P1 fixes from the 2-reviewer gate —
//   * env snapshot/restore around decide + CLI suites (env-leak hazard P0-B)
//   * POSIX `/h/prism/` + mixed-separator path tests (P0-A)
//   * timeout-fires test using async slow search (P1-C)
//   * lib-load failure subprocess test via PRISM_ACTIVATE_PRECHECK_LIB_PATH (P1-B)
//   * real-data fail-on-revert oracle (P1-A)
//   * tmpdir fixture for "existing file" test instead of self-reference (P1-D)

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  classifyPath,
  buildQuery,
  renderBlock,
  clampedTopK,
  searchWithTimeout,
  decide,
} from "./activate-before-build-precheck.mjs";

const HOOK_PATH = fileURLToPath(new URL("./activate-before-build-precheck.mjs", import.meta.url));

// ─────────────────────────────────────────────────────────────────────────────
// Env snapshot helper (P0-B fix — env-leak hazard around decide + CLI suites).
// ─────────────────────────────────────────────────────────────────────────────

const ENV_KEYS = [
  "PRISM_ACTIVATE_PRECHECK_DISABLE",
  "PRISM_ACTIVATE_PRECHECK_K",
  "PRISM_ACTIVATE_PRECHECK_LIB_PATH",
];

function snapshotEnv() {
  const snap = {};
  for (const k of ENV_KEYS) snap[k] = process.env[k];
  return snap;
}
function restoreEnv(snap) {
  for (const k of ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

// ───────────── classifyPath ─────────────

describe("classifyPath", () => {
  it("matches new engine source file", () => {
    const c = classifyPath("H:/prism/mcp-server/src/engines/MyNewEngine.ts");
    assert.deepEqual(c, { kind: "engine", name: "MyNewEngine" });
  });

  it("matches engine with Windows backslashes", () => {
    const c = classifyPath("H:\\prism\\mcp-server\\src\\engines\\WedgeEngine.ts");
    assert.deepEqual(c, { kind: "engine", name: "WedgeEngine" });
  });

  it("matches engine with POSIX `/h/prism/` prefix (mingw/git-bash style)", () => {
    const c = classifyPath("/h/prism/mcp-server/src/engines/PosixEngine.ts");
    assert.deepEqual(c, { kind: "engine", name: "PosixEngine" });
  });

  it("matches engine with mixed forward/backslash separators", () => {
    const c = classifyPath("H:\\prism/mcp-server\\src/engines\\MixedEngine.ts");
    assert.deepEqual(c, { kind: "engine", name: "MixedEngine" });
  });

  it("matches hook file", () => {
    const c = classifyPath("H:/prism/.claude/hooks/my-new-hook.mjs");
    assert.deepEqual(c, { kind: "hook", name: "my-new-hook" });
  });

  it("matches hook with Windows backslashes", () => {
    const c = classifyPath("H:\\prism\\.claude\\hooks\\back-slash-hook.mjs");
    assert.deepEqual(c, { kind: "hook", name: "back-slash-hook" });
  });

  it("matches skill with Windows backslashes", () => {
    const c = classifyPath("H:\\prism\\.claude\\commands\\back-slash-skill.md");
    assert.deepEqual(c, { kind: "skill", name: "back-slash-skill" });
  });

  it("matches skill (commands/*.md)", () => {
    const c = classifyPath("H:/prism/.claude/commands/my-skill.md");
    assert.deepEqual(c, { kind: "skill", name: "my-skill" });
  });

  it("REJECTS test files (.test.ts)", () => {
    assert.equal(classifyPath("H:/prism/mcp-server/src/engines/MyEngine.test.ts"), null);
  });

  it("REJECTS test files (.test.mjs)", () => {
    assert.equal(classifyPath("H:/prism/.claude/hooks/foo.test.mjs"), null);
  });

  it("REJECTS spec files", () => {
    assert.equal(classifyPath("H:/prism/.claude/hooks/foo.spec.mjs"), null);
  });

  it("REJECTS .d.ts declaration files", () => {
    assert.equal(classifyPath("H:/prism/mcp-server/src/engines/Types.d.ts"), null);
  });

  it("REJECTS files outside the 3 source dirs", () => {
    assert.equal(classifyPath("H:/prism/scripts/some-script.mjs"), null);
    assert.equal(classifyPath("H:/prism/state/shared/something.json"), null);
    assert.equal(classifyPath("H:/prism/mcp-server/src/schemas/foo.ts"), null);
  });

  it("REJECTS engine name that doesn't end with 'Engine'", () => {
    // The spec is explicit: only *Engine.ts under /engines/. Plain types,
    // utilities, indexes etc must not trip the precheck.
    assert.equal(classifyPath("H:/prism/mcp-server/src/engines/Constants.ts"), null);
    assert.equal(classifyPath("H:/prism/mcp-server/src/engines/index.ts"), null);
  });

  it("REJECTS empty / non-string / null input (silent-fail)", () => {
    assert.equal(classifyPath(""), null);
    assert.equal(classifyPath(null), null);
    assert.equal(classifyPath(undefined), null);
    assert.equal(classifyPath(123), null);
    assert.equal(classifyPath({}), null);
  });
});

// ───────────── buildQuery ─────────────

describe("buildQuery", () => {
  it("CamelCase splits to space-joined tokens", () => {
    const q = buildQuery("DuplicationGuardEngine");
    // Joined form preserved + split form appended
    assert.match(q, /DuplicationGuardEngine/);
    assert.match(q, /Duplication Guard Engine/);
  });

  it("kebab-case splits to space-joined", () => {
    const q = buildQuery("activate-before-build-precheck");
    assert.match(q, /activate-before-build-precheck/);
    assert.match(q, /activate before build precheck/);
  });

  it("snake_case splits to space-joined", () => {
    const q = buildQuery("foo_bar_baz");
    assert.match(q, /foo_bar_baz/);
    assert.match(q, /foo bar baz/);
  });

  it("empty / non-string returns empty string", () => {
    assert.equal(buildQuery(""), "");
    assert.equal(buildQuery(null), "");
    assert.equal(buildQuery(undefined), "");
    assert.equal(buildQuery(42), "");
  });
});

// ───────────── renderBlock ─────────────

describe("renderBlock", () => {
  it("renders header + hits list", () => {
    const hits = [
      { id: "MyEngine", label: "Does the thing", layer: "L7", status: "built", score: 0.91 },
      { id: "OtherEngine", layer: "L7", status: "ghost" },
    ];
    const out = renderBlock("engine", "MyEngineCandidate", hits);
    assert.match(out, /Activate-before-build precheck/);
    assert.match(out, /MyEngineCandidate/);
    assert.match(out, /MyEngine/);
    assert.match(out, /OtherEngine/);
    assert.match(out, /score=0\.91/);
    assert.match(out, /duplication-hard-block/);  // mentions the next gate
  });

  it("empty hits → empty string (caller suppresses)", () => {
    assert.equal(renderBlock("engine", "Foo", []), "");
  });

  it("non-array hits → empty string", () => {
    assert.equal(renderBlock("engine", "Foo", null), "");
    assert.equal(renderBlock("engine", "Foo", undefined), "");
  });

  it("skips malformed hit entries (defensive)", () => {
    const hits = [
      { id: "Valid", label: "ok" },
      null,
      { /* no id */ label: "no-id" },
      { id: 42 /* non-string */, label: "wrong-type" },
      { id: "Valid2" },
    ];
    const out = renderBlock("engine", "Foo", hits);
    assert.match(out, /Valid/);
    assert.match(out, /Valid2/);
    assert.ok(!/no-id/.test(out), "should skip entry with no id");
    assert.ok(!/wrong-type/.test(out), "should skip entry with non-string id");
  });
});

// ───────────── clampedTopK ─────────────

describe("clampedTopK", () => {
  const orig = process.env.PRISM_ACTIVATE_PRECHECK_K;
  it("default = 5 when env unset", () => {
    delete process.env.PRISM_ACTIVATE_PRECHECK_K;
    try { assert.equal(clampedTopK(), 5); } finally {
      if (orig != null) process.env.PRISM_ACTIVATE_PRECHECK_K = orig;
    }
  });
  it("respects valid env value", () => {
    process.env.PRISM_ACTIVATE_PRECHECK_K = "8";
    try { assert.equal(clampedTopK(), 8); } finally {
      if (orig != null) process.env.PRISM_ACTIVATE_PRECHECK_K = orig;
      else delete process.env.PRISM_ACTIVATE_PRECHECK_K;
    }
  });
  it("clamps upper bound to 15", () => {
    process.env.PRISM_ACTIVATE_PRECHECK_K = "99";
    try { assert.equal(clampedTopK(), 15); } finally {
      if (orig != null) process.env.PRISM_ACTIVATE_PRECHECK_K = orig;
      else delete process.env.PRISM_ACTIVATE_PRECHECK_K;
    }
  });
  it("clamps lower bound to 1 (rejects 0 / negative / NaN)", () => {
    for (const bad of ["0", "-3", "abc", ""]) {
      process.env.PRISM_ACTIVATE_PRECHECK_K = bad;
      // 0/neg/NaN → fallback default 5 (per Number.isFinite guard)
      assert.equal(clampedTopK(), 5, `bad value=${JSON.stringify(bad)}`);
    }
    if (orig != null) process.env.PRISM_ACTIVATE_PRECHECK_K = orig;
    else delete process.env.PRISM_ACTIVATE_PRECHECK_K;
  });
});

// ───────────── searchWithTimeout ─────────────

describe("searchWithTimeout", () => {
  it("returns hits when search succeeds", async () => {
    const fakeSearch = () => ({ tokens: ["a"], hits: [{ id: "x" }, { id: "y" }] });
    const out = await searchWithTimeout(fakeSearch, "q", {}, 1000);
    assert.deepEqual(out, [{ id: "x" }, { id: "y" }]);
  });

  it("returns [] when search throws", async () => {
    const fakeSearch = () => { throw new Error("boom"); };
    const out = await searchWithTimeout(fakeSearch, "q", {}, 1000);
    assert.deepEqual(out, []);
  });

  it("returns [] when search returns malformed shape", async () => {
    const fakeSearch = () => ({ tokens: ["a"] /* no hits field */ });
    const out = await searchWithTimeout(fakeSearch, "q", {}, 1000);
    assert.deepEqual(out, []);
  });

  it("returns [] when shape returns hits as non-array", async () => {
    const fakeSearch = () => ({ tokens: [], hits: "not an array" });
    const out = await searchWithTimeout(fakeSearch, "q", {}, 1000);
    assert.deepEqual(out, []);
  });

  it("async runSearch — returns hits when Promise resolves under timeout", async () => {
    const asyncSearch = async () => {
      await new Promise((r) => setTimeout(r, 20));
      return { tokens: [], hits: [{ id: "asyncHit" }] };
    };
    const out = await searchWithTimeout(asyncSearch, "q", {}, 1000);
    assert.deepEqual(out, [{ id: "asyncHit" }]);
  });

  it("async runSearch — timer fires before Promise resolves → returns [] (P1-C fix)", async () => {
    // P1-C from Reviewer-B scrutiny: the watchdog must actually fire.
    // Async runSearch that delays 500ms; timeout 50ms → timer wins.
    const slowAsync = async () => {
      await new Promise((r) => setTimeout(r, 500));
      return { tokens: [], hits: [{ id: "tooLate" }] };
    };
    const start = Date.now();
    const out = await searchWithTimeout(slowAsync, "q", {}, 50);
    const elapsed = Date.now() - start;
    assert.deepEqual(out, []);
    // The watchdog must resolve well before the 500ms async finishes;
    // generous bound (200ms) to absorb event-loop jitter on a loaded box.
    assert.ok(elapsed < 200, `expected timeout to fire fast; elapsed=${elapsed}ms`);
  });

  it("async runSearch — Promise rejection → returns []", async () => {
    const rejecting = async () => { throw new Error("async boom"); };
    const out = await searchWithTimeout(rejecting, "q", {}, 1000);
    assert.deepEqual(out, []);
  });
});

// ───────────── decide (pure end-to-end) ─────────────

describe("decide", () => {
  // P0-B fix: snapshot+restore env knobs around the suite so a pre-set
  // PRISM_ACTIVATE_PRECHECK_DISABLE in the parent shell can't silently
  // green-light tests that should exercise the real decision tree.
  let envSnap;
  before(() => {
    envSnap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  after(() => { restoreEnv(envSnap); });

  const stubSearch = async () => [{ id: "Sibling", label: "exists" }];

  // P1-D fix: a real tmpdir fixture for the "already-exists" test. The
  // previous HOOK_PATH-of-the-test-file approach passes for the wrong reason
  // if the test file is ever moved/renamed.
  let tmpRoot;
  let fixtureHookPath;
  before(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "abp-fixture-"));
    const hookDir = join(tmpRoot, ".claude", "hooks");
    mkdirSync(hookDir, { recursive: true });
    fixtureHookPath = join(hookDir, "existing-fixture-hook.mjs");
    writeFileSync(fixtureHookPath, "// fixture\n", "utf8");
  });
  after(() => {
    try { rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* tmpfs cleanup best-effort */ }
  });

  it("wrong tool → suppressed", async () => {
    const out = await decide({ tool: "Read", input: { file_path: "H:/prism/mcp-server/src/engines/Foo.ts" } }, stubSearch);
    assert.equal(out.suppressOutput, true);
    assert.equal(out.continue, true);
    assert.equal(out.hookSpecificOutput, undefined);
  });

  it("non-create path → suppressed", async () => {
    const out = await decide({ tool: "Write", input: { file_path: "H:/prism/scripts/other-script.mjs" } }, stubSearch);
    assert.equal(out.suppressOutput, true);
  });

  it("test-file path → suppressed (filtered)", async () => {
    const out = await decide({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/Foo.test.ts" } }, stubSearch);
    assert.equal(out.suppressOutput, true);
  });

  it("knob disabled → suppressed (no search call)", async () => {
    let called = 0;
    const probe = async () => { called++; return [{ id: "x" }]; };
    process.env.PRISM_ACTIVATE_PRECHECK_DISABLE = "1";
    try {
      const out = await decide({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/AnyNewEngine.ts" } }, probe);
      assert.equal(out.suppressOutput, true);
      assert.equal(called, 0, "search must not run when disabled");
    } finally {
      delete process.env.PRISM_ACTIVATE_PRECHECK_DISABLE;
    }
  });

  it("already-exists file → suppressed (edit, not create)", async () => {
    // P1-D fix: use a freshly-created tmpdir fixture (classifies AS hook,
    // exists on disk). HOOK_PATH-as-fixture passes for the wrong reason if
    // the test file is moved.
    assert.ok(existsSync(fixtureHookPath), "fixture must exist before test runs");
    const out = await decide({ tool: "Write", input: { file_path: fixtureHookPath } }, stubSearch);
    assert.equal(out.suppressOutput, true);
  });

  it("empty hits → suppressed", async () => {
    const empty = async () => [];
    const out = await decide({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/UniqueAbcNewEngine.ts" } }, empty);
    assert.equal(out.suppressOutput, true);
  });

  it("non-empty hits → injects context block", async () => {
    const out = await decide({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/UniqueAbcNewEngine.ts" } }, stubSearch);
    assert.equal(out.continue, true);
    assert.equal(out.suppressOutput, undefined);
    assert.equal(out.hookSpecificOutput?.hookEventName, "PreToolUse");
    assert.match(out.hookSpecificOutput.additionalContext, /Activate-before-build precheck/);
    assert.match(out.hookSpecificOutput.additionalContext, /Sibling/);
    assert.match(out.hookSpecificOutput.additionalContext, /UniqueAbcNewEngine/);
  });

  it("search throws → suppressed (never crashes harness)", async () => {
    const thrower = async () => { throw new Error("nope"); };
    const out = await decide({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/AbcNewEngine.ts" } }, thrower);
    assert.equal(out.suppressOutput, true);
  });

  it("MultiEdit tool is honored (not just Write)", async () => {
    const out = await decide({ tool: "MultiEdit", input: { file_path: "H:/prism/mcp-server/src/engines/MultiEditEngine.ts" } }, stubSearch);
    assert.equal(out.hookSpecificOutput?.hookEventName, "PreToolUse");
  });

  it("missing file_path → suppressed", async () => {
    const out = await decide({ tool: "Write", input: {} }, stubSearch);
    assert.equal(out.suppressOutput, true);
  });

  it("missing input → suppressed", async () => {
    const out = await decide({ tool: "Write" }, stubSearch);
    assert.equal(out.suppressOutput, true);
  });
});

// ───────────── CLI subprocess oracle ─────────────
//
// The pure decide() core is fully covered, but the published artifact is a
// SCRIPT that the harness pipes stdin into. Reviewer-B lesson from prior
// hooks: a pure core + injected deps build MUST exercise the real subprocess
// at least once, or the main() wiring (which is the actual production path)
// goes untested. These tests run the real hook with controlled stdin.

describe("CLI subprocess", () => {
  // P0-B fix: env snapshot/restore prevents a parent-shell-set
  // PRISM_ACTIVATE_PRECHECK_DISABLE=1 from making every CLI test pass for
  // the wrong reason. The subprocesses spawn with a CLEAN env so each test
  // controls its own knobs.
  let envSnap;
  before(() => {
    envSnap = snapshotEnv();
    for (const k of ENV_KEYS) delete process.env[k];
  });
  after(() => { restoreEnv(envSnap); });

  // cleanEnv() — strip the precheck knobs from process.env so child inherits
  // a clean baseline; per-test overrides go into the `env` arg.
  function cleanEnv(overrides = {}) {
    const e = { ...process.env };
    for (const k of ENV_KEYS) delete e[k];
    return { ...e, ...overrides };
  }

  it("empty stdin → suppressed", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: "", encoding: "utf8", timeout: 10000, env: cleanEnv() });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
    assert.equal(out.continue, true);
  });

  it("malformed JSON stdin → suppressed (silent approve, never block)", () => {
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: "{not json", encoding: "utf8", timeout: 10000, env: cleanEnv() });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
  });

  it("Read tool → suppressed (wrong tool)", () => {
    const payload = JSON.stringify({ tool: "Read", input: { file_path: "H:/prism/foo.ts" } });
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: payload, encoding: "utf8", timeout: 10000, env: cleanEnv() });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
  });

  it("non-source path → suppressed (no lib load, fast-path)", () => {
    const payload = JSON.stringify({ tool: "Write", input: { file_path: "H:/prism/state/shared/foo.json" } });
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: payload, encoding: "utf8", timeout: 10000, env: cleanEnv() });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
  });

  it("knob disable → suppressed (no lib load)", () => {
    const payload = JSON.stringify({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/SomeNewEngine.ts" } });
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: payload,
      encoding: "utf8",
      timeout: 10000,
      env: cleanEnv({ PRISM_ACTIVATE_PRECHECK_DISABLE: "1" }),
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
  });

  it("existing file path → suppressed (edit not create)", () => {
    const payload = JSON.stringify({ tool: "Write", input: { file_path: HOOK_PATH } });
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: payload, encoding: "utf8", timeout: 10000, env: cleanEnv() });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true);
  });

  // P1-B fix: covers the lazy lib-load failure catch (the only path that
  // fires when the search lib is moved / deleted / syntax-broken). Without
  // this, the most safety-critical fail-safe in production is untested.
  it("lib-load failure → suppressed (PRISM_ACTIVATE_PRECHECK_LIB_PATH=/nonexistent)", () => {
    const payload = JSON.stringify({ tool: "Write", input: { file_path: "H:/prism/mcp-server/src/engines/SomeMissingLibEngine.ts" } });
    const r = spawnSync(process.execPath, [HOOK_PATH], {
      input: payload,
      encoding: "utf8",
      timeout: 10000,
      env: cleanEnv({ PRISM_ACTIVATE_PRECHECK_LIB_PATH: "H:/prism/this/path/definitely/does/not/exist.mjs" }),
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.suppressOutput, true, "lib-load failure must fall through to silent approve, never crash harness");
    assert.equal(out.continue, true);
  });

  // P1-A fix: real-data fail-on-revert oracle. Runs the REAL master-index lib
  // against the REAL graph + sidecar to prove the integration seam works
  // end-to-end. Spec line 59 explicitly requires this:
  //   "Real-data: simulate Write src/engines/DuplicationGuardEngine.ts (exists)
  //    → emits ≥1 hit for itself + similar Guard engines"
  //
  // We use a NEW-engine name (not an existing one — existsSync would short-circuit)
  // that lexically shares the "Guard" token with DuplicationGuardEngine and
  // expect the BM25 search to surface at least one Guard-family hit.
  it("real-data oracle: new GuardEngine name surfaces existing Guard-family hits", () => {
    const payload = JSON.stringify({
      tool: "Write",
      input: { file_path: "H:/prism/mcp-server/src/engines/SomeBrandNewGuardEngine.ts" },
    });
    const r = spawnSync(process.execPath, [HOOK_PATH], { input: payload, encoding: "utf8", timeout: 15000, env: cleanEnv() });
    assert.equal(r.status, 0, `hook must exit 0; got status=${r.status} stderr=${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.continue, true);
    // The hook either injects context (hits found) or suppresses (no hits).
    // For a Guard-family name, real data should return ≥1 hit — if it ever
    // suppresses we have a regression in the search-lib integration.
    assert.ok(out.hookSpecificOutput, "expected real lib to return ≥1 hit for a Guard-family name (production-wiring regression)");
    assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
    assert.match(out.hookSpecificOutput.additionalContext, /Activate-before-build precheck/);
    assert.match(out.hookSpecificOutput.additionalContext, /SomeBrandNewGuardEngine/, "block must echo the candidate name");
  });
});
