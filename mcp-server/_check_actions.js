const c = require('fs').readFileSync('C:\\PRISM\\mcp-server\\dist\\index.js', 'utf8');
const m = c.match(/wip_capture/g);
console.log('wip_capture occurrences:', m ? m.length : 0);
const m2 = c.match(/checkpoint_enhanced/g);
console.log('checkpoint_enhanced:', m2 ? m2.length : 0);
const m3 = c.match(/resume_score/g);
console.log('resume_score:', m3 ? m3.length : 0);

// Find the ACTIONS array
const actionsMatch = c.match(/const ACTIONS\d*\s*=\s*\[([^\]]{100,2000})\]/);
if (actionsMatch) {
  const items = actionsMatch[1].match(/"[^"]+"/g);
  console.log('\nACTIONS array in dist:', items ? items.length : 0, 'entries');
  if (items) items.forEach(i => console.log('  ' + i));
}
