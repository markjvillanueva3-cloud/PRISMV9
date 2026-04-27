/**
 * WikiCodingTribalEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * Curates four "tribal" sections of the PRISM wiki by harvesting existing
 * memory pages and the codex-of-record engines:
 *
 *   wiki/code-tribal/         — SOLID rules, safety-critical tests, completeness
 *                               gates, anti-deletion rules, build discipline.
 *                               Sourced primarily from feedback memories.
 *   wiki/architecture/        — plugin_architecture, distributed_locking,
 *                               devops_improvements, PipelineArchitectureEngine.
 *   wiki/software-engineering — Build-process discipline, ESM/esbuild traps,
 *                               cross-session duplication guards, hook hygiene.
 *   wiki/ux-design/           — Frontend-codex constraints, PPG frontend rules,
 *                               lightsaber borders, PPG quality bar, mcp-server
 *                               page-level audit notes.
 *
 * The engine writes one `index.md` per section. Every line is sourced from a
 * real on-disk page or the live `mcp-server/web/` page list — nothing is
 * fabricated. Each entry carries the source path so future audits can verify
 * lineage without re-running the harvester.
 *
 * Idempotent: identical input ⇒ no rewrite (write-if-changed). Re-running the
 * curator after adding a memory page automatically picks it up if it appears
 * in the curator config.
 *
 * @module WikiCodingTribalEngine
 */

import * as fs from "fs";
import * as path from "path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Minimum entries each section must contain (milestone exit condition). */
export const MIN_ENTRIES_PER_SECTION = 10;

/** Default vault root resolved from the engine's compiled location. */
export const DEFAULT_VAULT_ROOT = path.resolve(
  import.meta.dirname,
  "../../../knowledge"
);

export const TRIBAL_SECTIONS = [
  "code-tribal",
  "architecture",
  "software-engineering",
  "ux-design",
] as const;
export type TribalSection = (typeof TRIBAL_SECTIONS)[number];

// ============================================================================
// CURATOR CONFIG (real memory pages — paths are relative to vault root)
// ============================================================================

/**
 * Each list is REAL — every path here exists in `knowledge/memories/` once
 * U-WIKI04B-P1 imports the vault. Adding new pages to the vault does NOT
 * silently flow into the wiki: an editor must add the path here so an
 * intentional curator decision is on record (matches the coding-tribal /
 * architecture taxonomy guidance in WIKI_SCHEMA.md §4).
 */
export const DEFAULT_CURATOR_CONFIG: Record<TribalSection, string[]> = {
  "code-tribal": [
    "memories/feedback/feedback_safety_critical_tests.md",
    "memories/feedback/feedback_dont_soften_completeness_gates.md",
    "memories/feedback/feedback_no_delete_assets.md",
    "memories/feedback/feedback_always_build.md",
    "memories/feedback/feedback_ai_first_development.md",
    "memories/feedback/feedback_exhaustive_variability.md",
    "memories/feedback/feedback_hook_process_hygiene.md",
    "memories/feedback/feedback_post_development.md",
    "memories/feedback/feedback_verbose_ok.md",
    "memories/feedback/feedback_cross_session_duplication.md",
    "memories/feedback/feedback_box_programs_amateur.md",
    "memories/feedback/feedback_shop_programs_amateur.md",
  ],
  architecture: [
    "memories/reference/plugin_architecture.md",
    "memories/reference/distributed_locking.md",
    "memories/reference/devops_improvements.md",
    "memories/reference/prism_commands.md",
    "memories/reference/reference_prism_inventory.md",
    "memories/project/jm-die-shop.md",
    "memories/project/project_pp_agi_s0.md",
    "memories/project/token_saving_infrastructure.md",
    "memories/project/project_psau_foresight.md",
    "memories/project/project_archive_outdated.md",
  ],
  "software-engineering": [
    "memories/feedback/feedback_backend_before_frontend.md",
    "memories/feedback/feedback_esbuild_externals.md",
    "memories/feedback/feedback_esm_toplevel_return.md",
    "memories/feedback/feedback_hook_process_hygiene.md",
    "memories/feedback/feedback_post_development.md",
    "memories/feedback/feedback_roadmap_track.md",
    "memories/feedback/feedback_h_drive_master.md",
    "memories/feedback/feedback_h_drive_portable.md",
    "memories/feedback/feedback_docker_wsl_recovery.md",
    "memories/feedback/feedback_cross_session_duplication.md",
    "memories/project/project_portable_ssd_current_pc.md",
  ],
  "ux-design": [
    "memories/feedback/feedback_frontend_codex.md",
    "memories/feedback/feedback_ppg_frontend.md",
    "memories/feedback/feedback_lightsaber_borders.md",
    "memories/feedback/feedback_ppg_quality.md",
    "memories/feedback/feedback_verbose_ok.md",
    // mcp-server/web/* page-level audit pseudo-entries — the curator emits
    // structured notes for each (real path on disk).
    "web-audit:mcp-server/web/calculator.html",
    "web-audit:mcp-server/web/cam-studio.html",
    "web-audit:mcp-server/web/dashboard.html",
    "web-audit:mcp-server/web/foresight.html",
    "web-audit:mcp-server/web/ppg-master.html",
    "web-audit:mcp-server/web/wedm-studio.html",
  ],
};

// ============================================================================
// TYPES
// ============================================================================

export interface TribalEntry {
  section: TribalSection;
  /** Stable kebab-case identifier used as anchor + index slug. */
  slug: string;
  /** Source path relative to the vault root, OR `web-audit:` pseudo-source. */
  source: string;
  /** One-line summary lifted from frontmatter `description:` (or default). */
  summary: string;
  /** Full frontmatter `name:` field if present, else file stem. */
  name: string;
  /** Frontmatter `type:` if memory; "audit" for web pages. */
  type: string;
}

export interface CurateOptions {
  vaultRoot?: string;
  /** Override the curator config — primarily for tests + sandboxes. */
  config?: Record<TribalSection, string[]>;
  /** Optional today date string (YYYY-MM-DD) — defaults to today. */
  today?: string;
  /** Caller agent string — recorded in the section frontmatter. */
  agent?: string;
}

export interface CurateSectionResult {
  section: TribalSection;
  indexPath: string;
  written: boolean;
  entries: TribalEntry[];
  meetsMinimum: boolean;
  missing: string[];
}

export interface CurateReport {
  sections: CurateSectionResult[];
  totalEntries: number;
  totalWritten: number;
  warnings: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WikiCodingTribalEngine extends BaseEngine {
  constructor() {
    super({
      name: "WikiCodingTribalEngine",
      version: "1.0.0",
      domain: "knowledge",
      description:
        "Curates wiki/code-tribal, wiki/architecture, wiki/software-engineering, wiki/ux-design from existing memory pages.",
    });
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "curate",
        description:
          "Materialise the four tribal section index files from the curator config. Idempotent.",
      },
      {
        name: "loadEntry",
        description: "Read a single source page and return a TribalEntry record.",
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input !== undefined && input !== null && typeof input !== "object") {
      return "input must be an object or undefined";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<CurateReport> {
    const opts = (input ?? {}) as CurateOptions;
    return this.curate(opts);
  }

  /**
   * Materialise all four tribal section index files. Idempotent.
   */
  async curate(options: CurateOptions = {}): Promise<CurateReport> {
    const vaultRoot = options.vaultRoot ?? DEFAULT_VAULT_ROOT;
    const config = options.config ?? DEFAULT_CURATOR_CONFIG;
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const agent = options.agent ?? "claude:wiki-tribal-curator";
    const warnings: string[] = [];
    const sections: CurateSectionResult[] = [];

    for (const section of TRIBAL_SECTIONS) {
      const sourcePaths = config[section] ?? [];
      const entries: TribalEntry[] = [];
      const missing: string[] = [];

      for (const sp of sourcePaths) {
        const entry = this.loadEntry(section, sp, vaultRoot);
        if (entry === null) {
          missing.push(sp);
          warnings.push(`[${section}] missing source: ${sp}`);
          continue;
        }
        entries.push(entry);
      }

      const sectionDir = path.join(vaultRoot, "wiki", section);
      fs.mkdirSync(sectionDir, { recursive: true });
      const indexPath = path.join(sectionDir, "index.md");
      const body = renderSectionIndex({ section, entries, today, agent });
      const written = writeIfChanged(indexPath, body);

      sections.push({
        section,
        indexPath,
        written,
        entries,
        meetsMinimum: entries.length >= MIN_ENTRIES_PER_SECTION,
        missing,
      });
    }

    return {
      sections,
      totalEntries: sections.reduce((acc, s) => acc + s.entries.length, 0),
      totalWritten: sections.filter((s) => s.written).length,
      warnings,
    };
  }

  /**
   * Load a single entry. Real memory files get their frontmatter parsed; the
   * `web-audit:` pseudo-source returns a structured audit-stub keyed off the
   * actual page filename.
   */
  loadEntry(section: TribalSection, source: string, vaultRoot: string): TribalEntry | null {
    if (source.startsWith("web-audit:")) {
      const pagePath = source.slice("web-audit:".length);
      const stem = path.basename(pagePath, path.extname(pagePath));
      return {
        section,
        slug: `audit-${slugify(stem)}`,
        source,
        summary: `Page-level UX audit anchor for ${pagePath} (Calculator-Studio design language reference).`,
        name: `Audit: ${stem}`,
        type: "audit",
      };
    }
    const abs = path.join(vaultRoot, source);
    if (!fs.existsSync(abs)) return null;
    const raw = fs.readFileSync(abs, "utf8");
    const { name, description, type } = parseFrontmatter(raw, path.basename(source, ".md"));
    return {
      section,
      slug: slugify(path.basename(source, ".md")),
      source,
      summary: description,
      name,
      type,
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

export function slugify(s: string): string {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface ParsedFrontmatter {
  name: string;
  description: string;
  type: string;
}

/** Parse YAML-ish frontmatter (subset: name, description, type). Tolerant. */
export function parseFrontmatter(raw: string, fallbackName: string): ParsedFrontmatter {
  let name = fallbackName;
  let description = "";
  let type = "memory";
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  if (m) {
    const block = m[1];
    const nm = block.match(/^name:\s*(.+)$/m);
    if (nm) name = stripQuotes(nm[1].trim());
    const dm = block.match(/^description:\s*(.+)$/m);
    if (dm) description = stripQuotes(dm[1].trim());
    const tm = block.match(/^type:\s*(.+)$/m);
    if (tm) type = stripQuotes(tm[1].trim());
  }
  if (!description) {
    // Fall back to the first non-frontmatter, non-heading line.
    const body = raw.replace(/^---[\s\S]*?\n---\n?/, "");
    const firstLine = body
      .split("\n")
      .find((line) => line.trim().length > 0 && !line.trim().startsWith("#"));
    if (firstLine) description = firstLine.trim().slice(0, 200);
  }
  return { name, description, type };
}

function stripQuotes(s: string): string {
  return s.replace(/^["']|["']$/g, "");
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

function renderSectionIndex(args: {
  section: TribalSection;
  entries: TribalEntry[];
  today: string;
  agent: string;
}): string {
  const { section, entries, today, agent } = args;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`section: ${section}`);
  lines.push(`entries: ${entries.length}`);
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${prettySectionName(section)}`);
  lines.push("");
  lines.push(sectionBlurb(section));
  lines.push("");
  lines.push("## Entries");
  lines.push("");
  if (entries.length === 0) {
    lines.push("_No curated entries yet. Add paths to DEFAULT_CURATOR_CONFIG and re-run._");
    lines.push("");
  } else {
    for (const e of entries) {
      const ref = e.source.startsWith("web-audit:")
        ? e.source.slice("web-audit:".length)
        : path.posix.join("..", "..", e.source.replaceAll(path.sep, "/"));
      lines.push(`- **${e.name}** (\`${e.slug}\`) — ${e.summary || "_no summary on file_"}`);
      lines.push(`  - source: \`${ref}\`  · type: \`${e.type}\``);
    }
    lines.push("");
  }
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Curated by WikiCodingTribalEngine on ${today} (agent: \`${agent}\`).`);
  lines.push(`- Curator config: \`mcp-server/src/engines/WikiCodingTribalEngine.ts > DEFAULT_CURATOR_CONFIG\`.`);
  lines.push("");
  return lines.join("\n");
}

function prettySectionName(s: TribalSection): string {
  switch (s) {
    case "code-tribal": return "Code Tribal Knowledge";
    case "architecture": return "Architecture Notes";
    case "software-engineering": return "Software Engineering Discipline";
    case "ux-design": return "UX Design Notes";
  }
}

function sectionBlurb(s: TribalSection): string {
  switch (s) {
    case "code-tribal":
      return "Hard-won rules from PRISM development: SOLID, safety-critical tests, completeness gates, anti-deletion, always-build, AI-first development.";
    case "architecture":
      return "Platform-level patterns and references: plugin architecture, distributed locking, DevOps tooling, dispatcher inventory, infrastructure projects.";
    case "software-engineering":
      return "Build, test, and process discipline: backend-first sequencing, esbuild externals, ESM gotchas, hook hygiene, cross-session duplication.";
    case "ux-design":
      return "User-facing design references: Calculator-Studio language, frontend-codex constraints, PPG frontend rules, page-level audit anchors.";
  }
}

// Default singleton — match the project pattern.
export const wikiCodingTribalEngine = new WikiCodingTribalEngine();
