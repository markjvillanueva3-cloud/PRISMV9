#!/usr/bin/env node
// scripts/octopus-with-hermes-rag.mjs
//
// HERMES×OCTOPUS coordinator — wires U-HOC01 (input curator) + U-HOC02
// (output ledger) + U-HOC03 (route policy) into one operator-callable
// surface. Takes a prompt, decides via route policy whether to invoke
// octopus, enriches the voice context via the curator, records the
// outcome to the ledger.
//
// Usage:
//   node scripts/octopus-with-hermes-rag.mjs --prompt "your question" [--json]
//
// Today this is a STAGING surface — the actual 5-voice dispatch is not
// invoked here (octopus invocation lives in the MCP layer). The script
// proves the wiring contract end-to-end so the next session can drop a
// real dispatcher into the marked extension point.

import { recordOctopusRun, readOctopusLedger } from "./lib/octopus-record-lib.mjs";
import { buildSharedContext, collectExemplars } from "./lib/octopus-input-curator.mjs";
import { octopusRouteDecision } from "./lib/octopus-route-policy.mjs";
import { loadPsnCorpora } from "./lib/octopus-corpus-loader.mjs";
import { dispatchOctopus } from "./lib/octopus-dispatch.mjs";
import { publishConsensusOutcome } from "./lib/octopus-consumption-bridge.mjs";

// Slot → DOMAIN_CORPUS_ROOTS key. Only the 5 deep-corpus domains map; any other slot
// gets no domain leg (a clean no-op in the loader). Keeps the octopus domain-aware in
// production: running in slot `mike` (PRISM_SLOT=mike) auto-pulls the wedm corpus.
const SLOT_DOMAIN = Object.freeze({
  // Domain galaxies with curated corpus roots.
  mike: "wedm", oscar: "speed-feed", kilo: "cam", delta: "cad", echo: "post-processor",
  foxtrot: "mill", whiskey: "lathe", charlie: "quoting",
  // U-FLEET-P5-ALL-GALAXIES: every remaining slot → its galaxy (brain-dir fallback in the loader
  // resolves src/engines/<domain>/ even without a curated DOMAIN_CORPUS_ROOTS entry), so the octopus
  // is domain-aware fleet-wide. Each slot's octopus run now RAGs its own galaxy brain.
  alpha: "token-optimization", bravo: "hermes-zulu", golf: "fleet-hygiene", hotel: "business",
  india: "ai-training", juliett: "database-expansion", lima: "academy", papa: "backend-helper",
  quebec: "frontend-app", sierra: "system-viz", tango: "discovery", xray: "blueprint-vision",
  zebra: "hermes-zulu",
});

function parseArgs(argv) {
  const out = {
    prompt: "",
    json: false,
    slot: process.env.PRISM_SLOT || null,
    domain: process.env.PRISM_OCTOPUS_DOMAIN || null,
    modelBudget: Number(process.env.PRISM_OCTOPUS_MODEL_BUDGET) || undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--prompt") { out.prompt = argv[++i] || ""; continue; }
    if (a === "--json") { out.json = true; continue; }
    if (a === "--slot") { out.slot = argv[++i] || null; continue; }
    if (a === "--domain") { out.domain = argv[++i] || null; continue; }
    if (a === "--model-budget") { out.modelBudget = Number(argv[++i]) || undefined; continue; }
  }
  // Resolve the corpus domain: explicit --domain / env wins, else derive from the slot.
  out.domain = out.domain || SLOT_DOMAIN[out.slot] || undefined;
  return out;
}

// PSN-OCTOPUS-FLEET-SYNERGY-MS0 / P1: the loader supplies the real rerank
// function (lexical-rerank adapted to the curator's {candidate,score} shape).
// The route policy still passes null — it clusters historical runs by keyword,
// not by reranked substrate, so it stays on the keyword/structural path (R12
// fail-loud preserved; gating it on the loader's rerank would change its
// learned-classifier semantics, out of scope for P1).
const ROUTE_RERANK = null;

// Knob: PRISM_OCTOPUS_CORPORA_DISABLE=1 reverts to the prior wired-but-empty
// behavior (no corpus load; voices see the bare prompt). Default: load real
// corpora. Fail-soft — any loader error degrades to empty corpora, never crash.
const CORPORA_DISABLED = process.env.PRISM_OCTOPUS_CORPORA_DISABLE === "1";

// Knob: PRISM_OCTOPUS_LIVE_DISPATCH=1 fires the REAL 5-voice consensus
// (MultiModelConsensusEngine.ask via dist). Default OFF — the bare command
// stays a fast staging surface (no LLM spend). When on but no voice is
// reachable, the ledger records the transparent failure (R12), never a fake
// merge. Gemini model override via PRISM_GEMINI_MODEL (e.g. gemini-2.5-flash).
const LIVE_DISPATCH = process.env.PRISM_OCTOPUS_LIVE_DISPATCH === "1";

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.prompt) {
    process.stderr.write("error: --prompt required\n");
    process.exit(2);
  }

  // 1. HOC03 — decide whether octopus is even the right route.
  const historical = readOctopusLedger();
  const route = octopusRouteDecision({
    prompt: opts.prompt,
    historicalRuns: historical,
    rerank: ROUTE_RERANK,
  });

  // 2. HOC01 — build the shared substrate-context for voices (only when
  //    we're routing to octopus; pointless for single-claude/ollama paths).
  //    P1: load REAL PSN corpora (wiki + memories + tribal + skills +
  //    master-index) + a real rerank function. Fail-soft — any loader error
  //    degrades to empty corpora (the prior wired-but-empty behavior), so a
  //    bad leg can never abort the fan-out.
  let sharedContext = "";
  let exemplars = null;
  let corporaMeta = null;
  if (route.route === "route:octopus") {
    let psnCorpora = {};
    let rerank = null;
    if (!CORPORA_DISABLED) {
      try {
        const loaded = await loadPsnCorpora(opts.prompt, { modelBudget: opts.modelBudget, domain: opts.domain });
        psnCorpora = loaded.psnCorpora;
        rerank = loaded.rerank;
        corporaMeta = loaded.meta;
      } catch (e) {
        // R12 fail-loud — surface the degradation, then continue empty.
        process.stderr.write(`warn: corpus load failed, voices see bare prompt: ${e?.message}\n`);
        psnCorpora = {};
        rerank = null;
      }
    }
    // Pass the loader's measured rerank floor — the curator's default (0.3) was
    // tuned for a different scorer and rejects every lexical-rerank hit over
    // short fs snippets (measured 2026-05-31). When the loader is disabled,
    // minScore is undefined and the curator keeps its own default.
    const minScore = corporaMeta?.rerankFloor;
    sharedContext = buildSharedContext(opts.prompt, { rerank, psnCorpora, minScore });
    exemplars = collectExemplars({
      prompt: opts.prompt,
      rerank,
      corpora: psnCorpora,
      minScore,
    });
  }

  // 3. DISPATCH — fire the real 5-voice consensus when LIVE_DISPATCH is on AND
  //    we're routing to octopus. Otherwise keep the fast stub-voices staging
  //    behavior (no LLM spend on a bare command).
  let voices;
  let consensus;
  let dispatchInfo = { dispatched: false, reason: "staging-stub" };
  if (route.route === "route:octopus" && LIVE_DISPATCH) {
    const askOverrides = {};
    if (process.env.PRISM_GEMINI_MODEL) askOverrides.geminiModel = process.env.PRISM_GEMINI_MODEL;
    const dr = await dispatchOctopus({
      prompt: opts.prompt,
      context: sharedContext,
      askOverrides,
    });
    if (dr.dispatched) {
      voices = dr.mapped.voices;
      consensus = dr.mapped.consensus;
      dispatchInfo = { dispatched: true, ok: dr.mapped.ok, successCount: dr.mapped.successCount };
      if (!dr.mapped.ok) {
        // R12 fail-loud — a real attempt that no voice answered. The ledger
        // records the transparent blocker (consensus.verdict names it).
        process.stderr.write(`warn: live dispatch ran but no voice succeeded: ${consensus.verdict}\n`);
      }
    } else {
      // Engine unreachable — fail loud, fall back to a stub voice so the run is
      // still recorded (with the real blocker captured as the verdict).
      process.stderr.write(`warn: live dispatch unavailable (${dr.reason}); recording stub\n`);
      voices = [{ id: "anthropic", verdict: "live-dispatch-unavailable" }];
      consensus = { verdict: `dispatch-unavailable:${dr.reason}`.slice(0, 240), dissent_items: [] };
      dispatchInfo = { dispatched: false, reason: dr.reason };
    }
  } else if (route.route === "route:octopus") {
    // Staging stub — wiring proven, no LLM spend. Set PRISM_OCTOPUS_LIVE_DISPATCH=1 to go live.
    voices = [
      { id: "anthropic", verdict: "pending-real-dispatch" },
      { id: "codex",     verdict: "pending-real-dispatch" },
      { id: "ollama",    verdict: "pending-real-dispatch" },
      { id: "xai",       verdict: "pending-real-dispatch" },
      { id: "google",    verdict: "pending-real-dispatch" },
    ];
    consensus = { verdict: "stub-not-yet-merged", dissent_items: [] };
  } else {
    voices = [{ id: "anthropic", verdict: "single-claude-path" }];
    consensus = { verdict: "single-claude-path", dissent_items: [] };
  }

  // 4. HOC02 — record the run regardless of route, so the ledger captures
  //    the policy decisions Hermes will cluster on.
  const { entry } = recordOctopusRun({
    prompt: opts.prompt,
    voices,
    consensus,
    psnExemplars: exemplars,
    routerDecision: route.route,
    slot: opts.slot,
  });

  // U-FLEET-CONSUME: close the "corpus availability != consumption" gap. When a REAL
  // consensus landed for a domain galaxy, publish it as a consumable outcome on that galaxy's
  // feed so its self-improving AI (MillAGI/LatheAGI/QuotingClosedLoop, ...) can fold the fleet
  // verdict into its learning loop. Gated on a successful live dispatch (dispatched && ok) —
  // never a stub / dispatch-unavailable / single-claude verdict. Fail-soft (never aborts the run).
  let consumePublish = null;
  if (dispatchInfo.dispatched && dispatchInfo.ok && opts.domain) {
    // voices + successCount are SIBLINGS of consensus on the dispatch result (mapConsensusToLedger),
    // not inside it — pass them so the outcome carries the real voiceCount/successCount, not 0.
    consumePublish = publishConsensusOutcome(opts.domain, consensus, {
      at: new Date().toISOString(),
      voices,
      successCount: dispatchInfo.successCount,
    });
  }

  const result = {
    route,
    sharedContextLength: sharedContext.length,
    ledgerEntryId: entry.signature,
    dispatch: dispatchInfo,
    consensusVerdict: consensus.verdict,
    consumePublish,
    corporaMeta,
    note: dispatchInfo.dispatched
      ? "live 5-voice consensus dispatched (see consensus.verdict in ledger)"
      : "staging stub (set PRISM_OCTOPUS_LIVE_DISPATCH=1 for a real fan-out)",
  };

  if (opts.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(
      [
        `Route: ${route.route} (${route.reason})`,
        `Shared-context bytes: ${sharedContext.length}`,
        `Ledger signature: ${entry.signature}`,
        `Dispatched: ${dispatchInfo.dispatched}${dispatchInfo.dispatched ? ` (ok=${dispatchInfo.ok}, voices=${dispatchInfo.successCount})` : ` (${dispatchInfo.reason})`}`,
        `Consensus: ${consensus.verdict}`,
      ].join("\n") + "\n",
    );
  }
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.message}\n`);
  process.exit(1);
});
