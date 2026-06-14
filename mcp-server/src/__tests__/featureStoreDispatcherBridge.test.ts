/**
 * featureStoreDispatcherBridge.test.ts — U-DB-BRIDGE-05 dispatcher exposure.
 *
 * Verifies the FeatureStoreEngine → prism_intelligence dispatcher bridge:
 *   - feature_store_put / feature_store_query / feature_store_stats schemas
 *     validate the contract (happy path + failure modes + adversarial).
 *   - The engine round-trips through what the dispatcher would call —
 *     same arguments, same return shape that the inline-if handlers wrap.
 *   - Point-in-time correctness invariant (event_ts ≤ as_of_ts) holds.
 *   - Coverage: 3 spanning OUTCOME_DOMAINS, ≥3 failure modes, ≥2 adversarial.
 *
 * @milestone JULIETT-DB-BRIDGE/U-DB-BRIDGE-05 (slot juliett, 2026-05-25)
 */

import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import { ACTION_INTELLIGENCE_SCHEMAS } from "../schemas/intelligenceActionSchemas.js";
import { FeatureStoreEngine } from "../engines/FeatureStoreEngine.js";

// ----------------------------------------------------------------------------
// Helper: isolated FeatureStoreEngine per test (independent root dir).
// ----------------------------------------------------------------------------

function freshStore(): { store: FeatureStoreEngine; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-feat-store-"));
  return { store: new FeatureStoreEngine(dir), dir };
}

// ----------------------------------------------------------------------------
// Schema-validation tests (the dispatcher contract surface).
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-05 schema contract — feature_store_put", () => {
  const schema = ACTION_INTELLIGENCE_SCHEMAS["feature_store_put"];

  it("accepts a well-formed put for the mill domain (3-domain spanning #1)", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "cutting_outcome",
      feature_group_version: "v1",
      entity_id: "job_abc",
      event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: { sfm: 1200, chipload_mm: 0.05 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.domain).toBe("mill");
      expect(r.data.entity_id).toBe("job_abc");
      expect(r.data.feature_values).toEqual({ sfm: 1200, chipload_mm: 0.05 });
    }
  });

  it("accepts a well-formed put for the lathe domain (3-domain spanning #2)", () => {
    const r = schema.safeParse({
      domain: "lathe",
      feature_group: "css_outcome",
      entity_id: "lathe_job_42",
      event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: { css_sfm: 800, doc_mm: 1.2 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.domain).toBe("lathe");
      // Default version applied when omitted.
      expect(r.data.feature_group_version).toBe("v1");
    }
  });

  it("accepts a well-formed put for the wedm domain (3-domain spanning #3)", () => {
    const r = schema.safeParse({
      domain: "wedm",
      feature_group: "skim_pass_outcome",
      entity_id: "wedm_run_7",
      event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: { skim_count: 4, kerf_um: 220 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.domain).toBe("wedm");
      expect(r.data.feature_values.skim_count).toBe(4);
    }
  });

  it("FAILURE MODE 1: rejects unknown domain (typo)", () => {
    const r = schema.safeParse({
      domain: "millll",
      feature_group: "x", entity_id: "y", event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: {},
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("domain"))).toBe(true);
    }
  });

  it("FAILURE MODE 2: rejects empty feature_group", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "", entity_id: "y", event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: {},
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("feature_group"))).toBe(true);
    }
  });

  it("FAILURE MODE 3: rejects malformed event_ts (not ISO 8601 datetime)", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "x", entity_id: "y", event_ts: "not-a-date",
      feature_values: {},
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("event_ts"))).toBe(true);
    }
  });

  it("ADVERSARIAL 1: rejects when event_ts is empty string", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "x", entity_id: "y", event_ts: "",
      feature_values: {},
    });
    expect(r.success).toBe(false);
  });

  it("ADVERSARIAL 2: rejects when entity_id is empty string", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "x", entity_id: "", event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: {},
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("entity_id"))).toBe(true);
    }
  });
});

describe("U-DB-BRIDGE-05 schema contract — feature_store_query", () => {
  const schema = ACTION_INTELLIGENCE_SCHEMAS["feature_store_query"];

  it("accepts a well-formed query + preserves entity_ids array", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "cutting_outcome",
      entity_ids: ["job_abc", "job_def"],
      as_of_ts: "2026-05-25T20:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.entity_ids).toEqual(["job_abc", "job_def"]);
      expect(r.data.as_of_ts).toBe("2026-05-25T20:00:00.000Z");
    }
  });

  it("accepts query without as_of_ts (defaults to NOW at engine layer)", () => {
    const r = schema.safeParse({
      domain: "lathe",
      feature_group: "css_outcome",
      entity_ids: ["lathe_job_1"],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.as_of_ts).toBe(undefined);
    }
  });

  it("FAILURE MODE: rejects empty entity_ids array", () => {
    const r = schema.safeParse({
      domain: "mill",
      feature_group: "x", entity_ids: [],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("entity_ids"))).toBe(true);
    }
  });
});

describe("U-DB-BRIDGE-05 schema contract — feature_store_stats", () => {
  const schema = ACTION_INTELLIGENCE_SCHEMAS["feature_store_stats"];

  it("accepts an empty object (no params required)", () => {
    const r = schema.safeParse({});
    expect(r.success).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Round-trip: simulate exactly what the dispatcher inline-if handler does.
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-05 round-trip — engine + schema integration", () => {
  let store: FeatureStoreEngine;
  let dir: string;
  beforeEach(() => { ({ store, dir } = freshStore()); });

  it("put → query round-trips a feature row (mill domain, real values)", () => {
    // Step 1: dispatcher would receive these params + schema-validate.
    const putParams = {
      domain: "mill" as const,
      feature_group: "cutting_outcome",
      feature_group_version: "v1",
      entity_id: "job_42",
      event_ts: "2026-05-25T19:00:00.000Z",
      feature_values: { sfm: 1200, chipload_mm: 0.05, doc_mm: 2.0 },
    };
    const putSchema = ACTION_INTELLIGENCE_SCHEMAS["feature_store_put"];
    const putValid = putSchema.safeParse(putParams);
    expect(putValid.success).toBe(true);

    // Step 2: dispatcher calls store.put(params)
    const putResult = store.put(putParams);
    expect(putResult.ok).toBe(true);
    expect(putResult.row_id.length).toBeGreaterThan(0);
    expect(putResult.path).toContain("mill");
    expect(putResult.path).toContain("cutting_outcome");

    // Step 3: dispatcher would query later — same params shape.
    const queryParams = {
      domain: "mill" as const,
      feature_group: "cutting_outcome",
      feature_group_version: "v1",
      entity_ids: ["job_42"],
      as_of_ts: "2026-05-25T20:00:00.000Z",
    };
    const querySchema = ACTION_INTELLIGENCE_SCHEMAS["feature_store_query"];
    const queryValid = querySchema.safeParse(queryParams);
    expect(queryValid.success).toBe(true);

    const queryResult = store.getHistoricalFeatures(queryParams);
    expect(queryResult.rows.length).toBe(1);
    expect(queryResult.misses.length).toBe(0);
    expect(queryResult.rows[0].entity_id).toBe("job_42");
    expect(queryResult.rows[0].feature_values).toEqual({ sfm: 1200, chipload_mm: 0.05, doc_mm: 2.0 });
    expect(queryResult.rows[0].event_ts).toBe("2026-05-25T19:00:00.000Z");
  });

  it("POINT-IN-TIME invariant: query with as_of_ts BEFORE event_ts returns miss (no temporal leakage)", () => {
    store.put({
      domain: "mill",
      feature_group: "cutting_outcome",
      feature_group_version: "v1",
      entity_id: "job_99",
      event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: { sfm: 1500 },
    });
    // as_of is 1 hour BEFORE event_ts — training-at-T0 must not see future.
    const r = store.getHistoricalFeatures({
      domain: "mill",
      feature_group: "cutting_outcome",
      feature_group_version: "v1",
      entity_ids: ["job_99"],
      as_of_ts: "2026-05-25T19:00:00.000Z",
    });
    expect(r.rows.length).toBe(0);
    expect(r.misses).toEqual(["job_99"]);
  });

  it("missing entity → appears in misses[]", () => {
    const r = store.getHistoricalFeatures({
      domain: "lathe",
      feature_group: "css_outcome",
      feature_group_version: "v1",
      entity_ids: ["never_existed"],
      as_of_ts: "2026-05-25T20:00:00.000Z",
    });
    expect(r.rows.length).toBe(0);
    expect(r.misses).toEqual(["never_existed"]);
  });

  it("stats() returns groups + row counts after put (observability path)", () => {
    store.put({
      domain: "wedm",
      feature_group: "skim_outcome",
      feature_group_version: "v1",
      entity_id: "wedm_1",
      event_ts: "2026-05-25T20:00:00.000Z",
      feature_values: { skim_count: 3 },
    });
    const stats = store.stats();
    expect(stats.root_dir).toBe(dir);
    expect(Array.isArray(stats.groups)).toBe(true);
    expect(stats.groups.length).toBe(1);
    const wedm = stats.groups[0];
    expect(wedm.domain).toBe("wedm");
    expect(wedm.feature_group).toBe("skim_outcome");
    expect(wedm.feature_group_version).toBe("v1");
    expect(wedm.row_count).toBe(1);
    expect(wedm.bytes).toBeGreaterThan(0);
  });

  it("multi-version: feature_group_version v1 + v2 land in separate shards", () => {
    const base = {
      domain: "cam" as const,
      feature_group: "toolpath_outcome",
      entity_id: "tp_001",
      event_ts: "2026-05-25T20:00:00.000Z",
    };
    store.put({ ...base, feature_group_version: "v1", feature_values: { schemaA: 1 } });
    store.put({ ...base, feature_group_version: "v2", feature_values: { schemaB: 2 } });
    const stats = store.stats();
    const versions = stats.groups
      .filter((g) => g.feature_group === "toolpath_outcome")
      .map((g) => g.feature_group_version)
      .sort();
    expect(versions).toEqual(["v1", "v2"]);
  });
});

// ----------------------------------------------------------------------------
// Anti-regression: action enum membership (the wiring map).
// ----------------------------------------------------------------------------

describe("U-DB-BRIDGE-05 wiring anti-regression", () => {
  it("all 3 actions parse a representative input via the action schema map", () => {
    const queryR = ACTION_INTELLIGENCE_SCHEMAS["feature_store_query"].safeParse({
      domain: "mill", feature_group: "g", entity_ids: ["e1"],
    });
    const putR = ACTION_INTELLIGENCE_SCHEMAS["feature_store_put"].safeParse({
      domain: "mill", feature_group: "g", entity_id: "e1",
      event_ts: "2026-05-25T20:00:00.000Z", feature_values: { k: 1 },
    });
    const statsR = ACTION_INTELLIGENCE_SCHEMAS["feature_store_stats"].safeParse({});
    expect(queryR.success).toBe(true);
    expect(putR.success).toBe(true);
    expect(statsR.success).toBe(true);
  });
});
