/**
 * Validates PRISM JSON files against generated schemas.
 * Uses structural checks (not full JSON Schema validator) for zero-dependency validation.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = 'C:/PRISM/mcp-server/data';
let pass = 0, fail = 0;
const failures = [];

function check(file, condition, msg) {
  if (!condition) { failures.push(`FAIL: ${file}: ${msg}`); fail++; }
  else pass++;
}

// --- Roadmap Index ---
console.log('=== Roadmap Index ===');
const roadmap = JSON.parse(readFileSync(join(ROOT, 'roadmap-index.json'), 'utf8'));
check('roadmap-index', typeof roadmap.version === 'string' && /^\d+\.\d+\.\d+$/.test(roadmap.version), 'version must be semver');
check('roadmap-index', typeof roadmap.title === 'string' && roadmap.title.length > 0, 'title required');
check('roadmap-index', roadmap.total_milestones === roadmap.milestones.length, `total_milestones (${roadmap.total_milestones}) must equal array length (${roadmap.milestones.length})`);
const completeCount = roadmap.milestones.filter(m => m.status === 'complete').length;
check('roadmap-index', roadmap.completed_milestones === completeCount, `completed_milestones (${roadmap.completed_milestones}) must equal actual (${completeCount})`);

// Check each milestone entry
const ids = new Set();
for (const ms of roadmap.milestones) {
  const label = `roadmap[${ms.id}]`;
  check(label, typeof ms.id === 'string' && ms.id.length > 0, 'id required');
  check(label, typeof ms.title === 'string' && ms.title.length >= 3, 'title >= 3 chars');
  check(label, ['pending','active','complete','blocked'].includes(ms.status), `status "${ms.status}" invalid`);
  check(label, !ids.has(ms.id), `duplicate id "${ms.id}"`);
  ids.add(ms.id);
  if (ms.envelope_path) {
    check(label, ms.envelope_path.startsWith('milestones/'), 'envelope_path must start with milestones/');
  }
  if (ms.completed_units !== undefined && ms.total_units !== undefined) {
    check(label, ms.completed_units <= ms.total_units, `completed (${ms.completed_units}) > total (${ms.total_units})`);
  }
}
console.log(`  ${roadmap.milestones.length} entries checked`);

// --- Milestone Envelopes ---
console.log('\n=== Milestone Envelopes ===');
const envDir = join(ROOT, 'milestones');
const envFiles = readdirSync(envDir).filter(f => f.endsWith('.json'));
for (const f of envFiles) {
  const env = JSON.parse(readFileSync(join(envDir, f), 'utf8'));
  const label = `envelope[${f}]`;
  const hasId = env.id || env.milestone_id;
  check(label, hasId, 'must have id or milestone_id');
  check(label, typeof env.title === 'string' || typeof env.description === 'string', 'must have title or description');

  // Check phases/units structure
  if (env.phases && Array.isArray(env.phases)) {
    for (const ph of env.phases) {
      check(label, typeof ph.id === 'string', `phase missing id`);
      if (ph.units && Array.isArray(ph.units)) {
        for (const u of ph.units) {
          check(label, typeof u.id === 'string', `unit missing id in phase ${ph.id}`);
          check(label, typeof u.title === 'string', `unit missing title in phase ${ph.id}`);
        }
      }
    }
  }
}
console.log(`  ${envFiles.length} envelopes checked`);

// --- Material Registries ---
console.log('\n=== Material Registries ===');
const matDir = join(ROOT, 'materials');
const matFiles = readdirSync(matDir).filter(f => f.endsWith('.json'));
for (const f of matFiles) {
  const data = JSON.parse(readFileSync(join(matDir, f), 'utf8'));
  const label = `material[${f}]`;
  check(label, data.materials && Array.isArray(data.materials), 'must have materials array');
  if (data.materials) {
    for (const mat of data.materials) {
      check(label, typeof mat.material_id === 'string', `entry missing material_id`);
      check(label, typeof mat.name === 'string', `entry missing name`);
      check(label, typeof mat.iso_group === 'string', `entry missing iso_group`);
      check(label, ['P','M','K','N','S','H','O'].includes(mat.iso_group), `invalid iso_group "${mat.iso_group}"`);
      if (mat.physical) {
        check(label, mat.physical.density > 0, `${mat.material_id} density must be > 0`);
      }
      if (mat.mechanical?.tensile_strength) {
        check(label, mat.mechanical.tensile_strength.typical > 0, `${mat.material_id} tensile must be > 0`);
      }
    }
  }
}
console.log(`  ${matFiles.length} registries checked`);

// --- Summary ---
console.log('\n=== VALIDATION SUMMARY ===');
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);
if (failures.length) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  ' + f));
}
console.log(`\nIntegrity: ${Math.round(pass / (pass + fail) * 100)}%`);
