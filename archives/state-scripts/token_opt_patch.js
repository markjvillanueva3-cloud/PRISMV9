const fs = require("fs");
const filePath = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(filePath, "utf-8");
const original = src;
let changes = 0;

// ============================================================
// CHANGE 1: Reduce compaction recovery from 5 reminders to 1
// ============================================================
// Find: compactionRecoveryCallsRemaining = 5
// Replace: compactionRecoveryCallsRemaining = 1
src = src.replace(/compactionRecoveryCallsRemaining = 5/g, (match) => {
  changes++;
  return "compactionRecoveryCallsRemaining = 1";
});

// ============================================================
// CHANGE 2: Slim the _COMPACTION_RECOVERY block  
// Replace verbose alert/instruction/context/rule with pointer
// ============================================================
const oldRecoveryBlock = parsed._COMPACTION_RECOVERY = {
            alert: \\\u26A0\\uFE0F COMPACTION RECOVERY (\ reminders left) \\u2014 You lost context. Read files before responding.\,
            instruction: \STOP. Before doing ANYTHING: 1) Read C:\\\\PRISM\\\\state\\\\RECENT_ACTIONS.json 2) Read /mnt/transcripts/ latest file 3) Then: \\,
            context: {
              you_were_doing: recoveryData.previous_task,
              quick_resume: recoveryData.quick_resume,
              recent_decisions: recoveryData.recent_decisions
            },
            // protocol string REMOVED ? static waste
            rule: "Do NOT ask the user what to do. Do NOT explain compaction. Just continue the task seamlessly."
          };;

// Check if that exact block exists
if (src.includes('alert: \\u26A0')) {
  console.log("CHANGE 2: Exact match not found (unicode escape), trying alternate approach...");
}

// ============================================================
// CHANGE 3: Slim _context - remove _wip_reminder injection
// ============================================================
const wipReminderPattern = /if \(callNum > 0 && callNum % 8 === 0\) \{\s*ctx\._wip_reminder = [^}]+\}/;
if (wipReminderPattern.test(src)) {
  src = src.replace(wipReminderPattern, "// _wip_reminder REMOVED - token optimization v2");
  changes++;
  console.log("CHANGE 3: Removed _wip_reminder injection");
} else {
  console.log("CHANGE 3: _wip_reminder pattern not found");
}

// ============================================================  
// CHANGE 4: Slim _context - remove stale task/resume/next from COMPACTION_SURVIVAL
// Replace the survival read block with just call number
// ============================================================
// The ctx block reads from COMPACTION_SURVIVAL.json which is always stale
// Replace ctx.task/resume/next sourcing with nothing - keep just call number
const survivalReadPattern = /if \(fs\.existsSync\(survivalPath\)\) \{[\s\S]*?catch \{\s*\}\s*\}/;
const survivalMatch = src.match(survivalReadPattern);
if (survivalMatch && survivalMatch.index > 1600) {
  src = src.replace(survivalReadPattern, "// SURVIVAL READ REMOVED - was always stale. Recovery uses HOT_RESUME.md now.");
  changes++;
  console.log("CHANGE 4: Removed stale COMPACTION_SURVIVAL.json read from _context");
}

// Also remove the ACTION_TRACKER fallback for ctx.task (also stale)
const trackerCtxPattern = /if \(!ctx\.task && fs\.existsSync\(trackerPath\)\) \{[\s\S]*?catch \{\s*\}\s*\}/;
const trackerMatch = src.match(trackerCtxPattern);
if (trackerMatch && trackerMatch.index > 1600) {
  src = src.replace(trackerCtxPattern, "// TRACKER CTX REMOVED - was always stale. Recovery uses CURRENT_POSITION.md now.");
  changes++;
  console.log("CHANGE 4b: Removed stale ACTION_TRACKER read from _context");
}

console.log("\nTotal changes applied: " + changes);
console.log("Original size: " + original.length);
console.log("New size: " + src.length);

if (changes > 0) {
  fs.writeFileSync(filePath, src);
  console.log("FILE WRITTEN SUCCESSFULLY");
} else {
  console.log("NO CHANGES WRITTEN - all patterns missed");
}
