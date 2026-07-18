// scripts/lib/worklist-label-proposer.mjs
// INDIA active-learning (U-OLLAMA-WORKLIST-PROPOSER 2026-06-11, slot:india).
//
// The tier-5 GraphSAGE GNN predicts a dispatcher for each unlabeled ghost in the
// active-label worklist at LOW confidence (macro-F1 0.439 = LABEL-STARVED, not
// architecture-starved). The #1 lever to lift it is growing the reference pool
// with operator labels. This module adds an INDEPENDENT local-LLM second opinion
// per ghost so the operator can confirm high-agreement ghosts in one glance and
// focus attention on disagreements -- accelerating ref-pool growth WITHOUT a GPU.
//
// It uses verifiedOffload + enumMember (scripts/lib/ollama-verified-offload.mjs)
// so the local model can ONLY ever return a VALID dispatcher id -- a garbage /
// hallucinated / off-list answer fails the pure verifier and falls back to "no
// proposal" (null). This is the keystone's FIRST real india consumer (the audit
// flagged it as built-but-never-called). ASCII-only. Pure orchestration: the
// Ollama caller (`run`) is INJECTED, so the whole module is hermetically testable.

import { verifiedOffload, enumMember } from "./ollama-verified-offload.mjs";

/**
 * The allowed dispatcher set = the worklist's already-labeled classes (the
 * targets we are growing ref-pools for). Data-driven -- never a hardcoded list,
 * so it tracks the live class distribution. Pure.
 * @param {object} wl parsed active-label-worklist.json
 * @returns {string[]}
 */
export function allowedFromWorklist(wl) {
  const dist = (wl && wl.poolStats && wl.poolStats.classDistribution) || {};
  const fromDist = Object.keys(dist).filter((k) => typeof k === "string" && k.trim());
  if (fromDist.length) return fromDist;
  // Fallback: derive from the predictedDispatcher values actually present.
  const set = new Set();
  for (const r of (wl && wl.worklist) || []) {
    if (r && typeof r.predictedDispatcher === "string" && r.predictedDispatcher.trim()) {
      set.add(r.predictedDispatcher);
    }
  }
  return [...set];
}

/**
 * Build the classify prompt for one ghost. Pure. Includes a file-head context
 * block when available (the engine's docstring/class decl states its purpose).
 * @param {string} engine engine class name
 * @param {string} card   optional context (engine file head), capped
 * @param {string[]} allowed valid dispatcher ids
 * @returns {string}
 */
export function buildClassifyPrompt(engine, card, allowed) {
  const list = (allowed || []).join(", ");
  const ctx = card && String(card).trim()
    ? `\nThe engine's source header (for context):\n"""\n${String(card).slice(0, 1400)}\n"""\n`
    : "";
  return [
    "You are classifying a PRISM manufacturing-intelligence engine to the ONE",
    "MCP dispatcher that should own it. Reply with EXACTLY one id from this list",
    "and NOTHING else (no punctuation, no explanation):",
    list,
    "",
    `Engine class name: ${engine}${ctx}`,
    "Answer with one dispatcher id:",
  ].join("\n");
}

/**
 * Propose a dispatcher for one ghost via the injected Ollama caller, verified to
 * the allow-set. Never throws (verifiedOffload falls back to null on any failure
 * -- run-throw, empty, off-list, or verify-throw).
 * @param {{engine:string, card?:string, allowed:string[],
 *          run:()=>Promise<string>, onResult?:(rec:object)=>void}} o
 * @returns {Promise<{ollamaPred:string|null, source:string, verified:boolean, reason:string}>}
 */
export async function proposeLabel({ engine, card, allowed, run, onResult } = {}) {
  if (typeof run !== "function") throw new TypeError("proposeLabel: run must be a function");
  const allow = Array.isArray(allowed) ? allowed : [];
  const res = await verifiedOffload({
    run,
    verify: enumMember(allow),
    fallback: async () => null, // no trusted non-Ollama proposer -> null (no proposal)
    label: `propose:${engine}`,
    onResult,
  });
  return {
    ollamaPred: res.source === "ollama" && res.verified ? res.value : null,
    source: res.source,
    verified: res.verified,
    reason: res.reason,
  };
}

/**
 * Merge proposals into the worklist rows and compute agreement vs the GNN. Pure.
 * @param {object[]} worklist worklist rows (each has engine + predictedDispatcher)
 * @param {Record<string,{ollamaPred:string|null}>} proposalsByEngine
 * @returns {{worklist:object[], stats:object}}
 */
export function enrichWorklist(worklist, proposalsByEngine) {
  const rows = Array.isArray(worklist) ? worklist : [];
  const byEngine = proposalsByEngine || {};
  let proposed = 0, agree = 0, conflict = 0;
  const enriched = rows.map((r) => {
    const p = byEngine[r && r.engine] || {};
    const ollamaPred = p.ollamaPred != null ? p.ollamaPred : null;
    const gnnPred = r && typeof r.predictedDispatcher === "string" ? r.predictedDispatcher : null;
    const hasProposal = ollamaPred !== null;
    const agreeFlag = hasProposal && gnnPred !== null ? ollamaPred === gnnPred : null;
    if (hasProposal) proposed++;
    if (agreeFlag === true) agree++;
    if (agreeFlag === false) conflict++;
    return { ...r, ollamaPred, agree: agreeFlag };
  });
  return {
    worklist: enriched,
    stats: {
      total: rows.length,
      proposed,
      agree,
      conflict,
      noProposal: rows.length - proposed,
      agreementRate: proposed ? Number((agree / proposed).toFixed(3)) : 0,
    },
  };
}

/**
 * Class-rebalance impact of labeling a ghost as `dispatcher`, given the current
 * ref-pool class distribution. A RARER class scores higher (labeling it most
 * helps break a majority-class COLLAPSE -- see the 2026-06-11 class-collapse
 * finding). Pure. Range [0,1]: an unseen class -> 1.0 (max lift), the majority
 * class -> 0.
 * @param {string|null} dispatcher
 * @param {Record<string,number>} classDistribution
 * @returns {number}
 */
export function balanceImpact(dispatcher, classDistribution) {
  if (!dispatcher) return 0;
  const dist = classDistribution || {};
  const counts = Object.values(dist).filter((n) => typeof n === "number" && n >= 0);
  const max = counts.length ? Math.max(...counts) : 0;
  if (max <= 0) return 1; // no distribution -> any label is maximally informative
  const count = typeof dist[dispatcher] === "number" ? dist[dispatcher] : 0;
  return Number((1 - count / max).toFixed(3));
}

/**
 * Render the operator-facing markdown: CONFLICTS first (need attention), then
 * AGREEMENTS (one-glance confirm), then no-proposal. Within CONFLICTS, ordered by
 * class-rebalance impact (rarest Ollama-proposed class first) so the operator
 * labels the highest anti-collapse-lift ghosts first. Pure.
 * @param {object[]} enriched enriched worklist rows
 * @param {object} stats enrichWorklist stats
 * @param {Record<string,number>} [classDistribution] ref-pool class counts (for rebalance ordering)
 * @returns {string}
 */
export function renderProposalMarkdown(enriched, stats, classDistribution = {}) {
  const rows = Array.isArray(enriched) ? enriched : [];
  const group = (r) => (r.agree === false ? 0 : r.agree === true ? 1 : 2);
  const bi = (r) => balanceImpact(r.ollamaPred, classDistribution);
  const sorted = [...rows].sort((a, b) => group(a) - group(b) || bi(b) - bi(a) || (a.rank || 0) - (b.rank || 0));
  const rebalance = sorted.filter((r) => r.agree === false && r.ollamaPred && bi(r) >= 0.5).map((r) => r.engine);
  const L = [
    "# Active-label worklist -- Ollama second-opinion proposals",
    "",
    `GNN (tier-5) prediction vs an INDEPENDENT local-LLM proposal per ghost.`,
    `**${stats.agree}/${stats.proposed} agree** (rate ${stats.agreementRate}) ` +
      `· ${stats.conflict} conflict · ${stats.noProposal} no-proposal · ${stats.total} total.`,
    "",
    "- **AGREE** (both models same) -> confirm fast.",
    "- **CONFLICT** (models differ) -> operator attention; the label is the tiebreak.",
    "- **balance** = anti-collapse lift of labeling this as the Ollama class (1.0 = rarest/unseen, 0 = majority). CONFLICTs are ordered by it.",
    "- Label by appending the correct dispatcher to the ref-pool seed, then re-run the retrain lifecycle.",
    "",
  ];
  if (rebalance.length) {
    L.push(`**Rebalance set (label these FIRST -- Ollama proposes an under-represented class, biggest anti-collapse lift):** ${rebalance.slice(0, 10).map((e) => `\`${e}\``).join(", ")}`);
    L.push("");
  }
  L.push("| | ghost engine | GNN pred (conf) | Ollama pred | balance | verdict |");
  L.push("|--|--|--|--|--|--|");
  for (const r of sorted) {
    const mark = r.agree === false ? "[!]" : r.agree === true ? "[=]" : "[?]";
    const verdict = r.agree === false ? "CONFLICT" : r.agree === true ? "agree" : "no-proposal";
    const conf = typeof r.confidence === "number" ? r.confidence.toFixed(3) : "?";
    const bal = r.ollamaPred ? bi(r).toFixed(2) : "--";
    L.push(`| ${mark} | \`${r.engine}\` | ${r.predictedDispatcher || "?"} (${conf}) | ${r.ollamaPred || "--"} | ${bal} | ${verdict} |`);
  }
  L.push("");
  L.push("_Producer: `scripts/propose-worklist-labels.mjs` (U-OLLAMA-WORKLIST-PROPOSER). " +
    "Proposals are anti-hallucination-gated to the labeled dispatcher set via verifiedOffload+enumMember._");
  return L.join("\n");
}
