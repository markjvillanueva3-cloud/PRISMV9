import { readFileSync } from 'fs';

const ROUTES_PATH = 'H:/prism/mcp-server/data/docs/PRISM_KEYWORD_ROUTES.json';
const input = JSON.parse(readFileSync('/dev/stdin', 'utf-8'));
const pattern = (input.tool_input?.pattern || '').toLowerCase();
console.error('pattern:', pattern);

let routes;
try {
  routes = JSON.parse(readFileSync(ROUTES_PATH, 'utf-8')).routes;
  console.error('routes:', Object.keys(routes).length);
} catch(e) {
  console.error('LOAD FAIL:', e.message);
  console.log(JSON.stringify({continue: true}));
  process.exit(0);
}

let matches = [];
for (const [kw, route] of Object.entries(routes)) {
  const words = kw.split(' ');
  const a = words.every(w => pattern.includes(w));
  const b = pattern.length >= 3 && kw.includes(pattern);
  if (a || b) {
    console.error('MATCH:', kw);
    matches.push({keyword: kw, ...route});
  }
}
console.error('total matches:', matches.length);

if (matches.length > 0) {
  const ctx = matches.map(m => `[${m.keyword}] ${m.description} -> ${m.files?.join(', ')}`).join('\n');
  console.log(JSON.stringify({continue: true, additionalContext: 'SEARCH ROUTER:\n' + ctx}));
} else {
  console.log(JSON.stringify({continue: true}));
}
