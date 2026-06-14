// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine consumed by
// /wiki-lint command (U-WIKI06) and the U-WIKI08 nightly cron until then.
/**
 * WikiLintEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI03
 *
 * Safety-aware health check for `H:/prism/knowledge/wiki/`. Four detector
 * categories (the WIKI_SCHEMA §3.3 set minus the deferred NLI + missing-
 * concepts checks, which are routed through Ollama in U-WIKI04):
 *
 *   1. orphan        — pages with zero inbound `[[wikilinks]]`
 *   2. broken-ref    — `[[wikilink]]` pointing to a non-existent page
 *   3. stale-claim   — page mtime older than the youngest source mtime
 *   4. physics-drift — numeric kc1.1 / Taylor C / Taylor n on the page
 *                       disagrees with `src/physics/constants.ts` by ≥2%
 *
 * Severity (per WIKI_SCHEMA §3.3):
 *   |drift| < 2%             → not flagged
 *   |drift| ∈ [2%,  5%)      → MINOR
 *   |drift| ∈ [5%, 10%)      → MAJOR
 *   |drift| ≥ 10%            → CRITICAL
 *   missing target / orphan  → BROKEN
 *   stale mtime              → MAJOR
 *
 * Output: `lint-reports/YYYY-MM-DD.md` with severity-prefixed bullets.
 *
 * REAL physics imports — never reads constants.ts as text. Drift detection
 * pulls the canonical values directly so a refactor of constants.ts cannot
 * silently invalidate the lint thresholds.
 */

import { promises as fs } from "node:fs";
import { join, dirname, basename, relative } from "node:path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";

const DEFAULT_VAULT = "H:/prism/knowledge/wiki";
const DEFAULT_REPORTS = "H:/prism/knowledge/lint-reports";
const REPO_ROOT = "H:/prism";

const DRIFT_MINOR_THRESHOLD = 0.02;   // 2%
const DRIFT_MAJOR_THRESHOLD = 0.05;   // 5%
const DRIFT_CRITICAL_THRESHOLD = 0.10; // 10%

const ISO_GROUPS: ISOGroup[] = ["P", "M", "K", "N", "S", "H"];

// Capture group 1 = the link TARGET. The optional non-capturing `(?:\|[^\]]*?)?`
// consumes an Obsidian display alias `[[target|alias]]` so the target still
// resolves. Without it the old regex demanded `]]` immediately after the
// target and FAILED to match aliased links entirely — silently dropping every
// `[[target|alias]]` backlink, which inflated orphan counts and corrupted the
// wikilink-graph PageRank recall.
const WIKILINK_RE = /\[\[([^\]|]+?)(?:\|[^\]]*?)?\]\]/g;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const PAGE_FILE_RE = /\.md$/i;

export type LintSeverity = "MINOR" | "MAJOR" | "CRITICAL" | "BROKEN";
export type LintCategory = "orphan" | "broken-ref" | "stale-claim" | "physics-drift";

export interface LintFinding {
  severity: LintSeverity;
  category: LintCategory;
  page: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface LintReport {
  date: string;
  vault: string;
  pagesScanned: number;
  findings: LintFinding[];
  reportPath?: string;
}

interface ParsedPage {
  /** absolute filesystem path */
  path: string;
  /** page slug = filename without `.md` */
  slug: string;
  /** category dir under vault, e.g. `concepts` */
  category: string;
  /** raw frontmatter block (without --- delimiters) */
  frontmatter: string;
  /** sources field parsed from frontmatter, [] if missing */
  sources: string[];
  /** wikilink targets found in body */
  outboundLinks: string[];
  /** mtime ms */
  mtimeMs: number;
  /** body text (without frontmatter) — used by drift detector */
  body: string;
}

export class WikiLintEngine extends BaseEngine {
  private readonly vault: string;
  private readonly reportsDir: string;

  constructor(vault: string = DEFAULT_VAULT, reportsDir: string = DEFAULT_REPORTS) {
    super({
      name: "WikiLintEngine",
      version: "1.0.0",
      domain: "knowledge-wiki",
      description:
        "Safety-aware lint for the wiki vault. Detects orphans, broken cross-refs, stale claims, and physics-constant drift.",
    });
    this.vault = vault;
    this.reportsDir = reportsDir;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "lint", description: "Run all 4 detectors, return findings + write report." },
      { name: "detectOrphans", description: "Pages with 0 inbound [[wikilinks]]." },
      { name: "detectBrokenRefs", description: "[[wikilink]] targets that don't resolve." },
      { name: "detectStaleClaims", description: "Page mtime older than youngest source mtime." },
      { name: "detectPhysicsDrift", description: "kc1.1 / Taylor C / n disagrees with canonical by ≥2%." },
    ];
  }

  validate(input: unknown): string | null {
    if (input !== undefined && input !== null && typeof input !== "object") {
      return "input, when provided, must be an object";
    }
    return null;
  }

  protected async executeImpl(): Promise<LintReport> {
    return this.lint();
  }

  async lint(opts: { writeReport?: boolean } = { writeReport: true }): Promise<LintReport> {
    const pages = await this.collectPages();
    const findings: LintFinding[] = [];

    findings.push(...this.detectOrphans(pages));
    findings.push(...this.detectBrokenRefs(pages));
    findings.push(...(await this.detectStaleClaims(pages)));
    findings.push(...this.detectPhysicsDrift(pages));

    findings.sort(severityOrder);

    const date = new Date().toISOString().slice(0, 10);
    const report: LintReport = {
      date,
      vault: this.vault,
      pagesScanned: pages.length,
      findings,
    };

    if (opts.writeReport !== false) {
      report.reportPath = await this.writeReport(report);
    }
    return report;
  }

  // ─── Detectors ────────────────────────────────────────────────────────

  detectOrphans(pages: ParsedPage[]): LintFinding[] {
    const inbound = new Map<string, number>();
    for (const p of pages) inbound.set(p.slug, 0);
    for (const p of pages) {
      for (const target of p.outboundLinks) {
        const norm = stripExt(target);
        if (norm === p.slug) continue; // self-references don't count
        if (inbound.has(norm)) inbound.set(norm, (inbound.get(norm) ?? 0) + 1);
      }
    }
    const out: LintFinding[] = [];
    for (const p of pages) {
      if ((inbound.get(p.slug) ?? 0) === 0) {
        out.push({
          severity: "BROKEN",
          category: "orphan",
          page: p.slug,
          message: `Page \`${p.slug}\` has 0 inbound wikilinks — orphaned.`,
          details: { category: p.category, path: relative(REPO_ROOT, p.path) },
        });
      }
    }
    return out;
  }

  detectBrokenRefs(pages: ParsedPage[]): LintFinding[] {
    const known = new Set(pages.map((p) => p.slug));
    const out: LintFinding[] = [];
    for (const p of pages) {
      for (const target of p.outboundLinks) {
        const norm = stripExt(target);
        if (!known.has(norm)) {
          out.push({
            severity: "BROKEN",
            category: "broken-ref",
            page: p.slug,
            message: `Wikilink \`[[${target}]]\` on page \`${p.slug}\` does not resolve to a known page.`,
            details: { target: norm },
          });
        }
      }
    }
    return out;
  }

  async detectStaleClaims(pages: ParsedPage[]): Promise<LintFinding[]> {
    const out: LintFinding[] = [];
    for (const p of pages) {
      let youngestSourceMtime = 0;
      for (const src of p.sources) {
        // resolve relative to repo root
        const abs = src.startsWith("formula:") ? null : join(REPO_ROOT, src);
        if (!abs) continue;
        try {
          const stat = await fs.stat(abs);
          if (stat.mtimeMs > youngestSourceMtime) youngestSourceMtime = stat.mtimeMs;
        } catch {
          // missing source is a separate concern (the page asserts a path
          // that doesn't exist); flag as MAJOR
          out.push({
            severity: "MAJOR",
            category: "stale-claim",
            page: p.slug,
            message: `Source \`${src}\` referenced by page \`${p.slug}\` does not exist on disk.`,
            details: { source: src },
          });
        }
      }
      if (youngestSourceMtime > 0 && p.mtimeMs < youngestSourceMtime) {
        const ageHours = Math.round((youngestSourceMtime - p.mtimeMs) / 3_600_000);
        out.push({
          severity: "MAJOR",
          category: "stale-claim",
          page: p.slug,
          message: `Page \`${p.slug}\` is older than its youngest source by ~${ageHours}h — re-verify.`,
          details: {
            page_mtime: new Date(p.mtimeMs).toISOString(),
            source_mtime: new Date(youngestSourceMtime).toISOString(),
          },
        });
      }
    }
    return out;
  }

  detectPhysicsDrift(pages: ParsedPage[]): LintFinding[] {
    const out: LintFinding[] = [];
    for (const p of pages) {
      // Skip pages that don't claim physics-constant content.
      const text = p.body.toLowerCase();
      const mentionsKienzle = /kc[\s_-]*1[._]1|kienzle/.test(text);
      const mentionsTaylor = /taylor[\s_-]*(c|n)\b|taylor.*tool[\s_-]*life/.test(text);
      if (!mentionsKienzle && !mentionsTaylor) continue;

      // Detect "X = NUMBER" or "ISO_GROUP: NUMBER" style claims and compare.
      for (const group of ISO_GROUPS) {
        if (mentionsKienzle) {
          const claimed = extractClaimedValue(p.body, "kc1.1", group);
          if (claimed !== null) {
            const canonical = CANONICAL_KIENZLE[group].kc1_1;
            const finding = scoreAndBuildDriftFinding(
              p,
              "kc1.1",
              group,
              canonical,
              claimed,
              "N/mm²"
            );
            if (finding) out.push(finding);
          }
        }
        if (mentionsTaylor) {
          const claimedC = extractClaimedValue(p.body, "Taylor C", group);
          if (claimedC !== null) {
            const canonical = CANONICAL_TAYLOR[group].C;
            const finding = scoreAndBuildDriftFinding(
              p,
              "Taylor C",
              group,
              canonical,
              claimedC,
              "m/min"
            );
            if (finding) out.push(finding);
          }
          const claimedN = extractClaimedValue(p.body, "Taylor n", group);
          if (claimedN !== null) {
            const canonical = CANONICAL_TAYLOR[group].n;
            const finding = scoreAndBuildDriftFinding(
              p,
              "Taylor n",
              group,
              canonical,
              claimedN,
              ""
            );
            if (finding) out.push(finding);
          }
        }
      }
    }
    return out;
  }

  // ─── Report writer ────────────────────────────────────────────────────

  async writeReport(report: LintReport): Promise<string> {
    await fs.mkdir(this.reportsDir, { recursive: true });
    const path = join(this.reportsDir, `${report.date}.md`);
    const md = formatReport(report);
    await atomicWrite(path, md);
    return path;
  }

  // ─── Internals ────────────────────────────────────────────────────────

  private async collectPages(): Promise<ParsedPage[]> {
    let entries: string[] = [];
    try {
      entries = await fs.readdir(this.vault, { recursive: true } as { recursive: true });
    } catch {
      return [];
    }
    const out: ParsedPage[] = [];
    for (const rel of entries) {
      const relStr = String(rel);
      if (!PAGE_FILE_RE.test(relStr)) continue;
      if (basename(relStr).startsWith(".")) continue;
      // Skip top-level index.md and log.md — those are catalog/log, not pages.
      if (relStr === "index.md" || relStr === "log.md") continue;
      const abs = join(this.vault, relStr);
      let raw: string;
      let mtimeMs: number;
      try {
        const stat = await fs.stat(abs);
        if (!stat.isFile()) continue;
        mtimeMs = stat.mtimeMs;
        raw = await fs.readFile(abs, "utf-8");
      } catch {
        continue;
      }
      const slug = basename(relStr, ".md");
      const category = (dirname(relStr).replace(/\\/g, "/").split("/").pop() ?? "concepts") || "concepts";
      const fmMatch = FRONTMATTER_RE.exec(raw);
      const frontmatter = fmMatch ? fmMatch[1] : "";
      const body = fmMatch ? raw.slice(fmMatch[0].length) : raw;
      const sources = parseSourcesField(frontmatter);
      const outboundLinks = extractWikilinks(body);
      out.push({ path: abs, slug, category, frontmatter, sources, outboundLinks, mtimeMs, body });
    }
    return out;
  }

  getVault(): string {
    return this.vault;
  }

  getReportsDir(): string {
    return this.reportsDir;
  }
}

// ─── Helpers (exported for unit tests) ───────────────────────────────

export function scoreDrift(canonical: number, observed: number): { pct: number; severity: LintSeverity | null } {
  if (canonical === 0 || !Number.isFinite(canonical) || !Number.isFinite(observed)) {
    return { pct: 0, severity: null };
  }
  const pct = Math.abs(observed - canonical) / Math.abs(canonical);
  if (pct < DRIFT_MINOR_THRESHOLD) return { pct, severity: null };
  if (pct < DRIFT_MAJOR_THRESHOLD) return { pct, severity: "MINOR" };
  if (pct < DRIFT_CRITICAL_THRESHOLD) return { pct, severity: "MAJOR" };
  return { pct, severity: "CRITICAL" };
}

function scoreAndBuildDriftFinding(
  page: ParsedPage,
  field: string,
  group: ISOGroup,
  canonical: number,
  claimed: number,
  unit: string
): LintFinding | null {
  const { pct, severity } = scoreDrift(canonical, claimed);
  if (!severity) return null;
  const pctStr = (pct * 100).toFixed(2);
  return {
    severity,
    category: "physics-drift",
    page: page.slug,
    message:
      `Page \`${page.slug}\` claims ${field}[${group}] = ${claimed}${unit ? " " + unit : ""} ` +
      `but canonical is ${canonical}${unit ? " " + unit : ""} (${pctStr}% drift).`,
    details: { field, group, canonical, claimed, drift_pct: pct },
  };
}

export function extractWikilinks(text: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  WIKILINK_RE.lastIndex = 0;
  while ((m = WIKILINK_RE.exec(text)) !== null) {
    out.push(m[1].trim());
  }
  return out;
}

function stripExt(slug: string): string {
  return slug.replace(/\.md$/i, "").trim();
}

function parseSourcesField(frontmatter: string): string[] {
  const m = /^sources:\s*\[([^\]]*)\]/m.exec(frontmatter);
  if (!m) return [];
  return m[1]
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter((s) => s.length > 0);
}

/**
 * Look for a numeric assignment to `field` for the given ISO group near the
 * group's letter. Matches patterns like:
 *   kc1.1 P = 1840
 *   kc1.1[P] = 1840
 *   P: kc1.1 = 1840
 *   Taylor C P = 360
 * The first numeric token after the group letter (or after `field=`) wins.
 */
export function extractClaimedValue(body: string, field: string, group: ISOGroup): number | null {
  // Build a forgiving regex per known field so tests can target precise patterns.
  const fieldEsc = field.replace(/[.\\+*?^$|()[\]{}]/g, (ch) => `\\${ch}`);
  const groupEsc = `\\b${group}\\b`;

  const patterns = [
    new RegExp(`${fieldEsc}\\s*${groupEsc}\\s*[=:]\\s*([0-9]+\\.?[0-9]*)`, "i"),
    new RegExp(`${fieldEsc}\\s*\\[${groupEsc}\\]\\s*[=:]\\s*([0-9]+\\.?[0-9]*)`, "i"),
    new RegExp(`${groupEsc}\\s*[:|]\\s*${fieldEsc}\\s*=\\s*([0-9]+\\.?[0-9]*)`, "i"),
    new RegExp(`${groupEsc}\\s*${fieldEsc}\\s*=\\s*([0-9]+\\.?[0-9]*)`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(body);
    if (m) {
      const v = parseFloat(m[1]);
      if (Number.isFinite(v)) return v;
    }
  }
  return null;
}

const SEV_ORDER: Record<LintSeverity, number> = { CRITICAL: 0, BROKEN: 1, MAJOR: 2, MINOR: 3 };

function severityOrder(a: LintFinding, b: LintFinding): number {
  const sa = SEV_ORDER[a.severity];
  const sb = SEV_ORDER[b.severity];
  if (sa !== sb) return sa - sb;
  if (a.category !== b.category) return a.category.localeCompare(b.category);
  return a.page.localeCompare(b.page);
}

export function formatReport(report: LintReport): string {
  const lines: string[] = [];
  lines.push(`# Wiki Lint Report — ${report.date}`);
  lines.push("");
  lines.push(`Vault: \`${report.vault}\``);
  lines.push(`Pages scanned: **${report.pagesScanned}**`);
  lines.push(`Findings: **${report.findings.length}**`);
  lines.push("");
  if (report.findings.length === 0) {
    lines.push("_Vault is clean — no findings._");
    return lines.join("\n") + "\n";
  }
  for (const f of report.findings) {
    lines.push(`- [${f.severity}] (${f.category}) ${f.message}`);
  }
  lines.push("");
  return lines.join("\n");
}

export const wikiLintEngine = new WikiLintEngine();
export const WIKI_LINT_VAULT_DEFAULT = DEFAULT_VAULT;
export const WIKI_LINT_REPORTS_DEFAULT = DEFAULT_REPORTS;
export const DRIFT_THRESHOLDS = {
  MINOR: DRIFT_MINOR_THRESHOLD,
  MAJOR: DRIFT_MAJOR_THRESHOLD,
  CRITICAL: DRIFT_CRITICAL_THRESHOLD,
};
