/**
 * MCP Resources for PRISM
 *
 * Exposes PRISM catalogs as browsable MCP resources with URI templates.
 * Clients can read resources directly into context without tool calls.
 *
 * Resource URIs:
 * - prism://system/overview        — Live server + registry summary
 * - prism://machine/{machineId}     — Machine profile + kinematics
 * - prism://material/{materialId}   — Material properties
 * - prism://tool/{toolId}           — Cutting tool geometry + coating
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
import { registryManager } from "../registries/index.js";
import { SERVER_DESCRIPTION, SERVER_NAME, SERVER_VERSION } from "../constants.js";
import { DISPATCHER_ANNOTATIONS } from "./toolAnnotations.js";
import { actionSchemaCacheEngine } from "../engines/ActionSchemaCacheEngine.js";
import { log } from "../utils/Logger.js";

function safeJson(data: unknown): string {
  return JSON.stringify(data ?? null);
}

async function buildSystemOverview(): Promise<Record<string, unknown>> {
  let registryInitError: string | undefined;

  try {
    await registryManager.initialize();
  } catch (error) {
    registryInitError = error instanceof Error ? error.message : String(error);
  }

  const actionStats = actionSchemaCacheEngine.getStats();

  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    description: SERVER_DESCRIPTION,
    registries_initialized: registryManager.isInitialized(),
    registry_init_error: registryInitError,
    dispatchers: actionStats.dispatchers,
    annotated_dispatchers: Object.keys(DISPATCHER_ANNOTATIONS).length,
    actions: actionStats.actions,
    actions_with_param_hints: actionStats.withParams,
    materials: registryManager.materials.size,
    machines: registryManager.machines.size,
    tools: registryManager.tools.size,
    alarms: registryManager.alarms.size,
    formulas: registryManager.formulas.size,
    algorithms: registryManager.algorithms.size,
    post_processors: registryManager.postProcessors.size,
    knowledge_bases: registryManager.knowledgeBases.size,
    coolants: registryManager.coolants.size,
    coatings: registryManager.coatings.size,
    agents: registryManager.agents.size,
    hooks: registryManager.hooks.size,
    skills: registryManager.skills.size,
    scripts: registryManager.scripts.size,
    databases: registryManager.databases.size,
    total_registry_entries: registryManager.getTotalEntries(),
    static_resources: 1,
    resource_templates: 4,
  };
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
        text: JSON.stringify(await buildSystemOverview()),
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
