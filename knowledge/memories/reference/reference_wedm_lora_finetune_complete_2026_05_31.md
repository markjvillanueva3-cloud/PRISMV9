---
name: reference_wedm_lora_finetune_complete_2026_05_31
description: "WEDM knowledge LoRA adapter trained IN-GALAXY (Qwen2.5-Coder-7B QLoRA, loss 3.07->1.48, 154MB validated). Reusable Windows in-galaxy fine-tune pipeline (uv+py3.12 on H:) + 4 hard-won blocker lessons: portable-python-3.14 has no torch wheels, Ollama holds GPU VRAM, torch2.5.1 segfaults on numpy2.x, DataCollator builds labels itself"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.036Z
aliases: reference_wedm_lora_finetune_complete_2026_05_31
---


# WEDM LoRA fine-tune COMPLETE — in-galaxy (slot mike, U-WEDM-FINETUNE-RUN, 2026-05-31)

Operator: "install and fine tune." **Done, in mike's galaxy** (not passed to india — per [[feedback_ai_upgrade_broadcast_protocol]]). A QLoRA adapter was trained on the 139-pair WEDM knowledge corpus and validated.

**Result:** base `Qwen/Qwen2.5-Coder-7B-Instruct`, nf4 4-bit + LoRA (r16/α32, 7 target modules, 40.4M trainable = 0.53%), 3 epochs / 51 steps / 183s on RTX 4080S. **Loss 3.07 → 2.41 → 1.83 → 1.76 → 1.48** (clean monotonic descent). Adapter: `mcp-server/data/training/wedm-knowledge/lora-bundle/models/wedm-lora/adapter_model.safetensors` (154MB, 392 LoRA tensors, PeftConfig-validated). Weights gitignored (build artifact; juliett owns model storage); metrics in `training-report.json`. Reproduce: `pwsh -File scripts/wedm-finetune-pipeline.ps1 -Stage all`.

**Reusable Windows in-galaxy fine-tune PIPELINE** (`scripts/wedm-finetune-pipeline.ps1` + `train_wedm_lora_peft.py`) — any galaxy can fine-tune on this box. 4 HARD-WON BLOCKERS (each cost a failed run; all diagnosed honestly, R12):
1. **No usable Python** — the portable `H:/.claude/bin/python` is **3.14** (no torch/unsloth wheels). Fix: `uv` installs Python 3.12 + venv, ALL on H: (C: is 98% full — caches/model/venv MUST target H: via `UV_CACHE_DIR`/`UV_PYTHON_INSTALL_DIR`/`HF_HOME`).
2. **GPU VRAM holder = native Ollama, NOT (just) NIM.** Stopping the NIM docker containers freed nothing (1980 MiB). `nvidia-smi --query-compute-apps` showed `ollama.exe` holding `qwen2.5-coder:7b` (10GB) + `nomic-embed-text` — the local-compute-autostart hook loaded it. Fix: `Free-Gpu` does `taskkill /F /IM ollama.exe` + `docker stop nim-llama32-3b nim-embed-e5` → ~14.7GB free. Restart NIM after (auto).
3. **torch 2.5.1 SEGFAULTS (0xC0000005 / SIGSEGV 139) on numpy 2.x C-ABI.** Combined `import torch,transformers,peft` crashed natively (bypasses try/except). NOT transformers-version, NOT OpenMP (`KMP_DUPLICATE_LIB_OK` didn't help). Fix: **pin `numpy<2`** (+ `transformers<5` for stability) — LOAD-BEARING.
4. **`DataCollatorForLanguageModeling(mlm=False)` builds `labels` itself** (clones input_ids → labels after padding, masks pad to -100). Pre-setting ragged `labels` in tokenize() breaks `tokenizer.pad` (ValueError "excessive nesting"). Fix: don't pre-set labels.

Env: torch2.5.1+cu121, transformers4.46.3, numpy1.26.4, peft, bitsandbytes0.49.2, py3.12 (uv venv H:/.venv-wedm-lora). Broadcast (kind=model) to india/whiskey/foxtrot/oscar/kilo — india: in-galaxy domain training works; this is the per-domain template. Pairs with [[reference_program_scorer_knowledge_corpus_mismatch_2026_05_30]] + [[reference_min_is_okuma_lathe_not_wire_2026_05_31]].
