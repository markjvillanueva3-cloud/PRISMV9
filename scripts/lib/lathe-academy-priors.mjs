/**
 * lathe-academy-priors.mjs (pure functions)
 *
 * Extract structured turning-operation priors from PRISM Academy course
 * lesson source files (TypeScript). The priors shape matches what
 * LatheAITrainingEngine + LatheActiveLearningEngine can consume as
 * expert-authored validation baselines alongside the JM-Die archive corpus.
 *
 * INPUT  : raw source text of a course-N-*.ts file (read as plain text — no
 *          TS compilation; lesson bodies live in backtick template literals).
 * OUTPUT : Prior[] keyed by lathe ToolType, each carrying inserts,
 *          param_ranges, canned_cycles, heuristic_rules + physics_basis
 *          citation for traceability.
 *
 * This module is pure — no fs, no network, no globals. The CLI wrapper at
 * scripts/extract-lathe-academy-priors.mjs handles file I/O.
 *
 * @module scripts/lib/lathe-academy-priors
 * @milestone WHISKEY-ACADEMY-LATHE-BRIDGE-MS0
 */

/**
 * Module-title → lathe ToolType.
 * Mirrors LatheAITrainingEngine.ToolType. "unknown" entries are skipped by
 * buildPriorsForCourse — they exist so adding new lessons fails loud rather
 * than silently mis-mapping.
 */
export const TITLE_TO_TOOLTYPE = {
  "OD Roughing":                  "od_rough",
  "OD Finishing":                 "od_finish",
  "Facing":                       "face",
  "Grooving & Parting":           "od_groove",   // pair-mapped: parting ops fall under cutoff in trainer; we keep groove here, parting rules go in heuristic_rules
  "Threading (Single-Point)":     "od_thread",
  "Boring":                       "boring_bar",
  // Educational modules with no direct ToolType mapping (skipped — not a primary turning operation)
  "Live Tooling":                 "unknown",
  "Sub-Spindle Operations":       "unknown",
  "Swiss-Type Turning":           "unknown",
  "Turning Safety & Best Practices": "unknown",
  // Speed-feed/g-code/tooling cross-cutting (course-2/3/17)
  "Cutting Speed (Vc)":           "cross_cutting",
  "Feed per Tooth":               "cross_cutting",
  "Modal vs Non-Modal":           "cross_cutting",
  "G-code Cycles":                "cross_cutting",
  "M-codes":                      "cross_cutting",
};

/**
 * Extract turning-insert codes mentioned as `**XXXX**` (ISO insert codes
 * are 3-4 uppercase letters: CNMG / WNMG / SNMG / DNMG / VBMT / VCMT /
 * RCMT / TNMG / TPMG / etc.).
 *
 * @param {string} body  lesson body markdown
 * @returns {string[]}   unique insert codes in source order
 */
export function extractInserts(body) {
  if (typeof body !== "string") return [];
  const re = /\*\*([A-Z]{3,4})\*\*\s*(?=[(:\s])/g;
  const seen = new Set();
  const out = [];
  for (const m of body.matchAll(re)) {
    const code = m[1];
    // Skip generic words occasionally bolded in ALL CAPS (filter to true insert-code shape)
    if (!/^[A-Z]{3,4}$/.test(code)) continue;
    if (code === "DOC" || code === "RPM" || code === "TPI" || code === "OD" || code === "ID") continue;
    if (code === "PASS" || code === "FEED" || code === "STOP" || code === "TOOL") continue;
    if (!seen.has(code)) { seen.add(code); out.push(code); }
  }
  return out;
}

/**
 * Extract numeric parameter ranges for the four canonical turning knobs.
 * Recognizes `X-Y unit` and `X to Y unit` patterns. Returns absent keys when
 * the lesson doesn't quote a range (fail-soft, not fail-loud — many lessons
 * cite Vc per-material via lookup table, not as a literal range).
 *
 * @param {string} body  lesson body markdown
 * @returns {{doc_mm?:[number,number], feed_mm_rev?:[number,number], vc_m_min?:[number,number], rpm?:[number,number]}}
 */
export function extractParamRanges(body) {
  if (typeof body !== "string") return {};
  const out = {};

  // Depth of cut: `Depth of cut (ap)**: 1-5mm` / `DOC: 0.1-0.3mm` / `ap: 1 to 5 mm`
  const docM =
    body.match(/(?:Depth of cut|DOC|\bap\b)[^:\n]*:\s*([\d.]+)\s*(?:[-–—]|to)\s*([\d.]+)\s*mm/i);
  if (docM) out.doc_mm = [parseFloat(docM[1]), parseFloat(docM[2])];

  // Feed per rev: `Feed (f)**: 0.15-0.35 mm/rev` / `f: 0.05 to 0.15 mm/rev`
  const feedM =
    body.match(/(?:Feed|\bfz?\b|\bf\b)[^:\n]*:\s*([\d.]+)\s*(?:[-–—]|to)\s*([\d.]+)\s*mm\/rev/i);
  if (feedM) out.feed_mm_rev = [parseFloat(feedM[1]), parseFloat(feedM[2])];

  // Cutting speed: `Vc: 100-180 m/min`
  const vcM =
    body.match(/(?:Vc|Cutting speed|Surface speed)[^:\n]*:\s*([\d.]+)\s*(?:[-–—]|to)\s*([\d.]+)\s*m\/min/i);
  if (vcM) out.vc_m_min = [parseFloat(vcM[1]), parseFloat(vcM[2])];

  // RPM caps: `G50 S3000` or `max 3000 RPM`
  const rpmM = body.match(/(?:G50\s*S|max\s+|cap\s+at\s+)([\d,]+)\s*(?:RPM)?/i);
  if (rpmM) {
    const v = parseInt(rpmM[1].replace(/,/g, ""), 10);
    if (Number.isFinite(v) && v > 100 && v < 50000) out.rpm = [0, v];
  }

  return out;
}

/**
 * Extract G-code and M-code references (canned cycles, modal codes).
 * Filters to two-or-three-digit codes — single-digit refs (G0/G1) are
 * always present in lathe content and add no signal.
 *
 * @param {string} body  lesson body markdown
 * @returns {{g_codes:string[], m_codes:string[]}}
 */
export function extractGMCodes(body) {
  if (typeof body !== "string") return { g_codes: [], m_codes: [] };
  const g = new Set();
  const m = new Set();
  // Two-or-three-digit Gxx (G50, G71, G96, G118) — keep G0/G1/G2/G3 out (no signal)
  for (const match of body.matchAll(/\bG(\d{2,3})\b/g)) {
    g.add(`G${match[1]}`);
  }
  for (const match of body.matchAll(/\bM(\d{2,3})\b/g)) {
    m.add(`M${match[1]}`);
  }
  return { g_codes: [...g], m_codes: [...m] };
}

/**
 * Extract heuristic rules from bullet lines under `## Rules` / `## Tips` /
 * `## Best Practices` etc. Recognizes the `- **head** — tail` pattern that
 * lima's lessons use consistently.
 *
 * @param {string} body  lesson body markdown
 * @returns {string[]}   rule strings in source order
 */
export function extractHeuristicRules(body) {
  if (typeof body !== "string") return [];
  const out = [];
  // Bulleted bold-head rules: `- **head** — tail` (em-dash) or `- **head**: tail` (colon)
  const re = /^\s*[-*]\s+\*\*([^*\n]+)\*\*\s*(?:[—–-]|:)\s*([^\n]+)/gm;
  for (const m of body.matchAll(re)) {
    const head = m[1].trim();
    const tail = m[2].trim();
    // Skip parameter/insert lines — those are extracted separately
    if (/^(Depth of cut|DOC|Feed|Vc|Cutting speed|Speed|RPM|TPI|ap|fz?)\b/i.test(head)) continue;
    if (/^[A-Z]{3,4}$/.test(head)) continue;          // insert code header
    if (/^\d/.test(head)) continue;                    // numeric label
    if (head.length > 60 || tail.length > 280) continue; // skip table rows / verbose paragraphs
    out.push(`${head} — ${tail}`);
  }
  return out;
}

/**
 * Pair lesson titles with their body markdown by scanning the source text.
 * Each lesson is authored as `title: "..."` shortly before `body: \`...\``
 * inside the lessons object literal. Uses non-greedy template-literal match.
 *
 * @param {string} sourceText  raw .ts file contents
 * @returns {Array<{title:string, body:string}>}
 */
export function extractTitleBodyPairs(sourceText) {
  if (typeof sourceText !== "string") return [];
  const out = [];
  // `title: "OD Roughing", order: 1, content: [{ type: "text", body: \`...\` }]`
  const re = /title:\s*"([^"]+)"[\s\S]*?body:\s*`([\s\S]*?)`\s*\}/g;
  for (const m of sourceText.matchAll(re)) {
    out.push({ title: m[1], body: m[2] });
  }
  return out;
}

/**
 * Parse the `mk(N, "title", minutes)` calls inside the
 * `COURSE_N_MODULES: Module[] = [ ... ]` export — gives us the
 * authoritative module-index → title map for the course.
 *
 * @param {string} sourceText
 * @returns {Record<number,string>}   { 1: "OD Roughing", 2: "OD Finishing", ... }
 */
export function extractModuleTitleMap(sourceText) {
  if (typeof sourceText !== "string") return {};
  const out = {};
  const re = /mk\(\s*(\d+)\s*,\s*"([^"]+)"\s*,\s*\d+\s*\)/g;
  for (const m of sourceText.matchAll(re)) {
    out[parseInt(m[1], 10)] = m[2];
  }
  return out;
}

/**
 * Build the prior list for a single course.
 *
 * @param {string} courseId    e.g. "course-5"
 * @param {string} sourceText  raw .ts file contents
 * @returns {Array<object>}    priors filtered to known lathe ToolTypes
 */
export function buildPriorsForCourse(courseId, sourceText) {
  if (typeof courseId !== "string" || !courseId) return [];
  if (typeof sourceText !== "string" || !sourceText) return [];

  const titleMap = extractModuleTitleMap(sourceText);
  const titleToIdx = Object.fromEntries(
    Object.entries(titleMap).map(([k, v]) => [v, parseInt(k, 10)])
  );

  const pairs = extractTitleBodyPairs(sourceText);
  const priors = [];

  for (const { title, body } of pairs) {
    const toolType = TITLE_TO_TOOLTYPE[title];
    if (!toolType) continue;                          // unknown title — fail-soft skip
    if (toolType === "unknown") continue;             // intentional skip
    const modIdx = titleToIdx[title] ?? null;

    const { g_codes, m_codes } = extractGMCodes(body);

    priors.push({
      id: `${courseId}-${modIdx ?? title.toLowerCase().replace(/\s+/g, "-")}-prior`,
      tool_type: toolType,
      cross_cutting: toolType === "cross_cutting",
      source: {
        course: courseId,
        module: modIdx,
        lesson_title: title,
      },
      inserts: extractInserts(body),
      param_ranges: extractParamRanges(body),
      canned_cycles: g_codes,
      m_codes,
      heuristic_rules: extractHeuristicRules(body),
      physics_basis: `academy/${courseId}/mod-${modIdx ?? "?"}: ${title}`,
    });
  }

  return priors;
}

/**
 * Aggregate priors across multiple course source files into a single
 * versioned bundle ready for LatheAITrainingEngine ingestion.
 *
 * @param {Array<{courseId:string, sourceText:string}>} courses
 * @returns {{schemaVersion:string, generated_at:string, source_courses:string[], priors:Array<object>}}
 */
export function buildPriorBundle(courses, nowIso = new Date().toISOString()) {
  const priors = [];
  const sourceCourses = [];
  for (const { courseId, sourceText } of courses) {
    const coursePriors = buildPriorsForCourse(courseId, sourceText);
    if (coursePriors.length === 0) continue;
    sourceCourses.push(courseId);
    priors.push(...coursePriors);
  }
  return {
    schemaVersion: "1.0.0",
    generated_at: nowIso,
    source_courses: sourceCourses,
    priors,
  };
}
