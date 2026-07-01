// Tests for augmentation-freshness.mjs -- the system-viz merged-augmentation
// staleness classifier (reference_augmentation_staleness_graph_fresh_inputs_stale_2026_06_21).
// Real reference values + algebraic invariants + a live-data assertion against the
// actual merge-augmentations.mjs source. Injected now + stat -> deterministic.
//
// Run: node --test scripts/lib/augmentation-freshness.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseMergedAugmentations,
  classifyAugmentationFreshness,
  summarizeFreshness,
  shouldSkipStaleMerge,
  SLOW_CADENCE,
  FRESHNESS_DEFAULTS,
  MERGE_STALE_SKIP_DEFAULT_HR,
  freshnessThresholdsFromEnv,
  buildFreshnessReport,
  INTENTIONAL_NO_PRODUCER,
} from "./augmentation-freshness.mjs";
import { parseGeneratorArray } from "./viz-dual-registration-audit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const HR_MS = 3_600_000;
const NOW = 1_750_000_000_000; // fixed clock so every age is deterministic

// stat-impl factory: maps name -> age-in-hours (relative to NOW); unknown -> missing.
function statFromAges(ageByName) {
  return (full) => {
    const name = path.basename(full);
    if (!(name in ageByName)) return null;
    const ageHr = ageByName[name];
    if (ageHr == null) return { mtimeMs: NaN }; // adversarial: bad mtime
    return { mtimeMs: NOW - ageHr * HR_MS };
  };
}

test("parseMergedAugmentations extracts loadOptional/loadJson names, dedups, both quotes", () => {
  const src = `
    const a = loadOptional("awareness-augmentation.json");
    const b = loadJson('core-inventory-augmentation.json');
    const c = loadOptional(  "fs-inventory-augmentation.json" );  // spaced
    const dup = loadOptional("awareness-augmentation.json"); // duplicate -> once
    const notJson = loadOptional("ignored.txt"); // non-json -> skipped
  `;
  const got = parseMergedAugmentations(src);
  assert.deepEqual(got, [
    "awareness-augmentation.json",
    "core-inventory-augmentation.json",
    "fs-inventory-augmentation.json",
  ]);
});

test("parseMergedAugmentations: empty / non-string -> []", () => {
  assert.deepEqual(parseMergedAugmentations(""), []);
  assert.deepEqual(parseMergedAugmentations(null), []);
  assert.deepEqual(parseMergedAugmentations(undefined), []);
  assert.deepEqual(parseMergedAugmentations(42), []);
});

test("classify: fresh < 24h, stale-warn in [24,168), stale-orphan >= 168h (non-slow)", () => {
  const files = ["fresh.json", "warn.json", "orphan.json"];
  const stat = statFromAges({ "fresh.json": 1, "warn.json": 48, "orphan.json": 200 });
  const rows = classifyAugmentationFreshness(files, { now: NOW, statImpl: stat });
  const by = Object.fromEntries(rows.map((r) => [r.name, r.class]));
  assert.equal(by["fresh.json"], "fresh"); // 1h
  assert.equal(by["warn.json"], "stale-warn"); // 48h in [24,168)
  assert.equal(by["orphan.json"], "stale-orphan"); // 200h >= 168
});

test("classify: HEAVY/slow-cadence augmentations lag without alarming until slowHr(720h)", () => {
  const slow = "l11-leaves-augmentation.json"; // in SLOW_CADENCE
  const stat = statFromAges({ [slow]: 300 }); // 12.5d -- stale for non-slow, OK for slow
  const [row] = classifyAugmentationFreshness([slow], { now: NOW, statImpl: stat });
  assert.equal(row.slow, true);
  assert.equal(row.class, "stale-expected"); // 300h < 720h -> expected lag, NOT alarm
  // ... but a slow augmentation older than slowHr DOES alarm (producer truly dead).
  const stat2 = statFromAges({ [slow]: 800 });
  const [row2] = classifyAugmentationFreshness([slow], { now: NOW, statImpl: stat2 });
  assert.equal(row2.class, "stale-orphan"); // 800h >= 720h
});

test("classify: boundary values are exact (freshHr=24, staleHr=168)", () => {
  const stat = statFromAges({ "b24.json": 24, "b168.json": 168, "u24.json": 23.9 });
  const rows = classifyAugmentationFreshness(
    ["b24.json", "b168.json", "u24.json"],
    { now: NOW, statImpl: stat },
  );
  const by = Object.fromEntries(rows.map((r) => [r.name, r.class]));
  assert.equal(by["u24.json"], "fresh"); // 23.9 < 24
  assert.equal(by["b24.json"], "stale-warn"); // exactly 24 -> NOT fresh (>= freshHr)
  assert.equal(by["b168.json"], "stale-orphan"); // exactly 168 -> orphan (>= staleHr)
});

test("classify: missing file -> absent; NaN mtime -> absent; future mtime -> future", () => {
  const stat = statFromAges({ "bad.json": null, "future.json": -5 }); // null=>NaN mtime
  const rows = classifyAugmentationFreshness(
    ["gone.json", "bad.json", "future.json"],
    { now: NOW, statImpl: stat },
  );
  const by = Object.fromEntries(rows.map((r) => [r.name, r.class]));
  assert.equal(by["gone.json"], "absent"); // stat returns null
  assert.equal(by["bad.json"], "absent"); // NaN mtime -> treated as absent, not crash
  assert.equal(by["future.json"], "future"); // mtime ahead of now
});

test("classify: adversarial inputs -> no crash, sane output", () => {
  assert.deepEqual(classifyAugmentationFreshness([], { now: NOW }), []);
  assert.deepEqual(classifyAugmentationFreshness(null, { now: NOW }), []);
  assert.deepEqual(classifyAugmentationFreshness("notarray", { now: NOW }), []);
  // null/empty names within the array are skipped, not crashed on.
  const stat = statFromAges({ "ok.json": 1 });
  const rows = classifyAugmentationFreshness(
    [null, "", "ok.json", 42],
    { now: NOW, statImpl: stat },
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "ok.json");
});

test("summarizeFreshness: counts partition + alarm IFF a stale-orphan exists", () => {
  const rows = [
    { name: "a.json", class: "fresh" },
    { name: "b.json", class: "stale-warn" },
    { name: "c.json", class: "stale-expected" },
    { name: "d.json", class: "stale-orphan", ageHr: 200 },
    { name: "e.json", class: "stale-orphan", ageHr: 1000 },
    { name: "f.json", class: "absent" },
    { name: "g.json", class: "future" },
  ];
  const s = summarizeFreshness(rows);
  assert.equal(s.total, 7);
  assert.equal(s.fresh, 1);
  assert.equal(s.staleWarn, 1);
  assert.equal(s.staleExpected, 1);
  assert.equal(s.staleOrphan, 2);
  assert.equal(s.absent, 1);
  assert.equal(s.future, 1);
  // invariant: the named classes partition the row set (incl. staleManual so the guard stays
  // exhaustive against future class additions -- U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST)
  assert.equal(
    s.fresh + s.staleWarn + s.staleExpected + s.staleManual + s.staleOrphan + s.absent + s.future,
    s.total,
  );
  assert.equal(s.alarm, true);
  assert.deepEqual(s.orphanList, ["d.json (200h)", "e.json (1000h)"]); // sorted
});

test("summarizeFreshness: no orphans -> alarm false", () => {
  const s = summarizeFreshness([
    { name: "a.json", class: "fresh" },
    { name: "b.json", class: "stale-expected" },
  ]);
  assert.equal(s.alarm, false);
  assert.deepEqual(s.orphanList, []);
});

test("LIVE: real merge-augmentations.mjs folds the known stale orphans -> classified stale-orphan", () => {
  // The merge code is the contract for what lands in the live graph. The 2026-06-21
  // finding: awareness/core-inventory/fs-inventory/file-coverage-v2 are loadOptional'd
  // here yet have no producer. Prove the parser sees them AND, at a 43-day age, they
  // classify as stale-orphan (the actionable alarm).
  const mergeSrc = fs.readFileSync(
    path.join(ROOT, "scripts", "merge-augmentations.mjs"),
    "utf8",
  );
  const merged = parseMergedAugmentations(mergeSrc);
  const knownOrphans = [
    "awareness-augmentation.json",
    "core-inventory-augmentation.json",
    "fs-inventory-augmentation.json",
    "file-coverage-v2-augmentation.json",
  ];
  for (const o of knownOrphans) {
    assert.ok(merged.includes(o), `merge-augmentations should loadOptional ${o}`);
  }
  // 43 days = 1032h; all non-slow -> all stale-orphan.
  const ages = Object.fromEntries(knownOrphans.map((n) => [n, 1032]));
  const rows = classifyAugmentationFreshness(knownOrphans, {
    now: NOW,
    statImpl: statFromAges(ages),
  });
  assert.ok(rows.every((r) => r.class === "stale-orphan"), JSON.stringify(rows));
  assert.equal(summarizeFreshness(rows).staleOrphan, 4);
});

test("freshnessThresholdsFromEnv: defaults when unset; honors valid overrides; falls back on invalid", () => {
  // unset -> FRESHNESS_DEFAULTS (the shared single source for audit CLI + regen-viz postflight)
  assert.deepEqual(freshnessThresholdsFromEnv({}), {
    freshHr: FRESHNESS_DEFAULTS.freshHr,
    staleHr: FRESHNESS_DEFAULTS.staleHr,
    slowHr: FRESHNESS_DEFAULTS.slowHr,
  });
  // valid positive overrides honored
  assert.deepEqual(
    freshnessThresholdsFromEnv({ PRISM_AUG_FRESH_HR: "12", PRISM_AUG_STALE_HR: "200", PRISM_AUG_SLOW_HR: "1000" }),
    { freshHr: 12, staleHr: 200, slowHr: 1000 },
  );
  // invalid (zero / negative / non-numeric) -> default each independently (fail-safe)
  assert.deepEqual(
    freshnessThresholdsFromEnv({ PRISM_AUG_FRESH_HR: "0", PRISM_AUG_STALE_HR: "-5", PRISM_AUG_SLOW_HR: "abc" }),
    { freshHr: FRESHNESS_DEFAULTS.freshHr, staleHr: FRESHNESS_DEFAULTS.staleHr, slowHr: FRESHNESS_DEFAULTS.slowHr },
  );
});

test("buildFreshnessReport: canonical sidecar shape (at/vizDir/thresholds/summary/rows desc); shared by audit + postflight", () => {
  const stat = statFromAges({ "a.json": 1, "b.json": 200, "c.json": 50 });
  const rows = classifyAugmentationFreshness(["a.json", "b.json", "c.json"], { now: NOW, statImpl: stat });
  const r = buildFreshnessReport(rows, { now: NOW, vizDirRel: "x/y", thresholds: { freshHr: 24, staleHr: 168, slowHr: 720 } });
  assert.equal(r.at, new Date(NOW).toISOString());
  assert.equal(r.vizDir, "x/y");
  assert.deepEqual(r.thresholds, { freshHr: 24, staleHr: 168, slowHr: 720 });
  assert.equal(r.summary.total, 3);
  // rows sorted by ageHr DESC (oldest first) so the sidecar leads with the most-stale: b(200) > c(50) > a(1)
  assert.deepEqual(r.rows.map((x) => x.name), ["b.json", "c.json", "a.json"]);
  // defaults: no opts -> default vizDir + env-or-default thresholds (parity with the postflight call)
  const d = buildFreshnessReport(rows, {});
  assert.equal(d.vizDir, "state/shared/system-viz");
  assert.deepEqual(d.thresholds, freshnessThresholdsFromEnv());
  // adversarial: non-array rows -> [] (never crash -- the postflight wraps this in try/catch but the lib is safe anyway)
  assert.deepEqual(buildFreshnessReport(null, { now: NOW }).rows, []);
});

test("SLOW_CADENCE + FRESHNESS_DEFAULTS are the documented contract", () => {
  assert.ok(SLOW_CADENCE.has("fs-deep-inventory-augmentation.json"));
  assert.ok(SLOW_CADENCE.has("l11-leaves-augmentation.json"));
  assert.equal(FRESHNESS_DEFAULTS.freshHr, 24);
  assert.equal(FRESHNESS_DEFAULTS.staleHr, 168);
  assert.equal(FRESHNESS_DEFAULTS.slowHr, 720);
});

test("shouldSkipStaleMerge: DEFAULT-DISABLED -> never skips, even for ancient files", () => {
  const ancient = 100 * 24 * 3.6e6; // 100 days
  assert.equal(shouldSkipStaleMerge(ancient), false); // enabled defaults to false
  assert.equal(shouldSkipStaleMerge(ancient, {}), false);
  assert.equal(shouldSkipStaleMerge(ancient, { enabled: false, thresholdHr: 1 }), false);
});

test("shouldSkipStaleMerge: enabled -> skips IFF age >= thresholdHr (default 720h/30d)", () => {
  const HR = 3.6e6;
  // default threshold = 30d: a 44d orphan skips, a 12d HEAVY augmentation does NOT.
  assert.equal(shouldSkipStaleMerge(44 * 24 * HR, { enabled: true }), true);
  assert.equal(shouldSkipStaleMerge(12 * 24 * HR, { enabled: true }), false); // 288h < 720h
  // exact boundary -> skip (>=)
  assert.equal(shouldSkipStaleMerge(MERGE_STALE_SKIP_DEFAULT_HR * HR, { enabled: true }), true);
  assert.equal(shouldSkipStaleMerge((MERGE_STALE_SKIP_DEFAULT_HR - 0.001) * HR, { enabled: true }), false);
  // custom threshold honored
  assert.equal(shouldSkipStaleMerge(10 * HR, { enabled: true, thresholdHr: 8 }), true);
  assert.equal(shouldSkipStaleMerge(6 * HR, { enabled: true, thresholdHr: 8 }), false);
});

test("shouldSkipStaleMerge: fail-safe -> unknown/negative/non-finite age never skips; bad threshold -> default", () => {
  assert.equal(shouldSkipStaleMerge(NaN, { enabled: true }), false);
  assert.equal(shouldSkipStaleMerge(Infinity, { enabled: true }), false);
  assert.equal(shouldSkipStaleMerge(-5, { enabled: true }), false); // future mtime -> fold, never drop
  assert.equal(shouldSkipStaleMerge("old", { enabled: true }), false);
  // non-positive / non-finite threshold falls back to the 30d default (so a 44d file skips)
  assert.equal(shouldSkipStaleMerge(44 * 24 * 3.6e6, { enabled: true, thresholdHr: 0 }), true);
  assert.equal(shouldSkipStaleMerge(44 * 24 * 3.6e6, { enabled: true, thresholdHr: -1 }), true);
  assert.equal(shouldSkipStaleMerge(1 * 3.6e6, { enabled: true, thresholdHr: 0 }), false); // 1h, default 720h
});

test("DRIFT GUARD: SLOW_CADENCE stays aligned with regen-viz HEAVY[] (3-of-3 P2)", () => {
  // SLOW_CADENCE is a hand-maintained mirror of regen-viz HEAVY[] (the --full-only
  // generators whose augmentations legitimately lag). The 3-of-3 flagged that if HEAVY[]
  // grows without SLOW_CADENCE being reconciled, a new HEAVY augmentation silently
  // false-alarms as stale-orphan at 7d. This guard converts that silent drift into a LOUD
  // test failure -- the durable fix for the "hand-maintained parallel list" risk.
  const regen = fs.readFileSync(path.join(ROOT, "scripts", "regen-viz.mjs"), "utf8");
  // Use the dual-reg auditor's robust array parser (it strips line comments before matching).
  // A naive /const HEAVY = \[([\s\S]*?)\]/ regex is DEFEATED by a "FAST[]"/"HEAVY[]" token inside an
  // entry's // comment -- it stops at the first ] in the comment and silently truncates the array
  // (the exact failure this guard hit 2026-06-22 once a HEAVY entry's comment mentioned FAST[]).
  const heavyGens = parseGeneratorArray(regen, "HEAVY");
  assert.ok(heavyGens.length >= 1, "regen-viz HEAVY[] parsed empty");
  // explicit generator -> augmentation-output map (NOT a string transform:
  // generate-l11-file-leaves.mjs -> l11-LEAVES-augmentation.json, dropping "file-").
  const HEAVY_OUTPUT = {
    "generate-fs-deep-inventory.mjs": "fs-deep-inventory-augmentation.json",
    "generate-l11-file-leaves.mjs": "l11-leaves-augmentation.json",
    // + U-VIZ-AUG-STALE-REWIRE / U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22): 3 generators
    // moved into HEAVY[] (--full only) -- their outputs are now slow-cadence (must match SLOW_CADENCE).
    "h-drive-skipped-census.mjs": "h-drive-skipped-census.json",
    "augment-graph-with-awareness.mjs": "awareness-augmentation.json",
    "build-business-value-map.mjs": "business-value-map.json",
  };
  // (1) every HEAVY generator must have a known output mapping -- a NEW HEAVY entry fails here.
  for (const g of heavyGens) {
    assert.ok(
      HEAVY_OUTPUT[g],
      `regen-viz HEAVY[] gained ${g} with no mapping -- add its augmentation output to HEAVY_OUTPUT here AND to SLOW_CADENCE in augmentation-freshness.mjs`,
    );
  }
  // (2) SLOW_CADENCE must be EXACTLY the set of current HEAVY outputs (no more, no less).
  const expected = new Set(heavyGens.map((g) => HEAVY_OUTPUT[g]));
  assert.deepEqual([...SLOW_CADENCE].sort(), [...expected].sort());
});

// --- INTENTIONAL_NO_PRODUCER allowlist (U-VIZ-FRESHNESS-INTENTIONAL-ALLOWLIST, sierra 2026-06-22) ---
const INTL_HR_MS = 3_600_000;
const INTL_NOW = Date.UTC(2026, 5, 22); // fixed -> deterministic
const intlStatAge = (hr) => () => ({ mtimeMs: INTL_NOW - hr * INTL_HR_MS });

test("intentional aged augmentation -> stale-manual (not stale-orphan); real orphan still alarms", () => {
  const rows = classifyAugmentationFreshness(
    ["engine-spotlight.json", "some-real-orphan.json"],
    { now: INTL_NOW, statImpl: intlStatAge(1000) }, // 1000h > staleHr 168h
  );
  const spot = rows.find((r) => r.name === "engine-spotlight.json");
  const orphan = rows.find((r) => r.name === "some-real-orphan.json");
  assert.equal(spot.class, "stale-manual");
  assert.equal(spot.intentional, true);
  assert.equal(orphan.class, "stale-orphan"); // a real missing-producer orphan still alarms
  const sum = summarizeFreshness(rows);
  assert.equal(sum.staleManual, 1);
  assert.equal(sum.staleOrphan, 1); // ONLY the real orphan
  assert.equal(sum.alarm, true);
});

test("alarm is FALSE when only intentional files are aged (cry-wolf eliminated)", () => {
  const rows = classifyAugmentationFreshness(
    [...INTENTIONAL_NO_PRODUCER],
    { now: INTL_NOW, statImpl: intlStatAge(1100) },
  );
  const sum = summarizeFreshness(rows);
  assert.equal(sum.staleManual, INTENTIONAL_NO_PRODUCER.size);
  assert.equal(sum.staleOrphan, 0);
  assert.equal(sum.alarm, false);
});

test("a FRESH intentional file stays fresh (allowlist does not force stale-manual)", () => {
  const rows = classifyAugmentationFreshness(
    ["engine-spotlight.json"],
    { now: INTL_NOW, statImpl: intlStatAge(1) }, // 1h < freshHr 24h
  );
  assert.equal(rows[0].class, "fresh");
  assert.equal(rows[0].intentional, true);
});

test("intentional check precedes slow-cadence (an allowlisted slow file is still stale-manual)", () => {
  // Adversarial: a name in BOTH sets -> intentional wins (checked first), never stale-orphan.
  const rows = classifyAugmentationFreshness(
    ["engine-spotlight.json"],
    { now: INTL_NOW, statImpl: intlStatAge(2000), slowCadence: new Set(["engine-spotlight.json"]) },
  );
  assert.equal(rows[0].class, "stale-manual");
});

test("the 2 known intentional augmentations are in the allowlist", () => {
  assert.ok(INTENTIONAL_NO_PRODUCER.has("engine-spotlight.json"));
  assert.ok(INTENTIONAL_NO_PRODUCER.has("h-drive-exhaustive-audit.json"));
});
