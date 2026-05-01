const fs = require("fs");
const path = require("path");
const filePath = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(filePath, "utf-8");
const origSize = src.length;
let changes = 0;

// ============================================================
// CHANGE 6: Replace the entire hijack block with HOT_RESUME reader
// The old block reads 5 stale files and constructs a ~5KB JSON
// New block reads CURRENT_POSITION.md (1KB, always fresh) + writes HOT_RESUME.md
// ============================================================

// Find the hijack block: starts with "if (compactionDetectedThisCall) {"
// and ends with the matching "} else {"
const hijackStart = src.indexOf("if (compactionDetectedThisCall) {");
if (hijackStart < 0) { console.log("CHANGE 6: hijack block not found"); process.exit(1); }

// Find the matching else
let braceCount = 0;
let hijackEnd = -1;
for (let i = hijackStart; i < src.length; i++) {
  if (src[i] === "{") braceCount++;
  if (src[i] === "}") {
    braceCount--;
    if (braceCount === 0) {
      hijackEnd = i + 1; // includes the closing }
      break;
    }
  }
}

if (hijackEnd < 0) { console.log("CHANGE 6: could not find matching brace"); process.exit(1); }

const oldBlock = src.substring(hijackStart, hijackEnd);
console.log("Old hijack block: " + oldBlock.length + " chars, " + oldBlock.split("\n").length + " lines");

// New lean block: read CURRENT_POSITION.md, build a ~500 byte recovery payload
const newBlock = `if (compactionDetectedThisCall) {
          // TOKEN OPT v2: Lean compaction recovery
          // Read CURRENT_POSITION.md (always fresh, ~1KB) instead of 5 stale state files
          let hotResume = "";
          try {
            const cpPath = "C:\\\\PRISM\\\\mcp-server\\\\data\\\\docs\\\\roadmap\\\\CURRENT_POSITION.md";
            if (fs.existsSync(cpPath)) {
              hotResume = fs.readFileSync(cpPath, "utf-8").slice(0, 2000);
            }
          } catch {}
          
          // Also read HOT_RESUME.md if it exists (auto-maintained by cadence)
          let hotResumeExtra = "";
          try {
            const hrPath = "C:\\\\PRISM\\\\state\\\\HOT_RESUME.md";
            if (fs.existsSync(hrPath)) {
              hotResumeExtra = fs.readFileSync(hrPath, "utf-8").slice(0, 3000);
            }
          } catch {}
          
          const hijacked = {
            _COMPACTION_DETECTED: true,
            _RECOVERY: {
              instruction: "Read HOT_RESUME below, then continue seamlessly. Do NOT ask user what happened.",
              position: hotResume,
              context: hotResumeExtra,
            },
            _original: parsed
          };
          result.content[0].text = JSON.stringify(hijacked);
          compactionDetectedThisCall = false;`;

src = src.substring(0, hijackStart) + newBlock + src.substring(hijackEnd);
changes++;
console.log("CHANGE 6: Replaced " + oldBlock.split("\n").length + "-line hijack with " + newBlock.split("\n").length + "-line lean recovery");

// ============================================================
// CHANGE 7: Add HOT_RESUME.md writer to the checkpoint cadence (every 10 calls)
// This writes a compact 2KB summary that survives compaction
// ============================================================
// Find the autoCheckpoint function call site or the checkpoint cadence block
const checkpointMarker = "CHECKPOINT_AUTO_SAVED";
const cpIdx = src.indexOf(checkpointMarker);
if (cpIdx > 0) {
  // Find the line end after this marker to insert our HOT_RESUME writer
  const lineEnd = src.indexOf("\n", cpIdx);
  if (lineEnd > 0) {
    const hotResumeWriter = `
          // TOKEN OPT v2: Write HOT_RESUME.md at checkpoint cadence
          try {
            const hrPath = "C:\\\\PRISM\\\\state\\\\HOT_RESUME.md";
            const cpPath = "C:\\\\PRISM\\\\mcp-server\\\\data\\\\docs\\\\roadmap\\\\CURRENT_POSITION.md";
            let positionContent = "";
            try { positionContent = fs.existsSync(cpPath) ? fs.readFileSync(cpPath, "utf-8").slice(0, 1500) : ""; } catch {}
            const hotContent = [
              "# HOT_RESUME (auto-generated at call " + callNum + " - " + new Date().toISOString() + ")",
              "",
              "## Position",
              positionContent,
              "",
              "## Recent Activity",
              "Last 5 tool calls: " + (recentActions || []).slice(-5).map(a => a.tool + ":" + a.action).join(", "),
              "",
              "## Recovery Instructions", 
              "1. Read this file for context",
              "2. Continue the task described in Position above",
              "3. Do NOT re-audit, re-investigate, or ask user what to do",
              "4. Transcripts available at /mnt/transcripts/ on Claude container for deep context"
            ].join("\\n");
            fs.writeFileSync(hrPath, hotContent);
          } catch {}`;
    src = src.substring(0, lineEnd) + hotResumeWriter + src.substring(lineEnd);
    changes++;
    console.log("CHANGE 7: Added HOT_RESUME.md writer at checkpoint cadence");
  }
}

console.log("\nTotal phase 2 changes: " + changes);
console.log("Size: " + origSize + " -> " + src.length + " (delta: " + (src.length - origSize) + ")");

if (changes >= 2) {
  fs.writeFileSync(filePath, src);
  console.log("WRITTEN");
} else {
  console.log("TOO FEW - SKIPPED");
}