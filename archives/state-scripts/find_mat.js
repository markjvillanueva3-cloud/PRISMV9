const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/registries/MaterialRegistry.ts", "utf-8");
const lines = c.split("\n");
let paths = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("data/") || lines[i].includes("materials") || lines[i].includes(".json") || lines[i].includes("loadMaterial") || lines[i].includes("readFile") || lines[i].includes("dataDir")) {
    paths.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
fs.writeFileSync("C:/PRISM/state/mat_paths.txt", paths.slice(0, 40).join("\n"));