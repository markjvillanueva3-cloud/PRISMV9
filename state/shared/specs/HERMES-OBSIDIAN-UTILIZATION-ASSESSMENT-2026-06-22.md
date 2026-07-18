# HERMES + OBSIDIAN UTILIZATION ASSESSMENT — 2026-06-22 (slot:zulu)

> Operator hypothesis: BOTH are severely underutilized. Method: 4 parallel corpus-readers over ~50 articles+specs+memories + 2 adversarial live-state verifiers, cross-referenced against live telemetry. R7: where a doc claim conflicts with a live probe, the live probe wins (and the stale claim is flagged).

> **⚠ CORRECTION (2026-06-22, post-verification by zulu).** Two verifier findings were FALSE — they inferred config from symptoms instead of reading the actual values. Direct check of the live `C:` + `H:` settings.json proved:
> - **F3 (reverse mirror) is NOT unwired — it is WIRED + LIVE** (`h-to-c-obsidian-mirror.mjs` in PostToolUse group 0, both settings copies, `PRISM_H_TO_C_MIRROR_DISABLE` unset). The "operator vault edits silently lost" P0 was a false alarm. Obsidian-side edits DO flow back to C:.
> - **F4 (`PRISM_OLLAMA_OFFLOAD_AUTOEXEC`) is already `"1"`** in both settings copies (plus `PRISM_OLLAMA_ROUTE_AUTO=1`). Autoexec was never off, so it is NOT the offload lever — the 22% persists WITH it on.
> - **F5 nuance:** qwen2.5-coder:32b prewarmed in **623ms** (already resident). The 14.9s the verifier saw was transient VRAM eviction under fleet load, not constant. Durable fix = an ollama-server `OLLAMA_KEEP_ALIVE` pin / prewarm cron (alpha), not urgent.
> **Lesson (R12):** an adversarial verifier that infers "X is off/unwired" from a symptom WITHOUT reading the actual config value can manufacture a false P0. Always read the live value. The findings below are corrected inline; the still-valid levers are F1 (autonomous driver), F2 (proxy durability), F6/F8/F9 (read-path quality).

## LIVE TELEMETRY (ground truth, 2026-06-22)
- **Ollama offload: 22.0%** (308 offloaded / 1092 kept). **executedOffloads=20 vs silentSuggestions=4808** (a 62:1 suggestion→action loss). measuredTokensSaved=48,702.
- **Hermes `ask-hermes`: 99.8% effective WHEN used** (855/857 via the Grok proxy) — but the proxy is a **session-bound process** that is **DOWN right now** (port 8645 ECONNREFUSED, nothing bound). Last used 2026-06-22T13:14:43Z (today, ~8 min before the probe) → it dies when the launching session ends.
- **Vault: 69,445 .md** (20,623 memories + 45,007 wiki + 5,462 C: auto-memory). CAG cold hit-rate **3%** but **82% warm-traffic** (the 3% is honest — cold misses are novel first-asks, not failures).

---

## 1. VERDICT

**HERMES — SEVERELY UNDERUTILIZED (operator is right).** Most damning number: the autonomous build loop runs at **0.4% execution** (20 executed / 4808 suggested). The `ZuluWaveSchedulerEngine` (the multi-wave DAG engine, the literal autonomous-building capability) was **built Jun 15 and has NEVER been called by any loop/cron/hook** — every assessment for two months names "wire the Zulu runtime driver" as the #1 gap and it is still open. The Grok proxy that IS the one working Hermes lane is a session-bound process with no durable keepalive applied, so it silently converts to Claude whenever it dies.

**OBSIDIAN — UNDERUTILIZED, but NOT the "write-only graveyard" the older docs claim (refined by live evidence).** The WRITE path is genuinely strong (5 wired hooks). The READ path is — as of a live probe today — actually a working brain (fresh 19,871-vector sidecar built 6 min before the probe, BM25+dense hybrid wired, 37 galaxy-synthesis files regenerated today 08:18–08:24). The 3% CAG is honest. The bidirectional bridge is **also fine** (~~reverse mirror unwired~~ — CORRECTED: it is wired + live). The genuine under-delivery is narrower: (1) **6 of 20 galaxies silently dense-degrade to BM25-only** under embed load with no counter; (2) the articles' Synthesis/Connection/Contradiction layers + link hygiene are mostly ignored (**16,021–16,628 orphan notes = 23.9%, 4,136 broken wikilinks**); (3) hybrid retrieval isn't at the inject hot-path (BM25-lite only).

---

## 2. CURRENT SETUP MAP

### Hermes lane
| Component | State | Evidence |
|---|---|---|
| Grok proxy `:8645` → xAI OAuth | **INTERMITTENT** (session-bound, DOWN now; used today then died) | ECONNREFUSED; no durable task applied |
| `ask-hermes.mjs` client + 6 modes | **LIVE** (99.8% effective when proxy up) | byHook fired 857 |
| `PRISM Hermes Proxy` keepalive task | **DORMANT** (install script exists, task lapsed/unapplied) | `install-hermes-proxy-task.ps1` present; proxy still down |
| **`ZuluWaveSchedulerEngine` (C1 DAG)** | **BUILT-BUT-NEVER-RUN** | engine + 14.6KB test Jun 15; 0 runtime callers |
| `HermesAutonomousDriver` (U7, the driver) | **UNBUILT** | named in HERMES-EFFICIENCY-ROUTER |
| Ollama offload (auto-exec path) | **DORMANT** (advisory-only; `PRISM_OLLAMA_OFFLOAD_AUTOEXEC` unset) | 4808 suggested / 20 executed |
| `HermesAutomationBridge` (Bridge A, MCP) | **DORMANT** (MOCK-default, never round-tripped) | needs `PRISM_HERMES_MOCK=0`+`noMock:true` |
| Fleet launcher (Bridge B) / control bridge `:9119` / routine-plan phone | **DORMANT / UNBUILT** | no live invocation; `:9119` specced only |
| Hermes-Obsidian 15-min bridge | **FRAGILE** (orphan task, no install script, stalled 3d in June) | repetition-stall pattern |

### Obsidian — WRITE path: **STRONG / LIVE**
`chat → C: auto-memory → mirror-c-to-h.mjs (C:→H:) → memory-mirror-to-vault.mjs (real-time per file) → stop-obsidian-memory-feed.mjs (bulk every Stop) → embed-vault-on-save.mjs (nomic embed)`. All 5 wired.

### Obsidian — READ path: **LIVE but DEGRADING**
`obsidian-precheck-inject (BM25-lite/frontmatter) + memory-index sidecar (19,871 vectors, fresh) + galaxy-reasoning-bridge (BM25+dense hybrid) + CAG router`. Working — but the dense arm **silently falls to "dense-degraded" on 6/20 galaxies** (nomic-embed timeout under 32B load; `partialDense` OFF by default; no counter).

### Obsidian — REVERSE mirror (H→C): **WIRED + LIVE** ~~(verifier false-alarm: "unwired P0")~~
`h-to-c-obsidian-mirror.mjs` IS wired in PostToolUse group 0 of BOTH `C:` and `H:` settings.json (`Edit|Write|MultiEdit`), `PRISM_H_TO_C_MIRROR_DISABLE` unset, fail-soft + mtime-guarded. Operator vault edits DO flow back to C:. (The verifier enumerated a wrong/partial hook set and reported zero refs — corrected by direct settings.json read.)

### Synergy edges
| Edge | State |
|---|---|
| Octopus reads vault PSN legs (corpus) | **LIVE but gated** (`PRISM_OCTOPUS_LIVE_DISPATCH=1` required; default silent) |
| Live vault → slot-context brain line | **DORMANT** (`PRISM_OBSIDIAN_LIVE=1` off) |
| Galaxy MEMORY → graph mirror | **DORMANT** (`GALAXY_INDEX_MIRROR_ENABLE` off) |
| Octopus/outcome → WeeklySynthesis → Obsidian | **WIRED, gated** (`PRISM_WEEKLY_SYNTHESIS_OCTOPUS=1`) |
| Vault → GNN/LoRA refpool | **PARTIAL** (313 LoRA pairs + 16 GNN labels extracted; ongoing) |

---

## 3. THE ARTICLES vs OUR REALITY

| Advocated pattern (Cyril / Humza / Karpathy / ScottyBeam / Voyager) | PRISM |
|---|---|
| Self-evolving skills (harness writes skills) | **IGNORED** — curator tracks 11/749 skills, 0 archives; closed-loop unbuilt |
| Dream / self-reflect compounding loop | **PARTIAL** — dream-cycle runs (~9s over 19K memos, output today); weekly reflect gated/fragile |
| Master-orchestrator route-per-task | **PARTIAL** — slot-brief + souls built; the DAG driver that executes it is the gap |
| MCP-plugin (Hermes ← all prism_* dispatchers) | **PARTIAL** — config points at `:3100/mcp`; live round-trip unproven |
| Local-LLM-first efficiency router | **PARTIAL** — offload exists but ADVISORY (0.8% nudge take-rate); auto-route unbuilt |
| Atomic notes / one concept per file | **PARTIAL** (filenames yes; body synthesis sparse) |
| `[[wikilinks]]` as the compound layer | **IGNORED** — 23.9% orphans, 4,136 broken links |
| Low-token keyword-gated retrieval | **PARTIAL** (gating yes; session-dedup + hybrid-at-inject missing) |
| 4-layer K/C/S/I | **L1 adopted · L2 ad-hoc · L3 ignored · L4 partial** |
| Contradiction detector | **IGNORED** (unbuilt) |
| Personal capture (Telegram/webhook/voice) | **IGNORED** (inbox/ empty) |
| Graph hygiene / no orphans | **IGNORED** (no heal cron) |
| Literature→Permanent note distinction | **IGNORED** (vault is ~all literature-class episodic) |
| Daily push-brief (insight, not pull) | **IGNORED** (`DailyFlashReportEngine` email = `console.log("Would email…")` stub) |

---

## 4. UNDERUTILIZATION FINDINGS (numbered)

- **F1 (P1, corrected from P0) — Hermes autonomous DAG driver glue missing (engines ARE built + dispatcher-wired).** VERIFIED live: `ZuluWaveSchedulerEngine.allWaves/computeWaveN` are wired into `sessionDispatcher` (`schedule_wave`/`compute_wave` actions, sessionDispatcher.ts:3997-4005) and imported by `HermesGoalDecomposerEngine` + `ZuluDelegationContractEngine` + `HermesParallelFanoutPlannerEngine`. ~~0 runtime callers~~ → they ARE on-demand callable. The real gap: **no cron/hook/loop AUTONOMOUSLY drives the chain** (parent goal → decompose → schedule_wave → spawn waves → review → aggregate → self-correct). `HermesAutonomousDriver` (U7) — the connective tissue over the EXISTING dispatcher actions — is the unbuilt piece (NOT the engines). So this is driver-glue + agent-spawn execution, not a from-scratch engine. **Owner: bravo (hermes-zulu builder). Effort: M. Brief: `HERMES-AUTONOMOUS-DRIVER-BRIEF-2026-06-22.md`.**
- **F2 (P0) — Grok proxy is session-bound, not a durable service.** Down now; no `PRISM Hermes Proxy` scheduled task applied (install script exists, unrun). Every Hermes call silently → Claude when it dies. Root: `hermes proxy start` is a foreground process; keepalive task lapsed. **Owner: operator (run elevated install) + zulu (verify). Effort: S.**
- **F3 (RESOLVED — was a false P0).** ~~H→C reverse mirror unwired~~ → VERIFIED WIRED + LIVE in both settings copies, not disabled. No action. The verifier inferred "unwired" from a wrong hook enumeration. **No owner — closed.**
- **F4 (RESOLVED — already applied).** `PRISM_OLLAMA_OFFLOAD_AUTOEXEC` is already `"1"` (both settings copies) + `PRISM_OLLAMA_ROUTE_AUTO=1`. Autoexec is ON and offload is STILL 22%, so autoexec is NOT the lever. The real reason the 62:1 loss persists: autoexec only fires for SAFE_AUTOEXEC categories WITH a file target (a narrow slice), and even then emits an imperative directive the model must act on — the bulk of suggestions are non-SAFE/fileless advisory the model ignores. **The lever is widening true auto-route coverage + F5/F2, not this knob. Owner: alpha. Effort: M.**
- **F5 (P2 — intermittent, lower severity than first framed).** qwen2.5-coder:32b prewarmed in **623ms** (already resident); the 14.9s was transient VRAM eviction under concurrent 32B fleet load. Root: no durable resident-model pin → eviction under contention. **Owner: alpha. Effort: S (ollama-server `OLLAMA_KEEP_ALIVE` pin / recurring prewarm cron). Zulu prewarmed+pinned it 30m this session as a stopgap.**
- **F6 (P1) — 6/20 galaxies dense-degrade silently to BM25-only.** `galaxy-reasoning-bridge` pushes "dense-degraded" when nomic-embed times out; `partialDense` off; no counter. Root: embed starvation under concurrent 32B load. **Owner: india/alpha. Effort: S (`PRISM_GALAXY_RAG_PARTIAL_DENSE=1` + track the bucket).**
- **F7 (P1) — Synthesis/distill crons never registered (elevation-blocked).** `weekly-memory-synthesis`/`run-daily-context`/`run-knowledge-distillation` built 6/09, `Register-ScheduledTask` denied 0x80070005, never run. (Galaxy-synthesis-refresh runs another way — 37 files today — but the dedicated distill stack is dark.) **Owner: operator (one elevated shell). Effort: S.**
- **F8 (P1) — Hybrid retrieval at the inject hot-path under-provisioned.** obsidian-precheck-inject is BM25-lite/frontmatter-only; Qdrant+nomic live but not the inject path. Est. +35–49% fewer failed retrievals with BM25+dense+RRF. **Owner: alpha. Effort: M.**
- **F9 (P2) — 23.9% orphan epidemic + 4,136 broken wikilinks.** Stop-hook writes prose without enforcing links; no scoped link-heal. (Blind 16K auto-link would poison the graph — needs incremental.) **Owner: alpha. Effort: M.**
- **F10 (P2) — Shop-floor morning brief never wired** (`DailyFlashReportEngine` email is a stub; all synthesis points at the dev-brain, not shop reality). The highest-leverage real-world 2nd-brain app for a CNC shop is missing. **Owner: hotel + alpha. Effort: M.**
- **F11 (P2) — Hermes bridges dormant**: Bridge A MOCK-never-round-tripped, Bridge B never live, control-bridge `:9119` unbuilt, routine-plan phone delivery idle, `hermes mcp serve` reverse channel unbuilt. **Owner: bravo/zulu. Effort: M–L.**
- **F12 (P2/P3) — Personal-capture layer + contradiction detector + per-slot 6-integration wiring + HMEMV01-03/05 + status-tag taxonomy** all specced, unbuilt. **Owner: alpha (+india for memory-router-intercept HMEMV05). Effort: L.**
- **F13 (P3) — Boot fragility**: venv-lock on auto-update, Electron renderer restart loop (broken GUI), scheduled-task repetition-stall, CLI 312 commits behind (operator-gated). **Owner: operator + bravo.**

---

## 5. REMEDIATION ROADMAP (dependency-ordered)

### Tier 0 — cheap, today, highest leverage (F3 + F4 were already done — removed)
1. **Apply the durable `PRISM Hermes Proxy` keepalive task** (F2) — `powershell -File .claude/helpers/install-hermes-proxy-task.ps1 -RunNow` (elevated). Done-signal: `:8645` stays up across sessions. **Operator action (elevation).** ← the single biggest live-reliability win for Hermes.
2. **Durable Ollama resident-model pin** (F5) — set `OLLAMA_KEEP_ALIVE` on the ollama-server launcher / add a recurring prewarm cron. Done-signal: 32b warm-response <3s under fleet load. Owner: alpha. (Zulu prewarmed it 30m as a stopgap this session.)
3. **`PRISM_GALAXY_RAG_PARTIAL_DENSE=1` + track dense-degraded** (F6). Done-signal: dense-degraded galaxies <2/20. Owner: india/alpha.
4. **Register the synthesis/distill crons** (F7) — 4 elevated install commands. **Operator action.**

### Tier 1 — the real builds
7. **Build `HermesAutonomousDriver` (U7)** → decompose task → `ZuluWaveSchedulerEngine.allWaves` → per-wave Agent batches → synthesize (F1). The autonomous-build keystone. Owner: bravo+zulu. Effort: M.
8. **Hybrid BM25+dense+RRF at the inject hot-path** (F8). Owner: alpha. Effort: M.
9. **Incremental orphan link-heal** (F9, scoped, never blind). Owner: alpha. Effort: M.
10. **Shop-floor morning-brief loop** (F10): real `NotificationEngine` + `ShopMorningBriefEngine` + cron. Owner: hotel+alpha. Effort: M.

### Tier 2 — compounding 2nd-brain layers
11. Contradiction detector, personal-capture inbox, per-slot 6-integration wiring, HMEMV05 memory-router-intercept, Hermes bridges live-activation (F11/F12). Owner: alpha/bravo/india. Effort: L.

---

## 6. THE ONE THING

**Build `HermesAutonomousDriver` (F1) and apply the durable Hermes proxy task (F2).** With F3/F4 already in place (false alarms removed), the real story is unchanged: **Hermes is the underutilized one, and it's a wiring/durability problem, not a missing-feature problem.** The autonomous-build engine (`ZuluWaveSchedulerEngine`) exists but has never been called — wiring its driver (F1, owner bravo/zulu) turns on autonomous building, the single biggest unrealized capability. Pair it with the elevated proxy keepalive (F2, operator) so the one working Hermes lane stops dying between sessions. Obsidian, by contrast, is in better shape than feared — its remaining work (F6 dense-degrade, F9 orphans, F8 hybrid-at-inject) is incremental quality, not a broken brain.

---
_Source: 4 parallel Sonnet corpus-readers (~50 sources) + 2 adversarial live-verifiers, synthesized by slot:zulu (Opus). Live probes preferred over stale doc claims (R7). Memory: [[reference_hermes_obsidian_utilization_assessment_2026_06_22]]._
