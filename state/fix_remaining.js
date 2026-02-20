const fs = require("fs");
const AHW = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let lines = fs.readFileSync(AHW, "utf-8").split("\n");
let changes = 0;

// FIX 2a: Replace recovery_context block (L1838-1855) with file pointer
// Find the exact lines
let rcStart = -1, rcEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("recovery_context:") && lines[i].includes("{") && rcStart < 0) {
    rcStart = i;
  }
  if (rcStart >= 0 && i > rcStart && lines[i].trim().startsWith("},")) {
    rcEnd = i;
    break;
  }
}
if (rcStart >= 0 && rcEnd >= 0) {
  const replacement = '            recovery_context: { _read: "CURRENT_POSITION.md in data/docs/roadmap/" },';
  lines.splice(rcStart, rcEnd - rcStart + 1, replacement);
  changes++;
  console.log("FIX 2a: Replaced recovery_context (L" + (rcStart+1) + "-" + (rcEnd+1) + ") with 1-line pointer");
}

// FIX 2b: Replace reasoning_trail block with compact version
let rtStart = -1, rtEnd = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("reasoning_trail:") && lines[i].includes("{") && rtStart < 0) {
    rtStart = i;
  }
  if (rtStart >= 0 && i > rtStart && lines[i].trim().startsWith("},")) {
    rtEnd = i;
    break;
  }
}
if (rtStart >= 0 && rtEnd >= 0) {
  const replacement = '            reasoning_trail: notesEntries.length > 0 ? { notes: notesEntries.slice(-3).map((e) => "[" + e.call + "] " + e.notes) } : null,';
  lines.splice(rtStart, rtEnd - rtStart + 1, replacement);
  changes++;
  console.log("FIX 2b: Slimmed reasoning_trail (L" + (rtStart+1) + "-" + (rtEnd+1) + ") to notes-only-if-present");
}

// FIX 6: Update recovery manifest refresh from call 50 to call 10
// Find the cadence interval for autoRecoveryManifest
let manifestFixed = false;
for (let i = 0; i < lines.length; i++) {
  // Look for the modulo check for recovery manifest
  if (lines[i].includes("autoRecoveryManifest") && lines[i].includes("%")) {
    console.log("Found manifest cadence at L" + (i+1) + ": " + lines[i].trim());
    if (lines[i].includes("% 50")) {
      lines[i] = lines[i].replace("% 50", "% 10");
      manifestFixed = true;
      changes++;
      console.log("FIX 6: Changed recovery manifest refresh from %50 to %10");
    }
  }
}
if (!manifestFixed) {
  // Search for the numeric interval another way
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("RecoveryManifest") || lines[i].includes("recovery_manifest")) {
      if (i > 0 && (lines[i-1].includes("% 50") || lines[i-1].includes("% 40") || lines[i-1].includes("% 30"))) {
        console.log("Found manifest condition at L" + i + ": " + lines[i-1].trim());
      }
    }
  }
}

// FIX 7: Slim the _MANDATORY_RECOVERY instructions (5 steps ? 2)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("_MANDATORY_RECOVERY:")) {
    // Replace the 5-step instructions with 2 concise ones
    let blockEnd = -1;
    for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
      if (lines[j].trim().startsWith("},") || lines[j].trim() === "},") {
        blockEnd = j;
        break;
      }
    }
    if (blockEnd >= 0) {
      const replacement = [
        '            _MANDATORY_RECOVERY: {',
        '              step_1: "Read CURRENT_POSITION.md ? has phase, task, next steps.",',
        '              step_2: "Continue seamlessly. Do NOT re-audit or ask user what to do."',
        '            },'
      ];
      lines.splice(i, blockEnd - i + 1, ...replacement);
      changes++;
      console.log("FIX 7: Slimmed _MANDATORY_RECOVERY from 5 steps to 2");
      break;
    }
  }
}

fs.writeFileSync(AHW, lines.join("\n"), "utf-8");
console.log("\nTotal fixes this pass: " + changes);
console.log("New size: " + fs.statSync(AHW).size + " bytes");
