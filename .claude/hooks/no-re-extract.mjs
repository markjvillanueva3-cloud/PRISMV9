// tier: T0
/**
 * no-re-extract.mjs — Phase 1 Tier 5B
 *
 * PreTool hook that blocks re-extraction of sources already in extraction log.
 * Prevents duplicate work and ensures extraction is done once correctly.
 */

import * as fs from "fs";
import * as path from "path";

const EXTRACTION_LOG_PATH = "mcp-server/data/state/extraction-log.json";

// Patterns that indicate extraction activity
const EXTRACTION_PATTERNS = [
  /extract.*from/i,
  /harvest.*from/i,
  /import.*from.*pdf/i,
  /process.*document/i
];

function isExtractionCommand(command) {
  return EXTRACTION_PATTERNS.some(p => p.test(command));
}

function extractSourceId(command) {
  // Try to extract source identifier from command
  const pdfMatch = command.match(/([A-Za-z0-9_-]+\.pdf)/i);
  if (pdfMatch) return pdfMatch[1].toLowerCase();

  const urlMatch = command.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) return urlMatch[0];

  const pathMatch = command.match(/[A-Z]:[\\\/][^\s]+/i);
  if (pathMatch) return pathMatch[0].replace(/\\/g, "/").toLowerCase();

  return null;
}

export default async function noReExtract({ tool, input }) {
  // Check Bash tool for extraction commands
  if (tool !== "Bash") return undefined;

  const command = input?.command || "";
  if (!isExtractionCommand(command)) return undefined;

  const sourceId = extractSourceId(command);
  if (!sourceId) return undefined;

  // Check extraction log
  const logPath = path.join(process.cwd(), EXTRACTION_LOG_PATH);
  if (!fs.existsSync(logPath)) return undefined;

  try {
    const log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    const entries = log.extractions || [];

    const existingEntry = entries.find(e =>
      e.sourceId?.toLowerCase() === sourceId ||
      e.sourcePath?.toLowerCase().includes(sourceId)
    );

    if (existingEntry) {
      return {
        decision: "block",
        reason: `
╔══════════════════════════════════════════════════════════════╗
║             NO RE-EXTRACT — Phase 1 Tier 5B                   ║
╠══════════════════════════════════════════════════════════════╣
║ BLOCKED: Source already extracted                            ║
║                                                              ║
║ Source: ${sourceId.slice(0,48).padEnd(48)}║
║ Extracted: ${existingEntry.extractedAt?.slice(0,20).padEnd(44)}║
║ Entries: ${(existingEntry.entryCount || "unknown").toString().padEnd(46)}║
║                                                              ║
║ Re-extraction wastes compute and creates duplicates.         ║
║ Use existing data or run /allow-supersede with reason.       ║
╚══════════════════════════════════════════════════════════════╝
`
      };
    }
  } catch {
    // Parse error, allow
  }

  return undefined;
}

export const metadata = {
  id: "no-re-extract",
  phase: "1.5B",
  priority: 30,
  event: "PreTool"
};
