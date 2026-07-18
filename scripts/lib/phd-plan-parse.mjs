// scripts/lib/phd-plan-parse.mjs
// FLEET-PHD-CONTINUITY (U-PHD-DRIVER, slot:zulu, 2026-06-27)
// Pure parser for the FLEET-PHD-BUILDOUT per-domain plan files
// (state/shared/domain-plans/DOMAIN-PLAN-<slot>.md). NO I/O: text in, struct out,
// so it is trivially unit-testable and cannot drift on the fleet filesystem state.
// parsePlan(text) returns { slot, galaxy, galaxyDir, status, dispatchers, frontendOwner,
// kienzlePages, section3, acceptanceTargets }. The section-3 heading varies across the
// 16 committed plans ("PhD master", "...(engineered loop)", "...(open-ended leg...)"),
// so we anchor on the section number (U+00A7 "3"), not the trailing prose.

const SECTION_SIGN = "\\u00A7"; // U+00A7 as a regex-string escape (ASCII source, matches the glyph)

/** Parse the leading ---fenced frontmatter into a flat key->string map. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text || "");
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

/** Parse a frontmatter scalar that may be an inline array: [a, b] or ["a","b"]. */
export function parseInlineArray(val) {
  if (!val) return [];
  const inner = String(val).replace(/^\[/, "").replace(/\]$/, "");
  return inner
    .split(",")
    .map((s) => s.trim().replace(/^["']/, "").replace(/["']$/, ""))
    .filter(Boolean);
}

/**
 * Extract the body of section n: from "## <sign>n ..." up to the next top-level
 * "## " heading (or EOF). Returns "" when the section is absent.
 */
export function extractSection(text, n) {
  if (!text) return "";
  // Anchor the heading at line start (needs /m), then slice the body manually:
  // a multiline `$` would match every line end and truncate a non-greedy capture
  // to the first line, so we do NOT use `$` here.
  const headRe = new RegExp(`^##\\s*${SECTION_SIGN}${n}\\b[^\\n]*\\r?\\n`, "m");
  const hm = headRe.exec(text);
  if (!hm) return "";
  const rest = text.slice(hm.index + hm[0].length);
  const next = /\r?\n##\s/.exec(rest); // next top-level heading, or EOF
  return (next ? rest.slice(0, next.index) : rest).trim();
}

/**
 * Extract numeric acceptance targets: a known metric keyword within a short window
 * before a comparator (>=, <=, U+2265, U+2264, >, <) + number + optional unit.
 * Deduped by metric:value:unit. Never throws; returns [] on junk input.
 */
export function extractAcceptanceTargets(scope) {
  const out = [];
  const seen = new Set();
  if (!scope) return out;
  // Narrow window (<=18 non-digit chars) keeps the metric keyword adjacent to its
  // number so a far-away figure is not mis-attributed to the wrong metric.
  const re =
    /\b(tribal(?:\s+tips?)?|wiki(?:\s+(?:leaf|leaves|entries|count))?|coverage|AUROC|macro-?F1|Brier|MAPE|reward|tips?)\b[^0-9\n]{0,18}?(>=|<=|≥|≤|>|<)\s*([0-9]+(?:\.[0-9]+)?)\s*(%|tips|entries|pairs|min)?/gi;
  let m;
  while ((m = re.exec(scope)) !== null) {
    const [, metricRaw, comparatorRaw, numStr, unitRaw] = m;
    const metric = metricRaw
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/_count$/, "")
      .replace(/^tips$/, "tribal");
    const value = parseFloat(numStr);
    if (!Number.isFinite(value)) continue;
    const unit = (unitRaw || "").toLowerCase();
    // plausibility guard: a metric captured for a nearby-but-unrelated number.
    if (/^(auroc|macro-?f1|brier)$/.test(metric) && value > 1.5) continue; // ratio metrics are <=1
    if (/^(coverage|mape)$/.test(metric) && value > 100) continue; // percentage metrics are <=100
    if (/^(tribal|wiki)/.test(metric) && unit === "%") continue; // counts are never a percentage
    const key = `${metric}:${value}:${unit}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const comparator = comparatorRaw.replace("≥", ">=").replace("≤", "<=");
    out.push({ metric, comparator, value, unit });
  }
  return out;
}

/** Parse a full DOMAIN-PLAN markdown file into the continuity-driver struct. */
export function parsePlan(text) {
  const fm = parseFrontmatter(text);
  const section3 = extractSection(text, 3);
  // Prefer section-3 targets (the deepening loop); fall back to the whole doc.
  const acceptanceTargets = extractAcceptanceTargets(section3 || text);
  const galaxyDir = (fm.galaxy_dir || "").replace(/\/+$/, "");
  return {
    slot: fm.slot || null,
    galaxy: fm.galaxy || null,
    galaxyDir: galaxyDir || null,
    status: (fm.status || "unknown").toLowerCase(),
    frontendOwner: fm.frontend_owner || null,
    dispatchers: parseInlineArray(fm.backend_dispatchers),
    kienzlePages: parseInlineArray(fm.kienzle_pages),
    section3,
    acceptanceTargets,
  };
}
