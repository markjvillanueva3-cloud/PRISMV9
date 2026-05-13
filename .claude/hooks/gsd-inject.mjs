#!/usr/bin/env node
// tier: T4
/**
 * GSD Inject — SessionStart Hook
 *
 * Injects core GSD (Getting Stuff Done) protocol at session start:
 * - 6 Laws (hard rules)
 * - Critical commands
 * - System counts
 *
 * Reads from canonical source: data/docs/gsd/GSD_QUICK.md
 * Logs access to gsd_access_log.json for telemetry.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const GSD_QUICK_PATH = 'H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md';
const TELEMETRY_PATH = 'H:/prism/mcp-server/data/state/gsd_access_log.json';

// ============================================================================
// LOAD GSD
// ============================================================================

let gsdContent = '';
try {
  if (existsSync(GSD_QUICK_PATH)) {
    gsdContent = readFileSync(GSD_QUICK_PATH, 'utf8');
  }
} catch { /* ignore */ }

if (!gsdContent) {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

// ============================================================================
// EXTRACT KEY SECTIONS
// ============================================================================

function extractSection(content, startMarker, endMarker) {
  const startIdx = content.indexOf(startMarker);
  if (startIdx === -1) return null;

  const endIdx = endMarker ? content.indexOf(endMarker, startIdx + startMarker.length) : content.length;
  return content.slice(startIdx, endIdx !== -1 ? endIdx : undefined).trim();
}

// Extract header line with counts
const headerMatch = gsdContent.match(/^##\s+(\d+)\s+dispatchers.*$/m);
const countsLine = headerMatch ? headerMatch[0] : null;

// Extract 6 Laws
const lawsSection = extractSection(gsdContent, '## 6 LAWS', '## CRITICAL');

// Extract critical commands table
const commandsSection = extractSection(gsdContent, '## CRITICAL SLASH COMMANDS', '## AI SYSTEM');

// ============================================================================
// LOG TELEMETRY
// ============================================================================

let telemetry = { accesses: [], summary: {} };
try {
  if (existsSync(TELEMETRY_PATH)) {
    telemetry = JSON.parse(readFileSync(TELEMETRY_PATH, 'utf8'));
  }
} catch { /* ignore */ }

telemetry.accesses = telemetry.accesses || [];
telemetry.accesses.push({
  action: 'session_inject',
  timestamp: new Date().toISOString(),
  sections: ['counts', 'laws', 'commands']
});

// Keep only last 100 accesses
if (telemetry.accesses.length > 100) {
  telemetry.accesses = telemetry.accesses.slice(-100);
}

// Update summary
telemetry.summary = telemetry.summary || {};
telemetry.summary.session_inject = (telemetry.summary.session_inject || 0) + 1;
telemetry.lastAccess = new Date().toISOString();

try {
  const dir = dirname(TELEMETRY_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(TELEMETRY_PATH, JSON.stringify(telemetry, null, 2));
} catch { /* ignore */ }

// ============================================================================
// OUTPUT
// ============================================================================

const parts = [];
parts.push('## GSD Protocol v24.0');

if (countsLine) {
  // Extract just the numbers
  const nums = countsLine.match(/(\d+)\s+dispatchers.*?(\d+)\s+engines.*?(\d+)\s+hooks.*?(\d+)\s+skills/);
  if (nums) {
    parts.push(`Inventory: ${nums[1]} dispatchers | ${nums[2]} engines | ${nums[3]} hooks | ${nums[4]} skills`);
  }
}

// Condensed laws (one line each)
parts.push('');
parts.push('**6 Laws**: S(x)≥0.70 | No placeholders | New≥Old | MCP first | No duplicates | 100% utilization');

// Top commands
parts.push('');
parts.push('**Commands**: /pdf-learn, /video-learn, /forge-triple, /dedup, /wire-edm-studio, /lathe-studio, /smart');

console.log(JSON.stringify({
  continue: true,
      systemMessage: parts.join('\n')
    }));
