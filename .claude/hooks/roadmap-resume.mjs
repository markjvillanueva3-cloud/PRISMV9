#!/usr/bin/env node
// tier: T4
/**
 * roadmap-resume.mjs — SessionStart hook
 *
 * Shows where to resume based on merged checkpoints from all sessions.
 * Multi-chat aware: reads all session checkpoints + merged position.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const PRISM_ROOT = 'H:/prism';
const CHECKPOINT_DIR = join(PRISM_ROOT, 'state/shared/checkpoints');
const MERGED_POSITION = join(CHECKPOINT_DIR, 'MERGED_POSITION.json');
const MILESTONES_DIR = join(PRISM_ROOT, 'mcp-server/data/milestones');
const ROADMAP_INDEX = join(PRISM_ROOT, 'mcp-server/data/roadmap-index.json');

function getMergedPosition() {
  if (!existsSync(MERGED_POSITION)) return null;
  try {
    return JSON.parse(readFileSync(MERGED_POSITION, 'utf8'));
  } catch {
    return null;
  }
}

function getRecentCheckpoints() {
  if (!existsSync(CHECKPOINT_DIR)) return [];
  try {
    const files = readdirSync(CHECKPOINT_DIR).filter(f => f.endsWith('.json') && f !== 'MERGED_POSITION.json');
    const checkpoints = [];
    for (const file of files.slice(-8)) { // Last 8 sessions
      try {
        const data = JSON.parse(readFileSync(join(CHECKPOINT_DIR, file), 'utf8'));
        checkpoints.push(data);
      } catch {}
    }
    return checkpoints.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch {
    return [];
  }
}

function getInProgressMilestones() {
  if (!existsSync(ROADMAP_INDEX)) return [];
  try {
    const data = JSON.parse(readFileSync(ROADMAP_INDEX, 'utf8'));
    return (data.milestones || [])
      .filter(m => m.status === 'in_progress')
      .map(m => ({ id: m.id, title: m.title, completed: m.completed_units, total: m.total_units }));
  } catch {
    return [];
  }
}

function getNextPendingUnit(milestone) {
  const envelopePath = join(MILESTONES_DIR, `${milestone}.json`);
  if (!existsSync(envelopePath)) return null;

  try {
    const data = JSON.parse(readFileSync(envelopePath, 'utf8'));
    if (!data.phases || !Array.isArray(data.phases)) return null;

    for (const phase of data.phases) {
      if (!phase.units || !Array.isArray(phase.units)) continue;
      for (const unit of phase.units) {
        if (typeof unit === 'object' && (!unit.status || unit.status === 'pending')) {
          return {
            id: unit.id,
            title: unit.title || unit.description || '',
            phase: phase.id || phase.title || ''
          };
        }
      }
    }
  } catch {}

  return null;
}

function formatAge(timestamp) {
  if (!timestamp) return '';
  const hours = Math.round((Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function main() {
  const merged = getMergedPosition();
  const checkpoints = getRecentCheckpoints();
  const inProgress = getInProgressMilestones();

  // If no checkpoints, show active milestones
  if (!merged && checkpoints.length === 0) {
    if (inProgress.length > 0) {
      const ms = inProgress[0];
      console.log(`📍 Active: ${ms.id} (${ms.completed}/${ms.total} units)`);
      const next = getNextPendingUnit(ms.id);
      if (next) {
        console.log(`   └─ Next: ${next.id}`);
      }
    } else {
      console.log('📍 No roadmap checkpoints — run /continue-roadmap to start');
    }
    return;
  }

  // Show last checkpoint
  const lastMs = merged?.milestone || checkpoints[0]?.milestone || inProgress[0]?.id || 'unknown';
  const lastUnit = merged?.units?.slice(-1)[0]?.unitId || 'unknown';
  const lastTime = merged?.lastUpdate || checkpoints[0]?.timestamp;
  const age = formatAge(lastTime);

  console.log(`📍 Resume: ${lastMs} — last: ${lastUnit} (${age})`);

  // Show next pending unit
  const next = getNextPendingUnit(lastMs);
  if (next) {
    console.log(`   └─ Next: ${next.id}: ${next.title.slice(0, 45)}...`);
  }

  // Show other active sessions (if any recent)
  const recentOthers = checkpoints.filter(c => {
    const age = Date.now() - new Date(c.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000; // Last 24h
  });
  if (recentOthers.length > 1) {
    console.log(`   └─ ${recentOthers.length} sessions active in last 24h`);
  }
}

try { main(); } catch { process.stdout.write(JSON.stringify({ continue: true })); }
