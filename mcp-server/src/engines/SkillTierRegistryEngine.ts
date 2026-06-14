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

/**
 * Snapshot of the registry's state — caller-owned, JSON-serializable, used
 * for pre-classify rollback per U-CK28 exit condition
 * "registry snapshot captured pre-classify for rollback".
 */
export interface RegistrySnapshot {
  takenAt: string;
  size: number;
  skills: SkillRecord[];
}

/**
 * Options for {@link SkillTierRegistryEngine.classifyAllAndPersist} —
 * U-CK28 closes the command-utilization → auto skill-tier loop.
 */
export interface ClassifyAndPersistOptions {
  /**
   * When true, command-invocation telemetry drives the assignment:
   * skills are ranked by {@link SkillRecord.invocationCount} descending,
   * then the top {@link essentialTop} go to "essential", the next
   * {@link intermediateTop} go to "intermediate", and the remainder to
   * "advanced". Skills with no recorded invocationCount fall back to
   * keyword classification before usage-based ranking takes effect.
   *
   * Default false — keyword classification only.
   */
  useInvocationCount?: boolean;
  /** Top-N most-invoked skills promoted to "essential". Default 10. */
  essentialTop?: number;
  /** Next-N after essential promoted to "intermediate". Default 30. */
  intermediateTop?: number;
  /**
   * When true, the persisted assignment OVERWRITES any pre-existing
   * explicitTier on the record. Default true — that's the whole point
   * of "writes tiers back (not read-only)" per U-CK28.
   */
  overwriteExplicit?: boolean;
}

export interface ClassifyAndPersistResult {
  report: TierReport;
  snapshot: RegistrySnapshot;
  persistedCount: number;
  usageDriven: boolean;
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

  /**
   * U-CK28: Capture the registry's current state for rollback. Snapshots
   * are deep copies — mutating the original registry afterwards does not
   * affect a snapshot. Restore via {@link restore}.
   */
  snapshot(): RegistrySnapshot {
    return {
      takenAt: new Date().toISOString(),
      size: this.skills.size,
      skills: [...this.skills.values()].map((s) => this.cloneRecord(s)),
    };
  }

  /**
   * U-CK28: Restore registry from a snapshot. Existing state is replaced.
   * Returns the number of skills restored. Throws on a malformed snapshot.
   */
  restore(snapshot: RegistrySnapshot): number {
    if (!snapshot || !Array.isArray(snapshot.skills)) {
      throw new Error("invalid snapshot: missing skills array");
    }
    this.skills.clear();
    for (const s of snapshot.skills) {
      this.validate(s);
      this.skills.set(s.command, this.cloneRecord(s));
    }
    return this.skills.size;
  }

  /**
   * U-CK28: closes the command-utilization → auto skill-tier loop.
   *
   * Runs {@link classifyAll} but ALSO writes the assigned tier back to
   * each {@link SkillRecord.explicitTier}, making the registry self-tuning.
   * When `useInvocationCount` is set, ranks skills by invocationCount desc
   * and promotes top-N to essential / next-N to intermediate / rest to
   * advanced — telemetry-driven progressive disclosure.
   *
   * Always captures a pre-classify snapshot in the result for rollback.
   *
   * @param options classification + persistence options
   * @returns report, pre-classify snapshot, persisted count, and whether
   *          the usage-driven path was taken
   */
  classifyAllAndPersist(options: ClassifyAndPersistOptions = {}): ClassifyAndPersistResult {
    const overwriteExplicit = options.overwriteExplicit !== false;
    const useInvocationCount = options.useInvocationCount === true;
    const essentialTop = this.clampTopN(options.essentialTop, 10);
    const intermediateTop = this.clampTopN(options.intermediateTop, 30);
    const snapshot = this.snapshot();

    let assignments: TierAssignment[];
    if (useInvocationCount) {
      assignments = this.classifyByUsage(essentialTop, intermediateTop);
    } else {
      assignments = [...this.skills.values()].map((s) => this.classify(s));
    }

    let persistedCount = 0;
    for (const a of assignments) {
      const record = this.skills.get(a.command);
      if (!record) { continue; }
      if (!overwriteExplicit && record.explicitTier) { continue; }
      record.explicitTier = a.tier;
      persistedCount += 1;
    }

    const byTier: Record<SkillTier, number> = { essential: 0, intermediate: 0, advanced: 0 };
    for (const a of assignments) { byTier[a.tier] += 1; }
    const report: TierReport = {
      total: assignments.length,
      byTier,
      assignments: assignments.slice().sort((a, b) => {
        if (a.tier === b.tier) { return a.command.localeCompare(b.command); }
        return this.tierRank(a.tier) - this.tierRank(b.tier);
      }),
    };
    return { report, snapshot, persistedCount, usageDriven: useInvocationCount };
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

  /**
   * U-CK28: usage-driven classification.
   * Skills are sorted by invocationCount descending (ties broken by
   * command name asc for determinism). Top-N go essential, next-M go
   * intermediate, the remainder advanced. Skills with no
   * invocationCount fall through the rank list at position 0 — they
   * land in advanced unless lifted by their position.
   */
  private classifyByUsage(essentialTop: number, intermediateTop: number): TierAssignment[] {
    const ranked = [...this.skills.values()].sort((a, b) => {
      const ac = typeof a.invocationCount === "number" ? a.invocationCount : 0;
      const bc = typeof b.invocationCount === "number" ? b.invocationCount : 0;
      if (bc !== ac) { return bc - ac; }
      return a.command.localeCompare(b.command);
    });
    const out: TierAssignment[] = [];
    for (let i = 0; i < ranked.length; i++) {
      const skill = ranked[i];
      let tier: SkillTier;
      let reason: string;
      if (i < essentialTop && (skill.invocationCount ?? 0) > 0) {
        tier = "essential";
        reason = `usage rank ${i + 1} of ${ranked.length} (invocationCount=${skill.invocationCount})`;
      } else if (i < essentialTop + intermediateTop && (skill.invocationCount ?? 0) > 0) {
        tier = "intermediate";
        reason = `usage rank ${i + 1} of ${ranked.length} (invocationCount=${skill.invocationCount})`;
      } else {
        tier = "advanced";
        reason = (skill.invocationCount ?? 0) === 0
          ? "no recorded invocations — defaulted to advanced"
          : `usage rank ${i + 1} of ${ranked.length} (invocationCount=${skill.invocationCount})`;
      }
      out.push({ command: skill.command, tier, reason });
    }
    return out;
  }

  private clampTopN(value: number | undefined, fallback: number): number {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      return fallback;
    }
    return Math.floor(value);
  }

  private cloneRecord(s: SkillRecord): SkillRecord {
    return {
      command: s.command,
      description: s.description,
      explicitTier: s.explicitTier,
      triggers: [...s.triggers],
      tags: s.tags ? [...s.tags] : undefined,
      invocationCount: s.invocationCount,
    };
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
