// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; this engine is consumed
// by the AGI/DL/Creative-Reasoning facades and the wiki-sync cron until then.
/**
 * WikiSelfAwarenessSyncEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI05
 *
 * Bridges three classes of self-awareness output into the wiki vault:
 *
 *   1. PRISMSelfAwarenessEngine    → architecture/prism-self-awareness.md
 *      (a single canonical snapshot page, overwritten when capability counts change)
 *
 *   2. PRISMCreativeReasoningEngine + AGI master facades
 *                                  → decisions/agi-{system}-{slug}.md
 *      (one page per explore() decision, keyed by taskId)
 *
 *   3. CrossDisciplinaryDeepLearningEngine + LoRA adapters
 *                                  → patterns/{kind}-{slug}.md
 *      (kind ∈ {lora, dl}, one page per adapter / pattern)
 *
 *   4. SONA reinforcement trajectories
 *                                  → trajectories/sona-{date}-{slug}.md
 *      (one page per trajectory; slug regex forbids slashes so the date is folded
 *      into the flat slug rather than into a YYYY-MM-DD/ subdirectory)
 *
 * REAL-DATA discipline (mirrors WikiPatternHarvesterEngine): every input shape
 * is validated structurally; entries with missing required fields are dropped
 * with a warning rather than backfilled. The engine never invents counts,
 * confidences, or citations.
 *
 * Idempotent: identical input ⇒ no rewrite (writeIfChanged + sha-stable
 * frontmatter ordering). Atomic writes via tmp-rename.
 *
 * Index integration: every emitted page upserts a WikiEntry (slug, category,
 * summary, sources, confidence, last_verified) through WikiIndexMaintainerEngine
 * so `wiki/index.md` and `wiki/index.jsonl` stay in lock-step.
 *
 * Audit: a single log line per `syncAll()` run via WikiLogAppenderEngine.
 *
 * @module WikiSelfAwarenessSyncEngine
 */

import * as fs from "fs";
import * as path from "path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import {
  WikiIndexMaintainerEngine,
  type WikiEntry,
} from "./WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "./WikiLogAppenderEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Wiki vault root (resolved at module load — overridable per-call via options). */
export const DEFAULT_WIKI_ROOT = path.resolve(
  import.meta.dirname,
  "../../../knowledge/wiki"
);

/** AGI systems we accept as `system` on a decision payload. Keep aligned with milestone facades. */
export const SUPPORTED_AGI_SYSTEMS = [
  "mill",
  "turn",
  "wedm",
  "cad",
  "cam",
  "5axis",
  "lathe",
  "swiss",
  "cross-domain",
] as const;
export type AGISystem = (typeof SUPPORTED_AGI_SYSTEMS)[number];

/** Pattern kind — `lora` (adapter telemetry) or `dl` (cross-disciplinary DL output). */
export const PATTERN_KINDS = ["lora", "dl"] as const;
export type PatternKind = (typeof PATTERN_KINDS)[number];

/** ISO-8601 date matcher — used to normalise trajectory dates into the flat slug. */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Slug regex from WikiIndexMaintainerEngine (must stay in sync). */
const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,79}$/;

// ============================================================================
// INPUT TYPES
// ============================================================================

/** Snapshot of PRISM self-awareness — one page worth of capability inventory. */
export interface SelfAwarenessSnapshot {
  /** ISO timestamp of the snapshot capture. */
  timestamp: string;
  /** Live capability counts (engines/dispatchers/actions/registries). */
  capabilities: {
    engines: number;
    dispatchers: number;
    actions: number;
    registries?: number;
    hooks?: number;
    skills?: number;
  };
  /** Optional list of recommended AI features for the current session/task. */
  recommendedFeatures?: Array<{ feature: string; reason: string }>;
  /** Optional JM Die shop summary surfaced via getJMDieCustomerPath. */
  jmDie?: { customerCount?: number; programCount?: number; topCustomers?: string[] };
  /** Optional confidence in [0,1] scoring how sound the snapshot is. */
  confidence?: number;
  /** One-line plain-English summary used as the page summary. */
  summary: string;
}

/** Output of PRISMCreativeReasoningEngine.explore() (or any AGI master facade). */
export interface AGIDecision {
  /** Stable id used to dedupe across runs. */
  taskId: string;
  /** Which AGI system produced the decision. */
  system: AGISystem;
  /** The problem statement passed to explore(). */
  problem: string;
  /** Reasoning mode used — conventional / exploratory / hybrid / innovative / optimal. */
  mode: string;
  /** The chosen recommendation, in plain English. */
  recommendation: string;
  /** Confidence score in [0,1]. */
  confidence: number;
  /** Optional alternate paths considered (audit trail). */
  alternatives?: string[];
  /** Optional citations to wiki pages, engines, or registry entries. */
  citations?: string[];
}

/** A DL/LoRA pattern record produced by CrossDisciplinaryDeepLearningEngine etc. */
export interface DLPattern {
  /** Stable identifier — adapter name or pattern id. */
  id: string;
  /** lora = LoRA adapter telemetry; dl = generic DL pattern output. */
  kind: PatternKind;
  /** Human-readable name. */
  name: string;
  /** One-line description. */
  description: string;
  /** Optional accuracy in [0,1] from the adapter or model. */
  accuracy?: number;
  /** Optional sample count behind the pattern. */
  samples?: number;
  /** Optional rich metadata preserved in frontmatter. */
  metadata?: Record<string, unknown>;
}

/** SONA reinforcement trajectory record. */
export interface SONATrajectory {
  /** ISO date YYYY-MM-DD. Folded into slug to satisfy slug regex. */
  date: string;
  /** Task identifier the trajectory belongs to. */
  taskId: string;
  /** Number of trajectory steps. */
  steps: number;
  /** Final reward achieved (positive = success, negative = penalty). */
  reward: number;
  /** Was the trajectory considered successful? */
  success: boolean;
  /** Optional one-line outcome description. */
  outcome?: string;
  /** Optional rich metadata preserved verbatim. */
  metadata?: Record<string, unknown>;
}

/** Composite payload accepted by syncAll(). All sub-fields optional. */
export interface SyncPayload {
  snapshot?: SelfAwarenessSnapshot;
  decisions?: AGIDecision[];
  patterns?: DLPattern[];
  trajectories?: SONATrajectory[];
}

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface SyncFileResult {
  /** Slug entered into the wiki index. */
  slug: string;
  /** Absolute path of the markdown file emitted. */
  file: string;
  /** Whether the file was actually written this run (false when content unchanged). */
  written: boolean;
  /** Category used in the wiki/index.md upsert. */
  category: string;
  /** Final confidence used for the index entry. */
  confidence: number;
}

export interface SyncReport {
  snapshot?: SyncFileResult;
  decisions: SyncFileResult[];
  patterns: SyncFileResult[];
  trajectories: SyncFileResult[];
  filesWritten: number;
  skipped: number;
  warnings: string[];
}

export interface SyncOptions {
  /** Override wiki vault root (tests + sandboxes). */
  wikiRoot?: string;
  /** Optional today (YYYY-MM-DD). Defaults to current UTC date. */
  today?: string;
  /** Caller agent identifier — recorded in frontmatter + wiki/log.md. */
  agent?: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WikiSelfAwarenessSyncEngine extends BaseEngine {
  private readonly indexEngine: WikiIndexMaintainerEngine;
  private readonly logEngine: WikiLogAppenderEngine;

  constructor(opts: {
    indexEngine?: WikiIndexMaintainerEngine;
    logEngine?: WikiLogAppenderEngine;
  } = {}) {
    super({
      name: "WikiSelfAwarenessSyncEngine",
      version: "1.0.0",
      domain: "knowledge",
      description:
        "Bridges PRISM self-awareness, AGI/Creative-Reasoning decisions, DL/LoRA patterns, and SONA trajectories into the wiki vault.",
    });
    this.indexEngine = opts.indexEngine ?? new WikiIndexMaintainerEngine();
    this.logEngine = opts.logEngine ?? new WikiLogAppenderEngine();
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "syncSnapshot", description: "Materialise architecture/prism-self-awareness.md from a SelfAwarenessSnapshot." },
      { name: "syncDecisions", description: "Materialise decisions/agi-{system}-{slug}.md from AGIDecision[]." },
      { name: "syncPatterns", description: "Materialise patterns/{lora|dl}-{slug}.md from DLPattern[]." },
      { name: "syncTrajectories", description: "Materialise trajectories/sona-{date}-{slug}.md from SONATrajectory[]." },
      { name: "syncAll", description: "Run every sub-sync that has input on the payload, log once." },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<SyncReport> {
    const i = input as { payload: SyncPayload; options?: SyncOptions };
    return this.syncAll(i.payload ?? {}, i.options ?? {});
  }

  /**
   * Run every sub-sync that has data on the payload, then append a single
   * audit log line summarising what was emitted.
   */
  async syncAll(payload: SyncPayload, options: SyncOptions = {}): Promise<SyncReport> {
    const wikiRoot = options.wikiRoot ?? DEFAULT_WIKI_ROOT;
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const agent = options.agent ?? "claude:wiki-self-awareness-sync";
    const warnings: string[] = [];

    const upsertEntries: WikiEntry[] = [];

    let snapshotResult: SyncFileResult | undefined;
    if (payload.snapshot) {
      const r = this.emitSnapshot(payload.snapshot, wikiRoot, today, agent, warnings);
      if (r) {
        snapshotResult = r;
        upsertEntries.push(toWikiEntry(r, payload.snapshot.summary, ["self-awareness"], today, agent));
      }
    }

    const decisionResults: SyncFileResult[] = [];
    for (const dec of payload.decisions ?? []) {
      const r = this.emitDecision(dec, wikiRoot, today, agent, warnings);
      if (r) {
        decisionResults.push(r);
        upsertEntries.push(toWikiEntry(r, truncate(dec.recommendation, 160), [`agi:${dec.system}`, `task:${dec.taskId}`], today, agent));
      }
    }

    const patternResults: SyncFileResult[] = [];
    for (const pat of payload.patterns ?? []) {
      const r = this.emitPattern(pat, wikiRoot, today, agent, warnings);
      if (r) {
        patternResults.push(r);
        upsertEntries.push(toWikiEntry(r, truncate(pat.description, 160), [`pattern:${pat.kind}`, `id:${pat.id}`], today, agent));
      }
    }

    const trajectoryResults: SyncFileResult[] = [];
    for (const traj of payload.trajectories ?? []) {
      const r = this.emitTrajectory(traj, wikiRoot, today, agent, warnings);
      if (r) {
        trajectoryResults.push(r);
        upsertEntries.push(
          toWikiEntry(
            r,
            truncate(traj.outcome ?? `SONA ${traj.success ? "success" : "fail"} reward=${traj.reward}`, 160),
            [`sona:${traj.date}`, `task:${traj.taskId}`],
            today,
            agent
          )
        );
      }
    }

    if (upsertEntries.length > 0) {
      await this.indexEngine.upsertMany(upsertEntries);
    }

    const all = [
      ...(snapshotResult ? [snapshotResult] : []),
      ...decisionResults,
      ...patternResults,
      ...trajectoryResults,
    ];
    const filesWritten = all.filter((r) => r.written).length;
    const totalInputs =
      (payload.snapshot ? 1 : 0) +
      (payload.decisions?.length ?? 0) +
      (payload.patterns?.length ?? 0) +
      (payload.trajectories?.length ?? 0);
    const skipped = totalInputs - all.length;

    if (all.length > 0) {
      await this.logEngine.append({
        date: today,
        op: "sync:self-awareness",
        title: `${all.length} pages (${filesWritten} new files; snap=${snapshotResult ? 1 : 0}, dec=${decisionResults.length}, pat=${patternResults.length}, traj=${trajectoryResults.length})`,
        agent,
      });
    }

    return {
      snapshot: snapshotResult,
      decisions: decisionResults,
      patterns: patternResults,
      trajectories: trajectoryResults,
      filesWritten,
      skipped,
      warnings,
    };
  }

  // ---- per-source emitters ------------------------------------------------

  private emitSnapshot(
    snap: SelfAwarenessSnapshot,
    wikiRoot: string,
    today: string,
    agent: string,
    warnings: string[]
  ): SyncFileResult | undefined {
    if (!snap.timestamp || !snap.capabilities || !snap.summary) {
      warnings.push("dropped snapshot — missing timestamp / capabilities / summary");
      return undefined;
    }
    const c = snap.capabilities;
    if (
      typeof c.engines !== "number" ||
      typeof c.dispatchers !== "number" ||
      typeof c.actions !== "number"
    ) {
      warnings.push("dropped snapshot — capabilities must include numeric engines/dispatchers/actions");
      return undefined;
    }
    const slug = "prism-self-awareness";
    if (!SLUG_RE.test(slug)) {
      warnings.push(`dropped snapshot — slug '${slug}' fails wiki slug regex`);
      return undefined;
    }
    const file = path.join(wikiRoot, "architecture", `${slug}.md`);
    const body = renderSnapshotMarkdown({ snap, today, agent, slug });
    const written = writeIfChanged(file, body);
    return {
      slug,
      file,
      written,
      category: "architecture",
      confidence: clamp01(snap.confidence ?? 0.9),
    };
  }

  private emitDecision(
    dec: AGIDecision,
    wikiRoot: string,
    today: string,
    agent: string,
    warnings: string[]
  ): SyncFileResult | undefined {
    if (!dec || typeof dec !== "object") {
      warnings.push("dropped decision — not an object");
      return undefined;
    }
    if (!dec.taskId || !dec.system || !dec.problem || !dec.recommendation) {
      warnings.push(`dropped decision '${dec.taskId ?? "?"}' — missing required fields`);
      return undefined;
    }
    if (!SUPPORTED_AGI_SYSTEMS.includes(dec.system)) {
      warnings.push(`dropped decision '${dec.taskId}' — unsupported system '${dec.system}'`);
      return undefined;
    }
    if (typeof dec.confidence !== "number" || !Number.isFinite(dec.confidence)) {
      warnings.push(`dropped decision '${dec.taskId}' — non-finite confidence`);
      return undefined;
    }
    const slug = `agi-${dec.system}-${slugify(dec.taskId)}`;
    if (!SLUG_RE.test(slug)) {
      warnings.push(`dropped decision '${dec.taskId}' — slug '${slug}' fails wiki slug regex`);
      return undefined;
    }
    const file = path.join(wikiRoot, "decisions", `${slug}.md`);
    const body = renderDecisionMarkdown({ dec, today, agent, slug });
    const written = writeIfChanged(file, body);
    return {
      slug,
      file,
      written,
      category: "decisions",
      confidence: clamp01(dec.confidence),
    };
  }

  private emitPattern(
    pat: DLPattern,
    wikiRoot: string,
    today: string,
    agent: string,
    warnings: string[]
  ): SyncFileResult | undefined {
    if (!pat || typeof pat !== "object") {
      warnings.push("dropped pattern — not an object");
      return undefined;
    }
    if (!pat.id || !pat.kind || !pat.name || !pat.description) {
      warnings.push(`dropped pattern '${pat.id ?? pat.name ?? "?"}' — missing required fields`);
      return undefined;
    }
    if (!PATTERN_KINDS.includes(pat.kind)) {
      warnings.push(`dropped pattern '${pat.id}' — unsupported kind '${pat.kind}'`);
      return undefined;
    }
    const slug = `${pat.kind}-${slugify(pat.id)}`;
    if (!SLUG_RE.test(slug)) {
      warnings.push(`dropped pattern '${pat.id}' — slug '${slug}' fails wiki slug regex`);
      return undefined;
    }
    const file = path.join(wikiRoot, "patterns", `${slug}.md`);
    const body = renderPatternMarkdown({ pat, today, agent, slug });
    const written = writeIfChanged(file, body);
    // Confidence: prefer explicit accuracy, otherwise default to 0.7.
    const confidence =
      typeof pat.accuracy === "number" && Number.isFinite(pat.accuracy)
        ? clamp01(pat.accuracy)
        : 0.7;
    return { slug, file, written, category: "patterns", confidence };
  }

  private emitTrajectory(
    traj: SONATrajectory,
    wikiRoot: string,
    today: string,
    agent: string,
    warnings: string[]
  ): SyncFileResult | undefined {
    if (!traj || typeof traj !== "object") {
      warnings.push("dropped trajectory — not an object");
      return undefined;
    }
    if (!traj.date || !traj.taskId) {
      warnings.push(`dropped trajectory '${traj.taskId ?? "?"}' — missing date or taskId`);
      return undefined;
    }
    if (!ISO_DATE_RE.test(traj.date)) {
      warnings.push(`dropped trajectory '${traj.taskId}' — date '${traj.date}' must be YYYY-MM-DD`);
      return undefined;
    }
    if (
      typeof traj.steps !== "number" ||
      !Number.isFinite(traj.steps) ||
      typeof traj.reward !== "number" ||
      !Number.isFinite(traj.reward) ||
      typeof traj.success !== "boolean"
    ) {
      warnings.push(`dropped trajectory '${traj.taskId}' — non-finite steps/reward or non-boolean success`);
      return undefined;
    }
    const slug = `sona-${traj.date}-${slugify(traj.taskId)}`;
    if (!SLUG_RE.test(slug)) {
      warnings.push(`dropped trajectory '${traj.taskId}' — slug '${slug}' fails wiki slug regex`);
      return undefined;
    }
    const file = path.join(wikiRoot, "trajectories", `${slug}.md`);
    const body = renderTrajectoryMarkdown({ traj, today, agent, slug });
    const written = writeIfChanged(file, body);
    // Confidence proxy: success → 0.9, failure → 0.3 (record kept either way).
    const confidence = traj.success ? 0.9 : 0.3;
    return { slug, file, written, category: "trajectories", confidence };
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

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
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

function escapeYaml(s: string): string {
  if (/[:#\n"]/.test(s)) return JSON.stringify(s);
  return s;
}

function toWikiEntry(
  r: SyncFileResult,
  summary: string,
  sources: string[],
  today: string,
  agent: string
): WikiEntry {
  return {
    slug: r.slug,
    category: r.category,
    summary: truncate(summary, 160),
    sources,
    confidence: r.confidence,
    last_verified: today,
    source: agent,
  };
}

// ============================================================================
// RENDERERS
// ============================================================================

function renderSnapshotMarkdown(args: {
  snap: SelfAwarenessSnapshot;
  today: string;
  agent: string;
  slug: string;
}): string {
  const { snap, today, agent, slug } = args;
  const c = snap.capabilities;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${slug}`);
  lines.push("category: architecture");
  lines.push(`name: PRISM Self-Awareness Snapshot`);
  lines.push(`captured_at: ${snap.timestamp}`);
  lines.push(`engines: ${c.engines}`);
  lines.push(`dispatchers: ${c.dispatchers}`);
  lines.push(`actions: ${c.actions}`);
  if (typeof c.registries === "number") lines.push(`registries: ${c.registries}`);
  if (typeof c.hooks === "number") lines.push(`hooks: ${c.hooks}`);
  if (typeof c.skills === "number") lines.push(`skills: ${c.skills}`);
  lines.push(`confidence: ${clamp01(snap.confidence ?? 0.9).toFixed(3)}`);
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# PRISM Self-Awareness — ${snap.timestamp}`);
  lines.push("");
  lines.push(snap.summary);
  lines.push("");
  lines.push("## Capability inventory");
  lines.push("");
  lines.push(`- Engines: \`${c.engines}\``);
  lines.push(`- Dispatchers: \`${c.dispatchers}\``);
  lines.push(`- Actions: \`${c.actions}\``);
  if (typeof c.registries === "number") lines.push(`- Registries: \`${c.registries}\``);
  if (typeof c.hooks === "number") lines.push(`- Hooks: \`${c.hooks}\``);
  if (typeof c.skills === "number") lines.push(`- Skills: \`${c.skills}\``);
  lines.push("");
  if (snap.recommendedFeatures && snap.recommendedFeatures.length > 0) {
    lines.push("## Recommended AI features (this session)");
    lines.push("");
    for (const r of snap.recommendedFeatures) {
      lines.push(`- **${r.feature}** — ${r.reason}`);
    }
    lines.push("");
  }
  if (snap.jmDie) {
    lines.push("## JM Die test shop");
    lines.push("");
    if (typeof snap.jmDie.customerCount === "number") {
      lines.push(`- Customers indexed: \`${snap.jmDie.customerCount}\``);
    }
    if (typeof snap.jmDie.programCount === "number") {
      lines.push(`- Programs indexed: \`${snap.jmDie.programCount}\``);
    }
    if (snap.jmDie.topCustomers && snap.jmDie.topCustomers.length > 0) {
      lines.push(`- Top customers: ${snap.jmDie.topCustomers.map((s) => `\`${s}\``).join(", ")}`);
    }
    lines.push("");
  }
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiSelfAwarenessSyncEngine on ${today} (agent: \`${agent}\`).`);
  lines.push("");
  return lines.join("\n");
}

function renderDecisionMarkdown(args: {
  dec: AGIDecision;
  today: string;
  agent: string;
  slug: string;
}): string {
  const { dec, today, agent, slug } = args;
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${slug}`);
  lines.push("category: decisions");
  lines.push(`name: ${escapeYaml(`AGI decision ${dec.taskId} (${dec.system})`)}`);
  lines.push(`agi_system: ${dec.system}`);
  lines.push(`task_id: ${dec.taskId}`);
  lines.push(`mode: ${escapeYaml(dec.mode)}`);
  lines.push(`confidence: ${clamp01(dec.confidence).toFixed(3)}`);
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# AGI decision ${dec.taskId} — ${dec.system}`);
  lines.push("");
  lines.push("## Problem");
  lines.push("");
  lines.push(dec.problem);
  lines.push("");
  lines.push("## Recommendation");
  lines.push("");
  lines.push(dec.recommendation);
  lines.push("");
  lines.push("## Reasoning mode");
  lines.push("");
  lines.push(`- Mode: \`${dec.mode}\``);
  lines.push(`- Confidence: \`${clamp01(dec.confidence).toFixed(3)}\``);
  lines.push("");
  if (dec.alternatives && dec.alternatives.length > 0) {
    lines.push("## Alternatives considered");
    lines.push("");
    for (const a of dec.alternatives) lines.push(`- ${a}`);
    lines.push("");
  }
  if (dec.citations && dec.citations.length > 0) {
    lines.push("## Citations");
    lines.push("");
    for (const c of dec.citations) lines.push(`- ${c}`);
    lines.push("");
  }
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiSelfAwarenessSyncEngine on ${today} (agent: \`${agent}\`).`);
  lines.push("");
  return lines.join("\n");
}

function renderPatternMarkdown(args: {
  pat: DLPattern;
  today: string;
  agent: string;
  slug: string;
}): string {
  const { pat, today, agent, slug } = args;
  const meta = pat.metadata ?? {};
  const metaLines = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${slug}`);
  lines.push("category: patterns");
  lines.push(`name: ${escapeYaml(pat.name)}`);
  lines.push(`pattern_kind: ${pat.kind}`);
  lines.push(`pattern_id: ${pat.id}`);
  if (typeof pat.accuracy === "number" && Number.isFinite(pat.accuracy)) {
    lines.push(`accuracy: ${clamp01(pat.accuracy).toFixed(3)}`);
  }
  if (typeof pat.samples === "number" && Number.isFinite(pat.samples)) {
    lines.push(`samples: ${pat.samples}`);
  }
  if (metaLines.length > 0) {
    lines.push("metadata:");
    for (const ml of metaLines) lines.push(`  ${ml}`);
  }
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# ${pat.name}`);
  lines.push("");
  lines.push(pat.description);
  lines.push("");
  lines.push("## Telemetry");
  lines.push("");
  lines.push(`- Kind: \`${pat.kind}\``);
  if (typeof pat.accuracy === "number" && Number.isFinite(pat.accuracy)) {
    lines.push(`- Accuracy: \`${clamp01(pat.accuracy).toFixed(3)}\``);
  }
  if (typeof pat.samples === "number" && Number.isFinite(pat.samples)) {
    lines.push(`- Samples: \`${pat.samples}\``);
  }
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiSelfAwarenessSyncEngine on ${today} (agent: \`${agent}\`).`);
  lines.push(`- Pattern id: \`${pat.id}\``);
  lines.push("");
  return lines.join("\n");
}

function renderTrajectoryMarkdown(args: {
  traj: SONATrajectory;
  today: string;
  agent: string;
  slug: string;
}): string {
  const { traj, today, agent, slug } = args;
  const meta = traj.metadata ?? {};
  const metaLines = Object.entries(meta).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: ${slug}`);
  lines.push("category: trajectories");
  lines.push(`name: ${escapeYaml(`SONA trajectory ${traj.date} ${traj.taskId}`)}`);
  lines.push(`trajectory_date: ${traj.date}`);
  lines.push(`task_id: ${traj.taskId}`);
  lines.push(`steps: ${traj.steps}`);
  lines.push(`reward: ${traj.reward}`);
  lines.push(`success: ${traj.success ? "true" : "false"}`);
  if (metaLines.length > 0) {
    lines.push("metadata:");
    for (const ml of metaLines) lines.push(`  ${ml}`);
  }
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("---");
  lines.push("");
  lines.push(`# SONA trajectory — ${traj.date} / ${traj.taskId}`);
  lines.push("");
  if (traj.outcome) {
    lines.push(traj.outcome);
    lines.push("");
  }
  lines.push("## Run record");
  lines.push("");
  lines.push(`- Steps: \`${traj.steps}\``);
  lines.push(`- Reward: \`${traj.reward}\``);
  lines.push(`- Success: \`${traj.success ? "true" : "false"}\``);
  lines.push("");
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiSelfAwarenessSyncEngine on ${today} (agent: \`${agent}\`).`);
  lines.push("");
  return lines.join("\n");
}

// Default singleton — match the project pattern.
export const wikiSelfAwarenessSyncEngine = new WikiSelfAwarenessSyncEngine();
