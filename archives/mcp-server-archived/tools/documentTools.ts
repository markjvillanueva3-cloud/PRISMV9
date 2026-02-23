/**
 * PRISM MCP Server - Document Management Tools
 * Manages all PRISM planning/state documents via MCP to save context tokens.
 * Instead of DC:read_file dumping 100+ lines, these tools return compact summaries.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONSTANTS
// ============================================================================

const DOCS_DIR = path.join(__dirname, "../../data/docs");
const LEGACY_STATE_DIR = "C:\\PRISM\\state";

// Ensure docs directory exists
if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}

// ============================================================================
// HELPERS
// ============================================================================

function getDocPath(name: string): string {
  return path.join(DOCS_DIR, name);
}

function docExists(name: string): boolean {
  return fs.existsSync(getDocPath(name));
}

function readDoc(name: string): string {
  const docPath = getDocPath(name);
  if (!fs.existsSync(docPath)) {
    // Try legacy path
    const legacyPath = path.join(LEGACY_STATE_DIR, name);
    if (fs.existsSync(legacyPath)) {
      // Auto-migrate: copy to new location
      const content = fs.readFileSync(legacyPath, "utf-8");
      fs.writeFileSync(docPath, content, "utf-8");
      return content;
    }
    throw new Error(`Document not found: ${name}`);
  }
  return fs.readFileSync(docPath, "utf-8");
}

function writeDoc(name: string, content: string): void {
  fs.writeFileSync(getDocPath(name), content, "utf-8");
}

function listDocs(): string[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md") || f.endsWith(".json"));
}

/**
 * Parse markdown into a compact summary:
 * - Extract headings and status markers
 * - Count sections
 * - Return key stats
 */
function summarizeMarkdown(content: string, maxLines: number = 15): string {
  const lines = content.split("\n");
  const summary: string[] = [];
  
  // Extract title
  const titleLine = lines.find(l => l.startsWith("# "));
  if (titleLine) summary.push(titleLine);
  
  // Extract status lines (lines with ✅, ❌, ⏳, or Status:)
  const statusLines = lines.filter(l => 
    /[✅❌⏳🔴🟢🟡]/.test(l) || 
    /Status:/.test(l) ||
    /^\|\s*\w/.test(l) // table rows
  );
  
  // Extract h2 headings with any immediate status
  const h2s = lines
    .map((l, i) => ({ line: l, idx: i }))
    .filter(({ line }) => line.startsWith("## "));
  
  for (const h2 of h2s.slice(0, 10)) {
    summary.push(h2.line);
    // Check next few lines for status markers
    for (let j = h2.idx + 1; j < Math.min(h2.idx + 4, lines.length); j++) {
      if (/[✅❌⏳]/.test(lines[j]) || /Status:/.test(lines[j]) || /^\|/.test(lines[j])) {
        summary.push(lines[j]);
      }
    }
  }
  
  // Deduplicate and trim
  const unique = [...new Set(summary)].slice(0, maxLines);
  return unique.join("\n");
}

/**
 * Parse PRIORITY_ROADMAP.md into compact status
 */
function parseRoadmapStatus(content: string): object {
  const lines = content.split("\n");
  const items: any[] = [];
  let currentTier = "";
  
  for (const line of lines) {
    if (line.startsWith("## Tier")) {
      currentTier = line.replace("## ", "");
    }
    if (line.startsWith("### ") && line.includes(":")) {
      const match = line.match(/### \d+\.\s*(P[\w-]+):\s*(.+)/);
      if (match) {
        const id = match[1];
        const title = match[2];
        // Look for Status line in various formats
        const idx = lines.indexOf(line);
        let status = "UNKNOWN";
        for (let j = idx + 1; j < Math.min(idx + 10, lines.length); j++) {
          if (/Status/i.test(lines[j])) {
            // Handle both "- **Status**: ❌ NOT STARTED" and "Status: NOT STARTED"
            const statusMatch = lines[j].match(/Status\*?\*?:?\s*(.*)/i);
            if (statusMatch) {
              status = statusMatch[1].replace(/\*\*/g, "").trim();
            }
            break;
          }
        }
        items.push({ id, title, status, tier: currentTier });
      }
    }
  }
  
  const nextItem = items.find(i => i.status.includes("NOT STARTED") || i.status.includes("IN PROGRESS"));
  
  return {
    total: items.length,
    completed: items.filter(i => i.status.includes("COMPLETE") || i.status.includes("✅")).length,
    next: nextItem ? `${nextItem.id}: ${nextItem.title}` : "ALL COMPLETE",
    next_status: nextItem?.status || "N/A",
    items: items.map(i => `${i.status.includes("COMPLETE") || i.status.includes("✅") ? "✅" : "❌"} ${i.id}: ${i.title}`),
  };
}

/**
 * Parse ACTION_TRACKER.md into compact status
 */
function parseActionTracker(content: string): object {
  const lines = content.split("\n");
  
  const completed = lines.filter(l => l.trim().startsWith("- [x]")).length;
  const pending = lines.filter(l => l.trim().startsWith("- [ ]")).length;
  
  // Get last session info
  const sessionMatch = content.match(/Session:\s*(\d+)/);
  const lastUpdated = content.match(/Last Updated:\s*(.+)/);
  
  // Get status table
  const statusTable: string[] = [];
  let inTable = false;
  for (const line of lines) {
    if (line.includes("| System") || line.includes("| Registry")) inTable = true;
    if (inTable && line.startsWith("|")) statusTable.push(line.trim());
    if (inTable && !line.startsWith("|") && line.trim() !== "") inTable = false;
  }
  
  // Get pending items
  const pendingItems = lines
    .filter(l => l.trim().startsWith("- [ ]"))
    .map(l => l.trim().replace("- [ ] ", ""))
    .slice(0, 5);
  
  return {
    session: sessionMatch?.[1] || "unknown",
    last_updated: lastUpdated?.[1]?.trim() || "unknown",
    completed_tasks: completed,
    pending_tasks: pending,
    pending_items: pendingItems,
    status_summary: statusTable.slice(0, 8),
  };
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerDocumentTools(server: McpServer): void {

  // ---- prism_doc_list ----
  server.tool(
    "prism_doc_list",
    "List all managed PRISM documents. Returns names and sizes.",
    {},
    async () => {
      const docs = listDocs();
      const details = docs.map(name => {
        const stat = fs.statSync(getDocPath(name));
        return { name, size: stat.size, modified: stat.mtime.toISOString() };
      });
      return { content: [{ type: "text", text: JSON.stringify({ documents: details, count: details.length, path: DOCS_DIR }, null, 2) }] };
    }
  );

  // ---- prism_doc_read ----
  server.tool(
    "prism_doc_read",
    "Read a PRISM document. Default returns compact summary (saves tokens). Use detail=true for full content.",
    {
      name: z.string().describe("Document filename (e.g., 'PRIORITY_ROADMAP.md', 'ACTION_TRACKER.md')"),
      detail: z.boolean().optional().default(false).describe("If true, return full content. Default: compact summary."),
    },
    async (args) => {
      try {
        const content = readDoc(args.name);
        if (args.detail) {
          return { content: [{ type: "text", text: content }] };
        }
        const summary = summarizeMarkdown(content);
        return { content: [{ type: "text", text: summary }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }] };
      }
    }
  );

  // ---- prism_doc_write ----
  server.tool(
    "prism_doc_write",
    "Write or update a PRISM document in the MCP server. All docs should live here, not on C: drive.",
    {
      name: z.string().describe("Document filename (e.g., 'PRIORITY_ROADMAP.md')"),
      content: z.string().describe("Full document content to write"),
    },
    async (args) => {
      writeDoc(args.name, args.content);
      const stat = fs.statSync(getDocPath(args.name));
      return { content: [{ type: "text", text: JSON.stringify({ written: args.name, size: stat.size, path: getDocPath(args.name) }, null, 2) }] };
    }
  );

  // ---- prism_doc_append ----
  server.tool(
    "prism_doc_append",
    "Append content to an existing PRISM document.",
    {
      name: z.string().describe("Document filename"),
      content: z.string().describe("Content to append"),
    },
    async (args) => {
      const existing = docExists(args.name) ? readDoc(args.name) : "";
      writeDoc(args.name, existing + "\n" + args.content);
      return { content: [{ type: "text", text: JSON.stringify({ appended: args.name, added_bytes: args.content.length }, null, 2) }] };
    }
  );

  // ---- prism_roadmap_status ----
  server.tool(
    "prism_roadmap_status",
    "Get compact roadmap status. Returns: next task, completion count, all items with status. Ultra-low token usage.",
    {},
    async () => {
      try {
        const content = readDoc("PRIORITY_ROADMAP.md");
        const status = parseRoadmapStatus(content);
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}. Run prism_doc_write to create PRIORITY_ROADMAP.md first.` }] };
      }
    }
  );

  // ---- prism_action_tracker ----
  server.tool(
    "prism_action_tracker",
    "Get compact action tracker status. Returns: session#, completed/pending counts, pending items. Replaces 139-line DC:read_file.",
    {
      detail: z.boolean().optional().default(false).describe("If true, return full content"),
    },
    async (args) => {
      try {
        const content = readDoc("ACTION_TRACKER.md");
        if (args.detail) {
          return { content: [{ type: "text", text: content }] };
        }
        const status = parseActionTracker(content);
        return { content: [{ type: "text", text: JSON.stringify(status, null, 2) }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }] };
      }
    }
  );

  // ---- prism_doc_migrate ----
  server.tool(
    "prism_doc_migrate",
    "Migrate documents from C:\\PRISM\\state\\ to MCP server data/docs/. Run once to centralize all docs.",
    {},
    async () => {
      const migrated: string[] = [];
      const failed: string[] = [];
      
      if (fs.existsSync(LEGACY_STATE_DIR)) {
        const files = fs.readdirSync(LEGACY_STATE_DIR).filter(f => f.endsWith(".md") || f.endsWith(".json"));
        for (const file of files) {
          try {
            const src = path.join(LEGACY_STATE_DIR, file);
            const content = fs.readFileSync(src, "utf-8");
            writeDoc(file, content);
            migrated.push(file);
          } catch (e: any) {
            failed.push(`${file}: ${e.message}`);
          }
        }
      }
      
      return { content: [{ type: "text", text: JSON.stringify({ migrated, failed, migrated_count: migrated.length, docs_dir: DOCS_DIR }, null, 2) }] };
    }
  );
}
