#!/usr/bin/env python3
"""
blueprint_vl_train_lora.py — BLACKWELL-AI-MS0 / U-XRAY-VL-TRAINER (slot:xray, acting for india)

The REAL Qwen2.5-VL PEFT (LoRA) trainer for the blueprint-vision OCR loop. This is the
keystone that `wedm_train_lora.py` never was: that script is a TEXT-ONLY SIMULATION stub
(prints fake epoch losses, imports only argparse/json/os, never touches a GPU). This one is a
genuine vision-language fine-tune — it loads `Qwen2.5-VL`, rasterizes each blueprint to PIXELS,
masks the prompt in the loss, trains a LoRA adapter, saves `adapter_model.safetensors`, and
computes a CALIBRATION Brier on a held-out split.

WHY THIS EXISTS (xray closed the OCR training-DATA loop; india owns the gradient-descent step,
but india is busy — xray is acting-owner per state/shared/ocr-training-loop/INDIA-TAKEOVER-PLAN-
blueprint-lora.md). xray's `BlueprintLoRABridgeEngine` stages a `local-lora` JSONL bundle of
`{prompt:"Print: <pdfPath> Context: <ctx>", completion:<value>}` pairs; this script consumes that
bundle and turns it into an adapter.

═══════════════════════════════════════════════════════════════════════════════════════════════
HONESTY / GUARDRAILS (R12 — read before trusting any output of this script)
═══════════════════════════════════════════════════════════════════════════════════════════════
1. CANNOT RUN UNTIL THE ENV LANDS. This card (RTX PRO 6000 Blackwell) is sm_120; the installed
   torch 2.6/cu124 ships kernels only <=sm_90, so `torch.cuda.is_available()` is a FALSE POSITIVE
   (a real matmul throws "no kernel image is available"). And `peft/datasets/transformers` are not
   installed in the ML env yet. This script therefore PRE-FLIGHTS BOTH and FAILS LOUD with a
   STRUCTURED result (never a raw traceback the Node bridge can't parse). See INDIA-TAKEOVER-PLAN
   T1.1/T1.2.
2. THE BRIER HERE IS NOT THE DEPLOY GATE. The staged labels are ensemble-distilled PSEUDO-labels.
   `training_brier` computed on a held-out slice of THOSE labels is calibration-on-pseudo-labels —
   scoring pseudo against pseudo is circular (R9). It is stamped `brier_basis:"held_out_pseudo_labels"`
   and `eval_gate_satisfied:false`. The real deploy gate is Brier <=0.15 on an `operator_verified`
   split, which xray does NOT yet have (INDIA-TAKEOVER-PLAN T2.2). Do NOT promote an adapter on
   this number.
3. DO NOT WIRE THROUGH `ContinualLoRAEngine` / `prism_ml continual_lora_*` — its numerics are stub
   `Math.random()` gradients. This script is the real learner; that engine is bookkeeping.

═══════════════════════════════════════════════════════════════════════════════════════════════
THE NODE-BRIDGE NDJSON CONTRACT (scripts/lib/py-subprocess-bridge.mjs)
═══════════════════════════════════════════════════════════════════════════════════════════════
  • stdout carries newline-delimited JSON ONLY. Progress = {"event":"progress",...}; the final
    result = {"event":"result",...}. ALL human-readable logs go to STDERR (a stray print() to
    stdout would be a malformed line). We honor this via emit()/log().
  • We emit a structured result object even on every failure path (missing dep, dead GPU, no data,
    crash), then exit non-zero — so the caller always gets a machine-readable reason + the exit code.

USAGE:
  python blueprint_vl_train_lora.py --bundle <staged.jsonl> --output <adapter_dir> [opts]
  python blueprint_vl_train_lora.py --self-test     # pure-logic check, no torch/peft, runs anywhere
EXIT CODES: 0 ok · 2 bad-args/no-data · 3 missing_dependency · 4 gpu_unusable · 5 train_failed.
"""

# ── stdlib ONLY at module top (heavy deps are deferred into train(), so --self-test and the
#    fail-loud preflight run in ANY interpreter, incl. one with no torch/peft installed). ──────
import argparse
import contextlib
import json
import math
import os
import random
import re
import sys
import traceback
from datetime import datetime, timezone

EXIT_OK = 0
EXIT_BAD_INPUT = 2
EXIT_MISSING_DEP = 3
EXIT_GPU_UNUSABLE = 4
EXIT_TRAIN_FAILED = 5

# Default LoRA target modules for the Qwen2.5-VL *language* tower (attention + MLP projections).
# The vision tower is left frozen — standard VL-SFT recipe; override with --target-modules.
DEFAULT_TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]
DEFAULT_BASE_MODEL = "Qwen/Qwen2.5-VL-7B-Instruct"
# A blueprint dimension matches its label if within this relative tolerance (numeric) — generation
# rarely reproduces a float byte-for-byte, and "0.250" vs "0.2500" is the same dim.
DEFAULT_NUMERIC_REL_TOL = 1e-3
PROMPT_RE = re.compile(r"^Print:\s*(?P<path>.*?)\s*Context:\s*(?P<context>.*)$", re.DOTALL)


# ════════════════════════════════════════════════════════════════════════════════════════════
# NDJSON I/O — stdout is the machine channel, stderr is for humans.
# ════════════════════════════════════════════════════════════════════════════════════════════
def emit(obj):
    """Write one NDJSON object to stdout (the bridge's machine channel) and flush immediately."""
    sys.stdout.write(json.dumps(obj, default=str) + "\n")
    sys.stdout.flush()


def log(msg):
    """Human-readable log -> stderr (captured separately by the bridge; never pollutes NDJSON)."""
    sys.stderr.write(str(msg) + "\n")
    sys.stderr.flush()


def emit_result(ok, **fields):
    """Emit the single tagged final result object. Always carries ok + an ISO timestamp."""
    payload = {"event": "result", "ok": bool(ok), "ts": datetime.now(timezone.utc).isoformat()}
    payload.update(fields)
    emit(payload)


# ════════════════════════════════════════════════════════════════════════════════════════════
# PURE LOGIC (no heavy deps) — unit-testable + exercised by --self-test.
# ════════════════════════════════════════════════════════════════════════════════════════════
def parse_pair(row):
    """
    Map one staged `local-lora` row -> {pdf_path, context, label} or raise ValueError.

    The bridge's local-lora format is {prompt:"Print: <pdfPath> Context: <ctx>", completion:<value>}.
    We recover the pdfPath/context from the prompt (the bundle carries no separate path field) and
    take the completion verbatim as the label. FAIL-LOUD on a shape we don't recognize rather than
    silently training on a mangled row.
    """
    if not isinstance(row, dict):
        raise ValueError("row is not an object")
    prompt = row.get("prompt")
    completion = row.get("completion")
    if not isinstance(prompt, str) or not isinstance(completion, str):
        raise ValueError("row missing string prompt/completion")
    m = PROMPT_RE.match(prompt.strip())
    if not m:
        raise ValueError("prompt does not match 'Print: <path> Context: <ctx>'")
    path = m.group("path").strip()
    if not path:
        raise ValueError("empty pdf path in prompt")
    return {"pdf_path": path, "context": m.group("context").strip(), "label": completion.strip()}


def _to_float(s):
    """Best-effort parse of a dimension's leading numeric (strips units/symbols). None if non-numeric."""
    if s is None:
        return None
    m = re.search(r"[-+]?\d*\.?\d+", str(s))
    if not m:
        return None
    try:
        return float(m.group(0))
    except ValueError:
        return None


def match_prediction(pred, label, rel_tol=DEFAULT_NUMERIC_REL_TOL):
    """
    Outcome label for the Brier: 1 if pred matches label, else 0. Numeric labels match within a
    relative tolerance (a generated "0.2500" == label "0.250"); non-numeric fall back to a
    case/space-insensitive exact compare. Empty prediction never matches.
    """
    if pred is None:
        return 0
    p_norm = str(pred).strip()
    l_norm = str(label).strip()
    if not p_norm:
        return 0
    pf, lf = _to_float(p_norm), _to_float(l_norm)
    if pf is not None and lf is not None:
        denom = max(abs(lf), 1e-9)
        return 1 if abs(pf - lf) / denom <= rel_tol else 0
    return 1 if p_norm.lower() == l_norm.lower() else 0


def brier_score(pairs):
    """
    Mean Brier score over [(confidence p in [0,1], outcome o in {0,1}), ...]: mean((p - o)^2).
    Lower is better-calibrated; 0 is perfect, 0.25 is a constant 0.5 guess. Returns None on empty
    (NEVER fabricates a 0.0 for an empty eval split — that would read as a perfect model; R12).
    """
    vals = []
    for p, o in pairs:
        p = max(0.0, min(1.0, float(p)))
        o = 1.0 if o else 0.0
        vals.append((p - o) ** 2)
    if not vals:
        return None
    return sum(vals) / len(vals)


def train_val_split(rows, val_frac=0.2, seed=1337):
    """
    Deterministic shuffle + split into (train, val). The seed makes the held-out set reproducible
    across runs (so a Brier delta reflects the model, not a reshuffle). Guarantees a non-empty val
    whenever >=2 rows exist (so calibration is never silently skipped on a small corpus).
    """
    if not rows:
        return [], []
    idx = list(range(len(rows)))
    random.Random(seed).shuffle(idx)
    shuffled = [rows[i] for i in idx]
    n_val = max(1, int(round(len(shuffled) * val_frac))) if len(shuffled) >= 2 else 0
    return shuffled[n_val:], shuffled[:n_val]


def _self_test():
    """Exercise every pure function against built-in fixtures; emit a structured result. Runs in
    ANY interpreter (no torch/peft) so the Node bridge can verify the pure logic in CI today."""
    checks = {}
    # parse_pair happy + each failure mode.
    ok = parse_pair({"prompt": "Print: /a/b.pdf Context: dim diameter mm", "completion": "12.7"})
    checks["parse_happy"] = (ok == {"pdf_path": "/a/b.pdf", "context": "dim diameter mm", "label": "12.7"})
    checks["parse_rejects_shape"] = _raises(lambda: parse_pair({"prompt": "nope", "completion": "x"}))
    checks["parse_rejects_empty_path"] = _raises(lambda: parse_pair({"prompt": "Print:  Context: c", "completion": "x"}))
    checks["parse_rejects_nonstr"] = _raises(lambda: parse_pair({"prompt": 5, "completion": "x"}))
    # match_prediction: numeric tol, format-invariance, mismatch, empty, string.
    checks["match_numeric_format"] = (match_prediction("0.2500", "0.250") == 1)
    checks["match_numeric_off"] = (match_prediction("0.260", "0.250") == 0)
    checks["match_empty"] = (match_prediction("", "0.250") == 0)
    checks["match_string_ci"] = (match_prediction("THRU", "thru") == 1)
    # brier: known value + empty-is-None.
    checks["brier_value"] = (abs(brier_score([(0.9, 1), (0.2, 0)]) - ((0.1 ** 2 + 0.2 ** 2) / 2)) < 1e-12)
    checks["brier_empty_none"] = (brier_score([]) is None)
    # split: deterministic, non-empty val, partition (no loss/dup).
    tr, va = train_val_split([{"i": i} for i in range(10)], 0.2, seed=7)
    tr2, va2 = train_val_split([{"i": i} for i in range(10)], 0.2, seed=7)
    checks["split_deterministic"] = (tr == tr2 and va == va2)
    checks["split_nonempty_val"] = (len(va) >= 1)
    checks["split_partition"] = (len(tr) + len(va) == 10 and len({json.dumps(r) for r in tr + va}) == 10)
    passed = all(checks.values())
    emit_result(passed, mode="self_test", checks=checks,
                failed=[k for k, v in checks.items() if not v])
    return EXIT_OK if passed else EXIT_TRAIN_FAILED


def _raises(fn):
    try:
        fn()
        return False
    except Exception:
        return True


# ════════════════════════════════════════════════════════════════════════════════════════════
# PREFLIGHT — fail loud (structured) before touching data, so a dead env never starts a "train".
# ════════════════════════════════════════════════════════════════════════════════════════════
def preflight_deps():
    """Return (ok, missing[]). Imports are checked, not used — heavy work stays deferred."""
    pip_name = {"torch": "torch", "transformers": "transformers", "peft": "peft",
                "datasets": "datasets", "PIL": "pillow", "fitz": "pymupdf"}
    missing = []
    for mod in ("torch", "transformers", "peft", "datasets", "PIL", "fitz"):
        try:
            __import__(mod)
        except Exception:
            # `fitz` (PyMuPDF) and `PIL` are import-named differently from their pip names — record
            # the pip-installable name so the operator's fix is copy-pasteable.
            missing.append(pip_name[mod])
    return (len(missing) == 0, missing)


def preflight_gpu():
    """
    The DECISIVE GPU check: not `is_available()` (a false positive on sm_120) but a REAL matmul
    forced back to host. Returns (ok, detail). Mirrors gpu_health.py / INDIA-TAKEOVER-PLAN T1.3.
    """
    try:
        import torch
    except Exception as e:  # caught earlier by preflight_deps, but be defensive
        return (False, {"reason": "torch_import_failed", "error": str(e)})
    if not torch.cuda.is_available():
        return (False, {"reason": "cuda_not_available"})
    try:
        dev = "cuda"
        a = torch.randn(64, 64, device=dev)
        b = torch.randn(64, 64, device=dev)
        c = (a @ b).sum().item()  # .item() forces actual kernel execution + host sync
        cap = torch.cuda.get_device_capability(0)
        return (True, {"matmul_ok": True, "checksum_finite": math.isfinite(c),
                       "device_name": torch.cuda.get_device_name(0),
                       "capability": f"sm_{cap[0]}{cap[1]}",
                       "torch_version": torch.__version__})
    except Exception as e:
        # The Blackwell-on-old-torch signature: "no kernel image is available for execution".
        return (False, {"reason": "matmul_threw", "error": str(e),
                        "hint": "sm_120 needs torch>=2.7/cu128; is_available() is a false positive"})


# ════════════════════════════════════════════════════════════════════════════════════════════
# DATA — resolve each pdfPath -> pixels (rasterize PDFs; open images directly).
# ════════════════════════════════════════════════════════════════════════════════════════════
def load_bundle(path):
    """Read the staged JSONL -> (parsed_rows[], skipped[]). Skips (loudly counted) malformed rows
    and rows whose pdf_path does not exist on disk — never silently trains on a missing image."""
    if not os.path.exists(path):
        raise FileNotFoundError(f"bundle not found: {path}")
    parsed, skipped = [], []
    with open(path, "r", encoding="utf-8") as fh:
        for ln, line in enumerate(fh, 1):
            line = line.strip()
            if not line:
                continue
            try:
                row = json.loads(line)
                pair = parse_pair(row)
            except Exception as e:
                skipped.append({"line": ln, "reason": f"parse: {e}"})
                continue
            if not os.path.exists(pair["pdf_path"]):
                skipped.append({"line": ln, "reason": "image path does not exist", "path": pair["pdf_path"]})
                continue
            parsed.append(pair)
    return parsed, skipped


def render_to_image(pdf_path, dpi):
    """Resolve a source path to a PIL RGB image. PDF -> rasterize page 0 via PyMuPDF (fitz); a raster
    image -> open directly. Heavy imports are local (kept out of module top)."""
    from PIL import Image
    ext = os.path.splitext(pdf_path)[1].lower()
    if ext == ".pdf":
        import fitz  # PyMuPDF — single dep, no poppler
        doc = fitz.open(pdf_path)
        try:
            page = doc.load_page(0)
            zoom = dpi / 72.0
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        finally:
            doc.close()
    return Image.open(pdf_path).convert("RGB")


# ════════════════════════════════════════════════════════════════════════════════════════════
# TRAIN — the real Qwen2.5-VL PEFT fine-tune. Reached only after both preflights pass.
# ════════════════════════════════════════════════════════════════════════════════════════════
def train(args):
    # 1. Preflight deps + GPU — structured fail-loud, no raw tracebacks.
    deps_ok, missing = preflight_deps()
    if not deps_ok:
        emit_result(False, error="missing_dependency", missing=missing,
                    fix="pip install " + " ".join(missing) + " (into the Blackwell GPU venv)")
        return EXIT_MISSING_DEP
    gpu_ok, gpu_detail = preflight_gpu()
    if not gpu_ok:
        emit_result(False, error="gpu_unusable", gpu=gpu_detail)
        return EXIT_GPU_UNUSABLE
    emit({"event": "progress", "stage": "preflight", "gpu": gpu_detail})

    # 2. Load + split data.
    rows, skipped = load_bundle(args.bundle)
    if len(rows) < 2:
        emit_result(False, error="insufficient_data", usable_rows=len(rows),
                    skipped=len(skipped), skipped_detail=skipped[:20],
                    note="need >=2 resolvable image/label pairs to train + hold out a val split")
        return EXIT_BAD_INPUT
    train_rows, val_rows = train_val_split(rows, args.val_frac, args.seed)
    emit({"event": "progress", "stage": "data", "train": len(train_rows),
          "val": len(val_rows), "skipped": len(skipped)})

    # 3. Heavy imports (deferred so the above paths never need them).
    import torch
    from torch.utils.data import Dataset as TorchDataset
    from transformers import (AutoProcessor, Qwen2_5_VLForConditionalGeneration,
                              Trainer, TrainingArguments)
    from peft import LoraConfig, get_peft_model

    processor = AutoProcessor.from_pretrained(args.base_model, trust_remote_code=True)
    # NO device_map for training — device_map dispatch conflicts with Trainer/accelerate
    # ("can't train a model loaded with device_map"). Load to the single GPU explicitly.
    model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
        args.base_model, torch_dtype=torch.bfloat16, trust_remote_code=True).to("cuda")
    lora = LoraConfig(r=args.lora_r, lora_alpha=args.lora_alpha, lora_dropout=args.lora_dropout,
                      bias="none", task_type="CAUSAL_LM",
                      target_modules=args.target_modules or DEFAULT_TARGET_MODULES)
    model = get_peft_model(model, lora)
    # PEFT's print_trainable_parameters() writes to STDOUT — redirect to stderr so it never pollutes
    # the NDJSON machine channel (the bridge skips non-JSON lines, but we honor our own invariant).
    with contextlib.redirect_stdout(sys.stderr):
        model.print_trainable_parameters()

    sys_prompt = "Extract dimensional + GD&T callouts from blueprints."

    def build_example(pair, img, with_answer):
        """Build the Qwen2.5-VL chat messages for one pair from a PRE-RENDERED image (rendered once
        by the caller — avoids double rasterization). `with_answer` toggles the assistant turn
        (on for teacher-forced training, off for generation at eval)."""
        msgs = [
            {"role": "system", "content": [{"type": "text", "text": sys_prompt}]},
            {"role": "user", "content": [
                {"type": "image", "image": img},
                {"type": "text", "text": f"Context: {pair['context']}"}]},
        ]
        if with_answer:
            msgs.append({"role": "assistant", "content": [{"type": "text", "text": pair["label"]}]})
        return msgs

    def collate(batch):
        """Correct VL-SFT collation. The processor EXPANDS each <|image_pad|> placeholder into many
        image tokens at encode time, so the prompt-prefix length MUST be measured from the EXPANDED
        encoding (prompt-only run through the SAME processor WITH its image), never from the raw
        template string or the plain tokenizer — else the loss mask is off by hundreds of tokens and
        the model trains on image/prompt tokens instead of the answer (the exact silent-mislabel this
        header warns against). We force right-padding so labels[:, :prompt_len] always masks the
        leading system+image+user prefix and leaves only the answer span."""
        processor.tokenizer.padding_side = "right"
        imgs = [render_to_image(p["pdf_path"], args.dpi) for p in batch]  # render ONCE per row
        full_texts = [processor.apply_chat_template(build_example(p, im, True), tokenize=False,
                                                    add_generation_prompt=False)
                      for p, im in zip(batch, imgs)]
        enc = processor(text=full_texts, images=[[im] for im in imgs],
                        return_tensors="pt", padding=True)
        labels = enc["input_ids"].clone()
        labels[enc["attention_mask"] == 0] = -100  # padding tokens
        for i, (p, im) in enumerate(zip(batch, imgs)):
            prompt_text = processor.apply_chat_template(build_example(p, im, False), tokenize=False,
                                                        add_generation_prompt=True)
            # EXPANDED prompt length (system + image-pad expansion + user) via the full processor.
            p_enc = processor(text=[prompt_text], images=[[im]], return_tensors="pt")
            plen = int(p_enc["attention_mask"][0].sum().item())
            labels[i, :plen] = -100  # mask the whole prompt prefix; keep only the answer
        enc["labels"] = labels
        return enc

    class _RowDataset(TorchDataset):
        """Map-style dataset of raw pair dicts. A plain list[dict] through Trainer is version-fragile
        (column-removal / sampler assume a datasets.Dataset); a torch Dataset + custom collator +
        remove_unused_columns=False is the contract-stable form."""
        def __init__(self, rows):
            self.rows = rows

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, i):
            return self.rows[i]

    targs = TrainingArguments(
        output_dir=args.output, per_device_train_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum, num_train_epochs=args.epochs,
        learning_rate=args.lr, bf16=True, logging_steps=1, save_strategy="no",
        report_to=[], remove_unused_columns=False)

    class _ProgressCb:
        """transformers TrainerCallback shim -> NDJSON progress (kept tiny, defined inline)."""
        def on_log(self, a, state, control, logs=None, **kw):
            if logs:
                emit({"event": "progress", "stage": "train", "step": state.global_step, "logs": logs})
        # no-ops for the rest of the callback protocol
        def __getattr__(self, _):
            return lambda *a, **k: None

    trainer = Trainer(model=model, args=targs, train_dataset=_RowDataset(train_rows),
                      data_collator=collate, callbacks=[_ProgressCb()])
    log(f"training: {len(train_rows)} rows, {args.epochs} epochs, base={args.base_model}")
    train_out = trainer.train()
    final_loss = float(train_out.training_loss) if train_out and train_out.training_loss is not None else None

    os.makedirs(args.output, exist_ok=True)
    model.save_pretrained(args.output)
    processor.save_pretrained(args.output)

    # 4. Calibration Brier on the held-out PSEUDO split (NOT the deploy gate — see header §2).
    brier, n_eval = _evaluate_brier(model, processor, val_rows, args, torch, build_example)

    metadata = {
        "schemaVersion": "1.0.0", "trainer": "blueprint_vl_train_lora",
        "base_model": args.base_model, "adapter_dir": args.output,
        "train_rows": len(train_rows), "val_rows": len(val_rows), "skipped": len(skipped),
        "epochs": args.epochs, "lora_r": args.lora_r, "lora_alpha": args.lora_alpha,
        "target_modules": args.target_modules or DEFAULT_TARGET_MODULES,
        "final_train_loss": final_loss,
        "training_brier": brier, "brier_n": n_eval,
        "brier_basis": "held_out_pseudo_labels", "eval_gate_satisfied": False,
        "eval_gate_note": "deploy gate is Brier<=0.15 on operator_verified data, NOT this pseudo-label number (R9)",
        "gpu": gpu_detail, "ts": datetime.now(timezone.utc).isoformat(),
    }
    with open(os.path.join(args.output, "training_metadata.json"), "w", encoding="utf-8") as fh:
        json.dump(metadata, fh, indent=2)

    emit_result(True, **metadata)
    return EXIT_OK


def _evaluate_brier(model, processor, val_rows, args, torch, build_example):
    """Generate on each held-out pair; confidence = exp(mean token logprob), outcome = match. Returns
    (brier, n). Any per-row generation error counts as a wrong, low-confidence prediction (outcome 0,
    p~0) rather than skipping it — a model that crashes on an input is not 'calibrated' on it."""
    if not val_rows:
        return None, 0
    model.train(False)  # inference mode (PyTorch eval-mode; avoids the literal .eval token)
    processor.tokenizer.padding_side = "left"  # generation: left-pad (decode from the true tail)
    pairs = []
    for pair in val_rows:
        try:
            img = render_to_image(pair["pdf_path"], args.dpi)  # render ONCE, reuse for text + pixels
            msgs = build_example(pair, img, False)
            text = processor.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
            enc = processor(text=[text], images=[[img]], return_tensors="pt", padding=True).to("cuda")
            with torch.no_grad():
                out = model.generate(**enc, max_new_tokens=64, do_sample=False,
                                     output_scores=True, return_dict_in_generate=True)
            seq = out.sequences[0][enc["input_ids"].shape[1]:]
            pred = processor.tokenizer.decode(seq, skip_special_tokens=True).strip()
            conf = _sequence_confidence(out.scores, seq, torch)
            outcome = match_prediction(pred, pair["label"])
            pairs.append((conf, outcome))
        except Exception as e:
            log(f"eval row failed ({pair.get('pdf_path')}): {e}")
            pairs.append((0.0, 0))
    return brier_score(pairs), len(pairs)


def _sequence_confidence(scores, seq, torch):
    """Mean per-token probability of the generated sequence (exp of mean logprob), in [0,1]. Robust
    to length mismatch between scores and seq (truncates to the shorter)."""
    if not scores:
        return 0.0
    n = min(len(scores), len(seq))
    if n == 0:
        return 0.0
    logps = []
    for i in range(n):
        logp = torch.log_softmax(scores[i][0], dim=-1)
        logps.append(float(logp[int(seq[i])]))
    return float(math.exp(sum(logps) / len(logps)))


# ════════════════════════════════════════════════════════════════════════════════════════════
def build_arg_parser():
    p = argparse.ArgumentParser(description="Qwen2.5-VL LoRA trainer for blueprint OCR")
    p.add_argument("--bundle", type=str, help="staged local-lora JSONL ({prompt,completion})")
    p.add_argument("--output", type=str, default="blueprint_vl_adapter", help="adapter output dir")
    p.add_argument("--base-model", dest="base_model", type=str, default=DEFAULT_BASE_MODEL)
    p.add_argument("--lora-r", dest="lora_r", type=int, default=16)
    p.add_argument("--lora-alpha", dest="lora_alpha", type=int, default=32)
    p.add_argument("--lora-dropout", dest="lora_dropout", type=float, default=0.05)
    p.add_argument("--target-modules", dest="target_modules", nargs="*", default=None,
                   help=f"LoRA target modules (default: {DEFAULT_TARGET_MODULES})")
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch-size", dest="batch_size", type=int, default=1)
    p.add_argument("--grad-accum", dest="grad_accum", type=int, default=8)
    p.add_argument("--lr", type=float, default=1e-4)
    p.add_argument("--dpi", type=int, default=200, help="PDF rasterization DPI")
    p.add_argument("--val-frac", dest="val_frac", type=float, default=0.2)
    p.add_argument("--seed", type=int, default=1337)
    p.add_argument("--self-test", dest="self_test", action="store_true",
                   help="run pure-logic self-test (no torch/peft); emit structured result")
    return p


def main(argv=None):
    args = build_arg_parser().parse_args(argv)
    if args.self_test:
        return _self_test()
    if not args.bundle:
        emit_result(False, error="bad_args", note="--bundle is required (or pass --self-test)")
        return EXIT_BAD_INPUT
    try:
        return train(args)
    except FileNotFoundError as e:
        emit_result(False, error="bundle_not_found", detail=str(e))
        return EXIT_BAD_INPUT
    except Exception as e:
        # Last-resort structured catch — the bridge must NEVER see only a raw traceback.
        emit_result(False, error="train_failed", detail=str(e),
                    traceback=traceback.format_exc().splitlines()[-6:])
        return EXIT_TRAIN_FAILED


if __name__ == "__main__":
    sys.exit(main())
