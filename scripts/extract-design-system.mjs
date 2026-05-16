#!/usr/bin/env node
/**
 * extract-design-system.mjs — walk PRISM web/ design system source and emit
 * a single canonical HTML reference catalog at state/shared/design-system.html.
 *
 * OBSIDIAN-INTELLIGENCE-MS3 / U-HTML-DESIGN-SYSTEM (C3).
 *
 * The existing hand-curated design-system.html drifted from the actual
 * TypeScript source (mcp-server/web/src/styles/design-system.ts) and the
 * tailwind config (mcp-server/web/tailwind.config.js). This script
 * regenerates the HTML from the live source so:
 *   1. C1/C2 HTML generators (claude-brief, build-state, dashboard) can import
 *      a single set of CSS variable tokens (emit a sidecar
 *      state/shared/design-system-tokens.css) and stay visually consistent.
 *   2. Reviewers see the live token surface, not yesterday's guess.
 *
 * Pure exports at top — tested via DesignSystemExtract.test.ts — followed
 * by a CLI main at the bottom that does the file I/O + atomic write.
 *
 * Failure contract:
 *   - Source files missing → log error, exit 1 (CLI) / return null (lib)
 *   - Partial parse (one token block malformed) → keep the rest, emit a
 *     warning section in the HTML so the drift is visible
 *   - Components dir empty → catalog still emits, "components" section says 0
 *   - Render lib import fails → CLI fails loud, lib functions still callable
 *
 * Knobs (CLI):
 *   --dry-run    print JSON catalog to stdout, DO NOT write HTML
 *   --check      parse + count, exit 0 if ≥10 components, exit 1 otherwise
 *   --html       force HTML write (default when no flag given)
 *   --tokens-css emit sidecar state/shared/design-system-tokens.css too
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  renameSync,
  unlinkSync,
  statSync,
  mkdirSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";

import {
  renderHtmlPage,
  HTML_REPORT_SCHEMA_VERSION,
} from "./lib/html-report-render.mjs";

export const DESIGN_SYSTEM_SCHEMA_VERSION = "1.0.0";

// ─── Source paths (relative to repo root) ─────────────────────────────
const REPO_ROOT = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..");
})();

const DESIGN_SYSTEM_TS = join(
  REPO_ROOT,
  "mcp-server/web/src/styles/design-system.ts",
);
const TAILWIND_CONFIG = join(
  REPO_ROOT,
  "mcp-server/web/tailwind.config.js",
);
const COMPONENTS_DIR = join(REPO_ROOT, "mcp-server/web/src/components");
const OUT_HTML = join(REPO_ROOT, "state/shared/design-system.html");
const OUT_TOKENS_CSS = join(
  REPO_ROOT,
  "state/shared/design-system-tokens.css",
);

// ─── Pure parsers (regex-based; no TS compiler) ───────────────────────

/**
 * Parse the design-system.ts source. Returns a structured catalog with the
 * primitives we care about. Robust to formatting — uses block-by-block
 * regex rather than full AST.
 *
 * Returns { colors: {primary, glow, status, background, text, border},
 *           spacing, borderRadius,
 *           typography: {fontFamily, fontSize, fontWeight},
 *           buttonVariants, inputVariants, cardVariants,
 *           transitions, animations, presets }
 *
 * Any block that fails to parse becomes `{}` — caller can detect and warn.
 */
export function parseDesignSystemTs(src) {
  if (typeof src !== "string" || src.length === 0) return null;
  return {
    colors: {
      primary: parseRecordOfStrings(src, "primary:") || {},
      glow: parseRecordOfStrings(src, "glow:") || {},
      status: parseStatusBlock(src) || {},
      background: parseRecordOfStrings(src, "background:") || {},
      text: parseRecordOfStrings(src, "text:") || {},
      border: parseRecordOfStrings(src, "border:") || {},
    },
    spacing: parseTopLevelRecord(src, "spacing") || {},
    borderRadius: parseTopLevelRecord(src, "borderRadius") || {},
    typography: parseTypographyBlock(src),
    buttonVariants: parseTopLevelRecord(src, "buttonVariants") || {},
    inputVariants: parseTopLevelRecord(src, "inputVariants") || {},
    cardVariants: parseTopLevelRecord(src, "cardVariants") || {},
    transitions: parseTopLevelRecord(src, "transitions") || {},
    animations: parseTopLevelRecord(src, "animations") || {},
    presets: parseTopLevelRecord(src, "presets") || {},
  };
}

/**
 * Parse a `export const NAME = { ... } as const` block where every value is
 * a plain string literal. The matched block must immediately follow the
 * `=`; nested objects are NOT supported — use parseStatusBlock/parseTypography
 * for those.
 */
export function parseTopLevelRecord(src, name) {
  if (typeof src !== "string" || typeof name !== "string") return null;
  // Find the `export const NAME = ` prefix, then slice the balanced { ... }
  // body. Non-greedy regex was fragile: a value string containing a `}` (or
  // a future preset with nested braces) would truncate the body. sliceBalanced
  // tracks string literals + escape sequences and stops only at the matching
  // closing brace.
  const re = new RegExp(
    `export\\s+const\\s+${escapeRegex(name)}\\s*=\\s*`,
    "m",
  );
  const m = src.match(re);
  if (!m || typeof m.index !== "number") return null;
  const afterEq = m.index + m[0].length;
  if (src[afterEq] !== "{") return null;
  const body = sliceBalanced(src, afterEq);
  if (!body) return null;
  return parseRecordBody(body);
}

/**
 * Parse a nested record like `primary: { 50: '#...', 100: '#...' }`.
 * The label INCLUDES the trailing colon (e.g. `"primary:"`).
 */
export function parseRecordOfStrings(src, labelWithColon) {
  if (typeof src !== "string" || typeof labelWithColon !== "string") return null;
  const re = new RegExp(
    `\\b${escapeRegex(labelWithColon)}\\s*(\\{[^{}]*\\})`,
    "m",
  );
  const m = src.match(re);
  if (!m) return null;
  return parseRecordBody(m[1]);
}

/**
 * Parse the `status: { info: {...}, success: {...}, ... }` block where
 * each value is itself a record of bg/text/border.
 */
export function parseStatusBlock(src) {
  if (typeof src !== "string") return null;
  // Match `status: { … }` where the value contains nested {…} per status.
  // We allow one level of nesting via a non-greedy `[\s\S]*?` plus a balanced
  // closing brace detection by walking forward from the opening `{`.
  const startIdx = src.search(/\bstatus:\s*\{/);
  if (startIdx === -1) return null;
  const braceStart = src.indexOf("{", startIdx);
  const body = sliceBalanced(src, braceStart);
  if (!body) return null;
  // Inside: pairs like `info: { bg: '...', text: '...', border: '...' }`
  const out = {};
  const inner = body.slice(1, -1);
  const subRe = /(\w+)\s*:\s*\{([^{}]*)\}/g;
  let mm;
  while ((mm = subRe.exec(inner)) !== null) {
    const key = mm[1];
    const recBody = `{${mm[2]}}`;
    const parsed = parseRecordBody(recBody);
    if (parsed) out[key] = parsed;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Parse the `typography: { fontFamily: {...}, fontSize: {...}, fontWeight: {...} }`
 * top-level export. fontSize is an array-of-tuples — flatten to plain strings.
 */
export function parseTypographyBlock(src) {
  if (typeof src !== "string") return null;
  const re =
    /export\s+const\s+typography\s*=\s*(\{[\s\S]*?\})\s*(?:as\s+const)?\s*;/m;
  const m = src.match(re);
  if (!m) return null;
  const body = m[1];
  return {
    fontFamily: parseRecordOfStrings(body, "fontFamily:") || {},
    fontSize: parseFontSizeBlock(body) || {},
    fontWeight: parseRecordOfStrings(body, "fontWeight:") || {},
  };
}

/**
 * Parse fontSize where each value is `['1rem', { lineHeight: '1.5rem' }]`.
 * Returns flat `{ key: 'size / lineHeight' }` so the HTML reads cleanly.
 */
export function parseFontSizeBlock(src) {
  if (typeof src !== "string") return null;
  const startIdx = src.search(/\bfontSize:\s*\{/);
  if (startIdx === -1) return null;
  const braceStart = src.indexOf("{", startIdx);
  const body = sliceBalanced(src, braceStart);
  if (!body) return null;
  const inner = body.slice(1, -1);
  const out = {};
  // Match `key: ['size', { lineHeight: 'lh' }]` OR `key: 'size'`
  const re =
    /['"]?([\w-]+)['"]?\s*:\s*(?:\[\s*['"]([^'"]+)['"]\s*,\s*\{\s*lineHeight\s*:\s*['"]([^'"]+)['"]\s*\}\s*\]|['"]([^'"]+)['"])/g;
  let mm;
  while ((mm = re.exec(inner)) !== null) {
    const key = mm[1];
    if (mm[2] && mm[3]) {
      out[key] = `${mm[2]} / lh ${mm[3]}`;
    } else if (mm[4]) {
      out[key] = mm[4];
    }
  }
  return out;
}

/**
 * Parse a simple `{ key1: 'value1', key2: 'value2' }` body into a flat
 * `{ key1: 'value1', ... }` object. Tolerates quoted/unquoted keys, single
 * or double quotes around values, trailing commas, and inline comments
 * (lines starting with `//`).
 *
 * Reject obvious nested-object values (`{` in the slice) to avoid silently
 * eating structure parseStatusBlock/parseTypography is supposed to handle.
 */
export function parseRecordBody(body) {
  if (typeof body !== "string") return null;
  // strip outer braces
  let inner = body.trim();
  if (inner.startsWith("{")) inner = inner.slice(1);
  if (inner.endsWith("}")) inner = inner.slice(0, -1);
  // strip line comments
  inner = inner.replace(/\/\/[^\n]*/g, "");
  // Reject if nested objects remain — caller should use a structural parser.
  if (/\{/.test(inner)) return null;
  const out = {};
  // Match `key: 'value'` OR `key: "value"` OR `'key': '...'`
  const re =
    /['"]?([\w$@-][\w$@-]*)['"]?\s*:\s*['"]([^'"]*?)['"]/g;
  let m;
  while ((m = re.exec(inner)) !== null) {
    out[m[1]] = m[2];
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Parse tailwind.config.js's `theme.extend.colors` block. Returns
 * `{ prism: {50: '#...', ...}, safety: {pass, warn, fail, info} }` or
 * `{}` if the structure is missing.
 */
export function parseTailwindConfig(src) {
  if (typeof src !== "string") return null;
  const result = {};
  // Find theme.extend.colors block
  const extendIdx = src.search(/\bcolors\s*:\s*\{/);
  if (extendIdx === -1) return result;
  const braceStart = src.indexOf("{", extendIdx);
  const block = sliceBalanced(src, braceStart);
  if (!block) return result;
  const inner = block.slice(1, -1);
  // Each top-level entry: `key: { ... }`
  // Use balanced-brace walking instead of a non-greedy regex (which would
  // bail at the first inner `}`).
  for (const { name, body } of iterTopLevelObjectEntries(inner)) {
    const parsed = parseRecordBody(body);
    if (parsed) result[name] = parsed;
  }
  return result;
}

/**
 * Generator that yields `{ name, body }` for each top-level `key: { ... }`
 * entry in a block, respecting brace nesting. Used by parseTailwindConfig.
 */
export function* iterTopLevelObjectEntries(inner) {
  if (typeof inner !== "string") return;
  let i = 0;
  while (i < inner.length) {
    // Skip whitespace, commas, comments
    while (i < inner.length && /[\s,]/.test(inner[i])) i++;
    if (i >= inner.length) break;
    if (inner[i] === "/" && inner[i + 1] === "/") {
      const nl = inner.indexOf("\n", i);
      i = nl === -1 ? inner.length : nl;
      continue;
    }
    // Match identifier
    const nameMatch = inner.slice(i).match(/^['"]?([\w$@-]+)['"]?\s*:\s*/);
    if (!nameMatch) {
      i++;
      continue;
    }
    const name = nameMatch[1];
    i += nameMatch[0].length;
    if (inner[i] !== "{") {
      // not an object value, skip to next comma/end
      const nextComma = inner.indexOf(",", i);
      i = nextComma === -1 ? inner.length : nextComma + 1;
      continue;
    }
    const body = sliceBalanced(inner, i);
    if (!body) break;
    yield { name, body };
    i += body.length;
  }
}

/**
 * Slice a balanced { ... } region starting at index `start` (which must
 * point at `{`). Returns the slice INCLUDING the outer braces, or null if
 * the braces never balance.
 */
export function sliceBalanced(src, start) {
  if (typeof src !== "string" || src[start] !== "{") return null;
  let depth = 0;
  let inString = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Components walker (I/O-injectable) ───────────────────────────────

/**
 * Walk a components directory. Returns:
 *   {
 *     topLevel: [{name, path}],          // .tsx files at root
 *     categories: { [subdir]: count },    // .tsx files in each subdir
 *     totalCount: N
 *   }
 *
 * `fsImpl` may be injected for tests; defaults to node:fs.
 */
export function walkComponentsDir(rootPath, fsImpl) {
  const fs = fsImpl || {
    readdirSync: readdirSync,
    statSync: statSync,
    existsSync: existsSync,
  };
  if (!fs.existsSync(rootPath)) {
    return { topLevel: [], categories: {}, totalCount: 0 };
  }
  const entries = safeReaddir(fs, rootPath);
  const topLevel = [];
  const categories = {};
  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const full = join(rootPath, name);
    const st = safeStat(fs, full);
    if (!st) continue;
    if (st.isDirectory()) {
      const subEntries = safeReaddir(fs, full);
      let count = 0;
      for (const sub of subEntries) {
        if (sub.endsWith(".tsx")) count++;
      }
      if (count > 0) categories[name] = count;
    } else if (name.endsWith(".tsx")) {
      topLevel.push({
        name: name.replace(/\.tsx$/, ""),
        path: `mcp-server/web/src/components/${name}`,
      });
    }
  }
  const subTotal = Object.values(categories).reduce((a, b) => a + b, 0);
  return {
    topLevel,
    categories,
    totalCount: topLevel.length + subTotal,
  };
}

function safeReaddir(fs, p) {
  try {
    return fs.readdirSync(p);
  } catch {
    return [];
  }
}

function safeStat(fs, p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

// ─── Catalog + render ─────────────────────────────────────────────────

/**
 * Build a unified catalog from the three parsed sources.
 */
export function buildCatalog({ designSystem, tailwind, components }) {
  const ds = designSystem || {};
  const tw = tailwind || {};
  const comp = components || { topLevel: [], categories: {}, totalCount: 0 };
  return {
    schemaVersion: DESIGN_SYSTEM_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sources: {
      designSystemTs: "mcp-server/web/src/styles/design-system.ts",
      tailwindConfig: "mcp-server/web/tailwind.config.js",
      componentsDir: "mcp-server/web/src/components/",
    },
    colors: ds.colors || {},
    spacing: ds.spacing || {},
    borderRadius: ds.borderRadius || {},
    typography: ds.typography || {},
    buttonVariants: ds.buttonVariants || {},
    inputVariants: ds.inputVariants || {},
    cardVariants: ds.cardVariants || {},
    transitions: ds.transitions || {},
    animations: ds.animations || {},
    presets: ds.presets || {},
    tailwindExtensions: tw,
    components: comp,
  };
}

/**
 * Generate a CSS-vars stylesheet that C1/C2 generators can inline into
 * their HTML pages. Variable names are stable identifiers — the C1 render
 * lib's `:root { --bg, --panel, … }` will be supplemented (not replaced)
 * by these, so downstream HTML inherits a richer palette.
 */
export function catalogToTokensCss(catalog) {
  if (!catalog || typeof catalog !== "object") return "";
  const lines = [`/* design-system-tokens.css — generated by extract-design-system.mjs */`];
  lines.push(`/* schemaVersion: ${catalog.schemaVersion || "?"} */`);
  lines.push(`/* generatedAt: ${catalog.generatedAt || "?"} */`);
  lines.push(`:root {`);
  // Status colors are sourced from tailwind.config.js's `safety` palette
  // first, then design-system.ts's primary scale, with frozen hex fallbacks
  // ONLY when both upstream sources are empty. Drift between this file and
  // the actual source surfaces in the generated comment when fallback fires.
  const safety = catalog.tailwindExtensions?.safety || {};
  const primary = catalog.colors?.primary || {};
  const FROZEN_FALLBACK = {
    ok: "#22c55e",
    warn: "#f59e0b",
    fail: "#ef4444",
    info: "#3b82f6",
    pending: "#a78bfa",
  };
  const resolveStatus = (key) => {
    if (key === "ok") return safety.pass || primary["500"] || FROZEN_FALLBACK.ok;
    if (key === "warn") return safety.warn || FROZEN_FALLBACK.warn;
    if (key === "fail") return safety.fail || FROZEN_FALLBACK.fail;
    if (key === "info") return safety.info || FROZEN_FALLBACK.info;
    return FROZEN_FALLBACK[key] || FROZEN_FALLBACK.info;
  };
  let usedFallback = false;
  for (const key of ["ok", "warn", "fail", "info", "pending"]) {
    const val = resolveStatus(key);
    if (val === FROZEN_FALLBACK[key]) usedFallback = true;
    lines.push(`  --ds-${key}: ${val};`);
  }
  if (usedFallback) {
    lines.push(
      `  /* NOTE: some --ds-status values fell back to frozen literals — verify tailwind.config.js safety palette is present */`,
    );
  }
  // Background layers
  if (catalog.colors?.background) {
    for (const [k, v] of Object.entries(catalog.colors.background)) {
      lines.push(`  --ds-bg-${k}: ${v};`);
    }
  }
  // Text colors
  if (catalog.colors?.text) {
    for (const [k, v] of Object.entries(catalog.colors.text)) {
      lines.push(`  --ds-text-${k}: ${v};`);
    }
  }
  // Primary palette (tailwind primary scale)
  if (catalog.colors?.primary) {
    for (const [k, v] of Object.entries(catalog.colors.primary)) {
      lines.push(`  --ds-primary-${k}: ${v};`);
    }
  }
  // Spacing
  if (catalog.spacing) {
    for (const [k, v] of Object.entries(catalog.spacing)) {
      lines.push(`  --ds-space-${k}: ${v};`);
    }
  }
  // Border radius
  if (catalog.borderRadius) {
    for (const [k, v] of Object.entries(catalog.borderRadius)) {
      lines.push(`  --ds-radius-${k}: ${v};`);
    }
  }
  // Typography font families
  if (catalog.typography?.fontFamily) {
    for (const [k, v] of Object.entries(catalog.typography.fontFamily)) {
      lines.push(`  --ds-font-${k}: ${v};`);
    }
  }
  lines.push(`}`);
  return lines.join("\n") + "\n";
}

/**
 * Build an array of section descriptors for renderHtmlPage. Each section
 * surfaces a different aspect of the catalog.
 */
export function catalogToHtmlSections(catalog) {
  if (!catalog || typeof catalog !== "object") return [];
  const sections = [];

  // Headline cards
  const totalColors = countColors(catalog.colors);
  const totalComponents = catalog.components?.totalCount || 0;
  const totalVariants =
    Object.keys(catalog.buttonVariants || {}).length +
    Object.keys(catalog.inputVariants || {}).length +
    Object.keys(catalog.cardVariants || {}).length;
  const totalCategories = Object.keys(catalog.components?.categories || {}).length;
  sections.push({
    kind: "headline",
    cards: [
      { label: "Components", value: String(totalComponents), status: totalComponents >= 10 ? "ok" : "warn", hint: `${totalCategories} categories` },
      { label: "Color tokens", value: String(totalColors), status: totalColors > 0 ? "ok" : "warn" },
      { label: "Variants", value: String(totalVariants), status: totalVariants > 0 ? "ok" : "warn", hint: "button + input + card" },
      { label: "Schema", value: catalog.schemaVersion, status: "info" },
    ],
  });

  // Colors — primary palette table
  if (catalog.colors?.primary && Object.keys(catalog.colors.primary).length > 0) {
    sections.push({
      kind: "table",
      caption: "Primary palette (mcp-server/web/src/styles/design-system.ts)",
      headers: ["Token", "Value"],
      rows: Object.entries(catalog.colors.primary).map(([k, v]) => [
        `primary.${k}`,
        v,
      ]),
    });
  }

  // Status palette — badge grid
  if (catalog.colors?.status) {
    const items = [];
    for (const [name, defn] of Object.entries(catalog.colors.status)) {
      const mappedStatus = mapStatusName(name);
      items.push({
        label: name,
        status: mappedStatus,
        hint: defn.text || defn.bg || "",
      });
    }
    if (items.length > 0) {
      sections.push({
        kind: "badge-grid",
        title: "Status palette (drives chips, badges, alerts)",
        items,
      });
    }
  }

  // Background + text + border colors (kv)
  const colorKvs = [];
  for (const block of ["background", "text", "border"]) {
    if (catalog.colors?.[block]) {
      for (const [k, v] of Object.entries(catalog.colors[block])) {
        colorKvs.push({ key: `${block}.${k}`, value: v });
      }
    }
  }
  if (colorKvs.length > 0) {
    sections.push({ kind: "kv", title: "Surface colors", pairs: colorKvs });
  }

  // Tailwind extensions (prism + safety palettes)
  for (const palette of ["prism", "safety"]) {
    if (catalog.tailwindExtensions?.[palette]) {
      const entries = Object.entries(catalog.tailwindExtensions[palette]);
      if (entries.length > 0) {
        sections.push({
          kind: "table",
          caption: `tailwind.config.js → theme.extend.colors.${palette}`,
          headers: ["Token", "Hex"],
          rows: entries.map(([k, v]) => [`${palette}.${k}`, v]),
        });
      }
    }
  }

  // Typography
  if (catalog.typography) {
    const typoKvs = [];
    if (catalog.typography.fontFamily) {
      for (const [k, v] of Object.entries(catalog.typography.fontFamily)) {
        typoKvs.push({ key: `fontFamily.${k}`, value: v });
      }
    }
    if (catalog.typography.fontSize) {
      for (const [k, v] of Object.entries(catalog.typography.fontSize)) {
        typoKvs.push({ key: `fontSize.${k}`, value: v });
      }
    }
    if (catalog.typography.fontWeight) {
      for (const [k, v] of Object.entries(catalog.typography.fontWeight)) {
        typoKvs.push({ key: `fontWeight.${k}`, value: v });
      }
    }
    if (typoKvs.length > 0) {
      sections.push({ kind: "kv", title: "Typography", pairs: typoKvs });
    }
  }

  // Spacing + borderRadius (one table each)
  if (Object.keys(catalog.spacing || {}).length > 0) {
    sections.push({
      kind: "table",
      caption: "Spacing scale",
      headers: ["Token", "Value"],
      rows: Object.entries(catalog.spacing).map(([k, v]) => [k, v]),
    });
  }
  if (Object.keys(catalog.borderRadius || {}).length > 0) {
    sections.push({
      kind: "table",
      caption: "Border radius scale",
      headers: ["Token", "Value"],
      rows: Object.entries(catalog.borderRadius).map(([k, v]) => [k, v]),
    });
  }

  // Variants — three tables
  for (const variantBlock of ["buttonVariants", "inputVariants", "cardVariants"]) {
    if (Object.keys(catalog[variantBlock] || {}).length > 0) {
      sections.push({
        kind: "table",
        caption: variantBlock,
        headers: ["Variant", "Classes"],
        rows: Object.entries(catalog[variantBlock]).map(([k, v]) => [k, v]),
      });
    }
  }

  // Transitions + animations (kv each, compact)
  if (Object.keys(catalog.transitions || {}).length > 0) {
    sections.push({
      kind: "kv",
      title: "Transitions",
      pairs: Object.entries(catalog.transitions).map(([k, v]) => ({
        key: k,
        value: v,
      })),
    });
  }
  if (Object.keys(catalog.animations || {}).length > 0) {
    sections.push({
      kind: "kv",
      title: "Animations",
      pairs: Object.entries(catalog.animations).map(([k, v]) => ({
        key: k,
        value: v,
      })),
    });
  }

  // Component inventory
  const components = catalog.components || {};
  if ((components.topLevel || []).length > 0) {
    sections.push({
      kind: "table",
      caption: `Top-level components (${components.topLevel.length})`,
      headers: ["Name", "Path"],
      rows: components.topLevel.map((c) => [c.name, c.path]),
    });
  }
  if (Object.keys(components.categories || {}).length > 0) {
    const totalSubdir = Object.values(components.categories).reduce(
      (a, b) => a + b,
      0,
    );
    sections.push({
      kind: "barchart",
      label: `Component categories (${totalSubdir} files across ${
        Object.keys(components.categories).length
      } subdirs)`,
      data: Object.entries(components.categories)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ label: k, value: v, status: "info" })),
    });
  }

  // Bridge note — how C1/C2 consume this
  sections.push({
    kind: "prose",
    title: "CSS-vars bridge for HTML report generators",
    trustedHtml: `<p>C1 / C2 HTML generators (claude-brief, build-state, dashboard) MAY include the sidecar <code>state/shared/design-system-tokens.css</code> for richer palette inheritance:</p>
<pre style="background:#1a1c23;padding:0.75rem;border-radius:6px;overflow:auto"><code>&lt;link rel="stylesheet" href="design-system-tokens.css"&gt;
or inline: &lt;style&gt;${escapeForPreInline("--ds-ok: #22c55e; --ds-warn: #f59e0b; …")}&lt;/style&gt;</code></pre>
<p>Default render lib palette (<code>--bg, --panel, --ok, ...</code>) stays load-bearing — these tokens are additive, not a replacement.</p>`,
  });

  return sections;
}

function escapeForPreInline(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function mapStatusName(name) {
  const lower = String(name).toLowerCase();
  if (lower === "success") return "ok";
  if (lower === "warning") return "warn";
  if (lower === "error") return "fail";
  if (lower === "info") return "info";
  if (lower === "pending") return "info";
  return undefined;
}

function countColors(colors) {
  if (!colors || typeof colors !== "object") return 0;
  let n = 0;
  for (const block of Object.values(colors)) {
    if (block && typeof block === "object") {
      n += Object.keys(block).length;
    }
  }
  return n;
}

/**
 * Top-level HTML generator. Uses the shared C1 render lib for visual
 * consistency.
 */
export function generateDesignSystemHtml(catalog, opts = {}) {
  const sections = catalogToHtmlSections(catalog);
  const totalComponents = catalog?.components?.totalCount || 0;
  return renderHtmlPage({
    title: "PRISM Design System — Generated Catalog",
    subtitle: `Schema ${catalog?.schemaVersion || "?"} · ${
      catalog?.generatedAt || "?"
    } · ${totalComponents} components catalogued`,
    sections,
    note: `Generated by scripts/extract-design-system.mjs (render lib ${HTML_REPORT_SCHEMA_VERSION}). Source: mcp-server/web/src/styles/design-system.ts + tailwind.config.js + components/`,
    ...opts,
  });
}

// ─── CLI main (impure) ────────────────────────────────────────────────

function readSafe(path) {
  try {
    if (!existsSync(path)) return null;
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function atomicWrite(target, content) {
  mkdirSync(dirname(target), { recursive: true });
  // process.pid alone collided across re-execs + same-pid-forks; add 12 random
  // hex bytes so concurrent fleet invocations cannot share a .tmp suffix.
  const tmp =
    target + ".tmp." + process.pid + "." + randomBytes(6).toString("hex");
  writeFileSync(tmp, content, "utf8");
  try {
    renameSync(tmp, target);
  } catch (err) {
    try {
      unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    // Surface the rename error reason — EBUSY/EPERM/EACCES are operator-actionable
    // (file held by an editor / antivirus / WSL bridge). Karpathy R12: fail loud.
    const code = err && err.code ? ` (${err.code})` : "";
    const msg = err && err.message ? err.message : String(err);
    const wrapped = new Error(`atomicWrite rename failed${code}: ${msg}`);
    if (err && err.code) wrapped.code = err.code;
    throw wrapped;
  }
}

function main() {
  const args = new Set(process.argv.slice(2));
  const isDryRun = args.has("--dry-run");
  const isCheck = args.has("--check");
  const emitTokensCss = args.has("--tokens-css");

  const dsTs = readSafe(DESIGN_SYSTEM_TS);
  const twConfig = readSafe(TAILWIND_CONFIG);
  if (!dsTs) {
    process.stderr.write(
      `extract-design-system: source missing: ${DESIGN_SYSTEM_TS}\n`,
    );
    process.exit(1);
  }
  const designSystem = parseDesignSystemTs(dsTs);
  const tailwind = twConfig ? parseTailwindConfig(twConfig) : {};
  const components = walkComponentsDir(COMPONENTS_DIR);
  const catalog = buildCatalog({ designSystem, tailwind, components });

  if (isCheck) {
    const ok = components.totalCount >= 10;
    process.stdout.write(
      JSON.stringify({
        ok,
        totalComponents: components.totalCount,
        categories: Object.keys(components.categories).length,
        schemaVersion: catalog.schemaVersion,
      }) + "\n",
    );
    process.exit(ok ? 0 : 1);
  }

  if (isDryRun) {
    process.stdout.write(JSON.stringify(catalog, null, 2) + "\n");
    return;
  }

  const html = generateDesignSystemHtml(catalog);
  atomicWrite(OUT_HTML, html);
  process.stdout.write(
    `extract-design-system: wrote ${OUT_HTML} (${html.length} bytes, ${components.totalCount} components)\n`,
  );

  if (emitTokensCss) {
    const css = catalogToTokensCss(catalog);
    atomicWrite(OUT_TOKENS_CSS, css);
    process.stdout.write(
      `extract-design-system: wrote ${OUT_TOKENS_CSS} (${css.length} bytes)\n`,
    );
  }
}

const isMain =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  /extract-design-system\.mjs$/.test(process.argv[1].replace(/\\/g, "/"));

if (isMain) {
  try {
    main();
  } catch (err) {
    process.stderr.write(
      `extract-design-system: ${err && err.message ? err.message : err}\n`,
    );
    process.exit(1);
  }
}
