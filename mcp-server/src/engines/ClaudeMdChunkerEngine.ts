/**
 * ClaudeMdChunkerEngine — split CLAUDE.md (and ~/.claude/CLAUDE.md) into
 * per-section .md chunks under knowledge/claude-md/ for vector indexing.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U05.
 *
 * Why this exists
 * ---------------
 * CLAUDE.md is the single most-read file in PRISM (auto-loaded into every
 * session). It is also ~600 lines long, which makes targeted retrieval
 * inefficient: an Ollama call asking "what does CLAUDE.md say about
 * scrutiny?" has to read the whole file. Chunking by `##` section gives
 * us 60+ small files the skill router and consensus stack can fetch
 * individually, embed individually, and ground individually.
 *
 * Splitting strategy
 * ------------------
 * We split on top-level `##` headings (level 2) since the document uses
 * those as primary section markers. The text BEFORE the first `##` is
 * captured as a `_preamble` section so nothing is lost.
 *
 * Each chunk is written to `<vaultRoot>/<sourceTag>-<slug>.md` where
 *   sourceTag = "global" or "project" (caller-provided)
 *   slug      = lowercase-dashed first 80 chars of the heading text,
 *               with `_preamble` reserved for the pre-heading body
 *
 * Frontmatter matches the format already in main:
 *   source, section, slug, indexed_at, content_hash, mirror_engine
 *
 * Idempotency: a chunk is rewritten only when its content_hash drifts.
 *
 * Failure mode: every I/O wrapped — engine returns a structured
 * ChunkResult, never throws.
 *
 * @module engines/ClaudeMdChunkerEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const SCHEMA_VERSION = "1.0.0";
const FRONTMATTER_OPEN_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const CONTENT_HASH_RE = /^content_hash:\s*([a-f0-9]+)\s*$/im;
const SECTION_HEADING_RE = /^## (.+)$/gm;

export interface ChunkOpts {
  /** Path to a CLAUDE.md to chunk. */
  sourcePath: string;
  /** Tag for the source: "global" | "project" | other label. */
  sourceTag: string;
  /** Vault root. Default: H:/prism/knowledge/claude-md */
  vaultRoot?: string;
  /** When true, plan but do not write. */
  dryRun?: boolean;
  /** Optional embed callback per newly-written chunk. Best-effort. */
  embed?: (chunk: ChunkInfo, vaultPath: string, body: string) => Promise<void> | void;
}

export interface ChunkInfo {
  source: string;
  section: string;
  slug: string;
  body: string;
  startLine: number;
  endLine: number;
}

export interface ChunkResult {
  ok: boolean;
  sourcePath: string;
  sourceTag: string;
  vaultRoot: string;
  sectionsFound: number;
  filesWritten: number;
  filesSkipped: number;
  filesFailed: number;
  embedAttempts: number;
  embedSuccesses: number;
  errors: Array<{ section: string; error: string }>;
  durationMs: number;
}

const DEFAULT_VAULT_ROOT = process.env.PRISM_CLAUDE_MD_VAULT
  ?? "H:/prism/knowledge/claude-md";

export class ClaudeMdChunkerEngine {
  /**
   * Chunk one CLAUDE.md into per-section .md files. Idempotent on content
   * hash. Never throws — returns structured ChunkResult.
   */
  async chunk(opts: ChunkOpts): Promise<ChunkResult> {
    const start = Date.now();
    const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
    const dryRun = opts.dryRun === true;
    const result: ChunkResult = {
      ok: true,
      sourcePath: opts.sourcePath,
      sourceTag: opts.sourceTag,
      vaultRoot,
      sectionsFound: 0,
      filesWritten: 0,
      filesSkipped: 0,
      filesFailed: 0,
      embedAttempts: 0,
      embedSuccesses: 0,
      errors: [],
      durationMs: 0,
    };

    if (!fs.existsSync(opts.sourcePath)) {
      result.ok = false;
      result.errors.push({ section: "(file)", error: `source missing: ${opts.sourcePath}` });
      result.durationMs = Date.now() - start;
      return result;
    }

    const raw = fs.readFileSync(opts.sourcePath, "utf-8");
    const sections = this.splitSections(raw);
    result.sectionsFound = sections.length;

    if (sections.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    if (!dryRun) {
      try { fs.mkdirSync(vaultRoot, { recursive: true }); } catch { /* atomicWrite catches */ }
    }

    for (const section of sections) {
      try {
        const filename = `${opts.sourceTag}-${section.slug}.md`;
        const target = path.join(vaultRoot, filename);
        const hash = this.hashContent(section.body);

        if (fs.existsSync(target)) {
          const existing = fs.readFileSync(target, "utf-8");
          if (this.extractContentHash(existing) === hash) {
            result.filesSkipped++;
            continue;
          }
        }

        const body = this.renderChunk(section, opts.sourceTag, hash);

        if (dryRun) {
          result.filesWritten++;
          continue;
        }

        this.atomicWrite(target, body);
        result.filesWritten++;

        if (opts.embed) {
          result.embedAttempts++;
          try {
            const info: ChunkInfo = {
              source: opts.sourceTag,
              section: section.section,
              slug: section.slug,
              body: section.body,
              startLine: section.startLine,
              endLine: section.endLine,
            };
            await opts.embed(info, target, body);
            result.embedSuccesses++;
          } catch (e) {
            result.errors.push({ section: section.section, error: `embed: ${(e as Error).message ?? e}` });
          }
        }
      } catch (e) {
        result.filesFailed++;
        result.errors.push({ section: section.section, error: (e as Error).message ?? String(e) });
      }
    }

    result.ok = result.filesFailed === 0;
    result.durationMs = Date.now() - start;
    return result;
  }

  /**
   * Split a CLAUDE.md document into sections by `##` headings. Text
   * before the first `##` is captured as a `_preamble` section so the
   * top of the file (header, intro) is preserved.
   */
  splitSections(raw: string): Array<{ section: string; slug: string; body: string; startLine: number; endLine: number }> {
    const lines = raw.split(/\r?\n/);
    const sections: Array<{ section: string; slug: string; body: string; startLine: number; endLine: number }> = [];

    let currentSection: string | null = null;
    let currentStart = 0;
    let currentBody: string[] = [];

    const flush = (endLine: number) => {
      if (currentSection === null && currentBody.length === 0) return;
      const sectionLabel = currentSection ?? "_preamble";
      const slug = currentSection ? this.slugify(currentSection) : "preamble";
      const bodyText = currentBody.join("\n").replace(/\s+$/, "");
      if (bodyText.length > 0) {
        sections.push({
          section: sectionLabel,
          slug,
          body: bodyText,
          startLine: currentStart + 1,
          endLine,
        });
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const m = line.match(/^## (.+?)\s*$/);
      if (m) {
        // Flush previous section
        flush(i);
        currentSection = m[1].trim();
        currentStart = i;
        currentBody = [line];
      } else {
        currentBody.push(line);
      }
    }
    flush(lines.length);

    // Deduplicate slugs by appending -2, -3, ... when collisions occur
    const seen = new Map<string, number>();
    for (const s of sections) {
      const n = (seen.get(s.slug) ?? 0) + 1;
      seen.set(s.slug, n);
      if (n > 1) s.slug = `${s.slug}-${n}`;
    }

    return sections;
  }

  hashContent(s: string): string {
    const normalized = s.replace(/\r\n/g, "\n").replace(/\s+$/, "");
    return createHash("sha256").update(normalized, "utf-8").digest("hex");
  }

  extractContentHash(mirrored: string): string | null {
    const fm = mirrored.match(FRONTMATTER_OPEN_RE);
    if (!fm) return null;
    const m = fm[1].match(CONTENT_HASH_RE);
    return m ? m[1] : null;
  }

  slugify(s: string): string {
    const out = String(s ?? "")
      .toLowerCase()
      // Strip emoji + symbol prefixes commonly used in section headers
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    return out || "section";
  }

  // ---- private helpers ----

  private renderChunk(
    section: { section: string; slug: string; body: string; startLine: number; endLine: number },
    sourceTag: string,
    hash: string,
  ): string {
    const ts = new Date().toISOString();
    const fm = [
      "---",
      `schema_version: ${SCHEMA_VERSION}`,
      `source: ${this.escapeYaml(sourceTag)}`,
      `section: ${this.escapeYaml(section.section)}`,
      `slug: ${this.escapeYaml(section.slug)}`,
      `start_line: ${section.startLine}`,
      `end_line: ${section.endLine}`,
      `indexed_at: ${ts}`,
      `content_hash: ${hash}`,
      `mirror_engine: ClaudeMdChunkerEngine`,
      "---",
      "",
    ].join("\n");
    return fm + section.body + "\n";
  }

  private atomicWrite(target: string, content: string): void {
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, content, "utf-8");
    try { fs.renameSync(tmp, target); }
    catch {
      try { fs.unlinkSync(target); } catch { /* ignore */ }
      fs.renameSync(tmp, target);
    }
  }

  private escapeYaml(s: string): string {
    return String(s ?? "").replace(/[\r\n]/g, " ").replace(/"/g, "'");
  }
}

export const claudeMdChunkerEngine = new ClaudeMdChunkerEngine();
