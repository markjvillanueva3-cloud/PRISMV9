/**
 * ConnectionMaterializerEngine
 * ============================
 *
 * OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST
 *
 * Persists each cosine-similarity connection from DailyPersonalBriefEngine
 * (or a caller-supplied list) as a STANDALONE markdown note in
 * `knowledge/memories/connections/` so the connection compounds rather
 * than evaporating with that day's brief.
 *
 * cyrilXBT JARVIS framing (the article line that motivated this):
 *   "A note here should reference at least two source notes and say
 *    something neither of them says alone."
 *
 * Idempotency
 * -----------
 * Each connection keys on the alphabetical (a, b) pair of source-note
 * basenames. The output filename is `connection-<basenameA>--<basenameB>.md`,
 * which means re-running on the same pair finds the existing file and
 * either skips (`mode: "skip"`, default) or refreshes the body in
 * `mode: "update"`. Pre-existing connection notes the human authored
 * are preserved when they lack the `_materializedAt` marker we write.
 *
 * Determinism
 * -----------
 * The engine never calls cosine-similarity itself — it consumes the
 * `DailyBriefConnection[]` shape produced upstream. Pure-calc, byte-stable
 * given identical inputs.
 *
 * @milestone OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from "node:fs";
import { join, resolve, basename } from "node:path";

/**
 * Subset of DailyBriefConnection that we depend on. Imported by name so
 * we don't form a hard dependency edge (engines must not require each
 * other at module load time per ENGINE_DIGEST conventions).
 */
export interface ConnectionInput {
  a: string;            // absolute path of note A
  b: string;            // absolute path of note B
  similarity: number;   // raw cosine similarity (0..1)
  boost: number;        // co-occurrence boost (e.g. +0.05)
  combined: number;     // similarity + boost (clamped 0..1)
  recency: string;      // ISO8601 timestamp of newer note
}

export interface MaterializeOptions {
  /** Override knowledge/memories/connections directory. */
  connectionsDir?: string;
  /** "skip" (default) or "update" if file already exists. */
  mode?: "skip" | "update";
  /** When true, write files to disk. Default false (dry-run). */
  apply?: boolean;
  /** Override "now" for deterministic tests. */
  now?: number;
}

export type ConnectionAction =
  | "wrote"
  | "would-write"
  | "skipped-exists"
  | "updated"
  | "errored";

export interface ConnectionResult {
  connection: ConnectionInput;
  filePath: string;
  action: ConnectionAction;
  reason?: string;
}

export interface MaterializeReport {
  apply: boolean;
  generatedAtIso: string;
  counters: {
    input: number;
    wrote: number;
    skipped_exists: number;
    updated: number;
    errored: number;
  };
  results: ConnectionResult[];
}

const DEFAULT_CONNECTIONS_DIR = "H:/prism/knowledge/memories/connections";
const MARKER_KEY = "_materializedAt";
const SLUG_MAX = 80;

function noteBase(absPath: string): string {
  return basename(absPath, ".md");
}

function safeSlug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, SLUG_MAX);
}

function pairFilename(c: ConnectionInput): string {
  // Canonical alphabetical pair → stable key across reruns.
  const ba = noteBase(c.a);
  const bb = noteBase(c.b);
  const [lo, hi] = ba <= bb ? [ba, bb] : [bb, ba];
  return `connection-${safeSlug(lo)}--${safeSlug(hi)}.md`;
}

function atomicWrite(filePath: string, content: string): void {
  const tmp = `${filePath}.conn.tmp`;
  writeFileSync(tmp, content, "utf8");
  try { renameSync(tmp, filePath); }
  catch (err) {
    try { unlinkSync(tmp); } catch { /* ignore */ }
    throw err;
  }
}

function hasOurMarker(filePath: string): boolean {
  try {
    const raw = readFileSync(filePath, "utf8");
    return new RegExp(`^${MARKER_KEY}\\s*:`, "m").test(raw);
  } catch { return false; }
}

function renderConnectionMd(c: ConnectionInput, generatedAtIso: string): string {
  const ba = noteBase(c.a);
  const bb = noteBase(c.b);
  const [lo, hi] = ba <= bb ? [ba, bb] : [bb, ba];
  const fm = [
    "---",
    "type: connection",
    `pair_lo: ${JSON.stringify(lo)}`,
    `pair_hi: ${JSON.stringify(hi)}`,
    `source_a: ${JSON.stringify(c.a.replace(/\\/g, "/"))}`,
    `source_b: ${JSON.stringify(c.b.replace(/\\/g, "/"))}`,
    `similarity: ${c.similarity}`,
    `boost: ${c.boost}`,
    `combined: ${c.combined}`,
    `recency: ${c.recency}`,
    `${MARKER_KEY}: ${generatedAtIso}`,
    "epistemic_only: true",
    "consumed_by_machining: false",
    "milestone: OBSIDIAN-CONTENT-MS2/U-CONNECTIONS-PERSIST",
    "---",
    "",
  ].join("\n");

  let body = `# Connection: ${lo} ↔ ${hi}\n\n`;
  body += `_Auto-materialized on ${generatedAtIso} from a cosine-similarity match. The vault talks back; this is a connection it heard between two notes you wrote separately._\n\n`;
  body += `## Source Notes\n\n`;
  body += `- [[${lo}]] — \`${c.a.replace(/\\/g, "/")}\`\n`;
  body += `- [[${hi}]] — \`${c.b.replace(/\\/g, "/")}\`\n\n`;
  body += `## Similarity Signal\n\n`;
  body += `- Raw cosine: **${c.similarity.toFixed(4)}**\n`;
  body += `- Co-occurrence boost: **+${c.boost.toFixed(4)}**\n`;
  body += `- Combined score: **${c.combined.toFixed(4)}**\n`;
  body += `- Newer-note timestamp: \`${c.recency}\`\n\n`;
  body += `## What's the Insight?\n\n`;
  body += `_To be filled in by the human reader. The engine surfaced the pair; the synthesis is your job. cyrilXBT JARVIS rule: "say something neither source note says alone."_\n\n`;
  body += `Candidate framings:\n`;
  body += `1. **Same underlying principle** — what abstraction sits above both notes?\n`;
  body += `2. **Productive contradiction** — do they disagree? If so, which one is wrong, or are they both half-right?\n`;
  body += `3. **Pattern across domains** — if the link survives, name it once and link future notes here.\n`;
  body += `4. **Unexpected answer** — does one note resolve a question raised by the other?\n\n`;
  body += `## Promotion Path\n\n`;
  body += `When this connection has earned its keep (cited in 2+ briefs, 1+ published piece, or 30+ days surviving review), promote to:\n`;
  body += `- \`knowledge/wiki/concepts/<name>.md\` if it's a stable abstraction\n`;
  body += `- \`knowledge/wiki/lessons/<name>.md\` if it captures a failure mode\n`;
  body += `- \`knowledge/memories/reference/<name>.md\` if it consolidates working knowledge\n`;
  return fm + body;
}

export class ConnectionMaterializerEngine {
  readonly name = "ConnectionMaterializerEngine";

  /**
   * Materialize a list of connections to disk (or dry-run).
   *
   * @param connections  list from DailyPersonalBriefEngine (or caller-supplied)
   * @param opts         output dir + apply + mode + now
   */
  materialize(connections: ConnectionInput[], opts: MaterializeOptions = {}): MaterializeReport {
    const connectionsDir = resolve(opts.connectionsDir ?? DEFAULT_CONNECTIONS_DIR);
    const apply = !!opts.apply;
    const mode = opts.mode ?? "skip";
    const now = opts.now ?? Date.now();
    const generatedAtIso = new Date(now).toISOString();

    const counters = { input: connections.length, wrote: 0, skipped_exists: 0, updated: 0, errored: 0 };
    const results: ConnectionResult[] = [];

    if (apply && !existsSync(connectionsDir)) {
      try { mkdirSync(connectionsDir, { recursive: true }); }
      catch (err) {
        // If we can't create the dir, every write will fail — surface the error per-connection.
        for (const c of connections) {
          counters.errored++;
          results.push({
            connection: c,
            filePath: join(connectionsDir, pairFilename(c)),
            action: "errored",
            reason: `mkdir failed: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
        return { apply, generatedAtIso, counters, results };
      }
    }

    for (const c of connections) {
      const filename = pairFilename(c);
      const filePath = join(connectionsDir, filename);
      const exists = existsSync(filePath);
      const md = renderConnectionMd(c, generatedAtIso);

      if (exists && mode === "skip") {
        counters.skipped_exists++;
        results.push({ connection: c, filePath, action: "skipped-exists", reason: "file exists; mode=skip" });
        continue;
      }
      if (exists && mode === "update" && !hasOurMarker(filePath)) {
        // Pre-existing human-authored connection — never overwrite without marker.
        counters.skipped_exists++;
        results.push({ connection: c, filePath, action: "skipped-exists", reason: "human-authored (no marker); refused to overwrite" });
        continue;
      }

      if (!apply) {
        results.push({ connection: c, filePath, action: "would-write" });
        counters.wrote++;
        continue;
      }

      try {
        atomicWrite(filePath, md);
        if (exists) {
          counters.updated++;
          results.push({ connection: c, filePath, action: "updated" });
        } else {
          counters.wrote++;
          results.push({ connection: c, filePath, action: "wrote" });
        }
      } catch (err) {
        counters.errored++;
        results.push({ connection: c, filePath, action: "errored", reason: err instanceof Error ? err.message : String(err) });
      }
    }

    return { apply, generatedAtIso, counters, results };
  }

  /** Compute the canonical pair filename for a connection (test helper + lookup). */
  pairFilename(c: ConnectionInput): string {
    return pairFilename(c);
  }
}

export const connectionMaterializerEngine = new ConnectionMaterializerEngine();
