const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(filePath, "utf-8");
const origSize = src.length;
let changes = 0;

// CHANGE 1: Reduce 5 reminders to 1
const c1count = (src.match(/compactionRecoveryCallsRemaining = 5/g) || []).length;
src = src.replace(/compactionRecoveryCallsRemaining = 5/g, "compactionRecoveryCallsRemaining = 1");
if (c1count > 0) { changes += c1count; console.log("CHANGE 1: " + c1count + " occurrences of '= 5' -> '= 1'"); }

// CHANGE 2: Slim _COMPACTION_RECOVERY block - replace with pointer
// Find the block that starts with 'parsed._COMPACTION_RECOVERY = {' and ends with '};'
const recoveryBlockRegex = /parsed\._COMPACTION_RECOVERY = \{[^}]*(?:\{[^}]*\}[^}]*)*\};/s;
if (recoveryBlockRegex.test(src)) {
  src = src.replace(recoveryBlockRegex, 
    parsed._COMPACTION_RECOVERY = { _read: "C:\\\\PRISM\\\\state\\\\HOT_RESUME.md", rule: "Read HOT_RESUME.md then continue seamlessly." };
  );
  changes++;
  console.log("CHANGE 2: Slimmed _COMPACTION_RECOVERY to pointer");
} else {
  console.log("CHANGE 2: Pattern not found");
}

// CHANGE 3: Remove _wip_reminder
const wipRegex = /if \(callNum > 0 && callNum % 8 === 0\) \{\s*ctx\._wip_reminder[^}]+\}/s;
if (wipRegex.test(src)) {
  src = src.replace(wipRegex, "// _wip_reminder REMOVED - token optimization v2");
  changes++;
  console.log("CHANGE 3: Removed _wip_reminder");
} else {
  console.log("CHANGE 3: _wip_reminder not found");
}

// CHANGE 4: Remove stale COMPACTION_SURVIVAL.json read from _context
// Match: if (fs.existsSync(survivalPath)) { ... } catch { } }
// This is the block at ~L1640 that reads COMPACTION_SURVIVAL.json for ctx.task/resume/next
const survRegex = /if \(fs\.existsSync\(survivalPath\)\) \{[\s\S]{50,500}?catch \{\s*\}\s*\}/;
const survMatches = src.match(survRegex);
if (survMatches && src.indexOf(survMatches[0]) > 50000) { // Only match the one deep in the file
  src = src.replace(survRegex, "// SURVIVAL_READ REMOVED - stale data. Recovery via HOT_RESUME.md");
  changes++;
  console.log("CHANGE 4: Removed stale survival read from _context");
} else {
  console.log("CHANGE 4: Survival read pattern not found (index: " + (survMatches ? src.indexOf(survMatches[0]) : "N/A") + ")");
}

// CHANGE 5: Remove stale ACTION_TRACKER read from _context
const trackerRegex = /if \(!ctx\.task && fs\.existsSync\(trackerPath\)\) \{[\s\S]{50,500}?catch \{\s*\}\s*\}/;
const trackerMatches = src.match(trackerRegex);
if (trackerMatches) {
  src = src.replace(trackerRegex, "// TRACKER_CTX REMOVED - stale data. Recovery via CURRENT_POSITION.md");
  changes++;
  console.log("CHANGE 5: Removed stale tracker read from _context");
} else {
  console.log("CHANGE 5: Tracker pattern not found");
}

console.log("\nTotal changes: " + changes);
console.log("Size: " + origSize + " -> " + src.length + " (delta: " + (src.length - origSize) + ")");

if (changes >= 3) {
  fs.writeFileSync(filePath, src);
  console.log("FILE WRITTEN");
} else {
  console.log("TOO FEW CHANGES - NOT WRITING (safety check)");
}
