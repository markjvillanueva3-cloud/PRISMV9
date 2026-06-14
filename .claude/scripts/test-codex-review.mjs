#!/usr/bin/env node
/**
 * test-codex-review.mjs
 *
 * Standalone node test runner for runCodexReview() — the advisory Codex CLI
 * review arm in scrutiny-3way.mjs (added 2026-05-18).
 *
 * Mirrors test-ollama-preflight.mjs: lives in .claude/scripts/ alongside the
 * unit-under-test, imports the .mjs directly (vitest's transform pipeline
 * rejects .ts→.mjs cross-extension imports), exercises the function through
 * its `opts` injection seam — here `opts.spawnImpl`, a fake child-process
 * spawner — so every path is deterministic and OFFLINE (no real `codex`,
 * no network, no quota).
 *
 * Run: `node H:/prism/.claude/scripts/test-codex-review.mjs`
 *      Exits 0 on all-pass, 1 on any failure. Prints PASS/FAIL per case.
 *
 * Coverage (21 cases):
 *  - happy path: VERDICT pass/fail, BLOCKER extraction, rawOutputPeek
 *  - failure modes → skipped: spawn throw, child error, non-zero exit,
 *    empty stdout, timeout (child killed), quota/429/auth/network/EPIPE in stderr
 *  - advisory contract: disabled arm (durationMs 0), malformed VERDICT
 *  - security: bad `target` rejected BEFORE spawn (spawn never called)
 *  - regression guard: env-fail signature in STDOUT must NOT skip (stderr-only)
 *  - argv shape: --uncommitted vs --commit <sha>; instructions piped via stdin;
 *    .cmd bin → shell:true seam (win32-aware)
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { EventEmitter } from "node:events";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRUTINY_URL = pathToFileURL(resolve(__dirname, "scrutiny-3way.mjs")).href;
const mod = await import(SCRUTINY_URL);
const { runCodexReview } = mod;

let passes = 0;
let fails = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    process.stdout.write(`  ✓ ${name}\n`);
    passes++;
  } catch (err) {
    process.stdout.write(`  ✗ ${name}\n    ${err.message}\n`);
    fails++;
    failures.push({ name, message: err.message });
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
function assertContains(haystack, needle, label) {
  if (typeof haystack !== "string" || !haystack.includes(needle)) {
    throw new Error(`${label}: expected substring ${JSON.stringify(needle)}, got ${JSON.stringify(haystack)}`);
  }
}
function assertNotContains(haystack, needle, label) {
  if (typeof haystack === "string" && haystack.includes(needle)) {
    throw new Error(`${label}: expected NOT to contain ${JSON.stringify(needle)}, got ${JSON.stringify(haystack)}`);
  }
}
function assertTrue(cond, label) {
  if (!cond) throw new Error(`${label}: expected truthy`);
}

/**
 * Fake child process. Returns an EventEmitter shaped like a real ChildProcess
 * (stdout/stderr sub-emitters, an stdin sink, kill()). Emits its data + close
 * asynchronously (setTimeout) so runCodexReview's listeners — attached
 * synchronously after spawnImpl() returns — are in place first.
 */
function makeChild({ stdout = "", stderr = "", code = 0, delayMs = 0, emitError = null, stdinSink = null }) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = Object.assign(new EventEmitter(), {
    write(data) { if (stdinSink) stdinSink.data += String(data); },
    end() {},
  });
  child.killed = false;
  // Capture the emit timer so kill() can cancel it — a real killed child stops
  // producing output. Cancelling also prevents a dangling timer from leaking
  // past the resolved test (the timeout case resolves long before delayMs).
  const emitTimer = setTimeout(() => {
    if (emitError) { child.emit("error", emitError); return; }
    if (stdout) child.stdout.emit("data", Buffer.from(stdout));
    if (stderr) child.stderr.emit("data", Buffer.from(stderr));
    child.emit("close", code);
  }, delayMs);
  child.kill = () => { child.killed = true; clearTimeout(emitTimer); };
  return child;
}
// A spawnImpl that returns a configured fake child.
const mockSpawn = (cfg) => () => makeChild(cfg);
// A spawnImpl that throws synchronously (codex binary missing).
const throwingSpawn = (err) => () => { throw err; };
// A spawnImpl that records (bin, args) into `sink` then returns a fake child.
const capturingSpawn = (cfg, sink) => (bin, args, options) => {
  sink.bin = bin;
  sink.args = args;
  sink.options = options;
  return makeChild(cfg);
};

// ─── happy path ──────────────────────────────────────────────────────────────
process.stdout.write("\n[happy path]\n");

await test("verdict=pass when codex emits VERDICT: PASS", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "VERDICT: PASS\nNo issues found.", code: 0 }),
  });
  assertEqual(r.provider, "codex-review", "provider");
  assertEqual(r.verdict, "pass", "verdict");
  assertEqual(r.skipped, false, "skipped");
  assertEqual(r.blockers, "", "blockers");
});

await test("verdict=fail and BLOCKER lines extracted verbatim", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({
      stdout: "VERDICT: FAIL\nBLOCKER: stub return in foo.ts:42\nBLOCKER: missing dispatcher wiring\nextra note",
      code: 0,
    }),
  });
  assertEqual(r.verdict, "fail", "verdict");
  assertEqual(r.skipped, false, "skipped");
  assertEqual(
    r.blockers,
    "BLOCKER: stub return in foo.ts:42\nBLOCKER: missing dispatcher wiring",
    "blockers",
  );
});

await test("rawOutputPeek present on a real verdict; durationMs finite", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "VERDICT: PASS\nlgtm", code: 0 }),
  });
  assertContains(r.rawOutputPeek, "VERDICT: PASS", "rawOutputPeek");
  assertEqual(typeof r.durationMs, "number", "durationMs type");
  assertTrue(Number.isFinite(r.durationMs) && r.durationMs >= 0, "durationMs finite >= 0");
});

// ─── failure modes → skipped (advisory degrade, never "fail") ─────────────────
process.stdout.write("\n[failure modes -> skipped]\n");

await test("spawn throws (codex binary missing) -> skipped, NOT fail", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: throwingSpawn(new Error("ENOENT codex")),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertEqual(r.skipped, true, "skipped");
  assertContains(r.notes, "spawn failed", "notes");
});

await test("child 'error' event -> skipped", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ emitError: new Error("spawn EACCES") }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "child error", "notes");
});

await test("non-zero exit with no VERDICT line -> skipped (advisory no-signal)", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "some unstructured codex output", code: 1 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "no VERDICT line", "notes");
});

await test("empty stdout -> skipped", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "", code: 0 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "no VERDICT line", "notes");
});

await test("timeout fires -> skipped with timeout-tagged note; child killed", async () => {
  let theChild = null;
  const r = await runCodexReview("", {
    enabled: true,
    timeoutMs: 40,
    spawnImpl: () => {
      theChild = makeChild({ stdout: "VERDICT: PASS", code: 0, delayMs: 400 });
      return theChild;
    },
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "timeout", "notes");
  assertTrue(theChild !== null && theChild.killed === true, "child.kill() invoked on timeout");
});

await test("quota signature in stderr -> skipped, ENV_FAIL note", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "", stderr: "Error: exhausted your daily usage limit", code: 1 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "ENV_FAIL", "notes");
});

await test("HTTP 429 in stderr -> skipped, ENV_FAIL", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "", stderr: "request failed: 429 too many requests", code: 1 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "ENV_FAIL", "notes");
});

await test("offline (ECONNREFUSED) in stderr -> skipped, ENV_FAIL", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "", stderr: "connect ECONNREFUSED 127.0.0.1:443", code: 1 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "ENV_FAIL", "notes");
});

await test("EPIPE in stderr -> skipped, ENV_FAIL", async () => {
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "", stderr: "write EPIPE", code: 1 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "ENV_FAIL", "notes");
});

// ─── advisory contract ───────────────────────────────────────────────────────
process.stdout.write("\n[advisory contract]\n");

await test("enabled=false -> skipped with durationMs 0 (mirrors runOllamaPreflight)", async () => {
  let spawnCalled = false;
  const r = await runCodexReview("", {
    enabled: false,
    spawnImpl: () => { spawnCalled = true; return makeChild({ stdout: "VERDICT: PASS" }); },
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertEqual(r.skipped, true, "skipped");
  assertEqual(r.durationMs, 0, "durationMs");
  assertContains(r.notes, "disabled", "notes");
  assertEqual(spawnCalled, false, "spawn must not run when disabled");
});

await test("malformed VERDICT token -> skipped (advisory abstains, never blocks)", async () => {
  // parseVerdictLine accepts "VERDICT:" but the token must be PASS/FAIL.
  // "VERDICT: maybe" has no recognized verdict -> runCodexReview abstains.
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({ stdout: "VERDICT: maybe\nnot sure", code: 0 }),
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "no VERDICT line", "notes");
});

// ─── security: target validation BEFORE spawn ────────────────────────────────
process.stdout.write("\n[security: target validation]\n");

await test("shell-metacharacter target rejected BEFORE spawn (spawn never called)", async () => {
  let spawnCalled = false;
  const r = await runCodexReview("HEAD&calc", {
    enabled: true,
    spawnImpl: () => { spawnCalled = true; return makeChild({ stdout: "VERDICT: PASS" }); },
  });
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "rejected", "notes");
  assertEqual(spawnCalled, false, "spawn must NOT run for an unsafe target");
});

// ─── regression guard: env-fail must be classified from stderr ONLY ──────────
process.stdout.write("\n[regression guard: stderr-only env-fail]\n");

await test("env-fail signature in STDOUT must NOT skip a real verdict", async () => {
  // Codex reviewing rate-limiter code can legitimately print "429"/"rate limit"
  // in its review OUTPUT. That must NOT be misread as an environmental failure.
  const r = await runCodexReview("", {
    enabled: true,
    spawnImpl: mockSpawn({
      stdout: "VERDICT: PASS\nThe 429 rate-limit handling looks correct.",
      stderr: "",
      code: 0,
    }),
  });
  assertEqual(r.verdict, "pass", "verdict");
  assertEqual(r.skipped, false, "skipped");
  assertNotContains(r.notes, "ENV_FAIL", "notes");
});

// ─── argv shape ──────────────────────────────────────────────────────────────
process.stdout.write("\n[argv shape]\n");

await test("empty target -> codex argv carries --uncommitted", async () => {
  const sink = {};
  await runCodexReview("", {
    enabled: true,
    spawnImpl: capturingSpawn({ stdout: "VERDICT: PASS", code: 0 }, sink),
  });
  assertTrue(Array.isArray(sink.args), "args captured");
  assertEqual(sink.args[0], "exec", "args[0]");
  assertEqual(sink.args[1], "review", "args[1]");
  assertTrue(sink.args.includes("--uncommitted"), "argv includes --uncommitted");
  assertTrue(!sink.args.includes("--commit"), "argv has no --commit");
});

await test("target=HEAD -> codex argv carries --commit HEAD", async () => {
  const sink = {};
  await runCodexReview("HEAD", {
    enabled: true,
    spawnImpl: capturingSpawn({ stdout: "VERDICT: PASS", code: 0 }, sink),
  });
  const i = sink.args.indexOf("--commit");
  assertTrue(i >= 0, "argv includes --commit");
  assertEqual(sink.args[i + 1], "HEAD", "--commit value");
  assertTrue(!sink.args.includes("--uncommitted"), "argv has no --uncommitted");
});

await test("custom review instructions are piped to codex via stdin", async () => {
  const stdinSink = { data: "" };
  await runCodexReview("", {
    enabled: true,
    instructions: "REVIEW-MARKER-XYZ",
    spawnImpl: () => makeChild({ stdout: "VERDICT: PASS", code: 0, stdinSink }),
  });
  assertContains(stdinSink.data, "REVIEW-MARKER-XYZ", "stdin payload");
});

await test("bin ending in .cmd selects shell:true on win32 (direct spawn otherwise)", async () => {
  const sink = {};
  await runCodexReview("", {
    enabled: true,
    bin: "codex.cmd",
    spawnImpl: capturingSpawn({ stdout: "VERDICT: PASS", code: 0 }, sink),
  });
  assertEqual(sink.bin, "codex.cmd", "bin forwarded to spawnImpl");
  assertTrue(sink.options && typeof sink.options === "object", "spawn options object passed");
  // useShell = win32 && /\.(cmd|bat)$/i.test(bin) — platform-dependent by design.
  assertEqual(!!sink.options.shell, process.platform === "win32", "shell flag matches the win32 .cmd rule");
});

await test("plain bin (no .cmd suffix) never sets shell:true", async () => {
  const sink = {};
  await runCodexReview("", {
    enabled: true,
    bin: "codex",
    spawnImpl: capturingSpawn({ stdout: "VERDICT: PASS", code: 0 }, sink),
  });
  assertEqual(sink.bin, "codex", "bin forwarded");
  assertEqual(!!sink.options.shell, false, "non-.cmd bin must not use shell");
});

// ─── summary ─────────────────────────────────────────────────────────────────
process.stdout.write(`\n${passes}/${passes + fails} passed${fails > 0 ? `, ${fails} failed` : ""}\n`);
if (fails > 0) {
  for (const f of failures) process.stdout.write(`FAIL  ${f.name}: ${f.message}\n`);
  process.exit(1);
}
process.exit(0);
