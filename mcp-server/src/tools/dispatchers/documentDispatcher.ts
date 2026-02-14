/**
 * Document Dispatcher - Consolidates 7 document tools → 1
 * Actions: list, read, write, append, roadmap_status, action_tracker, migrate
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { atomicWrite } from "../../utils/atomicWrite.js";

const DOCS_DIR = path.join(__dirname, "../../data/docs");
const LEGACY_STATE_DIR = "C:\\PRISM\\state";
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

function getDocPath(name: string): string { return path.join(DOCS_DIR, name); }
function docExists(name: string): boolean { return fs.existsSync(getDocPath(name)); }
function readDoc(name: string): string {
  const docPath = getDocPath(name);
  if (!fs.existsSync(docPath)) {
    const legacyPath = path.join(LEGACY_STATE_DIR, name);
    if (fs.existsSync(legacyPath)) {
      const content = fs.readFileSync(legacyPath, "utf-8");
      fs.writeFileSync(docPath, content, "utf-8");
      return content;
    }
    throw new Error(`Document not found: ${name}`);
  }
  return fs.readFileSync(docPath, "utf-8");
}
function writeDoc(name: string, content: string): void { fs.writeFileSync(getDocPath(name), content, "utf-8"); }
function listDocs(): string[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md") || f.endsWith(".json"));
}
function summarizeMarkdown(content: string, maxLines = 15): string {
  const lines = content.split("\n");
  const summary: string[] = [];
  const titleLine = lines.find(l => l.startsWith("# "));
  if (titleLine) summary.push(titleLine);
  const h2s = lines.map((l, i) => ({ line: l, idx: i })).filter(({ line }) => line.startsWith("## "));
  for (const h2 of h2s.slice(0, 10)) {
    summary.push(h2.line);
    for (let j = h2.idx + 1; j < Math.min(h2.idx + 4, lines.length); j++) {
      if (/[✅❌⏳]/.test(lines[j]) || /Status:/.test(lines[j]) || /^\|/.test(lines[j])) summary.push(lines[j]);
    }
  }
  return [...new Set(summary)].slice(0, maxLines).join("\n");
}

function parseRoadmapStatus(content: string): object {
  const lines = content.split("\n");
  const items: any[] = [];
  let currentTier = "";
  for (const line of lines) {
    if (line.startsWith("## Tier")) currentTier = line.replace("## ", "");
    if (line.startsWith("### ") && line.includes(":")) {
      const match = line.match(/### \d+\.\s*(P[\w-]+):\s*(.+)/);
      if (match) {
        const [, id, title] = match;
        const idx = lines.indexOf(line);
        let status = "UNKNOWN";
        for (let j = idx + 1; j < Math.min(idx + 10, lines.length); j++) {
          if (/Status/i.test(lines[j])) {
            const sm = lines[j].match(/Status\*?\*?:?\s*(.*)/i);
            if (sm) { status = sm[1].replace(/\*\*/g, "").trim(); break; }
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
    items: items.map(i => `${i.status.includes("COMPLETE") || i.status.includes("✅") ? "✅" : "❌"} ${i.id}: ${i.title}`),
  };
}
function parseActionTracker(content: string): object {
  const lines = content.split("\n");
  const completed = lines.filter(l => l.trim().startsWith("- [x]")).length;
  const pending = lines.filter(l => l.trim().startsWith("- [ ]")).length;
  const sessionMatch = content.match(/Session:\s*(\d+)/);
  const lastUpdated = content.match(/Last Updated:\s*(.+)/);
  const pendingItems = lines.filter(l => l.trim().startsWith("- [ ]")).map(l => l.trim().replace("- [ ] ", "")).slice(0, 5);
  return { session: sessionMatch?.[1] || "unknown", last_updated: lastUpdated?.[1]?.trim() || "unknown", completed_tasks: completed, pending_tasks: pending, pending_items: pendingItems };
}

const ACTIONS = ["list", "read", "write", "append", "roadmap_status", "action_tracker", "migrate"] as const;

export function registerDocumentDispatcher(server: any): void {
  server.tool(
    "prism_doc",
    `Document management dispatcher. Actions: list, read, write, append, roadmap_status, action_tracker, migrate.
Params: read/write/append need 'name'. write needs 'content'. read accepts 'detail':true for full content.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_doc] Action: ${action}`);
      let result: any;
      try {
        switch (action) {
          case "list": {
            const docs = listDocs();
            const details = docs.map(name => {
              const stat = fs.statSync(getDocPath(name));
              return { name, size: stat.size, modified: stat.mtime.toISOString() };
            });
            result = { documents: details, count: details.length, path: DOCS_DIR };
            break;
          }
          case "read": {
            const content = readDoc(params.name);
            if (params.detail) { result = { content }; }
            else { result = { summary: summarizeMarkdown(content) }; }
            break;
          }
          case "write": {
            // Pre-file-write hooks (anti-regression, backup, structure preservation)
            const hookCtx = {
              operation: "doc_write",
              target: { type: "file" as const, id: params.name, path: getDocPath(params.name) },
              content: { old: docExists(params.name) ? readDoc(params.name) : undefined, new: params.content },
              metadata: { dispatcher: "documentDispatcher", action: "write", name: params.name }
            };
            const preResult = await hookExecutor.execute("pre-file-write", hookCtx);
            if (preResult.blocked) {
              result = { blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, document: params.name };
              break;
            }
            
            writeDoc(params.name, params.content);
            const stat = fs.statSync(getDocPath(params.name));
            result = { written: params.name, size: stat.size, path: getDocPath(params.name) };
            
            // Post-file-write hooks (non-blocking)
            try { await hookExecutor.execute("post-file-write", { ...hookCtx, metadata: { ...hookCtx.metadata, result } }); }
            catch (e) { log.warn(`[prism_doc] Post-write hook error: ${e}`); }
            break;
          }
          case "append": {
            const existing = docExists(params.name) ? readDoc(params.name) : "";
            const newContent = existing + "\n" + params.content;
            
            // Pre-file-write hooks for append
            const appendCtx = {
              operation: "doc_append",
              target: { type: "file" as const, id: params.name, path: getDocPath(params.name) },
              content: { old: existing, new: newContent },
              metadata: { dispatcher: "documentDispatcher", action: "append", name: params.name }
            };
            const appendPre = await hookExecutor.execute("pre-file-write", appendCtx);
            if (appendPre.blocked) {
              result = { blocked: true, blocker: appendPre.blockedBy, reason: appendPre.summary, document: params.name };
              break;
            }
            
            writeDoc(params.name, newContent);
            result = { appended: params.name, added_bytes: (params.content || "").length };
            
            try { await hookExecutor.execute("post-file-write", { ...appendCtx, metadata: { ...appendCtx.metadata, result } }); }
            catch (e) { log.warn(`[prism_doc] Post-append hook error: ${e}`); }
            break;
          }
          case "roadmap_status": {
            const content = readDoc("PRIORITY_ROADMAP.md");
            result = parseRoadmapStatus(content);
            break;
          }
          case "action_tracker": {
            const content = readDoc("ACTION_TRACKER.md");
            if (params.detail) { result = { content }; }
            else { result = parseActionTracker(content); }
            break;
          }
          case "migrate": {
            const migrated: string[] = [], failed: string[] = [];
            if (fs.existsSync(LEGACY_STATE_DIR)) {
              const files = fs.readdirSync(LEGACY_STATE_DIR).filter(f => f.endsWith(".md") || f.endsWith(".json"));
              for (const file of files) {
                try { writeDoc(file, fs.readFileSync(path.join(LEGACY_STATE_DIR, file), "utf-8")); migrated.push(file); }
                catch (e: any) { failed.push(`${file}: ${e.message}`); }
              }
            }
            result = { migrated, failed, migrated_count: migrated.length, docs_dir: DOCS_DIR };
            break;
          }
          default: result = { error: `Unknown action: ${action}`, available: ACTIONS };
        }
        return { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }] };
      } catch (error: any) {
        log.error(`[prism_doc] Error: ${error.message}`);
        return { content: [{ type: "text", text: JSON.stringify({ error: error.message, action }) }], isError: true };
      }
    }
  );
  log.info("✅ Registered: prism_doc dispatcher (7 actions)");
}
