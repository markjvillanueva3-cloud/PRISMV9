// Generic shell runner - executes a command and returns stdout/stderr
const { execSync } = require('child_process');
const cmd = process.argv.slice(2).join(' ');
try {
  const result = execSync(cmd, { encoding: 'utf-8', timeout: 30000, cwd: 'C:\\PRISM\\mcp-server' });
  console.log(result);
} catch (e) {
  console.error('STDERR:', e.stderr || '');
  console.log('STDOUT:', e.stdout || '');
  process.exit(e.status || 1);
}
