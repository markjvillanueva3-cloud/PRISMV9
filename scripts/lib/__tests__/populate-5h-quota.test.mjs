/**
 * populate-5h-quota.test.mjs -- Unit tests for the 5h quota populator.
 *
 * Tests pure functions exhaustively (no I/O), plus orchestration with injectable
 * _fs and _records. Pattern: node:test + node:assert/strict, describe/it,
 * real reference values (R9 -- no toBeDefined stubs).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  DEFAULT_FIVE_HOUR_CEILING,
  WINDOW_MS,
  SOURCE_TAG,
  ceilingFromEnv,
  computeRollingSum,
  computePct,
  mergeFiveHourIntoSidecar,
  enumerateJsonlFiles,
  loadRecentRecords,
  readSidecar,
  atomicWriteSidecar,
  resolveProjectsDir,
  resolveSidecarDir,
  populateFiveHourQuota,
} from "../../populate-5h-quota.mjs";

// ---- helpers -----------------------------------------------------------------

/** Build a minimal assistant record at nowMs - offsetMs. */
function rec(nowMs, offsetMs, usage = {}) {
  return {
    type: "assistant",
    timestamp: new Date(nowMs - offsetMs).toISOString(),
    message: {
      usage: {
        input_tokens: usage.input ?? 100,
        output_tokens: usage.output ?? 200,
        cache_read_input_tokens: usage.cacheRead ?? 0,
        cache_creation_input_tokens: usage.cacheCreate ?? 0,
      },
    },
  };
}

/** Build a stub _fs with named files and their contents. */
function stubFs(files = {}, statMtimes = {}) {
  // files: { "/abs/path/file.jsonl": "content...\n..." }
  // statMtimes: { "/abs/path/file.jsonl": mtimeMs }  -- defaults to Date.now()
  const now = Date.now();
  return {
    readFileSync(p, _enc) {
      if (p in files) return files[p];
      const err = new Error(`ENOENT: ${p}`);
      err.code = "ENOENT";
      throw err;
    },
    writeFileSync(p, data) {
      files[p] = data;
    },
    renameSync(src, dst) {
      if (!(src in files)) {
        const err = new Error(`ENOENT: ${src}`);
        err.code = "ENOENT";
        throw err;
      }
      files[dst] = files[src];
      delete files[src];
    },
    mkdirSync() {},
    readdirSync(dir, opts) {
      const prefix = dir.endsWith(path.sep) ? dir : dir + path.sep;
      const seen = new Set();
      const entries = [];
      for (const p of Object.keys(files)) {
        if (!p.startsWith(prefix)) continue;
        const rest = p.slice(prefix.length);
        const seg = rest.split(path.sep)[0];
        if (!seg || seen.has(seg)) continue;
        seen.add(seg);
        // A segment is a directory if any file has it as a path component
        // (i.e. there's a deeper path under it).
        const isDir = Object.keys(files).some(
          (f) => f.startsWith(prefix + seg + path.sep)
        );
        if (opts?.withFileTypes) {
          entries.push({ name: seg, isDirectory: () => isDir });
        } else {
          entries.push(seg);
        }
      }
      return entries;
    },
    statSync(p) {
      if (p in files || p in statMtimes) {
        return { mtimeMs: statMtimes[p] ?? now };
      }
      const err = new Error(`ENOENT: ${p}`);
      err.code = "ENOENT";
      throw err;
    },
    existsSync(p) {
      return p in files;
    },
  };
}

// ---- ceilingFromEnv ----------------------------------------------------------

describe("ceilingFromEnv", () => {
  it("returns DEFAULT_FIVE_HOUR_CEILING when env is empty", () => {
    assert.equal(ceilingFromEnv({}), DEFAULT_FIVE_HOUR_CEILING);
  });

  it("returns DEFAULT_FIVE_HOUR_CEILING when env is undefined", () => {
    assert.equal(ceilingFromEnv(undefined), DEFAULT_FIVE_HOUR_CEILING);
  });

  it("parses a valid positive integer override", () => {
    assert.equal(ceilingFromEnv({ PRISM_FIVE_HOUR_TOKEN_CEILING: "50000000" }), 50_000_000);
  });

  it("ignores zero (uses default)", () => {
    assert.equal(ceilingFromEnv({ PRISM_FIVE_HOUR_TOKEN_CEILING: "0" }), DEFAULT_FIVE_HOUR_CEILING);
  });

  it("ignores negative (uses default)", () => {
    assert.equal(ceilingFromEnv({ PRISM_FIVE_HOUR_TOKEN_CEILING: "-1" }), DEFAULT_FIVE_HOUR_CEILING);
  });

  it("ignores non-numeric string (uses default)", () => {
    assert.equal(ceilingFromEnv({ PRISM_FIVE_HOUR_TOKEN_CEILING: "banana" }), DEFAULT_FIVE_HOUR_CEILING);
  });

  it("DEFAULT_FIVE_HOUR_CEILING is a positive integer above 10M (sanity check)", () => {
    assert.ok(DEFAULT_FIVE_HOUR_CEILING > 10_000_000);
    assert.equal(DEFAULT_FIVE_HOUR_CEILING % 1, 0);
  });
});

// ---- computeRollingSum -------------------------------------------------------

describe("computeRollingSum", () => {
  const NOW = 1_700_000_000_000; // fixed clock for all tests

  it("happy path: sums input+output+cache for records in window", () => {
    const records = [
      rec(NOW, 1000, { input: 100, output: 200, cacheRead: 300, cacheCreate: 400 }),
      rec(NOW, 2000, { input: 50,  output: 150, cacheRead: 0,   cacheCreate: 0   }),
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.input,       150);
    assert.equal(s.output,      350);
    assert.equal(s.cacheRead,   300);
    assert.equal(s.cacheCreate, 400);
    assert.equal(s.total,       1200);
    assert.equal(s.counted,     2);
  });

  it("excludes records older than the window", () => {
    const records = [
      rec(NOW, WINDOW_MS + 1, { input: 9999, output: 9999 }), // outside -- excluded
      rec(NOW, WINDOW_MS - 1, { input: 100,  output: 200  }), // inside -- included
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 1);
    assert.equal(s.input,   100);
    assert.equal(s.total,   300);
  });

  it("includes record exactly on the boundary (ts === cutoff)", () => {
    const records = [rec(NOW, WINDOW_MS, { input: 55, output: 45 })]; // ts === cutoff
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 1);
    assert.equal(s.total,   100);
  });

  it("skips non-assistant records", () => {
    const records = [
      { type: "user",   timestamp: new Date(NOW - 1000).toISOString(), message: { usage: { input_tokens: 999 } } },
      { type: "system", timestamp: new Date(NOW - 1000).toISOString(), message: { usage: { input_tokens: 999 } } },
      rec(NOW, 1000, { input: 1, output: 1 }),
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 1);
    assert.equal(s.total,   2);
  });

  it("skips records with missing/null usage", () => {
    const records = [
      { type: "assistant", timestamp: new Date(NOW - 1000).toISOString(), message: null },
      { type: "assistant", timestamp: new Date(NOW - 1000).toISOString(), message: {} },
      { type: "assistant", timestamp: new Date(NOW - 1000).toISOString() },
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 0);
    assert.equal(s.total,   0);
  });

  it("skips records with all-zero usage (corrupt sentinel)", () => {
    const records = [
      rec(NOW, 1000, { input: 0, output: 0, cacheRead: 0, cacheCreate: 0 }),
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 0);
    assert.equal(s.total,   0);
  });

  it("skips records with invalid timestamp", () => {
    const records = [
      { type: "assistant", timestamp: "not-a-date", message: { usage: { input_tokens: 500, output_tokens: 500 } } },
      { type: "assistant", timestamp: null,         message: { usage: { input_tokens: 500, output_tokens: 500 } } },
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 0);
  });

  it("handles empty records array", () => {
    const s = computeRollingSum([], NOW, WINDOW_MS);
    assert.equal(s.total,   0);
    assert.equal(s.counted, 0);
  });

  it("handles non-numeric usage fields gracefully (coerces to 0)", () => {
    const records = [{
      type: "assistant",
      timestamp: new Date(NOW - 1000).toISOString(),
      message: { usage: { input_tokens: "abc", output_tokens: null, cache_read_input_tokens: undefined } },
    }];
    // "abc" -> NaN -> || 0, null -> 0, undefined -> 0. All zero -> skipped.
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.counted, 0);
  });

  it("adversarial: large numbers do not overflow Number", () => {
    // 2 records each with 40M tokens across all fields = 160M total
    const records = [
      rec(NOW, 1000, { input: 40_000_000, output: 0, cacheRead: 0, cacheCreate: 0 }),
      rec(NOW, 2000, { input: 40_000_000, output: 0, cacheRead: 0, cacheCreate: 0 }),
    ];
    const s = computeRollingSum(records, NOW, WINDOW_MS);
    assert.equal(s.total,   80_000_000);
    assert.ok(Number.isFinite(s.total));
  });
});

// ---- computePct --------------------------------------------------------------

describe("computePct", () => {
  it("returns correct fraction", () => {
    assert.equal(computePct(44_000_000, 88_000_000), 0.5);
  });

  it("clamps at 1.0 when total exceeds ceiling", () => {
    assert.equal(computePct(100_000_000, 88_000_000), 1.0);
  });

  it("returns 0 for total=0", () => {
    assert.equal(computePct(0, 88_000_000), 0);
  });

  it("returns null for ceiling=0", () => {
    assert.equal(computePct(1000, 0), null);
  });

  it("returns null for ceiling negative", () => {
    assert.equal(computePct(1000, -1), null);
  });

  it("returns null when total is not finite", () => {
    assert.equal(computePct(Infinity, 88_000_000), null);
    assert.equal(computePct(NaN, 88_000_000), null);
  });

  it("result is always in [0, 1] for finite inputs", () => {
    const pct = computePct(7_000_000, 88_000_000);
    assert.ok(pct !== null && pct >= 0 && pct <= 1);
  });

  it("adversarial: no floating-point > 1 from near-ceiling values", () => {
    const pct = computePct(88_000_000 - 1, 88_000_000);
    assert.ok(pct !== null && pct <= 1.0);
  });
});

// ---- mergeFiveHourIntoSidecar ------------------------------------------------

describe("mergeFiveHourIntoSidecar", () => {
  const READING = { pct: 0.42, resetsAt: null, computedAt: "2026-01-01T00:00:00.000Z" };

  it("patches fiveHour when quota exists as an object", () => {
    const existing = {
      ctx: { tokens: 500_000 },
      quota: {
        fiveHour: { pct: null, resetsAt: null },
        sevenDay: { pct: 0.2, resetsAt: "x" },
      },
    };
    const result = mergeFiveHourIntoSidecar(existing, READING);
    // fiveHour patched
    assert.equal(result.quota.fiveHour.pct, 0.42);
    assert.equal(result.quota.fiveHour.source, SOURCE_TAG);
    assert.equal(result.quota.fiveHour.computedAt, "2026-01-01T00:00:00.000Z");
    // sevenDay preserved exactly
    assert.deepEqual(result.quota.sevenDay, { pct: 0.2, resetsAt: "x" });
    // ctx preserved
    assert.deepEqual(result.ctx, { tokens: 500_000 });
    // original not mutated
    assert.equal(existing.quota.fiveHour.pct, null);
  });

  it("creates quota envelope when quota is null", () => {
    const existing = { ctx: { tokens: 100 }, quota: null };
    const result = mergeFiveHourIntoSidecar(existing, READING);
    assert.equal(result.quota.fiveHour.pct, 0.42);
    assert.deepEqual(result.quota.sevenDay, { pct: null, resetsAt: null });
  });

  it("creates quota envelope when existing is null (no sidecar yet)", () => {
    const result = mergeFiveHourIntoSidecar(null, READING);
    assert.equal(result.quota.fiveHour.pct, 0.42);
    assert.equal(result.quota.sevenDay.pct, null);
  });

  it("preserves all sibling fields (zone, cumulative, offload, etc.)", () => {
    const existing = {
      quota: { fiveHour: { pct: null }, sevenDay: { pct: null } },
      zone: "GREEN",
      cumulative: { inputTokens: 9_000_000 },
      offload: { offloaded: 5 },
      slot: "alpha",
    };
    const result = mergeFiveHourIntoSidecar(existing, READING);
    assert.equal(result.zone, "GREEN");
    assert.deepEqual(result.cumulative, { inputTokens: 9_000_000 });
    assert.deepEqual(result.offload, { offloaded: 5 });
    assert.equal(result.slot, "alpha");
  });

  it("sets pct to null when reading.pct is null", () => {
    const existing = { quota: { fiveHour: { pct: 0.9 }, sevenDay: { pct: null } } };
    const result = mergeFiveHourIntoSidecar(existing, { pct: null, resetsAt: null, computedAt: null });
    assert.equal(result.quota.fiveHour.pct, null);
  });
});

// ---- enumerateJsonlFiles -----------------------------------------------------

describe("enumerateJsonlFiles", () => {
  it("returns .jsonl paths from subdirectories", () => {
    const sep = path.sep;
    const root = `C:${sep}fake${sep}projects`;
    const _fs = stubFs({
      [`${root}${sep}proj-a${sep}foo.jsonl`]: "data",
      [`${root}${sep}proj-a${sep}bar.jsonl`]: "data",
      [`${root}${sep}proj-b${sep}baz.jsonl`]: "data",
      [`${root}${sep}proj-b${sep}readme.txt`]: "data",
    });
    const result = enumerateJsonlFiles(root, _fs);
    assert.equal(result.length, 3);
    assert.ok(result.every((p) => p.endsWith(".jsonl")));
  });

  it("returns empty array when root is unreadable", () => {
    const _fs = stubFs({}); // no files -- readdirSync will throw ENOENT
    const result = enumerateJsonlFiles("/does/not/exist", _fs);
    assert.deepEqual(result, []);
  });

  it("skips unreadable subdirectories (fail-soft)", () => {
    // Only inject the outer readdirSync; inner throws
    const _fs = {
      readdirSync(dir, opts) {
        if (dir.includes("projects")) {
          return opts?.withFileTypes
            ? [{ name: "proj", isDirectory: () => true }]
            : ["proj"];
        }
        throw new Error("EACCES");
      },
    };
    const result = enumerateJsonlFiles("/root/projects", _fs);
    assert.deepEqual(result, []);
  });
});

// ---- loadRecentRecords -------------------------------------------------------

describe("loadRecentRecords", () => {
  const NOW = 1_700_000_000_000;

  it("loads records from files modified within the window", () => {
    const fp = "/p/a.jsonl";
    const line = JSON.stringify(rec(NOW, 1000, { input: 10, output: 20 }));
    const _fs = stubFs({ [fp]: line + "\n" }, { [fp]: NOW - 100 });
    const records = loadRecentRecords([fp], NOW, WINDOW_MS, _fs);
    assert.equal(records.length, 1);
    assert.equal(records[0].type, "assistant");
  });

  it("skips files with mtime before window (pre-filter)", () => {
    const fp = "/p/old.jsonl";
    const line = JSON.stringify(rec(NOW, 1000, { input: 10, output: 20 }));
    // mtime is 6h ago -- outside 5h window
    const _fs = stubFs({ [fp]: line }, { [fp]: NOW - (6 * 60 * 60 * 1000) });
    const records = loadRecentRecords([fp], NOW, WINDOW_MS, _fs);
    assert.deepEqual(records, []);
  });

  it("skips malformed JSONL lines without throwing", () => {
    const fp = "/p/b.jsonl";
    const content = "not-json\n" + JSON.stringify(rec(NOW, 500, { input: 5, output: 5 })) + "\nstill-bad";
    const _fs = stubFs({ [fp]: content }, { [fp]: NOW - 100 });
    const records = loadRecentRecords([fp], NOW, WINDOW_MS, _fs);
    assert.equal(records.length, 1); // only the valid middle line
  });

  it("returns empty array when file list is empty", () => {
    const records = loadRecentRecords([], NOW, WINDOW_MS);
    assert.deepEqual(records, []);
  });

  it("skips unreadable files (fail-soft)", () => {
    const fp = "/p/unreadable.jsonl";
    const _fs = stubFs({}, { [fp]: NOW - 100 }); // stat ok but read throws ENOENT
    const records = loadRecentRecords([fp], NOW, WINDOW_MS, _fs);
    assert.deepEqual(records, []);
  });
});

// ---- readSidecar + atomicWriteSidecar ----------------------------------------

describe("readSidecar", () => {
  it("returns parsed object for valid JSON file", () => {
    const fp = "/s/token-budget-alpha.json";
    const doc = { quota: null, slot: "alpha" };
    const _fs = stubFs({ [fp]: JSON.stringify(doc) });
    assert.deepEqual(readSidecar(fp, _fs), doc);
  });

  it("returns null for missing file", () => {
    const _fs = stubFs({});
    assert.equal(readSidecar("/s/missing.json", _fs), null);
  });

  it("returns null for malformed JSON", () => {
    const fp = "/s/bad.json";
    const _fs = stubFs({ [fp]: "{{not json" });
    assert.equal(readSidecar(fp, _fs), null);
  });
});

describe("atomicWriteSidecar", () => {
  it("writes doc to the target path via tmp rename", () => {
    const files = {};
    const fp = "/s/token-budget-alpha.json";
    const _fs = stubFs(files);
    const doc = { quota: { fiveHour: { pct: 0.5 } } };
    atomicWriteSidecar(fp, doc, _fs);
    assert.ok(fp in files, "target file should exist after write");
    const written = JSON.parse(files[fp]);
    assert.equal(written.quota.fiveHour.pct, 0.5);
  });

  it("leaves no .tmp file after successful write", () => {
    const files = {};
    const fp = "/s/token-budget-alpha.json";
    const _fs = stubFs(files);
    atomicWriteSidecar(fp, { x: 1 }, _fs);
    const tmps = Object.keys(files).filter((k) => k.endsWith(".tmp"));
    assert.deepEqual(tmps, []);
  });
});

// ---- populateFiveHourQuota (orchestration) -----------------------------------

describe("populateFiveHourQuota", () => {
  const NOW = 1_700_000_000_000;

  /** Build a minimal existing sidecar content string. */
  function sidecarContent(slot, extraFields = {}) {
    return JSON.stringify({
      quota: null,
      ctx: { tokens: 100_000 },
      zone: "GREEN",
      slot,
      ...extraFields,
    });
  }

  /**
   * Build a stub file map keyed by path.join(dir, filename) so that
   * path.join inside populateFiveHourQuota produces the same key that
   * _fs.readdirSync+readFileSync will look up.
   */
  function sidecarFiles(dir, slotContents) {
    const files = {};
    for (const [slot, content] of Object.entries(slotContents)) {
      files[path.join(dir, `token-budget-${slot}.json`)] = content;
    }
    return files;
  }

  it("happy path: writes correct pct into all discovered sidecars", async () => {
    const ceiling = 88_000_000;
    // 4 records, each 1M input + 1M output = 2M each = 8M total
    const records = [
      rec(NOW, 1000, { input: 1_000_000, output: 1_000_000 }),
      rec(NOW, 2000, { input: 1_000_000, output: 1_000_000 }),
      rec(NOW, 3000, { input: 1_000_000, output: 1_000_000 }),
      rec(NOW, 4000, { input: 1_000_000, output: 1_000_000 }),
    ];

    const sidecarDir = path.join("H:", "prism", "state", "shared");
    const files = sidecarFiles(sidecarDir, {
      alpha: sidecarContent("alpha"),
      bravo: sidecarContent("bravo"),
    });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: records,
      _fs,
      sidecarDir,
      ceiling,
      nowMs: NOW,
    });

    assert.equal(result.ok, true);
    // 8M / 88M = 0.0909...
    assert.ok(result.pct !== null && result.pct > 0 && result.pct < 0.2);
    assert.equal(result.slotsWritten, 2);
    assert.equal(result.slotsSkipped, 0);
    assert.equal(result.counted, 4);

    // Verify the sidecar was actually updated
    const updatedKey = path.join(sidecarDir, "token-budget-alpha.json");
    const updated = JSON.parse(files[updatedKey]);
    assert.ok(updated.quota !== null);
    assert.equal(updated.quota.fiveHour.pct, result.pct);
    assert.equal(updated.quota.fiveHour.source, SOURCE_TAG);
    // Other fields preserved
    assert.equal(updated.zone, "GREEN");
  });

  it("dry-run does not write files but reports correct counts", async () => {
    const sidecarDir = path.join("H:", "prism", "state", "shared");
    const origContent = sidecarContent("alpha");
    const origKey = path.join(sidecarDir, "token-budget-alpha.json");
    const files = sidecarFiles(sidecarDir, { alpha: origContent });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: [rec(NOW, 1000, { input: 1_000_000, output: 500_000 })],
      _fs,
      sidecarDir,
      dryRun: true,
      nowMs: NOW,
    });

    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.slotsWritten, 1); // "would have written"
    // File unchanged
    assert.equal(files[origKey], origContent);
  });

  it("skips missing sidecars (fail-soft) -- never creates new sidecar files", async () => {
    const sidecarDir = path.join("H:", "s");
    const _fs = stubFs({}); // no sidecars exist

    const result = await populateFiveHourQuota({
      _records: [rec(NOW, 500, { input: 100, output: 100 })],
      _fs,
      sidecarDir,
      slots: ["alpha", "bravo"],
      nowMs: NOW,
    });

    assert.equal(result.ok, true);
    assert.equal(result.slotsWritten, 0);
    assert.equal(result.slotsSkipped, 2);
  });

  it("returns pct=0 when all records are older than the 5h window", async () => {
    const records = [
      rec(NOW, WINDOW_MS + 10_000, { input: 999_999, output: 999_999 }), // outside
    ];
    const sidecarDir = path.join("H:", "s");
    const files = sidecarFiles(sidecarDir, { alpha: sidecarContent("alpha") });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: records,
      _fs,
      sidecarDir,
      nowMs: NOW,
    });

    assert.equal(result.ok, true);
    assert.equal(result.total, 0);
    assert.equal(result.counted, 0);
    assert.equal(result.pct, 0); // 0/ceiling = 0
  });

  it("returns pct=0 for empty records", async () => {
    const sidecarDir = path.join("H:", "s");
    const files = sidecarFiles(sidecarDir, { alpha: sidecarContent("alpha") });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: [],
      _fs,
      sidecarDir,
      nowMs: NOW,
    });

    assert.equal(result.pct, 0);
    assert.equal(result.counted, 0);
  });

  it("ceiling override via opts.ceiling is respected", async () => {
    const ceiling = 1_000_000; // very small ceiling
    const sidecarDir = path.join("H:", "s");
    const files = sidecarFiles(sidecarDir, { alpha: sidecarContent("alpha") });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: [rec(NOW, 500, { input: 900_000, output: 50_000 })],
      _fs,
      sidecarDir,
      ceiling,
      nowMs: NOW,
    });

    // 950k / 1M = 0.95
    assert.ok(result.pct !== null && result.pct >= 0.9 && result.pct <= 1.0);
    assert.equal(result.ceiling, ceiling);
  });

  it("adversarial: records at the exact boundary edge are included", async () => {
    const records = [rec(NOW, WINDOW_MS, { input: 1_000_000, output: 0 })]; // exactly at cutoff
    const sidecarDir = path.join("H:", "s");
    const files = sidecarFiles(sidecarDir, { alpha: sidecarContent("alpha") });
    const _fs = stubFs(files);

    const result = await populateFiveHourQuota({
      _records: records,
      _fs,
      sidecarDir,
      nowMs: NOW,
    });

    assert.equal(result.counted, 1);
    assert.ok(result.pct !== null && result.pct > 0);
  });

  it("source field is set to SOURCE_TAG in return value", async () => {
    const sidecarDir = path.join("H:", "s");
    const result = await populateFiveHourQuota({
      _records: [],
      _fs: stubFs(sidecarFiles(sidecarDir, { alpha: sidecarContent("alpha") })),
      sidecarDir,
      nowMs: NOW,
    });
    assert.equal(result.source, SOURCE_TAG);
  });
});

// ---- resolveProjectsDir / resolveSidecarDir ----------------------------------

describe("resolveProjectsDir", () => {
  it("returns explicit projectsDir if provided", () => {
    assert.equal(resolveProjectsDir({ projectsDir: "/my/dir" }), "/my/dir");
  });

  it("reads from opts.env override", () => {
    assert.equal(
      resolveProjectsDir({ env: { PRISM_FIVE_HOUR_PROJECTS_DIR: "/env/dir" } }),
      "/env/dir"
    );
  });
});

describe("resolveSidecarDir", () => {
  it("returns explicit sidecarDir if provided", () => {
    assert.equal(resolveSidecarDir({ sidecarDir: "/my/sidecars" }), "/my/sidecars");
  });

  it("uses prismRoot to build default path", () => {
    const result = resolveSidecarDir({ prismRoot: "/my/prism" });
    assert.equal(result, path.join("/my/prism", "state", "shared"));
  });
});
