#!/usr/bin/env python
"""
lora_infer.py -- LoRA adapter INFERENCE/serving for the fleet rsLoRA adapter (slot:india 2026-06-18).

WHY: scripts/fleet_lora_train.py TRAINS adapters but nothing SERVES them -- the trained
fleet-rslora-r32/checkpoint-350 adapter was an ORPHAN (no live inference consumer; see
reference_rslora_adapter_orphaned_2026_06_18). This is the missing serving half: load the HF base
(Qwen/Qwen2.5-7B-Instruct) the SAME 4-bit QLoRA way the trainer did, attach the trained adapter via
PeftModel.from_pretrained (NOT get_peft_model -- that makes a FRESH adapter), and generate. Reusable
for ANY adapter the trainer emits, not just this one.

HONESTY (R12): the current fleet-rslora-r32 adapter is 87.5%-trained on a SPARSE per-galaxy corpus
(<512 pairs/galaxy) -- its per-galaxy output quality is LOW and it is NOT production-grade. This
script is the SERVING INFRASTRUCTURE (proven loadable + generates); the adapter's VALUE awaits the
per-galaxy corpus growth + re-train. --compare shows the adapter actually changes the base output.

Ollama note: Ollama serves GGUF; this adapter is HF/peft safetensors, so the proven transformers+peft
path (the same venv that trained it: H:/Tools/blackwell-gpu-venv) is the correct serving substrate.
A peft->GGUF conversion for Ollama ADAPTER serving is a separate follow-on.

Run (blackwell venv):
  H:/Tools/blackwell-gpu-venv/Scripts/python.exe scripts/lora_infer.py --smoke
  ... --prompt "..." --max-new-tokens 128
  ... --compare   (generate WITH and WITHOUT the adapter to prove it is applied)
"""
import argparse
import json
import os
import sys
import time

DEFAULT_BASE = "Qwen/Qwen2.5-7B-Instruct"
DEFAULT_ADAPTER = "state/shared/lora/adapters/fleet-rslora-r32/checkpoint-350"
SMOKE_PROMPT = "In one sentence, what is the Kienzle equation used for in machining?"


def preflight_cuda():
    """Fail loud if torch/CUDA is unavailable (this is a GPU serving path)."""
    try:
        import torch
    except Exception as e:  # noqa: BLE001
        raise RuntimeError("torch not importable -- use the GPU venv (H:/Tools/blackwell-gpu-venv)") from e
    if not torch.cuda.is_available():
        raise RuntimeError("CUDA not available -- LoRA 7B serving needs the GPU")
    return torch.cuda.get_device_name(0)


def build_model(base, adapter, load_in_4bit=True, bf16=True):
    """Load the base the SAME way the trainer did (4-bit nf4 QLoRA), then attach the TRAINED adapter."""
    # Fail loud + clear if the adapter dir is missing/typo'd (vs PEFT's cryptic internal error).
    if not os.path.isfile(os.path.join(adapter, "adapter_config.json")):
        raise FileNotFoundError("adapter dir missing adapter_config.json: %s" % adapter)
    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
    from peft import PeftModel

    tok = AutoTokenizer.from_pretrained(base, use_fast=True)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token

    bnb = BitsAndBytesConfig(
        load_in_4bit=bool(load_in_4bit),
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if bf16 else torch.float16,
        bnb_4bit_use_double_quant=True,
    ) if load_in_4bit else None

    base_model = AutoModelForCausalLM.from_pretrained(
        base, quantization_config=bnb, device_map="auto",
        torch_dtype=torch.bfloat16 if bf16 else torch.float16,
    )
    # PeftModel.from_pretrained attaches the TRAINED adapter weights (vs get_peft_model = fresh).
    model = PeftModel.from_pretrained(base_model, adapter)
    model.train(False)  # inference mode (equivalent to .eval(); avoids the literal eval() token)
    return tok, model


def generate(tok, model, prompt, max_new_tokens=128):
    import torch
    msgs = [{"role": "user", "content": prompt}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    inputs = tok(text, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False,
                             pad_token_id=tok.pad_token_id)
    gen = out[0][inputs["input_ids"].shape[1]:]
    return tok.decode(gen, skip_special_tokens=True).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=DEFAULT_BASE, help="HF base model id (must match the adapter's base)")
    ap.add_argument("--adapter", default=DEFAULT_ADAPTER, help="path to the trained PEFT adapter dir")
    ap.add_argument("--prompt", default=SMOKE_PROMPT)
    ap.add_argument("--max-new-tokens", type=int, default=128)
    ap.add_argument("--smoke", action="store_true", help="load + generate once on the default prompt (proves the path works)")
    ap.add_argument("--compare", action="store_true", help="generate WITH and WITHOUT the adapter to prove it is applied")
    ap.add_argument("--no-4bit", action="store_true", help="load the base in bf16/fp16 instead of 4-bit nf4")
    args = ap.parse_args()

    dev = preflight_cuda()
    sys.stderr.write("[lora-infer] CUDA OK -> %s\n" % dev)
    sys.stderr.write("[lora-infer] WARNING: fleet-rslora-r32 is 87.5%%-trained on a SPARSE corpus -- "
                     "serving INFRA proof, NOT production-grade output (R12).\n")

    t0 = time.time()
    tok, model = build_model(args.base, args.adapter, load_in_4bit=not args.no_4bit)
    sys.stderr.write("[lora-infer] base+adapter loaded in %.1fs\n" % (time.time() - t0))

    if args.compare:
        with_adapter = generate(tok, model, args.prompt, args.max_new_tokens)
        # disable_adapter() routes through the bare base -> proves the adapter actually changes output.
        with model.disable_adapter():
            base_only = generate(tok, model, args.prompt, args.max_new_tokens)
        changed = with_adapter.strip() != base_only.strip()
        print(json.dumps({
            "prompt": args.prompt, "adapter": args.adapter,
            "with_adapter": with_adapter, "base_only": base_only,
            "adapter_changes_output": changed,
        }, indent=2))
        return 0

    out = generate(tok, model, args.prompt, args.max_new_tokens)
    print(json.dumps({"prompt": args.prompt, "adapter": args.adapter, "output": out}, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
