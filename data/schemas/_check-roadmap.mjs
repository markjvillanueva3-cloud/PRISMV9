import { readFileSync } from 'fs';
const r = JSON.parse(readFileSync('C:/PRISM/mcp-server/data/roadmap-index.json', 'utf8'));
const pending = r.milestones.filter(m => m.status !== 'complete');
console.log('Version:', r.version, 'Total:', r.total_milestones, 'Complete:', r.completed_milestones);
console.log('Pending/Active/Blocked:', pending.length);
pending.forEach(m => console.log(' ', m.id, m.status, m.title));
