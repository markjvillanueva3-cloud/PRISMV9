const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/registries/MaterialRegistry.ts", "utf-8");
const lines = c.split("\n");
let p = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes(".json") || lines[i].includes("dataDir") || lines[i].includes("loadAll") || lines[i].includes("readFile") || lines[i].includes("DATA_PATH")) {
    p.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
console.log(p.slice(0, 30).join("\n"));
