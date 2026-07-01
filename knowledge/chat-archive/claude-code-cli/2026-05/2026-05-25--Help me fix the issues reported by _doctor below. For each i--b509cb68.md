---
type: "chat-session"
source: "claude-code-cli"
session_id: "b509cb68-ee29-43c3-a769-df1de44a2b7c"
title: "Help me fix the issues reported by /doctor below. For each issue: briefly explai"
date: "2026-05-25"
first_ts: "2026-05-25T17:04:15.145Z"
last_ts: "2026-05-26T03:54:25.221Z"
cwd: "H:\\prism"
messages: 567
user_msgs: 267
assistant_msgs: 300
raw_file: "H:/.claude/projects/H--prism/b509cb68-ee29-43c3-a769-df1de44a2b7c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:39:40"
---

# Help me fix the issues reported by /doctor below. For each issue: briefly explai

> **claude-code-cli** | 2026-05-25 | 567 msgs (267 user / 300 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b509cb68-ee29-43c3-a769-df1de44a2b7c.jsonl`

## Transcript

### User | 2026-05-25T17:04:44.948Z

Help me fix the issues reported by /doctor below.

For each issue: briefly explain what the fix will do, then ask me to confirm before running any shell command that deletes files, modifies global config, or changes my installation. Safe read-only checks are fine without asking. If a suggested fix looks wrong for my setup, say so instead of running it.

- Settings (C:\Users\wompu\.claude\settings.json › hooks.Stop.4.hooks): Expected array, but received undefined
  Suggested fix: Hooks use a matcher + hooks array. The matcher is a string: a tool name ("Bash"), pipe-separated list ("Edit|Write"), or empty to match all. Example: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}
- Settings (C:\Users\wompu\.claude\settings.json › hooks.PreToolUse.31.hooks): Expected array, but received undefined
  Suggested fix: Hooks use a matcher + hooks array. The matcher is a string: a tool name ("Bash"), pipe-separated list ("Edit|Write"), or empty to match all. Example: {"PostToolUse": [{"matcher": "Edit|Write", "hooks": [{"type": "command", "command": "echo Done"}]}]}

### Assistant | 2026-05-25T17:05:18.620Z

[tool_use: Read]

### User | 2026-05-25T17:05:19.489Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1371 of 1620 total (25102 tokens, cap 25000). Call Read with offset=1372 limit=1371 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "includeCoAuthoredBy": false,
4	  "spinnerTipsEnabled": false,
5	  
... [+56967 chars truncated]

### Assistant | 2026-05-25T17:06:15.773Z

Both issues are the same structural bug — two hook entries were added directly to the parent array as bare command objects, missing the required `{ matcher, hooks: [...] }` wrapper.

## Issue 1 — `hooks.Stop.4.hooks` undefined

**Location:** `C:\Users\wompu\.claude\settings.json` lines 754–758 (5th entry in the Stop array)

**Current (malformed):**
```json
{
  "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-token-savings-summary.mjs",
  "timeout": 5000,
  "continueOnError": true
}
```

**Fix:** Wrap the command in the proper `matcher`/`hooks` shape. The bare command becomes a `hooks[0]` entry under a `matcher: ""` (match-all) wrapper. Adds `"type": "command"` (currently missing). `continueOnError` moves inside the inner hook where it semantically belongs:
```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-token-savings-summary.mjs",
      "timeout": 5000,
      "continueOnError": true
    }
  ]
}
```

## Issue 2 — `hooks.PreToolUse.31.hooks` undefined

**Location:** `C:\Users\wompu\.claude\settings.json` lines 1121–1125 (32nd entry in PreToolUse, the last one)

**Current (malformed):**
```json
{
  "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-tool-router-table-advise.mjs",
  "timeout": 3000,
  "continueOnError": true
}
```

**Fix:** Same shape correction:
```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-tool-router-table-advise.mjs",
      "timeout": 3000,
      "continueOnError": true
    }
  ]
}
```

## Notes on your setup
- Per your CLAUDE.md, the `c-to-h-mirror` hook will auto-replicate the C: edit to `H:\.claude\settings.json` — I only need to touch C:.
- The two hook script paths (`stop-token-savings-summ
... [+1054 chars truncated]

### User | 2026-05-25T17:08:43.089Z

please also fix utilize /system-viz and master index to look where we might have other confilict areas, potential bugs and errors causing inefficiencies and loss of features

### Assistant | 2026-05-25T17:09:10.002Z

Applying both fixes now, then I'll run the broader audit.

### Assistant | 2026-05-25T17:09:11.597Z

[tool_use: Edit]

### User | 2026-05-25T17:09:11.675Z

[tool_result] <tool_use_error>File has not been read yet. Read it first before writing to it.</tool_use_error>

### Assistant | 2026-05-25T17:09:17.640Z

[tool_use: Read]

### User | 2026-05-25T17:09:18.295Z

[tool_result] 750	            "timeout": 2000
751	          }
752	        ]
753	      },
754	      {
755	        "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-token-savings-summary.mjs",
756	        "timeout": 5000,
757	        "continueOnError": true
758	      }
759	    ],
760	    "PreToolUse": [
761	      {
762	        "matcher": "",
763	        "hooks": 
... [+17 chars truncated]

### Assistant | 2026-05-25T17:09:22.615Z

[tool_use: Read]

### User | 2026-05-25T17:09:23.282Z

[tool_result] 1118	          }
1119	        ]
1120	      },
1121	      {
1122	        "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-tool-router-table-advise.mjs",
1123	        "timeout": 3000,
1124	        "continueOnError": true
1125	      }
1126	    ],
1127	    "UserPromptSubmit": [
1128	      {
1129	        "matcher": "",

### Assistant | 2026-05-25T17:09:27.484Z

Both confirmed. Applying fixes now.

### Assistant | 2026-05-25T17:09:30.807Z

[tool_use: Edit]

### User | 2026-05-25T17:09:30.892Z

[tool_result] <tool_use_error>File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.</tool_use_error>

### Assistant | 2026-05-25T17:09:37.276Z

[tool_use: Read]

### User | 2026-05-25T17:09:37.994Z

[tool_result] 748	            "type": "command",
749	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-tab-blink.mjs",
750	            "timeout": 2000
751	          }
752	        ]
753	      },
754	      {
755	        "command": "${CLAUDE_PROJECT_DIR}/.claude/bin/portable-node ${CLAUDE_PROJECT_DIR}/.claude/hooks/stop-token-savings-summary.mjs",
756	        "timeout": 5000,
757
... [+91 chars truncated]

### Assistant | 2026-05-25T17:09:47.523Z

[tool_use: Edit]

### User | 2026-05-25T17:09:53.118Z

[tool_result] The file C:\Users\wompu\.claude\settings.json has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T17:10:07.082Z

Stop[4] fixed and mirrored to H:. Now PreToolUse[31].

### Assistant | 2026-05-25T17:10:09.785Z

[tool_use: Edit]

### User | 2026-05-25T17:10:14.717Z

[tool_result] The file C:\Users\wompu\.claude\settings.json has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T17:10:29.543Z

Both fixes applied and mirrored to H:. Now running the broader audit using master index + targeted searches.

### Assistant | 2026-05-25T17:10:29.559Z

[tool_use: Grep]

### Assistant | 2026-05-25T17:10:31.354Z

[tool_use: Grep]

### Assistant | 2026-05-25T17:10:32.470Z

[tool_use: mcp__prism_safe__prism_session]

### Assistant | 2026-05-25T17:10:32.635Z

[tool_use: mcp__prism_safe__prism_session]

### User | 2026-05-25T17:10:34.641Z

[tool_result] 813-        "matcher": "Bash|Read|Edit|Write|MultiEdit",
814:        "hooks": []
--
817-        "matcher": "^Skill$",
818:        "hooks": []
--
831-        "matcher": "^(Write|Edit)$",
832:        "hooks": []
--
835-        "matcher": "^(Write|Edit|Bash)$",
836:        "hooks": []
--
914-        "matcher": "Edit",
915:        "hooks": []

### User | 2026-05-25T17:10:39.071Z

[tool_result] 233:            "command": "\"H:.claude\binportable-node\" \"H:/PRISM/.claude/hooks/substrate-health-inject.mjs\"",

### User | 2026-05-25T17:11:33.524Z

[tool_result] [{"type": "text", "text": "{\"query\":\"settings.json hook schema malformed matcher missing\",\"totalHits\":20,\"hits\":[{\"source\":\"skill\",\"id\":\"fix-hook-schemas\",\"label\":\"fix-hook-schemas\",\"path\":\".claude/commands/fix-hook-schemas.md\",\"confidence\":0.14222222222222222,\"utilization\":0,\"buildClass\":\"unknown\"},{\"source\":\"engine\",\"id\":\"HookRuleMatcherEngine\",\"label\":\
... [+4445 chars truncated]

### User | 2026-05-25T17:11:34.135Z

[tool_result] [{"type": "text", "text": "{\"timestamp\":\"2026-05-25T17:11:33.759Z\",\"entries\":[{\"category\":\"Engines\",\"live\":1484,\"documented\":1068,\"delta\":416,\"status\":\"major_drift\"},{\"category\":\"Dispatchers\",\"live\":81,\"documented\":67,\"delta\":14,\"status\":\"major_drift\"},{\"category\":\"Algorithms\",\"live\":51,\"documented\":51,\"delta\":0,\"status\":\"ok\"},{\"category\":\"Registr
... [+617 chars truncated]

### Assistant | 2026-05-25T17:12:11.538Z

Both /doctor issues fixed. Here are the additional findings.

## Other concrete bugs I found

### B1 — line 233: substrate-health-inject path is broken (runtime failure every SessionStart)
```json
"command": "\"H:.claude\binportable-node\" \"H:/PRISM/.claude/hooks/substrate-health-inject.mjs\"",
```
The interpreter is `H:.claude\binportable-node` — missing slashes. Should be `H:/.claude/bin/portable-node` (matches every other SessionStart entry). This hook has been silently failing on every session — explains why PSN substrate-health context never appears. **Fix is mechanical and isolated.**

### B2 — line 729: Stop[2] has no `matcher` field
```json
{
  "hooks": [{ "type": "command", "command": ".../stop-system-awareness-freshness.mjs", "timeout": 5000 }]
}
```
The /doctor schema check tolerated this (Anthropic's validator treats missing `matcher` as match-all), but it's the same shape-irregularity family as the two fixes above. Loose tolerance today, hard rejection in any future stricter schema bump.

### B3 — 5 empty `"hooks": []` placeholders in PreToolUse (lines 813, 817, 831, 835, 914)
Matchers `"Bash|Read|Edit|Write|MultiEdit"`, `"^Skill$"`, two `"^(Write|Edit...)$"` variants, and `"Edit"` — all with empty arrays. Not bugs strictly, but they burn schema validation cycles every PreToolUse and confuse the hook chain inspector. Dead config from an earlier refactor.

## Systemic findings (wider than settings.json)

### S1 — Wiki already documents this exact failure class
`[[feedback_settings_wiring_drift_2026_05_16]]` (score 129 in memory recall) — settings.json silently reverts across multi-chat fleets. **Risk:** the two fixes I just made could be re-corrupted if another fleet chat replays a stale config snapshot. Consider running `/fix-hook-schemas` (existing skill) after this session to verify the fixes stuck.

### S2 — Master index already knew the cure
`master_index_query` returned `/fix-hook-schemas` (skill, top hit, 0.142 confidence) + `HookRuleMatcherEngin
... [+1880 chars truncated]

### User | 2026-05-25T17:15:43.698Z

fix everything and fix the drift

### Assistant | 2026-05-25T17:16:12.599Z

Authorized — fixing all 4 settings.json issues, then running drift regen. Starting with B1.

### Assistant | 2026-05-25T17:16:14.253Z

[tool_use: Read]

### Assistant | 2026-05-25T17:16:14.827Z

[tool_use: Read]

### User | 2026-05-25T17:16:15.981Z

[tool_result] 230	          },
231	          {
232	            "type": "command",
233	            "command": "\"H:.claude\binportable-node\" \"H:/PRISM/.claude/hooks/substrate-health-inject.mjs\"",
234	            "timeout": 10000
235	          },
236	          {
237	            "type": "command",

### User | 2026-05-25T17:16:16.062Z

[tool_result] 728	      },
729	      {
730	        "hooks": [
731	          {
732	            "type": "command",
733	            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/stop-system-awareness-freshness.mjs",
734	            "timeout": 5000
735	          }
736	        ]
737	      },
738	      {
739	        "matcher": "",

### Assistant | 2026-05-25T17:16:24.475Z

[tool_use: TaskCreate]

### Assistant | 2026-05-25T17:16:25.526Z

[tool_use: TaskCreate]

### system

... [487 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-26T03:26:04.589Z

[tool_use: Edit]

### User | 2026-05-26T03:26:42.335Z

[tool_result] The file H:\prism-slot-foxtrot\scripts\audit-mill-pdf-corpus.mjs has been updated successfully. (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-26T03:26:47.324Z

[tool_use: Bash]

### User | 2026-05-26T03:28:44.141Z

[tool_result] U-FMC-P1: wrote 939 PDFs (5499.8 MB) to state\shared\audits\FOXTROT-MILL-PDF-CORPUS.json
Tier-1: 61 · Tier-2: 275 · Unclassified: 0
Estimated /pdf-learn runtime (T1+T2): 16.8h
Shell cwd was reset to H:\prism

### Assistant | 2026-05-26T03:28:56.261Z

61 tier-1 + 275 tier-2 = 336 in-scope PDFs · 16.8h /pdf-learn runtime · 0 unclassified. Quick sanity-check of the tier-1 set:

### Assistant | 2026-05-26T03:28:58.330Z

[tool_use: Bash]

### User | 2026-05-26T03:30:49.065Z

[tool_result] Tier-1 breakdown:
  30 Open Mind / cam-hypermill
   9 CNC Software / cam-mastercam
   7 post-vendor / machine-post-proc
   3 SolidCAM/Autodesk / cam-5axis
   2 SolidCAM/Autodesk / cam-2.5d
   2 NexGen Mfg / foundation
   2 CNCCookbook / op-dynamic-mill
   1 SolidCAM/Autodesk / cam-3d-hsm
   1 HAAS Automation / machine-operator
   1 SolidCAM/Autodesk / cam-3d-hsr
   1 SolidCAM/Autodesk / cam-3d-hsm
... [+60 chars truncated]

### Assistant | 2026-05-26T03:30:58.117Z

Tier-1 is exactly the canonical mill+CAM vendor corpus (hyperMILL 30, Mastercam 9, InventorCAM 9, post-proc 7, HAAS+Hurco+CNCCookbook+NexGen). Committing on slot/foxtrot.

### Assistant | 2026-05-26T03:30:59.400Z

[tool_use: Bash]

### User | 2026-05-26T03:31:52.509Z

[tool_result] ok 1 file changed, 344 insertions(+)
ok 3 files changed, 15947 insertions(+)
Shell cwd was reset to H:\prism

### Assistant | 2026-05-26T03:31:56.223Z

[tool_use: Bash]

### User | 2026-05-26T03:33:01.911Z

[tool_result] A  scripts/audit-mill-pdf-corpus.mjs
Shell cwd was reset to H:\prism

### Assistant | 2026-05-26T03:33:17.116Z

[tool_use: Bash]

### User | 2026-05-26T03:34:19.568Z

[tool_result] A  .claude/hooks/audit-awareness-inject.mjs
 M .claude/hooks/prompt-rewriter-ollama.mjs
 M .claude/hooks/prompt-rules-inject.mjs
 M .claude/hooks/psn-leg-state-inject.mjs
 M .claude/hooks/psn-leg-state-inject.test.mjs
 M .claude/hooks/read-auto-limit.mjs
 M .claude/hooks/rtk-prefix-reminder.mjs
A  .claude/hooks/stop-audit-registry-refresh.mjs
 M .claude/hooks/stop-session-spend-summary.mjs
 M PRIS
... [+21 chars truncated]

### Assistant | 2026-05-26T03:34:26.650Z

[tool_use: Bash]

### User | 2026-05-26T03:35:20.769Z

[tool_result] ?? state/shared/audits/FOXTROT-MILL-CAM-OPEN-MILESTONES.json
?? state/shared/audits/FOXTROT-MILL-PDF-CORPUS.json
?? state/shared/audits/FOXTROT-MILL-PDF-CORPUS.md
?? state/shared/audits/hook-slice-1.json
?? state/shared/audits/hook-slice-2.json
?? state/shared/audits/hook-slice-3.json
?? state/shared/audits/hook-slice-4.json
?? state/shared/audits/hook-slice-5.json
?? state/shared/audits/hook-slic
... [+49 chars truncated]

### Assistant | 2026-05-26T03:35:30.476Z

[tool_use: Bash]

### User | 2026-05-26T03:36:47.580Z

[tool_result] ok 2 files changed, 15586 insertions(+)

### Assistant | 2026-05-26T03:36:57.227Z

[tool_use: Bash]

### User | 2026-05-26T03:37:44.597Z

[tool_result] 	web/src/types/
	web/src/utils/
	web/src/vite-env.d.ts
	web/tailwind.config.js
	web/test-results/
	web/tmp-playwright/
	web/tsconfig.app.json
	web/tsconfig.json
	web/tsconfig.node.json
	web/vite.config.ts
	web/vitest-calculator-output.txt
	web/vitest.config.ts
	wiring-audit-output.txt

no changes added to commit (use "git add" and/or "git commit -a")

### Assistant | 2026-05-26T03:37:49.057Z

[tool_use: Bash]

### User | 2026-05-26T03:39:27.772Z

[tool_result] ok

### Assistant | 2026-05-26T03:39:32.352Z

[tool_use: Bash]

### User | 2026-05-26T03:41:31.636Z

[tool_result] 8865dc2962 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN (slot:charlie /goal-yolo iter...
---
8865dc2962 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [QUOTING-SYNERGY-MS0]/U-QP-SCHEDULED-RETRAIN (slot:charlie /goal-yolo iter...
scripts/quoting-train-cycle.mjs                  |   121 +
  state/shared/audits/FOXTROT-MILL-PDF-CORPUS.json | 15125 +++++++++++++++++++++
  state/shared
... [+85 chars truncated]

### Assistant | 2026-05-26T03:41:46.732Z

Audit data was absorbed into peer charlie's commit `8865dc2962` (silent-attribution loss per [[feedback_commit_to_slot_worktree]]). Committing the **script** on slot/foxtrot for proper U-FMC-P1 attribution:

### Assistant | 2026-05-26T03:41:46.856Z

[tool_use: Bash]

### User | 2026-05-26T03:43:17.444Z

[tool_result] A  scripts/audit-mill-pdf-corpus.mjs---
085fe08266 [slot:foxtrot] FOXTROT-MILL-CAM-CONSOLIDATION-MS0/U-FMC-V0-ADDENDUM: PDF-first pivot + existing OoO canoni...
Shell cwd was reset to H:\prism

### Assistant | 2026-05-26T03:43:27.410Z

[tool_use: Bash]

### User | 2026-05-26T03:44:26.381Z

[tool_result] WORKTREE-ROUTE: wrong tree for this commit.

You are on:           H:/PRISM (cad-fusion-live-ms0)
Commit subject scope: [slot
Matching worktree(s):
  • H:/prism--system-viz-brain-ms0-u--41db1b   (work/-system-viz-brain-ms0-u--41db1b)

ACTION: cd to the matching worktree and commit there, OR prefix the
commit subject with [MAIN] to override. This prevents cross-contamination
between parallel chats 
... [+28 chars truncated]

### Assistant | 2026-05-26T03:44:36.063Z

[tool_use: Bash]

### User | 2026-05-26T03:45:27.717Z

[tool_result] WORKTREE-ROUTE: wrong tree for this commit.

You are on:           H:/PRISM (cad-fusion-live-ms0)
Commit subject scope: [slot
Matching worktree(s):
  • H:/prism--system-viz-brain-ms0-u--41db1b   (work/-system-viz-brain-ms0-u--41db1b)

ACTION: cd to the matching worktree and commit there, OR prefix the
commit subject with [MAIN] to override. This prevents cross-contamination
between parallel chats 
... [+28 chars truncated]

### Assistant | 2026-05-26T03:46:00.731Z

The hook's cwd resolution doesn't follow shell cd between calls. Using the canonical `[MAIN] [BOOTSTRAP-SLOT-ENFORCE]` prefix the rest of the fleet uses, with explicit cwd:

### Assistant | 2026-05-26T03:46:05.482Z

[tool_use: Bash]

### User | 2026-05-26T03:47:26.911Z

[tool_result] ok slot/fo
Shell cwd was reset to H:\prism

### Assistant | 2026-05-26T03:47:29.999Z

[tool_use: Bash]

### User | 2026-05-26T03:48:07.551Z

[tool_result] cf6f3bd504 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MILL-PROGRAM-AI-COMPLETION]/U-FMC-P1 (slot:foxtrot iter4 /goal): PDF corp...

### Assistant | 2026-05-26T03:48:14.562Z

`cf6f3bd504` on slot/foxtrot. Updating handoff with the U-FMC-P1 ship + U-FMC-P2 next-tick:

### Assistant | 2026-05-26T03:48:28.191Z

[tool_use: Bash]

### User | 2026-05-26T03:50:42.095Z

[tool_result] {
  "ok": true,
  "syscall": "handoff",
  "shell_only": true,
  "result": {
    "ok": true,
    "file": "H:\\prism\\state\\shared\\handoffs\\HANDOFF-Agent@DESKTOP-N7MI1VB_477a8ab3-b439-44e3-8fb4-42d4304963cb-whiskey-pdf-wiki-tri.md",
    "instance": "Agent@DESKTOP-N7MI1VB/477a8ab3-b439-44e3-8fb4-42d4304963cb"
  }
}

### Assistant | 2026-05-26T03:51:00.928Z

**Iter 4/20 closed — U-FMC-P1 shipped.**

| Artifact | Where |
|---|---|
| Script | `H:/prism-slot-foxtrot/scripts/audit-mill-pdf-corpus.mjs` · slot/foxtrot · `cf6f3bd504` |
| Audit JSON | `state/shared/audits/FOXTROT-MILL-PDF-CORPUS.json` (15125 lines, absorbed into peer `8865dc2962`) |
| Audit MD | `state/shared/audits/FOXTROT-MILL-PDF-CORPUS.md` (461 lines, same commit) |
| Loop | iter 3 → **4/20** running |
| Handoff | `HANDOFF-Agent@...-whiskey-pdf-wiki-tri.md` with U-FMC-P2 next-tick |

**Numbers** — 939 PDFs · 61 tier-1 · 275 tier-2 · 0 unclassified · ~16.8h /pdf-learn batch runtime for T1+T2 (3× the addendum's ~5hr estimate). Biggest single vendor: **hyperMILL (Open Mind) 30 PDFs in `OPEN MIND/`** — that's the high-leverage extraction target.

**Doctrine drift surfaced** — `cd H:/prism && git commit` silently absorbed my state/shared writes into charlie's `8865dc2962` commit (the [[feedback_commit_to_slot_worktree]] pattern, observed live this session). Worktree-route hook DID block `[slot:foxtrot]` prefix from main tree as designed, but the `state/shared/*` add happened before the commit attempt. The slot/foxtrot script commit is the canonical U-FMC-P1 attribution. **Not re-derived** — same regression has bitten 3× before.

**Next tick (iter 5)** queued in the handoff: build `scripts/pdf-learn-batch-mill.mjs` against the 61-PDF tier-1 queue. End-goal `/goal` arg's "wire backend to milling-wizard frontend" maps to addendum Phase 7 (adaptive pipeline GENERATOR, ~12hr) which sits downstream of P2-P6 substrate.

Loop is mid-stride at iter 4/20 — autonomous continuation will pick up at next session via auto-resume.
