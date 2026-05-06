// WIRE-EXEMPT: corpus-learning surface used by scripts/mine-corpus-patterns.ts;
// dispatcher integration follows once the BlueprintVisionOCREngine peer-chat
// revert is reconciled and the CAD pipeline can consume the insights surface.
/**
 * CADCorpusPatternEngine — Mine learning patterns from the local CAD corpus.
 *
 * Reads a CorpusManifest produced by CADCorpusIngestionEngine and surfaces
 * shop-specific patterns the OCR + DfM pipeline can use as priors:
 *   - Token frequencies per part class (e.g. "EXTRUDE PUNCH" + "POINT" + "TIP")
 *   - File-size distributions (rough proxy for part complexity per class)
 *   - Recovered classifications for the unclassified ('general') residual
 *     using customer-specific naming heuristics — JM Die's part numbers
 *     follow a NNNN-NNN convention with a suffixed feature word
 *   - Source-bucket affinity (which directories tend to hold which classes)
 *
 * Pure function over the manifest — no I/O during mining. Caller decides
 * when to refresh and where to persist insights.
 *
 * @engine CADCorpusPatternEngine
 * @milestone CAD-FUSION-LIVE-MS0
 */

import type { CorpusManifest, CADCorpusEntry } from "./CADCorpusIngestionEngine.js";
import type { PartClass } from "./BlueprintVisionOCREngine.js";

// ── Types ──────────────────────────────────────────────────────────

/** Frequency of a single naming token across the corpus. */
export interface TokenFrequency {
  token: string;
  count: number;
  /** Distribution of part_classes containing this token (sorted descending). */
  by_class: Array<{ class: PartClass; count: number }>;
}

/** File-size statistics in bytes for one part class. */
export interface SizeStats {
  class: PartClass;
  count: number;
  median_bytes: number;
  p10_bytes: number;
  p90_bytes: number;
  mean_bytes: number;
}

/** Recovered classification for an entry that initially fell to 'general'. */
export interface RecoveredEntry {
  rel_path: string;
  recovered_class: PartClass;
  confidence: number;
  reason: string;
}

export interface CorpusInsights {
  generated_at: string;
  total_entries: number;
  classified_pct: number;
  /** Top token frequencies (excluding stopwords). */
  top_tokens: TokenFrequency[];
  /** File-size distribution per class. */
  size_stats: SizeStats[];
  /** Recovered classifications for the residual. */
  recovered: RecoveredEntry[];
  /** Source bucket → dominant part class. */
  bucket_affinity: Array<{ bucket: string; dominant_class: PartClass; count: number }>;
}

// ── Constants ──────────────────────────────────────────────────────

const STOPWORDS = new Set<string>([
  "THE", "AND", "FOR", "WITH", "FROM", "PART", "ASSY", "REV", "NEW", "OLD",
  "NA", "NO", "OF", "TO", "IN", "ON", "AT", "BY", "OR", "IS", "AN", "A",
  "MARK", "JOHN", "DAVE", "MARKED",  // operator names — drop
  "MACHINE", "MILL", "LATHE", "OKUMA", "HAAS", "HURCO", "MULTUS",  // machine assignments — drop
  "STEP", "STP", "IGES", "IGS", "STL", "DXF", "IPT", "SLDPRT",  // formats
]);

const MIN_TOKEN_LEN = 3;
const MIN_TOKEN_FREQ = 3;
const TOP_TOKEN_LIMIT = 50;

// JM Die part-number pattern: 4-digit prefix, dash, 3-digit suffix, e.g. "2475-037"
const JM_DIE_PART_NUMBER = /\b\d{4}-\d{2,3}\b/;

// Common feature suffix words appearing in unclassified JM Die filenames.
const FEATURE_WORD_RULES: Array<{ class: PartClass; pattern: RegExp; confidence: number; reason: string }> = [
  { class: "extrude_punch", pattern: /\bPUNCH\b/i, confidence: 0.9, reason: "filename contains 'PUNCH' + JM Die part number convention" },
  { class: "die", pattern: /\bDIE\b|\bMOLD\b|\bCAVITY\b/i, confidence: 0.85, reason: "filename contains DIE/MOLD/CAVITY token" },
  { class: "die", pattern: /\bTRIM\b|\bFORM\b|\bDRAW\b/i, confidence: 0.7, reason: "filename contains die-class operation token (TRIM/FORM/DRAW)" },
  { class: "extrude_punch", pattern: /\bPOINT\b|\bTIP\b/i, confidence: 0.55, reason: "filename contains punch-tip feature token (POINT/TIP)" },
  { class: "shaft", pattern: /\bSHAFT\b|\bPIN\b|\bSPINDLE\b|\bROD\b/i, confidence: 0.7, reason: "filename contains shaft/pin/spindle/rod token" },
  { class: "bushing", pattern: /\bSLEEVE\b|\bGUIDE\b|\bLINER\b/i, confidence: 0.65, reason: "filename contains sleeve/guide/liner token" },
  { class: "casing", pattern: /\bHOUSING\b|\bENCLOSURE\b|\bBODY\b/i, confidence: 0.6, reason: "filename contains housing/body/enclosure token" },
  { class: "plate", pattern: /\bPLATE\b|\bBASE\b|\bSPACER\b/i, confidence: 0.6, reason: "filename contains plate/base/spacer token" },
  { class: "bracket", pattern: /\bMOUNT\b|\bSUPPORT\b|\bBRACKET\b/i, confidence: 0.7, reason: "filename contains mount/support/bracket token" },
  { class: "fitting", pattern: /\bFITTING\b|\bADAPTER\b|\bCOUPLING\b/i, confidence: 0.7, reason: "filename contains fitting/adapter/coupling token" },
];

// ── Engine ──────────────────────────────────────────────────────────

export class CADCorpusPatternEngine {
  /**
   * Mine all available patterns from a manifest. Returns a CorpusInsights
   * snapshot the caller can persist or feed to the OCR engine.
   */
  mine(manifest: CorpusManifest): CorpusInsights {
    return {
      generated_at: new Date().toISOString(),
      total_entries: manifest.total_entries,
      classified_pct: this.classifiedPercentage(manifest),
      top_tokens: this.topTokens(manifest, TOP_TOKEN_LIMIT),
      size_stats: this.sizeStatsByClass(manifest),
      recovered: this.recoverUnclassified(manifest),
      bucket_affinity: this.bucketAffinity(manifest),
    };
  }

  classifiedPercentage(manifest: CorpusManifest): number {
    if (manifest.total_entries === 0) return 0;
    const classified = manifest.entries.filter((e) => e.part_class !== "general").length;
    return Math.round((classified / manifest.total_entries) * 1000) / 10;
  }

  /**
   * Top naming tokens by frequency. Tokenizes filenames at non-alphanumeric
   * boundaries, drops stopwords + sub-MIN_TOKEN_LEN tokens, then tracks the
   * part_class distribution for each.
   */
  topTokens(manifest: CorpusManifest, limit: number): TokenFrequency[] {
    const counts = new Map<string, { count: number; classes: Map<PartClass, number> }>();

    for (const e of manifest.entries) {
      const stem = e.rel_path.split("/").pop() ?? "";
      const base = stem.replace(/\.[^.]+$/, ""); // drop extension
      const tokens = base.toUpperCase().split(/[^A-Z0-9]+/).filter((t) => t.length >= MIN_TOKEN_LEN && !STOPWORDS.has(t) && !/^\d+$/.test(t));
      for (const tok of tokens) {
        let entry = counts.get(tok);
        if (!entry) {
          entry = { count: 0, classes: new Map<PartClass, number>() };
          counts.set(tok, entry);
        }
        entry.count++;
        entry.classes.set(e.part_class, (entry.classes.get(e.part_class) ?? 0) + 1);
      }
    }

    const tokenFreqs: TokenFrequency[] = [];
    for (const [tok, data] of counts) {
      if (data.count < MIN_TOKEN_FREQ) continue;
      const byClass = Array.from(data.classes.entries())
        .map(([cls, cnt]) => ({ class: cls, count: cnt }))
        .sort((a, b) => b.count - a.count);
      tokenFreqs.push({ token: tok, count: data.count, by_class: byClass });
    }
    tokenFreqs.sort((a, b) => b.count - a.count);
    return tokenFreqs.slice(0, limit);
  }

  /**
   * Per-class file-size statistics: count, p10, median, p90, mean.
   * Useful as a quick complexity proxy — extrude punches are typically <100KB
   * while engine blocks are tens of MB.
   */
  sizeStatsByClass(manifest: CorpusManifest): SizeStats[] {
    const buckets = new Map<PartClass, number[]>();
    for (const e of manifest.entries) {
      let arr = buckets.get(e.part_class);
      if (!arr) {
        arr = [];
        buckets.set(e.part_class, arr);
      }
      arr.push(e.size_bytes);
    }
    const stats: SizeStats[] = [];
    for (const [cls, sizes] of buckets) {
      sizes.sort((a, b) => a - b);
      const n = sizes.length;
      const p10Idx = Math.floor(n * 0.1);
      const p50Idx = Math.floor(n * 0.5);
      const p90Idx = Math.floor(n * 0.9);
      const sum = sizes.reduce((acc, v) => acc + v, 0);
      stats.push({
        class: cls,
        count: n,
        p10_bytes: sizes[p10Idx] ?? 0,
        median_bytes: sizes[p50Idx] ?? 0,
        p90_bytes: sizes[p90Idx] ?? sizes[n - 1] ?? 0,
        mean_bytes: n > 0 ? Math.round(sum / n) : 0,
      });
    }
    stats.sort((a, b) => b.count - a.count);
    return stats;
  }

  /**
   * Re-classify the 'general' residual using customer-specific feature-word
   * heuristics. JM Die filenames carry a 4-digit-3-digit part number with a
   * trailing feature word (e.g. "2475-037 PUNCH POINT") — this rescues most
   * of the 60%+ unclassified residual into an actionable class.
   */
  recoverUnclassified(manifest: CorpusManifest): RecoveredEntry[] {
    const recovered: RecoveredEntry[] = [];
    for (const e of manifest.entries) {
      if (e.part_class !== "general") continue;
      const upper = e.rel_path.toUpperCase();
      const hasPartNumber = JM_DIE_PART_NUMBER.test(upper);
      for (const rule of FEATURE_WORD_RULES) {
        if (rule.pattern.test(upper)) {
          // Boost confidence when JM Die part number convention is also present.
          const conf = hasPartNumber ? Math.min(0.99, rule.confidence + 0.05) : rule.confidence;
          recovered.push({
            rel_path: e.rel_path,
            recovered_class: rule.class,
            confidence: conf,
            reason: rule.reason + (hasPartNumber ? " + JM Die part-number convention" : ""),
          });
          break; // first-match-wins — same as ingestion engine
        }
      }
    }
    return recovered;
  }

  /**
   * For each source bucket, find the dominant part class. Lets the OCR
   * engine apply a directory-prior — a file under "DIES/" is much more
   * likely to be a die even if filename doesn't say so.
   */
  bucketAffinity(manifest: CorpusManifest): Array<{ bucket: string; dominant_class: PartClass; count: number }> {
    const buckets = new Map<string, Map<PartClass, number>>();
    for (const e of manifest.entries) {
      const b = e.source_bucket ?? "(uncategorized)";
      let m = buckets.get(b);
      if (!m) {
        m = new Map<PartClass, number>();
        buckets.set(b, m);
      }
      m.set(e.part_class, (m.get(e.part_class) ?? 0) + 1);
    }
    const out: Array<{ bucket: string; dominant_class: PartClass; count: number }> = [];
    for (const [bucket, classes] of buckets) {
      let bestClass: PartClass = "general";
      let bestCount = 0;
      for (const [cls, cnt] of classes) {
        if (cls === "general") continue; // ignore unclassified for affinity
        if (cnt > bestCount) {
          bestClass = cls;
          bestCount = cnt;
        }
      }
      if (bestCount > 0) {
        out.push({ bucket, dominant_class: bestClass, count: bestCount });
      }
    }
    out.sort((a, b) => b.count - a.count);
    return out;
  }

  /**
   * Apply a recovered classification back into the manifest, returning a new
   * manifest with updated part_class for each recovered entry. Used to lift
   * classification rate before passing the corpus to downstream consumers.
   */
  applyRecoveries(manifest: CorpusManifest, recovered: RecoveredEntry[]): CorpusManifest {
    const recMap = new Map<string, RecoveredEntry>();
    for (const r of recovered) recMap.set(r.rel_path, r);

    const newEntries: CADCorpusEntry[] = manifest.entries.map((e) => {
      const r = recMap.get(e.rel_path);
      if (!r) return e;
      return {
        ...e,
        part_class: r.recovered_class,
        classifier_confidence: r.confidence,
        classifier_match: r.reason,
      };
    });

    const byClass: Record<string, number> = {};
    for (const e of newEntries) {
      byClass[e.part_class] = (byClass[e.part_class] ?? 0) + 1;
    }
    return {
      ...manifest,
      generated_at: new Date().toISOString(),
      entries: newEntries,
      by_class: byClass,
    };
  }
}

export const cadCorpusPatternEngine = new CADCorpusPatternEngine();
