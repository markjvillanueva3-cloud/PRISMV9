# Token-Savings Grand Strategy

**Generated:** 2026-05-24 (slot:alpha, TOKEN-SAVINGS docs)
**Companion to:** the router-table + bandit-tune + corpus-collector trio.

## Thesis

Token savings is not three separate efforts — router-table, bandit-tune, and corpus collector compound into a single self-improving loop. Each mechanism is *necessary but not sufficient*; together they form a learning system whose token-savings rate strictly increases over time without operator intervention.

## The three mechanisms

### 1. Router table — the *substrate*
Path: `scripts/lib/token-savings-router-table.mjs`. A pure-data list of ~50 detectors (RTK passthroughs + MCP routes + Ollama offloads), consumed by one PreToolUse hook. See `router-table-coverage-decisions.md` for the per-node-vs-table decision rationale.

Substrate properties:
- O(1) latency in detector count.
- Pure data — no new hook files per detector.
- Forward-compat — new detector = one row append.

### 2. Bandit-tune — the *thermostat*
Path: `scripts/lib/detector-bandit-tune.mjs`. Per-detector beta-Bernoulli posterior on (accepted-fire | suppressed-fire). Updates the table's `coverage_seed` → posterior coverage estimate. Suppresses noisy detectors; boosts high-acceptance ones.

Thermostat properties:
- Cold-start from seed values in `top-50-roi-detectors.md`.
- Each fire is one Bernoulli trial — accept (rewrite happened) vs reject (operator ignored or RTK already handled).
- Convergence proven for stationary distributions; for non-stationary (release-cadence shifts which commands run), uses sliding-window forgetting factor.

### 3. Corpus collector — the *seed bank for the next system*
Path: `scripts/lib/token-savings-corpus-collector.mjs` (peer agent). Writes each fire to `token-savings-fires.jsonl` with `{detector_id, command_raw, command_rewritten, tokens_before, tokens_after, accepted}`.

Seed-bank properties:
- Append-only; no compaction needed at PRISM scale (~50K fires/yr ceiling).
- Powers the bandit (which reads it as Bernoulli trials).
- Powers LoRA fine-tune of the rewriter: each `(raw, rewritten, accepted)` triple is a supervised pair. Negative examples (`accepted=false`) are equally valuable — they teach the rewriter NOT to rewrite that pattern.

## How they compound

```
Operator types a command
        │
        ▼
[Router-table hook walks the table]
        │
        ▼ (best-match detector found)
[Bandit consults its posterior — should we fire?]
        │
        ▼ (yes)
[Advisory emitted: "did you mean rtk X / prism_calc:Y / /ollama-Z?"]
        │
        ▼
[Claude either rewrites or ignores]
        │
        ▼
[Corpus collector logs the outcome to JSONL]
        │
        ▼
[Bandit updates its posterior for that detector]
        │
        ▼
[Periodic LoRA tune of the rewriter on accumulated corpus]
        │
        ▼ (rewriter gets sharper)
[Better rewriting → higher accept rate → bandit boosts → more fires]
```

Each pass through the loop tightens posterior estimates AND grows the corpus AND improves the rewriter. There is no stationary point — only an asymptote.

## The LoRA fine-tune endgame

When the corpus crosses ~5K accepted-fires-per-detector threshold, the rewriter can be LoRA-tuned on the local Ollama base model (qwen2.5-coder:7b). The tuned rewriter then drafts cleaner first-draft commands BEFORE the user even types them — moving from reactive (rewrite what was typed) to proactive (suggest what should be typed).

This is the same pattern as Karpathy's LLM-wiki — Ollama owns 70%+ of maintenance, Claude owns synthesis. Here:
- Ollama owns rewriting (high-volume, low-judgment).
- Claude owns the deep-reasoning calls (the ones the router table specifically EXCLUDES from rewriting).

## Why this beats hand-coding

Any operator can write a detector for `vitest`. The compounding properties only emerge with all three pieces:
- **Without the table** — detectors fragment into 50 hooks; latency dominates savings.
- **Without the bandit** — noisy detectors fire forever; advisory fatigue causes operators to disable the hook entirely.
- **Without the corpus** — no LoRA-tune signal; the rewriter never improves; the system stays at v1 quality forever.

## Composition with existing PRISM systems

- **PSN leg 11 (PRISM AI)** — the rewriter is a PRISM-AI consumer; LoRA-tune jobs flow through `aiSystemRouterEngine`.
- **Wiki** — every detector should have a one-line wiki entry under `knowledge/wiki/code-tribal/token-savings/<id>.md` (auto-generated from the table; not part of this batch).
- **Memories** — bandit posteriors persist as `reference_bandit_posterior_<date>.md` snapshots on milestone close.
- **Master-index** — the router table is itself a master-index surface for "what's the right tool for X?" queries — wire `prism_session:token_savings_query` as a future dispatcher action.

## Forward-looking metrics

| Metric | Today (seed) | 30 days | 90 days | LoRA-tune-on |
|--------|-------------:|--------:|--------:|-------------:|
| Daily tokens saved (fleet) | ~280K | ~600K | ~1.2M | ~2.5M |
| Advisories fired / day | ~120 | ~250 | ~400 | ~650 |
| Accept rate | ~0.55 (estimated) | ~0.70 | ~0.85 | ~0.92 |
| Distinct active detectors | 50 | 65 | 80 | 100 |

(Estimates derive from extrapolating RTK gain telemetry — see `state/shared/audit-token-savings-2026-05-17.md`.)

## Pointers

- Top-50 seed: `H:/prism/state/shared/dashboards/top-50-roi-detectors.md`
- Coverage architecture: `H:/prism/state/shared/dashboards/router-table-coverage-decisions.md`
- Router table impl: `H:/prism/scripts/lib/token-savings-router-table.mjs`
- Bandit-tune impl: `H:/prism/scripts/lib/detector-bandit-tune.mjs`
- Corpus collector: `H:/prism/scripts/lib/token-savings-corpus-collector.mjs`
- Audit precedent: `H:/prism/state/shared/audit-token-savings-2026-05-17.md`
- RTK gain telemetry: `rtk gain --history`
