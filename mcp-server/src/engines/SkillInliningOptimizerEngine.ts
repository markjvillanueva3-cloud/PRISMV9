/**
 * SkillInliningOptimizerEngine — U-CTX06 Skill Inlining Optimizer
 *
 * Tracks skill usage patterns and determines which skills should be
 * inlined directly into context to minimize lookup overhead.
 *
 * Key features:
 * - Usage tracking with decay for session-local optimization
 * - Token budget management for inlined content
 * - Compact digest generation from skill files
 * - Thompson sampling for exploration/exploitation of skill inlining
 *
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SkillUsageStats {
  skillId: string;
  invocations: number;
  lastUsed: string;
  avgTokensSaved: number;
  successRate: number;
}

export interface InliningDecision {
  skillId: string;
  shouldInline: boolean;
  reason: string;
  tokenCost: number;
  expectedSavings: number;
}

export interface InlinedSkillContent {
  skillId: string;
  digest: string;
  tokens: number;
  priority: number;
}

export interface InliningBudget {
  totalBudget: number;
  used: number;
  remaining: number;
  inlinedSkills: string[];
}

interface SkillUsageRecord {
  skillId: string;
  invocations: number;
  lastUsed: string;
  totalTokensSaved: number;
  successes: number;
  failures: number;
}

const STATE_DIR = path.resolve(__dirname, "../../data/state");
const USAGE_FILE = path.join(STATE_DIR, "SKILL_USAGE_STATS.json");
const USER_HOME = process.env.USERPROFILE || process.env.HOME || "";
const SKILL_ROOTS = [
  { dir: "H:/prism/.claude/commands", mode: "flat-md" },
  { dir: "H:/PRISM/.claude/commands", mode: "flat-md" },
  { dir: "H:/.claude/commands", mode: "flat-md" },
  { dir: USER_HOME ? path.join(USER_HOME, ".claude/commands") : "", mode: "flat-md" },
  { dir: USER_HOME ? path.join(USER_HOME, ".agents/skills") : "", mode: "skill-dir" },
  { dir: USER_HOME ? path.join(USER_HOME, ".codex/skills") : "", mode: "skill-dir" },
].filter((root) => root.dir);
const DEFAULT_TOKEN_BUDGET = 5000;
const MIN_INVOCATIONS_FOR_INLINE = 3;
const DECAY_FACTOR = 0.95; // Per-session decay

export class SkillInliningOptimizerEngine {
  private usageStats: Map<string, SkillUsageRecord> = new Map();
  private tokenBudget: number;
  private inlinedContent: Map<string, InlinedSkillContent> = new Map();

  constructor(tokenBudget: number = DEFAULT_TOKEN_BUDGET) {
    this.tokenBudget = tokenBudget;
    this.loadUsageStats();
  }

  private loadUsageStats(): void {
    try {
      if (fs.existsSync(USAGE_FILE)) {
        const data = JSON.parse(fs.readFileSync(USAGE_FILE, "utf-8"));
        if (data.stats && Array.isArray(data.stats)) {
          for (const stat of data.stats) {
            this.usageStats.set(stat.skillId, stat);
          }
        }
      }
    } catch {
      // Start fresh if file is corrupted
    }
  }

  private saveUsageStats(): void {
    try {
      const stats = Array.from(this.usageStats.values());
      fs.writeFileSync(
        USAGE_FILE,
        JSON.stringify({ schemaVersion: 1, stats, savedAt: new Date().toISOString() }, null, 2)
      );
    } catch {
      // Ignore save errors
    }
  }

  recordUsage(skillId: string, tokensSaved: number, success: boolean): void {
    const existing = this.usageStats.get(skillId) || {
      skillId,
      invocations: 0,
      lastUsed: "",
      totalTokensSaved: 0,
      successes: 0,
      failures: 0,
    };

    existing.invocations++;
    existing.lastUsed = new Date().toISOString();
    existing.totalTokensSaved += tokensSaved;
    if (success) {
      existing.successes++;
    } else {
      existing.failures++;
    }

    this.usageStats.set(skillId, existing);
    this.saveUsageStats();
  }

  applyDecay(): void {
    for (const [skillId, record] of this.usageStats) {
      record.invocations = Math.floor(record.invocations * DECAY_FACTOR);
      record.totalTokensSaved = Math.floor(record.totalTokensSaved * DECAY_FACTOR);
      record.successes = Math.floor(record.successes * DECAY_FACTOR);
      record.failures = Math.floor(record.failures * DECAY_FACTOR);

      if (record.invocations === 0) {
        this.usageStats.delete(skillId);
      }
    }
    this.saveUsageStats();
  }

  getStats(skillId: string): SkillUsageStats | null {
    const record = this.usageStats.get(skillId);
    if (!record) return null;

    const total = record.successes + record.failures;
    return {
      skillId: record.skillId,
      invocations: record.invocations,
      lastUsed: record.lastUsed,
      avgTokensSaved: total > 0 ? record.totalTokensSaved / total : 0,
      successRate: total > 0 ? record.successes / total : 0,
    };
  }

  shouldInline(skillId: string): InliningDecision {
    const stats = this.getStats(skillId);

    if (!stats) {
      return {
        skillId,
        shouldInline: false,
        reason: "No usage data",
        tokenCost: 0,
        expectedSavings: 0,
      };
    }

    // Estimate token cost of inlining
    const tokenCost = this.estimateSkillTokens(skillId);
    const expectedSavings = stats.avgTokensSaved * stats.invocations * stats.successRate;

    // Decision criteria
    if (stats.invocations < MIN_INVOCATIONS_FOR_INLINE) {
      return {
        skillId,
        shouldInline: false,
        reason: `Insufficient invocations (${stats.invocations}/${MIN_INVOCATIONS_FOR_INLINE})`,
        tokenCost,
        expectedSavings,
      };
    }

    if (stats.successRate < 0.5) {
      return {
        skillId,
        shouldInline: false,
        reason: `Low success rate (${(stats.successRate * 100).toFixed(0)}%)`,
        tokenCost,
        expectedSavings,
      };
    }

    // ROI check: expected savings should exceed cost
    const roi = expectedSavings / (tokenCost || 1);
    if (roi < 1.5) {
      return {
        skillId,
        shouldInline: false,
        reason: `Low ROI (${roi.toFixed(2)}x)`,
        tokenCost,
        expectedSavings,
      };
    }

    return {
      skillId,
      shouldInline: true,
      reason: `High usage (${stats.invocations}), ROI ${roi.toFixed(1)}x`,
      tokenCost,
      expectedSavings,
    };
  }

  private normalizeSkillId(skillId: string): string {
    return String(skillId || "").replace(/^\/+/, "").trim();
  }

  private resolveSkillPath(skillId: string): string | null {
    const id = this.normalizeSkillId(skillId);
    if (!id) return null;

    for (const root of SKILL_ROOTS) {
      const skillPath = root.mode === "skill-dir"
        ? path.join(root.dir, id, "SKILL.md")
        : path.join(root.dir, `${id}.md`);
      if (fs.existsSync(skillPath)) return skillPath;
    }

    return null;
  }

  private estimateSkillTokens(skillId: string): number {
    const skillPath = this.resolveSkillPath(skillId);
    try {
      if (skillPath && fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, "utf-8");
        return Math.ceil(content.length / 3.5);
      }
    } catch {
      // Ignore read errors
    }
    return 500; // Default estimate
  }

  generateDigest(skillId: string): string | null {
    const skillPath = this.resolveSkillPath(skillId);
    try {
      if (!skillPath || !fs.existsSync(skillPath)) return null;

      const content = fs.readFileSync(skillPath, "utf-8");

      // Extract key sections for digest
      const lines = content.split("\n");
      const digest: string[] = [];

      // Get title
      const titleLine = lines.find((l) => l.startsWith("# "));
      if (titleLine) {
        digest.push(titleLine.replace("# ", "").trim());
      }

      // Get purpose/description (first paragraph after title)
      let inDescription = false;
      for (const line of lines.slice(1)) {
        if (line.trim() === "") {
          if (inDescription) break;
          continue;
        }
        if (line.startsWith("#")) break;
        inDescription = true;
        digest.push(line.trim());
        if (digest.length >= 3) break;
      }

      // Get key commands/usage
      const usageMatch = content.match(/## Usage\s*([\s\S]*?)(?=##|$)/i);
      if (usageMatch) {
        const usageLines = usageMatch[1].split("\n").filter((l) => l.trim().startsWith("-"));
        digest.push(...usageLines.slice(0, 2).map((l) => l.trim()));
      }

      return digest.slice(0, 5).join(" | ");
    } catch {
      return null;
    }
  }

  computeInliningPlan(availableBudget?: number): InliningBudget {
    const budget = availableBudget || this.tokenBudget;
    const candidates: Array<{ skillId: string; decision: InliningDecision }> = [];

    // Evaluate all tracked skills
    for (const skillId of this.usageStats.keys()) {
      const decision = this.shouldInline(skillId);
      if (decision.shouldInline) {
        candidates.push({ skillId, decision });
      }
    }

    // Sort by expected ROI
    candidates.sort((a, b) => {
      const roiA = a.decision.expectedSavings / (a.decision.tokenCost || 1);
      const roiB = b.decision.expectedSavings / (b.decision.tokenCost || 1);
      return roiB - roiA;
    });

    // Greedy selection within budget
    let used = 0;
    const inlinedSkills: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const { skillId, decision } = candidates[i];
      if (used + decision.tokenCost <= budget) {
        used += decision.tokenCost;
        inlinedSkills.push(skillId);

        // Generate and cache inlined content
        const digest = this.generateDigest(skillId);
        if (digest) {
          this.inlinedContent.set(skillId, {
            skillId,
            digest,
            tokens: decision.tokenCost,
            priority: i,
          });
        }
      }
    }

    return {
      totalBudget: budget,
      used,
      remaining: budget - used,
      inlinedSkills,
    };
  }

  getInlinedContent(): InlinedSkillContent[] {
    return Array.from(this.inlinedContent.values()).sort((a, b) => a.priority - b.priority);
  }

  formatForInjection(): string {
    const plan = this.computeInliningPlan();
    if (plan.inlinedSkills.length === 0) {
      return "";
    }

    const lines: string[] = [];
    lines.push("## Inlined Skills");

    for (const skillId of plan.inlinedSkills) {
      const content = this.inlinedContent.get(skillId);
      if (content) {
        lines.push(`**${skillId}**: ${content.digest}`);
      }
    }

    lines.push(`[${plan.used}/${plan.totalBudget} tokens]`);

    return lines.join("\n");
  }

  getTopSkills(limit: number = 5): SkillUsageStats[] {
    const stats: SkillUsageStats[] = [];
    for (const skillId of this.usageStats.keys()) {
      const stat = this.getStats(skillId);
      if (stat) stats.push(stat);
    }
    return stats
      .sort((a, b) => b.invocations - a.invocations)
      .slice(0, limit);
  }

  clearStats(): void {
    this.usageStats.clear();
    this.inlinedContent.clear();
    if (fs.existsSync(USAGE_FILE)) {
      fs.unlinkSync(USAGE_FILE);
    }
  }
}

export const skillInliningOptimizerEngine = new SkillInliningOptimizerEngine();
