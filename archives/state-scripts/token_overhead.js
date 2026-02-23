const fs = require("fs");

// Read recovery manifest to measure its size
const manifest = JSON.parse(fs.readFileSync("C:/PRISM/state/RECOVERY_MANIFEST.json", "utf-8"));
const manifestStr = JSON.stringify(manifest);
console.log("Recovery manifest injection: " + manifestStr.length + " chars (~" + Math.round(manifestStr.length/4) + " tokens)");

// Read recent actions
const actions = JSON.parse(fs.readFileSync("C:/PRISM/state/RECENT_ACTIONS.json", "utf-8"));
const actionsStr = JSON.stringify(actions);
console.log("Recent actions: " + actionsStr.length + " chars (~" + Math.round(actionsStr.length/4) + " tokens)");

// Read context pressure
const pressure = JSON.parse(fs.readFileSync("C:/PRISM/state/context_pressure.json", "utf-8"));
const pressureStr = JSON.stringify(pressure);
console.log("Context pressure: " + pressureStr.length + " chars (~" + Math.round(pressureStr.length/4) + " tokens)");

// Estimate total per-call overhead
// Each response gets: _cadence{} + _context{} + sometimes _COMPACTION_RECOVERY
// From observed responses, the _cadence block is ~200 chars, _context is ~400 chars
// On compaction: adds _MANDATORY_RECOVERY (~2KB) + recovery_manifest (~1.5KB) + reasoning_trail (~1KB)
console.log("\n--- ESTIMATED PER-CALL OVERHEAD ---");
console.log("Normal call: ~600 chars (~150 tokens) for _cadence + _context");
console.log("Compaction recovery: ~5000 chars (~1250 tokens) for full recovery payload");
console.log("With 40-call session: ~6000 tokens overhead from cadence injection");
console.log("That's ~0.6% of 1M token window");

// Count transcripts
const transcriptDir = "/mnt/transcripts";
// Can't access from Windows, estimate from state
console.log("\n--- SESSION CONTINUITY ---");
const journal = fs.readFileSync("C:/PRISM/state/SESSION_JOURNAL.jsonl", "utf-8");
const entries = journal.trim().split("\n").length;
console.log("Journal entries: " + entries);
console.log("Journal size: " + journal.length + " chars");
