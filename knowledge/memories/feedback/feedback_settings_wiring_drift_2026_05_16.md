---
name: feedback-settings-wiring-drift-2026-05-16
description: "Settings.json hook wiring SILENTLY REVERTS across multi-chat fleets. Hooks shipped to disk + memos written + envelope marked complete, but settings.json edits get clobbered later by another chat's merge/regen. Detection: grep settings.json for the wired hook name before declaring a unit complete."
aliases: feedback_settings_wiring_drift_2026_05_16
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.443Z
---


# Settings.json wiring silently reverts across multi-chat fleets

## What happened

2026-05-16 slot ECHO (claude-a61bbf34) ran the SYSTEM-VIZ-BRAIN-MS0 /loop. Handoff RESUME said U-P0-AUDIT-VIZ-FIRST was pending. Filesystem audit found:

- `.claude/commands/audit-viz-first.md` ✓ exists
- `.claude/hooks/audit-viz-first-inject.mjs` ✓ exists, 158 LOC, real implementation
- `scripts/system-viz-query.mjs` ✓ exists
- `knowledge/wiki/architecture/system-viz-first-audit.md` ✓ exists
- `feedback_system_viz_first_audit.md` ✓ exists in vault
- `reference_post_ship_system-viz-brain-ms0-u-p0-audit-viz-first.md` ✓ exists (auto-distilled by post-ship-distill hook)
- Milestone envelope: `U-P0-AUDIT-VIZ-FIRST` status=`complete` shipped 2026-05-15 by `claude-a61bbf34 (slot delta)` — same chat-id, prior session

But: `grep audit-viz-first` in BOTH `H:/.claude/settings.json` and `C:/Users/wompu/.claude/settings.json` returned **ZERO matches**. The hook was on disk + the envelope said shipped, but the hook was NOT firing because the wiring had been REVERTED.

Same pattern for `post-ship-distill.mjs` (U-P1's Stop hook).

The commit message for `0c11ff1cb` explicitly states the hook was "wired into UserPromptSubmit chain at idx 5 (after master-index-precheck-inject) in C: settings.json; auto-mirrored to H: by c-to-h-mirror hook." That wiring is GONE in the current files.

## Why this class of regression is silent

1. **settings.json is OUTSIDE the H:/prism git tree** — it lives at `C:/Users/wompu/.claude/settings.json` (auto-mirrored to `H:/.claude/settings.json`). No git history, no diff in PR review, no `stop_on_unwired_assets` check (which scans the H:/prism repo, not the harness config).
2. **Multi-chat fleets edit settings.json concurrently** — each chat that adds a new hook does a read-modify-write on the JSON. Two chats racing → last writer wins → the loser's hook entries disappear.
3. **The artifacts on disk look "shipped"** — the hook .mjs file is there, the wiki entry is there, the envelope says complete. Every signal except the actual wiring says "done".

## Apply this protocol

**Before declaring any unit complete that wires a hook into settings.json:**

```bash
# Replace <hook-name> with the actual filename without .mjs
node -e "
const fs = require('fs');
['H:/.claude/settings.json','C:/Users/wompu/.claude/settings.json'].forEach(p=>{
  const c = fs.readFileSync(p,'utf8');
  console.log(p+': '+((c.match(/<hook-name>/g)||[]).length)+' match(es)');
});
"
# Both files MUST show ≥1 match. If either shows 0, the wiring was reverted — re-splice.
```

**When restoring reverted wiring:**

1. Edit ONLY `C:/Users/wompu/.claude/settings.json` (the c-to-h-mirror hook auto-replicates).
2. But: the mirror fires only on Edit/Write/MultiEdit/NotebookEdit, NOT on Bash node-writes. If splicing via node, manually `cp C: H:` afterwards.
3. Verify byte-identical: `node -e "console.log(fs.readFileSync('C:/...').equals(fs.readFileSync('H:/...')))"` → `true`.
4. Smoke-test the hook with empty stdin: `echo '{}' | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/<hook>.mjs` → must not crash.

## What this means for the `feedback_reflect_all_changes_post_update` rule

The 4-surface close-out (CLAUDE.md + MEMORY.md + wiki + Obsidian memos) **must add a 5th surface for any unit that touches harness config**: explicit byte-count grep of settings.json after the regenerate-from-viz / mirror-c-to-h / multi-chat-merge passes complete. Otherwise the wiring drifts silently between ship-time and use-time.

## Related

- [[feedback_system_viz_first_audit]] — the system-viz-first audit doctrine this regression silently disabled
- [[reference_post_ship_system-viz-brain-ms0-u-p0-audit-viz-first]] — original auto-distilled post-ship memo
- [[reference_stop_advisory_wiring_cluster_2026_05_15]] — Stop chain insertion pattern (where post-ship-distill belongs)
- [[feedback_reflect_all_changes_post_update]] — the doc-reflection rule this regression should expand to cover settings.json
