/**
 * PRISM MCP Server - Knowledge Tools V2
 * Tools for accessing skills, scripts, and knowledge resources
 * 
 * Skill Tools (6):
 * - skill_list: List all skills
 * - skill_get: Get specific skill
 * - skill_search: Search skills
 * - skill_find_for_task: Find skills for a task
 * - skill_content: Get skill content
 * - skill_stats: Get skill statistics
 * 
 * Script Tools (6):
 * - script_list: List all scripts
 * - script_get: Get specific script
 * - script_search: Search scripts
 * - script_command: Get execution command
 * - script_execute: Execute a script (simulation)
 * - script_stats: Get script statistics
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registryManager } from "../registries/index.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function successResponse(content: string, metadata?: Record<string, unknown>) {
  return {
    content: [{ type: "text" as const, text: content }],
    metadata
  };
}

function formatAsJson(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// SCHEMA DEFINITIONS
// ============================================================================

const SKILL_CATEGORIES = [
  "core_development", "monolith_navigation", "materials", "session_management",
  "quality_validation", "code_architecture", "ai_ml", "knowledge", 
  "controller_programming", "extraction", "experts", "formulas", "debugging", "workflow"
] as const;

const SCRIPT_CATEGORIES = [
  "session_management", "skill_management", "data_processing", "analysis",
  "api_integration", "extraction", "validation", "utilities", "testing", "deployment"
] as const;

const SCRIPT_LANGUAGES = ["python", "powershell", "bash", "javascript", "typescript"] as const;

const SkillListSchema = z.object({
  category: z.enum(SKILL_CATEGORIES).optional().describe("Filter by skill category"),
  enabled_only: z.boolean().default(true).describe("Only show enabled skills"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const SkillGetSchema = z.object({
  skill_id: z.string().describe("Skill ID (e.g., 'prism-cognitive-core')"),
  include_content: z.boolean().default(false).describe("Include full skill content"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SkillSearchSchema = z.object({
  query: z.string().optional().describe("Search in name, ID, description"),
  category: z.enum(SKILL_CATEGORIES).optional().describe("Skill category"),
  tag: z.string().optional().describe("Filter by tag"),
  enabled: z.boolean().optional().describe("Filter by enabled status"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const SkillFindForTaskSchema = z.object({
  task_description: z.string().describe("Description of the task to find skills for"),
  max_results: z.number().default(5).describe("Maximum number of skills to return"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const SkillContentSchema = z.object({
  skill_id: z.string().describe("Skill ID to get content for")
});

const ScriptListSchema = z.object({
  category: z.enum(SCRIPT_CATEGORIES).optional().describe("Filter by script category"),
  language: z.enum(SCRIPT_LANGUAGES).optional().describe("Filter by language"),
  enabled_only: z.boolean().default(true).describe("Only show enabled scripts"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const ScriptGetSchema = z.object({
  script_id: z.string().describe("Script ID (e.g., 'gsd_startup')"),
  response_format: z.enum(["json", "markdown"]).default("markdown")
});

const ScriptSearchSchema = z.object({
  query: z.string().optional().describe("Search in name, ID, description"),
  category: z.enum(SCRIPT_CATEGORIES).optional().describe("Script category"),
  language: z.enum(SCRIPT_LANGUAGES).optional().describe("Programming language"),
  tag: z.string().optional().describe("Filter by tag"),
  limit: z.number().default(20),
  offset: z.number().default(0),
  response_format: z.enum(["json", "markdown"]).default("json")
});

const ScriptCommandSchema = z.object({
  script_id: z.string().describe("Script ID to get command for"),
  args: z.record(z.unknown()).optional().describe("Arguments to pass to script")
});

const ScriptExecuteSchema = z.object({
  script_id: z.string().describe("Script ID to execute"),
  args: z.record(z.unknown()).optional().describe("Arguments to pass to script"),
  timeout_ms: z.number().default(30000).describe("Execution timeout in milliseconds")
});

// ============================================================================
// TOOL REGISTRATION
// ============================================================================

export function registerKnowledgeToolsV2(server: McpServer): void {

  // =========================================================================
  // SKILL TOOLS (6)
  // =========================================================================

  server.tool(
    "skill_list",
    "List all PRISM skills by category with descriptions, triggers, and metadata.",
    SkillListSchema.shape,
    async (params) => {
      log.info(`[skill_list] Category: ${params.category || 'all'}`);
      
      await registryManager.initialize();
      
      let skills = params.category
        ? registryManager.skills.getByCategory(params.category)
        : registryManager.skills.all();
      
      if (params.enabled_only) {
        skills = skills.filter(s => s.enabled && s.status === "active");
      }
      
      // Sort by priority
      skills.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      const total = skills.length;
      const paged = skills.slice(params.offset, params.offset + params.limit);
      
      const content = params.response_format === "markdown"
        ? `## PRISM Skills\n\nShowing ${paged.length} of ${total} skills\n\n` +
          paged.map(s => `### ${s.name}\n- **ID:** ${s.skill_id}\n- **Category:** ${s.category}\n- **Priority:** ${s.priority}\n- **Lines:** ${s.lines}\n- **Description:** ${s.description.slice(0, 150)}...`).join('\n\n')
        : formatAsJson({ skills: paged, total, hasMore: params.offset + paged.length < total });
      
      return successResponse(content, { success: true, total, returned: paged.length });
    }
  );

  server.tool(
    "skill_get",
    "Get detailed information about a specific PRISM skill including triggers, use cases, and dependencies.",
    SkillGetSchema.shape,
    async (params) => {
      log.info(`[skill_get] ID: ${params.skill_id}`);
      
      await registryManager.initialize();
      const skill = registryManager.skills.getSkill(params.skill_id);
      
      if (!skill) {
        return successResponse(`Skill not found: ${params.skill_id}`, { success: false });
      }
      
      let skillContent: string | undefined;
      if (params.include_content) {
        skillContent = await registryManager.skills.getContent(params.skill_id);
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ${skill.name}\n\n`;
        content += `**ID:** ${skill.skill_id}\n`;
        content += `**Category:** ${skill.category}\n`;
        content += `**Priority:** ${skill.priority}/10\n`;
        content += `**Status:** ${skill.status} ${skill.enabled ? '✅' : '❌'}\n`;
        content += `**Lines:** ${skill.lines} | **Size:** ${Math.round(skill.size_bytes / 1024)}KB\n\n`;
        content += `### Description\n${skill.description}\n\n`;
        
        if (skill.triggers?.length) {
          content += `### Triggers\n`;
          skill.triggers.forEach(t => {
            content += `- **${t.pattern}**: ${t.description}\n`;
            if (t.examples?.length) {
              content += `  Examples: ${t.examples.join(', ')}\n`;
            }
          });
          content += '\n';
        }
        
        if (skill.use_cases?.length) {
          content += `### Use Cases\n${skill.use_cases.map(u => `- ${u}`).join('\n')}\n\n`;
        }
        
        if (skill.dependencies?.length) {
          content += `### Dependencies\n${skill.dependencies.map(d => `- ${d.skill_id} (${d.purpose})`).join('\n')}\n\n`;
        }
        
        if (skill.required_by?.length) {
          content += `### Required By\n${skill.required_by.join(', ')}\n\n`;
        }
        
        content += `### Tags\n${skill.tags?.join(', ') || 'None'}\n`;
        
        if (skillContent) {
          content += `\n### Content\n\`\`\`markdown\n${skillContent.slice(0, 5000)}${skillContent.length > 5000 ? '\n...(truncated)' : ''}\n\`\`\``;
        }
      } else {
        content = formatAsJson({ ...skill, content: skillContent });
      }
      
      return successResponse(content, { success: true, skill_id: skill.skill_id });
    }
  );

  server.tool(
    "skill_search",
    "Search skills by query, category, or tag.",
    SkillSearchSchema.shape,
    async (params) => {
      log.info(`[skill_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.skills.search({
        query: params.query,
        category: params.category,
        tag: params.tag,
        enabled: params.enabled,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Skill Search Results\n\nFound **${results.total}** skills (showing ${results.skills.length})\n\n` +
          results.skills.map(s => `- **${s.name}** (${s.skill_id}) - ${s.category}, priority ${s.priority}`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.skills.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "skill_find_for_task",
    "Find the best skills for a specific task based on triggers, use cases, and tags. Uses intelligent matching.",
    SkillFindForTaskSchema.shape,
    async (params) => {
      log.info(`[skill_find_for_task] Task: ${params.task_description}`);
      
      await registryManager.initialize();
      const skills = registryManager.skills.findForTask(params.task_description);
      const topSkills = skills.slice(0, params.max_results);
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Skills for "${params.task_description}"\n\n`;
        content += `Found **${topSkills.length}** relevant skills:\n\n`;
        topSkills.forEach((s, i) => {
          content += `### ${i + 1}. ${s.name}\n`;
          content += `**ID:** ${s.skill_id}\n`;
          content += `**Category:** ${s.category}\n`;
          content += `**Priority:** ${s.priority}/10\n`;
          content += `**Description:** ${s.description.slice(0, 200)}...\n`;
          if (s.triggers?.length) {
            content += `**Triggers:** ${s.triggers.map(t => t.pattern).join(', ')}\n`;
          }
          content += '\n';
        });
        
        if (topSkills.length > 0) {
          content += `\n### Recommended Load Order\n`;
          content += `\`\`\`\n${topSkills.map(s => `view /mnt/skills/user/${s.skill_id}/SKILL.md`).join('\n')}\n\`\`\``;
        }
      } else {
        content = formatAsJson({ task: params.task_description, skills: topSkills });
      }
      
      return successResponse(content, {
        success: true,
        total: topSkills.length,
        task: params.task_description
      });
    }
  );

  server.tool(
    "skill_content",
    "Get the full content of a skill's SKILL.md file.",
    SkillContentSchema.shape,
    async (params) => {
      log.info(`[skill_content] ID: ${params.skill_id}`);
      
      await registryManager.initialize();
      const content = await registryManager.skills.getContent(params.skill_id);
      
      if (!content) {
        return successResponse(`Skill content not found: ${params.skill_id}`, { success: false });
      }
      
      return successResponse(content, {
        success: true,
        skill_id: params.skill_id,
        length: content.length
      });
    }
  );

  server.tool(
    "skill_stats",
    "Get statistics about all registered skills including counts by category and total lines.",
    z.object({ response_format: z.enum(["json", "markdown"]).default("markdown") }).shape,
    async (params) => {
      log.info(`[skill_stats]`);
      
      await registryManager.initialize();
      const stats = registryManager.skills.getStats();
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Skill Statistics\n\n`;
        content += `**Total Skills:** ${stats.total}\n`;
        content += `**Active & Enabled:** ${stats.activeEnabled}\n`;
        content += `**Total Lines:** ${stats.totalLines.toLocaleString()}\n`;
        content += `**Total Size:** ${stats.totalSizeKB.toLocaleString()} KB\n\n`;
        content += `### By Category\n`;
        for (const [cat, count] of Object.entries(stats.byCategory)) {
          content += `- ${cat}: ${count}\n`;
        }
      } else {
        content = formatAsJson(stats);
      }
      
      return successResponse(content, { success: true, ...stats });
    }
  );

  // =========================================================================
  // SCRIPT TOOLS (6)
  // =========================================================================

  server.tool(
    "script_list",
    "List all PRISM scripts by category, language, or status.",
    ScriptListSchema.shape,
    async (params) => {
      log.info(`[script_list] Category: ${params.category || 'all'}`);
      
      await registryManager.initialize();
      
      let scripts = params.category
        ? registryManager.scripts.getByCategory(params.category)
        : params.language
          ? registryManager.scripts.getByLanguage(params.language)
          : registryManager.scripts.all();
      
      if (params.enabled_only) {
        scripts = scripts.filter(s => s.enabled && s.status === "active");
      }
      
      // Sort by priority
      scripts.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      
      const total = scripts.length;
      const paged = scripts.slice(params.offset, params.offset + params.limit);
      
      const content = params.response_format === "markdown"
        ? `## PRISM Scripts\n\nShowing ${paged.length} of ${total} scripts\n\n` +
          paged.map(s => `- **${s.name}** (${s.script_id}) - ${s.language}, ${s.category}`).join('\n')
        : formatAsJson({ scripts: paged, total, hasMore: params.offset + paged.length < total });
      
      return successResponse(content, { success: true, total, returned: paged.length });
    }
  );

  server.tool(
    "script_get",
    "Get detailed information about a specific script including parameters and usage examples.",
    ScriptGetSchema.shape,
    async (params) => {
      log.info(`[script_get] ID: ${params.script_id}`);
      
      await registryManager.initialize();
      const script = registryManager.scripts.getScript(params.script_id);
      
      if (!script) {
        return successResponse(`Script not found: ${params.script_id}`, { success: false });
      }
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## ${script.name}\n\n`;
        content += `**ID:** ${script.script_id}\n`;
        content += `**File:** ${script.filename}\n`;
        content += `**Category:** ${script.category}\n`;
        content += `**Language:** ${script.language}\n`;
        content += `**Interpreter:** ${script.interpreter}\n`;
        content += `**Lines:** ${script.lines} | **Size:** ${Math.round(script.size_bytes / 1024)}KB\n`;
        content += `**Status:** ${script.status} ${script.enabled ? '✅' : '❌'}\n\n`;
        content += `### Description\n${script.description}\n\n`;
        
        if (script.parameters?.length) {
          content += `### Parameters\n`;
          script.parameters.forEach(p => {
            content += `- **${p.name}** (${p.type})${p.required ? ' *required*' : ''}: ${p.description}\n`;
          });
          content += '\n';
        }
        
        if (script.usage_examples?.length) {
          content += `### Usage Examples\n\`\`\`bash\n${script.usage_examples.join('\n')}\n\`\`\`\n\n`;
        }
        
        content += `### Path\n\`${script.path}\`\n`;
        content += `\n### Tags\n${script.tags?.join(', ') || 'None'}`;
      } else {
        content = formatAsJson(script);
      }
      
      return successResponse(content, { success: true, script_id: script.script_id });
    }
  );

  server.tool(
    "script_search",
    "Search scripts by query, category, language, or tag.",
    ScriptSearchSchema.shape,
    async (params) => {
      log.info(`[script_search] Query: ${params.query || 'all'}`, params);
      
      await registryManager.initialize();
      const results = registryManager.scripts.search({
        query: params.query,
        category: params.category,
        language: params.language,
        tag: params.tag,
        limit: params.limit,
        offset: params.offset
      });
      
      const content = params.response_format === "markdown"
        ? `## Script Search Results\n\nFound **${results.total}** scripts (showing ${results.scripts.length})\n\n` +
          results.scripts.map(s => `- **${s.name}** (${s.script_id}) - ${s.language}`).join('\n')
        : formatAsJson(results);
      
      return successResponse(content, {
        success: true,
        total: results.total,
        returned: results.scripts.length,
        hasMore: results.hasMore
      });
    }
  );

  server.tool(
    "script_command",
    "Get the execution command for a script with optional arguments.",
    ScriptCommandSchema.shape,
    async (params) => {
      log.info(`[script_command] ID: ${params.script_id}`);
      
      await registryManager.initialize();
      const command = registryManager.scripts.getExecutionCommand(params.script_id, params.args);
      
      if (!command) {
        return successResponse(`Script not found: ${params.script_id}`, { success: false });
      }
      
      return successResponse(
        `## Execution Command\n\n\`\`\`bash\n${command}\n\`\`\``,
        { success: true, command, script_id: params.script_id }
      );
    }
  );

  server.tool(
    "script_execute",
    "Execute a PRISM script. [Simulation only - provides command to run]",
    ScriptExecuteSchema.shape,
    async (params) => {
      log.info(`[script_execute] ID: ${params.script_id}`);
      
      await registryManager.initialize();
      const script = registryManager.scripts.getScript(params.script_id);
      
      if (!script) {
        return successResponse(`Script not found: ${params.script_id}`, { success: false });
      }
      
      const command = registryManager.scripts.getExecutionCommand(params.script_id, params.args);
      
      // Simulation response
      const result = {
        status: "simulated",
        script_id: params.script_id,
        command,
        message: `To execute this script, run the following command in Desktop Commander or terminal:`,
        note: "Actual execution requires running the command in the appropriate shell."
      };
      
      return successResponse(
        `## Script Execution (Simulated)\n\n**Script:** ${script.name}\n**Command:**\n\`\`\`bash\n${command}\n\`\`\`\n\n*Note: Use Desktop Commander's start_process tool to actually execute this command.*`,
        { success: true, simulated: true, ...result }
      );
    }
  );

  server.tool(
    "script_stats",
    "Get statistics about all registered scripts including counts by category and language.",
    z.object({ response_format: z.enum(["json", "markdown"]).default("markdown") }).shape,
    async (params) => {
      log.info(`[script_stats]`);
      
      await registryManager.initialize();
      const stats = registryManager.scripts.getStats();
      
      let content: string;
      if (params.response_format === "markdown") {
        content = `## Script Statistics\n\n`;
        content += `**Total Scripts:** ${stats.total}\n`;
        content += `**Total Lines:** ${stats.totalLines.toLocaleString()}\n`;
        content += `**Total Size:** ${stats.totalSizeKB.toLocaleString()} KB\n\n`;
        content += `### By Category\n`;
        for (const [cat, count] of Object.entries(stats.byCategory)) {
          content += `- ${cat}: ${count}\n`;
        }
        content += `\n### By Language\n`;
        for (const [lang, count] of Object.entries(stats.byLanguage)) {
          content += `- ${lang}: ${count}\n`;
        }
      } else {
        content = formatAsJson(stats);
      }
      
      return successResponse(content, { success: true, ...stats });
    }
  );

  log.info("[knowledge] Registered 12 knowledge tools V2 (6 skill + 6 script)");
}
