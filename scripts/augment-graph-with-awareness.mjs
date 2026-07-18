#!/usr/bin/env node
/**
 * augment-graph-with-awareness.mjs
 *
 * One-shot augmenter for the PRISM system-viz graph. Reads the live graph,
 * SVI watch status, BUILD_STATE, and BASELINE_INVENTORY, then computes per-node
 * awareness metrics:
 *   - svi          — global SVI psi (or domain-matched override if available)
 *   - testCount    — vitest *.test.ts files matching domain (cap 200/domain)
 *   - complexity   — testCount * (1 - wired_ratio) for L5; total/wired heuristic for L4/L7
 *   - coverage     — wired/total for L5; action_count_for_dispatcher / mean for L4
 *   - actionCount  — dispatcher action enum length (L4)
 *   - registryEntries — top-level entry count (L7)
 *
 * Pure Node ESM. Defensive against missing source files.
 *
 * Output: H:/prism/state/shared/system-viz/awareness-augmentation.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { readGraphStreaming } from './lib/graph-io.mjs';

const ROOT = 'H:/prism';
const GRAPH_PATH = path.join(ROOT, 'state/shared/system-viz/system-graph.json');
const SVI_PATH = path.join(ROOT, 'state/shared/SVI-watch-status.json');
const BUILD_STATE_PATH = path.join(ROOT, 'state/shared/BUILD_STATE.json');
const BASELINE_PATH = path.join(ROOT, 'mcp-server/data/state/BASELINE_INVENTORY.json');
const TESTS_DIR = path.join(ROOT, 'mcp-server/src/__tests__');
const DISP_DIR = path.join(ROOT, 'mcp-server/src/tools/dispatchers');
const REG_DIR = path.join(ROOT, 'mcp-server/src/registries');
const OUT_PATH = path.join(ROOT, 'state/shared/system-viz/awareness-augmentation.json');

const TEST_CAP_PER_DOMAIN = 200;

function readJsonSafe(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.warn(`[warn] Could not read ${p}: ${e.message}`);
    return fallback;
  }
}

function readDirSafe(p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function readFileSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '';
  }
}

// Resolve global SVI psi from watch-status. Field shape varies across versions:
//   - svi_psi (canonical)
//   - psi
//   - watch_targets (proxy: count-based heuristic) — last resort fallback
function resolveSviPsi(svi) {
  if (!svi || typeof svi !== 'object') return 0.5;
  if (typeof svi.svi_psi === 'number') return svi.svi_psi;
  if (typeof svi.psi === 'number') return svi.psi;
  if (svi.metrics && typeof svi.metrics.psi === 'number') return svi.metrics.psi;
  // Fallback: derive from coverage_alerts presence (no alerts ≈ stable ≈ 0.875)
  const alerts = Array.isArray(svi.coverage_alerts) ? svi.coverage_alerts.length : 0;
  if (alerts === 0 && svi.active) return 0.875;
  return Math.max(0, Math.min(1, 1 - alerts * 0.05));
}

// Build domain-keyed override map from coverage_alerts if present.
function resolveDomainSviOverrides(svi) {
  const overrides = {};
  if (!svi || !Array.isArray(svi.coverage_alerts)) return overrides;
  for (const a of svi.coverage_alerts) {
    if (a && typeof a === 'object' && typeof a.domain === 'string' && typeof a.psi === 'number') {
      overrides[a.domain.toLowerCase()] = a.psi;
    }
  }
  return overrides;
}

// Count test files whose filename contains the domain token (case-insensitive).
function countTestsForDomain(domain, testFiles) {
  if (!domain) return 0;
  const needle = domain.toLowerCase();
  let n = 0;
  for (const f of testFiles) {
    if (f.toLowerCase().includes(needle)) {
      n++;
      if (n >= TEST_CAP_PER_DOMAIN) break;
    }
  }
  return n;
}

// Parse dispatcher file and return the size of its primary action enum.
// Strategy: find `const ACTIONS = [...]` (the conventional name) — fall back to
// the first `z.enum([...])` literal if no ACTIONS constant.
function parseDispatcherActions(filePath) {
  const src = readFileSafe(filePath);
  if (!src) return 0;
  // Conventional `const ACTIONS = [ ... ] as const;`
  const actionsMatch = src.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
  if (actionsMatch) {
    return countStringLiterals(actionsMatch[1]);
  }
  // Fallback: any `z.enum([ ... ])` literal
  const enumMatch = src.match(/z\.enum\(\s*\[([\s\S]*?)\]\s*\)/);
  if (enumMatch) {
    return countStringLiterals(enumMatch[1]);
  }
  return 0;
}

function countStringLiterals(body) {
  // Count "..." or '...' literals; ignore comments.
  const stripped = body
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\\[^\n]*/g, ''); // shop-style "\ comment" lines (seen in adaptiveControlDispatcher)
  const matches = stripped.match(/(["'])(?:(?!\1).)*\1/g);
  return matches ? matches.length : 0;
}

// Heuristic registry entry count: count occurrences of `id:` / `name:` properties
// at any depth in the source. We accept either as a one-per-entry signal; we then
// take the larger of the two on the assumption that registries always carry one.
function parseRegistryEntries(filePath) {
  const src = readFileSafe(filePath);
  if (!src) return 0;
  // Strip comments + string literals to avoid false positives in docstrings.
  const cleaned = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const idHits = (cleaned.match(/\bid\s*:/g) || []).length;
  const nameHits = (cleaned.match(/\bname\s*:/g) || []).length;
  const agentIdHits = (cleaned.match(/\bagent_id\s*:/g) || []).length;
  // Subtract interface-declaration "id:" hits by checking for `interface`/`type` blocks
  // is overkill — instead trust the maximum, capped sensibly.
  return Math.max(idHits, nameHits, agentIdHits);
}

// Build dispatcher-file lookup: dispatcher node id `disp.foodispatcher` → file
function findDispatcherFile(nodeId, dispFiles) {
  // Strip 'disp.' prefix; node ids are lowercase concatenations e.g. 'disp.adaptivecontroldispatcher'
  const baseId = nodeId.replace(/^disp\./, '').toLowerCase();
  for (const f of dispFiles) {
    if (f.toLowerCase() === baseId + '.ts') return path.join(DISP_DIR, f);
  }
  // Fuzzy fallback: dispatcher label match (e.g. 'adaptiveControl' from L4 label)
  return null;
}

function findRegistryFile(nodeId, regFiles) {
  // node id: 'reg.aisubsystemregistry' → 'AISubsystemRegistry.ts' (case-insensitive)
  const baseId = nodeId.replace(/^reg\./, '').toLowerCase();
  for (const f of regFiles) {
    if (f.toLowerCase() === baseId + '.ts') return path.join(REG_DIR, f);
  }
  return null;
}

// Domain-aware wired/total lookup. BUILD_STATE.NEEDS_WIRING.top_domains gives us
// counts of unwired engines per domain. BASELINE_INVENTORY gives total engines but
// not per-domain. We use the L5 graph node's `count` as the wired count, plus the
// BUILD_STATE unwired count to derive a total.
function buildDomainStats(buildState) {
  const stats = {};
  const top = buildState?.NEEDS_WIRING?.top_domains || [];
  for (const t of top) {
    if (t && typeof t.domain === 'string') {
      stats[t.domain.toLowerCase()] = { unwired: t.count || 0 };
    }
  }
  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

function main() {
  // system-graph.json is >512MiB; readJsonSafe's JSON.parse(readFileSync utf8) hits V8's max
  // string length ("Cannot create a string longer than 0x1fffffe8", exit 1). readGraphStreaming
  // reads it as a Buffer + parses incrementally -- the established bypass (scripts/lib/graph-io.mjs,
  // same reader merge-augmentations uses). U-VIZ-AWARENESS-BIZVAL-STREAMING-FIX (sierra 2026-06-22).
  let graph;
  try {
    graph = readGraphStreaming(GRAPH_PATH);
  } catch (e) {
    console.error(`[fatal] system-graph.json unreadable at ${GRAPH_PATH}: ${e.message}`);
    process.exit(1);
  }
  if (!graph || !Array.isArray(graph.nodes)) {
    console.error(`[fatal] system-graph.json missing or malformed at ${GRAPH_PATH}`);
    process.exit(1);
  }
  const svi = readJsonSafe(SVI_PATH, {});
  const buildState = readJsonSafe(BUILD_STATE_PATH, {});
  const baseline = readJsonSafe(BASELINE_PATH, {});

  const sviPsi = resolveSviPsi(svi);
  const sviOverrides = resolveDomainSviOverrides(svi);
  const domainStats = buildDomainStats(buildState);

  // Pre-list test files once.
  const testFiles = readDirSafe(TESTS_DIR).filter((f) => f.endsWith('.test.ts'));
  const dispFiles = readDirSafe(DISP_DIR).filter((f) => f.endsWith('.ts'));
  const regFiles = readDirSafe(REG_DIR).filter((f) => f.endsWith('.ts'));

  // Cache dispatcher action counts (mean is used as L4 coverage normalizer).
  const dispActionCounts = {};
  for (const f of dispFiles) {
    dispActionCounts[f] = parseDispatcherActions(path.join(DISP_DIR, f));
  }
  const dispCountValues = Object.values(dispActionCounts).filter((n) => n > 0);
  const meanDispActions = dispCountValues.length
    ? dispCountValues.reduce((a, b) => a + b, 0) / dispCountValues.length
    : 1;

  const augmentations = {};
  let coverageSum = 0;
  let coverageNodes = 0;

  for (const node of graph.nodes) {
    const aug = {
      svi: sviPsi,
      testCount: 0,
      complexity: 0,
      coverage: 0,
      actionCount: 0,
      registryEntries: 0,
    };

    // Domain-matched SVI override.
    if (node.domain && sviOverrides[String(node.domain).toLowerCase()] != null) {
      aug.svi = sviOverrides[String(node.domain).toLowerCase()];
    }

    if (node.layer === 'L5') {
      // Engine domain cluster.
      const domain = node.domain || node.label?.split('\n')[0] || '';
      aug.testCount = countTestsForDomain(domain, testFiles);
      const wiredCount = typeof node.count === 'number' ? node.count : 0;
      const unwired = domainStats[domain.toLowerCase()]?.unwired || 0;
      const total = wiredCount + unwired;
      const wiredRatio = total > 0 ? wiredCount / total : (node.subgroup === 'wired' ? 1 : 0);
      aug.coverage = Number(wiredRatio.toFixed(4));
      aug.complexity = Number((aug.testCount * (1 - wiredRatio)).toFixed(2));
      coverageSum += wiredRatio;
      coverageNodes++;
    } else if (node.layer === 'L4') {
      // Dispatcher.
      const file = findDispatcherFile(node.id, dispFiles);
      if (file) {
        const fname = path.basename(file);
        aug.actionCount = dispActionCounts[fname] || parseDispatcherActions(file);
      }
      // Coverage = action count normalized to mean.
      aug.coverage = meanDispActions > 0
        ? Number(Math.min(1, aug.actionCount / (meanDispActions * 2)).toFixed(4))
        : 0;
      // Complexity ≈ action count (more actions = more surface).
      aug.complexity = aug.actionCount;
    } else if (node.layer === 'L7') {
      // Registry.
      const file = findRegistryFile(node.id, regFiles);
      if (file) {
        aug.registryEntries = parseRegistryEntries(file);
      }
      aug.complexity = aug.registryEntries;
      aug.coverage = aug.registryEntries > 0 ? 1 : 0;
    } else {
      // L0-L3, L6, L8, L9 — global SVI only; structural metrics zero.
      aug.coverage = node.status === 'built' ? 1 : 0;
    }

    augmentations[node.id] = aug;
  }

  const out = {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    sources: {
      graph: GRAPH_PATH,
      svi: SVI_PATH,
      buildState: BUILD_STATE_PATH,
      baseline: BASELINE_PATH,
    },
    sviPsi,
    sviOverrides,
    augmentations,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  const meanCov = coverageNodes > 0 ? (coverageSum / coverageNodes) * 100 : 0;
  const total = Object.keys(augmentations).length;
  console.log(
    `augmented ${total} nodes with awareness data; svi_psi=${sviPsi.toFixed(3)}, mean_coverage=${meanCov.toFixed(1)}%`
  );
}

main();
