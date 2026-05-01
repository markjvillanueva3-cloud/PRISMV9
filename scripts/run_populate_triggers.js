const { execSync } = require('child_process');
try {
  const out = execSync('py -3 C:\\PRISM\\mcp-server\\scripts\\populate_skill_triggers.py', { encoding: 'utf-8', timeout: 30000 });
  console.log(out);
} catch(e) {
  console.error('ERROR:', e.message);
  if (e.stdout) console.log('STDOUT:', e.stdout);
  if (e.stderr) console.log('STDERR:', e.stderr);
}
