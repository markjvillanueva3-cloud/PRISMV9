#!/usr/bin/env node
// U-PSN-MULTI-PROVIDER-ROUTER-2026-05-24 — CLI front-end for multi-provider-router.mjs
//
// Verbs:
//   --classify  "<prompt>"          Classify a task and print recommended provider chain.
//   --record    "<prompt>"          Classify + append a synthetic outcome record (for testing).
//   --recommend "<category>"        Recommend provider from outcome history for a task category.
//   --summary                       Print a stats summary of all recorded outcomes.
//
// Flags (all verbs):
//   --prefer-offline                Promote local providers to primary.
//   --exclude <p1,p2,...>           Comma-separated provider ids to exclude.
//   --store <path>                  Override outcomes JSONL path.
//   --json                          Machine-readable JSON output.
//   --success <true|false>          For --record: whether the call succeeded (default true).
//   --latency <ms>                  For --record: simulated latency ms (default 500).
//   --window <n>                    For --recommend: history window size (default 10).
//
// Exit codes:
//   0  ok
//   1  usage error
//   2  runtime error

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  classifyTask,
  recordOutcome,
  loadOutcomes,
  recommendProviderFromHistory,
} from "./lib/multi-provider-router.mjs";

// ---------------------------------------------------------------------------
// Argument parser (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    verb: null,
    prompt: null,
    preferOffline: false,
    excludeProviders: [],
    storePath: null,
    json: false,
    success: true,
    latencyMs: 500,
    window: 10,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--classify" || a === "--record" || a === "--recommend") {
      result.verb = a.slice(2);           // "classify" | "record" | "recommend"
      result.prompt = args[++i] ?? null;
    } else if (a === "--summary") {
      result.verb = "summary";
    } else if (a === "--prefer-offline") {
      result.preferOffline = true;
    } else if (a === "--exclude") {
      result.excludeProviders = (args[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else if (a === "--store") {
      result.storePath = args[++i] ?? null;
    } else if (a === "--json") {
      result.json = true;
    } else if (a === "--success") {
      const val = args[++i] ?? "true";
      result.success = val !== "false";
    } else if (a === "--latency") {
      result.latencyMs = parseInt(args[++i] ?? "500", 10);
      if (isNaN(result.latencyMs) || result.latencyMs < 0) {
        die("--latency must be a non-negative integer");
      }
    } else if (a === "--window") {
      result.window = parseInt(args[++i] ?? "10", 10);
      if (isNaN(result.window) || result.window < 1) {
        die("--window must be a positive integer");
      }
    } else {
      die(`Unknown argument: ${a}`);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function die(msg, code = 1) {
  process.stderr.write(`prism-route: ${msg}\n`);
  process.exit(code);
}

function print(obj, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(obj, null, 2) + "\n");
  } else {
    if (typeof obj === "string") {
      process.stdout.write(obj + "\n");
    } else {
      // Human-friendly format per verb
      process.stdout.write(formatHuman(obj) + "\n");
    }
  }
}

function formatHuman(obj) {
  const lines = [];
  if (obj.verb === "classify" || obj.verb === "record") {
    lines.push(`Task category  : ${obj.taskCategory}`);
    lines.push(`Primary        : ${obj.primaryProvider}`);
    lines.push(`Fallback chain : ${obj.fallbackChain.join(" → ")}`);
    lines.push(`Reasoning      : ${obj.reasoning}`);
    if (obj.recordId) {
      lines.push(`Outcome id     : ${obj.recordId}`);
    }
  } else if (obj.verb === "recommend") {
    lines.push(`Category  : ${obj.category}`);
    lines.push(`Recommend : ${obj.recommended}`);
    lines.push(`Window    : ${obj.window} records`);
  } else if (obj.verb === "summary") {
    lines.push(`Outcomes file : ${obj.storePath}`);
    lines.push(`Total records : ${obj.totalRecords}`);
    if (obj.totalRecords === 0) {
      lines.push("(no records yet)");
    } else {
      lines.push("");
      lines.push("Per-category success rates:");
      for (const cat of Object.keys(obj.byCategory).sort()) {
        const c = obj.byCategory[cat];
        const rate = ((c.successCount / c.count) * 100).toFixed(1);
        const meanLatency = (c.totalLatency / c.count).toFixed(0);
        lines.push(`  ${cat.padEnd(12)} ${c.count} records  success=${rate}%  mean_latency=${meanLatency}ms`);
      }
      lines.push("");
      lines.push("Per-provider success rates:");
      for (const prov of Object.keys(obj.byProvider).sort()) {
        const p = obj.byProvider[prov];
        const rate = ((p.successCount / p.count) * 100).toFixed(1);
        const meanLatency = (p.totalLatency / p.count).toFixed(0);
        lines.push(`  ${prov.padEnd(20)} ${p.count} records  success=${rate}%  mean_latency=${meanLatency}ms`);
      }
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Verb implementations
// ---------------------------------------------------------------------------

function doClassify(args) {
  if (!args.prompt) die("--classify requires a prompt string");
  const route = classifyTask(args.prompt, {
    preferOffline: args.preferOffline,
    excludeProviders: args.excludeProviders,
  });
  return { verb: "classify", prompt: args.prompt, ...route };
}

function doRecord(args) {
  if (!args.prompt) die("--record requires a prompt string");
  const route = classifyTask(args.prompt, {
    preferOffline: args.preferOffline,
    excludeProviders: args.excludeProviders,
  });
  const storeOpts = args.storePath ? { storePath: args.storePath } : {};
  const id = recordOutcome(
    {
      provider: route.primaryProvider,
      taskCategory: route.taskCategory,
      success: args.success,
      latencyMs: args.latencyMs,
    },
    storeOpts
  );
  return { verb: "record", prompt: args.prompt, ...route, recordId: id };
}

function doRecommend(args) {
  if (!args.prompt) die("--recommend requires a category string");
  const storeOpts = args.storePath ? { storePath: args.storePath } : {};
  const recommended = recommendProviderFromHistory(args.prompt, args.window, storeOpts);
  return { verb: "recommend", category: args.prompt, recommended, window: args.window };
}

function doSummary(args) {
  const storeOpts = args.storePath ? { storePath: args.storePath } : {};
  const outcomes = loadOutcomes(storeOpts);

  const DEFAULT_STORE = "H:/prism/state/shared/multi-provider-outcomes.jsonl";
  const storePath = args.storePath || DEFAULT_STORE;

  const byCategory = {};
  const byProvider = {};

  for (const r of outcomes) {
    // Category aggregation
    if (!byCategory[r.taskCategory]) {
      byCategory[r.taskCategory] = { count: 0, successCount: 0, totalLatency: 0 };
    }
    byCategory[r.taskCategory].count += 1;
    if (r.success) byCategory[r.taskCategory].successCount += 1;
    byCategory[r.taskCategory].totalLatency += r.latencyMs;

    // Provider aggregation
    if (!byProvider[r.provider]) {
      byProvider[r.provider] = { count: 0, successCount: 0, totalLatency: 0 };
    }
    byProvider[r.provider].count += 1;
    if (r.success) byProvider[r.provider].successCount += 1;
    byProvider[r.provider].totalLatency += r.latencyMs;
  }

  return { verb: "summary", storePath, totalRecords: outcomes.length, byCategory, byProvider };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function usage() {
  return [
    "Usage: node scripts/prism-route.mjs <verb> [flags]",
    "",
    "Verbs:",
    "  --classify  \"<prompt>\"       Classify task → provider chain",
    "  --record    \"<prompt>\"       Classify + record a synthetic outcome",
    "  --recommend \"<category>\"     Recommend from outcome history",
    "  --summary                    Stats over all recorded outcomes",
    "",
    "Flags:",
    "  --prefer-offline             Promote local providers",
    "  --exclude <p1,p2,...>        Exclude provider ids (comma-separated)",
    "  --store <path>               Override outcomes JSONL path",
    "  --json                       Machine-readable JSON output",
    "  --success <true|false>       (--record) outcome success flag (default true)",
    "  --latency <ms>               (--record) simulated latency (default 500)",
    "  --window <n>                 (--recommend) history window size (default 10)",
    "",
    "Examples:",
    "  node scripts/prism-route.mjs --classify \"explain physics of spindle deflection\"",
    "  node scripts/prism-route.mjs --classify \"summarize log file\"",
    "  node scripts/prism-route.mjs --classify \"write a regex to match ISO dates\"",
    "  node scripts/prism-route.mjs --recommend reasoning --window 5",
    "  node scripts/prism-route.mjs --summary --json",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv);

  if (!args.verb) {
    process.stdout.write(usage() + "\n");
    process.exit(0);
  }

  let result;
  try {
    switch (args.verb) {
      case "classify":  result = doClassify(args);  break;
      case "record":    result = doRecord(args);     break;
      case "recommend": result = doRecommend(args);  break;
      case "summary":   result = doSummary(args);    break;
      default:
        die(`Unknown verb: ${args.verb}`);
    }
  } catch (err) {
    die(`Runtime error: ${err.message}`, 2);
  }

  print(result, args.json);
}

main();
