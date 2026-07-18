// scripts/propose-worklist-labels.mjs
// CLI (U-OLLAMA-WORKLIST-PROPOSER, slot:india 2026-06-11). Enrich the GNN
// active-label worklist with an INDEPENDENT local-LLM second-opinion dispatcher
// proposal per ghost. The tier-5 GNN's predictions are LOW-confidence (label-
// starved); a second model that AGREES lets the operator confirm fast, and a
// CONFLICT flags where the label (ground truth) is most valuable. Reads
// active-label-worklist.json, classifies each top-K ghost against the labeled
// dispatcher set (verifiedOffload+enumMember anti-hallucination -- a hallucinated
// id can NEVER become a label), writes active-label-worklist-proposed.{json,md}.
//
// Usage: node scripts/propose-worklist-labels.mjs [--topK N]
// Knobs: PRISM_PROPOSER_MODEL (default qwen2.5-coder:32b), PRISM_PROPOSER_TIMEOUT_MS.
import fs from "node:fs";
import path from "node:path";
import { callModel } from "./ask-ollama.mjs";
import {
  allowedFromWorklist, buildClassifyPrompt, proposeLabel,
  enrichWorklist, renderProposalMarkdown,
} from "./lib/worklist-label-proposer.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const NG = `${PRISM}/state/shared/nn-graph`;
const WORKLIST = `${NG}/active-label-worklist.json`;
const OUT_JSON = `${NG}/active-label-worklist-proposed.json`;
const OUT_MD = `${NG}/active-label-worklist-proposed.md`;
const ENGINES_DIR = `${PRISM}/mcp-server/src/engines`;
const MODEL = process.env.PRISM_PROPOSER_MODEL || "qwen2.5-coder:32b";
const PER_CALL_TIMEOUT_MS = Number(process.env.PRISM_PROPOSER_TIMEOUT_MS) || 30000;

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

// Walk the engines tree ONCE -> "<ClassName>" -> abs .ts path. Cheap best-effort
// context (the engine file head states its purpose). Fail-soft on any read error.
function buildEngineFileMap(dir) {
  const map = new Map();
  const walk = (d) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith(".ts")) map.set(e.name.replace(/\.ts$/, ""), full);
    }
  };
  walk(dir);
  return map;
}

function readHead(file, chars = 1500) {
  try { return fs.readFileSync(file, "utf8").slice(0, chars); } catch { return ""; }
}

async function main() {
  if (!fs.existsSync(WORKLIST)) {
    console.error(`[proposer] no worklist at ${WORKLIST} -- run scripts/lib/gnn-active-pool-select.mjs first`);
    process.exit(2);
  }
  const wl = JSON.parse(fs.readFileSync(WORKLIST, "utf8"));
  const allowed = allowedFromWorklist(wl);
  if (!allowed.length) {
    console.error("[proposer] no labeled classes in the worklist -- nothing to classify against");
    process.exit(2);
  }
  const topK = Number(arg("--topK", "")) || (wl.worklist || []).length;
  const ghosts = (wl.worklist || []).slice(0, topK);
  const fileMap = buildEngineFileMap(ENGINES_DIR);
  const withFile = ghosts.filter((g) => fileMap.has(g.engine)).length;

  console.error(`[proposer] ${ghosts.length} ghost(s) (${withFile} with source context) -> classify against ${allowed.length} dispatchers via ${MODEL} (verifiedOffload-gated)`);
  const proposalsByEngine = {};
  let done = 0;
  for (const g of ghosts) {
    const file = fileMap.get(g.engine);
    const card = file ? readHead(file) : "";
    const prompt = buildClassifyPrompt(g.engine, card, allowed);
    const run = async () => {
      const gen = await callModel(MODEL, prompt, { timeoutMs: PER_CALL_TIMEOUT_MS });
      if (!gen.ok) throw new Error(gen.error || "ollama call failed");
      return gen.text;
    };
    proposalsByEngine[g.engine] = await proposeLabel({ engine: g.engine, card, allowed, run });
    done++;
    if (done % 5 === 0 || done === ghosts.length) console.error(`[proposer]   ${done}/${ghosts.length}`);
  }

  const { worklist, stats } = enrichWorklist(ghosts, proposalsByEngine);
  const classDist = (wl.poolStats && wl.poolStats.classDistribution) || {};
  const md = renderProposalMarkdown(worklist, stats, classDist);
  const outDoc = { schemaVersion: "1.0.0", worklistGeneratedAt: wl.generatedAt, model: MODEL, allowed, stats, worklist };
  fs.writeFileSync(OUT_JSON, JSON.stringify(outDoc, null, 2));
  fs.writeFileSync(OUT_MD, md);
  console.error(`[proposer] DONE -- ${stats.agree}/${stats.proposed} agree (rate ${stats.agreementRate}), ${stats.conflict} conflict, ${stats.noProposal} no-proposal`);
  console.error(`[proposer] wrote ${OUT_JSON} + ${OUT_MD}`);
}

const INVOKED = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("propose-worklist-labels.mjs");
if (INVOKED) {
  main().catch((e) => { console.error(`[proposer] fatal: ${e && e.stack ? e.stack : e}`); process.exit(1); });
}
