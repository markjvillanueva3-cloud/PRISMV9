const fs = require('fs');

console.log('=== TASK_QUEUE.json ===');
try {
  const tq = JSON.parse(fs.readFileSync('h:\\PRISM\\state\\shared\\TASK_QUEUE.json', 'utf-8'));
  console.log('Total tasks:', tq.queue?.length || 0);
  console.log('Completed:', tq.done?.length || 0);
  console.log('Available:', tq.available?.length || 0);
  console.log('Blocked:', tq.blocked?.length || 0);
  console.log('\nFirst available task:', tq.available?.[0] || 'None');
  console.log('First blocked task:', tq.blocked?.[0] || 'None');
} catch (e) {
  console.log('Error reading TASK_QUEUE:', e.message);
}

console.log('\n=== SVI-compact.md ===');
try {
  const svi = fs.readFileSync('h:\\PRISM\\state\\shared\\SVI-compact.md', 'utf-8');
  console.log(svi);
} catch (e) {
  console.log('Error reading SVI:', e.message);
}

console.log('\n=== CLAUDE.md (first 2000 chars) ===');
try {
  const claude = fs.readFileSync('h:\\PRISM\\CLAUDE.md', 'utf-8');
  console.log(claude.substring(0, 2000));
} catch (e) {
  console.log('Error reading CLAUDE.md:', e.message);
}

console.log('\n=== SESSION_STATE.json ===');
try {
  const ss = JSON.parse(fs.readFileSync('h:\\PRISM\\SESSION_STATE.json', 'utf-8'));
  console.log(JSON.stringify(ss, null, 2));
} catch (e) {
  console.log('Error reading SESSION_STATE:', e.message);
}
