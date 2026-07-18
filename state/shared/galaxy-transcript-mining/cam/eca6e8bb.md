# cam session eca6e8bb (2026-05-22, 25MB, spine 131KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED (builds/commits)**  
- `c845cb3551` – delete stale engines (`AutoWiringEngine.js`, `QualityScoreEngine.js`, `QualityDashboardEngine.js`).  
- `3042551203` – G1b title‑based HWND resolver + PID field fix.  
- `e6a6e015eb` – G2/G3/G9 sweep hardening, lockfile guard, per‑slot cooldown.  
- `1028347770` – G13 awareness weights wired into decisions.  
- `1251946c53` – HERMES‑OBSIDIAN‑OS‑RESEARCH‑2026‑05‑20.md deliverable.  
- `4fac984675` – G5/G6, G4, G10, G12: shipDraft staging, keyword overlap dedup, spec flips, operator action surface.  
- `77c2561281` – G10+G12 launcher (`zebra-launch.ps1`) + installer UTF‑8 fix.  
- `3ae6e458d5` – U‑ZO‑MS0‑01 zebra-context-bundle.mjs + tests (30/30 PASS).  
- `state/shared/specs/ZEBRA‑OMNISCIENT‑MS0‑PLAN.md/.html` – 350 L, 30 surfaces.  
- Wiki close‑out: `knowledge/wiki/.../zebra-hermes-gap-audit-campaign.md`.  
- `state/shared/RECENT‑SHIPMENTS‑2026‑05‑21.md` – regressions inbox.

**DECISIONS (architecture/scope + why)**  
- Adopt title‑based HWND resolver to avoid PID→HWND errors.  
- Introduce single‑instance sweep lockfile; prevent overlapping `/compact`.  
- Add per‑slot cooldown (`DEFAULT_ACTION_COOLDOWN_MS = 15 min`).  
- Increase compact wait (`DEFAULT_COMPACT_WAIT_MS = 90 s`) from 5 s.  
- Shift awareness integration into `planSlotAction` via `slotQueueLength` (G13).  
- Wire `zebra-advisory-inject.mjs` into UserPromptSubmit; default OFF until opt‑in.  
- Keep `zebraOptIn = false` by default; require operator registration of scheduled task for 24 h dry‑run before live actuation.  
- Commit format: `[SCOPE]/U-ID: title`, `[MAIN]` prefix on shared tree; no physics constants or stub engines.

**OPERATOR DIRECTIVES (verbatim asks)**  
- Run `/compact` with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`.  
- Execute `zebra-launch.ps1 –RunNow` (burn‑in mode).  
- After 24 h, run `zebra-launch.ps1 -Live -Slots alpha,bravo,charlie`.  
- Edit `state/shared/chat-slots.json`: set `"zebraOptIn": true` for desired slots.  
- Continue filling gaps: prioritize G13 and operator actions (register scheduled task, opt‑in).  
- Ensure all hooks wired; spec `ZEBRA-HERMES-GAP-AUDIT‑2026‑05‑20.md` reflects status.  
- Commit wiki entry `zebra-hermes-gap-audit-campaign.md` and update CLAUDE.md “Recent regressions”.

**FINDINGS/BUGS**  
- Stale compiled artifacts caused esbuild hijack; removed engines (`c845cb3551`).  
- GAP#1 pidNum bug: `Number(entry.pid)` vs `terminalWindowId` – fixed.  
- `pickActionableSlots` used `terminalWindowId` as PID → NaN → zero actionable slots – resolved.  
- PID→HWND resolution unsound; replaced by title‑based resolver.  
- `/compact` wait too short (5 s); increased to 90 s (`DEFAULT_COMPACT_WAIT_MS`).  
- No per‑slot cooldown; added `DEFAULT_ACTION_COOLDOWN_MS = 15 min`.  
- `shipDraft` shipped stub templates – corrected to real skills.  
- `planSlotAction` hard‑coded `hasUncommittedCriticalWork=true`; now queries git state.  
- Gate conflict check ineffective (`signature.includes(skillName)`); improved logic.  
- Awareness weights trained but never applied to decisions (G13) – wired in.  
- Scheduled task not registered; advisory hook not wired until now.  
- Zero slots opted in (`zebraOptIn = false`).  
- Precompact auto‑trigger override set from 80 % → 95 % to sync CLI autocompact with token budget.  
- Installer script UTF‑8 mojibake fixed to ASCII.  
- Git index contention and Bash Cygwin fork failures; switched to native PowerShell git.

**DOMAIN SPECIFICS**  
- **ZEBRA orchestrator**: external SendKeys actuator, `/compact` + `/checkin`, per‑slot action logic.  
- **Hermes agent**: closed learning loop (observe → cluster → emit → gate → ship), skill‑candidate observation.  
- **Chat‑slots.json schema**: `pid` numeric, `terminalWindowId` string (`tw-wt-<uuid>`).  
- **Title‑based HWND resolver**: visibility filtering, truncation guard.  
- **Per‑slot cooldown**: `DEFAULT_ACTION_COOLDOWN_MS`.  
- **Compact wait**: `DEFAULT_COMPACT_WAIT_MS = 90 s`.  
- **Awareness pipeline**: `zebra-awareness-index.json`, queueLength fingerprint, NN weights.  
- **Engines**: AutoWiringEngine (deleted), QualityScoreEngine (deleted), QualityDashboardEngine (deleted).  
- **Actions/dispatchers**: `zebra-orchestrator-lib.mjs` (`DEFAULT_ACTION_COOLDOWN_MS`, `slotInCooldown`), `zebra-orchestrator-sweep.mjs` (`resolveHwndByTitle`, `compactWaitMs`, lockfile).  
- **Metrics**: slotQueueLength, awareness fingerprint, git dirty flag, handoff freshness.  
- **Paths**: `chat-slots.json` schema (pid, terminalWindowId); `state/shared/chat-slots.lock`.

**TOOLS USED**  
- PRISM helpers: `chat-slots.mjs`, `slot-bind-enforce.mjs`, `per-agent-handoff.mjs`, `stable-session-id.mjs`, `precompact-pending-guard.mjs`, `install-zebra-orchestrator-task.ps1`, `zebra-launch.ps1`.  
- Commands: `/startup`, `/checkin`, `/compact`.  
- Scripts: `precompact-pending-guard.mjs`, `per-agent-handoff.mjs`, `milestone-tracker.mjs`.  
- Libraries/Modules: `zebra-orchestrator-lib.mjs`, `zebra-orchestrator-sweep.mjs`, `resolve-hwnd-by-title.mjs`, `slot-soul-inject.mjs`, `skill-candidate-observe.mjs`, `zebra-advisory-inject.mjs`.  
- Build/test tools: esbuild, TS‑NodeNext, vitest.  
- Git: native PowerShell.

**OPEN THREADS (what remains to build)**  
- Register PRISM Zebra Orchestrator scheduled task (`install-zebra-orchestrator-task.ps1`).  
- Wire `zebra-advisory-inject` into all relevant `settings.json`; verify.  
- Set `"zebraOptIn": true` for at least one slot to enable live actuation.  
- Commit gap‑audit spec `ZEBRA-HERMES-GAP-AUDIT‑2026‑05‑20.md` with rows marked **FIXED**.  
- Add wiki entry `zebra-hermes-gap-audit-campaign.md` and update CLAUDE.md “Recent regressions”.  
- Finalize operator actions: scheduled task (G10) and opt‑in slots (G12) after burn‑in.  
- Complete MS0 units U‑ZO‑MS0‑02..06 (ROADMAP‑CONSOLIDATED reader, slot‑souls list, loop‑state reader, TOKEN‑AWARENESS zone reader).  
- Implement MS1 action‑ADT (`suggest-pick`, `handoff`, etc.) – operator‑gated.  
- Integrate MS2 goal‑aware planner with all surfaces.  
- Close‑out artifacts: memory pointer, CLAUDE.md regressions entry, final wiki pages.
