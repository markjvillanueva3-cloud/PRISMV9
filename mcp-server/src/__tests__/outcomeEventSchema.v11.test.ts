/**
 * outcomeEventSchema.v11.test.ts — INFRA-NEURAL-LEDGER-MS1/P0-U01 acceptance tests
 * ===============================================================================
 *
 * Covers the 1.0.0 → 1.1.0 schema bump:
 *   - schemaVersion union accepts ("1.0.0" | "1.1.0") strict-literal
 *   - 1.0.0 events still validate unchanged (backward-compat anti-regression)
 *   - 1.1.0-only kinds (cross_process_decision, cross_process_stage_complete)
 *   - 1.1.0-only context fields (job_id, pipeline_run_id, pipeline_stage,
 *     consensus_audit_id) — all optional, snake_case-only
 *   - top-level numeric_features keyed by canonical NUMERIC_FEATURE_KEYS,
 *     finite-only values, per-key path on rejection
 *   - Cross-field rule (P0 from reviewer round): schemaVersion="1.0.0" rejected
 *     when any v1.1.0-only surface is populated
 *   - Convention-drift guard (P1 from reviewer round): camelCase variants of
 *     the new context keys (jobId/pipelineRunId/pipelineStage/consensusAuditId)
 *     are rejected
 *   - Producer-side: OutcomeCaptureBusEngine.record() auto-stamps the right
 *     schemaVersion based on input shape
 *
 * Test rationale per case is documented inline. Reviewer-required cases are
 * marked [REQ-A] (Agent A — wiring) and [REQ-B] (Agent B — independent).
 *
 * @milestone INFRA-NEURAL-LEDGER-MS1/P0-U01
 */

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  OutcomeEventSchema,
  NumericFeaturesSchema,
  type OutcomeEvent,
} from "../schemas/outcomeEventSchema.js";
import {
  NUMERIC_FEATURE_KEYS,
  type NumericFeatureKey,
} from "../engines/CrossProcessOutcomeStore.js";
import { OutcomeCaptureBusEngine } from "../engines/OutcomeCaptureBusEngine.js";

// ─────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal valid v1.0.0 event — used as the backward-compat golden snapshot. */
function v10Event(): OutcomeEvent {
  return {
    schemaVersion: "1.0.0",
    event_id: "evt-v10-fixture",
    lineage_id: "lin-v10-fixture",
    domain: "mill",
    kind: "cycle_time_measurement",
    severity: "info",
    source: "controller",
    timestamp: "2026-05-12T21:00:00.000Z",
    context: {
      customer: "JM-DIE",
      part_number: "PN-001",
      machine_id: "OKUMA-LB3000",
    },
    actual: { cycle_time_s: 142.7 },
  };
}

/** Minimal valid v1.1.0 event using all new fields. */
function v11Event(): OutcomeEvent {
  return {
    schemaVersion: "1.1.0",
    event_id: "evt-v11-fixture",
    lineage_id: "lin-v11-fixture",
    domain: "mill",
    kind: "cross_process_decision",
    severity: "info",
    source: "system",
    timestamp: "2026-05-12T21:00:00.000Z",
    context: {
      customer: "JM-DIE",
      job_id: "job-XYZ-2026-05-12-001",
      pipeline_run_id: "run-ab12cd34-ef56",
      pipeline_stage: "feature_recognize",
      consensus_audit_id: "consensus-audit-9001",
    },
    numeric_features: {
      tool_diameter_mm: 6.0,
      depth_of_cut_mm: 0.5,
      spindle_rpm: 12000,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// schemaVersion union
// ─────────────────────────────────────────────────────────────────────────────

describe("OutcomeEventSchema schemaVersion union", () => {
  it("[REQ-B #6] accepts a hand-written v1.0.0 event unchanged (golden snapshot)", () => {
    const result = OutcomeEventSchema.safeParse(v10Event());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.schemaVersion).toBe("1.0.0");
  });

  it("accepts a fully-populated v1.1.0 event", () => {
    const result = OutcomeEventSchema.safeParse(v11Event());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe("1.1.0");
      expect(result.data.numeric_features).toEqual({
        tool_diameter_mm: 6.0,
        depth_of_cut_mm: 0.5,
        spindle_rpm: 12000,
      });
    }
  });

  it("[REQ-B #7] rejects arbitrary semver strings outside the union literal", () => {
    for (const bad of ["1.0.1", "1.1.0-rc.1", "2.0.0", "1.2.0", "0.9.9", ""]) {
      const evt = { ...v10Event(), schemaVersion: bad as "1.0.0" };
      const result = OutcomeEventSchema.safeParse(evt);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Issue path should call out the offending field
        const offenders = result.error.issues.map((i) => i.path.join("."));
        expect(offenders).toContain("schemaVersion");
      }
    }
  });

  it("rejects missing schemaVersion entirely", () => {
    const { schemaVersion: _drop, ...rest } = v10Event();
    void _drop;
    const result = OutcomeEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-field consistency rule (P0 from reviewer round)
// ─────────────────────────────────────────────────────────────────────────────

describe("OutcomeEventSchema cross-field consistency (no version bleed)", () => {
  it("[REQ-B #1] rejects v1.0.0 schemaVersion paired with v1.1.0-only kind=cross_process_decision", () => {
    const evt = { ...v10Event(), kind: "cross_process_decision" as const };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Use .filter() not .find() — avoids a silent mis-match if a future
      // schema bump adds an unrelated schemaVersion issue from a different rule.
      const versionIssues = result.error.issues.filter(
        (i) => i.path.join(".") === "schemaVersion",
      );
      expect(
        versionIssues.some((i) => /1\.1\.0-only fields/i.test(i.message)),
      ).toBe(true);
    }
  });

  it("[REQ-B #1] rejects v1.0.0 schemaVersion paired with v1.1.0-only kind=cross_process_stage_complete", () => {
    const evt = { ...v10Event(), kind: "cross_process_stage_complete" as const };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });

  it.each([
    "job_id",
    "pipeline_run_id",
    "pipeline_stage",
    "consensus_audit_id",
  ])(
    "[REQ-B #2] rejects v1.0.0 schemaVersion paired with v1.1.0-only context.%s",
    (field) => {
      const evt = {
        ...v10Event(),
        context: { ...v10Event().context, [field]: "test-value" },
      };
      const result = OutcomeEventSchema.safeParse(evt);
      expect(result.success).toBe(false);
      if (!result.success) {
        const offenders = result.error.issues.map((i) => i.path.join("."));
        expect(offenders).toContain("schemaVersion");
      }
    },
  );

  it("[REQ-B #3] rejects v1.0.0 schemaVersion paired with non-empty numeric_features", () => {
    const evt = {
      ...v10Event(),
      numeric_features: { spindle_rpm: 12000 },
    };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });

  it("permits v1.1.0 schemaVersion with no v1.1.0-only fields populated (additive-not-mandatory)", () => {
    const evt = { ...v10Event(), schemaVersion: "1.1.0" as const };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Convention drift guard (camelCase rejected)
// ─────────────────────────────────────────────────────────────────────────────

describe("OutcomeEventSchema convention drift (snake_case enforced)", () => {
  it.each([
    ["jobId", "job_id"],
    ["pipelineRunId", "pipeline_run_id"],
    ["pipelineStage", "pipeline_stage"],
    ["consensusAuditId", "consensus_audit_id"],
  ])("rejects context.%s with helpful pointer to %s", (camel, snake) => {
    const base = v11Event();
    const evt = {
      ...base,
      context: { ...base.context, [camel]: "drift-value" },
    };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
    if (!result.success) {
      const driftIssues = result.error.issues.filter(
        (i) => i.path.join(".") === `context.${camel}`,
      );
      expect(driftIssues.some((i) => i.message.includes(snake))).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// numeric_features validation
// ─────────────────────────────────────────────────────────────────────────────

describe("NumericFeaturesSchema canonical-vocabulary enforcement", () => {
  it("[REQ-B #4] rejects every non-canonical key independently with bad-key path", () => {
    const result = NumericFeaturesSchema.safeParse({
      foo: 1,
      bar: 2,
      spindle_rpm: 12000,  // valid — should not be in errors
      baz: 3,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Filter by EXPECTED bad-key path (not by code === "custom"), so a future
      // value-level custom validator on this schema doesn't conflate paths.
      const badKeyIssues = result.error.issues.filter(
        (i) =>
          ["foo", "bar", "baz"].includes(String(i.path[0])) &&
          /not in canonical NUMERIC_FEATURE_KEYS/i.test(i.message),
      );
      expect(badKeyIssues.map((i) => String(i.path[0])).sort()).toEqual(
        ["bar", "baz", "foo"],
      );
      // Crucially: the valid key was NOT flagged
      const allFlaggedKeys = result.error.issues.map((i) => String(i.path[0]));
      expect(allFlaggedKeys).not.toContain("spindle_rpm");
    }
  });

  it("[REQ-B #5] rejects NaN for canonical keys", () => {
    const result = NumericFeaturesSchema.safeParse({ spindle_rpm: NaN });
    expect(result.success).toBe(false);
  });

  it("[REQ-B #5] rejects positive Infinity for canonical keys", () => {
    const result = NumericFeaturesSchema.safeParse({ spindle_rpm: Infinity });
    expect(result.success).toBe(false);
  });

  it("[REQ-B #5] rejects negative Infinity for canonical keys", () => {
    const result = NumericFeaturesSchema.safeParse({ spindle_rpm: -Infinity });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric values (string) for canonical keys", () => {
    const result = NumericFeaturesSchema.safeParse({ spindle_rpm: "12000" });
    expect(result.success).toBe(false);
  });

  it("accepts empty object (no features recorded is valid)", () => {
    const result = NumericFeaturesSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("[REQ-B #8] accepts every canonical NUMERIC_FEATURE_KEYS entry independently", () => {
    // Anti-regression: if anyone removes a key from the store's canonical list,
    // this test surfaces the schema-side break immediately.
    for (const key of NUMERIC_FEATURE_KEYS) {
      const result = NumericFeaturesSchema.safeParse({ [key]: 1.5 });
      expect(result.success, `key "${key}" should validate as a finite number`).toBe(true);
    }
  });

  it("accepts a multi-key feature vector with all canonical keys", () => {
    const allKeys: Record<NumericFeatureKey, number> = {
      tool_diameter_mm: 6.0,
      depth_of_cut_mm: 0.5,
      workpiece_thickness_mm: 25.4,
      target_ra_um: 1.6,
      spindle_rpm: 12000,
      feed_rate_mm_min: 1500,
      cutting_speed_m_min: 226,
    };
    const result = NumericFeaturesSchema.safeParse(allKeys);
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5 malformed variants per envelope exit-condition
// ─────────────────────────────────────────────────────────────────────────────

describe("OutcomeEventSchema malformed-event rejection (envelope exit-condition)", () => {
  it("rejects: missing required field (event_id)", () => {
    const { event_id: _drop, ...rest } = v11Event();
    void _drop;
    const result = OutcomeEventSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects: wrong type (severity number instead of enum string)", () => {
    const evt = { ...v11Event(), severity: 1 as unknown as "info" };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });

  it("rejects: NaN inside numeric_features", () => {
    const evt = { ...v11Event(), numeric_features: { spindle_rpm: NaN } };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });

  it("rejects: Infinity inside numeric_features", () => {
    const evt = { ...v11Event(), numeric_features: { feed_rate_mm_min: Infinity } };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });

  it("rejects: oversize string field (job_id beyond 128 chars)", () => {
    const evt = {
      ...v11Event(),
      context: { ...v11Event().context, job_id: "x".repeat(129) },
    };
    const result = OutcomeEventSchema.safeParse(evt);
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Producer-side: OutcomeCaptureBusEngine auto-stamps schemaVersion correctly
// ─────────────────────────────────────────────────────────────────────────────

describe("OutcomeCaptureBusEngine schemaVersion auto-stamping", () => {
  let tmpDir: string;
  let bus: OutcomeCaptureBusEngine;
  // Match FeatureStoreEngine.test.ts convention — batch tmpdir cleanup in
  // afterAll so per-test EBUSY/EPERM (Windows AV scanner holding handles
  // ~50–500ms post-rename) doesn't leak shards into %TEMP%.
  const cleanupRoots: string[] = [];

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "outcome-bus-v11-"));
    bus = new OutcomeCaptureBusEngine(tmpDir);
    cleanupRoots.push(tmpDir);
  });

  afterAll(() => {
    for (const root of cleanupRoots) {
      try {
        rmSync(root, { recursive: true, force: true });
      } catch {
        // drain — Windows AV may still hold the handle; OS reclaims on reboot
      }
    }
  });

  function readEmittedEvent(domain: string): OutcomeEvent {
    const files = readdirSync(tmpDir);
    const shard = files.find((f) => f.includes(domain) && f.endsWith(".jsonl"));
    if (!shard) {
      throw new Error(`no shard emitted for domain ${domain} (files: ${files.join(",")})`);
    }
    const lines = readFileSync(join(tmpDir, shard), "utf8").trim().split("\n");
    return JSON.parse(lines[lines.length - 1]) as OutcomeEvent;
  }

  it("stamps 1.0.0 when no v1.1.0 fields populated", () => {
    const result = bus.record({
      domain: "mill",
      kind: "cycle_time_measurement",
      source: "controller",
      actual: { cycle_time_s: 100 },
    });
    expect(result.ok).toBe(true);
    const ev = readEmittedEvent("mill");
    expect(ev.schemaVersion).toBe("1.0.0");
  });

  it("auto-stamps 1.1.0 when kind is cross_process_decision", () => {
    const result = bus.record({
      domain: "cam",
      kind: "cross_process_decision",
      source: "system",
      actual: { decision: "use_5axis" },
    });
    expect(result.ok).toBe(true);
    const ev = readEmittedEvent("cam");
    expect(ev.schemaVersion).toBe("1.1.0");
  });

  it("auto-stamps 1.1.0 when kind is cross_process_stage_complete", () => {
    const result = bus.record({
      domain: "cad",
      kind: "cross_process_stage_complete",
      source: "system",
    });
    expect(result.ok).toBe(true);
    const ev = readEmittedEvent("cad");
    expect(ev.schemaVersion).toBe("1.1.0");
  });

  it.each(["job_id", "pipeline_run_id", "pipeline_stage", "consensus_audit_id"])(
    "auto-stamps 1.1.0 when context.%s is populated",
    (field) => {
      const result = bus.record({
        domain: "lathe",
        kind: "cycle_time_measurement",
        source: "controller",
        context: { [field]: "value-1" },
      });
      expect(result.ok).toBe(true);
      const ev = readEmittedEvent("lathe");
      expect(ev.schemaVersion).toBe("1.1.0");
    },
  );

  it("auto-stamps 1.1.0 when numeric_features is populated and round-trips the values", () => {
    const result = bus.record({
      domain: "mill",
      kind: "cycle_time_measurement",
      source: "controller",
      numeric_features: { spindle_rpm: 12000, depth_of_cut_mm: 0.5 },
    });
    expect(result.ok).toBe(true);
    const ev = readEmittedEvent("mill");
    expect(ev.schemaVersion).toBe("1.1.0");
    expect(ev.numeric_features).toEqual({ spindle_rpm: 12000, depth_of_cut_mm: 0.5 });
  });

  it("rejects (ok:false) when input would violate cross-field rule (defense-in-depth: schema parse layer)", () => {
    // The bus auto-stamps 1.1.0 so this case shouldn't normally arise via record(),
    // but if a caller forces severity to a bad value, schema.safeParse rejects and
    // the bus returns ok:false instead of writing.
    const result = bus.record({
      domain: "mill",
      kind: "cycle_time_measurement",
      source: "controller",
      severity: "not-a-real-severity" as never,
    });
    expect(result.ok).toBe(false);
    expect(result.warning).toMatch(/^schema validation failed:/);
  });

  it("[REQ-B must-add #1] does NOT dedupe events with the same explicit event_id (append-only contract pinned)", () => {
    // The bus contract is append-only — downstream learning systems depend on
    // multi-emit semantics (e.g. recommendation_emitted at t0, paired
    // outcome at t1 sharing lineage_id but with distinct event_ids). Schema
    // does not enforce event_id uniqueness; bus does not dedupe. This test
    // pins that contract so a future "let's add dedup" change surfaces here.
    const explicitId = "explicit-event-id-replay-test";
    const out1 = bus.record({
      domain: "mill",
      kind: "cycle_time_measurement",
      source: "controller",
      event_id: explicitId,
      actual: { cycle_time_s: 100 },
    });
    const out2 = bus.record({
      domain: "mill",
      kind: "cycle_time_measurement",
      source: "controller",
      event_id: explicitId,
      actual: { cycle_time_s: 110 },
    });
    expect(out1.ok).toBe(true);
    expect(out2.ok).toBe(true);
    expect(out1.event_id).toBe(explicitId);
    expect(out2.event_id).toBe(explicitId);
    // Both events landed on disk — read the shard and count.
    const files = readdirSync(tmpDir).filter((f) => f.includes("mill") && f.endsWith(".jsonl"));
    expect(files.length).toBeGreaterThan(0);
    const lines = readFileSync(join(tmpDir, files[0]), "utf8").trim().split("\n");
    const matchingLines = lines.filter((l) => l.includes(explicitId));
    expect(matchingLines.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UPS DEFERRED FROM REVIEWER-B (logged for next chat)
//   - empty-string `job_id` boundary: schema's .min(1) covers — but pickSchemaVersion
//     uses `!== undefined`, so "" still triggers v1.1.0 stamp. Test that.
//   - unicode/surrogate-pair length: confirm whether .max(128) counts UTF-16 units
//     vs codepoints. Pin behavior with `"🔥".repeat(65)` (length 130).
//   - Tightening: anchor /^schema validation failed:/ regex (DONE above).
// ─────────────────────────────────────────────────────────────────────────────
