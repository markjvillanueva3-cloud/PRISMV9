# Per-Slot Closed-Loop Integration — India as the meta-bus

> Operator directive 2026-05-28: *"india and several of the domains are building internal rag/cag closed loop learning systems make sure they build like india since thats its primary domain. any chat currently building a closed loop training, self improving and self learning system should tie into india's work"*

## The unifying rule

**India owns the meta-substrate. Every domain slot building closed-loop self-improvement consumes india's bus + writes its own feedback through india's surfaces.** No parallel feedback buses. No per-slot LoRA training loops that bypass india's drift-canary. No per-slot RAG pipelines that bypass india's outcome ledger.

Per-domain optimization stays per-slot. **Learning signal goes through india.**

## The 4 india-canonical surfaces (every closed-loop slot consumes)

Per `reference_khairallah_5layer_context_engineering_2026_05_28` + india's own galaxy (`engines/ai-training/CLAUDE.md`):

1. **OutcomeFeedbackBus** (`prism_intelligence:xproc_outcome_*` + `state/shared/outcome-bus.jsonl`)
   Every slot's tool-call outcomes (success/failure/quality) land here. Used to train every model layer — GNN, LoRA, MetaLearning, calibration.
   - **Closed-loop slot must:** publish via `xproc_outcome_publish` after every meaningful action.
   - **India's contribution:** `outcome-bus-auto-tap.mjs` PostToolUse hook (per india's #1 agent rec) — auto-publishes from every Edit/Write/Bash if not already manually published. Strips the manual step.

2. **NN-GRAPH wiring-inference + retrain lifecycle** (`prism_intelligence:xproc_neural_*` + `nn-graph-retrain-lifecycle.mjs`)
   GraphSAGE GNN as tier-5 wiring classifier; per-slot domain models can plug in as additional tiers (e.g. mill-specific LoRA as tier-6 on top of GNN tier-5).
   - **Closed-loop slot must:** feature-vector its domain assets (engines, sequences, tools) for GNN consumption. India's `xproc_kg_project_features` action is the canonical encoder.
   - **India's contribution:** drift detection + retrain triggers. Slots don't decide when to retrain — india does, fleet-wide.

3. **RAG / Tribal corpus** (`prism_knowledge:tribal_*` + `xproc_rag_features`)
   Per-domain tribal tips feed retrieval-augmented generation for that domain's slot. India runs the embedding model + indexing; slots write tips through canonical `tribal_capture`.
   - **Closed-loop slot must:** write tips via `prism_knowledge:tribal_capture` slot=<slot> — NOT direct markdown writes to `knowledge/tribal/*.md` (auto-overwritten on regen per `mike-tribal-tip-source-guard` recommendation).
   - **India's contribution:** RAG quality scoring (`xproc_rag_features`) + per-slot embedding-cache management.

4. **Calibration monitor + conformal prediction** (`prism_intelligence:xproc_calibration_monitor_*` + `xproc_conformal_*`)
   Every per-slot recommendation (speed/feed, toolpath strategy, quote price, etc.) ships with a conformal prediction interval. India tracks ECE drift + recalibrates.
   - **Closed-loop slot must:** record predictions + actuals via `xproc_calibration_monitor_record`.
   - **India's contribution:** drift detection → recalibration cron + alerting on ECE > threshold.

## Per-slot closed-loop checklist

For every domain slot building self-improving/self-learning behavior, the slot's `engines/<galaxy>/CLAUDE.md` MUST declare these 4 wires:

```markdown
## Closed-loop integration with india (CANONICAL)

This galaxy participates in india's fleet-wide learning loop:

- **Outcome publishing:** every <domain> action publishes via `xproc_outcome_publish` with `slot: <slot>`, `domain: <galaxy>`. Auto-fired by `outcome-bus-auto-tap.mjs` if not manually called.
- **Feature emission:** <domain> engines emit feature vectors via `xproc_kg_project_features` so india's GNN can classify them.
- **Tribal capture:** all <domain> learnings written via `prism_knowledge:tribal_capture slot=<slot>` — NEVER direct MD writes.
- **Calibration:** every <domain> recommendation that ships ALSO records actuals via `xproc_calibration_monitor_record` so india's drift-canary can detect when retraining is due.

When in doubt about CADence, retraining triggers, or model rollout — **defer to india's surfaces**; do not roll your own.
```

## Per-slot mapping (which slots have closed-loop coverage)

Per operator's enumeration:

| Slot | Domain | Closed-loop scope | India-wire status |
|------|--------|-------------------|--------------------|
| **foxtrot** | mill | adaptive feed/speed, chatter prediction, tool-life Weibull | Has MillScientificPipelineEngine + AdaptiveControlEngine; needs OutcomeFeedbackBus auto-publish wire |
| **whiskey** | lathe | adaptive turning, lathe LoRA (lathe-lora dispatcher actions), G50/CSS auto-tune | Has lathe-lora ledger + adaptive engagement; needs india's drift-canary integration |
| **mike** | wedm | wire-break Weibull prediction, multi-pass cycle learning, recast-layer correction | Has WEDM_OUTCOME_LEDGER + ML-Optimize; needs auto-publish to fleet OutcomeFeedbackBus (currently slot-local) |
| **xray** | blueprint-vision | OCR confidence calibration, multi-print classifier retrain, GD&T parse error patterns | NEW (galaxy shipped 2026-05-28); should design closed-loop FROM india's bus from day-1 |
| **charlie** | quoting | quote-vs-actual calibration, bid-to-win learning, customer-knowledge graph drift | Has bid-to-win + ActualCostEngine + quote analytics; needs `xproc_calibration_monitor_record` per quote |
| **hotel** | business (ERP) | per-job cost variance learning, payroll prediction, KAIZEN cycle learning | Has erp-quality + actual-cost; needs OutcomeFeedbackBus wire for ERP-side events |
| **oscar** | sfc (speed-feed) | per-material × tool calibration, online learning per cut, prior adaptation | Has speedfeed-dl + adaptive-physics-bridge; needs unified outcome publish |
| **echo** | post-processor | dialect-quirk learning, controller-specific bug pattern memory | Has post-bridge-synergy; needs tribal-capture for every fix |
| **delta** | cad | per-format parser confidence, CAD-system bridge reliability | Has cad-feedback-buffer + cad-outcome-stats; needs unified outcome publish |
| **kilo** | cam | toolpath strategy outcome learning, per-CAM-system quirk retention | Has cam-feedback + cam-replay-stats; needs unified outcome publish |
| **india** | ai-training | THE META — owns the bus, retrain cadence, drift canary, ensemble vote | OWNS the substrate |

## What india ships first (per its own #1 agent recommendation)

**`outcome-bus-auto-tap.mjs`** — PostToolUse hook that taps every Edit/Write/Bash outcome across the fleet into OutcomeFeedbackBus as labeled training rows.

Impact: the fleet generates ~5000 outcomes/day silently discarded. With this single hook, every other slot's closed-loop instantly has 5000×/day labeled training signal without operator action.

Plus india's #4 (`lora-drift-canary-eval.mjs`) — gives every domain LoRA an observable freshness signal so deploy-gate can be automated.

These two ship first; every domain slot's closed-loop integration becomes trivial once they exist.

## What each domain slot ships (from agent recommendations)

| Slot | First ship | Why | Source |
|------|-----------|-----|--------|
| foxtrot | `mill-kienzle-inline-guard` | PreToolUse hardblock on inlined physics constants; safety-critical | foxtrot agent rec #1 |
| mike | `mike-tribal-tip-source-guard` | PreToolUse hardblock on edits to auto-regenerated tribal MDs | mike agent rec #5 |
| charlie | `charlie-customer-name-noise-collision-block` | PreToolUse hardblock with anti-regression corpus | charlie agent rec #2 |
| india | `outcome-bus-auto-tap.mjs` | Meta-fix — unlocks closed-loop for ALL slots | india agent rec #1 |

Each is <2hr ship, single PreToolUse/PostToolUse hook, no new infrastructure required.

## What goes on each slot's CLAUDE.md (universal addition)

Append to every `engines/<galaxy>/CLAUDE.md` (template below; per-slot fills in `<domain>` + `<slot>`):

```markdown
## Closed-loop integration with india

This galaxy participates in india's fleet-wide learning loop per
`state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`:

- **Outcome publishing:** every <domain> action publishes via
  `xproc_outcome_publish {slot: '<slot>', domain: '<galaxy>'}`.
  Auto-fired by `outcome-bus-auto-tap.mjs` if not manually called.
- **Feature emission:** <domain> assets emit features via
  `xproc_kg_project_features` for india's GNN tier-5 classifier.
- **Tribal capture:** all learnings via `prism_knowledge:tribal_capture
  slot=<slot>` — NEVER direct markdown writes.
- **Calibration:** every shipped recommendation records actuals via
  `xproc_calibration_monitor_record` so india's drift-canary fires
  retrain candidacy at the right time.

When in doubt about retrain triggers, model rollout, or feedback loop
design — defer to india's surfaces; do not roll your own.
```

## Validation

A galaxy's closed-loop is "india-integrated" iff ALL 4 wires return true:

```bash
# 1. Outcome publishing wired
grep -l "xproc_outcome_publish" mcp-server/src/engines/<galaxy>/

# 2. Feature emission wired
grep -l "xproc_kg_project_features\|featureVector\|emit.*feature" mcp-server/src/engines/<galaxy>/

# 3. Tribal-capture path used (not direct MD writes)
grep -l "prism_knowledge:tribal_capture\|tribalCaptureEngine" mcp-server/src/engines/<galaxy>/

# 4. Calibration record wired
grep -l "xproc_calibration_monitor_record\|conformal" mcp-server/src/engines/<galaxy>/
```

A galaxy returning <4 hits has gaps that should be filed as P0 wiring units.

— Spec established 2026-05-28 by slot:alpha (a198ff5f) per operator directive on fleet-wide closed-loop unification through india.
