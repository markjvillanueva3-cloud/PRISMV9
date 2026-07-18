#!/usr/bin/env node
// ai-training-awareness.mjs — slot:india custom domain-awareness generator.
// U-PSGB-INDIA-AUDIT (2026-05-28). Renders LIVE ai-training domain state so
// slot:india always has domain context: NN-GRAPH deploy-gate verdict, checkpoint
// promotion state, retrain-lifecycle status, closed-loop (outcome-bus) health.
//
// Pure renderBlock(state) + fail-soft gatherState(prism) + CLI (--json | human).
// Consumed by .claude/hooks/india-awareness-inject.mjs (slot-gated UserPromptSubmit).
// Galaxy: mcp-server/src/engines/ai-training/. Reads only — never mutates.
import fs from "node:fs";

// NN-GRAPH deploy gate (canonical — galaxy CLAUDE.md anti-patterns).
export const DEPLOY_GATE = { auroc: 0.78, macroF1: 0.55, brier: 0.15 };

function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
function countLines(p) { try { const s = fs.readFileSync(p, "utf8").trim(); return s ? s.split(/\r?\n/).length : 0; } catch { return null; } }
function lastJsonLine(p) {
  try {
    const lines = fs.readFileSync(p, "utf8").trim().split(/\r?\n/);
    return lines.length ? JSON.parse(lines[lines.length - 1]) : null;
  } catch { return null; }
}

export function gatherState(prism = process.env.PRISM_ROOT || "H:/prism") {
  const ng = `${prism}/state/shared/nn-graph`;
  return {
    evalJson: readJson(`${ng}/NN-EVAL.json`),
    retrainLast: lastJsonLine(`${ng}/retrain-lifecycle.jsonl`),
    retrainCount: countLines(`${ng}/retrain-lifecycle.jsonl`),
    candidate: fs.existsSync(`${ng}/graphsage-checkpoint.candidate.json`),
    live: fs.existsSync(`${ng}/graphsage-checkpoint.json`),
    outcomeBus: countLines(`${prism}/state/shared/outcome-bus.jsonl`),
    activeWorklist: readJson(`${ng}/active-label-worklist.json`),
    activeProposed: readJson(`${ng}/active-label-worklist-proposed.json`),
  };
}

// Pure: classify the deploy gate from an NN-EVAL.json object.
export function gateVerdict(evalJson) {
  if (!evalJson) return { verdict: "UNKNOWN", detail: "no NN-EVAL.json" };
  const m = evalJson.checkpointMeta || {};
  const auroc = typeof m.auroc === "number" ? m.auroc : null;
  const brier = typeof m.brierCalibrated === "number" ? m.brierCalibrated
    : (typeof m.brierRaw === "number" ? m.brierRaw : null);
  const a = auroc !== null ? auroc.toFixed(3) : "?";
  const b = brier !== null ? brier.toFixed(3) : "?";
  if (evalJson.deferred) {
    return { verdict: "DEFERRED", detail: `${evalJson.reason || "deferred"} (pool=${evalJson.poolSize ?? "?"}); checkpoint AUROC ${a} (gate≥${DEPLOY_GATE.auroc}), Brier ${b} (gate≤${DEPLOY_GATE.brier})` };
  }
  const f1 = typeof m.macroF1 === "number" ? m.macroF1 : (typeof m.f1 === "number" ? m.f1 : null);
  const pass = auroc !== null && auroc >= DEPLOY_GATE.auroc
    && f1 !== null && f1 >= DEPLOY_GATE.macroF1
    && brier !== null && brier <= DEPLOY_GATE.brier;
  return { verdict: pass ? "DEPLOYABLE" : "FAIL", detail: `AUROC ${a} / F1 ${f1 !== null ? f1.toFixed(3) : "?"} / Brier ${b}` };
}

// Pure: render the injectable awareness block.
export function renderBlock(state = gatherState()) {
  const g = gateVerdict(state.evalJson);
  const L = ["## 🧠 india ai-training domain awareness (live state)", ""];
  L.push(`- **NN-GRAPH deploy gate: ${g.verdict}** — ${g.detail}`);
  L.push(`- checkpoint: live=${state.live ? "present" : "absent"} · candidate=${state.candidate ? "PRESENT (promote only on gate-pass)" : "none"}`);
  if (state.retrainLast) {
    const r = state.retrainLast;
    const note = r.drift?.reason ? r.drift.reason.slice(0, 64) : (r.promoted ? "promoted" : (r.errors?.length ? "errors" : ""));
    L.push(`- retrain lifecycle: last=\`${r.action ?? "?"}\`${note ? ` (${note})` : ""} · ${state.retrainCount ?? "?"} events · autonomous 6h cadence`);
  } else {
    L.push(`- retrain lifecycle: no events yet`);
  }
  L.push(`- closed-loop: outcome-bus ${state.outcomeBus === 0 ? "0 rows (auto-tap hook not yet shipped — loop not flowing)" : `${state.outcomeBus ?? "?"} rows`}`);
  // Active-learning (#4) -- surface the ranked label worklist so the macro-F1 lever is ACTIONABLE every session.
  const wl = state.activeWorklist;
  if (wl && Array.isArray(wl.worklist) && wl.worklist.length > 0) {
    const top = wl.worklist[0];
    const n = wl.poolStats?.unlabeledTargets ?? wl.worklist.length;
    L.push(`- **active-learning (#4): ${n} unlabeled ghosts** -- label the ranked top-${wl.worklist.length} in \`state/shared/nn-graph/active-label-worklist.md\` -> seed \`scripts/vault-to-gnn-refpool.mjs\` -> next retrain lifts macro-F1. top: \`${top.engine}\`->${top.predictedDispatcher} (acq ${top.acquisition}). Regen: \`node scripts/lib/gnn-active-pool-select.mjs\``);
    // Ollama second-opinion proposer (U-OLLAMA-WORKLIST-PROPOSER): independent source-aware
    // dispatcher proposals so the operator confirms AGREEments fast + triages CONFLICTs first.
    const pr = state.activeProposed;
    if (pr && pr.stats && typeof pr.stats.proposed === "number") {
      const s = pr.stats;
      L.push(`  - Ollama second-opinions: **${s.agree}/${s.proposed} agree** (${s.conflict} conflict) -- triage CONFLICTs in \`active-label-worklist-proposed.md\` (Ollama's source-aware guess beats the GNN's collapsed default). Regen: \`node scripts/propose-worklist-labels.mjs\``);
    } else {
      L.push(`  - get Ollama second-opinions to speed labeling: \`node scripts/propose-worklist-labels.mjs\` -> \`active-label-worklist-proposed.md\` (agreements confirm fast, conflicts get operator attention).`);
    }
  }
  L.push(`- india owns 4 surfaces (others wire IN): OutcomeFeedbackBus · NN-GRAPH retrain · RAG/tribal · calibration/conformal`);
  L.push(`- refuses: promote-failing-candidate · train-without-stratify · overwrite-live-checkpoint · assert-AUROC-without-eval`);
  L.push("- domain knowledge: mcp-server/src/engines/ai-training/KNOWLEDGE.md (wiki+tribal+actions index) · rules: RULES.md (AI-T1..AI-T8) · skills /ai-train-india /galaxy-audit-india");
  L.push("");
  L.push("_Auto-injected by `india-awareness-inject.mjs` (slot:india custom domain-awareness). Galaxy: `mcp-server/src/engines/ai-training/`. Disable: `PRISM_INDIA_AWARENESS_DISABLE=1`._");
  return L.join("\n");
}

// CLI
const invokedPath = (process.argv[1] || "").replace(/\\/g, "/");
if (invokedPath.endsWith("ai-training-awareness.mjs")) {
  const state = gatherState();
  if (process.argv.includes("--json")) {
    process.stdout.write(JSON.stringify({ state, gate: gateVerdict(state.evalJson), block: renderBlock(state) }, null, 2) + "\n");
  } else {
    process.stdout.write(renderBlock(state) + "\n");
  }
}
