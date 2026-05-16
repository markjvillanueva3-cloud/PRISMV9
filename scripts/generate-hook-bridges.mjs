#!/usr/bin/env node
/**
 * generate-hook-bridges.mjs — wire hooks (claude-hooks .mjs + source hooks .ts)
 * to the dispatchers they invoke. Plus ghost edges where a hook references a
 * domain by name but doesn't actually call its dispatcher.
 *
 * Two scopes:
 *   1. .claude/hooks/*.mjs  — runtime claude-code hooks (lifecycle gates)
 *   2. mcp-server/src/hooks/*.ts — server-side enforcement hooks (Zod, Cadence)
 *
 * Detection patterns:
 *   - `prism_<name>` literal (MCP tool call from a hook in shell-out form)
 *   - `mcp__prism__prism_<name>` (CLI tool name)
 *   - `dispatchers/<NAME>Dispatcher` import (server-side direct require)
 *   - `actions = ["<action>"]` patterns matched against dispatcher action enums
 *
 * For each hook, every detected dispatcher reference becomes a real edge.
 * Hooks that mention a domain keyword (e.g. "kienzle", "tool life") in their
 * filename or first 200 chars but reference no dispatcher emit a GHOST edge
 * to the suggested dispatcher (planned wiring opportunity).
 *
 * Output: state/shared/system-viz/hook-bridges-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph } from "./lib/system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const CLAUDE_HOOKS_DIR = path.join(ROOT, ".claude", "hooks");
const SRC_HOOKS_DIR = path.join(ROOT, "mcp-server", "src", "hooks");

const KEYWORD_TO_DISPATCHER = [
  [/kienzle|taylor|cutting.?force|chip.?load|spindle.?power|chatter|deflection/i, "disp.calcdispatcher"],
  [/wedm|wire.?edm|edm/i, "disp.edmdispatcher"],
  [/lathe|turning|millturn/i, "disp.turningdispatcher"],
  [/print.?to.?program|p2p/i, "disp.turningprogramdispatcher"],
  [/mill\b|milling/i, "disp.milldispatcher"],
  [/toolpath|cam\b|strategy/i, "disp.camdispatcher"],
  [/cad\b|geometry|sketch|dfm/i, "disp.caddispatcher"],
  [/safety|s\(x\)|omega/i, "disp.safetydispatcher"],
  [/quality|spc|cpk|fai|gd&t|gdnt/i, "disp.qualitydispatcher"],
  [/probe|cmm|inspection/i, "disp.qualitydispatcher"],
  [/cost|quote|erp|billing/i, "disp.businessdispatcher"],
  [/grinding|grind/i, "disp.grindingdispatcher"],
  [/tool|insert|holder|coating/i, "disp.datadispatcher"],
  [/material|alloy|hardness/i, "disp.datadispatcher"],
  [/agi|reasoning|neural|deep.?learn|wisdom/i, "disp.aidispatcher"],
  [/orchestrat|autopilot|agent|atcs/i, "disp.orchestratedispatcher"],
  [/session|context|memory|handoff/i, "disp.sessiondispatcher"],
  [/feasibility|workholding|rigidity/i, "disp.feasibilitydispatcher"],
  [/scheduling|capacity/i, "disp.schedulingdispatcher"],
  [/multi.?op|sequence|setup/i, "disp.multi_opdispatcher"],
  [/calibrat|adaptive|drift|bayesian/i, "disp.adaptivecontroldispatcher"],
  [/tribal|wiki|knowledge|learn/i, "disp.knowledgedispatcher"],
  [/tenant|isolation/i, "disp.tenantdispatcher"],
  [/realtime|websocket|ws_/i, "disp.realtimedispatcher"],
  [/process.?control|ctc|ewma|cusum/i, "disp.process_controldispatcher"],
];

function listFiles(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.endsWith(ext))
    .map(e => ({
      name: e.name.replace(/\.(mjs|ts)$/, ""),
      path: path.join(dir, e.name),
      basename: e.name,
    }));
}

function scrapeDispatcherRefs(text) {
  const out = new Set();
  // 1. CLI tool form: mcp__prism__prism_<name>  or  prism_<name>(
  // 2. Server-side import: dispatchers/<NAME>Dispatcher
  const patterns = [
    /mcp__prism__prism_([a-z_]+)/gi,
    /["'`]prism_([a-z_]+)["'`]/gi,
    /\bprism_([a-z_]+)\s*\(/gi,
    /\bprism_([a-z_]+)Dispatcher\b/gi,
    /from\s+["'][^"']*\/dispatchers\/([a-zA-Z_]+)Dispatcher/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      out.add(m[1].toLowerCase());
    }
  }
  return [...out];
}

function dispatcherIdFromKey(key) {
  // calc → disp.calcdispatcher
  return "disp." + key.toLowerCase() + "dispatcher";
}

function suggestionsForHook(hookName, headText) {
  const out = new Set();
  const blob = (hookName + " " + headText).slice(0, 4000);
  for (const [re, disp] of KEYWORD_TO_DISPATCHER) {
    if (re.test(blob)) out.add(disp);
  }
  return [...out];
}

function generate() {
  const graph = loadGraph();
  const nodeIds = new Set(graph.nodes.map(n => n.id));

  const claudeHooks = listFiles(CLAUDE_HOOKS_DIR, ".mjs");
  const srcHooks = listFiles(SRC_HOOKS_DIR, ".ts").filter(h => !h.basename.endsWith(".test.ts"));

  const stats = {
    claudeHooks: claudeHooks.length,
    srcHooks: srcHooks.length,
    realEdges: 0,
    ghostEdges: 0,
    skippedMissingNode: 0,
    skippedMissingDisp: 0,
    keywordOnlyHooks: 0,
  };

  const newEdges = [];
  const seen = new Set();

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seen.has(k)) return false;
    seen.add(k);
    if (!nodeIds.has(from)) { stats.skippedMissingNode++; return false; }
    if (!nodeIds.has(to))   { stats.skippedMissingDisp++; return false; }
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  function processHook(hook, hookNodePrefix, edgeType) {
    let text = "";
    try { text = fs.readFileSync(hook.path, "utf8"); } catch { return; }
    const head = text.slice(0, 4000);

    // The hook node id matches the engine-domain-inventory format used
    // for core nodes: core.hooks_cl.<basename> for claude hooks, and
    // core.hooks_src.<basename> for server hooks.
    const hookId = `${hookNodePrefix}.${hook.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_")}`;
    if (!nodeIds.has(hookId)) {
      // Some claude hooks aren't drilled (only top-9 per parent) — fall
      // back to the parent rollup so the wire still anchors somewhere.
      const fallback = hookNodePrefix;
      if (!nodeIds.has(fallback)) return;
      const dispRefs = scrapeDispatcherRefs(text);
      for (const key of dispRefs) {
        const dispId = dispatcherIdFromKey(key);
        if (pushEdge(fallback, dispId, edgeType, "active", 0.35)) stats.realEdges++;
      }
      // Skip ghost suggestions when the hook itself isn't atomic — too noisy.
      return;
    }

    const dispRefs = scrapeDispatcherRefs(text);
    let realCount = 0;
    for (const key of dispRefs) {
      const dispId = dispatcherIdFromKey(key);
      if (pushEdge(hookId, dispId, edgeType, "active", 0.4)) {
        stats.realEdges++;
        realCount++;
      }
    }

    // Ghost edges: hook mentions a domain by keyword but never calls its
    // dispatcher. Skip ghost emit if the hook already wired ≥2 real edges
    // (it's clearly active enough; suggesting more is just noise).
    if (realCount >= 2) return;
    const suggestions = suggestionsForHook(hook.name, head);
    if (realCount === 0 && suggestions.length > 0) stats.keywordOnlyHooks++;
    for (const dispId of suggestions) {
      if (pushEdge(hookId, dispId, edgeType + "_suggested", "ghost", 0.22)) {
        stats.ghostEdges++;
      }
    }
  }

  for (const h of claudeHooks) processHook(h, "core.hooks_cl",  "hook_invoke");
  for (const h of srcHooks)    processHook(h, "core.hooks_src", "hook_invoke");

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "hook-bridges-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(`wrote ${outPath}`);
console.log(`  claude hooks scanned:   ${result.stats.claudeHooks}`);
console.log(`  src hooks scanned:      ${result.stats.srcHooks}`);
console.log(`  real edges emitted:     ${result.stats.realEdges}`);
console.log(`  ghost edges emitted:    ${result.stats.ghostEdges}`);
console.log(`  keyword-only hooks:     ${result.stats.keywordOnlyHooks}`);
console.log(`  skipped missing-disp:   ${result.stats.skippedMissingDisp}`);
console.log(`  total edges in this aug:${result.newEdges.length}`);
