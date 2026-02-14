const fs = require('fs');

// Fix: bind HTTP server to localhost only (XA-6 security foundation)
const indexPath = 'C:\\PRISM\\mcp-server\\src\\index.ts';
let content = fs.readFileSync(indexPath, 'utf-8');

const old = `  app.listen(port, () => {
    log.info(\`MCP server running on http://localhost:\${port}/mcp\`);
  });`;

const fix = `  // XA-6: Local-only transport during development (P0-R5)
  app.listen(port, '127.0.0.1', () => {
    log.info(\`MCP server running on http://127.0.0.1:\${port}/mcp\`);
  });`;

if (content.includes(old)) {
  content = content.replace(old, fix);
  fs.writeFileSync(indexPath, content, 'utf-8');
  console.log('index.ts: HTTP server bound to 127.0.0.1 (XA-6)');
} else {
  console.log('index.ts: SKIP (pattern not found or already fixed)');
}

// Add input validation for material name params (XA-6 step 23f)
const calcPath = 'C:\\PRISM\\mcp-server\\src\\tools\\dispatchers\\calcDispatcher.ts';
let calc = fs.readFileSync(calcPath, 'utf-8');

// Check if material validation helper exists
if (!calc.includes('validateMaterialName')) {
  // Add validation function after the import block
  const importEnd = calc.indexOf('\nconst ACTIONS');
  if (importEnd > -1) {
    const validationFn = `
/** XA-6: Basic input validation for material name parameters */
function validateMaterialName(name: string | undefined): string | null {
  if (!name) return null;
  // Reject path traversal, injection patterns
  if (/[\\.\\.\\/\\\\]|<|>|\\$|\\{|\\}/.test(name)) return null;
  // Allow alphanumeric + common material name chars
  if (!/^[a-zA-Z0-9\\-_.\\/\\s]+$/.test(name)) return null;
  return name.trim();
}
`;
    calc = calc.slice(0, importEnd) + validationFn + calc.slice(importEnd);
    fs.writeFileSync(calcPath, calc, 'utf-8');
    console.log('calcDispatcher: material name validation added (XA-6)');
  }
} else {
  console.log('calcDispatcher: SKIP (validation already exists)');
}

console.log('Security foundation wiring complete.');
