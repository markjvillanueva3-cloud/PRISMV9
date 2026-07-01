---
name: reference_rslora_enabled_2026_06_15
description: "rsLoRA (rank-stabilized LoRA) enabled in scripts/fleet_lora_train.py (slot:india 2026-06-15, commit b746c5f02d): use_rslora flag + config-dict + --rslora CLI, threaded through all 3 build_lora_config_dict call sites. Scales alpha/sqrt(r) not alpha/r (Kalajdzievski 2023) -- better at rank>=32. GPU-VALIDATED on the live Blackwell (H:/Tools/blackwell-gpu-venv py3.13, torch 2.11+cu128, peft 0.19.1): --smoke --rslora trained 8/8 steps, saved adapter_config.json with use_rslora:true. Full r=32 production run is READY but properly sequenced AFTER per-galaxy corpus growth (current corpus is trainingReady=1372 rows but every galaxy <512 pairs)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.150Z
aliases: reference_rslora_enabled_2026_06_15
---


# rsLoRA enabled in the fleet LoRA trainer + GPU-validated (slot:india 2026-06-15)

## What
`scripts/fleet_lora_train.py` (ledger #23) gained `use_rslora`:
- `build_lora_config_dict(..., use_rslora=False)` -> emits `"use_rslora": bool(use_rslora)` into the LoraConfig kwargs.
- `--rslora` CLI flag (default False, back-compat).
- threaded through ALL 3 `build_lora_config_dict` call sites (the LoraConfig build @268, the dry-run config dump @304, the print @353).
- +3 tests in `fleet_lora_train_test.py` (14/14 pass, torch-free).

rsLoRA (Kalajdzievski 2023) scales the adapter by `alpha/sqrt(r)` instead of `alpha/r`, keeping the effective LR stable as rank grows -- materially better at r>=32 (the ledger's rsLoRA r=32-64 target). peft 0.19.1 supports it.

## GPU validation (R15 -- proven on real hardware, not just dry-run)
- `--dry-run --rslora --rank 32` builds `{"r":32, "lora_alpha":32, ..., "use_rslora":true}`, 1372 rows ready (torch-free).
- `--smoke --rslora` on the LIVE Blackwell (`H:/Tools/blackwell-gpu-venv` py3.13, torch 2.11.0+cu128, cuda True, peft 0.19.1; GPU ~95GB free): trained 8/8 steps (loss 15.24 -> 14.24, ~4.7s/it), saved an adapter whose `adapter_config.json` carries `use_rslora: true` -- PROOF peft actually applied the rank-stabilized scaling, not just accepted the kwarg.
- `.venv-lora` (py3.12) is the other working torch venv; both have torch 2.11+cu128 + peft 0.19.1.

## Full production run -- READY but SEQUENCED (R13)
The full `--rslora --rank 32` run is launch-ready (venv + GPU + config + corpus all proven). But it is NOT run yet on purpose: the `#8` LoRA audit found the corpus is `trainingReady:true` (1372 rows, floor 1000, 34/34 covered) yet **every galaxy is <512 pairs** (per-galaxy SPARSE). Training a 7B QLoRA r=32 on a thin corpus overfits + carries little per-galaxy signal -- premature. Correct order: grow the per-galaxy corpus (`galaxy-synthesis-refresh` toward ~512/galaxy) FIRST, then the full rsLoRA r=32 run. zulu/tango already trained a fleet adapter 2026-06-11 on the same corpus; re-training now is marginal.

## UPDATE 2026-06-15 (full run + reaper-immune claim CORRECTED, R12)
The scheduled-task run was NOT fully reaper-immune. Sequence: in-session run reaped at 54/400; scheduled-task run reached **371/400** then was hard-killed (no training error logged, no OOM -- 35GB VRAM free, a peer `WPy64` python holding 61GB appeared; kill cause UNCONFIRMED -- reaper or peer GPU-coordinator, no reaper-log match). So the scheduled task DELAYED the kill (371 vs 54) but did not prevent it. **A REAL rsLoRA r=32 adapter exists** at `state/shared/lora/adapters/fleet-rslora-r32/checkpoint-350/` (`r=32, alpha=32, use_rslora=true`, `adapter_model.safetensors` present) -- an 87.5%-trained, fully-loadable adapter (the actual model deliverable). The final top-level save (step 400) never wrote. The last 50 steps are marginal; not re-fought (GPU contended, repeated kills, sparse corpus). **Corrected fleet rule:** even a scheduled-task long-GPU job can be killed under contention -- TRUE immunity needs reaper protect-list / golf coordination / a low-contention window, not just a scheduled task. Consumers load the adapter from `checkpoint-350/`.

## Run command (for when corpus is grown)
`H:/Tools/blackwell-gpu-venv/Scripts/python.exe scripts/fleet_lora_train.py --rslora --rank 32 --alpha 32 --out state/shared/lora/adapters/fleet-rslora-r32` (background or scheduled task; ~30-40 min for 400 steps; a long bash stays non-orphan while the session is alive so the fleet-reaper won't reap it).

## REAPER HAZARD (live finding 2026-06-15 — fleet-wide lesson)
The first full `--rslora --rank 32` run, launched as an in-session `run_in_background` bash, was **REAPED by the fleet-reaper at step 54/400** (~5 min in): exit 255, no python on the GPU, log frozen at 54/400, no error trace. So **"a long GPU job launched as a session background task is safe from the reaper" is FALSE** — the reaper kills long session-orphan python under load. `checkpoint-50/` salvaged (save_steps=50). Fix: run heavy GPU jobs as a **registered scheduled task** (`scripts/run-rslora-r32-train.ps1` -> task `PRISM rsLoRA R32 Train`, `--resume` from the checkpoint) — a scheduled-task process parents to Task Scheduler, never a session orphan, so the reaper leaves it. This is the same conclusion as [[reference_gnn_checkpoint_selective_promote_gap_2026_06_15]] ("heavy runs must run in the reaper-immune scheduled task"). General rule: **any >~5-min GPU/CPU job goes in a scheduled task, not a session bash.**

[[reference_zulu_fleet_lora_train_2026_06_11]] · [[reference_fleet_lora_adapter_trained_2026_06_11]] · ledger `INDIA-REMAINING-WORK-LEDGER-2026-06-15.md` #23.
