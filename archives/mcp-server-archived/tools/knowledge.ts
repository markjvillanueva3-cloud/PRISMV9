/**
 * PRISM MCP Server - Knowledge Tools
 * Access to skills, modules, and knowledge bases
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as path from "path";
import { z } from "zod";
import {
  SkillLoadInputSchema,
  ModuleLoadInputSchema,
  KnowledgeQueryInputSchema
} from "../schemas.js";
import { PATHS, DEFAULT_PAGE_SIZE } from "../constants.js";
import { 
  readTextFile, 
  listFiles, 
  fileExists, 
  findFiles,
  searchInFiles 
} from "../utils/files.js";
import { successResponse, paginatedResponse, formatTable, truncateIfNeeded } from "../utils/formatters.js";
import { withErrorHandling, NotFoundError } from "../utils/errors.js";
import { log } from "../utils/Logger.js";

// ============================================================================
// SKILL LOADING
// ============================================================================

async function loadSkillContent(skillName: string, section?: string): Promise<{
  name: string;
  content: string;
  path: string;
  lines: number;
}> {
  // Try consolidated skills path first
  const skillPath = path.join(PATHS.SKILLS, skillName, "SKILL.md");
  
  if (!await fileExists(skillPath)) {
    // Try alternate naming
    const altPath = path.join(PATHS.SKILLS, skillName.replace("prism-", ""), "SKILL.md");
    if (!await fileExists(altPath)) {
      throw new NotFoundError("Skill", skillName);
    }
  }
  
  const content = await readTextFile(skillPath);
  const lines = content.split("\n").length;
  
  // If section requested, extract it
  if (section) {
    const sectionRegex = new RegExp(`^##\\s*${section}[\\s\\S]*?(?=^##|$)`, "im");
    const match = content.match(sectionRegex);
    if (match) {
      return {
        name: skillName,
        content: match[0],
        path: skillPath,
        lines: match[0].split("\n").length
      };
    }
  }
  
  return { name: skillName, content, path: skillPath, lines };
}

async function listAvailableSkills(): Promise<Array<{
  name: string;
  path: string;
  size: number;
}>> {
  const skills: Array<{ name: string; path: string; size: number }> = [];
  
  if (!await fileExists(PATHS.SKILLS)) {
    return skills;
  }
  
  const files = await findFiles(PATHS.SKILLS, /SKILL\.md$/);
  
  for (const file of files) {
    const dir = path.dirname(file);
    const name = path.basename(dir);
    const content = await readTextFile(file);
    skills.push({
      name,
      path: file,
      size: content.length
    });
  }
  
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================================================
// MODULE LOADING
// ============================================================================

async function loadModuleContent(moduleName: string): Promise<{
  name: string;
  content: string;
  path: string;
  lines: number;
}> {
  const modulePath = path.join(PATHS.EXTRACTED_MODULES, `${moduleName}.json`);
  
  if (!await fileExists(modulePath)) {
    // Try with .js extension
    const jsPath = path.join(PATHS.EXTRACTED_MODULES, `${moduleName}.js`);
    if (!await fileExists(jsPath)) {
      throw new NotFoundError("Module", moduleName);
    }
    const content = await readTextFile(jsPath);
    return {
      name: moduleName,
      content,
      path: jsPath,
      lines: content.split("\n").length
    };
  }
  
  const content = await readTextFile(modulePath);
  return {
    name: moduleName,
    content,
    path: modulePath,
    lines: content.split("\n").length
  };
}

async function listAvailableModules(): Promise<Array<{
  name: string;
  path: string;
  size: number;
}>> {
  const modules: Array<{ name: string; path: string; size: number }> = [];
  
  if (!await fileExists(PATHS.EXTRACTED_MODULES)) {
    return modules;
  }
  
  const files = await listFiles(PATHS.EXTRACTED_MODULES, { extension: ".json" });
  
  for (const file of files) {
    const name = path.basename(file, ".json");
    const content = await readTextFile(file);
    modules.push({
      name,
      path: file,
      size: content.length
    });
  }
  
  return modules;
}

/**
 * Register all knowledge tools with the MCP server
 */
export function registerKnowledgeTools(server: McpServer): void {

  server.registerTool(
    "prism_skill_list",
    {
      title: "List Skills",
      description: `List available PRISM skills.

Access 135+ specialized skills covering:
- Controller programming (FANUC, SIEMENS, HEIDENHAIN, etc.)
- Materials science and machining parameters
- CAD/CAM strategies and toolpaths
- Physics calculations and formulas
- AI/ML patterns and algorithms
- Session management and state
- Quality validation and testing

Each skill is a markdown file with structured best practices,
code examples, and reference data.

Args:
  - query (string, optional): Filter by skill name
  - category (string, optional): Filter by category
  - limit, offset: Pagination

Returns:
  List of skills with names, paths, and sizes.`,
      inputSchema: z.object({
        query: z.string().optional().describe("Filter by skill name"),
        category: z.string().optional().describe("Filter by category"),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0)
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_skill_list", async (params) => {
      log.tool("prism_skill_list", "Listing skills", params);
      
      let skills = await listAvailableSkills();
      
      // Apply filters
      if (params.query) {
        const q = params.query.toLowerCase();
        skills = skills.filter(s => s.name.toLowerCase().includes(q));
      }
      
      if (params.category) {
        const cat = params.category.toLowerCase();
        skills = skills.filter(s => s.name.toLowerCase().includes(cat));
      }
      
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const paged = skills.slice(offset, offset + limit);
      
      const rows = paged.map(s => [
        s.name,
        `${Math.round(s.size / 1024)}KB`
      ]);
      
      const text = [
        `# Available Skills (${skills.length} total)`,
        "",
        formatTable(["Name", "Size"], rows),
        "",
        `Showing ${paged.length} of ${skills.length}`,
        offset + paged.length < skills.length ? `Use offset=${offset + paged.length} for more.` : ""
      ].filter(Boolean).join("\n");
      
      return successResponse(text, {
        success: true,
        total: skills.length,
        count: paged.length,
        offset,
        skills: paged
      });
    })
  );

  server.registerTool(
    "prism_skill_load",
    {
      title: "Load Skill",
      description: `Load a PRISM skill's content for reference.

Skills are comprehensive markdown documents containing:
- Best practices and guidelines
- Code examples and patterns
- Reference tables and data
- Integration instructions

Popular skills:
- prism-fanuc-programming: FANUC CNC programming (2,921 lines)
- prism-siemens-programming: Siemens SINUMERIK (2,789 lines)
- prism-heidenhain-programming: Heidenhain TNC (3,179 lines)
- prism-material-physics: Kienzle, Taylor formulas
- prism-cognitive-core: AI/ML patterns and hooks
- prism-gcode-reference: G-code/M-code reference

Args:
  - skill_name (string): Skill name (e.g., 'prism-fanuc-programming')
  - section (string, optional): Specific section to extract

Returns:
  Skill content (full or section).`,
      inputSchema: SkillLoadInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_skill_load", async (params) => {
      log.tool("prism_skill_load", `Loading ${params.skill_name}`);
      
      const skill = await loadSkillContent(params.skill_name, params.section);
      
      const text = [
        `# Skill: ${skill.name}`,
        params.section ? `## Section: ${params.section}` : "",
        `_${skill.lines} lines | ${skill.path}_`,
        "",
        "---",
        "",
        truncateIfNeeded(skill.content, 40000) // Larger limit for skills
      ].filter(Boolean).join("\n");
      
      return successResponse(text, {
        success: true,
        name: skill.name,
        path: skill.path,
        lines: skill.lines,
        section: params.section || null
      });
    })
  );

  server.registerTool(
    "prism_skill_search",
    {
      title: "Search Skills",
      description: `Search within skill content for specific patterns or topics.

Search across all 135+ skills for:
- Specific G-codes or M-codes
- Formula references
- API patterns
- Best practice keywords

Args:
  - query (string): Search pattern
  - skill_filter (string, optional): Limit to specific skills
  - limit (number): Max results (default: 20)

Returns:
  Matching lines with context from skills.`,
      inputSchema: z.object({
        query: z.string().min(2).describe("Search pattern"),
        skill_filter: z.string().optional().describe("Filter to specific skill name pattern"),
        limit: z.number().int().min(1).max(100).default(20)
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_skill_search", async (params) => {
      log.tool("prism_skill_search", `Searching: ${params.query}`);
      
      // Find skill files
      let skillFiles = await findFiles(PATHS.SKILLS, /SKILL\.md$/);
      
      // Apply skill filter if provided
      if (params.skill_filter) {
        const filter = params.skill_filter.toLowerCase();
        skillFiles = skillFiles.filter(f => f.toLowerCase().includes(filter));
      }
      
      // Search in files
      const results = await searchInFiles(
        skillFiles,
        new RegExp(params.query, "i"),
        { maxResults: params.limit || 20, contextLines: 2 }
      );
      
      if (results.length === 0) {
        return successResponse(
          `No matches found for "${params.query}" in ${skillFiles.length} skills.`,
          { success: true, count: 0, query: params.query }
        );
      }
      
      const text = [
        `# Search Results: "${params.query}"`,
        `Found ${results.length} matches`,
        "",
        ...results.map(r => [
          `## ${path.basename(path.dirname(r.file))} (line ${r.line})`,
          "```",
          r.content,
          "```",
          ""
        ].join("\n"))
      ].join("\n");
      
      return successResponse(text, {
        success: true,
        query: params.query,
        count: results.length,
        results: results.map(r => ({
          skill: path.basename(path.dirname(r.file)),
          line: r.line,
          content: r.content
        }))
      });
    })
  );

  server.registerTool(
    "prism_module_list",
    {
      title: "List Modules",
      description: `List extracted modules from the PRISM v8.89 monolith.

Access 950+ extracted modules covering:
- Physics engines (cutting force, thermal, stability)
- AI/ML algorithms (PSO, GA, neural networks)
- CAD/CAM kernels (NURBS, toolpath, collision)
- Database interfaces (materials, machines, tools)
- Controller post processors
- And more...

Each module is extracted source code with dependencies mapped.

Args:
  - query (string, optional): Filter by module name
  - category (string, optional): Filter by category
  - limit, offset: Pagination

Returns:
  List of modules with names and sizes.`,
      inputSchema: z.object({
        query: z.string().optional().describe("Filter by module name"),
        category: z.string().optional().describe("Filter by category"),
        limit: z.number().int().min(1).max(100).default(50),
        offset: z.number().int().min(0).default(0)
      }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_module_list", async (params) => {
      log.tool("prism_module_list", "Listing modules", params);
      
      let modules = await listAvailableModules();
      
      // Apply filters
      if (params.query) {
        const q = params.query.toLowerCase();
        modules = modules.filter(m => m.name.toLowerCase().includes(q));
      }
      
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      const paged = modules.slice(offset, offset + limit);
      
      const text = [
        `# Extracted Modules (${modules.length} total)`,
        "",
        ...paged.map(m => `- ${m.name} (${Math.round(m.size / 1024)}KB)`),
        "",
        `Showing ${paged.length} of ${modules.length}`
      ].join("\n");
      
      return successResponse(text, {
        success: true,
        total: modules.length,
        count: paged.length,
        offset,
        modules: paged.map(m => ({ name: m.name, size: m.size }))
      });
    })
  );

  server.registerTool(
    "prism_module_load",
    {
      title: "Load Module",
      description: `Load an extracted module's source code.

Modules are extracted from the PRISM v8.89 monolith (986,621 lines).
Each module contains:
- Source code (JavaScript/TypeScript)
- Dependency information
- Consumer mappings

Args:
  - module_name (string): Module name

Returns:
  Module source code and metadata.`,
      inputSchema: ModuleLoadInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_module_load", async (params) => {
      log.tool("prism_module_load", `Loading ${params.module_name}`);
      
      const module = await loadModuleContent(params.module_name);
      
      const text = [
        `# Module: ${module.name}`,
        `_${module.lines} lines | ${module.path}_`,
        "",
        "---",
        "",
        truncateIfNeeded(module.content, 40000)
      ].join("\n");
      
      return successResponse(text, {
        success: true,
        name: module.name,
        path: module.path,
        lines: module.lines
      });
    })
  );

  server.registerTool(
    "prism_knowledge_query",
    {
      title: "Query Knowledge Base",
      description: `Query PRISM knowledge bases for algorithms, patterns, and structures.

Knowledge bases:
- algorithms: Algorithm implementations and complexity analysis
- data_structures: Data structure patterns and use cases
- manufacturing: Manufacturing domain knowledge
- ai_structures: AI/ML architecture patterns

Args:
  - query (string): Natural language query
  - kb (string, optional): Specific knowledge base

Returns:
  Relevant knowledge entries with examples.`,
      inputSchema: KnowledgeQueryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    withErrorHandling("prism_knowledge_query", async (params) => {
      log.tool("prism_knowledge_query", `Query: ${params.query}`);
      
      // Placeholder - would search knowledge base files
      const text = [
        `# Knowledge Query: "${params.query}"`,
        params.kb ? `**Knowledge Base:** ${params.kb}` : "",
        "",
        "Knowledge base search requires integration with:",
        `- ${PATHS.KNOWLEDGE_BASES}`,
        "",
        "Available knowledge bases:",
        "- algorithms: 50+ algorithm implementations",
        "- data_structures: Common patterns",
        "- manufacturing: Domain expertise",
        "- ai_structures: ML architectures",
        "",
        "Use prism_skill_search to search skill content directly."
      ].filter(Boolean).join("\n");
      
      return successResponse(text, {
        success: true,
        query: params.query,
        kb: params.kb || "all",
        note: "Full knowledge base integration pending"
      });
    })
  );

  log.debug("Knowledge tools registered");
}
