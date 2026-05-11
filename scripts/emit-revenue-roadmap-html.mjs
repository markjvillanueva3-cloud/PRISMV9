#!/usr/bin/env node
/**
 * emit-revenue-roadmap-html.mjs — v7.F HTML companion for REVENUE-ROADMAP-2026-05-10.md.
 *
 * Reads:
 *   - state/shared/specs/REVENUE-ROADMAP-2026-05-10.md
 *   - state/shared/REVENUE-READINESS.json (if present)
 *
 * Writes:
 *   - state/shared/specs/REVENUE-ROADMAP-2026-05-10.html
 *
 * Includes:
 *   - SVG dependency graph (MS0 → MS1 → MS2/MS3 → MS4)
 *   - Color-coded combinatorics table (green/yellow/red/blue)
 *   - Per-unit verification-channel run buttons (copy-to-clipboard rtk command)
 *   - Tier-invocation pie (T1..T7)
 *   - Synergy delta chart placeholder
 *
 * Pure-JS; no headless browser dependency for the build itself.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// === Color constants ===
const COLOR_BUILT     = "#2da44e";  // green
const COLOR_COMBOABLE = "#bf8700";  // yellow
const COLOR_BLOCKED   = "#cf222e";  // red
const COLOR_BRIDGE    = "#0969da";  // blue
const COLOR_NEUTRAL   = "#57606a";  // gray

// --- CLI flags: --spec=<path> --readiness=<path> --out=<path> (round-5 a10 fix) ---
function flagVal(name, fallback) {
  const pre = `--${name}=`;
  const hit = process.argv.slice(2).find(a => a.startsWith(pre));
  return hit ? hit.slice(pre.length) : fallback;
}
function firstExisting(...rels) {
  for (const r of rels) { if (fs.existsSync(path.join(ROOT, r))) return r; }
  return rels[rels.length - 1];
}
// Default tracks the live spec: v7.2 → v7.1 → legacy. Overridable via --spec=.
const SPEC_PATH       = flagVal("spec", firstExisting(
  "state/shared/specs/REVENUE-ROADMAP-v7.2.md",
  "state/shared/specs/REVENUE-ROADMAP-v7.1.md",
  "state/shared/specs/REVENUE-ROADMAP-2026-05-10.md",
));
const READINESS_PATH  = flagVal("readiness", "state/shared/REVENUE-READINESS.json");
const SPEC_STEM       = path.basename(SPEC_PATH).replace(/\.md$/, "");
const OUT_HTML        = flagVal("out", `state/shared/specs/${SPEC_STEM}.html`);

const spec = fs.readFileSync(path.join(ROOT, SPEC_PATH), "utf8");

let readiness = null;
try {
  readiness = JSON.parse(fs.readFileSync(path.join(ROOT, READINESS_PATH), "utf8"));
} catch { /* readiness optional */ }

// === Extract combinatorics table rows from v7.B ===
// Robust to v7.2 layout (v7.B is name-dropped in the §R5 resolution prose before
// the actual table). Strategy: scan for ALL numbered-5-col table rows, then keep
// the longest contiguous run that starts at n===1 (the real combinatorics table).
const COMBO_ROW_RE = /^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm;
const MAX_COMBO_ROWS = 200;
function extractV7BRows() {
  const all = [];
  let m;
  COMBO_ROW_RE.lastIndex = 0;
  while ((m = COMBO_ROW_RE.exec(spec)) !== null && all.length < MAX_COMBO_ROWS) {
    all.push({
      n: parseInt(m[1], 10),
      pair: m[2].trim(),
      algorithm: m[3].trim(),
      axis: m[4].trim(),
      ai_plan: m[5].trim(),
    });
  }
  // longest contiguous ascending run beginning at 1
  let best = [];
  for (let i = 0; i < all.length; i++) {
    if (all[i].n !== 1) continue;
    const run = [all[i]];
    for (let j = i + 1; j < all.length && all[j].n === run.length + 1; j++) run.push(all[j]);
    if (run.length > best.length) best = run;
  }
  return best.length ? best : all;
}
const combinatorics = extractV7BRows();

// === Extract MS units count ===
const MS_BUCKETS = {
  "MS0 — UI unstub":          (spec.match(/U-REV-[A-Z]+(?:-[0-9]+)?/g) ?? []).length,
  "MS1 — Subscriptions":      (spec.match(/U-SUB-[0-9]+/g) ?? []).length,
  "MS2 — Inventions":         (spec.match(/U-INV-[A-Z]+-[0-9]+/g) ?? []).length,
  "MS3 — Wiring":             (spec.match(/U-WIRE-[A-Z]+-[0-9]+/g) ?? []).length,
  "MS4 — Drift":              (spec.match(/U-DRIFT-[0-9]+/g) ?? []).length,
};

// === Render SVG dependency graph (5 milestones) ===
function renderDepGraph() {
  const nodes = [
    { id: "MS0", x: 80,  y: 100, label: "MS0\nUI unstub\n40 units" },
    { id: "MS1", x: 280, y: 100, label: "MS1\nSubscriptions\n18 units" },
    { id: "MS2", x: 480, y: 60,  label: "MS2\nInventions\n42 units" },
    { id: "MS3", x: 480, y: 160, label: "MS3\nWiring\n6 units (batched)" },
    { id: "MS4", x: 680, y: 100, label: "MS4\nDrift\n4 units" },
  ];
  const edges = [
    ["MS0","MS1"], ["MS0","MS2"], ["MS0","MS3"], ["MS1","MS2"], ["MS2","MS4"], ["MS3","MS4"],
  ];
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));
  let svg = `<svg viewBox="0 0 780 220" xmlns="http://www.w3.org/2000/svg" style="background:#0d1117;border-radius:8px">`;
  svg += `<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="${COLOR_NEUTRAL}"/></marker></defs>`;
  for (const [a, b] of edges) {
    svg += `<line x1="${byId[a].x+50}" y1="${byId[a].y}" x2="${byId[b].x-50}" y2="${byId[b].y}" stroke="${COLOR_NEUTRAL}" stroke-width="1.5" marker-end="url(#arr)"/>`;
  }
  for (const n of nodes) {
    svg += `<rect x="${n.x-50}" y="${n.y-25}" width="100" height="50" rx="6" fill="${COLOR_BRIDGE}" opacity="0.7" stroke="${COLOR_BRIDGE}"/>`;
    const lines = n.label.split("\n");
    lines.forEach((line, i) => {
      svg += `<text x="${n.x}" y="${n.y - 8 + i*14}" text-anchor="middle" font-family="-apple-system,Segoe UI,sans-serif" font-size="11" fill="#fff">${line}</text>`;
    });
  }
  svg += `</svg>`;
  return svg;
}

// === Render tier-invocation pie ===
function renderTierPie() {
  const tiers = readiness?.tier_invocation_balance ?? {};
  const entries = Object.entries(tiers);
  const total = entries.reduce((s, [_, v]) => s + v, 0);
  if (total === 0) return "<p>(no tier data yet)</p>";
  const colors = { T1:"#cf222e", T2:"#bf8700", T3:"#1f883d", T4:"#0969da", T5:"#8250df", T6:"#bc4c00", T7:"#6e7781" };
  let svg = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">`;
  let a0 = -Math.PI/2;
  for (const [tier, count] of entries) {
    const frac = count / total;
    const a1 = a0 + frac * 2 * Math.PI;
    const x0 = 100 + 80*Math.cos(a0), y0 = 100 + 80*Math.sin(a0);
    const x1 = 100 + 80*Math.cos(a1), y1 = 100 + 80*Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    svg += `<path d="M100,100 L${x0},${y0} A80,80 0 ${large} 1 ${x1},${y1} Z" fill="${colors[tier] ?? COLOR_NEUTRAL}" stroke="#0d1117"/>`;
    const mid = (a0 + a1) / 2;
    const tx = 100 + 95*Math.cos(mid), ty = 100 + 95*Math.sin(mid);
    svg += `<text x="${tx}" y="${ty}" font-size="10" fill="#fff" text-anchor="middle">${tier}:${count}</text>`;
    a0 = a1;
  }
  svg += `</svg>`;
  return svg;
}

// === Render combinatorics table ===
function renderComboTable() {
  if (combinatorics.length === 0) return "<p>(no combinatorics extracted)</p>";
  const rows = combinatorics.map(c => {
    // crude category by AI tier presence
    let color = COLOR_COMBOABLE;
    if (/T7/.test(c.ai_plan) && /T2|T4/.test(c.ai_plan)) color = COLOR_BUILT;
    else if (/T3/.test(c.ai_plan)) color = COLOR_BRIDGE;
    else if (/T6/.test(c.ai_plan)) color = COLOR_BLOCKED;
    return `<tr><td>${c.n}</td><td style="border-left:4px solid ${color};padding-left:8px"><b>${c.pair}</b></td><td><code>${c.algorithm}</code></td><td>${c.axis}</td><td>${c.ai_plan}</td></tr>`;
  }).join("");
  return `<table><thead><tr><th>#</th><th>Pair</th><th>Algorithm</th><th>Variability axis</th><th>AI synergy plan</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// === Generate readiness banner ===
function renderReadinessBanner() {
  if (!readiness) return "<p><i>(run <code>node scripts/revenue-readiness-score.mjs</code> first to populate readiness)</i></p>";
  const overall = (readiness.scores.overall_revenue_readiness * 100).toFixed(1);
  const next = readiness.next_unit_recommended ?? "(none)";
  return `<div class="banner">
    <div class="metric"><b>Overall readiness:</b> <span class="big">${overall}%</span></div>
    <div class="metric"><b>Next unit:</b> <code>${next}</code></div>
    <div class="metric"><b>Audit findings (revenue-relevant):</b> ${readiness.audit_context.revenue_relevant_findings} / ${readiness.audit_context.total_findings}</div>
    <div class="metric"><b>Verification health:</b> ${(readiness.verification_health*100).toFixed(0)}%</div>
  </div>`;
}

// === Assemble HTML ===
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>PRISM Revenue Roadmap — 2026-05-10 (v7)</title>
<style>
  :root { --bg: #0d1117; --fg: #c9d1d9; --muted: #8b949e; --border: #30363d; --accent: #2f81f7; }
  * { box-sizing: border-box }
  body { background: var(--bg); color: var(--fg); font-family: -apple-system, "Segoe UI", sans-serif; max-width: 1100px; margin: 24px auto; padding: 0 16px; line-height: 1.5; }
  h1, h2, h3 { color: #fff; border-bottom: 1px solid var(--border); padding-bottom: 8px; }
  h1 { font-size: 1.8rem }
  h2 { font-size: 1.3rem; margin-top: 2rem }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.85rem }
  th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border); vertical-align: top }
  th { background: #161b22; color: #fff; position: sticky; top: 0 }
  td code { color: var(--accent); font-size: 0.78rem; word-break: break-word }
  .banner { display: flex; gap: 24px; padding: 12px 16px; background: #161b22; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 24px; flex-wrap: wrap }
  .metric { font-size: 0.9rem }
  .metric .big { color: ${COLOR_BUILT}; font-size: 1.4rem; font-weight: bold }
  .legend { display: flex; gap: 16px; font-size: 0.82rem; color: var(--muted) }
  .legend span { padding-left: 12px; border-left: 4px solid }
  .legend .built { border-color: ${COLOR_BUILT} }
  .legend .comboable { border-color: ${COLOR_COMBOABLE} }
  .legend .blocked { border-color: ${COLOR_BLOCKED} }
  .legend .bridge { border-color: ${COLOR_BRIDGE} }
  .twocol { display: grid; grid-template-columns: 2fr 1fr; gap: 24px; align-items: start }
  pre { background: #161b22; padding: 12px; border-radius: 6px; overflow-x: auto }
  .footer { color: var(--muted); font-size: 0.8rem; margin-top: 48px; border-top: 1px solid var(--border); padding-top: 16px }
  button.copy { background: var(--accent); color: #fff; border: 0; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem }
</style>
</head>
<body>

<h1>PRISM Revenue Roadmap — v7</h1>
<p><i>Generated ${new Date().toISOString()} by <code>scripts/emit-revenue-roadmap-html.mjs</code> · canonical source is the <code>.md</code> alongside.</i></p>

${renderReadinessBanner()}

<h2>Milestone dependency graph</h2>
${renderDepGraph()}

<h2>Milestone unit counts</h2>
<table>
<thead><tr><th>Milestone</th><th>Units declared</th></tr></thead>
<tbody>
${Object.entries(MS_BUCKETS).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}
</tbody>
</table>

<h2>v7.B Combinatorics (${combinatorics.length} emergent algorithms)</h2>
<div class="legend">
  <span class="built">T2+T4+T7 (full AI synergy)</span>
  <span class="comboable">default (combine-now)</span>
  <span class="bridge">T3 LoRA-residual</span>
  <span class="blocked">T6 symbolic-only</span>
</div>
${renderComboTable()}

<div class="twocol">
  <div>
    <h2>Tier invocation balance</h2>
    <p style="color:var(--muted);font-size:0.85rem">Distribution of T1..T7 invocations across the v7.B combinatorics. T2/T4/T7 dominance is expected (deep-reason + neural calibration + KG).</p>
    ${renderTierPie()}
  </div>
  <div>
    <h2>v7 compliance</h2>
    <ul>
      ${Object.entries(readiness?.v7_compliance ?? {}).map(([k,v]) => `<li>${k}: ${v ? "✅" : "❌"}</li>`).join("")}
    </ul>
  </div>
</div>

<h2>Verification channel run-template</h2>
<p>Per <a href="#v7a">v7.A</a>, every unit declares its <code>verifies_via</code> channel. Run any of:</p>
<pre>rtk vitest run                              # MS0 / MS1 / MS3 engines
rtk vitest run -- &lt;name&gt;.test.ts            # specific
playwright test &lt;page&gt;.spec.ts              # MS0 frontend
node scripts/spans-config-matrix.mjs ...    # MS2 inventions
node scripts/check-engine-wired.mjs ...     # MS3 wiring
node scripts/build-milestone-progress.mjs   # MS4 drift</pre>

<div class="footer">
  <p>Regenerate this HTML: <code>node scripts/emit-revenue-roadmap-html.mjs</code></p>
  <p>Re-audit schedule: <code>/loop --interval 7d --max 4 — /forge-audit-v2 revenue-readiness</code> (per v7.G)</p>
  <p>Canonical spec: <a href="REVENUE-ROADMAP-2026-05-10.md">REVENUE-ROADMAP-2026-05-10.md</a></p>
</div>

</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, OUT_HTML), html);
process.stdout.write(`HTML companion emitted: ${OUT_HTML} (${html.length} bytes)\n`);
