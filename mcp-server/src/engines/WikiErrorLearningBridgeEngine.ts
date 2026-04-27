// WIRE-EXEMPT: prism_wiki dispatcher ships in U-WIKI06; this engine is consumed
// by /wiki-bridge-errors (U-WIKI06) and the wiki-harvest-h-drive.mjs cron until then.
/**
 * WikiErrorLearningBridgeEngine — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * Bridges the four PRISM error / lesson engines into wiki/lessons/*.md:
 *
 *   CADTrialErrorLearningEngine.extractPatterns()  → FailurePattern[]
 *   ChainFailureRecoveryEngine.recover() / .getHealthSummary()
 *                                                  → StepFailure + ChainHealthSummary
 *   ErrorContext / ErrorExplainer  (raw error logs)
 *                                                  → contextualised entries
 *   LessonRendererEngine.renderLesson()            → pre-rendered lessons
 *
 * Each ingested record is normalised into a `WikiLesson` and emitted as one
 * markdown file under `knowledge/wiki/lessons/lesson-{slug}.md`. Every lesson
 * carries:
 *   - a `triggers` frontmatter list cross-linking back to the originating
 *     decision / pattern / chain
 *   - a `last_seen` ISO date; the harvester filters to the trailing
 *     `LESSON_RECENCY_WINDOW_DAYS` window (30 by default)
 *   - the source category so future audits can verify lineage
 *
 * REAL-DATA discipline:
 *   - The bridge does NOT invent error counts or rates. If an inbound record
 *     lacks `failures`/`failureRate`, it is dropped with a warning.
 *   - Idempotent: identical inbound input → no rewrite.
 *
 * @module WikiErrorLearningBridgeEngine
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import {
  WikiIndexMaintainerEngine,
  type WikiEntry,
} from "./WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "./WikiLogAppenderEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Trailing window the bridge keeps when ingesting error logs (days). */
export const LESSON_RECENCY_WINDOW_DAYS = 30;

/** Minimum lessons required by the milestone exit condition. */
export const MIN_LESSONS_PER_BRIDGE_RUN = 5;

export const DEFAULT_LESSONS_DIR = path.resolve(
  import.meta.dirname,
  "../../../knowledge/wiki/lessons"
);

export const LESSON_CATEGORIES = [
  "cad-failure",
  "chain-failure",
  "error-context",
  "rendered",
] as const;
export type LessonCategory = (typeof LESSON_CATEGORIES)[number];

// ============================================================================
// TYPES
// ============================================================================

export interface WikiLesson {
  slug: string;
  category: LessonCategory;
  title: string;
  summary: string;
  /** ISO date (YYYY-MM-DD) of the most recent occurrence. */
  lastSeen: string;
  /** Cross-reference back to the originating wiki/decisions/patterns/chains. */
  triggers: string[];
  /** Free-form body — pre-rendered markdown excerpt or extracted error trace. */
  body: string;
  /** Caller-supplied metadata preserved verbatim. */
  metadata?: Record<string, unknown>;
}

/** Inbound record from CADTrialErrorLearningEngine.extractPatterns(). */
export interface CADFailurePatternInput {
  category: string;
  failures: number;
  successes: number;
  failureRate: number;
  confidence: number;
  exampleErrors: string[];
  byPartType?: Record<string, { failures: number; successes: number; rate: number }>;
  byGenerator?: Record<string, { failures: number; successes: number; rate: number }>;
  lastSeen?: string;
}

/** Inbound record from ChainFailureRecoveryEngine. */
export interface ChainFailureInput {
  chainId: string;
  stepId: string;
  stepAction: string;
  errorMessage: string;
  errorCode?: string;
  timestamp: string;
  health?: {
    totalExecutions: number;
    totalFailures: number;
    failureRate: number;
    mostFailingStep: string | null;
  };
}

/** Inbound rendered lesson from LessonRendererEngine. */
export interface RenderedLessonInput {
  lessonId: string;
  title: string;
  summary: string;
  bodyMarkdown: string;
  generatedAt: string;
  formulaIds?: string[];
}

/** Generic error log line from ErrorContext / ErrorExplainer. */
export interface ErrorLogInput {
  timestamp: string;
  message: string;
  code?: string;
  context?: Record<string, unknown>;
  triggers?: string[];
}

export interface BridgeOptions {
  lessonsDir?: string;
  /** Override "today" — primarily for deterministic tests. */
  today?: string;
  /** Caller agent string — recorded in wiki/log.md and lesson frontmatter. */
  agent?: string;
  /** Optional injected index/log engines (test sandbox). */
  indexEngine?: WikiIndexMaintainerEngine;
  logEngine?: WikiLogAppenderEngine;
  /** Override the recency window (days). */
  windowDays?: number;
}

export interface BridgeInput {
  cadPatterns?: CADFailurePatternInput[];
  chainFailures?: ChainFailureInput[];
  renderedLessons?: RenderedLessonInput[];
  errorLogs?: ErrorLogInput[];
}

export interface BridgeResult {
  written: number;
  skipped: number;
  outOfWindow: number;
  lessons: WikiLesson[];
  warnings: string[];
  meetsMinimum: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class WikiErrorLearningBridgeEngine extends BaseEngine {
  private readonly indexEngine: WikiIndexMaintainerEngine;
  private readonly logEngine: WikiLogAppenderEngine;

  constructor(opts: {
    indexEngine?: WikiIndexMaintainerEngine;
    logEngine?: WikiLogAppenderEngine;
  } = {}) {
    super({
      name: "WikiErrorLearningBridgeEngine",
      version: "1.0.0",
      domain: "knowledge",
      description:
        "Bridges CADTrialErrorLearning / ChainFailureRecovery / ErrorContext / LessonRenderer outputs to wiki/lessons/.",
    });
    this.indexEngine = opts.indexEngine ?? new WikiIndexMaintainerEngine();
    this.logEngine = opts.logEngine ?? new WikiLogAppenderEngine();
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "bridge", description: "Materialise wiki/lessons/*.md from real engine outputs." },
      { name: "filterRecent", description: "Drop entries older than the recency window." },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(input: unknown): Promise<BridgeResult> {
    const { cadPatterns, chainFailures, renderedLessons, errorLogs, options } =
      (input as BridgeInput & { options?: BridgeOptions }) ?? {};
    return this.bridge(
      { cadPatterns, chainFailures, renderedLessons, errorLogs },
      options ?? {}
    );
  }

  /** Materialise lessons from the four input streams. Idempotent. */
  async bridge(input: BridgeInput, options: BridgeOptions = {}): Promise<BridgeResult> {
    const lessonsDir = options.lessonsDir ?? DEFAULT_LESSONS_DIR;
    const today = options.today ?? new Date().toISOString().slice(0, 10);
    const agent = options.agent ?? "claude:wiki-error-bridge";
    const windowDays = options.windowDays ?? LESSON_RECENCY_WINDOW_DAYS;
    const indexEngine = options.indexEngine ?? this.indexEngine;
    const logEngine = options.logEngine ?? this.logEngine;
    const warnings: string[] = [];
    const lessons: WikiLesson[] = [];
    let outOfWindow = 0;

    fs.mkdirSync(lessonsDir, { recursive: true });

    for (const cad of input.cadPatterns ?? []) {
      const lesson = normaliseCADPattern(cad, today, warnings);
      if (lesson === null) continue;
      if (!isWithinWindow(lesson.lastSeen, today, windowDays)) {
        outOfWindow++;
        continue;
      }
      lessons.push(lesson);
    }

    for (const chain of input.chainFailures ?? []) {
      const lesson = normaliseChainFailure(chain, warnings);
      if (lesson === null) continue;
      if (!isWithinWindow(lesson.lastSeen, today, windowDays)) {
        outOfWindow++;
        continue;
      }
      lessons.push(lesson);
    }

    for (const rl of input.renderedLessons ?? []) {
      const lesson = normaliseRenderedLesson(rl, warnings);
      if (lesson === null) continue;
      if (!isWithinWindow(lesson.lastSeen, today, windowDays)) {
        outOfWindow++;
        continue;
      }
      lessons.push(lesson);
    }

    for (const log of input.errorLogs ?? []) {
      const lesson = normaliseErrorLog(log, warnings);
      if (lesson === null) continue;
      if (!isWithinWindow(lesson.lastSeen, today, windowDays)) {
        outOfWindow++;
        continue;
      }
      lessons.push(lesson);
    }

    let written = 0;
    let skipped = 0;
    const upserts: WikiEntry[] = [];

    for (const l of lessons) {
      const filePath = path.join(lessonsDir, `lesson-${l.slug}.md`);
      const body = renderLessonMarkdown(l, today, agent);
      if (writeIfChanged(filePath, body)) {
        written++;
      } else {
        skipped++;
      }
      upserts.push({
        slug: `lesson-${l.slug}`,
        category: "lessons",
        summary: truncate(l.summary, 160),
        sources: l.triggers.length > 0 ? l.triggers : [`category:${l.category}`],
        confidence: 0.9,
        last_verified: today,
        source: agent,
      });
    }

    if (upserts.length > 0) {
      await indexEngine.upsertMany(upserts);
    }

    if (lessons.length > 0) {
      await logEngine.append({
        date: today,
        op: "bridge:lessons",
        title: `${lessons.length} lessons (${written} new files, ${outOfWindow} outside window)`,
        agent,
      });
    }

    return {
      written,
      skipped,
      outOfWindow,
      lessons,
      warnings,
      meetsMinimum: lessons.length >= MIN_LESSONS_PER_BRIDGE_RUN,
    };
  }
}

// ============================================================================
// NORMALISERS
// ============================================================================

function normaliseCADPattern(
  cad: CADFailurePatternInput,
  today: string,
  warnings: string[]
): WikiLesson | null {
  if (!cad || typeof cad !== "object") {
    warnings.push("dropped CAD pattern: not an object");
    return null;
  }
  if (typeof cad.failures !== "number" || typeof cad.failureRate !== "number") {
    warnings.push(`dropped CAD pattern '${cad.category}': missing failures/failureRate`);
    return null;
  }
  const slug = slugify(`cad-${cad.category}`);
  const examples = (cad.exampleErrors ?? []).slice(0, 3).map((e) => `- ${e}`).join("\n");
  return {
    slug,
    category: "cad-failure",
    title: `CAD failure: ${cad.category}`,
    summary: `${cad.failures} failures / ${cad.successes} successes — failure rate ${(cad.failureRate * 100).toFixed(1)}%`,
    lastSeen: cad.lastSeen ?? today,
    triggers: [`engine:CADTrialErrorLearningEngine`, `category:${cad.category}`],
    body: examples.length > 0 ? `## Recent example errors\n\n${examples}\n` : "",
    metadata: {
      failureRate: cad.failureRate,
      confidence: cad.confidence,
    },
  };
}

function normaliseChainFailure(
  chain: ChainFailureInput,
  warnings: string[]
): WikiLesson | null {
  if (!chain || !chain.chainId || !chain.stepId || !chain.errorMessage || !chain.timestamp) {
    warnings.push("dropped chain failure: missing required fields");
    return null;
  }
  const day = chain.timestamp.slice(0, 10);
  const slug = slugify(`chain-${chain.chainId}-${chain.stepId}-${hashShort(chain.errorMessage)}`);
  return {
    slug,
    category: "chain-failure",
    title: `Chain failure: ${chain.chainId} / ${chain.stepAction}`,
    summary: `${chain.stepAction} failed at step ${chain.stepId}: ${truncate(chain.errorMessage, 120)}`,
    lastSeen: day,
    triggers: [`engine:ChainFailureRecoveryEngine`, `chain:${chain.chainId}`, `step:${chain.stepId}`],
    body: `## Error message\n\n\`\`\`\n${chain.errorMessage}\n\`\`\`\n${chain.errorCode ? `\nError code: \`${chain.errorCode}\`\n` : ""}`,
    metadata: chain.health
      ? {
          chainHealthFailureRate: chain.health.failureRate,
          chainHealthMostFailingStep: chain.health.mostFailingStep,
        }
      : undefined,
  };
}

function normaliseRenderedLesson(
  rl: RenderedLessonInput,
  warnings: string[]
): WikiLesson | null {
  if (!rl || !rl.lessonId || !rl.title || !rl.bodyMarkdown || !rl.generatedAt) {
    warnings.push("dropped rendered lesson: missing required fields");
    return null;
  }
  return {
    slug: slugify(`rendered-${rl.lessonId}`),
    category: "rendered",
    title: rl.title,
    summary: rl.summary,
    lastSeen: rl.generatedAt.slice(0, 10),
    triggers: [`engine:LessonRendererEngine`, ...(rl.formulaIds ?? []).map((f) => `formula:${f}`)],
    body: rl.bodyMarkdown,
  };
}

function normaliseErrorLog(
  log: ErrorLogInput,
  warnings: string[]
): WikiLesson | null {
  if (!log || !log.message || !log.timestamp) {
    warnings.push("dropped error log: missing required fields");
    return null;
  }
  const day = log.timestamp.slice(0, 10);
  const slug = slugify(`errlog-${hashShort(log.message)}-${day}`);
  return {
    slug,
    category: "error-context",
    title: `Error log: ${truncate(log.message, 60)}`,
    summary: log.code ? `${log.code}: ${truncate(log.message, 120)}` : truncate(log.message, 160),
    lastSeen: day,
    triggers: log.triggers ?? ["source:ErrorContext"],
    body: `## Message\n\n\`\`\`\n${log.message}\n\`\`\`\n`,
    metadata: log.context,
  };
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

export function isWithinWindow(lastSeenIso: string, todayIso: string, windowDays: number): boolean {
  const last = Date.parse(lastSeenIso + "T00:00:00Z");
  const today = Date.parse(todayIso + "T00:00:00Z");
  if (!Number.isFinite(last) || !Number.isFinite(today)) return false;
  const diffMs = today - last;
  if (diffMs < 0) return true; // future-dated entries fall through
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= windowDays;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function hashShort(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
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

function renderLessonMarkdown(l: WikiLesson, today: string, agent: string): string {
  const lines: string[] = [];
  lines.push("---");
  lines.push(`slug: lesson-${l.slug}`);
  lines.push("category: lessons");
  lines.push(`title: ${escapeYaml(l.title)}`);
  lines.push(`source_category: ${l.category}`);
  lines.push(`last_seen: ${l.lastSeen}`);
  lines.push(`last_verified: ${today}`);
  lines.push(`verified_by: ${agent}`);
  lines.push("triggers:");
  for (const t of l.triggers) lines.push(`  - ${t}`);
  if (l.metadata && Object.keys(l.metadata).length > 0) {
    lines.push("metadata:");
    for (const [k, v] of Object.entries(l.metadata)) {
      lines.push(`  ${k}: ${JSON.stringify(v)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${l.title}`);
  lines.push("");
  lines.push(l.summary);
  lines.push("");
  if (l.body) {
    lines.push(l.body.trimEnd());
    lines.push("");
  }
  lines.push("## Provenance");
  lines.push("");
  lines.push(`- Generated by WikiErrorLearningBridgeEngine on ${today} (agent: \`${agent}\`).`);
  for (const t of l.triggers) lines.push(`- Trigger: \`${t}\``);
  lines.push("");
  // helper to silence unused-var linters
  void clamp;
  return lines.join("\n");
}

function escapeYaml(s: string): string {
  if (/[:#\n"]/.test(s)) return JSON.stringify(s);
  return s;
}

// Default singleton — match the project pattern.
export const wikiErrorLearningBridgeEngine = new WikiErrorLearningBridgeEngine();
