# Hermes utilization — DELTA for the ScottyBeamIO "FULL GUIDE" article (2026-06-18, slot:zulu)

> **Subordinate to the canonical [`HERMES-FULL-ASSESSMENT-2026-06-17.md`]** (bravo, live-verified). This is
> NOT a fresh assessment — that one stands. This folds ONE new article the canonical §9 did not cover and
> records only the genuine delta. (R16 reconciliation: read-first caught that a standalone assessment would
> duplicate ~25 prior HERMES-* specs — same trap as commit `e6cf9b23e6`.)

## The article
- **ScottyBeamIO, "Hermes Agent FULL GUIDE: Architecture, Setup, and the Self-Improving Loop"** (x.com/ScottyBeamIO/status/2066885278451519590, Jun 16 2026, read in full via Playwright). It documents **Nous Research's Hermes Agent** product (`hermes-agent.nousresearch.com`): cloud-resident + messenger, model routing of auxiliary tasks, terminal backends, slash commands, cron+webhooks, context engines (Compressor vs LCM DAG), 8 named memory engines, and the **self-improving loop** (trigger → background review → curator).
- **It is the 4th article — NOT in canonical §9** (which folded A1 @sairahul1 context-engineering, A2 @0xCodez 14-step harness, A3 @zeuuss_01 Hermes-as-OS). Its self-improving-loop *concept* is already covered by A2's "close-the-loop" + A3's "compounding skills"; what it ADDS is concrete curator mechanics + a memory-engine taxonomy.

## Verdict: nothing in this article changes the canonical conclusion
PRISM/Hermes already implements the article's architecture at greater scale. Confirmed against alpha's
`state/shared/feature-routing-graph.json` (FEATURE-ROUTING-GRAPH-MS0): `spine.os`=hermes-agents/zulu,
`spine.brain`=Obsidian/PSN, `contextStrategies`=write/select/compress/isolate, `modelPlans`=per-task
auxiliary routing + Ollama→Sonnet→Opus ladder + octopus consensus. Memory engines: PRISM has Obsidian
(MEMORY/USER analog) + Qdrant/RAG + GNN GraphRAG (Hindsight analog) + sierra's NLI contradiction-detection
(Holographic analog) — several at once. Deployment divergence (terminal fleet vs cloud+Telegram) is intentional.

## Net-new findings (what THIS article surfaces that the canonical roadmap should note)

1. **Self-improving curator — ALREADY BUILT both sides (R12 CORRECTION 2026-06-18: my first pass wrongly called the CC side a "gap" — I grepped `curator|decay` and missed the asset NAMED `utilization-scan`; deep read-first caught the near-duplicate, the exact `e6cf9b23e6` trap):**
   - **Hermes-app side: EXISTS + RUNS** — `Hermes Skill Loop`, `Hermes GEPA Weekly`, `Hermes Self-Reflect Weekly` scheduled tasks are Ready (canonical §2/§3). This IS the article's curator/trigger loop. **Its OUTPUT is unverified** (canonical §4 blocker 5 / §7 deferral) — that is the real open item, not absence.
   - **CC-fleet side: ALSO EXISTS (NO-BUILD)** — a whole **SKILLS-UTILIZATION-MS0** + CLEANUP-MS0/U-CLEANUP-H2 milestone already built the curator: `scripts/skill-utilization-scan.mjs` (weekly Tue cron) IS the article's phase-1 — 30-day-unused → **advisory** archive candidates (never auto-moves; respects asset-preservation), reads SKILL_QUALITY_REGISTRY invocation_count_30d + mtime fallback + skill-lint → `SKILL_UTILIZATION_REPORT.{md,json}`. `scripts/skill-refinement-digest.mjs` (weekly Fri) + `SkillRefinementDigestEngine` (+ `prism_dev:skill_refinement_digest`) IS phase-2 review. Plus `skill-utilization-index`, `archived-skill-suggest`, `skill-lint-stop`, `skill-3q-gate`. Building a new curator would DUPLICATE. Verified live 2026-06-18: scan runs (schemaVersion 1, 30d window) but proposes 0 archives, and `SKILL_QUALITY_REGISTRY.json` was absent at the obvious state paths → curator is effectively **mtime-only** (matches its own "invocation_count... many entries null" caveat).
   - **Genuine residual (NOT a missing curator):** the curator's telemetry feed is sparse — `skill-usage-stats.json` tracks only **11 of 749** skills (slash-invocations since the tracker began) and the SKILL_QUALITY_REGISTRY primary signal is unpopulated. Net-new value, if pursued, = **feed real invocation telemetry into the existing curator's signal**, not a new curator. Owner: alpha (skills); small, optional.

2. **"Skill from N-iteration struggle" trigger — GAP (both sides):** the article's *skill* trigger ("10 tool-call iterations of trial-and-error → mine a reusable skill"). PRISM has `error-pattern-promote` (errors→wiki) + `skill-auto-trigger` (keyword *suggest*) but no "the agent just fought through N iterations → auto-mine a skill candidate from that transcript." Maps to the canonical's "close-the-loop / loop-output-verification" line.

3. **LCM lossless conversation-DAG context engine — divergence:** PRISM compaction is lossy (= Compressor). The article's LCM (navigable DAG of the live conversation, high-level→original messages) has no live-window analog (the system-viz graph is a knowledge DAG, not a conversation one). Research-grade; low priority.

4. **Webhook→agent primitive — PARTIAL (already in canonical roadmap-adjacent):** event→agent-spawn (GitHub PR → on-call reviewer) is weaker than PRISM's strong cron side.

## Routing (orchestrator)
- **Do NOT re-assess** — canonical 06-17 stands; its #1 buildable item is **wire the C1 Multi-Wave DAG Scheduler** (bravo). That outranks everything here.
- **CC-skill curator: NO-BUILD** — it already exists (skill-utilization-scan + skill-refinement-digest + SkillRefinementDigestEngine). The only residual is its sparse telemetry feed (11/749 tracked; registry unpopulated) → optional small task for **alpha**, NOT a new build. Then **(2) skill-from-struggle trigger** → **india/bravo**, folded into loop-output verification.
- (3) LCM + (4) webhooks: defer (sierra / papa) — low priority vs C1.

## Honest caveats (R12)
- "Hermes" = Nous's product in the article; PRISM's = its own orchestration/brain layer + a live PRISM↔Hermes bridge (echo HERMES-BRIDGE-MS0; Grok offload proven live 06-17). Assessment maps capabilities, not the product.
- Loop-output content (Hermes Skill Loop / GEPA) was NOT sampled here either — inherited deferral from canonical §7.
