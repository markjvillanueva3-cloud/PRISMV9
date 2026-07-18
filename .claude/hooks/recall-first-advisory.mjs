#!/usr/bin/env node
// recall-first-advisory.mjs — PreToolUse:Read advisory (U-GCF-RECALL-FIRST). Pure thin wrapper over the
// shipped lib; never blocks. Knobs: PRISM_GCF_RECALL_DISABLE=1, PRISM_GCF_RECALL_MIN_BYTES=N.
import { recallFirst, recordRecallSavings } from "../../scripts/lib/recall-first.mjs";
if (process.env.PRISM_GCF_RECALL_DISABLE === "1") { process.stdout.write(JSON.stringify({ continue: true })); process.exit(0); }
let raw = ""; process.stdin.on("data", (d) => (raw += d)); process.stdin.on("end", () => {
  let fp = ""; try { fp = (JSON.parse(raw).tool_input || {}).file_path || ""; } catch {}
  let r = { nudge: false }; try { r = recallFirst(fp); } catch {}
  if (r && r.nudge && r.text) {
    try { recordRecallSavings(r, {}); } catch {}
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: r.text } }));
  } else { process.stdout.write(JSON.stringify({ continue: true })); }
});