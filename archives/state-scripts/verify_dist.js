const fs = require("fs");
const d = fs.readFileSync("C:/PRISM/mcp-server/dist/index.js", "utf-8");
const checks = [
  ["One-shot reminders", "compactionRecoveryCallsRemaining = 1"],
  ["HOT_RESUME reader", "HOT_RESUME.md"],
  ["Lean recovery", "_COMPACTION_DETECTED: true"],
  ["CURRENT_POSITION read", "CURRENT_POSITION.md"],
  ["Old stale manifest", "THIS IS YOUR PRIMARY RECOVERY SOURCE"],
  ["Old 5 reminders", "compactionRecoveryCallsRemaining = 5"],
  ["Old _wip_reminder", "_wip_reminder"]
];
for (const [name, pattern] of checks) {
  const found = d.includes(pattern);
  const status = name.startsWith("Old") ? (found ? "BAD (still present)" : "GOOD (removed)") : (found ? "GOOD (present)" : "BAD (missing)");
  console.log(status + ": " + name);
}