/**
 * MILL-MASTER-AI-WIRING / U0-BASELINE — baseline capture + JSON emission
 *
 * Invokes each legacy-path method SAMPLE_COUNT times after WARMUP_COUNT
 * warmups, records p50/p95/p99/mean/stddev + output schema hash, and
 * writes the authoritative baseline JSON consumed by U1..U14 regression
 * checks.
 *
 * @envelope mcp-server/data/milestones/MILL-MASTER-AI-WIRING.json (U0-BASELINE)
 * @output   mcp-server/data/benchmarks/mill-master-ai-wiring-baseline.json
 */

import { describe, test, expect } from "vitest";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  INVOCATIONS,
  EXPECTED_UNITS,
  SAMPLE_COUNT,
  WARMUP_COUNT,
  USEAI_ON_HARD_CEILING_MS,
  capture,
  type CapturedEntry,
} from "./MillMasterAIWiringBaselineFixtures.js";

const OUT_FILE = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../data/benchmarks/mill-master-ai-wiring-baseline.json",
);

describe("MILL-MASTER-AI-WIRING / U0-BASELINE", () => {
  test("captures legacy-path baseline for all 13 engines and writes baseline JSON", () => {
    expect(INVOCATIONS).toHaveLength(13);

    const entries: Record<string, CapturedEntry> = {};
    for (const inv of INVOCATIONS) {
      entries[`${inv.engine_id}::${inv.method}`] = capture(inv);
    }

    mkdirSync(dirname(OUT_FILE), { recursive: true });
    writeFileSync(
      OUT_FILE,
      JSON.stringify(
        {
          version: "1",
          captured_at: new Date().toISOString(),
          node_version: process.version,
          platform: process.platform,
          sample_count: SAMPLE_COUNT,
          warmup_count: WARMUP_COUNT,
          entry_count: Object.keys(entries).length,
          entries,
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const [key, entry] of Object.entries(entries)) {
      expect(entry.engine_id.length, `${key} engine_id`).toBeGreaterThan(0);
      expect(entry.method.length, `${key} method`).toBeGreaterThan(0);
      expect(["ok", "unbaselineable"], `${key} status`).toContain(entry.status);
      if (entry.status === "ok") {
        expect(entry.p50_ms, `${key} p50`).not.toBeNull();
        expect(entry.p95_ms, `${key} p95`).not.toBeNull();
        expect(entry.p95_ms!).toBeGreaterThanOrEqual(entry.p50_ms!);
        expect(entry.p99_ms!).toBeGreaterThanOrEqual(entry.p95_ms!);
        expect(entry.output_schema_hash, `${key} hash`).not.toBeNull();
        expect(entry.p95_ms!).toBeLessThan(USEAI_ON_HARD_CEILING_MS);
      }
    }
  });

  test("baseline covers every unit U1..U14 that wires an engine", () => {
    const seen = new Set(INVOCATIONS.map((i) => i.unit));
    for (const u of EXPECTED_UNITS) {
      expect(seen.has(u), `missing baseline for ${u}`).toBe(true);
    }
    expect(seen.size).toBe(EXPECTED_UNITS.length);
  });
});
