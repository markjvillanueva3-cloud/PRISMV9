// scripts/lib/dispatcher-hints.test.mjs
// Real-value tests (R9) for the Gap-4 dispatcher-grounding leaf + the bridge wire.
// Pure functions use injected readImpl; resolveSystemPrompt uses a temp-dir digest fixture
// (it reads the real fs, has no readImpl seam) -> both are deterministic, no live Ollama.

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseDispatcherRows,
  scoreDispatchers,
  getDispatcherHints,
  formatDispatcherManifestBlock,
  filterStopwords,
  _resetDispatcherCache,
} from "./dispatcher-hints.mjs";
import { resolveSystemPrompt } from "../../.claude/hooks/lib/ollama-hook-bridge.mjs";

// Fixture mirrors the real DISPATCHER_DIGEST.md table shape. ASCII `--` (not em-dash) in
// source; the parser splits on `|` so the dash style is irrelevant. Includes adversarial rows:
// a 0-action stub (must be skipped), a non-numeric-actions row, and a no-pipe line.
const DIGEST_FIXTURE = `# PRISM Dispatcher Digest

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| calcDispatcher | prism_calc -- speed feed cutting force physics | 1182 |
| businessDispatcher | prism_business -- Business Operations Dispatcher invoice quote | 909 |
| camDispatcher | prism_cam -- CAM Toolpath Dispatcher | 24 |
| stubDispatcher.test | stub Dispatcher.test | 0 |
| weirdDispatcher | prism_weird -- weird | notanumber |
this line has no pipes and must be ignored
`;

function makeDigestRoot(content) {
  const root = mkdtempSync(join(tmpdir(), "prism-disp-"));
  const docs = join(root, "mcp-server", "data", "docs");
  mkdirSync(docs, { recursive: true });
  writeFileSync(join(docs, "DISPATCHER_DIGEST.md"), content);
  return root;
}

// --- parseDispatcherRows ---------------------------------------------------
test("parseDispatcherRows: parses valid rows; skips header, separator, 0-action, malformed", () => {
  const rows = parseDispatcherRows(DIGEST_FIXTURE);
  const names = rows.map((r) => r.dispatcher);
  assert.ok(names.includes("calcDispatcher"), "calc row parsed");
  assert.ok(names.includes("businessDispatcher"), "business row parsed");
  assert.ok(names.includes("camDispatcher"), "cam row parsed");
  assert.ok(!names.includes("stubDispatcher.test"), "0-action stub skipped");
  assert.ok(!names.includes("weirdDispatcher"), "non-numeric actions row skipped");
  assert.ok(!names.includes("Dispatcher"), "header row skipped");
  assert.equal(rows.length, 3, "exactly the 3 valid rows");
  assert.equal(rows.find((r) => r.dispatcher === "calcDispatcher").actions, 1182);
});

test("parseDispatcherRows: guards non-string + empty", () => {
  assert.deepEqual(parseDispatcherRows(null), [], "null -> []");
  assert.deepEqual(parseDispatcherRows(""), [], "empty -> []");
  assert.deepEqual(parseDispatcherRows(42), [], "non-string -> []");
  assert.deepEqual(parseDispatcherRows("| xDispatcher | prism_x -- x | notanumber |"), [], "non-numeric actions -> []");
});

// --- scoreDispatchers ------------------------------------------------------
test("scoreDispatchers: counts name+domain token hits, sorts desc; tie-break by actions", () => {
  const rows = parseDispatcherRows(DIGEST_FIXTURE);
  const scored = scoreDispatchers(rows, ["speed", "feed", "cutting"]);
  assert.equal(scored[0].dispatcher, "calcDispatcher", "calc matches 3 tokens -> first");
  assert.equal(scored[0].score, 3);
  assert.ok(!scored.some((s) => s.dispatcher === "camDispatcher"), "cam scores 0 -> excluded");
  // tie-break: equal score -> more actions first
  const tie = scoreDispatchers(
    [
      { dispatcher: "aDispatcher", domain: "alpha tool", actions: 10 },
      { dispatcher: "bDispatcher", domain: "alpha tool", actions: 99 },
    ],
    ["alpha"],
  );
  assert.equal(tie[0].dispatcher, "bDispatcher", "equal score -> richer (more actions) ranks first");
  // guards
  assert.deepEqual(scoreDispatchers(rows, []), [], "no tokens -> []");
  assert.deepEqual(scoreDispatchers(null, ["x"]), [], "non-array rows -> []");
});

test("scoreDispatchers: domain matches WHOLE WORDS only (no 'force' in 'enforcement')", () => {
  const rows = [
    { dispatcher: "guardDispatcher", domain: "prism_guard -- Reasoning + Enforcement diagnostics", actions: 59 },
    { dispatcher: "loopDispatcher", domain: "prism_loop -- feedback loop bus", actions: 12 },
  ];
  // Domain prose is matched whole-word only: "force" must NOT match "enForcement", and "feed"
  // must NOT match "feedBack" (neither dispatcher NAME contains the stem here).
  assert.deepEqual(scoreDispatchers(rows, ["force"]), [], "'force' is not a word in 'enforcement'");
  assert.deepEqual(scoreDispatchers(rows, ["feed"]), [], "'feed' is not a word in 'feedback' (domain prose)");
  // whole-word hits still score
  const s = scoreDispatchers(rows, ["enforcement", "reasoning"]);
  assert.equal(s.length, 1);
  assert.equal(s[0].dispatcher, "guardDispatcher");
  assert.equal(s[0].score, 2, "both whole words match the domain");
  // compound-name substring still matches (stem embedded in the identifier)
  const n = scoreDispatchers([{ dispatcher: "camDispatcher", domain: "x", actions: 5 }], ["cam"]);
  assert.equal(n[0].dispatcher, "camDispatcher", "'cam' substring of 'camdispatcher' still matches the name");
});

test("filterStopwords: drops boilerplate, keeps domain-meaningful tokens", () => {
  assert.deepEqual(
    filterStopwords(["task", "user", "cutting", "force", "prism", "mcp", "business"]),
    ["cutting", "force", "business"],
    "structural/boilerplate tokens removed; signal tokens kept",
  );
  assert.deepEqual(filterStopwords(null), [], "non-array -> []");
});

// --- getDispatcherHints ----------------------------------------------------
test("getDispatcherHints: selects + ranks via injected digest read", () => {
  const readImpl = () => DIGEST_FIXTURE;
  const hits = getDispatcherHints("speed feed cutting force", { readImpl, topN: 3 });
  assert.equal(hits[0].dispatcher, "calcDispatcher", "best route first");
  assert.ok(hits.every((h) => h.actions >= 1), "0-action stub never surfaced");
});

test("getDispatcherHints: empty/short query + topN<=0 + unreadable digest -> [] (fail-soft)", () => {
  const readImpl = () => DIGEST_FIXTURE;
  assert.deepEqual(getDispatcherHints("", { readImpl }), [], "empty query -> []");
  assert.deepEqual(getDispatcherHints("a b", { readImpl }), [], "all <3-char tokens -> []");
  assert.deepEqual(getDispatcherHints("speed", { readImpl, topN: 0 }), [], "topN 0 -> []");
  const throwImpl = () => { throw new Error("ENOENT"); };
  assert.deepEqual(getDispatcherHints("speed feed", { readImpl: throwImpl }), [], "unreadable digest -> [] (fail-soft)");
});

// --- formatDispatcherManifestBlock -----------------------------------------
test("formatDispatcherManifestBlock: renders names + anti-hallucination label; [] -> ''", () => {
  assert.equal(formatDispatcherManifestBlock([]), "", "empty -> ''");
  assert.equal(formatDispatcherManifestBlock(null), "", "null -> ''");
  const block = formatDispatcherManifestBlock([
    { dispatcher: "calcDispatcher", domain: "prism_calc -- calc", actions: 1182 },
  ]);
  assert.match(block, /calcDispatcher/);
  assert.match(block, /prism_calc/, "domain (prism_ name) surfaced for the route");
  assert.match(block, /1182 actions/);
  assert.match(block, /do NOT invent/i, "anti-hallucination guard present");
});

// --- resolveSystemPrompt (the bridge wire, no network) ---------------------
test("resolveSystemPrompt: mcp_route enriches with the relevant dispatcher manifest", () => {
  _resetDispatcherCache();
  const root = makeDigestRoot(DIGEST_FIXTURE);
  try {
    const out = resolveSystemPrompt("mcp_route", "business operations invoice", { repoRoot: root });
    assert.match(out, /MCP routing assistant/, "keeps the base mcp_route prompt");
    assert.match(out, /businessDispatcher/, "appends the matching dispatcher");
    assert.match(out, /do NOT invent/i, "anti-hallucination guard appended");
    assert.ok(!/calcDispatcher/.test(out), "non-matching dispatchers not injected");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolveSystemPrompt: groundingQuery overrides the grounding source (Gap 4 P2)", () => {
  _resetDispatcherCache();
  const root = makeDigestRoot(DIGEST_FIXTURE);
  try {
    // prompt is about 'business invoice' but groundingQuery is 'cam toolpath' -> the manifest must
    // reflect the groundingQuery (camDispatcher), NOT the prompt (businessDispatcher).
    const out = resolveSystemPrompt("mcp_route", "business operations invoice", {
      repoRoot: root, groundingQuery: "cam toolpath collision",
    });
    assert.match(out, /camDispatcher/, "manifest selected from groundingQuery, not the prompt");
    assert.ok(!/businessDispatcher/.test(out), "the prompt's tokens did NOT drive selection");
    // empty/blank groundingQuery falls back to the prompt (back-compat)
    _resetDispatcherCache();
    const fallback = resolveSystemPrompt("mcp_route", "business operations invoice", { repoRoot: root, groundingQuery: "   " });
    assert.match(fallback, /businessDispatcher/, "blank groundingQuery -> falls back to prompt");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolveSystemPrompt: non-mcp_route hookType is NOT enriched", () => {
  _resetDispatcherCache();
  const root = makeDigestRoot(DIGEST_FIXTURE);
  try {
    const out = resolveSystemPrompt("grep_index", "business operations invoice", { repoRoot: root });
    assert.match(out, /code search assistant/, "base grep_index prompt unchanged");
    assert.ok(!/businessDispatcher/.test(out), "grep_index never gets a dispatcher manifest");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("resolveSystemPrompt: explicit systemPrompt override respected verbatim", () => {
  const out = resolveSystemPrompt("mcp_route", "business invoice", { systemPrompt: "CUSTOM-PROMPT", repoRoot: "/nope" });
  assert.equal(out, "CUSTOM-PROMPT", "caller override wins, no enrichment");
});

test("resolveSystemPrompt: groundDispatchers:false disables enrichment", () => {
  _resetDispatcherCache();
  const root = makeDigestRoot(DIGEST_FIXTURE);
  try {
    const out = resolveSystemPrompt("mcp_route", "business invoice", { repoRoot: root, groundDispatchers: false });
    assert.ok(!/businessDispatcher/.test(out), "explicit opt-out skips grounding");
    assert.match(out, /MCP routing assistant/, "base prompt still returned");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

// --- LIVE digest (R15 validate; guards the fixture-masking the per-file scrutiny caught) ---
test("getDispatcherHints: against the REAL DISPATCHER_DIGEST.md -- relevant + never an unwired bridge", () => {
  _resetDispatcherCache();
  // Default root -> reads mcp-server/data/docs/DISPATCHER_DIGEST.md from the repo.
  const cam = getDispatcherHints("cam toolpath collision", {});
  assert.ok(cam.some((h) => h.dispatcher === "camDispatcher"), "a clear CAM query surfaces camDispatcher from the live digest");
  // The defect the per-file scrutiny caught: a physics query whole-word-matched 'cutting' in
  // 'cross-cutting' and ranked unwiredBridgeDispatcher -- an explicitly UNWIRED bridge -- as a
  // route. It must now be excluded from EVERY result.
  const physics = getDispatcherHints("cutting force speed feed", {});
  for (const h of physics) {
    assert.ok(!/unwired|deprecated/i.test(h.dispatcher), `no unwired/deprecated dispatcher offered as a route (got ${h.dispatcher})`);
    assert.ok(!/\bunwired\b|\bdeprecated\b/i.test(h.domain || ""), `no unwired/deprecated domain offered as a route (got ${h.dispatcher})`);
  }
});

test("resolveSystemPrompt: missing digest -> base prompt unchanged (fail-soft)", () => {
  _resetDispatcherCache();
  const out = resolveSystemPrompt("mcp_route", "business invoice", {
    repoRoot: join(tmpdir(), "prism-does-not-exist-xyz-9k"),
  });
  assert.match(out, /MCP routing assistant/, "base prompt intact");
  assert.ok(!/do NOT invent/i.test(out), "no manifest appended when digest absent");
});
