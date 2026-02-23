const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = c.split("\n");
let found = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("CURRENT$") || lines[i].includes("*??")) {
    found.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
fs.writeFileSync("C:/PRISM/state/regex_check.txt", found.join("\n") || "CLEAN - no bad regex");