/**
 * PRISM SystemSnapshotEngine — Ultra-Compact System Snapshots
 * ============================================================
 *
 * Generates token-efficient system snapshots by dynamically counting
 * filesystem artifacts (engines, dispatchers, tests, etc.) at runtime.
 * Replaces the 1000+ token SYSTEM_INVENTORY.md read with < 200 tokens.
 *
 * Methods:
 *   getCompactSnapshot()         — Single-line summary (< 200 chars)
 *   getLayeredSnapshot(depth)    — minimal/standard/full (50-500 tokens)
 *   getChangeSummary(since?)     — Git-based change detection
 *   getDriftReport()             — Live counts vs documented counts
 *
 * @version 1.0.0
 * @safety Read-only engine — no mutations, no side effects
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ============================================================================
// CONSTANTS
// ============================================================================

const PROJECT_ROOT = path.resolve(process.cwd());
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const ENGINES_DIR = path.join(SRC_DIR, 'engines');
const DISPATCHERS_DIR = path.join(SRC_DIR, 'tools', 'dispatchers');
const ALGORITHMS_DIR = path.join(SRC_DIR, 'algorithms');
const REGISTRIES_DIR = path.join(SRC_DIR, 'registries');
const HOOKS_DIR = path.join(SRC_DIR, 'hooks');
const TESTS_DIR = path.join(SRC_DIR, '__tests__');
const WEB_TESTS_DIR = path.join(PROJECT_ROOT, 'web', 'src', '__tests__');
const CAD_TESTS_DIR = path.join(PROJECT_ROOT, '..', 'cad-engine', 'tests');
const MILESTONES_DIR = path.join(PROJECT_ROOT, 'data', 'milestones');
const INVENTORY_PATH = path.join(PROJECT_ROOT, 'data', 'docs', 'SYSTEM_INVENTORY.md');

// ============================================================================
// TYPES
// ============================================================================

export type SnapshotDepth = 'minimal' | 'standard' | 'full';

export interface LiveCounts {
  engines: number;
  dispatchers: number;
  algorithms: number;
  registries: number;
  hooks: number;
  testFiles: number;
  milestones: number;
  webTestFiles: number;
  cadTestFiles: number;
}

export interface DocumentedCounts {
  engines: number;
  dispatchers: number;
  algorithms: number;
  registries: number;
  hooks: number;
  testFiles: number;
  milestones: number;
  actions: number;
}

export interface DriftEntry {
  category: string;
  live: number;
  documented: number;
  delta: number;
  status: 'ok' | 'drift' | 'major_drift';
}

export interface DriftReport {
  timestamp: string;
  entries: DriftEntry[];
  overallStatus: 'ok' | 'drift' | 'major_drift';
  summary: string;
}

export interface ChangeSummary {
  since: string;
  commits: number;
  files: string[];
  summary: string;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Count .ts files in a directory (non-recursive, excludes index.ts) */
function countTsFiles(dir: string, excludeIndex = true): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts'));
    return excludeIndex ? files.filter(f => f !== 'index.ts').length : files.length;
  } catch { return 0; }
}

/** Count files in a directory matching a pattern (non-recursive) */
function countFiles(dir: string, ext?: string): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    const files = fs.readdirSync(dir);
    if (!ext) return files.length;
    return files.filter(f => f.endsWith(ext)).length;
  } catch { return 0; }
}

/** Count files recursively matching an extension */
function countFilesRecursive(dir: string, ext: string): number {
  try {
    if (!fs.existsSync(dir)) return 0;
    let count = 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countFilesRecursive(fullPath, ext);
      } else if (entry.name.endsWith(ext)) {
        count++;
      }
    }
    return count;
  } catch { return 0; }
}

/** Count total actions across all dispatchers by counting case statements */
function countActions(): number {
  try {
    if (!fs.existsSync(DISPATCHERS_DIR)) return 0;
    let total = 0;
    const files = fs.readdirSync(DISPATCHERS_DIR).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(DISPATCHERS_DIR, file), 'utf-8');
      // Count actions from ACTIONS arrays or z.enum entries
      const enumMatch = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
      if (enumMatch) {
        const quotes = enumMatch[1].match(/["']/g);
        total += quotes ? Math.floor(quotes.length / 2) : 0;
        continue;
      }
      const actionsMatch = content.match(/(?:ACTIONS|actions)\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
      if (actionsMatch) {
        const quotes = actionsMatch[1].match(/["']/g);
        total += quotes ? Math.floor(quotes.length / 2) : 0;
      }
    }
    return total;
  } catch { return 0; }
}

/** Parse documented counts from SYSTEM_INVENTORY.md */
function parseDocumentedCounts(): DocumentedCounts {
  const defaults: DocumentedCounts = {
    engines: 375, dispatchers: 54, algorithms: 52, registries: 23,
    hooks: 220, testFiles: 179, milestones: 95, actions: 1670
  };
  try {
    if (!fs.existsSync(INVENTORY_PATH)) return defaults;
    const content = fs.readFileSync(INVENTORY_PATH, 'utf-8');

    const extract = (pattern: RegExp, fallback: number): number => {
      const match = content.match(pattern);
      return match ? parseInt(match[1], 10) : fallback;
    };

    return {
      engines: extract(/\*\*Engines\*\*\s*\|\s*(\d+)/, defaults.engines),
      dispatchers: extract(/\*\*Dispatchers\*\*\s*\|\s*(\d+)/, defaults.dispatchers),
      algorithms: extract(/\*\*Algorithms\*\*\s*\|\s*(\d+)/, defaults.algorithms),
      registries: extract(/\*\*Registries\*\*\s*\|\s*(\d+)/, defaults.registries),
      hooks: extract(/(\d+)\s*domain hooks/, defaults.hooks),
      testFiles: extract(/(\d+)\s*passing.*(\d+)\s*files/, defaults.testFiles),
      milestones: extract(/(\d+)\/\d+\s*COMPLETE/, defaults.milestones),
      actions: extract(/\*\*Actions\*\*\s*\|\s*(\d+)/, defaults.actions),
    };
  } catch { return defaults; }
}

/** Run a git command safely, return empty string on failure */
function gitExec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, {
      cwd: cwd || PROJECT_ROOT,
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch { return ''; }
}

/** Get top dispatchers by action count */
function getTopDispatchers(limit = 5): Array<{ name: string; actions: number }> {
  try {
    if (!fs.existsSync(DISPATCHERS_DIR)) return [];
    const results: Array<{ name: string; actions: number }> = [];
    const files = fs.readdirSync(DISPATCHERS_DIR).filter(f => f.endsWith('.ts'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(DISPATCHERS_DIR, file), 'utf-8');
      let actionCount = 0;
      const enumMatch = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
      if (enumMatch) {
        const quotes = enumMatch[1].match(/["']/g);
        actionCount = quotes ? Math.floor(quotes.length / 2) : 0;
      } else {
        const actionsMatch = content.match(/(?:ACTIONS|actions)\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
        if (actionsMatch) {
          const quotes = actionsMatch[1].match(/["']/g);
          actionCount = quotes ? Math.floor(quotes.length / 2) : 0;
        }
      }
      if (actionCount > 0) {
        results.push({ name: file.replace('.ts', ''), actions: actionCount });
      }
    }
    return results.sort((a, b) => b.actions - a.actions).slice(0, limit);
  } catch { return []; }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * SystemSnapshotEngine — Ultra-compact system snapshots for token savings.
 *
 * All methods are safe to call at any time. Filesystem errors are caught
 * and produce graceful fallbacks rather than throwing.
 */
export class SystemSnapshotEngine {
  private _cachedLive: LiveCounts | null = null;
  private _cacheTs = 0;
  private static readonly CACHE_TTL_MS = 30_000; // 30s cache

  // --------------------------------------------------------------------------
  // LIVE COUNTS (cached for performance)
  // --------------------------------------------------------------------------

  /** Gather live filesystem counts with 30s caching */
  getLiveCounts(): LiveCounts {
    const now = Date.now();
    if (this._cachedLive && (now - this._cacheTs) < SystemSnapshotEngine.CACHE_TTL_MS) {
      return this._cachedLive;
    }

    this._cachedLive = {
      engines: countTsFiles(ENGINES_DIR, true),
      dispatchers: countTsFiles(DISPATCHERS_DIR, false),
      algorithms: countTsFiles(ALGORITHMS_DIR, true),
      registries: countTsFiles(REGISTRIES_DIR, true),
      hooks: countTsFiles(HOOKS_DIR, true),
      testFiles: countFilesRecursive(TESTS_DIR, '.test.ts'),
      milestones: countFiles(MILESTONES_DIR, '.json'),
      webTestFiles: countFilesRecursive(WEB_TESTS_DIR, '.test.tsx') + countFilesRecursive(WEB_TESTS_DIR, '.test.ts'),
      cadTestFiles: countFilesRecursive(CAD_TESTS_DIR, '.py'),
    };
    this._cacheTs = now;
    return this._cachedLive;
  }

  /** Invalidate the cached counts */
  invalidateCache(): void {
    this._cachedLive = null;
    this._cacheTs = 0;
  }

  // --------------------------------------------------------------------------
  // getCompactSnapshot — Single-line summary (< 200 chars)
  // --------------------------------------------------------------------------

  /**
   * Returns an ultra-compact single-line system summary.
   * Format: "PRISM v9: 375E/54D/1670A/52Alg/23R | 5848T pass | 95/95 MS done | 15.5K tools"
   */
  getCompactSnapshot(): string {
    const c = this.getLiveCounts();
    const actions = countActions();
    const ms = c.milestones;

    return `PRISM v9: ${c.engines}E/${c.dispatchers}D/${actions || '?'}A/${c.algorithms}Alg/${c.registries}R | ${c.testFiles}T files | ${ms}/${ms} MS | ${c.hooks} hooks`;
  }

  // --------------------------------------------------------------------------
  // getLayeredSnapshot — Depth-controlled snapshot
  // --------------------------------------------------------------------------

  /**
   * Returns a snapshot at the requested depth.
   * - minimal: just counts (< 50 tokens)
   * - standard: counts + top dispatchers + recent changes (< 200 tokens)
   * - full: everything including engine categories (< 500 tokens)
   */
  getLayeredSnapshot(depth: SnapshotDepth = 'standard'): string {
    const c = this.getLiveCounts();
    const actions = countActions();

    // MINIMAL — bare counts
    if (depth === 'minimal') {
      return [
        `E:${c.engines} D:${c.dispatchers} A:${actions} Alg:${c.algorithms} R:${c.registries}`,
        `Tests: ${c.testFiles} backend, ${c.webTestFiles} web, ${c.cadTestFiles} cad`,
        `Hooks:${c.hooks} MS:${c.milestones}`,
      ].join(' | ');
    }

    // STANDARD — counts + top dispatchers + recent git
    if (depth === 'standard') {
      const top = getTopDispatchers(5);
      const topStr = top.map(d => `${d.name.replace('Dispatcher', '')}(${d.actions})`).join(', ');
      const recentCommit = gitExec('git log -1 --format="%h %s" 2>/dev/null');
      const lines = [
        `## PRISM System Snapshot`,
        `Engines:${c.engines} | Dispatchers:${c.dispatchers} | Actions:${actions} | Algorithms:${c.algorithms} | Registries:${c.registries}`,
        `Tests: ${c.testFiles} backend files, ${c.webTestFiles} web, ${c.cadTestFiles} cad-engine`,
        `Hooks:${c.hooks} | Milestones:${c.milestones}`,
        `Top dispatchers: ${topStr}`,
      ];
      if (recentCommit) lines.push(`Last commit: ${recentCommit}`);
      return lines.join('\n');
    }

    // FULL — everything
    const top = getTopDispatchers(10);
    const topStr = top.map(d => `${d.name.replace('Dispatcher', '')}(${d.actions})`).join(', ');
    const recentCommits = gitExec('git log -5 --format="%h %s" 2>/dev/null');
    const documented = parseDocumentedCounts();
    const engineCategories = this._getEngineCategories();

    const lines = [
      `## PRISM v9 Full System Snapshot`,
      ``,
      `### Counts`,
      `| Category | Live | Documented |`,
      `|----------|------|-----------|`,
      `| Engines | ${c.engines} | ${documented.engines} |`,
      `| Dispatchers | ${c.dispatchers} | ${documented.dispatchers} |`,
      `| Actions | ${actions} | ${documented.actions} |`,
      `| Algorithms | ${c.algorithms} | ${documented.algorithms} |`,
      `| Registries | ${c.registries} | ${documented.registries} |`,
      `| Hooks | ${c.hooks} | ${documented.hooks} |`,
      `| Test files | ${c.testFiles} | ${documented.testFiles} |`,
      `| Milestones | ${c.milestones} | ${documented.milestones} |`,
      ``,
      `### Top Dispatchers`,
      topStr,
      ``,
      `### Engine Categories`,
      engineCategories,
      ``,
      `### Recent Commits`,
      recentCommits || '(no git history)',
    ];
    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // getChangeSummary — Git-based change detection
  // --------------------------------------------------------------------------

  /**
   * Uses git log to show what changed since a given commit or in the last N commits.
   */
  getChangeSummary(sinceCommit?: string): ChangeSummary {
    const since = sinceCommit || 'HEAD~10';
    const logOutput = gitExec(`git log ${since}..HEAD --format="%h %s" 2>/dev/null`);
    const diffOutput = gitExec(`git diff --name-only ${since} 2>/dev/null`);

    const commits = logOutput ? logOutput.split('\n').filter(Boolean) : [];
    const files = diffOutput ? diffOutput.split('\n').filter(Boolean) : [];

    // Categorize changed files
    const engineChanges = files.filter(f => f.includes('engines/'));
    const dispatcherChanges = files.filter(f => f.includes('dispatchers/'));
    const testChanges = files.filter(f => f.includes('__tests__/'));

    const parts: string[] = [];
    if (engineChanges.length) parts.push(`${engineChanges.length} engine files`);
    if (dispatcherChanges.length) parts.push(`${dispatcherChanges.length} dispatcher files`);
    if (testChanges.length) parts.push(`${testChanges.length} test files`);
    const otherCount = files.length - engineChanges.length - dispatcherChanges.length - testChanges.length;
    if (otherCount > 0) parts.push(`${otherCount} other files`);

    return {
      since,
      commits: commits.length,
      files,
      summary: commits.length === 0
        ? `No changes since ${since}`
        : `${commits.length} commits, ${files.length} files changed (${parts.join(', ')})`,
    };
  }

  // --------------------------------------------------------------------------
  // getDriftReport — Live vs documented counts
  // --------------------------------------------------------------------------

  /**
   * Compares live filesystem counts against documented counts in SYSTEM_INVENTORY.md.
   * Detects when documentation has drifted from reality.
   */
  getDriftReport(): DriftReport {
    const live = this.getLiveCounts();
    const documented = parseDocumentedCounts();

    const entries: DriftEntry[] = [
      { category: 'Engines', live: live.engines, documented: documented.engines, delta: 0, status: 'ok' },
      { category: 'Dispatchers', live: live.dispatchers, documented: documented.dispatchers, delta: 0, status: 'ok' },
      { category: 'Algorithms', live: live.algorithms, documented: documented.algorithms, delta: 0, status: 'ok' },
      { category: 'Registries', live: live.registries, documented: documented.registries, delta: 0, status: 'ok' },
      { category: 'Hooks', live: live.hooks, documented: documented.hooks, delta: 0, status: 'ok' },
      { category: 'Test Files', live: live.testFiles, documented: documented.testFiles, delta: 0, status: 'ok' },
      { category: 'Milestones', live: live.milestones, documented: documented.milestones, delta: 0, status: 'ok' },
    ];

    // Calculate deltas and statuses
    for (const entry of entries) {
      entry.delta = entry.live - entry.documented;
      const pct = documented ? Math.abs(entry.delta) / Math.max(entry.documented, 1) : 0;
      if (pct > 0.10) {
        entry.status = 'major_drift';
      } else if (entry.delta !== 0) {
        entry.status = 'drift';
      }
    }

    const driftEntries = entries.filter(e => e.status !== 'ok');
    const hasMajor = entries.some(e => e.status === 'major_drift');
    const overallStatus: DriftReport['overallStatus'] = hasMajor ? 'major_drift' : driftEntries.length > 0 ? 'drift' : 'ok';

    const driftSummary = driftEntries.length === 0
      ? 'All counts match documentation'
      : driftEntries.map(e => `${e.category}: ${e.live} live vs ${e.documented} doc (${e.delta > 0 ? '+' : ''}${e.delta})`).join('; ');

    return {
      timestamp: new Date().toISOString(),
      entries,
      overallStatus,
      summary: driftSummary,
    };
  }

  // --------------------------------------------------------------------------
  // PRIVATE HELPERS
  // --------------------------------------------------------------------------

  /** Categorize engines by filename pattern */
  private _getEngineCategories(): string {
    try {
      if (!fs.existsSync(ENGINES_DIR)) return '(engines dir not found)';
      const files = fs.readdirSync(ENGINES_DIR).filter(f => f.endsWith('.ts') && f !== 'index.ts');

      const categories: Record<string, number> = {};
      const patterns: Array<[RegExp, string]> = [
        [/Safety|Guard|Enforce|Collision|Spindle|Breakage/i, 'Safety'],
        [/Calc|Math|Physics|Force|Thermal|Power|Torque|Deflection|Wear|Chip|Engagement/i, 'Calculation'],
        [/CAD|CAM|Toolpath|GCode|Post|Feature|Geometry|Mesh|Sketch/i, 'CAD/CAM'],
        [/Knowledge|Intelligence|Apprentice|Tribal|Genome|Graph/i, 'Intelligence'],
        [/Hook|Session|Context|Config|Cache|Event|Health|Log/i, 'Infrastructure'],
        [/Telemetry|Anomaly|Monitor|Predict/i, 'Monitoring'],
        [/Report|Export|Setup/i, 'Reporting'],
        [/Quote|Cost|Business|Financial|Inventory|Scheduling|Purchase/i, 'Business'],
        [/Compliance|Aerospace|Medical|Automotive/i, 'Industry'],
        [/FiveAxis|RTCP|MultiAxis/i, 'Multi-Axis'],
        [/EDM|Sheet|Additive|Injection|Grind/i, 'Specialty'],
        [/AutoPilot|Orchestrat|Agent|Swarm|Batch/i, 'Execution'],
        [/Workholding|Chuck|Fixture|Clamp|Vise|SoftJaw/i, 'Workholding'],
        [/Thread|Bore|Drill|Turn|Tap/i, 'Mfg Process'],
      ];

      for (const file of files) {
        let matched = false;
        for (const [regex, cat] of patterns) {
          if (regex.test(file)) {
            categories[cat] = (categories[cat] || 0) + 1;
            matched = true;
            break;
          }
        }
        if (!matched) {
          categories['Other'] = (categories['Other'] || 0) + 1;
        }
      }

      return Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, count]) => `${cat}(${count})`)
        .join(', ');
    } catch { return '(error reading engines)'; }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const systemSnapshotEngine = new SystemSnapshotEngine();
