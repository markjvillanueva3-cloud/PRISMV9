/**
 * CommunitySummaryEngine -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06 (slot:sierra)
 *
 * Collapses the ~3200-engine catalog into per-DOMAIN community summaries so an LLM
 * can grasp a cluster in <=200 tokens instead of enumerating ~8000 tokens of engine
 * names. Clusters the ENGINE_DIGEST.md catalog by manufacturing domain (keyword
 * inference -- the digest is a flat `- **Name**: desc` list with no domain headers),
 * then emits a token-bounded extractive summary per cluster (deterministic, free,
 * always works); an opt-in Ollama pass (fail-soft) can polish the prose.
 *
 * Composes the spirit of GAC01.summarizeCommunity (counts + sample) and GAC02's
 * extractive-default / opt-in-Ollama summarizer pattern. The Claude fallback the
 * spec mentions is NOT auto-invoked here (an engine silently spending Claude tokens
 * is a cost surprise) -- the extractive path is the guaranteed delivery; a caller
 * may escalate to Claude deliberately.
 *
 * @engine CommunitySummaryEngine
 * @milestone GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC06
 * @classification STANDARD (catalog clustering + text assembly, no physics)
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface EngineEntry {
  name: string;
  desc: string;
}

export interface ClusterSummary {
  domain: string;
  count: number;
  summary: string;
  tokens: number;
  method: "extractive" | "ollama";
  truncated: boolean;
  warnings: string[];
}

export interface SummaryOpts {
  /** Inject the engine catalog (hermetic tests) instead of parsing ENGINE_DIGEST.md. */
  entries?: EngineEntry[];
  /** Override the ENGINE_DIGEST.md path. */
  digestPath?: string;
  /** Opt into an Ollama prose pass (fail-soft -> extractive on any error). Default false. */
  useLlm?: boolean;
  /** Ollama model. Default env PRISM_OLLAMA_MODEL or qwen2.5-coder:32b. */
  ollamaModel?: string;
  /** Max tokens per summary before truncate+warn. Default 200 (hard ceiling 300). */
  maxTokens?: number;
  /** Max engine names listed in an extractive summary. Default 12. */
  topK?: number;
  /** Injectable Ollama caller (tests). Returns the model's text, or throws/empty -> fallback. */
  ollamaCall?: (prompt: string, model: string) => Promise<string>;
}

const DEFAULT_MAX_TOKENS = 200;
const HARD_TOKEN_CEIL = 300;
const DEFAULT_TOP_K = 12;
const OLLAMA_SAMPLE_MIN = 20;
const REPO_WALK_MAX = 8;
const CHARS_PER_TOKEN = 4;
const REL_DIGEST = "mcp-server/data/docs/ENGINE_DIGEST.md";
const DIGEST_LINE = /^- \*\*([A-Za-z0-9_]+)\*\*:\s*(.*)$/;
const OLLAMA_URL = "http://127.0.0.1:11434/api/generate";
const OLLAMA_TIMEOUT_MS = 20_000;

/**
 * Ordered domain ruleset (FIRST match wins). Exported so callers can inspect /
 * extend the taxonomy. Order matters: the most specific domains precede the broad
 * ones (WEDM before Mill so a wire-EDM engine is not swallowed by a "mill" substring).
 */
export const DOMAIN_RULES: Array<{ domain: string; re: RegExp }> = [
  { domain: "WEDM", re: /\b(wedm|wire.?edm|edm|spark|discharge|electrode)\b/i },
  { domain: "Lathe", re: /\b(lathe|turning|turret|chuck|barfeed|bar.?pull|css|swiss)\b/i },
  { domain: "Mill", re: /\b(mill|milling|pocket|facing|hsm|trochoid|adaptive.?clear)\b/i },
  { domain: "CAM", re: /\b(cam|toolpath|mastercam|hypermill|esprit|gibbscam|feedrate)\b/i },
  { domain: "CAD", re: /\b(cad|step|brep|dxf|geometr|feature.?recogn|solid|nurbs|sketch)\b/i },
  { domain: "PostProcessor", re: /\b(post.?process|controller|dialect|gcode|g.?code|fanuc|haas|okuma|siemens|heidenhain)\b/i },
  { domain: "Quoting-Business", re: /\b(quote|quoting|cost|pricing|erp|invoice|account|crm|business|vendor|procure|payroll|finance)\b/i },
  { domain: "AI-ML", re: /\b(ai|neural|gnn|graphsage|lora|ml|learning|embedding|train|reasoning|llm|rag|inference|model)\b/i },
  { domain: "Safety-Quality", re: /\b(safety|compliance|alarm|cpk|spc|quality|inspect|toleranc|gdt|metrolog)\b/i },
];
const FALLBACK_DOMAIN = "Other";

export class CommunitySummaryEngine {
  private cache: { key: string; mtimeMs: number; entries: EngineEntry[] } | null = null;

  /** Resolve ENGINE_DIGEST.md by walking up from cwd to the repo root. */
  private resolveDigestPath(override?: string): string {
    if (override) return override;
    let dir = process.cwd();
    for (let i = 0; i < REPO_WALK_MAX; i++) {
      const cand = path.join(dir, REL_DIGEST);
      if (fs.existsSync(cand)) return cand;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    return path.resolve(process.cwd(), REL_DIGEST);
  }

  /** Parse the ENGINE_DIGEST.md `- **Name**: desc` lines (mtime-cached). Fail-loud if absent. */
  loadCatalog(opts: SummaryOpts = {}): EngineEntry[] {
    if (opts.entries) return opts.entries;
    const file = this.resolveDigestPath(opts.digestPath);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(file);
    } catch {
      throw new Error(
        `CommunitySummaryEngine: ENGINE_DIGEST.md not found at ${file}. ` +
          `Regenerate the digest or pass opts.entries / opts.digestPath.`,
      );
    }
    if (this.cache && this.cache.key === file && this.cache.mtimeMs === stat.mtimeMs) {
      return this.cache.entries;
    }
    const entries: EngineEntry[] = [];
    const text = fs.readFileSync(file, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = DIGEST_LINE.exec(line);
      if (m) entries.push({ name: m[1], desc: (m[2] || "").trim() });
    }
    this.cache = { key: file, mtimeMs: stat.mtimeMs, entries };
    return entries;
  }

  /** Cluster the catalog by domain (first matching rule wins; else "Other"). */
  clusterByDomain(entries: EngineEntry[]): Map<string, EngineEntry[]> {
    const clusters = new Map<string, EngineEntry[]>();
    for (const e of entries) {
      const hay = `${e.name} ${e.desc}`;
      let domain = FALLBACK_DOMAIN;
      for (const rule of DOMAIN_RULES) {
        if (rule.re.test(hay)) {
          domain = rule.domain;
          break;
        }
      }
      const arr = clusters.get(domain) || [];
      arr.push(e);
      clusters.set(domain, arr);
    }
    return clusters;
  }

  /** Rough token estimate (~4 chars/token, the GPT-family heuristic). */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  /**
   * Summarize one domain cluster. Extractive by default (deterministic + free +
   * bounded); opt-in Ollama (fail-soft). Always returns a result <= HARD_TOKEN_CEIL
   * tokens (truncates + warns if needed).
   */
  async summarizeCluster(domain: string, entries: EngineEntry[], opts: SummaryOpts = {}): Promise<ClusterSummary> {
    const warnings: string[] = [];
    const maxTokens = Math.min(opts.maxTokens ?? DEFAULT_MAX_TOKENS, HARD_TOKEN_CEIL);
    const topK = opts.topK ?? DEFAULT_TOP_K;

    if (!entries || entries.length === 0) {
      return { domain, count: 0, summary: `${domain}: no engines in this cluster.`, tokens: 0, method: "extractive", truncated: false, warnings: ["empty cluster"] };
    }

    let method: ClusterSummary["method"] = "extractive";
    let summary = this.extractiveSummary(domain, entries, topK);

    if (opts.useLlm) {
      try {
        const prose = await this.ollamaSummary(domain, entries, topK, opts);
        if (prose && prose.trim().length > 0) {
          summary = prose.trim();
          method = "ollama";
        } else {
          warnings.push("ollama returned empty; using extractive");
        }
      } catch (e: any) {
        warnings.push(`ollama unreachable (${e?.message ?? e}); using extractive`);
      }
    }

    // token-cap: truncate to maxTokens (chars) + warn. Reserve room for the suffix so
    // the FINAL string (body + suffix) still fits under the cap (suffix-aware budget).
    // When maxTokens is so small the suffix alone would overshoot it, drop the suffix
    // and hard-truncate -- the cap (tokens <= maxTokens) ALWAYS holds.
    let truncated = false;
    let tokens = this.estimateTokens(summary);
    if (tokens > maxTokens) {
      const suffix = " ...[truncated]";
      const capChars = maxTokens * CHARS_PER_TOKEN;
      if (suffix.length >= capChars) {
        summary = summary.slice(0, capChars); // no room for the suffix; hard cut
      } else {
        summary = summary.slice(0, capChars - suffix.length).replace(/\s+\S*$/, "") + suffix;
      }
      truncated = true;
      tokens = this.estimateTokens(summary);
      warnings.push(`summary exceeded ${maxTokens} tokens; truncated`);
    }

    return { domain, count: entries.length, summary, tokens, method, truncated, warnings };
  }

  /** Deterministic extractive summary: domain + count + top-K engine names + a tail count. */
  private extractiveSummary(domain: string, entries: EngineEntry[], topK: number): string {
    // stable top-K by name (deterministic; not degree-ranked -- the catalog has no degree)
    const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    const head = sorted.slice(0, topK);
    const more = entries.length - head.length;
    const names = head.map((e) => e.name).join(", ");
    const tail = more > 0 ? `, +${more} more` : "";
    return `${domain} (${entries.length} engines): ${names}${tail}.`;
  }

  /** Fail-soft Ollama call (default fetch to local /api/generate; injectable for tests). */
  private async ollamaSummary(domain: string, entries: EngineEntry[], topK: number, opts: SummaryOpts): Promise<string> {
    const model = opts.ollamaModel || process.env.PRISM_OLLAMA_MODEL || "qwen2.5-coder:32b";
    const sample = entries.slice(0, Math.max(topK, OLLAMA_SAMPLE_MIN)).map((e) => `${e.name}: ${e.desc}`).join("\n");
    const prompt =
      `Summarize this cluster of ${entries.length} manufacturing-software engines in the "${domain}" domain ` +
      `in <=180 tokens. State what the cluster does and name 3-5 representative engines. No preamble.\n\n${sample}`;
    if (opts.ollamaCall) return opts.ollamaCall(prompt, model);
    return this.defaultOllamaCall(prompt, model);
  }

  private async defaultOllamaCall(prompt: string, model: string): Promise<string> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), OLLAMA_TIMEOUT_MS);
    try {
      const res = await fetch(OLLAMA_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`ollama HTTP ${res.status}`);
      const data: any = await res.json();
      return typeof data?.response === "string" ? data.response : "";
    } finally {
      clearTimeout(timer);
    }
  }

  /** Summarize every domain cluster. Sequential by design: an opt-in Ollama pass must
   * NOT fire N parallel requests at the single local model (the extractive default is
   * sync-fast so the loop is cheap when useLlm is off). */
  async summarizeAll(opts: SummaryOpts = {}): Promise<ClusterSummary[]> {
    const entries = this.loadCatalog(opts);
    const clusters = this.clusterByDomain(entries);
    const out: ClusterSummary[] = [];
    for (const [domain, list] of clusters) {
      out.push(await this.summarizeCluster(domain, list, opts));
    }
    // deterministic order: by domain name
    out.sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));
    return out;
  }

  /** Summarize a single named domain (case-insensitive). Returns an empty-cluster summary if absent. */
  async summarizeDomain(domain: string, opts: SummaryOpts = {}): Promise<ClusterSummary> {
    if (typeof domain !== "string" || domain.trim() === "") {
      throw new Error("CommunitySummaryEngine.summarizeDomain: domain must be a non-empty string");
    }
    const entries = this.loadCatalog(opts);
    const clusters = this.clusterByDomain(entries);
    const key = [...clusters.keys()].find((k) => k.toLowerCase() === domain.trim().toLowerCase());
    return this.summarizeCluster(key ?? domain, key ? clusters.get(key)! : [], opts);
  }

  /** Test seam: clear the catalog mtime cache. */
  _resetCacheForTest(): void {
    this.cache = null;
  }
}

export { CommunitySummaryEngine as _CommunitySummaryEngine };
export const communitySummaryEngine = new CommunitySummaryEngine();
