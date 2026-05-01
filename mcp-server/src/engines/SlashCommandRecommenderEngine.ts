/**
 * SlashCommandRecommenderEngine — Suggest slash commands on UserPromptSubmit
 *
 * Phase 0.17 U-PLG2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM ships 175+
 * slash commands. Sessions rarely use most of them because they don't know
 * they exist at the right moment. This engine scans the user prompt, matches
 * it against registered command triggers, and emits the top-N (default 3)
 * recommendations with rationale.
 *
 * The caller loads command metadata from `~/.claude/commands/*.md` frontmatter
 * and feeds entries via `register()` or `registerAll()`. Rate-limiting
 * (1 suggestion per turn, confidence ≥ 0.70) is enforced by the hook, not
 * here — this engine is a pure matcher.
 *
 * @module engines/SlashCommandRecommenderEngine
 * @milestone PP-0.17-U-PLG2
 */

export interface CommandEntry {
  command: string; // e.g., "/dedup"
  description: string;
  triggers: string[];
  tags?: string[];
  invocationCount?: number;
}

export interface CommandRecommendation {
  command: string;
  description: string;
  confidence: number; // 0..1
  matchedTriggers: string[];
  rationale: string;
}

export interface RecommenderOptions {
  limit?: number;
  minConfidence?: number;
  excludeCommands?: string[];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function tokenize(text: string): Set<string> {
  return new Set(
    (text.toLowerCase().match(/[a-z0-9][a-z0-9_-]*/g) ?? []).filter((t) => t.length > 1)
  );
}

export class SlashCommandRecommenderEngine {
  private readonly commands = new Map<string, CommandEntry>();

  register(entry: CommandEntry): CommandEntry {
    this.validate(entry);
    const canon: CommandEntry = {
      ...entry,
      command: entry.command.startsWith("/") ? entry.command : `/${entry.command}`,
      triggers: [...new Set(entry.triggers.map(normalize))],
      tags: entry.tags?.map(normalize),
    };
    this.commands.set(canon.command, canon);
    return canon;
  }

  registerAll(entries: readonly CommandEntry[]): void {
    for (const e of entries) this.register(e);
  }

  get(command: string): CommandEntry | null {
    const key = command.startsWith("/") ? command : `/${command}`;
    return this.commands.get(key) ?? null;
  }

  list(): CommandEntry[] {
    return [...this.commands.values()];
  }

  size(): number {
    return this.commands.size;
  }

  clear(): void {
    this.commands.clear();
  }

  /**
   * Load registry entries from SLASH_COMMAND_REGISTRY.json produced by
   * `scripts/build-slash-command-registry.ts`. Idempotent — safe to call
   * on every session boot. Returns number of entries loaded.
   */
  loadFromRegistryFile(filePath: string): number {
    // Lazy import to keep engine pure for non-Node consumers.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { readFileSync } = require("node:fs");
    const raw = readFileSync(filePath, "utf8");
    const doc = JSON.parse(raw) as { entries?: CommandEntry[] };
    const entries = doc.entries ?? [];
    this.registerAll(entries);
    return entries.length;
  }

  recommend(prompt: string, opts: RecommenderOptions = {}): CommandRecommendation[] {
    const limit = opts.limit ?? 3;
    const minConfidence = opts.minConfidence ?? 0;
    const exclude = new Set((opts.excludeCommands ?? []).map((c) => (c.startsWith("/") ? c : `/${c}`)));

    if (minConfidence < 0 || minConfidence > 1) {
      throw new Error("minConfidence must be in [0, 1]");
    }

    const tokens = tokenize(prompt);
    if (tokens.size === 0) return [];

    const recs: CommandRecommendation[] = [];
    for (const cmd of this.commands.values()) {
      if (exclude.has(cmd.command)) continue;
      const matched: string[] = [];
      for (const trigger of cmd.triggers) {
        if (tokens.has(trigger) || this.multiWordHit(prompt, trigger)) matched.push(trigger);
      }
      if (matched.length === 0) continue;

      const coverage = matched.length / Math.max(1, cmd.triggers.length);
      const popularityBoost = Math.min(0.2, (cmd.invocationCount ?? 0) / 1000);
      const confidence = Math.min(1, Math.round((coverage * 0.9 + popularityBoost) * 10000) / 10000);
      if (confidence < minConfidence) continue;

      recs.push({
        command: cmd.command,
        description: cmd.description,
        confidence,
        matchedTriggers: matched,
        rationale: `you asked about ${matched.join(", ")} → try ${cmd.command}`,
      });
    }

    recs.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return a.command.localeCompare(b.command);
    });

    return limit > 0 ? recs.slice(0, limit) : recs;
  }

  private validate(entry: CommandEntry): void {
    if (!entry.command || entry.command.trim() === "") throw new Error("command required");
    if (!entry.description || entry.description.trim() === "") throw new Error("description required");
    if (!Array.isArray(entry.triggers) || entry.triggers.length === 0) {
      throw new Error("triggers must be a non-empty array");
    }
    if (entry.invocationCount !== undefined && entry.invocationCount < 0) {
      throw new Error("invocationCount must be non-negative");
    }
  }

  private multiWordHit(prompt: string, trigger: string): boolean {
    if (!trigger.includes(" ")) return false;
    return prompt.toLowerCase().includes(trigger);
  }
}

export const slashCommandRecommenderEngine = new SlashCommandRecommenderEngine();
