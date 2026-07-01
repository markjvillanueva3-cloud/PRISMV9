# mill session eca6e8bb (2026-05-22, 25MB, spine 131KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `c845cb3551`: delete stale AutoWiringEngine.js/QualityScoreEngine.js/QualityDashboardEngine.js (esbuild hijack).  
- `eb3e5db897`: fix G1 – use pid instead of terminalWindowId.  
- `3042551203`: add title‑based HWND resolver (`resolve-hwnd-by-title.mjs`) for G1b; harden sweep + lockfile.  
- `e6a6e015eb`: per‑slot cooldown (15 min), single‑instance lockfile, extend `planSlotAction` with `hasUncommittedCriticalWork`, `hasHandoff`; integrate awareness weights (`slotQueueLength`).  
- `77c2561281`: G10+G12 launcher (`zebra-launch.ps1`); installer UTF‑8 fix; register scheduled task; set `zebraOptIn=true` for slot *alpha*.  
- `3ae6e458d5`: U‑ZO‑MS0‑01 – CLAUDE‑BRIEF + BUILD‑VISION reader, mtime cache, 30/30 test pass.  
- Settings edit: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` from `"80"` → `"95"`.  
- Spec commit: `state/shared/specs/ZEBRA‑OMNISCIENT‑MS0‑PLAN.md` (350 L, 30 surfaces).  
- `state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md`: roadmap with gaps fixed.

**DECISIONS**  
- Adopt title‑based HWND resolver to avoid PID drift (G1b).  
- Enforce single‑instance sweep lockfile; per‑slot cooldown helper (`DEFAULT_ACTION_COOLDOWN_MS` = 15 min) to prevent overlapping `/compact`.  
- Extend `planSlotAction` with `hasUncommittedCriticalWork`, `hasHandoff`; integrate awareness weights.  
- Increase `DEFAULT_COMPACT_WAIT_MS` to 90 s for large chats (G3).  
- Wire orphaned `zebra‑advisory‑inject.mjs` into `UserPromptSubmit`; keep zebra in safe‑off until operator opts in.  
- Commit strategy: pathspec commits with wait‑for‑lock due to shared index contention.

**OPERATOR DIRECTIVES**  
- Run `/compact` (pre‑compact guard active).  
- Register “PRISM Zebra Orchestrator” task via `zebra-launch.ps1 -RunNow` or `install-zebra-orchestrator-task.ps1`.  
- Wire `zebra‑advisory‑inject.mjs` into all relevant `settings.json`; set `zebraOptIn:true` for at least slot *alpha* after 24 h burn‑in.  
- Commit deep‑research deliverable (`state/shared/specs/HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`) and wiki entry (`knowledge/wiki/architecture/zebra-hermes-gap-audit-campaign.md`).  
- Append regression entries to `CLAUDE.md`.

**FINDINGS / BUGS**  
- G1 fatal: `pickActionableSlots` used `terminalWindowId`; fixed.  
- G1b unsound PID→HWND; switched to title lookup.  
- G3 compact wait too short; increased to 90 s.  
- G8 missing per‑slot cooldown; added 15 min helper.  
- G11 orphaned `zebra‑advisory‑inject.mjs` not wired.  
- G13 awareness weights trained but unused; integrated into decision flow.  
- Stale `.js` artifacts hijacked esbuild imports; removed.  
- Git lockfile contention on shared index; switched to native PowerShell git with wait‑for‑lock.  
- Installer script had em‑dash mojibake; fixed to ASCII.  
- JSON round‑trip of `chat-slots.json` required atomic swap (`File.Replace`).  
- Bash Cygwin fork failure under memory pressure; avoided by using PowerShell for git ops.  
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` set to 80 caused premature autocompact; corrected to 95.

**DOMAIN SPECIFICS**  
- Engines: AutoWiringEngine, QualityScoreEngine, QualityDashboardEngine, zebra‑orchestrator-lib.mjs, resolve-hwnd-by-title.mjs, planSlotAction.  
- Helpers: chat-slots.mjs, per-agent-handoff.mjs, precompact-pending-guard.mjs, milestone-tracker.mjs, stable-session-id.mjs.  
- Loop state files: loop-state.mjs, chat-slots.json.  
- Pipelines: ZEBRA‑ORCHESTRATOR‑MS0, HERMES‑MS0/MS1, ZEBRA‑AWARENESS‑MS0.  
- Scheduler task: “PRISM Zebra Orchestrator”.  
- Metrics: `DEFAULT_COMPACT_WAIT_MS` = 90 s; `DEFAULT_ACTION_COOLDOWN_MS` = 15 min.  
- Paths: `H:/prism/.claude/helpers/*`; `state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md`; `state/shared/specs/ZEBRA‑OMNISCIENT‑MS0‑PLAN.md`.

**TOOLS USED**  
- PRISM CLI wrappers: `/checkin-bravo`, `/startup-bravo`.  
- Node scripts: chat-slots.mjs, per-agent-handoff.mjs, stable-session-id.mjs, precompact-pending-guard.mjs, milestone-tracker.mjs, zebra-orchestrator-sweep.mjs.  
- PowerShell scripts: zebra-launch.ps1, install-zebra-orchestrator-task.ps1.  
- Build tools: esbuild, TS‑NodeNext, vitest.  
- PowerShell utilities: Get-Process, schtasks, native git.

**OPEN THREADS**  
- G2/G9: finalize sweep logic (git state, handoff checks).  
- G5/G6: shipDraft staging default, keyword-overlap dedup.  
- G10/G12: register scheduled task; opt‑in additional slots (*alpha*, *bravo*, *charlie*).  
- G13: wire awareness weights into decision flow.  
- Deep research deliverable & wiki entry pending commit.  
- Final CLAUDE.md regression log updates.  
- MS0 remaining units: U‑ZO‑MS0‑02, ‑03, ‑04, ‑05 (roadmap, slot‑souls, loop‑state, token‑awareness readers).  
- MS1 action‑ADT operator‑gated; MS2 goal‑aware planner not yet implemented.  
- Need to run `/compact` and resume loop to complete G13 commit, deliverables, and subsequent tasks.
