/**
 * PRISM MCP Server - Generator Tools
 * Rewritten to server.tool() pattern (was setRequestHandler)
 * 
 * @version 2.0.0
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { log } from "../utils/Logger.js";
import { 
  hookGenerator, 
  DOMAIN_TEMPLATES,
  type BatchGenerationConfig,
  type GeneratedHook
} from "../generators/index.js";
import * as path from "path";

export function registerGeneratorTools(server: McpServer): void {
  log.info("Registering generator tools...");

  // 1. get_hook_generator_stats
  server.tool(
    "get_hook_generator_stats",
    "Get statistics about the hook generator capabilities",
    {},
    async () => {
      const stats = hookGenerator.getStats();
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          status: "success",
          stats: {
            total_domains: stats.domains,
            total_patterns: stats.patterns,
            estimated_hooks: stats.estimated_hooks,
            domains: Object.keys(DOMAIN_TEMPLATES)
          }
        }, null, 2) }]
      };
    }
  );

  // 2. list_hook_domains
  server.tool(
    "list_hook_domains",
    "List all available domains for hook generation with details",
    {},
    async () => {
      const allTemplates = hookGenerator.getAllDomainTemplates();
      const domains = Object.entries(allTemplates).map(([name, template]) => ({
        domain: name,
        category: template.category,
        description: template.description,
        pattern_count: template.patterns.length,
        safety_level: template.safety_level,
        estimated_hooks: template.patterns.reduce((sum: number, p: any) => 
          sum + (p.entities.length * p.actions.length), 0)
      }));
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          status: "success", total_domains: domains.length, domains
        }, null, 2) }]
      };
    }
  );

  // 3. generate_hooks
  server.tool(
    "generate_hooks",
    "Generate hooks for a specific domain. Returns generated hook metadata.",
    {
      domain: z.string().describe("Domain name (e.g., SAFETY, PHYSICS, MANUFACTURING)"),
      output_format: z.enum(["json", "typescript", "both"]).optional().describe("Output format"),
      validate: z.boolean().optional().default(true).describe("Whether to validate")
    },
    async (params) => {
      const { domain, validate = true } = params;
      const allTemplates = hookGenerator.getAllDomainTemplates();
      if (!allTemplates[domain.toUpperCase()]) {
        return { content: [{ type: "text" as const, text: JSON.stringify({
          status: "error", error: `Unknown domain: ${domain}. Available: ${Object.keys(allTemplates).join(", ")}`
        }) }] };
      }
      const startTime = Date.now();
      const hooks = hookGenerator.expandDomain(domain.toUpperCase());
      const duration = Date.now() - startTime;
      const validationErrors = validate ? hookGenerator.validateHooks(hooks) : [];
      return { content: [{ type: "text" as const, text: JSON.stringify({
        status: "success", domain: domain.toUpperCase(),
        hooks_generated: hooks.length, duration_ms: duration,
        rate_per_second: Math.round(hooks.length / (duration / 1000)),
        validation_errors: validationErrors.length,
        sample_hooks: hooks.slice(0, 3).map(h => ({
          hook_id: h.hook_id, name: h.name, event: h.event, priority: h.priority, mode: h.mode
        }))
      }, null, 2) }] };
    }
  );

  // 4. generate_hooks_batch
  server.tool(
    "generate_hooks_batch",
    "Generate hooks for multiple domains in batch mode.",
    {
      domains: z.array(z.string()).optional().describe("Domains to generate (all if empty)"),
      output_dir: z.string().optional().describe("Output directory"),
      format: z.enum(["json", "typescript", "both"]).optional().default("both"),
      validate: z.boolean().optional().default(true)
    },
    async (params) => {
      const allTemplates = hookGenerator.getAllDomainTemplates();
      const targetDomains = params.domains && params.domains.length > 0 
        ? params.domains.map(d => d.toUpperCase())
        : Object.keys(allTemplates);
      const config: BatchGenerationConfig = {
        domains: targetDomains,
        output_dir: params.output_dir || path.join(process.cwd(), "src", "hooks", "generated"),
        format: (params.format || "both") as "json" | "typescript" | "both",
        validate: params.validate ?? true,
        register: true
      };
      const startTime = Date.now();
      const results = await hookGenerator.generateBatch(config);
      const totalDuration = Date.now() - startTime;
      const totalHooks = results.reduce((sum: number, r: any) => sum + r.hooks_generated, 0);
      const totalErrors = results.reduce((sum: number, r: any) => sum + r.errors.length, 0);
      return { content: [{ type: "text" as const, text: JSON.stringify({
        status: "success", domains_processed: results.length,
        total_hooks_generated: totalHooks, total_duration_ms: totalDuration,
        rate_per_second: Math.round(totalHooks / (totalDuration / 1000)),
        total_errors: totalErrors, output_directory: config.output_dir,
        results: results.map((r: any) => ({ domain: r.domain, hooks: r.hooks_generated, duration_ms: r.duration_ms, errors: r.errors.length }))
      }, null, 2) }] };
    }
  );

  // 5. validate_generated_hooks
  server.tool(
    "validate_generated_hooks",
    "Validate generated hooks for schema compliance and consistency",
    {
      domain: z.string().optional().describe("Domain to validate (all if omitted)")
    },
    async (params) => {
      let hooks: GeneratedHook[];
      if (params.domain) {
        hooks = hookGenerator.expandDomain(params.domain.toUpperCase());
      } else {
        hooks = hookGenerator.generateAll();
      }
      const errors = hookGenerator.validateHooks(hooks);
      return { content: [{ type: "text" as const, text: JSON.stringify({
        status: errors.length === 0 ? "success" : "warning",
        total_hooks: hooks.length, valid_hooks: hooks.length - errors.length,
        error_count: errors.length, errors: errors.slice(0, 20),
        validation_rate: ((hooks.length - errors.length) / hooks.length * 100).toFixed(2) + "%"
      }, null, 2) }] };
    }
  );

  // 6. get_domain_template
  server.tool(
    "get_domain_template",
    "Get detailed template information for a specific hook domain",
    {
      domain: z.string().describe("Domain name")
    },
    async (params) => {
      const allTemplates = hookGenerator.getAllDomainTemplates();
      const template = allTemplates[params.domain.toUpperCase()];
      if (!template) {
        return { content: [{ type: "text" as const, text: JSON.stringify({
          status: "error", error: `Unknown domain: ${params.domain}`
        }) }] };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify({
        status: "success", domain: template.domain, category: template.category,
        description: template.description, safety_level: template.safety_level,
        default_priority: template.default_priority, default_mode: template.default_mode,
        patterns: template.patterns.map((p: any) => ({
          pattern_id: p.pattern_id, name_template: p.name_template,
          timing: p.timing, entities: p.entities, actions: p.actions, tags: p.tags
        }))
      }, null, 2) }] };
    }
  );

  log.info("Generator tools registered: 6 tools (rewritten to server.tool pattern)");
}
