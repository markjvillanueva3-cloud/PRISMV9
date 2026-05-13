#!/usr/bin/env node
// tier: T4
/**
 * roadmap-checkpoint.mjs — Stop hook
 *
 * Auto-marks roadmap progress at end of each session.
 * Multi-chat safe: uses per-session checkpoint files + atomic writes.
 *
 * Extracts completed units from git commits and updates:
 * - state/shared/checkpoints/<session-id>.json (per-chat)
 * - state/shared/checkpoints/MERGED_POSITION.json (aggregated)
 * - milestone envelope files (marks units complete)
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';

const PRISM_ROOT = 'H:/prism';
const CHECKPOINT_DIR = join(PRISM_ROOT, 'state/shared/checkpoints');
const POSITION_FILE = join(PRISM_ROOT, 'state/CURRENT_POSITION.md');
const MILESTONES_DIR = join(PRISM_ROOT, 'mcp-server/data/milestones');

// Get stable session ID (or generate one)
function getSessionId() {
  try {
    const result = execSync(`"${process.execPath}" H:/prism/.claude/helpers/stable-session-id.mjs`, {
      encoding: 'utf8', timeout: 3000
    }).trim();
    return result || `anon-${randomUUID().slice(0, 8)}`;
  } catch {
    return `anon-${randomUUID().slice(0, 8)}`;
  }
}

function getRecentCommits() {
  try {
    // Get commits from last 4 hours (covers longer sessions)
    const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    const result = execSync(
      `git log --since="${since}" --oneline --format="%s"`,
      { cwd: PRISM_ROOT, encoding: 'utf8', timeout: 5000 }
    );
    return result.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function extractCompletedUnits(commits) {
  // Pattern: [SCOPE]/U-ID: title  or  SCOPE/U-ID: title
  const unitPattern = /\[?([A-Z0-9-]+)\]?\/U-([A-Z0-9-]+):/gi;
  const completed = [];

  for (const commit of commits) {
    let match;
    while ((match = unitPattern.exec(commit)) !== null) {
      const scope = match[1].replace(/[\[\]]/g, '');
      const unitId = `U-${match[2]}`;
      completed.push({ scope, unitId, commit: commit.slice(0, 60) });
    }
    unitPattern.lastIndex = 0;
  }

  return completed;
}

function getCurrentMilestone(commits) {
  const msPattern = /\[?([A-Z0-9-]+-MS\d+[a-z]?)\]?\//i;
  for (const commit of commits) {
    const match = commit.match(msPattern);
    if (match) return match[1];
  }
  return null;
}

function atomicWrite(filepath, content) {
  const tmpPath = `${filepath}.tmp.${process.pid}`;
  try {
    writeFileSync(tmpPath, content, 'utf8');
    // Rename is atomic on most filesystems. Use the already-imported fs
    // namespace — `require` is not available in .mjs modules, so the prior
    // version threw ReferenceError and the whole checkpoint silently failed.
    renameSync(tmpPath, filepath);
    return true;
  } catch (e) {
    try { unlinkSync(tmpPath); } catch {}
    return false;
  }
}

function savePerSessionCheckpoint(sessionId, completedUnits, milestone) {
  if (!existsSync(CHECKPOINT_DIR)) {
    mkdirSync(CHECKPOINT_DIR, { recursive: true });
  }

  const checkpoint = {
    sessionId,
    timestamp: new Date().toISOString(),
    milestone,
    completedUnits,
    pc: process.env.COMPUTERNAME || process.env.HOSTNAME || 'unknown'
  };

  const filepath = join(CHECKPOINT_DIR, `${sessionId}.json`);
  return atomicWrite(filepath, JSON.stringify(checkpoint, null, 2));
}

function mergeToPrimaryPosition(completedUnits, milestone) {
  const mergedPath = join(CHECKPOINT_DIR, 'MERGED_POSITION.json');

  let merged = { units: [], lastUpdate: null, milestone: null };
  if (existsSync(mergedPath)) {
    try {
      merged = JSON.parse(readFileSync(mergedPath, 'utf8'));
    } catch {}
  }

  // Add new units (dedupe by unitId)
  const existing = new Set(merged.units?.map(u => u.unitId) || []);
  for (const unit of completedUnits) {
    if (!existing.has(unit.unitId)) {
      merged.units = merged.units || [];
      merged.units.push(unit);
    }
  }

  merged.lastUpdate = new Date().toISOString();
  merged.milestone = milestone || merged.milestone;

  atomicWrite(mergedPath, JSON.stringify(merged, null, 2));
}

function updatePositionFile(completedUnits, milestone, sessionId) {
  const now = new Date().toISOString();
  const lastUnit = completedUnits[completedUnits.length - 1]?.unitId || 'unknown';

  let content = `# CURRENT_POSITION\n\n`;
  content += `**Last Updated:** ${now}\n`;
  content += `**Session:** ${sessionId}\n`;
  content += `**Last Milestone:** ${milestone || 'unknown'}\n`;
  content += `**Last Completed Unit:** ${lastUnit}\n\n`;
  content += `## This Session\n`;
  for (const unit of completedUnits.slice(-10)) {
    content += `- ✅ ${unit.scope}/${unit.unitId}\n`;
  }
  content += `\n## Resume\n`;
  content += `Check \`state/shared/checkpoints/MERGED_POSITION.json\` for cross-session state.\n`;

  atomicWrite(POSITION_FILE, content);
}

function updateMilestoneEnvelope(milestone, completedUnits) {
  if (!milestone) return 0;

  const envelopePath = join(MILESTONES_DIR, `${milestone}.json`);
  if (!existsSync(envelopePath)) return 0;

  let data;
  try {
    data = JSON.parse(readFileSync(envelopePath, 'utf8'));
  } catch {
    return 0;
  }

  const unitIds = new Set(completedUnits.map(u => u.unitId));
  let marked = 0;

  // Update units in phases
  if (data.phases && Array.isArray(data.phases)) {
    for (const phase of data.phases) {
      if (phase.units && Array.isArray(phase.units)) {
        for (const unit of phase.units) {
          if (typeof unit === 'object' && unitIds.has(unit.id)) {
            if (unit.status !== 'complete') {
              unit.status = 'complete';
              unit.completedAt = new Date().toISOString();
              marked++;
            }
          }
        }
      }
    }
  }

  if (marked > 0) {
    data.updated_at = new Date().toISOString();
    atomicWrite(envelopePath, JSON.stringify(data, null, 2));
  }

  return marked;
}

function main() {
  const sessionId = getSessionId();
  const commits = getRecentCommits();

  if (commits.length === 0) {
    console.log('⏸ No commits this session — checkpoint skipped');
    return;
  }

  const completedUnits = extractCompletedUnits(commits);
  const milestone = getCurrentMilestone(commits);

  if (completedUnits.length === 0) {
    console.log('⏸ No roadmap units in commits — checkpoint skipped');
    return;
  }

  // Save per-session checkpoint (safe for 8 concurrent chats)
  savePerSessionCheckpoint(sessionId, completedUnits, milestone);

  // Merge to primary position (with dedup)
  mergeToPrimaryPosition(completedUnits, milestone);

  // Update CURRENT_POSITION.md
  updatePositionFile(completedUnits, milestone, sessionId);

  // Update milestone envelope
  const markedInEnvelope = updateMilestoneEnvelope(milestone, completedUnits);

  console.log(`✓ Checkpoint: ${completedUnits.length} unit(s) → ${sessionId.slice(0, 12)}`);
  if (markedInEnvelope > 0) {
    console.log(`  └─ Marked ${markedInEnvelope} in ${milestone}.json`);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
