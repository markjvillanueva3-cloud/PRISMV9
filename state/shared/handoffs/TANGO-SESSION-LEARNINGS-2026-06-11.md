# TANGO SESSION LEARNINGS -> for the other tango chat
**From:** claude-be279b4f (slot:tango owner) · **2026-06-11** · branch slot/tango
**Why:** operator directed "help the other tango by applying what you learn in this session." I can't enter your live terminal (separate process), so here is the complete, actionable transfer. Read this, then RUN THE PROD TRAINING (the goal's actual remaining lever).

## TL;DR
The GPU LoRA training the AI-synergy /goal kept blocking on is **GO and the pipeline is PROVEN**. The fleet does **not** need pausing. The full prod adapter is **not yet done** (the 3B attempt died at startup). You should run a clean 7B-4bit prod run — ~15-25 min, ~6-10GB on a card with ~78GB free.

## Shipped + committed this session (durable)
1. **U-FLOR-BRIDGE-DEEP-REASON** (`b6bc5de8cd`) — opt-in deep-reasoning mode for `scripts/lib/galaxy-reasoning-bridge.mjs` across all 34 galaxies. `--deep` / `PRISM_GALAXY_BRIDGE_DEEP=1` routes to the strongest INSTALLED local reasoner (gpt-oss:120b -> deepseek-r1:32b -> gpt-oss:20b); fast coder default preserved. 25/25 tests, 3-of-3 PASS.
2. **U-FLOR-WIKI-CANON-WIRE** (`5ffc77fb35`) — flipped LoRA `trainingReady` false->TRUE with REAL data. `wiki-canonical-pairs.jsonl` (282 `{prompt,completion}` wiki pairs) was DORMANT (assembler only took `{instruction,output}`). Added pure `normalizeAlpacaRow` (accepts both; native wins) to `scripts/assemble-fleet-lora-corpus.mjs` + registered the source. Corpus **856 -> 1138 rows**. 24/24 tests, 3-of-3 PASS.
3. **fleet_lora_train.py** (U-FLOR-FLEET-LORA-TRAINER) — the REAL general QLoRA trainer for the 1138-row fleet corpus (the WEDM `wedm_train_lora.py` is a SIMULATION stub). 4-bit QLoRA, per-sample weighted loss (verified 1.0 / advisory 0.5), completion-only loss masking, checkpoint-resumable, hard CUDA pre-flight.

## Training readiness — VERIFIED, all GO
- **venv**: `.venv-lora/Scripts/python.exe` -> Python 3.12.13, **torch 2.11.0+cu128, cuda_available=True**, device=RTX PRO 6000 Blackwell. The sm_120 wheel trap is already solved (do NOT use the default 3.14 python -- no Blackwell wheels).
- **GPU**: ~78GB free right now (live Ollama ~18GB: gpt-oss:20b 13.4 + nomic-embed 0.3; 120b NOT resident). 4-bit 7-8B QLoRA is ~6-10GB -> **no fleet pause needed**.
- **Corpus**: `python scripts/fleet_lora_train.py --dry-run` -> 1138 rows (279 verified + 859 advisory, 34 galaxies, 0 invalid). Sources: vault-feedback, vault-galaxy-synthesis, bridge-reasoning, wiki-canonical-pairs.
- **Smoke PROVEN**: `state/shared/lora/adapters/fleet-smoke/` = real 17.6MB `adapter_model.safetensors` + checkpoint-4/8 + metadata (finalLoss 15.6, 8 steps, 0.5B base, Blackwell, perSampleWeighted=true). The pipeline trains + emits an adapter end-to-end.
- **fleet-3b-prod/ is EMPTY** — a 3B prod run started 08:25 died at startup (no checkpoints; likely OOM at model load OR fleet-reaper kill of the long python). NOT done.

## ✅ DONE (2026-06-11 13:48) — fleet-3b-prod adapter COMPLETE
The prod run is **finished** — do NOT re-run. `state/shared/lora/adapters/fleet-3b-prod/`: globalStep 200/200, **finalLoss 4.43** (from 16.4 -- real learning), `adapter_model.safetensors` 119.8MB, train_runtime 458s, trainer exited clean (0 orphans). Base Qwen2.5-3B-Instruct, 1138 rows, per-sample weighted (advisory 0.5 / verified 1.0). The earlier 5h-hang was TRANSIENT -- a resume from checkpoint-100 sailed straight past it. No fleet pause; ~10min compute alongside live Ollama (50GB used / 46GB free during the run).
**Optional next (stronger adapter, not required):** a 7B run -- `--base Qwen/Qwen2.5-Coder-7B-Instruct --out state/shared/lora/adapters/fleet-7b-prod` (the 7B-Coder was mid-download; let it finish first). To wire the 3B adapter live: `PRISMLoRAAdapterEngine.register()` / `/train-lora activate`.

## (historical) ORIGINAL DO-THIS — run the prod adapter
```bash
cd H:/prism
./.venv-lora/Scripts/python.exe scripts/fleet_lora_train.py \
  --base Qwen/Qwen2.5-Coder-7B-Instruct \
  --corpus state/shared/lora/fleet-lora-combined.jsonl \
  --out state/shared/lora/adapters/fleet-7b-prod \
  --rank 16 --alpha 32 --load-in-4bit --max-steps 400 --bf16
```
- Qwen2.5-Coder-7B-Instruct + 0.5B + 3B are HF-cached (`C:\Users\wompu\.cache\huggingface\hub`) -> NO download.
- ~15-25 min. **Checkpoint-resumable** (`--resume` default on): a reaper kill resumes from the last checkpoint-50, never restarts. So if it dies, just re-run the same command.
- **VRAM watch**: don't let a peer slot load 120b (65GB) + 32b (54GB) concurrently mid-run. Run while the big models aren't resident, or briefly hold them off.
- Fast re-proof first (optional): add `--smoke` (8 steps, ~2 min).
- On completion: metadata at `<out>/fleet_training_metadata.json` (finalLoss, globalStep). To wire it live: `PRISMLoRAAdapterEngine.register()` / `/train-lora activate <adapterId>`.
- WHY the 3B died is worth a 1-line check before re-running: `tasklist | grep -i python` for a stalled trainer; confirm `nvidia-smi` free VRAM > ~12GB.

## NOT your lane (india's GPU work)
GNN full-coverage AUROC: pool growth does NOT move it (0.808 selective-deploy @ tau=0.7; full-holdout below the 0.78/0.55/0.15 gate). Needs H2GCN-at-scale GPU retrain = india. Do not chase it here.

## Lesson (banked to memory reference_galaxy_bridge_deep_reason_2026_06_11)
Before declaring a corpus/metric gate "unflippable in-session", SEARCH for dormant real sources blocked by schema/wiring mismatches. A `{prompt,completion}` vs `{instruction,output}` key mismatch hid 282 real wiki pairs. Discovery-first is the tango discipline -- it flipped the gate with $0 and real data, no GPU.
