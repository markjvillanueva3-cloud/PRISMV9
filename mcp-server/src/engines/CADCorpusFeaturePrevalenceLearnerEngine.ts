// WIRE-EXEMPT: training surface consumed by scripts/learn-class-feature-prevalence.ts
// to refresh the CADClassFeatureLibraryEngine prevalence weights from corpus
// evidence. Dispatcher integration follows in CAD-FUSION-LIVE-MS1 once the
// learning loop is closed (corpus → weights → live build → outcome → corpus).
/**
 * CADCorpusFeaturePrevalenceLearnerEngine — Learn class-feature prevalence
 * from the 11,695-file local corpus.
 *
 * The hand-tuned prevalence weights in CADClassFeatureLibraryEngine got us
 * a usable starting point, but they're shop-conventions, not data. This
 * engine actually MEASURES feature prevalence by walking the corpus and
 * counting which class-typical feature tokens appear in filenames + path
 * components for each part-class member.
 *
 * Method (per (class, feature) pair):
 *   1. Pull all corpus entries with part_class == target class
 *   2. For each entry, search filename + path for the feature's token regexes
 *   3. prevalence = count_with_token / count_in_class
 *
 * This is honest learning — the prevalence converges as the corpus grows.
 * For classes with < 5 corpus members, the engine returns confidence_low and
 * defers to the hand-tuned weight.
 *
 * ── KNOWN LIMITATION (verified 2026-05-06 against the 11,695-file corpus) ──
 * Filename tokens are an extremely weak signal for feature detection. A real
 * extrude punch always has an oil hole, but its filename almost never says
 * "OIL HOLE" — the feature is inside the STEP geometry, not the filename.
 * Out of 23 confident (class, feature) pairs in the first real run, 22
 * diverged from hand-tuning by ≥ 0.2 in the LOWERING direction (false
 * negatives). Hand-tuned shop priors should be trusted MORE than this
 * engine's output until a higher-fidelity geometry-parsing signal is wired.
 *
 * The applyLearned() method still uses 0.7 alpha smoothing toward the
 * learned value, which is intentionally aggressive — when the corpus DOES
 * carry signal (e.g. bushing R-callouts at 0.40 prevalence), we want to
 * trust it, but with the hand-tune anchor preventing collapse to zero on
 * weak signal classes. To raise the alpha, gate it on either (a) corpus
 * size > 100, or (b) at least one matched_token covers > 30% of the class.
 *
 * @engine CADCorpusFeaturePrevalenceLearnerEngine
 * @milestone CAD-FUSION-LIVE-MS0
 */

import type { CorpusManifest, CADCorpusEntry } from "./CADCorpusIngestionEngine.js";
import type { PartClass, ExpectedFeatureFlag } from "./BlueprintVisionOCREngine.js";
import type { FeatureTemplate } from "./CADClassFeatureLibraryEngine.js";

// ── Types ──────────────────────────────────────────────────────────

/** A learned prevalence value for one (class, feature) pair. */
export interface LearnedPrevalence {
  part_class: PartClass;
  feature_kind: FeatureTemplate["kind"];
  /** Number of corpus members of this class. */
  class_size: number;
  /** Number of class members whose filename/path matches the feature regex. */
  positive_hits: number;
  /** positive_hits / class_size — bounded to [0, 1]. */
  learned_prevalence: number;
  /** True when class_size ≥ MIN_CORPUS_SUPPORT — otherwise defer to hand tune. */
  confident: boolean;
  /** The regex tokens that fired. */
  matched_tokens: string[];
}

export interface LearningReport {
  generated_at: string;
  corpus_size: number;
  classes_examined: PartClass[];
  results: LearnedPrevalence[];
  /** Pairs where corpus evidence diverges from hand-tuned by ≥ 0.2 absolute. */
  divergences: Array<{ part_class: PartClass; feature_kind: string; hand_tuned: number; learned: number; delta: number }>;
}

// ── U-FGE03 persistence overlay types ──────────────────────────────

/**
 * Durable overlay written by `persistLearned()` and auto-loaded by
 * `CADClassFeatureLibraryEngine.templateFor()`. The single seam that makes
 * trained corpus evidence reach the DEFAULT build-sequence path.
 */
export interface LearnedPrevalenceOverlay {
  schemaVersion: string;
  generated_at: string;
  /** Provenance — which surface produced the blend. */
  source: string;
  /** The `applyLearned()` smoothing_alpha used (null when not supplied). */
  smoothing_alpha: number | null;
  /** part_class → feature_kind → blended prevalence, each clamped to [0,1]. */
  prevalence: Record<string, Record<string, number>>;
}

/** Injectable options for `persistLearned()` (hermetic-test seams). */
export interface PersistLearnedOpts {
  /** Override the canonical `data/state/...` target (tests pass a tmp path). */
  overlayPath?: string;
  /** The smoothing_alpha recorded into the overlay for provenance. */
  smoothing_alpha?: number;
  /**
   * Injected fs/promises-shaped impl for hermetic tests. Only the four
   * methods `persistLearned` calls are required.
   */
  fsImpl?: {
    mkdir(p: string, o: { recursive: boolean }): Promise<unknown>;
    writeFile(p: string, data: string, enc: string): Promise<void>;
    rename(a: string, b: string): Promise<void>;
    unlink(p: string): Promise<void>;
  };
}

/** Typed result of `persistLearned()` — never a raw primitive (engine rule). */
export interface PersistLearnedResult {
  ok: boolean;
  path: string;
  /** Distinct part_classes written. */
  classes: number;
  /** Total (class,feature) prevalence values written. */
  features_written: number;
  /** Count of NaN/Infinity prevalences skipped (R12 — surfaced, not persisted). */
  skipped_non_finite: number;
  /** Present + populated only when `ok === false`. */
  error?: string;
}

// ── Tunables ───────────────────────────────────────────────────────

/** Below this many class members, prevalence learning is unreliable — defer to hand tune. */
const MIN_CORPUS_SUPPORT = 5;

/**
 * Token regexes per feature kind. These are the corpus signals we look for in
 * filename + path. A class member counts as positive evidence for a feature
 * when ANY of its regexes hit. New feature kinds need an entry here.
 */
const FEATURE_TOKEN_REGEXES: Partial<Record<FeatureTemplate["kind"], RegExp[]>> = {
  central_oil_hole: [/\boil\s*hole\b/i, /\bcoolant\s*hole\b/i, /\bthrough\s*hole\b/i],
  cross_drilled_relief_holes: [/\bcross.?drill/i, /\brelief\s*hole/i, /\bvent\s*hole/i],
  ejector_pin_hole: [/\bejector\b/i, /\bknockout\b/i, /\bkick.?out\b/i],
  vent_groove: [/\bvent\b/i, /\bgas\s*relief\b/i, /\bair\s*relief\b/i],
  datum_relief: [/\brelief\b/i, /\bundercut\b/i, /\bneck\b/i],
  bevel_face_chamfer: [/\bchamfer\b/i, /\b\d+\s*x\s*45\b/i, /\b\d+\s*°\b/],
  shoulder_fillet: [/\bfillet\b/i, /\bradius\b/i, /\b\bR\d/i],
  working_tip_taper: [/\btip\b/i, /\btaper\b/i, /\bdraft\b/i, /\bpoint\b/i],
  back_stub: [/\bstub\b/i, /\bback\b/i, /\btail\b/i],
  shank_grind_relief: [/\bshank\b/i, /\bground\b/i, /\bgrind\b/i],
  stepped_revolved_axis: [/\bstepped\b/i, /\bshank\b/i, /\bspindle\b/i, /\baxle\b/i],
  leading_edge_fillet: [/\bleading\s*edge\b/i, /\bLE\s*radius\b/i, /\bLE\s*fillet\b/i],
  trailing_edge_fillet: [/\btrailing\s*edge\b/i, /\bTE\s*radius\b/i, /\bTE\s*fillet\b/i],
  blade_root_fillet: [/\broot\s*fillet\b/i, /\bhub\s*fillet\b/i, /\bblade\s*root\b/i],
  balance_hole: [/\bbalance\b/i, /\bimbalance\b/i],
  tip_clearance: [/\btip\s*clearance\b/i, /\btip\s*gap\b/i, /\bshroud\b/i],
  shroud_seal: [/\bshroud\b/i, /\bseal\b/i],
  polish_callout: [/\bpolish\b/i, /\belectropolish\b/i, /\bmirror\b/i],
  biocompat_note: [/\bbiocompat/i, /\bISO\s*10993/i, /\bASTM\s*F136/i],
  radiopaque_marker: [/\bradiopaque\b/i, /\bmarker\b/i],
  thread_chamfer: [/\bthread\s*chamfer\b/i, /\blead\s*chamfer\b/i],
  cannulation: [/\bcannulat/i, /\bguidewire\b/i],
  valve_seat_angle: [/\bseat\s*angle\b/i, /\bvalve\s*seat\b/i],
  valve_guide_bore: [/\bvalve\s*guide\b/i, /\bguide\s*bore\b/i, /\bstem\s*bore\b/i],
  main_bearing_bore: [/\bmain\s*bearing\b/i, /\bcrankshaft\s*bore\b/i, /\bmain\s*journal\b/i],
  deck_flatness_callout: [/\bflatness\b/i, /\bdeck\s*surface\b/i, /\bgasket\s*surface\b/i],
  head_bolt_pattern: [/\bhead\s*bolt\b/i, /\bbolt\s*pattern\b/i],
  edge_distance_callout: [/\bedge\s*distance\b/i, /\be\/d\b/i],
  fatigue_finish_callout: [/\bfatigue\b/i, /\bsn\s*curve\b/i],
  shot_peen_zone: [/\bshot\s*peen\b/i, /\blaser\s*peen\b/i, /\bpeening\b/i],
  anti_fretting_coating: [/\banti.?fretting\b/i, /\bfretting\s*coat/i],
  bushing_press_fit: [/\bbushing\b/i, /\bpress\s*fit\b/i, /\binterference\s*fit\b/i],
  lockwire_hole: [/\block\s*wire\b/i, /\bsafety\s*wire\b/i, /\bcotter\b/i, /\bcastle\s*nut\b/i],
};

// ── Engine ──────────────────────────────────────────────────────────

export class CADCorpusFeaturePrevalenceLearnerEngine {
  /**
   * Compute learned prevalence for a single (class, feature) pair.
   * Returns confident=false when class_size < MIN_CORPUS_SUPPORT.
   */
  learnPrevalence(
    manifest: CorpusManifest,
    partClass: PartClass,
    featureKind: FeatureTemplate["kind"],
  ): LearnedPrevalence {
    const regexes = FEATURE_TOKEN_REGEXES[featureKind] ?? [];
    const classMembers = manifest.entries.filter((e) => e.part_class === partClass);
    const matchedTokens = new Set<string>();
    let positives = 0;

    for (const entry of classMembers) {
      const blob = entry.rel_path.replace(/[\\/]/g, " ");
      const hit = this.firstMatch(blob, regexes);
      if (hit) {
        positives++;
        matchedTokens.add(hit);
      }
    }
    const classSize = classMembers.length;
    const learned = classSize > 0 ? positives / classSize : 0;
    return {
      part_class: partClass,
      feature_kind: featureKind,
      class_size: classSize,
      positive_hits: positives,
      learned_prevalence: learned,
      confident: classSize >= MIN_CORPUS_SUPPORT,
      matched_tokens: Array.from(matchedTokens),
    };
  }

  /**
   * Walk every (class, feature) pair the library exposes and compute a learned
   * prevalence for each. Returns a comprehensive report including divergences
   * vs hand-tuned weights.
   */
  learnAll(
    manifest: CorpusManifest,
    handTunedTemplates: ReadonlyArray<{ part_class: PartClass; features: FeatureTemplate[] }>,
    divergence_threshold = 0.2,
  ): LearningReport {
    const results: LearnedPrevalence[] = [];
    const divergences: LearningReport["divergences"] = [];
    const classesExamined: PartClass[] = [];

    for (const template of handTunedTemplates) {
      classesExamined.push(template.part_class);
      for (const feature of template.features) {
        const learned = this.learnPrevalence(manifest, template.part_class, feature.kind);
        results.push(learned);
        if (learned.confident) {
          const delta = learned.learned_prevalence - feature.prevalence;
          if (Math.abs(delta) >= divergence_threshold) {
            divergences.push({
              part_class: template.part_class,
              feature_kind: feature.kind,
              hand_tuned: feature.prevalence,
              learned: learned.learned_prevalence,
              delta,
            });
          }
        }
      }
    }

    return {
      generated_at: new Date().toISOString(),
      corpus_size: manifest.total_entries,
      classes_examined: classesExamined,
      results,
      divergences,
    };
  }

  /**
   * Apply learned prevalences back to the templates, returning a new template
   * list with confident learned values overriding the hand tunes (and a small
   * smoothing factor to prevent overconfident corrections from a tiny corpus).
   */
  applyLearned(
    handTunedTemplates: ReadonlyArray<{ part_class: PartClass; features: FeatureTemplate[] }>,
    report: LearningReport,
    smoothing_alpha = 0.7,
  ): Array<{ part_class: PartClass; features: FeatureTemplate[] }> {
    const learnedByKey = new Map<string, LearnedPrevalence>();
    for (const r of report.results) {
      learnedByKey.set(`${r.part_class}::${r.feature_kind}`, r);
    }
    return handTunedTemplates.map((t) => ({
      part_class: t.part_class,
      features: t.features.map((f) => {
        const key = `${t.part_class}::${f.kind}`;
        const learned = learnedByKey.get(key);
        if (!learned || !learned.confident) return f;
        const blended = smoothing_alpha * learned.learned_prevalence + (1 - smoothing_alpha) * f.prevalence;
        return { ...f, prevalence: Math.max(0, Math.min(1, blended)) };
      }),
    }));
  }

  /**
   * U-FGE03 — persist `applyLearned()` output to a durable overlay so the
   * DEFAULT build-sequence inference path (`CADClassFeatureLibraryEngine
   * .templateFor` → `buildSequenceFor`) auto-consumes trained corpus
   * evidence without an explicit opt-in action.
   *
   * Closes the exact gap named in `reference_cad_fusion_training_2026_05_18`
   * (R12): "the geometry report is the real model but is NOT auto-blended
   * into the live build-sequence templates — `cad_corpus_apply_learned`
   * does an in-memory blend with no persistence path. Wire-to-inference is
   * a real follow-up unit." U-FGE01/02 added opt-in surfaces
   * (`buildSequenceForEvidence`, `use_corpus_evidence` flag); this unit
   * makes the blend persistent + auto-applied on the default path.
   *
   * Atomic by construction: writes `<path>.tmp-<pid>` then renames over the
   * target (rename is atomic on NTFS + POSIX), so a concurrent fleet reader
   * never observes a torn JSON. NaN/Infinity prevalences are SKIPPED (never
   * persisted — a poisoned overlay would silently corrupt every downstream
   * build sequence; R12 — surface, don't propagate). Out-of-range values are
   * clamped to [0,1].
   *
   * Pure-core friendly: `opts.overlayPath` + `opts.fsImpl` are injectable so
   * the test suite never touches the real `data/state/` file. When omitted,
   * the path is resolved CWD-independently from this module's location
   * (`dist/engines/X.js` → `../..` = `mcp-server/` → `data/state/`), mirroring
   * the U-FGE01 dispatcher anchor convention exactly.
   *
   * @returns typed result — `ok:false` + `error` on any fs failure (NEVER a
   *          silent catch; the caller surfaces it). Never throws to the
   *          dispatcher (a persistence I/O failure must not crash an
   *          otherwise-successful blend), matching U-FGE01's `success=false`
   *          fail-loud contract.
   */
  async persistLearned(
    blendedTemplates: ReadonlyArray<{ part_class: PartClass; features: FeatureTemplate[] }>,
    opts: PersistLearnedOpts = {},
  ): Promise<PersistLearnedResult> {
    const fs = opts.fsImpl ?? (await import("node:fs/promises"));
    const pathMod = await import("node:path");
    const url = await import("node:url");

    let overlayPath = opts.overlayPath;
    if (!overlayPath) {
      // KEEP-IN-SYNC with CADClassFeatureLibraryEngine.overlayPathResolved():
      // the WRITER (here) and the READER (templateFor's loader) MUST resolve
      // the identical absolute path or the wiring is a silent no-op. Env
      // override honored FIRST (call-time) so an operator relocating the
      // overlay can't make writer/reader diverge (per-file scrutiny arm B,
      // P0-1 latent divergence).
      const envPath = process.env.PRISM_CAD_PREVALENCE_OVERLAY_PATH;
      if (envPath && envPath.trim()) {
        overlayPath = envPath.trim();
      } else {
        // dist/engines/CADCorpusFeaturePrevalenceLearnerEngine.js -> ../.. = mcp-server/
        const engineDir = pathMod.dirname(url.fileURLToPath(import.meta.url));
        const mcpRoot = pathMod.resolve(engineDir, "..", "..");
        overlayPath = pathMod.resolve(mcpRoot, "data/state/cad-learned-prevalence-overlay.json");
      }
    }

    const prevalence: Record<string, Record<string, number>> = {};
    let featuresWritten = 0;
    let skippedNonFinite = 0;
    for (const t of blendedTemplates) {
      if (!t || typeof t.part_class !== "string" || !Array.isArray(t.features)) continue;
      const byKind: Record<string, number> = {};
      for (const f of t.features) {
        if (!f || typeof f.kind !== "string") continue;
        const p = Number(f.prevalence);
        if (!Number.isFinite(p)) {
          // R12: a NaN/Infinity prevalence would silently corrupt every
          // downstream build sequence — skip it loudly via skippedNonFinite,
          // never persist it.
          skippedNonFinite++;
          continue;
        }
        byKind[f.kind] = Math.max(0, Math.min(1, p));
        featuresWritten++;
      }
      if (Object.keys(byKind).length > 0) prevalence[t.part_class] = byKind;
    }

    const overlay: LearnedPrevalenceOverlay = {
      schemaVersion: "1.0.0",
      generated_at: new Date().toISOString(),
      source: "cad_corpus_apply_learned",
      smoothing_alpha: typeof opts.smoothing_alpha === "number" ? opts.smoothing_alpha : null,
      prevalence,
    };

    const tmpPath = `${overlayPath}.tmp-${process.pid}`;
    try {
      await fs.mkdir(pathMod.dirname(overlayPath), { recursive: true });
      await fs.writeFile(tmpPath, JSON.stringify(overlay, null, 2), "utf8");
      await fs.rename(tmpPath, overlayPath);
    } catch (e: unknown) {
      // Best-effort tmp cleanup; ignore a cleanup failure (the real error is
      // the write/rename one — surface THAT).
      try { await fs.unlink(tmpPath); } catch { /* tmp may not exist */ }
      return {
        ok: false,
        path: overlayPath,
        classes: 0,
        features_written: 0,
        skipped_non_finite: skippedNonFinite,
        error: e instanceof Error ? e.message : String(e),
      };
    }

    return {
      ok: true,
      path: overlayPath,
      classes: Object.keys(prevalence).length,
      features_written: featuresWritten,
      skipped_non_finite: skippedNonFinite,
    };
  }

  // ── Internal helpers ──

  private firstMatch(text: string, regexes: RegExp[]): string | null {
    for (const re of regexes) {
      const m = text.match(re);
      if (m) return m[0];
    }
    return null;
  }

  /** Public for tests — list every supported feature kind. */
  supportedFeatureKinds(): FeatureTemplate["kind"][] {
    return Object.keys(FEATURE_TOKEN_REGEXES) as FeatureTemplate["kind"][];
  }
}

export const cadCorpusFeaturePrevalenceLearnerEngine = new CADCorpusFeaturePrevalenceLearnerEngine();
