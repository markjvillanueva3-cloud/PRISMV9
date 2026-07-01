#!/usr/bin/env node
// scripts/extract-operator-prompts.mjs
//
// PROMPT-ROUTE-MAP-MS0 / U-PROMPT-EXTRACT (slot:alpha 2026-06-15). Operator
// directive: "read through every single session we've ever had. read ALL my
// prompts and commands. update the graph to account for every single prompt and
// command I've ever made so we map out a direct route to complete my future
// prompts." This is U1: the data foundation -- a DETERMINISTIC streaming extractor
// (R5: code does the transform, not the model) over ALL session transcripts.
//
// Streams every <home>/.claude/projects/H--prism/*.jsonl (613 files, ~7.8GB) line
// by line (NEVER readFileSync a whole transcript -- they exceed V8's 512MiB string
// cap), pulls ONLY genuine human prompts + slash commands (string-content user
// turns, NOT tool_results / hook-injection blocks), classifies each via the
// WORKFLOW-routing classifier (classifyRoutingClass, reused -- R8), dedups, and
// emits:
//   - state/shared/operator-prompt-corpus.jsonl  (one line per genuine prompt)
//   - state/shared/operator-prompt-route-map.json (aggregate: per-class frequency
//     + top command families + example prompts + the optimal route from the
//     feature-routing-graph TASK_CLASS_POLICY)
//
// Run (heavy I/O -- minutes): node H:/prism/scripts/extract-operator-prompts.mjs

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { classifyRoutingClass, TASK_CLASS_POLICY, taskClasses } from "./lib/feature-routing-graph.mjs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const PROJECT_DIR = process.env.PRISM_TRANSCRIPT_DIR
  || path.join(os.homedir(), ".claude", "projects", "H--prism");
const CORPUS_OUT = path.join(PRISM, "state/shared/operator-prompt-corpus.jsonl");
const MAP_OUT = path.join(PRISM, "state/shared/operator-prompt-route-map.json");
const MAX_TEXT = 4000;            // cap stored prompt text (corpus hygiene)
const MAX_EXAMPLES = 8;           // example prompts kept per class in the map
const MAX_LINE_BYTES = 2 * 1024 * 1024; // skip pathological giant lines (huge inlined tool_results) before parse (scrutiny P2)

// ---- genuine-human-prompt extraction (pure, testable) ----------------------

/**
 * Pure: from a transcript line's parsed object, return the genuine human prompt
 * descriptor { text, command, args } or null if it is not a human prompt
 * (tool_result, hook artifact, empty). A human turn is type:user with a STRING
 * message.content (tool_results carry an ARRAY). We strip injected
 * <system-reminder>/<local-command-*> noise and split out a slash command.
 */
export function extractPrompt(obj) {
  if (!obj || obj.type !== "user" || !obj.message) return null;
  const c = obj.message.content;
  if (typeof c !== "string") return null;           // array content = tool_result
  return parsePromptText(c);
}

/** Pure: parse the raw user-content string into { text, command, args } or null. */
export function parsePromptText(raw) {
  if (typeof raw !== "string") return null;
  // The human-typed portion is everything BEFORE the first injected block.
  let s = raw.split("<system-reminder>")[0];
  // A turn that is ONLY tool/local stdout or a caveat is not a human prompt.
  if (/^\s*<local-command-stdout>/.test(s) && !/<command-name>/.test(s)) return null;
  // Extract a slash command + its args if present.
  let command = null, args = null;
  const cmd = s.match(/<command-name>\s*\/?([A-Za-z0-9:_-]+)\s*<\/command-name>/);
  if (cmd) command = cmd[1];
  const am = s.match(/<command-args>([\s\S]*?)<\/command-args>/);
  if (am) args = am[1].trim();
  // Strip all command/ceremony tags to leave the human directive text.
  let text = s
    .replace(/<command-message>[\s\S]*?<\/command-message>/g, "")
    .replace(/<command-name>[\s\S]*?<\/command-name>/g, "")
    .replace(/<command-args>[\s\S]*?<\/command-args>/g, "")
    .replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "")
    .replace(/<\/?[a-z-]+>/g, "")
    .trim();
  // If a command carried args, the args ARE the human directive.
  if (command && args) text = args;
  if (!text && !command) return null;               // pure ceremony / empty
  if (text.length > MAX_TEXT) text = text.slice(0, MAX_TEXT);
  return { text, command, args: args || null };
}

/** Pure: normalize a prompt for dedup (lowercase, collapse ws, drop volatile ids). */
export function normalizePrompt(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/claude-[0-9a-f]{8}/g, "")
    .replace(/[0-9a-f-]{36}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

// ---- aggregate / map build (pure) ------------------------------------------

/**
 * Pure: fold a list of { text, command, taskClass } prompts into the route map:
 * per-class frequency + top command families + example prompts + the optimal
 * route (from TASK_CLASS_POLICY). Deterministic, sorted.
 */
export function buildRouteMap(prompts) {
  const byClass = {};
  for (const cls of taskClasses()) byClass[cls] = { count: 0, commands: {}, examples: [] };
  const commandFreq = {};
  let total = 0;
  for (const p of prompts) {
    const cls = p.taskClass || "build";
    const bucket = byClass[cls] || (byClass[cls] = { count: 0, commands: {}, examples: [] });
    bucket.count++;
    total++;
    if (p.command) {
      commandFreq[p.command] = (commandFreq[p.command] || 0) + 1;
      bucket.commands[p.command] = (bucket.commands[p.command] || 0) + 1;
    }
    if (bucket.examples.length < MAX_EXAMPLES && p.text && p.text.length > 8) {
      bucket.examples.push(p.text.slice(0, 160));
    }
  }
  // attach the optimal route per class + sort classes by frequency.
  const classes = taskClasses()
    .map((cls) => {
      const b = byClass[cls];
      const topCommands = Object.entries(b.commands).sort((a, z) => z[1] - a[1]).slice(0, 6).map(([k, v]) => ({ command: k, count: v }));
      return {
        taskClass: cls,
        count: b.count,
        pct: total ? Math.round((b.count / total) * 1000) / 10 : 0,
        route: TASK_CLASS_POLICY[cls],   // the order-of-operations for this class
        topCommands,
        examples: b.examples,
      };
    })
    .sort((a, z) => z.count - a.count);
  const topCommandFamilies = Object.entries(commandFreq).sort((a, z) => z[1] - a[1]).slice(0, 30).map(([k, v]) => ({ command: k, count: v }));
  return { total, classes, topCommandFamilies };
}

// ---- IO orchestration ------------------------------------------------------

async function streamTranscript(filePath, onPrompt) {
  let stream;
  try { stream = fs.createReadStream(filePath, { encoding: "utf8" }); } catch { return; }
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line || line.length < 12) continue;
      if (line.length > MAX_LINE_BYTES) continue;           // skip giant inlined tool_result lines (OOM guard)
      if (!line.includes('"type":"user"')) continue;        // cheap pre-filter
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      const p = extractPrompt(obj);
      if (p) onPrompt(p, obj);
    }
  } catch { /* torn read -> keep what we have */ }
  finally { try { rl.close(); } catch { /* noop */ } }
}

async function main() {
  let files = [];
  try { files = fs.readdirSync(PROJECT_DIR).filter((f) => f.endsWith(".jsonl")); } catch (e) {
    console.error(`cannot read transcript dir ${PROJECT_DIR}: ${e.message}`); process.exitCode = 1; return;
  }
  const seen = new Set();
  const prompts = [];
  const corpusFd = fs.openSync(CORPUS_OUT, "w");
  let raw = 0, kept = 0;
  for (const f of files) {
    const fp = path.join(PROJECT_DIR, f);
    const sid = f.replace(/\.jsonl$/, "");
    // eslint-disable-next-line no-await-in-loop
    await streamTranscript(fp, (p) => {
      raw++;
      const norm = normalizePrompt(p.text || p.command || "");
      if (!norm || seen.has(norm)) return;                  // dedup across ALL sessions
      seen.add(norm);
      const { taskClass } = classifyRoutingClass(p.text || p.command || "");
      const rec = { sessionId: sid, text: p.text, command: p.command, taskClass };
      prompts.push({ text: p.text, command: p.command, taskClass });
      fs.writeSync(corpusFd, JSON.stringify(rec) + "\n");
      kept++;
    });
  }
  fs.closeSync(corpusFd);

  const map = buildRouteMap(prompts);
  const doc = {
    schemaVersion: 1,
    generatedNote: "U-PROMPT-EXTRACT. Genuine human prompts+commands across ALL session transcripts, deduped, classified by feature-routing-graph.classifyRoutingClass. Route per class = TASK_CLASS_POLICY.",
    routeFieldNote: "Per-class 'route' is a GEN-TIME SNAPSHOT of feature-routing-graph TASK_CLASS_POLICY (canonical). Regenerate to refresh. prompt-route-inject.mjs reads the LIVE policy at inject time, NOT this field -- do not consume 'route' from this JSON in code (staleness trap).",
    transcripts: files.length,
    rawPromptsSeen: raw,
    distinctPrompts: kept,
    ...map,
  };
  fs.writeFileSync(MAP_OUT, JSON.stringify(doc, null, 2) + "\n");
  console.log(JSON.stringify({
    ok: true, transcripts: files.length, rawPromptsSeen: raw, distinctPrompts: kept,
    topClasses: map.classes.slice(0, 6).map((c) => `${c.taskClass}:${c.count}(${c.pct}%)`),
    topCommands: map.topCommandFamilies.slice(0, 8).map((c) => `${c.command}:${c.count}`),
    corpus: CORPUS_OUT, map: MAP_OUT,
  }, null, 2));
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/extract-operator-prompts.mjs")) {
  main().catch((e) => { console.error(`extract failed: ${e?.message || e}`); process.exitCode = 1; });
}
