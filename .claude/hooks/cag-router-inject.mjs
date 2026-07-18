#!/usr/bin/env node
// tier: T2
// .claude/hooks/cag-router-inject.mjs
//
// TOKEN-SAVINGS-PIVOT/U-CAG-HOOK-INJECT (sierra iter28 2026-05-26):
// UserPromptSubmit hook that classifies the operator's prompt as
// COLD / HOT / HYBRID via scripts/lib/cag-router.mjs and writes a route
// decision sidecar that downstream static-doctrine injectors
// (master-index-precheck-inject, memory-relevance-inject,
// tribal-by-domain-inject) can consult to short-circuit on
// high-confidence cold hits.
//
// CLOSES: 5c0bd535's queued follow-up `U-CAG-HOOK-INJECT` for the
// CAG-router substrate. The lib + 39 tests shipped in
// reference_cag_router_2026_05_26 (commit not in HEAD yet for this peer)
// but the producer hook was never wired.
//
// PRODUCER ONLY — this hook does NOT modify the behavior of any other
// injector. The decision sidecar is written; consuming it is
// U-CAG-INJECTORS-CONSUME (next iter). This split keeps the verifiable
// surface small per Karpathy R12 (fail-loud about what's not yet wired).
//
// KNOBS:
//   PRISM_CAG_ROUTER_INJECT_DISABLE=1   skip the hook entirely
//   PRISM_CAG_ROUTER_INJECT_VERBOSE=1   surface the full evidence list
//   PRISM_CAG_ROUTER_SIDECAR_DIR=<path> override sidecar location
//                                       (default state/shared/cag-route/)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { classifyQuery, summarize, estimateSavings } from "../../scripts/lib/cag-router.mjs";

const DEFAULT_SIDECAR_DIR = "H:/prism/state/shared/cag-route";

function readStdinSync() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseInput(raw) {
  if (!raw) return { prompt: "", sessionId: "" };
  try {
    const j = JSON.parse(raw);
    return {
      prompt: typeof j.prompt === "string" ? j.prompt : "",
      sessionId: typeof j.session_id === "string" ? j.session_id : "",
    };
  } catch {
    return { prompt: "", sessionId: "" };
  }
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
}

function fail(reason) {
  // Always exit 0 from a UserPromptSubmit advisory — never block the
  // operator's prompt on a classifier failure (R12: fail loud, but
  // never silently swallow OR block the user path).
  emit({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: `## ⚠ CAG-router: ${reason}`,
    },
  });
  process.exit(0);
}

function shortHash(s) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

function main() {
  if (process.env.PRISM_CAG_ROUTER_INJECT_DISABLE === "1") process.exit(0);

  const input = parseInput(readStdinSync());
  if (!input.prompt) process.exit(0);

  let decision;
  try {
    decision = classifyQuery(input.prompt);
  } catch (e) {
    fail(`classifyQuery threw: ${e && e.message ? e.message : "unknown"}`);
    return;
  }

  const verbose = process.env.PRISM_CAG_ROUTER_INJECT_VERBOSE === "1";
  const sidecarDir = process.env.PRISM_CAG_ROUTER_SIDECAR_DIR || DEFAULT_SIDECAR_DIR;

  // Write the decision sidecar atomically. Filename keyed by
  // session+prompt-hash so concurrent chats never clobber each other and
  // a stale sidecar from a prior prompt is never read for the current
  // one. The session-id is the harness `session_id` (UUID), prompt-hash
  // is the first 16 hex of SHA-256 over the normalized query.
  const sessionId = input.sessionId || "unknown-session";
  const promptHash = shortHash(decision.normalizedQuery);
  const sidecarFile = join(sidecarDir, `route-${sessionId}-${promptHash}.json`);
  const latestFile = join(sidecarDir, `latest-${sessionId}.json`);

  const savings = estimateSavings(decision);
  const sidecar = {
    schemaVersion: "1.0.0",
    writtenAt: new Date().toISOString(),
    sessionId,
    promptHash,
    decision: {
      tier: decision.tier,
      confidence: decision.confidence,
      evidence: decision.evidence,
      coldSources: decision.coldSources,
      hotSources: decision.hotSources,
      scores: decision.scores,
      truncated: decision.truncated || false,
    },
    estimatedSavings: savings,
    // Consumer hint: a hook reading this sidecar can short-circuit its
    // own static-doctrine inject when `skip` lists its name. Cold ≥0.4
    // confidence is the threshold from estimateSavings.
    skip: {
      masterIndexInject: decision.tier === "COLD" && decision.confidence >= 0.4,
      memoryRelevanceInject: decision.tier === "COLD" && decision.confidence >= 0.4,
      tribalByDomainInject: decision.tier === "COLD" && decision.confidence >= 0.4,
      wikiPrecheckInject: false, // always run — too cheap to skip
    },
  };

  try {
    if (!existsSync(sidecarDir)) mkdirSync(sidecarDir, { recursive: true });
    writeFileSync(sidecarFile, JSON.stringify(sidecar, null, 2));
    // Also write a session-keyed "latest" so consumers don't need to
    // know the prompt hash up-front — they read the latest sidecar for
    // their session id.
    writeFileSync(latestFile, JSON.stringify(sidecar, null, 2));
  } catch (e) {
    fail(`sidecar write failed: ${e && e.message ? e.message : "io-error"}`);
    return;
  }

  // TOKEN-EFFICIENCY (TOKEN-EFFICIENCY-INJECT/U-CAG-NOSIGNAL-SUPPRESS,
  // 2026-06-10 slot:bravo): the SIDECAR written above is the actual product --
  // downstream injectors (master-index-precheck, memory-relevance,
  // tribal-by-domain) read it via cag-consume.mjs to short-circuit on COLD hits.
  // The VISIBLE block below is operator-facing only. When the classifier has NO
  // actionable opinion -- sub-floor confidence AND zero cold/hot sources AND no
  // savings claim -- it renders the literal "HYBRID (conf 0%) (no sources)",
  // which summarize()'s own comment calls the MOST COMMON classification
  // fleet-wide: ~50 tokens of pure noise on the majority of prompts across 26
  // slots, every prompt. Suppress the VISIBLE emit in that case (the sidecar is
  // already persisted above, so the consume path is byte-identical). Verbose
  // keeps the full surface; PRISM_CAG_ROUTER_MIN_CONF=0 restores legacy emit.
  const minConf = (() => {
    const n = Number(process.env.PRISM_CAG_ROUTER_MIN_CONF);
    return Number.isFinite(n) ? n : 0.15;
  })();
  const conf = Number.isFinite(decision.confidence) ? decision.confidence : 0;
  const noSignal =
    conf < minConf &&
    (decision.coldSources?.length ?? 0) === 0 &&
    (decision.hotSources?.length ?? 0) === 0 &&
    (savings.estimatedTokensSaved ?? 0) === 0;
  if (noSignal && !verbose) {
    process.exit(0);
  }

  // Surface a 1-line route summary in the operator's context so they
  // can see when CAG-router fires + what it decided. Compact unless
  // verbose. Include the estimated-savings line only when the decision
  // is COLD or HYBRID (HOT carries no claim).
  const lines = [
    `## 🧭 CAG-route — ${summarize(decision)}`,
    `_Sidecar: ${sidecarFile}_`,
  ];
  if (savings.estimatedTokensSaved > 0) {
    lines.push(`_Est. savings if downstream consumes: ${savings.estimatedTokensSaved} tokens, ${savings.estimatedLatencyMsSaved}ms_`);
  }
  if (verbose) {
    lines.push("_Evidence:_");
    for (const ev of decision.evidence.slice(0, 5)) lines.push(`  - ${ev}`);
  }
  lines.push(`_Disable: PRISM_CAG_ROUTER_INJECT_DISABLE=1 · verbose: PRISM_CAG_ROUTER_INJECT_VERBOSE=1_`);

  emit({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: lines.join("\n"),
    },
  });
}

main();
