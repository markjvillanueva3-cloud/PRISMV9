---
name: reference_domain_closed_loop_train_2026_06_11
description: Per-domain background closed-loop LoRA training orchestrator (U-DCLT-1, slot:sierra) -- composes Ollama + india's bus + tango's QLoRA trainer; the missing unified per-domain runner.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.555Z
aliases: reference_domain_closed_loop_train_2026_06_11
---


# Per-domain closed-loop training orchestrator (U-DCLT-1, 2026-06-11, slot:sierra)

Answer to operator: *"link up ollama with the prism ai system. can we run the closed loop training for each domain in the background?"* -> **Yes; ~70% already existed. Ollama was ALREADY linked (21 verified inference call-sites). The gap was a unified PER-DOMAIN BACKGROUND runner.** Built it as `scripts/domain-closed-loop-train.mjs` (commit `d1328e3039` on `slot/sierra`).

## What it is
Per domain (all 34) it: **assemble** an Alpaca corpus (from `state/shared/lora/bridge-reasoning/<domain>.jsonl` + galaxy-filtered `galaxy-synthesis-lora-*.jsonl` / `vault-galaxy-synthesis-dataset.jsonl`) -> **gate** (corpus-size >= 30 AND new-rows >= 10 AND free-VRAM >= 12GB AND single-GPU-lock free) -> **train** via `scripts/fleet_lora_train.py --corpus <d> --out <adapter> [--dry-run]` -> **feed** a training outcome to india's canonical `state/shared/outcome-bus.jsonl` -> **state** to `state/shared/lora/domain/<d>-state.json` + `training-runs.jsonl`.

CLI: `node scripts/domain-closed-loop-train.mjs --list | --domain <d> [--train] [--force] [--json] | --all`. Dry-run is DEFAULT (no GPU). Background: `.claude/helpers/install-domain-train-task.ps1` (OPERATOR-GATED -- dry-run unless `-EnableRealTrain`).

## The train-vs-infer reality (key technical point)
**Ollama does inference, NOT gradient training.** Its role in the loop = generate/score/label (it already produces the per-domain bridge-reasoning + galaxy-synthesis corpora via qwen2.5-coder:32b / gpt-oss:20b). **`fleet_lora_train.py`** (slot:tango, 2026-06-11) is the real QLoRA gradient trainer, VRAM-safe to coexist with resident Ollama (~24GB free; rank<=16 7-8B ~6-10GB, no eviction). blueprint-vision was the ONLY pre-existing complete Ollama->train->schedule loop (`ocr-closed-loop.mjs` -> `blueprint_vl_train_lora.py`); this generalizes that pattern.

## india boundary (R8 -- consumed, NOT reinvented)
Per `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` + `engines/ai-training/CLAUDE.md`: **india owns the meta-substrate; consumers wire INTO india.** This orchestrator CONSUMES `outcome-bus.jsonl` (63K live rows) + `fleet_lora_train.py` + defers promotion to india's drift-canary. It builds only the ORCHESTRATION + SCHEDULING + (future) system-viz roost (sierra-appropriate). [[reference_india_domain_awareness_2026_05_28]]

## Live findings (R12)
- Ollama->AI link is ALREADY comprehensive (4 layers: OllamaHookBridgeEngine, prism_local:local_generate offload, MultiModelConsensusEngine, OllamaEmbedderEngine; 21 sites, all inference).
- Per-domain corpora are SMALL: bridge-reasoning alone = 3-5 rows/domain; + galaxy-synthesis = 13-44. ~19 of 34 clear MIN_ROWS=30; ~15 correctly DEFER `insufficient-corpus`. **This empirically confirms india's #1 guidance: "drive emission, don't just train" -- the bottleneck is corpus growth, not compute.**
- mill dry-run proven end-to-end: trainer exit 0, 35 rows, ALL advisory-weighted, india bus fed.

## Latent bug found + fixed (R7 trust)
bridge-reasoning + galaxy-synthesis rows are machine-generated (`metadata.advisoryOnly:true`, or untagged) -> `fleet_lora_train.py:resolve_sample_weight` would train them at VERIFIED weight 1.0. Fix: `inferWeight` treats any advisory marker as a TRUST CEILING (`Math.min(weight, 0.5)`) so machine synthesis can never train as ground truth.

## Scrutiny (per-file gate)
2 rounds x 2 reviewers. Round 1 FAIL -> fixed 2 P0 (cross-process GPU-lock race: atomic `openSync(wx)` + pid-liveness steal; path traversal via `--domain ../`: `assertDomain` slug guard) + 3 P1 (advisory-weight leak; defer-marked-success bus pollution -> `success` only true on real train; silent `--force` VRAM bypass -> loud + ledgered) + P2 (lock-leak window; stamp collision). Round 2: 2-of-2 PASS. 36 reference-value tests green.

## Deferred follow-ups
- system-viz ghost-roost for per-domain training state (sierra soul REFUSES a half-wired FAST[] gen without the merge-augmentations splice -> separate careful unit).
- Direct round-trip tests for the unexported bus-honesty + lock-steal paths (P3).
- Real GPU training needs a CUDA torch venv (Python 3.11/3.12 on Blackwell, NOT 3.14 -- no sm_120 wheels). [[feedback_build_for_blackwell_hardware]]
