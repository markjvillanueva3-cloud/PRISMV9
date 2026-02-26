const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/constants.ts", "utf-8");
const lines = c.split("\n");
let out = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("MATERIALS") || lines[i].includes("materials") || lines[i].includes("DATA_LAYERS") || lines[i].includes("BASE_DIR") || lines[i].includes("DATA_DIR")) {
    out.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
console.log(out.join("\n"));
