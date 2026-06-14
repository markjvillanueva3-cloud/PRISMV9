// WIRE-EXEMPT: cron-only consumer. ScheduledTask "PRISM Weekly Connection Brief" (scripts/cron/connection-finder-cron.ps1) invokes the compiled engine directly each Monday 08:00 local. No dispatcher action needed — downstream consumers (Track G overlays, future obsidian-graph injectors) will subscribe via fs.watch on the inbox/ directory.
/**
 * ConnectionFinderEngine — OBSIDIAN-INTELLIGENCE-MS3 / B2 (U-CONNECTION-FINDER)
 *
 * Weekly Monday 08:00 cron. Scans memory/ + wiki/code-tribal/ + inbox/, calls
 * Ollama qwen2.5-coder:32b to surface three signal classes across the corpus:
 *
 *   - contradiction : two memos with directly opposing claims on the same subject
 *   - echo          : the same insight surfacing in 3+ independent memos
 *   - cross-domain  : an analogy or pattern that appears in two unrelated domains
 *
 * Emits  knowledge/memories/generated/CONNECTIONS-<YYYY>-W<WW>.md  with a YAML
 * frontmatter audit trail + a markdown body keyed by connection class.
 *
 * Design notes (Karpathy R5/R8/R12):
 *   - Pure helpers are exported individually so the test suite never goes near a
 *     live Ollama daemon — same DI pattern proven by B1 DailyContextWorkflowEngine.
 *   - parseAnalyzerJson uses a depth-aware brace walker because Ollama responses
 *     sometimes prepend or append commentary (the lesson encoded in
 *     [[feedback_scrutiny_gate_finds_hostile_payload_class]]).
 *   - All error paths flow through a closed enum + discriminated-union result —
 *     callers never have to introspect a thrown Error to react.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const DEFAULT_OLLAMA_URL =
  process.env.PRISM_CONNECTION_FINDER_OLLAMA_URL
    ?? "http://127.0.0.1:11434/api/generate";

export const DEFAULT_OLLAMA_MODEL =
  process.env.PRISM_CONNECTION_FINDER_OLLAMA_MODEL ?? "qwen2.5-coder:32b";

// Token-budget math: qwen2.5-coder:32b ships with 32K-token Ollama context;
// `num_ctx` defaults to 2048 unless overridden, so we both set it explicitly
// AND cap raw payload at ~60KB ≈ 15K tokens to leave headroom for the
// prompt scaffolding + response. Source: Arm B scrutiny P0 on first pass.
export const MAX_SOURCE_BYTES = 2_000;
export const MIN_SOURCES_FOR_ANALYSIS = 10;
export const MAX_SOURCES_PER_RUN = 30;
export const DEFAULT_MEMORY_LIMIT = 12;
export const DEFAULT_WIKI_LIMIT = 8;
export const DEFAULT_INBOX_LIMIT = 10;
export const OLLAMA_NUM_CTX = 32_768;
export const DEFAULT_OLLAMA_TEMPERATURE = 0.2;
export const OLLAMA_TIMEOUT_MS = 90_000;

export const ConnectionKindEnum = z.enum(["contradiction", "echo", "cross-domain"]);
export type ConnectionKind = z.infer<typeof ConnectionKindEnum>;

export const ConnectionFinderErrorClassSchema = z.enum([
  "invalid-vault-root",
  "no-sources",
  "loader-failed",
  "analyzer-failed",
  "write-failed",
]);
export type ConnectionFinderErrorClass = z.infer<typeof ConnectionFinderErrorClassSchema>;

// Renamed from `SourceKindEnum` / `LoadedSourceSchema` to avoid name collision
// with B1 DailyContextWorkflowEngine (same fork tree exports same identifiers
// with a different shape). Per Arm B scrutiny P1 + Karpathy R7 (surface conflicts).
export const ConnectionFinderSourceKindEnum = z.enum(["memory", "wiki-tribal", "inbox"]);
export type ConnectionFinderSourceKind = z.infer<typeof ConnectionFinderSourceKindEnum>;

export const ConnectionFinderLoadedSourceSchema = z
  .object({
    kind: ConnectionFinderSourceKindEnum,
    relPath: z.string().min(1),
    mtimeMs: z.number().finite().nonnegative(),
    body: z.string(),
  })
  .strict();
export type ConnectionFinderLoadedSource = z.infer<typeof ConnectionFinderLoadedSourceSchema>;

export const ConnectionSchema = z
  .object({
    kind: ConnectionKindEnum,
    title: z.string().min(3).max(160),
    summary: z.string().min(10).max(2_000),
    sources: z.array(z.string().min(1)).min(2).max(20),
  })
  .strict();
export type Connection = z.infer<typeof ConnectionSchema>;

export const RunResultOkSchema = z
  .object({
    ok: z.literal(true),
    path: z.string().min(1),
    week: z.string().regex(/^\d{4}-W\d{2}$/),
    connections_count: z.number().int().nonnegative(),
    sources_scanned: z.number().int().nonnegative(),
    bytes_written: z.number().int().nonnegative(),
  })
  .strict();

export const RunResultErrSchema = z
  .object({
    ok: z.literal(false),
    error: ConnectionFinderErrorClassSchema,
    detail: z.string().optional(),
  })
  .strict();

export const RunResultSchema = z.discriminatedUnion("ok", [RunResultOkSchema, RunResultErrSchema]);
export type RunResult = z.infer<typeof RunResultSchema>;

/* ─── pure helpers ─────────────────────────────────────────────────────── */

/** ISO 8601 week label for a Date in UTC, e.g. "2026-W20". */
export function weekIsoUTC(d: Date = new Date()): string {
  // ISO week: thursday in current week decides the year.
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() === 0 ? 7 : tmp.getUTCDay();
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/** Monday 00:00:00 UTC of the week containing the supplied date. */
export function mondayUTC(d: Date = new Date()): Date {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() === 0 ? 7 : tmp.getUTCDay();
  tmp.setUTCDate(tmp.getUTCDate() - (dayNum - 1));
  return tmp;
}

/** Truncate body to MAX_SOURCE_BYTES preserving prefix; appends an ellipsis marker. */
export function truncateBody(body: string, max: number = MAX_SOURCE_BYTES): string {
  if (typeof body !== "string") return "";
  if (body.length <= max) return body;
  return body.slice(0, max) + "\n…[truncated " + (body.length - max) + " bytes]";
}

export function buildAnalyzerPrompt(sources: ConnectionFinderLoadedSource[]): string {
  const blocks = sources
    .map(
      (s, i) =>
        `### Source ${i + 1} [${s.kind}] ${s.relPath}\n` +
        truncateBody(s.body, MAX_SOURCE_BYTES),
    )
    .join("\n\n");
  return [
    "You are a knowledge-graph analyst working over a developer's personal vault.",
    "",
    "Read the following corpus of memos. Find connections across them in three classes:",
    "",
    '  - "contradiction" : two or more memos make directly opposing claims on the same subject.',
    '  - "echo"          : the same insight surfaces in 3+ independent memos (high consensus signal).',
    '  - "cross-domain"  : an analogy or pattern from one domain (e.g. machining) maps onto an',
    "                       unrelated domain (e.g. distributed-systems consensus).",
    "",
    "Return ONLY a single JSON object — no prose, no markdown fence — of this shape:",
    "",
    '  { "connections": [',
    '      { "kind": "contradiction"|"echo"|"cross-domain",',
    '        "title": "<short headline, max 160 chars>",',
    '        "summary": "<2-5 sentences explaining the connection>",',
    '        "sources": ["<relPath of source 1>", "<relPath of source 2>", ...]',
    "      },",
    "      …",
    "    ] }",
    "",
    "Rules:",
    "  - Each connection MUST cite at least 2 sources by relPath (echo needs 3+).",
    "  - Be concrete — quote a phrase or specific claim, never vague summaries.",
    "  - Skip weak matches; precision beats recall here.",
    "",
    "Corpus:",
    "",
    blocks,
  ].join("\n");
}

/**
 * Depth-aware brace walker. Tolerates leading commentary, trailing junk, inner
 * strings containing { or }, and the hostile pattern of one JSON object
 * (well-formed but irrelevant) preceding the real one with garbage between
 * them. Per Arm A scrutiny P0 (2026-05-15) — first-valid-wins was the wrong
 * policy. The walker now skips objects that lack a `connections` array and
 * keeps scanning until it finds one or exhausts the input.
 *
 * Lesson encoded in [[feedback_scrutiny_gate_finds_hostile_payload_class]]
 * (E1 ship) — DO NOT collapse to slice(firstBrace, lastBrace+1).
 */
export function parseAnalyzerJson(raw: string): Connection[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  let i = 0;
  while (i < raw.length) {
    const start = raw.indexOf("{", i);
    if (start === -1) return [];
    let depth = 0;
    let inStr = false;
    let escape = false;
    let consumed = false;
    for (let j = start; j < raw.length; j++) {
      const ch = raw[j];
      if (inStr) {
        if (escape) escape = false;
        else if (ch === "\\") escape = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          const candidate = raw.slice(start, j + 1);
          try {
            const obj = JSON.parse(candidate);
            if (Array.isArray(obj?.connections)) {
              const parsed: Connection[] = [];
              for (const c of obj.connections) {
                const r = ConnectionSchema.safeParse(c);
                if (r.success) parsed.push(r.data);
              }
              return parsed;
            }
            // Valid JSON but no connections key — keep scanning subsequent objects.
            i = j + 1;
            consumed = true;
            break;
          } catch {
            // Malformed candidate — resume after this closing brace.
            i = j + 1;
            consumed = true;
            break;
          }
        }
      }
    }
    if (!consumed) {
      // Inner loop exited without finding balanced depth=0 → no further objects.
      return [];
    }
  }
  return [];
}

export function formatBrief(
  weekIso: string,
  generatedAt: string,
  connections: Connection[],
  sourcesScanned: number,
): string {
  const grouped: Record<ConnectionKind, Connection[]> = {
    contradiction: [],
    echo: [],
    "cross-domain": [],
  };
  for (const c of connections) grouped[c.kind].push(c);

  const yaml = [
    "---",
    `generated_at: ${generatedAt}`,
    `week: ${weekIso}`,
    "kind: weekly-connections",
    "source: ConnectionFinderEngine",
    `sources_scanned: ${sourcesScanned}`,
    `connections_count: ${connections.length}`,
    "---",
    "",
  ].join("\n");

  const heading = `# Weekly Connections — ${weekIso}\n\n` +
    `_Scanned ${sourcesScanned} sources. Found ${connections.length} cross-source signals._\n\n`;

  const sections: string[] = [];
  for (const kind of ["contradiction", "echo", "cross-domain"] as ConnectionKind[]) {
    const list = grouped[kind];
    if (list.length === 0) continue;
    sections.push(`## ${kind} (${list.length})\n`);
    for (const c of list) {
      sections.push(`### ${c.title}\n`);
      sections.push(c.summary + "\n");
      sections.push("**Sources**:");
      for (const s of c.sources) sections.push(`- \`${s}\``);
      sections.push("");
    }
  }

  if (sections.length === 0) {
    sections.push("_No connections surfaced this week. The corpus is internally consistent and topically scattered._\n");
  }

  return yaml + heading + sections.join("\n");
}

/* ─── default loader / analyzer ────────────────────────────────────────── */

export type LoaderFn = (vaultRoot: string, opts?: LoaderOpts) => Promise<ConnectionFinderLoadedSource[]>;
export type AnalyzerFn = (prompt: string) => Promise<Connection[]>;

export interface LoaderOpts {
  memoryLimit?: number;
  wikiLimit?: number;
  inboxLimit?: number;
}

async function readTopByMtime(
  dir: string,
  kind: ConnectionFinderSourceKind,
  limit: number,
): Promise<ConnectionFinderLoadedSource[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return [];
  }
  const stats: { rel: string; mtimeMs: number }[] = [];
  for (const e of entries) {
    if (!e.endsWith(".md")) continue;
    const full = path.join(dir, e);
    try {
      const st = await fs.stat(full);
      if (!st.isFile()) continue;
      stats.push({ rel: full, mtimeMs: st.mtimeMs });
    } catch {
      // skip unreadable
    }
  }
  stats.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const slice = stats.slice(0, limit);
  const out: ConnectionFinderLoadedSource[] = [];
  for (const s of slice) {
    let body = "";
    try {
      body = await fs.readFile(s.rel, "utf8");
    } catch {
      continue;
    }
    out.push({
      kind,
      relPath: path.relative(process.cwd(), s.rel).replace(/\\/g, "/"),
      mtimeMs: s.mtimeMs,
      body,
    });
  }
  return out;
}

export const defaultLoader: LoaderFn = async (vaultRoot, opts = {}) => {
  // Path layout matches PRISM knowledge-vault doctrine (5-namespace schema):
  //   <vaultRoot>/memories/         → memory namespace (cross-session feedback/reference)
  //   <vaultRoot>/memories/inbox/   → inbox captures
  //   <vaultRoot>/wiki/code-tribal/ → wiki tribal-knowledge subdomain
  // The CLI default points vaultRoot at `H:/prism/knowledge` (namespace root).
  const memDir = path.join(vaultRoot, "memories");
  const wikiDir = path.join(vaultRoot, "wiki", "code-tribal");
  const inboxDir = path.join(vaultRoot, "memories", "inbox");
  const [mem, wiki, inbox] = await Promise.all([
    readTopByMtime(memDir, "memory", opts.memoryLimit ?? DEFAULT_MEMORY_LIMIT),
    readTopByMtime(wikiDir, "wiki-tribal", opts.wikiLimit ?? DEFAULT_WIKI_LIMIT),
    readTopByMtime(inboxDir, "inbox", opts.inboxLimit ?? DEFAULT_INBOX_LIMIT),
  ]);
  // Per-kind reservation BEFORE concat. Hard quotas prevent a fat memory/ dir
  // from crowding out the other source classes — the whole value of this
  // engine is cross-kind connection finding. Per Arm A P1-2 + Arm B P1-4
  // (2026-05-15) — concatenate-then-truncate silently starved wiki+inbox.
  const memCap = Math.min(mem.length, DEFAULT_MEMORY_LIMIT);
  const wikiCap = Math.min(wiki.length, DEFAULT_WIKI_LIMIT);
  const inboxCap = Math.min(inbox.length, DEFAULT_INBOX_LIMIT);
  const combined = [
    ...mem.slice(0, memCap),
    ...wiki.slice(0, wikiCap),
    ...inbox.slice(0, inboxCap),
  ].slice(0, MAX_SOURCES_PER_RUN);
  return combined;
};

export const defaultOllamaAnalyzer: AnalyzerFn = async (prompt) => {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, OLLAMA_TIMEOUT_MS);
  try {
    const res = await fetch(DEFAULT_OLLAMA_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_OLLAMA_MODEL,
        prompt,
        stream: false,
        // num_ctx must be set explicitly — Ollama defaults to 2048 which would
        // silently truncate our ~15K-token prompt. Per Arm B scrutiny P0.
        options: { temperature: DEFAULT_OLLAMA_TEMPERATURE, num_ctx: OLLAMA_NUM_CTX },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`ollama http ${res.status}`);
    const json = (await res.json()) as { response?: string };
    return parseAnalyzerJson(json.response ?? "");
  } catch (e) {
    if (timedOut) throw new Error(`ollama timeout after ${OLLAMA_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

/* ─── main engine ──────────────────────────────────────────────────────── */

export interface RunWeeklyArgs {
  date?: Date;
  vaultRoot: string;
  outputDir?: string;
  loader?: LoaderFn;
  analyzer?: AnalyzerFn;
  loaderOpts?: LoaderOpts;
}

export const ConnectionFinderEngine = {
  async runWeekly(args: RunWeeklyArgs): Promise<RunResult> {
    const {
      date = new Date(),
      vaultRoot,
      outputDir,
      loader = defaultLoader,
      analyzer = defaultOllamaAnalyzer,
      loaderOpts,
    } = args;

    if (typeof vaultRoot !== "string" || vaultRoot.trim().length === 0) {
      return { ok: false, error: "invalid-vault-root", detail: "vaultRoot is required" };
    }

    try {
      const st = await fs.stat(vaultRoot);
      if (!st.isDirectory()) {
        return { ok: false, error: "invalid-vault-root", detail: `${vaultRoot} is not a directory` };
      }
    } catch (e) {
      return {
        ok: false,
        error: "invalid-vault-root",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    let sources: ConnectionFinderLoadedSource[];
    try {
      sources = await loader(vaultRoot, loaderOpts);
    } catch (e) {
      // Injected loaders may throw on EACCES, OOM, or hostile filesystems —
      // the public runWeekly contract is a discriminated union, never a throw.
      // Per Arm A P1-1 scrutiny finding (2026-05-15).
      return {
        ok: false,
        error: "loader-failed",
        detail: e instanceof Error ? e.message : String(e),
      };
    }
    if (sources.length < MIN_SOURCES_FOR_ANALYSIS) {
      return {
        ok: false,
        error: "no-sources",
        detail: `loaded ${sources.length}, need ≥${MIN_SOURCES_FOR_ANALYSIS}`,
      };
    }

    let connections: Connection[];
    try {
      const prompt = buildAnalyzerPrompt(sources);
      connections = await analyzer(prompt);
    } catch (e) {
      return {
        ok: false,
        error: "analyzer-failed",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    const weekIso = weekIsoUTC(date);
    const generatedAt = new Date().toISOString();
    const body = formatBrief(weekIso, generatedAt, connections, sources.length);

    const outDir = outputDir ?? path.join(vaultRoot, "generated");
    const outPath = path.join(outDir, `CONNECTIONS-${weekIso}.md`);
    try {
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outPath, body, "utf8");
    } catch (e) {
      return {
        ok: false,
        error: "write-failed",
        detail: e instanceof Error ? e.message : String(e),
      };
    }

    return {
      ok: true,
      path: outPath,
      week: weekIso,
      connections_count: connections.length,
      sources_scanned: sources.length,
      bytes_written: Buffer.byteLength(body, "utf8"),
    };
  },
};

/* ─── CLI entry ────────────────────────────────────────────────────────── */

async function runCli(): Promise<void> {
  // Default vaultRoot is the PRISM knowledge-vault namespace ROOT — the loader
  // walks <root>/memories, <root>/memories/inbox, <root>/wiki/code-tribal.
  // Per Arm B P1-3 scrutiny (2026-05-15) — prior default pointed inside the
  // memories namespace, making both wiki and inbox unreachable.
  const vaultRoot =
    process.env.PRISM_CONNECTION_FINDER_VAULT_ROOT
      ?? "H:/prism/knowledge";
  const dateStr = process.env.PRISM_CONNECTION_FINDER_DATE;
  const date = dateStr ? new Date(dateStr) : new Date();
  const result = await ConnectionFinderEngine.runWeekly({ date, vaultRoot });
  process.stdout.write(JSON.stringify(result) + "\n");
  if (!result.ok) process.exit(result.error === "invalid-vault-root" ? 2 : 1);
}

import { pathToFileURL } from "node:url";
const argv1 = process.argv[1] ?? "";
if (argv1 && import.meta.url === pathToFileURL(argv1).href) {
  runCli().catch((e) => {
    process.stderr.write(`fatal: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  });
}
