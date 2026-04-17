#!/usr/bin/env npx ts-node
/**
 * propagate-docs-drainer.ts — Phase 0.15 Documentation Drainer
 *
 * Processes DOC_CASCADE_QUEUE.json and updates AUTO-REFRESHED blocks
 * in managed documents. Runs as background job or on-demand.
 */

import * as fs from "fs";
import * as path from "path";

const QUEUE_PATH = "mcp-server/data/state/DOC_CASCADE_QUEUE.json";
const MARKER_START = "<!-- AUTO-REFRESHED: managed-section-start -->";
const MARKER_END = "<!-- AUTO-REFRESHED: managed-section-end -->";

interface QueueEntry {
  pending: string[];
  lastProcessed: string | null;
  lastTriggered: string | null;
  triggeredBy: string | null;
}

function loadQueue(): QueueEntry {
  const queuePath = path.resolve(process.cwd(), "..", QUEUE_PATH);
  if (fs.existsSync(queuePath)) {
    try {
      return JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    } catch {
      return { pending: [], lastProcessed: null, lastTriggered: null, triggeredBy: null };
    }
  }
  return { pending: [], lastProcessed: null, lastTriggered: null, triggeredBy: null };
}

function saveQueue(queue: QueueEntry): void {
  const queuePath = path.resolve(process.cwd(), "..", QUEUE_PATH);
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

function generateContent(doc: string): string {
  // Generate content based on document type
  if (doc === "CLAUDE.md") {
    return generateClaudeContent();
  }
  if (doc === "PRISM-COMMANDS-MANIFEST.md") {
    return generateManifestContent();
  }
  return "<!-- Content not available -->";
}

function generateClaudeContent(): string {
  const baselinePath = path.resolve(process.cwd(), "..", "mcp-server/data/state/BASELINE_INVENTORY.json");
  if (!fs.existsSync(baselinePath)) {
    return "Baseline inventory not found";
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
  return `Engines: ${baseline.engineCount || "N/A"} | Dispatchers: ${baseline.dispatcherCount || "N/A"} | Actions: ${baseline.actionCount || "N/A"}`;
}

function generateManifestContent(): string {
  const commandsDir = path.resolve(process.cwd(), "..", "../.claude/commands");
  if (!fs.existsSync(commandsDir)) {
    return "Commands directory not found";
  }
  const commands = fs.readdirSync(commandsDir).filter(f => f.endsWith(".md"));
  return `Total commands: ${commands.length}`;
}

function updateDocument(docPath: string): boolean {
  const fullPath = path.resolve(process.cwd(), "..", docPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`  Document not found: ${docPath}`);
    return false;
  }

  const content = fs.readFileSync(fullPath, "utf-8");
  const startIdx = content.indexOf(MARKER_START);
  const endIdx = content.indexOf(MARKER_END);

  if (startIdx === -1 || endIdx === -1) {
    console.log(`  No managed section in: ${docPath}`);
    return false;
  }

  const newContent = generateContent(docPath);
  const before = content.slice(0, startIdx + MARKER_START.length);
  const after = content.slice(endIdx);
  const updated = `${before}\n${newContent}\n${after}`;

  fs.writeFileSync(fullPath, updated);
  console.log(`  ✓ Updated: ${docPath}`);
  return true;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║         PROPAGATE DOCS DRAINER — Phase 0.15                   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const queue = loadQueue();

  if (queue.pending.length === 0) {
    console.log("Queue empty. Nothing to process.");
    return;
  }

  console.log(`Processing ${queue.pending.length} document(s)...`);
  if (dryRun) console.log("[DRY RUN MODE]");
  console.log();

  let processed = 0;
  for (const doc of queue.pending) {
    console.log(`Processing: ${doc}`);
    if (!dryRun) {
      if (updateDocument(doc)) {
        processed++;
      }
    } else {
      console.log(`  [dry-run] Would update: ${doc}`);
      processed++;
    }
  }

  if (!dryRun) {
    queue.pending = [];
    queue.lastProcessed = new Date().toISOString();
    saveQueue(queue);
  }

  console.log();
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`Processed: ${processed} document(s)`);
}

main().catch(console.error);
