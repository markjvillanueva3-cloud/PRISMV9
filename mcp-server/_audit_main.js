const fs = require('fs');
const path = require('path');
const dir = 'C:\\PRISM\\scripts\\core';
const files = ['wip_capturer.py','graceful_shutdown.py','state_rollback.py','recovery_scorer.py','checkpoint_mgr.py'];

files.forEach(f => {
  const c = fs.readFileSync(path.join(dir, f), 'utf8');
  const mainIdx = c.indexOf('def main()');
  if (mainIdx < 0) { console.log(`=== ${f}: NO main() ===`); return; }
  const mainBlock = c.slice(mainIdx, mainIdx + 600);
  console.log(`\n=== ${f} main() ===`);
  console.log(mainBlock.split('\n').slice(0, 25).join('\n'));
});
