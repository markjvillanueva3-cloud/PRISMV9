> **✅ RESOLVED 2026-06-02 (commit `f5d1bda116`, slot:alpha — compiled into the golf-night workload).** The hook `.claude/hooks/recall-first-advisory.mjs` (13-line wrapper over the tested `scripts/lib/recall-first.mjs`) is wired into BOTH `C:\Users\wompu\.claude\settings.json` and `H:\.claude\settings.json` under the `PreToolUse` `Read` matcher (after `wiki-read-offload-advisory`), applied via a JSON-parse-gated raw-FS splice writer (backup: `settings.json.bak-recall-first`). Both files parse, byte-identical (80313 B), exactly 1 occurrence. E2E verified: master `MEMORY.md` (21931 B) → "Est. savings ~5183 tok"; small galaxy brains (<4096 B) correctly silent; wiki paths defer to the wiki hooks. Lib 21/21 tests green. Golf must NOT re-apply. Logged in `state/shared/specs/GOLF-NIGHT-WORKLOAD.md`.

# HOOK-PATCH-GCF-RECALL-FIRST — wire recall-first nudge as a PreToolUse:Read advisory

**Owner to apply:** golf (or any slot with hook/settings write access — alpha is harness-blocked from
`.claude/hooks/*` + `settings.json` in its worktree, so this is a patch-sibling).
**Unit:** GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-RECALL-FIRST (alpha, 2026-05-31). Mechanism shipped + tested
(`scripts/lib/recall-first.mjs`, 19 node:test, 2-reviewer PASS). This patch only WIRES the nudge.

## What it does
When a chat is about to `Read` a large recallable BRAIN/MEMORY file (galaxy `engines/<g>/MEMORY.md`,
`knowledge/memories/**`, the C: auto-memory dir, or the master `MEMORY.md`), surface a one-line advisory:
re-reading the whole file ≈ bytes/4 tok vs `prism_memory:semantic_search` ~3 snippets ≈ 300 tok — with the
estimated savings. Records the estimate to `state/shared/dashboards/recall-first-savings.json` (the metric
`U-GCF-SAVINGS-TELEMETRY` rolls up). Advisory only — never blocks the Read. Does NOT cover the wiki surface
(`wiki-recall-on-read.mjs` + `wiki-read-offload-advisory.mjs` already own it — verified by the lib's wiki
exclusion + a fail-on-revert test).

## Step 1 — create the thin hook `.claude/hooks/recall-first-advisory.mjs`
```js
#!/usr/bin/env node
// recall-first-advisory.mjs — PreToolUse:Read advisory (U-GCF-RECALL-FIRST). Pure thin wrapper over the
// shipped lib; never blocks. Knobs: PRISM_GCF_RECALL_DISABLE=1, PRISM_GCF_RECALL_MIN_BYTES=N.
import { recallFirst, recordRecallSavings } from "../../scripts/lib/recall-first.mjs";
let raw = ""; process.stdin.on("data", (d) => (raw += d)); process.stdin.on("end", () => {
  let fp = ""; try { fp = (JSON.parse(raw).tool_input || {}).file_path || ""; } catch {}
  let r = { nudge: false }; try { r = recallFirst(fp); } catch {}
  if (r && r.nudge && r.text) {
    try { recordRecallSavings(r, {}); } catch {}
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", additionalContext: r.text } }));
  } else { process.stdout.write(JSON.stringify({ continue: true })); }
});
```
(Mirror the portable-node invocation + the `continue:true` default-allow shape of the sibling
`wiki-read-offload-advisory.mjs`. NEVER return a deny — this is advisory.)

## Step 2 — wire in `C:\Users\<u>\.claude\settings.json` (auto-mirrors to H: via c-to-h-mirror)
Add to `PreToolUse` → matcher `"Read"` → `hooks[]`, AFTER `wiki-read-offload-advisory.mjs` (so the wiki
surface is claimed by the wiki hook first; recall-first only fires on the brain/memory surface it classifies):
```json
{ "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/recall-first-advisory.mjs" }
```

## Step 3 — verify
```bash
echo '{"tool_input":{"file_path":"H:/prism/mcp-server/src/engines/quoting/MEMORY.md"}}' | "H:/.claude/bin/portable-node" .claude/hooks/recall-first-advisory.mjs
# expect: JSON with hookSpecificOutput.additionalContext containing "♻ recall-first" + a big savings number
echo '{"tool_input":{"file_path":"H:/prism/knowledge/wiki/architecture/foo.md"}}' | "H:/.claude/bin/portable-node" .claude/hooks/recall-first-advisory.mjs
# expect: {"continue":true}  (wiki deferred — no double-cover)
node scripts/recall-first.mjs summary   # after a few real reads → non-zero cumulative est savings
```

## Knobs
- `PRISM_GCF_RECALL_DISABLE=1` → no-op.
- `PRISM_GCF_RECALL_MIN_BYTES=N` → nudge floor (default 4096; below this, recall overhead isn't worth it).

## Notes
- SINGLE-WRITER: the hook writes only `recall-first-savings.json` — never offload-stats / wiki-recall-counts.
- The metric feeds `U-GCF-SAVINGS-TELEMETRY` (the Phase D capstone that proves the federation's savings, R12).
- Wiki: [[galaxy-context-federation]]. Sibling patches: HOOK-PATCH-GCF-CAG-REGEN-WIRE.md, HOOK-PATCH-GCF-XGALAXY-INJECT.md.
