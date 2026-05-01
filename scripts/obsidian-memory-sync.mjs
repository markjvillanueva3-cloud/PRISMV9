#!/usr/bin/env node
/**
 * obsidian-memory-sync.mjs — Sync PRISM memories to Obsidian vault
 *
 * Converts PRISM memory system to Obsidian-compatible markdown:
 * 1. Reads memory files from ~/.claude/projects/H--prism/memory/
 * 2. Converts to Obsidian format with [[wikilinks]]
 * 3. Creates relationship links between related memories
 * 4. Syncs tribal knowledge tips
 *
 * Usage: node scripts/obsidian-memory-sync.mjs [--watch] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';

const MEMORY_SOURCE = 'C:/Users/wompu/.claude/projects/H--prism/memory';
const OBSIDIAN_VAULT = 'H:/prism/knowledge';
const TRIBAL_SOURCE = 'H:/prism/mcp-server/data/tribal-tips';

const quiet = process.argv.includes('--quiet');
const dryRun = process.argv.includes('--dry-run');
const log = quiet ? () => {} : console.log;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseMemoryFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return { body: content, metadata: {} };
    }

    const frontmatter = frontmatterMatch[1];
    const body = frontmatterMatch[2];

    const metadata = {};
    for (const line of frontmatter.split('\n')) {
      const match = line.match(/^(\w+):\s*(.+)/);
      if (match) {
        metadata[match[1]] = match[2];
      }
    }

    return { body, metadata };
  } catch {
    return null;
  }
}

function extractWikilinks(text) {
  // Find potential link targets: engine names, dispatcher names, concepts
  const links = [];

  // Engine references
  const engineMatches = text.match(/\b([A-Z][a-zA-Z]+Engine)\b/g) || [];
  links.push(...engineMatches.map(e => `[[engines/${e}|${e}]]`));

  // Dispatcher references
  const dispatcherMatches = text.match(/\bprism_(\w+)\b/g) || [];
  links.push(...dispatcherMatches.map(d => `[[dispatchers/${d}|${d}]]`));

  // Skill references
  const skillMatches = text.match(/\/([a-z-]+)/g) || [];
  links.push(...skillMatches.map(s => `[[skills/${s.slice(1)}|${s}]]`));

  return [...new Set(links)];
}

function convertToObsidian(parsed, sourceFile) {
  const { body, metadata } = parsed;
  const fileName = path.basename(sourceFile, '.md');

  // Build Obsidian frontmatter
  const obsidianMeta = {
    ...metadata,
    source: 'prism-memory',
    synced: new Date().toISOString(),
    aliases: [fileName],
  };

  // Extract and add wikilinks
  const links = extractWikilinks(body);

  // Build content
  let content = '---\n';
  for (const [key, value] of Object.entries(obsidianMeta)) {
    content += `${key}: ${value}\n`;
  }
  content += '---\n\n';
  content += body;

  if (links.length > 0) {
    content += '\n\n## Related\n';
    content += links.slice(0, 10).join(' • ');
  }

  return content;
}

function getTargetDir(type) {
  const typeMap = {
    user: 'memories/user',
    feedback: 'memories/feedback',
    project: 'memories/project',
    reference: 'memories/reference',
  };
  return typeMap[type] || 'memories';
}

function syncMemories() {
  log('Syncing PRISM memories to Obsidian vault...');

  if (!fs.existsSync(MEMORY_SOURCE)) {
    log('Memory source not found:', MEMORY_SOURCE);
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  const files = fs.readdirSync(MEMORY_SOURCE).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  for (const file of files) {
    const sourcePath = path.join(MEMORY_SOURCE, file);
    const parsed = parseMemoryFile(sourcePath);

    if (!parsed) {
      errors++;
      continue;
    }

    const targetDir = path.join(OBSIDIAN_VAULT, getTargetDir(parsed.metadata.type));
    ensureDir(targetDir);

    const targetPath = path.join(targetDir, file);
    const obsidianContent = convertToObsidian(parsed, sourcePath);

    if (!dryRun) {
      fs.writeFileSync(targetPath, obsidianContent);
    }

    log(`  ${dryRun ? '[DRY] ' : ''}${file} → ${getTargetDir(parsed.metadata.type)}/`);
    synced++;
  }

  return { synced, errors };
}

function syncTribalKnowledge() {
  log('Syncing tribal knowledge to Obsidian...');

  const tribalDir = path.join(OBSIDIAN_VAULT, 'tribal');
  ensureDir(tribalDir);

  // Sync from JSON tips if available
  const tipsFiles = [
    'H:/prism/mcp-server/data/state/TRIBAL_TIPS_FULL.json',
    'H:/prism/mcp-server/data/tribal-tips/machining-tips.json',
  ];

  let synced = 0;

  for (const tipsFile of tipsFiles) {
    if (!fs.existsSync(tipsFile)) continue;

    try {
      const tips = JSON.parse(fs.readFileSync(tipsFile, 'utf8'));
      const tipsArray = Array.isArray(tips) ? tips : tips.tips || [];

      for (const tip of tipsArray.slice(0, 100)) {
        const id = tip.id || tip.tip_id || `tip-${synced}`;
        const fileName = `${id}.md`;
        const targetPath = path.join(tribalDir, fileName);

        const content = `---
type: tribal-tip
category: ${tip.category || 'general'}
source: ${tip.source || 'shop-floor'}
synced: ${new Date().toISOString()}
---

# ${tip.title || id}

${tip.content || tip.tip || tip.description || ''}

${tip.context ? `## Context\n${tip.context}` : ''}

${tip.tags ? `## Tags\n${tip.tags.map(t => `#${t}`).join(' ')}` : ''}
`;

        if (!dryRun) {
          fs.writeFileSync(targetPath, content);
        }
        synced++;
      }
    } catch (e) {
      log(`  Error reading ${tipsFile}: ${e.message}`);
    }
  }

  return synced;
}

function createVaultConfig() {
  // Create .obsidian folder with basic config
  const obsidianDir = path.join(OBSIDIAN_VAULT, '.obsidian');
  ensureDir(obsidianDir);

  // App config
  const appConfig = {
    alwaysUpdateLinks: true,
    newLinkFormat: 'relative',
    useMarkdownLinks: false,
    showFrontmatter: true,
  };

  if (!dryRun) {
    fs.writeFileSync(
      path.join(obsidianDir, 'app.json'),
      JSON.stringify(appConfig, null, 2)
    );
  }

  // Create MOC (Map of Content) file
  const mocContent = `# PRISM Knowledge Vault

This vault syncs from PRISM's memory system.

## Memory Types
- [[memories/user/|User Memories]] — User preferences, role, expertise
- [[memories/feedback/|Feedback]] — Corrections and confirmations
- [[memories/project/|Project]] — Ongoing work, goals, deadlines
- [[memories/reference/|Reference]] — External system pointers

## Knowledge
- [[tribal/|Tribal Knowledge]] — Shop floor wisdom, machining tips
- [[decisions/|Decisions]] — Architecture and design decisions
- [[sessions/|Sessions]] — Session handoffs and continuity

## Quick Links
- [[engines/|Engine Index]]
- [[dispatchers/|Dispatcher Map]]
- [[skills/|Skill Reference]]

---
*Last sync: ${new Date().toISOString()}*
*Source: PRISM Memory System + Obsidian Sync*
`;

  if (!dryRun) {
    fs.writeFileSync(path.join(OBSIDIAN_VAULT, 'PRISM Knowledge Vault.md'), mocContent);
  }

  log('Created vault configuration and MOC');
}

function main() {
  log('=== PRISM → Obsidian Memory Sync ===');
  log(`Source: ${MEMORY_SOURCE}`);
  log(`Vault: ${OBSIDIAN_VAULT}`);
  if (dryRun) log('(DRY RUN - no files written)');
  log('');

  createVaultConfig();

  const memoryResult = syncMemories();
  log(`Memories: ${memoryResult.synced} synced, ${memoryResult.errors} errors`);

  const tribalCount = syncTribalKnowledge();
  log(`Tribal tips: ${tribalCount} synced`);

  log('');
  log('Done! Open Obsidian and select vault at:', OBSIDIAN_VAULT);
}

main();
