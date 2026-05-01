const fs = require("fs");
const src = fs.readFileSync("C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts", "utf-8");
const lines = src.split("\n");

// Find compactionReminders declaration and the reminder countdown logic
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("compactionReminders") || lines[i].includes("compactionRecoveryCallsRemaining")) {
    console.log("L" + (i+1) + ": " + lines[i].trimEnd());
  }
}

// Find the _context block construction
console.log("\n--- _context construction ---");
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("parsed._context") || (lines[i].includes('"_context"') && lines[i].includes('{'))) {
    for (let j = i; j < Math.min(i+25, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j].trimEnd());
      if (j > i && lines[j].includes("};")) break;
    }
    break;
  }
}

// Find the hijack/original_response echo
console.log("\n--- original_response echo ---");
for (let i = 1780; i < Math.min(1900, lines.length); i++) {
  if (lines[i].includes("original_response") || lines[i].includes("originalStr")) {
    for (let j = i; j < Math.min(i+10, lines.length); j++) {
      console.log("L" + (j+1) + ": " + lines[j].trimEnd());
    }
    break;
  }
}

// Count total lines in the compaction block (L1727 to end of hijack)
console.log("\n--- Compaction block extent ---");
let blockStart = -1, blockEnd = -1;
for (let i = 1720; i < Math.min(1900, lines.length); i++) {
  if (lines[i].includes("compactionDetectedThisCall") && blockStart < 0) blockStart = i;
  if (blockStart > 0 && lines[i].trim() === "}" && i > blockStart + 10) { blockEnd = i; break; }
}
console.log("Block: L" + (blockStart+1) + " to L" + (blockEnd+1) + " (" + (blockEnd-blockStart) + " lines)");
