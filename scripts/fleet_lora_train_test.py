#!/usr/bin/env python3
"""
Hermetic tests for fleet_lora_train.py -- the pure dataset-build + config logic, with
NO torch (runs on any Python incl. the 3.14 default). The real GPU train() is validated
separately on a CUDA venv via --smoke. R9: each test fails if the mapping / weighting /
config intent regresses.

Run: H:/Tools/python/python.exe scripts/fleet_lora_train_test.py
"""
import json
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import fleet_lora_train as flt  # noqa: E402

_fails = []


def check(name, cond, detail=""):
    if cond:
        print("ok   - %s" % name)
    else:
        print("FAIL - %s  %s" % (name, detail))
        _fails.append(name)


def write_jsonl(rows):
    fd, path = tempfile.mkstemp(suffix=".jsonl")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")
    return path


# -- load_corpus -------------------------------------------------------------
def test_load_corpus():
    path = write_jsonl([
        {"instruction": "Q1", "input": "", "output": "A1", "weight": 1.0, "advisory": False},
        {"instruction": "", "output": "bad"},               # empty instruction -> invalid
        {"instruction": "Q2", "output": ""},                # empty output -> invalid
        {"prompt": "wiki", "completion": "x"},              # no instruction/output -> invalid (pre-normalized corpus is native)
        {"instruction": "Q3", "input": "i", "output": "A3", "weight": 0.5, "advisory": True},
    ])
    try:
        rows, invalid = flt.load_corpus(path)
        check("load_corpus keeps only valid Alpaca rows", len(rows) == 2, "got %d" % len(rows))
        check("load_corpus counts invalid", invalid == 3, "got %d" % invalid)
    finally:
        os.remove(path)
    try:
        flt.load_corpus(os.path.join(tempfile.gettempdir(), "definitely-absent-fleet-corpus.jsonl"))
        check("load_corpus raises on missing file", False, "did not raise")
    except FileNotFoundError:
        check("load_corpus raises on missing file (fail loud)", True)


# -- resolve_sample_weight ---------------------------------------------------
def test_weight():
    check("explicit numeric weight wins", flt.resolve_sample_weight({"weight": 0.5, "advisory": False}) == 0.5)
    check("explicit weight 1.0 verified", flt.resolve_sample_weight({"weight": 1.0}) == 1.0)
    check("advisory:true -> 0.5 when no weight", flt.resolve_sample_weight({"advisory": True}) == 0.5)
    check("default -> 1.0 (verified)", flt.resolve_sample_weight({}) == 1.0)
    # a bool must NOT be read as a numeric weight (True == 1 in python -- the guard excludes bool)
    check("bool 'weight' is NOT treated as numeric", flt.resolve_sample_weight({"weight": True, "advisory": True}) == 0.5)


# -- format_example ----------------------------------------------------------
def test_format_example():
    ex = flt.format_example({"instruction": "Do X", "input": "ctx", "output": "Result", "weight": 0.5})
    check("prompt contains the instruction", "Do X" in ex["prompt"])
    check("input block rendered when input present", "### Input:\nctx" in ex["prompt"])
    check("response key present in prompt (completion boundary)", flt.RESPONSE_KEY in ex["prompt"])
    check("text = prompt + completion", ex["text"] == ex["prompt"] + "Result")
    check("completion is the output", ex["completion"] == "Result")
    check("weight carried through", ex["weight"] == 0.5)
    # input absent -> no input block (boundary still present)
    ex2 = flt.format_example({"instruction": "Q", "output": "A"})
    check("no input block when input empty", "### Input:" not in ex2["prompt"])
    check("verified default weight when none given", ex2["weight"] == flt.VERIFIED_WEIGHT)


# -- build_lora_config_dict --------------------------------------------------
def test_lora_config():
    c = flt.build_lora_config_dict(rank=16, alpha=32)
    check("lora r = rank", c["r"] == 16)
    check("lora alpha", c["lora_alpha"] == 32)
    check("task_type CAUSAL_LM", c["task_type"] == "CAUSAL_LM")
    check("target_modules include attention proj", "q_proj" in c["target_modules"] and "v_proj" in c["target_modules"])
    check("target_modules include MLP proj (QLoRA-all-linear)", "down_proj" in c["target_modules"])


# -- build_training_args_dict ------------------------------------------------
def test_training_args():
    a = flt.build_training_args_dict("/out", max_steps=400, batch=4, grad_accum=4)
    check("max_steps governs when >0", a.get("max_steps") == 400 and "num_train_epochs" not in a)
    b = flt.build_training_args_dict("/out", max_steps=0, epochs=2)
    check("epochs govern when max_steps=0", b.get("num_train_epochs") == 2.0 and "max_steps" not in b)
    check("paged 8bit optimizer (QLoRA)", a["optim"] == "paged_adamw_8bit")
    check("report_to none (no wandb side effect)", a["report_to"] == "none")
    # REGRESSION (live smoke 2026-06-11): the custom sample_weight column MUST survive to
    # the weighted collator -- HF's default remove_unused_columns=True strips it -> KeyError.
    check("remove_unused_columns False (keep sample_weight for weighted loss)", a["remove_unused_columns"] is False)


# -- summarize_corpus --------------------------------------------------------
def test_summary():
    rows = [
        {"instruction": "a", "output": "x" * 10, "weight": 1.0, "advisory": False, "source": "vault-feedback-lora"},
        {"instruction": "b", "output": "y" * 20, "weight": 0.5, "advisory": True, "source": "wiki-canonical-pairs"},
        {"instruction": "c", "output": "z" * 30, "weight": 0.5, "advisory": True, "galaxy": "mill", "source": "vault-galaxy-synthesis-lora"},
    ]
    s = flt.summarize_corpus(rows)
    check("rows counted", s["rows"] == 3)
    check("verified counted (weight>=1.0)", s["verified"] == 1, "got %d" % s["verified"])
    check("advisory counted", s["advisory"] == 2, "got %d" % s["advisory"])
    check("galaxiesCovered", s["galaxiesCovered"] == 1)
    check("sources collected + sorted", s["sources"][0] == "vault-feedback-lora")


# -- parse_args / --smoke shaping -------------------------------------------
def test_parse_args_smoke():
    a = flt.parse_args(["--smoke", "--base", "tiny"])
    check("--smoke shrinks max_steps to 8", a.max_steps == 8)
    check("--smoke caps rank at 8", a.rank == 8)
    d = flt.parse_args(["--dry-run"])
    check("--dry-run flag parsed", d.dry_run is True)
    check("default 4bit on", d.load_in_4bit is True)
    n = flt.parse_args(["--no-4bit"])
    check("--no-4bit disables", n.load_in_4bit is False)


def main():
    test_load_corpus()
    test_weight()
    test_format_example()
    test_lora_config()
    test_training_args()
    test_summary()
    test_parse_args_smoke()
    print("\n%d failed" % len(_fails) if _fails else "\nALL PASS")
    return 1 if _fails else 0


if __name__ == "__main__":
    sys.exit(main())
