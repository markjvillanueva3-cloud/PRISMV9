#!/usr/bin/env node
/**
 * COMBO-EFFICIENCY-MS0 / P2-U01 — Combo-efficiency dashboard renderer.
 *
 * Reads:
 *   state/shared/dashboards/combo-efficiency-baseline.json   (P0-U02 output)
 *   state/shared/UNWIRED-BRIDGES-TOP10.json                  (P1-U03 output, optional)
 *
 * Emits:
 *   state/shared/dashboards/combo-efficiency.json   (machine-readable rollup)
 *   state/shared/dashboards/combo-efficiency.md     (operator-readable)
 *   state/shared/dashboards/combo-efficiency.html   (browser-renderable)
 *
 * The dashboard CLOSES THE LOOP of the COMBO-EFFICIENCY-MS0 milestone —
 * it makes the efficiency-improvement-over-time visible so future iters
 * self-tune against the baseline. Per CLAUDE.md doc-reflection rule.
 *
 * Pure exports (testable without filesystem):
 *   buildDashboardModel({baseline, bridges, generatedAt})
 *   renderMarkdown(model)
 *   renderHtml(model)
 *
 * I/O wrapper:
 *   renderDashboard({prismRoot, baselinePath, bridgesPath, outDir, write})
 *
 * CLI:
 *   node scripts/render-combo-efficiency-dashboard.mjs            # default paths, write all 3
 *   node scripts/render-combo-efficiency-dashboard.mjs --dry      # stdout (markdown), no write
 *   node scripts/render-combo-efficiency-dashboard.mjs --root <dir>
 *
 * Knob:
 *   PRISM_COMBO_EFFICIENCY_DASHBOARD_DISABLE=1   no-op CLI
 */

import fs from "node:fs";
import path from "node:path";

export const SCHEMA_VERSION = "1.0.0";

const ZONE_EMOJI = { GREEN: "🟢", YELLOW: "🟡", RED: "🔴", UNKNOWN: "⚪", OBSERVED: "📊" };
const STATUS_EMOJI = ZONE_EMOJI;  // same set

// ─── Pure: build dashboard model ───────────────────────────────────────────

/**
 * Compose the dashboard model from the two source artifacts.
 * Either source missing → that section is "not-yet-generated" in the output;
 * the rest of the dashboard still renders.
 */
export function buildDashboardModel({ baseline, bridges, generatedAt } = {}) {
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: generatedAt ?? new Date().toISOString(),
    title: "COMBO-EFFICIENCY-MS0 Dashboard",
    baseline: baseline ?? null,
    bridges: bridges ?? null,
    milestone: {
      id: "COMBO-EFFICIENCY-MS0",
      brief: "Substrate-Combo Efficiency — Obsidian + System-Viz + Master-Index + Ollama",
      units: [
        { id: "P0-U01", title: "Revive Ollama (free VRAM)",                    status: "complete" },
        { id: "P0-U02", title: "Combo-efficiency telemetry baseline collector", status: "complete" },
        { id: "P1-U01", title: "Take-rate fix on master-index suggestions",     status: "complete" },
        { id: "P1-U02", title: "Wiki↔Memory link densifier (suggester ships; Ollama stage-2 + auto-apply follow-ups)", status: "complete" },
        { id: "P1-U03", title: "Unwired-engine bridge surfacer",                status: "complete" },
        { id: "P2-U01", title: "Combo efficiency dashboard (this file)",        status: "complete" },
      ],
    },
    summary: summarize(baseline, bridges),
  };
}

function summarize(baseline, bridges) {
  const out = { zone: "UNKNOWN", overallScore: null, redSubstrateCount: 0, topBridges: 0, blockerCount: 0, recommendations: [] };
  if (baseline) {
    out.zone = baseline.overall?.zone ?? "UNKNOWN";
    out.overallScore = baseline.overall?.score ?? null;
    out.redSubstrateCount = countSubstrateStatus(baseline.substrates, "RED");
    out.blockerCount = (baseline.blockers || []).length;
    out.recommendations = baseline.recommendations || [];
  }
  if (bridges) {
    out.topBridges = (bridges.rankings || []).length;
  }
  return out;
}

function countSubstrateStatus(substrates, statusKey) {
  if (!substrates || typeof substrates !== "object") return 0;
  let n = 0;
  for (const s of Object.values(substrates)) {
    if (s && s.status === statusKey) n += 1;
  }
  return n;
}

// ─── Pure: render markdown ─────────────────────────────────────────────────

export function renderMarkdown(model) {
  if (!model) return "";
  const lines = [];
  lines.push(`# ${model.title}`);
  lines.push("");
  lines.push(`_Generated: ${model.generatedAt} · schemaVersion ${model.schemaVersion}_`);
  lines.push("");
  lines.push(`## Headline`);
  lines.push("");
  const zoneEmoji = ZONE_EMOJI[model.summary.zone] ?? "⚪";
  const scoreStr = typeof model.summary.overallScore === "number"
    ? model.summary.overallScore.toFixed(2) : "n/a";
  lines.push(`- **Overall zone:** ${zoneEmoji} **${model.summary.zone}** (score ${scoreStr})`);
  lines.push(`- **RED substrates:** ${model.summary.redSubstrateCount}`);
  lines.push(`- **Top bridge candidates:** ${model.summary.topBridges}`);
  lines.push(`- **Blockers:** ${model.summary.blockerCount}`);
  lines.push("");

  lines.push(`## Milestone unit status`);
  lines.push("");
  lines.push(`| Unit | Title | Status |`);
  lines.push(`|------|-------|--------|`);
  for (const u of model.milestone.units) {
    const mark = u.status === "complete" ? "✅" : u.status === "deferred" ? "⏸️" : "⬜";
    const note = u.reason ? ` <br/>_${u.reason}_` : "";
    lines.push(`| \`${u.id}\` | ${u.title} | ${mark} ${u.status}${note} |`);
  }
  lines.push("");

  if (model.baseline?.substrates) {
    lines.push(`## Substrate health (from combo-efficiency-baseline)`);
    lines.push("");
    lines.push(`| Substrate | Status | Reason |`);
    lines.push(`|-----------|--------|--------|`);
    for (const [name, s] of Object.entries(model.baseline.substrates)) {
      const emoji = STATUS_EMOJI[s.status] ?? "⚪";
      lines.push(`| ${name} | ${emoji} ${s.status} | ${s.reason ?? ""} |`);
    }
    lines.push("");
    if (model.baseline.comboUmbrella) {
      const u = model.baseline.comboUmbrella;
      lines.push(`- **Combo umbrella:** ${u.reason ?? "n/a"}`);
      lines.push("");
    }
  } else {
    lines.push(`## Substrate health`);
    lines.push("");
    lines.push(`_Baseline not yet generated. Run \`node scripts/combo-efficiency-baseline.mjs --root H:/prism\` first._`);
    lines.push("");
  }

  if (model.bridges?.rankings && model.bridges.rankings.length > 0) {
    lines.push(`## Top unwired bridges (highest-fan-in)`);
    lines.push("");
    lines.push(`Total unwired: ${model.bridges.unwiredCount ?? "n/a"}. Tier counts: ${JSON.stringify(model.bridges.tierCounts ?? {})}`);
    lines.push("");
    lines.push(`| Rank | Engine | Fan-In | Tier |`);
    lines.push(`|------|--------|--------|------|`);
    model.bridges.rankings.forEach((r, i) => {
      lines.push(`| ${i + 1} | \`${r.name}\` | ${r.fanIn} | ${r.tier} |`);
    });
    lines.push("");
  } else {
    lines.push(`## Top unwired bridges`);
    lines.push("");
    lines.push(`_Bridge ranking not yet generated. Run \`node scripts/unwired-bridge-rank.mjs --root H:/prism\` first._`);
    lines.push("");
  }

  if (model.summary.recommendations && model.summary.recommendations.length > 0) {
    lines.push(`## Recommendations`);
    lines.push("");
    for (const rec of model.summary.recommendations) {
      lines.push(`- ${rec}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Pure: render HTML ─────────────────────────────────────────────────────

export function renderHtml(model) {
  if (!model) return "";
  const md = renderMarkdown(model);
  // Minimal markdown→HTML — only the constructs the markdown renderer emits.
  // Avoids pulling in marked/markdown-it for a 1-deliverable dashboard.
  const body = mdToHtml(md);
  const scoreStr = typeof model.summary.overallScore === "number"
    ? model.summary.overallScore.toFixed(2) : "n/a";
  const zoneEmoji = ZONE_EMOJI[model.summary.zone] ?? "⚪";
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(model.title)}</title>
<meta name="generator" content="render-combo-efficiency-dashboard.mjs schemaVersion ${SCHEMA_VERSION}">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1100px; margin: 2em auto; padding: 0 1em; line-height: 1.5; color: #ddd; background: #1a1a1a; }
  h1, h2, h3 { color: #fff; }
  table { border-collapse: collapse; margin: 1em 0; width: 100%; }
  th, td { border: 1px solid #444; padding: 0.4em 0.7em; text-align: left; }
  th { background: #2a2a2a; }
  tr:nth-child(even) { background: #222; }
  code { background: #2a2a2a; padding: 0.1em 0.3em; border-radius: 3px; color: #ffd166; }
  ul { padding-left: 1.4em; }
  .zone-badge { display: inline-block; padding: 0.3em 0.8em; border-radius: 6px; font-weight: bold; }
  .zone-RED { background: #5a1c1c; color: #ffb3b3; }
  .zone-YELLOW { background: #5a4a1c; color: #ffe082; }
  .zone-GREEN { background: #1c5a2c; color: #b3ffd0; }
  .zone-UNKNOWN { background: #444; color: #ccc; }
  .footer { margin-top: 3em; padding-top: 1em; border-top: 1px solid #333; color: #888; font-size: 0.85em; }
</style>
</head>
<body>
<div class="zone-badge zone-${escapeHtml(model.summary.zone)}">${zoneEmoji} ${escapeHtml(model.summary.zone)} · score ${escapeHtml(scoreStr)}</div>
${body}
<div class="footer">
  <p>Generated by <code>scripts/render-combo-efficiency-dashboard.mjs</code> (P2-U01 of COMBO-EFFICIENCY-MS0).</p>
  <p>Sources: <code>state/shared/dashboards/combo-efficiency-baseline.json</code> + <code>state/shared/UNWIRED-BRIDGES-TOP10.json</code>.</p>
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Minimal markdown → HTML for the subset our renderer emits:
 *   # heading, ## heading
 *   bullet lists (- item)
 *   tables (GFM pipe form)
 *   inline `code` + **bold** + _italic_
 *   bare links (line starts with `_Generated`)
 * Anything else falls through as escaped <p>.
 */
function mdToHtml(md) {
  const lines = md.split(/\r?\n/);
  const html = [];
  let inList = false;
  let inTable = false;
  let tableHeaderEmitted = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      flushList(); flushTable();
      html.push(`<h1>${inlineMd(line.slice(2))}</h1>`);
    } else if (line.startsWith("## ")) {
      flushList(); flushTable();
      html.push(`<h2>${inlineMd(line.slice(3))}</h2>`);
    } else if (line.startsWith("### ")) {
      flushList(); flushTable();
      html.push(`<h3>${inlineMd(line.slice(4))}</h3>`);
    } else if (line.startsWith("- ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inlineMd(line.slice(2))}</li>`);
    } else if (line.trim().startsWith("|")) {
      const cells = line.trim().slice(1, -1).split("|").map((c) => c.trim());
      // Detect separator row (---, :---, etc.) and skip it; treat as transition to body.
      const isSep = cells.every((c) => /^-+:?$|^:?-+:?$/.test(c.replace(/\s/g, "")));
      if (isSep) continue;
      if (!inTable) {
        html.push("<table>");
        inTable = true;
        tableHeaderEmitted = false;
      }
      const tag = tableHeaderEmitted ? "td" : "th";
      const row = cells.map((c) => `<${tag}>${inlineMd(c)}</${tag}>`).join("");
      html.push(`<tr>${row}</tr>`);
      tableHeaderEmitted = true;
    } else if (line.trim() === "") {
      flushList(); flushTable();
    } else {
      flushList(); flushTable();
      html.push(`<p>${inlineMd(line)}</p>`);
    }
  }
  flushList(); flushTable();
  return html.join("\n");

  function flushList() {
    if (inList) { html.push("</ul>"); inList = false; }
  }
  function flushTable() {
    if (inTable) { html.push("</table>"); inTable = false; tableHeaderEmitted = false; }
  }
}

function inlineMd(s) {
  // Order matters: escape first, then apply inline transforms.
  let out = escapeHtml(s);
  // Inline code `...` — must run before bold/italic to protect contents.
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // Bold **...**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic _..._ (single underscore, simple form)
  out = out.replace(/(^|\s)_([^_\n]+)_(?=\s|$|[.,])/g, "$1<em>$2</em>");
  // Line-break helper for table cell <br/>
  out = out.replace(/&lt;br\/&gt;/g, "<br/>");
  return out;
}

// ─── I/O wrapper ───────────────────────────────────────────────────────────

const DEFAULT_BASELINE = "state/shared/dashboards/combo-efficiency-baseline.json";
const DEFAULT_BRIDGES  = "state/shared/UNWIRED-BRIDGES-TOP10.json";
const DEFAULT_OUT_DIR  = "state/shared/dashboards";

function safeReadJson(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

export function renderDashboard({
  prismRoot = ".",
  baselinePath = null,
  bridgesPath = null,
  outDir = null,
  write = true,
} = {}) {
  const resolve = (rel) => path.join(prismRoot, rel);
  const baseline = safeReadJson(baselinePath ?? resolve(DEFAULT_BASELINE));
  const bridges  = safeReadJson(bridgesPath  ?? resolve(DEFAULT_BRIDGES));
  const model = buildDashboardModel({ baseline, bridges });
  const md = renderMarkdown(model);
  const html = renderHtml(model);
  if (write) {
    const out = outDir ?? resolve(DEFAULT_OUT_DIR);
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, "combo-efficiency.json"), JSON.stringify(model, null, 2));
    fs.writeFileSync(path.join(out, "combo-efficiency.md"), md);
    fs.writeFileSync(path.join(out, "combo-efficiency.html"), html);
    return { model, written: { json: path.join(out, "combo-efficiency.json"), md: path.join(out, "combo-efficiency.md"), html: path.join(out, "combo-efficiency.html") } };
  }
  return { model, written: null, markdown: md, html };
}

// ─── CLI ───────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dry: false, root: ".", out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry") args.dry = true;
    else if (a === "--root") args.root = argv[++i] ?? ".";
    else if (a === "--out") args.out = argv[++i] ?? null;
  }
  return args;
}

function cliMain(argv) {
  if (process.env.PRISM_COMBO_EFFICIENCY_DASHBOARD_DISABLE === "1") {
    console.log(JSON.stringify({ ok: true, skipped: "disabled-via-env" }));
    return 0;
  }
  const { dry, root, out } = parseArgs(argv);
  const result = renderDashboard({ prismRoot: root, outDir: out, write: !dry });
  if (dry) {
    console.log(result.markdown);
  } else {
    console.log(JSON.stringify({
      ok: true,
      written: result.written,
      zone: result.model.summary.zone,
      score: result.model.summary.overallScore,
    }));
  }
  return 0;
}

const isMain = (() => {
  try {
    const invokedAs = process.argv[1] && path.resolve(process.argv[1]);
    const selfPath = new URL(import.meta.url).pathname.replace(/^\//, "");
    return invokedAs && path.resolve(selfPath) === invokedAs;
  } catch { return false; }
})();
if (isMain) {
  process.exit(cliMain(process.argv.slice(2)));
}
