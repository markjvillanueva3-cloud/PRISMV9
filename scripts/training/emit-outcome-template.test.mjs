/**
 * Tests for emit-outcome-template.mjs — outcome ledger emitter.
 *
 * Verifies the validator catches every schema violation, append writes
 * valid JSONL, and the batch path is atomic per fsync.
 *
 * slot:india /goal-fleet-coord iter11
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  validateOutcomeRecord,
  appendOutcome,
  appendBatch,
} from "./emit-outcome-template.mjs";

// ============================================================================
// validateOutcomeRecord
// ============================================================================

describe("validateOutcomeRecord", () => {
  const valid = {
    observed_at: "2026-05-25T22:00:00Z",
    category: "lathe",
    domain: "time",
    estimated: 10,
    actual: 12,
    unit: "min",
  };

  it("returns the record unchanged on valid input", () => {
    const r = validateOutcomeRecord({ ...valid });
    assert.equal(r.category, "lathe");
    assert.equal(r.actual, 12);
  });

  it("throws when record is null/non-object", () => {
    assert.throws(() => validateOutcomeRecord(null), /record must be an object/);
    assert.throws(() => validateOutcomeRecord("not an object"), /record must be an object/);
  });

  it("throws when observed_at is missing or empty", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, observed_at: "" }), /observed_at required/);
    assert.throws(() => validateOutcomeRecord({ ...valid, observed_at: undefined }), /observed_at required/);
  });

  it("throws when category is not in the canonical set", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, category: "robot" }), /category must be one of/);
    assert.throws(() => validateOutcomeRecord({ ...valid, category: "" }), /category must be one of/);
  });

  it("throws when domain is not rate/time/quality/yield", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, domain: "cost" }), /domain must be one of/);
  });

  it("throws on non-finite estimated/actual", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, estimated: Number.NaN }), /estimated must be a finite number/);
    assert.throws(() => validateOutcomeRecord({ ...valid, actual: Number.POSITIVE_INFINITY }), /actual must be a finite number/);
  });

  it("throws when unit is missing or empty", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, unit: "" }), /unit required/);
  });

  it("throws when s_of_x is out of [0, 1]", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, s_of_x: 1.5 }), /s_of_x must be a finite number in \[0, 1\]/);
    assert.throws(() => validateOutcomeRecord({ ...valid, s_of_x: -0.1 }), /s_of_x must be a finite number in \[0, 1\]/);
  });

  it("accepts s_of_x at boundaries 0 and 1", () => {
    assert.equal(validateOutcomeRecord({ ...valid, s_of_x: 0 }).s_of_x, 0);
    assert.equal(validateOutcomeRecord({ ...valid, s_of_x: 1 }).s_of_x, 1);
  });

  it("throws when shop_id is non-string (when present)", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, shop_id: 42 }), /shop_id must be non-empty string/);
  });

  it("accepts all 8 canonical categories", () => {
    for (const cat of ["lathe", "mill", "wedm", "sinker_edm", "5axis", "swiss", "grinding", "mill_turn"]) {
      assert.equal(validateOutcomeRecord({ ...valid, category: cat }).category, cat);
    }
  });

  it("accepts all 4 canonical domains", () => {
    for (const dom of ["rate", "time", "quality", "yield"]) {
      assert.equal(validateOutcomeRecord({ ...valid, domain: dom }).domain, dom);
    }
  });

  it("throws when evidence_id is non-string", () => {
    assert.throws(() => validateOutcomeRecord({ ...valid, evidence_id: 12345 }), /evidence_id must be a string/);
  });
});

// ============================================================================
// appendOutcome (FS-touching — uses tmpdir)
// ============================================================================

describe("appendOutcome", () => {
  function tmpFile() {
    return path.join(os.tmpdir(), `prism-emit-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  }

  it("creates parent dir + leading __meta header on first write", () => {
    const f = tmpFile();
    const r = appendOutcome({
      domain_ledger: f,
      record: {
        observed_at: "2026-05-25T22:00:00Z",
        category: "lathe",
        domain: "time",
        estimated: 10,
        actual: 12,
        unit: "min",
      },
    });
    assert.equal(r.appended, 1);
    const lines = fs.readFileSync(f, "utf8").trim().split("\n");
    assert.equal(lines.length, 2);
    const meta = JSON.parse(lines[0]);
    assert.equal(meta.__meta, true);
    assert.equal(meta.version, 1);
    const rec = JSON.parse(lines[1]);
    assert.equal(rec.category, "lathe");
    assert.equal(rec.actual, 12);
    fs.unlinkSync(f);
  });

  it("appends to existing ledger without rewriting __meta", () => {
    const f = tmpFile();
    appendOutcome({ domain_ledger: f, record: { observed_at: "t1", category: "lathe", domain: "time", estimated: 10, actual: 12, unit: "min" } });
    appendOutcome({ domain_ledger: f, record: { observed_at: "t2", category: "lathe", domain: "time", estimated: 10, actual: 13, unit: "min" } });
    const lines = fs.readFileSync(f, "utf8").trim().split("\n");
    assert.equal(lines.length, 3); // 1 meta + 2 records
    assert.equal(JSON.parse(lines[0]).__meta, true);
    assert.equal(JSON.parse(lines[1]).observed_at, "t1");
    assert.equal(JSON.parse(lines[2]).observed_at, "t2");
    fs.unlinkSync(f);
  });

  it("throws when record fails validation (no partial write)", () => {
    const f = tmpFile();
    assert.throws(() => appendOutcome({
      domain_ledger: f,
      record: { observed_at: "t1", category: "robot", domain: "time", estimated: 10, actual: 12, unit: "min" },
    }), /category must be one of/);
    assert.equal(fs.existsSync(f), false);
  });

  it("throws when domain_ledger path is empty/non-string", () => {
    assert.throws(() => appendOutcome({ domain_ledger: "", record: {} }), /domain_ledger path required/);
  });
});

// ============================================================================
// appendBatch
// ============================================================================

describe("appendBatch", () => {
  function tmpFile() {
    return path.join(os.tmpdir(), `prism-batch-test-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  }
  const mk = (i) => ({
    observed_at: `2026-05-25T22:0${i}:00Z`,
    category: "lathe",
    domain: "time",
    estimated: 10,
    actual: 10 + i,
    unit: "min",
  });

  it("writes 3 records + 1 meta header in a single batch", () => {
    const f = tmpFile();
    const r = appendBatch({ domain_ledger: f, records: [mk(1), mk(2), mk(3)] });
    assert.equal(r.appended, 3);
    const lines = fs.readFileSync(f, "utf8").trim().split("\n");
    assert.equal(lines.length, 4);
    assert.equal(JSON.parse(lines[0]).__meta, true);
    fs.unlinkSync(f);
  });

  it("rejects entire batch if ANY record is invalid (atomic — no partial write)", () => {
    const f = tmpFile();
    const records = [mk(1), { ...mk(2), category: "robot" }, mk(3)];
    assert.throws(() => appendBatch({ domain_ledger: f, records }), /record\[1\] invalid/);
    assert.equal(fs.existsSync(f), false);
  });

  it("throws on empty records array", () => {
    assert.throws(() => appendBatch({ domain_ledger: "x.jsonl", records: [] }), /records\[\] required/);
  });
});
