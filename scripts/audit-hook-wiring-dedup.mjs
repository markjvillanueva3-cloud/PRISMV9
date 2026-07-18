#!/usr/bin/env node
// audit-hook-wiring-dedup.mjs -- deterministic hook-wiring dedupe/consolidation analyzer.
// (HARNESS-EFFICIENCY-MS0, 2026-07-02)
//
// WHY: Claude Code merges hook wiring from the user layer (C:/Users/<u>/.claude/settings.json)
// and the project layer (H:/prism/.claude/settings.json), dedupes IDENTICAL command strings,
// and runs everything else. The C: layer went through bundle consolidation (FORK-STORM lineage);
// the project layer is a pre-consolidation snapshot that still wires the SAME hooks standalone
// with DIFFERENT command context (bundle vs standalone), so those double-run on every event
// (live-proven: session-consolidate-graph counter incremented twice within one Stop).
// Additionally the settings "timeout" field is SECONDS per Claude Code docs, but every value
// in this fleet was written as MILLISECONDS -- budgets are ~1000x intent, so a hung hook can
// stall an event for the 600s default instead of its intended 2-10s.
//
// This script computes: (a) the duplicate matrix (free vs live double-runs), (b) tombstone
// no-op spawns, (c) timeout-unit anomalies, (d) static block/network signals per hook.
// Read-only: never edits settings; emits verdict SUGGESTIONS for operator/chat review.
// Sibling of audit-injection-surface.mjs and verify-hook-refs.mjs.
//
// Output: state/shared/specs/HOOK-WIRING-DEDUP-<date>.json + .md

import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// derive from clock so reruns never overwrite an older dated matrix with mislabeled data (scrutiny arm-A P2)
const TODAY = new Date().toISOString().slice(0, 10);
const LAYERS = {
  userC: "C:/Users/wompu/.claude/settings.json",
  mirrorH: "H:/.claude/settings.json",
  project: "H:/prism/.claude/settings.json",
};
const BUNDLES_DIR = "H:/prism/.claude/hooks/bundles";
const OUT_JSON = `H:/prism/state/shared/specs/HOOK-WIRING-DEDUP-${TODAY}.json`;
const OUT_MD = `H:/prism/state/shared/specs/HOOK-WIRING-DEDUP-${TODAY}.md`;
// settings timeout field is SECONDS (docs); values >= this look like intended-milliseconds
const TIMEOUT_MS_SUSPECT_MIN = 500;

// ---------- command-string -> normalized hook identity ----------
// Handles: portable-node wrapper (quoted/unquoted), bare node, env-var prefixes
// (READ_ONCE_MODE=post ...), args after the script path (--pre, --hook X --tier T4),
// and `node -e "..."` tombstones.
export function normalizeCommand(cmd) {
  if (typeof cmd !== "string" || !cmd.trim()) return { kind: "empty", path: null, args: "" };
  let s = cmd.trim();
  while (/^[A-Z_][A-Z0-9_]*=\S+\s+/.test(s)) s = s.replace(/^[A-Z_][A-Z0-9_]*=\S+\s+/, "");
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(s)) !== null) tokens.push(m[1] ?? m[2]);
  if (!tokens.length) return { kind: "empty", path: null, args: "" };
  let i = 0;
  const runner = tokens[0].toLowerCase();
  if (runner.endsWith("portable-node") || runner.endsWith("portable-node.cmd") ||
      runner === "node" || runner.endsWith("/node.exe") || runner.endsWith("\\node.exe")) i = 1;
  if (tokens[i] === "-e") {
    return { kind: "tombstone", path: null, args: tokens.slice(i + 1).join(" ").slice(0, 160) };
  }
  const scriptPath = tokens[i] ? tokens[i].replace(/\\/g, "/") : null;
  const args = tokens.slice(i + 1).join(" ");
  if (scriptPath && scriptPath.endsWith("async-hook-enqueue.mjs")) {
    const hm = /--hook\s+(\S+)/.exec(args);
    if (hm) return { kind: "async-wrapped", path: hm[1].replace(/\\/g, "/").toLowerCase(), args };
  }
  return { kind: scriptPath ? "script" : "empty", path: scriptPath ? scriptPath.toLowerCase() : null, args };
}

export function baseName(p) {
  if (!p) return null;
  return p.slice(p.lastIndexOf("/") + 1);
}

// ---------- settings parsing ----------
function loadSettings(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, "utf-8")); // throw loud on parse error (R12)
}

function extractWires(settings, layer) {
  const wires = [];
  const hooks = settings?.hooks || {};
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) continue;
    groups.forEach((group, gi) => {
      const matcher = group?.matcher ?? "";
      (group?.hooks || []).forEach((h, hi) => {
        const norm = normalizeCommand(h?.command || "");
        wires.push({
          layer, event, matcher, groupIndex: gi, hookIndex: hi,
          timeout: h?.timeout ?? null,
          kind: norm.kind, path: norm.path, base: baseName(norm.path), args: norm.args,
          command: (h?.command || "").trim(),
        });
      });
    });
  }
  return wires;
}

// ---------- bundle absorption map: baseName -> Set(bundleFile) ----------
function bundleAbsorbedMap() {
  const map = new Map();
  const bundleFiles = readdirSync(BUNDLES_DIR).filter((f) => f.endsWith(".mjs") && f !== "smoke-test.mjs");
  const mjsRef = /([\w.${}/:@-]+\.mjs)/g; // path-ish token ending .mjs ('-' last in class)
  for (const bf of bundleFiles) {
    const src = readFileSync(path.join(BUNDLES_DIR, bf), "utf-8");
    let m;
    while ((m = mjsRef.exec(src)) !== null) {
      const b = baseName(m[1].replace(/\\/g, "/").toLowerCase());
      if (!b || b === bf.toLowerCase() || b === "hook-runner.mjs") continue;
      if (!map.has(b)) map.set(b, new Set());
      map.get(b).add(bf);
    }
  }
  return map;
}

// ---------- static signals from hook source ----------
function staticSignals(hookPath) {
  const sig = { exists: false, blockCapable: false, network: false, detached: false, knobs: [] };
  if (!hookPath) return sig;
  const p = hookPath.replace(/^h:/, "H:").replace(/^c:/, "C:");
  if (!existsSync(p)) return sig;
  sig.exists = true;
  let src = "";
  try { src = readFileSync(p, "utf-8"); } catch { return sig; }
  sig.blockCapable = /"decision"\s*[:=]\s*"?(block|deny)|decision:\s*["'](block|deny)|permissionDecision["']?\s*[:=]\s*["'](deny|block)|continue["']?\s*[:=]\s*false|process\.exit\(2\)|exit\(2\)/.test(src);
  sig.network = /fetch\(|https?:\/\/127\.0\.0\.1|localhost:\d|11434|:8645|http\.request|net\.connect/.test(src);
  sig.detached = /detached:\s*true/.test(src);
  sig.knobs = [...new Set(src.match(/PRISM_[A-Z0-9_]+(?:DISABLE|ENABLE|THROTTLE_MS|BYPASS|MODE)/g) || [])].slice(0, 6);
  return sig;
}

// ---------- verdict classification (pure; unit-testable) ----------
export function classifyWire(w, { layerName, dupInUser, inBundles, isBundleEntry, sigExists }) {
  if (w.kind === "tombstone") {
    return { verdict: "REMOVE_TOMBSTONE_SPAWN", why: "node -e comment: spawns a process per event only to exit 0; preserve text as _comment" };
  }
  if (layerName === "project" && dupInUser.length) {
    const identical = dupInUser.some((d) => d.command === w.command);
    if (isBundleEntry) {
      return identical
        ? { verdict: "PROJECT_DUP_FREE", why: "bundle wired identically in userC; harness dedupes identical command strings" }
        : { verdict: "PROJECT_DUP_LIVE", why: "bundle wired in userC with DIFFERENT command string; whole bundle double-runs" };
    }
    return identical
      ? { verdict: "PROJECT_DUP_FREE", why: "identical command string in userC; harness-deduped (cleanup is clarity-only)" }
      : { verdict: "PROJECT_DUP_LIVE", why: "same hook, different command string vs userC; DOUBLE-RUNS every event" };
  }
  if (!isBundleEntry && inBundles.length && (w.kind === "script" || w.kind === "async-wrapped")) {
    return { verdict: "BUNDLE_DOUBLE_RUN", why: `absorbed by wired bundle(s) ${inBundles.join(", ")}; standalone wire double-runs it` };
  }
  if (w.kind === "script" && w.base && !sigExists) {
    return { verdict: "MISSING_FILE", why: "wired but file not found at normalized path (check roots/casing)" };
  }
  return { verdict: "UNIQUE_KEEP", why: "" };
}

// ---------- main ----------
function main() {
  const layers = {};
  for (const [name, file] of Object.entries(LAYERS)) {
    const s = loadSettings(file);
    layers[name] = s ? extractWires(s, name) : null;
  }
  if (!layers.userC || !layers.project) {
    throw new Error("FATAL: could not load user or project settings -- refusing to emit a partial matrix (R12)");
  }
  const mirrorMatchesUser = !!layers.mirrorH &&
    JSON.stringify(layers.userC.map((w) => [w.event, w.matcher, w.command])) ===
    JSON.stringify(layers.mirrorH.map((w) => [w.event, w.matcher, w.command]));

  const absorbed = bundleAbsorbedMap();
  // which bundles are actually wired anywhere (absorption only counts if the bundle runs)
  const wiredBundles = new Set(
    [...layers.userC, ...layers.project].filter((w) => w.path && w.path.includes("/bundles/")).map((w) => w.base)
  );

  const userIdx = new Map();
  for (const w of layers.userC) {
    if (!w.base) continue;
    const k = `${w.event}::${w.base}`;
    if (!userIdx.has(k)) userIdx.set(k, []);
    userIdx.get(k).push(w);
  }

  const sigCache = new Map();
  const signalsFor = (p) => {
    if (!p) return staticSignals(null);
    if (!sigCache.has(p)) sigCache.set(p, staticSignals(p));
    return sigCache.get(p);
  };

  const rows = [];
  const timeoutSuspects = [];
  for (const layerName of ["userC", "project"]) {
    for (const w of layers[layerName]) {
      const isBundleEntry = w.path ? w.path.includes("/bundles/") : false;
      const inBundles = (w.base ? [...(absorbed.get(w.base) || [])] : []).filter((bf) => wiredBundles.has(bf));
      const dupInUser = layerName === "project" && w.base ? (userIdx.get(`${w.event}::${w.base}`) || []) : [];
      const sig = signalsFor(w.path);
      const { verdict, why } = classifyWire(w, { layerName, dupInUser, inBundles, isBundleEntry, sigExists: sig.exists });
      if (typeof w.timeout === "number" && w.timeout >= TIMEOUT_MS_SUSPECT_MIN) {
        timeoutSuspects.push({ layer: layerName, event: w.event, base: w.base || w.kind, timeout: w.timeout, intendedSeconds: Math.max(1, Math.round(w.timeout / 1000)) });
      }
      rows.push({
        layer: layerName, event: w.event, matcher: w.matcher || '""', base: w.base || `(${w.kind})`,
        timeout: w.timeout, kind: w.kind, inBundles, dupMatchers: dupInUser.map((d) => d.matcher || '""'),
        blockCapable: sig.blockCapable, network: sig.network, detached: sig.detached, knobs: sig.knobs,
        verdict, why, command: w.command.slice(0, 220),
      });
    }
  }

  const summary = { generated: TODAY, mirrorMatchesUser, timeoutSuspectCount: timeoutSuspects.length, perEvent: {}, verdictCounts: {} };
  for (const r of rows) {
    summary.verdictCounts[r.verdict] = (summary.verdictCounts[r.verdict] || 0) + 1;
    const k = `${r.layer}:${r.event}`;
    summary.perEvent[k] = (summary.perEvent[k] || 0) + 1;
  }

  writeFileSync(OUT_JSON, JSON.stringify({ summary, timeoutSuspects, rows }, null, 2));

  const lines = [];
  lines.push(`# Hook-Wiring Dedupe Matrix -- ${TODAY}`, "");
  lines.push(`Mirror H:/.claude == C: user layer: **${mirrorMatchesUser}**`, "");
  lines.push(`Timeout-unit suspects (settings timeout is SECONDS per docs; these look like intended ms): **${timeoutSuspects.length}**`, "");
  lines.push(`## Verdict counts`);
  for (const [v, n] of Object.entries(summary.verdictCounts).sort((a, b) => b[1] - a[1])) lines.push(`- ${v}: **${n}**`);
  lines.push("", `## Rows needing action (non-UNIQUE_KEEP)`, "");
  lines.push(`| layer | event | matcher | hook | verdict | why |`, `|---|---|---|---|---|---|`);
  for (const r of rows.filter((x) => x.verdict !== "UNIQUE_KEEP")) {
    lines.push(`| ${r.layer} | ${r.event} | \`${r.matcher}\` | ${r.base} | ${r.verdict} | ${r.why.replace(/\|/g, "/")} |`);
  }
  lines.push("", `## Unique keeps with heavy signals (block-capable or network)`, "");
  lines.push(`| layer | event | hook | block | net | detached | knobs |`, `|---|---|---|---|---|---|---|`);
  for (const r of rows.filter((x) => x.verdict === "UNIQUE_KEEP" && (x.network || x.blockCapable))) {
    lines.push(`| ${r.layer} | ${r.event} | ${r.base} | ${r.blockCapable ? "Y" : ""} | ${r.network ? "Y" : ""} | ${r.detached ? "Y" : ""} | ${r.knobs.join(" ")} |`);
  }
  writeFileSync(OUT_MD, lines.join("\n") + "\n");
  console.log(JSON.stringify({ ok: true, out: [OUT_JSON, OUT_MD], summary }, null, 2));
}

const isCLI = process.argv[1] && (() => { try { return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); } catch { return false; } })();
if (isCLI) main();
