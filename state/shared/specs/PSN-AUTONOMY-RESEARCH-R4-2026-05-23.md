# PSN Autonomy + Self-Learning Research — R4 (2026-05-23)

> Compiled by claude-451f7328 slot:charlie /goal-9, 2026-05-23.
> Sibling to R1 (general PSN systems, commit 7636dc07bd), R2 (50+ systems in 13 categories, commit ffa7789cd8), R3 (50+ learning + reasoning systems, commit 340385c95d).
> R4 zooms in on **AUTONOMY** — how to make the PSN kernel + downstream DL/ML/reasoning units run continuously without operator intervention, and how to design a full self-learning system that improves PSN measurably over time.

---

## §1 — What "continuous + autonomous self-improvement" actually requires

A truly self-improving system needs FIVE primitives, each of which PSN has partially shipped:

| Primitive | Definition | PSN coverage today | Gap |
|---|---|---|---|
| **1. Continuous data ingestion** | Always-on stream of new training signal | Slot session logs + chat-bus + AGENT_CHAT.jsonl + commit history | No structured outcome labels — needs taxonomy |
| **2. Outcome reward signal** | Quantifiable "this was good / bad" per action | Per-engine `AtomicValue<T>.confidence` + 3-of-3 scrutiny ledger PASS/FAIL + envelope close-out flips | No unified reward function — needs ORM-style aggregator |
| **3. Automated training trigger** | Cron / event-driven re-training, no human gate | `PRISM Fleet Reaper` scheduled task exists; no DL/ML training schedule | Need nightly trainer cron + per-PR continuous retraining gate |
| **4. Safe deployment gate** | New model can't break shop-floor outputs | 3-of-3 scrutiny + Ω/S(x) gates + per-file scrutiny | Need shadow-mode A/B for new ML adapter weights before live |
| **5. Rollback / catastrophic-forgetting protection** | New training can't degrade old capability | EWC mention in `WEDMOnlineLearningEngine`; not formally enforced | Need EWC++ + per-domain frozen golden-baseline regression set |

R4's contribution: name each gap and the closing artifact below.

---

## §2 — Proven autonomous-self-learning architectures (study + adapt, don't reinvent)

| Architecture | Field | Key insight applicable to PSN |
|---|---|---|
| **AlphaZero** (DeepMind 2017) | Game-play | Self-play generates infinite training data; policy + value networks alternate. PRISM analog: octopus consensus self-plays on past audits, picks winner via 3-of-3 |
| **AlphaProof** (DeepMind 2024) | Formal math | Lean-verified solutions become training data. PRISM analog: shop-floor-verified G-code emissions become training labels |
| **Voyager** (NVIDIA 2023) | Embodied agents (Minecraft) | Skill-library compounds; agent writes new skills from past success → composes them later. PRISM is structurally Voyager-shaped already: skills + engines + dispatchers compose existing capability |
| **STaR / Quiet-STaR** (Stanford 2022-2024) | Reasoning | Self-bootstrap reasoning traces; train on correct ones; iterate. Best fit for charlie's WEDM safety-eval reasoning |
| **Self-Reward (Meta 2024)** | LLM training | Model rewards its own outputs; eliminates annotator. PRISM analog: octopus 3-of-3 is the existing reward signal |
| **REST / REST-EM** (DeepMind 2023) | LLM training | Reinforced self-training; matches RLHF without preference labels | PRISM's autonomous `/loop` is structurally REST-EM at the task layer |
| **DSPy auto-prompt optimizers** (Stanford 2023) | Programs-with-LMs | Treat prompts as parameters; optimize via BootstrapFewShot / MIPRO. PRISM analog: octopus consensus prompts become DSPy modules |
| **Karpathy software-2.0 thesis** | Compiler/runtime | Replace hand-written code with learned models tested against the same specs | The 100+ ROI-ranked PSN candidates ARE this thesis applied to manufacturing |
| **AutoML / NAS (Neural Architecture Search)** | Model design | Algorithm picks model architecture, not human | When PRISM has per-domain LoRA adapters, AutoML picks rank/alpha/target-layers |
| **Sakana evolutionary model merging** (2024) | Adapter composition | Genetic search over LoRA combinations beats hand-tuned | Pairs with PSN's per-domain slot-soul split |
| **Spec-driven self-eval (HumanEval / SWE-bench)** | Code | Held-out specs become eval suite; agent re-runs every commit | PRISM analog: the existing test suite IS this — just needs the agent-eval-on-PR loop |

---

## §3 — Autonomy primitive map for PSN (closes §1's gaps)

### Primitive 1 — Continuous data ingestion (cron + event hooks)

- **What to add:** `psn-autonomy-data-ingest.mjs` cron (every 30 min) reads:
  - `state/shared/AGENT_CHAT.jsonl` (peer-to-peer messages)
  - `mcp-server/data/state/*.jsonl` ledgers (cost-tracking, scrutiny, outcomes)
  - `git log --since=last-run` (commits with status flips)
  - `state/shared/MILESTONE_PROGRESS.json` deltas (units shipped this window)
- **Output:** appends to `state/shared/psn-training-signal.jsonl` (one JSONL line per outcome event)
- **Schema:** `{ ts, slot, unit_id, outcome: 'shipped'|'aborted'|'rolled_back', score: 0..1, signals: {...} }`
- **PRISM precedent:** Same pattern as `ollama-offload-stats.json` ingestion — proven cron architecture

### Primitive 2 — Outcome reward function (unified ORM)

- **What to add:** `PSNOutcomeRewardEngine.ts` — wraps the existing 3-of-3 scrutiny ledger + Ω/S(x) gates + envelope close-out timing into a single 0..1 reward per (slot, unit, commit) triple
- **Formula sketch:** `reward = w1·scrutiny_pass + w2·omega_score + w3·shop_floor_verified - w4·time_to_close - w5·collision_count`
- **PRISM precedent:** `MetaLearningOptimizerEngine` (already exists per master-index hit) — this is the upstream of the reward signal

### Primitive 3 — Automated training trigger (cron + GitHub Actions)

- **What to add:** Nightly trainer cron `PRISM PSN Trainer` scheduled task that:
  - Reads `psn-training-signal.jsonl` window since last run
  - Per active PSN-INCORP unit with `engine` deliverable, runs `Distilabel`-style synthetic-data prep on success-tagged outcomes
  - Triggers LoRA fine-tune on a held-out validation set
  - Emits new adapter weights to `state/shared/psn-adapters/<slot>/<date>.lora`
- **Safety gate:** new adapter MUST beat the current `golden-baseline.lora` on the per-domain regression test set before promotion

### Primitive 4 — Safe deployment gate (shadow mode + A/B)

- **What to add:** `PSNAdapterShadowEngine.ts` — for N hours, every dispatcher action that would invoke a new adapter ALSO invokes the old adapter, logs both outputs, runs the existing 3-of-3 on each
- **Promotion:** new adapter promoted to live ONLY after Wilcoxon-signed-rank test (paired-sample) shows it strictly dominates old on the per-domain regression set with p<0.01
- **Rollback:** automatic if confidence drops below per-slot threshold for >K consecutive calls

### Primitive 5 — EWC++ for catastrophic-forgetting protection

- **What to add:** `EWCRegularizationEngine.ts` — computes Fisher-information weight importance over the golden-baseline set; injects regularization term `L_total = L_new + Σ_i (F_i / 2) (θ_i - θ*_i)²` during fine-tune
- **Per-domain frozen baselines:** every successful shop-floor ship freezes its adapter into the regression set; new training MUST not regress it
- **PRISM precedent:** `WEDMOnlineLearningEngine` already mentions EWC (per envelope) — this formalizes it

---

## §4 — Continuous improvement loop (the full cycle)

```
┌─────────────────────────────────────────────────────────────────┐
│  Slot ships unit X     →   commit + envelope flip + 3-of-3 PASS │
│                            (PRIMITIVE 1: data ingest)           │
│                                  ↓                              │
│  psn-autonomy-data-ingest.mjs  →  psn-training-signal.jsonl     │
│                                  ↓                              │
│  PSNOutcomeRewardEngine.score(X) → reward ∈ [0..1]              │
│                            (PRIMITIVE 2: reward)                │
│                                  ↓                              │
│  Nightly: PSN PSN Trainer cron picks high-reward outcomes       │
│    → Distilabel synth-data prep                                 │
│    → LoRA fine-tune per slot domain (charlie's wire adapter)    │
│                            (PRIMITIVE 3: trigger)               │
│                                  ↓                              │
│  PSNAdapterShadowEngine: N-hour shadow mode                     │
│    → Wilcoxon signed-rank vs golden-baseline                    │
│    → promote OR rollback                                        │
│                            (PRIMITIVE 4: safe deploy)           │
│                                  ↓                              │
│  EWCRegularizationEngine ensures no regression on               │
│   prior shop-floor-verified outcomes                            │
│                            (PRIMITIVE 5: forgetting protection) │
│                                  ↓                              │
│  Next iteration uses the better adapter ───┐                    │
│                                            └─→ (back to top)    │
└─────────────────────────────────────────────────────────────────┘
```

Each loop iteration = 24h. After 30 cycles (≈1 month), PSN has:
- Per-slot adapters trained on real shop-floor outcomes
- Verified-better than baseline (statistical gate)
- Catastrophic-forgetting protected (EWC++)
- No human in the loop except for the operator-set rules

---

## §5 — Concrete deliverable: kickstart artifact

The full system above is ~5-10 weeks of focused work. R4 ships **the smallest credible kickstart** — a cron-style script that does Primitive 1 + tiny version of Primitive 2 so the data starts accumulating immediately:

- `scripts/psn-autonomy-data-ingest.mjs` — reads MILESTONE_PROGRESS + scrutiny ledger + cost-tracking, appends to `state/shared/psn-training-signal.jsonl`. Runs idempotently (skip if last-run timestamp inside window).
- Wired by scheduled task `PRISM PSN Autonomy Ingest` (operator registers via install script).
- Once data accumulates, the next charlie/peer session implements Primitive 2-5.

---

## §6 — Top-10 R4 picks (autonomy-only, RGS-ready)

1. **psn-autonomy-data-ingest.mjs** (S, this iter) — start data accumulation
2. **PSNOutcomeRewardEngine** (M, next iter) — unified reward function (3-of-3 + Ω + shop-floor + time)
3. **scheduled task `PRISM PSN Autonomy Ingest`** (S) — runs §1 cron every 30 min
4. **scheduled task `PRISM PSN Nightly Trainer`** (M) — runs §3 trainer once per night
5. **PSNAdapterShadowEngine** (M) — N-hour A/B before promotion
6. **EWCRegularizationEngine** (M) — Fisher-information weighting during fine-tune
7. **Golden-baseline regression set** per slot (S) — every shop-floor-verified output frozen
8. **DSPy auto-prompt-optimizer cron** (M) — nightly MIPRO over octopus consensus prompts
9. **Continuous integration of Sakana evolutionary merging** (M) — every week, merge top-k LoRA adapters per slot
10. **Self-eval dashboard** (S) — surfaces per-slot adapter accuracy trend, last-train-timestamp, promotion gates passed

Total: ~6-8 weeks for full implementation. R4 ships #1 now.

---

## §7 — Cross-refs

- R1: PSN-HIGH-ROI-SURFACE-AUDIT-2026-05-23.md (general PSN systems)
- R2: PSN-INCORPORATION-RESEARCH-R2-2026-05-23.md (13 categories, 50+ systems)
- R3: PSN-INCORPORATION-RESEARCH-R3-LEARNING-REASONING-2026-05-23.md (learning + reasoning deep dive)
- Envelope: PSN-INCORPORATION-MS0 (105 units, commit 4606d6066a)
- Kernel: PSNIncorporationOrchestratorEngine + 5 prism_dev actions (commit 84c5010fd1)
- [[feedback_psn_definition]] — 11-leg PSN canonical map
- [[feedback_always_capture_lessons]] — outcome ingestion anchor (Primitive 1)
- [[reference_octopus_consensus_ms1_2026_05_18]] — reward-signal upstream (Primitive 2)
- [[reference_fleet_reaper]] — proven cron architecture (Primitive 3 precedent)
