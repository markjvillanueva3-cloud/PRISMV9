/**
 * MCP Resources for PRISM
 *
 * Exposes PRISM's catalogs as browsable MCP resources with URI templates.
 * Clients can read resources directly into context without tool calls.
 *
 * Resource URIs:
 * - prism://machine/{machineId}     — Machine profile + kinematics
 * - prism://material/{materialId}   — Material properties
 * - prism://tool/{toolId}           — Cutting tool geometry + coating
 * - prism://playbook/{category}     — Machining rules by domain
 * - prism://tribal/{camSystem}      — CAM tribal knowledge tips
 * - prism://alarm/{code}            — Controller alarm decode
 *
 * @see MCP Resources spec 2025-11-25
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  materialRegistry,
} from "../registries/MaterialRegistry.js";
import {
  machineRegistry,
} from "../registries/MachineRegistry.js";
import {
  toolRegistry,
} from "../registries/ToolRegistry.js";
import {
  alarmRegistry,
} from "../registries/AlarmRegistry.js";
import { log } from "../utils/Logger.js";

function safeJson(data: unknown): string {
  return JSON.stringify(data ?? null);
}

export function registerResources(server: McpServer): void {
  // ═══════════════════════════════════════════════════════════
  // Static resource — system overview
  // ═══════════════════════════════════════════════════════════

  server.resource(
    "system-overview",
    "prism://system/overview",
    {
      description:
        "PRISM system overview: engine count, dispatcher count, " +
        "material/machine/tool totals, capability summary",
      mimeType: "application/json",
    },
    async () => ({
      contents: [{
        uri: "prism://system/overview",
        mimeType: "application/json",
        text: JSON.stringify({
          name: "PRISM Manufacturing Intelligence",
          version: "5.3.0",
          dispatchers: 67,
          actions: 2474,
          engines: 1031,
          materials: 2957,
          machines: 910,
          tools: 94177,
          alarms: 10033,
          formulas: 499,
          algorithms: 51,
          playbook_rules: 296,
          tribal_tips: 3700,
          strategies: 433,
        }),
      }],
    })
  );

  // ═══════════════════════════════════════════════════════════
  // Dynamic resources — URI templates for catalog lookups
  // ═══════════════════════════════════════════════════════════

  server.resource(
    "machine-profile",
    new ResourceTemplate("prism://machine/{machineId}", {
      list: undefined,
    }),
    {
      description:
        "Machine profile: specs, kinematics, controller, " +
        "collision zones. Use machine name or ID.",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const id = String(params.machineId ?? "");
      try {
        const machine = machineRegistry.getByIdOrModel(id);
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson(
              machine ?? { error: `Machine not found: ${id}` }
            ),
          }],
        };
      } catch (err) {
        console.error(`[PRISM:resources] machine lookup failed for '${id}':`, err instanceof Error ? err.message : err);
        log.warn(`[MCP Resource] Machine lookup failed: ${id}`, { error: String(err) });
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson({ error: `Machine lookup failed: ${id}` }),
          }],
        };
      }
    }
  );

  server.resource(
    "material-properties",
    new ResourceTemplate("prism://material/{materialId}", {
      list: undefined,
    }),
    {
      description:
        "Material properties: Kienzle kc1.1/mc, Taylor C/n, " +
        "density, hardness, thermal conductivity, ISO group",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const id = String(params.materialId ?? "");
      try {
        const material = await materialRegistry.getByIdOrName(id);
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson(
              material ?? { error: `Material not found: ${id}` }
            ),
          }],
        };
      } catch (err) {
        console.error(`[PRISM:resources] material lookup failed for '${id}':`, err instanceof Error ? err.message : err);
        log.warn(`[MCP Resource] Material lookup failed: ${id}`, { error: String(err) });
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson({ error: `Material lookup failed: ${id}` }),
          }],
        };
      }
    }
  );

  server.resource(
    "cutting-tool",
    new ResourceTemplate("prism://tool/{toolId}", {
      list: undefined,
    }),
    {
      description:
        "Cutting tool data: geometry, coating, grade, " +
        "collision dimensions, manufacturer specs",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const id = String(params.toolId ?? "");
      try {
        const tool = toolRegistry.get(id);
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson(
              tool ?? { error: `Tool not found: ${id}` }
            ),
          }],
        };
      } catch (err) {
        console.error(`[PRISM:resources] tool lookup failed for '${id}':`, err instanceof Error ? err.message : err);
        log.warn(`[MCP Resource] Tool lookup failed: ${id}`, { error: String(err) });
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson({ error: `Tool lookup failed: ${id}` }),
          }],
        };
      }
    }
  );

  server.resource(
    "alarm-decode",
    new ResourceTemplate("prism://alarm/{alarmCode}", {
      list: undefined,
    }),
    {
      description:
        "Controller alarm decode: meaning, cause, fix steps. " +
        "Supports Fanuc, Siemens, Haas, Mazak, Okuma, etc.",
      mimeType: "application/json",
    },
    async (uri, params) => {
      const code = String(params.alarmCode ?? "");
      try {
        // Try common controllers in order
        const controllers = [
          "FANUC", "SIEMENS", "HAAS", "MAZAK", "OKUMA",
        ];
        for (const ctrl of controllers) {
          const alarm = await alarmRegistry.decode(ctrl, code);
          if (alarm) {
            return {
              contents: [{
                uri: uri.href,
                mimeType: "application/json",
                text: safeJson(alarm),
              }],
            };
          }
        }
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson({ error: `Alarm not found: ${code}` }),
          }],
        };
      } catch (err) {
        console.error(`[PRISM:resources] alarm decode failed for '${code}':`, err instanceof Error ? err.message : err);
        log.warn(`[MCP Resource] Alarm decode failed: ${code}`, { error: String(err) });
        return {
          contents: [{
            uri: uri.href,
            mimeType: "application/json",
            text: safeJson({ error: `Alarm decode failed: ${code}` }),
          }],
        };
      }
    }
  );

  log.info(
    "[MCP Resources] Registered 5 resource types " +
    "(1 static + 4 templates)"
  );
}
