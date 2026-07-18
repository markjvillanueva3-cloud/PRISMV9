#!/usr/bin/env node
// Hook audit: catalog wired vs unwired, classify by function/tier/event, surface
// redundancy and gaps. Pure analysis — emits structured JSON for reasoning.

import fs from 'node:fs';
import path from 'node:path';

const SETTINGS = ['C:/Users/wompu/.claude/settings.json', 'H:/.claude/settings.json'];
const HOOKS_DIR = 'H:/prism/.claude/hooks';
const BUNDLES_DIR = 'H:/prism/.claude/hooks/bundles';

// ── 1. Collect wired entries from settings.json (canonical = C:)
const settings = JSON.parse(fs.readFileSync(SETTINGS[0], 'utf8'));
const wiredEntries = [];
for (const [event, groups] of Object.entries(settings.hooks || {})) {
  for (const group of groups) {
    const matcher = group.matcher || '';
    for (const h of (group.hooks || [])) {
      const cmd = h.command || '';
      const m = cmd.match(/([\w-]+)\.mjs/);
      if (m) {
        wiredEntries.push({
          event,
          matcher,
          hook: m[1],
          timeout: h.timeout ?? null,
          cmd: cmd.slice(0, 200),
        });
      }
    }
  }
}

// ── 2. Collect hooks referenced by bundles
const bundleRefs = new Map(); // bundle -> [childHooks]
if (fs.existsSync(BUNDLES_DIR)) {
  for (const bf of fs.readdirSync(BUNDLES_DIR)) {
    if (!bf.endsWith('.mjs')) continue;
    const txt = fs.readFileSync(path.join(BUNDLES_DIR, bf), 'utf8');
    const refs = new Set();
    const matches = txt.match(/[\w-]+\.mjs/g) || [];
    for (const m of matches) {
      const name = m.replace('.mjs', '');
      if (name !== bf.replace('.mjs', '')) refs.add(name);
    }
    bundleRefs.set(bf.replace('.mjs', ''), [...refs]);
  }
}

// ── 3. Collect hooks dispatched by other hooks (routers, etc)
const routerDispatched = new Set();
const hooksFiles = fs.readdirSync(HOOKS_DIR).filter(f => f.endsWith('.mjs'));
for (const h of hooksFiles) {
  const txt = fs.readFileSync(path.join(HOOKS_DIR, h), 'utf8');
  const matches = txt.match(/[\w-]+\.mjs/g) || [];
  for (const m of matches) {
    const name = m.replace('.mjs', '');
    if (name !== h.replace('.mjs', '')) routerDispatched.add(name);
  }
}

// ── 4. Classify wired hooks by function (heuristic on hook name)
function classifyFunction(name) {
  const n = name.toLowerCase();
  if (/cleanup|reaper|orphan|janitor|killer|prune|gc/.test(n)) return 'cleanup';
  if (/guard|gate|block|enforce|deny|allow|verify/.test(n)) return 'safety-gate';
  if (/inject|surface|hint|advisory|reminder|warn|nudge/.test(n)) return 'advisory-inject';
  if (/track|capture|log|store|persist|telemetry|outcome|stats|counter/.test(n)) return 'telemetry';
  if (/sync|mirror|drift|fresh|regen|update|stale/.test(n)) return 'sync-maintain';
  if (/route|dispatch|router|forward|relay/.test(n)) return 'router';
  if (/cache|prewarm|pre-warm|memoize/.test(n)) return 'cache';
  if (/ollama|qdrant|nim|embed|local-/.test(n)) return 'local-ai';
  if (/coord|chat|slot|peer|heartbeat|claim|share|broadcast/.test(n)) return 'coordination';
  if (/compact|context|budget|token|trim/.test(n)) return 'context-mgmt';
  if (/health|check|validate|smoke|audit/.test(n)) return 'health-check';
  if (/scrutiny|review|consensus|analyst/.test(n)) return 'review-gate';
  if (/error|fail|retry|fallback/.test(n)) return 'error-handling';
  if (/learn|memory|capture|pattern/.test(n)) return 'learning-loop';
  if (/handoff|resume|continuity|session/.test(n)) return 'session-state';
  return 'other';
}

const wiredByFunction = {};
const wiredByEvent = {};
for (const e of wiredEntries) {
  const fn = classifyFunction(e.hook);
  (wiredByFunction[fn] ??= []).push({ event: e.event, hook: e.hook, matcher: e.matcher, timeout: e.timeout });
  (wiredByEvent[e.event] ??= []).push({ matcher: e.matcher, hook: e.hook });
}

// ── 5. Per-event redundancy probe: count by function within event
const eventFunctionMatrix = {};
for (const [event, entries] of Object.entries(wiredByEvent)) {
  const byFn = {};
  for (const e of entries) {
    const fn = classifyFunction(e.hook);
    (byFn[fn] ??= []).push(e.hook);
  }
  eventFunctionMatrix[event] = byFn;
}

// ── 6. Unwired hooks (= on disk, not in settings, not in bundles, not router-called)
const allOnDisk = hooksFiles.map(f => f.replace('.mjs', ''));
const wiredNames = new Set(wiredEntries.map(e => e.hook));
const bundleChildrenAll = new Set();
for (const children of bundleRefs.values()) for (const c of children) bundleChildrenAll.add(c);

const trulyOrphan = allOnDisk.filter(n =>
  !wiredNames.has(n) &&
  !bundleChildrenAll.has(n) &&
  !routerDispatched.has(n) &&
  !n.startsWith('_') &&
  !n.endsWith('.test')
);

const orphanByFunction = {};
for (const n of trulyOrphan) {
  const fn = classifyFunction(n);
  (orphanByFunction[fn] ??= []).push(n);
}

// ── 7. Same-event hook counts (load per event)
const eventLoad = {};
for (const e of wiredEntries) {
  eventLoad[e.event] = (eventLoad[e.event] || 0) + 1;
}

// ── 8. Total timeout per event (worst-case serial fire load)
const eventTimeoutBudget = {};
for (const e of wiredEntries) {
  eventTimeoutBudget[e.event] = (eventTimeoutBudget[e.event] || 0) + (e.timeout || 0);
}

// ── EMIT
const report = {
  summary: {
    totalSourceHooks: allOnDisk.length,
    wiredInSettings: wiredEntries.length,
    bundleChildren: bundleChildrenAll.size,
    routerDispatched: routerDispatched.size,
    trulyOrphan: trulyOrphan.length,
  },
  eventLoad,
  eventTimeoutBudgetMs: eventTimeoutBudget,
  wiredCountByFunction: Object.fromEntries(
    Object.entries(wiredByFunction).map(([k, v]) => [k, v.length])
  ),
  orphanCountByFunction: Object.fromEntries(
    Object.entries(orphanByFunction).map(([k, v]) => [k, v.length])
  ),
  eventFunctionMatrix,
  wiredByFunction,
  orphanTopByFunction: Object.fromEntries(
    Object.entries(orphanByFunction).map(([k, v]) => [k, v.slice(0, 10)])
  ),
};

console.log(JSON.stringify(report, null, 2));
