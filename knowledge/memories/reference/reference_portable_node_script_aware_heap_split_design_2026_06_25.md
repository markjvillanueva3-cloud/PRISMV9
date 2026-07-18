---
name: reference_portable_node_script_aware_heap_split_design_2026_06_25
description: "De-risked design for a script-aware portable-node heap split (CLIs get headroom, hooks stay 384) -- ready to build fresh-budget (2026-06-25, slot:sierra)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.728Z
aliases: reference_portable_node_script_aware_heap_split_design_2026_06_25
---


**Script-aware portable-node heap split -- SHIPPED + LIVE-VALIDATED (2026-06-25, slot:sierra).**

**STATUS: LIVE.** Implemented in `C:/Users/wompu/.claude/bin/portable-node` (canonical) -> mirrored to `H:/.claude/bin/portable-node`. NOT a git-repo file (lives in .claude/bin, outside H:/prism) -- the C: copy is the persistence store + c-to-h mirror keeps H: synced. Hooks/helpers stay 384 (commit-protection preserved); a /scripts/ CLI (abs OR relative) auto-gets `PRISM_SCRIPT_HEAP_MB:-2048`; ambiguous -> 384. **PURELY ADDITIVE** -- only /scripts/ paths change (384->2048); hooks/helpers/MCP/ambiguous get EXACTLY what they got before -> zero regression for non-scripts. Composes with NODE_OPTIONS-aware planHeapRespawn (heavy graph CLIs see 2048<need and still respawn to 8192/4096; light scripts get 2048, never thrash). VALIDATED: bash -n (C:+H:) + 8/8 detection unit-tests + LIVE smoke (`node -e` ->384, `node scripts/probe.mjs` ->2048).

**RELATIVE-PATH bug caught by LIVE smoke** (unit-test missed it -- it used ABSOLUTE paths only): real invocations are `node scripts/foo.mjs` (relative), so the case needs BOTH `/scripts/` (abs / `./scripts/`) AND ` scripts/` (space-prefixed = relative at arg start). LESSON: a wrapper-detection test MUST include the relative-path form the fleet actually uses -- absolute-only passes while the live path silently misses.

**REMAINING (low-pri):** `portable-node.cmd` still hard-codes 384 for all (SAFE -- no regression; bash path is primary). Apply same logic to .cmd for full consistency when convenient.

---

**Original DE-RISKED design (now shipped, kept for reference):**

PROBLEM: `H:/.claude/bin/portable-node:45` sets `NODE_OPTIONS=--max-old-space-size=${PRISM_HOOK_HEAP_MB:-384}` for EVERY node call (hooks AND scripts). The 384 cap is correct for the concurrent hook swarm (Windows commit-reservation protection -- see [[reference_node_heap_384_cap_windows_commit_2026_06_25]]), but it ALSO caps heavy CLI/scripts that then thrash/OOM unless they self-respawn (whack-a-mole; only the system-viz CLIs are patched so far).

INJECTION POINT confirmed: `which node` = `/h/.claude/bin/node`, a thin shim that `exec`s `portable-node "$@"`. So portable-node is the SINGLE injection point and it receives the full args (incl. the script path) -> hook-vs-script detection is feasible there.

DE-RISKED DESIGN (replace the `if [[ -z "$NODE_OPTIONS" ]]` block ~line 42-46):
```bash
_heap="${PRISM_HOOK_HEAP_MB:-384}"
case " $* " in
  *"/.claude/hooks/"*|*"/.claude/helpers/"*) : ;;     # hook/helper -> KEEP 384 (matched FIRST)
  *"/scripts/"*.mjs*|*"/scripts/"*.cjs*) _heap="${PRISM_SCRIPT_HEAP_MB:-2048}" ;;
esac
[[ -z "$NODE_OPTIONS" ]] && export NODE_OPTIONS="--max-old-space-size=${_heap}"
```

SAFETY (why this is safe-by-default):
- Hooks/helpers matched FIRST in the `case` -> always 384. The CATASTROPHIC direction (hook -> big heap -> ~84 concurrent procs -> commit storm -> MCP spawn failure, the MCP-FLEET-CAPACITY-MS0 bug) is PREVENTED. Even a hook with a `/scripts/*.mjs` ARGUMENT stays 384 (hook pattern wins).
- Ambiguous (`node -e`, non-/scripts/ path) -> falls through -> 384.
- Only a DEFINITE `/scripts/*.mjs|cjs` invocation gets the modest 2048 bump. Scripts run rarely + singly (NOT the swarm), so 2048 x a few concurrent = bounded commit on the 227GB ceiling.
- WORST-CASE failure = "no change" (a script stays 384, self-respawns if it's one of the patched CLIs). Never "fleet breaks" -- EXCEPT a bash SYNTAX error in the wrapper = every node call fails. So `bash -n portable-node` is MANDATORY before saving.

BUILD CHECKLIST (fresh budget, full care -- this is the fleet's most blast-radius-critical file):
1. `bash -n H:/.claude/bin/portable-node` after editing (syntax gate -- a typo breaks ALL node).
2. Probe BOTH paths: a /scripts/ probe prints NODE_OPTIONS=2048; a /.claude/hooks/ probe prints 384; `node -e` prints 384.
3. Mirror the SAME logic into `portable-node.cmd` (cmd.exe path, currently hard-codes 384) for consistency.
4. Check for a C:/.claude/bin/portable-node copy (c-to-h mirror) -- keep both consistent; the ACTIVE one is H: (the shim execs /h/.claude/bin/portable-node).
5. Canary: after the change, run a few real hooks + a real heavy script and confirm the fleet still spawns (watch for ERROR_NO_SYSTEM_RESOURCES / MCP failures for a few minutes).

VALUE: eliminates the per-script heap-respawn whack-a-mole fleet-wide (scripts auto-get headroom) while preserving the hook commit-protection. Operator wants this ("no hard caps on [script] utilization") -- it's the safe way to deliver it. Deferred from 2026-06-25 deep-budget session (5 commits already shipped); the per-script respawn pattern (`scripts/lib/viz-query-heap-reexec.mjs`) covers the critical CLIs in the meantime.
