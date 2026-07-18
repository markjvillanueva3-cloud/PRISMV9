# ZEBRA-as-Hermes / chat-orchestrator — gap audit & fill campaign

**Date:** 2026-05-20 · **Slot:** bravo (`claude-eca6e8bb`) · **Goal:** fill all zebra/Hermes
capability gaps + deep-research Hermes/Obsidian-as-OS; completed & wired.

This spec is the durable source of truth for the gap-fill campaign. Status flips
here as each gap closes. Advisory; every fix is independently committed.

## Scope reviewed

- **Orchestrator (ZEBRA-ORCHESTRATOR-MS0, 7/7):** `scripts/lib/zebra-orchestrator-lib.mjs`,
  `scripts/zebra-orchestrator-sweep.mjs`, `scripts/lib/zebra-drift-detect.mjs`,
  `scripts/lib/resolve-hwnd.mjs`, `scripts/lib/zebra-bd-priority.mjs`,
  `.claude/helpers/install-zebra-orchestrator-task.ps1`, `.claude/hooks/zebra-advisory-inject.mjs`.
- **Hermes (HERMES-MS0/MS1):** `scripts/lib/skill-loop-pipeline.mjs`,
  `scripts/skill-loop-run.mjs`, `scripts/lib/skill-candidate-detect.mjs`,
  `.claude/hooks/skill-candidate-observe.mjs`, `.claude/hooks/slot-soul-inject.mjs`.
- **Awareness (ZEBRA-AWARENESS-MS0):** `scripts/lib/zebra-awareness-pipeline.mjs`,
  `scripts/lib/zebra-awareness-consumer.mjs`, `scripts/zebra-awareness-run.mjs`.

## Gap register

| ID | Sev | Type | Status | Gap |
|----|-----|------|--------|-----|
| G1 | P0 | Functional (fatal) | ✅ FIXED `eb3e5db897` | `pickActionableSlots` read `Number(entry.terminalWindowId)` as PID — real schema has `terminalWindowId` = `"tw-wt-<uuid>"` string + numeric `entry.pid`. NaN → every slot dropped. Fixed to `entry.pid` + regression-guard test. |
| G1b | P0 | Functional (fatal) | ✅ FIXED `U-ZEBRA-GAP1B` | PID→HWND resolution was unsound — chat-slots `pid` is ephemeral; `Get-Process` → process-not-found. New `scripts/lib/resolve-hwnd-by-title.mjs` resolves the HWND by **window title**: Win32 `EnumWindows` lists every captioned top-level window, then matches caption→slot `topic` (PRISM stamps each window caption via `rename-window-intercept`→`set-window-title`). Exact tier + unique-`contains` fallback tier (decoration-tolerant); ambiguous/no-match → fail-loud skip — the orchestrator never guesses a window, so `/compact` can never mis-route. Sweep rewired to `resolveHwndByTitle(pick.entry.topic)`; `resolve-hwnd.mjs` retained for other consumers. 33 tests; 2-agent scrutiny PASS. **Operator caveat:** correct only if the fleet runs one window per chat (not WT tabs) — documented in the resolver header. |
| G2 | P2 | Functional (degraded) | ✅ FIXED `U-ZEBRA-GAP2-3-9` | `planSlotAction` no longer hard-codes `hasUncommittedCriticalWork: true` — it accepts the value via opts (`!== false`, so the conservative default is preserved when omitted). The sweep computes the real signal via `readGitDirty()` (`git status --porcelain`, fail-soft to `true`). Honest caveat in the code: on the shared tree (always thousands dirty) the signal saturates to `true`; the real value only materializes per clean slot-worktree. The advisory hook keeps its conservative default (documented tradeoff). |
| G3 | P1 | Performance/race | ✅ FIXED `U-ZEBRA-GAP2-3-9` | New pure `staggerAfterLine(line, opts)` in the lib: a `/compact` line gets a long `DEFAULT_COMPACT_WAIT_MS` (90 s) window before the follow-up `/checkin`; `/clear` + other lines keep the normal stagger. `sendLines` wired to it (keyed on the line just sent). Chosen the generous-flat-wait option over title-polling — waiting too long only delays, too short corrupts. **Scrutiny follow-up P1:** a single-instance lockfile guard (`acquireSweepLock`/`releaseSweepLock`, stale-steal) was added — a sweep that overruns the 5-min schedule can no longer be raced by the next scheduled run (two processes typing concurrently). Knob `PRISM_ZEBRA_COMPACT_WAIT_MS`. |
| G4 | P2 | Functional (by-design) | ✅ DOCS-COMPLETE `U-ZEBRA-GAP4` | Operator-gated loop is the **design**, not a bug. See `HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` §6 "Why operator-gated loops are the design" — three reasons (safety surface, multi-tenant convergence, doctrine override) make the gate the correct shape for PRISM. With G5 (staged-spec destination) + G6 (real keyword dedup) shipped, the gate scales with library size. |
| G5 | P1 | Functional | ✅ FIXED `U-ZEBRA-GAP5` | `shipDraft` default destination flipped to `state/shared/specs/SKILL-CANDIDATE-AUTOPASS-<id>.md` (a staging marker — NOT a live `.claude/commands/` slot). The orchestrator (`scripts/skill-loop-run.mjs`) drops `commandsDir: COMMANDS_DIR` from the call and uses the new `stagingDir: SPECS_DIR` opt. New `ctx.stagingDir` precedes legacy `ctx.commandsDir` (still honored for opt-in callers). `buildStubBody` gains an explicit `## Operator promote instructions` section pointing at `/forge-triple` for real authoring. Hermes still *proposes* (AUTO-PASS marks ready-to-promote); the operator *authors* the real body before it lands as a live skill. 3 new tests pin the default + override paths. |
| G6 | P2 | Functional (degraded) | ✅ FIXED `U-ZEBRA-GAP6` | `gateCandidate` conflict-check now supports `Map<name, Set<keyword>>` shape (built by the orchestrator from existing skill frontmatter). Computes Jaccard-overlap between candidate-derived keywords (`extractCandidateKeywords` — dominantKind + observed kinds + slot domains, with stopwords filtered) and each existing skill's keywords; overlap ≥ `KEYWORD_OVERLAP_THRESHOLD` (default 0.4) → `AUTO-FAIL: conflict:keyword-overlap=<jaccard>:<name>`. Legacy `Set<string>` shape preserved for back-compat. New exports: `tokenizeKeywords` / `extractCandidateKeywords` / `jaccardSimilarity` / `parseSkillFrontmatter`. 9 new tests pin the keyword-overlap path + helper edge cases. |
| G8 | P2 | Performance | ✅ FIXED `<gap8>` | Per-slot action cooldown shipped — pure `slotInCooldown` + `DEFAULT_ACTION_COOLDOWN_MS` (15 min) in the lib; sweep reads the log tail once per pass and skips slots inside their post-action window. Only a successful EXECUTE starts a cooldown. Knob `PRISM_ZEBRA_COOLDOWN_MS`. 44/44 tests. |
| G9 | P2 | Functional (degraded) | ✅ FIXED `U-ZEBRA-GAP2-3-9` | Sweep replaced hard-coded `hasHandoff: false` with `readHandoffFresh(slot)` — scans `state/shared/handoffs/` for a `HANDOFF-*-<slot>-*.md` whose mtime is within the freshness window (knob `PRISM_ZEBRA_HANDOFF_FRESH_HRS`, default 6 h). Fail-soft to `false`; the slot is regex-validated (`^[a-z]+$`) before interpolation. A false-positive only biases to `/compact` (the safe direction). |
| G10 | P1 | Functional (operator) | 🔵 OPERATOR-ACTION | `PRISM Zebra Orchestrator` scheduled task **not registered** — the actuator never runs. G1b unblock landed → safe to register now. Operator-elevated: `powershell -NoProfile -ExecutionPolicy Bypass -File .claude/helpers/install-zebra-orchestrator-task.ps1 -DryRun -RunNow`; re-run without `-DryRun` once the dry-run is clean. Documented in `HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` §8. |
| G11 | P1 | Functional | ✅ FIXED | `zebra-advisory-inject.mjs` was orphaned (built+tested, never wired). Now wired into UserPromptSubmit after `slot-soul-inject` (settings.json, mirrored C:→H:). The safe advisory-only path is live. |
| G12 | P2 | Functional (operator) | 🔵 OPERATOR-ACTION | Zero slots have `zebraOptIn` — orchestrator inert by safe default. G1b + G10 unblock this. Operator policy: edit `chat-slots.json` `slots[<name>].zebraOptIn=true` for each slot the orchestrator should actuate. Default OFF is correct safe-by-default. Documented in `HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md` §8. |
| G13 | P1 | Functional (vs directive) | ✅ FIXED `U-ZEBRA-GAP13` | ZEBRA-AWARENESS now feeds the decision, not just the log. The sweep lifts `awarenessLookupSlot(pick.slot)` above `planSlotAction` and passes `slotQueueLength: fp?.queueLength` into the decider; the lib folds it into `chatState.hasUnresolvedHandoff` (`hasHandoff === true || ((Number(slotQueueLength) || 0) > 0)`). A slot with queued tribal/Hermes work biases the decider AWAY from `/clear` even when no handoff file exists. Backward-compatible: `slotQueueLength` omitted → original boolean-handoff path. 3 capturing-stub tests pinned the contract (60/60 lib tests PASS). The full NN-scoring integration (the bigger half of the directive) remains follow-up scope — tracked in the deep-research deliverable. |

## Fix order

1. **G1b** — title-based HWND resolution. Hard blocker; nothing actuates without it.
2. **G3** — `/compact` completion wait. Prevents corrupt actuation once G1b lands.
3. **G2 + G9 + G8** — sweep decision-input hardening (real git/handoff state + cooldown). One coherent change.
4. **G5 + G6** — Hermes learning-loop quality (stage stubs out of `.claude/commands/`; real dedup).
5. **G13** — awareness → decision feedback (the "implement what it learns" half).
6. **G4** — documentation only (note the operator-gated loop in the wiki).
7. **G10 + G12** — operator actions (register task, opt-in) — surfaced for the operator, not auto-done.

## Deep research deliverable (separate)

`do deep research on Hermes + utilizing Obsidian as an automated OS` — to land as a
companion research spec (`HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20.md`) feeding the
G5/G13 designs. Prior art: `knowledge/wiki/architecture/specs/spec-hermes-evolving-skills-research-2026-05-17.md`.
