/**
 * WEDMAcademyBridgeEngine — WEDM-COMPREHENSIVE-TRAINING-PIPELINE-MS0 U-WCTP-ACADEMY-BRIDGE
 * ============================================================================
 *
 * Bridges Lima's PRISM-ACADEMY-FEATURES-MS0 wire-EDM curriculum
 * (course-13-wire-edm-progressive — 5 modules, ~30 lessons, ~20 quiz
 * questions, full physics citations) into:
 *
 *   1. The wedm_lora_train.jsonl corpus emitted by WEDMLoRADatasetBuilderEngine
 *      (U-WCTP-A2-DSB). Academy quizzes are *already* instruction-tuned Q→A
 *      pairs with explanations + citations — the highest-quality training
 *      signal in the project; using them lifts the A2-DSB corpus from
 *      JM-Die-shop-only (7 examples on smoke run) to JM-Die + curriculum.
 *
 *   2. The WireEdmWizardPage tooltip / help-drawer layer. Today the wizard
 *      hardcodes "AI-recommended" skim-pass counts and rho factors with no
 *      visible provenance. Academy lessons cite Kunieda CIRP 2005 / Sommer
 *      2010 / Sodick AQ327L manual / Klocke 2013 §8.3 — exposing those as
 *      wizard tooltips closes the "wizard tells you what but never why" gap.
 *
 * INTEGRATION NOTE: this engine is a *pure read-side bridge*. It does NOT
 * mutate the academy data or the wizard. Downstream consumers (the dataset
 * builder, the wizard tooltip hook) merge its output into their own paths.
 *
 * SCOPE: this engine reads course-13 (wire-EDM progressive). When Lima
 * ships additional wire-content courses (PDF / video extraction landing
 * targets per user directive 2026-05-26), add their module collections to
 * COURSE_REGISTRY and the bridge picks them up automatically.
 *
 * @module engines/WEDMAcademyBridgeEngine
 * @version 1.0.0
 */

// Curriculum data is injected via setCourses(); the bridge doesn't hard-
// import a course file because slot worktrees may be behind main where the
// course collection is maintained. Production wiring (future
// prism_edm:wedm_academy_bridge_* dispatcher action) resolves the active
// course set from academyMaintainerEngine.
import type { Module, Quiz, Question, Lesson } from "./CurriculumEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Alpaca-format training example. Matches the shape emitted by
 * WEDMLoRADatasetBuilderEngine so the two corpora can be concatenated
 * without reshaping. The instruction-family taxonomy mirrors A2-DSB's
 * 7 WEDM families plus an academy-specific `wedm_pedagogy` family for
 * conceptual / definitional Q→A pairs.
 */
export interface WedmAcademyTrainingExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    source: "academy";
    course_id: string;
    module_id: string;
    quiz_id?: string;
    question_id?: string;
    lesson_id?: string;
    instruction_family: WedmInstructionFamily;
    difficulty?: number;
    citations: string[];
    tags: string[];
  };
}

/** Mirror of A2-DSB's 7-family taxonomy + academy pedagogy family. */
export type WedmInstructionFamily =
  | "wire_parameter_calc"
  | "pass_strategy"
  | "controller_dialect"
  | "wire_break_diagnose"
  | "taper_uv"
  | "surface_integrity"
  | "cost_estimate"
  | "wedm_pedagogy";   // academy-only: conceptual / definitional

/**
 * Wizard tooltip — maps a wizard form-field name to a lesson excerpt that
 * teaches it. The wizard's React component reads these to populate help-
 * drawer content.
 */
export interface WedmWizardTooltip {
  wizard_field: WizardFieldName;
  course_id: string;
  module_id: string;
  lesson_id: string;
  excerpt: string;
  citations: string[];
}

/** Fields the WireEdmWizardPage actually surfaces — keep in sync with the page. */
export type WizardFieldName =
  | "wire_diameter"
  | "kerf"
  | "skim_passes"
  | "ra_target"
  | "taper_angle"
  | "material"
  | "thickness"
  | "lead_in";

// ============================================================================
// COURSE REGISTRY
// ============================================================================

/**
 * Wire-applicable courses. Add Lima's PDF / video extracted courses here as
 * they land — the bridge picks them up automatically. Per user directive
 * 2026-05-26: lima is building PDF + video extraction for wire content;
 * those courses register here.
 */
interface CourseEntry { id: string; modules: ReadonlyArray<Module>; }
let COURSE_REGISTRY: ReadonlyArray<CourseEntry> = [];

// ============================================================================
// HEURISTICS — quiz-tag → instruction-family mapping
// ============================================================================

/**
 * Quiz tags from course-13 (e.g. `wedm_kerf`, `wedm_physics`, `taper`)
 * mapped to A2-DSB instruction families. When no tag matches, falls back
 * to `wedm_pedagogy`. Add tags here as Lima's downstream PDF/video
 * extracted quizzes ship with new tag vocabulary.
 */
const TAG_TO_FAMILY: Record<string, WedmInstructionFamily> = {
  wedm_kerf: "wire_parameter_calc",
  wedm_physics: "wedm_pedagogy",
  fundamentals: "wedm_pedagogy",
  wire_param: "wire_parameter_calc",
  wire_diameter: "wire_parameter_calc",
  wire_tension: "wire_parameter_calc",
  pulse_on: "wire_parameter_calc",
  pulse_off: "wire_parameter_calc",
  pass: "pass_strategy",
  skim: "pass_strategy",
  rough: "pass_strategy",
  multi_pass: "pass_strategy",
  controller: "controller_dialect",
  sodick: "controller_dialect",
  mitsubishi: "controller_dialect",
  agie: "controller_dialect",
  wire_break: "wire_break_diagnose",
  taper: "taper_uv",
  uv: "taper_uv",
  ra: "surface_integrity",
  recast: "surface_integrity",
  haz: "surface_integrity",
  cost: "cost_estimate",
  mrr: "cost_estimate",
};

/**
 * Heuristic: keyword-match a lesson's title against wizard field names.
 * Each entry is `[wizardField, keywords[]]` — first match wins. Order
 * matters: more-specific matches first.
 */
const LESSON_TO_WIZARD_FIELD: ReadonlyArray<[WizardFieldName, ReadonlyArray<string>]> = [
  ["kerf", ["kerf", "offset"]],
  ["wire_diameter", ["wire diameter", "wire size", "brass wire"]],
  ["skim_passes", ["skim", "multi-pass", "rough/skim"]],
  ["ra_target", ["surface", "ra", "finish", "recast"]],
  ["taper_angle", ["taper", "4-axis", "u-v", "uv", "conic"]],
  ["material", ["material", "tool steel", "stainless", "carbide", "pcd"]],
  ["thickness", ["thickness", "stack"]],
  ["lead_in", ["lead", "start hole", "pierce"]],
];

// ============================================================================
// ENGINE
// ============================================================================

class WEDMAcademyBridgeEngine {
  /**
   * Inject the active course collection. Production wiring calls this from
   * academyMaintainerEngine on session start; tests call it with a fixture.
   * Subsequent calls REPLACE the prior set (no merge) — Lima's PDF / video
   * extraction always re-publishes the full active collection.
   */
  setCourses(courses: ReadonlyArray<CourseEntry>): void {
    COURSE_REGISTRY = courses;
  }

  /** Defensive copy of the current registered course set. */
  getCourses(): ReadonlyArray<CourseEntry> {
    return [...COURSE_REGISTRY];
  }

  /**
   * Emit all academy quizzes as Alpaca-format training examples ready to
   * concatenate into wedm_lora_train.jsonl.
   */
  emitTrainingExamples(): WedmAcademyTrainingExample[] {
    const out: WedmAcademyTrainingExample[] = [];
    for (const course of COURSE_REGISTRY) {
      for (const mod of course.modules) {
        if (!mod.quiz) continue;
        for (const q of mod.quiz.questions) {
          const example = this.quizToExample(course.id, mod, mod.quiz, q);
          if (example) out.push(example);
        }
      }
    }
    return out;
  }

  /**
   * Map a single quiz question into one training example. Returns null if
   * the question shape is unsupported (e.g. matching-type questions we
   * don't have a clean text serialization for yet).
   */
  private quizToExample(
    courseId: string,
    mod: Module,
    quiz: Quiz,
    q: Question
  ): WedmAcademyTrainingExample | null {
    let instruction: string;
    let output: string;

    if (q.type === "multiple_choice" && q.options) {
      const correct = q.options.find((o: { isCorrect?: boolean }) => o.isCorrect === true);
      if (!correct) return null;
      instruction = q.text;
      output = `${correct.text}\n\nExplanation: ${q.explanation ?? ""}`.trim();
    } else if (q.type === "calculation" && typeof q.correctAnswer !== "undefined") {
      instruction = q.text;
      output = `${q.correctAnswer}\n\nExplanation: ${q.explanation ?? ""}`.trim();
    } else if (q.type === "visual_id" && typeof q.correctAnswer !== "undefined") {
      instruction = q.text;
      output = `${q.correctAnswer}\n\nExplanation: ${q.explanation ?? ""}`.trim();
    } else if (q.type === "troubleshooting_tree" && typeof q.correctAnswer !== "undefined") {
      instruction = q.text;
      output = `${q.correctAnswer}\n\nExplanation: ${q.explanation ?? ""}`.trim();
    } else {
      return null;
    }

    const family = this.tagsToFamily(q.tags ?? []);
    const citations = this.extractCitationsFromExplanation(q.explanation ?? "");

    return {
      instruction,
      input: "",
      output,
      metadata: {
        source: "academy",
        course_id: courseId,
        module_id: mod.id,
        quiz_id: quiz.id,
        question_id: q.id,
        instruction_family: family,
        difficulty: q.difficulty,
        citations,
        tags: q.tags ?? [],
      },
    };
  }

  /**
   * Return wizard-field tooltips by scanning every lesson title and
   * matching against the wizard's known field names. The first lesson
   * whose title matches a field's keyword wins (course order, module
   * order, lesson order). Returns a stable per-call array.
   */
  emitWizardTooltips(): WedmWizardTooltip[] {
    const tooltips: WedmWizardTooltip[] = [];
    const fieldsHit = new Set<WizardFieldName>();

    for (const course of COURSE_REGISTRY) {
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          const titleLower = lesson.title.toLowerCase();
          for (const [field, keywords] of LESSON_TO_WIZARD_FIELD) {
            if (fieldsHit.has(field)) continue;
            if (keywords.some((k) => titleLower.includes(k))) {
              tooltips.push(this.lessonToTooltip(course.id, mod.id, lesson, field));
              fieldsHit.add(field);
              break;
            }
          }
        }
      }
    }

    return tooltips;
  }

  private lessonToTooltip(
    courseId: string,
    moduleId: string,
    lesson: Lesson,
    field: WizardFieldName
  ): WedmWizardTooltip {
    // Pull the first text-content block as the excerpt; truncate to keep
    // the tooltip readable in the wizard's help drawer.
    const textBlock = lesson.content.find((c) => c.type === "text");
    const body = textBlock?.body ?? lesson.title;
    const excerpt = this.truncateExcerpt(body, 600);
    const citations = this.extractCitationsFromExplanation(body);

    return {
      wizard_field: field,
      course_id: courseId,
      module_id: moduleId,
      lesson_id: lesson.id,
      excerpt,
      citations,
    };
  }

  /**
   * Coverage report — which wizard fields the academy currently teaches
   * vs which it does not. Lima uses this to know where to direct the
   * next PDF / video extraction round.
   */
  wizardCoverageReport(): {
    covered: WizardFieldName[];
    missing: WizardFieldName[];
    coverage_ratio: number;
  } {
    const tooltips = this.emitWizardTooltips();
    const covered = tooltips.map((t) => t.wizard_field);
    const all: WizardFieldName[] = LESSON_TO_WIZARD_FIELD.map(([f]) => f);
    const missing = all.filter((f) => !covered.includes(f));
    return {
      covered,
      missing,
      coverage_ratio: all.length === 0 ? 0 : covered.length / all.length,
    };
  }

  /** Aggregate counts — academy footprint visible to LoRA training. */
  stats(): {
    courses: number;
    modules: number;
    lessons: number;
    quizQuestions: number;
    trainingExamples: number;
    families: Record<WedmInstructionFamily, number>;
  } {
    let modules = 0;
    let lessons = 0;
    let quizQuestions = 0;
    for (const course of COURSE_REGISTRY) {
      modules += course.modules.length;
      for (const mod of course.modules) {
        lessons += mod.lessons.length;
        quizQuestions += mod.quiz?.questions.length ?? 0;
      }
    }

    const examples = this.emitTrainingExamples();
    const families = {} as Record<WedmInstructionFamily, number>;
    const allFamilies: WedmInstructionFamily[] = [
      "wire_parameter_calc",
      "pass_strategy",
      "controller_dialect",
      "wire_break_diagnose",
      "taper_uv",
      "surface_integrity",
      "cost_estimate",
      "wedm_pedagogy",
    ];
    for (const f of allFamilies) families[f] = 0;
    for (const e of examples) families[e.metadata.instruction_family]++;

    return {
      courses: COURSE_REGISTRY.length,
      modules,
      lessons,
      quizQuestions,
      trainingExamples: examples.length,
      families,
    };
  }

  // ----- helpers -------------------------------------------------------

  private tagsToFamily(tags: string[]): WedmInstructionFamily {
    for (const tag of tags) {
      const family = TAG_TO_FAMILY[tag.toLowerCase()];
      if (family) return family;
      // Tag like "wedm_kerf" also matched without prefix
      const stripped = tag.toLowerCase().replace(/^wedm[-_]/, "");
      const family2 = TAG_TO_FAMILY[stripped];
      if (family2) return family2;
    }
    return "wedm_pedagogy";
  }

  private extractCitationsFromExplanation(text: string): string[] {
    // Citations in academy follow the conventions:
    //   "per Kunieda CIRP 2005", "Sommer 2010 p.112", "Sodick AQ327L Operator's Manual rev. 4 §2-3",
    //   "Klocke 2013 §8.3", "ISO 5598:2008".
    // Lima's discipline is consistent — match the surface forms.
    const cites = new Set<string>();
    const patterns = [
      /(?:per\s+)?(Kunieda(?:[^.]+?(?:CIRP|Annals)[^.]+?\d{4})?)/gi,
      /(Sommer(?:\s+\d{4})?(?:\s+p\.\s*\d+)?)/gi,
      /(Sodick(?:\s+\w+)?(?:\s+(?:Operator['']?s?\s+Manual)?(?:\s+rev\.?\s*\d+)?(?:\s+§[\d-]+)?)?)/gi,
      /(Klocke(?:\s+\d{4})?(?:\s+§[\d.]+)?)/gi,
      /(ISO\s+\d{4,5}(?::\d{4})?)/gi,
      /(Bedra(?:\s+\w+)?(?:\s+catalog(?:\s+\d{4})?)?)/gi,
      /(Toenshoff(?:[^.]*?\d{4})?)/gi,
      /(Sato(?:[^.]*?\d{4})?)/gi,
      /(Carslaw[- ]?Jaeger(?:[^.]*?\d{4})?)/gi,
    ];
    for (const re of patterns) {
      const matches = Array.from(text.matchAll(re));
      for (const m of matches) {
        const cite = m[1]?.trim();
        if (cite) cites.add(cite);
      }
    }
    return Array.from(cites);
  }

  private truncateExcerpt(body: string, maxChars: number): string {
    // Strip markdown headings + leading blank lines, then take leading
    // portion. Preserves citation context where possible.
    const stripped = body
      .split("\n")
      .filter((l) => !l.trim().startsWith("#"))
      .join("\n")
      .trim();
    if (stripped.length <= maxChars) return stripped;
    const truncated = stripped.slice(0, maxChars);
    const lastBreak = Math.max(
      truncated.lastIndexOf("\n\n"),
      truncated.lastIndexOf(". ")
    );
    return (lastBreak > maxChars * 0.6 ? truncated.slice(0, lastBreak) : truncated) + "…";
  }
}

export const wedmAcademyBridgeEngine = new WEDMAcademyBridgeEngine();
