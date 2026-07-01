/**
 * sierra-graph-health-inject.test.mjs -- SYSTEM-VIZ-HYGIENE / U-SVH-XSUB-SURFACE
 *
 * Real tests for the cross-substrate embeds-degradation surfacing added to the sierra
 * graph-health inject (closes the A3 loop -- the cross-substrate-warnings.json sidecar
 * was write-only/silent before this). Two layers:
 *   1. pure formatEmbedsWarning(): happy (single + multi) + 3 failure modes
 *      (stale / empty / bad-`at`) + 2 adversarial (null+garbage / missing-fields).
 *   2. E2E: drive the whole hook through stdin/stdout with a PRISM_ROOT temp fixture
 *      -- proves the slot-gate AND that the sidecar actually surfaces in the block.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatEmbedsWarning, formatAugmentationStaleness } from "./sierra-graph-health-inject.mjs";

const HOOK = path.join(path.dirname(fileURLToPath(import.meta.url)), "sierra-graph-health-inject.mjs");
const NOW = Date.parse("2026-06-15T12:00:00.000Z");
const recent = (mins) => new Date(NOW - mins * 60000).toISOString();
// E2E fixtures must be REAL-time-relative: the spawned hook computes age/window from
// the real Date.now() (not the injected NOW), so a fixed-NOW fixture rots to STALE once
// wall-clock passes NOW+24h. realRecent keeps E2E fixtures "recent" whenever the suite
// runs (the pure-helper tests above stay on the fixed NOW since they inject `now`).
const realRecent = (mins) => new Date(Date.now() - mins * 60000).toISOString();

describe("formatEmbedsWarning -- pure helper", () => {
  it("recent single warning -> rendered line with fields, no '+N more'", () => {
    const line = formatEmbedsWarning(
      { at: recent(60), warnings: ["embeds: node-card offset oracle ABSENT -> 0 embeds edges emitted"], embedsEdges: 0, oracleLoaded: false },
      NOW,
    );
    assert.ok(line);
    assert.match(line, /embeds DEGRADED \(last 24h\)/);
    assert.match(line, /offset oracle ABSENT/);
    assert.match(line, /embedsEdges=0/);
    assert.match(line, /oracleLoaded=no/);
    assert.ok(!/\+\d+ more/.test(line));
    assert.ok(line.startsWith("\n- ")); // single-line markdown suffix
  });

  it("multiple warnings -> head + '(+N more)' count + oracleLoaded=yes", () => {
    const line = formatEmbedsWarning(
      { at: recent(30), warnings: ["a absent", "b absent", "collapsed"], embedsEdges: 0, oracleLoaded: true },
      NOW,
    );
    assert.match(line, /\(\+2 more\)/);
    assert.match(line, /oracleLoaded=yes/);
    assert.ok(line.includes("a absent")); // head is warning[0]
  });

  // failure modes
  it("stale (>24h) -> null (the staleness verdict above already covers it)", () => {
    assert.equal(formatEmbedsWarning({ at: new Date(NOW - 25 * 3.6e6).toISOString(), warnings: ["x"], embedsEdges: 0 }, NOW), null);
  });
  it("exactly 24h old -> null; 1ms inside -> renders (half-open window, parity with drift block's `< 24h`)", () => {
    assert.equal(formatEmbedsWarning({ at: new Date(NOW - 24 * 3.6e6).toISOString(), warnings: ["x"], embedsEdges: 0 }, NOW), null);
    assert.ok(formatEmbedsWarning({ at: new Date(NOW - (24 * 3.6e6 - 1000)).toISOString(), warnings: ["x"], embedsEdges: 0 }, NOW));
  });
  it("empty warnings array -> null", () => {
    assert.equal(formatEmbedsWarning({ at: recent(5), warnings: [], embedsEdges: 562 }, NOW), null);
  });
  it("missing / unparseable `at` -> null", () => {
    assert.equal(formatEmbedsWarning({ warnings: ["x"] }, NOW), null);
    assert.equal(formatEmbedsWarning({ at: "not-a-date", warnings: ["x"] }, NOW), null);
  });

  // adversarial
  it("null / undefined / garbage / non-array warnings -> null (never throws)", () => {
    assert.equal(formatEmbedsWarning(null, NOW), null);
    assert.equal(formatEmbedsWarning(undefined, NOW), null);
    assert.equal(formatEmbedsWarning("nope", NOW), null);
    assert.equal(formatEmbedsWarning(42, NOW), null);
    assert.equal(formatEmbedsWarning({ at: recent(1), warnings: "notarray" }, NOW), null);
  });
  it("embedsEdges absent -> '?' placeholder, oracleLoaded defaults to no, still renders", () => {
    const line = formatEmbedsWarning({ at: recent(1), warnings: ["w"] }, NOW);
    assert.match(line, /embedsEdges=\?/);
    assert.match(line, /oracleLoaded=no/);
  });
});

describe("formatAugmentationStaleness -- pure helper (U-VIZ-AUG-FRESHNESS-GUARD)", () => {
  const sc = (over) => ({ at: recent(30), summary: { staleOrphan: 1, orphanList: ["awareness-augmentation.json (1057h)"] }, ...over });

  it("recent sidecar with 1 orphan -> rendered line, count + the orphan, no '+N more'", () => {
    const line = formatAugmentationStaleness(sc(), NOW);
    assert.ok(line);
    assert.match(line, /1 merged augmentation\(s\) STALE-ORPHAN/);
    assert.match(line, /awareness-augmentation\.json \(1057h\)/);
    assert.match(line, /GREEN = re-merge recency, NOT input freshness/);
    assert.ok(!/\+\d+ more/.test(line));
    assert.ok(line.startsWith("\n- ")); // single-line markdown suffix
  });

  it(">3 orphans -> head(3) + '(+N more)' count", () => {
    const line = formatAugmentationStaleness(
      sc({ summary: { staleOrphan: 10, orphanList: ["a (1h)", "b (2h)", "c (3h)", "d (4h)", "e (5h)"] } }),
      NOW,
    );
    assert.match(line, /10 merged augmentation\(s\) STALE-ORPHAN/);
    assert.match(line, /\(\+2 more\)/); // 5 listed, 3 shown -> +2
    assert.ok(line.includes("a (1h)") && line.includes("c (3h)") && !line.includes("d (4h)"));
  });

  // failure modes
  it("staleOrphan = 0 -> null (nothing to surface)", () => {
    assert.equal(formatAugmentationStaleness(sc({ summary: { staleOrphan: 0, orphanList: [] } }), NOW), null);
  });
  it("stale sidecar (>24h) -> null (health verdict already covers it)", () => {
    assert.equal(formatAugmentationStaleness(sc({ at: new Date(NOW - 25 * 3.6e6).toISOString() }), NOW), null);
  });
  it("exactly 24h old -> null; 1s inside -> renders (half-open window, parity with embeds block)", () => {
    assert.equal(formatAugmentationStaleness(sc({ at: new Date(NOW - 24 * 3.6e6).toISOString() }), NOW), null);
    assert.ok(formatAugmentationStaleness(sc({ at: new Date(NOW - (24 * 3.6e6 - 1000)).toISOString() }), NOW));
  });
  it("missing / unparseable `at` -> null", () => {
    assert.equal(formatAugmentationStaleness({ summary: { staleOrphan: 1, orphanList: ["x"] } }, NOW), null);
    assert.equal(formatAugmentationStaleness(sc({ at: "not-a-date" }), NOW), null);
  });

  // adversarial
  it("null / garbage / no-summary / non-number staleOrphan -> null (never throws)", () => {
    assert.equal(formatAugmentationStaleness(null, NOW), null);
    assert.equal(formatAugmentationStaleness("nope", NOW), null);
    assert.equal(formatAugmentationStaleness(42, NOW), null);
    assert.equal(formatAugmentationStaleness({ at: recent(1) }, NOW), null); // no summary
    assert.equal(formatAugmentationStaleness(sc({ summary: { staleOrphan: "NaN", orphanList: [] } }), NOW), null);
  });
  it("orphanList missing -> renders count, empty head (never throws)", () => {
    const line = formatAugmentationStaleness({ at: recent(1), summary: { staleOrphan: 2 } }, NOW);
    assert.ok(line);
    assert.match(line, /2 merged augmentation\(s\) STALE-ORPHAN/);
  });
});

describe("sierra-graph-health-inject -- E2E through stdin/stdout", () => {
  function run(fixture, sessionId, extraEnv) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "sgh-"));
    try {
      fs.mkdirSync(path.join(root, "state", "shared", "system-viz"), { recursive: true });
      fs.writeFileSync(path.join(root, "state", "shared", "chat-slots.json"), JSON.stringify({ slots: fixture.slots }));
      fs.writeFileSync(
        path.join(root, "state", "shared", "system-viz", ".last-successful-regen.json"),
        JSON.stringify({ ts: realRecent(120), graphBytes: 644000000, pendingCount: 0, sidecarOk: true }),
      );
      if (fixture.warnings) {
        fs.writeFileSync(path.join(root, "state", "shared", "system-viz", "cross-substrate-warnings.json"), JSON.stringify(fixture.warnings));
      }
      if (fixture.freshness) {
        fs.writeFileSync(path.join(root, "state", "shared", "system-viz", ".augmentation-freshness.json"), JSON.stringify(fixture.freshness));
      }
      const out = execFileSync(process.execPath, [HOOK], {
        input: JSON.stringify({ session_id: sessionId }),
        env: { ...process.env, PRISM_ROOT: root, PRISM_SIERRA_GRAPH_HEALTH_DISABLE: "", ...extraEnv },
        encoding: "utf8",
      });
      return JSON.parse(out);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
  const sierraSlots = { sierra: { chatId: "claude-deadbeef" } };

  it("sierra slot + recent warnings sidecar -> block surfaces the degradation", () => {
    const r = run(
      { slots: sierraSlots, warnings: { at: realRecent(30), warnings: ["embeds: node-card offset oracle ABSENT -> 0 embeds edges emitted"], embedsEdges: 0, oracleLoaded: false } },
      "claude-deadbeef",
    );
    assert.equal(r.continue, true);
    assert.ok(r.hookSpecificOutput, "expected a block for the sierra slot");
    assert.match(r.hookSpecificOutput.additionalContext, /embeds DEGRADED/);
    assert.match(r.hookSpecificOutput.additionalContext, /system-viz graph health/);
  });

  it("sierra slot + recent freshness sidecar with orphans -> block surfaces STALE-ORPHAN", () => {
    const r = run(
      { slots: sierraSlots, freshness: { at: realRecent(20), summary: { staleOrphan: 4, orphanList: ["awareness-augmentation.json (1057h)", "core-inventory-augmentation.json (1038h)"] } } },
      "claude-deadbeef",
    );
    assert.ok(r.hookSpecificOutput);
    assert.match(r.hookSpecificOutput.additionalContext, /STALE-ORPHAN/);
    assert.match(r.hookSpecificOutput.additionalContext, /awareness-augmentation/);
    assert.match(r.hookSpecificOutput.additionalContext, /system-viz graph health/);
  });

  it("non-sierra slot -> slot-gated no-op (no block even with warnings present)", () => {
    const r = run(
      { slots: { alpha: { chatId: "claude-deadbeef" } }, warnings: { at: recent(5), warnings: ["x"], embedsEdges: 0 } },
      "claude-deadbeef",
    );
    assert.equal(r.continue, true);
    assert.equal(r.hookSpecificOutput, undefined);
  });

  it("sierra slot but NO warnings sidecar -> health block present, no degradation line", () => {
    const r = run({ slots: sierraSlots }, "claude-deadbeef");
    assert.ok(r.hookSpecificOutput);
    assert.ok(!/embeds DEGRADED/.test(r.hookSpecificOutput.additionalContext));
    assert.match(r.hookSpecificOutput.additionalContext, /system-viz graph health/);
  });

  it("PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1 -> no block even for the sierra slot with warnings present", () => {
    const r = run(
      { slots: sierraSlots, warnings: { at: recent(5), warnings: ["x"], embedsEdges: 0 } },
      "claude-deadbeef",
      { PRISM_SIERRA_GRAPH_HEALTH_DISABLE: "1" },
    );
    assert.equal(r.continue, true);
    assert.equal(r.hookSpecificOutput, undefined);
  });
});
