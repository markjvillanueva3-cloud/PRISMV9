// Surgical edit: Add ATCS entries to KNOWN_RENAMES in guardDispatcher.ts
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'tools', 'dispatchers', 'guardDispatcher.ts');
let content = fs.readFileSync(filePath, 'utf-8');

if (content.includes('ATCS DISPATCHER')) {
  console.log('ATCS entries already present. Skipping.');
  process.exit(0);
}

const ATCS_BLOCK = `
  // === ATCS DISPATCHER (prism:prism_atcs) ===
  "atcs_task_init": "prism:prism_atcs action=task_init",
  "atcs_task_resume": "prism:prism_atcs action=task_resume",
  "atcs_task_status": "prism:prism_atcs action=task_status",
  "atcs_queue_next": "prism:prism_atcs action=queue_next",
  "atcs_unit_complete": "prism:prism_atcs action=unit_complete",
  "atcs_batch_validate": "prism:prism_atcs action=batch_validate",
  "atcs_checkpoint": "prism:prism_atcs action=checkpoint",
  "atcs_replan": "prism:prism_atcs action=replan",
  "atcs_assemble": "prism:prism_atcs action=assemble",
  "atcs_stub_scan": "prism:prism_atcs action=stub_scan",`;

// Insert before the closing }; of KNOWN_RENAMES
// Find the generator dispatcher's last entry, then the };
const marker = '"prism_hook_validate": "prism:prism_generator action=validate",';
const markerIdx = content.indexOf(marker);
if (markerIdx === -1) {
  console.error('ERROR: Could not find generator dispatcher marker');
  process.exit(1);
}

// Find the closing }; after the marker
const afterMarker = content.indexOf('};', markerIdx);
if (afterMarker === -1) {
  console.error('ERROR: Could not find closing };');
  process.exit(1);
}

// Insert ATCS block between the marker line end and };
content = content.slice(0, afterMarker) + ATCS_BLOCK + '\n' + content.slice(afterMarker);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('SUCCESS: Added ATCS dispatcher entries to KNOWN_RENAMES');
console.log(`File size: ${content.length} bytes, ${content.split('\n').length} lines`);
