"""infer_wedm.py — generate WEDM completions from a trained LoRA adapter.

The inference half of the closed loop: load the 4-bit base + a PEFT adapter,
generate over a prompts JSONL (same chat format the trainer used), and write a
generations JSONL that scripts/eval-wedm-print2program.mjs (Phase D3) grades
through the closed-loop gate stack.

  WEDM_ADAPTER=<adapter dir>  WEDM_PROMPTS=<prompts.jsonl>  WEDM_GEN_OUT=<out.jsonl> \
  H:/.venv-wedm-lora/Scripts/python.exe infer_wedm.py

Fail-loud: missing adapter / prompts / CUDA aborts with a clear message. Greedy
decode (do_sample=False) so cascade grading is deterministic.
"""
import os
import sys
import json


def fail(msg):
    print("[infer-wedm] FATAL: " + msg)
    sys.exit(2)


HERE = os.path.dirname(os.path.abspath(__file__))
adapter = os.environ.get("WEDM_ADAPTER", "").strip()
if not adapter or not os.path.exists(os.path.join(adapter, "adapter_config.json")):
    fail("WEDM_ADAPTER must point at an adapter dir with adapter_config.json (got: " + adapter + ")")
prompts_path = os.environ.get("WEDM_PROMPTS", "").strip()
if not prompts_path or not os.path.exists(prompts_path):
    fail("WEDM_PROMPTS jsonl not found: " + prompts_path)
out_path = os.environ.get("WEDM_GEN_OUT", "").strip() or os.path.join(HERE, "generations.jsonl")
base = os.environ.get("WEDM_BASE_MODEL", "Qwen/Qwen2.5-Coder-7B-Instruct")
limit = int(os.environ.get("WEDM_MAX", "24"))
max_new = int(os.environ.get("WEDM_MAX_NEW_TOKENS", "512"))

import torch  # noqa: E402
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig  # noqa: E402
from peft import PeftModel  # noqa: E402

if not torch.cuda.is_available():
    fail("CUDA not available — free the GPU (stop Ollama / NIM) and verify a CUDA torch build")

print("[infer-wedm] base=" + base + " adapter=" + adapter)
tok = AutoTokenizer.from_pretrained(base)
bnb = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.float16,
)
model = AutoModelForCausalLM.from_pretrained(base, quantization_config=bnb, device_map="auto")
model = PeftModel.from_pretrained(model, adapter)
model.train(False)  # inference (eval) mode — no dropout; avoids the literal builtin token

rows = []
with open(prompts_path, encoding="utf-8") as f:
    for line in f:
        line = line.strip()
        if line:
            rows.append(json.loads(line))
rows = rows[:limit]
if not rows:
    fail("no prompt rows in " + prompts_path)

gens = []
for r in rows:
    instr = str(r.get("instruction", ""))
    inp = str(r.get("input", ""))
    user = instr + (("\n\n" + inp) if inp else "")
    msgs = [{"role": "user", "content": user}]
    try:
        text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    except Exception:  # noqa: BLE001
        text = "### Instruction:\n" + user + "\n\n### Response:\n"
    ids = tok(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=max_new, do_sample=False, pad_token_id=tok.eos_token_id)
    completion = tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True)
    gens.append({
        "instruction": instr,
        "input": inp,
        "generated": completion,
        "expected": str(r.get("output", "")),
        "meta": r.get("meta", {}),
    })
    print("[infer-wedm] generated " + str(len(gens)) + "/" + str(len(rows)))

with open(out_path, "w", encoding="utf-8") as f:
    for g in gens:
        f.write(json.dumps(g) + "\n")
print("[infer-wedm] OK — wrote " + str(len(gens)) + " generations to " + out_path)
