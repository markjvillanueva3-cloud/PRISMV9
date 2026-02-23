const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/constants.ts", "utf-8");
const lines = c.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("MACHINE") || lines[i].includes("machine")) {
    console.log("L" + (i+1) + ": " + lines[i].trim());
  }
}
