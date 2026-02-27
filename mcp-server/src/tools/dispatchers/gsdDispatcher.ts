/**
 * GSD Dispatcher v3.0 — FILE-BASED, single canonical source
 * Actions: core, quick, get, dev_protocol, resources_summary, quick_resume
 * 
 * W7: Canonical GSD source is data/docs/gsd/GSD_QUICK.md (v21.2+)
 * All actions read from this directory. No stale v20 references.
 * If file read fails, falls back to hardcoded string (safety requirement).
 * 
 * @version 3.0.0
 * @date 2026-02-11
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { PATHS } from "../../constants.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";

const STATE_DIR = PATHS.STATE_DIR;
const GSD_DIR = PATHS.GSD_DIR;
const GSD_SECTIONS_DIR = path.join(GSD_DIR, "sections");
const ACTIONS = ["core", "quick", "get", "dev_protocol", "resources_summary", "quick_resume"] as const;
const VALID_SECTIONS = ["laws", "workflow", "buffer", "equation", "tools", "manus", "evidence", "gates", "start", "end", "d1", "d2", "d3", "d4"] as const;

// ============================================================================
// FALLBACK CONTENT — used ONLY if file read fails
// These are safety nets, not the primary source. Edit the .md files instead.
// ============================================================================

const FALLBACK_QUICK = "# PRISM Quick Reference v22.0\n## 32 dispatchers | 382+ verified actions | 73 engines\n## GSD files not found — edit data/docs/gsd/GSD_QUICK.md\n## START: prism_dev session_boot → prism_context todo_update";

const FALLBACK_DEV_PROTOCOL = "# Dev Protocol\n## Files not found — edit data/docs/gsd/DEV_PROTOCOL.md";

const FALLBACK_SECTIONS: Record<string, string> = {
  laws: "## 6 LAWS\n1. S(x)≥0.70 HARD BLOCK\n2. No placeholders\n3. New≥Old\n4. MCP First\n5. No duplicates\n6. 100% utilization",
  buffer: "## BUFFER ZONES (ADVISORY)\n🟢0-20 🟡21-30 🔴31-40 ⚫41+\nCaps: 20KB/12KB(60%)/8KB(70%)/5KB(85%)",
  equation: "## Ω(x) = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L\nRELEASE≥0.70, HARD BLOCK: S(x)<0.70",
};

// ============================================================================
// GSD ACCESS TELEMETRY — Track which sections get read and when
// ============================================================================
const GSD_TELEMETRY_FILE = path.join(STATE_DIR, "gsd_access_log.json");

function logGsdAccess(action: string, section?: string): void {
  try {
    let log: any = { accesses: [], summary: {} };
    try { log = JSON.parse(fs.readFileSync(GSD_TELEMETRY_FILE, "utf-8")); } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
    const key = section ? `${action}:${section}` : action;
    log.summary[key] = (log.summary[key] || 0) + 1;
    log.accesses.push({ action, section, at: new Date().toISOString() });
    // Keep last 200 accesses to prevent file growth
    if (log.accesses.length > 200) log.accesses = log.accesses.slice(-200);
    log.last_updated = new Date().toISOString();
    safeWriteSync(GSD_TELEMETRY_FILE, JSON.stringify(log, null, 2));
  } catch { /* non-fatal — telemetry shouldn't break GSD */ }
}

// ============================================================================
// FILE READER with fallback
// ============================================================================

function readGsdFile(filename: string, fallback: string): string {
  const filepath = path.join(GSD_DIR, filename);
  try {
    const content = fs.readFileSync(filepath, "utf-8").trim();
    if (content.length > 0) return content;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown error";
    log.warn(`[GSD] Failed to read ${filename}: ${msg}`);
  }
  log.warn(`[GSD] Using fallback for ${filename}`);
  return fallback;
}

function readSection(section: string): string {
  // Validate against whitelist (path traversal protection)
  if (!(VALID_SECTIONS as readonly string[]).includes(section)) {
    return `Invalid section '${section}'. Valid: ${VALID_SECTIONS.join(", ")}`;
  }
  const filepath = path.join(GSD_SECTIONS_DIR, `${section}.md`);
  try {
    const content = fs.readFileSync(filepath, "utf-8").trim();
    if (content.length > 0) return content;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message.slice(0, 80) : "unknown error";
    log.warn(`[GSD] Failed to read section ${section}: ${msg}`);
  }
  return FALLBACK_SECTIONS[section] || `Section '${section}' not found. Create: data/docs/gsd/sections/${section}.md`;
}

// ============================================================================
// DISPATCHER REGISTRATION
// ============================================================================

export function registerGsdDispatcher(server: any): void {
  server.tool(
    "prism_gsd",
    `GSD (Get Shit Done) protocol access — FILE-BASED v3.0.\nActions: ${ACTIONS.join(", ")}\n\ncore: Full GSD (GSD_QUICK.md + DEV_PROTOCOL.md combined)\nquick: Quick reference from data/docs/gsd/GSD_QUICK.md\nget: Section from data/docs/gsd/sections/{section}.md (${VALID_SECTIONS.join("|")})\ndev_protocol: Dev protocol from data/docs/gsd/DEV_PROTOCOL.md\nresources_summary: Resource counts from CURRENT_STATE.json\nquick_resume: Quick resume from CURRENT_STATE.json\n\nEdit .md files directly — changes reflect immediately, no rebuild needed.`,
    {
      action: z.enum(ACTIONS).describe("GSD action"),
      params: z.record(z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_gsd] Action: ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      let result: any;
      try {
        switch (action) {
          case "core": {
            logGsdAccess("core");
            // W7: Canonical source is GSD_QUICK.md (v21.2+) + DEV_PROTOCOL.md
            const quick = readGsdFile("GSD_QUICK.md", FALLBACK_QUICK);
            const devProto = readGsdFile("DEV_PROTOCOL.md", FALLBACK_DEV_PROTOCOL);
            result = { 
              content: quick + "\n\n---\n\n" + devProto, 
              source: "canonical",
              version: "v21.2",
              files: ["GSD_QUICK.md", "DEV_PROTOCOL.md"]
            };
            break;
          }

          case "quick": {
            logGsdAccess("quick");
            const content = readGsdFile("GSD_QUICK.md", FALLBACK_QUICK);
            result = { content, source: fs.existsSync(path.join(GSD_DIR, "GSD_QUICK.md")) ? "file" : "fallback" };
            break;
          }

          case "get": {
            const section = params.section || "laws";
            logGsdAccess("get", section);
            const content = readSection(section);
            const filePath = path.join(GSD_SECTIONS_DIR, `${section}.md`);
            result = { section, content, source: fs.existsSync(filePath) ? "file" : "fallback" };
            break;
          }

          case "dev_protocol": {
            logGsdAccess("dev_protocol");
            const content = readGsdFile("DEV_PROTOCOL.md", FALLBACK_DEV_PROTOCOL);
            result = { content, source: fs.existsSync(path.join(GSD_DIR, "DEV_PROTOCOL.md")) ? "file" : "fallback" };
            break;
          }

          case "resources_summary": {
            try {
              const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
              if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
                const ri = state.resourceInventory || {};
                result = {
                  mcp_tools: ri.mcpTools || 324,
                  materials: ri.materials?.total || 3518,
                  machines: ri.machines?.total || 824,
                  alarms: ri.alarms?.total || 18942,
                  skills: ri.skills?.total || 119,
                  formulas: ri.formulas || 490,
                  agents: ri.agents?.total || 56,
                  hooks: ri.hooks?.total || 112,
                  scripts: ri.scripts?.total || 74,
                  source: "CURRENT_STATE.json"
                };
              } else {
                result = { mcp_tools: 324, materials: 3518, alarms: 18942, skills: 119, formulas: 490, agents: 56, hooks: 112, scripts: 74, source: "defaults" };
              }
            } catch { result = { source: "error", fallback: true }; }
            break;
          }

          case "quick_resume": {
            try {
              const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
              if (!fs.existsSync(statePath)) { result = { status: "NO_STATE_FILE", action: "Start fresh" }; break; }
              const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
              result = {
                status: "RESUME_READY",
                session: state.currentSession || state.session,
                quick_resume: state.quickResume || state.quick_resume,
                mcp_tools: state.resourceInventory?.mcpTools || 324,
                last_updated: state.timestamp
              };
            } catch (e: any) { result = { status: "ERROR", message: e.message }; }
            break;
          }
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_gsd");
      }
    }
  );
}
