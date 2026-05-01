const fs = require('fs');
const src = fs.readFileSync('C:\\PRISM\\mcp-server\\dist\\index.js', 'utf8');
const re = /\.tool\(\s*["']([^"']+)["']/g;
const names = new Set();
let m;
while (m = re.exec(src)) names.add(m[1]);
const sorted = [...names].sort();
console.log('UNIQUE TOOLS:', sorted.length);
sorted.forEach(n => console.log(n));
