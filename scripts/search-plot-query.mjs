#!/usr/bin/env node
// scripts/search-plot-query.mjs
// ------------------------------
// SEARCH-PREPLOT consumer (slot:alpha): resolve a codebase search from the
// precomputed per-surface search-plots (engines/scripts/hooks) instead of a
// live grep over ~5800 files. This is "route-before-grep" with the route
// answer PRECOMPUTED -- one cheap JSON read, ranked matches, zero grep.
//
// Usage:
//   node scripts/search-plot-query.mjs "<term>" [--surface engines|scripts|hooks]
//        [--domain <galaxy>] [--k N] [--json]
// Scoring: name substring (3) > exported-symbol match (2) > purpose substring (1).
// Fail-soft: a missing/corrupt plot is skipped; empty result is a clean "no hits".
import fs from "node:fs";
import path from "node:path";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
const PLOT_DIR = path.join(ROOT, "state/shared/search-plots");
const SURFACES = ["engines", "scripts", "hooks"];

export function scoreEntry(entry, q) {
  const ql = q.toLowerCase();
  let score = 0;
  const name = (entry.name || "").toLowerCase();
  if (name.includes(ql)) score += 3;
  if (Array.isArray(entry.exports) && entry.exports.some((x) => x.toLowerCase().includes(ql))) score += 2;
  if ((entry.purpose || "").toLowerCase().includes(ql)) score += 1;
  return score;
}

function loadSurface(name) {
  try {
    return JSON.parse(fs.readFileSync(path.join(PLOT_DIR, `_${name}.json`), "utf8"));
  } catch { return null; }
}

export function query(term, opts = {}) {
  const q = (term || "").trim();
  if (!q) return { ok: false, error: "empty-query", matches: [] };
  const wantSurfaces = opts.surface && SURFACES.includes(opts.surface) ? [opts.surface] : SURFACES;
  const k = Number.isFinite(opts.k) && opts.k > 0 ? opts.k : 10;
  const matches = [];
  for (const s of wantSurfaces) {
    const plot = loadSurface(s);
    if (!plot || !Array.isArray(plot.entries)) continue;
    for (const e of plot.entries) {
      if (opts.domain && s === "engines" && e.domain !== opts.domain) continue;
      const score = scoreEntry(e, q);
      if (score > 0) {
        matches.push({
          surface: s, name: e.name, file: e.file,
          domain: e.domain || null, trigger: e.trigger || null,
          purpose: e.purpose || "", score,
        });
      }
    }
  }
  matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return { ok: true, query: q, total: matches.length, matches: matches.slice(0, k) };
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
  const term = argv.filter((a, i) => !a.startsWith("--") && (i === 0 || !argv[i - 1].startsWith("--")))[0]
    || argv.find((a) => !a.startsWith("--"));
  const opts = {
    surface: flag("--surface"),
    domain: flag("--domain"),
    k: Number(flag("--k")) || undefined,
  };
  const r = query(term, opts);
  if (argv.includes("--json")) { process.stdout.write(JSON.stringify(r) + "\n"); return; }
  if (!r.ok) { process.stdout.write(`(${r.error})\n`); return; }
  process.stdout.write(`${r.total} hit(s) for "${r.query}"${opts.domain ? ` [domain=${opts.domain}]` : ""}:\n`);
  for (const m of r.matches) {
    const tag = m.domain ? `[${m.domain}]` : m.trigger ? `[${m.trigger}]` : `[${m.surface}]`;
    process.stdout.write(`  ${String(m.score)}  ${tag.padEnd(20)} ${m.file}  -- ${m.purpose.slice(0, 80)}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  main();
}
