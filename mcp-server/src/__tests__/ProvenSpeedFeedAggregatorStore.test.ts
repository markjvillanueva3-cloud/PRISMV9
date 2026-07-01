/**
 * ProvenSpeedFeedAggregatorEngine -- persistence / load-at-init tests
 * U-SFC-PROVEN-PIPELINE-ACTIVATE (slot:oscar)
 *
 * Verifies the persistence layer that makes the orchestrator's proven-blend live
 * in the MCP server: serialize/hydrate round-trip preserves REAL aggregated
 * parameters, fail-soft on absent/corrupt/schema-mismatch, and lazy load-at-init
 * hydrates from disk on first read without an explicit load call.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ProvenSpeedFeedAggregatorEngine,
  type ProvenSpeedFeedStore,
} from "../engines/ProvenSpeedFeedAggregatorEngine.js";
import type { DetailedSpeedFeed } from "../engines/OkumaOSPParserEngine.js";
import type { ChipLoadSample } from "../engines/MillPatternMinerEngine.js";

/** Build N realistic Okuma lathe OD-finishing samples (tool_steel, css ~140 m/min). */
function makeSamples(n: number, baseCss = 140): DetailedSpeedFeed[] {
  const out: DetailedSpeedFeed[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      filePath: `JOB-${i}.MIN`,
      toolSection: `T01${i}`,
      toolNumber: 1,
      offsetNumber: 1,
      operationDescription: "",
      operationType: "od_finish",
      cssSpeed: baseCss + (i % 5) - 2, // small spread -> low CV
      maxRPM: 3000,
      feedRates: [{ value: 0.006 + i * 0.0001, gcode: "G1", line: 10 + i, context: "finishing" }],
      feedMode: "per_rev",
      hasCannedCycle: false,
    });
  }
  return out;
}

const tmpFiles: string[] = [];
function tmpStorePath(): string {
  const p = path.join(os.tmpdir(), `proven-sf-store-${process.pid}-${tmpFiles.length}.json`);
  tmpFiles.push(p);
  return p;
}

afterEach(() => {
  for (const f of tmpFiles.splice(0)) {
    try {
      if (fs.existsSync(f)) fs.rmSync(f);
    } catch {
      /* best-effort cleanup */
    }
  }
  delete process.env.PRISM_PROVEN_SF_STORE;
  delete process.env.PRISM_PROVEN_SF_NO_HYDRATE;
});

describe("ProvenSpeedFeedAggregatorEngine persistence", () => {
  it("serialize -> hydrate round-trips a REAL aggregated parameter (not a stub)", () => {
    const src = new ProvenSpeedFeedAggregatorEngine();
    src.aggregateLatheData(makeSamples(6));
    const store = src.serialize({ source: "test", totalPrograms: 6, totalSamples: 6 });

    expect(store.schemaVersion).toBe(ProvenSpeedFeedAggregatorEngine.STORE_SCHEMA_VERSION);
    expect(store.params.length).toBeGreaterThan(0);
    const odFinish = store.params.find(
      (p) => p.materialGroup === "tool_steel" && p.operationCategory === "od_finishing",
    );
    expect(odFinish?.materialGroup).toBe("tool_steel");
    expect(odFinish?.operationCategory).toBe("od_finishing");
    // The aggregated CSS median must reflect the ~140 input, not a placeholder.
    expect(odFinish!.cssSpeed!.median).toBeGreaterThan(135);
    expect(odFinish!.cssSpeed!.median).toBeLessThan(145);

    const dest = new ProvenSpeedFeedAggregatorEngine();
    const res = dest.hydrate(store);
    expect(res.loaded).toBe(store.params.length);
    expect(res.skipped).toBe(0);

    const got = dest.getProvenParams("tool_steel", "od_finishing");
    expect(got?.operationCategory).toBe("od_finishing");
    expect(got!.cssSpeed!.median).toBeCloseTo(odFinish!.cssSpeed!.median, 3);
    expect(got!.sampleCount).toBe(odFinish!.sampleCount);
  });

  it("hydrate REJECTS a schema-version mismatch (fail-soft, loads nothing)", () => {
    const eng = new ProvenSpeedFeedAggregatorEngine();
    const bad: ProvenSpeedFeedStore = {
      schemaVersion: "0.0.0-legacy",
      generatedAt: new Date().toISOString(),
      source: "test",
      totalPrograms: 1,
      totalSamples: 3,
      params: [
        {
          id: "tool_steel:od_finishing:lathe",
          materialGroup: "tool_steel",
          operationCategory: "od_finishing",
          toolType: "lathe_tool",
          sampleCount: 3,
          cssSpeed: null,
          directRPM: null,
          maxRPM: null,
          feedRate: null,
          chipLoad: null,
          sources: [],
          customers: [],
          confidence: 0.5,
          updatedAt: new Date().toISOString(),
        },
      ],
    };
    const res = eng.hydrate(bad);
    expect(res.loaded).toBe(0);
    expect(res.skipped).toBe(1);
    expect(res.reason).toContain("schema-mismatch");
    expect(eng.getProvenParams("tool_steel", "od_finishing")).toBeNull();
  });

  it("hydrate SKIPS malformed entries but loads valid ones", () => {
    const src = new ProvenSpeedFeedAggregatorEngine();
    src.aggregateLatheData(makeSamples(6));
    const store = src.serialize();
    const validCount = store.params.length;
    // Inject two malformed entries (missing id / null).
    (store.params as unknown[]).push({ operationCategory: "facing" }, null);

    const dest = new ProvenSpeedFeedAggregatorEngine();
    const res = dest.hydrate(store);
    expect(res.loaded).toBe(validCount);
    expect(res.skipped).toBe(2);
  });

  it("persistToStore -> loadFromStore round-trips through real disk I/O", () => {
    const file = tmpStorePath();
    const src = new ProvenSpeedFeedAggregatorEngine();
    src.aggregateLatheData(makeSamples(8));
    const persisted = src.persistToStore(file, { source: "test", totalPrograms: 8, totalSamples: 8 });
    expect(fs.existsSync(file)).toBe(true);
    expect(persisted.params).toBeGreaterThan(0);

    const dest = new ProvenSpeedFeedAggregatorEngine();
    const res = dest.loadFromStore(file);
    expect(res.ok).toBe(true);
    expect(res.loaded).toBe(persisted.params);
    const got = dest.getProvenParams("tool_steel", "od_finishing");
    expect(got?.operationCategory).toBe("od_finishing");
    expect(got!.cssSpeed!.median).toBeGreaterThan(135);
  });

  it("loadFromStore reports absent file fail-soft (ok:false, reason absent, no throw)", () => {
    const eng = new ProvenSpeedFeedAggregatorEngine();
    const res = eng.loadFromStore(path.join(os.tmpdir(), `definitely-missing-${process.pid}.json`));
    expect(res.ok).toBe(false);
    expect(res.reason).toBe("absent");
    expect(res.loaded).toBe(0);
  });

  it("loadFromStore is fail-soft on corrupt JSON (distinguished from absent, no throw)", () => {
    const file = tmpStorePath();
    fs.writeFileSync(file, "{ this is : not json ]", "utf-8");
    const eng = new ProvenSpeedFeedAggregatorEngine();
    const res = eng.loadFromStore(file);
    expect(res.ok).toBe(false);
    expect(res.loaded).toBe(0);
    // A corrupt store is a distinct failure mode from an absent one.
    expect(res.reason).not.toBe("absent");
    expect(eng.getProvenParams("tool_steel", "od_finishing")).toBeNull();
  });

  it("LOAD-AT-INIT: first read lazily hydrates from PRISM_PROVEN_SF_STORE with no explicit load", () => {
    const file = tmpStorePath();
    const src = new ProvenSpeedFeedAggregatorEngine();
    src.aggregateLatheData(makeSamples(10));
    src.persistToStore(file);

    // A fresh engine, pointed at the store via env, must hydrate on first read.
    process.env.PRISM_PROVEN_SF_STORE = file;
    const live = new ProvenSpeedFeedAggregatorEngine();
    const got = live.getProvenParams("tool_steel", "od_finishing");
    expect(got?.operationCategory).toBe("od_finishing");
    expect(got!.cssSpeed!.median).toBeGreaterThan(135);
  });

  it("PRISM_PROVEN_SF_NO_HYDRATE=1 disables load-at-init", () => {
    const file = tmpStorePath();
    const src = new ProvenSpeedFeedAggregatorEngine();
    src.aggregateLatheData(makeSamples(10));
    src.persistToStore(file);

    process.env.PRISM_PROVEN_SF_STORE = file;
    process.env.PRISM_PROVEN_SF_NO_HYDRATE = "1";
    const live = new ProvenSpeedFeedAggregatorEngine();
    expect(live.getProvenParams("tool_steel", "od_finishing")).toBeNull();
  });

  it("aggregateMillData round-trips a :mill param through serialize/hydrate (distinct from :lathe keys)", () => {
    const src = new ProvenSpeedFeedAggregatorEngine();
    const mill: ChipLoadSample[] = Array.from({ length: 4 }, (_, i) => ({
      program: `MILLJOB-${i}.nc`,
      tool_number: 3,
      tool_desc: "1/2 endmill",
      diameter_mm: 12.7,
      flute_count: 4,
      rpm: 5000 + i * 10,
      feed_rate: 40 + i,
      chip_load: 0.05 + i * 0.001,
      operation: "roughing",
    }));
    src.aggregateMillData(mill);
    const direct = src.getProvenParams("tool_steel", "milling_roughing");
    expect(direct?.operationCategory).toBe("milling_roughing");
    expect(direct!.sampleCount).toBe(4);

    const store = src.serialize();
    const dest = new ProvenSpeedFeedAggregatorEngine();
    expect(dest.hydrate(store).loaded).toBe(store.params.length);
    const got = dest.getProvenParams("tool_steel", "milling_roughing");
    expect(got?.operationCategory).toBe("milling_roughing");
    expect(got!.sampleCount).toBe(4);
  });
});
