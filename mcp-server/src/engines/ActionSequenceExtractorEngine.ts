/**
 * ActionSequenceExtractorEngine — CAD/CAM-tutorial tribal-tip → action-sequence transform.
 *
 * CAD-TRAINING-EXTRACT-MS0 / U-CTE02..U-CTE12 — unblocks the action_sequences
 * deliverable of every CTE unit. The CTE units require TWO deliverables per PDF:
 *   1. <unit>-tips.json     — tribal tips (already in cad-engine/knowledge_store/doc-*.json)
 *   2. <unit>-actions.json  — NEW — action sequences derived from tip bodies
 *
 * This engine handles (2). Pure transform — no IO. Given an ExtractionTip
 * (canonical CAMTrainingExtractionAggregatorEngine shape), emits zero or more
 * ActionSequence records.
 *
 * Heuristic (R12 honest: deterministic regex + verb-segmentation, NO ML guess):
 *   - Segment the body on `. `, `; `, " then ", " and then "
 *   - For each sentence classify the leading verb (click/select/press/use/...)
 *   - Extract UI hints: tabs ("X tab"), dialogs ("X dialog"), buttons ("X button"),
 *     menus, panels, lists, trees, windows, hotkeys (`[Alt+F1]`, `Ctrl+S`)
 *   - Tip → 1 ActionSequence with N steps (N = surviving sentences). Tips with no
 *     action-verb sentences are filtered and recorded in `dropped[]` (R12 — never silent).
 *
 * Pure + deterministic — same input bytes ALWAYS yield same output bytes (regression
 * tests pin this directly).
 *
 * @engine ActionSequenceExtractorEngine
 * @milestone CAD-TRAINING-EXTRACT-MS0
 *
 * WIRE-EXEMPT: pure transform invoked by emit-cad-training-extractions.mjs. No
 * runtime dispatcher surface — exposed only to the offline emitter + tests.
 */

import { createHash } from "node:crypto";
import { z } from "zod";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Input shape — value-compatible with CAMTrainingExtractionAggregatorEngine.ExtractionTip. */
export interface ActionExtractionTip {
  title: string;
  body: string;
  category?: string;
  tags?: string[];
  page_ref?: string;
  [key: string]: unknown;
}

/** Single imperative step within an action sequence. */
export interface ActionStep {
  /** Leading verb canonicalized to lower-case (click, select, press, ...). */
  verb: string;
  /** Original sentence text, trimmed. */
  text: string;
  /** Detected UI elements (tabs, dialogs, buttons, menus, ...) — empty if none. */
  ui_targets: string[];
  /** Detected hotkey (e.g. "Alt+F1", "Ctrl+S") — null if none. */
  hotkey: string | null;
}

/** Action sequence derived from one ExtractionTip. */
export interface ActionSequence {
  /** Stable id: first 16 hex of sha1(`${source_doc}::${title}::${body}`). */
  id: string;
  /** From the tip title. */
  name: string;
  /** From the tip body. */
  description: string;
  /** From the tip category (defaults to "other"). */
  category: string;
  /** From the tip tags (defaults to []). */
  tags: string[];
  /** From the tip page_ref (defaults to null). */
  page_ref: string | null;
  /** Source knowledge_store doc basename — set by the emitter. */
  source_doc: string;
  /** One step per surviving sentence. Always non-empty (filtered tips are dropped). */
  steps: ActionStep[];
}

/** Extraction result — sequences emitted PLUS dropped-tip provenance. */
export interface ActionExtractionResult {
  schemaVersion: "1.0.0";
  /** Action sequences successfully extracted. */
  sequences: ActionSequence[];
  /** Tips that yielded NO action verbs — recorded honestly, never silent-dropped. */
  dropped: Array<{ title: string; reason: string }>;
  /** Stable counts: same input → same numbers. */
  totals: {
    tips_in: number;
    sequences_out: number;
    tips_dropped: number;
    steps_total: number;
  };
}

// ─── Zod schema ──────────────────────────────────────────────────────────────

/** Input validation — enforces title + body presence + types. */
export const ActionExtractionTipSchema = z
  .object({
    title: z.string().min(1, "tip.title must be non-empty"),
    body: z.string().min(1, "tip.body must be non-empty"),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    page_ref: z.string().optional(),
  })
  .passthrough();

// ─── Constants ───────────────────────────────────────────────────────────────

/**
 * Action-verb whitelist — leading-word matched case-insensitively after sentence
 * segmentation. Sorted alphabetically for stable scan order.
 */
const ACTION_VERBS: readonly string[] = [
  "add", "apply", "assign", "change", "check", "choose", "click", "configure",
  "confirm", "create", "define", "delete", "double-click", "drag", "draw",
  "edit", "enable", "enter", "expand", "export", "fit", "hover", "import",
  "insert", "launch", "load", "modify", "move", "name", "open", "pick",
  "press", "remove", "rename", "right-click", "rotate", "save", "scroll",
  "select", "set", "specify", "start", "switch", "type", "uncheck", "update",
  "use", "verify", "view", "zoom",
] as const;

/** Hotkey pattern — Ctrl/Alt/Shift/Cmd combos with optional brackets. */
const HOTKEY_RE =
  /\[?\b(?:Ctrl|Alt|Shift|Cmd|Meta)(?:\s*\+\s*(?:Ctrl|Alt|Shift|Cmd|Meta))*\s*\+\s*[A-Za-z0-9]+\]?/gi;

/**
 * UI-element patterns — capture the named element (a SINGLE word — CamelCase or
 * hyphenated permitted, no embedded spaces). A greedy multi-word capture was
 * fixed 2026-05-20 (test 'X tab' input "Click the File tab and the View tab"
 * captured the entire span instead of ["File","View"]).
 */
const UI_PATTERNS: ReadonlyArray<RegExp> = [
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+tab\b/g,
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+dialog(?:\s+box)?\b/g,
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+button\b/g,
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+menu\b/g,
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+panel\b/g,
  /\b([A-Z][A-Za-z0-9_\-]{0,40})\s+(?:tree|list|window)\b/g,
];

// ─── Engine ──────────────────────────────────────────────────────────────────

export class ActionSequenceExtractorEngine {
  /**
   * Build a stable 16-hex id from source_doc + tip title + body.
   *
   * @param sourceDoc — knowledge_store doc basename (sets the namespace)
   * @param tip — tip whose id we're computing
   * @returns 16 lowercase hex characters
   */
  static stableId(sourceDoc: string, tip: ActionExtractionTip): string {
    const k = `${sourceDoc}::${(tip.title ?? "").trim()}::${(tip.body ?? "").trim()}`;
    return createHash("sha1").update(k).digest("hex").slice(0, 16);
  }

  /**
   * Sentence-segment a body. Splits on `.\s+`, `;\s+`, ` then `, ` and then `.
   *
   * @param body — tip body text
   * @returns ordered array of sentence strings (never null/empty)
   */
  static segmentSentences(body: string): string[] {
    if (typeof body !== "string" || body.length === 0) return [];
    return body
      .split(/(?:\.\s+|\;\s+|\s+then\s+|\s+and\s+then\s+)/i)
      .map((s) => s.trim().replace(/[.;]+$/, "").trim())
      .filter((s) => s.length > 0);
  }

  /**
   * Detect the leading action verb. Returns null if the first word is not in
   * ACTION_VERBS.
   *
   * @param sentence — single sentence (already trimmed)
   * @returns canonical lower-case verb or null
   */
  static detectVerb(sentence: string): string | null {
    if (typeof sentence !== "string" || sentence.length === 0) return null;
    const cleaned = sentence
      .replace(/^["'(]+/, "")
      .replace(/^to\s+/i, "")
      .trim();
    const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase().replace(/[,.;:]+$/, "") ?? "";
    if (!firstWord) return null;
    for (const v of ACTION_VERBS) {
      if (firstWord === v) return v;
    }
    return null;
  }

  /**
   * Find a hotkey in a sentence. Returns the FIRST match canonicalized with
   * single "+" separators and no enclosing brackets.
   *
   * @param sentence — single sentence
   * @returns canonical hotkey string (e.g. "Alt+F1") or null
   */
  static detectHotkey(sentence: string): string | null {
    if (typeof sentence !== "string" || sentence.length === 0) return null;
    HOTKEY_RE.lastIndex = 0;
    const m = HOTKEY_RE.exec(sentence);
    if (!m) return null;
    return m[0]
      .replace(/[\[\]]/g, "")
      .replace(/\s+/g, "")
      .replace(/\+/g, "+");
  }

  /**
   * Detect UI element references (tabs/dialogs/buttons/menus/panels/lists/trees/windows).
   * Returns the matched element NAMES (without the trailing type-word), deduped + sorted.
   *
   * @param sentence — single sentence
   * @returns deduped + sorted UI-target names (may be empty)
   */
  static detectUITargets(sentence: string): string[] {
    if (typeof sentence !== "string" || sentence.length === 0) return [];
    const found = new Set<string>();
    for (const re of UI_PATTERNS) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null = re.exec(sentence);
      while (m !== null) {
        const name = m[1].trim();
        if (name.length > 0) found.add(name);
        m = re.exec(sentence);
      }
    }
    return [...found].sort();
  }

  /**
   * Build an ActionStep from one sentence. Returns null if no action verb.
   *
   * @param sentence — single sentence (already segmented)
   * @returns step or null
   */
  static buildStep(sentence: string): ActionStep | null {
    const verb = this.detectVerb(sentence);
    if (verb === null) return null;
    return {
      verb,
      text: sentence,
      ui_targets: this.detectUITargets(sentence),
      hotkey: this.detectHotkey(sentence),
    };
  }

  /**
   * Extract zero or one ActionSequence from a single tip.
   *
   * @param tip — validated extraction tip
   * @param sourceDoc — knowledge_store doc basename
   * @returns ActionSequence or null
   * @throws if tip fails schema validation
   */
  static extractFromTip(
    tip: ActionExtractionTip,
    sourceDoc: string,
  ): ActionSequence | null {
    const parsed = ActionExtractionTipSchema.safeParse(tip);
    if (!parsed.success) {
      // Zod v3 exposes `.errors`; v4 renamed to `.issues`. Read whichever exists.
      const issues =
        (parsed.error as unknown as { issues?: z.ZodIssue[] }).issues ??
        (parsed.error as unknown as { errors?: z.ZodIssue[] }).errors ??
        [];
      throw new Error(
        `ActionSequenceExtractor: invalid tip shape — ${issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join("; ")}`,
      );
    }
    const sentences = this.segmentSentences(parsed.data.body);
    const steps: ActionStep[] = [];
    for (const s of sentences) {
      const step = this.buildStep(s);
      if (step !== null) steps.push(step);
    }
    if (steps.length === 0) return null;
    return {
      id: this.stableId(sourceDoc, parsed.data as ActionExtractionTip),
      name: parsed.data.title,
      description: parsed.data.body,
      category: parsed.data.category ?? "other",
      tags: Array.isArray(parsed.data.tags) ? [...parsed.data.tags] : [],
      page_ref: typeof parsed.data.page_ref === "string" ? parsed.data.page_ref : null,
      source_doc: sourceDoc,
      steps,
    };
  }

  /**
   * Batch-extract over a tip array. Records dropped tips with reason — never
   * silent-skips (R12).
   *
   * @param tips — array of extraction tips
   * @param sourceDoc — knowledge_store doc basename
   * @returns full extraction result with sequences + dropped + totals
   * @throws if `tips` is not an array, or `sourceDoc` is empty
   */
  static extractBatch(
    tips: readonly ActionExtractionTip[],
    sourceDoc: string,
  ): ActionExtractionResult {
    if (!Array.isArray(tips)) {
      throw new Error("ActionSequenceExtractor: tips must be an array");
    }
    if (typeof sourceDoc !== "string" || sourceDoc.length === 0) {
      throw new Error("ActionSequenceExtractor: sourceDoc must be a non-empty string");
    }
    const sequences: ActionSequence[] = [];
    const dropped: Array<{ title: string; reason: string }> = [];
    let stepsTotal = 0;
    for (const tip of tips) {
      const out = this.extractFromTip(tip, sourceDoc);
      if (out === null) {
        dropped.push({
          title: typeof tip.title === "string" ? tip.title : "(untitled)",
          reason: "no action verbs in body sentences",
        });
        continue;
      }
      sequences.push(out);
      stepsTotal += out.steps.length;
    }
    return {
      schemaVersion: "1.0.0",
      sequences,
      dropped,
      totals: {
        tips_in: tips.length,
        sequences_out: sequences.length,
        tips_dropped: dropped.length,
        steps_total: stepsTotal,
      },
    };
  }

  /** Whitelisted action verbs — exported for test pinning. */
  static getActionVerbs(): readonly string[] {
    return ACTION_VERBS;
  }
}
