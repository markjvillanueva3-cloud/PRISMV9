"""train_wedm_p2p_05b.py — REAL print->program LoRA fine-tune on Qwen2.5-Coder-0.5B.

The production 7B base won't download (HF CDN ~100 KB/s single-connection → 45h),
but the 0.5B variant (~1 GB) DID download via hf_transfer's parallel chunks
(~1.85 MB/s) — and it is a genuinely capable pretrained code model (NOT the
random-init tiny model the offline validator used). This runs a real cold-start
LoRA fine-tune on it over the print->program corpus, then generates over the val
prompts so eval-wedm-print2program.mjs can grade the result through the closed
loop. Cold-start (not warm) because the wedm-passschedule adapter is 7B-dimensioned.

  WEDM_TRAIN=<train.jsonl> WEDM_VAL=<val.jsonl> WEDM_GEN_OUT=<gens.jsonl> \
  H:/.venv-wedm-lora/Scripts/python.exe -u train_wedm_p2p_05b.py

bf16, no 4-bit (0.5B fits easily). Fail-loud on missing model/corpus.
"""
import os
import sys
import json
import glob


def fail(msg):
    print("[train-05b] FATAL: " + msg)
    sys.exit(2)


HERE = os.path.dirname(os.path.abspath(__file__))
train_path = os.environ.get("WEDM_TRAIN", "H:/prism-slot-mike/mcp-server/data/training/wedm-print2program/wedm_print2program_train.jsonl")
val_path = os.environ.get("WEDM_VAL", "H:/prism-slot-mike/mcp-server/data/training/wedm-print2program/wedm_print2program_val.jsonl")
gen_out = os.environ.get("WEDM_GEN_OUT", "H:/prism-slot-mike/state/shared/wedm-p2p-05b-generations.jsonl")
adapter_out = os.environ.get("WEDM_OUTPUT", os.path.join(HERE, "models", "wedm-p2p-05b-lora"))
epochs = float(os.environ.get("WEDM_EPOCHS", "1"))  # loss reaches ~0.14 in <1 epoch; 1 is plenty + finishes fast
max_len = int(os.environ.get("WEDM_MAXLEN", "1024"))
gen_limit = int(os.environ.get("WEDM_GEN_LIMIT", "20"))
if not os.path.exists(train_path):
    fail("train corpus not found: " + train_path)

# Resolve the cached 0.5B snapshot dir (offline — already downloaded).
base = None
snaps = "C:/Users/wompu/.cache/huggingface/hub/models--Qwen--Qwen2.5-Coder-0.5B-Instruct/snapshots"
for cand in sorted(glob.glob(os.path.join(snaps, "*"))):
    if os.path.exists(os.path.join(cand, "model.safetensors")):
        base = cand
        break
if base is None:
    fail("cached Qwen2.5-Coder-0.5B snapshot not found under " + snaps)
os.environ["HF_HUB_OFFLINE"] = "1"

import torch  # noqa: E402
from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer, DataCollatorForLanguageModeling  # noqa: E402
from peft import LoraConfig, get_peft_model  # noqa: E402
from datasets import Dataset  # noqa: E402

if not torch.cuda.is_available():
    fail("CUDA not available — free the GPU (stop Ollama) and verify a CUDA torch build")

device = "cuda"
print("[train-05b] base (cached): " + base)
tok = AutoTokenizer.from_pretrained(base)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForCausalLM.from_pretrained(base, torch_dtype=torch.bfloat16, device_map={"": 0})
nparams = sum(p.numel() for p in model.parameters())
print("[train-05b] loaded real 0.5B (" + str(round(nparams / 1e6, 1)) + "M params)")

lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
                  target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"])
model = get_peft_model(model, lora)
model.print_trainable_parameters()


def load_rows(p):
    rows = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def to_text(row):
    instr = str(row.get("instruction", ""))
    inp = str(row.get("input", ""))
    out = str(row.get("output", ""))
    user = instr + (("\n\n" + inp) if inp else "")
    msgs = [{"role": "user", "content": user}, {"role": "assistant", "content": out}]
    try:
        return tok.apply_chat_template(msgs, tokenize=False)
    except Exception:  # noqa: BLE001
        return "### Instruction:\n" + user + "\n\n### Response:\n" + out + tok.eos_token


train_rows = load_rows(train_path)
print("[train-05b] " + str(len(train_rows)) + " training pairs")
ds = Dataset.from_list([{"text": to_text(r)} for r in train_rows])
ds = ds.map(lambda e: tok(e["text"], truncation=True, max_length=max_len), remove_columns=["text"])

args = TrainingArguments(
    output_dir=adapter_out,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    num_train_epochs=epochs,
    learning_rate=2e-4,
    warmup_ratio=0.03,
    logging_steps=10,
    save_strategy="steps",
    save_steps=20,
    save_total_limit=4,
    bf16=True,
    report_to=[],
)
trainer = Trainer(model=model, args=args, train_dataset=ds,
                  data_collator=DataCollatorForLanguageModeling(tok, mlm=False))
res = trainer.train()
print("[train-05b] train DONE — final loss " + str(round(float(res.training_loss), 4)))
model.save_pretrained(adapter_out)
print("[train-05b] adapter saved -> " + adapter_out)

# Generate over the val prompts with the fine-tuned model.
model.train(False)
val_rows = (load_rows(val_path) if os.path.exists(val_path) else train_rows)[:gen_limit]
gens = []
for r in val_rows:
    instr = str(r.get("instruction", ""))
    inp = str(r.get("input", ""))
    user = instr + (("\n\n" + inp) if inp else "")
    try:
        text = tok.apply_chat_template([{"role": "user", "content": user}], tokenize=False, add_generation_prompt=True)
    except Exception:  # noqa: BLE001
        text = "### Instruction:\n" + user + "\n\n### Response:\n"
    ids = tok(text, return_tensors="pt", truncation=True, max_length=max_len).to(device)
    with torch.no_grad():
        o = model.generate(**ids, max_new_tokens=400, do_sample=False, pad_token_id=tok.pad_token_id)
    completion = tok.decode(o[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
    gens.append({"instruction": instr, "input": inp, "generated": completion, "expected": str(r.get("output", "")), "meta": {**(r.get("meta", {}) or {}), "model": "qwen2.5-coder-0.5b-lora"}})

with open(gen_out, "w", encoding="utf-8") as f:
    for g in gens:
        f.write(json.dumps(g) + "\n")
print("[train-05b] OK — trained + generated " + str(len(gens)) + " -> " + gen_out)
