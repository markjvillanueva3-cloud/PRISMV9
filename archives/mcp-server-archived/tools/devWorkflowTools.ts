/**
 * PRISM MCP Server - Dev Workflow Tools
 * Session boot, build runner, code templates, code search.
 * Replaces multiple DC: calls with single MCP tool calls.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ============================================================================
// CONSTANTS
// ============================================================================

// __dirname at runtime = C:\PRISM\mcp-server\dist (esbuild output)
const MCP_ROOT = path.join(__dirname, "..");       // C:\PRISM\mcp-server
const PROJECT_ROOT = path.join(__dirname, "../.."); // C:\PRISM
const SRC_DIR = path.join(MCP_ROOT, "src");
const DIST_DIR = path.join(MCP_ROOT, "dist");
const DOCS_DIR = path.join(PROJECT_ROOT, "data/docs");
const STATE_DIR = path.join(PROJECT_ROOT, "state");

// ============================================================================
// CODE TEMPLATES (cached, never need to re-read source files)
// ============================================================================

const CODE_TEMPLATES: Record<string, string> = {
  "tool_registration": `
// Pattern: How to register a new tool file
// 1. Create src/tools/myTools.ts with this pattern:

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerMyTools(server: McpServer): void {
  server.tool(
    "tool_name",
    "Description of what this tool does",
    {
      param1: z.string().describe("Parameter description"),
      param2: z.number().optional().default(10),
    },
    async (args) => {
      const result = { /* your logic */ };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}

// 2. Add to src/index.ts:
//    import { registerMyTools } from "./tools/myTools.js";
//    registerMyTools(server);
//    log.debug("Registered: My tools (N tools)");
// 3. npm run build
`,

  "index_import": `
// Add these lines to src/index.ts:
// At top with other imports:
import { registerMyTools } from "./tools/myTools.js";

// In registerTools() function:
registerMyTools(server);
log.debug("Registered: My tools (N tools)");
`,

  "registry_data_loader": `
// Pattern: Loading JSON data into a registry
import * as fs from "fs";
import * as path from "path";

function loadJsonData(dir: string): any[] {
  const items: any[] = [];
  if (!fs.existsSync(dir)) return items;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      if (Array.isArray(data)) items.push(...data);
      else if (data.items) items.push(...data.items);
      else items.push(data);
    } catch (e) { /* skip bad files */ }
  }
  return items;
}
`,

  "zod_schemas": `
// Common Zod schema patterns:
z.string()                          // required string
z.string().optional()               // optional string
z.string().default("value")         // string with default
z.number().min(0).max(100)          // bounded number
z.boolean().optional().default(false)
z.enum(["a", "b", "c"])            // enum
z.object({ key: z.string() })      // nested object
z.array(z.string())                // string array
`,
};

// ============================================================================
// HELPERS
// ============================================================================

function searchFiles(dir: string, pattern: string, maxResults: number = 20): any[] {
  const results: any[] = [];
  const regex = new RegExp(pattern, "gi");
  
  function walk(d: string) {
    if (results.length >= maxResults) return;
    if (!fs.existsSync(d)) return;
    
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= maxResults) return;
      const full = path.join(d, entry.name);
      
      if (entry.isDirectory() && !entry.name.includes("node_modules") && entry.name !== ".git") {
        walk(full);
      } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
        try {
          const content = fs.readFileSync(full, "utf-8");
          const lines = content.split("\n");
          for (let i = 0; i < lines.length; i++) {
            if (regex.test(lines[i])) {
              results.push({
                file: full.replace(MCP_ROOT + path.sep, ""),
                line: i + 1,
                text: lines[i].trim().substring(0, 120),
              });
              if (results.length >= maxResults) return;
            }
          }
        } catch (e) { /* skip unreadable */ }
      }
    }
  }
  
  walk(dir);
  return results;
}

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerDevWorkflowTools(server: McpServer): void {

  // ---- prism_session_boot ----
  server.tool(
    "prism_session_boot",
    `Combined session boot: loads quick_resume + action tracker + roadmap status in ONE call.
Replaces 3 separate tool calls. Returns compact summary only.`,
    {},
    async () => {
      const result: any = { timestamp: new Date().toISOString() };
      
      // 1. Quick resume from state
      try {
        const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
        if (fs.existsSync(statePath)) {
          const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
          result.quick_resume = state.quickResume || state.quick_resume || "No quick resume available";
          result.session = state.session || state.sessionNumber || "unknown";
          result.phase = state.phase || state.currentPhase || "unknown";
        }
      } catch (e) { result.quick_resume = "State file not found or invalid"; }
      
      // 2. Action tracker summary
      try {
        let atContent = "";
        const mcpPath = path.join(DOCS_DIR, "ACTION_TRACKER.md");
        const legacyPath = path.join(STATE_DIR, "ACTION_TRACKER.md");
        
        if (fs.existsSync(mcpPath)) atContent = fs.readFileSync(mcpPath, "utf-8");
        else if (fs.existsSync(legacyPath)) atContent = fs.readFileSync(legacyPath, "utf-8");
        
        if (atContent) {
          const completed = (atContent.match(/- \[x\]/g) || []).length;
          const pending = (atContent.match(/- \[ \]/g) || []).length;
          const pendingItems = atContent.split("\n")
            .filter(l => l.trim().startsWith("- [ ]"))
            .map(l => l.trim().replace("- [ ] ", ""))
            .slice(0, 3);
          result.action_tracker = { completed, pending, next_items: pendingItems };
        }
      } catch (e) { result.action_tracker = "Not found"; }
      
      // 3. Roadmap status
      try {
        let rmContent = "";
        const mcpPath = path.join(DOCS_DIR, "PRIORITY_ROADMAP.md");
        const legacyPath = path.join(STATE_DIR, "PRIORITY_ROADMAP.md");
        
        if (fs.existsSync(mcpPath)) rmContent = fs.readFileSync(mcpPath, "utf-8");
        else if (fs.existsSync(legacyPath)) rmContent = fs.readFileSync(legacyPath, "utf-8");
        
        if (rmContent) {
          const items = rmContent.split("\n").filter(l => /### \d+\./.test(l));
          const notStarted = rmContent.split("\n").filter(l => l.includes("NOT STARTED")).length;
          result.roadmap = {
            total_items: items.length,
            not_started: notStarted,
            next: items[0]?.replace("### ", "").trim() || "None",
          };
        }
      } catch (e) { result.roadmap = "Not found"; }
      
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ---- prism_build ----
  server.tool(
    "prism_build",
    `Run npm run build (esbuild) and return pass/fail with errors only. 
Replaces DC:start_process + read_process_output. Returns compact result.`,
    {},
    async () => {
      try {
        const output = execSync("npm run build", {
          cwd: MCP_ROOT,
          timeout: 30000,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });
        return { content: [{ type: "text", text: JSON.stringify({ 
          status: "SUCCESS", 
          message: "Build completed successfully",
          output: output.trim().split("\n").slice(-5).join("\n"),
        }, null, 2) }] };
      } catch (e: any) {
        const stderr = e.stderr?.toString() || "";
        const stdout = e.stdout?.toString() || "";
        // Extract just the error lines
        const errorLines = (stderr + "\n" + stdout)
          .split("\n")
          .filter(l => /error|Error|ERROR|fail|FAIL/.test(l))
          .slice(0, 10);
        return { content: [{ type: "text", text: JSON.stringify({ 
          status: "FAILED", 
          errors: errorLines,
          exit_code: e.status,
        }, null, 2) }] };
      }
    }
  );

  // ---- prism_code_template ----
  server.tool(
    "prism_code_template",
    `Get a cached code template/pattern. Saves tokens by not re-reading source files.
Available: tool_registration, index_import, registry_data_loader, zod_schemas`,
    {
      template: z.enum(["tool_registration", "index_import", "registry_data_loader", "zod_schemas"])
        .describe("Template name"),
    },
    async (args) => {
      const tmpl = CODE_TEMPLATES[args.template];
      if (!tmpl) {
        return { content: [{ type: "text", text: `Unknown template. Available: ${Object.keys(CODE_TEMPLATES).join(", ")}` }] };
      }
      return { content: [{ type: "text", text: tmpl.trim() }] };
    }
  );

  // ---- prism_code_search ----
  server.tool(
    "prism_code_search",
    `Search MCP server source code for patterns. Returns file:line:text matches.
Replaces DC:start_search on src/ directory.`,
    {
      pattern: z.string().describe("Search pattern (regex)"),
      scope: z.enum(["src", "dist", "both"]).optional().default("src").describe("Where to search"),
      max_results: z.number().optional().default(20),
    },
    async (args) => {
      const dirs: string[] = [];
      if (args.scope === "src" || args.scope === "both") dirs.push(SRC_DIR);
      if (args.scope === "dist" || args.scope === "both") dirs.push(DIST_DIR);
      
      const allResults: any[] = [];
      for (const dir of dirs) {
        allResults.push(...searchFiles(dir, args.pattern, args.max_results));
      }
      
      return { content: [{ type: "text", text: JSON.stringify({ 
        pattern: args.pattern,
        scope: args.scope,
        matches: allResults.slice(0, args.max_results),
        total: allResults.length,
      }, null, 2) }] };
    }
  );

  // ---- prism_file_read ----
  server.tool(
    "prism_file_read",
    `Read any file within the MCP server directory. Replaces DC:read_file for MCP-internal files.
Returns content with line count. Use for source files, configs, data files.`,
    {
      path: z.string().describe("Relative path from mcp-server root (e.g., 'src/index.ts', 'data/docs/ROADMAP.md')"),
      start_line: z.number().optional().default(0).describe("Start line (0-based)"),
      max_lines: z.number().optional().default(100).describe("Max lines to return"),
    },
    async (args) => {
      const fullPath = path.join(MCP_ROOT, args.path);
      if (!fs.existsSync(fullPath)) {
        return { content: [{ type: "text", text: `File not found: ${args.path}` }] };
      }
      
      const content = fs.readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      const slice = lines.slice(args.start_line, args.start_line + args.max_lines);
      
      return { content: [{ type: "text", text: JSON.stringify({
        path: args.path,
        total_lines: lines.length,
        showing: `${args.start_line}-${args.start_line + slice.length}`,
        content: slice.join("\n"),
      }, null, 2) }] };
    }
  );

  // ---- prism_file_write ----
  server.tool(
    "prism_file_write",
    `Write a file within the MCP server directory. Use for creating/updating source files, configs, data.`,
    {
      path: z.string().describe("Relative path from mcp-server root"),
      content: z.string().describe("File content to write"),
    },
    async (args) => {
      const fullPath = path.join(MCP_ROOT, args.path);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      
      fs.writeFileSync(fullPath, args.content, "utf-8");
      const stat = fs.statSync(fullPath);
      return { content: [{ type: "text", text: JSON.stringify({ 
        written: args.path, 
        size: stat.size,
        lines: args.content.split("\n").length,
      }, null, 2) }] };
    }
  );

  // ---- prism_server_info ----
  server.tool(
    "prism_server_info",
    `Get MCP server structure overview. Replaces DC:list_directory on src/tools/.`,
    {},
    async () => {
      const toolFiles = fs.existsSync(path.join(SRC_DIR, "tools"))
        ? fs.readdirSync(path.join(SRC_DIR, "tools")).filter(f => f.endsWith(".ts")).sort()
        : [];
      
      const dataFiles = fs.existsSync(path.join(MCP_ROOT, "data"))
        ? fs.readdirSync(path.join(MCP_ROOT, "data"), { withFileTypes: true })
            .map(d => d.isDirectory() ? `[DIR] ${d.name}` : d.name)
        : [];
      
      const docFiles = listDocsInternal();
      
      return { content: [{ type: "text", text: JSON.stringify({
        tool_files: toolFiles,
        tool_count: toolFiles.length,
        data_dirs: dataFiles,
        docs: docFiles,
        mcp_root: MCP_ROOT,
      }, null, 2) }] };
    }
  );
}

// Internal helper (can't import from documentTools to avoid circular)
function listDocsInternal(): string[] {
  if (!fs.existsSync(DOCS_DIR)) return [];
  return fs.readdirSync(DOCS_DIR).filter(f => f.endsWith(".md") || f.endsWith(".json"));
}
