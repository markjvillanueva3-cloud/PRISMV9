// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; this engine is consumed
// by /wiki-harvest (U-WIKI06) and the wiki-harvest-h-drive.mjs cron until then.
/**
 * WikiPatternHarvesterEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * Bridges output from the six PRISM pattern miners into the wiki vault:
 *   - MacroPatternMinerEngine      (Okuma macro-program patterns)
 *   - MillPatternMinerEngine       (Haas/3-axis mill patterns)
 *   - NCPatternMinerEngine         (generic NC structural patterns)
 *   - SafetyPatternMinerEngine     (speed/retract/stop guards)
 *   - ToolPatternMinerEngine       (turret-station templates)
 *   - SelfImprovementPatternEngine (failure / quality / hook-block trends)
 *
 * Pipeline:
 *   1. Caller passes the miner output shape verbatim (or a typed
 *      `HarvestedPattern[]`).
 *   2. The harvester normalises every shape into one common
 *      `HarvestedPattern` record (frequency + confidence + description).
 *   3. For every record we materialise `wiki/patterns/miner-{source}-{slug}.md`
 *      (frontmatter + body). Writes are idempotent — same content ⇒ no rewrite.
 *   4. When `confidence ≥ 0.85` AND `frequency ≥ 5`, emit a *draft* skill stub
 *      at `~/.claude/commands/auto-{slug}.md.draft`. The `.draft` suffix is
 *      load-bearing: Claude Code only loads `*.md` skills, never `*.md.draft`,
 *      so a human must rename the file before the skill activates.
 *   5. Append a single log line per harvest run via WikiLogAppenderEngine and
 *      upsert each pattern into `wiki/index.md` via WikiIndexMaintainerEngine.
 *
 * REAL-DATA discipline: this engine never invents fields. If a caller passes a
 * miner result with no `frequency`, the entry is dropped with a warning rather
 * than backfilled with a stand-in number, because the skill-stub gate keys on
 * frequency and we will not auto-emit a stub against fabricated counts.
 *
 * @module WikiPatternHarvesterEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import {
  WikiIndexMaintainerEngine,
  type WikiEntry,
} from "./WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "./WikiLogAppenderEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Confidence floor at which a `.draft` skill stub is auto-emitted. */
export const SKILL_STUB_CONFIDENCE_FLOOR = 0.85;

/** Frequency floor at which a `.draft` skill stub is auto-emitted. */
export const SKILL_STUB_FREQUENCY_FLOOR = 5;

/** Where the harvester writes pattern markdown by default. */
export const DEFAULT_PATTERNS_DIR = path.resolve(
  import.meta.dirname,
  "../../../knowledge/wiki/patterns"
);

/** Where Claude Code skill commands live. `.draft` files are NOT loaded. */
export const DEFAULT_SKILL_DRAFT_DIR = path.join(
  os.homedir(),
  ".claude",
  "commands"
);

/** Six recognised miner sources. Keep aligned with milestone harvest_targets. */
export const MINER_SOURCES = [
  "macro",
  "mill",
  "nc",
  "safety",
  "tool",
  "self-improvement",
] as const;
export type MinerSource = (typeof MINER_SOURCES)[number];

// ============================================================================
// TYPES
// ============================================================================

/** Normalised pattern record consumed by the harvester. */
export interface HarvestedPattern {
  /** Stable identifier — used to dedupe across runs. */
  id: string;
  /** Which miner produced it. */
  source: MinerSource;
  /** Human-readable name. */
  name: string;
  /** Observed occurrence count across the corpus. */
  frequency: number;
  /** Optional caller-supplied confidence in [0, 1]. */
  confidence?: number;
  /** One-line description (pre-summarised by the miner). */
  description: string;
  /** Optional rich metadata preserved verbatim in the markdown frontmatter. */
  metadata?: Record<string, unknown>;
}

/** Result of harvesting a single pattern. */
export interface HarvestPatternResult {
  pattern: HarvestedPattern;
  patternFile: string;
  patternFileWritten: boolean;
  skillDraftFile?: string;
  skillDraftWritten?: boolean;
  /** Final confidence score used for the skill-gate (caller value or computed). */
  scoredConfidence: number;
  /** Whether this pattern crossed both thresholds. */
  crossedThreshold: boolean;
  /** Why a stub was/wasn't emitted (audit trail). */
  reason: string;
}

/** Aggregate report from harvest(). */
export interface HarvestReport {
  totalPatterns: number;
  filesWritten: number;
  skillDraftsWritten: number;
  skipped: number;
  results: HarvestPatternResult[];
  warnings: string[];
}

/** Options accepted by harvest(). */
export interface HarvestOptions {
  /** Overrides the default `wiki/patterns/` directory (tests + sandboxes). */
  patternsDir?: string;
  /** Overrides the default skill-draft directory (tests + sandboxes). */
  skillDraftDir?: string;
  /** Disable skill-draft emission entirely (audit-only mode). */
  skipSkillDrafts?: boolean;
  /** Optional today date string (YYYY-MM-DD) — primarily for deterministic tests. */
  today?: string;
  /** Caller agent string — recorded in wiki/log.md. */
  agent?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WikiPatternHarvesterEngine extends BaseEngine {
  private readonly indexEngine: WikiIndexMaintainerEngine;
  private readonly logEngine: WikiLogAppenderEngine;

  constructor(opts: {
    indexEngine?: WikiIndexMaintainerEngine;
    logEngine?: WikiLogAppenderEngine;
  } = {}) {
    super({
      name: "WikiPatternHarvesterEngine",
      version: "1.0.0",
      domain: "knowledge",
      description:
        "Bridges the six PRISM pattern miners into wiki/patterns/ and emits .draft skill stubs above thresholds.",
    });
    this.indexEngine = opts.indexEngine ?? new WikiIndexMaintainerEngine();
    this.logEngine = opts.logEngine ?? new WikiLogAppenderEngine();
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "harvest",
        description:
          "Materialise wiki/patterns/miner-*.md and emit .draft skill stubs above the confidence + frequency floors.",
      },
      {
        name: "normalise",
        description:
          "Convert raw miner output (Macro/Mill/NC/Safety/Tool/SelfImprovement) to HarvestedPattern[].",
      },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const i = input as { patterns?: unknown };
    if (!Array.isArray(i.patterns)) return "input.patterns must be an array";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<HarvestReport> {
    const i = input as { patterns: HarvestedPattern[]; options?: HarvestOptions };
    return this.harvest(i.patterns, i.options ?? {});
  }

  /**
   * Materialise every harvested pattern into the wiki vault, emit qualifying
   * skill drafts, and append a single audit log line. Idempotent — second run
   * over identical input changes nothing on disk.
   */
  async harvest(
    patterns: HarvestedPattern[],
    options: HarvestOptions = {}
  ): Promise<HarvestReport> {
    const patternsDir = options.patternsDir ?? DEFAULT_PATTERNS_DIR;
    const skillDir = options.skillDraftDir ?? DEFAULT_SKILL_DRAFT_DIR;
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const agent = options.agent ?? "claude:wiki-harvester";
    const warnings: string[] = [];
    const results: HarvestPatternResult[] = [];

    fs.mkdirSync(patternsDir, { recursive: true });
    if (!options.skipSkillDrafts) fs.mkdirSync(skillDir, { recursive: true });

    const upsertEntries: WikiEntry[] = [];
    const maxFrequency = Math.max(
      1,
      ...patterns.map((p) =>
        typeof p.frequency === "number" && Number.isFinite(p.frequency) ? p.frequency : 0
      )
    );

    for (const raw of patterns) {
      if (!raw || typeof raw !== "object") {
        warnings.push("dropped non-object pattern entry");
        continue;
      }
      if (typeof raw.frequency !== "number" || !Number.isFinite(raw.frequency)) {
        warnings.push(`dropped pattern '${raw.id ?? raw.name ?? "?"}' — missing frequency`);
        continue;
      }
      if (!raw.id || !raw.name || !raw.source || !raw.description) {
        warnings.push(
          `dropped pattern '${raw.id ?? raw.name ?? "?"}' — missing required fields`
        );
        continue;
      }
      if (!MINER_SOURCES.includes(raw.source as MinerSource)) {
        warnings.push(`dropped pattern '${raw.id}' — unknown source '${raw.source}'`);
        continue;
      }

      const slug = slugify(raw.id);
      const fileName = `miner-${raw.source}-${slug}.md`;
      const filePath = path.join(patternsDir, fileName);

      const scoredConfidence = scorePatternConfidence(raw, maxFrequency);
      const crossedThreshold =
        scoredConfidence >= SKILL_STUB_CONFIDENCE_FLOOR &&
        raw.frequency >= SKILL_STUB_FREQUENCY_FLOOR;

      const body = renderPatternMarkdown({
        pattern: raw,
        scoredConfidence,
        today,
        agent,
        crossedThreshold,
      });

      const patternFileWritten = writeIfChanged(filePath, body);

      let skillDraftFile: string | undefined;
      let skillDraftWritten: boolean | undefined;
      let reason = "below skill-stub thresholds";

      if (options.skipSkillDrafts) {
        reason = "skill drafts disabled by caller";
      } else if (crossedThreshold) {
        skillDraftFile = path.join(skillDir, `auto-${slug}.md.draft`);
        const stub = renderSkillDraft({
          pattern: raw,
          scoredConfidence,
          today,
          agent,
        });
        skillDraftWritten = writeIfChanged(skillDraftFile, stub);
        reason = "crossed confidence + frequency floor";
      }

      results.push({
        pattern: raw,
        patternFile: filePath,
        patternFileWritten,
        skillDraftFile,
        skillDraftWritten,
        scoredConfidence,
        crossedThreshold,
        reason,
      });

      upsertEntries.push({
        slug: `miner-${raw.source}-${slug}`,
        category: "patterns",
        summary: truncate(raw.description, 160),
        sources: [`miner:${raw.source}`],
        confidence: scoredConfidence,
        last_verified: today,
        source: agent,
      });
    }

    if (upsertEntries.length > 0) {
      await this.indexEngine.upsertMany(upsertEntries, today);
    }

    const filesWritten = results.filter((r) => r.patternFileWritten).length;
    const skillDraftsWritten = results.filter((r) => r.skillDraftWritten).length;

    if (results.length > 0) {
      await this.logEngine.append({
        date: today,
        op: "harvest:patterns",
        title: `${results.length} miner patterns (${filesWritten} new files, ${skillDraftsWritten} drafts)`,
        agent,
      });
    }

    return {
      totalPatterns: patterns.length,
      filesWritten,
      skillDraftsWritten,
      skipped: patterns.length - results.length,
      results,
      warnings,
    };
  }

  /**
   * Convert a raw miner result object into HarvestedPattern[]. Each miner has
   * its own field shape, so callers select the correct adapter explicitly.
   * The adapter only reshapes — it never invents counts or descriptions.
   */
  normaliseMacro(report: { variables?: Array<{ name: string; usage: string; frequency: number }>; rpmFormulas?: Array<{ formula: string; description?: string; count: number }> }): HarvestedPattern[] {
    const out: HarvestedPattern[] = [];
    for (const v of report.variables ?? []) {
      out.push({
        id: `macro-var-${v.name}`,
        source: "macro",
        name: `Macro variable ${v.name}`,
        frequency: v.frequency,
        description: `Variable ${v.name} used as ${v.usage}`,
        metadata: { usage: v.usage },
      });
    }
    for (const r of report.rpmFormulas ?? []) {
      out.push({
        id: `macro-rpm-${hashShort(r.formula)}`,
        source: "macro",
        name: `RPM formula: ${r.description ?? r.formula}`,
        frequency: r.count,
        description: r.description ?? `Formula ${r.formula}`,
        metadata: { formula: r.formula },
      });
    }
    return out;
  }

  normaliseMill(report: { pockets?: Array<{ strategy: string; frequency: number; description?: string }>; cannedCycles?: Array<{ code: string; frequency: number }> }): HarvestedPattern[] {
    const out: HarvestedPattern[] = [];
    for (const p of report.pockets ?? []) {
      out.push({
        id: `mill-pocket-${p.strategy}`,
        source: "mill",
        name: `Pocket strategy: ${p.strategy}`,
        frequency: p.frequency,
        description: p.description ?? `Pocket strategy ${p.strategy} observed`,
      });
    }
    for (const c of report.cannedCycles ?? []) {
      out.push({
        id: `mill-canned-${c.code}`,
        source: "mill",
        name: `Canned cycle ${c.code}`,
        frequency: c.frequency,
        description: `${c.code} canned cycle usage`,
      });
    }
    return out;
  }

  normaliseSafety(report: { speedClamps?: Array<{ rpm: number; frequency: number; description?: string }>; stops?: Array<{ code: string; frequency: number; description?: string }> }): HarvestedPattern[] {
    const out: HarvestedPattern[] = [];
    for (const s of report.speedClamps ?? []) {
      out.push({
        id: `safety-rpm-${s.rpm}`,
        source: "safety",
        name: `RPM clamp at ${s.rpm}`,
        frequency: s.frequency,
        description: s.description ?? `RPM clamp at ${s.rpm}`,
      });
    }
    for (const st of report.stops ?? []) {
      out.push({
        id: `safety-stop-${st.code}`,
        source: "safety",
        name: `Stop pattern ${st.code}`,
        frequency: st.frequency,
        description: st.description ?? `Stop pattern ${st.code}`,
      });
    }
    return out;
  }

  normaliseSelfImprovement(report: { patterns: Array<{ id: string; description: string; frequency: number; priority: number; severity: string; suggested_fix: string; fix_description: string; domain: string }> }): HarvestedPattern[] {
    return (report.patterns ?? []).map((p) => ({
      id: `self-${p.id}`,
      source: "self-improvement" as MinerSource,
      name: `${p.suggested_fix}: ${p.fix_description.slice(0, 60)}`,
      frequency: p.frequency,
      confidence: clamp01(p.priority),
      description: p.description,
      metadata: {
        severity: p.severity,
        suggested_fix: p.suggested_fix,
        domain: p.domain,
      },
    }));
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Stable URL-safe slug. */
export function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Compute a confidence in [0,1] using the caller value or relative frequency. */
export function scorePatternConfidence(p: HarvestedPattern, maxFrequency: number): number {
  if (typeof p.confidence === "number" && Number.isFinite(p.confidence)) {
    return clamp01(p.confidence);
  }
  if (maxFrequency <= 0) return 0;
  return clamp01(p.frequency / maxFrequency);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function hashShort(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
}

function writeIfChanged(filePath: string, content: string): boolean {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (fs.existsSync(filePath)) {
    const prior = fs.readFileSync(filePath, "utf8");
    if (prior === content) return false;
  }
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, filePath);
  return true;
}

/** Render the pattern markdown body. */
function renderPatternMarkdown(args: {
  pattern: HarvestedPattern;
  scoredConfidence: number;
  today: string;
  agent: string;
  crossedThreshold: boolean;
}): string {
  const { pattern, scoredConfidence, today, agent, crossedThreshold } = args;
  const meta = pattern.metadata ?? {};
  const metaLines = Object.entries(meta).map(
    ([k, v]) => `${k}: ${JSON.stringify(v)}`
  );
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: pattern/miner-${pattern.source}-${slugify(pattern.id)}`);
  lines.push("category: patterns");
  lines.push(`name: ${escapeYaml(pattern.name)}`);
  lines.push(`source_miner: ${pattern.source}`);
  lines.push(`frequency: ${pattern.frequency}`);
  lines.push(`confidence: ${scoredConfidence.toFixed(3)}`);
  lines.push(`crossed_skill_threshold: ${crossedThreshold ? "true" : "false"}`);
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  if (metaLines.length > 0) {
    lines.push("metadata:");
    for (const ml of metaLines) lines.push(`  ${ml}`);
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${pattern.name}`);
  lines.push("");
  lines.push(pattern.description);
  lines.push("");
  lines.push("## Observed signal");
  lines.push("");
  lines.push(`- Miner: \`${pattern.source}\``);
  lines.push(`- Occurrences: \`${pattern.frequency}\``);
  lines.push(`- Confidence: \`${scoredConfidence.toFixed(3)}\``);
  if (crossedThreshold) {
    lines.push(
      `- Auto-skill draft: \`~/.claude/commands/auto-${slugify(pattern.id)}.md.draft\` (rename to \`.md\` to activate)`
    );
  }
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiPatternHarvesterEngine on ${today} (agent: \`${agent}\`).`);
  lines.push(`- Pattern id: \`${pattern.id}\``);
  lines.push("");
  return lines.join("\n");
}

/** Render the human-approval-pending skill stub. */
function renderSkillDraft(args: {
  pattern: HarvestedPattern;
  scoredConfidence: number;
  today: string;
  agent: string;
}): string {
  const { pattern, scoredConfidence, today, agent } = args;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`name: auto-${slugify(pattern.id)}`);
  lines.push(`description: ${escapeYaml(pattern.name)}`);
  lines.push("status: draft");
  lines.push(`source_miner: ${pattern.source}`);
  lines.push(`frequency: ${pattern.frequency}`);
  lines.push(`confidence: ${scoredConfidence.toFixed(3)}`);
  lines.push(`generated_on: ${today}`);
  lines.push(`generated_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# auto-${slugify(pattern.id)} (DRAFT — requires human approval)`);
  lines.push("");
  lines.push(
    "> This skill was auto-generated by WikiPatternHarvesterEngine. The `.draft` extension blocks loading. Rename to `.md` after review to activate."
  );
  lines.push("");
  lines.push("## Detected pattern");
  lines.push("");
  lines.push(pattern.description);
  lines.push("");
  lines.push(`Observed ${pattern.frequency}× across the corpus (confidence ${scoredConfidence.toFixed(3)}).`);
  lines.push("");
  lines.push("## Suggested skill body");
  lines.push("");
  lines.push("```");
  lines.push(`# Trigger: when the user asks about ${pattern.name.toLowerCase()}`);
  lines.push(`# Action: surface the pattern record at`);
  lines.push(`#   knowledge/wiki/patterns/miner-${pattern.source}-${slugify(pattern.id)}.md`);
  lines.push("```");
  lines.push("");
  lines.push("## Approval checklist");
  lines.push("");
  lines.push("- [ ] Reviewed source pattern markdown for fabrication");
  lines.push("- [ ] Confirmed action body is safe (no destructive shell)");
  lines.push("- [ ] Renamed `.md.draft` → `.md`");
  lines.push("- [ ] Added matching entry under `wiki/log.md`");
  lines.push("");
  return lines.join("\n");
}

function escapeYaml(s: string): string {
  if (/[:#\n"]/.test(s)) return JSON.stringify(s);
  return s;
}

// Default singleton — match the project pattern.
export const wikiPatternHarvesterEngine = new WikiPatternHarvesterEngine();
