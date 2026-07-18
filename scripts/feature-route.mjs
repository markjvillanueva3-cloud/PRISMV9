#!/usr/bin/env node
// scripts/feature-route.mjs
//
// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). On-demand
// CLI for the unified feature-routing graph: given a task description, print the
// followable routing digest (task class + substrate ladder + model tier + ordered
// commands + auto-invoke set + the antipattern to avoid). Composes the live
// routers (cag / model-policy / substrate) via routeTaskClass, fail-open.
//
// NOTE (R7): named feature-route.mjs, NOT route.mjs -- the /route SKILL
// (.claude/commands/route.md) already owns the MODEL-PROVIDER axis ("which
// Claude/Gemini/Ollama chain"). This CLI is the WORKFLOW axis ("which substrate
// ladder + commands"). Distinct purpose, distinct name.
//
//   node H:/prism/scripts/feature-route.mjs "compute the speed and feed for 4140"
//   node H:/prism/scripts/feature-route.mjs --json "where is the X engine wired"

import { routeTaskClass, buildRoutingDigest } from "./lib/feature-routing-graph.mjs";

async function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const prompt = argv.filter((a) => a !== "--json").join(" ").trim();
  if (!prompt) {
    console.error('usage: node scripts/feature-route.mjs [--json] "<task description>"');
    process.exitCode = 1;
    return;
  }
  const decision = await routeTaskClass(prompt);
  if (json) {
    console.log(JSON.stringify(decision, null, 2));
  } else {
    console.log(buildRoutingDigest(decision));
  }
}

main().catch((e) => { console.error(`feature-route failed: ${e?.message || e}`); process.exitCode = 1; });
