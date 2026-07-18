#!/usr/bin/env node
/**
 * milestone-tracker.mjs — Track and mark milestone completions in roadmap-index.json
 *
 * Usage:
 *   node milestone-tracker.mjs complete <MILESTONE_ID>   # Mark a milestone complete
 *   node milestone-tracker.mjs status <MILESTONE_ID>     # Check milestone status
 *   node milestone-tracker.mjs list-incomplete           # List incomplete milestones
 *   node milestone-tracker.mjs list-session-completions  # Show what was completed recently
 *   node milestone-tracker.mjs verify                    # Verify roadmap consistency
 *   node milestone-tracker.mjs sync-from-git             # Sync completions from git log
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';

const ROADMAP_PATH = 'H:/prism/mcp-server/data/roadmap-index.json';
const POSITION_PATH = 'H:/prism/state/CURRENT_POSITION.md';

// Atomic write helper — tmp + rename. Prevents roadmap-index.json and
// CURRENT_POSITION.md corruption when multiple terminals mark milestones
// complete concurrently. See state/shared/HOOK_STATIC_AUDIT.json.
function atomicWriteSync(filePath, data, encoding = 'utf-8') {
  const tmpPath = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  try {
    fs.writeFileSync(tmpPath, data, encoding);
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try { fs.unlinkSync(tmpPath); } catch { /* tmp may not exist */ }
    throw err;
  }
}

function loadRoadmap() {
  const content = fs.readFileSync(ROADMAP_PATH, 'utf-8');
  return JSON.parse(content);
}

function saveRoadmap(roadmap) {
  // Update completed_milestones count
  roadmap.completed_milestones = roadmap.milestones.filter(m => m.status === 'complete').length;
  roadmap.updated_at = new Date().toISOString().split('T')[0];

  atomicWriteSync(ROADMAP_PATH, JSON.stringify(roadmap, null, 2));
  console.log(`Saved roadmap: ${roadmap.completed_milestones}/${roadmap.total_milestones} complete`);
}

function complete(milestoneId) {
  const roadmap = loadRoadmap();
  const milestone = roadmap.milestones.find(m => m.id === milestoneId);

  if (!milestone) {
    console.error(`Milestone ${milestoneId} not found`);
    process.exit(1);
  }

  if (milestone.status === 'complete') {
    console.log(`Milestone ${milestoneId} is already marked complete`);
    return;
  }

  milestone.status = 'complete';
  milestone.completed_units = milestone.total_units || 1;
  milestone.completed_at = new Date().toISOString();

  saveRoadmap(roadmap);
  console.log(`Marked ${milestoneId} as COMPLETE (${milestone.title})`);

  // Update CURRENT_POSITION.md
  updatePosition(roadmap);
}

function status(milestoneId) {
  const roadmap = loadRoadmap();
  const milestone = roadmap.milestones.find(m => m.id === milestoneId);

  if (!milestone) {
    console.error(`Milestone ${milestoneId} not found`);
    process.exit(1);
  }

  console.log(`${milestone.id}: ${milestone.status}`);
  console.log(`  Title: ${milestone.title}`);
  console.log(`  Track: ${milestone.track}`);
  console.log(`  Units: ${milestone.completed_units || 0}/${milestone.total_units || '?'}`);
  if (milestone.dependencies?.length) {
    console.log(`  Dependencies: ${milestone.dependencies.join(', ')}`);
  }
}

function listIncomplete() {
  const roadmap = loadRoadmap();
  const incomplete = roadmap.milestones.filter(m => m.status !== 'complete');

  console.log(`Incomplete milestones: ${incomplete.length}/${roadmap.total_milestones}`);
  console.log('');

  // Group by track
  const byTrack = {};
  for (const m of incomplete) {
    const track = m.track || 'UNKNOWN';
    if (!byTrack[track]) byTrack[track] = [];
    byTrack[track].push(m);
  }

  for (const [track, milestones] of Object.entries(byTrack).sort()) {
    console.log(`${track} (${milestones.length}):`);
    for (const m of milestones.slice(0, 5)) {
      const statusIcon = m.status === 'in_progress' ? '🔄' : '⬜';
      console.log(`  ${statusIcon} ${m.id}: ${m.title}`);
    }
    if (milestones.length > 5) {
      console.log(`  ... and ${milestones.length - 5} more`);
    }
  }
}

function listSessionCompletions() {
  // Check git log for recent completion commits
  try {
    const gitLog = execSync(
      'git log --oneline --since="8 hours ago" 2>/dev/null || git log --oneline -20',
      { windowsHide: true, cwd: 'H:/prism', encoding: 'utf-8' }
    );

    const completionPattern = /([A-Z]+-MS\d+[A-Z]?)|complete|COMPLETE|done|DONE/gi;
    const lines = gitLog.trim().split('\n');
    const completions = [];

    for (const line of lines) {
      if (completionPattern.test(line)) {
        completions.push(line);
      }
    }

    if (completions.length === 0) {
      console.log('No completion commits found in recent git history');
      return;
    }

    console.log('Recent completion commits:');
    for (const c of completions) {
      console.log(`  ${c}`);
    }

    // Extract milestone IDs
    const milestoneIds = new Set();
    for (const c of completions) {
      const matches = c.match(/[A-Z]+-MS\d+[A-Z]?/g);
      if (matches) {
        matches.forEach(m => milestoneIds.add(m));
      }
    }

    if (milestoneIds.size > 0) {
      console.log('\nMilestones mentioned in commits:');
      const roadmap = loadRoadmap();
      for (const id of milestoneIds) {
        const m = roadmap.milestones.find(x => x.id === id);
        if (m) {
          const icon = m.status === 'complete' ? '✅' : '⚠️ NOT MARKED';
          console.log(`  ${icon} ${id}: ${m.status}`);
        } else {
          console.log(`  ❓ ${id}: not found in roadmap`);
        }
      }
    }

  } catch (e) {
    console.error('Error checking git log:', e.message);
  }
}

function verify() {
  const roadmap = loadRoadmap();
  let issues = 0;

  // Check counts
  const actualComplete = roadmap.milestones.filter(m => m.status === 'complete').length;
  if (roadmap.completed_milestones !== actualComplete) {
    console.log(`⚠️ Count mismatch: header says ${roadmap.completed_milestones}, actual is ${actualComplete}`);
    issues++;
  }

  const actualTotal = roadmap.milestones.length;
  if (roadmap.total_milestones !== actualTotal) {
    console.log(`⚠️ Total mismatch: header says ${roadmap.total_milestones}, actual is ${actualTotal}`);
    issues++;
  }

  // Check for orphan dependencies
  const ids = new Set(roadmap.milestones.map(m => m.id));
  for (const m of roadmap.milestones) {
    for (const dep of (m.dependencies || [])) {
      if (!ids.has(dep)) {
        console.log(`⚠️ ${m.id} depends on ${dep} which doesn't exist`);
        issues++;
      }
    }
  }

  // Check for completed units mismatch
  for (const m of roadmap.milestones) {
    if (m.status === 'complete' && m.total_units && m.completed_units !== m.total_units) {
      console.log(`⚠️ ${m.id} is complete but units mismatch: ${m.completed_units}/${m.total_units}`);
      issues++;
    }
  }

  if (issues === 0) {
    console.log('✅ Roadmap verification passed');
  } else {
    console.log(`\n${issues} issues found`);
  }

  console.log(`\nSummary: ${actualComplete}/${actualTotal} milestones complete`);
}

function syncFromGit() {
  console.log('Scanning git log for unreported completions...');

  try {
    const gitLog = execSync(
      'git log --oneline -100',
      { windowsHide: true, cwd: 'H:/prism', encoding: 'utf-8' }
    );

    const roadmap = loadRoadmap();
    const lines = gitLog.trim().split('\n');
    let synced = 0;

    for (const line of lines) {
      // Look for patterns like "INGEST-MS0: ... complete" or "feat(engines): ... [MILESTONE-ID]"
      const completeMatch = line.match(/([A-Z]+-MS\d+[A-Z]?).*(?:complete|COMPLETE|done|DONE)/i);
      if (completeMatch) {
        const id = completeMatch[1];
        const m = roadmap.milestones.find(x => x.id === id);
        if (m && m.status !== 'complete') {
          m.status = 'complete';
          m.completed_units = m.total_units || 1;
          m.completed_at = new Date().toISOString();
          console.log(`  Synced: ${id} → complete`);
          synced++;
        }
      }
    }

    if (synced > 0) {
      saveRoadmap(roadmap);
      console.log(`\nSynced ${synced} milestone(s) from git log`);
    } else {
      console.log('No unreported completions found');
    }

  } catch (e) {
    console.error('Error:', e.message);
  }
}

function fix() {
  console.log('Fixing roadmap consistency issues...');
  const roadmap = loadRoadmap();
  let fixed = 0;

  // Fix: completed milestones should have completed_units = total_units
  for (const m of roadmap.milestones) {
    if (m.status === 'complete') {
      const expected = m.total_units || 1;
      if (m.completed_units !== expected) {
        console.log(`  Fixed ${m.id}: completed_units ${m.completed_units || 0} → ${expected}`);
        m.completed_units = expected;
        fixed++;
      }
      // Ensure completed_at is set
      if (!m.completed_at) {
        m.completed_at = new Date().toISOString();
        console.log(`  Fixed ${m.id}: added completed_at timestamp`);
        fixed++;
      }
    }
  }

  // The saveRoadmap function auto-fixes the completed_milestones count
  if (fixed > 0 || roadmap.completed_milestones !== roadmap.milestones.filter(m => m.status === 'complete').length) {
    saveRoadmap(roadmap);
    console.log(`\nFixed ${fixed} issue(s)`);
  } else {
    console.log('No issues to fix');
  }

  // Run verify to confirm
  console.log('\nVerifying after fix:');
  verify();
}

function updatePosition(roadmap) {
  const complete = roadmap.milestones.filter(m => m.status === 'complete').length;
  const total = roadmap.milestones.length;
  const inProgress = roadmap.milestones.filter(m => m.status === 'in_progress');

  const content = `# PRISM Current Position
Updated: ${new Date().toISOString()}

## Progress
- **Milestones**: ${complete}/${total} complete (${((complete/total)*100).toFixed(1)}%)
- **In Progress**: ${inProgress.map(m => m.id).join(', ') || 'none'}

## Recent Completions
${roadmap.milestones
  .filter(m => m.status === 'complete' && m.completed_at)
  .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''))
  .slice(0, 10)
  .map(m => `- ${m.id}: ${m.title}`)
  .join('\n') || '(none tracked)'}
`;

  atomicWriteSync(POSITION_PATH, content);
}

// Main
const [,, command, ...args] = process.argv;

switch (command) {
  case 'complete':
    if (!args[0]) {
      console.error('Usage: milestone-tracker.mjs complete <MILESTONE_ID>');
      process.exit(1);
    }
    complete(args[0]);
    break;
  case 'status':
    if (!args[0]) {
      console.error('Usage: milestone-tracker.mjs status <MILESTONE_ID>');
      process.exit(1);
    }
    status(args[0]);
    break;
  case 'list-incomplete':
    listIncomplete();
    break;
  case 'list-session-completions':
    listSessionCompletions();
    break;
  case 'verify':
    verify();
    break;
  case 'sync-from-git':
    syncFromGit();
    break;
  case 'fix':
    fix();
    break;
  default:
    console.log('Usage: milestone-tracker.mjs <command>');
    console.log('Commands:');
    console.log('  complete <ID>           Mark milestone complete');
    console.log('  status <ID>             Check milestone status');
    console.log('  list-incomplete         List all incomplete milestones');
    console.log('  list-session-completions  Show recent completions from git');
    console.log('  verify                  Verify roadmap consistency');
    console.log('  sync-from-git           Sync completions from git log');
    console.log('  fix                     Auto-fix consistency issues');
}
