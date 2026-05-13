#!/usr/bin/env node
// tier: T4
/**
 * plugin-path-fixer.mjs — SessionStart hook
 *
 * Fixes plugin installPath mismatches when H: drive moves between PCs.
 * Rewrites paths from old user profiles to current user profile.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const INSTALLED_PLUGINS = join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

function main() {
  if (!existsSync(INSTALLED_PLUGINS)) {
    console.log('✓ No installed_plugins.json — nothing to fix');
    return;
  }

  const currentHome = homedir().replace(/\\/g, '\\\\'); // e.g. C:\\Users\\wompu
  const currentHomeNorm = homedir(); // C:\Users\wompu

  let content;
  try {
    content = readFileSync(INSTALLED_PLUGINS, 'utf8');
  } catch (e) {
    console.log(JSON.stringify({ continue: true, systemMessage: `⚠ Cannot read installed_plugins.json: ${e.message}` }));
    return;
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.log(JSON.stringify({ continue: true, systemMessage: `⚠ Invalid JSON in installed_plugins.json: ${e.message}` }));
    return;
  }

  if (!data.plugins || typeof data.plugins !== 'object') {
    console.log('✓ No plugins section — nothing to fix');
    return;
  }

  // Regex to match any C:\Users\<username>\.claude path
  const userPathRegex = /C:\\\\Users\\\\[^\\]+\\\\.claude/gi;
  const userPathRegexSingle = /C:\\Users\\[^\\]+\\\.claude/gi;

  const correctPath = `${currentHome}\\\\.claude`;
  const correctPathSingle = `${currentHomeNorm}\\.claude`;

  let fixCount = 0;
  const fixedPlugins = [];

  for (const [pluginId, entries] of Object.entries(data.plugins)) {
    if (!Array.isArray(entries)) continue;

    for (const entry of entries) {
      if (entry.installPath && typeof entry.installPath === 'string') {
        const original = entry.installPath;

        // Check if path points to a different user
        if (userPathRegexSingle.test(original) && !original.startsWith(currentHomeNorm)) {
          // Replace user path with current user
          entry.installPath = original.replace(
            /C:\\Users\\[^\\]+\\.claude/i,
            `${currentHomeNorm}\\.claude`
          );
          fixCount++;
          fixedPlugins.push(pluginId.split('@')[0]);
        }

        // Reset regex lastIndex
        userPathRegexSingle.lastIndex = 0;
      }
    }
  }

  if (fixCount === 0) {
    console.log('✓ Plugin paths already match current user');
    return;
  }

  // Write back
  try {
    writeFileSync(INSTALLED_PLUGINS, JSON.stringify(data, null, 2), 'utf8');
    console.log(JSON.stringify({ continue: true, systemMessage: `✓ Fixed ${fixCount} plugin path(s): ${fixedPlugins.slice(0, 5).join(', ')}${fixedPlugins.length > 5 ? '...' : ''}` }));
  } catch (e) {
    console.log(JSON.stringify({ continue: true, systemMessage: `⚠ Cannot write installed_plugins.json: ${e.message}` }));
  }
}

main();
