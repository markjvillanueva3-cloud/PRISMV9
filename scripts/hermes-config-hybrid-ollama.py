#!/usr/bin/env python3
"""
hermes-config-hybrid-ollama.py -- repoint Hermes (Nous) inference from Anthropic
to local Ollama for the PRISM HYBRID model (HERMES-BRIDGE-MS0/U-HYBRID-OLLAMA).

Why: in the hybrid, Claude Code CLI does the hard work (brainstorm / plan / deep
reasoning / hard coding) and Hermes strategically absorbs the EASIER offloaded
tasks on a free local model. Hermes' agent loop was pinned to Anthropic models,
which now return HTTP 400 under the third-party-app billing policy. This repoints
every Hermes inference slot that targets `anthropic` to a free local Ollama model
so the Hermes fleet runs at $0.

Scope (idempotent -- only touches slots whose provider is currently 'anthropic'):
  - model            (main agent model)        -> ollama / REASONING_MODEL
  - fallback_model                              -> ollama / FALLBACK_MODEL
  - auxiliary.vision (multimodal)               -> ollama / VISION_MODEL
Applied to the root config.yaml AND every profiles/<slot>/config.yaml (the
per-slot agent configs the `hermes -p <slot>` fleet loads).

Uses ruamel.yaml round-trip so comments + key order are preserved. Each changed
file is backed up to <file>.bak-hybrid-<epoch> before writing.

Usage:
  python scripts/hermes-config-hybrid-ollama.py [--dir <hermes dir>] [--apply]
  (default = dry-run; --apply writes. --dir default = C:/Users/wompu/AppData/Local/hermes)

Models are overridable via env:
  PRISM_HERMES_REASONING_MODEL (default gpt-oss:120b)
  PRISM_HERMES_FALLBACK_MODEL  (default qwen2.5-coder:32b)
  PRISM_HERMES_VISION_MODEL    (default qwen2.5vl:32b)
"""
import os
import sys
import time
import glob

try:
    from ruamel.yaml import YAML
except Exception as e:  # pragma: no cover
    print(f"[hermes-hybrid] ruamel.yaml required: {e}", file=sys.stderr)
    sys.exit(3)

REASONING_MODEL = os.environ.get("PRISM_HERMES_REASONING_MODEL", "gpt-oss:120b")
FALLBACK_MODEL = os.environ.get("PRISM_HERMES_FALLBACK_MODEL", "qwen2.5-coder:32b")
VISION_MODEL = os.environ.get("PRISM_HERMES_VISION_MODEL", "qwen2.5vl:32b")
# CRITICAL: Hermes' `provider: ollama` defaults to Ollama CLOUD (https://ollama.com/v1)
# when base_url is empty -- it keys on ":11434" in base_url to use LOCAL ollama
# (run_agent.py / cli.py). So every ollama block MUST carry the explicit local URL,
# else inference silently routes to the cloud (needs a paid key) -- which is what
# produced the xAI/ollama.com key error after the first repoint.
LOCAL_OLLAMA = os.environ.get("PRISM_HERMES_OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
LOCAL_KEY = "ollama-local"  # ollama ignores the value; a non-empty key avoids client errors
DEFAULT_DIR = "C:/Users/wompu/AppData/Local/hermes"


def _localize(block):
    """Force an ollama block onto the LOCAL endpoint (set base_url if empty or
    pointing at ollama.com cloud; set a dummy api_key if empty)."""
    notes = []
    bu = block.get("base_url", "")
    if not bu or "ollama.com" in str(bu):
        block["base_url"] = LOCAL_OLLAMA
        notes.append("base_url->local")
    if not block.get("api_key"):
        block["api_key"] = LOCAL_KEY
    return notes


def repoint_block(block, model_key, new_model):
    """Force a primary model block onto LOCAL ollama. Flips ANY non-ollama provider
    (anthropic, xai, openai, auto, ...) -> local ollama with new_model; if already
    ollama, just localizes its base_url. Returns a change string or None.
    model_key is the model field name ('default' or 'model')."""
    if not isinstance(block, dict):
        return None
    prov = block.get("provider")
    if prov == "ollama":
        notes = _localize(block)
        return f"already-ollama ({','.join(notes)})" if notes else None
    old = block.get(model_key) or block.get("default") or block.get("model") or ""
    block["provider"] = "ollama"
    block[model_key] = new_model
    _localize(block)
    return f"{old or '(unset)'}@{prov or 'unset'} -> {new_model}@ollama-LOCAL"


def localize_existing_ollama(data):
    """Recursively find every block already provider:ollama and ensure it targets
    the LOCAL endpoint (the aux tiers compression/curator/etc were also pointed at
    cloud). Returns a list of change descriptions."""
    out = []
    def walk(node, path):
        if isinstance(node, dict):
            if node.get("provider") == "ollama":
                bu = node.get("base_url", "")
                if not bu or "ollama.com" in str(bu):
                    _localize(node)
                    out.append(f"{path or '(root)'}: localized ollama base_url")
            for k, v in node.items():
                walk(v, f"{path}.{k}" if path else str(k))
        elif isinstance(node, list):
            for i, v in enumerate(node):
                walk(v, f"{path}[{i}]")
    walk(data, "")
    return out


def process_file(path, yaml, apply):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = yaml.load(fh)
    except Exception as e:
        return [f"SKIP {path}: load failed: {e}"]
    if not isinstance(data, dict):
        return [f"SKIP {path}: not a mapping"]

    changes = []
    c = repoint_block(data.get("model"), "default", REASONING_MODEL)
    if c:
        changes.append(f"model: {c}")
    c = repoint_block(data.get("fallback_model"), "model", FALLBACK_MODEL)
    if c:
        changes.append(f"fallback_model: {c}")
    aux = data.get("auxiliary")
    if isinstance(aux, dict):
        c = repoint_block(aux.get("vision"), "model", VISION_MODEL)
        if c:
            changes.append(f"auxiliary.vision: {c}")
    # DELEGATION-PIN (2026-06-14, slot:echo, eval wf_b36ab40c): the orchestrator's
    # child agents (`delegation`; orchestrator_enabled, max_concurrent_children=10)
    # were `provider: auto` with empty base_url -> Hermes could auto-resolve a
    # spawned child to a CLOUD provider, an INVISIBLE real-money exposure whenever
    # Hermes delegates. Pin children to the same free-local ollama as the primary
    # loop -- directly enforcing the operator's free-local hybrid intent. NOTE:
    # auxiliary sub-roles (web_extract / skills_hub / x_search) are deliberately
    # NOT auto-pinned -- some need web/cloud capabilities ollama lacks, so blind-
    # pinning would break them; those + the experimental.auto_invocation_router
    # escalation knob stay an explicit operator decision (R8).
    c = repoint_block(data.get("delegation"), "model", REASONING_MODEL)
    if c:
        changes.append(f"delegation: {c}")
    # Catch every other block already on ollama but pointed at cloud (aux tiers).
    changes += localize_existing_ollama(data)

    if changes and apply:
        bak = f"{path}.bak-hybrid-{int(time.time())}"
        try:
            with open(path, "r", encoding="utf-8") as fh:
                orig = fh.read()
            with open(bak, "w", encoding="utf-8") as fh:
                fh.write(orig)
            with open(path, "w", encoding="utf-8") as fh:
                yaml.dump(data, fh)
        except Exception as e:
            return [f"FAIL {path}: write failed: {e}"]
    label = "APPLIED" if (changes and apply) else ("WOULD-CHANGE" if changes else "ok")
    return [f"{label} {path}" + ("" if not changes else ":")] + [f"    - {x}" for x in changes]


def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    hdir = DEFAULT_DIR
    if "--dir" in args:
        hdir = args[args.index("--dir") + 1]

    targets = []
    root_cfg = os.path.join(hdir, "config.yaml")
    if os.path.exists(root_cfg):
        targets.append(root_cfg)
    targets += sorted(glob.glob(os.path.join(hdir, "profiles", "*", "config.yaml")))
    if not targets:
        print(f"[hermes-hybrid] no config.yaml found under {hdir}", file=sys.stderr)
        sys.exit(2)

    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.width = 4096  # don't wrap long lines

    print(f"[hermes-hybrid] {'APPLY' if apply else 'DRY-RUN'} | {len(targets)} config(s) | "
          f"reason={REASONING_MODEL} fallback={FALLBACK_MODEL} vision={VISION_MODEL}")
    changed = 0
    for t in targets:
        lines = process_file(t, yaml, apply)
        if any(l.startswith(("APPLIED", "WOULD-CHANGE", "FAIL", "SKIP")) and not l.startswith("ok") for l in lines):
            if any(l.startswith(("APPLIED", "WOULD-CHANGE")) for l in lines):
                changed += 1
        for l in lines:
            print(l)
    print(f"[hermes-hybrid] {'changed' if apply else 'would change'} {changed}/{len(targets)} config(s)")


if __name__ == "__main__":
    main()
