---
type: "chat-session"
source: "claude-code-cli"
session_id: "8347ba23-a479-47f7-8ee0-b6014bc5e610"
title: "Independent second-pass review of a PRISM fleet account-switch coordinator chang"
date: "2026-06-11"
first_ts: "2026-06-11T15:58:40.258Z"
last_ts: "2026-06-11T16:05:24.359Z"
cwd: "H:\\prism-slot-bravo"
messages: 78
user_msgs: 27
assistant_msgs: 51
raw_file: "H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a988c1ecdb8e3745d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:38"
---

# Independent second-pass review of a PRISM fleet account-switch coordinator chang

> **claude-code-cli** | 2026-06-11 | 78 msgs (27 user / 51 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/8347ba23-a479-47f7-8ee0-b6014bc5e610/subagents/agent-a988c1ecdb8e3745d.jsonl`

## Transcript

### User | 2026-06-11T15:58:40.258Z

Independent second-pass review of a PRISM fleet account-switch coordinator change. Read BOTH files END-TO-END (do not assume another reviewer caught everything):
- H:/prism/scripts/account-switch-restart-coordinator.mjs
- H:/prism/scripts/account-switch-restart-coordinator.test.mjs

This coordinator decides whether to switch the Claude account and staggered-restart all 26 fleet chats when the 5h token window nears its limit. The change adds an ON-DEMAND fallback: when no `quota.fiveHour` sidecar carries a usable value, `readFiveHourPct` computes the host-wide rolling-5h weighted token sum directly from transcripts via a new exported `fiveHourFallbackFromTranscripts({nowMs,env,_sum})`, gated on `(opts._sum || opts.fallbackLive)` + env kill-switch `PRISM_5H_ONDEMAND_FALLBACK`. New imports: `fiveHourTokenSum` from ./lib/five-hour-token-sum.mjs, `budgetFromEnv`+`computePct` from ./populate-five-hour-sidecar.mjs.

Weight your review toward what a logic-focused reviewer is LIKELY TO MISS:
1. INTEGRATION/COUPLING: the coordinator now imports from `populate-five-hour-sidecar.mjs` (a script with a CLI main() guarded by __direct). Confirm importing it is side-effect-free (no code runs on import). Confirm the import paths resolve in the main tree.
2. SAFETY/BLAST RADIUS: this can switch the whole fleet's account + restart 26 chats. Is anything actuated as a SIDE EFFECT of merely READING the 5h value? (It must not be — read is pure-ish, actuation is gated by --apply.) Could the on-demand fallback (which reads ALL transcripts) be slow enough to matter where it's called? Where is readFiveHourPct invoked — only the coordinator (background), or any latency-sensitive path?
3. NEVER-SWITCH-ON-STALE: confirm a stale/garbage sidecar can't force a switch. (Context: I just cleaned 9 sidecars that had a stale pct=1 from a superseded writer `populate-5h-quota`. Confirm nothing in THIS change re-introduces a path that trusts an unvalidated pct.)
4. ERROR BUDGET: every new try/catch — does i
... [+558 chars truncated]

### Assistant | 2026-06-11T15:58:42.703Z

I'll review both files end-to-end. Let me read them completely.

### Assistant | 2026-06-11T15:58:43.650Z

[tool_use: Read]

### Assistant | 2026-06-11T15:58:43.717Z

[tool_use: Read]

### User | 2026-06-11T15:58:44.410Z

[tool_result] read-once-guard: 'H:\prism\scripts\account-switch-restart-coordinator.mjs' was already read 11s ago in this session and is unchanged (mtime 1781193294910). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### User | 2026-06-11T15:58:44.503Z

[tool_result] read-once-guard: 'H:\prism\scripts\account-switch-restart-coordinator.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1781193240548). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### Assistant | 2026-06-11T15:58:47.418Z

The files are already in my context from the read 11 seconds ago. Let me work with the content I have. Let me re-examine the key sections carefully by grepping for the specific new code paths to get exact line numbers.

### Assistant | 2026-06-11T15:58:49.310Z

[tool_use: Grep]

### User | 2026-06-11T15:58:50.369Z

[tool_result] 48: *     readFiveHourPct(opts)                     — canonical sidecar → max 5h pct
91:import { fiveHourTokenSum } from "./lib/five-hour-token-sum.mjs";
92:import { budgetFromEnv, computePct } from "./populate-five-hour-sidecar.mjs";
187: * per-slot MAX in readFiveHourPct is for the rate_limits case where each chat
196: * @param {{nowMs?:number, env?:object, _sum?:function}} [o]
199:export functi
... [+761 chars truncated]

### Assistant | 2026-06-11T15:58:50.705Z

[tool_use: Grep]

### User | 2026-06-11T15:58:51.767Z

[tool_result] 4:// stubs); the orchestration is covered by an injected-I/O E2E (readFiveHourPctFn /
23:  readFiveHourPct,
24:  fiveHourFallbackFromTranscripts,
156:// ── readFiveHourPct (I/O) ────────────────────────────────────────────────────
157:describe("readFiveHourPct", () => {
163:    const r = readFiveHourPct({ sidecarDir: dir, slots: ["alpha", "bravo", "charlie"] });
173:    const r = readFiveHourPct({
... [+3082 chars truncated]

### Assistant | 2026-06-11T15:58:54.752Z

Now let me read the critical sections of the coordinator in detail. Let me look at the imports, the new fallback function, readFiveHourPct, and where readFiveHourPct is invoked.

### Assistant | 2026-06-11T15:58:55.742Z

[tool_use: Read]

### User | 2026-06-11T15:58:57.426Z

[tool_result] 180	 * the field absent), compute the HOST-WIDE rolling-5h weighted token sum directly
181	 * from the transcripts at the point of consumption. This dissolves the
182	 * two-writers problem (no sidecar population needed, no clobber) and is always
183	 * fresh -- the coordinator becomes self-sufficient.
184	 *
185	 * The sum is host-wide (all transcripts in the 5h window) = already the
186	 * accou
... [+7028 chars truncated]

### Assistant | 2026-06-11T15:59:01.069Z

Now let me look at where `readFiveHourPct` is invoked in the orchestrator (the decision/actuation path) and the keystone trigger logic, plus where `fallbackLive: true` is set at line 574.

### Assistant | 2026-06-11T15:59:01.611Z

[tool_use: Read]

### User | 2026-06-11T15:59:02.742Z

[tool_result] 390	 *
391	 * @param {object} opts
392	 * @param {boolean} [opts.apply=false]          actuate the staggered restart
393	 * @param {number}  [opts.threshold]            5h trigger fraction (def env/0.90)
394	 * @param {string}  [opts.selfSlot]             never-restart-self
395	 * @param {string[]}[opts.slots]                explicit restart roster
396	 * @param {function}[opts.readFiveHourPctFn] 
... [+4642 chars truncated]

### Assistant | 2026-06-11T15:59:09.501Z

Now let me look at lines 560-590 where `fallbackLive: true` is set, and the `decideSwitch` function to confirm stale handling.

### Assistant | 2026-06-11T15:59:10.334Z

[tool_use: Read]

### User | 2026-06-11T15:59:11.615Z

[tool_result] 540	// ═════════════════════════════════════════════════════════════════════════════
541	// CLI
542	// ═════════════════════════════════════════════════════════════════════════════
543	
544	function parseArgs(argv) {
545	  const a = { _: [] };
546	  for (let i = 0; i < argv.length; i++) {
547	    const t = argv[i];
548	    if (t === "--apply") a.apply = true;
549	    else if (t === "--json") a.jso
... [+2268 chars truncated]

### Assistant | 2026-06-11T15:59:14.441Z

Let me look at the `decideSwitch` function and the imports at the top, plus verify the imported module is side-effect-free.

### Assistant | 2026-06-11T15:59:15.202Z

[tool_use: Read]

### User | 2026-06-11T15:59:16.327Z

[tool_result] 80	  runSequencer,
81	} from "./fleet-wake-sequencer.mjs";
82	import {
83	  DEFAULT_ACCOUNTS_ROOT,
84	  activateAccount,
85	  credentialSnapshotPath,
86	  nextAccountInRotation,
87	  readActiveAccount,
88	  readRotationOrder,
89	} from "./lib/claude-account-lib.mjs";
90	import { decideSwitch, absThresholdFromEnv } from "./lib/five-hour-switch-gate.mjs";
91	import { fiveHourTokenSum } from "./lib/f
... [+4776 chars truncated]

### Assistant | 2026-06-11T15:59:20.134Z

Now let me verify the critical integration concern: is `populate-five-hour-sidecar.mjs` side-effect-free on import? Let me check its `__direct` guard and the exports, plus check `five-hour-token-sum.mjs` and `five-hour-switch-gate.mjs` (`decideSwitch`).

### Assistant | 2026-06-11T15:59:22.685Z

[tool_use: Bash]

### User | 2026-06-11T15:59:25.980Z

[tool_result] === populate-five-hour-sidecar.mjs: exports + main guard ===
34:export const DEFAULT_SIDECAR_DIR = path.join(ROOT, "state", "shared");
37:export function budgetFromEnv(env = process.env) {
50:export function computePct({ usedTokens, weightedTokens }, { weightedBudget, rawBudget }) {
62:export function buildFiveHour(sum, pctInfo, computedAtIso) {
87:export function mergeQuotaFiveHour(existingDoc, f
... [+1437 chars truncated]

### Assistant | 2026-06-11T15:59:30.214Z

`populate-five-hour-sidecar.mjs` is side-effect-free on import — `main()` is guarded by `__direct` (`import.meta.url === pathToFileURL(process.argv[1])`). The imported `budgetFromEnv` and `computePct` are both pure exported functions. Let me now check `computePct` and `budgetFromEnv` internals to confirm they never trust a fabricated denominator, and check `five-hour-token-sum.mjs` for side-effects + signature.

### Assistant | 2026-06-11T15:59:30.739Z

[tool_use: Read]

### User | 2026-06-11T15:59:31.915Z

[tool_result] 37	export function budgetFromEnv(env = process.env) {
38	  const w = Number(env?.PRISM_5H_WEIGHTED_BUDGET);
39	  const r = Number(env?.PRISM_5H_TOKEN_BUDGET);
40	  return {
41	    weightedBudget: Number.isFinite(w) && w > 0 ? w : null,
42	    rawBudget: Number.isFinite(r) && r > 0 ? r : null,
43	  };
44	}
45	
46	// Compute pct + which budget was used. Weighted preferred (the honest scarce
47	// si
... [+2781 chars truncated]

### Assistant | 2026-06-11T15:59:35.672Z

`computePct` returns `{ pct: null }` when no budget is set — no fabricated denominator. `budgetFromEnv` only returns positive finite budgets, else null. Good. Now let me check `five-hour-token-sum.mjs` for side-effects and the `decideSwitch` gate logic, plus confirm the `decideSwitch` never treats stale as a switch.

### Assistant | 2026-06-11T15:59:37.867Z

[tool_use: Bash]

### User | 2026-06-11T15:59:41.729Z

[tool_result] === five-hour-token-sum.mjs: signature + side-effect check ===
36://   ORCH:  fiveHourTokenSum({nowMs, windowMs, projectsRoot, _fs})
48:export function parseJsonlBlocks(text) {
61:export const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
69:export const CACHE_WRITE_MULT = 1.25;
70:export const CACHE_READ_MULT = 0.1;
73:export const PEEK_BYTES = 256 * 1024;
77:export const FULL_TAIL_BYTES = 32 * 1024 * 1024
... [+1491 chars truncated]

### Assistant | 2026-06-11T15:59:45.395Z

`five-hour-token-sum.mjs` is a pure library (no `main()`, no top-level execution, no `__direct` block). `fiveHourTokenSum` throws if `nowMs` is not finite — and the fallback always passes a finite `now` (defaults to `Date.now()`). Now let me verify the `decideSwitch` gate and confirm stale-pct handling.

### Assistant | 2026-06-11T15:59:45.911Z

[tool_use: Read]

### User | 2026-06-11T15:59:46.643Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\five-hour-switch-gate.mjs' was already read 67s ago in this session and is unchanged (mtime 1781187700114). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-11T15:59:49.263Z

Let me grep the gate to confirm its decision logic.

### Assistant | 2026-06-11T15:59:50.626Z

[tool_use: Bash]

### User | 2026-06-11T15:59:53.735Z

[tool_result] === five-hour-switch-gate.mjs decideSwitch + absThresholdFromEnv ===
// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SWITCH-GATE (slot:bravo, 2026-06-11) -- keystone #3.
//
// The denominator-FREE decision gate for the account-switch coordinator. The
// coordinator's original gate was pct >= 0.90 and it FAILED LOUD when pct was
// null. But the Max-plan 5h token DENOMINATOR is not locally derivable (it is
// dyn
... [+3663 chars truncated]

### Assistant | 2026-06-11T16:00:00.750Z

The gate logic is sound. Now the critical NEVER-SWITCH-ON-STALE analysis. The reviewer's concern is: can a stale/garbage sidecar force a switch? Let me trace the full path:

1. The pct path triggers a switch only when `pct >= threshold (0.90)`.
2. The `pct` comes from either: (a) a sidecar's `quota.fiveHour.pct`, or (b) the on-demand fallback's `computePct`.

The fallback's `pct` is `null` unless `PRISM_5H_WEIGHTED_BUDGET`/`PRISM_5H_TOKEN_BUDGET` is set — so the fallback alone can't produce a `pct >= 0.90` without an operator-set budget. Good. But the **sidecar** path still trusts `quota.fiveHour.pct` directly with no freshness/staleness check. Let me verify whether THIS change touched that, and whether the stale `pct=1` from the superseded writer is validated anywhere. Let me check the test for the fallback-vs-sidecar precedence and look at lines 626-690 of the test.

### Assistant | 2026-06-11T16:00:01.527Z

[tool_use: Read]

### User | 2026-06-11T16:00:02.628Z

[tool_result] 525	
526	
527	// keystone #3 absolute weighted-token trigger (denominator-free) -- pct null path
528	describe("runCoordinator (absolute weighted-token trigger)", () => {
529	  const noSleep = () => Promise.resolve();
530	  const clock = (s) => { let t = 0; return () => (t += s); };
531	
532	  it("pct null + weighted >= trigger -> switched (gate absolute, NO throw)", async () => {
533	    const out
... [+7471 chars truncated]

### Assistant | 2026-06-11T16:00:06.487Z

Let me read the remaining tail of the test file (lines 698-718) and the earlier core test sections to assess coverage gaps.

### Assistant | 2026-06-11T16:00:07.166Z

[tool_use: Read]

### User | 2026-06-11T16:00:08.281Z

[tool_result] 698	  it("empty sidecars + on-demand weighted < trigger → switched:false (no throw)", async () => {
699	    const dir = tmp("acct-co-fb-below-");
700	    const out = await runCoordinator(baseOpts(
701	      dir,
702	      { PRISM_5H_WEIGHTED_TOKEN_TRIGGER: "80000000" },
703	      () => ({ weightedTokens: 70_000_000, meteredTokens: 25_000_000, usedTokens: 500_000_000 }),
704	    ));
705	    assert.
... [+570 chars truncated]

### Assistant | 2026-06-11T16:00:10.873Z

Now I have the full test file in context. Let me run the actual test suite to confirm it passes, and verify the import paths resolve (the integration concern).

### Assistant | 2026-06-11T16:00:12.775Z

[tool_use: Bash]

### User | 2026-06-11T16:00:17.723Z

[tool_result] === import resolution check (does the module load without side effects?) ===
LOADED OK; exports: fiveHourFallbackFromTranscripts, readFiveHourPct

### Assistant | 2026-06-11T16:00:21.001Z

Module loads with zero side effects (no CLI output, no exit). The import paths resolve in the main tree. Now let me run the test suite.

### Assistant | 2026-06-11T16:00:21.577Z

[tool_use: Bash]

### User | 2026-06-11T16:00:25.218Z

[tool_result]     # Subtest: empty sidecars + on-demand weighted < trigger → switched:false (no throw)
    ok 2 - empty sidecars + on-demand weighted < trigger → switched:false (no throw)
      ---
      duration_ms: 0.3284
      ...
    # Subtest: empty sidecars + on-demand weighted but NO trigger → still FAILS LOUD
    ok 3 - empty sidecars + on-demand weighted but NO trigger → still FAILS LOUD
      ---
    
... [+265 chars truncated]

### Assistant | 2026-06-11T16:00:29.260Z

All 66 tests pass. Now let me address the key concern points with hard verification. 

**Concern 2 (latency/blast-radius):** Where is `readFiveHourPct` invoked, and is the on-demand fallback (reads ALL transcripts) on a latency-sensitive path? Let me check who imports this coordinator and whether `readFiveHourPct` runs anywhere besides the background coordinator.

### Assistant | 2026-06-11T16:00:30.928Z

[tool_use: Bash]

### User | 2026-06-11T16:02:40.939Z

[tool_result] === who imports the coordinator? ===
scripts/populate-five-hour-sidecar.mjs:6:// account-switch-restart-coordinator.mjs (which reads quota.fiveHour.pct and fails
scripts/switch-claude-account.mjs:13:// account-switch-restart-coordinator (U6) chains swap → staggered restart.
scripts/switch-claude-account.mjs:82:  account-switch-restart-coordinator (U6) chains swap → staggered restart.

### Assistant | 2026-06-11T16:02:44.741Z

Those are comment references only, not imports of `readFiveHourPct`. Let me confirm no hook or scheduled task calls the coordinator on a hot/UserPromptSubmit path, and check how it's actually invoked (CLI/cron).

### Assistant | 2026-06-11T16:02:48.746Z

[tool_use: Bash]

### User | 2026-06-11T16:03:07.652Z

[tool_result] === any settings.json / scheduled task / hook referencing the coordinator script by filename? ===
--- scheduled tasks / ps1 / cron refs ---
--- importers of readFiveHourPct specifically (named import) ---

### Assistant | 2026-06-11T16:03:15.260Z

Confirmed: nothing imports `readFiveHourPct` / `fiveHourFallbackFromTranscripts` outside the coordinator and its test. No hook, no settings.json, no scheduled task references the coordinator script. It is invoked only via its own CLI `main()` (background/manual). The on-demand fallback's transcript scan is **not** on any latency-sensitive path. The blast radius for latency is nil.

One more critical check — the **side-effect-of-reading** concern. The fallback (line 301) only calls `fiveHourTokenSum` (a pure read of transcripts). `computePct`/`budgetFromEnv` are pure. No actuation. Actuation (`activateAccount`, `runSeq`) only happens later in `runCoordinator` gated behind `decision.switch === true` AND (for restart) the trigger path. Reading the 5h value writes nothing. Let me confirm `fiveHourTokenSum` and `tailRead`/`listTranscripts` are read-only (no write).

### Assistant | 2026-06-11T16:03:19.043Z

[tool_use: Bash]

### User | 2026-06-11T16:03:22.635Z

[tool_result] === any write ops in five-hour-token-sum.mjs? (should be NONE) ===
NO write operations -- read-only confirmed

=== ASCII-only check on the .mjs new lines (em-dash/arrows/box chars in CODE, not comments) ===
grep: -P supports only unibyte and UTF-8 locales

### Assistant | 2026-06-11T16:03:25.970Z

`-P` unsupported on this Windows grep build. Let me check non-ASCII in code (non-comment) lines with a node script for precision.

### Assistant | 2026-06-11T16:03:30.320Z

[tool_use: Bash]

### User | 2026-06-11T16:03:34.073Z

[tool_result] CODE  scripts/account-switch-restart-coordinator.mjs:161  chars=[U+2014]  const mode = s?.apply ? "WILL actuate the staggered restart now" : "DRY-RUN — pl
CODE  scripts/account-switch-restart-coordinator.mjs:164  chars=[U+2014]  `ACTION REQUIRED (interactive — cannot be auto-scripted, ZULU-ACCOUNT-CYCLE-MS0 
CODE  scripts/account-switch-restart-coordinator.mjs:168  chars=[U+2014]  `     token coun
... [+7645 chars truncated]

### Assistant | 2026-06-11T16:03:40.135Z

This surfaces non-ASCII characters (U+2014 em-dash, U+2192 arrow) in code/string lines. However, I need to assess whether these are **pre-existing** (not introduced by THIS change) since the repo rule is about the change. The em-dashes/arrows in `composeSwitchAdvisory` (line 161, 164, 168), `composeAutoSwapAdvisory` (373-374, 378), and line 493 are all in **pre-existing** advisory-string functions, not the new fallback code. Line 285's `→` arrow is in a pre-existing comment-trailing-code line within `readFiveHourPct` but that specific line was likely pre-existing too. Let me verify which of these the change actually introduced by checking git blame on the new function and the modified lines.

### Assistant | 2026-06-11T16:03:43.449Z

[tool_use: Bash]

### User | 2026-06-11T16:03:46.453Z

[tool_result] === git status of the two files ===
 M scripts/account-switch-restart-coordinator.mjs
 M scripts/account-switch-restart-coordinator.test.mjs

=== Is line 285 (arrow in code) part of the new diff, or pre-existing? Check unstaged+staged diff for the .mjs ===

### Assistant | 2026-06-11T16:03:49.879Z

Let me get the diff and analyze added lines for non-ASCII via node, to determine precisely what THIS change introduced.

### Assistant | 2026-06-11T16:03:54.367Z

[tool_use: Bash]

### User | 2026-06-11T16:03:57.608Z

[tool_result] Exit code 1
node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'H:\tmp\asw.diff'
    at Object.readFileSync (node:fs:441:20)
    at file:///H:/prism/[eval1]:3:14
    at ModuleJob.run (node:internal/modules/esm/module_job:271:25)
    at async onImport.tracePromise.__proto__ (node:internal/modul
... [+290 chars truncated]

### Assistant | 2026-06-11T16:04:00.550Z

The `/tmp` path resolved to `H:\tmp`. Let me redirect to a real temp location.

### Assistant | 2026-06-11T16:04:04.502Z

[tool_use: Bash]

### User | 2026-06-11T16:04:11.212Z

[tool_result] +NONASCII-CODE [U+2192] it("null 5h source + on-demand fallback DISABLED → exit 2 + JSON error (fail-loud, not sil
+NONASCII-CODE [U+2192] it("finite weighted + no budget → {pct:null, weighted, source has on-demand}", () => {
+NONASCII-CODE [U+2192] it("finite weighted + PRISM_5H_WEIGHTED_BUDGET → pct computed", () => {
+NONASCII-CODE [U+2192] it("sum throws → null (fail-soft, caller fails loud)",
... [+831 chars truncated]

### Assistant | 2026-06-11T16:04:19.067Z

This is precise now. The change introduced 11 non-ASCII lines, **all in `it(...)` test description strings** (U+2192 arrow inside the test-name string literal). None in the new production code of the `.mjs` (`fiveHourFallbackFromTranscripts` and the `readFiveHourPct` fallback block are all ASCII). 

This is a real-but-minor convention finding. The repo rule ("ASCII-only, no arrows in code") is stated for code; arrows inside test-description string literals are a gray area — and critically, the surrounding pre-existing tests in this very file already use `→` heavily in their `it()` names (lines 47-74, etc. are pre-existing). So the new tests **match the surrounding convention** (R11). That downgrades this from a P1 to a P2/style note: it conforms to the file's existing style even though it technically diverges from the global ASCII rule. I'll flag it as P2, not blocking.

Now let me verify the remaining concern points with the full core test view (lines 30-210) to confirm coverage and the `writeSidecar` helper.

### Assistant | 2026-06-11T16:04:20.061Z

[tool_use: Read]

### User | 2026-06-11T16:04:21.236Z

[tool_result] 1	// account-switch-restart-coordinator tests (slot:bravo, hermes-zulu).
2	//
3	// Pure-core is exhaustively unit-tested with CONCRETE assertions (no toBeDefined
4	// stubs); the orchestration is covered by an injected-I/O E2E (readFiveHourPctFn /
5	// readActiveFleetFn / runSequencerFn all injected) AND a spawned CLI E2E against a
6	// temp PRISM_ROOT — per the PRISM "pure-core + injected readers
... [+1587 chars truncated]

### Assistant | 2026-06-11T16:04:30.630Z

I now have a complete picture. Let me do the final coverage-gap analysis for the new code by enumerating adversarial inputs the reviewer asked about and checking each against the tests:

1. **`_sum` throws** → covered (test:608, 612).
2. **`weightedTokens: null`** → covered (test:617-622).
3. **`weightedTokens` finite + no budget → pct null** → covered (test:585).
4. **`weightedTokens` + budget → pct computed** → covered (test:598).
5. **Sidecar-first precedence (sum not called when sidecar has value)** → covered (test:641-652).
6. **Kill-switch `PRISM_5H_ONDEMAND_FALLBACK=0`** → covered (test:662, and CLI test:477).
7. **No `_sum` + no `fallbackLive` → legacy null** → covered (test:654).

Now the **gaps**. Let me check whether these adversarial inputs (which the reviewer explicitly named) are covered:
- `_sum` returning a **non-object** (e.g. a string, number, `undefined`).
- `weightedTokens` **negative** (would pass `Number.isFinite`, yields a negative weighted — flows to absolute gate).
- `weightedTokens` **NaN as actual NaN value** (vs null).
- env with **non-numeric budget** string.
- `_sum` returning an object with `weightedTokens` as a **numeric string** (e.g. `"90000000"`).

Let me verify the code's behavior on these uncovered inputs to confirm they're safe (even if untested).

### Assistant | 2026-06-11T16:04:39.644Z

[tool_use: Bash]

### User | 2026-06-11T16:04:43.256Z

[tool_result] _sum -> undefined:                                   null
_sum -> string:                                      null
_sum -> number 5:                                    null
_sum -> null:                                        null
weighted -50M (negative finite):                     {"pct":null,"weighted":-50000000,"source":"transcript-sum:on-demand(weighted=-50000000)","meteredTokens":null}
weig
... [+759 chars truncated]

### Assistant | 2026-06-11T16:05:24.359Z

Excellent — the adversarial probes reveal the code is **robust** on all of these:
- Non-object `_sum` returns (`undefined`/string/number/null) → all correctly return `null` (the `!sum || sum.weightedTokens == null` guard handles non-objects since `(5).weightedTokens` is `undefined`, `"oops".weightedTokens` is `undefined`).
- `NaN`/`Infinity` weighted → `null` (the `Number.isFinite` guard catches both).
- Numeric-string weighted `"90000000"` → coerced to `90000000` (acceptable).
- Non-numeric/negative/zero budget → `pct:null` (no fabricated denominator — `budgetFromEnv` rejects them).

One subtle but important observation: **negative weighted (`-50M`) flows through as a finite value** with `pct:null`. This is benign for the switch decision: `shouldSwitchAbsolute(-50M, trigger)` requires `weighted >= trigger` where `trigger > 0`, so a negative weighted can never trip the absolute gate; and `pct` is null so the pct gate can't fire either. A negative weighted is physically impossible from `fiveHourTokenSum` (token counts are non-negative sums), so this is not a real-world risk — just noting it's handled safely.

Now the **NEVER-SWITCH-ON-STALE** final confirmation. The reviewer cleaned 9 sidecars with stale `pct=1`. Does THIS change re-introduce a path that trusts an unvalidated pct? Let me trace:
- The change does **not** modify the sidecar-pct read path (lines 280-286 are unchanged logic — they read `quota.fiveHour.pct` and trust it if finite). That trust is **pre-existing behavior**, not introduced here.
- The change's **new** path (fallback) computes `pct` only from `computePct(sum, budgetFromEnv(env))` which is `null` without an operator budget — so the fallback **cannot** manufacture a stale `pct=1`.

So this change does not re-introduce or worsen the stale-pct trust. The stale-`pct=1` risk lives entirely in the pre-existing sidecar path and is orthogonal to this change. I'll note this as an observation (out of scope for this change, but worth flagging that the si
... [+5868 chars truncated]
