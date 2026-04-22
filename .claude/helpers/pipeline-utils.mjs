/**
 * pipeline-utils.mjs — Shared utilities for context-pipeline hooks
 *
 * Extracted from CPP-MS5 hooks (U-CPP34, U-CPP36, U-CPP37) to reduce
 * duplication. These pure functions mirror engine logic but live in .mjs
 * so hooks can import them without TypeScript transpilation.
 *
 * Parity with TypeScript engines is enforced by integration tests:
 * - publish-pipeline-metrics.integration.test.ts
 * - post-pipeline-integrity-check.integration.test.ts
 *
 * @milestone CPP-MS2-U-CPP11 (hook refactor)
 */

import { promises as fs } from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

/**
 * Atomic write via tmp + rename pattern.
 * Mirrors src/utils/atomicWrite.ts behavior.
 */
export async function atomicWrite(filePath, data) {
  const tmp = `${filePath}.tmp-${process.pid}`;
  await fs.writeFile(tmp, data, "utf8");
  await fs.rename(tmp, filePath);
}

/**
 * Read file contents or return empty string on error.
 */
export async function readOrEmpty(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

/**
 * Stat all files in directory matching filter predicate.
 * Returns array of { path, bytes, mtimeMs }.
 */
export async function statAll(dir, filter) {
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

/**
 * Find freshest file in directory matching prefix.
 * Returns path or null.
 */
export async function findFreshestMatching(dir, prefix) {
  try {
    const entries = await fs.readdir(dir);
    const candidates = [];
    for (const name of entries) {
      if (!name.startsWith(prefix)) continue;
      const fp = path.join(dir, name);
      try {
        const st = await fs.stat(fp);
        candidates.push({ path: fp, mtime: st.mtimeMs });
      } catch { /* skip unreadable */ }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.mtime - a.mtime);
    return candidates[0].path;
  } catch {
    return null;
  }
}

/**
 * SHA-256 hex hash of input string.
 */
export function sha256Hex(input) {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

// ============================================================================
// PipelineMetricsEngine mirrors (parity tested)
// ============================================================================

/**
 * Mirror of PipelineMetricsEngine.computeSurvivalBytes()
 */
export function computeSurvivalBytes(files) {
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

/**
 * Mirror of PipelineMetricsEngine.computeHandoffRoundtrip()
 */
export function computeHandoffRoundtrip(files) {
  if (files.length < 2) return 0;
  const mtimes = files.map((f) => f.mtimeMs);
  return Math.max(...mtimes) - Math.min(...mtimes);
}

/**
 * Mirror of PipelineMetricsEngine.collect()
 */
export function collectPipelineMetrics(input) {
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

// ============================================================================
// ContextIntegrityEngine mirrors (parity tested)
// ============================================================================

/**
 * Mirror of ContextIntegrityEngine.verifyChain()
 */
// ============================================================================
// ContextWindowMapEngine mirrors (parity tested)
// ============================================================================

/**
 * Estimate tokens from bytes (~4 bytes/token for English prose).
 */
export function estimateTokens(bytes) {
  return Math.round(bytes / 4);
}

/**
 * Mirror of ContextWindowMapEngine.chart() — generates ASCII bar chart.
 * Input: array of { type, path } sources to stat.
 * Returns: { chart, totalTokens, pct }
 */
export async function buildContextChart(sources, contextLimit = 200000) {
  const byType = {};
  let totalTokens = 0;

  for (const s of sources) {
    try {
      const st = await (await import("node:fs")).promises.stat(s.path);
      const tokens = estimateTokens(st.size);
      if (tokens <= 0) continue;
      const e = byType[s.type] ?? { count: 0, tokens: 0 };
      e.count++;
      e.tokens += tokens;
      byType[s.type] = e;
      totalTokens += tokens;
    } catch { /* missing file — skip */ }
  }

  if (totalTokens === 0) return { chart: "(no context sources visible)", totalTokens: 0, pct: 0 };

  const maxBar = 30;
  const entries = Object.entries(byType).sort((a, b) => b[1].tokens - a[1].tokens);
  const lines = [];
  for (const [type, data] of entries) {
    const ratio = data.tokens / totalTokens;
    const bar = "#".repeat(Math.round(ratio * maxBar));
    const pct = Math.round(ratio * 100);
    lines.push(
      type.padEnd(14) + " " + bar.padEnd(maxBar) + " " + pct + "% (" + data.tokens + " tok)",
    );
  }
  const utilization = Math.round((totalTokens / contextLimit) * 100);
  return { chart: lines.join("\n"), totalTokens, pct: utilization };
}

export function verifyChain(artifacts, hasher = sha256Hex) {
  const links = [];
  let priorHash = "";
  let firstEmptyAt = null;

  for (let i = 0; i < artifacts.length; i++) {
    const a = artifacts[i];
    const contents = a.contents ?? "";
    const lengthBytes = contents.length;
    const empty = contents.trim().length === 0;
    if (empty && firstEmptyAt === null) firstEmptyAt = i;

    const eventHash = hasher(priorHash + contents);
    links.push({
      stage: a.stage,
      path: a.path,
      eventHash,
      priorHash,
      lengthBytes,
      empty,
    });
    priorHash = eventHash;
  }

  const emptyCount = links.filter((l) => l.empty).length;
  const valid = emptyCount === 0 && links.length > 0;
  const score = Math.max(0, 100 - emptyCount * 10 - (valid ? 0 : 20));

  const summary = links.length === 0
    ? "chain empty (no artifacts supplied)"
    : valid
      ? `chain OK — ${links.length} links, all populated`
      : `chain BROKEN — ${emptyCount}/${links.length} artifact(s) empty (first at #${firstEmptyAt}: ${links[firstEmptyAt ?? 0].stage})`;

  return { valid, links, firstEmptyAt, score, summary };
}
