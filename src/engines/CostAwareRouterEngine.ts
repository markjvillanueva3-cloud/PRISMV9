/**
 * CostAwareRouterEngine — Routes queries to cheapest satisfying tool
 *
 * Given a query intent (find file, search content, read section),
 * recommends the cheapest tool chain that satisfies the need.
 * Considers file size, scope, and precision requirements.
 *
 * Token savings: 200-3000 tokens per query by choosing optimal tools.
 *
 * @version 1.0.0
 */

export type QueryIntent =
  | "find-file"        // locate a file by name
  | "search-content"   // find text within files
  | "read-section"     // read specific part of a file
  | "read-full"        // read entire file
  | "count-matches"    // count occurrences
  | "list-files"       // list files in directory
  | "check-exists"     // verify file/dir exists
  | "compare-files"    // diff two files
  | "get-structure"    // understand file structure
  | "modify-file";     // edit a file

export interface RouteRecommendation {
  intent: QueryIntent;
  tool: string;
  params: Record<string, unknown>;
  estimatedTokens: number;
  alternatives: Array<{ tool: string; estimatedTokens: number; reason: string }>;
}

export class CostAwareRouterEngine {

  /**
   * Route a query to the cheapest satisfying tool.
   */
  route(intent: QueryIntent, context: Record<string, unknown> = {}): RouteRecommendation {
    switch (intent) {
      case "find-file":
        return this.routeFindFile(context);
      case "search-content":
        return this.routeSearchContent(context);
      case "read-section":
        return this.routeReadSection(context);
      case "read-full":
        return this.routeReadFull(context);
      case "count-matches":
        return this.routeCountMatches(context);
      case "list-files":
        return this.routeListFiles(context);
      case "check-exists":
        return this.routeCheckExists(context);
      case "get-structure":
        return this.routeGetStructure(context);
      default:
        return {
          intent,
          tool: "Read",
          params: {},
          estimatedTokens: 500,
          alternatives: [],
        };
    }
  }

  /**
   * Infer intent from natural language query.
   */
  inferIntent(query: string): QueryIntent {
    const lower = query.toLowerCase();

    if (lower.match(/\b(find|locate|where)\b.*\b(file|\.ts|\.js)\b/)) return "find-file";
    if (lower.match(/\b(search|grep|find)\b.*\b(in|for|content|text)\b/)) return "search-content";
    if (lower.match(/\b(read|show|view)\b.*\b(section|lines|function|method|class)\b/)) return "read-section";
    if (lower.match(/\b(read|show|display)\b.*\b(file|entire|whole|full)\b/)) return "read-full";
    if (lower.match(/\b(count|how many)\b/)) return "count-matches";
    if (lower.match(/\b(list|ls|dir)\b.*\b(files|directory)\b/)) return "list-files";
    if (lower.match(/\b(exists?|check|verify)\b.*\b(file|dir)\b/)) return "check-exists";
    if (lower.match(/\b(structure|overview|outline|exports)\b/)) return "get-structure";
    if (lower.match(/\b(edit|modify|change|update|fix)\b/)) return "modify-file";

    return "search-content"; // default
  }

  private routeFindFile(ctx: Record<string, unknown>): RouteRecommendation {
    const pattern = (ctx.pattern || ctx.filename || "**/*.ts") as string;
    return {
      intent: "find-file",
      tool: "Glob",
      params: { pattern },
      estimatedTokens: 50,
      alternatives: [
        { tool: "Bash (find)", estimatedTokens: 200, reason: "Shell overhead" },
        { tool: "Agent", estimatedTokens: 2000, reason: "Spawns sub-conversation" },
      ],
    };
  }

  private routeSearchContent(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "search-content",
      tool: "Grep",
      params: { pattern: ctx.pattern || "", path: ctx.path, output_mode: "content", head_limit: 30 },
      estimatedTokens: 200,
      alternatives: [
        { tool: "Bash (grep)", estimatedTokens: 400, reason: "Shell overhead + no limit" },
        { tool: "Agent", estimatedTokens: 3000, reason: "Multiple round trips" },
      ],
    };
  }

  private routeReadSection(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "read-section",
      tool: "Read",
      params: { file_path: ctx.file, offset: ctx.offset || 0, limit: ctx.limit || 50 },
      estimatedTokens: 150,
      alternatives: [
        { tool: "Grep", estimatedTokens: 100, reason: "If searching for specific content" },
        { tool: "Read (full)", estimatedTokens: 800, reason: "Reads entire file" },
      ],
    };
  }

  private routeReadFull(ctx: Record<string, unknown>): RouteRecommendation {
    const fileSize = (ctx.fileSize || 200) as number;
    const tokens = fileSize * 3;
    return {
      intent: "read-full",
      tool: "Read",
      params: { file_path: ctx.file },
      estimatedTokens: tokens,
      alternatives: [
        { tool: "Grep", estimatedTokens: Math.round(tokens * 0.3), reason: "Read only matching sections" },
        { tool: "Read (offset)", estimatedTokens: Math.round(tokens * 0.5), reason: "Read in sections" },
      ],
    };
  }

  private routeCountMatches(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "count-matches",
      tool: "Grep",
      params: { pattern: ctx.pattern || "", output_mode: "count" },
      estimatedTokens: 30,
      alternatives: [
        { tool: "Grep (content)", estimatedTokens: 500, reason: "Returns full matches" },
        { tool: "Bash (wc)", estimatedTokens: 100, reason: "Shell overhead" },
      ],
    };
  }

  private routeListFiles(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "list-files",
      tool: "Glob",
      params: { pattern: (ctx.pattern || "**/*") as string, path: ctx.path },
      estimatedTokens: 100,
      alternatives: [
        { tool: "Bash (ls)", estimatedTokens: 200, reason: "Shell overhead" },
      ],
    };
  }

  private routeCheckExists(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "check-exists",
      tool: "Glob",
      params: { pattern: (ctx.file || ctx.pattern || "") as string },
      estimatedTokens: 20,
      alternatives: [
        { tool: "Bash (test -f)", estimatedTokens: 50, reason: "Shell overhead" },
        { tool: "Read", estimatedTokens: 500, reason: "Reads entire file just to check existence" },
      ],
    };
  }

  private routeGetStructure(ctx: Record<string, unknown>): RouteRecommendation {
    return {
      intent: "get-structure",
      tool: "Grep",
      params: { pattern: "^export (class|function|const|interface|type|enum)", path: ctx.file, output_mode: "content" },
      estimatedTokens: 150,
      alternatives: [
        { tool: "Read (full)", estimatedTokens: 800, reason: "Reads everything including implementation" },
        { tool: "Agent", estimatedTokens: 3000, reason: "Multiple tool calls" },
      ],
    };
  }

  /**
   * One-liner recommendation.
   */
  oneLiner(intent: QueryIntent, ctx: Record<string, unknown> = {}): string {
    const r = this.route(intent, ctx);
    return `${intent} → ${r.tool} (~${r.estimatedTokens} tokens)`;
  }
}

export const costAwareRouterEngine = new CostAwareRouterEngine();
