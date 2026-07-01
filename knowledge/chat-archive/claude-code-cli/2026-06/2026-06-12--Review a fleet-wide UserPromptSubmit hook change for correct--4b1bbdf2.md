---
type: "chat-session"
source: "claude-code-cli"
session_id: "4b1bbdf2-c878-441d-93bc-88ca59603734"
title: "Review a fleet-wide UserPromptSubmit hook change for correctness, integration, e"
date: "2026-06-12"
first_ts: "2026-06-12T03:10:02.917Z"
last_ts: "2026-06-12T03:23:27.344Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-aee239b90c3fb8339.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review a fleet-wide UserPromptSubmit hook change for correctness, integration, e

> **claude-code-cli** | 2026-06-12 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/4b1bbdf2-c878-441d-93bc-88ca59603734/subagents/agent-aee239b90c3fb8339.jsonl`

## Transcript

### User | 2026-06-12T03:10:02.917Z

Review a fleet-wide UserPromptSubmit hook change for correctness, integration, edge cases, and fail-soft behavior. Read the WHOLE files end-to-end.

FILES:
1. H:/prism/.claude/hooks/session-reorient-inject.mjs (substantive change)
2. H:/prism/.claude/hooks/token-budget-gate.mjs (small change)
3. H:/prism/.claude/hooks/__tests__/session-reorient-inject.test.mjs (new test, 10/10 pass)

INTENT / WHAT CHANGED (operator directive: "improve prism awareness and context injection mid session" + "disable gates that warn when context is tight"):

session-reorient-inject.mjs — the mid-session reorientation brief used to EARLY-RETURN with no output whenever `state.anchors` was empty, which is the case for ~all live sessions (the anchor-capture pipeline is dormant — verified: 0 of 2 live state files have any anchors). The change REVIVES it by re-anchoring to the per-chat HANDOFF resume directive (reliably written by precompact-handoff/`/handoff`). New pure helpers `extractResume(txt)` (line-scan of the `## RESUME` section, stops at next `## ` header, caps 600 chars) and `readStandingGoal(sessionId, dir=HANDOFF_DIR)` (globs `HANDOFF-<sid>-*.md`, picks newest by mtime, fail-soft → null). `buildBrief(state,trigger,standingGoal)` now prepends a "STANDING GOAL" section ABOVE the inferred OBJECTIVE. The early-return now gates on `hasAnchors || sidReal`; the handoff is read LAZILY only when a brief actually fires (every promptInterval=15), NOT per-prompt (hot-path concern). main() is now gated behind an `import.meta.url === argv[1]` CLI guard so the pure helpers can be imported by tests; the 4 helpers are exported.

token-budget-gate.mjs — added a `warnDisabled()` knob (`PRISM_TOKEN_BUDGET_WARN_DISABLE==="1"`, set to "1" in settings.json) that gates ONLY the lone RED+heavy-skill advisory line (the gate never blocks; telemetry stays always-on). Default OFF for back-compat.

VERIFY SPECIFICALLY (flag P0/P1, grade PASS/FAIL):
- Control flow: when anchors exist (legacy path), is behavior p
... [+920 chars truncated]

### Assistant | 2026-06-12T03:10:13.618Z

I'll review this fleet-wide hook change. Let me read all three files end-to-end.

### Assistant | 2026-06-12T03:10:14.400Z

[tool_use: Read]

### Assistant | 2026-06-12T03:10:14.536Z

[tool_use: Read]

### Assistant | 2026-06-12T03:10:15.007Z

[tool_use: Read]

### User | 2026-06-12T03:10:39.570Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-reorient-inject.mjs — UserPromptSubmit hook
5	 *
6	 * For long sessions (especially 1M-context), context drift is real even
7	 * when nothing has been compacted. Important context gets buried under
8	 * exploration, errors, and intermediate work.
9	 *
10	 * This hook tracks per-session prompt count and tool call count via the
11	 * SessionReor
... [+14383 chars truncated]

### User | 2026-06-12T03:10:39.747Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * token-budget-gate.mjs — Token Budget Awareness Hook
5	 * ====================================================
6	 *
7	 * UserPromptSubmit hook that reads THIS chat's transcript token count
8	 * (per-session, not shared) and:
9	 *   1. Warns when approaching context limit
10	 *   2. Blocks heavy operations when critically low
11	 *
12	 * FIRES ON: UserP
... [+7338 chars truncated]

### User | 2026-06-12T03:10:40.770Z

[tool_result] 1	// session-reorient-inject.test.mjs
2	// Tests for the mid-session GOAL re-anchor revival (operator directive 2026-06-11):
3	// the brief used to emit nothing when state.anchors was empty (dormant in production);
4	// it now re-anchors to the per-chat HANDOFF resume directive every promptInterval.
5	// R9: each test pins the INTENT (re-anchor the real objective; fail-soft when absent),
6	// not 
... [+6001 chars truncated]

### Assistant | 2026-06-12T03:10:43.827Z

Now let me verify a few load-bearing claims against the live environment. Let me check the settings.json wiring, the handoff directory contents, and run the test suite.

### Assistant | 2026-06-12T03:10:45.302Z

[tool_use: Bash]

### Assistant | 2026-06-12T03:10:47.848Z

[tool_use: Bash]

### User | 2026-06-12T03:11:35.027Z

[tool_result]   ...
# Subtest: buildBrief omits the STANDING GOAL section when no goal is available (unchanged path)
ok 9 - buildBrief omits the STANDING GOAL section when no goal is available (unchanged path)
  ---
  duration_ms: 0.3191
  ...
# Subtest: buildBrief places STANDING GOAL ABOVE the inferred OBJECTIVE (anti-lost-in-the-middle)
ok 10 - buildBrief places STANDING GOAL ABOVE the inferred OBJECTIVE (an
... [+160 chars truncated]

### User | 2026-06-12T03:12:09.686Z

[tool_result] C:/Users/wompu/.claude/settings.json:PRISM_TOKEN_BUDGET_WARN_DISABLE": "1"
---SESSION_REORIENT wiring---
.claude/settings.json:1
C:/Users/wompu/.claude/settings.json:1
---TOKEN_BUDGET_GATE wiring---
.claude/settings.json:1
C:/Users/wompu/.claude/settings.json:1

### Assistant | 2026-06-12T03:12:12.868Z

10/10 pass confirmed. The knob is wired in C: settings.json (canonical), both hooks wired. Let me verify the live handoff directory format and check the precompact-handoff writer to confirm the `## RESUME` header format and session-id keying match.

### Assistant | 2026-06-12T03:12:15.232Z

[tool_use: Bash]

### Assistant | 2026-06-12T03:12:17.322Z

[tool_use: Bash]

### User | 2026-06-12T03:13:04.451Z

[tool_result] _delta-consolidation-bca3789f.md
archive
consolidated
CONTINUE-CAD.md
HANDOFF-9029a5d7-echo-overnight-summary-2026-05-26.md
HANDOFF-Agent@DESKTOP-N7MI1VB_010910ec-6505-447d-8181-3ed11f186fdb-blackwell-ocr-ensemb.md
HANDOFF-Agent@DESKTOP-N7MI1VB_0aed1993-8b45-4ab1-b450-cc167a5101d1-echo-work.md
HANDOFF-Agent@DESKTOP-N7MI1VB_25882ddb-7548-40c4-89fa-d1fc930292b3-obsidian-hermes-cont.md
---COUNT---
82
... [+159 chars truncated]

### User | 2026-06-12T03:13:44.654Z

[tool_result] === precompact-handoff RESUME header writes ===
.claude/helpers/precompact-handoff.mjs:129:    const resumeMatch = content.match(/## RESUME\n([\s\S]*?)(?=\n##|\n$)/);
.claude/helpers/precompact-handoff.mjs:730: * extractor in /startup (which regex-matches `^## RESUME\n...`).
.claude/helpers/per-agent-handoff.mjs:258:// literal `true`) never lands as "## RESUME\ntrue" in the handoff file.
.claude/h
... [+1250 chars truncated]

### Assistant | 2026-06-12T03:13:47.448Z

The live data confirms two important points. Let me verify the exact RESUME header format written (the writer at line 613/676) and check the session-id format match — a potential P1 around the `## RESUME` header having trailing content.

### Assistant | 2026-06-12T03:13:48.313Z

[tool_use: Read]

### User | 2026-06-12T03:14:28.788Z

[tool_result] 605	    ...frontmatter,
606	    `# HANDOFF: ${identity.instance}`,
607	    `Updated: ${now()}`,
608	    `Family: ${identity.family} | Machine: ${identity.machine} | Session: ${identity.sessionKey}`,
609	    "",
610	    "## STATE",
611	    cleanState,
612	    "",
613	    "## RESUME",
614	    finalResume,
615	    "",
616	    "## CONTEXT",
617	    args.context || "",
618	    "",
619	  ].join("\n");
6
... [+3082 chars truncated]

### Assistant | 2026-06-12T03:14:33.755Z

The writer emits `## RESUME` exactly (followed directly by the body on the next line). Now I've confirmed a critical detail. The writer's own regex is `/## RESUME\n([\s\S]*?)(?=\n##|\n$)/` — it allows ANY `## RESUME` line (the writer always writes a bare `## RESUME`). The hook's `extractResume` uses `/^##\s+RESUME\s*$/` which requires the RESUME header to be on its own line with nothing after it. Let me verify the live files never have trailing content on that header line, and confirm the session-id keying matches between this hook and the handoff filenames.

### Assistant | 2026-06-12T03:14:37.807Z

[tool_use: Bash]

### User | 2026-06-12T03:16:16.362Z

[tool_result] === Any HANDOFF with text after '## RESUME' on same line? (would break hook's anchored regex) ===
8:## RESUME DIRECTIVE
9:## RESUME DIRECTIVE (single most important field)
10:## RESUME directive — read this first
5:## RESUME (next action) — needs FRESH context (TS build)
5:## RESUME DIRECTIVE (next iteration)
(empty above = all RESUME headers are bare, hook regex matches)

=== Sample: does stable-
... [+247 chars truncated]

### Assistant | 2026-06-12T03:16:19.986Z

This is a significant finding. There is a real-world header-format mismatch. Many live handoffs use `## RESUME DIRECTIVE`, `## RESUME (next action)`, `## RESUME directive — read this first`, etc. — NOT the bare `## RESUME` that the hook's anchored regex `/^##\s+RESUME\s*$/` requires. Let me quantify how prevalent this is to assess severity.

### Assistant | 2026-06-12T03:16:23.697Z

[tool_use: Bash]

### User | 2026-06-12T03:18:27.680Z

[tool_result] Total claude handoffs: 825

Files with BARE '## RESUME' (hook matches): 799

Files with ANY '## RESUME*' header: 806

=== Breakdown of RESUME header variants (top 15) ===
    800 ## RESUME
      1 ## RESUME DIRECTIVE (single most important field)
      1 ## RESUME DIRECTIVE (next iteration)
      1 ## RESUME directive — read this first
      1 ## RESUME DIRECTIVE
      1 ## RESUME (read this first
... [+98 chars truncated]

### Assistant | 2026-06-12T03:18:32.966Z

This resolves the severity. 799 of 825 files (96.8%) use the bare `## RESUME` header that the hook matches; only 7 files use a decorated variant that the anchored regex misses. Those 7 fall back to `null` (fail-soft, brief omits the goal section) — no crash. So this is a P2 robustness note, not a P0/P1: the canonical writer (`per-agent-handoff.mjs`) always emits bare `## RESUME`, and the hook is correctly aligned with the canonical writer.

Now let me verify the remaining concerns: the lazy-read / counter-reset logic via a live CLI invocation, and confirm `detectDrift` safety on synthesized empty state. Let me trace the control-flow edge cases by actually running the hook.

### Assistant | 2026-06-12T03:18:36.482Z

[tool_use: Bash]

### User | 2026-06-12T03:19:36.940Z

[tool_result] === T1: empty anchors + real sid + NO handoff present -> should skip brief, reset counter, no crash ===
{"continue":true}

(expect plain {continue:true} — no additionalContext, since no anchors and no handoff for this sid)

### Assistant | 2026-06-12T03:19:41.547Z

The hook ran cleanly (the `rm -rf` was on a freshly-created mktemp dir — safe). The first-prompt case emits plain `{continue:true}` because the counter starts at 1 < interval 15, so no brief fires on prompt 1 regardless. Let me verify the trigger path with a real handoff present and the counter pre-loaded to the threshold, to confirm the goal brief actually fires and that the lazy read only happens on the trigger.

### Assistant | 2026-06-12T03:19:49.178Z

[tool_use: Bash]

### User | 2026-06-12T03:21:37.225Z

[tool_result] === Inject patched dirs via a small driver that imports the helpers (the hook hardcodes prod dirs, so test the helpers directly) ===
readStandingGoal -> "THE-REAL-GOAL: finish the review. Next: commit."
brief has STANDING GOAL: true
brief has real goal text: true
brief leaked CONTEXT noise: false

### Assistant | 2026-06-12T03:21:42.110Z

End-to-end confirmed: extraction stops at `## CONTEXT`, no leak, goal surfaces in the brief. Let me do final verification on two subtle points — (1) the lazy-read claim (that disk is only touched on trigger), and (2) detectDrift safety with the synthesized empty state, plus the state-synthesis cross-chat contamination concern.

### Assistant | 2026-06-12T03:21:47.771Z

[tool_use: Bash]

### User | 2026-06-12T03:22:47.385Z

[tool_result] detectDrift(empty synth): {"drifted":false,"from":[],"to":[]} -> drifted should be false: true
detectDrift(5 active, window20 needed): short-circuit OK
EOF body: "last line no newline"
ws-only -> null: true
oversized capped+marker: true

### Assistant | 2026-06-12T03:23:27.344Z

All edge cases verified live. I have everything I need. Let me compile the review.

## Code Quality Analysis Report

### Summary
- Overall Quality Score: **9/10**
- Files Analyzed: 3 (`session-reorient-inject.mjs`, `token-budget-gate.mjs`, `session-reorient-inject.test.mjs`)
- Issues Found: 3 (0 P0, 0 P1, 3 P2/P3)
- Tests: 10/10 pass (verified live, not just reported)

### Grade: **PASS**

Both changes are correct, fail-soft, well-tested, and align with the operator intent. Every verification claim in the change description holds up against live data. No control-flow regression, no contamination risk, no leaked throw.

---

### Verification against the specific concerns

**Control flow — all paths correct:**
- *Anchors exist (legacy path):* `hasAnchors` true → preserved. `buildBrief` still computes objective/files/decisions/milestones/errors/drift exactly as before; the new STANDING GOAL block is purely additive and gated on `if (standingGoal)` (`session-reorient-inject.mjs:168`). Legacy behavior is byte-identical when `standingGoal` is null.
- *Empty anchors + real sid + handoff present:* now emits a goal brief on the interval. Verified live — `readStandingGoal` returns the real objective and `buildBrief` surfaces it (`:292`, `:303`).
- *Empty anchors + no handoff:* skips the empty brief AND resets `promptsSinceLastBrief`/`toolCallsSinceLastBrief` to 0 (`:296-297`) before saving — so the next disk re-read is deferred a full interval, not per-prompt. Confirmed live: plain `{continue:true}`, no `additionalContext`.

**Lazy handoff read — confirmed truly lazy.** `readStandingGoal` is called only at `:292`, which is reached only after `trigger` is non-null (the `if (!trigger)` early-return at `:284` guards it). On the per-prompt hot path (no trigger), zero handoff disk I/O. The comments at `:246-247` and `:290-291` accurately describe the implemented behavior.

**`detectDrift` with synthesized empty state — safe.** Verified live: `detectDrift({anchors:[],...})` returns
... [+5170 chars truncated]
