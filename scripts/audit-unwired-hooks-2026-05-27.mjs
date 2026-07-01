#!/usr/bin/env node
// Ad-hoc audit script (slot golf 2026-05-27): diff every .mjs in .claude/hooks
// against every command in every settings.json layer. Hooks on disk but not
// wired anywhere = candidate orphans (same bug class as chat-slot-heartbeat).
// One-shot; safe to delete after the operator triages the findings.

import fs from "node:fs";
import path from "node:path";

function listHooks(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (d, rel = "") => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const fp = path.join(d, e.name);
      const rp = rel ? path.join(rel, e.name) : e.name;
      if (e.isDirectory()) {
        if (e.name === "bundles" || e.name === "__tests__" || e.name === "lib") continue;
        walk(fp, rp);
      } else if (e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs")) {
        out.push({ abs: fp.replace(/\\/g, "/"), rel: rp.replace(/\\/g, "/"), name: e.name });
      }
    }
  };
  walk(dir);
  return out;
}

const projectHooks = listHooks("H:/prism/.claude/hooks");
const userHooks = listHooks("H:/.claude/hooks");
console.log("disk:", projectHooks.length, "project hooks +", userHooks.length, "user hooks");

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

const settingsFiles = [
  "C:/Users/wompu/.claude/settings.json",
  "H:/.claude/settings.json",
  "H:/prism/.claude/settings.json",
  "H:/prism/.claude/settings.local.json",
];

const wired = new Set();
const wiredByFile = {};

// Stage 1 — direct settings.json command-line refs
for (const sf of settingsFiles) {
  const j = readJson(sf);
  if (!j || !j.hooks) { wiredByFile[sf] = "(no hooks)"; continue; }
  let n = 0;
  for (const event of Object.keys(j.hooks)) {
    const arms = j.hooks[event];
    if (!Array.isArray(arms)) continue;
    for (const arm of arms) {
      if (!arm.hooks) continue;
      for (const h of arm.hooks) {
        if (!h.command || typeof h.command !== "string") continue;
        const matches = h.command.match(/\b([a-zA-Z0-9_\-]+\.mjs)\b/g);
        if (matches) {
          for (const m of matches) { wired.add(m); n++; }
        }
      }
    }
  }
  wiredByFile[sf] = n + " refs";
}

// Stage 2 — bundle files dispatch to other hooks internally. Read each
// bundle's source and pull any .mjs filename referenced. This closes the
// false-positive on hooks invoked via bundle (e.g. duplication-hard-block).
const bundleDir = "H:/prism/.claude/hooks/bundles";
let bundleRefs = 0;
if (fs.existsSync(bundleDir)) {
  for (const f of fs.readdirSync(bundleDir)) {
    if (!f.endsWith(".mjs")) continue;
    try {
      const src = fs.readFileSync(path.join(bundleDir, f), "utf-8");
      const matches = src.match(/\b([a-zA-Z0-9_\-]+\.mjs)\b/g);
      if (matches) {
        for (const m of matches) {
          if (m === f) continue; // skip self-ref
          if (!wired.has(m)) { wired.add(m); bundleRefs++; }
        }
      }
    } catch { /* skip unreadable bundle */ }
  }
}
wiredByFile["(bundles)"] = bundleRefs + " additional refs from bundle internals";

console.log("\nsettings sources:");
for (const [k, v] of Object.entries(wiredByFile)) console.log("  " + v.padEnd(12) + " " + k);
console.log("unique wired .mjs names:", wired.size);

const all = [...projectHooks, ...userHooks];
const unwired = all.filter((h) => !wired.has(h.name));
unwired.sort((a, b) => a.name.localeCompare(b.name));

// Classify each unwired by reading the first 30 lines for hints
function classify(h) {
  try {
    const text = fs.readFileSync(h.abs, "utf-8").slice(0, 3000);
    if (/disabled[\s_-]?by|@disabled|DEPRECATED\b|legacy|preserved per/i.test(text)) return "DISABLED_PRESERVED";
    if (/^\s*\/\/\s*tier:\s*T[0-3]/m.test(text)) {
      const t = text.match(/^\s*\/\/\s*tier:\s*(T[0-3])/m);
      return "TIER_" + (t ? t[1] : "?") + "_ORPHAN";
    }
    if (/export\s+function|export\s+default|export\s+const/m.test(text) && !/process\.stdout\.write|main\s*\(\)|readStdin/i.test(text)) {
      return "LIBRARY_NOT_HOOK";
    }
    if (/import\.meta\.url|main\(\)|readStdin/i.test(text)) return "EXECUTABLE_HOOK_UNWIRED";
    return "UNKNOWN";
  } catch { return "READ_ERROR"; }
}

const byClass = {};
for (const h of unwired) {
  const cls = classify(h);
  (byClass[cls] = byClass[cls] || []).push(h);
}

console.log("\nUNWIRED hooks on disk:", unwired.length, "\n");

for (const cls of Object.keys(byClass).sort()) {
  console.log("== " + cls + " (" + byClass[cls].length + ") ==");
  for (const h of byClass[cls]) {
    const src = h.abs.startsWith("H:/prism") ? "project" : "user";
    console.log("  " + h.rel.padEnd(60) + " [" + src + "]");
  }
  console.log("");
}
