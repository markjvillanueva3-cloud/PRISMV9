---
type: "chat-session"
source: "claude-code-cli"
session_id: "5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a"
title: "RE-VERIFICATION pass (you previously reviewed an earlier version and returned FA"
date: "2026-06-03"
first_ts: "2026-06-03T13:43:51.714Z"
last_ts: "2026-06-03T13:48:58.979Z"
cwd: "H:\\prism-slot-bravo"
messages: 67
user_msgs: 24
assistant_msgs: 43
raw_file: "H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a48ee661ba847b015.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:37"
---

# RE-VERIFICATION pass (you previously reviewed an earlier version and returned FA

> **claude-code-cli** | 2026-06-03 | 67 msgs (24 user / 43 assistant) | cwd: H:\prism-slot-bravo
> Raw: `H:/.claude/projects/H--prism-slot-bravo/5e210e4e-d61d-49d8-b4bb-a7d7bba9c39a/subagents/agent-a48ee661ba847b015.jsonl`

## Transcript

### User | 2026-06-03T13:43:51.714Z

RE-VERIFICATION pass (you previously reviewed an earlier version and returned FAIL). The new fleet-wake-sequencer had 3 defects you/peers found; verify they are genuinely fixed and no new ones were introduced.

PRIOR FINDINGS:
- P0: defaultSendKeys resolved the window by bare `slotsState[slot].topic`, but the real caption is `PRISM <slot> - <topic>` (per .claude/hooks/rename-window-intercept.mjs composeSlotTitle). Topicless slots (golf, front-loaded) were unwakeable; substring match risked wrong-window send. Canonical correct consumer: scripts/zulu-orchestrator-sweep.mjs:433 resolves by `PRISM <slot>`.
- P1: `const env = {...}; if(opts.confirm) env.PRISM_SENDKEYS_CONFIRM="1"` was computed but never passed to `_spawn` → --apply silently no-ops.
- P1: statSlotTranscript only checked H--prism-slot-<slot>/; shared-tree slots (golf) write to H--prism/<sessionId>.jsonl → permanent 120s gate-timeout.

FIXES TO VERIFY in H:/prism/scripts/fleet-wake-sequencer.mjs:
1. defaultSendKeys: `const title = \`PRISM ${slot}\``; resolve(title, opts); topic guard removed; spawn options now include `env`.
2. statSlotTranscript: primary slot-worktree dir + fallback to exact `H--prism/<sessionId>.jsonl`; sessionId threaded from runSequencer via slotsState.
3. New tests in fleet-wake-sequencer.test.mjs: `defaultSendKeys (integration seam)` (asserts resolves by "PRISM golf" for a topicless slot, env.PRISM_SENDKEYS_CONFIRM reaches spawn when confirm:true, skip-never-spawn on ambiguous) + 2 shared-tree statSlotTranscript tests. 46 tests pass.

CONFIRM:
(a) Read scripts/zulu-orchestrator-sweep.mjs around line 433 and rename-window-intercept.mjs composeSlotTitle — does the fix now match the proven `PRISM <slot>` contract exactly?
(b) Is the env now actually delivered to the child (P1 truly closed)?
(c) Is the shared-tree fallback correct (exact session file, no cross-contamination) and honestly documented?
(d) Are the new tests real (would they FAIL if the fix were reverted)? Any tautology?
(e) 
... [+164 chars truncated]

### Assistant | 2026-06-03T13:44:03.015Z

I'll re-verify the three fixes adversarially. Let me read the relevant files.

### Assistant | 2026-06-03T13:44:03.396Z

[tool_use: Read]

### Assistant | 2026-06-03T13:44:03.539Z

[tool_use: Read]

### User | 2026-06-03T13:44:05.892Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-wake-sequencer.mjs' was already read 8s ago in this session and is unchanged (mtime 1780494118810). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T13:44:07.068Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * rename-window-intercept.mjs — UserPromptSubmit hook.
4	 *
5	 * Two jobs, both with ZERO model turn:
6	 *
7	 *  1. INSTANT RENAME — if the submitted prompt is `/rename <name>` (or
8	 *     `/rename-chat <name>`) for THIS chat, update the slot label in
9	 *     chat-slots.json AND flip the Windows Terminal tab title immediately,
10	 *     then BLOCK the prompt so the
... [+8657 chars truncated]

### Assistant | 2026-06-03T13:44:14.800Z

The fleet-wake-sequencer.mjs is already in my context. Let me confirm the canonical contract from `composeSlotTitle`: the caption is `PRISM <slot>` (topicless) or `PRISM <slot> - <topic>`. The proven resolve contract leads with `PRISM <slot>`. Let me read the orchestrator sweep around line 433 and the sequencer file content I should still have.

### Assistant | 2026-06-03T13:44:15.303Z

[tool_use: Read]

### Assistant | 2026-06-03T13:44:15.932Z

[tool_use: Read]

### User | 2026-06-03T13:44:18.292Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-wake-sequencer.mjs' was already read 20s ago in this session and is unchanged (mtime 1780494118810). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-03T13:44:18.513Z

[tool_result] 400	      // so the target chat starts with the slot's actual capability frame —
401	      // not just the static backend-dev priority filter. fp may be null when
402	      // zulu-awareness-index.json is absent; buildAwarenessHint returns ""
403	      // on null and the chat just gets the unchanged static directive.
404	      slotAwareness: fp ? { ...fp, ragPolicy } : fp,
405	    });
406	
407	   
... [+3397 chars truncated]

### Assistant | 2026-06-03T13:44:23.237Z

The read-once guard says fleet-wake-sequencer.mjs is already in my context, but I don't actually see its content in this conversation — the prior read was in an earlier session turn that's been compacted out. I need its actual content. Let me bypass the cache.

### Assistant | 2026-06-03T13:44:23.685Z

[tool_use: Read]

### User | 2026-06-03T13:44:26.430Z

[tool_result] 1	#!/usr/bin/env node

### Assistant | 2026-06-03T13:44:29.143Z

The cache guard only triggers on full reads. Let me read the file in chunks to get the actual content.

### Assistant | 2026-06-03T13:44:30.119Z

[tool_use: Bash]

### User | 2026-06-03T13:44:34.304Z

[tool_result] 529

### Assistant | 2026-06-03T13:44:38.999Z

Let me read the actual file content by reading specific line ranges (which the cache guard allows).

### Assistant | 2026-06-03T13:44:39.269Z

[tool_use: Read]

### User | 2026-06-03T13:44:41.991Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-wake-sequencer.mjs — staggered, token-gated fleet wake for the ZULU/
4	 * Hermes orchestrator (slot:bravo, hermes-zulu galaxy).
5	 *
6	 * THE GAP THIS CLOSES (per the 2026-06-03 ZULU-fleet-control assessment): the
7	 * pull control loop already works (fleet-orchestrate composes a per-slot brief →
8	 * slot-brief-inject delivers it on the slot's next turn). Wh
... [+9780 chars truncated]

### Assistant | 2026-06-03T13:44:49.867Z

Now let me read the I/O section including `statSlotTranscript` and `defaultSendKeys`.

### Assistant | 2026-06-03T13:44:50.512Z

[tool_use: Read]

### User | 2026-06-03T13:44:53.422Z

[tool_result] 180	  const out = { total: results.length, woke: 0, timeout: 0, skip: 0, dryRun: 0 };
181	  for (const r of results) {
182	    if (r.status === "woke") out.woke++;
183	    else if (r.status === "timeout") out.timeout++;
184	    else if (r.status === "skip") out.skip++;
185	    else if (r.status === "dry-run") out.dryRun++;
186	  }
187	  return out;
188	}
189	
190	// ═══════════════════════════════
... [+9067 chars truncated]

### Assistant | 2026-06-03T13:44:58.043Z

Now the key fixes are visible. Let me read the orchestration section (`runSequencer`) to verify (a) the env/confirm threading, (b) sessionId threading into `statSlotTranscript`, and (c) the signature usage.

### Assistant | 2026-06-03T13:44:59.204Z

[tool_use: Read]

### User | 2026-06-03T13:45:02.012Z

[tool_result] 380	    return { ok: false, error: String(e?.message || e) };
381	  }
382	}
383	
384	export function releaseLock(lockFile, opts = {}) {
385	  const _fs = opts._fs || fs;
386	  try { if (lockFile && _fs.existsSync(lockFile)) _fs.unlinkSync(lockFile); } catch { /* */ }
387	}
388	
389	// ═════════════════════════════════════════════════════════════════════════════
390	// ORCHESTRATION — drive the pur
... [+6812 chars truncated]

### Assistant | 2026-06-03T13:45:27.332Z

I have the full implementation. Now let me trace the critical paths. I notice one thing already: `runSequencer` reads `opts.confirm` but I need to verify how `confirm` flows from `runSequencer` into `defaultSendKeys`. The `sendFn` default is `(slot, text) => defaultSendKeys(slot, text, opts)` — so `opts` (which contains `confirm`) is passed through. Good. But let me verify the `resolveHwndByTitle` contract to confirm the `PRISM <slot>` prefix actually matches the decorated caption, and check the test file.

### Assistant | 2026-06-03T13:45:27.333Z

[tool_use: Read]

### User | 2026-06-03T13:45:29.635Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\resolve-hwnd-by-title.mjs' was already read 22m ago in this session and is unchanged (mtime 1780114423305). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T13:45:34.393Z

The guard claims this is in context but it was read 22m ago in a prior (compacted) turn. Let me read it in ranges to get the actual matching logic.

### Assistant | 2026-06-03T13:45:35.182Z

[tool_use: Read]

### User | 2026-06-03T13:45:38.566Z

[tool_result] 1	// ZULU-ORCHESTRATOR-MS0 / G1b — title-based HWND resolver for chat-slot windows.
2	//
3	// resolve-hwnd.mjs (PID -> MainWindowHandle) is the WRONG primitive for the
4	// PRISM fleet: chat-slots.json stores an ephemeral `pid` that does not own a
5	// stable top-level window — `Get-Process -Id <pid>` routinely returns
6	// process-not-found once a chat has run for a while (the recorded pid is a
7
... [+6498 chars truncated]

### Assistant | 2026-06-03T13:45:46.043Z

Now let me read the matching logic (the `matchByTitle`/`resolveHwndByTitle` core) to confirm that the `PRISM <slot>` prefix matches the decorated `PRISM <slot> - <topic>` caption via the contains tier, and that it's UNIQUE-gated.

### Assistant | 2026-06-03T13:45:47.189Z

[tool_use: Read]

### User | 2026-06-03T13:45:50.007Z

[tool_result] 130	  return { ok: true, windows };
131	}
132	
133	// Pure: match a window list against an expected title. Exported for tests.
134	// Tiers (both require a UNIQUE candidate, else `ambiguous-*`):
135	//   1. exact   — sanitized caption === sanitized expected title
136	//   2. contains— sanitized caption includes sanitized expected title
137	//      (handles "<topic> - PowerShell" style terminal cap
... [+4407 chars truncated]

### Assistant | 2026-06-03T13:46:01.558Z

This confirms the contract precisely. With `expectedTitle = "PRISM golf"` (topicless) and a window caption `PRISM golf`, the exact tier matches. With `expectedTitle = "PRISM bravo"` and caption `PRISM bravo - hermes-zulu`, the exact tier finds nothing, then the contains tier matches `"prism bravo"` ⊂ `"prism bravo - hermes-zulu"` uniquely. This matches the canonical `zulu-orchestrator-sweep.mjs:433` usage of `matchWindowsByTitle(windowList, \`PRISM ${pick.slot}\`)` exactly. Fix #1 is correct.

Now there's one adversarial concern about the contains tier: could `PRISM bravo` match a wrong window? Only if no exact match exists AND a substring match is non-unique. The unique-gating (`ambiguous-contains` → not ok) protects against this. A theoretical risk: `PRISM bravo` as a substring of another slot's caption — but slot names are distinct tokens, and `PRISM bravo` won't appear inside `PRISM bravissimo`-type captions since slots are from the fixed NATO set. Acceptable.

Now let me verify the test file thoroughly — this is the crux of fix #3 (are the tests real and would they fail on revert?).

### Assistant | 2026-06-03T13:46:02.650Z

[tool_use: Bash]

### User | 2026-06-03T13:46:06.700Z

[tool_result] LINES 425

### Assistant | 2026-06-03T13:46:09.599Z

[tool_use: Read]

### User | 2026-06-03T13:46:11.877Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-wake-sequencer.test.mjs' was already read 2m ago in this session and is unchanged (mtime 1780494179003). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-06-03T13:46:15.424Z

Same compacted-context situation. Let me read the test file in ranges, focusing on the new tests for the three fixes.

### Assistant | 2026-06-03T13:46:16.372Z

[tool_use: Read]

### User | 2026-06-03T13:46:19.058Z

[tool_result] 1	// HERMES-MASTER-ORCHESTRATOR / fleet-wake-sequencer tests
2	//
3	// Pure-core is exhaustively unit-tested; the orchestration loop is covered by an
4	// injected-I/O E2E (sendFn/statFn/now/sleep all injected) AND a spawned CLI E2E
5	// against a temp PRISM_ROOT — per the PRISM rule "pure-core + injected readers
6	// MUST ship a real-data E2E" (the fake-reader audit lesson).
7	import { describe, 
... [+2053 chars truncated]

### Assistant | 2026-06-03T13:46:22.582Z

Let me find the specific new tests for the three fixes.

### Assistant | 2026-06-03T13:46:23.955Z

[tool_use: Grep]

### User | 2026-06-03T13:46:32.036Z

[tool_result] 22:  statSlotTranscript,
23:  defaultSendKeys,
193:// ── statSlotTranscript (I/O) ─────────────────────────────────────────────────
194:describe("statSlotTranscript", () => {
203:    const st = statSlotTranscript("bravo", { projectDir: dir });
210:    const st = statSlotTranscript("bravo", { projectDir: path.join(os.tmpdir(), "no-proj-xyz") });
213:  it("falls back to shared-tree H--prism/<session
... [+1484 chars truncated]

### Assistant | 2026-06-03T13:46:35.246Z

Let me read the full body of the new tests (statSlotTranscript shared-tree + defaultSendKeys integration seam).

### Assistant | 2026-06-03T13:46:36.493Z

[tool_use: Read]

### User | 2026-06-03T13:46:39.200Z

[tool_result] 193	// ── statSlotTranscript (I/O) ─────────────────────────────────────────────────
194	describe("statSlotTranscript", () => {
195	  it("picks the newest .jsonl in the slot project dir", () => {
196	    const dir = tmp("proj-");
197	    fs.writeFileSync(path.join(dir, "old.jsonl"), "a");
198	    const newer = path.join(dir, "new.jsonl");
199	    fs.writeFileSync(newer, "abcdef");
200	    // force
... [+4825 chars truncated]

### Assistant | 2026-06-03T13:46:56.282Z

Now I have the full picture. Let me adversarially verify each test would FAIL on revert:

**Test "resolves by `PRISM <slot>` (NOT topic)"**: asserts `resolvedTitle === "PRISM golf"`. If reverted to `const title = slotsState[slot].topic` (the bug), for topicless golf `title` would be `undefined`/`""` → assertion fails. Real test. ✓ (Note: this test passes `resolveHwnd` injected but no `slotsState` — under the old buggy code `defaultSendKeys` would have needed `slotsState`; the new signature derives title purely from `slot`, which is what's tested.)

**Test "passes PRISM_SENDKEYS_CONFIRM ... when confirm:true"**: asserts `spawnOpts.env.PRISM_SENDKEYS_CONFIRM === "1"`. If reverted to not passing `env` to `_spawn`, `spawnOpts.env` would be `undefined` → `assert.ok(spawnOpts && spawnOpts.env)` fails. Real test. ✓

**Test "shared-tree fallback ... EXACT session file, not newest"**: writes a larger/newer peer file `other-slot.jsonl` (12 bytes) and the exact `mine.jsonl` (2 bytes), asserts `st.path === "mine.jsonl"`. If reverted to "newest in shared dir," it would pick `other-slot.jsonl` → fails. Real test, genuinely guards cross-contamination. ✓

Let me verify there's no tautology in the "EXACT session file" test — critically, does `other-slot.jsonl` actually end up newer than `mine.jsonl`? They're written sequentially; `mine.jsonl` is written last, so it's likely newer by mtime. This is a concern: if `mine.jsonl` is the newest anyway, a "newest" implementation would ALSO pick it, making the test pass under the buggy code → tautology. But the implementation never scans the shared dir for "newest" at all — it targets the exact `${sessionId}.jsonl`. The peer file is in the same dir but is never enumerated (only the worktree `projectDir` is scanned via `newestJsonl`, and that dir is absent). So the test correctly proves the exact-file targeting. However, the test would be *stronger* if `other-slot.jsonl` were forced newer via `utimesSync`. Let me check: even without that, the
... [+500 chars truncated]

### Assistant | 2026-06-03T13:46:57.591Z

[tool_use: Bash]

### User | 2026-06-03T13:47:05.776Z

[tool_result]   ---
  duration_ms: 2.6115
  type: 'suite'
  ...
# Subtest: CLI E2E (spawned, temp PRISM_ROOT)
    # Subtest: parses args, acquires+releases lock, emits valid JSON for an empty plan
    ok 1 - parses args, acquires+releases lock, emits valid JSON for an empty plan
      ---
      duration_ms: 70.8847
      ...
    1..1
ok 12 - CLI E2E (spawned, temp PRISM_ROOT)
  ---
  duration_ms: 70.9803
  type
... [+121 chars truncated]

### Assistant | 2026-06-03T13:47:13.997Z

All 46 tests pass. Now let me adversarially hunt for NEW defects introduced by the edits.

**Concern 1 — `runSequencer` dry-run path references `sendRes.topic`** (line 431): `results.push({ ..., topic: sendRes.topic ?? null })`. Does `defaultSendKeys` ever return `topic`? Looking at the return objects (lines 320, 333, 336, 341, 343-352), it returns `title`, never `topic`. So `sendRes.topic` is always `undefined` → recorded as `null`. This is a pre-existing harmless leftover (the field was renamed topic→title) but it means the dry-run result loses the resolved title for observability. Minor — let me verify it's not a regression from these edits.

**Concern 2 — does `confirm` actually thread from CLI → runSequencer → defaultSendKeys?** CLI `main()` passes `confirm: args.apply === true` into `runSequencer` opts (line 503). `runSequencer`'s default `sendFn` is `(slot, text) => defaultSendKeys(slot, text, opts)` (line 411) where `opts` includes `confirm`. `defaultSendKeys` reads `opts.confirm` (line 323). End-to-end thread is intact. ✓

Let me check git blame / diff to confirm whether `topic` leftover and the `title` field are from this change set or pre-existing.

### Assistant | 2026-06-03T13:47:14.683Z

[tool_use: Bash]

### User | 2026-06-03T13:47:21.833Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-03T13:47:29.826Z

[tool_use: Bash]

### User | 2026-06-03T13:47:38.391Z

[tool_result] ---STATUS---
?? scripts/fleet-wake-sequencer.mjs
?? scripts/fleet-wake-sequencer.test.mjs

### Assistant | 2026-06-03T13:47:49.481Z

Both files are untracked (new, never committed) — so this is the original ship plus the three in-session fixes, no prior committed version to diff against. The `topic` leftover at line 431 is therefore an in-file inconsistency that exists in the current shipped state. Let me assess its severity: it's in the dry-run result object only, recording `topic: null` always. It does not affect actuation, gating, or the fix correctness. It's a P3 observability cosmetic (the dry-run result should carry `title: sendRes.title` instead). Not blocking.

Now let me verify there are no unused imports or broken signatures. Check that everything imported is used, and that `os` (used in lock) and `resolveHwndByTitle` are referenced.

### Assistant | 2026-06-03T13:47:49.482Z

[tool_use: Bash]

### User | 2026-06-03T13:47:57.523Z

[tool_result] SYNTAX_OK
---unused import scan---
path 0
os 0
spawnSync 0
SLOT_NAMES 0
resolveHwndByTitle 0

### Assistant | 2026-06-03T13:48:00.859Z

The escaping mangled the regex. Let me check usage counts directly with Grep.

### Assistant | 2026-06-03T13:48:02.137Z

[tool_use: Grep]

### User | 2026-06-03T13:48:07.010Z

[tool_result] H:\prism\scripts\fleet-wake-sequencer.mjs:42

Found 42 total occurrences across 1 file.

### Assistant | 2026-06-03T13:48:16.188Z

All imports are used (42 occurrences across the 6 symbols, well above the import lines themselves). `node --check` passed (SYNTAX_OK). No unused imports, no broken signatures.

Let me do one final adversarial check: verify the `defaultSendKeys` return object includes `title` consistently and that the `_spawn` signature `(cmd, args, opts)` is what the test mocks expect — the test mock `(_e, _a, o) => o` reads the 3rd positional arg as opts, and the real `spawnSync` call passes `(cmd, argsArray, optsObj)`. Confirmed at lines 326-331: `_spawn("powershell.exe", [...args], { encoding, env, timeout, windowsHide })`. The opts object (3rd arg) carries `env`. Test reads `o.env.PRISM_SENDKEYS_CONFIRM`. Aligned. ✓

One last check: does the `send-keys-to-window.ps1` script actually consume `PRISM_SENDKEYS_CONFIRM` from env (vs. expecting a `-Confirm` flag)? If the script doesn't read the env var, P1 would only be half-closed (env delivered but ignored).

### Assistant | 2026-06-03T13:48:17.473Z

[tool_use: Grep]

### User | 2026-06-03T13:48:24.783Z

[tool_result] 33:  the operator to opt-in per call via the -Confirm flag. The orchestrator
34:  main loop sets -Confirm:$true based on per-slot env / config (each slot
46:.PARAMETER Confirm
49:  Operator gate: the orchestrator must pass -Confirm:$true based on the
62:  JSON object on stdout: { ok, hwnd, className, windowTitle, chars, dryRun,
72:  powershell.exe -File send-keys-to-window.ps1 -Hwnd 0x12345 -Text 
... [+1499 chars truncated]

### Assistant | 2026-06-03T13:48:58.979Z

This is the decisive confirmation. Line 108 of `send-keys-to-window.ps1`:
```powershell
if (-not $Confirm -and $env:PRISM_SENDKEYS_CONFIRM -eq "1") { $Confirm = $true }
```
The script genuinely reads `PRISM_SENDKEYS_CONFIRM` from env and flips `$Confirm = $true`, which gates the actual send vs. dry-run (line 239: `if (-not $Confirm) { ... dryRun=$true }`). So passing `env.PRISM_SENDKEYS_CONFIRM="1"` from `defaultSendKeys` is the *correct and intended* contract (the script comment at line 105 even says "Sweep sets PRISM_SENDKEYS_CONFIRM=1 for execute mode"). P1 #1 is genuinely and end-to-end closed — env is delivered to the child AND honored by the child.

I have everything needed for a verdict.

---

## RE-VERIFICATION VERDICT: PASS

All three prior defects are genuinely fixed, end-to-end, with real tests. No new defects introduced. 46/46 tests pass (verified by running the suite).

### (a) P0 — title resolution matches the proven `PRISM <slot>` contract — FIXED
`scripts/fleet-wake-sequencer.mjs:315` — `const title = \`PRISM ${slot}\``; passed to `resolve(title, opts)` at :316. The topic-based resolution and topicless guard are gone.
- **Matches the canonical consumer exactly**: `scripts/zulu-orchestrator-sweep.mjs:433` resolves with `matchWindowsByTitle(windowList, \`PRISM ${pick.slot}\`)` — identical key.
- **Matches the caption producer**: `rename-window-intercept.mjs:95-100` `composeSlotTitle` emits `PRISM <slot>` (topicless) or `PRISM <slot> - <topic>`. The resolver (`resolve-hwnd-by-title.mjs:140-179`) matches `PRISM golf` via the exact tier (topicless) and `PRISM bravo` ⊂ `PRISM bravo - <topic>` via the unique-gated contains tier. Topicless slots (golf) are now wakeable; the wrong-window substring risk is bounded by the `ambiguous-contains` unique gate.

### (b) P1 — env (PRISM_SENDKEYS_CONFIRM) truly delivered to the child — FIXED
`fleet-wake-sequencer.mjs:322-323` builds `env = {...process.env}` and sets `env.PRISM_SENDKEYS_CONFIRM="1"` when `opts.confirm`;
... [+3367 chars truncated]
