#!/usr/bin/env node
// Emergency unwire: remove the 25 YOLO-batch hook entries claude-6d0595bf added 2026-05-16.
// Walks settings.json hooks tree, removes any hook entry whose command path matches any
// of the 25 .mjs basenames. JSON-aware (safe vs string-replace). Preserves all other hooks.

import fs from 'node:fs';

const TARGETS = new Set([
  'bash-orphan-cleaner',
  'document-preserve-guard',
  'enforce-roadmap-closeout',
  'chat-cleanup-on-stop',
  'compact-interval-warning',
  'error-pattern-promote',
  'claudemd-ollama-enforcer',
  'cog-bridge-context-auto-compact',
  'context-priority-coordinator',
  'claude-brief-staleness-check',
  'archived-skill-suggest',
  'cross-chat-directive-detector',
  'doc-freshness-check',
  'bash-result-cache',
  'engine-digest-precheck',
  'cog-bridge-ai-memory-capture',
  'coordination-update-reminder',
  'commit-format-validator',
  'error-pattern-capture',
  'dev-outcome-tracker',
  'compaction-survival-auto',
  'embed-vault-on-save',
  'dispatcher-digest-regen',
  'error-pattern-learner',
  'claudemd-section-update',
]);

function hookMatches(h) {
  if (!h || typeof h.command !== 'string') return false;
  for (const t of TARGETS) {
    if (h.command.includes(`/${t}.mjs`) || h.command.endsWith(`/${t}.mjs`)) return true;
  }
  return false;
}

function unwire(settingsPath) {
  const raw = fs.readFileSync(settingsPath, 'utf8');
  const json = JSON.parse(raw);
  let removed = 0;
  if (json.hooks) {
    for (const event of Object.keys(json.hooks)) {
      const groups = json.hooks[event];
      if (!Array.isArray(groups)) continue;
      for (const group of groups) {
        if (!Array.isArray(group.hooks)) continue;
        const before = group.hooks.length;
        group.hooks = group.hooks.filter(h => !hookMatches(h));
        removed += before - group.hooks.length;
      }
    }
  }
  if (removed > 0) {
    fs.writeFileSync(settingsPath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }
  return removed;
}

const paths = ['C:/Users/wompu/.claude/settings.json', 'H:/.claude/settings.json'];
for (const p of paths) {
  const n = unwire(p);
  console.log(`${p}: removed ${n} hook entries`);
}
