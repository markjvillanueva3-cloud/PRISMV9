#!/usr/bin/env node
/**
 * extract-design-system.mjs — OBSIDIAN-INTELLIGENCE-MS3 / C3
 *
 * Walks mcp-server/web/ for Tailwind class usage + component patterns,
 * emits state/shared/design-system.html as a self-contained reference
 * catalog (colors, typography, button styles, layouts, components).
 *
 * Consumed by C1 (--html flag scripts) + C2 (dashboard.html) to share
 * a canonical token set so HTML outputs are visually consistent.
 *
 * Pure module + CLI:
 *   node scripts/extract-design-system.mjs              # write design-system.html
 *   node scripts/extract-design-system.mjs --json       # emit tokens as JSON to stdout
 *   node scripts/extract-design-system.mjs --dry-run    # print HTML to stdout, no write
 *
 * Knobs:
 *   PRISM_DESIGN_SYSTEM_WEB_DIR — override default web/ scan root
 *   PRISM_DESIGN_SYSTEM_OUTPUT  — override default output path
 */

import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.env.PRISM_REPO_ROOT || "H:/prism";
const WEB_DIR = process.env.PRISM_DESIGN_SYSTEM_WEB_DIR
  || path.join(REPO_ROOT, "mcp-server", "web", "src");
const OUTPUT = process.env.PRISM_DESIGN_SYSTEM_OUTPUT
  || path.join(REPO_ROOT, "state", "shared", "design-system.html");

// Canonical PRISM design tokens — manufacturing-software UI palette:
// muted slate base + amber for warnings + red for critical + green for OK +
// indigo for primary action. Mirrors common Tailwind palette used across
// the web/ component set; the scanner extends this with any custom utilities
// observed but never replaces canonical tokens (they're the contract).
const CANONICAL_TOKENS = {
  colors: {
    "bg-base":      { hex: "#0f172a", note: "slate-900 — page background" },
    "bg-elevated":  { hex: "#1e293b", note: "slate-800 — card/panel" },
    "bg-muted":     { hex: "#334155", note: "slate-700 — input/divider" },
    "fg-primary":   { hex: "#f1f5f9", note: "slate-100 — body text" },
    "fg-muted":     { hex: "#94a3b8", note: "slate-400 — secondary text" },
    "fg-subtle":    { hex: "#64748b", note: "slate-500 — captions" },
    "accent-primary":  { hex: "#6366f1", note: "indigo-500 — primary action" },
    "accent-success":  { hex: "#22c55e", note: "green-500 — OK/PASS" },
    "accent-warning":  { hex: "#f59e0b", note: "amber-500 — WARN" },
    "accent-critical": { hex: "#ef4444", note: "red-500 — CRITICAL/FAIL" },
    "accent-info":     { hex: "#3b82f6", note: "blue-500 — info badge" },
    "border-muted":    { hex: "#475569", note: "slate-600 — panel border" },
  },
  typography: {
    "font-sans":   { value: "ui-sans-serif, system-ui, -apple-system, sans-serif", note: "body" },
    "font-mono":   { value: "ui-monospace, 'Cascadia Code', 'Consolas', monospace", note: "code/tabular" },
    "size-xs":     { value: "0.75rem", note: "12px — captions" },
    "size-sm":     { value: "0.875rem", note: "14px — body small" },
    "size-base":   { value: "1rem", note: "16px — body default" },
    "size-lg":     { value: "1.125rem", note: "18px — subheading" },
    "size-xl":     { value: "1.5rem", note: "24px — heading" },
    "size-2xl":    { value: "2rem", note: "32px — page title" },
  },
  spacing: {
    "space-1": "0.25rem",
    "space-2": "0.5rem",
    "space-3": "0.75rem",
    "space-4": "1rem",
    "space-6": "1.5rem",
    "space-8": "2rem",
  },
  radii: {
    "radius-sm": "0.25rem",
    "radius-md": "0.5rem",
    "radius-lg": "0.75rem",
  },
  components: {
    "btn-primary": "background: var(--accent-primary); color: var(--fg-primary); padding: 0.5rem 1rem; border-radius: var(--radius-md); border: none; cursor: pointer; font-weight: 500;",
    "btn-ghost":   "background: transparent; color: var(--fg-primary); padding: 0.5rem 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-muted); cursor: pointer;",
    "card":        "background: var(--bg-elevated); border: 1px solid var(--border-muted); border-radius: var(--radius-lg); padding: var(--space-4);",
    "badge-ok":    "background: var(--accent-success); color: white; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); font-size: var(--size-xs); font-weight: 600;",
    "badge-warn":  "background: var(--accent-warning); color: black; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); font-size: var(--size-xs); font-weight: 600;",
    "badge-fail":  "background: var(--accent-critical); color: white; padding: 0.125rem 0.5rem; border-radius: var(--radius-sm); font-size: var(--size-xs); font-weight: 600;",
    "code-block":  "background: var(--bg-base); color: var(--fg-primary); padding: var(--space-3); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: var(--size-sm); overflow-x: auto;",
    "table":       "width: 100%; border-collapse: collapse;",
    "table-th":    "text-align: left; padding: var(--space-2) var(--space-3); background: var(--bg-muted); color: var(--fg-primary); font-weight: 600; border-bottom: 1px solid var(--border-muted);",
    "table-td":    "padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border-muted);",
    "panel-header": "display: flex; justify-content: space-between; align-items: center; padding: var(--space-2) var(--space-4); background: var(--bg-muted); border-bottom: 1px solid var(--border-muted); font-weight: 600;",
  },
};

/**
 * Walk the web/ source tree (best-effort, optional) for Tailwind class
 * tokens that aren't already captured. Returns an array of EXTRA class
 * names observed (UNIQUE, sorted). Pure when given a `readdirSyncFn` +
 * `readFileSyncFn` for testability.
 */
export function scanForExtraTokens({ webDir = WEB_DIR, readdir = fs.readdirSync, readFile = fs.readFileSync, maxFiles = 200 } = {}) {
  const observed = new Set();
  const CLASS_RE = /className\s*=\s*["'`]([^"'`]+)["'`]/g;
  function walk(dir, count) {
    if (count.n >= maxFiles) return;
    let entries;
    try { entries = readdir(dir, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (count.n >= maxFiles) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
        walk(full, count);
      } else if (e.isFile() && /\.(tsx?|jsx?|html|css)$/.test(e.name)) {
        count.n++;
        let text;
        try { text = readFile(full, "utf8"); }
        catch { continue; }
        let m;
        while ((m = CLASS_RE.exec(text)) !== null) {
          for (const c of m[1].split(/\s+/)) {
            if (c.length >= 2 && c.length <= 40) observed.add(c);
          }
        }
      }
    }
  }
  walk(webDir, { n: 0 });
  // Filter out trivial / runtime-only classes (interpolated strings, conditionals).
  const filtered = [...observed].filter((c) => /^[a-z][\w:-]+$/i.test(c));
  return filtered.sort();
}

/**
 * Render the design-system.html as a self-contained string. Pure — no I/O.
 */
export function renderDesignSystemHtml(tokens = CANONICAL_TOKENS, extras = []) {
  const cssVars = [
    ...Object.entries(tokens.colors).map(([k, v]) => `  --${k}: ${v.hex};`),
    ...Object.entries(tokens.typography).map(([k, v]) => `  --${k}: ${typeof v === "string" ? v : v.value};`),
    ...Object.entries(tokens.spacing).map(([k, v]) => `  --${k}: ${v};`),
    ...Object.entries(tokens.radii).map(([k, v]) => `  --${k}: ${v};`),
  ].join("\n");

  const colorRows = Object.entries(tokens.colors).map(([name, v]) => `
        <tr>
          <td><code>--${name}</code></td>
          <td><span class="swatch" style="background: ${v.hex};"></span></td>
          <td><code>${v.hex}</code></td>
          <td>${v.note}</td>
        </tr>`).join("");

  const typoRows = Object.entries(tokens.typography).map(([name, v]) => {
    const val = typeof v === "string" ? v : v.value;
    const note = typeof v === "string" ? "" : (v.note || "");
    return `
        <tr>
          <td><code>--${name}</code></td>
          <td style="font-family: ${name.startsWith("font-") ? `var(--${name})` : "inherit"}; font-size: ${name.startsWith("size-") ? `var(--${name})` : "inherit"};">Sample 0123 Aa</td>
          <td><code>${val}</code></td>
          <td>${note}</td>
        </tr>`;
  }).join("");

  const compRows = Object.entries(tokens.components).map(([name, css]) => `
        <tr>
          <td><code>${name}</code></td>
          <td><span class="${name}" style="${css}">demo</span></td>
          <td><code>${css}</code></td>
        </tr>`).join("");

  const extrasSection = extras.length === 0 ? "" : `
    <h2>Tailwind classes observed in web/src/</h2>
    <p class="muted">Classes scanned from web component sources (best-effort, deduped, sorted).</p>
    <p>${extras.slice(0, 200).map((c) => `<code class="tag">${c}</code>`).join(" ")}</p>
    ${extras.length > 200 ? `<p class="muted">… ${extras.length - 200} more not shown.</p>` : ""}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>PRISM Design System</title>
  <style>
:root {
${cssVars}
}
* { box-sizing: border-box; }
body {
  background: var(--bg-base);
  color: var(--fg-primary);
  font-family: var(--font-sans);
  font-size: var(--size-base);
  margin: 0;
  padding: var(--space-6);
  line-height: 1.5;
}
h1 { font-size: var(--size-2xl); margin: 0 0 var(--space-4); }
h2 { font-size: var(--size-xl); margin: var(--space-6) 0 var(--space-3); border-bottom: 1px solid var(--border-muted); padding-bottom: var(--space-1); }
.muted { color: var(--fg-muted); font-size: var(--size-sm); }
code { font-family: var(--font-mono); font-size: var(--size-sm); background: var(--bg-base); padding: 0.125rem 0.375rem; border-radius: var(--radius-sm); color: var(--fg-primary); border: 1px solid var(--border-muted); }
.tag { display: inline-block; margin: 0.125rem; }
table { width: 100%; border-collapse: collapse; margin: var(--space-3) 0; }
th, td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border-muted); vertical-align: middle; }
th { background: var(--bg-muted); font-weight: 600; }
.swatch { display: inline-block; width: 32px; height: 24px; border-radius: var(--radius-sm); border: 1px solid var(--border-muted); }
.meta { color: var(--fg-muted); font-size: var(--size-sm); margin-top: var(--space-4); }
  </style>
</head>
<body>
  <h1>PRISM Design System</h1>
  <p class="muted">Canonical token catalog — colors, typography, components — for HTML outputs (CLAUDE-BRIEF.html, BUILD_STATE.html, dashboard.html). Import as CSS vars; never hardcode hex values.</p>

  <h2>Colors</h2>
  <table>
    <thead><tr><th>Token</th><th>Sample</th><th>Hex</th><th>Notes</th></tr></thead>
    <tbody>${colorRows}
    </tbody>
  </table>

  <h2>Typography</h2>
  <table>
    <thead><tr><th>Token</th><th>Sample</th><th>Value</th><th>Notes</th></tr></thead>
    <tbody>${typoRows}
    </tbody>
  </table>

  <h2>Components</h2>
  <table>
    <thead><tr><th>Token</th><th>Preview</th><th>CSS</th></tr></thead>
    <tbody>${compRows}
    </tbody>
  </table>
${extrasSection}
  <div class="meta">
    <p>Generated by <code>scripts/extract-design-system.mjs</code>. Components: ${Object.keys(tokens.components).length} · Colors: ${Object.keys(tokens.colors).length} · Typography: ${Object.keys(tokens.typography).length}.</p>
  </div>
</body>
</html>
`;
}

/**
 * Emit tokens as JSON (consumable by C1/C2 generators). Pure.
 */
export function tokensToJson(tokens = CANONICAL_TOKENS, extras = []) {
  return JSON.stringify({ tokens, extras }, null, 2);
}

function run({ json = false, dryRun = false } = {}) {
  const extras = scanForExtraTokens();
  if (json) {
    process.stdout.write(tokensToJson(CANONICAL_TOKENS, extras) + "\n");
    return { ok: true, mode: "json", extrasCount: extras.length };
  }
  const html = renderDesignSystemHtml(CANONICAL_TOKENS, extras);
  if (dryRun) {
    process.stdout.write(html);
    return { ok: true, mode: "dry-run", bytes: html.length };
  }
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, html, "utf8");
  return { ok: true, output: OUTPUT, bytes: html.length, components: Object.keys(CANONICAL_TOKENS.components).length, extrasCount: extras.length };
}

export { CANONICAL_TOKENS };

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` ||
    process.argv[1]?.endsWith("extract-design-system.mjs")) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dryRun = args.includes("--dry-run");
  const result = run({ json, dryRun });
  if (!json) {
    process.stderr.write(`[design-system] ${JSON.stringify(result)}\n`);
  }
  process.exit(0);
}
