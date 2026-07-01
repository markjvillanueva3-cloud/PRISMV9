#!/usr/bin/env node
/**
 * ai-priority-rank.mjs
 *
 * AI-PRIORITY LAW (rgs6 doctrine, 2026-05-09)
 *
 * Top-priority categories for the master roadmap, in order:
 *   1. Overall system knowledge  (self-awareness, wiki, memory, indexes)
 *   2. Development tools         (engines/dispatchers/skills/hooks that
 *                                 accelerate the next milestone)
 *   3. Deep reasoning            (creative reasoning, cross-disciplinary
 *                                 synthesis, sublinear/predictive solvers)
 *   4. Deep learning / ML        (model training, neural nets, conformal
 *                                 prediction, RL, fine-tune)
 *   5. AI systems                (Claude/Codex/Gemini/Ollama orchestration,
 *                                 full-system AI coordinator, routers)
 *
 * Scores each candidate unit 0-100 on the AI-Priority axis. Roadmap
 * generator uses (aiPriorityScore DESC, tier ASC, leverage_score DESC) for
 * the final order, so AI/ML/system-knowledge work floats while still
 * respecting Atomic-First Build Law.
 *
 * Usage:
 *   node ai-priority-rank.mjs                       # rank all units
 *   node ai-priority-rank.mjs --milestone <id>      # rank one milestone
 *   node ai-priority-rank.mjs --unit <unit-id>      # rank one unit
 *   node ai-priority-rank.mjs --score <text>        # score arbitrary text
 *   node ai-priority-rank.mjs --json                # machine-readable
 *
 * Output (default): table sorted by aiPriorityScore desc.
 * Output (--json):  array of { id, score, category, evidence[] }.
 *
 * Persisted to: state/shared/ai-priority-ranks.json (regenerated on every
 * full run). Roadmap generators read this file via getAiPriority(unitId).
 */

import fs from "node:fs";
import path from "node:path";

const PRISM = "H:/prism";
const ENV_DIR = `${PRISM}/mcp-server/data/milestones`;
const OUT = `${PRISM}/state/shared/ai-priority-ranks.json`;

// Keyword-weighted categories. Each keyword contributes its weight; final
// score is min(100, sum). Synonyms grouped to avoid double-counting.
const CATEGORIES = [
  {
    id: "system-knowledge",
    weight: 1.0, // tier-1 priority
    keywords: [
      ["self-awareness", 18], ["self_awareness", 18],
      ["wiki", 14], ["knowledge graph", 16], ["knowledge-graph", 16],
      ["index", 8], ["digest", 6], ["memory", 12], ["tribal", 10],
      ["onboard", 6], ["awareness", 12], ["inventory", 6],
      ["catalog", 6], ["registry", 6], ["sw", 0],
    ],
  },
  {
    id: "dev-tools",
    weight: 0.9,
    keywords: [
      ["dispatcher", 14], ["wiring", 10], ["wire ", 10], ["wire-", 10],
      ["hook", 10], ["skill", 8], ["engine ", 8], ["scaffold", 8],
      ["forge", 12], ["rgs", 12], ["pipeline", 10], ["telemetry", 10],
      ["adaptive", 8], ["compounding", 12], ["audit", 8],
      ["build-state", 8], ["build state", 8], ["mcp", 8],
    ],
  },
  {
    id: "deep-reasoning",
    weight: 0.85,
    keywords: [
      ["reasoning", 14], ["creative", 8], ["synthesis", 10],
      ["sublinear", 14], ["predictive", 10], ["world model", 14],
      ["world-model", 14], ["chain-of-thought", 12],
      ["meta-cognitive", 12], ["cross-disciplinary", 12],
      ["cross-domain", 10], ["multi-step", 8], ["planner", 8],
      ["solver", 8], ["theorem", 12], ["proof", 8],
    ],
  },
  {
    id: "deep-learning-ml",
    weight: 0.8,
    keywords: [
      ["neural", 14], ["nn ", 8], ["nn-", 8], ["deep learning", 16],
      ["machine learning", 14], [" ml ", 12], ["ml-", 10], ["mlops", 10],
      ["training", 10], ["fine-tune", 12], ["finetune", 12],
      ["fine_tune", 12], ["lora", 10], ["embedding", 10],
      ["transformer", 10], ["attention", 8], ["conformal", 12],
      ["calibration", 8], ["reinforcement", 12], [" rl ", 10],
      ["bandit", 10], ["regression", 6], ["classification", 6],
      ["model train", 14], ["adaptive alpha", 14],
    ],
  },
  {
    id: "ai-systems",
    weight: 0.75,
    keywords: [
      ["claude", 8], ["codex", 8], ["gemini", 8], ["ollama", 10],
      ["llm", 12], ["agent", 8], ["multi-agent", 12], ["orchestrat", 10],
      ["coordinator", 10], ["router", 8], ["routing", 6],
      ["full-system ai", 16], ["fullsystemai", 16], ["ai-system", 14],
      ["ai system", 14], ["ai feature", 8], ["ai engine", 12],
      ["jarvis", 14], ["copilot", 10], ["assistant", 6],
      ["prompt engineering", 12], ["context engineering", 12],
    ],
  },
];

function args() {
  const a = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) {
      const k = a[i].slice(2);
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true;
      opts[k] = v;
    }
  }
  return opts;
}

function readJSON(p, fb) {
  if (!fs.existsSync(p)) return fb;
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fb; }
}

function scoreText(text) {
  const t = (text || "").toLowerCase();
  let total = 0;
  const evidence = [];
  let topCategory = null;
  let topCatScore = 0;

  for (const cat of CATEGORIES) {
    let catScore = 0;
    for (const [kw, w] of cat.keywords) {
      if (!kw) continue;
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      const matches = (t.match(re) || []).length;
      if (matches > 0) {
        const contrib = matches * w * cat.weight;
        catScore += contrib;
        evidence.push({ category: cat.id, keyword: kw, hits: matches, contrib });
      }
    }
    if (catScore > topCatScore) {
      topCatScore = catScore;
      topCategory = cat.id;
    }
    total += catScore;
  }

  // Cap at 100; final score is min(total, 100). Single-keyword "ai system"
  // milestones land around 18-30; full-stack AI roadmaps push past 80.
  const score = Math.min(100, Math.round(total));
  return { score, category: topCategory, evidence: evidence.slice(0, 8) };
}

function unitText(unit, env) {
  const parts = [
    env?.title || "",
    env?.track || "",
    env?.summary || "",
    unit?.id || "",
    unit?.title || "",
    unit?.details || "",
    (unit?.files_modified || []).join(" "),
  ];
  return parts.filter(Boolean).join(" ");
}

function rankAll() {
  if (!fs.existsSync(ENV_DIR)) return [];
  const files = fs.readdirSync(ENV_DIR).filter((f) => f.endsWith(".json"));
  const ranked = [];
  for (const f of files) {
    const env = readJSON(path.join(ENV_DIR, f), null);
    if (!env) continue;
    if (env.status === "complete" || env.status === "completed") continue;
    const milestoneScore = scoreText(unitText({}, env));
    const envUnits = Array.isArray(env.units) ? env.units : [];
    for (const u of envUnits) {
      if (u.status === "complete" || u.status === "completed") continue;
      const s = scoreText(unitText(u, env));
      // boost: if milestone-level score already high, lift unit by 25%
      const finalScore = Math.min(100, Math.round(s.score + milestoneScore.score * 0.25));
      ranked.push({
        milestone: env.id,
        unit_id: u.id,
        title: u.title || env.title,
        score: finalScore,
        category: s.category || milestoneScore.category,
        evidence: s.evidence,
      });
    }
    if (envUnits.length === 0) {
      // milestone with no units: rank as a single block
      ranked.push({
        milestone: env.id,
        unit_id: env.id,
        title: env.title,
        score: milestoneScore.score,
        category: milestoneScore.category,
        evidence: milestoneScore.evidence,
      });
    }
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

const opts = args();

if (opts.score) {
  const r = scoreText(String(opts.score));
  if (opts.json) console.log(JSON.stringify(r, null, 2));
  else console.log(`score=${r.score} category=${r.category}\nevidence: ${r.evidence.map(e => `${e.category}/${e.keyword}=${e.contrib}`).join(", ")}`);
  process.exit(0);
}

const ranked = rankAll();

let scoped = ranked;
if (opts.milestone) scoped = ranked.filter((r) => r.milestone === opts.milestone);
if (opts.unit) scoped = ranked.filter((r) => r.unit_id === opts.unit);

if (opts.json) {
  console.log(JSON.stringify(scoped, null, 2));
} else if (opts["dry-run"]) {
  console.log("AI-PRIORITY RANKS (dry run, top 30)");
  console.log("====================================");
  for (const r of scoped.slice(0, 30)) {
    console.log(`  ${String(r.score).padStart(3)} [${(r.category || "?").padEnd(18)}] ${r.milestone}/${r.unit_id} — ${(r.title || "").slice(0, 80)}`);
  }
  console.log(`\nTotal ranked: ${scoped.length}`);
} else {
  // persist + concise stdout
  fs.writeFileSync(OUT, JSON.stringify({
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    categories: CATEGORIES.map((c) => ({ id: c.id, weight: c.weight })),
    ranked,
  }, null, 2));
  console.log(`Wrote ${ranked.length} ranks → ${OUT}`);
  console.log(`Top 5: ${ranked.slice(0, 5).map(r => `${r.score}=${r.unit_id}`).join("  ")}`);
}
