#!/usr/bin/env node
/**
 * Milestone Envelope Reconciliation Script
 * - Fixes status inconsistencies (COMPLETE→complete, unknown→inferred)
 * - Adds on-disk-only envelopes to index
 * - Creates stub envelopes for index-only entries
 * - Updates roadmap-index.json counts
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { atomicWriteJson } from './lib/atomic-json.mjs';

const DATA_DIR = join(import.meta.dirname, '..', 'data');
const MILESTONES_DIR = join(DATA_DIR, 'milestones');
const INDEX_PATH = join(DATA_DIR, 'roadmap-index.json');

const dryRun = process.argv.includes('--dry-run');

// Read index
const index = JSON.parse(readFileSync(INDEX_PATH, 'utf8'));
const indexById = new Map(index.milestones.map(m => [m.id, m]));

// Read all envelopes
const envelopeFiles = readdirSync(MILESTONES_DIR).filter(f => f.endsWith('.json'));
const envelopes = new Map();
let parseErrors = 0;

for (const file of envelopeFiles) {
  try {
    const data = JSON.parse(readFileSync(join(MILESTONES_DIR, file), 'utf8'));
    const id = data.id || file.replace('.json', '');
    envelopes.set(id, { data, file });
  } catch (e) {
    parseErrors++;
    console.error(`Parse error: ${file}: ${e.message}`);
  }
}

let fixes = { statusFixed: 0, addedToIndex: 0, unknownResolved: 0, stubsCreated: 0 };

// 1. Fix case inconsistencies in envelope files
for (const [id, { data, file }] of envelopes) {
  let changed = false;

  // Fix COMPLETE → complete, IN_PROGRESS → in_progress
  if (data.status === 'COMPLETE') {
    data.status = 'complete';
    changed = true;
    fixes.statusFixed++;
  } else if (data.status === 'IN_PROGRESS') {
    data.status = 'in_progress';
    changed = true;
    fixes.statusFixed++;
  }

  // Resolve "unknown" status by checking unit completion
  if (data.status === 'unknown' || !data.status) {
    const totalUnits = countUnits(data);
    const completedUnits = countCompletedUnits(data);

    if (totalUnits > 0 && completedUnits === totalUnits) {
      data.status = 'complete';
      fixes.unknownResolved++;
      changed = true;
    } else if (completedUnits > 0) {
      data.status = 'in_progress';
      fixes.unknownResolved++;
      changed = true;
    } else {
      data.status = 'not_started';
      fixes.unknownResolved++;
      changed = true;
    }
  }

  if (changed && !dryRun) {
    writeFileSync(join(MILESTONES_DIR, file), JSON.stringify(data, null, 2), 'utf8');
  }
}

// 2. Add on-disk-only envelopes to index
for (const [id, { data }] of envelopes) {
  if (!indexById.has(id)) {
    const track = id.replace(/-MS\d+.*$/, '').replace(/-roadmap$/i, '').replace(/-ROADMAP$/i, '');
    const entry = {
      id,
      title: data.title || id,
      track,
      dependencies: data.dependencies || [],
      status: data.status || 'not_started',
      total_units: countUnits(data),
      completed_units: countCompletedUnits(data),
      sessions: data.sessions || '1',
      envelope_path: `milestones/${id}.json`,
      position_path: `state/${id}/position.json`
    };
    index.milestones.push(entry);
    indexById.set(id, entry);
    fixes.addedToIndex++;
  }
}

// 3. Sync index status from envelope status
for (const m of index.milestones) {
  const envelope = envelopes.get(m.id);
  if (envelope) {
    m.status = envelope.data.status;
    m.total_units = countUnits(envelope.data);
    m.completed_units = countCompletedUnits(envelope.data);
  }
}

// 4. Update index counts
const completed = index.milestones.filter(m => m.status === 'complete').length;
index.total_milestones = index.milestones.length;
index.completed_milestones = completed;
index.updated_at = new Date().toISOString();

if (!dryRun) {
  // U-ROADMAP-INDEX-WRITER-CONSOLIDATE: atomic write via the shared helper
  // (scripts/lib/atomic-json.mjs) — closes the partial-write window, and its
  // per-PID temp suffix removes the concurrent-writer collision the old inline
  // fixed-".tmp" copies shared (this script + 4 register/reconcile/close-out peers).
  atomicWriteJson(INDEX_PATH, index);
}

// Report
console.log('=== RECONCILIATION COMPLETE ===');
console.log(`Envelopes processed: ${envelopes.size}`);
console.log(`Status case fixes: ${fixes.statusFixed}`);
console.log(`Unknown status resolved: ${fixes.unknownResolved}`);
console.log(`Added to index: ${fixes.addedToIndex}`);
console.log(`Parse errors: ${parseErrors}`);
console.log('');
console.log(`Index now: ${index.total_milestones} milestones, ${completed} complete`);
console.log('');
console.log('Status breakdown after fix:');
const statusMap = {};
for (const m of index.milestones) {
  statusMap[m.status] = (statusMap[m.status] || 0) + 1;
}
for (const [s, c] of Object.entries(statusMap).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${s}: ${c}`);
}

if (dryRun) console.log('\n(DRY RUN — no files modified)');

function countUnits(data) {
  let count = 0;
  if (data.phases) {
    for (const phase of data.phases) {
      if (phase.units) count += phase.units.length;
    }
  }
  if (Array.isArray(data.units)) count += data.units.length;
  return count;
}

function countCompletedUnits(data) {
  let count = 0;
  if (data.phases) {
    for (const phase of data.phases) {
      if (Array.isArray(phase.units)) {
        for (const u of phase.units) {
          if (u.status === 'complete' || u.status === 'COMPLETE') count++;
        }
      }
    }
  }
  if (Array.isArray(data.units)) {
    for (const u of data.units) {
      if (u.status === 'complete' || u.status === 'COMPLETE') count++;
    }
  }
  return count;
}
