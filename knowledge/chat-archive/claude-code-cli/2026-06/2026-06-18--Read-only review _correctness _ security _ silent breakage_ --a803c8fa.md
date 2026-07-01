---
type: "chat-session"
source: "claude-code-cli"
session_id: "a803c8fa-8407-40f0-81d9-0a56f2031bb5"
title: "Read-only review (correctness / security / silent breakage) of a NEW Python LoRA"
date: "2026-06-18"
first_ts: "2026-06-18T15:56:14.466Z"
last_ts: "2026-06-18T15:57:31.593Z"
cwd: "H:\\prism-slot-india"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-ab2f01336cddf4699.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:57"
---

# Read-only review (correctness / security / silent breakage) of a NEW Python LoRA

> **claude-code-cli** | 2026-06-18 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism-slot-india
> Raw: `H:/.claude/projects/H--prism-slot-india/a803c8fa-8407-40f0-81d9-0a56f2031bb5/subagents/agent-ab2f01336cddf4699.jsonl`

## Transcript

### User | 2026-06-18T15:56:14.466Z

Read-only review (correctness / security / silent breakage) of a NEW Python LoRA serving script. Grade PASS or FAIL with file:line.

CONTEXT: slot:india. scripts/lora_infer.py serves the trained fleet rsLoRA adapter (which was orphaned -- no inference consumer). It loads the HF base (Qwen/Qwen2.5-7B-Instruct) the SAME 4-bit QLoRA way scripts/fleet_lora_train.py does, attaches the trained adapter via PeftModel.from_pretrained, and generates. LIVE-VALIDATED: ran exit 0 on the Blackwell GPU, loaded base+adapter in 197s, generated, and --compare showed adapter_changes_output:true (the adapter is applied).

FILES (read end-to-end):
- H:/prism/scripts/lora_infer.py  (the new serving script)
- H:/prism/scripts/fleet_lora_train.py lines 210-275 (the trainer's model-load it mirrors -- verify the bnb/quantization config + base-load MATCH so the adapter loads on a compatible base)

VERIFY:
1. ADAPTER LOAD CORRECTNESS: PeftModel.from_pretrained(base_model, adapter) attaches the TRAINED adapter (vs get_peft_model = fresh untrained). Confirm it's the right call. Confirm the bnb 4-bit config (nf4, double-quant, bf16 compute) MATCHES the trainer's so the QLoRA adapter loads on a compatible base.
2. --compare CORRECTNESS: `with model.disable_adapter(): base_only = generate(...)` -- does disable_adapter() correctly route through the bare base (proving the adapter's effect)? Is the comparison sound?
3. CHAT TEMPLATE: apply_chat_template with add_generation_prompt=True + slicing out the prompt tokens (out[0][inputs.input_ids.shape[1]:]) -- correct decode of only the generated continuation?
4. FAIL-LOUD: preflight_cuda raises if no torch/CUDA (correct for a GPU path). Any silent-failure path (e.g., adapter dir missing -> cryptic error vs clear)?
5. SECURITY/SAFETY: read-only inference, no state mutation, no eval/exec, no arbitrary-path write. Confirm it writes nothing (only prints JSON). Any injection/path risk in the args?
6. HONESTY: the script warns (stderr) the adapter is thin-corpu
... [+184 chars truncated]

### Assistant | 2026-06-18T15:56:22.330Z

I'll review the new LoRA serving script and verify it against the trainer's model-load. Let me read both files end-to-end.

### Assistant | 2026-06-18T15:56:22.869Z

[tool_use: Read]

### Assistant | 2026-06-18T15:56:23.313Z

[tool_use: Read]

### User | 2026-06-18T15:56:23.821Z

[tool_result] 1	#!/usr/bin/env python
2	"""
3	lora_infer.py -- LoRA adapter INFERENCE/serving for the fleet rsLoRA adapter (slot:india 2026-06-18).
4	
5	WHY: scripts/fleet_lora_train.py TRAINS adapters but nothing SERVES them -- the trained
6	fleet-rslora-r32/checkpoint-350 adapter was an ORPHAN (no live inference consumer; see
7	reference_rslora_adapter_orphaned_2026_06_18). This is the missing serving half: l
... [+6034 chars truncated]

### User | 2026-06-18T15:56:24.968Z

[tool_result] 200	        raise RuntimeError(
201	            "torch is installed but CUDA is NOT available (torch=%s). The CPU-only wheel was "
202	            "likely installed (the 3.14 trap) -- reinstall the cu128 wheel and verify "
203	            "torch.cuda.is_available() before training." % torch.__version__
204	        )
205	    return torch.cuda.get_device_name(0)
206	
207	
208	def train(args):
209	  
... [+4180 chars truncated]

### Assistant | 2026-06-18T15:56:29.134Z

I have both files. Let me verify the trainer's LoRA config and the adapter directory to confirm the base/quantization match and that the adapter actually exists where the script expects it.

### Assistant | 2026-06-18T15:56:30.079Z

[tool_use: Read]

### Assistant | 2026-06-18T15:56:31.404Z

[tool_use: Grep]

### User | 2026-06-18T15:56:31.441Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	fleet_lora_train.py -- general LoRA (QLoRA) fine-tune for the fleet Alpaca corpus.
4	U-FLOR-FLEET-LORA-TRAINER (slot:tango 2026-06-11).
5	
6	CLOSES THE VERIFIED GAP: the fleet LoRA corpus
7	(state/shared/lora/fleet-lora-combined.jsonl, 1138 Alpaca rows of shape
8	{instruction, input, output, weight, source, advisory}) was trainingReady but had
9	NO real trainer. Th
... [+3414 chars truncated]

### User | 2026-06-18T15:56:32.822Z

[tool_result] 30:(save_steps + resume_from_checkpoint) so a fleet-reaper kill mid-run resumes
38:      --base Qwen/Qwen2.5-7B-Instruct \
43:  python scripts/fleet_lora_train.py --smoke --base Qwen/Qwen2.5-0.5B-Instruct
139:def build_lora_config_dict(rank=16, alpha=32, dropout=0.05, target_modules=None, use_rslora=False):
151:        "task_type": "CAUSAL_LM",
152:        "target_modules": list(target_modules or 
... [+910 chars truncated]

### Assistant | 2026-06-18T15:56:37.944Z

Let me verify the trainer's LoRA config details (to confirm `task_type`, `modules_to_save`, and how the adapter is saved) and confirm the adapter directory actually exists with its config.

### Assistant | 2026-06-18T15:56:43.000Z

[tool_use: Read]

### Assistant | 2026-06-18T15:56:44.028Z

[tool_use: Bash]

### User | 2026-06-18T15:56:44.198Z

[tool_result] 139	def build_lora_config_dict(rank=16, alpha=32, dropout=0.05, target_modules=None, use_rslora=False):
140	    """The LoraConfig kwargs (a plain dict so it is testable without peft).
141	
142	    use_rslora (peft >=0.7): rank-stabilized LoRA scales the adapter by
143	    alpha/sqrt(r) instead of alpha/r, which keeps the effective learning rate
144	    stable as rank grows -- materially better at 
... [+817 chars truncated]

### User | 2026-06-18T15:56:48.014Z

[tool_result] total 476132
drwxr-xr-x 1 wompu 197611         0 Jun 15 17:39 ./
drwxr-xr-x 1 wompu 197611         0 Jun 15 17:44 ../
-rw-r--r-- 1 wompu 197611      5202 Jun 15 17:39 README.md
-rw-r--r-- 1 wompu 197611      1149 Jun 15 17:39 adapter_config.json
-rw-r--r-- 1 wompu 197611 323014168 Jun 15 17:39 adapter_model.safetensors
-rw-r--r-- 1 wompu 197611 164477509 Jun 15 17:39 optimizer.pt
-rw-r--r-- 1 womp
... [+2220 chars truncated]

### Assistant | 2026-06-18T15:56:52.695Z

I now have everything needed to verify the contract end-to-end. The adapter_config.json confirms the critical facts: `base_model_name_or_path: "Qwen/Qwen2.5-7B-Instruct"` (matches `DEFAULT_BASE`), `peft_type: "LORA"`, `r: 32`, `use_rslora: true`, `modules_to_save: null`, `task_type: "CAUSAL_LM"`, target_modules match the trainer's `DEFAULT_TARGET_MODULES`. Let me check two remaining points: the tokenizer source (the chat template) and the checkpoint-350 contents for a tokenizer.

### Assistant | 2026-06-18T15:56:56.013Z

[tool_use: Bash]

### User | 2026-06-18T15:57:01.448Z

[tool_result] ===checkpoint-350 has tokenizer?===
NO tokenizer in checkpoint-350
===base model in checkpoint-350 adapter_config (already seen: Qwen2.5-7B-Instruct)===
===does fleet_lora_train save tokenizer to --out (parent) not checkpoint?===
306:    model.save_pretrained(args.out)
307:    tok.save_pretrained(args.out)

### Assistant | 2026-06-18T15:57:31.593Z

I have all the facts I need. Let me complete the analysis.

**Key verifications:**
- Adapter is at `checkpoint-350` with `adapter_config.json` declaring `base_model_name_or_path: "Qwen/Qwen2.5-7B-Instruct"` (= `DEFAULT_BASE`), `peft_type: LORA`, `use_rslora: true`, `r: 32`, `modules_to_save: null`, `inference_mode: true`. So `PeftModel.from_pretrained` loads the trained weights correctly and the base matches.
- bnb config in `lora_infer.py:57-62` is byte-identical to the trainer's `fleet_lora_train.py:261-266` (nf4 + double-quant + bf16 compute). The QLoRA adapter loads on a compatible base.
- The tokenizer: `lora_infer.py:53` loads from `--base` (the HF hub `Qwen/Qwen2.5-7B-Instruct`), NOT from the checkpoint. The checkpoint-350 dir has **no tokenizer** (trainer saves tokenizer to the parent `--out`, line 307, not into checkpoint subdirs). So loading the tokenizer from the hub base is the correct and only viable path — and the hub Qwen2.5-Instruct tokenizer carries the chat template. Sound.

Now my findings.

---

VERDICT: PASS

summary: lora_infer.py is a correct, read-only serving counterpart to the trainer. The adapter-load contract holds: `PeftModel.from_pretrained` attaches the TRAINED checkpoint-350 weights (not a fresh adapter), the bnb 4-bit config is byte-identical to the trainer's, and adapter_config.json confirms the base (`Qwen/Qwen2.5-7B-Instruct`) and rsLoRA r=32 match. The `--compare` logic via `disable_adapter()` is the canonical PEFT way to prove adapter effect, the chat-template + prompt-slicing decode is correct, and the script writes nothing and contains no eval/exec/path-injection surface. The only items worth noting are P2 robustness gaps, none of which break the validated path.

findings:
- [P2] H:/prism/scripts/lora_infer.py:69 -- Silent-failure ergonomics: a missing/typo'd `--adapter` dir surfaces only as PEFT's internal "Can't find adapter_config.json" error, not a clear preflight message. The trainer fails loud on a missing corpus (`fleet
... [+3197 chars truncated]
