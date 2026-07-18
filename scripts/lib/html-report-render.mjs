/**
 * html-report-render.mjs — pure HTML render helpers for PRISM CLI reports.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-HTML-OUTPUT-MODE (C1).
 * Adopts the Thariq/Anthropic playbook: when CLI output exceeds ~100 lines
 * of markdown, an information-dense HTML alternative with SVG + tables +
 * color-coded badges beats the wall of text every time.
 *
 * Zero I/O — every export is a pure function returning a string. The 3
 * generator adapters (generate-claude-brief, build-state-snapshot,
 * generate-system-viz) call these to emit HTML alongside their existing
 * markdown/JSON output when invoked with `--html`.
 *
 * STANDALONE: every renderHtmlPage() result embeds its own CSS — no
 * external CDN fetch, opens correctly on an air-gapped machine.
 *
 * FAILURE CONTRACT (silent-fail by design — match sibling lib pattern):
 *   - Invalid array inputs (non-array, empty) → ""
 *   - Unknown section kind → "<!-- ... unknown section kind ... -->"
 *   - null/undefined inputs to escapeHtml → ""
 *   - Date input to escapeHtml → ISO string
 *   - Object/Array input to escapeHtml → "<!--non-string:typeof-->" (loud)
 *   - All other exports return strings; none throw.
 *
 * The 3 generators detect failures at the data-collection layer; the
 * render lib's job is to produce a valid page even when one section's
 * data is missing or malformed.
 *
 * Section types accepted by renderSection():
 *   { kind: "headline",   cards: [{ label, value, status?, hint? }] }
 *   { kind: "table",      caption?, headers, rows }
 *   { kind: "list",       title?, items, ordered? }
 *   { kind: "prose",      trustedHtml?, text?, title? }
 *   { kind: "barchart",   label, data: [{ label, value, status? }] }
 *   { kind: "badge-grid", title?, items: [{ label, status?, hint? }] }
 *   { kind: "kv",         title?, pairs: [{ key, value, status? }] }
 *
 * status enum (drives color tokens):
 *   "ok"   — green   (e.g. wired/built/passing)
 *   "warn" — amber   (e.g. drift/partial/stale)
 *   "fail" — red     (e.g. broken/missing/unwired)
 *   "info" — blue    (neutral / informational)
 *   undefined — neutral grey
 */

export const HTML_REPORT_SCHEMA_VERSION = "1.0.0";

// Node-only fs handle for mdToHtml(). Guarded so the rest of the lib stays
// importable in browser-only contexts where `node:fs` doesn't resolve. The
// existing exports (renderHtmlPage, renderSection, etc.) are pure and never
// touch MD_FS — only mdToHtml() reads from disk.
let MD_FS = null;
try {
  if (typeof process !== "undefined" && process.versions?.node) {
    // Static-string specifier so bundlers can tree-shake when targeting browser.
    const mod = await import("node:fs");
    MD_FS = mod.default || mod;
  }
} catch {
  MD_FS = null;
}

const STATUS_TOKENS = new Set(["ok", "warn", "fail", "info"]);

// Bar-chart layout constants — extracted from inline-magic per per-file
// scrutiny Arm B P1 finding. Sibling lib (master-index-search-lib.mjs)
// declares its tunables at top-of-file for the same reason.
const BAR_MAX_LABEL_PX = 220;
const BAR_MIN_LABEL_PX = 80;
const BAR_PX_PER_CHAR = 7;
const BAR_VALUE_COL_PX = 60;
const BAR_MIN_CHART_PX = 120;
const BAR_H_PADDING_PX = 12;
const BAR_LABEL_TRUNCATE_CHARS = 32;

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape a string for HTML body / attribute interpolation.
 *
 * Also strips NUL bytes (which break some HTML parsers) and replaces
 * non-text control chars with the unicode replacement char so adversarial
 * input never injects raw control bytes into the rendered page.
 *
 * Iterates UTF-16 code units (not code points). High/low surrogate pairs
 * flow through verbatim — the browser re-pairs them at parse time. This
 * is correct because none of the per-unit logic (NUL strip, control-char
 * replace, escape map) targets values in the surrogate range 0xD800–0xDFFF.
 * If this function is ever extended to whitelist printable code points,
 * switch to `for (const ch of str)` + `ch.codePointAt(0)` first.
 *
 * Special-cases by type:
 *   null/undefined → ""           (silent-fail contract)
 *   Date           → toISOString  (deterministic cross-platform)
 *   Object/Array   → loud-fail comment "<!--non-string:TYPE-->"
 *   number/boolean → String(...)  (1234 → "1234")
 */
export function escapeHtml(input) {
  if (input === null || input === undefined) return "";
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return "";
    return input.toISOString();
  }
  if (typeof input === "object") {
    // Loud-fail: render as comment so reviewers see the bug in DOM tree
    // instead of silent "[object Object]" cells (Karpathy R12).
    const tag = Array.isArray(input) ? "array" : "object";
    return `<!--non-string:${tag}-->`;
  }
  if (typeof input === "symbol" || typeof input === "function") {
    // String(Symbol("x")) throws, and printing a function body is useless.
    // Honor the "none throw" clause in the failure contract.
    return "";
  }
  const str = String(input);
  let out = "";
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const code = str.charCodeAt(i);
    if (code === 0) continue; // strip NUL
    if (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) {
      out += "�";
      continue;
    }
    if (HTML_ESCAPE_MAP[ch] !== undefined) {
      out += HTML_ESCAPE_MAP[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Normalize a status string → known token or undefined.
 */
export function normalizeStatus(status) {
  if (typeof status !== "string") return undefined;
  const lower = status.toLowerCase();
  return STATUS_TOKENS.has(lower) ? lower : undefined;
}

/**
 * Stable embedded stylesheet. System fonts only; CSS vars drive color.
 * Adopted from PRISM web design system tokens but inlined for portability.
 */
export function renderPageStyle() {
  return `<style>
  :root {
    --bg: #0f1014;
    --panel: #1a1c23;
    --panel-2: #232631;
    --fg: #e4e6eb;
    --fg-dim: #9aa0a8;
    --border: #2c303a;
    --ok: #4ade80;
    --warn: #fbbf24;
    --fail: #f87171;
    --info: #60a5fa;
    --link: #93c5fd;
  }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 1.5rem; background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
    font-size: 14px; line-height: 1.5; }
  h1 { font-size: 1.6rem; margin: 0 0 0.25rem 0; }
  h2 { font-size: 1.15rem; margin: 1.5rem 0 0.5rem 0; padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--border); color: var(--fg); }
  .meta { color: var(--fg-dim); font-size: 0.85rem; margin-bottom: 1rem; }
  .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
    padding: 0.75rem 1rem; margin-bottom: 1rem; }
  .headline-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.5rem; margin-bottom: 1rem; }
  .card { background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px;
    padding: 0.65rem 0.85rem; }
  .card .lbl { font-size: 0.8rem; color: var(--fg-dim); }
  .card .val { font-size: 1.4rem; font-weight: 600; margin: 0.15rem 0; font-variant-numeric: tabular-nums; }
  .card .hint { font-size: 0.75rem; color: var(--fg-dim); }
  .card.ok    { border-left: 3px solid var(--ok); }
  .card.warn  { border-left: 3px solid var(--warn); }
  .card.fail  { border-left: 3px solid var(--fail); }
  .card.info  { border-left: 3px solid var(--info); }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.9rem;
    background: var(--panel); border: 1px solid var(--border); border-radius: 6px; overflow: hidden; }
  caption { text-align: left; padding: 0.4rem 0.65rem; color: var(--fg-dim);
    background: var(--panel-2); font-weight: 500; }
  th, td { padding: 0.4rem 0.65rem; text-align: left; border-bottom: 1px solid var(--border);
    font-variant-numeric: tabular-nums; vertical-align: top; }
  th { background: var(--panel-2); color: var(--fg-dim); font-weight: 500;
    text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.04em; }
  tr:last-child td { border-bottom: none; }
  td.right { text-align: right; }
  ul, ol { margin: 0.4rem 0 1rem 1.25rem; }
  li { margin: 0.15rem 0; }
  .badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 500; background: var(--panel-2); color: var(--fg-dim);
    border: 1px solid var(--border); }
  .badge.ok   { background: rgba(74, 222, 128, 0.12); color: var(--ok);   border-color: rgba(74,222,128,0.3); }
  .badge.warn { background: rgba(251, 191, 36, 0.12); color: var(--warn); border-color: rgba(251,191,36,0.3); }
  .badge.fail { background: rgba(248, 113, 113, 0.12); color: var(--fail); border-color: rgba(248,113,113,0.3); }
  .badge.info { background: rgba(96, 165, 250, 0.12); color: var(--info); border-color: rgba(96,165,250,0.3); }
  .badge-grid { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.3rem 0 1rem 0; }
  .kv { display: grid; grid-template-columns: max-content 1fr; gap: 0.2rem 0.85rem;
    margin: 0.4rem 0 1rem 0; }
  .kv .k { color: var(--fg-dim); }
  svg.bar-chart { display: block; max-width: 100%; height: auto; }
  svg .bar { fill: var(--info); }
  svg .bar.ok   { fill: var(--ok); }
  svg .bar.warn { fill: var(--warn); }
  svg .bar.fail { fill: var(--fail); }
  svg text { fill: var(--fg); font-family: monospace; font-size: 11px; }
  svg .axis text { fill: var(--fg-dim); }
  code { background: var(--panel-2); padding: 0 0.3rem; border-radius: 3px;
    font-family: "Fira Code", Consolas, Menlo, monospace; font-size: 0.85em; }
  a { color: var(--link); }
  footer { margin-top: 2rem; padding-top: 0.75rem; border-top: 1px solid var(--border);
    font-size: 0.8rem; color: var(--fg-dim); }
</style>`;
}

/**
 * Render the head + open body. Caller appends sections + closes with renderPageFooter.
 */
export function renderPageHeader({ title, subtitle, generatedAt }) {
  const safeTitle = escapeHtml(title || "PRISM Report");
  const headerSubtitle = subtitle
    ? `<div class="meta">${escapeHtml(subtitle)}</div>`
    : "";
  const ts = generatedAt
    ? `<div class="meta">Generated ${escapeHtml(generatedAt)}</div>`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
${renderPageStyle()}
</head>
<body>
<h1>${safeTitle}</h1>
${headerSubtitle}
${ts}
`;
}

export function renderPageFooter({ note } = {}) {
  const noteBlock = note
    ? `<div>${escapeHtml(note)}</div>`
    : "";
  return `<footer>${noteBlock}
<div>html-report-render schemaVersion ${HTML_REPORT_SCHEMA_VERSION}</div>
</footer>
</body>
</html>
`;
}

/**
 * Render a single headline stat card.
 */
export function renderCard({ label, value, status, hint }) {
  const cls = normalizeStatus(status);
  const cardClass = cls ? `card ${cls}` : "card";
  const hintBlock = hint ? `<div class="hint">${escapeHtml(hint)}</div>` : "";
  return `<div class="${cardClass}">
  <div class="lbl">${escapeHtml(label)}</div>
  <div class="val">${escapeHtml(value)}</div>
  ${hintBlock}
</div>`;
}

/**
 * Render a row of headline cards inside a grid.
 */
export function renderHeadlineCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return "";
  const items = cards.map(renderCard).join("\n");
  return `<div class="headline-grid">
${items}
</div>`;
}

/**
 * Render a semantic HTML table. headers = ["..."]; rows = [[cell, ...], ...]
 * Cells can be strings or `{ value, status, right? }` objects.
 *
 * Defensive: when a row's column-count diverges from headers.length, the
 * row is sliced/padded to match and a loud HTML-comment annotation is
 * emitted (Karpathy R12 — surface uncertainty). If a non-array row is
 * passed, the whole row is skipped with a comment.
 *
 * Note: arrays as cells are coerced via the object-branch's loud-fail —
 * `[1,2,3]` renders as a `<!--non-string:array-->` comment in the cell.
 */
export function renderTable({ caption, headers, rows }) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    return `<table><caption>${escapeHtml("invalid table input")}</caption></table>`;
  }
  const capBlock = caption
    ? `<caption>${escapeHtml(caption)}</caption>`
    : "";
  const head = `<thead><tr>${headers
    .map((h) => `<th>${escapeHtml(h)}</th>`)
    .join("")}</tr></thead>`;
  const colCount = headers.length;
  const body = rows
    .map((row, rowIdx) => {
      if (!Array.isArray(row)) {
        return `<tr><td colspan="${colCount}"><!-- html-report-render: row ${rowIdx} not an array --></td></tr>`;
      }
      let widthAnnotation = "";
      let effectiveRow = row;
      if (row.length !== colCount) {
        widthAnnotation = `<!-- html-report-render: row ${rowIdx} column count ${row.length} != headers ${colCount} -->`;
        if (row.length > colCount) {
          effectiveRow = row.slice(0, colCount);
        } else {
          effectiveRow = [...row];
          while (effectiveRow.length < colCount) effectiveRow.push("");
        }
      }
      const cells = effectiveRow
        .map((cell) => {
          if (cell && typeof cell === "object" && !(cell instanceof Date) && !Array.isArray(cell)) {
            const cls = normalizeStatus(cell.status);
            const right = cell.right ? " class=\"right\"" : "";
            if (cls) {
              return `<td${right}><span class="badge ${cls}">${escapeHtml(cell.value ?? "")}</span></td>`;
            }
            return `<td${right}>${escapeHtml(cell.value ?? "")}</td>`;
          }
          return `<td>${escapeHtml(cell ?? "")}</td>`;
        })
        .join("");
      return `${widthAnnotation}<tr>${cells}</tr>`;
    })
    .join("\n");
  return `<table>${capBlock}
${head}
<tbody>
${body}
</tbody>
</table>`;
}

/**
 * Render an ordered or unordered list of strings.
 */
export function renderList({ title, items, ordered }) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  const titleBlock = title ? `<h2>${escapeHtml(title)}</h2>` : "";
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  return `${titleBlock}
<${tag}>
${lis}
</${tag}>`;
}

/**
 * Render a key-value grid (label : value pairs).
 */
export function renderKv({ title, pairs }) {
  if (!Array.isArray(pairs) || pairs.length === 0) return "";
  const titleBlock = title ? `<h2>${escapeHtml(title)}</h2>` : "";
  const lines = pairs
    .map((p) => {
      const cls = normalizeStatus(p.status);
      const val = cls
        ? `<span class="badge ${cls}">${escapeHtml(p.value ?? "")}</span>`
        : escapeHtml(p.value ?? "");
      return `<div class="k">${escapeHtml(p.key ?? "")}</div><div>${val}</div>`;
    })
    .join("\n");
  return `${titleBlock}
<div class="kv">
${lines}
</div>`;
}

/**
 * Render a horizontal bar chart as inline SVG.
 * data = [{ label, value, status? }]. value must be non-negative finite number.
 * Bars scale to the largest value. width default 600px, height auto from data length.
 */
export function renderBarChart({ label, data, width = 600, barHeight = 22, gap = 4 }) {
  if (!Array.isArray(data) || data.length === 0) {
    return label ? `<h2>${escapeHtml(label)}</h2><div class="meta">(no data)</div>` : "";
  }
  // Strict label coercion — only string/number/boolean survive. Object,
  // array, Date, Symbol, function labels become "" and are filtered out
  // (per Karpathy R12, never silently render "[object Object]"). Callers
  // get an empty chart with the no-data marker if every label is hostile.
  const cleaned = data
    .map((d) => {
      let label = "";
      if (typeof d.label === "string") label = d.label;
      else if (typeof d.label === "number" || typeof d.label === "boolean") label = String(d.label);
      return {
        label,
        value: Number.isFinite(d.value) && d.value >= 0 ? d.value : 0,
        status: normalizeStatus(d.status),
      };
    })
    .filter((d) => d.label.length > 0);
  if (cleaned.length === 0) {
    return label ? `<h2>${escapeHtml(label)}</h2><div class="meta">(no data)</div>` : "";
  }
  const maxValue = Math.max(...cleaned.map((d) => d.value), 1);
  // Label column width clamped to [BAR_MIN_LABEL_PX, BAR_MAX_LABEL_PX]
  // — caps the SVG even when a caller passes a 10KB label string.
  const labelWidth = Math.min(
    BAR_MAX_LABEL_PX,
    Math.max(BAR_MIN_LABEL_PX, Math.max(...cleaned.map((d) => d.label.length)) * BAR_PX_PER_CHAR),
  );
  const valueWidth = BAR_VALUE_COL_PX;
  const chartWidth = Math.max(BAR_MIN_CHART_PX, width - labelWidth - valueWidth - BAR_H_PADDING_PX);
  const totalHeight = cleaned.length * (barHeight + gap) + gap;
  const titleBlock = label ? `<h2>${escapeHtml(label)}</h2>` : "";
  const bars = cleaned
    .map((d, i) => {
      const y = gap + i * (barHeight + gap);
      const barLen = Math.max(1, Math.round((d.value / maxValue) * chartWidth));
      const cls = d.status ? `bar ${d.status}` : "bar";
      return `<g>
  <text x="0" y="${y + barHeight / 2 + 4}" text-anchor="start">${escapeHtml(d.label.slice(0, BAR_LABEL_TRUNCATE_CHARS))}</text>
  <rect class="${cls}" x="${labelWidth}" y="${y}" width="${barLen}" height="${barHeight}" rx="2"/>
  <text x="${labelWidth + barLen + 4}" y="${y + barHeight / 2 + 4}" text-anchor="start">${escapeHtml(String(d.value))}</text>
</g>`;
    })
    .join("\n");
  const svgWidth = labelWidth + chartWidth + valueWidth + BAR_H_PADDING_PX;
  return `${titleBlock}
<svg class="bar-chart" viewBox="0 0 ${svgWidth} ${totalHeight}" width="${svgWidth}" height="${totalHeight}" role="img" aria-label="${escapeHtml(label || "bar chart")}">
${bars}
</svg>`;
}

/**
 * Render a single status badge.
 */
export function renderStatusBadge(text, status) {
  const cls = normalizeStatus(status);
  const className = cls ? `badge ${cls}` : "badge";
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

/**
 * Render a grid of badges.
 */
export function renderBadgeGrid({ title, items }) {
  if (!Array.isArray(items) || items.length === 0) return "";
  const titleBlock = title ? `<h2>${escapeHtml(title)}</h2>` : "";
  const badges = items
    .map((it) => {
      const hint = it.hint ? ` title="${escapeHtml(it.hint)}"` : "";
      const cls = normalizeStatus(it.status);
      const className = cls ? `badge ${cls}` : "badge";
      return `<span class="${className}"${hint}>${escapeHtml(it.label)}</span>`;
    })
    .join("\n");
  return `${titleBlock}
<div class="badge-grid">
${badges}
</div>`;
}

/**
 * Render a prose section. The field name carries the security contract:
 *   - `trustedHtml`: caller-authored fragment embedded VERBATIM. Treat
 *     this as a knife — only pass content the caller produced (literal
 *     strings, generator output, fragments built from already-escaped
 *     pieces), NEVER user/file input.
 *   - `text`: untrusted string, always escaped.
 *
 * If both are supplied, `trustedHtml` wins. Choosing the field name at
 * the call site forces the author to acknowledge the trust boundary
 * (per-file scrutiny Arm A — name-the-knife). There is no `html` alias.
 */
export function renderProse({ title, trustedHtml, text }) {
  const titleBlock = title ? `<h2>${escapeHtml(title)}</h2>` : "";
  if (typeof trustedHtml === "string" && trustedHtml.length > 0) {
    return `${titleBlock}
<div class="panel">${trustedHtml}</div>`;
  }
  if (typeof text === "string" && text.length > 0) {
    return `${titleBlock}
<div class="panel">${escapeHtml(text)}</div>`;
  }
  return "";
}

/**
 * Sanitize a value for embedding inside an HTML comment. HTML comments
 * terminate on `-->`, so we collapse any `--` run to `- -` to keep the
 * comment intact even when the input contains an attack like
 * `kind: "foo -->"`. This is a defense-in-depth fallback; escapeHtml has
 * already neutralized most attacks, but the `<!-- ... -->` context is
 * unique and warrants its own guard.
 */
function escapeForComment(input) {
  return String(input ?? "").replace(/--+/g, (m) => "- ".repeat(m.length).trimEnd());
}

/**
 * Section dispatcher — render any section descriptor to HTML.
 * Unknown kinds emit an inline error comment with the kind value AND the
 * section's own keys so debugging is loud (Karpathy R12). The comment is
 * doubly safe: section.kind is escapeHtml'd AND comment-terminator-safe.
 */
export function renderSection(section) {
  if (!section || typeof section !== "object") return "";
  switch (section.kind) {
    case "headline":
      return renderHeadlineCards(section.cards);
    case "table":
      return renderTable(section);
    case "list":
      return renderList(section);
    case "kv":
      return renderKv(section);
    case "barchart":
      return renderBarChart(section);
    case "badge-grid":
      return renderBadgeGrid(section);
    case "prose":
      return renderProse(section);
    default: {
      const safeKind = escapeForComment(escapeHtml(section.kind));
      const keys = Object.keys(section).filter((k) => k !== "kind").join(",");
      const safeKeys = escapeForComment(escapeHtml(keys));
      return `<!-- html-report-render: unknown section kind "${safeKind}" (keys: ${safeKeys}) -->`;
    }
  }
}

/**
 * Render a complete standalone HTML page from a sections descriptor.
 */
export function renderHtmlPage({ title, subtitle, generatedAt, sections, note }) {
  const head = renderPageHeader({ title, subtitle, generatedAt });
  const body = Array.isArray(sections)
    ? sections.map(renderSection).filter(Boolean).join("\n")
    : "";
  const foot = renderPageFooter({ note });
  return `${head}
${body}
${foot}`;
}

// ────────────────────────────────────────────────────────────────────────────
// U-MD2HTML (2026-05-16, AUDIT-SYNERGY-MS0): render arbitrary markdown source
// files (MEMORY.md, CLAUDE.md, handoffs, wiki leaves) as standalone HTML pages.
//
// Strictly additive — every existing renderSection / renderHtmlPage caller is
// unchanged. Parser is intentionally minimal: headings, hr, fenced + indented
// code, blockquote, unordered + ordered + nested lists, pipe-table, inline
// links + bold + italic + inline-code. Anything more exotic (raw HTML embeds,
// math, footnotes) falls through as escaped <p> prose.
//
// FAILURE CONTRACT (matches sibling silent-fail pattern):
//   - missing file / read error  → "" empty string (no throw)
//   - empty file                  → wraps an empty body
//   - malformed table             → renders as escaped prose
// ────────────────────────────────────────────────────────────────────────────

const MD_FENCE_RE = /^```/;
const MD_HEADING_RE = /^(#{1,6})\s+(.*)$/;
const MD_HR_RE = /^(?:[-*_]\s*){3,}$/;
const MD_UL_RE = /^(\s*)[-*+]\s+(.*)$/;
const MD_OL_RE = /^(\s*)\d+\.\s+(.*)$/;
const MD_BLOCKQUOTE_RE = /^>\s?(.*)$/;
const MD_TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;
const INLINE_CODE_RE = /`([^`]+)`/g;
const INLINE_BOLD_RE = /\*\*([^*]+)\*\*/g;
const INLINE_ITALIC_RE = /(^|[^*])\*([^*]+)\*/g;
const INLINE_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const INLINE_AUTOLINK_RE = /<((?:https?:\/\/|mailto:)[^\s>]+)>/g;

function renderInline(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  // Escape first, then apply markup transforms on the escaped string.
  let s = escapeHtml(text);
  // Inline code: render before other markup so * inside backticks doesn't trip italic.
  // The escaped string has &amp;-encoded backticks NOT touched (regex matches literal `).
  s = s.replace(INLINE_CODE_RE, (_m, code) => `<code class="prism-inline-code">${code}</code>`);
  // Links (must run before italic/bold so brackets aren't consumed).
  s = s.replace(INLINE_LINK_RE, (_m, label, href) => {
    // Refuse javascript:/data: URIs (basic XSS gate; href is already HTML-escaped).
    if (/^(?:javascript|data|vbscript):/i.test(href.trim())) {
      return `<span class="prism-bad-link">${label}</span>`;
    }
    return `<a href="${href}" class="prism-link">${label}</a>`;
  });
  s = s.replace(INLINE_AUTOLINK_RE, (_m, url) => `<a href="${url}" class="prism-link">${url}</a>`);
  s = s.replace(INLINE_BOLD_RE, (_m, inner) => `<strong>${inner}</strong>`);
  s = s.replace(INLINE_ITALIC_RE, (_m, lead, inner) => `${lead}<em>${inner}</em>`);
  return s;
}

function parseTable(lines, startIdx) {
  // lines[startIdx]  = header
  // lines[startIdx+1] = separator (must match MD_TABLE_SEP_RE)
  // lines[startIdx+2..] = rows until blank/non-pipe line
  if (startIdx + 1 >= lines.length) return null;
  if (!MD_TABLE_SEP_RE.test(lines[startIdx + 1])) return null;
  const splitCells = (line) => line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim());
  const header = splitCells(lines[startIdx]);
  const rows = [];
  let i = startIdx + 2;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.includes("|") || line.trim() === "") break;
    rows.push(splitCells(line));
    i++;
  }
  return { header, rows, consumed: i - startIdx };
}

/**
 * Convert a markdown string to HTML body (no <html>/<head> wrapper).
 * Use mdToHtml() when you want a full standalone HTML page from a file path.
 *
 * Intentionally tolerant — never throws. Unrecognized syntax becomes
 * escaped prose so the source content is never lost.
 */
export function renderMarkdownBody(md) {
  if (typeof md !== "string") return "";
  // Normalize line endings + drop a BOM if present.
  const text = md.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  let inCodeBlock = false;
  let codeBuf = [];
  let codeLang = "";
  let paraBuf = [];

  const flushPara = () => {
    if (paraBuf.length === 0) return;
    const joined = paraBuf.join(" ").trim();
    if (joined) out.push(`<p>${renderInline(joined)}</p>`);
    paraBuf = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    if (inCodeBlock) {
      if (MD_FENCE_RE.test(line)) {
        const langAttr = codeLang ? ` data-lang="${escapeHtml(codeLang)}"` : "";
        out.push(`<pre class="prism-codeblock"${langAttr}><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        inCodeBlock = false;
        codeBuf = [];
        codeLang = "";
      } else {
        codeBuf.push(line);
      }
      i++;
      continue;
    }

    if (MD_FENCE_RE.test(line)) {
      flushPara();
      inCodeBlock = true;
      codeLang = line.replace(/^```/, "").trim();
      i++;
      continue;
    }

    if (line.trim() === "") {
      flushPara();
      i++;
      continue;
    }

    if (MD_HR_RE.test(line)) {
      flushPara();
      out.push(`<hr class="prism-hr">`);
      i++;
      continue;
    }

    const headingMatch = line.match(MD_HEADING_RE);
    if (headingMatch) {
      flushPara();
      const level = headingMatch[1].length;
      const inner = renderInline(headingMatch[2]);
      out.push(`<h${level} class="prism-h${level}">${inner}</h${level}>`);
      i++;
      continue;
    }

    // Table — peek ahead for separator line.
    if (line.includes("|") && i + 1 < lines.length && MD_TABLE_SEP_RE.test(lines[i + 1])) {
      flushPara();
      const parsed = parseTable(lines, i);
      if (parsed) {
        const headerHtml = parsed.header.map((h) => `<th>${renderInline(h)}</th>`).join("");
        const rowsHtml = parsed.rows.map((r) => `<tr>${r.map((c) => `<td>${renderInline(c)}</td>`).join("")}</tr>`).join("\n");
        out.push(`<table class="prism-md-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`);
        i += parsed.consumed;
        continue;
      }
    }

    if (MD_BLOCKQUOTE_RE.test(line)) {
      flushPara();
      const inner = renderInline(line.match(MD_BLOCKQUOTE_RE)[1]);
      out.push(`<blockquote class="prism-quote">${inner}</blockquote>`);
      i++;
      continue;
    }

    // Lists — collect contiguous list lines, support 2 nesting levels.
    if (MD_UL_RE.test(line) || MD_OL_RE.test(line)) {
      flushPara();
      const items = [];
      const ordered = MD_OL_RE.test(line);
      while (i < lines.length) {
        const cur = lines[i];
        const m = ordered ? cur.match(MD_OL_RE) : cur.match(MD_UL_RE);
        if (!m) break;
        items.push(`<li>${renderInline(m[2])}</li>`);
        i++;
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag} class="prism-md-list">${items.join("")}</${tag}>`);
      continue;
    }

    paraBuf.push(line);
    i++;
  }

  // Flush trailing buffers.
  if (inCodeBlock) {
    // Unclosed fence — preserve contents as code rather than losing it.
    out.push(`<pre class="prism-codeblock prism-unclosed"><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }
  flushPara();

  return out.join("\n");
}

/**
 * Style additions appended to the renderPageStyle() block for markdown-specific
 * elements. Returned as a <style> fragment safe to inline anywhere.
 */
function renderMarkdownStyle() {
  return `<style>
  .prism-md-body { max-width: 70rem; margin: 0 auto; }
  .prism-h1 { font-size: 1.6rem; }
  .prism-h2 { font-size: 1.25rem; border-bottom: 1px solid var(--border); padding-bottom: 0.25rem; }
  .prism-h3 { font-size: 1.1rem; color: var(--info); }
  .prism-h4, .prism-h5, .prism-h6 { font-size: 1rem; color: var(--fg-dim); }
  .prism-md-body p { margin: 0.5rem 0; }
  .prism-md-list { margin: 0.5rem 0 0.5rem 1.25rem; padding: 0; }
  .prism-md-list li { margin: 0.15rem 0; }
  .prism-md-table { border-collapse: collapse; margin: 0.75rem 0; width: 100%; }
  .prism-md-table th, .prism-md-table td { border: 1px solid var(--border); padding: 0.35rem 0.6rem; text-align: left; }
  .prism-md-table th { background: var(--panel-2); }
  .prism-codeblock { background: var(--panel-2); border: 1px solid var(--border); border-radius: 4px; padding: 0.6rem 0.8rem; overflow-x: auto; font-family: "Cascadia Code", Consolas, monospace; font-size: 13px; }
  .prism-inline-code { background: var(--panel-2); padding: 0 0.25rem; border-radius: 3px; font-family: "Cascadia Code", Consolas, monospace; font-size: 0.92em; }
  .prism-quote { border-left: 3px solid var(--info); background: var(--panel-2); padding: 0.5rem 0.85rem; margin: 0.75rem 0; color: var(--fg-dim); }
  .prism-hr { border: 0; border-top: 1px solid var(--border); margin: 1rem 0; }
  .prism-link { color: var(--link); text-decoration: none; }
  .prism-link:hover { text-decoration: underline; }
  .prism-bad-link { color: var(--fail); text-decoration: line-through; }
  .prism-unclosed::before { content: "⚠ unterminated code block"; display: block; color: var(--warn); font-size: 0.85em; margin-bottom: 0.25rem; }
  </style>`;
}

/**
 * Render a markdown file as a standalone HTML page.
 *
 * @param {string} filePath  - absolute or relative path to the .md file
 * @param {object} [opts]
 * @param {string} [opts.title]       - override the auto-derived title
 * @param {string} [opts.subtitle]    - subtitle line shown under the title
 * @param {boolean} [opts.includeToc] - prepend a table-of-contents (default false)
 * @param {string} [opts.note]        - footer note (default: file path)
 * @returns {string} a complete HTML5 document; returns "" on read error.
 */
export function mdToHtml(filePath, opts = {}) {
  if (typeof filePath !== "string" || filePath.length === 0) return "";
  let md = "";
  try {
    md = MD_FS.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
  const titleAuto = (md.match(/^#\s+(.+)$/m) || [, filePath.replace(/^.*[\\/]/, "")])[1];
  const title = opts.title || titleAuto;
  const subtitle = opts.subtitle || `rendered from ${filePath}`;
  // opts.note: empty string OPT-IN suppresses the footer-note default (falsy "" still triggers the OR fallback,
  // so check `opts.note !== undefined` to honor an explicit ""). opts.generatedAt: deterministic timestamp
  // (e.g., source-file mtime) so re-rendering unchanged input produces byte-identical output — required for
  // md-to-html.mjs drift detection across the 13-chat fleet (2026-05-18 slot kilo, Reviewer B P1-A fix).
  const note = opts.note !== undefined ? opts.note : `generated by mdToHtml() at ${new Date().toISOString()}`;
  const generatedAt = opts.generatedAt ?? new Date().toISOString();

  const body = renderMarkdownBody(md);

  // a11y (WAI-ARIA): inject a unique id into every heading lacking one (anchor nav,
  // skip-link target chain). Runs on the WHOLE page so the page-header h1 is covered too.
  const addHeadingIds = (html) => {
    const used = new Set();
    let dupe = 0;
    return html.replace(/<h([1-6])([^>]*)>([\s\S]*?)<\/h\1>/g, (m, lvl, attrs, inner) => {
      if (/\bid\s*=/.test(attrs)) return m;
      let slug = inner.replace(/<[^>]+>/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
      if (!slug) slug = `h${lvl}`;
      let id = slug;
      while (used.has(id)) { dupe++; id = `${slug}-${dupe}`; }
      used.add(id);
      return `<h${lvl}${attrs} id="${id}">${inner}</h${lvl}>`;
    });
  };

  let toc = "";
  if (opts.includeToc) {
    const headings = [...md.matchAll(/^(#{1,3})\s+(.+)$/gm)];
    if (headings.length > 0) {
      const items = headings
        .map(([, hashes, txt]) => `<li class="prism-toc-l${hashes.length}">${renderInline(txt)}</li>`)
        .join("");
      toc = `<nav class="prism-toc" aria-label="Contents"><strong>Contents</strong><ul>${items}</ul></nav>`;
    }
  }

  // Use renderPageHeader for the consistent PRISM frame; append MD-specific style + body.
  const head = renderPageHeader({ title, subtitle, generatedAt });
  // The page-header opens <html><head><style>...</style></head><body>...; we add a
  // second <style> for markdown, a skip-link, and the main content region (a11y).
  const mdStyle = renderMarkdownStyle();
  const skipLink = `<a href="#content" class="skip-link">Skip to content</a>`;
  const main = `${mdStyle}${skipLink}<main class="prism-md-body" role="main" id="content">${toc}${body}</main>`;
  const foot = renderPageFooter({ note });
  return addHeadingIds(`${head}${main}${foot}`);
}
