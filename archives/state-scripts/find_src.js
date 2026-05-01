const fs = require("fs");
const path = require("path");
function searchDir(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, {withFileTypes: true});
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "node_modules" && e.name !== "dist") {
      results.push(...searchDir(full));
    } else if (e.isFile() && e.name.endsWith(".ts")) {
      const content = fs.readFileSync(full, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("CURRENT$")) {
          results.push(`${full}:${i+1}: ${lines[i].trim().substring(0, 150)}`);
        }
      }
    }
  }
  return results;
}
const r = searchDir("C:\\PRISM\\mcp-server\\src");
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", r.join("\n") || "NOT FOUND IN SOURCE");