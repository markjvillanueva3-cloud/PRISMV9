---
name: reference-slash-cmd-fidelity-ms0-2026-05-16
description: SLASH-CMD-FIDELITY-MS0 (3u shipped 2026-05-16 slot bravo) — /checkin args swallow fix. U-SCF01 deterministic hook, U-SCF02 runbook PRIORITY-0 + compressed Report + 13-chat sync, U-SCF03 settings.json wiring. U-SCF04 --topic kebab-tighten deferred.
source: prism-memory
synced: 2026-05-18T01:02:09.906Z
aliases: reference_slash_cmd_fidelity_ms0_2026_05_16
---


**Bug:** `/checkin-bravo <work order>` was swallowing the work order under the heavy /checkin ceremony. User typed `/checkin-bravo continue docustrata work` → got §Report box, no action on request.

**Fix shipped 2026-05-16 slot bravo claude-339c8ff7:**

- **U-SCF01** (commit `0c1c589b9`) — [`H:/prism/.claude/hooks/checkin-args-surface.mjs`](H:/prism/.claude/hooks/checkin-args-surface.mjs) + 14-test suite. UserPromptSubmit T2 deterministic belt. Matches `/checkin*` head, walks tokens via Map<flag,predicate> per-flag value validators (each value-consuming flag has a known domain — `--slot`→NATO, `--roadmap`→devtools|revenue, `--force`→boolish, `--chatId`→/^claude-/, `--topic`→any-non-flag). Survivors re-surfaced as `★ USER WORK ORDER` via additionalContext. Bare /checkin silent. Knob `PRISM_CHECKIN_ARGS_SURFACE_DISABLE=1`. Per-flag predicate FIXED Agent A's P1-1 forgotten-flag-value swallow at the root.

- **U-SCF02** (commit `228d3d963`) — `H:/prism/.claude/commands/checkin.md` (+101/-9, 612→697 lines). (a) PRIORITY-0 header before §Steps with 6 sub-rules covering all 4 input cases (work-order+noloop / work-order+loop / loop-keyword-only / no-args), explicit `--no-loop` precedence ("always wins over loop keyword"), U-SCF04 caveat disclosure. (b) §Report compressed from 30-line ASCII box to 3-line form with `verified=tree,staged,drift,chat-bus,slot-cutover,loop-state,local-compute` token closing silent-omission ambiguity. (c) Verbose box preserved as MODEL-GATED reference, NOT `<details>` (CommonMark CLI doesn't collapse `<details>`; nested ```bash closes the HTML block per §4.6 → would have rendered always, net-regression). (d) 13-chat sync: lines 18/102/442/469 from "12 / 11 work / Lima)" to "13 / 12 work / Mike)".

- **U-SCF03** (this session) — Spliced hook into `C:/Users/wompu/.claude/settings.json` UserPromptSubmit[2] (right after no-context emitters, before skill-auto-trigger / master-index-precheck-inject — work order surfaces near TOP of injected context). Manually mirrored to `H:/.claude/settings.json` byte-equal sha 26957a35d9a9d7ca 35992 bytes (c-to-h-mirror does NOT fire on Bash node-writes — documented mirror gap). Smoke: work-order test 553-char USER WORK ORDER block; bare /checkin `{"continue":true}` only.

**Per-file scrutiny gate (U-SCF02):** 2-of-2 PASS after one fix-cycle. Initial round caught 5 issues: `<details>` CommonMark bug, 4 stale 12-chat sites, loop-keyword-only ambiguity, `$ARGUMENTS` literal-token confusion, silent-omission ambiguity. Fix-cycle caught 3 more: `verified=` name-drift vs box rows, `--no-loop` precedence, P1-4 doctrine-vs-reality disclosure. Final residual P2 (line 452 stale example vocabulary) fixed pre-commit.

**Deferred U-SCF04:** Tighten `--topic` validator from `(v) => !v.startsWith("--")` to kebab-case `/^[a-z][a-z0-9-]{0,63}$/i`. Same root-cause structural pattern as `--slot`/`--roadmap`. Without it `/checkin-bravo --topic fix the parser bug` swallows "fix". Runbook discloses with workaround until landed.

**Lessons:**
1. `<details><summary>` ≠ collapsibility in terminal markdown renderers. Use model-enforced prose gates, not renderer-enforced HTML. CommonMark §4.6 also closes the HTML block on first blank line, so any nested fenced code-block inside `<details>` already escapes the wrapper.
2. Per-flag value-domain validators (Map<flag, predicate>) are structurally sound and reusable: extend the pattern to `--topic` (kebab) and any future flag.
3. The "12 chats" → "13 chats" fleet expansion has FAR more touch points than expected — every count-bearing string needs a grep sweep when the count moves. Future fleet-size changes should run `grep -E "12 (chat|slot|concurrent|PowerShell)|11 work|hotel\.\.lima"` across CLAUDE.md, MEMORY.md, all skills, all wiki entries.
4. The c-to-h-mirror hook does NOT fire on Bash `fs.writeFileSync` — only on Edit/Write/MultiEdit/NotebookEdit tools. Any settings.json change via Bash MUST be followed by a manual `cp` to the H: side AND verified byte-equal.

**See also:** [[feedback_checkin_args_are_primary_work_order]] · [[reference_checkin_autonomous_loop_2026_05_16]] · [[reference_settings_wiring_drift_2026_05_16]] · wiki: `knowledge/wiki/architecture/slash-cmd-fidelity-ms0.md`


## Related
[[skills/checkin-bravo|/checkin-bravo]] • [[skills/checkin|/checkin]] • [[skills/prism|/prism]] • [[skills/hooks|/hooks]] • [[skills/checkin-args-surface|/checkin-args-surface]] • [[skills/commands|/commands]] • [[skills/-|/-]] • [[skills/wompu|/wompu]] • [[skills/settings|/settings]] • [[skills/i|/i]]