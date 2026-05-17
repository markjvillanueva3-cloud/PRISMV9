// scripts/dev-tool-leverage-rank.test.mjs
//
// Tests for dev-tool-leverage-rank.mjs — F3 final META aggregator.
//
// Pure-function extractors are exhaustively tested. The CLI orchestrator
// integration is smoke-tested via spawning the script with a fake registry
// (one synthetic sub-tool stub fixture file written into a temp dir).
//
// Run: node --test scripts/dev-tool-leverage-rank.test.mjs

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  extractSynergy,
  extractStaleMilestones,
  extractColdScripts,
  extractHelperOrphans,
  invokeSubTool,
  rankAll,
  determineExitCode,
  SUB_TOOLS,
} from "./dev-tool-leverage-rank.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, "dev-tool-leverage-rank.mjs");

// ─────────────────────────────────────────────────────────────────────────────
// extractSynergy
// ─────────────────────────────────────────────────────────────────────────────
describe("extractSynergy", () => {
  test("p0 alert produces high-score p0 finding", () => {
    const env = extractSynergy({ currentRatio: 0.21, alert: { severity: "p0", deltaPp: -1.5 } });
    assert.equal(env.tool, "synergy");
    assert.equal(env.findings.length, 1);
    const f = env.findings[0];
    assert.equal(f.severity, "p0");
    assert.ok(f.score >= 1000);
    assert.ok(f.label.includes("21.00%"));
  });

  test("p1 alert produces mid-score p1 finding", () => {
    const env = extractSynergy({ currentRatio: 0.215, alert: { severity: "p1", deltaPp: -0.5 } });
    assert.equal(env.findings[0].severity, "p1");
    assert.ok(env.findings[0].score >= 500 && env.findings[0].score < 1000);
  });

  test("alert.severity=ok → info finding with score=0 (still surfaces ratio)", () => {
    const env = extractSynergy({ currentRatio: 0.30, alert: { severity: "ok", deltaPp: 0 } });
    assert.equal(env.findings[0].severity, "info");
    assert.equal(env.findings[0].score, 0);
  });

  test("missing alert object → info (defensive)", () => {
    const env = extractSynergy({ currentRatio: 0.25 });
    assert.equal(env.findings[0].severity, "info");
  });

  test("NaN ratio → label shows NaN but doesn't crash", () => {
    const env = extractSynergy({ currentRatio: "not-a-number", alert: { severity: "ok" } });
    assert.equal(env.tool, "synergy");
    assert.ok(env.findings[0].label.includes("NaN"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractStaleMilestones
// ─────────────────────────────────────────────────────────────────────────────
describe("extractStaleMilestones", () => {
  test("ranked=[] → ok_no_findings, no headline", () => {
    const env = extractStaleMilestones({ ranked: [], totals: { total_milestones: 100, total_stale: 0 } });
    assert.equal(env.status, "ok_no_findings");
    assert.equal(env.findings.length, 0);
  });

  test("ranked=5 with >50% stale ratio → p1 headline + 3 detail items", () => {
    const env = extractStaleMilestones({
      ranked: Array.from({ length: 5 }, (_, i) => ({
        id: `MS${i}`, pending: 10, score: 100, reason: "never_started", never_started: true,
      })),
      totals: { total_milestones: 10, total_stale: 6 },
    });
    assert.equal(env.findings[0].severity, "p1");
    assert.equal(env.findings.length, 4); // headline + 3 items
    assert.match(env.findings[1].label, /^Stale: MS\d/);
  });

  test("low stale ratio → p2 headline", () => {
    const env = extractStaleMilestones({
      ranked: [{ id: "MS1", pending: 1, score: 5, reason: "stale_progress", never_started: false }],
      totals: { total_milestones: 100, total_stale: 3 },
    });
    assert.equal(env.findings[0].severity, "p2");
  });

  test("missing totals fields → defaults to 0, no crash", () => {
    const env = extractStaleMilestones({ ranked: [{ id: "X", pending: 1, score: 5 }] });
    assert.equal(env.tool, "stale");
    assert.ok(env.findings.length >= 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractColdScripts
// ─────────────────────────────────────────────────────────────────────────────
describe("extractColdScripts", () => {
  test("cold=[] → no findings", () => {
    const env = extractColdScripts({ cold: [], totals: { cold: 0, scanned: 10 } });
    assert.equal(env.status, "ok_no_findings");
  });

  test("high cold ratio → p2; low ratio → p3", () => {
    const high = extractColdScripts({
      cold: [{ relPath: "a.mjs", score: 5 }, { relPath: "b.mjs", score: 4 }],
      totals: { cold: 50, scanned: 100 },
    });
    assert.equal(high.findings[0].severity, "p2");
    const low = extractColdScripts({
      cold: [{ relPath: "a.mjs", score: 5 }],
      totals: { cold: 5, scanned: 100 },
    });
    assert.equal(low.findings[0].severity, "p3");
  });

  test("cold finding without relPath uses .path fallback", () => {
    const env = extractColdScripts({
      cold: [{ path: "/abs/path/x.mjs", score: 4 }],
      totals: { cold: 1, scanned: 10 },
    });
    assert.ok(env.findings.some((f) => f.id.includes("/abs/path/x.mjs")));
  });

  test("peer cold-script-rank schema (summary.cold + rel/loc/ageDays) parses", () => {
    const env = extractColdScripts({
      summary: { totalScripts: 100, cold: 50 },
      cold: [
        { name: "x.py", rel: "subdir/x.py", loc: 200, ageDays: 60, classification: "cold" },
      ],
    });
    assert.equal(env.status, "ok_with_findings");
    assert.equal(env.findings[0].severity, "p2"); // 50/100 = 50% > 30%
    assert.match(env.findings[1].label, /subdir\/x\.py/);
    assert.match(env.findings[1].label, /60d old/);
    assert.ok(env.findings[1].score > 0); // derived from ageDays + loc/100
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractHelperOrphans (schema-tolerant)
// ─────────────────────────────────────────────────────────────────────────────
describe("extractHelperOrphans", () => {
  test("payload.orphans[] schema works", () => {
    const env = extractHelperOrphans({ orphans: [{ name: "h1.mjs", score: 5 }] });
    assert.equal(env.status, "ok_with_findings");
    assert.match(env.findings[0].label, /1 orphan helper\(s\)/);
  });

  test("payload.ranked[] alternative schema works", () => {
    const env = extractHelperOrphans({ ranked: [{ relPath: "x.mjs" }, { relPath: "y.mjs" }] });
    assert.equal(env.findings[0].label, "2 orphan helper(s)");
  });

  test("payload.results[] alternative schema works", () => {
    const env = extractHelperOrphans({ results: [{ name: "x.mjs" }] });
    assert.equal(env.status, "ok_with_findings");
  });

  test("unknown schema → data_unavailable, not crash", () => {
    const env = extractHelperOrphans({ totally_random_field: 42 });
    assert.equal(env.status, "data_unavailable");
    assert.match(env.reason, /unknown_schema/);
  });

  test("empty orphans array → ok_no_findings", () => {
    const env = extractHelperOrphans({ orphans: [] });
    assert.equal(env.status, "ok_no_findings");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rankAll + determineExitCode
// ─────────────────────────────────────────────────────────────────────────────
describe("rankAll", () => {
  test("severity rank: p0 > p1 > p2 > p3 > info", () => {
    const envelopes = [
      { tool: "a", findings: [{ id: "x", severity: "p3", score: 100 }] },
      { tool: "b", findings: [{ id: "y", severity: "p0", score: 1 }] },
      { tool: "c", findings: [{ id: "z", severity: "info", score: 1000 }] },
      { tool: "d", findings: [{ id: "w", severity: "p1", score: 50 }] },
    ];
    const ranked = rankAll(envelopes, 10);
    assert.deepEqual(ranked.map((r) => r.severity), ["p0", "p1", "p3", "info"]);
  });

  test("within same severity, higher score wins; id is tiebreaker", () => {
    const envelopes = [
      { tool: "a", findings: [{ id: "b-low", severity: "p2", score: 10 }] },
      { tool: "b", findings: [{ id: "a-high", severity: "p2", score: 100 }] },
      { tool: "c", findings: [{ id: "a-tie", severity: "p2", score: 100 }] },
    ];
    const ranked = rankAll(envelopes, 10);
    // Scores: 10, 100, 100. DESC → 100, 100, 10. Tie broken id-ASC: a-high < a-tie.
    assert.deepEqual(ranked.map((r) => r.id), ["a-high", "a-tie", "b-low"]);
  });

  test("topN caps output", () => {
    const envelopes = [{
      tool: "a",
      findings: Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, severity: "p3", score: i })),
    }];
    assert.equal(rankAll(envelopes, 3).length, 3);
  });

  test("empty envelopes → empty array", () => {
    assert.deepEqual(rankAll([], 25), []);
  });

  test("envelopes with no findings → empty array", () => {
    assert.deepEqual(rankAll([{ tool: "a", findings: [] }, { tool: "b" }], 25), []);
  });
});

describe("determineExitCode", () => {
  test("all data_unavailable → exit 2", () => {
    assert.equal(determineExitCode([
      { tool: "a", status: "data_unavailable", findings: [] },
      { tool: "b", status: "data_unavailable", findings: [] },
    ]), 2);
  });

  test("any p0 finding → exit 1", () => {
    assert.equal(determineExitCode([
      { tool: "a", status: "ok_with_findings", findings: [{ severity: "p0" }] },
      { tool: "b", status: "ok_no_findings", findings: [] },
    ]), 1);
  });

  test("any p1 finding → exit 1", () => {
    assert.equal(determineExitCode([
      { tool: "a", status: "ok_with_findings", findings: [{ severity: "p1" }] },
    ]), 1);
  });

  test("only p2/p3/info findings → exit 0", () => {
    assert.equal(determineExitCode([
      { tool: "a", status: "ok_with_findings", findings: [{ severity: "p2" }, { severity: "p3" }] },
    ]), 0);
  });

  test("no findings at all → exit 0", () => {
    assert.equal(determineExitCode([{ tool: "a", status: "ok_no_findings", findings: [] }]), 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// invokeSubTool — uses a synthetic registry so we don't depend on live state.
// ─────────────────────────────────────────────────────────────────────────────
describe("invokeSubTool", () => {
  function makeStubScript(json, exitCode = 0) {
    const dir = mkdtempSync(join(tmpdir(), "dtlr-stub-"));
    const scriptPath = join(dir, "stub.mjs");
    writeFileSync(scriptPath, `#!/usr/bin/env node
process.stdout.write(${JSON.stringify(JSON.stringify(json))});
process.exit(${exitCode});
`);
    try { chmodSync(scriptPath, 0o755); } catch { /* windows: ignore */ }
    return { dir, scriptPath };
  }

  test("missing script → status=data_unavailable, reason=script_missing", () => {
    const reg = {
      synergy: { script: "scripts/nope-does-not-exist.mjs", args: ["--json"], extract: extractSynergy },
    };
    const env = invokeSubTool("synergy", reg, { repoRoot: process.cwd() });
    assert.equal(env.status, "data_unavailable");
    assert.match(env.reason, /script_missing/);
  });

  test("script exit=2 → data_unavailable (tool's own input-failure convention)", () => {
    const { dir, scriptPath } = makeStubScript({}, 2);
    const reg = {
      synergy: { script: scriptPath, args: [], extract: extractSynergy },
    };
    const env = invokeSubTool("synergy", reg, { repoRoot: dir });
    assert.equal(env.status, "data_unavailable");
    assert.match(env.reason, /tool_exit_2/);
  });

  test("script emits valid JSON → extractor runs", () => {
    const { dir, scriptPath } = makeStubScript({
      currentRatio: 0.21,
      alert: { severity: "p1", deltaPp: -0.8 },
    });
    const reg = {
      synergy: { script: scriptPath, args: [], extract: extractSynergy },
    };
    const env = invokeSubTool("synergy", reg, { repoRoot: dir });
    assert.equal(env.findings[0].severity, "p1");
  });

  test("script emits bad JSON → data_unavailable", () => {
    const dir = mkdtempSync(join(tmpdir(), "dtlr-bad-"));
    const scriptPath = join(dir, "bad.mjs");
    writeFileSync(scriptPath, `process.stdout.write("not json{"); process.exit(0);`);
    const reg = {
      synergy: { script: scriptPath, args: [], extract: extractSynergy },
    };
    const env = invokeSubTool("synergy", reg, { repoRoot: dir });
    assert.equal(env.status, "data_unavailable");
    assert.match(env.reason, /bad_json/);
  });

  test("unknown tool name → status=unknown_tool", () => {
    const env = invokeSubTool("nopetool", {}, { repoRoot: process.cwd() });
    assert.equal(env.status, "unknown_tool");
  });

  test("extractor throws → data_unavailable", () => {
    const { dir, scriptPath } = makeStubScript({ ok: true });
    const reg = {
      synergy: { script: scriptPath, args: [], extract: () => { throw new Error("boom"); } },
    };
    const env = invokeSubTool("synergy", reg, { repoRoot: dir });
    assert.equal(env.status, "data_unavailable");
    assert.match(env.reason, /extract_error.*boom/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CLI smoke — invoke the real script against the live registry.
// Exits depend on current fleet state; just assert it runs and emits something.
// ─────────────────────────────────────────────────────────────────────────────
describe("CLI smoke (real script, live sub-tools)", () => {
  test("--help exits 0 and prints usage", () => {
    const r = spawnSync(process.execPath, [SCRIPT_PATH, "--help"], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.match(r.stdout, /dev-tool-leverage-rank/);
  });

  test("--tools synergy --json runs and emits a valid envelope", () => {
    const r = spawnSync(process.execPath, [SCRIPT_PATH, "--tools", "synergy", "--json"], {
      encoding: "utf8", timeout: 60_000,
    });
    // Either 0 (clean) or 1 (a p0/p1 alert) — both indicate the orchestrator
    // ran. Exit 2 would mean all tools failed.
    assert.ok(r.status === 0 || r.status === 1, `unexpected exit ${r.status}: ${r.stderr}`);
    const payload = JSON.parse(r.stdout);
    assert.ok(Array.isArray(payload.tools));
    assert.equal(payload.tools[0].tool, "synergy");
    assert.ok(Array.isArray(payload.ranked));
  });

  test("--tools synergy,stale,cold,helper --json runs all 4 sub-tools", () => {
    const r = spawnSync(
      process.execPath,
      [SCRIPT_PATH, "--tools", "synergy,stale,cold,helper", "--json"],
      { encoding: "utf8", timeout: 120_000 },
    );
    assert.ok(r.status === 0 || r.status === 1, `unexpected exit ${r.status}: ${r.stderr.slice(0, 200)}`);
    const payload = JSON.parse(r.stdout);
    assert.equal(payload.tools.length, 4);
    const names = payload.tools.map((t) => t.tool).sort();
    assert.deepEqual(names, ["cold", "helper", "stale", "synergy"]);
  });

  test("unknown tool → exit 2", () => {
    const r = spawnSync(process.execPath, [SCRIPT_PATH, "--tools", "nope"], { encoding: "utf8" });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown tool/);
  });

  test("SUB_TOOLS registry exposes the canonical 4 tools", () => {
    const names = Object.keys(SUB_TOOLS).sort();
    assert.deepEqual(names, ["cold", "helper", "stale", "synergy"]);
    for (const t of names) {
      assert.ok(typeof SUB_TOOLS[t].extract === "function");
      assert.ok(typeof SUB_TOOLS[t].script === "string");
    }
  });
});
