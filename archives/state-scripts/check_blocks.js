const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");

// Find recovery_context block
const lines = src.split("\n");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("recovery_context:") && lines[i].includes("{")) {
    console.log("recovery_context starts at L" + (i+1));
    for (let j = i; j < Math.min(i + 20, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
      if (j > i && lines[j].trim().startsWith("},")) break;
    }
    break;
  }
}

console.log("\n---");

// Find reasoning_trail block
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("reasoning_trail:") && lines[i].includes("{")) {
    console.log("reasoning_trail starts at L" + (i+1));
    for (let j = i; j < Math.min(i + 15, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j]);
      if (j > i && lines[j].trim().startsWith("},")) break;
    }
    break;
  }
}
