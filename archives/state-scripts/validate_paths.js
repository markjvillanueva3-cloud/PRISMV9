const fs = require('fs');
const content = fs.readFileSync('C:/PRISM/mcp-server/src/constants.ts', 'utf8');
const regex = /"(C:\\\\PRISM[^"]+)"/g;
let m;
while ((m = regex.exec(content)) !== null) {
  const raw = m[1];
  const fsPath = raw.replace(/\\\\/g, '/');
  const exists = fs.existsSync(fsPath);
  console.log((exists ? 'OK  ' : 'MISS') + ' ' + raw);
}
