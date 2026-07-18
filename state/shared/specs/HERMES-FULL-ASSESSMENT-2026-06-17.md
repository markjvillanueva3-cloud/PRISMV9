# HERMES FULL ASSESSMENT & AUDIT — operate-per-the-articles, fully synergized to CC CLI + PRISM (2026-06-17, slot:bravo)

> Operator directive: "look up ALL previous Hermes sessions + sessions run IN Hermes, gain full context;
> get Hermes operating like ALL the articles I've ever submitted, fully synergized to Claude Code CLI +
> PRISM; we need Hermes for **crons, loops, harnesses, autonomous building** while using the **Obsidian
> vault as a 2nd brain + context retention**. Do a full assessment and audit."
>
> **Method (R5/R12 honest):** enumerated the full corpus (counts below); bulk-distilled the article/research
> + architecture specs via **Ollama** (qwen2.5-coder, ~11k tok read locally → ~1.4k digests, Claude context
> kept lean); **live-verified the current runtime today** (scheduled tasks, the running backend, the Grok
> sub, the proxy). Subagent fan-out was UNAVAILABLE (session limit → 4:30pm CT), so this is a solo+Ollama
> pass. **Deferred (not exhaustively read this pass):** the 941 wiki files, ~407 memories, and the per-session
> transcripts inside all 21 Hermes profiles — enumerated + spot-distilled, NOT line-read. Pass 1 of a multi-pass audit.

## 0. Corpus enumerated (all-means-all)
- **33 PRISM Hermes/Zulu specs**, of which **17 are submitted articles/research** (`HERMES-{AGI-ARCHITECTURE,EVOLVING-SKILLS,OBSIDIAN-OS,MEMORY-VAULT,OCTOPUS-COORDINATION,PSN-RAG-SYNERGY,DASH-DEEP,MCP-PLUGIN-INVENTORY,CAPABILITY-EXPANSION}-RESEARCH`, `HERMES-{ADOPTION-PATTERN-MATRIX,MASTER-ORCHESTRATOR-ARCHITECTURE}`, …). Prior consolidations: `ZULU-HERMES-ARTICLE-VERIFY-2026-06-09`, `HERMES-CONTROL-READINESS-2026-06-01`, `ZULU-HERMES-GAP-AUDIT-2026-05-20`, `ZULU-MASTER-CONTEXT-LEDGER-2026-06-11`.
- **941 wiki files** + **~407 memories** (229 H: + 178 C:) reference Hermes/Zulu.
- **Sessions run INSIDE Hermes:** the app maintains **21 profiles (one per NATO slot)**, each with `sessions/` + `memories/`; bravo's `agent.log` = 1.37 MB.

## 1. Target-state — what the articles say Hermes SHOULD be
(distilled from the 17 articles + the architecture/master-orchestrator specs)
- **Hermes = the ZULU master-orchestrator ABOVE the 25 worker slots** (NOT a 26th worker; no "zebra" slot row). Four roles: **MASTER-BRAIN · TEACHER/INSTRUCTOR · ORCHESTRATOR · LEARNER**. Reads/writes PRISM state **via MCP** (`prism` server already in Hermes `mcp_servers` @ :3100); has **no heartbeat/slot-claim**; authority gated by `zulu_authority_check`, never bypasses the 3-of-3 gate. (`HERMES-MASTER-ORCHESTRATOR-ARCHITECTURE`.)
- **Crons** — scheduled autonomous jobs (morning vault brief, inbox sweep, weekly self-review/GEPA, skill loop, dream-cycle synth).
- **Loops / compounding** — self-reflect + dream-cycle + skill-evolution loops that compound learning over time.
- **Harnesses** — the agent runtime + the slot-brief-inject channel (`slot-brief-inject.mjs`) delivering targeted briefs to a slot on its next prompt; the fleet launcher (Bridge B) to spawn CC slots.
- **Autonomous building** — the **C1 Dependency-Ordered Multi-Wave DAG Scheduler** (logic ALREADY ENCODED in `HermesParallelFanoutPlannerEngine` but **never executed**) + the Zulu Build Loop.
- **Obsidian as 2nd brain + context retention** — the Hermes→Obsidian self-learning loop (memory files → vault → recall), the low-token 2nd-brain protocol ([[obsidian-as-second-brain-low-token-operating-protocol]]), context retention across runs.
- **CC+PRISM synergy** — `prism_hermes` dispatcher (CC→Hermes), `/ask-hermes` + `hermes-*` skills (off-Claude-token Grok offload), the control bridge (PRISM→Hermes app REST), MCP both directions.

## 2. Current state — live-verified 2026-06-17 (the reframe)
**The autonomous BACKEND layer is ~90% operational** (scheduled-task evidence, this session):

| Capability | Mechanism | LIVE state today |
|---|---|---|
| Orchestrator | `PRISM Zulu Orchestrator` task | **Ready, lastResult=0 ✓** (was "never registered" @ 06-01 NO-GO — now CLOSED) |
| Autonomous build | `PRISM Zulu Build Loop` task | Ready ✓ |
| Crons | morning-brief / inbox-sweep / weekly-self-review (Hermes config) + `Hermes Cron Prewarm` | Ready ✓ (3 jobs configured in bravo profile) |
| Self-reflect / compounding loops | `Hermes Self-Reflect Weekly`, `Hermes GEPA Weekly`, `Hermes Skill Loop` | Ready ✓ |
| Obsidian 2nd brain | `PRISM Hermes-Obsidian Bridge` task | Ready ✓ (re-enabled 06-11) |
| Grok offload (CC synergy) | `PRISM Hermes Proxy` :8645 → xAI OAuth | Ready ✓ — **proven live today: GROK IS LIVE** |
| Provider/subscription | bravo `model.default=grok-4.3 / provider=xai-oauth` | **WIRED + migrated 0→29 today** ✓ |
| Dream-cycle | `PRISM Hermes Dream-Cycle Synth` task | **FIXED 2026-06-17** ✓ — 267014 was NOT an OOM (corrected §8): the `PT2M` task limit was too short for synth+llm-synth+cascade; raised to 30min + cascade self-timeout |
| Desktop GUI | Electron renderer (`app.asar/dist`) | **BROKEN** ✗ — vendored bundle, settings page "failed to load"; needs a desktop rebuild (deferred) |
| App boot | bootstrap venv stage | **FIXED today** (stale python locked `venv\python.exe`) |

**Reframe:** the operator sees the broken desktop GUI and concludes "Hermes is dead," but the **autonomous runtime (crons/loops/orchestrator/build/obsidian-bridge/self-reflect) is largely RUNNING** independent of the GUI. The GUI is the cosmetic/control surface, not the autonomy engine.

## 3. Capability gap matrix (operator's named needs)
| Need | Built? | Running? | Gap |
|---|---|---|---|
| **Crons** | ✅ | ✅ (Ready) | Dream-Cycle 267014 = task-timeout (NOT OOM), **FIXED 2026-06-17** (limit 2min→30min + cascade self-timeout, §8) |
| **Loops** (self-reflect/compounding) | ✅ | ✅ | verify they produce real output (logs show Self-Reflect/GEPA/Skill ran lastResult=0; CONTENT not yet sampled — deferred) |
| **Harnesses** (slot-brief-inject, fleet launcher) | ✅ built | ⚠️ partial | `slot-brief-inject` wired; Bridge B (fleet launcher) never 3-of-3 scrutinized; assign→pickup loop historically broken (fail-loud 501 now) |
| **Autonomous building** (DAG scheduler) | ⚠️ **C1 encoded but NEVER executed** | ✗ | wire C1 (HermesParallelFanoutPlannerEngine multi-wave DAG) — the #1 capability build (`HERMES-CAPABILITY-EXPANSION-CANDIDATES` top pick) |
| **Obsidian 2nd brain + retention** | ✅ | ✅ (bridge Ready) | verify recall depth + the tribal-embed shard health (separate clobber-quarantine exists); confirm context retention round-trips |
| **CC + PRISM synergy** | ✅ | ✅ | `prism_hermes` + `/ask-hermes` + `hermes-*` skills + control bridge + MCP :3100 all live; the desktop GUI control surface is the only broken synergy edge |

## 4. Real blockers, prioritized
1. **[RESOLVED 2026-06-17 · bravo] Dream-Cycle cron termination (267014)** — NOT an OOM (pass-1 mislabel, corrected §8). `267014 = SCHED_S_TASK_TERMINATED`: the `PT2M` ExecutionTimeLimit (sized for a ~700-memo, no-LLM, no-cascade job) was too short once the corpus hit 19K + `--llm-synth` + the galaxy-cascade tail were added. Fixed: limit → 30min + the cascade `execFileSync` self-times-out at 20min fail-soft.
2. **[P1 · bravo-buildable] C1 Multi-Wave DAG Scheduler unexecuted** — the autonomous-building capability the operator wants; logic exists in `HermesParallelFanoutPlannerEngine`, just never wired to execute. Top pick of `HERMES-CAPABILITY-EXPANSION-CANDIDATES`.
3. **[P2 · deferred/vendored] Desktop GUI renderer broken** — `app.asar` settings page won't load; needs a desktop UI rebuild (tsc+vite, project-flagged known-failing). NOT required for autonomy; bypass via the control bridge.
4. **[operator-gated] Governance + harness scrutiny** — Bridge-B (fleet launcher) 3-of-3, governance for the :8767 control path (`HERMES-CONTROL-READINESS` blocker 2), veto ceiling. Bravo soul HARD-REFUSES `unsafe-fleet-control-before-governance` → governance lands before any ENFORCING fleet-control.
5. **[verify · deferred] Loop OUTPUT quality** — the loops run (lastResult=0) but this pass did not sample their produced content; confirm self-reflect/GEPA/skill-loop/obsidian-bridge are emitting real value, not no-ops.

## 5. ROI-ordered roadmap (to "operate per the articles, fully synergized")
**Bravo-buildable (no operator needed):**
1. ~~Fix the Dream-Cycle cron OOM~~ → **DONE 2026-06-17** (it was a task-timeout, not an OOM — see §8): limit 2min→30min + cascade self-timeout. All crons now green-capable.
2. Wire **C1 Multi-Wave DAG Scheduler** to execute (HermesParallelFanoutPlannerEngine) → real autonomous building. *(medium; the headline capability)*
3. Sample + verify loop OUTPUT (self-reflect/GEPA/skill/obsidian-bridge produce real artifacts) → close the "running but unverified" gap. *(small)*
4. 3-of-3 scrutinize Bridge-B (fleet launcher) → harness safety. *(small)*

**Operator-gated (safety/desktop):**
5. Governance for the control path (`HERMES-CONTROL-READINESS` blocker 2) before any enforcing fleet-control.
6. Desktop GUI rebuild (or accept headless+bridge operation as canonical — recommended: the autonomy doesn't need the GUI).

**Synergy hardening (build-once, all-substrates):**
7. Confirm the bidirectional MCP edge (Hermes `mcp_servers.prism` @ :3100 ↔ CC `prism_hermes`) round-trips post-reconnect; make the `hermes-*` offload skills the default mechanical rung for the fleet (vs only Ollama) where Grok wins.

## 6. Bottom line
Hermes is **~80-90% of the articles' vision, BUILT and largely RUNNING at the autonomous backend layer** — it regresses on app updates (today: boot + subscription) and its **desktop GUI is broken**, which masks the working autonomy. The path to "operating per the articles" is **NOT a rebuild** — it's: (a) fix the one OOM cron, (b) execute the already-encoded DAG scheduler, (c) verify loop output, (d) treat headless+bridge as the canonical control surface (GUI rebuild is optional/operator-gated). The CC+PRISM synergy lane (`/ask-hermes` → Grok, control bridge, MCP) is live and proven today.

## 7. Honest deferrals (R12)
- The 941 wiki + ~407 memories + 21-profile session transcripts were ENUMERATED + spot-distilled, NOT exhaustively read. A pass-2 should Ollama-mine the 21 profiles' `agent.log`/sessions to characterize how Hermes has ACTUALLY been used (vs designed).
- Loop OUTPUT content not yet sampled (only task exit codes).
- Subagent fan-out unavailable this pass (session limit); a Workflow-driven exhaustive read of the corpus is the natural pass-2 once the pool resets.

## 8. CORRECTION + RESOLUTION — Dream-Cycle "OOM" was a task-timeout (2026-06-17, slot:bravo)

**R12 self-correction.** Pass-1 (§2/§3/§4) labeled the Dream-Cycle termination an **OOM** and prescribed a heap bump — an UNVERIFIED assumption (exactly the trap `[[reference_mcp_kickoff_falsepos_liveprobe_fix_2026_06_17]]` records: an ambiguous exit code is not an OOM without a FATAL marker). Proven from the live task + the actual code:

- `267014 = 0x41306 = SCHED_S_TASK_TERMINATED` — "the run was *terminated*" (time-limit / external kill), **not** an OOM. No FATAL/heap marker exists.
- The scheduled task had **`ExecutionTimeLimit = PT2M` (120s)**, set in `install-hermes-dream-cycle-task.ps1` with a comment sized for the original **~700-memo, no-LLM, no-cascade** job (slot:alpha, 2026-05-27).
- The synth itself completes in **~9s** over **19,156 memos** (measured) — the 2026-06-04 inverted-index fix (lines 100-182) is holding; the dream md (`dreams/2026-06-17.md`) is written successfully every night.
- Three things were bolted onto the nightly job since the cap was set, none re-sizing it: (1) corpus ~700→19K; (2) the installer action gained `--llm-synth` (qwen2.5-coder:32b cold-load + per-edge Ollama calls ≤30s) — **R12 precision (scrutiny arm C): this had DRIFTED OUT of the LIVE task, which ran BARE, so the historical 267014 actually overran on (1)+(3) ALONE**; (3) the `runGalaxyCascade` tail (2026-06-11) spawns `galaxy-synthesis-refresh.mjs` with **no timeout** (Ollama L1 regen + sidecar rebuilds — minutes when galaxies change; sibling B1 ≈ 20min).
- **Drift reconciled 2026-06-17 (this unit):** the live task action was set to match the installer (`… --llm-synth`; Ollama up, 16 models) so the source-of-truth and live agree, and the dream-cycle now enriches the Obsidian 2nd-brain graph with local-LLM "why-these-connect" rationales — affordable under the new 30min limit, fail-soft if Ollama drops.
- So synth(9s)+llm-synth+cascade routinely overran 120s → OS-killed at the limit → 267014, even though the primary deliverable (dream md) had already succeeded.

**Fix shipped (this unit):**
1. `install-hermes-dream-cycle-task.ps1` — `ExecutionTimeLimit` 120s → **30 min** (generous, still bounded). Live task updated in place (`PT30M` verified).
2. `hermes-dream-cycle-synth.mjs::runGalaxyCascade` — the `execFileSync` now self-times-out at **20 min** (`PRISM_DREAM_CASCADE_TIMEOUT_MS`, < the 30-min task limit) and treats a timeout (Node `code:'ETIMEDOUT'` / `killed:true`) as **fail-soft** — so the cascade can no longer hang or be OS-killed, and the CLI reaches `process.exit(0)` regardless of the cascade outcome.

**Evidence:** synth 9s (live); `ETIMEDOUT` timeout detection proven live on Node v22.12.0; live task limit now `PT30M`; 40/40 tests (4 new cascade-timeout). The exit code is now structurally 0 — the cascade result never gates `process.exit(0)`. The green `LastTaskResult` will be confirmed on the next 03:17 run (a full on-demand trigger is heavy + mutates shared galaxy-synthesis state, so not run mid-session).

## 9. PASS-2 — the 3 operator articles → Hermes scorecard (2026-06-17, slot:bravo, read live via Playwright)

The operator submitted 3 X articles to read with Playwright and have Hermes "operate like." Read in full (not summaries):

- **A1 — @sairahul1 "Context Engineering for AI Agents: The Complete Playbook"** — the CONTEXT-RETENTION / 2nd-brain theory. Context window = RAM; context-rot starts at ~40-60% (Claude Code), lost-in-the-middle, 7 categories compete. **4 core strategies: WRITE / SELECT / COMPRESS / ISOLATE** (LangChain). 4 failure modes: **Poisoning / Distraction / Confusion / Clash**. KV-cache = stable-prefix-first = 10× cost. The shipping workflow: **research → compact → plan → compact → implement** (fresh context per phase, stay <40-60%). Universal turn loop: Collect → Select → Compress → Arrange → Assemble.
- **A2 — @0xCodez "Agent harness engineering: 14-step roadmap from one agent to a self-improving system"** — the CRONS/LOOPS/HARNESSES/AUTONOMOUS-BUILD theory. **3 floors: HARNESS (the `.claude/` env — model+tools+permissions+context) → LOOP (harness on a timer, /loop+/goal+independent grader) → SELF-IMPROVING SYSTEM (loop + compounding memory).** 14 steps: CLAUDE.md(<500 tok facts) · settings.json · subagents(writer-vs-checker) · skills · hooks(deterministic) · loop · **dynamic workflows (`agent()/parallel()/pipeline()`)** · memory state-file · **close-the-loop (output→reviewer→memory→skill→better output)** · ship-as-plugin. Order is the lesson: **build the harness FIRST, wrap a loop LAST** ("a loop on a bad harness just bleeds faster").
- **A3 — @zeuuss_01 "I Turned Hermes Agent Into an Operation System"** — the HERMES-OPERATOR playbook. Hermes (Nous, MIT) as a **24/7 OS not an app**; SOUL.md-first (skipping it = #1 mistake); Telegram + 3 crons; `/goal` w/ judge model; **profiles = a team of specialists + a control-room orchestrator** (git-shareable); route-per-task token economics (10× swing); compounding = "agents with 20+ self-written skills finish ~40% faster" (accumulated procedure, 2-4 wks to show). **"Claude Code = daily driver at the desk; Hermes = 24/7 infra that compounds — COMPLEMENTARY, not competing." "Desktop app isn't at full CLI parity."** "The operator doesn't prompt. The operator builds the system."

**Headline: the 3 articles describe, almost line-for-line, what PRISM has already BUILT — at far greater scale. They are the theory; PRISM is the over-built implementation.** Two of the articles' own caveats independently CONFIRM pass-1's reframe: A3 says the Hermes desktop app isn't at CLI parity (→ PRISM's GUI-defer is correct, not a failure) and that CC+Hermes are complementary (→ PRISM's `prism_hermes`/`ask-hermes`/control-bridge synergy is the right design, not a redundancy).

### Scorecard (A2's 14-step harness checklist — the clearest rubric)
| # | Article step | PRISM/Hermes state | Verdict |
|---|---|---|---|
| 01-02 | harness = `.claude/` env (model/tools/perms/context) | 700+ hooks · 440+ skills · settings.json · `.mcp.json` (prism @ :3100) · per-galaxy CLAUDE.md · agents/ | ✅ over-built |
| 03 | 3 floors kept straight | harness (`.claude/`) · loop (`/checkin`+`/loop`+`/goal` + zulu crons) · self-improving (dream-cycle+self-reflect+GEPA+skill-loop+LoRA) | ✅ |
| 05 | CLAUDE.md = standing FACTS, <500 tok | root CLAUDE.md is **112KB** — A2's mistake #2 ("bloated CLAUDE.md"). Mitigated by per-galaxy scoping + CAG cold-anchor + keyword-gated injection, but the root still loads big every session | ⚠️ **real gap** |
| 06 | settings.json perms/model | autoApprove/deny + model + hooks, extensive | ✅ |
| 07 | subagents = isolated, writer-vs-checker | the 3-of-3 reviewer agents + per-file 2-arm scrutiny ARE the writer-vs-checker split | ✅ |
| 08 | skills = reusable procedures | 440+ skills | ✅ (hygiene gap below) |
| 09 | hooks = deterministic enforcement | 700+ hooks; PreToolUse gates (e.g. slot-commit-enforce, comprehensive-build) | ✅ |
| 10 | loop (/loop + /goal + independent grader) | `/loop` + `/goal` + scrutiny-3of3 as the independent grader; zulu Build-Loop + Orchestrator crons | ✅ |
| 11 | **dynamic workflows (`agent/parallel/pipeline`)** | the Workflow tool exists fleet-wide; the C1 Multi-Wave DAG Scheduler (`ZuluWaveSchedulerEngine`) **IS BUILT** (Jun 15: `allWaves` topo-partition + `computeWaveN` incremental driver + named cycle detection, wired `sessionDispatcher:schedule_wave`, 14.6KB test) — callable, but **no live zulu runtime DRIVES it** | ⚠️ **runtime-driver, not the engine** |
| 12 | memory state-file (write-before-walk, read-at-start) | per-chat HANDOFF + MEMORY.md + Obsidian vault + auto-resume; "distill into skills" = forge/skill-loop | ✅ |
| 13 | **close the loop (output→reviewer→memory→skill→better)** | mechanisms exist (dream-cycle✓just-fixed, self-reflect, GEPA, LoRA feeders) but **loop-OUTPUT value not yet sampled/proven** (pass-1 deferral) | ⚠️ **verify** |
| 14 | ship as plugin | PRISM ships claude-flow + figma + others as plugins; harness is shareable | ✅ |

### A1 (context engineering) scorecard
WRITE ✅ (memory/CLAUDE.md/handoffs/scratchpad) · SELECT ✅ (master-index RAG + CAG-route + tribal-by-domain = exactly A1's "RAG over tool descriptions / RAG-MCP") · COMPRESS ✅ (auto-compaction + precompact + the dream-cycle compresses 19K memos) · ISOLATE ✅ (sub-agents + 26 slot-worktrees + galaxy context partitioning). KV-cache stable-prefix = the SessionStart **"CAG cold-cache anchor"** literally implements it. The 4 failure modes are covered by R12 (poisoning), aggressive prune/compact (distraction), RAG-MCP master-index (confusion=46-tool problem), R7 conflict-fork + authority-ordering (clash). `research→compact→plan→compact→implement` = PRISM per-file scrutiny + handoff + precompact phases.

### A3 (Hermes-OS) scorecard
SOUL.md ✅ (per-slot souls + Hermes profile charters) · crons ✅ (just hardened) · `/goal`+judge ✅ · **profiles=specialists ✅ (21 Hermes profiles + 26 NATO slots)** · orchestrator/control-room ✅ (zulu) · route-per-task ✅ (Ollama→Sonnet→Opus ladder, R5) · CC+Hermes complementary ✅ (bridged) · skill-hygiene "review weekly, delete weak" ⚠️ (PRISM has skill-lint/forge-audit — confirm it runs on cadence) · long-session drift `/compress` ✅ (self-compact + auto-compact).

### The article-grounded build path to "operate per the articles"
Pass-1's roadmap survives the article cross-check; the articles sharpen it to FOUR concrete, bravo-buildable items (all map to a ⚠️ above):
1. **[done 2026-06-17] Dream-Cycle cron** — A2-step-13 close-the-loop compounding job, now green-capable (§8).
2. **C1 Multi-Wave DAG Scheduler — ENGINE ALREADY BUILT (R12 correction, verified 2026-06-17).** `ZuluWaveSchedulerEngine` shipped Jun 15 (NOT `HermesParallelFanoutPlannerEngine`, which is HZP01 = wave-1-only) — complete, wired (`schedule_wave`), 14.6KB test. The pass-1/§9 "encoded-not-executed" claim was STALE (repeated from the older capability-candidates spec without verifying live state — an existence≠body trap). **The real remaining gap = the zulu RUNTIME DRIVER:** no live cron/loop/hook autonomously decomposes a parent task into a `SubtaskSchema` DAG → calls `allWaves`/`computeWaveN` → spawns the per-wave Agent batches. THAT driver (A2 step 11 *execution*) is the actual autonomous-building unit. (Also: the zulu-build-pointer still lists C1 as "pending" — stale; the Build-Loop cron should advance it to C2. Flagged, not hand-edited — single-writer.)
3. **Prove the compounding loops emit value** — A2 step 13 / A3's "compounding effect". Sample the dream-cycle / self-reflect / GEPA / skill-loop OUTPUT (not just exit codes) and the LoRA-feeder deltas. Close pass-1's "running but unverified" gap with numbers.
4. **Skill hygiene cadence** — A3's "review weekly, delete weak skills before they're reinforced" → confirm/scheduler skill-lint + forge-audit on a weekly cron.

Plus one **doctrine** finding (operator-gated, not a silent build): **A2 mistake #2 — the 112KB root CLAUDE.md violates the "standing facts, kept short" rule.** PRISM already mitigates (galaxy-scoping + CAG anchor + keyword injection), but a root-CLAUDE.md slim pass (facts stay, procedures → skills, path-rules → galaxy files) is the single highest-leverage context-engineering win A1+A2 point at. Flag for a golf/alpha slim unit; do not silently rewrite the fleet's universal rails.

**Bottom line (pass-2):** the 3 articles are a validation, not a redesign. Hermes/PRISM already embodies the harness→loop→self-improving-system stack and the Write/Select/Compress/Isolate context discipline. "Operating per the articles" = execute the 2 unexecuted floors (C1 DAG scheduler; prove loop value) + the CLAUDE.md-slim doctrine win — NOT a rebuild. Pass-3 (deferred, Workflow-driven once the agent pool is un-throttled): exhaustively mine the 21 Hermes profiles' session transcripts to characterize how Hermes has ACTUALLY been used vs designed, graded against this scorecard.
