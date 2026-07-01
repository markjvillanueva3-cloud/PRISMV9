import fs from 'node:fs';
import { execSync } from 'node:child_process';

const j = JSON.parse(fs.readFileSync('H:/prism/state/shared/specs/ROADMAP-CONSOLIDATED.json', 'utf8'));
const ms = j.milestones;

// Distribution
const driftDist = {};
const statusDist = {};
for (const m of ms) {
  driftDist[m.drift || '(none)'] = (driftDist[m.drift || '(none)'] || 0) + 1;
  statusDist[m.derivedStatus || '(none)'] = (statusDist[m.derivedStatus || '(none)'] || 0) + 1;
}
console.log('driftDist:', JSON.stringify(driftDist));
console.log('statusDist:', JSON.stringify(statusDist));

// OBSOLETE: drift cases (shipped>0 but envelope says pending OR derivedStatus says shipped but claimedStatus says pending)
const obsolete = ms.filter(m => {
  const d = m.drift;
  return d && d !== 'consistent' && d !== 'none' && d !== undefined;
});
console.log('OBSOLETE (non-consistent drift):', obsolete.length);
console.log('drift values seen:', [...new Set(ms.map(m => m.drift))]);

// Top 10 OBSOLETE — pick ones with shipped>0 but pending>0
const drift_shipped_partial = ms.filter(m => m.drift === 'envelope_understates' || m.drift === 'envelope_overstates' || m.drift === 'understated' || m.drift === 'overstated');
console.log('partial-shipped drifts:', drift_shipped_partial.length);
