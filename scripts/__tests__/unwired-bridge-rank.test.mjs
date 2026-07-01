/**
 * Tests for COMBO-EFFICIENCY-MS0 / P1-U03 unwired-bridge-rank.mjs.
 *
 * Scope:
 *   - parseUnwiredAudit: extract engine names from audit JSON (happy + defensive)
 *   - rankByFanIn: sort desc by fanIn, stable secondary sort on name
 *   - selectTopN: trim with non-positive N defaulting to 10
 *   - classifyBridgeTier: each tier boundary + adversarial inputs
 *   - buildTopNReport: tier tallying + truncation
 *   - CLI: --dry mode + env disable knob
 *
 * Run: node --test scripts/__tests__/unwired-bridge-rank.test.mjs
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  SCHEMA_VERSION,
  parseUnwiredAudit,
  rankByFanIn,
  selectTopN,
  classifyBridgeTier,
  buildTopNReport,
  computeBridgeRankings,
  findRipgrep,
  hasGitGrep,
  gitGrepFanIn,
  classifyConsumers,
} from "../unwired-bridge-rank.mjs";

// Resolve the real PRISM root from this test's location (scripts/__tests__/ -> root).
const PRISM_ROOT = path.resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"), "..", "..");

// ─── parseUnwiredAudit ─────────────────────────────────────────────────────

describe("parseUnwiredAudit", () => {
  test("extracts engine names from valid audit", () => {
    const audit = {
      unwiredEngines: [
        { engine: "PluginEngine", mtime: "2026-03-06", size_kb: 7 },
        { engine: "FluidPumpEngine", mtime: "2026-04-01", size_kb: 12 },
        { engine: "StripeBillingEngine", mtime: "2026-05-01", size_kb: 22 },
      ],
    };
    assert.deepEqual(parseUnwiredAudit(audit), ["PluginEngine", "FluidPumpEngine", "StripeBillingEngine"]);
  });

  test("skips entries missing engine field", () => {
    const audit = {
      unwiredEngines: [
        { engine: "A" },
        { mtime: "x" },                      // missing engine
        { engine: null },                    // null engine
        { engine: 42 },                      // non-string engine
        { engine: "B" },
      ],
    };
    assert.deepEqual(parseUnwiredAudit(audit), ["A", "B"]);
  });

  test("returns empty on missing/invalid audit shape", () => {
    assert.deepEqual(parseUnwiredAudit(null), []);
    assert.deepEqual(parseUnwiredAudit(undefined), []);
    assert.deepEqual(parseUnwiredAudit({}), []);
    assert.deepEqual(parseUnwiredAudit({ unwiredEngines: "not-an-array" }), []);
    assert.deepEqual(parseUnwiredAudit({ unwiredEngines: null }), []);
  });
});

// ─── classifyBridgeTier ────────────────────────────────────────────────────

describe("classifyBridgeTier — tier boundaries", () => {
  test("platinum at >=10 refs", () => {
    assert.equal(classifyBridgeTier(10), "platinum");
    assert.equal(classifyBridgeTier(100), "platinum");
    assert.equal(classifyBridgeTier(9), "gold");   // boundary
  });

  test("gold at [5, 10)", () => {
    assert.equal(classifyBridgeTier(5), "gold");
    assert.equal(classifyBridgeTier(9), "gold");
    assert.equal(classifyBridgeTier(4), "silver"); // boundary
  });

  test("silver at [2, 5)", () => {
    assert.equal(classifyBridgeTier(2), "silver");
    assert.equal(classifyBridgeTier(4), "silver");
    assert.equal(classifyBridgeTier(1), "fringe"); // boundary
  });

  test("fringe at <2", () => {
    assert.equal(classifyBridgeTier(0), "fringe");
    assert.equal(classifyBridgeTier(1), "fringe");
  });

  test("adversarial input → fringe (defensive: non-finite → fringe, not max)", () => {
    assert.equal(classifyBridgeTier(-5), "fringe");
    assert.equal(classifyBridgeTier(NaN), "fringe");
    // Infinity is garbage data (not a real ref count) — fail defensively to fringe,
    // not promote to platinum. Number.isFinite(Infinity) === false.
    assert.equal(classifyBridgeTier(Infinity), "fringe");
    assert.equal(classifyBridgeTier(-Infinity), "fringe");
    assert.equal(classifyBridgeTier("ten"), "fringe");
    assert.equal(classifyBridgeTier(null), "fringe");
    assert.equal(classifyBridgeTier(undefined), "fringe");
  });
});

// ─── rankByFanIn ───────────────────────────────────────────────────────────

describe("rankByFanIn — sort + tier annotation", () => {
  test("sorts descending by fanIn", () => {
    const names = ["A", "B", "C"];
    const map = new Map([
      ["A", { count: 5, files: ["a.ts"] }],
      ["B", { count: 12, files: ["b1.ts", "b2.ts"] }],
      ["C", { count: 1, files: ["c.ts"] }],
    ]);
    const out = rankByFanIn(names, map);
    assert.equal(out[0].name, "B");
    assert.equal(out[0].fanIn, 12);
    assert.equal(out[0].tier, "platinum");
    assert.equal(out[1].name, "A");
    assert.equal(out[1].tier, "gold");
    assert.equal(out[2].name, "C");
    assert.equal(out[2].tier, "fringe");
  });

  test("stable secondary sort on name (ties → alphabetical)", () => {
    const names = ["Zebra", "Alpha", "Mike"];
    const map = new Map([
      ["Zebra", { count: 5, files: [] }],
      ["Alpha", { count: 5, files: [] }],
      ["Mike",  { count: 5, files: [] }],
    ]);
    const out = rankByFanIn(names, map);
    // All same fanIn → alphabetical.
    assert.deepEqual(out.map((r) => r.name), ["Alpha", "Mike", "Zebra"]);
  });

  test("missing fanIn entries default to 0/fringe", () => {
    const names = ["X", "Y"];
    const map = new Map([["X", { count: 5, files: [] }]]);
    // Y not in map → fanIn = 0, tier = fringe.
    const out = rankByFanIn(names, map);
    assert.equal(out.find((r) => r.name === "Y").fanIn, 0);
    assert.equal(out.find((r) => r.name === "Y").tier, "fringe");
  });

  test("sampleFiles capped at 5", () => {
    const names = ["Big"];
    const map = new Map([["Big", { count: 100, files: ["a", "b", "c", "d", "e", "f", "g"] }]]);
    const out = rankByFanIn(names, map);
    assert.equal(out[0].sampleFiles.length, 5);
  });

  test("non-array names returns empty array", () => {
    assert.deepEqual(rankByFanIn(null, new Map()), []);
    assert.deepEqual(rankByFanIn("string", new Map()), []);
  });

  test("non-Map fanInMap defaults to empty (no crash)", () => {
    const out = rankByFanIn(["X"], "not-a-map");
    assert.equal(out[0].fanIn, 0);
  });
});

// ─── selectTopN ────────────────────────────────────────────────────────────

describe("selectTopN", () => {
  const sample = [{ name: "A" }, { name: "B" }, { name: "C" }, { name: "D" }];

  test("returns first N", () => {
    assert.equal(selectTopN(sample, 2).length, 2);
    assert.equal(selectTopN(sample, 2)[0].name, "A");
  });

  test("defaults to 10 on missing N", () => {
    assert.equal(selectTopN(sample).length, 4);  // sample shorter than 10
  });

  test("non-positive N defaults to 10 (not 0/empty)", () => {
    assert.equal(selectTopN(sample, 0).length, 4);
    assert.equal(selectTopN(sample, -5).length, 4);
    assert.equal(selectTopN(sample, NaN).length, 4);
  });

  test("non-array returns empty", () => {
    assert.deepEqual(selectTopN(null), []);
  });

  test("N >= length returns full", () => {
    assert.equal(selectTopN(sample, 100).length, 4);
  });
});

// ─── buildTopNReport ───────────────────────────────────────────────────────

describe("buildTopNReport", () => {
  test("truncates rankings to topN and tallies tiers", () => {
    const full = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: "2026-05-25T18:00:00.000Z",
      auditPath: "/x/audit.json",
      srcRoot: "/x/src",
      unwiredCount: 5,
      rankings: [
        { name: "P1", fanIn: 50, tier: "platinum", sampleFiles: [] },
        { name: "P2", fanIn: 30, tier: "platinum", sampleFiles: [] },
        { name: "G1", fanIn: 5,  tier: "gold",     sampleFiles: [] },
        { name: "S1", fanIn: 3,  tier: "silver",   sampleFiles: [] },
        { name: "F1", fanIn: 0,  tier: "fringe",   sampleFiles: [] },
      ],
      blockers: [],
    };
    const out = buildTopNReport(full, 3);
    assert.equal(out.rankings.length, 3);
    assert.equal(out.rankings[0].name, "P1");
    assert.equal(out.topN, 3);
    // tierCounts is over the FULL ranking (not the truncated view)
    assert.deepEqual(out.tierCounts, { platinum: 2, gold: 1, silver: 1, fringe: 1 });
  });
});

// ─── computeBridgeRankings — I/O ───────────────────────────────────────────

function withTempPrismRoot(seedFn) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "unwired-bridge-rank-test-"));
  try {
    fs.mkdirSync(path.join(tmp, "state/shared"), { recursive: true });
    fs.mkdirSync(path.join(tmp, "mcp-server/src/engines"), { recursive: true });
    seedFn(tmp);
    return tmp;
  } catch (err) {
    fs.rmSync(tmp, { recursive: true, force: true });
    throw err;
  }
}

test("computeBridgeRankings: missing audit → empty rankings + blocker", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const out = computeBridgeRankings({ prismRoot: tmp });
    assert.equal(out.schemaVersion, SCHEMA_VERSION);
    assert.equal(out.unwiredCount, 0);
    assert.equal(out.rankings.length, 0);
    assert.equal(out.blockers.length, 1);
    assert.match(out.blockers[0], /audit-missing/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("computeBridgeRankings: end-to-end with seeded audit + src files", { skip: !hasRipgrep() }, () => {
  const tmp = withTempPrismRoot((root) => {
    // Seed audit with 3 unwired engines.
    fs.writeFileSync(
      path.join(root, "state/shared/UNWIRED-ENGINE-AUDIT-2026-05-25.json"),
      JSON.stringify({
        unwiredEngines: [
          { engine: "HighRefEngine" },
          { engine: "MidRefEngine" },
          { engine: "NoRefEngine" },
        ],
      }),
    );
    // Seed src with files that reference HighRefEngine 12x and MidRefEngine 3x.
    fs.writeFileSync(
      path.join(root, "mcp-server/src/engines/HighRefEngine.ts"),
      `export class HighRefEngine { foo() { return new HighRefEngine(); } }\nimport { HighRefEngine } from "./HighRefEngine.js";\nconst x = HighRefEngine;\nconst y = HighRefEngine;\n`,
    );
    fs.writeFileSync(
      path.join(root, "mcp-server/src/engines/Consumer1.ts"),
      `import { HighRefEngine } from "./HighRefEngine.js";\nimport { MidRefEngine } from "./MidRefEngine.js";\nclass Consumer1 { use() { return new HighRefEngine(); /* HighRefEngine */ } }\nconst h = HighRefEngine;\nconst h2 = HighRefEngine; const h3 = HighRefEngine; const h4 = HighRefEngine; const h5 = HighRefEngine;\n`,
    );
    fs.writeFileSync(
      path.join(root, "mcp-server/src/engines/Consumer2.ts"),
      `import { MidRefEngine } from "./MidRefEngine.js";\nconst m = MidRefEngine;\nconst m2 = MidRefEngine;\n`,
    );
  });
  try {
    const out = computeBridgeRankings({ prismRoot: tmp, timeoutMs: 4000 });
    assert.equal(out.unwiredCount, 3);
    assert.equal(out.blockers.length, 0);
    // HighRefEngine has the highest fan-in (many refs across multiple files).
    assert.equal(out.rankings[0].name, "HighRefEngine");
    // MidRefEngine should be second.
    assert.equal(out.rankings[1].name, "MidRefEngine");
    // NoRefEngine has no refs → tier fringe.
    assert.equal(out.rankings[2].name, "NoRefEngine");
    assert.equal(out.rankings[2].tier, "fringe");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: --dry prints report JSON, no file written", { skip: !hasRipgrep() }, () => {
  const tmp = withTempPrismRoot((root) => {
    fs.writeFileSync(
      path.join(root, "state/shared/UNWIRED-ENGINE-AUDIT-2026-05-25.json"),
      JSON.stringify({ unwiredEngines: [{ engine: "X" }] }),
    );
  });
  try {
    const scriptPath = path.resolve(new URL("../unwired-bridge-rank.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--dry", "--root", tmp], { encoding: "utf8" });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.schemaVersion, SCHEMA_VERSION);
    assert.ok(!fs.existsSync(path.join(tmp, "state/shared/UNWIRED-BRIDGES-TOP10.json")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("CLI: env disable knob no-ops cleanly", () => {
  const tmp = withTempPrismRoot(() => {});
  try {
    const scriptPath = path.resolve(new URL("../unwired-bridge-rank.mjs", import.meta.url).pathname.replace(/^\//, ""));
    const r = spawnSync(process.execPath, [scriptPath, "--root", tmp], {
      encoding: "utf8",
      env: { ...process.env, PRISM_UNWIRED_BRIDGE_RANK_DISABLE: "1" },
    });
    assert.equal(r.status, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.skipped, "disabled-via-env");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

// Helper: is ripgrep on PATH? Used to skip filesystem tests when rg absent.
function hasRipgrep() {
  try {
    const r = spawnSync(process.platform === "win32" ? "rg.exe" : "rg", ["--version"], { encoding: "utf8", timeout: 2000 });
    return !r.error && r.status === 0;
  } catch { return false; }
}

// ─── git-grep fallback + resolver (U-UNWIRED-RANK-RESOLVE, 2026-06-14) ────────
// The ranker silently returned 0 rankings when ripgrep was not on PATH (the
// bundled rg under %LOCALAPPDATA% was missed). These cover the resolver fix +
// the git-grep fallback that makes the ranker rg-independent.
describe("ripgrep resolver + git-grep fallback", () => {
  const SRC = path.join(PRISM_ROOT, "mcp-server", "src");

  test("hasGitGrep is true inside the repo", () => {
    assert.equal(hasGitGrep(PRISM_ROOT, 8000), true);
  });

  test("gitGrepFanIn counts whole-word refs for a widely-referenced engine", () => {
    const r = gitGrepFanIn("DuplicationGuardEngine", SRC, PRISM_ROOT, 20000, []);
    assert.ok(r, "expected a {count,files} result");
    assert.ok(r.count > 0, `DuplicationGuardEngine should be referenced; got ${r.count}`);
    assert.ok(Array.isArray(r.files) && r.files.length > 0, "expected referring files");
  });

  test("gitGrepFanIn returns count 0 for a nonsense name (no false hits)", () => {
    const r = gitGrepFanIn("ZzNonexistentEngineNameZz0", SRC, PRISM_ROOT, 20000, []);
    assert.ok(r);
    assert.equal(r.count, 0);
    assert.deepEqual(r.files, []);
  });

  test("gitGrepFanIn rejects a non-string name (defensive)", () => {
    assert.equal(gitGrepFanIn(null, SRC, PRISM_ROOT, 5000, []), null);
  });

  test("findRipgrep returns null or a usable non-empty binary string", () => {
    const rg = findRipgrep(null);
    assert.ok(rg === null || (typeof rg === "string" && rg.length > 0));
  });

  test("REGRESSION: computeBridgeRankings ranks a valid audit, never the silent empty + blocker", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ubr-resolve-"));
    const auditFile = path.join(tmp, "UNWIRED-ENGINE-AUDIT-2099-01-01.json");
    fs.writeFileSync(auditFile, JSON.stringify({ unwiredEngines: [{ engine: "DuplicationGuardEngine" }] }));
    try {
      const out = computeBridgeRankings({ prismRoot: PRISM_ROOT, auditPath: auditFile, timeoutMs: 20000 });
      // The bug this closes: rg-not-found -> rankings:[] + a blocker. The resolver
      // (bundled rg) or the git-grep fallback must now rank the engine cleanly.
      assert.deepEqual(out.blockers, [], `expected no blockers, got ${JSON.stringify(out.blockers)}`);
      assert.equal(out.unwiredCount, 1);
      assert.equal(out.rankings.length, 1);
      assert.equal(out.rankings[0].name, "DuplicationGuardEngine");
      assert.ok(out.rankings[0].fanIn > 0, "a referenced engine should have positive fan-in");
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});

// ─── classifyConsumers — TRUE wire-ROI signal (U-UNWIRED-RANK-CONSUMER) ───────
// The raw match-count over-stated ROI (self+test+doc+barrel inflation). These pin
// the three honest buckets: dormant (real consumers, no dispatcher), leaf (def+test
// only), maybe-wired (dispatcher ref present -> likely stale-audit false positive).
describe("classifyConsumers — true consumer fan-in buckets", () => {
  const E = "FooBridgeEngine";

  test("dormant: a real external consumer, no dispatcher", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,               // self  (excluded)
      `mcp-server/src/__tests__/${E}.test.ts`,        // test  (excluded)
      "mcp-server/src/engines/CallerEngine.ts",       // REAL consumer
    ]);
    assert.equal(c.wireClass, "dormant");
    assert.equal(c.consumerFanIn, 1);
    assert.deepEqual(c.consumerFiles, ["mcp-server/src/engines/CallerEngine.ts"]);
    assert.deepEqual(c.dispatcherFiles, []);
  });

  test("leaf: only own def + test exist (zero real consumers)", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,
      `mcp-server/src/__tests__/${E}.test.ts`,
    ]);
    assert.equal(c.wireClass, "leaf");
    assert.equal(c.consumerFanIn, 0);
    assert.deepEqual(c.consumerFiles, []);
  });

  test("maybe-wired: a dispatcher reference present (stale-audit false positive)", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,
      "mcp-server/src/tools/dispatchers/camDispatcher.ts",  // dispatcher ref
      "mcp-server/src/engines/CallerEngine.ts",
    ]);
    assert.equal(c.wireClass, "maybe-wired");
    assert.equal(c.dispatcherFiles.length, 1);
  });

  test("barrel re-export (engines/index.ts) is NOT a consumer", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,
      "mcp-server/src/engines/index.ts",   // re-export, not a consumer
    ]);
    assert.equal(c.wireClass, "leaf");
    assert.equal(c.consumerFanIn, 0);
  });

  test("orphan .ts-N backup variant is NOT a consumer", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,
      "mcp-server/src/engines/index.ts-1",   // untracked orphan backup
      "mcp-server/src/engines/index.ts-2",
    ]);
    assert.equal(c.wireClass, "leaf");
    assert.equal(c.consumerFanIn, 0);
  });

  test("docs (.md) are NOT consumers", () => {
    const c = classifyConsumers(E, [
      `mcp-server/src/engines/${E}.ts`,
      "mcp-server/src/engines/wiring/CLAUDE.md",
      "mcp-server/src/engines/wiring/MEMORY.md",
    ]);
    assert.equal(c.wireClass, "leaf");
    assert.equal(c.consumerFanIn, 0);
  });

  test("dispatcher presence takes precedence over real consumers", () => {
    const c = classifyConsumers(E, [
      "mcp-server/src/engines/CallerOne.ts",
      "mcp-server/src/engines/CallerTwo.ts",
      "mcp-server/src/tools/dispatchers/aiReasoningDispatcher.ts",
    ]);
    assert.equal(c.wireClass, "maybe-wired");   // wired beats dormant
  });

  test("Windows backslash paths classify identically", () => {
    // Build backslash paths programmatically — a literal "\\" in JS source is
    // fragile through tooling; convert forward-slash paths instead.
    const bs = (p) => p.replace(/\//g, "\\");
    const c = classifyConsumers(E, [
      bs(`mcp-server/src/engines/${E}.ts`),
      bs("mcp-server/src/engines/CallerEngine.ts"),
    ]);
    assert.equal(c.wireClass, "dormant");
    assert.equal(c.consumerFanIn, 1);
  });

  test("defensive: non-array files -> leaf, empty", () => {
    const c = classifyConsumers(E, null);
    assert.equal(c.wireClass, "leaf");
    assert.equal(c.consumerFanIn, 0);
    assert.deepEqual(c.consumerFiles, []);
    assert.deepEqual(c.dispatcherFiles, []);
  });

  test("REGRESSION: computeBridgeRankings emits honest wireBuckets (dormant/leaf/maybeWired)", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ubr-buckets-"));
    const auditFile = path.join(tmp, "UNWIRED-ENGINE-AUDIT-2099-01-01.json");
    fs.writeFileSync(auditFile, JSON.stringify({ unwiredEngines: [{ engine: "DuplicationGuardEngine" }] }));
    try {
      const out = computeBridgeRankings({ prismRoot: PRISM_ROOT, auditPath: auditFile, timeoutMs: 20000 });
      assert.ok(out.wireBuckets, "wireBuckets must be present");
      const { dormant, leaf, maybeWired } = out.wireBuckets;
      assert.equal(dormant + leaf + maybeWired, out.unwiredCount, "every engine lands in exactly one bucket");
      assert.ok(Array.isArray(out.wireCandidates));
      assert.ok(Array.isArray(out.leafEngines));
      assert.ok(Array.isArray(out.maybeWired));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
