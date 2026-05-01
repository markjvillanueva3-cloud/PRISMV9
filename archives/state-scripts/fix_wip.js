const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(filePath, "utf-8");

// Fix the mangled _wip_reminder removal
// Line 1703-1704 has: "// _wip_reminder REMOVED v2}. Notes auto-save..." + orphaned "}"
const badLine = '// _wip_reminder REMOVED v2}. Notes auto-save to SESSION_JOURNAL.jsonl and survive compaction.";\n            }';
const goodLine = '// _wip_reminder REMOVED v2';

if (src.includes(badLine)) {
  src = src.replace(badLine, goodLine);
  fs.writeFileSync(filePath, src);
  console.log("FIXED: mangled _wip_reminder line");
  console.log("New size: " + src.length);
} else {
  console.log("Pattern not found. Searching...");
  const lines = src.split("\n");
  for (let i = 1700; i < 1710; i++) {
    if (i < lines.length) console.log("L" + (i+1) + ": " + JSON.stringify(lines[i]));
  }
}