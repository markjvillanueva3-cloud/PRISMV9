# PATCH — U-COST-BRIDGE-DISPATCH (charlie quoting-galaxy: wire the 16 cost-bridge nodes)

**Status:** PENDING — built+tested in worktree `H:/prism-slot-charlie`; git/cp blocked this session by a failing PreToolUse Bash hook (every bash call → exit 255 in the degraded fleet env, 2026-05-29). Apply when bash recovers OR via golf merge.
**Slot:** charlie · **Created:** 2026-05-29

## What was built (worktree, slot/charlie, UNCOMMITTED)
- `.claude/hooks/cost-bridge-dispatch.mjs` — ONE PostToolUse hook consolidating all 16 `cost-bridge-on-<event>.mjs` advisories. Reads the event once, runs 16 action-regex rules in-process (1 spawn vs 16). Pure exports: `RULES` (16), `extractAction`, `matchRules`, `buildAdvisory`. Fail-soft, bulletproof `invokedDirectly` guard (fileURLToPath compare — a plain endsWith fired under `node --test` → `readFileSync(0)` stdin-block hang; fixed).
- `.claude/hooks/cost-bridge-dispatch.test.mjs` — 9 tests, all PASS (run with `node --test … < /dev/null`; closed stdin required because the hook reads fd 0). E2E verified: `quote_accept` → advisory, `read_file` → `{}`.

## Apply steps (in order)
1. **Commit worktree files** (slot/charlie):
   ```bash
   git -C H:/prism-slot-charlie add .claude/hooks/cost-bridge-dispatch.mjs .claude/hooks/cost-bridge-dispatch.test.mjs
   git -C H:/prism-slot-charlie commit -m "[charlie] [COST-EFFICIENCY-BRIDGE]/U-COST-BRIDGE-DISPATCH: consolidated PostToolUse router wiring all 16 cost-bridge-on-* advisories (1 spawn vs 16); 9 tests"
   ```
2. **Place on main tree** (runtime-read path; or let golf merge slot/charlie):
   ```bash
   cp H:/prism-slot-charlie/.claude/hooks/cost-bridge-dispatch.mjs      H:/prism/.claude/hooks/cost-bridge-dispatch.mjs
   cp H:/prism-slot-charlie/.claude/hooks/cost-bridge-dispatch.test.mjs H:/prism/.claude/hooks/cost-bridge-dispatch.test.mjs
   ```
3. **Wire into settings.json** — `C:/Users/wompu/.claude/settings.json` (auto-mirrors to H:). Append to the **PostToolUse group whose `matcher` is `"mcp__prism__prism_.*"`** (currently group index 5, alongside `post-recommendation-capture` + `post-memory-context-eval`). Add this hook object to that group's `hooks` array:
   ```json
   {
     "_comment": "COST-EFFICIENCY-BRIDGE/U-COST-BRIDGE-DISPATCH (2026-05-29 slot:charlie): consolidated cost-bridge router. Runs all 16 cost-bridge-on-* action-regex rules in-process on each MCP prism dispatcher call (1 spawn, not 16). Fires only under matcher mcp__prism__prism_.* (not Read/Bash/Edit). Surfaces a cost-cascade advisory when a quote/cost/cad/cam/material/tool/spc action is detected; silent {} otherwise. Full per-event checklist: .claude/hooks/cost-bridge-on-<event>.mjs. Disable: PRISM_COST_BRIDGE_ADVISORY_DISABLE=1 (family) or PRISM_COST_BRIDGE_DISPATCH_DISABLE=1 (this).",
     "type": "command",
     "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/cost-bridge-dispatch.mjs",
     "timeout": 3000
   }
   ```
   Scoping to the `mcp__prism__prism_.*` matcher is the efficiency choice — cost-bridge actions only arrive via MCP dispatcher calls, never via Read/Bash/Grep/Edit.

## Verify after applying
```bash
printf '%s' '{"tool_input":{"action":"quote_accept"}}' | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/cost-bridge-dispatch.mjs   # → advisory JSON
printf '%s' '{"tool_input":{"action":"read_file"}}'   | "H:/.claude/bin/portable-node" H:/prism/.claude/hooks/cost-bridge-dispatch.mjs   # → {}
node -e "JSON.parse(require('fs').readFileSync('C:/Users/wompu/.claude/settings.json','utf8'));console.log('settings parses')"
node --test H:/prism/.claude/hooks/cost-bridge-dispatch.test.mjs < /dev/null   # → 9/9 pass
```

## Why this matters (the gap it closes)
The 16 `cost-bridge-on-*.mjs` hooks (COST-EFFICIENCY-BRIDGE-MS0/MS1) shipped standalone and were **never wired (0 references)** — gotcha #7 "build-standalone-wire-later" at scale. This dispatcher wires all 16 nodes via one efficient entry. The 16 originals stay on disk as the canonical full-detail source (DRY; never-delete).

_Per [[feedback_settings_wiring_drift_2026_05_16]]: re-verify the entry survived after any peer settings edit._
