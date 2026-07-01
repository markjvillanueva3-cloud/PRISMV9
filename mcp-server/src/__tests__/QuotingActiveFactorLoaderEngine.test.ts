/**
 * QuotingActiveFactorLoaderEngine — tests
 *
 * Coverage:
 *   - happy path: load valid factors + apply to predicted_usd
 *   - per-customer factor preferred over global
 *   - file-missing → fallback pass-through (NOT throw)
 *   - JSON malformed → fallback + reason surfaced
 *   - shape-invalid → fallback + reason
 *   - cache freshness (60s TTL)
 *   - refresh() forces disk reread
 *   - staleness flag (>24h)
 *   - invalid predicted_usd (NaN/0/negative) → pass-through
 *   - metadata-only path
 *
 * Uses tmp dir + real fs (no mocks) — the engine's filesystem path is the
 * actual contract and mock-fs would not catch path-resolution bugs.
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-QUOTING-ACTIVE
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { QuotingActiveFactorLoaderEngine } from "../engines/QuotingActiveFactorLoaderEngine.js";
import type { CalibrationFactors } from "../engines/QuotingCalibrationEngine.js";

function makeFactors(overrides: Partial<CalibrationFactors> = {}): CalibrationFactors {
  return {
    ok: true,
    generated_at: new Date().toISOString(),
    source_report_signature: "n=10;mape=171.90;signed=146.23;cust=ACCURATE THREADED FASTENERS:1",
    global: {
      customer: "*",
      record_count: 10,
      signed_pct_error_observed: 146.23,
      factor: 0.4061,
      factor_clamped: false,
      rationale: "signedPct 146.2% → multiplicative correction 0.4061",
    },
    per_customer: [
      { customer: "ALPHA-MFG", record_count: 5, signed_pct_error_observed: 80, factor: 0.5556, factor_clamped: false, rationale: "test" },
    ],
    notes: [],
    ...overrides,
  };
}

describe("QuotingActiveFactorLoaderEngine", () => {
  let tmpDir: string;
  let factorPath: string;
  let engine: QuotingActiveFactorLoaderEngine;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(join(tmpdir(), "qaf-test-"));
    factorPath = join(tmpDir, "active-factors.json");
    engine = new QuotingActiveFactorLoaderEngine({ path: factorPath });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("getActiveFactors() — disk read paths", () => {
    it("loads valid factors when file exists", async () => {
      const factors = makeFactors();
      await fs.writeFile(factorPath, JSON.stringify(factors), "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(true);
      expect(r.factors?.global.factor).toBe(0.4061);
      expect(r.metadata.hasFactors).toBe(true);
    });

    it("returns ok=false with reason when file missing (does NOT throw)", async () => {
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("active-factors-file-missing");
      expect(r.factors).toBe(undefined);
      expect(r.metadata.hasFactors).toBe(false);
    });

    it("returns ok=false when JSON is malformed", async () => {
      await fs.writeFile(factorPath, "{ not valid json", "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/json-parse-failed/);
    });

    it("returns ok=false when shape is invalid (missing required fields)", async () => {
      await fs.writeFile(factorPath, JSON.stringify({ ok: true }), "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("active-factors-shape-invalid");
    });

    it("returns ok=false when JSON is not an object", async () => {
      await fs.writeFile(factorPath, JSON.stringify("string-payload"), "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(false);
      expect(r.reason).toBe("active-factors-not-an-object");
    });
  });

  describe("applyToQuote() — runtime bridge", () => {
    it("applies global factor to predicted_usd", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const r = await engine.applyToQuote(100);
      expect(r.ok).toBe(true);
      expect(r.factor_used).toBe(0.4061);
      expect(r.corrected_usd).toBe(40.61);
      expect(r.factor_source).toBe("global");
      expect(r.fallback_used).toBe(false);
    });

    it("prefers per-customer factor over global when customer matches", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const r = await engine.applyToQuote(100, "ALPHA-MFG");
      expect(r.factor_used).toBe(0.5556);
      expect(r.factor_source).toBe("per-customer");
      expect(r.corrected_usd).toBe(55.56);
    });

    it("falls back to global when customer not in per_customer list", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const r = await engine.applyToQuote(100, "UNKNOWN-CUSTOMER");
      expect(r.factor_source).toBe("global");
      expect(r.factor_used).toBe(0.4061);
    });

    it("pass-through when no active factors (fallback flag surfaces reason)", async () => {
      const r = await engine.applyToQuote(100, "ALPHA-MFG");
      expect(r.ok).toBe(false);
      expect(r.fallback_used).toBe(true);
      expect(r.fallback_reason).toBe("active-factors-file-missing");
      expect(r.corrected_usd).toBe(100);
      expect(r.factor_used).toBe(1);
    });

    it("pass-through for invalid predicted_usd (NaN/0/negative)", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const rNaN = await engine.applyToQuote(NaN);
      expect(rNaN.fallback_used).toBe(true);
      expect(rNaN.fallback_reason).toBe("invalid-predicted-usd");
      const r0 = await engine.applyToQuote(0);
      expect(r0.fallback_used).toBe(true);
      const rNeg = await engine.applyToQuote(-50);
      expect(rNeg.fallback_used).toBe(true);
    });

    it("returns unchanged when factors.ok=false (e.g., no-predicted-records)", async () => {
      const badFactors = makeFactors({ ok: false, reason: "no-predicted-records" });
      await fs.writeFile(factorPath, JSON.stringify(badFactors), "utf-8");
      const r = await engine.applyToQuote(100);
      expect(r.ok).toBe(false);
      expect(r.fallback_used).toBe(true);
      expect(r.corrected_usd).toBe(100);
    });
  });

  describe("staleness detection", () => {
    it("flags factors as stale when generated_at is >24h old", async () => {
      const oldFactors = makeFactors({
        generated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });
      await fs.writeFile(factorPath, JSON.stringify(oldFactors), "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.ok).toBe(true);
      expect(r.metadata.isStale).toBe(true);
      expect(r.metadata.ageMinutes).toBeGreaterThan(24 * 60);
    });

    it("does NOT flag fresh factors as stale", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const r = await engine.getActiveFactors();
      expect(r.metadata.isStale).toBe(false);
    });
  });

  describe("cache + refresh", () => {
    it("returns cached value on consecutive reads (TTL not expired)", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors({ source_report_signature: "v1" })), "utf-8");
      const r1 = await engine.getActiveFactors();
      await fs.writeFile(factorPath, JSON.stringify(makeFactors({ source_report_signature: "v2" })), "utf-8");
      const r2 = await engine.getActiveFactors();
      expect(r1.factors?.source_report_signature).toBe("v1");
      expect(r2.factors?.source_report_signature).toBe("v1");
    });

    it("refresh() forces a fresh disk read", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors({ source_report_signature: "v1" })), "utf-8");
      const r1 = await engine.getActiveFactors();
      await fs.writeFile(factorPath, JSON.stringify(makeFactors({ source_report_signature: "v2" })), "utf-8");
      engine.refresh();
      const r2 = await engine.getActiveFactors();
      expect(r1.factors?.source_report_signature).toBe("v1");
      expect(r2.factors?.source_report_signature).toBe("v2");
    });

    it("setPath() invalidates cache", async () => {
      const altPath = join(tmpDir, "alt-factors.json");
      await fs.writeFile(factorPath, JSON.stringify(makeFactors({ source_report_signature: "primary" })), "utf-8");
      await fs.writeFile(altPath, JSON.stringify(makeFactors({ source_report_signature: "alt" })), "utf-8");
      const r1 = await engine.getActiveFactors();
      expect(r1.factors?.source_report_signature).toBe("primary");
      engine.setPath(altPath);
      const r2 = await engine.getActiveFactors();
      expect(r2.factors?.source_report_signature).toBe("alt");
    });
  });

  describe("metadata-only path", () => {
    it("getMetadata() returns hasFactors=true + ageMinutes when loaded", async () => {
      await fs.writeFile(factorPath, JSON.stringify(makeFactors()), "utf-8");
      const m = await engine.getMetadata();
      expect(m.hasFactors).toBe(true);
      expect(m.ageMinutes).toBeGreaterThanOrEqual(0);
      expect(m.signature).toBe("n=10;mape=171.90;signed=146.23;cust=ACCURATE THREADED FASTENERS:1");
    });

    it("getMetadata() returns hasFactors=false when file missing", async () => {
      const m = await engine.getMetadata();
      expect(m.hasFactors).toBe(false);
      expect(m.reason).toBe("active-factors-file-missing");
    });
  });

  describe("input guards", () => {
    it("setPath() rejects empty string", () => {
      expect(() => engine.setPath("")).toThrow(/non-empty string/);
    });

    it("setPath() rejects non-string", () => {
      expect(() => engine.setPath(null as unknown as string)).toThrow();
    });
  });
});
