#!/usr/bin/env node
// tier: T4
/**
 * Skill Utilization Index — SessionStart Hook
 *
 * Builds and maintains an index of ALL 300+ skills with:
 * - Trigger patterns extracted from skill descriptions
 * - Usage tracking to identify underutilized skills
 * - Context-aware suggestions
 *
 * This ensures no skill goes unused when it could help.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';

const SKILL_DIRS = [
  'H:/.claude/commands',
  'H:/prism/.claude/commands'
];
const INDEX_PATH = 'H:/prism/mcp-server/data/state/skill-utilization-index.json';
const USAGE_PATH = 'H:/prism/mcp-server/data/state/skill-usage-stats.json';

// ============================================================================
// SKILL EXTRACTION
// ============================================================================

function extractSkillMetadata(filePath) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const name = basename(filePath, '.md');

    // Extract title and description from first line
    const titleMatch = content.match(/^#\s+([^—\n]+)(?:\s*—\s*(.+))?$/m);
    const title = titleMatch ? titleMatch[1].trim() : name;
    const description = titleMatch && titleMatch[2] ? titleMatch[2].trim() : '';

    // Extract args section
    const argsMatch = content.match(/##\s*Args?:?\s*\$?ARGUMENTS?\s*([\s\S]*?)(?=##|$)/i);
    const argsSection = argsMatch ? argsMatch[1] : '';

    // Extract keywords from title, description, and args
    const keywords = new Set();

    // From title
    title.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 3) keywords.add(w);
    });

    // From description
    description.toLowerCase().split(/\s+/).forEach(w => {
      if (w.length > 3) keywords.add(w);
    });

    // Domain detection
    const domains = [];
    if (/lathe|turning|okuma/i.test(content)) domains.push('lathe');
    if (/mill|milling|haas|hurco/i.test(content)) domains.push('mill');
    if (/edm|wire.*edm|wedm|sinker/i.test(content)) domains.push('edm');
    if (/speed|feed|sfm|rpm/i.test(content)) domains.push('speed_feed');
    if (/tool|insert|holder/i.test(content)) domains.push('tooling');
    if (/material|steel|aluminum/i.test(content)) domains.push('material');
    if (/quote|cost|estimate|pricing/i.test(content)) domains.push('business');
    if (/safety|guard|collision/i.test(content)) domains.push('safety');
    if (/forge|create|build|engine/i.test(content)) domains.push('development');
    if (/roadmap|milestone|task/i.test(content)) domains.push('project');
    if (/pdf|video|learn|knowledge/i.test(content)) domains.push('learning');
    if (/post|gcode|macro/i.test(content)) domains.push('post_processing');
    if (/5.*axis|multi.*axis/i.test(content)) domains.push('5axis');
    if (/simulate|simulation/i.test(content)) domains.push('simulation');

    return {
      name,
      title,
      description,
      keywords: Array.from(keywords),
      domains,
      path: filePath,
      hasArgs: argsSection.length > 50
    };
  } catch {
    return null;
  }
}

function buildSkillIndex() {
  const skills = [];

  for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) continue;

    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const metadata = extractSkillMetadata(join(dir, file));
        if (metadata) skills.push(metadata);
      }
    } catch { /* skip */ }
  }

  return skills;
}

// ============================================================================
// CATEGORIZATION
// ============================================================================

const CATEGORY_MAP = {
  learning: ['pdf-learn', 'video-learn', 'shop-knowledge', 'ingest', 'resource-harvest'],
  development: ['forge-triple', 'forge-engine', 'dedup', 'scrutinize', 'de-sloppify', 'addtomatrix'],
  machine_specific: ['lathe-studio', 'wire-edm-studio', 'machine-harden', 'controller-enrich'],
  speed_feed: ['auto-speed-feed', 'auto-speed-feed-lathe', 'speed-feed', 'drill-calc', 'cycle-time-crush'],
  business: ['quote-to-ship', 'job-cost', 'bid-to-win', 'cost-optimize', 'biz-health'],
  verification: ['formula-check', 'verify-loop', 'check-dsl', 'dfm-check', 'physics-verify'],
  post_processing: ['macro-convert', 'pp-resolve', 'post-debug'],
  project: ['continue-roadmap', 'rgs', 'milestone', 'generate-roadmap'],
  search: ['desk-search', 'action-search', 'memory-search', 'code-index'],
  awareness: ['aware', 'context', 'capabilities', 'counts', 'digest-all'],
  simulation: ['cnc-simulate', 'virtual-run'],
  tooling: ['tool-select', 'tooling', 'tool-inventory'],
  material: ['material-lookup', 'material-stock'],
  shop_floor: ['shop-schedule', 'traveler', 'shop-live-status', 'my-shop']
};

function categorizeSkills(skills) {
  const categorized = {};

  for (const [category, patterns] of Object.entries(CATEGORY_MAP)) {
    categorized[category] = skills.filter(s =>
      patterns.some(p => s.name.includes(p) || s.keywords.some(k => k.includes(p)))
    ).map(s => s.name);
  }

  // Uncategorized
  const allCategorized = new Set(Object.values(categorized).flat());
  categorized.other = skills
    .filter(s => !allCategorized.has(s.name))
    .map(s => s.name);

  return categorized;
}

// ============================================================================
// USAGE ANALYSIS
// ============================================================================

function loadUsageStats() {
  try {
    if (existsSync(USAGE_PATH)) {
      return JSON.parse(readFileSync(USAGE_PATH, 'utf8'));
    }
  } catch { /* ignore */ }
  return { usageCounts: {}, lastUsed: {}, recommendations: [] };
}

function findUnderutilizedSkills(skills, usage) {
  const usageCounts = usage.usageCounts || {};

  // Skills with 0 or very low usage
  const underutilized = skills
    .filter(s => (usageCounts[s.name] || 0) < 2)
    .filter(s => s.domains.length > 0) // Has detected domains = likely useful
    .slice(0, 10);

  return underutilized;
}

// ============================================================================
// MAIN
// ============================================================================

const skills = buildSkillIndex();
const categorized = categorizeSkills(skills);
const usage = loadUsageStats();
const underutilized = findUnderutilizedSkills(skills, usage);

// Save index
try {
  const dir = dirname(INDEX_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(INDEX_PATH, JSON.stringify({
    generated: new Date().toISOString(),
    totalSkills: skills.length,
    skills: skills.map(s => ({ name: s.name, domains: s.domains, keywords: s.keywords.slice(0, 5) })),
    categories: categorized,
    underutilized: underutilized.map(s => s.name)
  }, null, 2));
} catch { /* ignore */ }

// Generate output
const parts = [];
parts.push(`## Skill Inventory: ${skills.length} available`);

// Category summary
const topCategories = Object.entries(categorized)
  .filter(([k]) => k !== 'other')
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 5);

parts.push('**Key Categories**: ' + topCategories.map(([k, v]) => `${k}(${v.length})`).join(', '));

// Underutilized suggestions
if (underutilized.length > 0) {
  parts.push('');
  parts.push('**Underutilized Skills** (try these):');
  for (const skill of underutilized.slice(0, 5)) {
    parts.push(`  - /${skill.name} — ${skill.description || skill.title}`);
  }
}

console.log(JSON.stringify({
  continue: true,
  additionalContext: parts.join('\n')
}));
