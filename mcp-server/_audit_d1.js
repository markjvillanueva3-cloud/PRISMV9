const fs = require('fs');
const path = require('path');
const dir = 'C:\\PRISM\\scripts\\core';
const files = ['wip_capturer.py','wip_saver.py','graceful_shutdown.py','state_rollback.py','clone_factory.py','recovery_scorer.py','checkpoint_mgr.py'];

files.forEach(f => {
  const content = fs.readFileSync(path.join(dir, f), 'utf8');
  const lines = content.split('\n');
  const defs = lines.filter((l,i) => /^(def |class |if __name__)/.test(l)).map(l => l.trim());
  const lineCount = lines.length;
  console.log(`\n=== ${f} (${lineCount} lines) ===`);
  defs.forEach(d => console.log('  ' + d));
});
