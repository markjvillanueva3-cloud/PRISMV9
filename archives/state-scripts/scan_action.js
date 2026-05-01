const fs = require("fs");
const content = fs.readFileSync("C:\\PRISM\\mcp-server\\src\\tools\\autoHookWrapper.ts", "utf-8");
const lines = content.split("\n");
// Find lines between 500-1900 that use bare 'action' (not action2, not .action, not action:, not "action")
const issues = [];
for (let i = 500; i < Math.min(lines.length, 1900); i++) {
  const line = lines[i];
  // Match standalone 'action' that's not part of action2, .action, action:, "action", 'action'
  if (/\baction\b/.test(line) && !/action2/.test(line) && !/\.action/.test(line) && !/"action"/.test(line) && !/'action'/.test(line) && !/action:/.test(line) && !/action_/.test(line) && !/Action/.test(line) && !/\/\//.test(line.split("action")[0])) {
    issues.push(`Line ${i+1}: ${line.trim().substring(0, 120)}`);
  }
}
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", issues.join("\n") || "NO ISSUES");