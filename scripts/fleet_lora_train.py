#!/usr/bin/env python3
"""
fleet_lora_train.py -- general LoRA (QLoRA) fine-tune for the fleet Alpaca corpus.
U-FLOR-FLEET-LORA-TRAINER (slot:tango 2026-06-11).

CLOSES THE VERIFIED GAP: the fleet LoRA corpus
(state/shared/lora/fleet-lora-combined.jsonl, 1138 Alpaca rows of shape
{instruction, input, output, weight, source, advisory}) was trainingReady but had
NO real trainer. The only LoRA *.py were domain-specific and, in the WEDM case
(mcp-server/scripts/wedm_train_lora.py), a SIMULATION stub (its train_lora() prints
fake epoch losses; the real PEFT code is commented out). No torch/peft stack was
installed. This is the real, general runner that consumes the fleet corpus.

REAL 4-bit QLoRA (peft + trl + bitsandbytes) -- NOT a simulation. torch /
transformers / peft / trl / datasets are LAZY-imported INSIDE train() so this
module's dataset-build + config logic is importable and unit-testable WITHOUT the
GPU stack (the --dry-run path + fleet_lora_train_test.py run on any Python).

Honors the per-row weight (verified doctrine 1.0 vs advisory wiki/synthesis 0.5)
via a custom per-sample weighted causal-LM loss -- advisory rows do NOT train at
full doctrine weight (R7: distinct trust, not blended). Loss is masked to the
completion tokens only (the model is graded on the answer, not on echoing the
prompt -- R9 intent: learn the response, not the instruction).

SAFETY (verified envelope, 2026-06-11): ~24 GB free VRAM under the fleet's resident
Ollama models (qwen2.5-coder:32b 54 GB + gpt-oss:20b 13 GB). 4-bit + rank<=16 of a
7-8B base is ~6-10 GB -> fits WITHOUT evicting the fleet. A hard pre-flight asserts
torch.cuda.is_available() (Python/CUDA-wheel mismatch is the #1 trap on this host:
the default 3.14 interpreter has no Blackwell wheels). Checkpoint-resumable
(save_steps + resume_from_checkpoint) so a fleet-reaper kill mid-run resumes
instead of restarting (the documented long-Python reap class).

Usage:
  # dry-run (NO torch needed) -- build dataset, print corpus summary + config + 1 sample:
  python scripts/fleet_lora_train.py --dry-run
  # real QLoRA (needs a torch/peft venv with CUDA):
  python scripts/fleet_lora_train.py \
      --base Qwen/Qwen2.5-7B-Instruct \
      --corpus state/shared/lora/fleet-lora-combined.jsonl \
      --out state/shared/lora/adapters/fleet-20260611 \
      --rank 16 --alpha 32 --load-in-4bit --max-steps 400 --bf16
  # smoke (tiny REAL run to prove the pipeline trains + emits an adapter):
  python scripts/fleet_lora_train.py --smoke --base Qwen/Qwen2.5-0.5B-Instruct
"""

import argparse
import json
import os
import sys
from pathlib import Path

# -- Trust weights mirror scripts/assemble-fleet-lora-corpus.mjs (VERIFIED_WEIGHT /
# ADVISORY_WEIGHT). Kept here so a row missing an explicit `weight` still resolves to
# the right trust level from its `advisory` flag.
VERIFIED_WEIGHT = 1.0
ADVISORY_WEIGHT = 0.5
# LoRA target modules for Llama/Qwen/Mistral-family attention+MLP projections.
DEFAULT_TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
# The text template: a single causal-LM string with an explicit completion boundary so
# the tokenizer step can mask the prompt and grade only the response.
PROMPT_TMPL = "### Instruction:\n{instruction}\n\n{input_block}### Response:\n"
RESPONSE_KEY = "### Response:\n"


def load_corpus(path):
    """Load + validate the fleet Alpaca corpus. Raises on a missing file (fail loud).
    Skips rows lacking a non-empty instruction+output (counted, never silently emitted)."""
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(
            "fleet LoRA corpus not found at %s -- run: node scripts/assemble-fleet-lora-corpus.mjs --out" % path
        )
    rows = []
    invalid = 0
    with open(p, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except json.JSONDecodeError:
                invalid += 1
                continue
            instr = o.get("instruction")
            out = o.get("output")
            if not isinstance(instr, str) or not instr.strip() or not isinstance(out, str) or not out.strip():
                invalid += 1
                continue
            rows.append(o)
    return rows, invalid


def resolve_sample_weight(row, verified=VERIFIED_WEIGHT, advisory=ADVISORY_WEIGHT):
    """Per-sample training weight. An explicit numeric `weight` on the row wins; else the
    `advisory` boolean maps to the advisory/verified weight; else verified (default)."""
    w = row.get("weight")
    if isinstance(w, (int, float)) and not isinstance(w, bool):
        return float(w)
    if row.get("advisory") is True:
        return advisory
    return verified


def format_example(row):
    """Alpaca row -> {prompt, completion, text, weight}. `text` is the full causal-LM
    string; `prompt` is everything up to and including the response key (masked in the
    label so loss is graded on the completion only)."""
    instruction = row["instruction"]
    inp = row.get("input")
    input_block = ("### Input:\n%s\n\n" % inp) if isinstance(inp, str) and inp.strip() else ""
    prompt = PROMPT_TMPL.format(instruction=instruction, input_block=input_block)
    completion = row["output"]
    return {
        "prompt": prompt,
        "completion": completion,
        "text": prompt + completion,
        "weight": resolve_sample_weight(row),
    }


def summarize_corpus(rows):
    """Corpus stats for the dry-run / metadata (no torch)."""
    verified = sum(1 for r in rows if resolve_sample_weight(r) >= VERIFIED_WEIGHT)
    advisory = len(rows) - verified
    galaxies = sorted({r["galaxy"] for r in rows if isinstance(r.get("galaxy"), str) and r.get("galaxy")})
    sources = sorted({r["source"] for r in rows if isinstance(r.get("source"), str) and r.get("source")})
    avg_out = round(sum(len(r["output"]) for r in rows) / max(1, len(rows)), 1)
    return {
        "rows": len(rows),
        "verified": verified,
        "advisory": advisory,
        "galaxiesCovered": len(galaxies),
        "sources": sources,
        "avgOutputChars": avg_out,
    }


def build_lora_config_dict(rank=16, alpha=32, dropout=0.05, target_modules=None):
    """The LoraConfig kwargs (a plain dict so it is testable without peft)."""
    return {
        "r": int(rank),
        "lora_alpha": int(alpha),
        "lora_dropout": float(dropout),
        "bias": "none",
        "task_type": "CAUSAL_LM",
        "target_modules": list(target_modules or DEFAULT_TARGET_MODULES),
    }


def build_training_args_dict(out_dir, max_steps=400, epochs=0, batch=4, grad_accum=4,
                             lr=2e-4, bf16=True, save_steps=50, warmup=10):
    """TrainingArguments kwargs (plain dict, testable without transformers). If max_steps
    > 0 it governs; else `epochs` governs (num_train_epochs)."""
    args = {
        "output_dir": out_dir,
        "per_device_train_batch_size": int(batch),
        "gradient_accumulation_steps": int(grad_accum),
        "learning_rate": float(lr),
        "bf16": bool(bf16),
        "logging_steps": 5,
        "save_steps": int(save_steps),
        "save_total_limit": 3,
        "warmup_steps": int(warmup),
        "lr_scheduler_type": "cosine",
        "optim": "paged_adamw_8bit",
        "report_to": "none",
        # REQUIRED: the trainer carries a custom `sample_weight` dataset column to the
        # weighted collator. HF Trainer defaults remove_unused_columns=True, which strips
        # any non-model column BEFORE the collator runs -> KeyError('sample_weight') at
        # step 0 (caught by the live smoke run 2026-06-11). Keep the column.
        "remove_unused_columns": False,
    }
    if int(max_steps) > 0:
        args["max_steps"] = int(max_steps)
    else:
        args["num_train_epochs"] = float(epochs or 1)
    return args


def preflight_cuda():
    """Hard pre-flight: the GPU stack must be present AND CUDA-capable. Returns the device
    name or raises a precise, actionable error (the Python/CUDA-wheel mismatch trap)."""
    try:
        import torch  # noqa: PLC0415 (lazy by design -- keeps the module importable without torch)
    except ImportError as e:
        raise RuntimeError(
            "torch is not installed in this interpreter (%s). A real run needs a CUDA torch "
            "venv. On this Blackwell host build it on Python 3.11/3.12 (NOT 3.14 -- no sm_120 "
            "wheels): create venv, then pip install torch (cu128) transformers peft trl datasets "
            "accelerate bitsandbytes. ImportError: %s" % (sys.executable, e)
        )
    if not torch.cuda.is_available():
        raise RuntimeError(
            "torch is installed but CUDA is NOT available (torch=%s). The CPU-only wheel was "
            "likely installed (the 3.14 trap) -- reinstall the cu128 wheel and verify "
            "torch.cuda.is_available() before training." % torch.__version__
        )
    return torch.cuda.get_device_name(0)


def train(args):
    """Run the real 4-bit QLoRA fine-tune. Lazy-imports the GPU stack so this file stays
    importable for --dry-run + tests on any Python."""
    device_name = preflight_cuda()
    print("[fleet-lora] CUDA OK -> %s" % device_name)

    import torch
    from transformers import (AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig,
                              TrainingArguments, Trainer)
    from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
    from datasets import Dataset

    rows, invalid = load_corpus(args.corpus)
    if not rows:
        raise RuntimeError("corpus %s yielded 0 trainable rows (invalid=%d)" % (args.corpus, invalid))
    summary = summarize_corpus(rows)
    print("[fleet-lora] corpus: %s (invalid skipped=%d)" % (json.dumps(summary), invalid))

    examples = [format_example(r) for r in rows]

    tok = AutoTokenizer.from_pretrained(args.base, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    max_len = int(args.max_seq_len)

    def tokenize(ex):
        # Mask the prompt: labels = -100 over the prompt tokens, real ids over the completion.
        full = tok(ex["text"], truncation=True, max_length=max_len, padding=False)
        prompt_ids = tok(ex["prompt"], truncation=True, max_length=max_len, padding=False)["input_ids"]
        labels = list(full["input_ids"])
        n_prompt = min(len(prompt_ids), len(labels))
        for i in range(n_prompt):
            labels[i] = -100
        full["labels"] = labels
        full["sample_weight"] = float(ex["weight"])
        return full

    ds = Dataset.from_list(examples).map(tokenize, remove_columns=["prompt", "completion", "text", "weight"])

    def collate(batch):
        maxlen = max(len(b["input_ids"]) for b in batch)
        pad_id = tok.pad_token_id

        def pad(seq, fill):
            return seq + [fill] * (maxlen - len(seq))

        input_ids = torch.tensor([pad(b["input_ids"], pad_id) for b in batch], dtype=torch.long)
        attn = torch.tensor([pad(b["attention_mask"], 0) for b in batch], dtype=torch.long)
        labels = torch.tensor([pad(b["labels"], -100) for b in batch], dtype=torch.long)
        weights = torch.tensor([b["sample_weight"] for b in batch], dtype=torch.float)
        return {"input_ids": input_ids, "attention_mask": attn, "labels": labels, "sample_weight": weights}

    bnb = BitsAndBytesConfig(
        load_in_4bit=bool(args.load_in_4bit),
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if args.bf16 else torch.float16,
        bnb_4bit_use_double_quant=True,
    ) if args.load_in_4bit else None

    model = AutoModelForCausalLM.from_pretrained(
        args.base, quantization_config=bnb, device_map="auto",
        torch_dtype=torch.bfloat16 if args.bf16 else torch.float16,
    )
    if args.load_in_4bit:
        model = prepare_model_for_kbit_training(model)
    model = get_peft_model(model, LoraConfig(**build_lora_config_dict(args.rank, args.alpha, args.dropout)))
    model.print_trainable_parameters()

    class WeightedTrainer(Trainer):
        """Per-sample weighted causal-LM loss -- advisory rows (weight 0.5) contribute half
        the gradient of verified doctrine rows (weight 1.0). Implements the masked,
        per-sample reduction by hand (HF's default token-mean cannot express it)."""

        def compute_loss(self, model, inputs, return_outputs=False, **kw):
            weights = inputs.pop("sample_weight")
            labels = inputs["labels"]
            outputs = model(**{k: v for k, v in inputs.items() if k != "labels"})
            logits = outputs.logits
            shift_logits = logits[:, :-1, :].contiguous()
            shift_labels = labels[:, 1:].contiguous()
            loss_fct = torch.nn.CrossEntropyLoss(reduction="none", ignore_index=-100)
            tok_loss = loss_fct(shift_logits.transpose(1, 2), shift_labels)  # [B, T]
            mask = (shift_labels != -100).float()
            per_sample = (tok_loss * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1.0)  # [B]
            w = weights.to(per_sample.device)
            loss = (per_sample * w).sum() / w.sum().clamp(min=1e-6)
            return (loss, outputs) if return_outputs else loss

    targs = TrainingArguments(**build_training_args_dict(
        args.out, args.max_steps, args.epochs, args.batch, args.grad_accum, args.lr, args.bf16, args.save_steps))
    trainer = WeightedTrainer(model=model, args=targs, train_dataset=ds, data_collator=collate)

    resume = bool(args.resume) and os.path.isdir(args.out) and any(
        n.startswith("checkpoint-") for n in os.listdir(args.out)) if os.path.isdir(args.out) else False
    result = trainer.train(resume_from_checkpoint=resume)

    os.makedirs(args.out, exist_ok=True)
    model.save_pretrained(args.out)
    tok.save_pretrained(args.out)
    meta = {
        "base": args.base, "corpus": args.corpus, "device": device_name,
        "loraConfig": build_lora_config_dict(args.rank, args.alpha, args.dropout),
        "corpusSummary": summary, "invalidSkipped": invalid,
        "finalLoss": float(result.training_loss) if result and result.training_loss is not None else None,
        "globalStep": int(result.global_step) if result else None,
        "perSampleWeighted": True, "smoke": bool(args.smoke),
    }
    with open(os.path.join(args.out, "fleet_training_metadata.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, indent=2)
    print("[fleet-lora] adapter + metadata saved -> %s (final_loss=%s)" % (args.out, meta["finalLoss"]))
    return meta


def parse_args(argv=None):
    ap = argparse.ArgumentParser(description="General LoRA (QLoRA) trainer for the fleet Alpaca corpus")
    ap.add_argument("--corpus", default="state/shared/lora/fleet-lora-combined.jsonl")
    ap.add_argument("--base", default="Qwen/Qwen2.5-7B-Instruct", help="HF base model id")
    ap.add_argument("--out", default="state/shared/lora/adapters/fleet-adapter")
    ap.add_argument("--rank", type=int, default=16)
    ap.add_argument("--alpha", type=int, default=32)
    ap.add_argument("--dropout", type=float, default=0.05)
    ap.add_argument("--max-steps", dest="max_steps", type=int, default=400)
    ap.add_argument("--epochs", type=float, default=0)
    ap.add_argument("--batch", type=int, default=4)
    ap.add_argument("--grad-accum", dest="grad_accum", type=int, default=4)
    ap.add_argument("--lr", type=float, default=2e-4)
    ap.add_argument("--max-seq-len", dest="max_seq_len", type=int, default=2048)
    ap.add_argument("--save-steps", dest="save_steps", type=int, default=50)
    ap.add_argument("--load-in-4bit", dest="load_in_4bit", action="store_true", default=True)
    ap.add_argument("--no-4bit", dest="load_in_4bit", action="store_false")
    ap.add_argument("--bf16", action="store_true", default=True)
    ap.add_argument("--resume", action="store_true", default=True, help="resume from a checkpoint in --out if present")
    ap.add_argument("--smoke", action="store_true", help="tiny real run (max_steps=8, rank=8) to prove the pipeline")
    ap.add_argument("--dry-run", dest="dry_run", action="store_true", help="build dataset + print config; NO torch, NO training")
    args = ap.parse_args(argv)
    if args.smoke:
        args.max_steps = 8
        args.rank = min(args.rank, 8)
        args.save_steps = 4
    return args


def main(argv=None):
    args = parse_args(argv)
    rows, invalid = load_corpus(args.corpus)
    summary = summarize_corpus(rows)
    if args.dry_run:
        print("=== fleet_lora_train DRY-RUN (no torch) ===")
        print("corpus: %s" % json.dumps(summary, indent=2))
        print("invalid skipped: %d" % invalid)
        print("lora config: %s" % json.dumps(build_lora_config_dict(args.rank, args.alpha, args.dropout)))
        print("training args: %s" % json.dumps(build_training_args_dict(
            args.out, args.max_steps, args.epochs, args.batch, args.grad_accum, args.lr, args.bf16, args.save_steps)))
        if rows:
            ex = format_example(rows[0])
            print("sample[0] weight=%.2f prompt_head=%r completion_head=%r" % (
                ex["weight"], ex["prompt"][:80], ex["completion"][:80]))
        print("OK: %d trainable rows ready. To train: drop --dry-run on a CUDA torch venv." % summary["rows"])
        return 0
    train(args)
    return 0


if __name__ == "__main__":
    sys.exit(main())
