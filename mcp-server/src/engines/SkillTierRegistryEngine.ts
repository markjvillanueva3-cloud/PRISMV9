/**
 * SkillTierRegistryEngine — Classify skills into discoverability tiers
 *
 * Phase 0.25.6 U-UX1 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM ships
 * 175+ slash commands. A new user who sees everything at once learns
 * nothing. This engine classifies each registered skill into one of three
 * tiers so `/help-me-start` (U-UX4) can surface a progressive disclosure:
 *
 *   - essential    (the ~10 skills that matter first: /dedup, /boot, /pdf-learn, ...)
 *   - intermediate (~30 skills for routine shop floor work)
 *   - advanced     (everything else — shown only when requested or triggered)
 *
 * Tier is determined by an explicit tag OR, failing that, a rule table that
 * maps trigger keywords to tiers. No I/O.
 *
 * @module engines/SkillTierRegistryEngine
 * @milestone PP-0.25.6-U-UX1
 */

export type SkillTier = "essential" | "intermediate" | "advanced";

export interface SkillRecord {
  command: string;
  description: string;
  explicitTier?: SkillTier;
  triggers: string[];
  tags?: string[];
  invocationCount?: number;
}

export interface TierAssignment {
  command: string;
  tier: SkillTier;
  reason: string;
}

export interface TierReport {
  total: number;
  byTier: Record<SkillTier, number>;
  assignments: TierAssignment[];
}

const ESSENTIAL_KEYWORDS = [
  "dedup",
  "boot",
  "startup",
  "help",
  "pdf-learn",
  "video-learn",
  "navigate",
  "status",
  "forge-triple",
  "scrutinize",
  "smart",
];

const INTERMEDIATE_KEYWORDS = [
  "wedm",
  "lathe",
  "mill",
  "okuma",
  "fanuc",
  "haas",
  "speed-feed",
  "tool",
  "material",
  "program",
  "quote",
  "estimate",
  "shop",
];

export class SkillTierRegistryEngine {
  private readonly skills = new Map<string, SkillRecord>();

  register(skill: SkillRecord): SkillRecord {
    this.validate(skill);
    const canon: SkillRecord = {
      ...skill,
      command: skill.command.startsWith("/") ? skill.command : `/${skill.command}`,
      triggers: [...new Set(skill.triggers.map((t) => t.toLowerCase()))],
      tags: skill.tags ? [...new Set(skill.tags.map((t) => t.toLowerCase()))] : undefined,
    };
    this.skills.set(canon.command, canon);
    return canon;
  }

  registerAll(skills: readonly SkillRecord[]): void {
    for (const s of skills) this.register(s);
  }

  /** Assign a tier to a single skill. */
  assign(command: string): TierAssignment {
    const key = command.startsWith("/") ? command : `/${command}`;
    const skill = this.skills.get(key);
    if (!skill) throw new Error(`unknown skill: ${command}`);
    return this.classify(skill);
  }

  /** Classify every registered skill; return per-tier counts + assignments. */
  classifyAll(): TierReport {
    const assignments = [...this.skills.values()].map((s) => this.classify(s));
    const byTier: Record<SkillTier, number> = { essential: 0, intermediate: 0, advanced: 0 };
    for (const a of assignments) byTier[a.tier] += 1;
    return {
      total: assignments.length,
      byTier,
      assignments: assignments.sort((a, b) => {
        if (a.tier === b.tier) return a.command.localeCompare(b.command);
        return this.tierRank(a.tier) - this.tierRank(b.tier);
      }),
    };
  }

  listByTier(tier: SkillTier): TierAssignment[] {
    return this.classifyAll().assignments.filter((a) => a.tier === tier);
  }

  size(): number {
    return this.skills.size;
  }

  clear(): void {
    this.skills.clear();
  }

  // --- internals ---------------------------------------------------------

  private classify(skill: SkillRecord): TierAssignment {
    if (skill.explicitTier) {
      return {
        command: skill.command,
        tier: skill.explicitTier,
        reason: "explicit tier set on registration",
      };
    }
    const keywords = new Set<string>([...skill.triggers, ...(skill.tags ?? [])]);
    for (const kw of ESSENTIAL_KEYWORDS) {
      if (keywords.has(kw) || skill.command.toLowerCase().includes(kw)) {
        return { command: skill.command, tier: "essential", reason: `matches essential keyword '${kw}'` };
      }
    }
    for (const kw of INTERMEDIATE_KEYWORDS) {
      if (keywords.has(kw) || skill.command.toLowerCase().includes(kw)) {
        return {
          command: skill.command,
          tier: "intermediate",
          reason: `matches intermediate keyword '${kw}'`,
        };
      }
    }
    return { command: skill.command, tier: "advanced", reason: "no tier keywords matched" };
  }

  private tierRank(tier: SkillTier): number {
    return tier === "essential" ? 0 : tier === "intermediate" ? 1 : 2;
  }

  private validate(skill: SkillRecord): void {
    if (!skill.command || skill.command.trim() === "") throw new Error("command required");
    if (!skill.description || skill.description.trim() === "") throw new Error("description required");
    if (!Array.isArray(skill.triggers)) throw new Error("triggers must be array");
    if (skill.explicitTier && !["essential", "intermediate", "advanced"].includes(skill.explicitTier)) {
      throw new Error("explicitTier invalid");
    }
    if (skill.invocationCount !== undefined && skill.invocationCount < 0) {
      throw new Error("invocationCount must be ≥ 0");
    }
  }
}

export const skillTierRegistryEngine = new SkillTierRegistryEngine();
