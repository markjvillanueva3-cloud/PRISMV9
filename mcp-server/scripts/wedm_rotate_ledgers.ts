#!/usr/bin/env npx ts-node
/**
 * WEDM Ledger Rotation Script
 * Phase 0.12 U-WEDM-OP6 - WEDM AGI Roadmap
 *
 * Hot/warm/cold tiering for WEDM ledgers:
 * - Hot: current month (uncompressed)
 * - Warm: last 3 months (rotated to .jsonl.1, .2, .3)
 * - Cold: older than 3 months (gzipped to .jsonl.gz)
 *
 * Usage: npx ts-node scripts/wedm_rotate_ledgers.ts
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LEDGER_FILES = [
  "WEDM_FEEDBACK_LEDGER.jsonl",
  "WEDM_OUTCOME_LEDGER.jsonl",
  "WEDM_SVI_DELTA_LEDGER.jsonl",
  "WEDM_BOOT_TELEMETRY.jsonl",
];

const STATE_DIR = path.resolve(__dirname, "../data/state");

interface RotationReport {
  ledger: string;
  action: "rotated" | "compressed" | "skipped";
  sizeBefore_kb: number;
  sizeAfter_kb: number;
  entries: number;
}

function getFileSize_kb(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  return Math.round(fs.statSync(filePath).size / 1024);
}

function countEntries(filePath: string): number {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, "utf-8");
  return content.split("\n").filter((l) => l.trim()).length;
}

function rotate(ledgerPath: string, maxEntries: number = 10000): RotationReport {
  const filename = path.basename(ledgerPath);
  const sizeBefore = getFileSize_kb(ledgerPath);
  const entries = countEntries(ledgerPath);

  if (entries <= maxEntries) {
    return { ledger: filename, action: "skipped", sizeBefore_kb: sizeBefore, sizeAfter_kb: sizeBefore, entries };
  }

  // Rotate .jsonl.2 -> .3, .1 -> .2, current -> .1
  for (let i = 3; i >= 1; i--) {
    const older = `${ledgerPath}.${i}`;
    const newer = i === 1 ? ledgerPath : `${ledgerPath}.${i - 1}`;
    if (fs.existsSync(newer)) {
      if (i === 3) {
        // Compress oldest to gzip
        const content = fs.readFileSync(newer);
        const compressed = zlib.gzipSync(content);
        fs.writeFileSync(`${ledgerPath}.gz.${Date.now()}`, compressed);
      } else {
        fs.renameSync(newer, older);
      }
    }
  }

  // Create fresh header for new ledger
  const header = JSON.stringify({
    schemaVersion: 1,
    type: "header",
    rotatedAt: new Date().toISOString(),
    previousRotation: true,
  });
  fs.writeFileSync(ledgerPath, header + "\n");

  return {
    ledger: filename,
    action: "rotated",
    sizeBefore_kb: sizeBefore,
    sizeAfter_kb: getFileSize_kb(ledgerPath),
    entries,
  };
}

async function main(): Promise<void> {
  console.log("\n=== WEDM Ledger Rotation ===\n");
  const reports: RotationReport[] = [];

  for (const file of LEDGER_FILES) {
    const ledgerPath = path.join(STATE_DIR, file);
    if (!fs.existsSync(ledgerPath)) {
      console.log(`  ${file}: (not found)`);
      continue;
    }
    const report = rotate(ledgerPath);
    reports.push(report);
    console.log(`  ${file}: ${report.action} (${report.entries} entries, ${report.sizeBefore_kb} KB)`);
  }

  console.log(`\nTotal ledgers processed: ${reports.length}`);
  console.log(`Rotated: ${reports.filter((r) => r.action === "rotated").length}`);
  console.log(`Skipped: ${reports.filter((r) => r.action === "skipped").length}`);
}

main().catch(console.error);
