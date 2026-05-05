/**
 * ObsidianMemorySyncEngine — mirror Claude's auto-memory directory into the
 * H-drive PRISM knowledge vault so memories survive PC switches and feed the
 * Qdrant vector index.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P1-U01.
 *
 * Why this exists
 * ---------------
 * Claude writes session memory to `~/.claude/projects/H--PRISM/memory/*.md` on
 * the local C: drive. That directory disappears the moment the user moves to a
 * different PC. The PRISM vault on H: is the canonical cross-PC + cross-chat
 * second brain — but until now nothing copied memory entries into it.
 *
 * This engine walks the source memory dir on every Stop, mirrors any new or
 * changed entries into `H:/prism/knowledge/memories/`, and stamps each mirror
 * with a content-hash so reruns are O(scan) not O(rewrite). A chronological
 * line is appended to the wiki log so the audit trail captures every sync.
 *
 * Idempotency: a mirror is only rewritten when the source's normalized SHA-256
 * differs from the hash baked into the mirror's frontmatter. This means hooks
 * can fire on every Stop without thrashing the disk or polluting Qdrant with
 * spurious upserts.
 *
 * Failure mode: every I/O is wrapped — the engine returns a structured error
 * list rather than throwing. Callers (the Stop hook) can ignore the result and
 * never block the shutdown path.
 *
 * @module engines/ObsidianMemorySyncEngine
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { createHash } from "node:crypto";

const SCHEMA_VERSION = "1.0.0";
const FRONTMATTER_OPEN_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const CONTENT_HASH_RE = /^content_hash:\s*([a-f0-9]+)\s*$/im;

const DEFAULT_SOURCE_DIR = path.join(
  os.homedir(),
  ".claude",
  "projects",
  "H--PRISM",
  "memory",
);
const DEFAULT_VAULT_ROOT = process.env.PRISM_MEMORY_VAULT_ROOT
  ?? "H:/prism/knowledge/memories";
const DEFAULT_WIKI_LOG = process.env.PRISM_WIKI_ROOT
  ? path.join(process.env.PRISM_WIKI_ROOT, "log.md")
  : "H:/prism/knowledge/wiki/log.md";

export interface SyncOpts {
  /** Source dir to mirror. Default: ~/.claude/projects/H--PRISM/memory */
  sourceDir?: string;
  /** Vault root to mirror into. Default: H:/prism/knowledge/memories */
  vaultRoot?: string;
  /** Optional Obsidian vault root to mirror into as a second copy. */
  obsidianVaultRoot?: string | null;
  /** Wiki log path for chronological audit. Default: H:/prism/knowledge/wiki/log.md */
  wikiLogPath?: string;
  /** When true, compute mirror plan but write nothing. */
  dryRun?: boolean;
  /** Tag attached to the wiki-log line (default "memory_sync"). */
  logTag?: string;
}

export interface SyncResult {
  ok: boolean;
  filesScanned: number;
  filesMirrored: number;
  /** Files whose content_hash matched the existing mirror — no rewrite. */
  filesSkipped: number;
  filesFailed: number;
  errors: Array<{ src: string; error: string }>;
  vaultRoot: string;
  obsidianMirrored: number;
  durationMs: number;
}

export class ObsidianMemorySyncEngine {
  /**
   * Walk the source dir, mirror each .md file into the vault if its content
   * hash differs from the cached mirror, and append a one-line audit to the
   * wiki log. Never throws — callers get a structured SyncResult.
   */
  sync(opts: SyncOpts = {}): SyncResult {
    const start = Date.now();
    const sourceDir = opts.sourceDir ?? DEFAULT_SOURCE_DIR;
    const vaultRoot = opts.vaultRoot ?? DEFAULT_VAULT_ROOT;
    const obsidianVaultRoot = opts.obsidianVaultRoot === undefined
      ? (process.env.OBSIDIAN_VAULT_PATH ?? null)
      : opts.obsidianVaultRoot;
    const wikiLogPath = opts.wikiLogPath ?? DEFAULT_WIKI_LOG;
    const dryRun = opts.dryRun === true;
    const logTag = opts.logTag ?? "memory_sync";

    const result: SyncResult = {
      ok: true,
      filesScanned: 0,
      filesMirrored: 0,
      filesSkipped: 0,
      filesFailed: 0,
      errors: [],
      vaultRoot,
      obsidianMirrored: 0,
      durationMs: 0,
    };

    const sources = this.listMarkdown(sourceDir);
    result.filesScanned = sources.length;

    if (sources.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    if (!dryRun) {
      try { fs.mkdirSync(vaultRoot, { recursive: true }); } catch { /* fall through; mirrorOne will catch */ }
    }

    for (const src of sources) {
      try {
        const outcome = this.mirrorOne(src, sourceDir, vaultRoot, dryRun);
        if (outcome.mirrored) result.filesMirrored++;
        else if (outcome.skipped) result.filesSkipped++;

        if (outcome.mirrored && obsidianVaultRoot && !dryRun) {
          try {
            const rel = path.relative(sourceDir, src).replace(/\\/g, "/");
            const obPath = path.join(obsidianVaultRoot, "PRISM", "memories", rel);
            const vaultPath = path.join(vaultRoot, rel);
            if (fs.existsSync(vaultPath)) {
              const body = fs.readFileSync(vaultPath, "utf-8");
              this.atomicWrite(obPath, body);
              result.obsidianMirrored++;
            }
          } catch {
            // Obsidian mirror is best-effort; failures never break the canonical sync.
          }
        }
      } catch (e) {
        result.filesFailed++;
        result.errors.push({ src, error: (e as Error).message ?? String(e) });
      }
    }

    if (!dryRun && (result.filesMirrored > 0 || result.filesScanned > 0)) {
      this.appendLog(wikiLogPath, logTag, result);
    }

    result.ok = result.filesFailed === 0;
    result.durationMs = Date.now() - start;
    return result;
  }

  /**
   * Mirror a single source file into the vault. Idempotent on content_hash:
   * a mirror that already exists with the same hash is left alone.
   */
  mirrorOne(
    srcPath: string,
    sourceDir: string,
    vaultRoot: string,
    dryRun = false,
  ): { mirrored: boolean; skipped: boolean; reason?: string } {
    if (!fs.existsSync(srcPath)) {
      return { mirrored: false, skipped: false, reason: "source missing" };
    }
    const sourceContent = fs.readFileSync(srcPath, "utf-8");
    const hash = this.hashContent(sourceContent);
    const rel = path.relative(sourceDir, srcPath).replace(/\\/g, "/");
    const target = path.join(vaultRoot, rel);

    if (fs.existsSync(target)) {
      const existing = fs.readFileSync(target, "utf-8");
      const existingHash = this.extractContentHash(existing);
      if (existingHash === hash) {
        return { mirrored: false, skipped: true, reason: "hash match" };
      }
    }

    if (dryRun) {
      return { mirrored: true, skipped: false, reason: "dry-run" };
    }

    const wrapped = this.renderMirror(srcPath, sourceContent, hash);
    this.atomicWrite(target, wrapped);
    return { mirrored: true, skipped: false };
  }

  /** Stable SHA-256 of the source body (whitespace-normalized). */
  hashContent(content: string): string {
    const normalized = content.replace(/\r\n/g, "\n").trim();
    return createHash("sha256").update(normalized, "utf-8").digest("hex");
  }

  /** Pull `content_hash` from a mirrored file's frontmatter, if present. */
  extractContentHash(mirrored: string): string | null {
    const fm = mirrored.match(FRONTMATTER_OPEN_RE);
    if (!fm) return null;
    const m = fm[1].match(CONTENT_HASH_RE);
    return m ? m[1] : null;
  }

  /** List all .md files under a directory, recursive. */
  listMarkdown(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const out: string[] = [];
    const stack: string[] = [dir];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(cur, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        const full = path.join(cur, e.name);
        if (e.isDirectory()) stack.push(full);
        else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
      }
    }
    out.sort();
    return out;
  }

  // ---- private helpers ----

  private renderMirror(srcPath: string, sourceContent: string, hash: string): string {
    const ts = new Date().toISOString();
    const sourceFilename = path.basename(srcPath);
    const fm = [
      "---",
      `schema_version: ${SCHEMA_VERSION}`,
      `kind: mirrored_memory`,
      `source_path: ${this.escapeYaml(srcPath.replace(/\\/g, "/"))}`,
      `source_filename: ${this.escapeYaml(sourceFilename)}`,
      `content_hash: ${hash}`,
      `mirror_ts: ${ts}`,
      `mirror_engine: ObsidianMemorySyncEngine`,
      "---",
      "",
    ].join("\n");
    // Strip any pre-existing leading frontmatter from the source so we don't
    // end up with two stacked YAML blocks. Source memory files often lead
    // with their own frontmatter — keep its body as plain markdown below ours.
    const stripped = sourceContent.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    return fm + stripped;
  }

  private appendLog(logPath: string, tag: string, result: SyncResult): void {
    try {
      const dir = path.dirname(logPath);
      fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(logPath)) {
        this.atomicWrite(
          logPath,
          "# PRISM Wiki Log\n\n> Chronological audit trail. Grep with: `grep '^## \\[' log.md | tail -10`\n\n",
        );
      }
      const ts = new Date().toISOString().slice(0, 10);
      const line = `## [${ts}] ${tag} | scanned:${result.filesScanned} mirrored:${result.filesMirrored} skipped:${result.filesSkipped} failed:${result.filesFailed} | by:${process.env.CLAUDE_SESSION_ID ?? "unknown"}\n`;
      const cur = fs.readFileSync(logPath, "utf-8");
      this.atomicWrite(logPath, cur + line);
    } catch {
      // Log is best-effort.
    }
  }

  private atomicWrite(target: string, content: string): void {
    const dir = path.dirname(target);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, content, "utf-8");
    try {
      fs.renameSync(tmp, target);
    } catch {
      try { fs.unlinkSync(target); } catch { /* ignore */ }
      fs.renameSync(tmp, target);
    }
  }

  private escapeYaml(s: string): string {
    return s.replace(/[\r\n]/g, " ").replace(/"/g, "'");
  }
}

export const obsidianMemorySyncEngine = new ObsidianMemorySyncEngine();
