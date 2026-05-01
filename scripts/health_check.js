/**
 * PRISM Post-Restart Health Check
 * Run AFTER restarting Claude Desktop to verify all systems loaded.
 * 
 * Tests each dispatcher with a lightweight probe call.
 * Reports: loaded/failed/action count for each.
 * 
 * Usage: Called via prism_dev or manually after restart
 *        node scripts/health_check.js (for reference - actual check uses MCP)
 * 
 * NOTE: This is a REFERENCE script. The actual health check should be run
 * through MCP calls. Use this pattern:
 * 
 * Quick health check sequence:
 *   prism_autopilot_d action=working_tools
 *   prism_autopilot_d action=registry_status
 */
const fs = require('fs');
const path = require('path');

// Parse all dispatcher files to build expected inventory
const DISP_DIR = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers';
const dispatchers = [];

for (const f of fs.readdirSync(DISP_DIR)) {
  if (!f.endsWith('.ts')) continue;
  const content = fs.readFileSync(path.join(DISP_DIR, f), 'utf8');
  
  const toolMatch = content.match(/server\.tool\(\s*"(prism_\w+)"/) || 
                    content.match(/name:\s*"(prism_\w+)"/) ||
                    content.match(/["'](prism_\w+)["']/);
  const actionsMatch = content.match(/const\s+ACTIONS\s*=\s*\[([\s\S]*?)\]\s*as\s*const/);
  
  if (toolMatch) {
    const actions = actionsMatch 
      ? (actionsMatch[1].match(/"(\w+)"/g) || []).map(s => s.replace(/"/g, ''))
      : [];
    dispatchers.push({
      file: f,
      tool: toolMatch[1],
      actionCount: actions.length,
      actions: actions,
      lines: content.split('\n').length,
      kb: +(fs.statSync(path.join(DISP_DIR, f)).size / 1024).toFixed(1)
    });
  }
}

dispatchers.sort((a, b) => a.tool.localeCompare(b.tool));

console.log('=== PRISM Dispatcher Inventory ===\n');
console.log('  # | Tool                  | Actions | Lines |    KB | File');
console.log('-'.repeat(85));

let totalActions = 0, totalLines = 0, totalKB = 0;
dispatchers.forEach((d, i) => {
  totalActions += d.actionCount;
  totalLines += d.lines;
  totalKB += d.kb;
  console.log(
    String(i + 1).padStart(3) + ' | ' +
    d.tool.padEnd(21) + ' | ' +
    String(d.actionCount).padStart(7) + ' | ' +
    String(d.lines).padStart(5) + ' | ' +
    String(d.kb).padStart(5) + ' | ' +
    d.file
  );
});

console.log('-'.repeat(85));
console.log('    | TOTAL' + ' '.repeat(16) + ' | ' + 
  String(totalActions).padStart(7) + ' | ' +
  String(totalLines).padStart(5) + ' | ' +
  String(totalKB.toFixed(1)).padStart(5) + ' |');

console.log('\n=== Action Inventory ===\n');
dispatchers.forEach(d => {
  if (d.actions.length > 0) {
    console.log(d.tool + ': ' + d.actions.join(', '));
  }
});
