const fs = require("fs");
const path = require("path");

const AHW = "C:/PRISM/mcp-server/src/tools/autoHookWrapper.ts";
let src = fs.readFileSync(AHW, "utf-8");
let changes = 0;

// ============================================================
// FIX 1: Kill original_response in compaction block
// The line original_response: parsed, re-injects the ENTIRE tool response
// into the recovery payload, doubling token cost
// ============================================================
if (src.includes("original_response: parsed,")) {
  src = src.replace(
    "original_response: parsed,",
    '// original_response REMOVED ? was doubling token cost by re-injecting full response'
  );
  changes++;
  console.log("FIX 1: Removed original_response from compaction block");
}

// ============================================================
// FIX 2: Slim the recovery block ? remove duplicate/stale sections
// - recovery_context duplicates recovery_manifest
// - reasoning_trail is empty 99% of the time (no one uses _notes)
// - recent_tool_calls duplicates journal
// - protocol is static string wasting tokens
// ============================================================

// Replace the massive recovery_context block with a 1-line pointer
const rcStart = 'recovery_context: {';
const rcPattern = /recovery_context:\s*\{[^}]*quick_resume[^}]*recent_decisions[^}]*\},/s;
if (rcPattern.test(src)) {
  src = src.replace(rcPattern, 
    'recovery_context: { _read: "C:\\\\PRISM\\\\mcp-server\\\\data\\\\docs\\\\roadmap\\\\CURRENT_POSITION.md" },'
  );
  changes++;
  console.log("FIX 2a: Replaced recovery_context with file pointer");
}

// Replace reasoning_trail with compact version (only if notes exist)
const rtPattern = /reasoning_trail:\s*\{[^}]*total_entries[^}]*_hint[^}]*\},/s;
if (rtPattern.test(src)) {
  src = src.replace(rtPattern,
    'reasoning_trail: notesEntries.length > 0 ? { notes: notesEntries.map((e) => "[" + e.call + "] " + e.notes).slice(-3) } : null,'
  );
  changes++;
  console.log("FIX 2b: Slimmed reasoning_trail to notes-only");
}

// Remove the static protocol string
if (src.includes('protocol: "6 LAWS:')) {
  src = src.replace(/protocol:\s*"6 LAWS:[^"]*",?/, '// protocol string REMOVED ? static waste');
  changes++;
  console.log("FIX 2c: Removed static protocol string");
}

// Remove recent_tool_calls (duplicates journal)
const rtcPattern = /recent_tool_calls:\s*\(recentActionsInfo[^)]*\)[^,]*,/s;
if (rtcPattern.test(src)) {
  src = src.replace(rtcPattern, '// recent_tool_calls REMOVED ? duplicates SESSION_JOURNAL');
  changes++;
  console.log("FIX 2d: Removed recent_tool_calls");
}

// Remove transcripts hint from compaction block
if (src.includes("transcripts: transcriptHint,")) {
  src = src.replace("transcripts: transcriptHint,", "// transcripts hint REMOVED ? static string");
  changes++;
  console.log("FIX 2e: Removed transcripts hint from compaction");
}

// ============================================================
// FIX 3: Slim the normal _context block
// Remove static hints and reduce verbosity
// ============================================================

// Remove the static _hint line
if (src.includes('ctx._hint = "If you lost context')) {
  src = src.replace(/ctx\._hint = "If you lost context[^"]*";/, '// _hint REMOVED ? static waste, points stale');
  changes++;
  console.log("FIX 3a: Removed static _hint from _context");
}

// Remove static transcripts_hint
if (src.includes('ctx.transcripts_hint = "/mnt/transcripts/')) {
  src = src.replace(/ctx\.transcripts_hint = "\/mnt\/transcripts\/[^"]*";/, '// transcripts_hint REMOVED ? static waste');
  changes++;
  console.log("FIX 3b: Removed static transcripts_hint from _context");
}

// ============================================================  
// FIX 4: Reduce CADENCE_FIRES.json write frequency
// Currently writes every single call ? change to every 5th call
// ============================================================
const firesWrite = 'fs.writeFileSync(cadenceFiresPath, JSON.stringify(fires, null, 2));';
if (src.includes(firesWrite)) {
  src = src.replace(firesWrite, 
    'if (callNum % 5 === 0) fs.writeFileSync(cadenceFiresPath, JSON.stringify(fires, null, 2));'
  );
  changes++;
  console.log("FIX 4: Reduced CADENCE_FIRES.json writes to every 5th call");
}

// ============================================================
// FIX 5: Apply slimJsonResponse to main tool responses
// The function is imported but never applied to actual results
// Add it right after the handler returns (line ~738-740 area)
// ============================================================
// Find where result is set from handler
const handlerReturn = 'result = await handler.apply(this, args);';
if (src.includes(handlerReturn)) {
  src = src.replace(handlerReturn, 
    handlerReturn + '\n            // FIX 5: Slim main tool response based on pressure\n            try { const _sl = getSlimLevel(getCurrentPressurePct()); if (_sl !== "NORMAL") { const txt = result?.content?.[0]?.text; if (txt) { try { const _p = JSON.parse(txt); result.content[0].text = JSON.stringify(slimJsonResponse(_p, _sl)); } catch {} } } } catch {}'
  );
  changes++;
  console.log("FIX 5: Applied responseSlimmer to main tool responses at MODERATE+ pressure");
}

fs.writeFileSync(AHW, src, "utf-8");
console.log("\nTotal changes: " + changes);
console.log("New size: " + fs.statSync(AHW).size + " bytes");
