#!/usr/bin/env node
/**
 * populate-asset-registry.mjs
 *
 * Scans codebase and populates cross-session-asset-registry.json
 * with all existing engines, hooks, actions, and skills.
 *
 * Run: node H:/prism/.claude/helpers/populate-asset-registry.mjs
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, basename } from 'path';

const PRISM_ROOT = 'H:/prism';
const MCP_SERVER = join(PRISM_ROOT, 'mcp-server');
const REGISTRY_PATH = join(MCP_SERVER, 'data/state/cross-session-asset-registry.json');

function getEngines() {
  const enginesDir = join(MCP_SERVER, 'src/engines');
  const engines = {};

  try {
    const files = readdirSync(enginesDir).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    for (const file of files) {
      const name = basename(file, '.ts');
      engines[name] = {
        path: `src/engines/${file}`,
        addedAt: new Date().toISOString(),
        addedBy: 'registry-populate'
      };
    }
  } catch (e) {
    console.error('Error reading engines:', e.message);
  }

  return engines;
}

function getHooks() {
  const hooksDir = join(PRISM_ROOT, '.claude/hooks');
  const hooks = {};

  try {
    const files = readdirSync(hooksDir).filter(f => f.endsWith('.mjs') || f.endsWith('.js'));
    for (const file of files) {
      const name = basename(file).replace(/\.(mjs|js)$/, '');
      hooks[name] = {
        path: `.claude/hooks/${file}`,
        addedAt: new Date().toISOString(),
        addedBy: 'registry-populate'
      };
    }
  } catch (e) {
    console.error('Error reading hooks:', e.message);
  }

  return hooks;
}

function getSkills() {
  const skillsDir = join(PRISM_ROOT, '.claude/commands');
  const skills = {};

  try {
    if (existsSync(skillsDir)) {
      const files = readdirSync(skillsDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const name = basename(file, '.md');
        skills[name] = {
          path: `.claude/commands/${file}`,
          addedAt: new Date().toISOString(),
          addedBy: 'registry-populate'
        };
      }
    }
  } catch (e) {
    console.error('Error reading skills:', e.message);
  }

  return skills;
}

function getActions() {
  const dispatchersDir = join(MCP_SERVER, 'src/tools/dispatchers');
  const actions = {};

  try {
    const files = readdirSync(dispatchersDir).filter(f => f.endsWith('.ts'));
    for (const file of files) {
      const content = readFileSync(join(dispatchersDir, file), 'utf8');
      const dispatcherName = basename(file, '.ts');

      // Extract action names from z.enum
      const enumMatch = content.match(/z\.enum\(\[([\s\S]*?)\]\)/);
      if (enumMatch) {
        const actionsList = enumMatch[1].match(/"([^"]+)"/g);
        if (actionsList) {
          for (const action of actionsList) {
            const actionName = action.replace(/"/g, '');
            actions[`${dispatcherName}:${actionName}`] = {
              dispatcher: dispatcherName,
              action: actionName,
              addedAt: new Date().toISOString(),
              addedBy: 'registry-populate'
            };
          }
        }
      }
    }
  } catch (e) {
    console.error('Error reading actions:', e.message);
  }

  return actions;
}

function main() {
  console.log('Populating cross-session asset registry...');

  const engines = getEngines();
  const hooks = getHooks();
  const skills = getSkills();
  const actions = getActions();

  const registry = {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    assets: {
      engines,
      hooks,
      actions,
      skills
    },
    recentBuilds: [],
    stats: {
      engineCount: Object.keys(engines).length,
      hookCount: Object.keys(hooks).length,
      skillCount: Object.keys(skills).length,
      actionCount: Object.keys(actions).length
    }
  };

  writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));

  console.log(`Registry populated:
  - Engines: ${registry.stats.engineCount}
  - Hooks: ${registry.stats.hookCount}
  - Skills: ${registry.stats.skillCount}
  - Actions: ${registry.stats.actionCount}

Written to: ${REGISTRY_PATH}`);
}

main().catch(() => { process.stdout.write(JSON.stringify({ continue: true })); });
