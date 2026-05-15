#!/usr/bin/env node
// tier: T1
/**
 * search-router-hook.mjs — PreToolUse Grep|Glob
 *
 * Intercepts search operations and checks PRISM_KEYWORD_ROUTES.json + MASTER_INDEX_COMPACT.md
 * for known patterns. If a match is found, injects additionalContext with exact file paths,
 * dispatcher actions, and skills — eliminating the need for broad filesystem scans.
 *
 * ROI: Each intercepted search saves ~200-500 tokens of Grep/Glob output.
 * Over a session with 30-50 searches, that's 6K-25K tokens saved.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * R7-ORPHANED (claude-a2b1b5ca, 2026-05-14):
 *
 * This hook is NOT wired in any settings.json (C:, H:, or project), NOT in
 * any bundle, and has NO live importers in the main tree. It has been
 * functionally dead since at least 2026-05-12. SUPERSEDED by the dynamic
 * MasterIndexEngine (mcp-server/src/engines/MasterIndexEngine.ts) which
 * ships 4 wired surfaces:
 *   - action `prism_session:master_index_query`
 *   - skill `/master-index <query>`
 *   - hook `master-index-precheck-inject.mjs` (UserPromptSubmit T2, wired
 *     2026-05-14 — orphan-rescue companion to this annotation)
 *   - engine singleton `masterIndexEngine` (TypeScript imports)
 *
 * Per Karpathy R7 (CLAUDE.md): "Two existing patterns contradict → pick
 * the more recent / more tested one, say why, flag the other for cleanup."
 * The MasterIndexEngine is more recent (2026-05-12 ship), more tested
 * (26 real-value tests), and the graph-based approach scales to all 110K
 * system-graph nodes versus the static ~1.8KB MASTER_INDEX_COMPACT.md
 * cheat-sheet this hook reads. The .md cheat-sheet itself is COMPLEMENTARY
 * (human-readable digest) and survives — it's only the keyword-routing
 * hook that's superseded.
 *
 * DO NOT delete (per the never-delete-only-disable rule). DO NOT re-wire
 * without first checking master-index parity. Future cleanup: rename to
 * .archive.<date> after a quiescence window or fold into the engine if a
 * static keyword-route layer turns out to be genuinely needed.
 * ───────────────────────────────────────────────────────────────────────────
 */
import * as fs from 'fs';

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch { return ""; }
}

const ROUTES_PATH = 'H:/prism/mcp-server/data/docs/PRISM_KEYWORD_ROUTES.json';
const MASTER_INDEX_PATH = 'H:/prism/mcp-server/data/docs/MASTER_INDEX_COMPACT.md';

let routes = null;
let masterIndex = null;

// Load routes (cached after first call)
function loadRoutes() {
  if (routes) return routes;
  try {
    const data = JSON.parse(fs.readFileSync(ROUTES_PATH, 'utf-8'));
    routes = data.routes;
    return routes;
  } catch {
    return null;
  }
}

// Load master index summary (cached)
function loadMasterIndex() {
  if (masterIndex) return masterIndex;
  try {
    masterIndex = fs.readFileSync(MASTER_INDEX_PATH, 'utf-8');
    return masterIndex;
  } catch {
    return null;
  }
}

// Extract search pattern from tool input
function getSearchPattern(input) {
  // Grep: pattern field
  if (input.tool_input?.pattern) return input.tool_input.pattern.toLowerCase();
  // Glob: use pattern but extract meaningful part (strip wildcards)
  if (input.tool_input?.glob) return input.tool_input.glob.replace(/[*?{}]/g, ' ').toLowerCase().trim();
  return '';
}

// Match search pattern against keyword routes
function findMatches(pattern, routes) {
  const matches = [];
  // Strip regex special chars safely (avoid character class issues)
  const patternLower = pattern.toLowerCase().replace(/\\/g, '').replace(/[.*+?^${}()|/]/g, ' ').replace(/\[/g, '').replace(/\]/g, '').trim();

  for (const [keyword, route] of Object.entries(routes)) {
    // Check if search pattern contains the keyword
    const keywordWords = keyword.split(' ');
    const patternContainsKeyword = keywordWords.every(w => patternLower.includes(w));
    // Or if keyword contains the search pattern (for short searches)
    const keywordContainsPattern = patternLower.length >= 3 && keyword.includes(patternLower);

    if (patternContainsKeyword || keywordContainsPattern) {
      matches.push({ keyword, ...route });
    }
  }

  // Sort by relevance — exact matches first, then partial
  return matches.sort((a, b) => {
    const aExact = a.keyword === patternLower ? 1 : 0;
    const bExact = b.keyword === patternLower ? 1 : 0;
    return bExact - aExact;
  }).slice(0, 3); // Top 3 matches
}

// Format matches as context
function formatContext(matches, pattern) {
  if (matches.length === 0) return null;

  const lines = [`SEARCH ROUTER: "${pattern}" matched ${matches.length} known route(s):`];

  for (const m of matches) {
    lines.push(`  [${m.keyword}] ${m.description}`);
    if (m.files?.length) lines.push(`    Files: ${m.files.join(', ')}`);
    if (m.actions?.length) lines.push(`    Actions: ${m.actions.join(', ')}`);
    if (m.skills?.length) lines.push(`    Skills: ${m.skills.join(', ')}`);
  }

  lines.push('Consider reading these files directly instead of scanning.');
  return lines.join('\n');
}

// Main
const _raw = readStdinSafe();
if (!_raw) { console.log(JSON.stringify({ continue: true })); process.exit(0); }
try {
  const input = JSON.parse(_raw);
  const pattern = getSearchPattern(input);

  if (!pattern || pattern.length < 3) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const routeMap = loadRoutes();
  if (!routeMap) {
    console.log(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const matches = findMatches(pattern, routeMap);

  if (matches.length > 0) {
    const context = formatContext(matches, pattern);
    console.log(JSON.stringify({
      continue: true,
      additionalContext: context
    }));
  } else {
    // No keyword match — still allow the search but suggest index-first approach
    console.log(JSON.stringify({ continue: true }));
  }
} catch (err) {
  // Never block on hook failure
  console.log(JSON.stringify({ continue: true }));
}
