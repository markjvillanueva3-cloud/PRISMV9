#!/usr/bin/env node
/**
 * emit-soul-html.mjs — walks state/shared/slot-souls/*.md and emits a soul.html
 * twin per slot + state/shared/dashboards/fleet-souls.html roll-up.
 *
 * Operator-callable wrapper around SoulHtmlRenderEngine + SoulFleetRollupEngine.
 * Closes the html-companion-discipline gap on slot souls.
 *
 * Usage:
 *   node H:/prism/scripts/emit-soul-html.mjs
 *
 * Output:
 *   - state/shared/slot-souls/<slot>.html  (per slot)
 *   - state/shared/dashboards/fleet-souls.html  (fleet rollup)
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SOULS_DIR = join(REPO_ROOT, "state/shared/slot-souls");
const DASHBOARDS_DIR = join(REPO_ROOT, "state/shared/dashboards");

// Inline parser (mirrors SoulFrontmatterReaderEngine.parse — kept simple, no build dep).
function parseFm(source, slotFromPath) {
  const re = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = source.match(re);
  if (!m) return null;
  const fields = { slot: slotFromPath, refuse_list: [], body: m[2] };
  let curList = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.length) continue;
    if (curList && /^\s{2,}-\s+/.test(line)) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      if (item) curList.push(item);
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v === "") { curList = []; fields[kv[1]] = curList; } else { fields[kv[1]] = v; curList = null; }
  }
  return fields;
}

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c] ?? c);

const CSS = `:root{--bg:#0d1117;--fg:#c9d1d9;--mute:#8b949e;--accent:#58a6ff;--warn:#f0883e;--ok:#3fb950;--bad:#f85149;--card:#161b22;--border:#30363d}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:var(--bg);color:var(--fg);padding:2rem;line-height:1.5}main{max-width:80ch;margin:0 auto}h1{color:var(--accent);border-bottom:2px solid var(--border);padding-bottom:.5rem}h2{color:var(--accent);margin-top:2rem}.meta{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1rem;margin:1rem 0;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:6px}.meta dt{color:var(--mute);font-weight:600}.meta dd{margin:0}.refuses li{color:var(--warn)}.role-badge{display:inline-block;padding:.25rem .5rem;background:var(--accent);color:#000;border-radius:3px;font-size:.85rem;font-weight:600}code{background:var(--card);padding:.1rem .3rem;border-radius:3px;font-size:.9em}.body{margin-top:1.5rem;padding:1rem;background:var(--card);border:1px solid var(--border);border-radius:6px;white-space:pre-wrap}table{border-collapse:collapse;width:100%;margin:1rem 0;background:var(--card);border:1px solid var(--border)}th,td{padding:.5rem .75rem;text-align:left;border-bottom:1px solid var(--border)}th{background:var(--bg);color:var(--accent)}.warn{color:var(--warn)}.bad{color:var(--bad)}.slot-chip{display:inline-block;padding:.1rem .4rem;margin:.1rem;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-family:monospace;font-size:.85em}`;

function renderSoul(s) {
  const title = `${s.slot} — ${s.role || "?"}`;
  const refuses = (s.refuse_list || []).length
    ? `<ul class="refuses">${s.refuse_list.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : '<p class="mute">No refuses declared</p>';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} — PRISM slot soul</title><style>${CSS}</style></head><body><main aria-labelledby="t"><h1 id="t"><span class="role-badge">${esc(s.hermes_role || "?")}</span> ${esc(title)}</h1><section aria-labelledby="m"><h2 id="m">Frontmatter</h2><dl class="meta"><dt>Slot</dt><dd><code>${esc(s.slot)}</code></dd><dt>Role</dt><dd>${esc(s.role || "?")}</dd><dt>Voice</dt><dd>${esc(s.voice || "?")}</dd><dt>Tone</dt><dd>${esc(s.tone || "?")}</dd><dt>Preferred subagent</dt><dd>${s.preferred_subagent_type ? `<code>${esc(s.preferred_subagent_type)}</code>` : "—"}</dd><dt>Domain filter</dt><dd>${s.domain_filter ? `<code>${esc(s.domain_filter)}</code>` : "—"}</dd><dt>Escalation path</dt><dd>${s.escalation_path ? esc(s.escalation_path) : "—"}</dd></dl></section><section aria-labelledby="r"><h2 id="r">Refuse list (${(s.refuse_list || []).length})</h2>${refuses}</section><section aria-labelledby="b"><h2 id="b">Body</h2><div class="body">${esc(s.body || "")}</div></section></main></body></html>`;
}

function rollup(souls) {
  const refMap = new Map(), subMap = new Map(), roleMap = new Map();
  const noFilter = [], noRefuses = [];
  for (const s of souls) {
    for (const r of s.refuse_list || []) {
      const l = refMap.get(r) || []; if (!l.includes(s.slot)) l.push(s.slot); refMap.set(r, l);
    }
    if (s.preferred_subagent_type) {
      const l = subMap.get(s.preferred_subagent_type) || []; if (!l.includes(s.slot)) l.push(s.slot); subMap.set(s.preferred_subagent_type, l);
    }
    const l = roleMap.get(s.hermes_role || "?") || []; if (!l.includes(s.slot)) l.push(s.slot); roleMap.set(s.hermes_role || "?", l);
    if (!s.domain_filter) noFilter.push(s.slot);
    if (!s.refuse_list || s.refuse_list.length === 0) noRefuses.push(s.slot);
  }
  return {
    slot_count: souls.length,
    refusal_coverage: Array.from(refMap.entries()).map(([refusal, slots]) => ({ refusal, slots: slots.sort() })).sort((a, b) => b.slots.length - a.slots.length),
    subagent_preferences: Array.from(subMap.entries()).map(([k, slots]) => ({ subagent_type: k, slots: slots.sort() })).sort((a, b) => b.slots.length - a.slots.length),
    role_distribution: Array.from(roleMap.entries()).map(([k, slots]) => ({ role: k, slots: slots.sort() })).sort((a, b) => b.slots.length - a.slots.length),
    slots_without_filter: noFilter.sort(),
    slots_without_refuses: noRefuses.sort(),
  };
}

function renderFleet(r) {
  const chip = (s) => `<span class="slot-chip">${esc(s)}</span>`;
  const rows = (arr, keyName) => arr.map((row) => `<tr><td>${esc(row[keyName])}</td><td>${row.slots.length}</td><td>${row.slots.map(chip).join("")}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>PRISM fleet souls (${r.slot_count})</title><style>${CSS}</style></head><body><main aria-labelledby="t"><h1 id="t">PRISM fleet soul rollup — ${r.slot_count} slots</h1><section aria-labelledby="role"><h2 id="role">Hermes-role distribution</h2><table><thead><tr><th>Role</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.role_distribution, "role")}</tbody></table></section><section aria-labelledby="ref"><h2 id="ref">Refuse-list coverage</h2><table><thead><tr><th>Refusal</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.refusal_coverage, "refusal")}</tbody></table></section><section aria-labelledby="sub"><h2 id="sub">Preferred subagent_types</h2><table><thead><tr><th>Subagent</th><th>#</th><th>Slots</th></tr></thead><tbody>${rows(r.subagent_preferences, "subagent_type")}</tbody></table></section><section aria-labelledby="gap"><h2 id="gap">Gaps</h2><p>Slots without domain_filter (untargeted): <span class="warn">${r.slots_without_filter.length}</span></p><p>${r.slots_without_filter.map(chip).join("")}</p><p>Slots without refuse_list: <span class="bad">${r.slots_without_refuses.length}</span></p><p>${r.slots_without_refuses.map(chip).join("")}</p></section></main></body></html>`;
}

function main() {
  if (!existsSync(SOULS_DIR)) { console.error("souls dir not found:", SOULS_DIR); process.exit(1); }
  const files = readdirSync(SOULS_DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
  const souls = [];
  let emittedTwins = 0;
  for (const f of files) {
    const slot = f.replace(/\.md$/, "");
    const src = readFileSync(join(SOULS_DIR, f), "utf8");
    const soul = parseFm(src, slot);
    if (!soul) { console.error("skip (no frontmatter):", f); continue; }
    souls.push(soul);
    const html = renderSoul(soul);
    const outPath = join(SOULS_DIR, `${slot}.html`);
    writeFileSync(outPath, html);
    emittedTwins += 1;
  }
  if (!existsSync(DASHBOARDS_DIR)) mkdirSync(DASHBOARDS_DIR, { recursive: true });
  const fleetHtml = renderFleet(rollup(souls));
  const fleetPath = join(DASHBOARDS_DIR, "fleet-souls.html");
  writeFileSync(fleetPath, fleetHtml);
  console.log(`✓ ${emittedTwins} per-slot soul.html twins emitted in ${SOULS_DIR}`);
  console.log(`✓ fleet rollup → ${fleetPath}`);
}

if (process.argv[1] && process.argv[1].endsWith("emit-soul-html.mjs")) main();
