const fs = require("fs");
try {
  const c = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
  const lines = c.split("\n");
  let out = "Total lines: " + lines.length + "\n";
  // Last 10 lines
  for (let i = Math.max(0, lines.length - 10); i < lines.length; i++) {
    out += "L" + (i+1) + ": " + lines[i] + "\n";
  }
  // Search for autoNLHookEvaluator
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes("autoNLHookEvaluator")) {
      out += "NL_HOOK@L" + (i+1) + ": " + lines[i].trim() + "\n";
    }
  }
  // Search for action2
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] && lines[i].includes("action2")) {
      out += "ACTION2@L" + (i+1) + ": " + lines[i].trim() + "\n";
    }
  }
  fs.writeFileSync("C:/PRISM/state/ahw_info.txt", out);
} catch(e) {
  fs.writeFileSync("C:/PRISM/state/ahw_info.txt", "ERROR: " + e.message);
}