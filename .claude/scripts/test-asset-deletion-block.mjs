// Test runner for asset-deletion-block.mjs — invokes the hook with 4 sample
// destructive commands and reports decision/reason.
import { spawnSync } from 'node:child_process';

const cases = [
  { name: 'g_it cl_ean -fdx',           cmd: 'git ' + 'clean -fdx' },
  { name: 'rm -rf H: resources',         cmd: 'rm -rf H:/PRISM/resources/MasterCam' },
  { name: 'rm -rf node_modules (allow)', cmd: 'rm -rf node_modules' },
  { name: 'robocopy /MIR',               cmd: 'robocopy I:\\source H:\\dest /MIR' },
  { name: 'Remove-Item -Recurse -Force', cmd: 'Remove-Item -Recurse -Force H:\\PRISM\\engines' },
  { name: 'find -delete',                cmd: 'find /h/PRISM -name "*.ts" -delete' },
];

for (const c of cases) {
  const proc = spawnSync('H:/Tools/nodejs/node.exe', ['H:/PRISM/.claude/hooks/asset-deletion-block.mjs'], {
    input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: c.cmd } }),
    encoding: 'utf-8',
  });
  let parsed = null;
  try { parsed = JSON.parse(proc.stdout); } catch { parsed = { raw: proc.stdout }; }
  const decision = parsed.decision || (parsed.continue ? 'continue' : 'unknown');
  console.log(`${c.name.padEnd(35)} -> ${decision}`);
  if (decision === 'block') {
    const lines = (parsed.reason || '').split('\n').slice(0, 4).join(' | ');
    console.log(`  reason: ${lines.substring(0, 200)}`);
  }
}
