/**
 * post-pdf-corpus-parser.mjs — pure parser for post-writing PDF text extracts.
 *
 * Input:  raw text dumped via `pdftotext -layout` from
 *           - resources/RESOURCE PDFS/Post Processor Training Guide.pdf
 *           - resources/RESOURCE PDFS/Post+Processor+Documentation+-+2021-02-04.pdf
 * Output: structured `{chapters:[{num,title,sections:[{num,title,startLine,endLine,preview}]}], summary:{...}}`.
 *
 * The parser is byte-stable + pure (no I/O, no Date.now). Section detection is
 * heuristic but conservative — it ONLY treats a line as a section heading when
 * it matches one of the TWO documented PDF patterns (numbered chapters /
 * dotted sections in the Autodesk guide; left-aligned bold headings in the
 * Postability guide). Mis-matches degrade gracefully into the "general"
 * bucket rather than corrupting the chapter map.
 *
 * Consumer: scripts/generate-post-pdf-corpus-features.mjs (system-viz augment).
 *
 * Scrutiny axes (build with these in mind):
 *  - empty / 1-line input → returns `{chapters:[], summary:{lines:0,chapters:0,sections:0}}`, never throws.
 *  - TOC-only input (no chapter bodies) → chapters present, sections empty per chapter, no crash.
 *  - duplicate chapter numbers (e.g. PDF reprints a chapter) → keep first occurrence (forward-only).
 *  - line numbers always 1-indexed to match Read tool conventions.
 *
 * @milestone POST-PDF-NODE-MS0/U-POST-PDF-CORPUS-PARSE
 * @slot echo
 * @date 2026-05-26
 */

/**
 * Numbered top-level chapter heading. Autodesk Training Guide:
 *   "1 Introduction to Post Processors"
 *   "11 Additive Capabilities and Post Processors"
 * Postability uses bold ALL-CAPS but our pdftotext extract loses bold → use the
 * dedicated POSTABILITY_HEADING regex below.
 *
 * Constraints:
 *  - Must be at start of line (no whitespace prefix that would indicate TOC entry).
 *  - Number is 1-2 digits followed by a space and an alpha-leading title.
 *  - Title MUST NOT end with a page number (`... 1-1`) — that's the TOC line.
 *  - At least 4 chars of title to discard short stuff like "1 " on its own.
 */
const CHAPTER_HEADING = /^(\d{1,2})\s+([A-Z][A-Za-z][^.]*?)$/;

/**
 * Numbered subsection. Autodesk format:
 *   "1.1 Scope"
 *   "5.31.4 force---"
 *   "11.5.10 onAcceleration"
 * Up to 4 dotted levels. Title constraints same as chapter.
 */
const SECTION_HEADING = /^(\d{1,2}(?:\.\d{1,3}){1,3})\s+([A-Z][\w\s\-/()]{2,}?)$/;

/**
 * Postability guide section: left-aligned title line followed by content.
 * Used when CHAPTER_HEADING + SECTION_HEADING both miss. Example:
 *   "Rotary Switches"
 *   "Machine Orientation and Offset"
 * Heuristic: line is a known terminology from the Postability TOC + has
 * NO leading whitespace + does NOT end with a number.
 */
const POSTABILITY_SECTIONS = new Set([
  "Application of this Document",
  "General Terminology",
  "Unified Post Kernel (UPK) General Settings",
  "Rotary Switches",
  "Machine Orientation and Offset",
  "Advanced Control Options",
  "Home Motion",
  "Misc Control Options",
  "5-axis switches/variables",
  "Switches/variables for Mill-turn posts",
  "Miscellaneous Values",
  "General Notes",
  "Milling",
  "Lathe (Mill-Turn)",
  "Work Offset, Work Coordinate System (WCS), Tool/Construction Planes",
  "Rotary Axis",
  "3+2 Machining",
  "Rotary Axis Control (Milling Operations)",
  "Rotary Axis Control (Mill-Turn Operations)",
  "Multi-Axis",
  "Transitions between cuts",
  "Machine Setup Information",
  "Machine and Control Definition",
  "General Machine Parameters",
  "Axis Combinations",
  "Arcs",
]);

/**
 * Pure: build a section preview from N lines, skipping page-number footers
 * + blank lines. Returns up to maxChars of normalized single-line text.
 */
export function buildPreview(lines, startIdx, endIdx, maxChars = 240) {
  const slice = lines.slice(startIdx, Math.min(endIdx, startIdx + 30));
  const joined = slice
    .map(l => l.trim())
    .filter(l => l && !/^Page\s+\d+$/i.test(l) && !/^\d+\s*$/.test(l))
    .join(" ")
    .replace(/\s+/g, " ");
  return joined.slice(0, maxChars);
}

/**
 * Pure: skip the table-of-contents region. Returns the line index immediately
 * AFTER the last TOC line. Heuristic: TOC lines end in "... N-N" page refs.
 * If the extract has no TOC, returns 0 (start from beginning).
 */
export function findTocEnd(lines) {
  let lastTocLine = -1;
  for (let i = 0; i < Math.min(lines.length, 500); i++) {
    if (/\.\.\.+\s*\d+-?\d*\s*$/.test(lines[i]) || /\.\.\.+\s*$/.test(lines[i])) {
      lastTocLine = i;
    }
  }
  return lastTocLine + 1;
}

/**
 * Pure: parse a raw pdftotext extract into structured chapters + sections.
 * `bookId` is opaque metadata (e.g. "autodesk-post-training" or "postability-upk").
 * Returns shape stable across runs given identical input.
 */
export function parsePostPdfCorpus(text, bookId = "unknown") {
  const lines = String(text || "").split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && !lines[0])) {
    return {
      bookId,
      chapters: [],
      summary: { lines: 0, chapters: 0, sections: 0, mode: "empty" },
    };
  }

  const tocEnd = findTocEnd(lines);
  const bodyStart = tocEnd > 0 ? tocEnd : 0;

  const chapters = [];
  let currentChapter = null;
  let currentSection = null;
  const chapterSeen = new Set();
  const sectionSeen = new Set();

  // Mode A — numbered chapters/sections (Autodesk Training Guide).
  for (let i = bodyStart; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.replace(/[   ]/g, " ");
    const trimmed = line.trim();
    if (!trimmed) continue;

    const chMatch = trimmed.match(CHAPTER_HEADING);
    const secMatch = trimmed.match(SECTION_HEADING);

    if (chMatch && !chapterSeen.has(chMatch[1])) {
      const [, num, title] = chMatch;
      currentChapter = {
        num,
        title: title.trim(),
        startLine: i + 1,
        sections: [],
      };
      chapters.push(currentChapter);
      chapterSeen.add(num);
      currentSection = null;
      continue;
    }

    if (secMatch && currentChapter && !sectionSeen.has(secMatch[1])) {
      const [, num, title] = secMatch;
      // Subsections must namespace under the active chapter (first dot-segment matches).
      const topNum = num.split(".")[0];
      if (topNum === currentChapter.num) {
        if (currentSection) currentSection.endLine = i;
        currentSection = {
          num,
          title: title.trim(),
          startLine: i + 1,
          endLine: i + 1,
          preview: "",
        };
        currentChapter.sections.push(currentSection);
        sectionSeen.add(num);
      }
      continue;
    }
  }

  // Mode B — Postability-style (no numbering). Each Postability section is a
  // standalone heading; we synthesize a single "chapter" called "Document"
  // and slot each section under it IF mode A produced zero chapters.
  if (chapters.length === 0) {
    const docChapter = { num: "0", title: "Postability UPK Documentation", startLine: 1, sections: [] };
    chapters.push(docChapter);
    let secIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (POSTABILITY_SECTIONS.has(trimmed)) {
        if (docChapter.sections.length > 0) {
          docChapter.sections[docChapter.sections.length - 1].endLine = i;
        }
        secIdx++;
        docChapter.sections.push({
          num: `0.${secIdx}`,
          title: trimmed,
          startLine: i + 1,
          endLine: i + 1,
          preview: "",
        });
      }
    }
  }

  // Finalize ranges + previews on EVERY chapter (mode A + mode B both).
  for (const ch of chapters) {
    for (let s = 0; s < ch.sections.length; s++) {
      const cur = ch.sections[s];
      const next = ch.sections[s + 1];
      cur.endLine = next ? next.startLine - 1 : Math.min(lines.length, cur.startLine + 200);
      cur.preview = buildPreview(lines, cur.startLine - 1, cur.endLine);
    }
  }

  const sectionCount = chapters.reduce((a, ch) => a + ch.sections.length, 0);

  return {
    bookId,
    chapters,
    summary: {
      lines: lines.length,
      chapters: chapters.length,
      sections: sectionCount,
      mode: chapters.length > 0 && chapters[0].num === "0" ? "postability" : "autodesk",
    },
  };
}

/**
 * Pure: render a parsed corpus as JSONL records compatible with the existing
 * `state/shared/extracted-pdfs/*.jsonl` schema consumed by
 * generate-extracted-pdf-tips-features.mjs. Each section becomes one tip
 * record so the existing roost+pivot generator picks them up.
 */
export function corpusToJsonl(parsed, opts = {}) {
  const {
    book = "Unknown Post-Writing PDF",
    pdfPath = "",
    domain = "post-processor",
    audience = ["echo", "india"],
    bridgeEngines = [],
  } = opts;
  const out = [];
  for (const ch of parsed.chapters) {
    for (const sec of ch.sections) {
      const id = `${parsed.bookId}.ch${ch.num}.sec${sec.num.replace(/\./g, "_")}`;
      out.push({
        id,
        topic: `Ch${ch.num} §${sec.num} — ${sec.title}`,
        tip: sec.preview || `(no preview available — see ${pdfPath}:${sec.startLine})`,
        domain,
        audience,
        source: {
          book,
          pdf_path: pdfPath,
          chapter: { num: ch.num, title: ch.title },
          section: { num: sec.num, title: sec.title, start_line: sec.startLine, end_line: sec.endLine },
        },
        bridge_engines: bridgeEngines,
      });
    }
  }
  return out;
}
