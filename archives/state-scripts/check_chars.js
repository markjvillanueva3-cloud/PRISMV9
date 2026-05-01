const fs = require("fs");
const content = fs.readFileSync("C:\\PRISM\\mcp-server\\src\\tools\\autoHookWrapper.ts", "utf-8");
const lines = content.split("\n");
const line = lines[1861]; // 0-indexed
const chars = [];
for (let i = 0; i < line.length; i++) {
  const c = line.charCodeAt(i);
  if (c > 127 || c < 32) chars.push(`[${i}]=U+${c.toString(16).padStart(4,"0")}`);
}
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", 
  `Line: ${line.trim()}\nSpecial chars: ${chars.join(", ")}\nLength: ${line.length}`);