/**
 * CADRevisionDetectorEngine — U-FS-03 (PHASE-47)
 *
 * Auto-extracts revision tags from CAD filenames using regex + heuristics,
 * normalizes them to a canonical form, and can group a file set into
 * revision families with latest-rev resolution.
 *
 * Closes R14-FS-03.
 *
 * Supported patterns (ordered by decreasing specificity / confidence):
 *   1. Explicit "Rev.X" / "REV-X" / "_RevX" tag      → confidence 0.98
 *   2. "_Rn" / "-Rn" (numeric rev suffix)            → confidence 0.95
 *   3. "v{N}" / "V{N}" version suffix                → confidence 0.92
 *   4. "_{A-Z}" or "-{A-Z}" single-letter rev        → confidence 0.85
 *   5. "_{NN}" / "-{NN}" numeric suffix (02, 03…)    → confidence 0.80
 *   6. Dotted version "1.2" / "2.3"                  → confidence 0.78
 *   7. Trailing letter "bracketA"                    → confidence 0.55 (ambiguous)
 *   8. ISO date "YYYY-MM-DD" inside name             → confidence 0.70
 *
 * Any filename with NO recognized token returns {revision: "", scheme: "unknown",
 * source: "none", confidence: 0.0}.
 *
 * @module engines/CADRevisionDetectorEngine
 */

import {
  RevisionTagSchema,
  RevisionGroupSchema,
  type RevisionTag,
  type RevisionGroup,
  type RevisionScheme,
  type RevisionConfidenceSource,
} from "../schemas/cadRevisionSchema.js";

// Known CAD extensions we strip before running revision regex.
const KNOWN_EXTENSIONS = new Set([
  ".sldprt", ".sldasm", ".slddrw",
  ".prt", ".asm", ".drw",
  ".ipt", ".iam", ".idw",
  ".catpart", ".catproduct", ".catdrawing",
  ".step", ".stp", ".iges", ".igs",
  ".x_t", ".x_b", ".xmt_txt", ".xmt_bin",
  ".dwg", ".dxf",
  ".3dm", ".sat",
  ".f3d", ".f3z",
  ".stl", ".obj",
  ".jt", ".parasolid",
]);

function stripExtension(filename: string): { base: string; ext: string } {
  const lower = filename.toLowerCase();
  for (const ext of KNOWN_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return { base: filename.slice(0, filename.length - ext.length), ext };
    }
  }
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx > 0 && dotIdx > filename.length - 8) {
    return { base: filename.slice(0, dotIdx), ext: filename.slice(dotIdx).toLowerCase() };
  }
  return { base: filename, ext: "" };
}

interface Match {
  drawingNumber: string;
  revision: string;
  revisionNumber?: number;
  scheme: RevisionScheme;
  source: RevisionConfidenceSource;
  confidence: number;
}

// Pattern 1: explicit "Rev.X", "REV-X", "_RevA1", " RevB "
const RE_EXPLICIT_REV = /^(.+?)[\s_\-\.]?Rev\.?\s*[_\-]?\s*([A-Z0-9]+)\s*$/i;

// Pattern 2: "_R{n}" or "-R{n}" (n may have leading zero)
const RE_R_NUM = /^(.+?)[_\-]R(\d{1,3})\s*$/i;

// Pattern 3: "v{N}" or "V{N}" at end
const RE_V_NUM = /^(.+?)[_\-\s]?[vV](\d{1,3})\s*$/;

// Pattern 4: "_A" or "-B" trailing single letter (A-Z)
const RE_SINGLE_LETTER = /^(.+?)[_\-]([A-Z])\s*$/;

// Pattern 5: "_02" or "-03" trailing numeric suffix (2+ digits)
const RE_NUM_SUFFIX = /^(.+?)[_\-](\d{1,3})\s*$/;

// Pattern 6: dotted version "1.2"
const RE_DOTTED = /^(.+?)[_\-\s]?(\d{1,3})\.(\d{1,2})\s*$/;

// Pattern 7: trailing letter no separator ("bracketA")
const RE_TRAILING_LETTER = /^(.+?)([A-Z])\s*$/;

// Pattern 8: ISO date "YYYY-MM-DD" anywhere
const RE_ISO_DATE = /(\d{4})-(\d{2})-(\d{2})/;

function tryMatch(base: string): Match | null {
  let m: RegExpExecArray | null;

  // 1. explicit Rev.X
  m = RE_EXPLICIT_REV.exec(base);
  if (m) {
    const drawingNumber = m[1].replace(/[\s_\-\.]+$/, "");
    const revRaw = m[2];
    const numeric = /^\d+$/.test(revRaw) ? parseInt(revRaw, 10) : undefined;
    return {
      drawingNumber,
      revision: revRaw.toUpperCase(),
      revisionNumber: numeric,
      scheme: /^\d+$/.test(revRaw)
        ? "numeric"
        : /^[A-Z]+$/i.test(revRaw)
          ? "alpha"
          : "alpha_num",
      source: "explicit_tag",
      confidence: 0.98,
    };
  }

  // 2. _R{n}
  m = RE_R_NUM.exec(base);
  if (m) {
    const drawingNumber = m[1];
    const n = parseInt(m[2], 10);
    return {
      drawingNumber,
      revision: `R${n}`,
      revisionNumber: n,
      scheme: "numeric",
      source: "explicit_tag",
      confidence: 0.95,
    };
  }

  // 3. v{N}
  m = RE_V_NUM.exec(base);
  if (m) {
    const drawingNumber = m[1];
    const n = parseInt(m[2], 10);
    return {
      drawingNumber,
      revision: `V${n}`,
      revisionNumber: n,
      scheme: "numeric",
      source: "version_v",
      confidence: 0.92,
    };
  }

  // 6. dotted version
  m = RE_DOTTED.exec(base);
  if (m) {
    const drawingNumber = m[1];
    const major = parseInt(m[2], 10);
    const minor = parseInt(m[3], 10);
    return {
      drawingNumber,
      revision: `${major}.${minor}`,
      revisionNumber: major,
      scheme: "dotted",
      source: "dotted_version",
      confidence: 0.78,
    };
  }

  // 8. ISO date — check BEFORE numeric suffix so "2024-03-15" doesn't get
  //    shredded into a "_15" numeric match.
  m = RE_ISO_DATE.exec(base);
  if (m) {
    const dateStr = `${m[1]}-${m[2]}-${m[3]}`;
    const drawingNumber = base.replace(dateStr, "").replace(/[\s_\-]+$/, "").trim();
    return {
      drawingNumber: drawingNumber || base,
      revision: dateStr,
      scheme: "iso_date",
      source: "iso_date",
      confidence: 0.7,
    };
  }

  // 4. single-letter suffix with separator
  m = RE_SINGLE_LETTER.exec(base);
  if (m) {
    return {
      drawingNumber: m[1],
      revision: m[2].toUpperCase(),
      scheme: "alpha",
      source: "underscore_alpha",
      confidence: 0.85,
    };
  }

  // 5. numeric suffix 1–3 digits with separator
  m = RE_NUM_SUFFIX.exec(base);
  if (m) {
    const n = parseInt(m[2], 10);
    return {
      drawingNumber: m[1],
      revision: m[2].padStart(2, "0"),
      revisionNumber: n,
      scheme: "numeric",
      source: "dash_numeric",
      confidence: 0.8,
    };
  }

  // 7. trailing letter no separator (weakest)
  m = RE_TRAILING_LETTER.exec(base);
  if (m && m[1].length >= 2) {
    return {
      drawingNumber: m[1],
      revision: m[2].toUpperCase(),
      scheme: "alpha",
      source: "trailing_letter",
      confidence: 0.55,
    };
  }

  return null;
}

function normalizeDrawing(n: string): string {
  return n.trim().replace(/[\s_\-\.]+$/, "").toUpperCase();
}

export class CADRevisionDetectorEngine {
  /** Extract a revision tag from a single filename. */
  detect(filename: string): RevisionTag {
    const { base, ext } = stripExtension(filename);
    const match = tryMatch(base);
    if (!match) {
      return RevisionTagSchema.parse({
        rawFilename: filename,
        drawingNumber: normalizeDrawing(base),
        revision: "",
        scheme: "unknown",
        source: "none",
        confidence: 0.0,
        extension: ext,
      });
    }
    return RevisionTagSchema.parse({
      rawFilename: filename,
      drawingNumber: normalizeDrawing(match.drawingNumber),
      revision: match.revision,
      revisionNumber: match.revisionNumber,
      scheme: match.scheme,
      source: match.source,
      confidence: match.confidence,
      extension: ext,
    });
  }

  /** Group filenames by drawing number + compute latest revision per group. */
  group(filenames: string[]): RevisionGroup[] {
    const tags = filenames.map((f) => this.detect(f));
    const byDrawing = new Map<string, RevisionTag[]>();
    for (const t of tags) {
      const k = t.drawingNumber;
      if (!byDrawing.has(k)) byDrawing.set(k, []);
      byDrawing.get(k)!.push(t);
    }
    const groups: RevisionGroup[] = [];
    for (const [drawingNumber, revs] of byDrawing) {
      const schemes = new Set(revs.map((r) => r.scheme));
      let sortOrder: "alpha" | "numeric" | "mixed" | "unknown";
      if (schemes.size === 1 && schemes.has("alpha")) sortOrder = "alpha";
      else if (schemes.size === 1 && (schemes.has("numeric") || schemes.has("dotted"))) sortOrder = "numeric";
      else if (schemes.has("unknown") && schemes.size === 1) sortOrder = "unknown";
      else sortOrder = "mixed";

      const latest = this.resolveLatest(revs);
      groups.push(
        RevisionGroupSchema.parse({
          drawingNumber,
          revisions: revs,
          latestRevision: latest,
          sortOrder,
        }),
      );
    }
    return groups;
  }

  /** Determine latest revision within a set sharing a drawing number. */
  resolveLatest(tags: RevisionTag[]): RevisionTag | undefined {
    const usable = tags.filter((t) => t.confidence > 0 && t.revision !== "");
    if (usable.length === 0) return undefined;

    const sorted = [...usable].sort((a, b) => {
      // Numeric wins by revisionNumber DESC
      if (a.revisionNumber !== undefined && b.revisionNumber !== undefined) {
        return b.revisionNumber - a.revisionNumber;
      }
      if (a.revisionNumber !== undefined) return -1;
      if (b.revisionNumber !== undefined) return 1;
      // Alpha wins by reverse alphabetic (C > B > A)
      if (a.revision > b.revision) return -1;
      if (a.revision < b.revision) return 1;
      // Tie-break on confidence (desc)
      return b.confidence - a.confidence;
    });
    return sorted[0];
  }

  /** Fast canonical stripper: returns just the drawing-number portion. */
  stripRevision(filename: string): string {
    return this.detect(filename).drawingNumber;
  }
}

// Singleton
export const cadRevisionDetectorEngine = new CADRevisionDetectorEngine();
