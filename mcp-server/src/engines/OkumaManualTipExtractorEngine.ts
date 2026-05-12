/**
 * OkumaManualTipExtractorEngine (E098)
 * =======================================
 *
 * Extracts tribal tips from Okuma OSP programming manuals. Consumes
 * already-extracted text (from /pdf-learn or manual copy-paste) and
 * classifies passages as tips, warnings, procedures, or examples.
 *
 * Design:
 *   - Does NOT ship a PDF parser. The 3.5GB MULTUS manuals need out-of-band
 *     extraction (/pdf-learn, pdftotext, or similar) — this engine takes
 *     the already-extracted text and structures it.
 *   - This keeps the engine testable (pure text → structured tips) while
 *     not blocking on PDF tooling availability.
 *
 * Classification heuristics:
 *   - "WARNING", "CAUTION", "DANGER" headers → warning class (priority 10)
 *   - "NOTE", "TIP", "RECOMMENDED" headers → tip class (priority 7)
 *   - Numbered/bulleted steps with imperative verbs → procedure (priority 5)
 *   - Code blocks (multi-line G-code / variable assignments) → example
 *
 * @module engines/OkumaManualTipExtractorEngine
 * @milestone LATHE-AWARE-HARDEN MS4 (U-LAT32)
 */

import * as fs from "fs";
import * as crypto from "crypto";

// ── Types ──────────────────────────────────────────────────────────────────

export type TipClass = "warning" | "tip" | "procedure" | "example" | "specification";

export interface ExtractedTip {
  id: string;
  class: TipClass;
  title?: string;
  content: string;
  priority: number; // 1-10
  keywords: string[];
  source_section?: string;
  source_manual?: string;
  line_number?: number;
}

export interface ExtractionResult {
  source: string;
  tips: ExtractedTip[];
  tip_counts: Record<TipClass, number>;
  total_lines: number;
  sections_detected: string[];
  warnings_found: number;
  generated_at: string;
}

export interface ExtractionOptions {
  /** Manual name/edition tag for audit (e.g. "OSP-P300L Programming Manual v5.8") */
  manual_name?: string;
  /** Minimum word count for a tip to be emitted (filter tiny fragments) */
  min_words?: number;
  /** Restrict to these classes */
  classes?: TipClass[];
}

// ── Detectors ──────────────────────────────────────────────────────────────

const SECTION_RE = /^(?:\d+(?:\.\d+)*\s+)?([A-Z][A-Z0-9 \-\/]{3,})$/;
const WARNING_RE = /^\s*(WARNING|CAUTION|DANGER|IMPORTANT)\s*[:!.\-]/i;
const TIP_RE = /^\s*(NOTE|TIP|RECOMMENDED|HINT)\s*[:!.\-]/i;
const SPEC_RE = /^\s*(SPECIFICATION|PARAMETER|DEFAULT|RANGE)\s*[:!.\-]/i;
const BULLET_RE = /^\s*[-*•▪◦]\s+(.+)/;
const NUMBERED_RE = /^\s*\d+[.)\]]\s+(.+)/;
const GCODE_LINE_RE = /^\s*[NGM]\d+\s/i;
const MACRO_VAR_RE = /^\s*#\d+\s*=/;

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "is",
  "to",
  "of",
  "on",
  "for",
  "in",
  "by",
  "at",
  "be",
  "as",
  "with",
  "this",
  "that",
]);

function extractKeywords(text: string, limit = 8): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map((e) => e[0]);
}

function tipId(content: string, cls: TipClass): string {
  return crypto
    .createHash("sha1")
    .update(`${cls}::${content.slice(0, 200)}`)
    .digest("hex")
    .slice(0, 16);
}

// ── Engine Implementation ──────────────────────────────────────────────────

class OkumaManualTipExtractorEngineImpl {
  /**
   * Extract tips from already-extracted manual text.
   */
  extractFromText(text: string, options: ExtractionOptions = {}): ExtractionResult {
    const minWords = options.min_words ?? 4;
    const lines = text.split(/\r?\n/);
    const tips: ExtractedTip[] = [];
    const sections: string[] = [];
    let currentSection: string | undefined;
    const counts: Record<TipClass, number> = {
      warning: 0,
      tip: 0,
      procedure: 0,
      example: 0,
      specification: 0,
    };

    let i = 0;
    while (i < lines.length) {
      const rawLine = lines[i]!;
      const line = rawLine.trim();
      if (line.length === 0) {
        i++;
        continue;
      }

      // Section header
      const sectionMatch = line.match(SECTION_RE);
      if (sectionMatch && line.length < 80 && line === line.toUpperCase()) {
        currentSection = sectionMatch[1]!.trim();
        if (!sections.includes(currentSection)) sections.push(currentSection);
        i++;
        continue;
      }

      // WARNING / CAUTION / DANGER
      if (WARNING_RE.test(line)) {
        const { block, consumed } = this.consumeBlock(lines, i);
        const words = block.split(/\s+/).length;
        if (words >= minWords) {
          tips.push({
            id: tipId(block, "warning"),
            class: "warning",
            title: line.replace(WARNING_RE, "").trim() || "Warning",
            content: block,
            priority: 10,
            keywords: extractKeywords(block),
            source_section: currentSection,
            source_manual: options.manual_name,
            line_number: i + 1,
          });
          counts.warning++;
        }
        i += consumed;
        continue;
      }

      // NOTE / TIP / RECOMMENDED
      if (TIP_RE.test(line)) {
        const { block, consumed } = this.consumeBlock(lines, i);
        const words = block.split(/\s+/).length;
        if (words >= minWords) {
          tips.push({
            id: tipId(block, "tip"),
            class: "tip",
            title: line.replace(TIP_RE, "").trim() || "Tip",
            content: block,
            priority: 7,
            keywords: extractKeywords(block),
            source_section: currentSection,
            source_manual: options.manual_name,
            line_number: i + 1,
          });
          counts.tip++;
        }
        i += consumed;
        continue;
      }

      // SPECIFICATION / PARAMETER
      if (SPEC_RE.test(line)) {
        const { block, consumed } = this.consumeBlock(lines, i);
        tips.push({
          id: tipId(block, "specification"),
          class: "specification",
          title: line.replace(SPEC_RE, "").trim() || "Specification",
          content: block,
          priority: 5,
          keywords: extractKeywords(block),
          source_section: currentSection,
          source_manual: options.manual_name,
          line_number: i + 1,
        });
        counts.specification++;
        i += consumed;
        continue;
      }

      // Code block (consecutive G-code or macro variable lines)
      if (GCODE_LINE_RE.test(line) || MACRO_VAR_RE.test(line)) {
        const codeLines: string[] = [];
        while (
          i < lines.length &&
          (GCODE_LINE_RE.test(lines[i]!.trim()) || MACRO_VAR_RE.test(lines[i]!.trim()) || lines[i]!.trim().length === 0)
        ) {
          codeLines.push(lines[i]!);
          i++;
        }
        const nonEmpty = codeLines.filter((l) => l.trim().length > 0);
        if (nonEmpty.length >= 2) {
          const content = nonEmpty.join("\n");
          tips.push({
            id: tipId(content, "example"),
            class: "example",
            title: "Code example",
            content,
            priority: 4,
            keywords: extractKeywords(content),
            source_section: currentSection,
            source_manual: options.manual_name,
            line_number: i - nonEmpty.length + 1,
          });
          counts.example++;
        }
        continue;
      }

      // Procedure step (bulleted or numbered)
      if (BULLET_RE.test(line) || NUMBERED_RE.test(line)) {
        const stepLines: string[] = [];
        while (
          i < lines.length &&
          (BULLET_RE.test(lines[i]!.trim()) || NUMBERED_RE.test(lines[i]!.trim()))
        ) {
          stepLines.push(lines[i]!.trim());
          i++;
        }
        if (stepLines.length >= 2) {
          const content = stepLines.join("\n");
          tips.push({
            id: tipId(content, "procedure"),
            class: "procedure",
            title: "Procedure",
            content,
            priority: 5,
            keywords: extractKeywords(content),
            source_section: currentSection,
            source_manual: options.manual_name,
            line_number: i - stepLines.length + 1,
          });
          counts.procedure++;
        }
        continue;
      }

      i++;
    }

    let filtered = tips;
    if (options.classes && options.classes.length > 0) {
      const set = new Set(options.classes);
      filtered = tips.filter((t) => set.has(t.class));
    }

    return {
      source: options.manual_name ?? "in-memory",
      tips: filtered,
      tip_counts: counts,
      total_lines: lines.length,
      sections_detected: sections,
      warnings_found: counts.warning,
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Extract from a file containing already-extracted manual text.
   */
  extractFromFile(filePath: string, options: ExtractionOptions = {}): ExtractionResult {
    if (!fs.existsSync(filePath)) {
      return {
        source: filePath,
        tips: [],
        tip_counts: {
          warning: 0,
          tip: 0,
          procedure: 0,
          example: 0,
          specification: 0,
        },
        total_lines: 0,
        sections_detected: [],
        warnings_found: 0,
        generated_at: new Date().toISOString(),
      };
    }
    const text = fs.readFileSync(filePath, "utf-8");
    return this.extractFromText(text, {
      ...options,
      manual_name: options.manual_name ?? filePath,
    });
  }

  /**
   * Consume a block of lines starting at `start`, until a blank line or
   * a line that starts a new block marker.
   */
  private consumeBlock(lines: string[], start: number): { block: string; consumed: number } {
    const block: string[] = [];
    let consumed = 0;
    for (let i = start; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();
      if (trimmed.length === 0 && block.length > 0) {
        consumed = i - start + 1;
        break;
      }
      if (i > start && (WARNING_RE.test(trimmed) || TIP_RE.test(trimmed) || SPEC_RE.test(trimmed))) {
        consumed = i - start;
        break;
      }
      block.push(trimmed);
      consumed = i - start + 1;
    }
    return { block: block.join(" ").trim(), consumed: Math.max(1, consumed) };
  }

  getStats(): {
    supported_classes: TipClass[];
    input_contract: string;
    max_keywords_per_tip: number;
  } {
    return {
      supported_classes: ["warning", "tip", "procedure", "example", "specification"],
      input_contract: "Already-extracted text (caller runs /pdf-learn or pdftotext first)",
      max_keywords_per_tip: 8,
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const okumaManualTipExtractorEngine = new OkumaManualTipExtractorEngineImpl();
export type { OkumaManualTipExtractorEngineImpl };
