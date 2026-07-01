#!/usr/bin/env node
// tier: T2
// auto-fanout-advisory.mjs -- HERMES-MASTER-ORCHESTRATOR-MS0 / U-HMO-AUTO-FANOUT
//
// UserPromptSubmit hook: the AUTO-INVOKE layer the HermesParallelFanoutPlannerEngine
// was missing. The engine had assessAutoTrigger() + plan() but nothing CALLED them on
// a live prompt (the fan-out surface sat dormant ~28% utilization). This hook closes
// that: on each prompt it runs the fanout-assess pre-screen and, when the task looks
// parallelizable across >= threshold distinct fleet domains (or carries explicit
// fleet-wide scope), SURFACES an advisory naming the candidate slots.
//
// ADVISORY ONLY -- it NEVER spawns agents (bravo soul: unsafe-fleet-control-before-governance).
// It recommends; the operator/orchestrator decides. Fast (<50ms, regex only), never throws,
// fail-silent. Opt out per-prompt with [no-fanout]/[skip-fanout]/[trivial].
//
// Contract: stdin {prompt, session_id}; stdout {continue:true, hookSpecificOutput:{hookEventName:"UserPromptSubmit", additionalContext}}.
// Knobs: PRISM_AUTO_FANOUT_DISABLE=1 (off) · PRISM_AUTO_FANOUT_THRESHOLD=N (min domains, default 3).

import * as fs from "node:fs";
import { assessFanout, DEFAULT_FANOUT_THRESHOLD } from "../../scripts/lib/fanout-assess.mjs";

const MIN_PROMPT_LEN = 24;
const OPT_OUT_TOKENS = ["[no-fanout]", "[skip-fanout]", "[trivial]"];

function readStdinJson() {
  try {
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function isOptOut(prompt) {
  const low = (prompt || "").toLowerCase();
  return OPT_OUT_TOKENS.some((t) => low.includes(t));
}

/** Build the advisory text from an assessment, or "" when no fan-out is warranted. */
export function buildAdvisory(assessment) {
  if (!assessment || !assessment.shouldFanout) return "";
  const rows = assessment.domains.map((d) => `  - ${d.domain} -> ${d.slot}`).join("\n");
  const driver = assessment.signals.includes("fleet-wide-scope")
    ? "explicit fleet-wide scope"
    : `${assessment.domainCount} distinct domains`;
  return [
    "## Fan-out advisory (Hermes auto-trigger)",
    `This task looks parallelizable (${driver}) -- consider a multi-slot fan-out:`,
    rows,
    "ADVISORY ONLY (not auto-spawned). Plan it via HermesParallelFanoutPlannerEngine.assessAutoTrigger() / a Workflow; the orchestrator/operator decides whether to actually fan out.",
    "Opt out: add [no-fanout]. Disable: PRISM_AUTO_FANOUT_DISABLE=1.",
  ].join("\n");
}

function writeOutput(additionalContext) {
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: additionalContext || "" },
  }));
}

export function main() {
  if (process.env.PRISM_AUTO_FANOUT_DISABLE === "1") return writeOutput("");
  const input = readStdinJson();
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (prompt.length < MIN_PROMPT_LEN || isOptOut(prompt)) return writeOutput("");
  const rawT = Number(process.env.PRISM_AUTO_FANOUT_THRESHOLD);
  const threshold = Number.isFinite(rawT) && rawT >= 2 ? rawT : DEFAULT_FANOUT_THRESHOLD;
  let assessment;
  try { assessment = assessFanout(prompt, { threshold }); } catch { return writeOutput(""); }
  return writeOutput(buildAdvisory(assessment));
}

const isDirect = (process.argv[1] || "").replace(/\\/g, "/").endsWith("auto-fanout-advisory.mjs");
if (isDirect) {
  try { main(); } catch { writeOutput(""); }
}
