# BRAVO / HERMES-ZULU — Domain Open-Tasks Ledger (curated, ROI-ordered)

> **Canonical single-read context-regain surface for the bravo (hermes-zulu) galaxy.**
> Curated by a human-in-the-loop chat — DISTINCT from the two auto/narrative surfaces:
> - `state/shared/handoffs/consolidated/bravo.md` — auto-generated raw thread feed (40 threads,
>   mostly peer-drift + `L8-P*-MS2 / 759ms 374done` boilerplate; noisy, not actionable).
> - `mcp-server/src/engines/hermes-zulu/MEMORY.md` — append-only NARRATIVE history (what shipped, when).
>
> This ledger is the **live actionable OPEN queue**: what is unfinished / unwired / dormant, ROI-ordered,
> with the exact next-action + blocker + source for each. **Supersedes** `BRAVO-TRIAGE-2026-05-19.md` (3wks stale).
>
> **RECONCILE 2026-06-21 (slot:bravo, claude-b52f6109) — backend-maturity finding.** `/checkin-bravo /goal complete remaining backend dev`. **0 unwired engines** fleet-wide (wiring lane CLOSED); build-red = live-peer WIP (india aiReasoning `temporal_record`/`cognitive_classify` + delta InventorCAD), NOT a stable regression; ZULU top items SHIPPED per 2026-06-20 reconcile. **Shipped:** AI-WIRE-MS0 drift-close (`f4294b274b`) — 37/39 engines MCP-wired + 1 WIRE-EXEMPT + 1 phantom → 12/12, all 4 surfaces consistent. **38 bravo-lane incomplete milestones classified deterministically** ($0; the 38-agent Workflow rate-limited on the saturated shared pool = keystone blocker #3): 23 ASPIRATIONAL (skeletal `units:[]` — MS-WIRE-BACKEND/CCM-MS*/QA-MS*/MS-PAY/MS-INFRA → operator-rescope, NOT auto-closeable), 6 DRIFT-CANDIDATE (AI-WIRE done; PILLAR-TELEMETRY U-PTR03 = MCP-zombies → golf/fleet-reaper drift; SF-PSN 13/14 → oscar), 6 GENUINE-OPEN (DEA-MS0/USSH/SYS-UTIL/KNOWLEDGE-WIKI/SYS-MS1/WIRE-MS0 — domain/operator-gated), 3 GATED (delta/wedm/mike). **Next-pass:** re-verify via `ollama-fanout.mjs` (free) when pool frees; operator to rescope the 23 aspirational envelopes. Detail: [[reference_bravo_backend_milestone_reconcile_2026_06_21]] + `state/shared/specs/.bravo-milestone-classification.json`.
>
> Maintainer: slot:bravo. Refresh cadence: at each /checkin-bravo context-regain + when a unit closes.
> Last curated: 2026-06-11 (slot:bravo, claude-8347ba23). Shipped this session: ledger (`46fd12f4f7`), steady-state probe (`95797c486e`), CAP gate (`cce4662030`), snapshot refresh (`190f36b749`). The injection-budget CAP loop is now CLOSED (measure -> enforce -> refresh). Awareness #2 deliverable now **5-of-5** (units 5 memory->wiki + 6 per-edit advisory shipped 2026-06-11). Next ROI: units 3/4 (Hermes cron enable + mcp-obsidian bridge) -- **5h keystone (unit 1) NOW COMPLETE end-to-end** incl #4 on-demand fallback (main `ac8cc4e7c8`); 9-sidecar zulu-residue pct=1 landmine cleaned. #4b (display banner) = only optional remainder.

---

## Regain full context in 3 reads (the map)

1. **This ledger** (open queue + ROI order) — you are here.
2. **Galaxy brain** `mcp-server/src/engines/hermes-zulu/MEMORY.md` — narrative history + known failure modes + cross-galaxy bridges. Semantically recallable: `prism_memory:semantic_search query="hermes zulu" topK=20`.
3. **Galaxy artifacts** in `mcp-server/src/engines/hermes-zulu/`: `PATHS.md` (file map) · `TOOLBELT.md` (dispatchers/skills) · `CLAUDE.md` (doctrine).

Deep-dive specs per track are pointed to inline below. The auto-consolidated handoff is a fallback only.

---

## Domain identity

**bravo BUILDS the orchestration substrate; zulu IS the slot-less runtime master** (the Hermes desktop app embodies ZULU — conductor above the 25 worker slots; never a 26th worker). Two roles, one galaxy. Soul: `state/shared/slot-souls/bravo.md` (`role: hermes-zulu-builder`, `galaxy_access: all-galaxies`, refuses: stub-engine / weak-assertions / softening-safety / unsafe-fleet-control-before-governance). Bravo MAY launch the Hermes + Obsidian desktop apps autonomously ([[feedback_bravo_launches_hermes_obsidian_apps]]).

---

## Active tracks

| ID | Track | Owner-of-record | Status |
|----|-------|-----------------|--------|
| **A** | Token-efficiency + Awareness-system (standing /goal deliverables #1/#2) | bravo (overlaps alpha token domain) | #1 largely done; #2 in-flight |
| **B** | Autonomous-Hermes + Obsidian-vault synergy (the "link galaxy into zulu" track) | bravo | blocked on B1 keystone + quota windows |
| **C** | Stub-hunting / orphan-wiring / fleet-governance | bravo | C-engines wired; governance + drift open |

---

## OPEN UNITS — ROI ordered (highest leverage first)

| # | Unit | Track | State | Blocker | Next action | Source |
|---|------|-------|-------|---------|-------------|--------|
| 1 | **U4 5h-quota populator** (KEYSTONE) | B | **COMPLETE end-to-end 2026-06-11** -- #1-3 (slot/bravo) + WIRE (main a5b65b8711) + #4 on-demand fallback (main `ac8cc4e7c8`, **Option C**: coordinator computes host-wide 5h weighted sum on-demand inside readFiveHourPct, NOT the rejected live-hook edit). 67 tests + live E2E (weighted=121.9M) + 2-agent scrutiny PASS. **ARMABLE** (set `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` ~100M, below live 122M); INERT until armed (auto-fire governance-gated per B2, soul-refused). 9-sidecar zulu-residue pct=1 landmine cleaned. #4b (display banner) optional. | **RESOLVED** by #4 on-demand fallback -- coordinator computes the host-wide 5h weighted from transcripts directly; no `rate_limits.five_hour` needed. Operator sets `PRISM_5H_WEIGHTED_TOKEN_TRIGGER` to arm. | **RESEARCH 2026-06-11 (R12 dead-end):** NO local source derivable -- ccusage NOT installed, no usage/rate-limit logs in `~/.claude` (only config/security json), no token-awareness sidecar exists. Max-plan 5h budget is DYNAMIC (no fixed published token denominator) -> this is WHY pct cannot be computed locally. **OPERATOR DECISION NEEDED:** supply a known 5h-token ceiling, OR pivot design to track the rate-limit RESET-TIME signal (anthropic-ratelimit headers) instead of a token pct. Then populate `token-awareness-sidecar.json quota.fiveHour.pct`; this unblocks `account-switch-restart-coordinator.mjs` auto-trigger@90% → the whole autonomous-Hermes chain | `ZULU-ACCOUNT-CYCLE-MS0.md`, `U-ZULU08-ACCOUNT-CYCLE-DESIGN.md`, `scripts/account-switch-restart-coordinator.mjs` |
| 2 | **Awareness ENFORCEMENT #3 — per-prompt injection-budget CAP** | A | **SHIPPED 2026-06-11** (probe `95797c486e` + CAP gate `cce4662030`) | none | DONE: session-id-aware steady-state probe (`--steady-state`, corrected single-pass overstatement 11.7x: 2854->244B) + `injection-budget-cap-enforce.mjs` PreToolUse(Write) ceiling gate (wired Write\|MultiEdit, 19/19 tests, 4 live paths). FOLLOW-UP = unit 10 (snapshot refresh) | `BRAVO-HERMES-ZULU-OPEN-TASKS-LEDGER`, `measure-userpromptsubmit-budget.mjs`, `injection-budget-cap-enforce.mjs` |
| 10 | **Injection-budget snapshot REFRESH** (completes the CAP loop) | A | **SHIPPED 2026-06-11** (`190f36b749`) | none | DONE: `injection-budget-snapshot-refresh.mjs` SessionStart hook spawns the probe DETACHED when the snapshot is >12h old (fleet 30m cooldown marker prevents probe-storm); wired SessionStart C:+H:, 16/16 tests, 3 live paths. The CAP gate now enforces durably (snapshot kept <12h < 24h TTL). | `injection-budget-snapshot-refresh.mjs` |
| 3 | **cron_mode: deny → enable** (Hermes overnight scheduled jobs) | B | deferred | Hermes app **DOWN** (not running 2026-06-11) -> full launch+configure, not a quick restart; better done with operator present (desktop GUI config) | during a clean quota window: verify valid `approvals.cron_mode` enum value, edit `…/AppData/Local/hermes/config.yaml:435`, `mcp_reload_confirm:true` + restart, confirm a scheduled job fires | galaxy brain 2026-06-03 Finding #2; `HERMES-APP-INCORPORATION-PLAN-2026-06-02.md` |
| 4 | **mcp-obsidian stdio bridge** (Obsidian as real MCP for Hermes graph queries) | B | NOT installed; **Hermes+Obsidian both DOWN 2026-06-11** | needs uvx/npx fetch + Obsidian running w/ Local REST API plugin+key + Hermes launch -- multi-dep desktop chain, operator-present | install `mcp-obsidian` stdio server, add to Hermes `mcp_servers`, point at vault `H:/prism/knowledge`; gives Hermes vault graph query/link (today it can only write flat files) | galaxy brain 2026-06-04 Part A; `HERMES-MCP-PLUGIN-INVENTORY-RESEARCH-2026-05-24.md` |
| 5 | **Awareness #4 — auto-promote high-confidence memory→wiki** (closed-loop learning) | A | **SHIPPED 2026-06-11** (select f7579878f6 + apply 6c9219819f) | none | DONE: `scripts/promote-memory-to-wiki.mjs` (select genuinely-uncovered+substantial memos, Ollama-draft lead + verbatim body, idempotent). detector + gate that promotes a high-confidence `feedback_*`/`reference_*` memory into a wiki leaf automatically (closes the learning loop bravo's domain owns) | `AWARENESS-SYSTEM-ASSESSMENT-2026-06-10.md` unit #4 |
| 6 | **Awareness #5 — per-edit /impact blast-radius nudge** (multi-step reasoning) | A | **SHIPPED 2026-06-11** (slot/bravo 6bf7c218ed) | none | DONE: `edit-consumer-advisory.mjs` PostToolUse:Edit advisory (git-grep real importers, throttled+relevance-gated, advisory-only, 21/21 tests, wired posttool-edit-bundle). surfacing upstream/downstream consumers of the edited symbol (multi-step impact awareness) | `AWARENESS-SYSTEM-ASSESSMENT-2026-06-10.md` unit #5 |
| 7 | **Hermes-memory -> Obsidian learning surfacing** (verify) | B | **VERIFIED + RE-ENABLED 2026-06-11** | none | DONE: bridge built+tested+live-validated (ran exit 0, idempotent skip-byte-equal; pure fs/crypto, zero Claude cost). FOUND the `PRISM Hermes-Obsidian Bridge` task **DISABLED** (silent staleness) -> re-enabled (user-principal, no elevation; Status:Ready, 15m cadence restored). Output lands in `knowledge/hermes-brain/` + system-graph (1 ref). Richer tribal-embed BLOCKED by separate `tribal-embed-index.CLOBBERED-2026-06-08-stub` (not bravo domain). | `scripts/hermes-obsidian-memory-bridge.mjs`; galaxy brain 2026-06-04 |
| 8 | **stale bravo=mill in orchestrator awareness reader** | C | **VERIFIED RESOLVED 2026-06-11** | none | verified: `scripts/lib/slot-galaxy-map.mjs:30` maps `bravo: "hermes-zulu"` (correct) and NO live `specialist-mill`/`primaryDomain:mill` mapping for bravo exists in `.claude/`/`scripts/`/`mcp-server/src/`. The 2026-06-03 drift was closed by the soul fix + map update. No action needed. | galaxy brain 2026-06-03 Finding #4 |
| 9 | **HERMES-CAPABILITY-EXPANSION-MS0** (research) | C | open envelope; **C1 multi-wave runtime driver SHIPPED end-to-end 2026-06-18** (decompose `31cd3ed86c` + project `8d816e44d0` + execute Workflow `183cc1184f`); wiki [[hermes-c1-runtime-driver]] | research-gated | C1 done -> next capability = fleet-control GOVERNANCE (keystone blocker #2: build governance FIRST; 12/34 galaxies slot-unaddressable). Continue finding high-level Hermes capabilities to wire. | `reference_hermes_capability_expansion_ms0_2026_05_24`, `knowledge/wiki/architecture/hermes-c1-runtime-driver.md` |

---

## Finished-but-unwired / dormant (verify before rebuilding — R8)

- **8 Hermes/Zulu C2 engines ARE dispatcher-wired** (0 orphans as of 2026-06-01): ZuluFleetGovernor (`prism_session:zulu_authority_check`), DreamMarkerScanner (`dream_scan`/`dream_markers_to_proposals`), ModelAttribution (`model_attribution_*`), OpusCapability (`opus_assess_complexity`/`opus_stats`), MultiModelConsensus (octopus), MoonshotInvocation, self-reflect populater, dream-cycle synth. **Do NOT re-create — wire NEW capability onto these.**
- **OpusCapabilityEngine.execute()** — LLM-backed path DEFERRED to `U-OPUS-EXECUTE-WIRE` (needs a live Anthropic client + integration harness; not honestly round-trip-testable offline). Dormant-by-design.
- **`PRISM Zebra Orchestrator`** scheduled task — left **Disabled** (dead; reversibility). `PRISM Zulu Orchestrator` is the live one.
- **Today's octopus-consensus cluster** (2026-06-10) is wired + tested (see galaxy brain update): auto-consensus-critical-edit, auto-consensus-userprompt, stop-consensus-drain, cross-session-orchestrator, slot-brief-inject, zulu-advisory-inject — all now have import-safe `isDirect` guards + real tests.

---

## Keystone blockers (everything downstream waits on these)

1. **B1 5h-quota populator** → gates B-track autonomy (account auto-switch, then cron, then full overnight Hermes). The chicken-and-egg: building autonomy needs API budget; budget exhausts; the auto-switch fix that frees budget isn't fully wired. **This is the single highest-leverage open unit.**
2. **Fleet-control readiness = NO-GO** (runtime dark + governance absent + 12/34 galaxies slot-unaddressable) → gates any ENFORCING fleet-control build. Bravo soul HARD-REFUSES `unsafe-fleet-control-before-governance`. Build governance FIRST. `HERMES-CONTROL-READINESS-2026-06-01.md`, [[reference_hermes_control_readiness_nogo_2026_06_01]].
3. **Shared Claude Max 5h pool saturation** (operational, ~10+ peer /loops) → caps Workflow fan-outs at ≤3-4 concurrent; prefer DIRECT tools + Ollama + `scripts/lib/ollama-fanout.mjs` for sweeps. No agent bursts.

---

## Operating discipline for this domain (standing)

- **Offload contract** (operator 2026-06-10): Ollama (`scripts/ask-ollama.mjs`: viz/rerank/summarize/explain/triage/ask) for searches/reads/data-gathering/summarizing — zero Claude tokens. Sonnet/Haiku for easier judgment-lite tasks. Reserve Opus for synthesis + safety. Confirm Ollama up (`:11434/api/tags`) — it silently falls back to Claude if down.
- **Commit on `cad-fusion-live-ms0`** (shared tree, H:/prism) with `[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SCOPE]/U-ID (slot:bravo): …`. Use `git commit -- <pathspec>` to avoid peer-absorption ([[reference_shared_tree_absorption_2026_06_03]]).
- **Stub-hunting is adversarial** (R9): every `toBeDefined`/`toBeTruthy`-without-a-value is a P0 false-green. Import-safe `isDirect` guard + real reference-value tests on every wired hook.
- **Repo is de-facto CRLF on Windows** — don't burn budget fighting EOL ([[reference_git_crlf_windows_reality_2026_06_02]]).

---

_Pointers: galaxy brain `mcp-server/src/engines/hermes-zulu/MEMORY.md` · specs `state/shared/specs/{HERMES,ZULU,AWARENESS}-*` · soul `state/shared/slot-souls/bravo.md` · auto-feed `state/shared/handoffs/consolidated/bravo.md`._
