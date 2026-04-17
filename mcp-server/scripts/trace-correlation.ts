#!/usr/bin/env npx ts-node
/**
 * trace-correlation.ts — Phase 0.16 End-to-End Tracing
 *
 * Reconstructs the causal chain for a given correlationId across all ledger surfaces.
 * Usage: npx ts-node scripts/trace-correlation.ts <correlationId>
 */

import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";

const LEDGER_SURFACES = [
  { name: "Boot Telemetry", path: "mcp-server/data/state/BOOT_TELEMETRY.jsonl" },
  { name: "Transaction Log", path: "mcp-server/data/state/TRANSACTION_LOG.jsonl" },
  { name: "SVI Delta", path: "mcp-server/data/state/SVI_DELTA_LEDGER.jsonl" },
  { name: "Session Insights", path: "state/shared/SESSION_INSIGHTS_LEDGER.jsonl" },
  { name: "Doc Changes", path: "state/shared/DOC_CHANGE_LEDGER.jsonl" },
  { name: "Agent Utilization", path: "state/shared/AGENT_UTILIZATION_LEDGER.jsonl" },
  { name: "Deprecation", path: "state/shared/DEPRECATION_LEDGER.jsonl" },
];

interface LedgerEntry {
  correlationId?: string;
  causalChain?: string[];
  timestamp?: string;
  createdAt?: string;
  type?: string;
  [key: string]: unknown;
}

interface TraceEvent {
  surface: string;
  timestamp: string;
  entry: LedgerEntry;
}

function readLedger(ledgerPath: string): LedgerEntry[] {
  const fullPath = path.resolve(process.cwd(), "..", ledgerPath);
  const entries: LedgerEntry[] = [];

  // Read main file
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf-8");
    for (const line of content.trim().split("\n").filter(Boolean)) {
      try {
        entries.push(JSON.parse(line));
      } catch { /* skip malformed */ }
    }
  }

  // Read warm file if exists
  const warmPath = fullPath.replace(".jsonl", ".warm.jsonl.gz");
  if (fs.existsSync(warmPath)) {
    const content = zlib.gunzipSync(fs.readFileSync(warmPath)).toString();
    for (const line of content.trim().split("\n").filter(Boolean)) {
      try {
        entries.push(JSON.parse(line));
      } catch { /* skip malformed */ }
    }
  }

  return entries;
}

function findByCorrelationId(correlationId: string): TraceEvent[] {
  const events: TraceEvent[] = [];

  for (const surface of LEDGER_SURFACES) {
    const entries = readLedger(surface.path);

    for (const entry of entries) {
      // Match by correlationId or presence in causalChain
      if (
        entry.correlationId === correlationId ||
        entry.causalChain?.includes(correlationId)
      ) {
        events.push({
          surface: surface.name,
          timestamp: entry.timestamp || entry.createdAt || "unknown",
          entry,
        });
      }
    }
  }

  // Sort by timestamp
  events.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime() || 0;
    const tb = new Date(b.timestamp).getTime() || 0;
    return ta - tb;
  });

  return events;
}

function formatEntry(entry: LedgerEntry): string {
  const { correlationId, causalChain, timestamp, createdAt, type, ...rest } = entry;
  const keys = Object.keys(rest);
  if (keys.length === 0) return type || "(empty)";
  if (keys.length <= 3) return JSON.stringify(rest);
  return `${type || keys[0]}: ${keys.length} fields`;
}

async function main() {
  const correlationId = process.argv[2];

  if (!correlationId) {
    console.error("Usage: npx ts-node scripts/trace-correlation.ts <correlationId>");
    process.exit(1);
  }

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║            CORRELATION TRACE — Phase 0.16                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();
  console.log(`Tracing: ${correlationId}`);
  console.log();

  const events = findByCorrelationId(correlationId);

  if (events.length === 0) {
    console.log("No events found for this correlationId.");
    console.log("Check that the ID is correct and ledgers contain correlated entries.");
    return;
  }

  console.log(`Found ${events.length} events across ${new Set(events.map(e => e.surface)).size} surfaces:`);
  console.log();

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const prefix = i === events.length - 1 ? "└─" : "├─";
    const time = new Date(event.timestamp).toISOString().replace("T", " ").slice(0, 19);

    console.log(`${prefix} [${time}] ${event.surface}`);
    console.log(`   ${formatEntry(event.entry)}`);

    if (event.entry.causalChain && event.entry.causalChain.length > 1) {
      console.log(`   Chain: ${event.entry.causalChain.join(" → ")}`);
    }
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Trace complete. ${events.length} events in causal chain.`);
}

main().catch(console.error);
