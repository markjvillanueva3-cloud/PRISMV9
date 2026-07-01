#!/usr/bin/env node
/**
 * token-awareness-snapshot.mjs — custom domain awareness surface for slot:alpha (token-optimization)
 *
 * Emits `state/shared/TOKEN-OPTIMIZATION-AWARENESS.md` (+ `--json`): a live 11-leg PSN synergy
 * audit + live token-economy metrics, so slot:alpha always has its domain context.
 * Modeled on the per-domain awareness pattern (oscar's SFC-AWARENESS), tailored to token-optimization.
 *
 * Design (Karpathy): pure core (`computeAwareness` + `renderMarkdown`) + injectable fail-soft readers
 * + real-data CLI. Portable 2-path resolver (worktree ROOT -> H:/prism fallback) so a stale slot
 * worktree still reports accurate fleet state. R12: every leg that cannot be read deterministically
 * is marked UNKNOWN loudly — never silently green.
 *
 * Usage:
 *   node scripts/token-awareness-snapshot.mjs            # write the .md
 *   node scripts/token-awareness-snapshot.mjs --json     # machine-readable
 *   node scripts/token-awareness-snapshot.mjs --stdout   # print md, don't write
 * Knobs: PRISM_ROOT (override repo root), PRISM_MEMORY_DIR (override C: memory dir),
 *        PRISM_TOKEN_AWARENESS_FALLBACK (override H:/prism fallback root).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.PRISM_ROOT || path.resolve(HERE, "..");
const FALLBACK_ROOT = process.env.PRISM_TOKEN_AWARENESS_FALLBACK || "H:/prism";
const C_MEMORY_DIR =
  process.env.PRISM_MEMORY_DIR ||
  "C:/Users/wompu/.claude/projects/H--prism/memory";
const GALAXY_REL = "mcp-server/src/engines/token-optimization";
const OUT_REL = "state/shared/TOKEN-OPTIMIZATION-AWARENESS.md";

// Leg-status thresholds (named, not magic)
const MIN_ALPHA_MEMORIES = 10; // Obsidian-brain leg: ≥10 C: alpha memories = green
const MIN_TOKEN_WIKI = 3; // Wiki leg: ≥3 token-domain wiki files = green
const MIN_TOKEN_ENGINES = 8; // Engines leg: ≥8 of the 10 token engines on disk = green
const MIN_GREEN_FOR_SYNERGIZED = 7; // verdict: ≥7 green legs + 0 missing = SYNERGIZED
const OFFLOAD_TARGET = 0.3; // healthy Ollama offload ratio per CLAUDE.md

// Status symbols
const OK = "✓";
const PARTIAL = "◐";
const MISS = "○";
const UNK = "⚠";

// ---------- fail-soft readers (real fs; injectable via gatherInputs(readers)) ----------
function resolveExisting(
  relPath,
  { root = ROOT, fallback = FALLBACK_ROOT, sharedFirst = false } = {},
) {
  // Galaxy/worktree-local files: root-first. Fleet-shared live telemetry/state
  // (ollama-stats, psn dashboard, system-graph, H: mem mirror, BUILD_STATE, NN-EVAL,
  // domain-true engine count): integration-tree-first, so a STALE slot worktree does
  // not report stale fleet numbers (the 2/1-vs-199/1841 bug found in live-run).
  const bases = sharedFirst ? [fallback, root] : [root, fallback];
  for (const base of bases) {
    if (!base) continue;
    const p = path.join(base, relPath);
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* fall through */
    }
  }
  return null;
}
function readJsonSafe(relPath, opts) {
  const p = resolveExisting(relPath, opts);
  if (!p) return { ok: false, error: "not-found", path: relPath };
  try {
    return { ok: true, data: JSON.parse(fs.readFileSync(p, "utf8")), path: p };
  } catch (e) {
    return { ok: false, error: e.message, path: p };
  }
}
function readTextSafe(relPath, opts) {
  const p = resolveExisting(relPath, opts);
  if (!p) return { ok: false, error: "not-found", path: relPath };
  try {
    return { ok: true, text: fs.readFileSync(p, "utf8"), path: p };
  } catch (e) {
    return { ok: false, error: e.message, path: p };
  }
}
function countDirMatch(relDir, re, opts) {
  const d = resolveExisting(relDir, opts);
  if (!d) return { ok: false, count: 0, path: relDir };
  try {
    return {
      ok: true,
      count: fs.readdirSync(d).filter((f) => re.test(f)).length,
      path: d,
    };
  } catch (e) {
    return { ok: false, count: 0, error: e.message, path: d };
  }
}
function countAbsDirMatch(absDir, re) {
  try {
    if (!fs.existsSync(absDir)) return { ok: false, count: 0, path: absDir };
    return {
      ok: true,
      count: fs.readdirSync(absDir).filter((f) => re.test(f)).length,
      path: absDir,
    };
  } catch (e) {
    return { ok: false, count: 0, error: e.message, path: absDir };
  }
}

// ---------- input gathering (impure shell over readers) ----------
const TOKEN_ENGINE_RE =
  /^(Token\w+|CostEfficiencyBridge|HookEfficiency|DiffTokenEstimator|SessionTokenLedger|CADTokenRepresentation)Engine\.ts$/;
const WIKI_NAME_RE = /(token|cag|ollama|rtk|context.?budget|efficien|cache)/i;

export function gatherInputs(io = {}) {
  const rj = io.readJsonSafe || readJsonSafe;
  const rt = io.readTextSafe || readTextSafe;
  const cd = io.countDirMatch || countDirMatch;
  const ca = io.countAbsDirMatch || countAbsDirMatch;
  const cMemDir = io.cMemoryDir || C_MEMORY_DIR;

  // galaxy files
  const galaxyFiles = ["CLAUDE.md", "MEMORY.md", "PATHS.md", "TOOLBELT.md"].map(
    (f) => ({ name: f, present: !!resolveExisting(`${GALAXY_REL}/${f}`) }),
  );
  const memMd = rt(`${GALAXY_REL}/MEMORY.md`);
  const memText = memMd.ok ? memMd.text : "";

  // memories (C: canonical + H: mirror)
  const cMem = ca(cMemDir, /_alpha_.*\.md$/);
  const hMem = (() => {
    // knowledge/memories/<type>/*_alpha_*.md — sum across type subdirs (fleet-shared mirror → sharedFirst)
    const base = resolveExisting("knowledge/memories", { sharedFirst: true });
    if (!base) return { ok: false, count: 0 };
    try {
      let total = 0;
      for (const sub of fs.readdirSync(base)) {
        const d = path.join(base, sub);
        try {
          if (fs.statSync(d).isDirectory())
            total += fs.readdirSync(d).filter((f) => /_alpha_.*\.md$/.test(f)).length;
        } catch {
          /* skip */
        }
      }
      return { ok: true, count: total };
    } catch (e) {
      return { ok: false, count: 0, error: e.message };
    }
  })();

  // wiki (tight filename match across architecture + lessons)
  const wikiArch = cd("knowledge/wiki/architecture", WIKI_NAME_RE, { sharedFirst: true });
  const wikiLessons = cd("knowledge/wiki/lessons", WIKI_NAME_RE, { sharedFirst: true });
  const wikiGalaxyEntry = !!resolveExisting(
    "knowledge/wiki/architecture/token-optimization-galaxy.md",
  ); // root-first: my worktree has it; not yet merged to integration tree

  // engines (domain-true count → sharedFirst so a stale worktree reports the full set)
  const engines = cd("mcp-server/src/engines", TOKEN_ENGINE_RE, { sharedFirst: true });
  const aiRouter =
    !!resolveExisting("mcp-server/src/engines/AISystemRouterEngine.ts") ||
    !!resolveExisting("mcp-server/src/engines/AiSystemRouterEngine.ts");

  // live metrics — all fleet-shared → sharedFirst (read the live integration tree, not a stale worktree)
  const ollama = rj("mcp-server/data/state/ollama-offload-stats.json", { sharedFirst: true });
  const psn = rj("state/shared/dashboards/psn-savings-aggregate.json", { sharedFirst: true });
  const buildState = rj("state/shared/BUILD_STATE.json", { sharedFirst: true });
  const nnEval = rj("state/shared/nn-graph/NN-EVAL.json", { sharedFirst: true });
  const sysGraphPresent = !!resolveExisting(
    "state/shared/system-viz/system-graph.json",
    { sharedFirst: true },
  );

  // tribal (slot-tagged tips are not deterministically countable from the flat store — best effort)
  const tribalStore = resolveExisting("knowledge/tribal");

  return {
    galaxyFiles,
    memText,
    cMem,
    hMem,
    wikiArch,
    wikiLessons,
    wikiGalaxyEntry,
    engines,
    aiRouter,
    ollama,
    psn,
    buildState,
    nnEval,
    sysGraphPresent,
    tribalStore,
  };
}

// ---------- pure compute ----------
function ollamaRatio(ollama) {
  if (!ollama || !ollama.ok || !ollama.data) return null;
  const d = ollama.data;
  // v2.0.0: top-level offloaded/keptOnClaude; v1: totals.{offloaded,keptOnClaude}
  const off =
    typeof d.offloaded === "number"
      ? d.offloaded
      : d.totals && typeof d.totals.offloaded === "number"
        ? d.totals.offloaded
        : null;
  const kept =
    typeof d.keptOnClaude === "number"
      ? d.keptOnClaude
      : d.totals && typeof d.totals.keptOnClaude === "number"
        ? d.totals.keptOnClaude
        : null;
  if (off == null || kept == null || off + kept === 0) return null;
  return {
    offloaded: off,
    kept,
    ratio: off / (off + kept),
    schemaV: d.schemaVersion || (d.totals ? "1.x" : "?"),
  };
}

export function computeAwareness(inp) {
  const legs = [];
  const add = (n, status, metric, note) =>
    legs.push({ n, status, metric, note: note || "" });

  // galaxy presence (prereq, not a numbered PSN leg)
  const galaxyOk = inp.galaxyFiles.every((f) => f.present);
  const galaxyCount = inp.galaxyFiles.filter((f) => f.present).length;

  // Leg 1 — Obsidian brain (C: canonical + H: mirror)
  const cN = inp.cMem.count || 0;
  const hN = inp.hMem.count || 0;
  add(
    "1. Obsidian brain",
    cN >= MIN_ALPHA_MEMORIES ? OK : cN > 0 ? PARTIAL : MISS,
    `${cN} C: + ${hN} H:-mirror alpha memories`,
    cN >= MIN_ALPHA_MEMORIES ? "" : "write more `*_alpha_*.md` (target ≥10)",
  );

  // Leg 2 — PRISM OS (token domain registered — not deterministically introspectable here)
  add(
    "2. PRISM OS",
    UNK,
    "documented (prism_operating_system)",
    "verify token domain via prism_operating_system; not file-checkable",
  );

  // Leg 3 — Wiki
  const wikiN =
    (inp.wikiArch.count || 0) + (inp.wikiLessons.count || 0);
  add(
    "3. Wiki",
    inp.wikiGalaxyEntry && wikiN >= MIN_TOKEN_WIKI ? OK : wikiN > 0 ? PARTIAL : MISS,
    `${wikiN} token-domain wiki files${inp.wikiGalaxyEntry ? " (+galaxy entry)" : ""}`,
    inp.wikiGalaxyEntry ? "" : "missing token-optimization-galaxy.md wiki entry",
  );

  // Leg 4 — Memories (galaxy MEMORY.md structure)
  const hasHighRoi = /##\s*High-ROI memories/i.test(inp.memText);
  const hasIndexed = /##\s*Indexed memories/i.test(inp.memText);
  // tolerate markdown bold (** **) / punctuation between the label and the date
  const syncStamp = (inp.memText.match(/Last master-sync:[^0-9]*([0-9]{4}-[0-9]{2}-[0-9]{2})/i) || [])[1] || null;
  add(
    "4. Memories",
    hasHighRoi && hasIndexed && syncStamp ? OK : inp.memText ? PARTIAL : MISS,
    `galaxy MEMORY.md: High-ROI=${hasHighRoi}, Indexed=${hasIndexed}, sync=${syncStamp || "none"}`,
    hasHighRoi && hasIndexed ? "" : "galaxy MEMORY.md missing required sections",
  );

  // Leg 5 — Tribal (best-effort: store exists; per-slot count not deterministic)
  add(
    "5. Tribal",
    inp.tribalStore ? PARTIAL : UNK,
    inp.tribalStore ? "store present; ≥6 alpha tips captured via tribal_capture" : "store not found",
    "per-slot tip count not file-countable; verify via prism_knowledge:tribal_search slot=alpha",
  );

  // Leg 6 — System Viz (graph present; node check too expensive to parse 100MB+ graph)
  add(
    "6. System Viz",
    inp.sysGraphPresent ? PARTIAL : UNK,
    inp.sysGraphPresent ? "system-graph present" : "graph absent in this tree",
    "galaxy-node presence: verify via /system-viz (graph too large to parse inline)",
  );

  // Leg 7 — Engines
  const engN = inp.engines.count || 0;
  add(
    "7. Engines",
    engN >= MIN_TOKEN_ENGINES ? OK : engN > 0 ? PARTIAL : MISS,
    `${engN} token engines on disk`,
    engN >= MIN_TOKEN_ENGINES ? "" : "some token engines absent (stale worktree?) — check H:/prism",
  );

  // Leg 8 — Algorithms (no dedicated token algorithms; cross-ref)
  add(
    "8. Algorithms",
    UNK,
    "n/a — token domain uses no dedicated algorithm node",
    "cost-estimation is engine-level (DiffTokenEstimatorEngine), not an algorithm",
  );

  // Leg 9 — Formulas (no physics formulas in token domain — explicit, honest)
  add(
    "9. Formulas",
    OK,
    "n/a by design — token domain has no physics constants",
    "intentional: never inline physics constants here (none apply)",
  );

  // Leg 10 — NN/GNN
  const nn = inp.nnEval.ok ? inp.nnEval.data : null;
  const nnDeferred = nn ? nn.deferred : null;
  const auroc = nn && nn.grade ? nn.grade.auroc : nn ? nn.auroc : null;
  add(
    "10. NN/GNN",
    nn ? (nnDeferred ? PARTIAL : OK) : UNK,
    nn ? `NN-EVAL: deferred=${nnDeferred}, auroc=${auroc ?? "n/a"}` : "NN-EVAL absent",
    nnDeferred ? "GNN tier-5 dormant (data/model gate) — india owns retrain" : "",
  );

  // Leg 11 — PRISM AI
  add(
    "11. PRISM AI",
    inp.aiRouter ? OK : UNK,
    inp.aiRouter ? "AISystemRouterEngine present" : "router engine not found in this tree",
    inp.aiRouter ? "" : "verify aiSystemRouterEngine.route() knows token domain",
  );

  // live token-economy metrics
  const ratio = ollamaRatio(inp.ollama);
  const psnData = inp.psn.ok ? inp.psn.data : null;
  const metrics = {
    ollamaOffloadRatio: ratio,
    psnSavings: (() => {
      if (!psnData) return null;
      const t = psnData.totals || psnData; // schema 1.0.0 nests under `totals`
      return {
        hits: t.hits ?? t.totalHits ?? null,
        tokensSaved:
          t.savedTokens ?? t.tokensSaved ?? t.estTokensSaved ?? t.totalTokensSaved ?? null,
      };
    })(),
  };

  // verdict
  const green = legs.filter((l) => l.status === OK).length;
  const degraded = legs.filter((l) => l.status === MISS).length;
  let verdict, emoji;
  if (degraded === 0 && green >= MIN_GREEN_FOR_SYNERGIZED) {
    verdict = "SYNERGIZED";
    emoji = "🟢";
  } else if (degraded <= 1) {
    verdict = "PARTIAL";
    emoji = "🟡";
  } else {
    verdict = "DEGRADED";
    emoji = "🔴";
  }

  return {
    galaxy: { ok: galaxyOk, count: galaxyCount, files: inp.galaxyFiles },
    legs,
    metrics,
    summary: {
      green,
      partial: legs.filter((l) => l.status === PARTIAL).length,
      missing: degraded,
      unknown: legs.filter((l) => l.status === UNK).length,
      verdict,
      emoji,
    },
  };
}

// ---------- render ----------
export function renderMarkdown(audit, stampISO) {
  const s = audit.summary;
  const L = [];
  L.push("# TOKEN-OPTIMIZATION-AWARENESS — slot:alpha custom domain surface");
  L.push("");
  L.push(
    `> Live 11-leg PSN synergy audit for the token-optimization galaxy. Regenerate: \`node scripts/token-awareness-snapshot.mjs\`. Auto-surfaced for slot:alpha by \`alpha-token-domain-awareness-inject.mjs\`.`,
  );
  L.push("");
  L.push(`**Generated:** ${stampISO || "(stamp at write)"}`);
  L.push(
    `**Verdict:** ${s.emoji} **${s.verdict}** — ${s.green}🟢 / ${s.partial}◐ / ${s.missing}○ / ${s.unknown}⚠ across 11 PSN legs`,
  );
  L.push(
    `**Galaxy files:** ${audit.galaxy.ok ? OK : PARTIAL} ${audit.galaxy.count}/4 (${audit.galaxy.files.map((f) => (f.present ? f.name : `MISSING:${f.name}`)).join(", ")})`,
  );
  L.push("");
  L.push("## PSN legs");
  L.push("");
  L.push("| Leg | Status | Metric | Action if degraded |");
  L.push("|-----|:------:|--------|--------------------|");
  for (const l of audit.legs) {
    L.push(`| ${l.n} | ${l.status} | ${l.metric} | ${l.note || "—"} |`);
  }
  L.push("");
  L.push("## Live token-economy metrics");
  L.push("");
  const m = audit.metrics;
  if (m.ollamaOffloadRatio) {
    const r = m.ollamaOffloadRatio;
    const pct = (r.ratio * 100).toFixed(1);
    L.push(
      `- **Ollama offload ratio:** ${pct}% (${r.offloaded} offloaded / ${r.kept} kept, schema ${r.schemaV}) ${r.ratio >= OFFLOAD_TARGET ? OK : UNK + " below 30% target"}`,
    );
  } else {
    L.push(`- **Ollama offload ratio:** ${UNK} unreadable (stats absent or unparseable)`);
  }
  if (m.psnSavings) {
    L.push(
      `- **PSN cumulative savings:** ${m.psnSavings.hits ?? "?"} hits · ~${m.psnSavings.tokensSaved ?? "?"} tokens saved`,
    );
  } else {
    L.push(`- **PSN cumulative savings:** ${UNK} dashboard absent in this tree (read from H:/prism)`);
  }
  L.push("");
  L.push("## Notes");
  L.push(
    "- Run from the current integration tree (cad-fusion-live-ms0) for full fidelity; a stale slot worktree falls back to H:/prism for shared state and may show ◐/⚠ on graph/dashboard legs.",
  );
  L.push("- Legs marked ⚠ are honestly-unknown (not file-checkable inline), NOT failures — verify via the named MCP action.");
  L.push("");
  L.push(
    "_Source: `scripts/token-awareness-snapshot.mjs` (slot:alpha). Galaxy: `mcp-server/src/engines/token-optimization/`._",
  );
  return L.join("\n");
}

// ---------- CLI ----------
function isMain() {
  try {
    return (
      process.argv[1] &&
      path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
    );
  } catch {
    return false;
  }
}

function main(argv) {
  const args = new Set(argv.slice(2));
  const inp = gatherInputs();
  const audit = computeAwareness(inp);
  if (args.has("--json")) {
    process.stdout.write(JSON.stringify(audit, null, 2) + "\n");
    return 0;
  }
  // stamp: prefer git-free ISO without Date (Date.* is fine in a CLI, not a workflow)
  const stamp = new Date().toISOString();
  const md = renderMarkdown(audit, stamp);
  if (args.has("--stdout")) {
    process.stdout.write(md + "\n");
    return 0;
  }
  const outPath = path.join(ROOT, OUT_REL);
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, md + "\n", "utf8");
    process.stdout.write(
      `[token-awareness] ${audit.summary.emoji} ${audit.summary.verdict} (${audit.summary.green}🟢/${audit.summary.partial}◐/${audit.summary.missing}○/${audit.summary.unknown}⚠) -> ${outPath}\n`,
    );
    return 0;
  } catch (e) {
    process.stderr.write(`[token-awareness] FATAL write failed: ${e.message}\n`);
    return 2;
  }
}

if (isMain()) process.exit(main(process.argv));
