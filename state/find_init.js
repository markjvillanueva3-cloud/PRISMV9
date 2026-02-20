const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/registries/MaterialRegistry.ts", "utf-8");
const lines = c.split("\n");
// Show first 80 lines for init/constructor/paths
let out = [];
for (let i = 0; i < 100; i++) {
  if (lines[i] && (lines[i].includes("path") || lines[i].includes("dir") || lines[i].includes("LAYER") || lines[i].includes("DATA") || lines[i].includes("constructor") || lines[i].includes("loadAll") || lines[i].includes("CORE") || lines[i].includes("EXT"))) {
    out.push("L" + (i+1) + ": " + lines[i].trim());
  }
}
console.log(out.join("\n"));
