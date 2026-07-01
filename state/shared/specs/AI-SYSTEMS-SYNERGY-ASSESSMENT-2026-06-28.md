# AI-Systems Synergy Assessment — "All-in-One Neural Network of Everything"

> **Slot:** india (AI-systems galaxy) · **Date:** 2026-06-28 · **Branch:** cad-fusion-live-ms0
> **Method:** 4 parallel sonnet assessment agents (engine inventory · PSN knowledge substrate · octopus/Hermes/Ollama routing · pipelines/auto-wiring) + live probes. Every concrete claim is file:line-cited in the source agent digests; counts are exact (glob/stat-verified). R12: failures stated explicitly.
> **Operator work order:** assess the current H: AI/AGI/LoRA/DL/ML/NN/GNN/CAG/RAG database + its synergy with Obsidian/Hermes/Claude-CLI/agents/CLAUDE.md/GSD/memories/skills/souls/system-viz/graphs/indexes/dispatchers/pipelines/slash-commands/learning-pipelines/CAD-gen/print-read/doc-read/auto-storage/auto-synergize — toward an all-in-one NN that communicates, trains, learns, collaborates, thinks-ahead, and **reasons before any action** using Ollama offload + local LLM + Claude, **utilizing octopus**.

---

## TL;DR verdict

**The parts list for the "all-in-one neural network of everything" almost entirely EXISTS. What does not exist is the unification: a single automatic, reason-before-action control plane that actuates the substrate.**

PRISM today is a very rich **collection of powerful but mostly advisory-or-dormant AI components**, not a unified network. The gap between current state and the operator's vision is **INTEGRATION + ACTUATION + GATING + SCHEDULING**, *not* raw capability. Three numbers capture it:

| Signal | Now | Target | Meaning |
|---|---|---|---|
| Ollama offload rate | **5.9%** (6/96) | — | **CORRECTED 2026-06-28: mostly a MEASUREMENT ARTIFACT, not a defect** ([[feedback_advisory_offload_telemetry_not_a_gap]] + [[feedback_adopt_ollama_offload_directives]]). Advisory hooks are *designed* to nudge, not offload (`offloaded:0` is correct + self-mutes via `advisory-decay.mjs`); the real converters (`ollama-task-offloader` auto-exec, `ask-hermes` ~479k saved) work; most "kept" are correctly kept (safety/orchestration). Real sliver = ⚡-directive ADOPTION on file-target mechanical tasks (behavioral, not an engine). |
| GNN tier-5 deploy gate | **FAIL** (AUROC 0.7525 < 0.78; F1 0.283 < 0.55; Brier 0.22 > 0.15) | pass OR selective-promote | The only autonomous classifier in the cascade is research-only. |
| Automatic reason-before-action gate | **0** (caller-explicit only) | PreToolUse octopus gate | "Reasons before any action" — the core of the vision — has **no wiring at all** yet. |

The substrate is ~85% present; the **control plane is ~15% built**. This is good news: the expensive part (the engines, corpora, models, consensus core) is done.

---

## 1. What EXISTS (the substrate is strong)

### AI/ML engine surface — verified counts
| Category | Count | Notes |
|---|---|---|
| LoRA / fine-tune engines | **94** | lathe/mill/CAM/blueprint/5-axis/grinding adapters + infra (EWC++ ContinualLoRA, FederatedLoRA, AdaLoRA rank allocator) |
| CrossProcess neural fleet (tiers 2–12) | **55** | episodic memory, online/drift, RL, Bayesian/conformal, FedAvg, MAML-lite, neuro-symbolic, causal graph, multimodal, active learning |
| Reasoning / creative | **40** | `PRISMCreativeReasoningEngine`, `CausalReasoningEngine`, counterfactual, diagnostic |
| Deep-learning bridges | **37** | `PhysicsNeuralBridgeEngine`, `CrossProcessDeepEnsembleEngine`, domain neural intelligence |
| RAG / retrieval | **13** | per-domain RAG + `SFCRAGWarmStartEngine`; galaxy-reasoning-bridge is the live surface (sparse→nomic-embed rerank→RRF) |
| Consensus / **octopus** | **12** | `MultiModelConsensusEngine.ts` (1552 lines, REAL — `ask()` :593, Jaccard scoring, Obsidian+audit-log persistence) + fact-checker/perf/audit |
| Embeddings / vector | **10** | ONNX 384-d + HNSW native; 768-d node embeddings for GNN |
| GNN / graph-NN | **1 .ts + 7 scripts** | `GnnDeployStatusEngine.ts` + `graphsage-trainer/predictor/model.mjs` + active-pool selector |

### Dispatcher surface — ~977 AI/ML actions (digest undercounts by ≥377 — two generator bugs)
- `prism_intelligence` **525** · `prism_ai` (aiReasoningDispatcher) **~300** · `prism_ml` **80** (digest wrongly says 0) · `prism_algorithm` **69** ML primitives · `prism_doc_learn` **5**.
- Full `xproc_*` CrossProcess tiers 2–12 routed via `XPROC_ROUTES` (138 entries), dual-exposed on `prism_ai` + `prism_intelligence`.

### Knowledge / PSN substrate — large and FRESH
| Leg | State |
|---|---|
| Obsidian brain | 6,643 C: auto-memories + 22,042 H: mirror; auto-fed every Stop (`stop-obsidian-memory-feed.mjs`, wired) |
| Wiki | 46,856 files; `index.md` 295KB, updated **today** |
| Tribal | **134,567 entries**, ~2GB sharded, regenerated **today** |
| System-viz graph | **376,619 nodes**, 861MB graph + sidecars, regenerated **today**; master-index inject wired |
| NN/GNN | research-only (gate fail, below) |
| PRISM-AI router | `aiSystemRouterEngine.route()` live; CAG router COLD/HOT/HYBRID |

### Model fleet — live (`127.0.0.1:11434`, 17 models)
`gpt-oss:120b`, `gpt-oss:20b`, `qwen2.5-coder:32b/14b/7b/1.5b`, `qwen3-coder:30b`, `deepseek-r1:32b/14b`, plus 6 vision models (qwen3-vl, qwen2.5vl, llama3.2-vision, moondream). **Octopus voices now available: Claude + Ollama-local panel + Grok (Hermes :8645 restored this session).**

---

## 2. What's BROKEN / DORMANT / UNWIRED (the gap = the control plane)

> Ranked by leverage toward the vision. Each is the *integration* that turns existing parts into the network.

**G1 — No automatic "reason-before-action" gate (THE core vision gap).**
Octopus (`MultiModelConsensusEngine`) is **caller-explicit only**. No PreToolUse hook fires it before Write/Edit/commit/spawn. "Thinks ahead and reasons before any action" has zero wiring. The engine *supports* a `plan→PROCEED|BLOCK|REVISE` shape (Jaccard ACCEPT≥0.70 / REVIEW / ESCALATE<0.40) but nothing connects it to the tool-call path.

**G2 — ~~Router is advisory, never actuates → 5.6% Ollama offload.~~ CORRECTED 2026-06-28 (R12 — this was a metric-artifact misread).**
The initial "router never actuates → offload is broken" read is the **measurement-artifact trap** (cf. the whiskey 74%-uneconomical regression), refuted by two prior VERIFIED memories. Reality from the live `ollama-offload-stats.json`: the high-volume advisory hooks (`ollama-route-pretooluse` fired 1094, `grep-index-first` 796, `large-read-digest-advisory` 516) are **designed to nudge, not offload** — `offloaded:0` is correct-by-design and they self-mute via `advisory-decay.mjs`. The REAL converters work: `ollama-task-offloader` auto-execs (`PRISM_OLLAMA_OFFLOAD_AUTOEXEC=1`) for `summary`/`documentation`/`prism_inventory`/`prism_audit`; `ask-hermes` saved ~479k tokens. The events confirm most "kept" prompts (`safety_physics` overnight builds, `operator_directive`, `orchestration` /checkin) are **correctly kept**. The only real sliver is ⚡-directive ADOPTION on file-target mechanical tasks — **behavioral** (the model ignoring the directive), not a missing engine. `AISystemRouterEngine.route()` being advisory is therefore *fine by design*, not a gap. → [[feedback_advisory_offload_telemetry_not_a_gap]] · [[feedback_adopt_ollama_offload_directives]]

**G3 — GNN tier-5 research-only (all 3 gates fail).**
`NN-EVAL.json` (2026-06-27): AUROC 0.7525 / F1 0.283 / Brier 0.22. The documented **selective-deploy** path (AUROC 0.808 @ minConf 0.7 on the 62-ghost holdout) was validated but `grade` never flipped to `promoted`. Root cause is heterophily (GraphSAGE assumes homophily; wiring graph connects unlike types) — needs H2GCN + bigger ref-pool, not calibration.

**G4 — The two galaxies meant to HOST the unified network are empty of code.**
`mcp-server/src/engines/agent-orchestration/` and `.../ai-training/` contain **only markdown** (SOUL/MEMORY/PATHS), zero `.ts`. There is no `ReasonBeforeActionEngine`, no `CentralTrainingOrchestratorEngine`, no unified entrypoint. The 94 LoRA + 55 xproc engines are domain-scattered with no coordinator.

**G5 — Learning feeds are not auto-scheduled (data generated ≠ trained-on).**
`vault-to-lora-dataset.mjs` (245/247 feedback files) + `vault-to-gnn-refpool.mjs` exist and are correct but run **manually / pre-retrain only**. Every new fleet memory is NOT auto-propagated to the LoRA corpus. The Obsidian→LoRA pipe is a cul-de-sac.

**G6 — Tribal full-corpus rerank (PSN leg 5) is unwired.**
`tribal-rerank.mjs` can query all 134,567 entries but has **0 refs in settings.json**; only the domain-gated `tribal-by-domain-inject.mjs` fires. CLAUDE.md's "fires every UserPromptSubmit" claim is **wrong** (doc rot).

**G7 — Cross-substrate edges go stale after every graph regen.**
`generate-cross-substrate-edges.mjs` is not chained to `regen-viz`; edges (2026-06-26) lag the graph (2026-06-28), 31 `owned-by-slot` edges already skipped on shifted node IDs.

**G8 — Octopus had no live cross-provider voice (now partially fixed).**
Hermes was flagged DOWN at SessionStart (stale flag — **verified UP this session**). Codex/DeepSeek/GLM voices remain dormant (CLI not installed / API keys unset), so octopus's adversarial breadth is Claude+Ollama+Grok, not the full 7.

**G9 — Stub `aiDispatcher.ts` -- RESOLVED/CLARIFIED 2026-06-28 (R12: verified, not a live shadow).**
The 3-action stub registers the MCP tool name `prism_ai`, same as the ~977-action real `aiReasoningDispatcher`. But `registerAIDispatcher()` has **ZERO call sites** -- it was already removed from the boot path on 2026-06-13 (MCP-BOOT-FIX, `index.ts:102-103/714-715`, after it caused a real duplicate-registration boot crash under SDK 1.29). So it is **inert dead code, not a live shadowing risk**. Marked DEPRECATED with a do-not-re-wire header (`aiDispatcher.ts`, disable-not-delete) so a future chat can't re-introduce the crash. → [[reference_mcp_boot_crash_duplicate_prism_ai_2026_06_13]]

**G10 — CAG 8% hit-rate (doctrine-fingerprint churn).** 648 of 931 misses are recoverable; the cold-tier fingerprint changes faster than TTL.

---

## 3. Vision → current-state map

| Operator verb | Substrate that serves it | State |
|---|---|---|
| **communicates** | PSN injection + chat-bus + cross-substrate edges | PARTIAL (edges stale G7, tribal rerank unwired G6) |
| **trains** | LoRA/GNN retrain lifecycle | PARTIAL (not auto-scheduled G5; GNN below gate G3) |
| **learns** | closed-loop outcome backbone + vault feeds | PARTIAL (manual G5) |
| **collaborates** | octopus consensus | OPERATIONAL but breadth-limited (G8) |
| **thinks ahead / reasons before any action** | (would be) PreToolUse octopus gate | **MISSING (G1)** ← biggest gap |
| **ollama offload + local LLM** | ask-ollama + router + 17 models | LIVE but 5.6% utilization (G2) |
| **claude capabilities** | Claude CLI + agents + 26-slot fleet | LIVE |
| **utilizing octopus** | MultiModelConsensusEngine | REAL engine, caller-explicit (G1) |

---

## 4. Dependency-ordered roadmap (logical order, R13)

> Build the verifiable core before the consumers. Each tier sits on a proven foundation.

**TIER 0 — Restore full octopus breadth (hours).**
- [done] Hermes proxy restored (Grok voice live). 
- Wire `hermes-proxy-ensure.mjs` as a SessionStart hook + a no-op pre-flight inside `ask()` so octopus never silently degrades (closes G8).
- Optional: install Codex CLI / set DeepSeek/GLM keys to widen the panel.

**TIER 1 — (DEFLATED 2026-06-28, R12) Offload is mostly-solved + adoption-bound — NOT a build.**
- The "build a router actuator to lift 5.6→30%" framing was a metric artifact (see corrected G2). The infra is mature + armed; the bottleneck is the model *adopting* the ⚡ directive (behavioral). 
- ONLY buildable sliver (small, surgical, optional): widen `ollama-task-offloader` auto-exec coverage / sharpen its prompt classifier so fewer clearly-mechanical file-target tasks fall into `unknown`→keep. Not a new engine, not a "router actuator". **Low priority vs T2.**
- Net: the keystone collapses to **T2 alone** — the reason-before-action control plane, which is genuinely unbuilt and is the literal core of the operator's vision.

**TIER 2 — Build the unified control plane in the empty galaxy (G4, G1).**
- `ReasonBeforeActionEngine.ts` in `agent-orchestration/`: `plan(intent) → {PROCEED|BLOCK|REVISE, rationale, voices}`. Fast path = 2-model Ollama Jaccard panel; escalate high-risk actions to full octopus.
- Wire `prism_ai:reason_before_action` + a **PreToolUse hook** that gates high-risk actions (Write/Edit/commit/spawn) through it. Fail-open + env kill-switch. This is the literal "reasons before any action" deliverable.

**TIER 3 — Close the training loop automatically (G5).**
- Schedule `vault-to-lora-dataset.mjs` + `vault-to-gnn-refpool.mjs` (nightly durable cron) so every new memory auto-flows to the LoRA/GNN corpora. Auto-storage→consumer wiring the operator named.

**TIER 4 — Promote GNN selectively (G3).**
- Re-run `nn-graph-eval.mjs --selective --min-conf 0.7`; if it matches the June 0.808 holdout, flip `grade→promoted` for the gated operating point (abstain below). Parallel track: H2GCN retrain + ref-pool growth for full coverage (separate, longer).

**TIER 5 — Auto-synergize the knowledge plane (G6, G7, G10).**
- Wire `tribal-rerank.mjs` as a UserPromptSubmit hook (alongside domain inject). Chain `generate-cross-substrate-edges.mjs` to the tail of `regen-viz`. Tune CAG TTL to doctrine-change cadence. Correct the CLAUDE.md tribal-rerank doc-rot.

**TIER 6 — Hygiene.** Delete/rename stub `aiDispatcher.ts` (G9); fix the two DISPATCHER_DIGEST count-generator bugs.

---

## 5. Honest caveats (R12)
- This is a **read-only assessment**; no engines were modified. Tier counts are glob/stat-verified; "wired/dormant" claims are settings.json-grepped but a few (retrain-lifecycle JSONL fields) were unverifiable and are marked so in the source digests.
- The vision is a **multi-week, multi-slot fleet effort**, not a one-session build. Tiers 0–1 are same-day; Tier 2 is the keystone new build; Tiers 3–6 are wiring/scheduling.
- "All-in-one NN of everything" is best read as a **control plane over the existing substrate**, not a literal single monolithic model — the existing GNN + octopus + router + PSN already provide the "neural"/"reasoning"/"consensus"/"memory" layers; they need a unifying actuator.

---

### Source agent digests (file:line evidence)
Four sonnet agents (agentIds `abd098a027c813ffa`, `aac747b96517a8e17`, `a60665c4045aeb250`, `aa5c16a2553825ebd`) — resumable via SendMessage for any drill-down.
