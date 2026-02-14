const c = require('fs').readFileSync('C:\\PRISM\\mcp-server\\dist\\index.js','utf8');
// Find the session dispatcher registration - look for "prism_session" near z.enum
const idx = c.indexOf('"prism_session"');
if (idx > 0) {
  // Get surrounding context (500 chars before, 1000 after)
  const start = Math.max(0, idx - 200);
  const end = Math.min(c.length, idx + 1500);
  const ctx = c.slice(start, end);
  console.log('=== prism_session registration ===');
  console.log(ctx);
}
