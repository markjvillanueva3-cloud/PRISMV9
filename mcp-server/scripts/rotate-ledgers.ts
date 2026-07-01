#!/usr/bin/env npx ts-node
/**
 * rotate-ledgers.ts — Phase 0.16 Ledger Retention
 *
 * Implements hot/warm/cold tiering for append-only ledgers:
 * - Hot (last 7d): in-place .jsonl
 * - Warm (7-30d): compressed .jsonl.gz
 * - Cold (>30d): archived to data/state/archive/YYYY-MM/
 *
 * Run nightly via cron or manually.
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const LEDGER_FILES = [
  "mcp-server/data/state/BOOT_TELEMETRY.jsonl",
  "mcp-server/data/state/TRANSACTION_LOG.jsonl",
  "mcp-server/data/state/SVI_DELTA_LEDGER.jsonl",
  "state/shared/SESSION_INSIGHTS_LEDGER.jsonl",
  "state/shared/DOC_CHANGE_LEDGER.jsonl",
  "state/shared/AGENT_UTILIZATION_LEDGER.jsonl",
  "state/shared/DEPRECATION_LEDGER.jsonl",
];

const RETENTION = {
  hot: 7,      // days
  warm: 30,    // days
  archivePath: "mcp-server/data/state/archive",
};

interface LedgerEntry {
  timestamp?: string;
  createdAt?: string;
  date?: string;
  [key: string]: unknown;
}

function getEntryDate(entry: LedgerEntry): Date | null {
  const dateStr = entry.timestamp || entry.createdAt || entry.date;
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getTier(date: Date): "hot" | "warm" | "cold" {
  const now = new Date();
  const ageMs = now.getTime() - date.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= RETENTION.hot) return "hot";
  if (ageDays <= RETENTION.warm) return "warm";
  return "cold";
}

function rotateLedger(ledgerPath: string): { hot: number; warm: number; cold: number } {
  const fullPath = path.resolve(process.cwd(), "..", ledgerPath);

  if (!fs.existsSync(fullPath)) {
    console.log(`  Skipping ${ledgerPath} (not found)`);
    return { hot: 0, warm: 0, cold: 0 };
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const lines = content.trim().split("\n").filter(Boolean);

  const hot: string[] = [];
  const warm: string[] = [];
  const cold: string[] = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as LedgerEntry;

      // Skip header entries
      if (entry.type === "header") {
        hot.push(line);
        continue;
      }

      const date = getEntryDate(entry);
      if (!date) {
        hot.push(line); // Keep undated entries in hot
        continue;
      }

      const tier = getTier(date);
      switch (tier) {
        case "hot": hot.push(line); break;
        case "warm": warm.push(line); break;
        case "cold": cold.push(line); break;
      }
    } catch {
      hot.push(line); // Keep unparseable lines in hot
    }
  }

  // Write hot entries back to original file
  fs.writeFileSync(fullPath, hot.join("\n") + "\n");

  // Compress warm entries
  if (warm.length > 0) {
    const warmPath = fullPath.replace(".jsonl", ".warm.jsonl.gz");
    const existing = fs.existsSync(warmPath)
      ? zlib.gunzipSync(fs.readFileSync(warmPath)).toString().trim().split("\n")
      : [];
    const combined = [...existing, ...warm];
    fs.writeFileSync(warmPath, zlib.gzipSync(combined.join("\n") + "\n"));
  }

  // Archive cold entries
  if (cold.length > 0) {
    const now = new Date();
    const archiveDir = path.resolve(
      process.cwd(), "..",
      RETENTION.archivePath,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    );

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const basename = path.basename(ledgerPath);
    const archivePath = path.join(archiveDir, basename.replace(".jsonl", ".cold.jsonl.gz"));

    const existing = fs.existsSync(archivePath)
      ? zlib.gunzipSync(fs.readFileSync(archivePath)).toString().trim().split("\n")
      : [];
    const combined = [...existing, ...cold];
    fs.writeFileSync(archivePath, zlib.gzipSync(combined.join("\n") + "\n"));
  }

  return { hot: hot.length, warm: warm.length, cold: cold.length };
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║              LEDGER ROTATION — Phase 0.16                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Retention policy: hot=${RETENTION.hot}d, warm=${RETENTION.warm}d, cold=archive`);
  console.log();

  let totalHot = 0, totalWarm = 0, totalCold = 0;

  for (const ledger of LEDGER_FILES) {
    console.log(`Processing: ${ledger}`);
    const result = rotateLedger(ledger);
    console.log(`  Hot: ${result.hot}, Warm: ${result.warm}, Cold: ${result.cold}`);
    totalHot += result.hot;
    totalWarm += result.warm;
    totalCold += result.cold;
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Total: ${totalHot} hot, ${totalWarm} warm, ${totalCold} cold`);
  console.log("Rotation complete.");
}

main().catch(console.error);
