/**
 * Knowledge Injection Pipeline Engine — closed-loop knowledge → node injection
 *
 * Closes the open loop in KNOWLEDGE-CONVERSION-MS0. Extraction + routing already
 * exist (`course-data-router-lib` classifies extracted knowledge into 6 PRISM
 * node-types across 3 lanes). What was missing — and what this engine adds:
 *
 *   1. INJECTION    — route each classified asset to its consuming surface and
 *                     record the injection in an append-only ledger.
 *   2. CONSUMER-BIND — register the injected knowledge to THREE systems so a
 *                     node can actually find and use it:
 *                       • PRISM OS     — `knowledge/wiki/os/knowledge/*.md`
 *                       • Obsidian brain — `knowledge/memories/reference/*.md`
 *                       • PRISM AI      — an AI-discoverable registry that
 *                         `prismSelfAwarenessEngine.recommendAIFeatures` reads
 *   3. FEEDBACK     — an outcome ledger; when a node consumes injected
 *                     knowledge it records whether it helped, and
 *                     `feedbackSummary()` joins injection↔outcome to produce
 *                     the closed-loop metric (help-rate by lane).
 *
 * Design (per the RGS-TOOL-AUTOINVOKE-MS1 lesson — "pure core + injected
 * readers MUST ship one real-data E2E test"):
 *   - `plan()` and `feedbackSummary()`'s join math are PURE — hermetically
 *     testable with no disk.
 *   - All IO (`executeInjection`, `recordInjection`, `recordOutcome`, the
 *     ledger readers) takes an injectable `roots` object so tests run in a
 *     temp dir and the one real-data test hits the live tree.
 *
 * NOT a duplicate of `CAMTribalKnowledgeInjectionEngine` — that injects CAM
 * tribal tips into CAM workflows; this is the general routing→inject→bind→
 * feedback orchestrator for any extracted-knowledge asset.
 *
 * No physics constants — this is a knowledge-flow orchestrator.
 *
 * KNOWLEDGE-CONVERSION-MS0/U-KIP01: Created 2026-05-17 (slot india, /forge7).
 *
 * @module engines/KnowledgeInjectionPipelineEngine
 */

import { createHash } from "node:crypto";
import {
  readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync,
} from "node:fs";
import { resolve, dirname } from "node:path";

// ─── domain types ──────────────────────────────────────────────────

/** A classified knowledge asset — the output shape of course-data-router-lib. */
export interface RoutedAsset {
  kind: string;          // algorithm | engine | formula | knowledge | skill | pipeline | technique
  name: string;
  courseId?: string;
  domains?: string[];
  mfgRelevance?: number;
  targetNodeType?: string;
  targetSurface?: string;
  decision: string;      // FORGE-QUEUE | TRIBAL-SHIPPED | DUPLICATE | PORT-CANDIDATE | DISCARD
  lane: string;          // A | B | C | none
  recommendedAction?: string;
}

/** A binding record — one injected-knowledge registration on one system. */
export interface SurfaceBinding {
  system: "prism-os" | "obsidian" | "prism-ai";
  path: string;          // repo-relative target file
  action: "create" | "append";
  payload: string;       // content to write / append
}

/** The full plan for injecting one asset. Produced purely by plan(). */
export interface InjectionPlan {
  injectionId: string;   // stable content hash
  asset: RoutedAsset;
  lane: string;
  /** The surface the knowledge actually lands on for a consuming node. */
  injectionTarget: string;
  /** 3-system consumer-binding records. */
  bindings: SurfaceBinding[];
  /** How to confirm the injection took effect (re-runnable). */
  verificationChannel: string;
  /** Whether this asset is eligible for injection at all. */
  eligible: boolean;
  /** Reason when not eligible. */
  ineligibleReason?: string;
}

/** An append-only injection-ledger row. */
export interface InjectionRecord {
  injectionId: string;
  ts: string;
  kind: string;
  name: string;
  courseId: string;
  lane: string;
  injectionTarget: string;
  boundSystems: string[];
  bindingsWritten: number;
  bindingsSkipped: number;
  ok: boolean;
}

/** An append-only outcome-ledger row — a node reporting back. */
export interface OutcomeRecord {
  injectionId: string;
  ts: string;
  consumedBy: string;    // the node / engine / caller that used the knowledge
  helped: boolean;
  evidence: string;
}

/** The closed-loop metric — injection↔outcome join. */
export interface FeedbackSummary {
  injected: number;
  consumed: number;      // distinct injectionIds with ≥1 outcome
  helped: number;        // distinct injectionIds with ≥1 helped:true outcome
  helpRate: number;      // helped / consumed (0 when consumed===0)
  consumeRate: number;   // consumed / injected (0 when injected===0)
  byLane: Record<string, { injected: number; consumed: number; helped: number }>;
  /** Injected but never consumed — the dead-knowledge punch list. */
  orphanInjections: string[];
}

/** Result of executing a plan's bindings. */
export interface InjectionResult {
  injectionId: string;
  ok: boolean;
  written: string[];
  skipped: string[];
  errors: string[];
}

/** Injectable repo-root paths (tests pass a temp dir; prod uses the live tree). */
export interface PipelineRoots {
  repoRoot: string;
}

// ─── constants ─────────────────────────────────────────────────────

const LEDGER_REL = "state/shared/knowledge-injection-ledger.jsonl";
const OUTCOMES_REL = "state/shared/knowledge-injection-outcomes.jsonl";
const AI_REGISTRY_REL = "state/shared/knowledge-injection-ai-registry.json";
const OS_DIR_REL = "knowledge/wiki/os/knowledge";
const OBSIDIAN_DIR_REL = "knowledge/memories/reference";

/** Lanes that carry a buildable/usable asset. `none` = DISCARD. */
const INJECTABLE_LANES = new Set(["A", "B", "C"]);

// ─── helpers ───────────────────────────────────────────────────────

/** kebab-case slug, ascii-safe, length-capped — used for filenames + ids. */
function slugify(s: string): string {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unnamed";
}

/** Stable injection id — content hash of the asset identity. */
function makeInjectionId(asset: RoutedAsset): string {
  const key = `${asset.courseId ?? "?"}::${asset.kind}::${asset.name}`;
  return "kip-" + createHash("sha256").update(key).digest("hex").slice(0, 12);
}

function nowIso(frozenTime?: string): string {
  return frozenTime ?? new Date().toISOString();
}

/** Tolerant JSONL reader — skips malformed lines, never throws on bad rows. */
function readJsonl<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  const out: T[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (t.length === 0) continue;
    try {
      out.push(JSON.parse(t) as T);
    } catch {
      // corrupt line — skip (multi-chat append races can truncate a line)
    }
  }
  return out;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── engine ────────────────────────────────────────────────────────

class KnowledgeInjectionPipelineEngine {
  static readonly VERSION = "1.0.0";

  /**
   * PURE — produce the full injection plan for one routed asset. No IO.
   * The plan names the consuming surface + the 3-system bindings + a
   * re-runnable verification channel.
   */
  plan(asset: RoutedAsset, opts: { frozenTime?: string } = {}): InjectionPlan {
    if (!asset || typeof asset !== "object") {
      throw new TypeError("plan(): asset must be an object");
    }
    if (typeof asset.kind !== "string" || asset.kind.length === 0) {
      throw new TypeError("plan(): asset.kind must be a non-empty string");
    }
    if (typeof asset.name !== "string" || asset.name.length === 0) {
      throw new TypeError("plan(): asset.name must be a non-empty string");
    }

    const injectionId = makeInjectionId(asset);
    const lane = typeof asset.lane === "string" ? asset.lane : "none";
    const slug = slugify(`${asset.kind}-${asset.name}`);
    const eligible = INJECTABLE_LANES.has(lane) && asset.decision !== "DISCARD";

    if (!eligible) {
      return {
        injectionId, asset, lane,
        injectionTarget: "(none)",
        bindings: [],
        verificationChannel: "n/a — asset is not injection-eligible",
        eligible: false,
        ineligibleReason:
          lane === "none" || !INJECTABLE_LANES.has(lane)
            ? `lane "${lane}" is not injectable`
            : `decision "${asset.decision}" is terminal (DISCARD)`,
      };
    }

    // Lane → consuming surface.
    let injectionTarget: string;
    if (lane === "A") {
      injectionTarget = "cad-engine/knowledge_store/ (engine auto-loads KnowledgeTip[])";
    } else if (lane === "B") {
      injectionTarget = "port-verification queue (physics-reviewer gate before port)";
    } else {
      injectionTarget = `forge-queue → ${asset.targetSurface ?? "mcp-server/src/<kind>/"}`;
    }

    // 3-system consumer bindings.
    const courseId = asset.courseId ?? "unknown";
    const domains = (asset.domains ?? []).join(", ") || "(unscored)";
    const mfg = typeof asset.mfgRelevance === "number" ? asset.mfgRelevance.toFixed(2) : "?";
    const ts = nowIso(opts.frozenTime);

    const osPayload = [
      "---",
      `title: injected knowledge — ${asset.kind}:${asset.name}`,
      `slug: kip-${slug}`,
      "kind: knowledge",
      "status: injected",
      `date: ${ts.slice(0, 10)}`,
      "milestone: KNOWLEDGE-CONVERSION-MS0",
      "unit: U-KIP01",
      `injection_id: ${injectionId}`,
      `lane: ${lane}`,
      "---",
      "",
      `# Injected knowledge: ${asset.kind}:${asset.name}`,
      "",
      `Routed from course \`${courseId}\` (domains: ${domains}; mfg-relevance ${mfg}).`,
      `Injection target: ${injectionTarget}`,
      `Recommended action: ${asset.recommendedAction ?? "(none)"}`,
      "",
      "Registered by the Knowledge Injection Pipeline so PRISM OS surfaces",
      "this knowledge to consuming nodes. Outcome feedback: see the KIP",
      "outcome ledger keyed by this `injection_id`.",
    ].join("\n");

    const obsidianPayload = [
      "---",
      `name: reference-kip-${slug}`,
      `description: "KIP-injected knowledge ${asset.kind}:${asset.name} from course ${courseId} — lane ${lane}, injection ${injectionId}."`,
      "metadata:",
      "  type: reference",
      "---",
      "",
      `**KIP injection ${injectionId}** — \`${asset.kind}:${asset.name}\` from MIT-OCW \`${courseId}\`.`,
      `Lane ${lane}; target: ${injectionTarget}. Domains: ${domains}.`,
      "Closed-loop: a consuming node records outcome via KnowledgeInjectionPipelineEngine.recordOutcome.",
    ].join("\n");

    const aiRegistryEntry = JSON.stringify({
      injectionId, kind: asset.kind, name: asset.name, courseId,
      lane, domains: asset.domains ?? [], mfgRelevance: asset.mfgRelevance ?? null,
      injectionTarget, registeredAt: ts,
    });

    const bindings: SurfaceBinding[] = [
      {
        system: "prism-os",
        path: `${OS_DIR_REL}/kip-${slug}.md`,
        action: "create",
        payload: osPayload,
      },
      {
        system: "obsidian",
        path: `${OBSIDIAN_DIR_REL}/reference_kip_${slug.replace(/-/g, "_")}.md`,
        action: "create",
        payload: obsidianPayload,
      },
      {
        system: "prism-ai",
        path: AI_REGISTRY_REL,
        action: "append",
        payload: aiRegistryEntry,
      },
    ];

    return {
      injectionId, asset, lane, injectionTarget, bindings,
      verificationChannel:
        `grep injection_id ${OS_DIR_REL}/kip-${slug}.md && ` +
        `jq -e '.[]|select(.injectionId=="${injectionId}")' ${AI_REGISTRY_REL}`,
      eligible: true,
    };
  }

  /**
   * IO — execute a plan's 3-system bindings. Idempotent: a `create` binding
   * whose file already exists is skipped (not overwritten); an `append`
   * binding whose payload already appears in the target is skipped. Dry-run
   * mode plans the writes without touching disk.
   */
  executeInjection(
    plan: InjectionPlan,
    roots: PipelineRoots,
    opts: { dryRun?: boolean } = {},
  ): InjectionResult {
    const written: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    if (!plan.eligible) {
      return {
        injectionId: plan.injectionId, ok: false, written, skipped,
        errors: [`not eligible: ${plan.ineligibleReason ?? "unknown"}`],
      };
    }

    for (const b of plan.bindings) {
      const abs = resolve(roots.repoRoot, b.path);
      try {
        if (b.action === "create") {
          if (existsSync(abs)) {
            skipped.push(`${b.system}:${b.path} (exists)`);
            continue;
          }
          if (!opts.dryRun) {
            ensureDir(abs);
            writeFileSync(abs, b.payload + "\n", "utf8");
          }
          written.push(`${b.system}:${b.path}`);
        } else {
          // append — idempotent on the injectionId substring
          const exists = existsSync(abs);
          if (exists && readFileSync(abs, "utf8").includes(plan.injectionId)) {
            skipped.push(`${b.system}:${b.path} (already registered)`);
            continue;
          }
          if (!opts.dryRun) {
            ensureDir(abs);
            appendFileSync(abs, b.payload + "\n", "utf8");
          }
          written.push(`${b.system}:${b.path}`);
        }
      } catch (e) {
        errors.push(`${b.system}:${b.path} — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      injectionId: plan.injectionId,
      ok: errors.length === 0,
      written, skipped, errors,
    };
  }

  /** IO — append an injection record to the ledger. */
  recordInjection(
    plan: InjectionPlan,
    result: InjectionResult,
    roots: PipelineRoots,
    opts: { frozenTime?: string } = {},
  ): InjectionRecord {
    const rec: InjectionRecord = {
      injectionId: plan.injectionId,
      ts: nowIso(opts.frozenTime),
      kind: plan.asset.kind,
      name: plan.asset.name,
      courseId: plan.asset.courseId ?? "unknown",
      lane: plan.lane,
      injectionTarget: plan.injectionTarget,
      boundSystems: plan.bindings.map((b) => b.system),
      bindingsWritten: result.written.length,
      bindingsSkipped: result.skipped.length,
      ok: result.ok,
    };
    const abs = resolve(roots.repoRoot, LEDGER_REL);
    ensureDir(abs);
    appendFileSync(abs, JSON.stringify(rec) + "\n", "utf8");
    return rec;
  }

  /** IO — a consuming node reports back whether the injected knowledge helped. */
  recordOutcome(
    injectionId: string,
    outcome: { consumedBy: string; helped: boolean; evidence: string },
    roots: PipelineRoots,
    opts: { frozenTime?: string } = {},
  ): OutcomeRecord {
    if (typeof injectionId !== "string" || !injectionId.startsWith("kip-")) {
      throw new TypeError(`recordOutcome(): injectionId must be a kip-* string (got ${injectionId})`);
    }
    if (!outcome || typeof outcome.consumedBy !== "string" || outcome.consumedBy.length === 0) {
      throw new TypeError("recordOutcome(): outcome.consumedBy must be a non-empty string");
    }
    if (typeof outcome.helped !== "boolean") {
      throw new TypeError("recordOutcome(): outcome.helped must be a boolean");
    }
    const rec: OutcomeRecord = {
      injectionId,
      ts: nowIso(opts.frozenTime),
      consumedBy: outcome.consumedBy,
      helped: outcome.helped,
      evidence: String(outcome.evidence ?? ""),
    };
    const abs = resolve(roots.repoRoot, OUTCOMES_REL);
    ensureDir(abs);
    appendFileSync(abs, JSON.stringify(rec) + "\n", "utf8");
    return rec;
  }

  /**
   * Read both ledgers and compute the closed-loop metric. The injection↔
   * outcome join is the whole point: it answers "did injected knowledge get
   * consumed, and did it help?".
   */
  feedbackSummary(roots: PipelineRoots): FeedbackSummary {
    const injections = readJsonl<InjectionRecord>(resolve(roots.repoRoot, LEDGER_REL));
    const outcomes = readJsonl<OutcomeRecord>(resolve(roots.repoRoot, OUTCOMES_REL));
    return this.computeFeedback(injections, outcomes);
  }

  /**
   * PURE — the injection↔outcome join math, split out for hermetic testing.
   */
  computeFeedback(
    injections: readonly InjectionRecord[],
    outcomes: readonly OutcomeRecord[],
  ): FeedbackSummary {
    // de-dup injections by id (re-runs append; the loop metric counts unique)
    const injById = new Map<string, InjectionRecord>();
    for (const inj of injections) {
      if (inj && typeof inj.injectionId === "string") injById.set(inj.injectionId, inj);
    }
    const consumedIds = new Set<string>();
    const helpedIds = new Set<string>();
    for (const o of outcomes) {
      if (!o || typeof o.injectionId !== "string") continue;
      consumedIds.add(o.injectionId);
      if (o.helped === true) helpedIds.add(o.injectionId);
    }

    const byLane: Record<string, { injected: number; consumed: number; helped: number }> = {};
    const orphanInjections: string[] = [];
    for (const [id, inj] of Array.from(injById)) {
      const lane = inj.lane ?? "?";
      if (!byLane[lane]) byLane[lane] = { injected: 0, consumed: 0, helped: 0 };
      byLane[lane].injected += 1;
      if (consumedIds.has(id)) byLane[lane].consumed += 1;
      else orphanInjections.push(id);
      if (helpedIds.has(id)) byLane[lane].helped += 1;
    }

    const injected = injById.size;
    // consumed/helped counted only for ids that were actually injected
    let consumed = 0;
    let helped = 0;
    for (const id of Array.from(injById.keys())) {
      if (consumedIds.has(id)) consumed += 1;
      if (helpedIds.has(id)) helped += 1;
    }

    return {
      injected,
      consumed,
      helped,
      helpRate: consumed > 0 ? helped / consumed : 0,
      consumeRate: injected > 0 ? consumed / injected : 0,
      byLane,
      orphanInjections,
    };
  }
}

export const knowledgeInjectionPipelineEngine = new KnowledgeInjectionPipelineEngine();
export { KnowledgeInjectionPipelineEngine };

// WIRE-EXEMPT: orchestrator engine consumed via direct import by the
// scripts/knowledge-injection-pipeline.mjs CLI (U-KIP02). An MCP dispatcher
// action (prism_knowledge:inject) is the registered follow-up — deferred to
// avoid editing the heavily peer-claimed dispatcher tree mid-fork-storm.
