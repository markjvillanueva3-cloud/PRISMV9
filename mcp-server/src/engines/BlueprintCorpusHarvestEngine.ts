/**
 * BlueprintCorpusHarvestEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U6
 *
 * Net-new orchestration engine that harvests training-corpus content from:
 *   - MIT OCW engineering courses (downloaded transcripts + PDFs)
 *   - CAD/CAM vendor PDFs under `Resources/` + new uploads
 *   - Curated online sources (Playwright MCP wrapping)
 *
 * into `knowledge/wiki/training-corpus/{drafting,gdt,callout-conventions,industry-norms}/`
 * as frontmatter-tagged markdown files. Each entry is then embeddable via the
 * existing nomic-embed-text 768d pipeline.
 *
 * @engine BlueprintCorpusHarvestEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1 / U-MS1-U6
 * @classification STANDARD (orchestration, no physics constants)
 *
 * Composes (does NOT duplicate):
 *   - /pdf-learn skill — wrapped via PdfFetcher injectable
 *   - /video-learn skill — wrapped via VideoFetcher injectable
 *   - Playwright MCP — wrapped via OnlineFetcher injectable
 *   - cad-embed-build-index action — wrapped via Embedder injectable
 *   - wiki-precheck-inject _embeddings.jsonl pattern — corpus entries land here
 *
 * Security: online harvest is whitelist-gated per [[feedback_playwright_for_online_sources]].
 * Out-of-whitelist URLs hard-block. H: drive content is NEVER published outbound
 * per [[feedback_no_public_h_drive]].
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// ── Domain ──────────────────────────────────────────────────────────────────

export const CORPUS_DOMAINS = [
  "drafting",
  "gdt",
  "callout-conventions",
  "industry-norms",
] as const;
export type CorpusDomain = (typeof CORPUS_DOMAINS)[number];

export const CORPUS_SOURCES = ["mit", "vendor", "online"] as const;
export type CorpusSource = (typeof CORPUS_SOURCES)[number];

/**
 * Frontmatter shape for every harvested corpus entry. Drives downstream
 * filtering (e.g. RAG retrieval at U-MS1-U7).
 */
export const CorpusEntryFrontmatterSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    entryId: z.string().min(1),
    source: z.enum(CORPUS_SOURCES),
    sourceUrl: z.string().optional(),
    sourceFile: z.string().optional(),
    domain: z.enum(CORPUS_DOMAINS),
    tags: z.array(z.string()).default([]),
    title: z.string().min(1),
    harvestedAt: z.string(), // ISO-8601
    contentSha: z.string().min(8),
    /** Sister extractor URL/path so corpus drift can be audited. */
    extractor: z.string().min(1),
  })
  .strict();
export type CorpusEntryFrontmatter = z.infer<typeof CorpusEntryFrontmatterSchema>;

/** Whitelist of allowed online hosts (operator-curated). Out-of-whitelist URLs
 * are hard-blocked per [[feedback_playwright_for_online_sources]]. */
export const ONLINE_HOST_WHITELIST: readonly string[] = [
  "ocw.mit.edu",
  "ocw.utexas.edu",
  "asme.org",
  "iso.org",
  "ansi.org",
  "y14.5",
  "sandvik.coromant.com",
  "kennametal.com",
  "iscar.com",
  "haascnc.com",
  "okuma.com",
  "mazak.com",
  "fanuc.com",
];

const DEFAULT_CORPUS_ROOT = "knowledge/wiki/training-corpus";
const DEFAULT_FRESHNESS_HOURS = 24 * 7; // weekly
const DEFAULT_MAX_RETRY_404 = 3;
const MIN_FRESHNESS_HOURS = 1;
const MAX_FRESHNESS_HOURS = 24 * 365;

const TITLE_MAX_LEN = 200;
const FILENAME_SAFE_REGEX = /[^A-Za-z0-9_.-]/g;
const SHA_HEX_REGEX = /^[a-f0-9]{8,}$/i;
const ETAG_RANDOM_LEN = 6;

// ── Public-facing types ─────────────────────────────────────────────────────

export interface MITCourseSpec {
  courseId: string;
  title: string;
  url: string;
  domain: CorpusDomain;
  tags?: string[];
}

export interface VendorPDFSpec {
  filePath: string;
  vendor: string;
  domain: CorpusDomain;
  tags?: string[];
}

export interface OnlineSourceSpec {
  url: string;
  domain: CorpusDomain;
  title: string;
  tags?: string[];
}

export interface HarvestResult {
  source: CorpusSource;
  attempted: number;
  succeeded: number;
  failed: Array<{ source: string; reason: string }>;
  blocked: Array<{ source: string; reason: string }>;
  entries: string[]; // file paths written
}

export interface CorpusEntry {
  filePath: string;
  frontmatter: CorpusEntryFrontmatter;
  body: string;
}

export interface FreshnessVerdict {
  source: CorpusSource;
  totalEntries: number;
  freshEntries: number;
  staleEntries: number;
  staleEntryPaths: string[];
  thresholdHours: number;
}

export interface EmbeddingIndexResult {
  outputPath: string;
  vectorCount: number;
  failed: Array<{ entryPath: string; reason: string }>;
}

/** Inject-able fetchers for testability. */
export interface HarvestIO {
  fs?: {
    existsSync: typeof fs.existsSync;
    mkdirSync: typeof fs.mkdirSync;
    writeFileSync: typeof fs.writeFileSync;
    readFileSync: typeof fs.readFileSync;
    readdirSync: typeof fs.readdirSync;
    statSync: typeof fs.statSync;
  };
  fetchMIT?: (course: MITCourseSpec) => Promise<{ ok: true; content: string } | { ok: false; reason: string }>;
  fetchVendorPDF?: (spec: VendorPDFSpec) => Promise<{ ok: true; content: string } | { ok: false; reason: string }>;
  fetchOnline?: (spec: OnlineSourceSpec) => Promise<{ ok: true; content: string } | { ok: false; reason: string }>;
  embed?: (text: string) => Promise<{ ok: true; vector: number[] } | { ok: false; reason: string }>;
  sha?: (input: string) => string;
  /** Inject for deterministic time. */
  now?: () => string;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class BlueprintCorpusHarvestEngine {
  public readonly schemaVersion = "1.0.0" as const;

  private corpusRoot: string = DEFAULT_CORPUS_ROOT;

  setCorpusRoot(rootPath: string): void {
    if (typeof rootPath !== "string" || rootPath.length === 0) {
      throw new Error("[BlueprintCorpusHarvestEngine] corpusRoot must be non-empty");
    }
    this.corpusRoot = rootPath;
  }

  getCorpusRoot(): string {
    return this.corpusRoot;
  }

  /**
   * Harvest a list of MIT OCW courses. The injected `fetchMIT` is the actual
   * network/scraper backend; this method owns sequencing + retry + tagging.
   * Returns counts of attempted/succeeded/failed plus the absolute paths of
   * written corpus entries.
   */
  async harvestMIT(input: {
    courseList: MITCourseSpec[];
    outputDir?: string;
    io?: HarvestIO;
  }): Promise<HarvestResult> {
    return await this._harvestList(input.courseList, "mit", input.outputDir, input.io ?? {}, async (course) => {
      // Defensive: validate URL host before fetching
      if (!isWhitelistedUrl(course.url)) {
        return { ok: false, reason: `out_of_whitelist:${safeHost(course.url)}` };
      }
      const fetcher = input.io?.fetchMIT;
      if (!fetcher) return { ok: false, reason: "no_mit_fetcher_injected" };
      try {
        return await fetcher(course);
      } catch (err) {
        return { ok: false, reason: `fetcher_threw:${(err as Error).message}` };
      }
    }, (course) => ({
      title: course.title,
      domain: course.domain,
      tags: course.tags ?? [],
      sourceUrl: course.url,
      sourceFile: undefined,
      key: course.courseId,
    }));
  }

  async harvestVendorPDFs(input: {
    pdfList: VendorPDFSpec[];
    outputDir?: string;
    io?: HarvestIO;
  }): Promise<HarvestResult> {
    return await this._harvestList(input.pdfList, "vendor", input.outputDir, input.io ?? {}, async (pdf) => {
      const fetcher = input.io?.fetchVendorPDF;
      if (!fetcher) return { ok: false, reason: "no_vendor_fetcher_injected" };
      try {
        return await fetcher(pdf);
      } catch (err) {
        return { ok: false, reason: `fetcher_threw:${(err as Error).message}` };
      }
    }, (pdf) => ({
      title: `${pdf.vendor}: ${path.basename(pdf.filePath)}`.slice(0, TITLE_MAX_LEN),
      domain: pdf.domain,
      tags: [...(pdf.tags ?? []), pdf.vendor.toLowerCase()],
      sourceUrl: undefined,
      sourceFile: pdf.filePath,
      key: `${pdf.vendor}-${path.basename(pdf.filePath)}`,
    }));
  }

  async harvestOnline(input: {
    urlList: OnlineSourceSpec[];
    outputDir?: string;
    io?: HarvestIO;
    maxRetry404?: number;
  }): Promise<HarvestResult> {
    const maxRetry = clampInt(input.maxRetry404, DEFAULT_MAX_RETRY_404, 1, 10);
    return await this._harvestList(input.urlList, "online", input.outputDir, input.io ?? {}, async (src) => {
      if (!isWhitelistedUrl(src.url)) {
        return { ok: false, reason: `out_of_whitelist:${safeHost(src.url)}` };
      }
      const fetcher = input.io?.fetchOnline;
      if (!fetcher) return { ok: false, reason: "no_online_fetcher_injected" };
      // Retry on 404 — spec requires up to maxRetry attempts
      let lastReason = "unknown";
      for (let attempt = 0; attempt < maxRetry; attempt++) {
        try {
          const out = await fetcher(src);
          if (out.ok) return out;
          lastReason = out.reason;
          // Only retry on 404
          if (!/^404/.test(out.reason)) return out;
        } catch (err) {
          lastReason = `fetcher_threw:${(err as Error).message}`;
        }
      }
      return { ok: false, reason: `retried_${maxRetry}x:${lastReason}` };
    }, (src) => ({
      title: src.title,
      domain: src.domain,
      tags: src.tags ?? [],
      sourceUrl: src.url,
      sourceFile: undefined,
      key: hashSafe(src.url),
    }));
  }

  /**
   * Enumerate corpus entries by domain or tag. Returns parsed-frontmatter
   * entries; body strings are NOT returned by default (the file path is enough
   * for most downstream consumers and saves memory).
   */
  enumerateCorpus(input: {
    domain?: CorpusDomain;
    tag?: string;
    source?: CorpusSource;
    rootDir?: string;
    io?: HarvestIO;
    includeBodies?: boolean;
  }): CorpusEntry[] {
    const fsImpl = input.io?.fs ?? defaultFsImpl();
    const root = path.join(input.rootDir ?? this.corpusRoot, input.domain ?? "").replace(/\\/g, "/");
    const out: CorpusEntry[] = [];
    walkMarkdownFiles(input.rootDir ?? this.corpusRoot, fsImpl, (filePath) => {
      // Domain filter: when domain is set, only walk that domain subdir
      if (input.domain && !filePath.includes(`/${input.domain}/`) && !filePath.includes(`\\${input.domain}\\`)) {
        return;
      }
      try {
        const raw = fsImpl.readFileSync(filePath, "utf8") as string;
        const { frontmatter, body } = parseFrontmatter(raw);
        if (!frontmatter) return;
        const parsed = CorpusEntryFrontmatterSchema.safeParse(frontmatter);
        if (!parsed.success) return;
        if (input.source && parsed.data.source !== input.source) return;
        if (input.tag && !parsed.data.tags.includes(input.tag)) return;
        out.push({
          filePath: filePath.replace(/\\/g, "/"),
          frontmatter: parsed.data,
          body: input.includeBodies ? body : "",
        });
      } catch {
        // Skip malformed corpus files silently — they don't break enumeration
      }
    });
    // Stable ordering by entryId for deterministic test output
    out.sort((a, b) => a.frontmatter.entryId.localeCompare(b.frontmatter.entryId));
    return out;
  }

  /**
   * Per-source freshness check. An entry is "stale" when its harvestedAt is
   * older than `thresholdHours`. Returns counts + the stale file paths so an
   * operator (or cron job) can re-harvest.
   */
  verifyCorpusFresh(input: {
    source: CorpusSource;
    thresholdHours?: number;
    rootDir?: string;
    io?: HarvestIO;
    now?: () => Date;
  }): FreshnessVerdict {
    const thresholdHours = clampInt(input.thresholdHours, DEFAULT_FRESHNESS_HOURS, MIN_FRESHNESS_HOURS, MAX_FRESHNESS_HOURS);
    const now = input.now ? input.now() : new Date();
    const entries = this.enumerateCorpus({
      source: input.source,
      rootDir: input.rootDir,
      io: input.io,
    });
    let fresh = 0;
    const stalePaths: string[] = [];
    for (const e of entries) {
      const harvestedAt = new Date(e.frontmatter.harvestedAt).getTime();
      const ageHours = (now.getTime() - harvestedAt) / 3_600_000;
      if (Number.isFinite(ageHours) && ageHours <= thresholdHours) {
        fresh++;
      } else {
        stalePaths.push(e.filePath);
      }
    }
    return {
      source: input.source,
      totalEntries: entries.length,
      freshEntries: fresh,
      staleEntries: stalePaths.length,
      staleEntryPaths: stalePaths,
      thresholdHours,
    };
  }

  /**
   * Build the embedding index over the corpus. Returns the output path +
   * vector count + per-entry failure list. The embedder fn is injectable —
   * tests pass a deterministic hash-based mock; production wires
   * nomic-embed-text via OllamaEmbedderEngine.
   */
  async buildEmbeddingIndex(input: {
    outputPath: string;
    rootDir?: string;
    io?: HarvestIO;
  }): Promise<EmbeddingIndexResult> {
    if (typeof input.outputPath !== "string" || input.outputPath.length === 0) {
      throw new Error("[BlueprintCorpusHarvestEngine] outputPath required");
    }
    const fsImpl = input.io?.fs ?? defaultFsImpl();
    const embedder = input.io?.embed;
    if (!embedder) {
      throw new Error("[BlueprintCorpusHarvestEngine] embedder injection required");
    }
    const entries = this.enumerateCorpus({
      rootDir: input.rootDir,
      io: input.io,
      includeBodies: true,
    });
    const failed: EmbeddingIndexResult["failed"] = [];
    const lines: string[] = [];
    for (const e of entries) {
      let r;
      try {
        r = await embedder(e.body || e.frontmatter.title);
      } catch (err) {
        r = { ok: false as const, reason: `embedder_threw:${(err as Error).message}` };
      }
      if (r.ok) {
        lines.push(JSON.stringify({
          entryId: e.frontmatter.entryId,
          domain: e.frontmatter.domain,
          source: e.frontmatter.source,
          tags: e.frontmatter.tags,
          vector: r.vector,
        }));
      } else {
        failed.push({ entryPath: e.filePath, reason: r.reason });
      }
    }
    try {
      fsImpl.mkdirSync(path.dirname(input.outputPath), { recursive: true });
      fsImpl.writeFileSync(input.outputPath, lines.join("\n") + (lines.length > 0 ? "\n" : ""), "utf8");
    } catch (err) {
      throw new Error(`[BlueprintCorpusHarvestEngine] embedding output write failed: ${(err as Error).message}`);
    }
    return { outputPath: input.outputPath, vectorCount: lines.length, failed };
  }

  // ── private ───────────────────────────────────────────────────────────────

  private async _harvestList<T>(
    list: T[],
    source: CorpusSource,
    outputDir: string | undefined,
    io: HarvestIO,
    fetcher: (item: T) => Promise<{ ok: true; content: string } | { ok: false; reason: string }>,
    meta: (item: T) => { title: string; domain: CorpusDomain; tags: string[]; sourceUrl?: string; sourceFile?: string; key: string },
  ): Promise<HarvestResult> {
    if (!Array.isArray(list)) {
      throw new Error(`[BlueprintCorpusHarvestEngine] ${source} list must be array`);
    }
    const fsImpl = io.fs ?? defaultFsImpl();
    const sha = io.sha ?? defaultSha;
    const now = io.now ?? (() => new Date().toISOString());
    const failed: HarvestResult["failed"] = [];
    const blocked: HarvestResult["blocked"] = [];
    const entries: string[] = [];
    let succeeded = 0;
    for (const item of list) {
      const m = meta(item);
      // First-pass whitelist/safety check is done inside the fetcher closure
      // (it returns ok:false with out_of_whitelist reason). Bucket that into
      // `blocked` rather than `failed` so operators see security counters.
      const r = await fetcher(item);
      if (!r.ok) {
        if (/^out_of_whitelist/.test(r.reason)) {
          blocked.push({ source: m.key, reason: r.reason });
        } else {
          failed.push({ source: m.key, reason: r.reason });
        }
        continue;
      }
      const targetDir = path
        .join(outputDir ?? this.corpusRoot, m.domain)
        .replace(/\\/g, "/");
      try {
        fsImpl.mkdirSync(targetDir, { recursive: true });
      } catch (err) {
        failed.push({ source: m.key, reason: `mkdir_failed:${(err as Error).message}` });
        continue;
      }
      const contentSha = sha(r.content).slice(0, 16);
      const safeKey = m.key.replace(FILENAME_SAFE_REGEX, "_").slice(0, 80);
      const targetPath = path
        .join(targetDir, `${source}-${safeKey}-${contentSha.slice(0, 8)}.md`)
        .replace(/\\/g, "/");
      const frontmatter: CorpusEntryFrontmatter = {
        schemaVersion: this.schemaVersion,
        entryId: `${source}:${safeKey}:${contentSha}`,
        source,
        ...(m.sourceUrl ? { sourceUrl: m.sourceUrl } : {}),
        ...(m.sourceFile ? { sourceFile: m.sourceFile } : {}),
        domain: m.domain,
        tags: m.tags,
        title: m.title.slice(0, TITLE_MAX_LEN),
        harvestedAt: now(),
        contentSha,
        extractor: `BlueprintCorpusHarvestEngine/${this.schemaVersion}`,
      };
      const fmParse = CorpusEntryFrontmatterSchema.safeParse(frontmatter);
      if (!fmParse.success) {
        failed.push({ source: m.key, reason: `frontmatter_invalid:${fmParse.error.issues[0]?.message ?? "?"}` });
        continue;
      }
      const file = `---\n${stringifyYaml(fmParse.data)}\n---\n\n${r.content}\n`;
      try {
        fsImpl.writeFileSync(targetPath, file, "utf8");
      } catch (err) {
        failed.push({ source: m.key, reason: `write_failed:${(err as Error).message}` });
        continue;
      }
      entries.push(targetPath);
      succeeded++;
    }
    return { source, attempted: list.length, succeeded, failed, blocked, entries };
  }
}

// ── Helpers (exported for testability) ──────────────────────────────────────

export function isWhitelistedUrl(url: string): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  let host = "";
  try {
    host = new URL(url).host.toLowerCase();
  } catch {
    // Not a parseable URL — try the literal substring match for spec-listed
    // identifiers like "y14.5" that are technically a token, not a URL.
    return ONLINE_HOST_WHITELIST.some((w) => url.toLowerCase().includes(w));
  }
  return ONLINE_HOST_WHITELIST.some(
    (w) => host === w || host.endsWith("." + w),
  );
}

export function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.slice(0, 80);
  }
}

export function parseFrontmatter(raw: string): { frontmatter: unknown; body: string } {
  if (typeof raw !== "string") return { frontmatter: null, body: "" };
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: null, body: raw };
  const yaml = m[1] ?? "";
  const body = m[2] ?? "";
  // Minimal YAML — we wrote it, so we know the shape. Convert key:value lines
  // + tag arrays into an object. Skip blank lines.
  const obj: Record<string, unknown> = {};
  for (const line of yaml.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const rawVal = (kv[2] ?? "").trim();
    if (rawVal.startsWith("[") && rawVal.endsWith("]")) {
      // Array
      const inner = rawVal.slice(1, -1).trim();
      obj[key] = inner.length === 0
        ? []
        : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (rawVal === "true" || rawVal === "false") {
      obj[key] = rawVal === "true";
    } else {
      // String — strip surrounding quotes
      obj[key] = rawVal.replace(/^["']|["']$/g, "");
    }
  }
  return { frontmatter: obj, body };
}

export function stringifyYaml(fm: CorpusEntryFrontmatter): string {
  const lines: string[] = [];
  lines.push(`schemaVersion: "${fm.schemaVersion}"`);
  lines.push(`entryId: "${fm.entryId}"`);
  lines.push(`source: ${fm.source}`);
  if (fm.sourceUrl) lines.push(`sourceUrl: "${fm.sourceUrl}"`);
  if (fm.sourceFile) lines.push(`sourceFile: "${fm.sourceFile}"`);
  lines.push(`domain: ${fm.domain}`);
  lines.push(`tags: [${fm.tags.map((t) => `"${t}"`).join(", ")}]`);
  lines.push(`title: "${fm.title.replace(/"/g, '\\"')}"`);
  lines.push(`harvestedAt: "${fm.harvestedAt}"`);
  lines.push(`contentSha: "${fm.contentSha}"`);
  lines.push(`extractor: "${fm.extractor}"`);
  return lines.join("\n");
}

function defaultFsImpl(): NonNullable<HarvestIO["fs"]> {
  return {
    existsSync: fs.existsSync,
    mkdirSync: fs.mkdirSync,
    writeFileSync: fs.writeFileSync,
    readFileSync: fs.readFileSync,
    readdirSync: fs.readdirSync,
    statSync: fs.statSync,
  };
}

function walkMarkdownFiles(
  rootDir: string,
  fsImpl: NonNullable<HarvestIO["fs"]>,
  visit: (filePath: string) => void,
): void {
  if (!fsImpl.existsSync(rootDir)) return;
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let dirents;
    try {
      dirents = fsImpl.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const d of dirents) {
      const full = path.join(dir, d.name);
      if (d.isDirectory()) {
        stack.push(full);
      } else if (d.isFile() && d.name.endsWith(".md")) {
        visit(full);
      }
    }
  }
}

function clampInt(raw: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

/**
 * Default content hash — NOT cryptographically strong; just stable+collision-
 * resistant enough for filename uniqueness. Production wires crypto.createHash.
 */
export function defaultSha(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  const out = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  return out.padStart(16, "0");
}

export function hashSafe(input: string): string {
  return defaultSha(input).slice(0, ETAG_RANDOM_LEN * 2);
}

export const blueprintCorpusHarvestEngine = new BlueprintCorpusHarvestEngine();
