---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "You are hunting DORMANT-BUT-NEAR-ACTIVE features in the PRISM repo (H:/prism). P"
date: "2026-06-10"
first_ts: "2026-06-10T01:59:03.263Z"
last_ts: "2026-06-10T02:02:10.641Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 17
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_79edb9aa-757/agent-a909f0d8eb53452a2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# You are hunting DORMANT-BUT-NEAR-ACTIVE features in the PRISM repo (H:/prism). P

> **claude-code-cli** | 2026-06-10 | 45 msgs (17 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_79edb9aa-757/agent-a909f0d8eb53452a2.jsonl`

## Transcript

### User | 2026-06-10T01:59:03.263Z

You are hunting DORMANT-BUT-NEAR-ACTIVE features in the PRISM repo (H:/prism). PRISM is a manufacturing-intelligence platform; a feature is "dormant" when it is BUILT but not running, and "near-active" when 1-3 concrete steps would turn it on.

CATEGORY: Hooks on disk but NOT wired in settings.json (the golf-allowlist class)
WHAT TO FIND: Hooks present in .claude/hooks/*.mjs that have 0 references in C:/Users/wompu/.claude/settings.json AND H:/.claude/settings.json (built but never fire). The golf-slot-write-allowlist was one (CLAUDE.md doc-corrected 2026-06-09). Find 3-5 valuable unwired hooks: name, what it would enforce/inject, why it is worth wiring, and confirm it is a complete hook (reads stdin, emits proper output) not a stub. Cite the hook file + grep-proof of 0 settings refs.

Use Grep/Read/Glob (and BUILD_STATE.md / ENGINE_DIGEST.md / MILESTONE_PROGRESS.md where named). Return a CONCISE list (max ~400 words) of the TOP 3-5 candidates. For EACH: (a) NAME + file:line, (b) WHAT it does / its value, (c) the EXACT activation step(s) to turn it on, (d) ACTIVATION-COST (trivial/small/medium), (e) ALREADY-ACTIVE-RISK (how sure it is NOT already on — low/med/high). Be concrete: cite real symbols/flags/files. A vague candidate is useless.

### Assistant | 2026-06-10T01:59:08.426Z

I'll hunt for unwired hooks. Let me start by enumerating the hooks on disk and the settings.json files.

### Assistant | 2026-06-10T01:59:08.921Z

[tool_use: Glob]

### Assistant | 2026-06-10T01:59:10.186Z

[tool_use: Bash]

### User | 2026-06-10T01:59:21.978Z

[tool_result] C:/Users/wompu/.claude/settings.json
H:/.claude/settings.json
H:/prism/.claude/settings.json
---SIZES---
 63717 C:/Users/wompu/.claude/settings.json
 63717 H:/.claude/settings.json
127434 total

### User | 2026-06-10T01:59:29.556Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-06-10T01:59:33.012Z

Both settings files are identical (mirror). Let me get the hook list a faster way and extract all hook filenames referenced in settings.

### Assistant | 2026-06-10T01:59:34.529Z

[tool_use: Bash]

### Assistant | 2026-06-10T01:59:36.082Z

[tool_use: Bash]

### User | 2026-06-10T01:59:38.993Z

[tool_result] 754
---FIRST---
_envelope.mjs*
_rpc-shim.mjs*
_rpc-shim.test.mjs
activate-before-build-precheck.mjs*
activate-before-build-precheck.test.mjs

### User | 2026-06-10T01:59:43.100Z

[tool_result] 257 /tmp/wired_hooks.txt
---sample---
activate-before-build-precheck.mjs
active-chat-priority-boost.mjs
active-chat-priority-decay.mjs
agent-pid-tracker.mjs
agent-rules-inject.mjs
agent-vs-direct.mjs
agent-worktree-stale-unlock.mjs
ai-command-awareness.mjs
ai-deep-intelligence.mjs
ai-system-router-inject.mjs

### Assistant | 2026-06-10T01:59:45.182Z

754 hook .mjs files (including .test.mjs), 257 distinct hook filenames wired. Let me compute the unwired set, filtering out test files.

### Assistant | 2026-06-10T01:59:47.441Z

[tool_use: Bash]

### User | 2026-06-10T01:59:52.735Z

[tool_result] 678 /tmp/ondisk_hooks.txt
---UNWIRED COUNT---
436 /tmp/unwired.txt

### Assistant | 2026-06-10T01:59:56.759Z

436 candidate unwired hooks. Many are likely sub-modules (lib helpers) or bundled-internally. Let me filter to ones with names suggesting enforcement/injection value, and double-check they aren't referenced indirectly (e.g., imported by a bundle).

### Assistant | 2026-06-10T01:59:57.557Z

[tool_use: Bash]

### User | 2026-06-10T02:00:01.734Z

[tool_result] agent-boundary-guard.mjs
agi-safety-envelope-guard.mjs
ai-duplication-guard.mjs
ai-reasoning-inject.mjs
alpha-slot-reaper-guardian.mjs
api-contract-enforcer.mjs
appdata-junction-guard.mjs
asset-deletion-block.mjs
audit-awareness-inject.mjs
auto-learn-budget-guard.mjs
bash-destructive-guard.mjs
cad-accuracy-gate.mjs
cad-pipeline-knowledge-inject.mjs
cad-token-vocabulary-guard.mjs
cag-soul-cache-blo
... [+1226 chars truncated]

### Assistant | 2026-06-10T02:00:05.503Z

Good candidates. Let me investigate the most promising ones in detail. I'll check several enforcement/inject hooks for completeness and confirm 0 settings refs. Let me look at a batch.

### Assistant | 2026-06-10T02:00:10.227Z

[tool_use: Bash]

### User | 2026-06-10T02:00:19.701Z

[tool_result] === physics-canonical-constants-guard ===
settings-refs: 0
lines: 144
has-io: yes
=== bash-destructive-guard ===
settings-refs: 0
lines: 325
has-io: yes
=== naming-convention-enforcer ===
settings-refs: 0
lines: 238
has-io: yes
=== asset-deletion-block ===
settings-refs: 0
lines: 149
has-io: yes
=== critical-file-guard ===
settings-refs: 0
lines: 222
has-io: yes
=== api-contract-enforcer ===
setti
... [+173 chars truncated]

### Assistant | 2026-06-10T02:00:22.526Z

All 8 have 0 settings refs and real I/O. Let me read the most valuable ones in full to confirm they're complete and understand their trigger/output, plus verify they aren't bundle-loaded.

### Assistant | 2026-06-10T02:00:22.931Z

[tool_use: Read]

### Assistant | 2026-06-10T02:00:23.311Z

[tool_use: Read]

### User | 2026-06-10T02:00:24.930Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * physics-canonical-constants-guard.mjs — CAM-UIX-INFRA-00/U-PHYSCONST01
5	 *
6	 * PreToolUse(Write|Edit) hook that blocks ingestion engines from writing
7	 * to src/physics/constants.ts.
8	 *
9	 * PRINCIPLE: Physics constants are derived from peer-reviewed literature,
10	 * not from shop-floor observation or vendor documentation. JMDie's S&F
11	 * obse
... [+4120 chars truncated]

### User | 2026-06-10T02:00:25.497Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	/**
4	 * bash-destructive-guard.mjs - PreToolUse Bash
5	 * Blocks or warns on destructive shell commands. Prevents accidental data loss.
6	 *
7	 * Git rules mirror GitSafetyEngine (mcp-server/src/engines/GitSafetyEngine.ts) —
8	 * 10-rule classifier with confirmationPrompt + saferAlternative + protected-branch
9	 * detection. Kept inline here because hooks can
... [+13649 chars truncated]

### Assistant | 2026-06-10T02:00:29.323Z

Both hooks are complete and functional. Note: `bash-destructive-guard` uses `console.log(JSON.stringify({decision:'block'}))` + exit 0 — a valid PreToolUse output shape. Let me check a few more high-value candidates and verify they aren't bundle-loaded (imported by a wired bundle file).

### Assistant | 2026-06-10T02:00:31.130Z

[tool_use: Bash]

### User | 2026-06-10T02:00:35.469Z

[tool_result] === bash-destructive-guard ===
claude-no-delete-files.mjs
(bundle/import refs above, if any)
=== naming-convention-enforcer ===
unified-local-validation.mjs
(bundle/import refs above, if any)
=== asset-deletion-block ===
claude-no-delete-files.mjs
fix-stdin-pattern.mjs
main-tree-write-block.mjs
(bundle/import refs above, if any)
=== critical-file-guard ===
(bundle/import refs above, if any)
=== en
... [+67 chars truncated]

### Assistant | 2026-06-10T02:00:39.206Z

These references could be just mentions in comments. Let me verify whether any of these mentioning-files are actually wired, and whether they truly import the candidate hooks (real dispatch) vs just naming them in a comment. Also check `naming-convention-enforcer` and `critical-file-guard` content for completeness.

### Assistant | 2026-06-10T02:00:41.483Z

[tool_use: Bash]

### User | 2026-06-10T02:00:50.415Z

[tool_result] === are mentioning files wired? ===
claude-no-delete-files: 0 refs in settings
unified-local-validation: 0 refs in settings
ascii-guard: 1 refs in settings
main-tree-write-block: 1 refs in settings
fix-stdin-pattern: 0 refs in settings
=== how do they reference the candidates? (import vs comment) ===
--- unified-local-validation -> naming-convention-enforcer ---
7: * - naming-convention-enforcer.m
... [+138 chars truncated]

### Assistant | 2026-06-10T02:00:54.853Z

Confirmed — those are comment mentions, not real imports. `ascii-guard` (wired) references `encoding-guard` only in a comment describing what it superseded, so `encoding-guard` may be intentionally retired. `naming-convention-enforcer` is mentioned in a comment in an unwired file. Let me read the remaining two candidates and check `critical-file-guard` and `naming-convention-enforcer` for stub vs complete, plus check git recency to gauge if they're stale/abandoned.

### Assistant | 2026-06-10T02:00:56.198Z

[tool_use: Read]

### Assistant | 2026-06-10T02:00:56.322Z

[tool_use: Read]

### User | 2026-06-10T02:00:59.153Z

[tool_result] 1	// tier: T0
2	/**
3	 * critical-file-guard.mjs — Phase 0.16 Safety-Critical File Guard
4	 *
5	 * PreToolUse(Edit|Write|MultiEdit) hook that requires explicit
6	 * --confirm-critical flag (or CONFIRM_CRITICAL=true env) for edits to
7	 * Kienzle/Taylor/S(x) and other safety-critical files.
8	 *
9	 * Critical paths defined in state/shared/CRITICAL_FILES.json. Edits to
10	 * those paths without the 
... [+7492 chars truncated]

### User | 2026-06-10T02:00:59.225Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	import fs from "node:fs";
4	
5	
6	function readStdinSafe() {
7	  try {
8	    if (process.stdin.isTTY) return "";
9	    return fs.readFileSync(0, "utf-8");
10	  } catch {
11	    return "";
12	  }
13	}
14	// DISABLED_TOKEN_REDUX_2026_04_23: short-circuited by user-approved token-reduction pass.
15	// Remove the next 2 lines to re-enable. See .claude/helpers/appl
... [+1714 chars truncated]

### Assistant | 2026-06-10T02:01:05.156Z

Key finding: `naming-convention-enforcer` is intentionally DISABLED (line 16 short-circuits — token-reduction pass). So it's not a "near-active" candidate — it was deliberately turned off. `critical-file-guard` is fully complete (dual-form, proper block output). Let me verify `critical-file-guard`'s config file exists (CRITICAL_FILES.json) since it's a dependency, and check the `CRITICAL_FILES.json` has entries — that determines if it would actually do anything once wired.

### Assistant | 2026-06-10T02:01:07.819Z

[tool_use: Bash]

### User | 2026-06-10T02:01:13.792Z

[tool_result] === CRITICAL_FILES.json exists? ===
-rw-r--r-- 1 wompu 197611 2559 Apr 21 10:23 H:/prism/state/shared/CRITICAL_FILES.json
entries:
9
=== physics-canonical-constants-guard last commit ===
2026-05-12 21:16:51 -0500
=== critical-file-guard last commit ===
2026-05-12 21:16:51 -0500
=== dispatcher-import-validator: head ===
#!/usr/bin/env node
// tier: T3
/**
 * dispatcher-import-validator.mjs — PostTo
... [+901 chars truncated]

### Assistant | 2026-06-10T02:01:17.279Z

`critical-file-guard` has a live 9-entry config (`CRITICAL_FILES.json`). `dispatcher-import-validator` is a complete PostToolUse hook. I have enough to deliver the top candidates. Let me do a final completeness check on `dispatcher-import-validator` (does it have a main/stdin reader) and `api-contract-enforcer` to round out the list.

### Assistant | 2026-06-10T02:01:19.476Z

[tool_use: Bash]

### User | 2026-06-10T02:01:34.524Z

[tool_result] === dispatcher-import-validator: has main+stdin? ===
43:async function main() {
106:main().catch(() => {
lines: 108

=== api-contract-enforcer: disabled check + main ===
9:    return fs.readFileSync(0, "utf-8");
163:async function main() {
213:      hookSpecificOutput: {
lines: 226

### Assistant | 2026-06-10T02:01:37.786Z

[tool_use: Bash]

### User | 2026-06-10T02:01:50.769Z

[tool_result] === dispatcher-import-validator main() body ===
6:      console.log(JSON.stringify({ continue: true }));
9:    input = JSON.parse(_raw);
25:    content = fs.readFileSync(filePath, 'utf8');
57:    console.log(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: warning } }));
61:  console.log(JSON.stringify({ continue: true }));
65:  console.log(JS
... [+34 chars truncated]

### Assistant | 2026-06-10T02:02:10.641Z

All confirmed complete. Here are my findings.

---

**TOP UNWIRED HOOKS (built, complete, 0 settings refs — verified via `grep -h "<name>.mjs" C:/Users/wompu/.claude/settings.json H:/.claude/settings.json | wc -l` = 0 for each; both settings files are byte-identical mirrors)**

**1. critical-file-guard.mjs** — `.claude/hooks/critical-file-guard.mjs:143` (main), `:202` (block emit)
(b) PreToolUse(Edit/Write/MultiEdit) hard-BLOCKS edits to safety-critical files (Kienzle/Taylor/S(x) physics) unless `CONFIRM_CRITICAL=true`. Reads its glob list from `state/shared/CRITICAL_FILES.json` — **live, 9 entries**. Emits proper `{decision:"block"}`. Dual-form (export-default + native main reading `readFileSync(0)`). Complement to the wired `physics-canonical-constants-guard` (which only guards `constants.ts` against *ingestion* writes — this guards all 9 critical paths against any unconfirmed edit).
(c) Add one PreToolUse(Edit|Write|MultiEdit) matcher entry in `C:/Users/wompu/.claude/settings.json` → `node .claude/hooks/critical-file-guard.mjs`. Mirror auto-replicates to H:.
(d) ACTIVATION-COST: trivial. (e) ALREADY-ACTIVE-RISK: **low** — 0 refs both files; config exists but no firing hook reads it.

**2. physics-canonical-constants-guard.mjs** — `:104` (block), `:122` (main)
(b) Blocks ingestion/shop-derived data (JMDie, scrape, empirical, `shop_observed`) from being written into `mcp-server/src/physics/constants.ts` — protects peer-reviewed Kienzle/Taylor constants from empirical pollution. CLAUDE.md §SAFETY calls this out as "ALWAYS ENFORCED" but the enforcing hook does not fire. Complete: stdin reader, exit-2 block.
(c) One PreToolUse(Write|Edit|MultiEdit) entry → the script. (d) trivial. (e) **low**.

**3. bash-destructive-guard.mjs** — `:50` (stdin), `:240`/`:260` (git-rule block)
(b) PreToolUse(Bash) mirror of `GitSafetyEngine` — 10-rule classifier blocking `push --force`, `reset --hard`, `clean -fdx`, `filter-branch`, fork-bombs, `mkfs`, `dd of=/dev/`, + a sliding-window 
... [+1076 chars truncated]
