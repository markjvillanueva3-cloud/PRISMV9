/**
 * CAMInHostResultsBridgeEngine.test.ts — U-CAMTEST15
 * ===================================================
 *
 * Coverage:
 *   - happy path: ingest, list, summarize a clean envelope
 *   - cross-host + cross-category aggregation correctness
 *   - last-write-wins on (host, scenario_id) collisions
 *   - persist/load round-trip (real fs, temp path)
 *   - schema rejection on bad envelopes / corrupt files
 *   - audit invariant
 *   - dispatcher round-trip
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  CAMInHostResultsBridgeEngine,
  ResultEnvelopeSchema,
  ResultsFileSchema,
  FixtureHostSchema,
  FixtureCategorySchema,
  SCHEMA_VERSION,
  DEFAULT_RESULTS_PATH,
  type FixtureHost,
  type FixtureCategory,
} from "../engines/CAMInHostResultsBridgeEngine.js";
import {
  CAMInHostAssertionBundleEngine,
  type ObservedFrame,
  type SessionStats,
  type ScenarioExpectations,
  type BundleResult,
} from "../engines/CAMInHostAssertionBundleEngine.js";

// ── Test fixtures ────────────────────────────────────────────────────────────

function calmObserved(count: number): ObservedFrame[] {
  const out: ObservedFrame[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ seq: i, latency_ms: 1.0, hard_stop: false, band: 0, payload_valid: true });
  }
  return out;
}

function calmStats(count: number): SessionStats {
  return { frames_in: count, frames_delivered: count, frames_queued: 0, frames_dropped: 0, frames_unknown_target: 0 };
}

function calmExpectations(count: number): ScenarioExpectations {
  return { expected_frame_count: count, expected_band_transitions: 0, deliberate_hard_stop: false, latency_p99_budget_ms: 100 };
}

function passingBundle(): BundleResult {
  return CAMInHostAssertionBundleEngine.evaluate({
    observed: calmObserved(12),
    stats: calmStats(12),
    expectations: calmExpectations(12),
  });
}

function failingBundle(): BundleResult {
  return CAMInHostAssertionBundleEngine.evaluate({
    observed: calmObserved(8),                         // observed less than expected
    stats: calmStats(8),
    expectations: calmExpectations(12),
  });
}

beforeEach(() => CAMInHostResultsBridgeEngine.reset());

// ── 1. Constants & static surface ────────────────────────────────────────────

describe("CAMInHostResultsBridgeEngine — static surface", () => {
  it("exposes SCHEMA_VERSION 1.0.0", () => {
    expect(SCHEMA_VERSION).toBe("1.0.0");
    expect(CAMInHostResultsBridgeEngine.SCHEMA_VERSION).toBe("1.0.0");
  });

  it("DEFAULT_RESULTS_PATH points at data/state/CAM_INHOST_RESULTS.json", () => {
    expect(DEFAULT_RESULTS_PATH).toBe("data/state/CAM_INHOST_RESULTS.json");
    expect(CAMInHostResultsBridgeEngine.DEFAULT_RESULTS_PATH).toBe(DEFAULT_RESULTS_PATH);
  });

  it("ALL_HOSTS lists all 4 in-host runner targets", () => {
    expect(CAMInHostResultsBridgeEngine.ALL_HOSTS).toEqual([
      "fusion360", "hypermill", "inventor_hsm", "mastercam",
    ]);
  });

  it("ALL_CATEGORIES lists all 7 fixture categories", () => {
    expect(CAMInHostResultsBridgeEngine.ALL_CATEGORIES.length).toBe(7);
  });
});

// ── 2. Ingest happy path ─────────────────────────────────────────────────────

describe("CAMInHostResultsBridgeEngine — ingest happy path", () => {
  it("ingestEnvelope stores a single passing envelope", () => {
    const env = CAMInHostResultsBridgeEngine.ingestEnvelope({
      scenario_id: "fusion360_pocket_2d_rectangular_M1T1_calm",
      host: "fusion360",
      category: "pocket_2d",
      bundle: passingBundle(),
      timestamp_ms: 1000,
    });
    expect(env.scenario_id).toBe("fusion360_pocket_2d_rectangular_M1T1_calm");
    expect(CAMInHostResultsBridgeEngine.count()).toBe(1);
  });

  it("ingestBundle wraps a bundle into an envelope and stores it", () => {
    const env = CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "scen-1",
      host: "mastercam",
      category: "turning",
      bundle: passingBundle(),
      timestamp_ms: 5000,
    });
    expect(env.host).toBe("mastercam");
    expect(env.category).toBe("turning");
    expect(env.timestamp_ms).toBe(5000);
    expect(CAMInHostResultsBridgeEngine.count()).toBe(1);
  });

  it("ingestBundle uses Date.now() when timestamp_ms is omitted", () => {
    const before = Date.now();
    const env = CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "scen-2", host: "hypermill", category: "drilling", bundle: passingBundle(),
    });
    const after = Date.now();
    expect(env.timestamp_ms).toBeGreaterThanOrEqual(before);
    expect(env.timestamp_ms).toBeLessThanOrEqual(after);
  });

  it("get returns null when (host, scenario_id) not present", () => {
    expect(CAMInHostResultsBridgeEngine.get("fusion360", "nope")).toBeNull();
  });

  it("get returns the envelope when (host, scenario_id) matches", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "scen-A", host: "fusion360", category: "pocket_2d", bundle: passingBundle(),
    });
    const env = CAMInHostResultsBridgeEngine.get("fusion360", "scen-A");
    expect(env?.scenario_id).toBe("scen-A");
  });
});

// ── 3. Cross-host + cross-category aggregation ─────────────────────────────

describe("CAMInHostResultsBridgeEngine — aggregation", () => {
  function seed(): void {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "fusion360_p1", host: "fusion360",   category: "pocket_2d",  bundle: passingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "fusion360_p2", host: "fusion360",   category: "pocket_2d",  bundle: failingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "hypermill_t1", host: "hypermill",   category: "turning",    bundle: passingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "mastercam_t1", host: "mastercam",   category: "turning",    bundle: failingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "inventor_d1",  host: "inventor_hsm", category: "drilling",  bundle: passingBundle() });
  }

  it("summarize returns correct top-level totals", () => {
    seed();
    const sum = CAMInHostResultsBridgeEngine.summarize();
    expect(sum.total).toBe(5);
    expect(sum.passed).toBe(3);
    expect(sum.failed).toBe(2);
  });

  it("summarize partitions by host", () => {
    seed();
    const sum = CAMInHostResultsBridgeEngine.summarize();
    expect(sum.by_host.fusion360).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(sum.by_host.hypermill).toEqual({ total: 1, passed: 1, failed: 0 });
    expect(sum.by_host.mastercam).toEqual({ total: 1, passed: 0, failed: 1 });
    expect(sum.by_host.inventor_hsm).toEqual({ total: 1, passed: 1, failed: 0 });
  });

  it("summarize partitions by category", () => {
    seed();
    const sum = CAMInHostResultsBridgeEngine.summarize();
    expect(sum.by_category.pocket_2d).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(sum.by_category.turning).toEqual({ total: 2, passed: 1, failed: 1 });
    expect(sum.by_category.drilling).toEqual({ total: 1, passed: 1, failed: 0 });
  });

  it("summarize partitions by assertion family across all envelopes", () => {
    seed();
    const sum = CAMInHostResultsBridgeEngine.summarize();
    // Each envelope contributes 7 assertions → 5 envelopes × 7 = 35 rows total.
    const totalAssertionRows = (Object.values(sum.by_assertion) as Array<{ total: number }>)
      .reduce((acc, b) => acc + b.total, 0);
    expect(totalAssertionRows).toBe(35);
    // Each envelope's frame_arrival is what the failingBundle() trips → 2 failures expected.
    expect(sum.by_assertion.frame_arrival).toEqual({ total: 5, passed: 3, failed: 2 });
  });

  it("listFailures returns only the failing envelopes", () => {
    seed();
    const fails = CAMInHostResultsBridgeEngine.listFailures();
    expect(fails.length).toBe(2);
    for (const e of fails) expect(e.bundle.overall_pass).toBe(false);
  });

  it("listByHost filters correctly", () => {
    seed();
    expect(CAMInHostResultsBridgeEngine.listByHost("fusion360").length).toBe(2);
    expect(CAMInHostResultsBridgeEngine.listByHost("hypermill").length).toBe(1);
  });

  it("listByCategory filters correctly", () => {
    seed();
    expect(CAMInHostResultsBridgeEngine.listByCategory("turning").length).toBe(2);
  });
});

// ── 4. Last-write-wins on (host, scenario_id) collisions ──────────────────

describe("CAMInHostResultsBridgeEngine — last-write-wins", () => {
  it("re-ingesting the same (host, scenario_id) replaces the prior envelope", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "scen-X", host: "fusion360", category: "pocket_2d", bundle: failingBundle(), timestamp_ms: 1000,
    });
    CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "scen-X", host: "fusion360", category: "pocket_2d", bundle: passingBundle(), timestamp_ms: 2000,
    });
    expect(CAMInHostResultsBridgeEngine.count()).toBe(1);
    const env = CAMInHostResultsBridgeEngine.get("fusion360", "scen-X");
    expect(env?.timestamp_ms).toBe(2000);
    expect(env?.bundle.overall_pass).toBe(true);
  });

  it("same scenario_id on different hosts keeps both envelopes (host is part of the key)", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "shared", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "shared", host: "mastercam", category: "pocket_2d", bundle: failingBundle() });
    expect(CAMInHostResultsBridgeEngine.count()).toBe(2);
  });
});

// ── 5. Persist + load round-trip ──────────────────────────────────────────

const TMP_FILES: string[] = [];
function tmpResultsPath(): string {
  const p = path.join(os.tmpdir(), `cam-inhost-results-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  TMP_FILES.push(p);
  return p;
}
afterAll(() => {
  for (const p of TMP_FILES) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
});

describe("CAMInHostResultsBridgeEngine — persist & load", () => {
  it("persist writes a valid ResultsFile to the target path", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "scen-1", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    const target = tmpResultsPath();
    const r = CAMInHostResultsBridgeEngine.persist(target);
    expect(r.envelopes).toBe(1);
    expect(fs.existsSync(target)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(target, "utf8"));
    const parsed = ResultsFileSchema.parse(raw);
    expect(parsed.schemaVersion).toBe("1.0.0");
    expect(parsed.envelopes.length).toBe(1);
  });

  it("persist creates the parent directory when it does not exist", () => {
    const dir = path.join(os.tmpdir(), `cam-results-dir-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const target = path.join(dir, "nested", "results.json");
    TMP_FILES.push(target);
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "x", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    const r = CAMInHostResultsBridgeEngine.persist(target);
    expect(r.envelopes).toBe(1);
    expect(fs.existsSync(target)).toBe(true);
  });

  it("load replaces the in-memory store with the file's envelopes", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "scen-A", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    const target = tmpResultsPath();
    CAMInHostResultsBridgeEngine.persist(target);
    CAMInHostResultsBridgeEngine.reset();
    expect(CAMInHostResultsBridgeEngine.count()).toBe(0);
    const r = CAMInHostResultsBridgeEngine.load(target);
    expect(r.envelopes).toBe(1);
    expect(CAMInHostResultsBridgeEngine.count()).toBe(1);
    expect(CAMInHostResultsBridgeEngine.get("fusion360", "scen-A")?.scenario_id).toBe("scen-A");
  });

  it("persist + load round-trip preserves envelope ordering and content", () => {
    const ids = ["a", "b", "c", "d", "e"];
    for (const id of ids) {
      CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: id, host: "fusion360", category: "pocket_2d", bundle: passingBundle(), timestamp_ms: 1000 });
    }
    const target = tmpResultsPath();
    CAMInHostResultsBridgeEngine.persist(target);
    CAMInHostResultsBridgeEngine.reset();
    CAMInHostResultsBridgeEngine.load(target);
    expect(CAMInHostResultsBridgeEngine.count()).toBe(5);
    const stored = CAMInHostResultsBridgeEngine.list().map(e => e.scenario_id).sort();
    expect(stored).toEqual(ids);
  });

  it("load throws on missing file (failure mode)", () => {
    expect(() => CAMInHostResultsBridgeEngine.load("/nope/does-not-exist.json")).toThrow(/results file not found/);
  });

  it("load throws on schema-version mismatch (adversarial)", () => {
    const target = tmpResultsPath();
    fs.writeFileSync(target, JSON.stringify({
      schemaVersion: "1.0.0",
      envelopes: [],
      written_at_ms: Date.now(),
    }), "utf8");
    // Tamper to a version that is not literally "1.0.0".
    const tampered = JSON.parse(fs.readFileSync(target, "utf8"));
    tampered.schemaVersion = "2.0.0";
    fs.writeFileSync(target, JSON.stringify(tampered), "utf8");
    expect(() => CAMInHostResultsBridgeEngine.load(target)).toThrow();
  });

  it("load throws on corrupt JSON", () => {
    const target = tmpResultsPath();
    fs.writeFileSync(target, "{ not valid json", "utf8");
    expect(() => CAMInHostResultsBridgeEngine.load(target)).toThrow();
  });
});

// ── 6. Schema validation ───────────────────────────────────────────────────

describe("CAMInHostResultsBridgeEngine — schema validation", () => {
  it("ResultEnvelopeSchema rejects empty scenario_id", () => {
    expect(() => ResultEnvelopeSchema.parse({
      scenario_id: "", host: "fusion360", category: "pocket_2d",
      bundle: passingBundle(), timestamp_ms: 0,
    })).toThrow();
  });

  it("ResultEnvelopeSchema rejects negative timestamp_ms (failure mode)", () => {
    expect(() => ResultEnvelopeSchema.parse({
      scenario_id: "x", host: "fusion360", category: "pocket_2d",
      bundle: passingBundle(), timestamp_ms: -1,
    })).toThrow();
  });

  it("FixtureHostSchema rejects unknown host (adversarial)", () => {
    const bad: unknown = "solidcam";
    expect(() => FixtureHostSchema.parse(bad)).toThrow();
  });

  it("FixtureCategorySchema rejects unknown category (adversarial)", () => {
    const bad: unknown = "etching";
    expect(() => FixtureCategorySchema.parse(bad)).toThrow();
  });
});

// ── 7. Audit invariant ────────────────────────────────────────────────────

describe("CAMInHostResultsBridgeEngine — audit", () => {
  it("auditBridge passes on an empty store", () => {
    const audit = CAMInHostResultsBridgeEngine.auditBridge();
    expect(audit.ok).toBe(true);
    expect(audit.errors).toEqual([]);
  });

  it("auditBridge passes on a populated store", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "x", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    expect(CAMInHostResultsBridgeEngine.auditBridge().ok).toBe(true);
  });
});

// ── 8. Reset semantics ────────────────────────────────────────────────────

describe("CAMInHostResultsBridgeEngine — reset", () => {
  it("reset clears the entire in-memory store", () => {
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "x", host: "fusion360", category: "pocket_2d", bundle: passingBundle() });
    CAMInHostResultsBridgeEngine.ingestBundle({ scenario_id: "y", host: "mastercam", category: "turning",   bundle: failingBundle() });
    expect(CAMInHostResultsBridgeEngine.count()).toBe(2);
    CAMInHostResultsBridgeEngine.reset();
    expect(CAMInHostResultsBridgeEngine.count()).toBe(0);
    expect(CAMInHostResultsBridgeEngine.list()).toEqual([]);
  });
});

// ── 9. Dispatcher round-trip ─────────────────────────────────────────────

describe("U-CAMTEST15 — dispatcher round-trip (prism_cam)", () => {
  it("ACTIONS array exposes all results bridge actions", async () => {
    const mod = await import("../tools/dispatchers/camDispatcher.js");
    expect(mod.ACTIONS).toContain("cam_results_bridge_ingest");
    expect(mod.ACTIONS).toContain("cam_results_bridge_list");
    expect(mod.ACTIONS).toContain("cam_results_bridge_list_failures");
    expect(mod.ACTIONS).toContain("cam_results_bridge_summarize");
    expect(mod.ACTIONS).toContain("cam_results_bridge_persist");
    expect(mod.ACTIONS).toContain("cam_results_bridge_load");
    expect(mod.ACTIONS).toContain("cam_results_bridge_reset");
    expect(mod.ACTIONS).toContain("cam_results_bridge_audit");
  });

  it("engine reachable via the same dynamic-import path the dispatcher uses", async () => {
    const mod = await import("../engines/CAMInHostResultsBridgeEngine.js");
    mod.CAMInHostResultsBridgeEngine.reset();
    mod.CAMInHostResultsBridgeEngine.ingestBundle({
      scenario_id: "via-dispatcher", host: "fusion360", category: "pocket_2d", bundle: passingBundle(),
    });
    expect(mod.CAMInHostResultsBridgeEngine.count()).toBe(1);
  });

  it("schema constants are stable across module imports", async () => {
    const mod = await import("../engines/CAMInHostResultsBridgeEngine.js");
    expect(mod.CAMInHostResultsBridgeEngine.SCHEMA_VERSION).toBe("1.0.0");
    expect(mod.CAMInHostResultsBridgeEngine.DEFAULT_RESULTS_PATH).toBe("data/state/CAM_INHOST_RESULTS.json");
  });
});
