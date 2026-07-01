/**
 * MillPipelineKnowledgeInjectorEngine — wiki + tribal knowledge injection for the milling pipeline
 *
 * Operator directive (2026-05-25, slot:foxtrot): "upgrade the milling pipelines with new
 * nodes generated that should be wired and bridged into milling" AND "inject all relevant
 * wiki and tribal knowledge into the pipeline".
 *
 * This engine is the canonical mill-pipeline knowledge bridge. Given a milling-pipeline
 * context (operation + material + tool + symptom), it:
 *
 *   1. ROUTES through TribalCorpusOrchestratorEngine (iter52 capstone) with explicit
 *      operator_general category → returns top-K mill-specific tribal tips with
 *      handbook-grade source attribution + confidence-weighted draft flags.
 *
 *   2. PRE-FILTERS wiki entries by mill-domain keywords (operation/material/feature),
 *      returning top-K wiki entry pointers operators can drill into for deep coverage.
 *
 *   3. AGGREGATES into a single knowledge-packed context structure suitable for
 *      injection into downstream mill engines (program generator, strategy selector,
 *      first-piece approval, etc.).
 *
 * Bridge philosophy (per slot-soul R7): does NOT average tips across sources. Surfaces
 * tribal + wiki as parallel evidence streams; the caller decides which to weight.
 *
 * No averaging across domains. No silent attribution dropping. Confidence floor 0.60
 * for surfaced tips per foxtrot soul.
 *
 * @milestone MILL-PARITY-UPGRADE-MS0/U-MILL-PIPELINE-KNOWLEDGE-INJECT (iter56)
 * @version 1.0.0
 * @module MillPipelineKnowledgeInjectorEngine
 */

interface AtomicValue<T = number> {
  value: T;
  unit: string;
  source: string;
}

export type MillOperation = "drilling" | "tapping" | "threading" | "milling_rough" | "milling_finish" | "boring";
export type MillMaterial = "aluminum" | "steel" | "stainless" | "titanium" | "inconel" | "cast_iron" | "tool_steel_hardened" | "brass";
export type MillOperatorSkill = "entry" | "intermediate" | "master";
export type MillSymptom =
  | "broken_tool" | "chatter" | "bue_buildup" | "poor_finish" | "dimensional_drift"
  | "burr_excessive" | "chip_welding" | "tool_chipping" | "thermal_growth" | null;

export interface MillPipelineKnowledgeInput {
  operation: MillOperation;
  material: MillMaterial;
  operator_skill_level: MillOperatorSkill;
  recent_symptom?: MillSymptom;
  /** Free-text feature/operation hint for wiki keyword pre-filter */
  feature_hint?: string;
  /** Max tribal tips to inject (default 5) */
  max_tribal_tips?: number;
  /** Max wiki entry pointers (default 3) */
  max_wiki_entries?: number;
  /** Min tribal confidence (default 0.60) */
  min_tribal_confidence?: number;
}

interface InjectedTribalTip {
  tip: string;
  source: string;
  confidence: number;
  draft: boolean;
  match_score: number;
}

interface InjectedWikiPointer {
  wiki_path: string;
  topic: string;
  match_reason: string;
}

export interface MillPipelineKnowledgeResult {
  tribal_tips: InjectedTribalTip[];
  tribal_priority: string;
  tribal_escalation_needed: boolean;
  tribal_escalation_reason: string | null;
  wiki_pointers: InjectedWikiPointer[];
  combined_summary: AtomicValue<string>;
  warnings: string[];
  source: string;
}

/** Mill-domain wiki pointer catalog — curated entries surfacing milling-specific coverage.
 *  These point at actual files under H:/prism/knowledge/wiki/ that operators can drill into. */
const WIKI_POINTER_CATALOG: Array<{
  wiki_path: string;
  topic: string;
  keywords: RegExp;
}> = [
  { wiki_path: "knowledge/wiki/architecture/courses/academy-course-4-milling-operations",
    topic: "Milling operations academy course",
    keywords: /\bmill|milling\b/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-climb-vs-conventional-milling",
    topic: "Climb vs conventional milling — when each wins + rigidity-and-backlash precondition",
    keywords: /\bclimb|conventional|backlash|rigid/i },
  { wiki_path: "knowledge/wiki/architecture/actions/aireasoning/ai-milling-agi",
    topic: "AI-milling-AGI dispatcher action (mill AGI reasoning surface)",
    keywords: /\bagi|ai|reasoning|deep[_-]?learn/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-thin-wall-milling",
    topic: "Thin-wall milling — wall-thickness-to-DOC ratio + radial-engagement rules",
    keywords: /\bthin[ _-]?wall|fragile|delicate/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-chamfer-milling",
    topic: "Chamfer milling — entry/exit deburring with chamfer mill",
    keywords: /\bchamfer|edge|deburr|burr/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-helical-interpolation",
    topic: "Helical interpolation — hole-larger-than-drill via ramp-and-bore",
    keywords: /\bhelical|ramp|hole|drill|bore/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-high-feed-milling",
    topic: "High-feed milling — low-DOC + high-feed for stainless/superalloys",
    keywords: /\bhigh[ _-]?feed|stainless|inconel/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-micro-milling",
    topic: "Micro-milling — size-effect physics + minimum chip-load",
    keywords: /\bmicro|small|tiny|<1mm/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-adaptive-milling",
    topic: "Adaptive milling — constant chip-load roughing strategies",
    keywords: /\badaptive|rough|hsm|trochoidal/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-aluminum-milling",
    topic: "Aluminum milling — BUE control + flute-count + assist-gas",
    keywords: /\baluminum|BUE|alloy/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-titanium-milling",
    topic: "Titanium milling — low Vc + climb + flood coolant",
    keywords: /\btitanium|ti6al4v|reactive/i },
  { wiki_path: "knowledge/wiki/code-tribal/machining-tactics-tool-steel-hardened",
    topic: "Hardened tool-steel milling — CBN + chamfered edge prep",
    keywords: /\bhardened|tool[_-]?steel|HRC/i },
  { wiki_path: "knowledge/wiki/architecture/engines/Mill/MillTribalKnowledgeEngine",
    topic: "MillTribalKnowledgeEngine — runtime tribal-knowledge query surface for mill",
    keywords: /\btribal|operator|wisdom/i },
];

export class MillPipelineKnowledgeInjectorEngine {
  async inject(input: MillPipelineKnowledgeInput): Promise<MillPipelineKnowledgeResult> {
    if (!input || !input.operation || !input.material || !input.operator_skill_level) {
      throw new Error("MillPipelineKnowledgeInjectorEngine.inject: operation + material + operator_skill_level required");
    }

    const warnings: string[] = [];
    const maxTribal = input.max_tribal_tips ?? 5;
    const maxWiki = input.max_wiki_entries ?? 3;
    const minConfidence = input.min_tribal_confidence ?? 0.60;
    if (maxTribal < 1) throw new Error("MillPipelineKnowledgeInjectorEngine.inject: max_tribal_tips must be ≥ 1");
    if (maxWiki < 0) throw new Error("MillPipelineKnowledgeInjectorEngine.inject: max_wiki_entries must be ≥ 0");

    // ── Lane 1: Tribal via the iter52 orchestrator (operator_general category for mill ops)
    let tribal_tips: InjectedTribalTip[] = [];
    let tribal_priority = "ADVISORY — no tips matched";
    let tribal_escalation_needed = false;
    let tribal_escalation_reason: string | null = null;
    try {
      const { tribalCorpusOrchestratorEngine } = await import("./TribalCorpusOrchestratorEngine.js");
      const orchResult = await tribalCorpusOrchestratorEngine.route({
        process_category: "operator_general",
        top_n: maxTribal,
        min_confidence: minConfidence,
        child_params: {
          machine_type: "mill",
          operation: input.operation,
          material: input.material,
          operator_skill_level: input.operator_skill_level,
          recent_symptom: input.recent_symptom ?? null,
        },
      });
      const child = orchResult.child_result as {
        top_tips: Array<{ tip: string; source: string; confidence: number; match_score: number; draft: boolean }>;
        recommended_action_priority: { value: string };
        escalation_needed: boolean;
        escalation_reason: string | null;
      };
      tribal_tips = child.top_tips.map(t => ({
        tip: t.tip,
        source: t.source,
        confidence: t.confidence,
        draft: t.draft,
        match_score: t.match_score,
      }));
      tribal_priority = child.recommended_action_priority.value;
      tribal_escalation_needed = child.escalation_needed;
      tribal_escalation_reason = child.escalation_reason;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Tribal-corpus injection failed: ${msg} — pipeline continues without tribal layer`);
    }

    // ── Local invariants (OR-merge with orchestrator): these MUST hold for the mill pipeline
    //    regardless of orchestrator routing quirks. The injector engine is the contract surface,
    //    so it enforces invariants the orchestrator's child engines may not consistently emit.
    //
    // Invariant 1: entry-level operator + active symptom → ALWAYS escalate.
    //   Rationale: foxtrot soul — entry-level operators with active symptoms (broken_tool, chatter,
    //   tool_chipping, etc.) must trigger senior-operator escalation. Cannot rely on cut-recovery
    //   under live stress. (R12 fail-loud applied: master OR no-symptom → leave orchestrator value.)
    if (input.operator_skill_level === "entry" && input.recent_symptom) {
      if (!tribal_escalation_needed) {
        tribal_escalation_needed = true;
        tribal_escalation_reason = `Entry-level operator with active symptom ${input.recent_symptom} — escalate to senior operator before continuing cut`;
      }
    }
    //
    // Invariant 2: active symptom → URGENT priority.
    //   Rationale: any symptom present means the operator is in a degraded cutting state. The
    //   priority taxonomy MUST reflect that. Tribal-corpus orchestrator's child engine may classify
    //   tips by relevance score not by urgency — we override priority *only* when an active symptom
    //   is present. Entry+no-symptom → GUIDED, otherwise leave orchestrator value.
    if (input.recent_symptom) {
      tribal_priority = `URGENT — active symptom '${input.recent_symptom}' in progress; verify cut state before next move`;
    } else if (input.operator_skill_level === "entry") {
      tribal_priority = `GUIDED — entry-level operator, step-by-step coaching recommended`;
    }

    // ── Lane 2: Wiki pointer pre-filter by operation/material/feature_hint
    // Universal anchor: academy-course-4 is ALWAYS first when maxWiki >= 1 — mill operators
    // need the foundational course regardless of which specific operation surfaced. Keyword-matched
    // entries follow. This makes the academy course the universal mill anchor (not just a fallback).
    const matchText = `${input.operation} ${input.material} ${input.feature_hint ?? ""}`.toLowerCase();
    const wiki_pointers: InjectedWikiPointer[] = [];
    if (maxWiki >= 1) {
      wiki_pointers.push({
        wiki_path: WIKI_POINTER_CATALOG[0].wiki_path,
        topic: WIKI_POINTER_CATALOG[0].topic,
        match_reason: `universal mill anchor (academy course 4) — always surfaced for mill pipeline injection`,
      });
    }
    for (let i = 1; i < WIKI_POINTER_CATALOG.length; i++) {
      if (wiki_pointers.length >= maxWiki) break;
      const entry = WIKI_POINTER_CATALOG[i];
      if (entry.keywords.test(matchText)) {
        wiki_pointers.push({
          wiki_path: entry.wiki_path,
          topic: entry.topic,
          match_reason: `keyword match in operation+material+feature: "${matchText.trim()}"`,
        });
      }
    }

    // ── Combined summary for downstream pipeline injection
    const draftCount = tribal_tips.filter(t => t.draft).length;
    const summaryParts: string[] = [];
    summaryParts.push(`Mill pipeline knowledge for ${input.operation} on ${input.material} (skill=${input.operator_skill_level})`);
    summaryParts.push(`${tribal_tips.length} tribal tip(s) ranked by match × confidence (${draftCount} draft)`);
    summaryParts.push(`${wiki_pointers.length} wiki pointer(s) for deep-dive`);
    if (input.recent_symptom) summaryParts.push(`Active symptom: ${input.recent_symptom}`);
    if (tribal_escalation_needed) summaryParts.push(`ESCALATION NEEDED: ${tribal_escalation_reason}`);

    if (draftCount > 0) {
      warnings.push(`${draftCount} of ${tribal_tips.length} tribal tips marked DRAFT (confidence <0.75) — verify against ≥2 sources before applying to shop-floor cuts`);
    }

    return {
      tribal_tips,
      tribal_priority,
      tribal_escalation_needed,
      tribal_escalation_reason,
      wiki_pointers,
      combined_summary: {
        value: summaryParts.join(" · "),
        unit: "knowledge-pack summary",
        source: "MillPipelineKnowledgeInjectorEngine combined-summary builder",
      },
      warnings,
      source: "MillPipelineKnowledgeInjectorEngine — composes TribalCorpusOrchestratorEngine (iter52) + curated mill-domain wiki pointer catalog (academy course 4 + 12 code-tribal entries). Slot-soul rule preserved: no averaging across sources, no silent attribution dropping, confidence floor enforced.",
    };
  }
}

export const millPipelineKnowledgeInjectorEngine = new MillPipelineKnowledgeInjectorEngine();
