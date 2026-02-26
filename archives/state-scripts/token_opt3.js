const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(filePath, "utf-8");
const origSize = src.length;
let changes = 0;

// CHANGE 1: Reduce 5 reminders to 1
const c1 = (src.match(/compactionRecoveryCallsRemaining = 5/g) || []).length;
src = src.replace(/compactionRecoveryCallsRemaining = 5/g, "compactionRecoveryCallsRemaining = 1");
if (c1 > 0) { changes += c1; console.log("CHANGE 1: " + c1 + " x '= 5' -> '= 1'"); }

// CHANGE 2: Slim _COMPACTION_RECOVERY - replace with pointer
const recoveryRegex = /parsed\._COMPACTION_RECOVERY = \{[^}]*(?:\{[^}]*\}[^}]*)*\};/s;
if (recoveryRegex.test(src)) {
  const replacement = 'parsed._COMPACTION_RECOVERY = { _read: "C:\\\\PRISM\\\\state\\\\HOT_RESUME.md", rule: "Read HOT_RESUME.md via Shell then continue." };';
  src = src.replace(recoveryRegex, replacement);
  changes++;
  console.log("CHANGE 2: Slimmed _COMPACTION_RECOVERY");
} else { console.log("CHANGE 2: not found"); }

// CHANGE 3: Remove _wip_reminder
const wipRegex = /if \(callNum > 0 && callNum % 8 === 0\) \{\s*ctx\._wip_reminder[^}]+\}/s;
if (wipRegex.test(src)) {
  src = src.replace(wipRegex, "// _wip_reminder REMOVED v2");
  changes++;
  console.log("CHANGE 3: Removed _wip_reminder");
} else { console.log("CHANGE 3: not found"); }

// CHANGE 4: Remove stale COMPACTION_SURVIVAL read from _context
const survRegex = /if \(fs\.existsSync\(survivalPath\)\) \{[\s\S]{50,500}?catch \{\s*\}\s*\}/;
const survMatch = src.match(survRegex);
if (survMatch && src.indexOf(survMatch[0]) > 50000) {
  src = src.replace(survRegex, "// SURVIVAL_READ REMOVED v2");
  changes++;
  console.log("CHANGE 4: Removed survival read");
} else { console.log("CHANGE 4: not found (idx=" + (survMatch ? src.indexOf(survMatch[0]) : "none") + ")"); }

// CHANGE 5: Remove stale ACTION_TRACKER ctx.task fallback
const trackerRegex = /if \(!ctx\.task && fs\.existsSync\(trackerPath\)\) \{[\s\S]{50,500}?catch \{\s*\}\s*\}/;
if (trackerRegex.test(src)) {
  src = src.replace(trackerRegex, "// TRACKER_CTX REMOVED v2");
  changes++;
  console.log("CHANGE 5: Removed tracker ctx");
} else { console.log("CHANGE 5: not found"); }

console.log("\nTotal: " + changes + " | Size: " + origSize + " -> " + src.length);
if (changes >= 3) {
  fs.writeFileSync(filePath, src);
  console.log("WRITTEN");
} else { console.log("TOO FEW - SKIPPED"); }