# GOAL-DISCOVERY-SYNTHESIS -- 2026-06-09 (slot:alpha)

Final synthesized report for the standing /goal: *"use ultracode, /hermes-workflow,
/system-viz, obsidian app and PSN to find high value system improvements utilizing the
new PC specs, local LLMs and current PRISM config; find high value token savings +
context retention/expansion; ensure the obsidian app is fully wired + synergized to the
entire H drive; then enhance obsidian vault usage and value."*

Evidence basis: ultracode Workflow `wgypolzah` (5 agents, 1.04M tok, 4 lenses + synthesis)
+ direct execution of /system-viz, PSN, and obsidian-wiring this session + 3 shipped units.
Source memory: [[reference_ultracode_highvalue_discovery_2026_06_09]].

---

## A. High-value improvements found (enumerated)

### SHIPPED this session (3 scrutinized units)
| Commit | Unit | Value |
|---|---|---|
| `e80e6e3a41` | vision-model single-source + xray dangling-dep fix | drift-prevention across 3 OCR consumers; resolved a 5-day broken-on-clone dep |
| `89146678bf` | embed-progress honesty fix (Q2) | killed a 24.5h "running" lie; `--status` reports honest stale; context-retention integrity |
| `415941b1f0` | rtk-nudge false-positive (discovery #9) | suppresses the redundant "use rtk" nudge on already-rtk'd cmds (top classifier, 16 fires/session) |

### ALPHA-NOW queue (ranked, from the discovery -- buildable next, S/M effort)
1. pre-`*`-graph-inject dedup -- **VERIFY premise first** (pre-read-graph-inject already dedups per-path; ROI overstated).
2. wire `subagent-stop-verifier.mjs` into SubagentStop (0 refs today; R12 false-summary catch; pure registration).
5. consolidate the large-Read advisory layer (R7: 3 hooks nudge the same Read; ~1175 wasted fires).
6. append slot-scoped commits + scrutiny verdicts to MEMORY_SEED (git-grounded "do not rebuild").
7. per-slot domain-awareness SessionStart injectors -> shared session-once gate (9 hooks, ~1.8k tok/session/slot).
8. CAG cold-cache anchor reaper (2,513 files, 58% stale, 1,467 reapable).
10. CAG declared-vs-actual size drift warn (CLAUDE.md +88% over declared cache-boundary).

### DEFER-to-bravo (ollama-engine-routing -- R7, NOT alpha)
ModelRoutingEngine FLOOR realign (U3) - AISystemRouter local-first hop (U4) - ollama-task-offloader autoexec/payload-strip (U5) - ollama-prism-bridge native tool-calling (U5b, biggest single sink) - ask-ollama draft/gen-test modes (U6) - prompt-rewriter re-route (0/445 takeup) - handoff-body local compaction.

### TOP FLEET ITEM (out-of-lane, blocked)
**32,630 missing wiki embeds (83.2% dark vault)** -- highest RAW ROI (~5x the largest single recall gain) but BLOCKED on V8 512MiB string-cap index **sharding** ([[reference_tribal_index_v8_string_cap_2026_06_08]]). Owner: india/sierra (GPU embed). Sharding is the prerequisite unit.

---

## B. Obsidian app -- "fully wired + synergized to the entire H drive" (VERIFIED, with honest scope)

**WIRED + operational (verified live this session):**
- C: auto-memory -> H: knowledge feed is LIVE: **C: 3,262 .md -> H: 13,832 .md** (4.2x superset; `stop-obsidian-memory-feed.mjs` every Stop).
- Prior comprehensive verification: [[reference_obsidian_wiring_verified_2026_06_08]] (every corpus + both turn types).
- Memory-recall (A6 sidecar 11,402 nomic-768d), CAG-route, master-index, tribal-by-domain all firing this session (observed in injections).

**HONEST GAP (so "fully wired" is not overstated):**
- Wiki->tribal embedding coverage is **17.1%** (32,630 of 39,345 wiki files lack a tribal embed) -- the SEMANTIC layer over the wiki is 83% dark. Root cause = the V8 512MiB index string-cap (write-side throws); fix = sharding (india/sierra). The memory feed is fully wired; the wiki-tribal embed is not, and is blocked on a prerequisite.

---

## C. Token savings + context retention (quantified)

- **PSN cumulative: 477,500 tokens saved** (1019 hits / 385 nudges / 5301 misses, 6 ledgers; rtk dominates at 934 hits). Live read this session.
- **Largest measured sinks** (route telemetry): Read x7058 fires; doctrineSurface x4323; `isVerboseBash` x16 (top spend-summary classifier -> the #9 fix this session).
- **Shipped savings:** #9 (rtk-nudge noise), embed-progress honesty (context integrity), vision single-source (drift).
- **Biggest remaining (alpha-lane):** #5 large-Read consolidation (~170K tok/24h ceiling); #11 route-pretooluse structured-EXTRACT tier (~300-400K tok/24h, HIGH uncertainty -- needs A/B, extract-not-summarize safety invariant, bravo-adjacency check).

---

## D. PC-specs / local-LLM utilization (RTX PRO 6000 Blackwell 96GB, 10 models)

- Offload ratio ~5% (target 30%). The gap is glue+config+tier-realign, not new engines.
- The model-default optimization (make the highest LLM the per-task default WITHOUT the 120b+32b co-residency trap) is **bravo's verified U1-U7 plan** (`OLLAMA-AUTORUN-BUILDLOOP-PLAN-2026-06-09.md`). Alpha shipped its config+cleanup slice ([[reference_ollama_vision_single_source_2026_06_09]]) + pre-staged `PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1` (inert until bravo's U5).
- Alpha-lane local-LLM offload: #5's local-extract for >8KB knowledge files (reuses shipped `ask-ollama`).

---

## E. Vault-usage / value enhancements (shipped + queued)

- **Shipped this session:** 3 reference memories added to the brain (vision-single-source, ultracode-discovery, + the Q2/queue updates) -- each auto-fed to Obsidian. The ranked discovery queue is itself a high-value vault node.
- **Q-queue:** Q1 (176 tribal->vault reference nodes) + Q2 (embed-progress honesty) SHIPPED; Q3 (subagent-turn recall) + Q4-Q14 queued in [[reference_obsidian_vault_synergy_queue_2026_06_09]].

---

## F. Honest caveats + owners (R12 -- nothing fabricated, nothing hidden)
- Discovery **#1's ROI is overstated** -- pre-read-graph-inject already dedups per-path (live evidence). Re-measure per-hook before building.
- **Pre-existing test failure** (NOT this session): `mcp-route-action-hint.test.mjs` broad-Grep/master_index_query suffix fails on git HEAD (isolated via git stash) -- appendActionHints path, possibly peer-uncommitted WIP. Owner: route-suggest maintainer.
- **Fleet scheduled-tasks degraded 48->44/50:** `PRISM Zombie Reaper v2=disabled` + `Blackwell OCR Batch=stale`. Operator-only fix (elevated-shell re-register). Owner: golf/operator.
- The scrutiny arms for #9 hit a **server-side temporary rate-limit**; that unit was self-verified with honest ledger provenance (not fabricated agent verdicts).
- **CORRECTION (live-proven, R12):** the earlier claim "node-card seek is the non-OOM system-viz surface" is WRONG -- live execution this session showed `system-viz-query.mjs` OOMs on **BOTH** `find` (~380MB) **AND** `node-card` (~458MB) at the default node heap. So the entire `system-viz-query.mjs` read surface is currently heap-broken on this machine (DESKTOP-N7MI1VB) -- a NEW high-value finding (the CHEAP-NODE-ACCESS-MS0 promise of a token-cheap node read is not holding; likely the offset index `node-card-offsets.json` is missing/stale or a heavy preload runs before the seek). **Owner: sierra** (system-viz). High-ROI because it blocks the cheapest node-read path fleet-wide. Workaround until fixed: `--max-old-space-size` or read the compact sidecars directly.

## Next actions (ranked, for the next fire)
1. Alpha: re-measure #1's premise, then ship if real; ship #2 (pure registration); #5/#6/#7.
2. India/sierra: V8-cap index **sharding** (unblocks the 32,630 dark wiki embeds -- top fleet ROI).
3. Bravo: continue U3-U7 (the offload 5%->30% engine routing).
4. Operator: elevated-shell re-register of Zombie Reaper v2 + Blueprint OCR Batch.
