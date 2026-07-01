/**
 * bridge-evidence-detector.test.mjs — node:test suite, R9 real-value.
 *
 * Hermetic tests use an injected `fsImpl` so no real disk hit; one real-data
 * E2E at the bottom hits the live aiReasoningDispatcher.ts to confirm the
 * detector classifies both AI-tier bridges as 'built' end-to-end.
 *
 * Run: node --test H:/prism/scripts/lib/bridge-evidence-detector.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Helper: build a fixture path that matches what path.resolve(FAKE_ROOT, rel)
// produces on whatever OS the test is running on. Without this, the unix-
// style abs("src/x.ts") key never matches the resolved "C:\repo\src\x.ts"
// (Windows) or abs("src/x.ts") (POSIX). Pinning the absolute via
// resolve() keeps the hermetic helper cross-platform.
function abs(rel) { return resolve(FAKE_ROOT, rel); }
import {
  scanFileForPatterns,
  verdictFromScan,
  detectorFor,
  detectBridgeStatus,
  detectAllBridgeStatuses,
  stripComments,
  tokenMatch,
  EVIDENCE_TABLE,
  MAX_SOURCE_BYTES,
} from "./bridge-evidence-detector.mjs";

const FAKE_ROOT = "/repo";

function fsFromMap(map) {
  return {
    existsSync: (p) => Object.prototype.hasOwnProperty.call(map, p),
    readFileSync: (p) => {
      if (!Object.prototype.hasOwnProperty.call(map, p)) {
        const e = new Error("ENOENT: " + p);
        e.code = "ENOENT";
        throw e;
      }
      return map[p];
    },
  };
}

// ─── scanFileForPatterns ────────────────────────────────────────────

test("scanFileForPatterns: all patterns present → found=N missing=0 errored=null", () => {
  const fs = fsFromMap({ [abs("src/x.ts")]:"alpha bravo charlie" });
  const r = scanFileForPatterns("src/x.ts", ["alpha", "bravo"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, ["alpha", "bravo"]);
  assert.deepEqual(r.missing, []);
  assert.equal(r.errored, null);
});

test("scanFileForPatterns: partial match → mixed found/missing", () => {
  const fs = fsFromMap({ [abs("src/x.ts")]:"alpha" });
  const r = scanFileForPatterns("src/x.ts", ["alpha", "bravo"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, ["alpha"]);
  assert.deepEqual(r.missing, ["bravo"]);
  assert.equal(r.errored, null);
});

test("scanFileForPatterns: no match → all missing", () => {
  const fs = fsFromMap({ [abs("src/x.ts")]:"zulu" });
  const r = scanFileForPatterns("src/x.ts", ["alpha", "bravo"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, []);
  assert.deepEqual(r.missing, ["alpha", "bravo"]);
  assert.equal(r.errored, null);
});

test("scanFileForPatterns: missing source → errored populated, all missing", () => {
  const fs = fsFromMap({});
  const r = scanFileForPatterns("src/missing.ts", ["alpha"], FAKE_ROOT, fs);
  assert.equal(r.found.length, 0);
  assert.deepEqual(r.missing, ["alpha"]);
  assert.match(r.errored, /source missing/);
});

test("scanFileForPatterns: read throws → errored captured (no exception)", () => {
  const fs = {
    existsSync: () => true,
    readFileSync: () => { throw new Error("EPERM: permission denied"); },
  };
  const r = scanFileForPatterns("src/x.ts", ["alpha"], FAKE_ROOT, fs);
  assert.equal(r.found.length, 0);
  assert.match(r.errored, /read error: EPERM/);
});

test("scanFileForPatterns: empty patterns array → errored", () => {
  const fs = fsFromMap({ [abs("x.ts")]:"anything" });
  const r = scanFileForPatterns("x.ts", [], FAKE_ROOT, fs);
  assert.match(r.errored, /non-empty array/);
});

test("scanFileForPatterns: non-array patterns → errored, no crash", () => {
  const fs = fsFromMap({ [abs("x.ts")]:"anything" });
  // @ts-ignore — testing adversarial input
  const r = scanFileForPatterns("x.ts", null, FAKE_ROOT, fs);
  assert.match(r.errored, /non-empty array/);
});

test("scanFileForPatterns: non-string readFileSync result → errored", () => {
  const fs = {
    existsSync: () => true,
    readFileSync: () => Buffer.from("not-utf8-decoded"),
  };
  const r = scanFileForPatterns("x.ts", ["x"], FAKE_ROOT, fs);
  assert.match(r.errored, /non-string/);
});

test("scanFileForPatterns: oversize source is truncated to MAX_SOURCE_BYTES (still scans head)", () => {
  // head contains pattern, tail does not — verify head-scan still works
  const big = "alpha\n" + "x".repeat(MAX_SOURCE_BYTES + 100);
  const fs = fsFromMap({ [abs("big.ts")]:big });
  const r = scanFileForPatterns("big.ts", ["alpha"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, ["alpha"]);
  assert.equal(r.errored, null);
});

test("scanFileForPatterns: oversize source where pattern is in the TAIL → missed (bounded scan)", () => {
  const big = "x".repeat(MAX_SOURCE_BYTES + 100) + "TAIL-ONLY-PATTERN";
  const fs = fsFromMap({ [abs("big.ts")]:big });
  const r = scanFileForPatterns("big.ts", ["TAIL-ONLY-PATTERN"], FAKE_ROOT, fs);
  // Intentional behavior: truncated scan favors bounded latency over completeness
  assert.deepEqual(r.found, []);
  assert.deepEqual(r.missing, ["TAIL-ONLY-PATTERN"]);
});

// ─── verdictFromScan ────────────────────────────────────────────────

test("verdictFromScan: all-found → built", () => {
  const v = verdictFromScan({ found: ["a", "b"], missing: [], errored: null }, "x.ts");
  assert.equal(v.status, "built");
  assert.ok(v.evidence[0].includes("all 2 required"));
});

test("verdictFromScan: some-found → partial", () => {
  const v = verdictFromScan({ found: ["a"], missing: ["b"], errored: null }, "x.ts");
  assert.equal(v.status, "partial");
  assert.ok(v.evidence[0].includes("1/2"));
});

test("verdictFromScan: zero-found → ghost", () => {
  const v = verdictFromScan({ found: [], missing: ["a", "b"], errored: null }, "x.ts");
  assert.equal(v.status, "ghost");
  assert.ok(v.evidence[0].includes("0/2"));
});

test("verdictFromScan: errored → ghost (status quo preserved)", () => {
  const v = verdictFromScan({ found: [], missing: ["a"], errored: "source missing: x.ts" }, "x.ts");
  assert.equal(v.status, "ghost");
  assert.ok(v.evidence[0].includes("source missing"));
});

test("verdictFromScan: empty patterns → ghost", () => {
  const v = verdictFromScan({ found: [], missing: [], errored: null }, "x.ts");
  assert.equal(v.status, "ghost");
  assert.ok(v.evidence[0].includes("no patterns to match"));
});

// ─── detectorFor / EVIDENCE_TABLE ──────────────────────────────────

test("detectorFor: known bridge id returns a function", () => {
  const fn = detectorFor("U-BRIDGE-AI-TIER1-TIER2");
  assert.equal(typeof fn, "function");
});

test("detectorFor: unknown bridge id returns null", () => {
  assert.equal(detectorFor("U-BRIDGE-NEVER-DEFINED"), null);
});

test("detectorFor: empty / non-string id returns null", () => {
  assert.equal(detectorFor(""), null);
  assert.equal(detectorFor(null), null);
  assert.equal(detectorFor(undefined), null);
  assert.equal(detectorFor(42), null);
});

test("EVIDENCE_TABLE: at least the 2 AI-tier bridges registered", () => {
  const ids = EVIDENCE_TABLE.map((e) => e.bridgeId);
  assert.ok(ids.includes("U-BRIDGE-AI-TIER1-TIER2"));
  assert.ok(ids.includes("U-BRIDGE-AI-TIER2-TIER3"));
});

test("EVIDENCE_TABLE: every entry has bridgeId + detect function", () => {
  for (const entry of EVIDENCE_TABLE) {
    assert.equal(typeof entry.bridgeId, "string", `bridgeId not string: ${JSON.stringify(entry)}`);
    assert.ok(entry.bridgeId.length > 0, `empty bridgeId`);
    assert.equal(typeof entry.detect, "function", `detect not function for ${entry.bridgeId}`);
  }
});

test("EVIDENCE_TABLE: no duplicate bridge ids", () => {
  const seen = new Set();
  for (const entry of EVIDENCE_TABLE) {
    assert.ok(!seen.has(entry.bridgeId), `duplicate: ${entry.bridgeId}`);
    seen.add(entry.bridgeId);
  }
});

// ─── detectBridgeStatus ─────────────────────────────────────────────

test("detectBridgeStatus: unknown bridge returns null", () => {
  const v = detectBridgeStatus("U-BRIDGE-NEVER", "/repo");
  assert.equal(v, null);
});

test("detectBridgeStatus: empty repoRoot → ghost with reason", () => {
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "");
  assert.equal(v.status, "ghost");
  assert.match(v.evidence[0], /repoRoot must be/);
});

test("detectBridgeStatus: AI-TIER1-TIER2 with both patterns present → built", () => {
  const src = `
    // dispatcher
    const ROUTES = { xproc_route_query: () => import("./CrossProcessTierRouterEngine.js") };
  `;
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "/repo", { fsImpl: fs });
  assert.equal(v.status, "built");
});

test("detectBridgeStatus: AI-TIER2-TIER3 with both patterns present → built", () => {
  const src = `
    xproc_orchestrate_full: () => import("./CrossProcessHierarchicalNeuralOrchestratorEngine.js"),
  `;
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER2-TIER3", "/repo", { fsImpl: fs });
  assert.equal(v.status, "built");
});

test("detectBridgeStatus: partial match (only action enum, no import) → partial", () => {
  const src = `const ACTIONS = ["xproc_route_query"];`; // engine import missing
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "/repo", { fsImpl: fs });
  assert.equal(v.status, "partial");
  assert.ok(v.evidence[0].includes("1/2"));
});

test("detectBridgeStatus: no match → ghost (status quo)", () => {
  const src = `nothing relevant here`;
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "/repo", { fsImpl: fs });
  assert.equal(v.status, "ghost");
});

test("detectBridgeStatus: source missing → ghost with 'source missing' evidence", () => {
  const fs = fsFromMap({});
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "/repo", { fsImpl: fs });
  assert.equal(v.status, "ghost");
  assert.match(v.evidence[0], /source missing/);
});

test("detectBridgeStatus: detector that throws → ghost with thrown message (no crash)", () => {
  // We can't easily inject a throwing detector through the public surface
  // without mutating EVIDENCE_TABLE; instead use a buggy fsImpl whose
  // readFileSync throws an unusual error to exercise the try/catch in the
  // detector's verdictFromScan->scanFileForPatterns path.
  const fs = {
    existsSync: () => true,
    readFileSync: () => { throw new Error("disk fire"); },
  };
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "/repo", { fsImpl: fs });
  assert.equal(v.status, "ghost");
  assert.match(v.evidence[0], /read error: disk fire/);
});

test("detectBridgeStatus: returns evidence as an array even on degenerate verdict", () => {
  const v = detectBridgeStatus("U-BRIDGE-AI-TIER1-TIER2", "");
  assert.ok(Array.isArray(v.evidence));
});

// ─── detectAllBridgeStatuses ───────────────────────────────────────

test("detectAllBridgeStatuses: returns a Map with every table entry", () => {
  const fs = fsFromMap({}); // empty repo → every detector graceful-degrades
  const m = detectAllBridgeStatuses("/repo", { fsImpl: fs });
  assert.ok(m instanceof Map);
  for (const entry of EVIDENCE_TABLE) {
    assert.ok(m.has(entry.bridgeId), `missing verdict for ${entry.bridgeId}`);
  }
});

test("detectAllBridgeStatuses: each verdict has status + evidence", () => {
  const fs = fsFromMap({});
  const m = detectAllBridgeStatuses("/repo", { fsImpl: fs });
  for (const [bridgeId, v] of m) {
    assert.equal(typeof v.status, "string", `bad status for ${bridgeId}`);
    assert.ok(["built", "partial", "ghost"].includes(v.status), `unknown status ${v.status} for ${bridgeId}`);
    assert.ok(Array.isArray(v.evidence), `evidence not array for ${bridgeId}`);
  }
});

test("detectAllBridgeStatuses: source present with both AI patterns → both bridges built", () => {
  const src = `
    xproc_route_query: () => import("./CrossProcessTierRouterEngine.js"),
    xproc_orchestrate_full: () => import("./CrossProcessHierarchicalNeuralOrchestratorEngine.js"),
  `;
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const m = detectAllBridgeStatuses("/repo", { fsImpl: fs });
  assert.equal(m.get("U-BRIDGE-AI-TIER1-TIER2").status, "built");
  assert.equal(m.get("U-BRIDGE-AI-TIER2-TIER3").status, "built");
});

test("detectAllBridgeStatuses: source present but missing engine import → both partial", () => {
  const src = `
    xproc_route_query: () => somethingElse(),
    xproc_orchestrate_full: () => somethingElse(),
  `;
  const fs = fsFromMap({ [abs("mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts")]:src });
  const m = detectAllBridgeStatuses("/repo", { fsImpl: fs });
  assert.equal(m.get("U-BRIDGE-AI-TIER1-TIER2").status, "partial");
  assert.equal(m.get("U-BRIDGE-AI-TIER2-TIER3").status, "partial");
});

// ─── real-data E2E ───────────────────────────────────────────────────

// ─── REGRESSION GUARDS: scrutiny P1 fixes (Arm B, 2026-05-19) ──────
// These tests pin behavior introduced by the scrutiny fix. Reverting any of
// them must fail loud — otherwise a future edit could re-introduce the
// silent ghost→built leak the design explicitly forbids.

test("REGRESSION: substring inside a line comment is NOT counted (Arm B P1.1)", () => {
  const src = "// historical note: xproc_route_query was once the action\nconst x = 1;";
  const fs = fsFromMap({ [abs("d.ts")]: src });
  const r = scanFileForPatterns("d.ts", ["xproc_route_query"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, [], "pattern inside // comment must not count");
  assert.deepEqual(r.missing, ["xproc_route_query"]);
});

test("REGRESSION: substring inside a block comment is NOT counted (Arm B P1.1)", () => {
  const src = "/* legacy: xproc_route_query / xproc_orchestrate_full */\nconst y = 2;";
  const fs = fsFromMap({ [abs("d.ts")]: src });
  const r = scanFileForPatterns("d.ts", ["xproc_route_query", "xproc_orchestrate_full"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, []);
  assert.deepEqual(r.missing, ["xproc_route_query", "xproc_orchestrate_full"]);
});

test("REGRESSION: token-boundary — `legacy_xproc_route_query` does NOT match `xproc_route_query` (Arm B P1.2)", () => {
  const src = "const ROUTES = { legacy_xproc_route_query: () => 0 };";
  const fs = fsFromMap({ [abs("d.ts")]: src });
  const r = scanFileForPatterns("d.ts", ["xproc_route_query"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, [], "prefixed identifier must not satisfy token-match");
});

test("REGRESSION: token-boundary — `xproc_route_query_v2` does NOT match `xproc_route_query` (Arm B P1.2)", () => {
  const src = "const x = xproc_route_query_v2;";
  const fs = fsFromMap({ [abs("d.ts")]: src });
  const r = scanFileForPatterns("d.ts", ["xproc_route_query"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, []);
});

test("REGRESSION: standalone identifier IS matched (positive case for token-match)", () => {
  const src = "const ROUTES = { xproc_route_query: () => import(\"./X.js\") };";
  const fs = fsFromMap({ [abs("d.ts")]: src });
  const r = scanFileForPatterns("d.ts", ["xproc_route_query"], FAKE_ROOT, fs);
  assert.deepEqual(r.found, ["xproc_route_query"]);
});

test("REGRESSION: EVIDENCE_TABLE is Object.freeze'd (Arm B P1.3)", () => {
  assert.equal(Object.isFrozen(EVIDENCE_TABLE), true, "table itself must be frozen");
  for (const entry of EVIDENCE_TABLE) {
    assert.equal(Object.isFrozen(entry), true, `entry ${entry.bridgeId} must be frozen`);
  }
});

test("REGRESSION: EVIDENCE_TABLE.push throws in strict mode (or silently fails — frozen invariant)", () => {
  const before = EVIDENCE_TABLE.length;
  // In strict mode this throws; in sloppy mode it silently fails. Either way
  // the length must not change.
  try { EVIDENCE_TABLE.push({ bridgeId: "evil", detect: () => ({ status: "built", evidence: [] }) }); }
  catch { /* expected in strict mode */ }
  assert.equal(EVIDENCE_TABLE.length, before, "table must reject mutation");
});

test("stripComments: removes // line comments", () => {
  assert.equal(stripComments("a // gone\nb"), "a  \nb");
});

test("stripComments: removes /* */ block comments", () => {
  assert.equal(stripComments("a /* gone */ b"), "a   b");
});

test("stripComments: removes multi-line block comments", () => {
  const before = "code\n/* line 1\nline 2\nline 3 */\nmore code";
  const after = stripComments(before);
  assert.ok(!after.includes("line 1"));
  assert.ok(!after.includes("line 2"));
  assert.ok(after.includes("code"));
  assert.ok(after.includes("more code"));
});

test("stripComments: non-string input → empty string (no crash)", () => {
  assert.equal(stripComments(null), "");
  assert.equal(stripComments(undefined), "");
  assert.equal(stripComments(42), "");
});

test("tokenMatch: identifier pattern requires standalone occurrence", () => {
  assert.equal(tokenMatch("xproc_route_query", "xproc_route_query"), true);
  assert.equal(tokenMatch(" xproc_route_query ", "xproc_route_query"), true);
  assert.equal(tokenMatch("xproc_route_query()", "xproc_route_query"), true);
  assert.equal(tokenMatch("legacy_xproc_route_query", "xproc_route_query"), false);
  assert.equal(tokenMatch("xproc_route_query_v2", "xproc_route_query"), false);
});

test("tokenMatch: non-identifier pattern falls back to substring search", () => {
  // A path-shaped pattern (non-identifier per IDENT_RE) should substring-match
  assert.equal(tokenMatch("import './CrossProcessTierRouter.js'", "./CrossProcessTierRouter.js"), true);
});

test("tokenMatch: empty/non-string inputs → false (no crash)", () => {
  assert.equal(tokenMatch("", "x"), false);
  assert.equal(tokenMatch("x", ""), false);
  assert.equal(tokenMatch(null, "x"), false);
  assert.equal(tokenMatch("x", null), false);
});

test("real-data E2E: live aiReasoningDispatcher.ts → both AI-tier bridges classified as built", () => {
  // Real repo root = two levels up from this test file (scripts/lib → ..)
  const repoRoot = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "..", "..");
  const dispatcherPath = resolve(repoRoot, "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts");
  if (!existsSync(dispatcherPath)) {
    // The test must not silently skip — assert the precondition we need.
    assert.fail(`real-data E2E precondition broken: ${dispatcherPath} does not exist`);
  }
  const m = detectAllBridgeStatuses(repoRoot);
  const t12 = m.get("U-BRIDGE-AI-TIER1-TIER2");
  const t23 = m.get("U-BRIDGE-AI-TIER2-TIER3");
  assert.equal(t12.status, "built", `T1-T2 not built: ${JSON.stringify(t12.evidence)}`);
  assert.equal(t23.status, "built", `T2-T3 not built: ${JSON.stringify(t23.evidence)}`);
});
