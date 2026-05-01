/**
 * PromptTemplateEngine — Pre-built prompt templates for common tasks
 *
 * Provides parameterized templates for frequent operations, reducing
 * the tokens spent on boilerplate prompt construction. Templates are
 * compact and optimized for the PRISM context.
 *
 * Token savings: 50-200 tokens per templated operation.
 *
 * @version 1.0.0
 */

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  params: string[];
  category: string;
  estimatedTokens: number;
}

const TEMPLATES: PromptTemplate[] = [
  {
    id: "engine_create",
    name: "Create Engine",
    description: "Template for creating a new PRISM engine",
    template: `Create engine: {name}Engine
Purpose: {purpose}
Pattern: class {name}Engine with singleton export
File: src/engines/{name}Engine.ts
Test: src/__tests__/{name_lower}-engine.test.ts
Wire: export in src/engines/index.ts`,
    params: ["name", "purpose", "name_lower"],
    category: "forge",
    estimatedTokens: 50,
  },
  {
    id: "dispatcher_action",
    name: "Add Dispatcher Action",
    description: "Template for adding a new action to a dispatcher",
    template: `Add action "{action}" to {dispatcher}Dispatcher:
1. Add to ACTIONS array
2. Add case "{action}" in switch
3. Import engine: await import("../../engines/{engine}.js")
4. Return ok(result)`,
    params: ["action", "dispatcher", "engine"],
    category: "wiring",
    estimatedTokens: 40,
  },
  {
    id: "test_suite",
    name: "Test Suite",
    description: "Template for engine test file",
    template: `import { describe, it, expect } from "vitest";
import { {class} } from "../engines/{file}.js";

describe("{class}", () => {
  const engine = new {class}();

  describe("{method}", () => {
    it("{test_desc}", () => {
      const result = engine.{method}({args});
      expect(result).{assertion};
    });
  });
});`,
    params: ["class", "file", "method", "test_desc", "args", "assertion"],
    category: "testing",
    estimatedTokens: 60,
  },
  {
    id: "hookify_rule",
    name: "Hookify Rule",
    description: "Template for creating a hookify rule",
    template: `# Hookify Rule: {title}
type: {type}
event: {event}
tool: {tool}

## Pattern
{pattern_desc}

## Condition
{condition}

## Message
{message}`,
    params: ["title", "type", "event", "tool", "pattern_desc", "condition", "message"],
    category: "hooks",
    estimatedTokens: 45,
  },
  {
    id: "slash_command",
    name: "Slash Command",
    description: "Template for creating a slash command",
    template: `# {title}

{description}

## Usage
- \`/{command} {usage_example}\`

## Steps
{steps}`,
    params: ["title", "description", "command", "usage_example", "steps"],
    category: "skills",
    estimatedTokens: 35,
  },
  {
    id: "commit_message",
    name: "Commit Message",
    description: "Template for PRISM commit messages",
    template: `{type}({scope}): {summary}

{details}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`,
    params: ["type", "scope", "summary", "details"],
    category: "git",
    estimatedTokens: 25,
  },
  {
    id: "speed_feed",
    name: "Speed & Feed Lookup",
    description: "Template for machining parameter queries",
    template: `Material: {material}
Operation: {operation}
Tool: {tool_type} Ø{diameter}
Params: RPM={rpm}, Feed={feed}, DOC={doc}, WOC={woc}
Source: {source}`,
    params: ["material", "operation", "tool_type", "diameter", "rpm", "feed", "doc", "woc", "source"],
    category: "manufacturing",
    estimatedTokens: 40,
  },
];

export class PromptTemplateEngine {

  /**
   * Get a template by ID.
   */
  get(id: string): PromptTemplate | null {
    return TEMPLATES.find(t => t.id === id) || null;
  }

  /**
   * Fill a template with parameter values.
   */
  fill(id: string, params: Record<string, string>): string | null {
    const template = this.get(id);
    if (!template) return null;

    let result = template.template;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
    }
    return result;
  }

  /**
   * List all templates.
   */
  list(): Array<{ id: string; name: string; category: string; params: string[] }> {
    return TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      params: t.params,
    }));
  }

  /**
   * List templates by category.
   */
  byCategory(category: string): PromptTemplate[] {
    return TEMPLATES.filter(t => t.category === category);
  }

  /**
   * Get all categories.
   */
  categories(): string[] {
    return [...new Set(TEMPLATES.map(t => t.category))];
  }

  /**
   * Search templates by keyword.
   */
  search(query: string): PromptTemplate[] {
    const q = query.toLowerCase();
    return TEMPLATES.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.id.includes(q)
    );
  }

  /**
   * Get stats.
   */
  getStats(): { total: number; categories: number; avgTokens: number } {
    const avgTokens = Math.round(
      TEMPLATES.reduce((s, t) => s + t.estimatedTokens, 0) / TEMPLATES.length
    );
    return {
      total: TEMPLATES.length,
      categories: this.categories().length,
      avgTokens,
    };
  }
}

export const promptTemplateEngine = new PromptTemplateEngine();
