import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { 
  hookGenerator, 
  DOMAIN_TEMPLATES,
  type BatchGenerationConfig,
  type GeneratedHook
} from "../../generators/index.js";
import * as path from "path";

const ACTIONS = ["stats", "list_domains", "generate", "generate_batch", "validate", "get_template"] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
}

export function registerGeneratorDispatcher(server: any): void {
  server.tool(
    "prism_generator",
    `Hook generator tools (7 tools → 1). Actions: ${ACTIONS.join(", ")}`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_generator] ${action}`);
      try {
        switch (action) {
          case "stats": {
            const stats = hookGenerator.getStats();
            return ok({
              status: "success",
              stats: {
                total_domains: stats.domains,
                total_patterns: stats.patterns,
                estimated_hooks: stats.estimated_hooks,
                domains: Object.keys(DOMAIN_TEMPLATES)
              }
            });
          }

          case "list_domains": {
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
            return ok({
              status: "success", 
              total_domains: domains.length, 
              domains
            });
          }

          case "generate": {
            const { domain, validate = true } = params;
            const allTemplates = hookGenerator.getAllDomainTemplates();
            if (!allTemplates[domain.toUpperCase()]) {
              return ok({
                status: "error", 
                error: `Unknown domain: ${domain}. Available: ${Object.keys(allTemplates).join(", ")}`
              });
            }
            const startTime = Date.now();
            const hooks = hookGenerator.expandDomain(domain.toUpperCase());
            const duration = Date.now() - startTime;
            const validationErrors = validate ? hookGenerator.validateHooks(hooks) : [];
            return ok({
              status: "success", 
              domain: domain.toUpperCase(),
              hooks_generated: hooks.length, 
              duration_ms: duration,
              rate_per_second: Math.round(hooks.length / (duration / 1000)),
              validation_errors: validationErrors.length,
              sample_hooks: hooks.slice(0, 3).map(h => ({
                hook_id: h.hook_id, 
                name: h.name, 
                event: h.event, 
                priority: h.priority, 
                mode: h.mode
              }))
            });
          }

          case "generate_batch": {
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
            return ok({
              status: "success", 
              domains_processed: results.length,
              total_hooks_generated: totalHooks, 
              total_duration_ms: totalDuration,
              rate_per_second: Math.round(totalHooks / (totalDuration / 1000)),
              total_errors: totalErrors, 
              output_directory: config.output_dir,
              results: results.map((r: any) => ({ 
                domain: r.domain, 
                hooks: r.hooks_generated, 
                duration_ms: r.duration_ms, 
                errors: r.errors.length 
              }))
            });
          }

          case "validate": {
            let hooks: GeneratedHook[];
            if (params.domain) {
              hooks = hookGenerator.expandDomain(params.domain.toUpperCase());
            } else {
              hooks = hookGenerator.generateAll();
            }
            const errors = hookGenerator.validateHooks(hooks);
            return ok({
              status: errors.length === 0 ? "success" : "warning",
              total_hooks: hooks.length, 
              valid_hooks: hooks.length - errors.length,
              error_count: errors.length, 
              errors: errors.slice(0, 20),
              validation_rate: ((hooks.length - errors.length) / hooks.length * 100).toFixed(2) + "%"
            });
          }

          case "get_template": {
            const allTemplates = hookGenerator.getAllDomainTemplates();
            const template = allTemplates[params.domain.toUpperCase()];
            if (!template) {
              return ok({
                status: "error", 
                error: `Unknown domain: ${params.domain}`
              });
            }
            return ok({
              status: "success", 
              domain: template.domain, 
              category: template.category,
              description: template.description, 
              safety_level: template.safety_level,
              default_priority: template.default_priority, 
              default_mode: template.default_mode,
              patterns: template.patterns.map((p: any) => ({
                pattern_id: p.pattern_id, 
                name_template: p.name_template,
                timing: p.timing, 
                entities: p.entities, 
                actions: p.actions, 
                tags: p.tags
              }))
            });
          }

          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return ok({ error: err.message, action });
      }
    }
  );
}