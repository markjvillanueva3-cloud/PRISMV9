/**
 * publish-pipeline-metrics.integration.test.ts — CPP-MS5-U-CPP37
 *
 * Guards against drift between the engine's `PipelineMetricsEngine.collect()`
 * and the hook's inline `collect()` mirror. Runs the hook, reads back
 * PIPELINE_METRICS.json, then reconstructs the inputs and re-computes via
 * the engine. The two outputs must agree on every numeric field — if the
 * hook math drifts, this fails.
 *
 * Also validates the schema-v1 shape + ISO timestamp + non-negative counts.
 *
 * @milestone CPP-MS5-U-CPP37
 */

import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { PipelineMetricsEngine } from "../engines/PipelineMetricsEngine.js";

const HOOK_PATH = "H:\\prism\\.claude\\hooks\\publish-pipeline-metrics.mjs";
const OUTPUT_PATH = "H:\\prism\\state\\shared\\PIPELINE_METRICS.json";
const SURVIVAL_DIR = "H:\\prism\\.claude\\helpers";
const HANDOFFS_DIR = "H:\\prism\\state\\shared\\handoffs";
const INTEGRITY_PATH = "H:\\prism\\state\\shared\\PIPELINE_INTEGRITY.json";

describe("publish-pipeline-metrics.mjs (CPP-MS5-U-CPP37)", () => {
  let output: Record<string, unknown>;

  beforeAll(async () => {
    const result = spawnSync("node", [HOOK_PATH], {
      encoding: "utf8",
      cwd: "H:\\prism",
      windowsHide: true,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\[pipeline-metrics\]/);
    const raw = await fs.readFile(OUTPUT_PATH, "utf8");
    output = JSON.parse(raw);
  });

  it("writes schemaVersion=1 JSON", () => {
    expect(output.schemaVersion).toBe(1);
  });

  it("capturedAt is ISO-8601", () => {
    expect(String(output.capturedAt)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("all numeric fields are non-negative", () => {
    expect(Number(output.compactionCount)).toBeGreaterThanOrEqual(0);
    expect(Number(output.handoffRoundtripMs)).toBeGreaterThanOrEqual(0);
    expect(Number(output.handoffCount)).toBeGreaterThanOrEqual(0);
    expect(Number(output.emptyFileRate)).toBeGreaterThanOrEqual(0);
    expect(Number(output.emptyFileRate)).toBeLessThanOrEqual(1);
    expect(Number(output.emptyLinkCount)).toBeGreaterThanOrEqual(0);
    expect(Number(output.totalLinkCount)).toBeGreaterThanOrEqual(0);
  });

  it("survivalBytes sub-block has count/total/max/min/avg with max>=min", () => {
    const sb = output.survivalBytes as Record<string, number>;
    expect(sb.count).toBeGreaterThanOrEqual(0);
    expect(sb.total).toBeGreaterThanOrEqual(0);
    expect(sb.max).toBeGreaterThanOrEqual(sb.min);
    if (sb.count > 0) {
      expect(sb.avg).toBeGreaterThanOrEqual(sb.min);
      expect(sb.avg).toBeLessThanOrEqual(sb.max);
    }
  });

  it("hook output matches engine.collect() for same live filesystem inputs", async () => {
    // Re-collect the same inputs the hook collected, run through engine.
    const surviveEntries = await fs.readdir(SURVIVAL_DIR);
    const survivalFiles: Array<{ path: string; bytes: number; mtimeMs: number }> = [];
    for (const name of surviveEntries) {
      if (!name.startsWith(".compaction-survival") || !name.endsWith(".md")) continue;
      const fp = path.join(SURVIVAL_DIR, name);
      const st = await fs.stat(fp);
      if (st.isFile()) {
        survivalFiles.push({ path: fp, bytes: st.size, mtimeMs: st.mtimeMs });
      }
    }

    let handoffFiles: Array<{ path: string; mtimeMs: number }> = [];
    try {
      const handEntries = await fs.readdir(HANDOFFS_DIR);
      for (const name of handEntries) {
        if (!name.startsWith("HANDOFF-") || !name.endsWith(".md")) continue;
        const fp = path.join(HANDOFFS_DIR, name);
        const st = await fs.stat(fp);
        if (st.isFile()) handoffFiles.push({ path: fp, mtimeMs: st.mtimeMs });
      }
    } catch { /* missing dir */ }

    const integrityRaw = await fs.readFile(INTEGRITY_PATH, "utf8");
    const integrityParsed = JSON.parse(integrityRaw);
    const integrityLinks = (integrityParsed.links ?? []).map((l: { stage: string; empty: boolean }) => ({
      stage: l.stage,
      empty: Boolean(l.empty),
    }));

    const engine = new PipelineMetricsEngine();
    const engineOut = engine.collect({
      survivalFiles,
      handoffFiles,
      integrityLinks,
      capturedAt: String(output.capturedAt),
    });

    // Compare field-by-field (capturedAt matches because we pinned it).
    expect(engineOut.schemaVersion).toBe(output.schemaVersion);
    expect(engineOut.compactionCount).toBe(output.compactionCount);
    expect(engineOut.handoffCount).toBe(output.handoffCount);
    expect(engineOut.handoffRoundtripMs).toBe(output.handoffRoundtripMs);
    expect(engineOut.emptyFileRate).toBe(output.emptyFileRate);
    expect(engineOut.emptyLinkCount).toBe(output.emptyLinkCount);
    expect(engineOut.totalLinkCount).toBe(output.totalLinkCount);
    expect(engineOut.survivalBytes).toEqual(output.survivalBytes);
  });

  it("compactionCount equals survivalBytes.count (both count the same files)", () => {
    expect(output.compactionCount).toBe((output.survivalBytes as { count: number }).count);
  });

  it("emptyLinkCount never exceeds totalLinkCount", () => {
    expect(Number(output.emptyLinkCount)).toBeLessThanOrEqual(Number(output.totalLinkCount));
  });
});
