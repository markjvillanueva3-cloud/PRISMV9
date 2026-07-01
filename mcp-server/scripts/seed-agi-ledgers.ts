#!/usr/bin/env npx ts-node
/**
 * seed-agi-ledgers.ts — PP-0.18-LEDGERS
 *
 * Ensures the 4 Phase 0.18 AGI ledger files exist with valid schema headers.
 * The owner engines (SelfModificationProposal, EmergentBehaviorMonitor,
 * MetaLearningOptimizer, TemporalReasoning) are pure in-memory and declare
 * persistence as a caller concern. Downstream callers (doc cascade, SVI
 * watchers, session bootstrap) expect these files to exist — without them
 * any `readFileSync` loader hits ENOENT on cold boot.
 *
 * JSONL ledgers are .gitignore'd (*.jsonl) per /h/prism/.gitignore, so they
 * can't be versioned as seed files. Instead, this script creates them on
 * demand. Safe to run repeatedly — only writes when the target is missing or
 * its first line fails header validation.
 *
 * ABSTRACTION_HIERARCHY.json is tracked normally (not a JSONL ledger); this
 * script only seeds it when absent.
 *
 * Run manually:
 *   npx tsx mcp-server/scripts/seed-agi-ledgers.ts
 * Or from boot:
 *   import { seedAgiLedgers } from "../scripts/seed-agi-ledgers.js";
 *   seedAgiLedgers();
 */

import * as fs from "fs";
import * as path from "path";

const SCHEMA_VERSION = 1;

interface LedgerSpec {
  file: string;
  owner: string;
  description: string;
  rotationPolicy: "daily" | "weekly" | "monthly" | "quarterly";
  maxEntries: number;
  entrySchema: Record<string, string>;
}

const JSONL_LEDGERS: readonly LedgerSpec[] = [
  {
    file: "mcp-server/data/state/ARCH_EVOLUTION_LEDGER.jsonl",
    owner: "SelfModificationProposalEngine",
    description: "Architecture evolution proposals ledger (PP-0.18-U-AGI10)",
    rotationPolicy: "monthly",
    maxEntries: 10_000,
    entrySchema: {
      proposalId: "string",
      kind: "abstraction|removal|split|merge|rename",
      target: "string",
      rationale: "string",
      riskLevel: "low|medium|high",
      reviewerStatus: "pending|approved|rejected",
      createdAt: "iso8601",
    },
  },
  {
    file: "mcp-server/data/state/EMERGENCE_LEDGER.jsonl",
    owner: "EmergentBehaviorMonitorEngine",
    description: "Emergent behavior / unexpected interactions ledger (PP-0.18-U-AGI11)",
    rotationPolicy: "monthly",
    maxEntries: 10_000,
    entrySchema: {
      eventId: "string",
      kind: "perf-anomaly|registry-drift|flaky-test|unexpected-combination",
      signal: "string",
      magnitude: "number",
      components: "string[]",
      firstSeen: "iso8601",
      lastSeen: "iso8601",
      occurrences: "number",
    },
  },
  {
    file: "mcp-server/data/state/META_LEARNING_LEDGER.jsonl",
    owner: "MetaLearningOptimizerEngine",
    description: "Meta-learning strategy-outcome ledger (PP-0.18-U-AGI4)",
    rotationPolicy: "monthly",
    maxEntries: 10_000,
    entrySchema: {
      scenario: "string",
      strategy: "string",
      success: "boolean",
      durationMs: "number",
      recordedAt: "iso8601",
      sessionId: "string|null",
    },
  },
  {
    file: "mcp-server/data/state/TEMPORAL_STATE_LEDGER.jsonl",
    owner: "TemporalReasoningEngine",
    description: "Temporal state snapshots ledger (PP-0.18-U-AGI6)",
    rotationPolicy: "quarterly",
    maxEntries: 100_000,
    entrySchema: {
      series: "string",
      value: "number",
      recordedAt: "iso8601",
      note: "string|null",
    },
  },
];

const HIERARCHY_FILE = "mcp-server/data/state/ABSTRACTION_HIERARCHY.json";

function repoRoot(): string {
  // __dirname is mcp-server/scripts; repo root is two levels up.
  // Tolerate being called from elsewhere by walking up to the first
  // directory that contains both `mcp-server` and `.git`.
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, ".git")) && fs.existsSync(path.join(dir, "mcp-server"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function isValidHeader(line: string): boolean {
  try {
    const j = JSON.parse(line);
    return j && j.schemaVersion === SCHEMA_VERSION && j.type === "header" && typeof j.owner === "string";
  } catch {
    return false;
  }
}

interface SeedResult {
  file: string;
  action: "created" | "preserved" | "headered";
}

export function seedAgiLedgers(root: string = repoRoot()): SeedResult[] {
  const results: SeedResult[] = [];

  for (const spec of JSONL_LEDGERS) {
    const full = path.join(root, spec.file);
    const header = {
      schemaVersion: SCHEMA_VERSION,
      type: "header",
      description: spec.description,
      owner: spec.owner,
      rotationPolicy: spec.rotationPolicy,
      maxEntries: spec.maxEntries,
      entrySchema: spec.entrySchema,
    };
    fs.mkdirSync(path.dirname(full), { recursive: true });

    if (!fs.existsSync(full)) {
      fs.writeFileSync(full, JSON.stringify(header) + "\n", "utf8");
      results.push({ file: spec.file, action: "created" });
      continue;
    }
    const firstLine = (fs.readFileSync(full, "utf8").split(/\r?\n/)[0] ?? "").trim();
    if (firstLine === "" || !isValidHeader(firstLine)) {
      // Prepend header line to preserve any existing entries below.
      const existing = fs.readFileSync(full, "utf8");
      fs.writeFileSync(full, JSON.stringify(header) + "\n" + existing, "utf8");
      results.push({ file: spec.file, action: "headered" });
    } else {
      results.push({ file: spec.file, action: "preserved" });
    }
  }

  const hierFull = path.join(root, HIERARCHY_FILE);
  fs.mkdirSync(path.dirname(hierFull), { recursive: true });
  if (!fs.existsSync(hierFull)) {
    fs.writeFileSync(
      hierFull,
      JSON.stringify(
        {
          schemaVersion: SCHEMA_VERSION,
          description: "Abstraction hierarchy rollup: tip (L0) → rule (L1) → principle (L2) → law (L3). Owner: AbstractionHierarchyEngine (PP-0.18-U-AGI15).",
          owner: "AbstractionHierarchyEngine",
          levels: { 0: "tip", 1: "rule", 2: "principle", 3: "law" },
          nextId: 1,
          nodes: [] as unknown[],
        },
        null,
        2,
      ) + "\n",
      "utf8",
    );
    results.push({ file: HIERARCHY_FILE, action: "created" });
  } else {
    results.push({ file: HIERARCHY_FILE, action: "preserved" });
  }

  return results;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("seed-agi-ledgers.ts")) {
  const results = seedAgiLedgers();
  for (const r of results) {
    // eslint-disable-next-line no-console
    console.log(`[seed-agi-ledgers] ${r.action.padEnd(9)} ${r.file}`);
  }
}
