#!/usr/bin/env node
// tier: T4
/**
 * publish-pipeline-metrics.mjs (CPP-MS5-U-CPP37)
 *
 * Publishes per-session context-pipeline metrics to
 * state/shared/PIPELINE_METRICS.json by scanning the artifact filesystem and
 * running the same math as PipelineMetricsEngine. Used for regression
 * detection: watchers can grep for rising `emptyFileRate`, ballooning
 * `survivalBytes.total`, or stuck `handoffRoundtripMs`.
 *
 * Inputs it reads:
 *   - .claude/helpers/.compaction-survival-*.md (per-instance + legacy)
 *   - state/shared/handoffs/HANDOFF-*.md
 *   - state/shared/PIPELINE_INTEGRITY.json (U-CPP34 output)
 *
 * Output shape matches PipelineMetricsEngine.PipelineMetricsOutput exactly.
 * The .mjs runtime can't import TypeScript, so the `collect` math is mirrored
 * inline here; drift is guarded by the integration test which re-runs the
 * engine's authoritative method against identical inputs and asserts parity.
 *
 * Invoked by: SessionStart (additive hook — never blocks).
 *
 * @milestone CPP-MS5-U-CPP37
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";

const SURVIVAL_DIR = "H:\\prism\\.claude\\helpers";
const SURVIVAL_PREFIX = ".compaction-survival";
const HANDOFFS_DIR = "H:\\prism\\state\\shared\\handoffs";
const INTEGRITY_PATH = "H:\\prism\\state\\shared\\PIPELINE_INTEGRITY.json";
const OUTPUT_PATH = "H:\\prism\\state\\shared\\PIPELINE_METRICS.json";

/**
 * Inline mirror of PipelineMetricsEngine.collect(). Keep this logic identical
 * to mcp-server/src/engines/PipelineMetricsEngine.ts — the integration test
 * spawns this hook then re-runs the engine against identical inputs to verify
 * parity. If the shapes drift, that test fails.
 */
function collect(input) {
  const survivalBytes = computeSurvivalBytes(input.survivalFiles);
  const handoffRoundtripMs = computeHandoffRoundtrip(input.handoffFiles);
  const emptyCount = input.integrityLinks.filter((l) => l.empty).length;
  const total = input.integrityLinks.length;
  const emptyFileRate = total === 0 ? 0 : emptyCount / total;

  return {
    schemaVersion: 1,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    compactionCount: input.survivalFiles.length,
    survivalBytes,
    handoffRoundtripMs,
    handoffCount: input.handoffFiles.length,
    emptyFileRate: Math.round(emptyFileRate * 10000) / 10000,
    emptyLinkCount: emptyCount,
    totalLinkCount: total,
  };
}

function computeSurvivalBytes(files) {
  if (files.length === 0) return { count: 0, total: 0, max: 0, min: 0, avg: 0 };
  const sizes = files.map((f) => f.bytes);
  const total = sizes.reduce((a, b) => a + b, 0);
  return {
    count: files.length,
    total,
    max: Math.max(...sizes),
    min: Math.min(...sizes),
    avg: Math.round(total / files.length),
  };
}

function computeHandoffRoundtrip(files) {
  if (files.length < 2) return 0;
  const mtimes = files.map((f) => f.mtimeMs);
  return Math.max(...mtimes) - Math.min(...mtimes);
}

async function statAll(dir, filter) {
  try {
    const entries = await fs.readdir(dir);
    const out = [];
    for (const name of entries) {
      if (!filter(name)) continue;
      const fp = path.join(dir, name);
      try {
        const st = await fs.stat(fp);
        if (st.isFile()) out.push({ path: fp, bytes: st.size, mtimeMs: st.mtimeMs });
      } catch { /* unreadable */ }
    }
    return out;
  } catch {
    return [];
  }
}

async function readIntegrityLinks() {
  try {
    const raw = await fs.readFile(INTEGRITY_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.links)) return [];
    return parsed.links.map((l) => ({ stage: String(l.stage ?? ""), empty: Boolean(l.empty) }));
  } catch {
    return [];
  }
}

async function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, filePath);
}

async function main() {
  const [survivalFiles, handoffFiles, integrityLinks] = await Promise.all([
    statAll(SURVIVAL_DIR, (n) => n.startsWith(SURVIVAL_PREFIX) && n.endsWith(".md")),
    statAll(HANDOFFS_DIR, (n) => n.startsWith("HANDOFF-") && n.endsWith(".md")),
    readIntegrityLinks(),
  ]);

  const output = collect({ survivalFiles, handoffFiles, integrityLinks });

  try {
    await atomicWrite(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`[pipeline-metrics] write failed: ${e?.message || e}\n`);
  }

  process.stdout.write(
    `[pipeline-metrics] compact=${output.compactionCount} survival=${output.survivalBytes.total}b ` +
      `empty_rate=${output.emptyFileRate} handoff_rt=${output.handoffRoundtripMs}ms\n`,
  );
}

main().catch((e) => {
  process.stderr.write(`[pipeline-metrics] fatal: ${e?.message || e}\n`);
  process.exit(0); // never block SessionStart
});
