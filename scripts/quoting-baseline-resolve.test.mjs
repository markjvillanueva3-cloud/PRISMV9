#!/usr/bin/env node
/**
 * quoting-baseline-resolve.test.mjs — unit tests for the guard-aware baseline
 * resolver (U-QP-BASELINE-FALLBACK, slot:charlie 2026-06-02).
 *
 * The resolver is fully fs-injected, so these tests never touch disk: `exists` and
 * `readFile` are fakes backed by an in-memory file table, and `validate` is a fake
 * guard that refuses paths flagged poisoned. The oracle that pins the BUG DELTA is
 * "configured refused + real fallback admitted → fallbackUsed:true, path=fallback":
 * that is exactly the dead-loop → alive-loop transition. Reverting the resolver to
 * "configured-only" flips that case to ok:false and fails here.
 *
 * Run: node --test scripts/quoting-baseline-resolve.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FALLBACK_CORPORA,
  normalizePath,
  buildCandidateList,
  resolveTrainableBaseline,
} from "./lib/quoting-baseline-resolve.mjs";

const STUB = "state/shared/quoting/baseline-records.json";
const REAL = "state/shared/quoting/baseline-records-corpus-with-real.json";
const BASE = "state/shared/quoting/baseline-records-corpus.json";

/** Build injectable fs fakes from an in-memory { relPath: records[] | "POISON" | undefined } table. */
function fakeFs(table) {
  // keys are stored normalized + resolved-suffix-insensitive: we match on suffix.
  const find = (abs) => {
    const n = normalizePath(abs);
    for (const key of Object.keys(table)) {
      if (n.endsWith(normalizePath(key))) return key;
    }
    return null;
  };
  const exists = (abs) => {
    const k = find(abs);
    return k != null && table[k] !== undefined;
  };
  const readFile = async (abs) => {
    const k = find(abs);
    if (k == null || table[k] === undefined) throw new Error("ENOENT");
    if (table[k] === "BADJSON") return "{ not json";
    return JSON.stringify({ records: table[k] === "POISON" ? POISON_RECS : table[k] });
  };
  return { exists, readFile };
}

const POISON_RECS = Array.from({ length: 100 }, () => ({ customer: "Okuma_Multus_B250II", actual_revenue_usd: 10 }));
const REAL_RECS = Array.from({ length: 5 }, (_, i) => ({ customer: `CUST_${i}`, actual_revenue_usd: 100 + i }));

/** Fake guard: refuses any record set whose first record customer looks like a machine model. */
function fakeValidate(records) {
  const poisoned = records.length > 0 && /_[A-Z]\d|Okuma_/.test(String(records[0]?.customer ?? ""));
  return poisoned
    ? { refuse: true, reasons: ["machine_name_customers"], warnings: [] }
    : { refuse: false, reasons: [], warnings: [] };
}

// ── normalizePath ──────────────────────────────────────────────────────────
test("normalizePath converts backslashes and guards non-strings", () => {
  assert.equal(normalizePath("a\\b\\c"), "a/b/c");
  assert.equal(normalizePath("a/b"), "a/b");
  assert.equal(normalizePath(null), "");
  assert.equal(normalizePath(undefined), "");
  assert.equal(normalizePath(42), "");
});

// ── buildCandidateList ─────────────────────────────────────────────────────
test("buildCandidateList puts configured first then fallbacks", () => {
  const list = buildCandidateList(STUB, { fallbacks: [REAL, BASE] });
  assert.deepEqual(list, [STUB, REAL, BASE]);
});

test("buildCandidateList dedups a configured path already in fallbacks", () => {
  const list = buildCandidateList(REAL, { fallbacks: [REAL, BASE] });
  assert.deepEqual(list, [REAL, BASE]);
});

test("buildCandidateList with empty fallbacks yields configured only (strict)", () => {
  const list = buildCandidateList(STUB, { fallbacks: [] });
  assert.deepEqual(list, [STUB]);
});

test("buildCandidateList default fallbacks are the canonical corpora", () => {
  const list = buildCandidateList(STUB);
  assert.deepEqual(list, [STUB, ...FALLBACK_CORPORA]);
});

// ── resolveTrainableBaseline ───────────────────────────────────────────────
test("configured admitted → uses it, no fallback", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: REAL_RECS, [REAL]: REAL_RECS });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, true);
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.path, STUB);
  assert.equal(r.records.length, 5);
});

test("BUG DELTA: configured POISONED + real fallback admitted → fallbackUsed, path=real", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: "POISON", [REAL]: REAL_RECS });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, true, "loop must stay ALIVE on the real corpus");
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.path, REAL);
  assert.equal(r.records.length, 5);
  assert.deepEqual(r.configuredReasons, ["machine_name_customers"]);
  assert.equal(r.configuredRefused, true, "genuine guard-refusal must read configuredRefused:true on the ok:true path");
  // provenance: stub tried+refused, real tried+admitted
  const stubTry = r.tried.find((t) => t.path === STUB);
  const realTry = r.tried.find((t) => t.path === REAL);
  assert.equal(stubTry.admitted, false);
  assert.equal(realTry.admitted, true);
});

test("configured MISSING + fallback admitted → fallbackUsed", async () => {
  const { exists, readFile } = fakeFs({ [REAL]: REAL_RECS }); // STUB absent
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, true);
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.path, REAL);
  assert.equal(r.configuredRefused, false, "a MISSING configured file was not refused by the guard — must not lie as refused");
  assert.deepEqual(r.configuredReasons, []);
});

test("configured 0-records + fallback admitted → fallbackUsed", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: [], [REAL]: REAL_RECS });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, true);
  assert.equal(r.fallbackUsed, true);
  assert.equal(r.path, REAL);
  assert.equal(r.configuredRefused, false, "a 0-record configured file was not guard-refused");
});

test("configured BADJSON + fallback admitted → fallbackUsed", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: "BADJSON", [REAL]: REAL_RECS });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, true);
  assert.equal(r.fallbackUsed, true);
});

test("nothing admitted → ok:false, returns CONFIGURED records+guard (force-degenerate path preserved)", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: "POISON", [REAL]: "POISON" });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [REAL] });
  assert.equal(r.ok, false);
  assert.equal(r.fallbackUsed, false);
  assert.equal(r.path, STUB);
  assert.equal(r.records.length, 100, "must hand back the configured records so --force-degenerate can train");
  assert.equal(r.configuredRefused, true);
  assert.equal(r.tried.length, 2);
});

test("strict mode (fallbacks:[]) + configured refused → ok:false, no fallback attempted", async () => {
  const { exists, readFile } = fakeFs({ [STUB]: "POISON", [REAL]: REAL_RECS });
  const r = await resolveTrainableBaseline({ configuredPath: STUB, validate: fakeValidate, exists, readFile, fallbacks: [] });
  assert.equal(r.ok, false);
  assert.equal(r.tried.length, 1, "strict mode must not even look at the corpora");
});

test("throws on bad inputs", async () => {
  await assert.rejects(() => resolveTrainableBaseline({ configuredPath: STUB }), /validate must be a function/);
  await assert.rejects(() => resolveTrainableBaseline({ validate: fakeValidate }), /configuredPath must be a non-empty string/);
});
