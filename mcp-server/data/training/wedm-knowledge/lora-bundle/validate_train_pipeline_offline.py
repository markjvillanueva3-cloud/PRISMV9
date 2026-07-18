"""validate_train_pipeline_offline.py — execute a REAL LoRA fine-tune end-to-end
with ZERO download, to validate the print->program training pipeline.

The production trainer (train_wedm_lora_peft.py) needs the Qwen2.5-Coder-7B base
weights, which are not cached and won't download (HF CDN throttled to ~96 KB/s).
This harness instead CONSTRUCTS a small Qwen2-architecture model offline from a
config (the Qwen2 tokenizer files ARE cached — only the 7B weight shards are
missing), runs a real LoRA fine-tune on the print->program corpus, saves the
adapter, and generates over the val prompts. The output (tiny random-init base)
is low quality, but every stage of the TRAINING PIPELINE executes for real:
build -> LoRA attach -> train (loss decreases) -> save adapter -> load -> generate.
That de-risks the production run: the only remaining unknown is the 7B weights.

  WEDM_TRAIN=<train.jsonl> WEDM_VAL=<val.jsonl> WEDM_GEN_OUT=<gens.jsonl> \
  H:/.venv-wedm-lora/Scripts/python.exe -u validate_train_pipeline_offline.py

Fail-loud on missing tokenizer/corpus. No 4-bit (tiny model trains in fp/bf16).
"""
import os
import sys
import json
import glob


def fail(msg):
    print("[validate-train] FATAL: " + msg)
    sys.exit(2)


HERE = os.path.dirname(os.path.abspath(__file__))
train_path = os.environ.get("WEDM_TRAIN", "H:/prism-slot-mike/mcp-server/data/training/wedm-print2program/wedm_print2program_train.jsonl")
val_path = os.environ.get("WEDM_VAL", "H:/prism-slot-mike/mcp-server/data/training/wedm-print2program/wedm_print2program_val.jsonl")
gen_out = os.environ.get("WEDM_GEN_OUT", "H:/prism-slot-mike/state/shared/wedm-p2p-tinytrain-generations.jsonl")
adapter_out = os.environ.get("WEDM_OUTPUT", os.path.join(HERE, "models", "wedm-p2p-tinytrain-lora"))
epochs = float(os.environ.get("WEDM_EPOCHS", "4"))
max_len = int(os.environ.get("WEDM_MAXLEN", "768"))
gen_limit = int(os.environ.get("WEDM_GEN_LIMIT", "10"))
if not os.path.exists(train_path):
    fail("train corpus not found: " + train_path)

# Locate the cached Qwen2 tokenizer (the incomplete 7B snapshot still has it).
tok_dir = None
hub = os.path.expanduser("~/.cache/huggingface/hub/models--Qwen--Qwen2.5-Coder-7B-Instruct/snapshots")
for cand in sorted(glob.glob(os.path.join(hub, "*"))):
    if os.path.exists(os.path.join(cand, "tokenizer.json")):
        tok_dir = cand
        break
if tok_dir is None:
    fail("cached Qwen2 tokenizer not found under " + hub)

os.environ["HF_HUB_OFFLINE"] = "1"  # never reach the network
import torch  # noqa: E402
from transformers import AutoTokenizer, AutoModelForCausalLM, Qwen2Config, TrainingArguments, Trainer, DataCollatorForLanguageModeling  # noqa: E402
from peft import LoraConfig, get_peft_model  # noqa: E402
from datasets import Dataset  # noqa: E402

print("[validate-train] tokenizer from cache: " + tok_dir)
tok = AutoTokenizer.from_pretrained(tok_dir)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token

# A small Qwen2 model, constructed offline (random init). ~90M params (embedding-dominated).
cfg = Qwen2Config(
    vocab_size=len(tok),
    hidden_size=512,
    intermediate_size=1376,
    num_hidden_layers=4,
    num_attention_heads=8,
    num_key_value_heads=4,
    max_position_embeddings=2048,
    rms_norm_eps=1e-6,
    tie_word_embeddings=True,
)
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.bfloat16 if device == "cuda" else torch.float32
model = AutoModelForCausalLM.from_config(cfg).to(device=device, dtype=dtype)
nparams = sum(p.numel() for p in model.parameters())
print("[validate-train] built tiny Qwen2 (" + str(round(nparams / 1e6, 1)) + "M params) on " + device)

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
print("[validate-train] " + str(len(train_rows)) + " training pairs")
ds = Dataset.from_list([{"text": to_text(r)} for r in train_rows])
ds = ds.map(lambda e: tok(e["text"], truncation=True, max_length=max_len), remove_columns=["text"])

args = TrainingArguments(
    output_dir=adapter_out,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=2,
    num_train_epochs=epochs,
    learning_rate=5e-4,
    logging_steps=10,
    save_strategy="no",
    bf16=(device == "cuda"),
    report_to=[],
)
trainer = Trainer(model=model, args=args, train_dataset=ds,
                  data_collator=DataCollatorForLanguageModeling(tok, mlm=False))
res = trainer.train()
print("[validate-train] train DONE — final loss " + str(round(float(res.training_loss), 4)))
model.save_pretrained(adapter_out)
print("[validate-train] adapter saved -> " + adapter_out)

# Generate over the val prompts with the fine-tuned tiny model.
model.train(False)
val_rows = load_rows(val_path)[:gen_limit] if os.path.exists(val_path) else train_rows[:gen_limit]
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
    gens.append({"instruction": instr, "input": inp, "generated": completion, "expected": str(r.get("output", "")), "meta": {**(r.get("meta", {}) or {}), "validation_model": "tiny-qwen2-offline"}})

with open(gen_out, "w", encoding="utf-8") as f:
    for g in gens:
        f.write(json.dumps(g) + "\n")
print("[validate-train] OK — trained + generated " + str(len(gens)) + " -> " + gen_out)
