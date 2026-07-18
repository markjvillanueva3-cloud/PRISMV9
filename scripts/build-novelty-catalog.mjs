#!/usr/bin/env node
/**
 * build-novelty-catalog.mjs
 *
 * Catalogs PRISM's CUSTOM/NOVEL/ENHANCED inventions:
 *   - Engines whose names or doc-comments signal novelty
 *   - Algorithms beyond textbook (non-standard)
 *   - Formula entries marked customized / modified / enhanced / extended / adapted
 *   - Toolpath strategies outside standard ISO names (prism_novel category)
 *
 * Output: H:/prism/state/shared/system-viz/novelty-catalog.json
 *
 * Constraints:
 *   - Pure Node ESM, fs/path/glob only
 *   - Caps: 100 hits per category
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const ENGINES_DIR = path.join(ROOT, "mcp-server/src/engines");
const ALGORITHMS_DIR = path.join(ROOT, "mcp-server/src/algorithms");
const FORMULA_REG = path.join(ROOT, "mcp-server/src/registries/FormulaRegistry.ts");
const TOOLPATH_REG = path.join(ROOT, "mcp-server/src/registries/ToolpathStrategyRegistry.ts");
const OUT = path.join(ROOT, "state/shared/system-viz/novelty-catalog.json");
const CAP = 100;

// ---------------------------------------------------------------------------
// Heuristic dictionaries
// ---------------------------------------------------------------------------

const NAME_NOVELTY_TOKENS = [
  "Novel", "Custom", "Enhanced", "Modified", "Adaptive",
  "Advanced", "Master", "Hardened", "AGI", "Cross", "Hybrid",
  "Augmented", "Generalized", "Fused", "Extended"
];

const COMMENT_NOVELTY_PHRASES = [
  /\bnovel\b/i,
  /custom[- ]built/i,
  /PRISM[- ]specific/i,
  /extends? [\w\s]+? with/i,
  /modified from/i,
  /originally proposed/i,
  /our (own|novel|custom)/i,
  /beyond textbook/i,
  /first[- ]of[- ]its[- ]kind/i,
  /not a standard/i
];

// Standard textbook algorithms — anything OUTSIDE this set is suspect-novel
const STANDARD_ALGOS = new Set([
  "adam","sgd","rmsprop","adagrad","momentum","nesterov","adamw",
  "pid","lqr","lqg","mpc","kalman","ekf","ukf","particlefilter","particle",
  "astar","a-star","dijkstra","bfs","dfs","bellmanford","floydwarshall",
  "rrt","rrtstar","prm",
  "kmeans","dbscan","gmm","hierarchical","spectral",
  "regression","linear","logistic","polynomial",
  "knn","svm","randomforest","decisiontree","xgboost","gradientboost",
  "fft","dft","wavelet","convolution",
  "newton","bisection","secant","gradient","quasi","bfgs","lbfgs",
  "simplex","branchbound","dynamic","greedy","backtracking",
  "monte","carlo","simulated","annealing","genetic","pso","aco",
  "huffman","lz77","lz78","rle",
  "rsa","aes","sha","md5","hmac",
  "viterbi","hmm","forwardbackward",
  "cnn","rnn","lstm","gru","transformer","attention","autoencoder",
  "qlearning","sarsa","dqn","ppo","trpo","reinforce",
  "merge","quick","heap","insertion","bubble","radix","bucket",
  "pca","tsne","umap","ica","lda"
]);

// Known novelty-suggestive substrings inside algorithm names
const ALGO_NOVELTY_TOKENS = [
  "PRISM","Prism","Custom","Novel","Hybrid","Adaptive","Enhanced",
  "Modified","Extended","Fused","Cross","Multi","Master","AGI",
  "Hardened","Bayesian","Cascaded","Recursive","Stratified"
];

// Standard ISO toolpath names (case-insensitive substrings) — anything else is candidate-novel
const STANDARD_TOOLPATHS = [
  "facing","contour","pocket","drilling","tapping","reaming","boring",
  "slotting","chamfer","engraving","helical","ramp","spiral",
  "roughing","finishing","semi","z-level","zlevel","parallel","scallop",
  "pencil","flowline","radial","morph","horizontal","vertical",
  "thread","threading","grooving","parting",
  "trochoidal","peel","plunge","constant","raster"
];

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

async function listTsFiles(dir) {
  try {
    const ents = await fs.readdir(dir, { withFileTypes: true });
    return ents.filter(e => e.isFile() && e.name.endsWith(".ts"))
               .map(e => path.join(dir, e.name));
  } catch { return []; }
}

function scoreNovelty({ nameHits, commentHits, registryFlag }) {
  let s = 0;
  s += Math.min(nameHits * 2, 6);
  s += Math.min(commentHits * 2, 6);
  if (registryFlag) s += 3;
  return Math.max(1, Math.min(10, s || 1));
}

function pushCapped(arr, entry) {
  if (arr.length < CAP) arr.push(entry);
}

// ---------------------------------------------------------------------------
// 1) Engines
// ---------------------------------------------------------------------------

async function scanEngines() {
  const out = [];
  const files = await listTsFiles(ENGINES_DIR);
  for (const f of files) {
    if (out.length >= CAP) break;
    const base = path.basename(f, ".ts");
    let text;
    try { text = await fs.readFile(f, "utf8"); } catch { continue; }

    const head = text.slice(0, 4000); // doc comments live up top
    const nameMatches = NAME_NOVELTY_TOKENS.filter(t => base.includes(t));
    const commentMatches = COMMENT_NOVELTY_PHRASES.filter(rx => rx.test(head));

    if (nameMatches.length === 0 && commentMatches.length === 0) continue;

    const evidenceParts = [];
    if (nameMatches.length) evidenceParts.push(`name-tokens=[${nameMatches.join(",")}]`);
    if (commentMatches.length) evidenceParts.push(`doc-phrases=${commentMatches.length}`);

    pushCapped(out, {
      kind: "novel-engine",
      name: base,
      file: f.replace(/\\/g, "/"),
      evidence: evidenceParts.join("; "),
      noveltyScore: scoreNovelty({
        nameHits: nameMatches.length,
        commentHits: commentMatches.length,
        registryFlag: false
      })
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2) Algorithms
// ---------------------------------------------------------------------------

function isTextbookAlgo(name) {
  const lc = name.toLowerCase();
  for (const std of STANDARD_ALGOS) {
    if (lc === std || lc.includes(std)) return true;
  }
  return false;
}

async function scanAlgorithms() {
  const out = [];
  const files = await listTsFiles(ALGORITHMS_DIR);
  for (const f of files) {
    if (out.length >= CAP) break;
    const base = path.basename(f, ".ts");
    let text;
    try { text = await fs.readFile(f, "utf8"); } catch { continue; }

    const head = text.slice(0, 4000);
    const noveltyTokens = ALGO_NOVELTY_TOKENS.filter(t => base.includes(t));
    const commentMatches = COMMENT_NOVELTY_PHRASES.filter(rx => rx.test(head));
    const nonTextbook = !isTextbookAlgo(base);

    // Need at least one novelty signal beyond mere non-textbook to keep noise down
    if (noveltyTokens.length === 0 && commentMatches.length === 0 && !nonTextbook) continue;
    // Pure non-textbook with no other markers → only score 2-4 (low confidence)
    if (noveltyTokens.length === 0 && commentMatches.length === 0) {
      // nonTextbook only → still record but lower score
    }

    const evParts = [];
    if (noveltyTokens.length) evParts.push(`name-tokens=[${noveltyTokens.join(",")}]`);
    if (commentMatches.length) evParts.push(`doc-phrases=${commentMatches.length}`);
    if (nonTextbook) evParts.push("not-in-textbook-list");

    pushCapped(out, {
      kind: "custom-algorithm",
      name: base,
      file: f.replace(/\\/g, "/"),
      evidence: evParts.join("; "),
      noveltyScore: scoreNovelty({
        nameHits: noveltyTokens.length,
        commentHits: commentMatches.length,
        registryFlag: nonTextbook
      })
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 3) FormulaRegistry — entries flagged customized or with novelty-tokens in name
// ---------------------------------------------------------------------------

async function scanFormulas() {
  const out = [];
  let text;
  try { text = await fs.readFile(FORMULA_REG, "utf8"); }
  catch { return out; }

  // Split into rough object blocks delimited by `{` / `}` containing a `name:` line.
  // A formula entry typically looks like:
  //   { formula_id: "...", name: "...", ..., customized?: true, ... }
  const entryRegex = /\{[\s\S]{0,2500}?name:\s*["'`]([^"'`]+)["'`][\s\S]{0,2500}?\}/g;
  const seen = new Set();
  let m;
  while ((m = entryRegex.exec(text)) !== null) {
    if (out.length >= CAP) break;
    const block = m[0];
    const name = m[1];
    if (seen.has(name)) continue;

    const customizedFlag = /customized\s*:\s*true/i.test(block);
    const nameNovel = /\b(modified|enhanced|extended|adapted|custom|novel|prism)\b/i.test(name);
    const blockNovel = /\b(modified|enhanced|extended|adapted|custom|novel|prism|original(ly)? proposed)\b/i.test(block);

    if (!customizedFlag && !nameNovel && !blockNovel) continue;
    seen.add(name);

    const ev = [];
    if (customizedFlag) ev.push("customized=true");
    if (nameNovel) ev.push("name-marker");
    if (blockNovel && !customizedFlag && !nameNovel) ev.push("body-marker");

    pushCapped(out, {
      kind: "enhanced-formula",
      name,
      file: FORMULA_REG.replace(/\\/g, "/"),
      evidence: ev.join("; "),
      noveltyScore: scoreNovelty({
        nameHits: nameNovel ? 1 : 0,
        commentHits: blockNovel ? 1 : 0,
        registryFlag: customizedFlag
      })
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4) ToolpathStrategyRegistry — non-standard ISO names + prism_novel category
// ---------------------------------------------------------------------------

function isStandardToolpath(name) {
  const lc = name.toLowerCase();
  return STANDARD_TOOLPATHS.some(t => lc.includes(t));
}

async function scanToolpaths() {
  const out = [];
  let text;
  try { text = await fs.readFile(TOOLPATH_REG, "utf8"); }
  catch { return out; }

  // Capture entries containing strategy_id + name fields, AND the prism_novel block
  const entryRegex = /\{[\s\S]{0,2500}?(?:strategy_id|id)\s*:\s*["'`]([^"'`]+)["'`][\s\S]{0,2500}?name\s*:\s*["'`]([^"'`]+)["'`][\s\S]{0,2500}?\}/g;
  const seen = new Set();
  let m;
  while ((m = entryRegex.exec(text)) !== null) {
    if (out.length >= CAP) break;
    const block = m[0];
    const id = m[1];
    const name = m[2];
    if (seen.has(name)) continue;

    const inPrismNovelCat = /category\s*:\s*['"`]prism_novel['"`]/i.test(block);
    const nameNovelToken = /\b(prism|novel|custom|adaptive|hybrid|enhanced|hardened|agi|cross|fused)\b/i.test(name);
    const nonStandard = !isStandardToolpath(name);

    if (!inPrismNovelCat && !nameNovelToken && !nonStandard) continue;
    // require at least 2 signals OR explicit prism_novel category to log
    const sigCount = (inPrismNovelCat?1:0) + (nameNovelToken?1:0) + (nonStandard?1:0);
    if (!inPrismNovelCat && sigCount < 2) continue;
    seen.add(name);

    const ev = [];
    if (inPrismNovelCat) ev.push("category=prism_novel");
    if (nameNovelToken) ev.push("name-marker");
    if (nonStandard) ev.push("non-standard-iso-name");

    pushCapped(out, {
      kind: "novel-toolpath",
      name,
      file: TOOLPATH_REG.replace(/\\/g, "/"),
      evidence: `id=${id}; ${ev.join("; ")}`,
      noveltyScore: scoreNovelty({
        nameHits: nameNovelToken ? 1 : 0,
        commentHits: nonStandard ? 1 : 0,
        registryFlag: inPrismNovelCat
      })
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const [engines, algos, formulas, toolpaths] = await Promise.all([
    scanEngines(),
    scanAlgorithms(),
    scanFormulas(),
    scanToolpaths()
  ]);

  const entries = [...engines, ...algos, ...formulas, ...toolpaths]
    .sort((a, b) => b.noveltyScore - a.noveltyScore);

  const totals = {
    "novel-engines": engines.length,
    "custom-algorithms": algos.length,
    "enhanced-formulas": formulas.length,
    "novel-toolpaths": toolpaths.length,
    total: entries.length,
    cappedAt: CAP
  };

  const payload = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sources: {
      engines: ENGINES_DIR.replace(/\\/g, "/"),
      algorithms: ALGORITHMS_DIR.replace(/\\/g, "/"),
      formulas: FORMULA_REG.replace(/\\/g, "/"),
      toolpaths: TOOLPATH_REG.replace(/\\/g, "/")
    },
    totals,
    entries
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(payload, null, 2), "utf8");

  const categoriesUsed = Object.entries(totals)
    .filter(([k, v]) => k !== "total" && k !== "cappedAt" && v > 0).length;

  console.log(`total: ${entries.length} novel inventions across ${categoriesUsed} categories`);
  console.log(`  novel-engines:      ${totals["novel-engines"]}`);
  console.log(`  custom-algorithms:  ${totals["custom-algorithms"]}`);
  console.log(`  enhanced-formulas:  ${totals["enhanced-formulas"]}`);
  console.log(`  novel-toolpaths:    ${totals["novel-toolpaths"]}`);
  console.log(`output: ${OUT.replace(/\\/g, "/")}`);
}

main().catch(err => { console.error(err); process.exit(1); });
