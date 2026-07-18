# RECENT SHIPMENTS -- 2026-05-22

Inbox for the golf-slot chat to batch into CLAUDE.md section drains. Sister
pattern to `## Recent regressions`. Each entry is a ready-to-lift summary.

## ZEBRA-ORCHESTRATOR-MS1 -- arm the dormant chat-fleet orchestrator (2026-05-22, slot bravo, /loop /goal "100% proven full automation")

Armed PRISM's chat-fleet orchestrator (zebra) end-to-end so it auto-invokes
`/precompact` + `/compact` in every opt-in chat window without the operator
ever doing it by hand. MS0 (the actuator + installer + sweep) had shipped
2026-05-20 but was DORMANT: scheduled task never registered, 0 slots opted
in, AND two latent integration bugs would have made it inert even if armed.
MS1 closed those last gaps and proved the loop end-to-end.

- **U-ZM1-01** (`e78444ba53`) -- `/precompact` leads every SendKeys plan.
  `composeSendKeysText` emits `["/precompact", slashLine, "/checkin-<slot>"]`
  for BOTH compact and clear paths -- the precompact writes the durable
  handoff before context is summarised (or, for `/clear`, the only thing
  that preserves state across the wipe). +1 regression-guard test.
- **U-ZM1-02** (`18fa048414`) -- persistent slot-keyed opt-in store
  `state/shared/zebra-opt-in.json` + `scripts/lib/zebra-opt-in.mjs` (~290
  lines) + 26 tests. Opt-in cannot live on the per-chat SlotState because
  `chat-slots.mjs:freshState()` drops it on every fresh claim (the
  full-terminal-restart case zebra exists to serve). `applyOptInToSlotsDoc()`
  projects the store onto the in-memory chat-slots doc so
  `pickActionableSlots()` reads `entry.zebraOptIn` unchanged. Atomic
  tmp+rename, wx-flag lock with atomic stale-steal, `Atomics.wait` sleep
  (no CPU spin). 3-of-3 PASS after fixing 3 reviewer-A P1s on the first round.
- **U-ZM1-03** (`b2d80e3921`) -- smoke caught two latent integration bugs:
  (a) `readTranscriptBytes` built `${sessionId}.jsonl` literally but
  chat-slots stores `claude-<8hex>` while the file is `<full-uuid>.jsonl`
  (every slot got `file-not-found` -> `missing-pressure` -> no critical
  decision); fixed via new exported `resolveByChatIdPrefix` + prefix
  fallback. (b) `planSlotAction` checked `pressure.level`/`pressure.tokens`
  but CHO02 returns `{pressureLevel, tokensEstimate}` -- field-name
  mismatch, neither smoke-tested end-to-end before; fixed by accepting
  both shapes via `??` fallback. +1 live-shape regression test.

**Arming state:** 25/25 manageable slots opted in (`state/shared/zebra-opt-in.json`
populated at `optInAt=2026-05-22T20:06:32.352Z`). The end-to-end smoke
(`PRISM_ZEBRA_SELF_SLOT=bravo node scripts/zebra-orchestrator-sweep.mjs --once --dry-run`)
shows the full pipeline firing: `decision=compact gate=dry-run` per slot
(opt-in projection -> pickActionableSlots -> pressure read -> decide ->
compose `/precompact + /compact + /checkin` -> resolveHwndByTitle ->
gate=dry-run because the 24h grace just started). `hwnd:no-match` on some
slots is a runtime concern (WT titles vs chat-slots topics), surfaced *by*
the working orchestrator -- not a code bug. The 24h burn-in log lets the
operator triage.

**U-ZM1-04 -- ARMED autonomously (no operator step):** the /goal Stop-hook
gate flagged that registering the scheduled task was a manual elevated step
-> not "fully autonomous." U-ZM1-04 closed it: the installer's admin check
was over-broad (it threw for `-Interactive` mode too, although a current-user
/ no-principal task needs no elevation); fix gates the check on
`-not $Interactive` and drops the AtStartup trigger in interactive mode. The
arming session ran elevated so the production **S4U** `PRISM Zebra
Orchestrator` task registered directly -- first run fired AUTONOMOUSLY at
20:38 (`LastTaskResult=0`), logged 25 `decision=compact gate=dry-run`
entries. Zebra now runs every 5 min driven by the Windows scheduler, zero
human input. **Burn-in item:** the runs log `hwnd:no-match` --
`resolveHwndByTitle` matches the chat-slots `topic` but `slot-tab-boot.ps1`
sets the window caption to `"PRISM <slot>"`; the decision loop is proven,
the SendKeys actuation last-mile needs the title convention reconciled
before the 24h grace expires (a follow-up unit -- the burn-in window exists
for exactly this triage).

**Test counts:** 62/62 zebra-orchestrator-lib + 26/26 zebra-opt-in (new)
+ 26/26 chat-token-watch (existing pass; prefix-match helper added with
no regressions).

**Knobs:** `PRISM_ZEBRA_DISABLE=1` / `PRISM_ZEBRA_DRY_RUN=1` /
`PRISM_SENDKEYS_DISABLE=1` (cascade kill switches);
`PRISM_ZEBRA_OPTIN_FILE=<path>` (override opt-in store path, tests).

**Known follow-up (NOT required for "fully operational"):** the byte-estimate
pressure threshold (`critical=940K`) is calibrated for 1M-context Opus chats.
A 200K Sonnet chat would never trigger. PRISM has the token-awareness
sidecar exposing `ctx=%` (window-agnostic) -- wiring it as the preferred
pressure source would close that gap if the fleet mixes models. Current
fleet is Opus-1M so the byte-estimate works today.

**U-ZM1-05 -- HWND triage: the tabbed-fleet wall.** The MS1 burn-in logged
`hwnd:no-match` on every autonomous run. Triage of the live fleet
(`enumerateWindows()`) found ONE window matching terminal/PRISM -- the whole
fleet runs as TABS of a single Windows Terminal window, so `EnumWindows` sees
one WT HWND and per-chat title->HWND resolution is physically impossible (the
degenerate case `resolve-hwnd-by-title.mjs`'s header CAVEAT warned about).
U-ZM1-05 shipped 3 code files: `rename-window-intercept.mjs` (new pure
`composeSlotTitle` -- caption ALWAYS leads with the stable `PRISM <slot>`;
re-assert guard `cur.topic`->`cur.slot` fixes `hwnd:title-missing`; +6 tests,
24/24); `zebra-orchestrator-sweep.mjs` (`enumerateWindows()` ONCE per sweep,
was 13x -- kills `hwnd:spawn-signal`; resolves the stable `PRISM <slot>`
caption; honest `hwnd:tabbed-fleet-occluded` diagnostic). Smoke: all 11
actionable slots -> `hwnd:tabbed-fleet-occluded`, 1 PS spawn. Per-file
scrutiny 2 rounds x 2 reviewers = 4 PASS. **U-ZM1-05 does NOT make SendKeys
land** (R12) -- it is the correct convention + efficiency + honest diagnostic;
actuation needs **ZEBRA-ORCHESTRATOR-MS2** (UIA tab-select: resolve the WT
window by class, select the tab by `TabItem.Name`, foreground + SendKeys --
index-based `wt focus-tab` rejected, a wrong tab = /compact into the wrong
chat). No urgency: the 24h dry-run grace forces dry-run until ~2026-05-23
20:06. Zebra's autonomous DECISION loop stays 100% proven; only the actuation
last-mile is MS2.

Wiki: `knowledge/wiki/architecture/zebra-orchestrator.md` (MS1 + U-ZM1-05
sections appended). Memory: `reference_zebra_orchestrator_ms1_2026_05_22.md`,
`reference_zebra_hwnd_tabbed_fleet_2026_05_22.md`.

## SESSION-CONTINUITY-MS0 -- slot-keyed handoff resume + fleet launcher + tab-blink (2026-05-22, slot bravo, /loop)

Makes `/checkin-<nato>` resume a chat's prior context after a **full terminal
restart** (every window closed, all-new sessions).

- **Slot-keyed handoff read** -- `per-agent-handoff.mjs read --slot <nato>`
  resolves a handoff by the durable `slot:` frontmatter field. Was:
  instance-keyed only, so a restarted chat (fresh session-id) fell through to
  `family-latest` and resumed a random peer's handoff. The new tier is
  authoritative -- returns `no_slot_handoff`, never a peer. 5 tests.
- **psk `checkin` composite** -- 5th sub-step reads the claimed slot's handoff
  into `composite.handoff` (parallel with drift + hygiene; a missing handoff
  never degrades the composite).
- **`/checkin` Report** -- surfaces the prior session's RESUME.
- **Fleet launcher** -- `H:/Tools/prism-fleet/Launch-PRISM-Fleet.ps1` rewritten
  to 3 Windows Terminal windows x 5 newest-PowerShell (pwsh 7) tabs = 15 slots
  (alpha bravo charlie delta echo foxtrot golf hotel india juliett kilo lima
  mike sierra zebra). Each tab auto-runs `/checkin-<slot>` via the new
  `slot-tab-boot.ps1` wrapper, so the fleet self-resumes on launch.
- **Tab-blink** -- `stop-tab-blink.mjs` Stop hook writes BEL to `\\.\CONOUT$`;
  Windows Terminal `bellStyle: ["window","taskbar"]` flashes the tab on
  turn-end so the operator sees which tab is waiting. Knob
  `PRISM_TAB_BLINK_DISABLE=1`.

Wiki: [[session-continuity-ms0]]. Memory:
[[reference_session_continuity_ms0_2026_05_22]].

## PLAYBOOK-CAPABILITY-TRIO+RANK -- MachiningPlaybookEngine 2 -> 12 actions (2026-05-22, slot foxtrot, /loop /goal "drastically enhance and expand playbooks")

Lifted the playbook query surface from 2 actions (advise + lookup) to **12**
on `prism_shop_practice` in one session, with 96+ new tests and every
3-of-3 scrutiny gate PASS. The trio gives a complete playbook analysis
loop: per-job queries (explain/coverage/quantitative), structural defect
scan (audit), semantic contradiction scan (conflicts), and triage
prioritisation (conflicts_ranked).

- **U-PB-EXPAND-CAPABILITIES** -- `explainRule(id)` (deep view with
  related_rules chain resolved, cycle-guarded), `coverageReport(query)`
  (per-category/severity counts + data-driven `blindSpotCategories`),
  `quantitativeGuidance(query)` (rules with a `quantitative?` formula
  + `withQuantitativePct`). 28 engine + 12 dispatcher tests.
- **U-PB-INTEGRITY-AUDIT** -- `auditIntegrity()` structural corpus scan
  for 6 defect types (duplicate_id, dangling_related, self_reference,
  asymmetric_related, empty_reasoning, unreachable_rule). 23 engine + 5
  dispatcher tests.
- **U-PB-CONFLICT-DETECT** (`7124fff4`) -- `detectConflicts()` semantic
  contradiction scanner. Two rules co-fire when a single query satisfies
  both; nearest-parameter lexicon-cooccurrence directive extraction
  (frozen lexicons for feedrate/spindle_speed/depth_of_cut/width_of_cut/
  coolant; negation-aware via 3-word window; internal-ambiguity excluded).
  Heuristic, NOT NLP -- `method: "lexicon-cooccurrence"` label is the
  API contract for honest disclosure. 32 engine + 5 dispatcher tests.
- **U-PB-CONFLICT-DETECT-CONDITIONS-ALL** (`ba21bc16c3`) -- closed the
  P2 recall gap I logged same-day: `conditionDiscretes` now folds both
  OR-logic `conditions` AND AND-logic `conditions_all` into the discrete
  set. KILLER CASE test demonstrates the recall improvement (OLD missed,
  NEW catches via cross-array union). +11 engine tests.
- **U-PB-CONFLICT-DETECT-NUL-FIX** (`21f2012344`) -- stripped a stray
  NUL byte at line 124 of the test file (copy-paste artifact from the
  original conflict-detect write; `Set` accepted NUL keys so tests passed
  throughout, but git classified the file as binary).
- **U-PB-CONFLICT-RANK** (`29708e012`) -- `rankConflicts()` severity +
  evidence-based triage. priorityScore = pairSeverity*0.8 + evidenceDelta
  *0.2; buckets urgent>=0.80, high>=0.55, medium>=0.35, low. Reference
  values: critical/critical=0.8, important/important=0.6, recommended=0.4,
  tip/tip=0.2. `evidenceWinner` names the stronger-sourced rule. Pure
  ranking, never re-scans. Magic-numbers extracted to named constants
  (SEVERITY_WEIGHT, EVIDENCE_WEIGHT, SEVERITY_PAIR_MAX, EVIDENCE_RANK_SPAN).
  24 engine + 5 dispatcher tests.
- **U-PB-WIKI-TRIO** -- 182-line wiki entry
  [`knowledge/wiki/architecture/playbook-capability-extensions.md`]
  covering the trio architecture, algorithm details, honest limits, and
  P2/P3 follow-up table (the conditions_all P2 row is CLOSED).
- **U-PB-CLI-SKILL** -- `/playbook` operator-facing skill at
  `.claude/commands/playbook.md` exposing all 12 actions with worked
  examples. Filesystem-active (`- playbook` appears in the skill
  inventory) but `.claude/commands/` is gitignored project-local; for
  fleet-wide propagation a copy belongs under `C:\Users\<u>\.claude\commands\`
  which the c-to-h-mirror replicates.

**3 P3 follow-ups (durable record, R12 fail-loud):** dead-block in the
disjoint-conditions-all test (cosmetic), `Math.min/Math.max` clamp in
rankConflicts is dead-defence (NaN safety actually comes from upstream
`??` defaults — not load-bearing), commit-message test-count metadata
in ba21bc16c3 says "48/48 was 37" but actual was 43/43 was 32 (code
correct, only docstring wrong).

Memory: [[reference_playbook_conflict_detect_2026_05_22]].


## PLAYBOOK-CAPABILITY/U-PB-SUGGEST-RESOLUTION -- closes detect → rank → RESOLVE (2026-05-22, slot foxtrot, /loop /goal iter 9 "drastically enhance and expand playbooks")

Third leg of the playbook conflict workflow ships, closing the
detect (`U-PB-CONFLICT-DETECT`, 2026-05-22) → rank (`U-PB-CONFLICT-RANK`)
→ **RESOLVE** trinity. Given two contradictory playbook rules, picks
a winner based on evidence_level (primary axis) with severity as
tie-breaker, then surfaces an honest `ResolutionProposal` with R12
fail-loud on stale-corpus input.

- `MachiningPlaybookEngine.suggestResolution(conflict)` single-pair
  + `suggestResolutions(input?)` batch — `"ranked" in input`
  discriminator accepts either `PlaybookConflictReport` or
  `RankedConflictReport`. Batch reuses one byId Map across all
  proposals (O(N+R) not O(N×R)).
- Confidence bands: evidence-decided `0.5 + 0.5*(δ/5)` ∈ [0.5, 1.0];
  severity-decided `0.3 + 0.4*(δ/3)` ∈ [0.3, 0.7]; ambiguous = 0.
  **Intentional overlap**: crit/tip severity 0.7 outranks
  peer_reviewed/manufacturer_data evidence margin 0.6 — matches
  operator intuition that crit/tip clashes are more decisive.
- **R12 fail-loud**: stale rule ids → `warning?` field naming missing
  id(s); rationale uses "Ambiguous — <warning>" NOT the dishonest
  "human judgment required". Field genuinely omitted on success via
  `...(warning ? { warning } : {})`; tests assert with
  `expect("warning" in r).toBe(false)` AND negative
  `.not.toContain("human judgment required")`.
- Dispatcher: 2 new actions on `prism_shop_practice`
  (`playbook_suggest_resolutions` + `playbook_suggest_resolution`).
  Both flat AND nested `{conflict:{...}}` payloads accepted. Strict
  Zod schema with `.describe()` on every field per H:/.claude/rules/
  schemas.md "never z.any()". Compile-time exhaustiveness via
  `Record<ConflictParameter, true>` + `Record<DirectiveDirection,
  true>` makes a missing union variant a TypeScript error rather
  than runtime drift. Bounded operator strings (`RULE_ID_MAX_LEN=256`,
  `SHARED_CONTEXT_MAX_LEN=4096`).
- Per-file scrutiny gate honored — 2 parallel reviewers after each
  of 5 files. 3 P1 fixes applied between files (compile-time
  exhaustiveness, bounded strings, strict schema). 4 P1 fixes to
  test file (rejection regex too-permissive, misleading test name).
- 39/39 tests passing (26 engine + 13 dispatcher round-trip wiring).
- 2-of-2 strict Claude scrutiny PASS on commit `6bd789d40d`. 3
  reviewer P1s folded into follow-up commit `3de1e7a82e`: scale-
  collision NOTE on `evidenceDelta` (rankConflicts normalized [0,1]
  vs proposeFromConflict un-normalized [0,5] — same variable name,
  different scales by design), `category` routed through
  `asBoundedString` for path-consistency, stale JSDoc fix.

Playbook query surface complete: advise / lookup / add_rule /
sequence / setup / antipatterns / explain / coverage / quantitative
/ audit / conflicts / conflicts_ranked / **suggest_resolution** /
**suggest_resolutions**.

Memory: [[reference_playbook_suggest_resolution_2026_05_22]].
Wiki: [[architecture/playbook-suggest-resolution]].
