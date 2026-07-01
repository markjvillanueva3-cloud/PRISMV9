---
type: "chat-session"
source: "claude-code-cli"
session_id: "04256fb3-d30b-4652-ab9b-142a096f1045"
title: "Independent re-review of H:/prism/.claude/helpers/install-fleet-task-health-task"
date: "2026-06-17"
first_ts: "2026-06-17T15:56:05.980Z"
last_ts: "2026-06-17T15:57:54.447Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a80a17fd86e2c212b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Independent re-review of H:/prism/.claude/helpers/install-fleet-task-health-task

> **claude-code-cli** | 2026-06-17 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/04256fb3-d30b-4652-ab9b-142a096f1045/subagents/agent-a80a17fd86e2c212b.jsonl`

## Transcript

### User | 2026-06-17T15:56:05.980Z

Independent re-review of H:/prism/.claude/helpers/install-fleet-task-health-task.ps1 (read end-to-end). You previously FAILED it on 3 P1s; confirm they are closed and hunt for anything new. Do NOT assume the other reviewer is right.

The fixes claimed:
1. Header comment (around lines 56-63) + the registered-task $desc string now accurately describe the G10 self-heal (the live `--once` task re-enables disabled CRASH_CRITICAL tasks via Enable-ScheduledTask, default-on, gated by isMigrationFreezeActive() + EXPECTED_DISABLED + PRISM_FTH_AUTO_REENABLE_DISABLE + -DryRun) instead of the old false "Advisory only -- never kills, never auto-registers". Confirm the new wording is ACCURATE against the watch script behavior at H:/prism/scripts/fleet-task-health-watch.mjs:1292 (gate) and 1208 (reenableTasks -> Enable-ScheduledTask). Specifically: is it correct that the watchdog NEVER kills a process and NEVER REGISTERS a new task, and ONLY ever re-enables (Enable-ScheduledTask) -- never Disable? (verify it never calls Disable-ScheduledTask on another task).
2. PRISM_FTH_AUTO_REENABLE_DISABLE knob now surfaced in the footer -- confirm and confirm the env var name byte-matches the watch script's gate (process.env.PRISM_FTH_AUTO_REENABLE_DISABLE).
3. ExecutionTimeLimit now 180s with a comment explaining the 7-crash-critical x 15s fan-out math. Confirm 180s actually covers worst case (7x15 reenable + 15 sampler + node startup) and is not still short.

New-issue hunt: any inaccuracy introduced by the edits, any ASCII violation (em-dash/smart-quote) added, any broken PowerShell syntax in the edited comment/Description/footer regions, any contradiction between the header and the Description.
Grade PASS or FAIL with P0/P1/P2 + line citations. Read-only.

### Assistant | 2026-06-17T15:56:10.317Z

I'll review the PowerShell installer and verify the claimed fixes against the watch script behavior. Let me read both files end-to-end.

### Assistant | 2026-06-17T15:56:10.802Z

[tool_use: Read]

### User | 2026-06-17T15:56:11.490Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\install-fleet-task-health-task.ps1' was already read 9s ago in this session and is unchanged (mtime 1781711729576). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-17T15:56:11.705Z

[tool_use: Read]

### User | 2026-06-17T15:56:12.919Z

[tool_result] 1180	    const name = String(t.name || "").trim();
1181	    if (!name || seen.has(name)) continue;
1182	    if (t.status === "disabled" && crash.has(name) && !expected.has(name)) {
1183	      out.push(name);
1184	      seen.add(name);
1185	    }
1186	  }
1187	  return out;
1188	}
1189	
1190	/** PowerShell single-quote a literal (double any embedded single-quote). */
1191	function psSingleQuote(s) 
... [+7852 chars truncated]

### Assistant | 2026-06-17T15:56:16.445Z

The installer file content is in context. Let me read the key supporting functions in the watch script to verify the claims fully: the gate at 1292, the `selectReenableTargets` function, and confirm there is no `Disable-ScheduledTask` call anywhere in the watch script.

### Assistant | 2026-06-17T15:56:20.027Z

[tool_use: Grep]

### Assistant | 2026-06-17T15:56:20.311Z

[tool_use: Grep]

### User | 2026-06-17T15:56:21.609Z

[tool_result] 220:  // scripts actually register (Register-ScheduledTask-gated discovery — see
346: * `Register-ScheduledTask`, and return the set of `PRISM `-prefixed scheduled-
352: * not a throw. The `Register-ScheduledTask` content gate scopes name-extraction
368:  // PowerShell script, KEEP only those that actually call Register-ScheduledTask
392:  // failure one level up; the Register-ScheduledTask gate +
... [+109 chars truncated]

### User | 2026-06-17T15:56:21.847Z

[tool_result] 304:export const EXPECTED_DISABLED_TASKS = [
332:export function isMigrationFreezeActive(io = {}) {
1150: * AND (c) NOT in EXPECTED_DISABLED_TASKS. The HW-migration freeze is deliberately
1155: * allowed to re-enable it to MATCH that determination. EXPECTED_DISABLED_TASKS is
1170:export function selectReenableTargets(classified, cfg) {
1281:    expectedDisabled: EXPECTED_DISABLED_TASKS,
1282:    m
... [+327 chars truncated]

### Assistant | 2026-06-17T15:56:26.438Z

The grep confirms no `Disable-ScheduledTask`, no `Stop-ScheduledTask`, no `taskkill`, no `process.kill`, no `.kill(`, and no `Register-ScheduledTask` actually invoked (the only `Register-ScheduledTask` matches are in the installer-discovery gate that *reads* installer scripts for that string, not calls it). Let me read `selectReenableTargets` and `isMigrationFreezeActive` and `EXPECTED_DISABLED_TASKS` to fully verify the gate description, plus the migration-freeze logic.

### Assistant | 2026-06-17T15:56:27.311Z

[tool_use: Read]

### Assistant | 2026-06-17T15:56:27.746Z

[tool_use: Read]

### User | 2026-06-17T15:56:28.823Z

[tool_result] 300	 * WHEN THE FREEZE LIFTS: re-enable the task (`schtasks /Change /TN "<name>"
301	 * /ENABLE`) and REMOVE its name from this set in the same change — so a
302	 * genuinely-disabled-by-accident task re-surfaces as a real degradation.
303	 */
304	export const EXPECTED_DISABLED_TASKS = [
305	  // Individually/permanently expected-disabled tasks (e.g. superseded ones that
306	  // should NOT be re-
... [+4023 chars truncated]

### User | 2026-06-17T15:56:29.188Z

[tool_result] 1140	/**
1141	 * Select the crash-critical tasks that are SAFE to auto-re-enable.
1142	 *
1143	 * The recurring failure (precedent 2bc54961b re-enabled 7; 2026-06-09 re-enabled
1144	 * an 8th, "PRISM Zombie Reaper v2"): a crash-critical reaper silently lands in
1145	 * the Disabled state (Windows update, a peer disable, a crash mid-registration).
1146	 * Until now the watchdog only NAGGED -- a WAR
... [+2580 chars truncated]

### Assistant | 2026-06-17T15:56:34.660Z

I now have a complete picture of the watch-script behavior. There is one important nuance: the JSDoc at line 1172 says `migrationFreezeActive is intentionally NOT consulted` — i.e., the freeze does NOT gate re-enabling. The installer claim #1 says the self-heal is "gated by isMigrationFreezeActive()". Let me verify the installer's exact wording against this. The installer content is already in my context from the prior read. Let me re-read the specific regions I need to verify precisely (header, Description, footer) since the content is cached.

The installer file content is in my context. Let me locate and verify the exact lines for the header comment, the `$desc` string, the `ExecutionTimeLimit`, and the footer. Let me grep the installer for the load-bearing strings to get exact line numbers.

### Assistant | 2026-06-17T15:56:36.737Z

[tool_use: Grep]

### User | 2026-06-17T15:56:38.163Z

[tool_result] 16:  # reinstall without -DryRun.
17:  [switch]$DryRun,
52:#                                   box under memory pressure?" -- advisory
54:#                                   registered, enabled, and firing?" -- advisory
57:# self-heal one narrow case: its G10 guard re-ENABLES a DISABLED crash-critical
58:# task via Enable-ScheduledTask (CRASH_CRITICAL_TASKS in the watch script),
60:# EXPECTED_DISA
... [+1723 chars truncated]

### Assistant | 2026-06-17T15:56:42.014Z

Now let me read the exact header region (lines 50-70), the Description string region (around 155-165), and the footer/ExecutionTimeLimit region precisely to verify wording, ASCII, and PowerShell syntax. The earlier read-cache means content is in context, but I want to confirm the exact bytes of the edited regions.

### Assistant | 2026-06-17T15:56:42.988Z

[tool_use: Read]

### Assistant | 2026-06-17T15:56:43.813Z

[tool_use: Read]

### User | 2026-06-17T15:56:45.072Z

[tool_result] 44	# chat is open (e.g. overnight), closing the only window the Stop hook cannot
45	# cover. It is NOT a substitute for the Stop hook -- it is defense-in-depth.
46	#
47	# Why separate from the reaper / memory-monitor tasks: they answer different
48	# questions.
49	#   * fleet-reaper-sweep.mjs       "which orphan processes of CRASHED slots
50	#                                   should I kill?"     
... [+1543 chars truncated]

### User | 2026-06-17T15:56:46.422Z

[tool_result] 125	  -At (Get-Date).AddSeconds($StartOffsetSeconds) `
126	  -RepetitionInterval (New-TimeSpan -Minutes $EveryMinutes) `
127	  -RepetitionDuration (New-TimeSpan -Days 3650)
128	$bootTrigger = if ($Interactive) { New-ScheduledTaskTrigger -AtLogOn } else { New-ScheduledTaskTrigger -AtStartup }
129	$trigger = @($pollTrigger, $bootTrigger)
130	
131	# ExecutionTimeLimit 180s: the common audit is one Po
... [+2549 chars truncated]

### Assistant | 2026-06-17T15:56:55.560Z

I now have everything needed to verify all three claims plus hunt for new issues. Let me reconcile the one nuance that matters most: the gate behavior re: migration freeze.

**Critical cross-check on claim #1 wording.** The installer header (line 59) and the `$desc` (line 160) both say the self-heal is "suppressed under an active migration freeze" / "suppressed under migration freeze". But the watch script's `selectReenableTargets` JSDoc (lines 1150-1160, 1172) explicitly states the OPPOSITE: `migrationFreezeActive is intentionally NOT consulted` — a prior blanket `if (freeze) return []` was REMOVED because it made the guard a no-op during the weeks-long freeze (the PRISM Zombie Reaper v2 incident). And the live gate at line 1292 (`if (!dryRun && process.env.PRISM_FTH_AUTO_REENABLE_DISABLE !== "1")`) does NOT check `isMigrationFreezeActive()` at all. So the freeze does NOT suppress the re-enable. The installer's "suppressed under migration freeze" is a factual inaccuracy that re-introduces the exact false-doc problem the prior review was meant to fix.

Let me confirm there is no migration-freeze check on the re-enable path that I might be missing, and double-check `EXPECTED_DISABLED_TASKS` gating.

### Assistant | 2026-06-17T15:56:57.312Z

[tool_use: Grep]

### User | 2026-06-17T15:56:59.258Z

[tool_result] 210:  "PRISM Vault Memory Promotion Cron",     // MCP-FLEET-CAPACITY-MS0 2026-06-08 — sierra U-VAULT-MAINT-CRON installer (shipped disabled, migration freeze)
211:  "PRISM Vault Rot Sentinel Cron",         // MCP-FLEET-CAPACITY-MS0 2026-06-08 — sierra U-VAULT-MAINT-CRON installer (shipped disabled, migration freeze)
262: * 47-task migration freeze (operator: do NOT re-enable until migration done).
... [+3601 chars truncated]

### Assistant | 2026-06-17T15:57:08.726Z

This confirms the discrepancy definitively. The migration freeze is **NOT** a gate on the re-enable path:

- `selectReenableTargets` (lines 1170-1188) does NOT consult `migrationFreezeActive` (explicitly noted at 1172-1173, and it's not even passed into the call at 1299-1302 — only `crashCritical` + `expectedDisabled` are passed).
- The runOnce gate at 1292 checks only `!dryRun` and `PRISM_FTH_AUTO_REENABLE_DISABLE !== "1"` — no freeze check.
- The JSDoc at 1150-1160 documents the freeze is *deliberately NOT a gate* and that the prior `if (freeze) return []` was removed precisely because it neutered the guard during the freeze.

Meanwhile the installer claims (twice) that the self-heal is "suppressed under an active migration freeze." That is the inverse of the actual code. Let me also examine the embedded note at line 311-339 — `EXPECTED_DISABLED_TASKS` is an empty array (lines 304-310), so in practice nothing is in the `expectedDisabled` allowlist; the only real gates are `disabled` + `crashCritical` membership + the two env/dryRun knobs. The installer's "EXPECTED_DISABLED" gate description is technically accurate as a code path, just currently empty.

Now let me verify the footer region (lines ~205-225) and check for any ASCII violations across the full edited file. Let me read the footer and scan for non-ASCII characters.

### Assistant | 2026-06-17T15:57:10.146Z

[tool_use: Read]

### Assistant | 2026-06-17T15:57:11.283Z

[tool_use: Bash]

### User | 2026-06-17T15:57:14.960Z

[tool_result] 170	  Force       = $true
171	}
172	if ($principal) { $registerParams['Principal'] = $principal }
173	Register-ScheduledTask @registerParams | Out-Null
174	
175	$mode = if ($DryRun) { 'DRY-RUN burn-in (no telemetry/advisory writes)' } else { 'live' }
176	$autonomy = if ($Interactive) {
177	  'INTERACTIVE-ONLY (legacy -- dies when you log off; needs no admin)'
178	} elseif ($AsSystem) {
179	  'AUTO
... [+2875 chars truncated]

### User | 2026-06-17T15:57:23.372Z

[tool_result] NO_NON_ASCII_FOUND

### Assistant | 2026-06-17T15:57:54.447Z

I have everything I need. Let me finalize the verification of the three claimed fixes and the new-issue hunt.

**Claim verification summary:**

1. **Header + Description accuracy** — The ASCII scan returned clean (NO_NON_ASCII_FOUND). The "never kills / never registers / only Enable-ScheduledTask, never Disable" portion is verified accurate against the code (grep found zero `Disable-ScheduledTask`/`Stop-ScheduledTask`/`taskkill`/`process.kill` and no real `Register-ScheduledTask` invocation in the watch script — only string-gate reads of installer files). HOWEVER, the "suppressed under an active migration freeze" wording (line 59 header, line 160 Description) is FALSE against the code.

2. **PRISM_FTH_AUTO_REENABLE_DISABLE in footer** — Present at line 217, byte-matches the gate at watch-script line 1292 (`process.env.PRISM_FTH_AUTO_REENABLE_DISABLE !== "1"`). Verified correct.

3. **ExecutionTimeLimit 180s + math** — Line 144 sets 180s; comment lines 131-139 explain 7x15s=105s + 15s sampler. Verified the math holds (see below).

Now PowerShell-syntax sanity check on the edited regions: line 160 `$desc` uses a `$(if ($DryRun) { ' --dry-run [BURN-IN]' })` subexpression inside a double-quoted string — valid; the `--once$(...)` has no space before `$(`, which is correct. The footer `Write-Host` lines and `switch` block are syntactically sound. No broken syntax introduced.

---

VERDICT: FAIL

summary: Claims #2 (knob in footer, byte-matches the watch-script gate) and #3 (ExecutionTimeLimit 180s with correct fan-out math) are fully closed and verified. Claim #1 is NOT closed: the new header (line 59) and the `$desc` string (line 160) both assert the G10 self-heal is "suppressed under an active migration freeze," which is the exact inverse of the actual watch-script behavior — `selectReenableTargets` deliberately does NOT consult the migration freeze, and the prior `if (freeze) return []` was removed precisely to stop the freeze from neutering the guard. This re-introduc
... [+3661 chars truncated]
