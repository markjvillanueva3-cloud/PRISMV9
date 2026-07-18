#!/usr/bin/env node
// apply-ups-core-fold.mjs -- HARNESS-EFFICIENCY-MS0 Phase 2 transform (2026-07-02).
// Folds the UserPromptSubmit standalone advisory injectors into bundles/ups-core-bundle.mjs:
//   - C: user layer: remove the 60 folded standalones, add ONE ups-core-bundle entry (45s).
//   - project layer: remove 7 identical-string dups of folded C: hooks (they would become
//     live double-runs once the C: copies fold) + 15 project-unique injectors now in the
//     bundle. Leaves session-id-pin (deduped with the surviving C: standalone).
// Every removal is coverage-proven against the bundle's REAL SUB_HOOKS list (path lines).
// Fail-loud: exact-count spec, no partial writes, checkpoints, C:->H:/.claude mirror sync.
// Modes: --dry-run (default) / --apply.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const USER_C = "C:/Users/wompu/.claude/settings.json";
const MIRROR_H = "H:/.claude/settings.json";
const PROJECT = "H:/prism/.claude/settings.json";
const BUNDLE = "H:/prism/.claude/hooks/bundles/ups-core-bundle.mjs";
const STAMP = "2026-07-02-pre-ups-core";
const BUNDLE_ENTRY = {
  type: "command",
  command: '"H:/.claude/bin/portable-node" H:/prism/.claude/hooks/bundles/ups-core-bundle.mjs',
  timeout: 45,
};

const FOLD_USER_C = [
  "checkin-args-surface.mjs", "skill-auto-trigger.mjs", "close-out-audit-suggest.mjs",
  "obsidian-vault-precheck-inject.mjs", "prompt-context-inject.mjs", "fleet-work-digest-inject.mjs",
  "cag-router-inject.mjs", "master-index-precheck-inject.mjs", "synergy-definition-inject.mjs",
  "task-start-substrate-inject.mjs", "auto-fix-blackwell-doctrine-inject.mjs", "ollama-nav-enforce-inject.mjs",
  "ollama-pipeline-injector.mjs", "model-tier-advisor.mjs", "ollama-prewarm-on-pipeline.mjs",
  "node-card-prefetch-inject.mjs", "agent-handoff-canonicalize.mjs", "memory-rag-inject.mjs",
  "search-thoroughness-inject.mjs", "tribal-by-domain-inject.mjs", "path-replay-advise.mjs",
  "mcp-connectivity-check.mjs", "node-capability-inject.mjs", "memory-index-precheck-inject.mjs",
  "token-awareness-sidecar.mjs", "token-awareness-inject.mjs", "audit-viz-first-inject.mjs",
  "ensure-index-daemon-guardian.mjs", "slot-domain-awareness-inject.mjs", "domain-soul-agent-suggest.mjs",
  "slot-soul-inject.mjs", "galaxy-claudemd-inject.mjs", "slot-brief-inject.mjs",
  "slot-context-bundle-inject.mjs", "ai-synergy-awareness-inject.mjs", "zulu-advisory-inject.mjs",
  "zulu-build-pointer-inject.mjs", "psn-tag-parser-inject.mjs", "session-reorient-inject.mjs",
  "stale-state-warn.mjs", "rtk-savings-headline-inject.mjs", "local-compute-intent.mjs",
  "comprehensive-build-enforce.mjs", "all-means-all-inject.mjs", "token-budget-gate.mjs",
  "critical-memory-compact-nudge.mjs", "fleet-survival-advisory.mjs", "auto-consensus-userprompt.mjs",
  "auto-fanout-advisory.mjs", "loop-iteration-inject.mjs", "pick-prefresh-inject.mjs",
  "goal-prereq-inject.mjs", "heartbeat-keepalive.mjs", "slot-session-sidecar-heartbeat.mjs",
  "golf-slot-reaper-guardian.mjs", "active-chat-priority-boost.mjs", "psn-leg-state-inject.mjs",
  "psn-prompt-checklist-inject.mjs", "mcp-broadcast-reconnect-inject.mjs", "prompt-route-inject.mjs",
];
const FOLD_PROJECT = [
  // identical-string dups of folded C: hooks (would become live double-runs post-fold)
  "prompt-context-inject.mjs", "session-reorient-inject.mjs", "stale-state-warn.mjs",
  "local-compute-intent.mjs", "comprehensive-build-enforce.mjs", "token-budget-gate.mjs",
  "auto-consensus-userprompt.mjs",
  // project-unique injectors now members of ups-core-bundle
  "ollama-auto-router.mjs", "prompt-rewriter-ollama.mjs", "ollama-task-offloader.mjs",
  "archived-skill-suggest.mjs", "wiki-precheck-inject.mjs", "chat-bus-inject.mjs",
  "ai-feature-recommend.mjs", "discipline-expert-inject.mjs", "auto-precompact-watchdog.mjs",
  "claudemd-ollama-enforcer.mjs", "prompt-rules-inject.mjs", "optimal-context-inject.mjs",
  "quality-dashboard-inject.mjs", "self-awareness-enforce.mjs", "goal-stack-inject.mjs",
];

function baseOf(cmd) {
  let s = String(cmd || "").trim();
  while (/^[A-Z_][A-Z0-9_]*=\S+\s+/.test(s)) s = s.replace(/^[A-Z_][A-Z0-9_]*=\S+\s+/, "");
  const toks = [];
  for (const m of s.matchAll(/"([^"]*)"|(\S+)/g)) toks.push(m[1] ?? m[2]);
  let i = 0;
  const r0 = (toks[0] || "").toLowerCase();
  if (r0.endsWith("portable-node") || r0 === "node" || r0.endsWith("/node.exe")) i = 1;
  if (toks[i] === "-e") return null;
  const p = (toks[i] || "").replace(/\\/g, "/");
  return p ? p.slice(p.lastIndexOf("/") + 1).toLowerCase() : null;
}

function bundleMembers() {
  const src = readFileSync(BUNDLE, "utf-8");
  const out = new Set();
  for (const line of src.split("\n")) {
    const m = line.match(/^\s*\{?\s*"?path"?\s*:\s*[`"']([^`"']+\.mjs)/);
    if (m) out.add(m[1].replace(/\\/g, "/").split("/").pop().toLowerCase());
  }
  return out;
}

function upsGroups(settings) {
  return (settings.hooks?.UserPromptSubmit || []).filter((g) => Array.isArray(g?.hooks));
}

function removeFromUps(settings, names, label) {
  const want = new Map(names.map((n) => [n.toLowerCase(), 0]));
  for (const g of upsGroups(settings)) {
    for (let i = g.hooks.length - 1; i >= 0; i--) {
      const b = baseOf(g.hooks[i]?.command);
      if (b && want.has(b)) { g.hooks.splice(i, 1); want.set(b, want.get(b) + 1); }
    }
  }
  const misses = [...want.entries()].filter(([, n]) => n !== 1);
  if (misses.length) throw new Error(`SPEC MISMATCH [${label}] (expected exactly 1 removal each): ${misses.map(([k, n]) => `${k}=${n}`).join(", ")} -- aborting`);
  return names.length;
}

function main() {
  const userC = JSON.parse(readFileSync(USER_C, "utf-8"));
  const project = JSON.parse(readFileSync(PROJECT, "utf-8"));
  const members = bundleMembers();
  if (members.size !== 75) throw new Error(`bundle SUB_HOOKS expected 75 members, parsed ${members.size}`);

  // coverage precheck: every fold name must be a real bundle member
  for (const n of [...FOLD_USER_C, ...FOLD_PROJECT]) {
    if (!members.has(n.toLowerCase())) throw new Error(`fold candidate NOT in bundle SUB_HOOKS: ${n}`);
  }
  // path-existence precheck for every bundle member is covered by the bundle's test file.

  const removedC = removeFromUps(userC, FOLD_USER_C, "userC");
  const removedP = removeFromUps(project, FOLD_PROJECT, "project");

  // insert the bundle entry once, into the C: main "" group (after ups-domain-bundle)
  const mainGroup = upsGroups(userC).find((g) => (g.matcher ?? "") === "" &&
    g.hooks.some((h) => String(h.command).includes("bundles/ups-domain-bundle.mjs")));
  if (!mainGroup) throw new Error("could not find C: UPS group containing ups-domain-bundle -- aborting");
  if (mainGroup.hooks.some((h) => String(h.command).includes("ups-core-bundle.mjs"))) {
    throw new Error("ups-core-bundle already wired -- aborting (idempotence guard)");
  }
  const idx = mainGroup.hooks.findIndex((h) => String(h.command).includes("bundles/ups-domain-bundle.mjs"));
  mainGroup.hooks.splice(idx + 1, 0, BUNDLE_ENTRY);

  const upsCount = (s) => upsGroups(s).reduce((n, g) => n + g.hooks.length, 0);
  const report = {
    apply: APPLY,
    removed: { userC: removedC, project: removedP },
    upsEntriesAfter: { userC: upsCount(userC), project: upsCount(project) },
    added: "ups-core-bundle.mjs (timeout 45s) after ups-domain-bundle in C: main group",
  };

  if (APPLY) {
    copyFileSync(USER_C, `${USER_C}.checkpoint-${STAMP}.json`);
    copyFileSync(PROJECT, `${PROJECT}.checkpoint-${STAMP}.json`);
    writeFileSync(USER_C, JSON.stringify(userC, null, 2) + "\n");
    writeFileSync(PROJECT, JSON.stringify(project, null, 2) + "\n");
    JSON.parse(readFileSync(USER_C, "utf-8"));
    JSON.parse(readFileSync(PROJECT, "utf-8"));
    copyFileSync(MIRROR_H, `${MIRROR_H}.checkpoint-${STAMP}.json`);
    copyFileSync(USER_C, MIRROR_H);
    if (readFileSync(USER_C, "utf-8") !== readFileSync(MIRROR_H, "utf-8")) throw new Error("MIRROR VERIFY FAIL");
    report.mirrorSynced = true;
  }
  console.log(JSON.stringify(report, null, 2));
}

main();
