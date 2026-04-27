// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; engine is consumed
// directly by wiki-bootstrap.mjs and (later) WikiIngestRouterEngine until then.
/**
 * WikiLogAppenderEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI02
 *
 * Appends grep-friendly entries to `H:/prism/knowledge/wiki/log.md` with
 * chat attribution. Format per WIKI_SCHEMA.md §4.2:
 *
 *   ## [YYYY-MM-DD] op | title | by:agent
 *   - detail line (optional, repeated)
 *   - detail line
 *
 * `grep '^## \[' log.md | tail -10` returns the 10 most recent operations,
 * which is the canonical recent-history query.
 *
 * Idempotency key: `(date, op, title, agent)` tuple. Re-appending the same
 * entry is a no-op (returns `{ appended: false, reason: "duplicate" }`),
 * which lets bootstrap and cron jobs run safely.
 *
 * Concurrency: every write acquires `wikiLock(log.md)`. Multiple chats can
 * call `append()` without truncating each other.
 */

import { promises as fs } from "node:fs";
import { join } from "node:path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { withWikiLock } from "../utils/wikiLock.js";

const DEFAULT_LOG_PATH = "H:/prism/knowledge/wiki/log.md";

const LOG_HEADER =
  "# PRISM Wiki Log\n\n" +
  "> Chronological audit trail. Grep with: `grep '^## \\[' log.md | tail -10`\n";

const HEADER_LINE_RE = /^##\s+\[(\d{4}-\d{2}-\d{2})\]\s+([^|]+?)\s+\|\s+(.+?)\s+\|\s+by:(.+?)\s*$/;
const TITLE_INVALID_CHAR_RE = /[\r\n]/;

export interface LogEntry {
  /** ISO date YYYY-MM-DD. Defaults to today's UTC date if omitted. */
  date?: string;
  /** Operation tag — short slug e.g. `bootstrap`, `ingest`, `lint`, `merge`. */
  op: string;
  /** Human-readable title. No newlines. */
  title: string;
  /** Caller identity. Format `claude-{8hex}` | `codex-{8hex}` | tool name. */
  agent: string;
  /** Optional bullet points appended below the header line. */
  details?: string[];
}

export interface AppendResult {
  appended: boolean;
  reason: "ok" | "duplicate";
  line: string;
}

export interface ParsedLogLine {
  date: string;
  op: string;
  title: string;
  agent: string;
  raw: string;
}

export interface ReadOptions {
  date?: string;
  agent?: string;
  op?: string;
  limit?: number;
}

export class WikiLogAppenderEngine extends BaseEngine {
  private readonly logPath: string;

  constructor(logPath: string = DEFAULT_LOG_PATH) {
    super({
      name: "WikiLogAppenderEngine",
      version: "1.0.0",
      domain: "knowledge-wiki",
      description: "Owner of wiki/log.md — append-only, grep-friendly, chat-attributed.",
    });
    this.logPath = logPath;
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "append", description: "Append a (date, op, title, agent) entry. Idempotent." },
      { name: "read", description: "Read log entries with optional date/agent/op filter." },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const e = input as Partial<LogEntry>;
    if (!e.op || typeof e.op !== "string" || e.op.trim().length === 0) return "op required";
    if (!e.title || typeof e.title !== "string" || e.title.trim().length === 0) return "title required";
    if (TITLE_INVALID_CHAR_RE.test(e.title)) return "title must not contain newlines";
    if (!e.agent || typeof e.agent !== "string" || e.agent.trim().length === 0) return "agent required";
    if (e.date && !/^\d{4}-\d{2}-\d{2}$/.test(e.date)) return "date must be YYYY-MM-DD";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<AppendResult> {
    return this.append(input as LogEntry);
  }

  /**
   * Append a log entry. Returns `appended:false, reason:"duplicate"` if the
   * exact (date, op, title, agent) tuple is already present anywhere in the
   * file — this prevents nightly cron jobs from spamming the log.
   */
  async append(entry: LogEntry): Promise<AppendResult> {
    const err = this.validate(entry);
    if (err) throw new Error(`WikiLogAppenderEngine.append: ${err}`);

    const date = entry.date ?? new Date().toISOString().slice(0, 10);
    const op = entry.op.trim();
    const title = entry.title.trim();
    const agent = entry.agent.trim();

    const headerLine = `## [${date}] ${op} | ${title} | by:${agent}`;
    const detailLines = (entry.details ?? [])
      .filter((d) => typeof d === "string" && d.trim().length > 0)
      .map((d) => `- ${d.replace(/[\r\n]+/g, " ").trim()}`);
    const block = [headerLine, ...detailLines, ""].join("\n");

    return withWikiLock(this.logPath, "WikiLogAppenderEngine", async () => {
      const existing = await this.readRaw();
      if (existing.includes(headerLine)) {
        return { appended: false, reason: "duplicate" as const, line: headerLine };
      }

      const seedHeader = existing.includes("# PRISM Wiki Log") ? "" : LOG_HEADER + "\n";
      const trimmed = existing.trimEnd();
      const next = (seedHeader + (trimmed.length > 0 ? trimmed + "\n\n" : "") + block).replace(/\n{3,}/g, "\n\n");
      await atomicWrite(this.logPath, next);
      return { appended: true, reason: "ok" as const, line: headerLine };
    });
  }

  /**
   * Read parsed log entries. Without options, returns every header line in
   * file order (oldest first). Filters apply AND-style. `limit` slices the
   * tail (most-recent-first when limited).
   */
  async read(opts: ReadOptions = {}): Promise<ParsedLogLine[]> {
    const raw = await this.readRaw();
    const out: ParsedLogLine[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const m = HEADER_LINE_RE.exec(line);
      if (!m) continue;
      const parsed: ParsedLogLine = {
        date: m[1],
        op: m[2].trim(),
        title: m[3].trim(),
        agent: m[4].trim(),
        raw: line,
      };
      if (opts.date && parsed.date !== opts.date) continue;
      if (opts.agent && parsed.agent !== opts.agent) continue;
      if (opts.op && parsed.op !== opts.op) continue;
      out.push(parsed);
    }
    if (typeof opts.limit === "number" && opts.limit >= 0) {
      return out.slice(-opts.limit);
    }
    return out;
  }

  private async readRaw(): Promise<string> {
    try {
      return await fs.readFile(this.logPath, "utf-8");
    } catch {
      return "";
    }
  }

  /** Path the engine is configured to write — useful for tests and tools. */
  getLogPath(): string {
    return this.logPath;
  }
}

/** Default singleton bound to the canonical log path. */
export const wikiLogAppenderEngine = new WikiLogAppenderEngine();

/** Re-exports for downstream wiring. */
export { join as _join_for_engine_path_helpers };
export const WIKI_LOG_PATH_DEFAULT = DEFAULT_LOG_PATH;
