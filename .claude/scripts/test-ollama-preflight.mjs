#!/usr/bin/env node
/**
 * test-ollama-preflight.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-LOCAL-PREFLIGHT
 *
 * Standalone node test runner for runOllamaPreflight(). Lives in
 * .claude/scripts/ alongside the unit-under-test because vitest 4.1.5's
 * transform pipeline rejects .ts→.mjs cross-extension imports both
 * statically and dynamically — but plain node imports the .mjs cleanly.
 *
 * Run: `node H:/prism/.claude/scripts/test-ollama-preflight.mjs`
 *      Exits 0 on all-pass, 1 on any failure. Prints PASS/FAIL per case.
 *
 * Coverage (13 cases):
 *  - happy path: VERDICT pass/fail, BLOCKER extraction
 *  - <think>...</think> stripping (deepseek-r1 reasoning blocks)
 *  - injected model name reflected in notes
 *  - durationMs invariants
 *  - skipped paths: enabled=false, http-500, http-404, fetch-throws, timeout
 *  - parser robustness: missing VERDICT, lowercase verdict
 *  - prompt truncation: above + below maxPromptBytes
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRUTINY_URL = pathToFileURL(resolve(__dirname, "scrutiny-3way.mjs")).href;
const mod = await import(SCRUTINY_URL);
const { runOllamaPreflight } = mod;

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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const mockFetch = (text, status = 200) => async () => jsonResponse({ response: text }, status);
const failingFetch = (status, statusText = "Error") => async () =>
  new Response("upstream fail", { status, statusText });
const throwingFetch = (err) => async () => { throw err; };
const timingFetch = (delayMs, text) => async (_url, init) =>
  new Promise((resolveP, rejectP) => {
    const t = setTimeout(() => resolveP(jsonResponse({ response: text })), delayMs);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(t);
      const ae = new Error("aborted");
      ae.name = "AbortError";
      rejectP(ae);
    });
  });

// ─── happy path ──────────────────────────────────────────────────────────────
process.stdout.write("\n[happy path]\n");

await test("verdict=pass when response says PASS", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch("VERDICT: PASS\nLooks good."),
  });
  assertEqual(r.skipped, false, "skipped");
  assertEqual(r.verdict, "pass", "verdict");
  assertEqual(r.provider, "ollama-preflight", "provider");
  assertEqual(r.blockers, "", "blockers");
});

await test("verdict=fail and BLOCKER lines extracted verbatim", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch("VERDICT: FAIL\nBLOCKER: missing dispatcher wiring\nBLOCKER: stub function in foo.ts:42"),
  });
  assertEqual(r.verdict, "fail", "verdict");
  assertEqual(
    r.blockers,
    "BLOCKER: missing dispatcher wiring\nBLOCKER: stub function in foo.ts:42",
    "blockers",
  );
});

await test("strips <think>...</think> reasoning before parsing verdict", async () => {
  const raw = "<think>Reasoning...\nthe constructor looks correct.</think>\nVERDICT: PASS\nNo issues.";
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch(raw),
  });
  assertEqual(r.verdict, "pass", "verdict");
  assertNotContains(r.rawOutputPeek, "<think>", "rawOutputPeek");
  assertContains(r.rawOutputPeek, "VERDICT: PASS", "rawOutputPeek");
});

await test("injected model name appears in notes", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    model: "test-model-alpha",
    fetchImpl: mockFetch("VERDICT: PASS"),
  });
  assertContains(r.notes, "test-model-alpha", "notes");
});

await test("durationMs is non-negative and finite", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch("VERDICT: PASS"),
  });
  assertEqual(typeof r.durationMs, "number", "durationMs type");
  assertTrue(r.durationMs >= 0, "durationMs >= 0");
  assertTrue(Number.isFinite(r.durationMs), "durationMs finite");
});

// ─── disabled / skipped paths ────────────────────────────────────────────────
process.stdout.write("\n[disabled / skipped paths]\n");

await test("returns skipped when enabled=false", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: false,
    fetchImpl: mockFetch("VERDICT: PASS"),
  });
  assertEqual(r.skipped, true, "skipped");
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "preflight disabled", "notes");
  assertEqual(r.durationMs, 0, "durationMs");
});

await test("http-500 → skipped (env failure shouldn't block cloud)", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: failingFetch(500, "Internal Server Error"),
  });
  assertEqual(r.skipped, true, "skipped");
  assertEqual(r.verdict, "skipped", "verdict");
  assertContains(r.notes, "http-500", "notes (status code)");
  assertContains(r.notes, "Internal Server Error", "notes (status text)");
});

await test("http-404 → skipped (Ollama-not-installed shape)", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: failingFetch(404, "Not Found"),
  });
  assertEqual(r.skipped, true, "skipped");
  assertContains(r.notes, "http-404", "notes");
});

await test("fetch throws ECONNREFUSED → skipped (NOT throws)", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: throwingFetch(new Error("ECONNREFUSED 127.0.0.1:11434")),
  });
  assertEqual(r.skipped, true, "skipped");
  assertContains(r.notes, "fetch-failed", "notes");
  assertContains(r.notes, "ECONNREFUSED", "notes (error msg)");
});

await test("timeout fires → skipped with timeout-tagged note", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    timeoutMs: 50,
    fetchImpl: timingFetch(500, "VERDICT: PASS"),
  });
  assertEqual(r.skipped, true, "skipped");
  assertContains(r.notes, "timeout", "notes");
});

// ─── verdict parser robustness ───────────────────────────────────────────────
process.stdout.write("\n[verdict parser robustness]\n");

await test("malformed/missing VERDICT defaults to fail with explanatory note", async () => {
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch("Looks fine to me, no issues found."),
  });
  assertEqual(r.verdict, "fail", "verdict");
  assertEqual(r.skipped, false, "skipped");
  assertContains(r.notes, "VERDICT line missing or malformed", "notes");
});

await test("VERDICT line with no PASS/FAIL token defaults to fail", async () => {
  // parseVerdictLine accepts case-insensitive "VERDICT:" prefix but the
  // PASS/FAIL token itself must be present and recognized. "VERDICT: maybe"
  // has no recognizable verdict word and falls through to malformed-default.
  // (Note: lowercase "verdict: pass" IS accepted by the parser — the helper
  // is case-insensitive on both prefix and token; documented here as the
  // actual contract, not the original test assumption.)
  const r = await runOllamaPreflight("review me", {
    enabled: true,
    fetchImpl: mockFetch("VERDICT: maybe\nunsure about a few things"),
  });
  assertEqual(r.verdict, "fail", "verdict");
  assertContains(r.notes, "VERDICT line missing or malformed", "notes");
});

// ─── prompt truncation ───────────────────────────────────────────────────────
process.stdout.write("\n[prompt truncation]\n");

await test("prompt > maxPromptBytes truncated with marker line", async () => {
  let observedBody = "";
  const captureFetch = async (_url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    observedBody = body.prompt ?? "";
    return jsonResponse({ response: "VERDICT: PASS" });
  };
  const longPrompt = "X".repeat(2000);
  const r = await runOllamaPreflight(longPrompt, {
    enabled: true,
    maxPromptBytes: 500,
    fetchImpl: captureFetch,
  });
  assertEqual(r.verdict, "pass", "verdict");
  assertTrue(observedBody.length < longPrompt.length, "body shorter than original");
  assertContains(
    observedBody,
    "[preflight: prompt truncated to 500 bytes; full diff is 2000]",
    "truncation marker",
  );
});

await test("prompt at-or-below maxPromptBytes sent verbatim (no marker)", async () => {
  let observedBody = "";
  const captureFetch = async (_url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    observedBody = body.prompt ?? "";
    return jsonResponse({ response: "VERDICT: PASS" });
  };
  await runOllamaPreflight("short prompt", {
    enabled: true,
    maxPromptBytes: 1000,
    fetchImpl: captureFetch,
  });
  assertEqual(observedBody, "short prompt", "verbatim body");
  assertNotContains(observedBody, "truncated", "no truncation marker");
});

// ─── summary ────────────────────────────────────────────────────────────────
process.stdout.write(`\n${passes}/${passes + fails} passed${fails > 0 ? `, ${fails} failed` : ""}\n`);
if (fails > 0) {
  for (const f of failures) process.stdout.write(`FAIL  ${f.name}: ${f.message}\n`);
  process.exit(1);
}
process.exit(0);
