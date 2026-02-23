const fs = require("fs");
// Check multiple possible locations
const paths = [
  "C:/PRISM/mcp-server/data/formulas",
  "C:/PRISM/data/formulas",
  "C:/PRISM/mcp-server/src/registries"
];
for (const p of paths) {
  try {
    const files = fs.readdirSync(p);
    const jsonFiles = files.filter(f => f.endsWith(".json") || f.endsWith(".ts"));
    console.log(p + ": " + jsonFiles.join(", "));
    // Read first JSON file to understand structure
    for (const f of jsonFiles.filter(f => f.endsWith(".json")).slice(0, 1)) {
      const data = JSON.parse(fs.readFileSync(p + "/" + f, "utf-8"));
      if (Array.isArray(data)) {
        console.log("  " + f + ": " + data.length + " entries");
        if (data[0]) console.log("  Sample keys: " + Object.keys(data[0]).slice(0, 10).join(", "));
      } else if (typeof data === "object") {
        const keys = Object.keys(data);
        console.log("  " + f + ": " + keys.length + " top-level keys");
        if (keys[0]) console.log("  Sample: " + keys[0] + " -> " + JSON.stringify(data[keys[0]]).substring(0, 200));
      }
    }
  } catch (e) { console.log(p + ": " + e.message); }
}
