const fs = require("fs");
const dist = fs.readFileSync("C:\\PRISM\\mcp-server\\dist\\index.js", "utf-8");
const hasOld = dist.includes("*??\\s*CURRENT");
const hasNew = dist.includes("(?:\\u2190|\\?\\?)");
const hasCallsite = dist.includes("CALLSITE: call=");
fs.writeFileSync("C:\\PRISM\\state\\trigger_output.txt", 
  `Old bad regex: ${hasOld}\nNew fixed regex: ${hasNew}\nCallsite debug: ${hasCallsite}`);