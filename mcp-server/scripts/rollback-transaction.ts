#!/usr/bin/env npx ts-node
/**
 * rollback-transaction.ts — Phase 0.16 Transaction Rollback
 *
 * Replays inverse operations from TRANSACTION_LOG.jsonl to rollback
 * a failed or unwanted transaction.
 *
 * Usage: npx ts-node scripts/rollback-transaction.ts <transactionId>
 */

import * as fs from "fs";
import * as path from "path";

const TRANSACTION_LOG_PATH = "mcp-server/data/state/TRANSACTION_LOG.jsonl";

interface TransactionEntry {
  type: string;
  transactionId: string;
  correlationId?: string;
  timestamp: string;
  files?: string[];
  filesWritten?: string[];
  beforeHash?: string;
  afterHash?: string;
  error?: string;
  mutations?: Array<{
    type: string;
    path: string;
    beforeContent?: string;
    afterContent?: string;
  }>;
}

function readTransactionLog(): TransactionEntry[] {
  const fullPath = path.resolve(process.cwd(), "..", TRANSACTION_LOG_PATH);
  if (!fs.existsSync(fullPath)) return [];

  const content = fs.readFileSync(fullPath, "utf-8");
  const entries: TransactionEntry[] = [];

  for (const line of content.trim().split("\n").filter(Boolean)) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "header") {
        entries.push(entry);
      }
    } catch { /* skip malformed */ }
  }

  return entries;
}

function findTransactionEntries(transactionId: string): TransactionEntry[] {
  const log = readTransactionLog();
  return log.filter((e) => e.transactionId === transactionId);
}

function logRollback(entry: Record<string, unknown>): void {
  const fullPath = path.resolve(process.cwd(), "..", TRANSACTION_LOG_PATH);
  const line = JSON.stringify({ ...entry, timestamp: new Date().toISOString() }) + "\n";
  fs.appendFileSync(fullPath, line);
}

async function rollbackTransaction(transactionId: string): Promise<{
  success: boolean;
  filesRestored: string[];
  error?: string;
}> {
  const entries = findTransactionEntries(transactionId);

  if (entries.length === 0) {
    return {
      success: false,
      filesRestored: [],
      error: `Transaction ${transactionId} not found in log`,
    };
  }

  // Find the commit entry to get files written
  const commitEntry = entries.find((e) => e.type === "transaction_commit");
  if (!commitEntry) {
    return {
      success: false,
      filesRestored: [],
      error: `Transaction ${transactionId} was not committed (no commit entry)`,
    };
  }

  // Check if already rolled back
  const rollbackEntry = entries.find((e) => e.type === "transaction_manual_rollback");
  if (rollbackEntry) {
    return {
      success: false,
      filesRestored: [],
      error: `Transaction ${transactionId} was already rolled back at ${rollbackEntry.timestamp}`,
    };
  }

  const filesWritten = commitEntry.filesWritten || commitEntry.files || [];
  const filesRestored: string[] = [];
  const errors: string[] = [];

  console.log(`Rolling back transaction ${transactionId}...`);
  console.log(`Files to restore: ${filesWritten.length}`);

  // For each file, check if we have mutation data with before content
  const startEntry = entries.find((e) => e.type === "transaction_start");
  const mutations = startEntry?.mutations || [];

  for (const filePath of filesWritten) {
    const fullPath = path.resolve(process.cwd(), "..", filePath);
    const mutation = mutations.find((m) => m.path === filePath);

    try {
      if (mutation?.beforeContent !== undefined) {
        // We have the original content - restore it
        if (mutation.beforeContent === null) {
          // File didn't exist before - delete it
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`  ✓ Deleted: ${filePath}`);
          }
        } else {
          // Restore original content
          fs.writeFileSync(fullPath, mutation.beforeContent);
          console.log(`  ✓ Restored: ${filePath}`);
        }
        filesRestored.push(filePath);
      } else {
        // No before content - we can only delete if it was a new file
        console.log(`  ⚠ Cannot restore ${filePath} (no before content recorded)`);
        errors.push(`No before content for ${filePath}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`  ✗ Failed: ${filePath} - ${msg}`);
      errors.push(`${filePath}: ${msg}`);
    }
  }

  // Log the rollback
  logRollback({
    type: "transaction_manual_rollback",
    transactionId,
    originalCommitTime: commitEntry.timestamp,
    filesRestored,
    errors: errors.length > 0 ? errors : undefined,
  });

  return {
    success: errors.length === 0,
    filesRestored,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
}

async function main() {
  const transactionId = process.argv[2];

  if (!transactionId || transactionId === "--help") {
    console.log(`
rollback-transaction.ts — Phase 0.16 Transaction Rollback

Usage:
  npx ts-node scripts/rollback-transaction.ts <transactionId>
  npx ts-node scripts/rollback-transaction.ts --list

Options:
  <transactionId>  The transaction ID to rollback
  --list           List recent transactions

Note: Rollback requires that the transaction logged beforeContent for mutations.
Transactions without beforeContent can only be partially rolled back.
`);
    return;
  }

  if (transactionId === "--list") {
    const log = readTransactionLog();
    const commits = log.filter((e) => e.type === "transaction_commit").slice(-10);

    console.log("Recent committed transactions:");
    for (const entry of commits) {
      const files = entry.filesWritten?.length || 0;
      console.log(`  ${entry.transactionId} - ${entry.timestamp} (${files} files)`);
    }
    return;
  }

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║          TRANSACTION ROLLBACK — Phase 0.16                    ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const result = await rollbackTransaction(transactionId);

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");

  if (result.success) {
    console.log(`✓ Rollback complete. ${result.filesRestored.length} files restored.`);
  } else {
    console.log(`✗ Rollback failed or incomplete.`);
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }
    process.exit(1);
  }
}

main().catch(console.error);
