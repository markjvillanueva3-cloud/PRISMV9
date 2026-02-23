const fs = require("fs");
const c = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = c.split("\n");
let r = [];
for (let i = 1475; i < 1492; i++) {
  r.push("L" + (i+1) + ": " + (lines[i] || ""));
}
// Find the outer function
for (let i = 1475; i >= 1200; i--) {
  if (lines[i] && lines[i].includes("async function wrapped")) {
    r.push("FUNC@L" + (i+1) + ": " + lines[i]);
    r.push("  P1: " + lines[i+1]);
    r.push("  P2: " + lines[i+2]);
    break;
  }
}
// Find action2 references near callsite
for (let i = 1460; i < 1500; i++) {
  if (lines[i] && lines[i].includes("action2")) {
    r.push("ACTION2@L" + (i+1) + ": " + lines[i]);
  }
}
fs.writeFileSync("C:/PRISM/state/action_debug.txt", r.join("\n"));