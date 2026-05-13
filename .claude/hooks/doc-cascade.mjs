// tier: T4
/**
 * doc-cascade.mjs — Phase 0.15 Documentation Cascade
 *
 * PostToolWrite hook that triggers documentation updates when
 * source files change. Maintains AUTO-REFRESHED blocks in sync.
 */

import * as fs from "fs";
import * as path from "path";

const DOC_SOURCES = {
  "BASELINE_INVENTORY.json": ["CLAUDE.md"],
  "WEDM_DIGEST.json": ["CLAUDE.md"],
  "ENGINE_REGISTRY.json": ["PRISM-COMMANDS-MANIFEST.md"],
  "HOOK_ORDER_REGISTRY.json": ["PRISM-COMMANDS-MANIFEST.md"]
};

const DOC_QUEUE_PATH = "mcp-server/data/state/DOC_CASCADE_QUEUE.json";

export default async function docCascade({ tool, input, result }) {
  // Only trigger on successful Write
  if (tool !== "Write" || result?.error) {
    return;
  }

  const filePath = input.file_path || input.path;
  if (!filePath) return;

  const fileName = path.basename(filePath);
  const affectedDocs = DOC_SOURCES[fileName];

  if (!affectedDocs || affectedDocs.length === 0) {
    return;
  }

  const basePath = process.cwd();
  const timestamp = new Date().toISOString();

  // Load or create queue
  const queuePath = path.join(basePath, DOC_QUEUE_PATH);
  let queue = { pending: [], lastProcessed: null };

  if (fs.existsSync(queuePath)) {
    try {
      queue = JSON.parse(fs.readFileSync(queuePath, "utf-8"));
    } catch { /* use defaults */ }
  }

  // Add affected docs to queue (dedupe)
  for (const doc of affectedDocs) {
    if (!queue.pending.includes(doc)) {
      queue.pending.push(doc);
    }
  }

  queue.lastTriggered = timestamp;
  queue.triggeredBy = fileName;

  // Write queue
  fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

  console.log(`[DOC-CASCADE] Queued ${affectedDocs.length} doc(s) for refresh`);
  console.log(`  Triggered by: ${fileName}`);
  console.log(`  Docs: ${affectedDocs.join(", ")}`);

  return {
    message: `Doc cascade: ${affectedDocs.length} doc(s) queued`
  };
}

// Hook metadata
export const metadata = {
  id: "doc-cascade",
  phase: "0.15",
  priority: 5,
  dependsOn: [],
  event: "PostToolWrite"
};
