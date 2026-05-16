#!/usr/bin/env node
/**
 * detect-system-viz-drift.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-DRIFT-DETECTOR
 *
 * Hermetic — injects fsStat + nowMs + writes to tmp report. Real-value assertions.
 * Run: node --test scripts/detect-system-viz-drift.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  classifyDrift,
  buildDriftReport,
  DRIFT_CATEGORIES,
  DEFAULT_MTIME_TOLERANCE_MS,
  parseCliArgs,
  writeReportAtomic,
} from "./detect-system-viz-drift.mjs";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = 1715800000000;

const stubStat = (paths) => (absPath) => {
  if (paths[absPath] === null) return null;
  if (paths[absPath] === "throw") throw new Error("stat-failed");
  return { mtimeMs: paths[absPath] };
};

describe("classifyDrift", () => {
  test("fresh — recent walk, no activity, no truncation", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": NOW - 2 * HOUR }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.FRESH);
    assert.equal(c.severity, 0);
  });

  test("stale-time — walk older than max-staleness", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - 2 * DAY).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": NOW - 3 * DAY }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.STALE_TIME);
    assert.match(c.note, /threshold/);
  });

  test("stale-churn — disk activity since walk (> tolerance)", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": NOW - 30 * 60 * 1000 }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.STALE_CHURN);
    assert.ok(c.deltaMs > DEFAULT_MTIME_TOLERANCE_MS);
  });

  test("disk-activity within tolerance → fresh, not stale-churn", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": (NOW - HOUR) + 5000 }), nowMs: NOW } // 5s after walk (< 30s tolerance)
    );
    assert.equal(c.category, DRIFT_CATEGORIES.FRESH);
  });

  test("truncated overrides stale-churn classification", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: true },
      { fsStat: stubStat({ "/x": NOW }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.TRUNCATED);
    assert.match(c.note, /max-files cap/);
  });

  test("root-missing dominates all other categories", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/nope", lastWalkedAt: new Date(NOW - 2 * DAY).toISOString(), truncated: true },
      { fsStat: stubStat({ "/nope": null }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.ROOT_MISSING);
    assert.equal(c.severity, 5);
  });

  test("never-walked when lastWalkedAt missing", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: null, truncated: false },
      { fsStat: stubStat({ "/x": NOW }), nowMs: NOW }
    );
    assert.equal(c.category, DRIFT_CATEGORIES.NEVER_WALKED);
    assert.equal(c.stalenessMs, Infinity);
  });

  test("clock skew — lastWalkedAt in future, stalenessMs clamped to 0", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW + HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": NOW - HOUR }), nowMs: NOW }
    );
    assert.equal(c.stalenessMs, 0); // clamped
  });

  test("custom maxStalenessMs override", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - 2 * HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": NOW - 3 * HOUR }), nowMs: NOW, maxStalenessMs: HOUR } // 1h threshold
    );
    assert.equal(c.category, DRIFT_CATEGORIES.STALE_TIME);
  });

  test("custom toleranceMs override", () => {
    const c = classifyDrift(
      { namespace: "x", root: "/x", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false },
      { fsStat: stubStat({ "/x": (NOW - HOUR) + 5000 }), nowMs: NOW, toleranceMs: 1000 } // 1s tolerance
    );
    assert.equal(c.category, DRIFT_CATEGORIES.STALE_CHURN); // 5s > 1s tolerance
  });
});

describe("buildDriftReport", () => {
  const tmp = path.join(os.tmpdir(), `drift-test-${Date.now()}.json`);

  test("empty graph → total=0 with sane summary", () => {
    fs.writeFileSync(tmp, JSON.stringify({ nodes: [], edges: [], meta: { fsCoverage: {} } }));
    try {
      const r = buildDriftReport(tmp);
      assert.equal(r.total, 0);
      assert.match(r.summary, /no fsCoverage/);
    } finally { fs.unlinkSync(tmp); }
  });

  test("missing graph → empty report (never throws)", () => {
    const r = buildDriftReport("/nope/missing.json");
    assert.equal(r.total, 0);
  });

  test("sorts by severity DESC, then staleness DESC, then namespace ASC", () => {
    const graph = {
      nodes: [], edges: [],
      meta: {
        fsCoverage: {
          "a-fresh::/a": { walkRoot: "/a", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 10 },
          "b-trunc::/b": { walkRoot: "/b", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: true, coverageRatio: 0.5, filesRepresented: 20 },
          "c-stale::/c": { walkRoot: "/c", lastWalkedAt: new Date(NOW - 3 * DAY).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 30 },
        },
      },
    };
    fs.writeFileSync(tmp, JSON.stringify(graph));
    try {
      const r = buildDriftReport(tmp, {
        fsStat: stubStat({ "/a": NOW - 2 * HOUR, "/b": NOW, "/c": NOW - 4 * DAY }),
        nowMs: NOW,
      });
      assert.equal(r.total, 3);
      // truncated (severity 3) ranks above stale-time (2) above fresh (0)
      assert.equal(r.namespaces[0].driftCategory, DRIFT_CATEGORIES.TRUNCATED);
      assert.equal(r.namespaces[1].driftCategory, DRIFT_CATEGORIES.STALE_TIME);
      assert.equal(r.namespaces[2].driftCategory, DRIFT_CATEGORIES.FRESH);
    } finally { fs.unlinkSync(tmp); }
  });

  test("byCategory tally is correct + summary describes non-fresh categories", () => {
    const graph = {
      nodes: [], edges: [],
      meta: {
        fsCoverage: {
          "a::/a": { walkRoot: "/a", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 10 },
          "b::/b": { walkRoot: "/b", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: true, coverageRatio: 0.5, filesRepresented: 20 },
          "c::/c": { walkRoot: "/c", lastWalkedAt: null, truncated: false, coverageRatio: 0, filesRepresented: 0 },
        },
      },
    };
    fs.writeFileSync(tmp, JSON.stringify(graph));
    try {
      const r = buildDriftReport(tmp, {
        fsStat: stubStat({ "/a": NOW - 2 * HOUR, "/b": NOW, "/c": NOW }),
        nowMs: NOW,
      });
      assert.equal(r.byCategory.fresh, 1);
      assert.equal(r.byCategory.truncated, 1);
      assert.equal(r.byCategory["never-walked"], 1);
      assert.match(r.summary, /2\/3 drifted/);
    } finally { fs.unlinkSync(tmp); }
  });
});

describe("parseCliArgs", () => {
  test("defaults", () => {
    const a = parseCliArgs([]);
    assert.equal(a.json, false);
    assert.equal(a.quiet, false);
    assert.equal(a.noWrite, false);
    assert.ok(a.maxStalenessMs > 0);
  });
  test("--json + --quiet + --no-write flags", () => {
    const a = parseCliArgs(["--json", "--quiet", "--no-write"]);
    assert.equal(a.json, true);
    assert.equal(a.quiet, true);
    assert.equal(a.noWrite, true);
  });
  test("--max-staleness-hours converts to ms", () => {
    const a = parseCliArgs(["--max-staleness-hours", "12"]);
    assert.equal(a.maxStalenessMs, 12 * HOUR);
  });
  test("--tolerance-ms passes through", () => {
    const a = parseCliArgs(["--tolerance-ms", "60000"]);
    assert.equal(a.toleranceMs, 60000);
  });
});

describe("writeReportAtomic", () => {
  test("writes then renames; idempotent", () => {
    const tmp = path.join(os.tmpdir(), `drift-write-test-${Date.now()}.json`);
    try {
      writeReportAtomic(tmp, { generatedAt: "2026-05-15T00:00:00Z", total: 5 });
      const parsed = JSON.parse(fs.readFileSync(tmp, "utf8"));
      assert.equal(parsed.total, 5);
      // overwrite
      writeReportAtomic(tmp, { generatedAt: "2026-05-15T01:00:00Z", total: 10 });
      const parsed2 = JSON.parse(fs.readFileSync(tmp, "utf8"));
      assert.equal(parsed2.total, 10);
    } finally { try { fs.unlinkSync(tmp); } catch { /* ignore */ } }
  });
});

describe("end-to-end — real PRISM 3-namespace scenario", () => {
  test("recreates the JM DIE + Docustrata + .claude shape", () => {
    const tmp = path.join(os.tmpdir(), `drift-e2e-${Date.now()}.json`);
    const graph = {
      nodes: [], edges: [],
      meta: {
        fsCoverage: {
          ".claude::H:/prism/.claude": { walkRoot: "/claude", lastWalkedAt: new Date(NOW - HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 77614 },
          "JM DIE::H:/prism/JM DIE": { walkRoot: "/jmdie", lastWalkedAt: new Date(NOW - 5 * HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 173763 },
          "Docustrata::H:/prism/Docustrata": { walkRoot: "/docu", lastWalkedAt: new Date(NOW - 2 * HOUR).toISOString(), truncated: false, coverageRatio: 1, filesRepresented: 215950 },
        },
      },
    };
    fs.writeFileSync(tmp, JSON.stringify(graph));
    try {
      const r = buildDriftReport(tmp, {
        fsStat: stubStat({ "/claude": NOW - 2 * HOUR, "/jmdie": NOW - 6 * HOUR, "/docu": NOW - HOUR }),
        nowMs: NOW,
      });
      // .claude: dirMtime(NOW-2h) > lastWalk(NOW-1h)? 2h < 1h is FALSE → mtime BEFORE walk → fresh
      // wait: dirMtime NOW-2h means 2 hours ago. lastWalk NOW-1h means 1 hour ago. So dirMtime is OLDER. delta = -1h. fresh.
      const claudeRow = r.namespaces.find(n => n.namespace === ".claude::H:/prism/.claude");
      assert.equal(claudeRow.driftCategory, DRIFT_CATEGORIES.FRESH);
      // JM DIE: dirMtime NOW-6h, lastWalk NOW-5h → delta=-1h → fresh
      const jmRow = r.namespaces.find(n => n.namespace === "JM DIE::H:/prism/JM DIE");
      assert.equal(jmRow.driftCategory, DRIFT_CATEGORIES.FRESH);
      // Docustrata: dirMtime NOW-1h, lastWalk NOW-2h → delta=+1h > tolerance → stale-churn
      const docuRow = r.namespaces.find(n => n.namespace === "Docustrata::H:/prism/Docustrata");
      assert.equal(docuRow.driftCategory, DRIFT_CATEGORIES.STALE_CHURN);
    } finally { fs.unlinkSync(tmp); }
  });
});
