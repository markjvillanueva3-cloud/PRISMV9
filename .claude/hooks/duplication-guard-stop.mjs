#!/usr/bin/env node
// tier: T4
/**
 * duplication-guard-stop.mjs — Stop hook
 *
 * On session end:
 * 1. Scans for new assets created this session
 * 2. Adds them to cross-session-asset-registry.json
 * 3. Warns if assets were created without dedup check
 *
 * This ensures other Claude sessions see what was built.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, basename } from 'path';

const PRISM_ROOT = 'H:/prism';
const REGISTRY_PATH = resolve(PRISM_ROOT, 'mcp-server/data/state/cross-session-asset-registry.json');
const SESSION_START_FILE = resolve(PRISM_ROOT, 'mcp-server/data/state/.session-start-time');
const ENGINES_DIR = resolve(PRISM_ROOT, 'mcp-server/src/engines');
const HOOKS_DIR = resolve(PRISM_ROOT, '.claude/hooks');
const SKILLS_DIR = resolve(PRISM_ROOT, '.claude/commands');

// Outer hook timeout is 3000ms; guarantee we exit well before that.
const DEADLINE_MS = 2500;
const startMs = Date.now();
const timeLeft = () => DEADLINE_MS - (Date.now() - startMs);

function getSessionStartTime() {
  try {
    if (existsSync(SESSION_START_FILE)) {
      return new Date(readFileSync(SESSION_START_FILE, 'utf8').trim());
    }
  } catch {}
  // Default: 2 hours ago (conservative)
  return new Date(Date.now() - 2 * 60 * 60 * 1000);
}

function getNewFiles(dir, extension, since) {
  const newFiles = [];
  try {
    if (!existsSync(dir)) return newFiles;
    const files = readdirSync(dir).filter(f => f.endsWith(extension));
    for (const file of files) {
      const fullPath = resolve(dir, file);
      const stat = statSync(fullPath);
      if (stat.mtime > since) {
        newFiles.push({
          name: basename(file).replace(/\.(ts|mjs|js|md)$/, ''),
          path: fullPath.replace(PRISM_ROOT + '/', '').replace(/\\/g, '/'),
          mtime: stat.mtime.toISOString()
        });
      }
    }
  } catch {}
  return newFiles;
}

function loadRegistry() {
  try {
    if (existsSync(REGISTRY_PATH)) {
      return JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
    }
  } catch {}
  return {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    assets: { engines: {}, hooks: {}, actions: {}, skills: {} },
    recentBuilds: []
  };
}

function saveRegistry(registry) {
  registry.lastUpdated = new Date().toISOString();
  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

function getSessionId() {
  return process.env.CLAUDE_SESSION_ID ||
         process.env.TERM_SESSION_ID ||
         `session-${Date.now()}`;
}

async function main() {
  const sessionStart = getSessionStartTime();
  const sessionId = getSessionId();

  // Find new assets created since session start
  const newEngines = getNewFiles(ENGINES_DIR, '.ts', sessionStart)
    .filter(f => !f.name.endsWith('.test'));
  const newHooks = getNewFiles(HOOKS_DIR, '.mjs', sessionStart);
  const newSkills = getNewFiles(SKILLS_DIR, '.md', sessionStart);

  const totalNew = newEngines.length + newHooks.length + newSkills.length;

  if (totalNew === 0) {
    console.log(JSON.stringify({ continue: true, systemMessage: 'No new assets created this session' }));
    return;
  }

  // Registry I/O can be slow on the multi-MB JSON; bail near the deadline.
  if (timeLeft() < 800) {
    console.log(JSON.stringify({ continue: true, systemMessage: `deferred registry update (${totalNew} new assets)` }));
    return;
  }

  // Load and update registry
  const registry = loadRegistry();
  const buildRecord = {
    sessionId,
    timestamp: new Date().toISOString(),
    engines: [],
    hooks: [],
    skills: []
  };

  // Add new engines
  for (const engine of newEngines) {
    if (!(engine.name in registry.assets.engines)) {
      registry.assets.engines[engine.name] = {
        path: engine.path,
        addedAt: engine.mtime,
        addedBy: sessionId
      };
      buildRecord.engines.push(engine.name);
    }
  }

  // Add new hooks
  for (const hook of newHooks) {
    if (!(hook.name in registry.assets.hooks)) {
      registry.assets.hooks[hook.name] = {
        path: hook.path,
        addedAt: hook.mtime,
        addedBy: sessionId
      };
      buildRecord.hooks.push(hook.name);
    }
  }

  // Add new skills
  for (const skill of newSkills) {
    if (!(skill.name in registry.assets.skills)) {
      registry.assets.skills[skill.name] = {
        path: skill.path,
        addedAt: skill.mtime,
        addedBy: sessionId
      };
      buildRecord.skills.push(skill.name);
    }
  }

  // Add to recent builds (keep last 50)
  if (buildRecord.engines.length || buildRecord.hooks.length || buildRecord.skills.length) {
    registry.recentBuilds.unshift(buildRecord);
    registry.recentBuilds = registry.recentBuilds.slice(0, 50);
  }

  // Update stats
  registry.stats = {
    engineCount: Object.keys(registry.assets.engines).length,
    hookCount: Object.keys(registry.assets.hooks).length,
    skillCount: Object.keys(registry.assets.skills).length,
    actionCount: Object.keys(registry.assets.actions).length
  };

  saveRegistry(registry);

  const summary = [
    buildRecord.engines.length ? `${buildRecord.engines.length} engines` : '',
    buildRecord.hooks.length ? `${buildRecord.hooks.length} hooks` : '',
    buildRecord.skills.length ? `${buildRecord.skills.length} skills` : ''
  ].filter(Boolean).join(', ');

  console.log(JSON.stringify({
    continue: true,
    systemMessage: `Cross-session registry updated: ${summary} added`
  }));
}

main().catch(err => {
  console.log(JSON.stringify({
    continue: true,
    systemMessage: `Registry update failed (advisory): ${err.message}`
  }));
});
