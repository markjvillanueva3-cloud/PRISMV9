#!/usr/bin/env python
"""
train_wedm_lora_peft.py — Windows-robust WEDM knowledge LoRA fine-tune.

The sibling train_wedm_lora.py uses unsloth (Linux/Colab fast path; on Windows
unsloth needs triton-windows + xformers, which are fragile). This trainer uses
ONLY transformers + peft + bitsandbytes — the canonical, well-documented,
Windows-compatible LoRA path. The WEDM knowledge corpus is tiny (139 train
pairs), so unsloth's speed advantage is irrelevant; robustness wins.

Reads config.json (same dir). Loads the base model in 4-bit (nf4), attaches a
LoRA adapter, fine-tunes, and saves the adapter to config.output_dir.

  python train_wedm_lora_peft.py            # uses config.json
  WEDM_BASE_MODEL=<repo> python train_wedm_lora_peft.py

Fail-loud: any missing dep / dataset / CUDA-unavailable aborts with a clear msg.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))


def fail(msg: str, code: int = 2):
    print("[train-wedm-peft] FATAL: " + msg, file=sys.stderr)
    sys.exit(code)


def main():
    cfg_path = os.path.join(HERE, "config.json")
    if not os.path.exists(cfg_path):
        fail("config.json not found next to this script (" + cfg_path + ")")
    with open(cfg_path, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    # Resolve dataset (config has an absolute slot-worktree path; allow override
    # + fall back to a path relative to this bundle so it survives a move).
    ds_path = os.environ.get("WEDM_DATASET", cfg.get("dataset_path", ""))
    if not os.path.exists(ds_path):
        alt = os.path.join(HERE, "..", "wedm_knowledge_train.jsonl")
        ds_path = os.path.abspath(alt)
    if not os.path.exists(ds_path):
        fail("training set not found (tried config dataset_path + " + ds_path + ")")

    try:
        import torch
        from transformers import (
            AutoTokenizer,
            AutoModelForCausalLM,
            BitsAndBytesConfig,
            TrainingArguments,
            Trainer,
            DataCollatorForLanguageModeling,
        )
        from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftModel
        from datasets import Dataset
    except Exception as e:  # noqa: BLE001
        fail("missing dependency (" + repr(e) + ") — run the install stage first")

    if not torch.cuda.is_available():
        fail("CUDA not available — free the GPU (stop NIM containers) and verify a CUDA torch build")
    free_b, total_b = torch.cuda.mem_get_info()
    free_gb = free_b / (1024 ** 3)
    print("[train-wedm-peft] GPU free " + str(round(free_gb, 1)) + " GiB / total " + str(round(total_b / (1024 ** 3), 1)) + " GiB")
    if free_gb < 9.0:
        fail("only " + str(round(free_gb, 1)) + " GiB GPU free; need ~9+ for Qwen-7B 4-bit LoRA. Stop Ollama (taskkill ollama.exe) + NIM containers first.")

    base = os.environ.get("WEDM_BASE_MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct")
    out_dir = os.path.join(HERE, os.environ.get("WEDM_OUTPUT", "").strip() or cfg.get("output_dir", "models/wedm-lora"))
    os.makedirs(out_dir, exist_ok=True)
    print("[train-wedm-peft] base=" + base + " dataset=" + ds_path + " out=" + out_dir)

    rows = []
    with open(ds_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    if not rows:
        fail("0 training rows")
    print("[train-wedm-peft] " + str(len(rows)) + " training pairs")

    tok = AutoTokenizer.from_pretrained(base, trust_remote_code=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    max_len = int(cfg.get("max_seq_length", 2048))

    def tokenize(row):
        instr = str(row.get("instruction", ""))
        inp = str(row.get("input", ""))
        out = str(row.get("output", ""))
        user = instr + (("\n\n" + inp) if inp else "")
        msgs = [{"role": "user", "content": user}, {"role": "assistant", "content": out}]
        try:
            text = tok.apply_chat_template(msgs, tokenize=False)
        except Exception:  # noqa: BLE001 — fall back to a plain Alpaca prompt
            text = "### Instruction:\n" + user + "\n\n### Response:\n" + out + tok.eos_token
        # No manual labels: DataCollatorForLanguageModeling(mlm=False) clones
        # input_ids -> labels AFTER padding (pad positions masked to -100).
        # Pre-setting variable-length labels here breaks tokenizer.pad (it can't
        # tensorize the unpadded labels field across a ragged batch).
        return tok(text, truncation=True, max_length=max_len, padding=False)

    ds = Dataset.from_list(rows).map(tokenize, remove_columns=list(rows[0].keys()))

    bnb = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.bfloat16,
    )
    model = AutoModelForCausalLM.from_pretrained(
        base, quantization_config=bnb, device_map="auto", torch_dtype=torch.bfloat16, trust_remote_code=True
    )
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=bool(cfg.get("use_gradient_checkpointing", True)))
    # WARM-START (catalog doctrine D2: continue the ONE shared adapter, never cold-start)
    # when WEDM_WARM_START_ADAPTER points at an existing adapter dir; else fresh LoRA.
    warm = os.environ.get("WEDM_WARM_START_ADAPTER", "").strip()
    if warm and os.path.exists(os.path.join(warm, "adapter_config.json")):
        model = PeftModel.from_pretrained(model, warm, is_trainable=True)
        print("[train-wedm-peft] WARM-START — continuing adapter " + warm)
    else:
        lora = LoraConfig(
            r=int(cfg.get("lora_r", 16)),
            lora_alpha=int(cfg.get("lora_alpha", 32)),
            lora_dropout=float(cfg.get("lora_dropout", 0.05)),
            target_modules=cfg.get("target_modules"),
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, lora)
        print("[train-wedm-peft] COLD-START — fresh LoRA adapter")
    model.print_trainable_parameters()

    args = TrainingArguments(
        output_dir=out_dir,
        per_device_train_batch_size=int(cfg.get("batch_size", 4)),
        gradient_accumulation_steps=int(cfg.get("gradient_accumulation", 4)),
        num_train_epochs=float(cfg.get("num_epochs", 3)),
        learning_rate=float(cfg.get("learning_rate", 2e-4)),
        warmup_ratio=float(cfg.get("warmup_ratio", 0.03)),
        weight_decay=float(cfg.get("weight_decay", 0.01)),
        logging_steps=int(cfg.get("logging_steps", 10)),
        save_steps=int(cfg.get("save_steps", 100)),
        save_total_limit=2,
        bf16=bool(cfg.get("bf16", True)),
        fp16=bool(cfg.get("fp16", False)),
        gradient_checkpointing=bool(cfg.get("use_gradient_checkpointing", True)),
        optim="paged_adamw_8bit",
        report_to=[],
        logging_dir=os.path.join(out_dir, "logs"),
    )
    collator = DataCollatorForLanguageModeling(tok, mlm=False)
    trainer = Trainer(model=model, args=args, train_dataset=ds, data_collator=collator)
    trainer.train()
    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)
    print("[train-wedm-peft] DONE — LoRA adapter saved to " + out_dir)


if __name__ == "__main__":
    main()
