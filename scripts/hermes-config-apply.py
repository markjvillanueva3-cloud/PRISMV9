#!/usr/bin/env python3
"""
hermes-config-apply.py -- canonical DESIRED-STATE enforcer for the Hermes (Nous)
desktop/CLI config (HERMES-LAUNCH-RELIABILITY-MS0, slot:bravo 2026-06-30).

This is the ONE source of truth for "what the Hermes config must look like to launch
reliably every time on this box." It is idempotent: running it on an already-correct
config is a no-op (no write, no backup). `hermes-doctor.mjs` calls it on every launch
(--apply) and uses --check to detect drift.

WHY it exists (the bug it permanently fixes):
  - The desktop "works 1 of 10" because `fallback_providers` listed NVIDIA
    `meta/llama-3.3-70b-instruct`, which NVIDIA serves at only 32K context, but Hermes
    HARD-REJECTS any model < 64K ("needs at least 64,000 tokens"). Whenever launch fell
    through to it, it crashed (`ollama_runtime_context_too_small`) instead of degrading.
  - The primary was `gpt-oss:20b`; the operator wants `gpt-oss:120b` on the Blackwell GPU.
  - `hermes-config-hybrid-ollama.py` only flips NON-ollama blocks and never touches
    `fallback_providers`, so it could not enforce either of the above. This applier does.

DESIRED STATE (env-overridable):
  - model.{provider=ollama, default=gpt-oss:120b, base_url=local, api_key=ollama-local,
    ollama_num_ctx>=65536}                          (primary, deterministic, >=64K floor)
  - fallback_model -> ollama qwen2.5-coder:32b @ local (131072)   (valid local fallback)
  - fallback_providers -> LOCAL-ONLY valid chain [gpt-oss:20b@65536, qwen2.5-coder:32b]
        ** every NVIDIA/cloud entry REMOVED from the auto-fallback path ** so a launch can
        NEVER hard-fail on a <64K cloud model. (NVIDIA stays a documented MANUAL lane; the
        doctor guarantees local Ollama is up+warm before launch, so cloud auto-fallback is
        not needed for reliability. See HERMES-OPERATING-DOCTRINE.md.)
  - auxiliary.* ollama blocks -> local endpoint; auxiliary.vision -> qwen2.5vl:32b
  - delegation -> local gpt-oss:120b (no invisible cloud child-spawn -- the echo lesson)

Scope: root config.yaml + every profiles/<slot>/config.yaml (default = root + all profiles).

Usage:
  python scripts/hermes-config-apply.py [--dir <hermes dir>] [--check | --apply]
                                        [--only-profile zulu] [--json]
  default = dry-run (report drift, write nothing). --check = exit 1 if drift. --apply = fix.

Exit codes: 0 ok/applied | 1 drift-detected (--check only) | 2 usage | 3 dependency/IO error
"""
import os
import re
import sys
import json
import time
import glob

try:
    from ruamel.yaml import YAML
except Exception as e:  # pragma: no cover
    print(f"[hermes-config-apply] ruamel.yaml required: {e}", file=sys.stderr)
    sys.exit(3)

# ---- desired-state constants (env-overridable) -----------------------------------------
PRIMARY_MODEL = os.environ.get("PRISM_HERMES_PRIMARY_MODEL", "gpt-oss:120b")
# MAX context: gpt-oss:120b native ceiling = 131072. Operator wants "as much context as possible";
# the doctor pre-warms the model so the larger KV cache loads BEFORE launch (no cold-start hit).
# 65536 was only the Hermes 64K hard floor; 131072 is the real model ceiling.
PRIMARY_CTX = int(os.environ.get("PRISM_HERMES_PRIMARY_CTX", "131072"))
MIN_CTX = 64000                                                          # Hermes hard reject below this
FALLBACK_MODEL = os.environ.get("PRISM_HERMES_FALLBACK_MODEL", "qwen2.5-coder:32b")
FALLBACK_CTX = int(os.environ.get("PRISM_HERMES_FALLBACK_CTX", "131072"))
VISION_MODEL = os.environ.get("PRISM_HERMES_VISION_MODEL", "qwen2.5vl:32b")
AUX_MODEL = os.environ.get("PRISM_HERMES_AUX_MODEL", "gpt-oss:20b")      # for auto-aux roles pinned local
LOCAL_OLLAMA = os.environ.get("PRISM_HERMES_OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
LOCAL_KEY = "ollama-local"
DEFAULT_DIR = os.environ.get("PRISM_HERMES_DIR", "C:/Users/wompu/AppData/Local/hermes")
# Hermes -> PRISM integration (HERMES-PRISM-INTEGRATION-MS0): the LEAN facade (6 tools, fast
# init), NOT the heavy prism :3100 (101 dispatchers / ~6000 tools = the 133K-token init that
# alpha removed because it timed out launch). Full H: drive gives vault + scripts + CLAUDE.md.
PRISM_FACADE = os.environ.get("PRISM_HERMES_FACADE", "H:/prism/scripts/prism-mcp-for-hermes.mjs")
H_DRIVE_ROOT = os.environ.get("PRISM_HERMES_FS_ROOT", "H:/")
# local-only auto-fallback chain (each entry: model, context_length). NO cloud here -- the
# whole point is that a launch can never hard-fail on a <64K cloud model.
FALLBACK_CHAIN = [
    {"model": "gpt-oss:20b", "context_length": 131072},
    {"model": FALLBACK_MODEL, "context_length": FALLBACK_CTX},
]
# providers we strip from the auto-fallback path (they reach <64K cloud models that hard-fail)
CLOUD_PROVIDERS = {"nvidia", "openrouter", "xai", "anthropic", "openai", "openai-codex", "groq", "gemini", "auto"}

# Reasoning models HANG the agent loop (the nemo3 lesson); on a CLOUD provider they must never be the
# primary. A LOCAL ollama pick of one is the operator's own experiment (left alone).
_BAD_PRIMARY_RE = re.compile(r"nemotron|deepseek[-.]?r1|reasoner|qwq|:r1\b", re.I)

# custom_providers written so Hermes's /model picker + app live-fetch + list ALL models per endpoint
# (discover_models -> live /v1/models). base_url is the join key for idempotency.
SUBSCRIPTION_PROXY_URL = os.environ.get("PRISM_HERMES_SUBPROXY_URL", "http://127.0.0.1:8766/v1")
DESIRED_PROVIDERS = [
    {"name": "Local Ollama", "base_url": LOCAL_OLLAMA, "api_key": LOCAL_KEY, "key_env": ""},
    {"name": "NVIDIA", "base_url": "https://integrate.api.nvidia.com/v1", "api_key": "", "key_env": "NVIDIA_API_KEY"},
    {"name": "PRISM Subscription", "base_url": SUBSCRIPTION_PROXY_URL, "api_key": "prism-local", "key_env": ""},
]
# OpenAI-compatible frontier providers added to the picker ONLY when their key_env is present in the
# environment -- so no clutter of non-working entries, and Grok/OpenAI/Gemini auto-appear the MOMENT the
# operator sets the key (e.g. XAI_API_KEY -> "xAI Grok" becomes a switchable model, like NVIDIA). Anthropic
# is intentionally absent -- its API is NOT OpenAI-compatible; Claude is reachable via the subscription proxy.
KEY_GATED_PROVIDERS = [
    {"name": "xAI Grok", "base_url": "https://api.x.ai/v1", "key_env": "XAI_API_KEY"},
    {"name": "OpenAI", "base_url": "https://api.openai.com/v1", "key_env": "OPENAI_API_KEY"},
    {"name": "Google Gemini", "base_url": "https://generativelanguage.googleapis.com/v1beta/openai", "key_env": "GEMINI_API_KEY"},
]
# one-word /model switch shortcuts (Hermes quick_commands = shell-command text substitutions)
DESIRED_QUICK_COMMANDS = {
    "use120b": "hermes model gpt-oss:120b --provider ollama",
    "usecoder": "hermes model qwen2.5-coder:32b --provider ollama",
    "usevision": "hermes model qwen2.5vl:32b --provider ollama",
}


def _set(block, key, val, changes, label):
    if block.get(key) != val:
        block[key] = val
        changes.append(f"{label}.{key}: -> {val!r}")


def _localize(block, changes, label):
    """Force an ollama block onto the LOCAL endpoint + dummy key. Called only on ollama-provider
    blocks, so ANY non-local base_url is wrong -- e.g. a provider:ollama block left pointing at the
    NVIDIA url (the fallback_model bug) -> force it local, not just empty/ollama.com."""
    if block.get("base_url") != LOCAL_OLLAMA:
        _set(block, "base_url", LOCAL_OLLAMA, changes, label)
    if not block.get("api_key"):
        _set(block, "api_key", LOCAL_KEY, changes, label)


def _is_broken_primary(provider, model):
    """A primary that would BREAK Hermes: empty, or (on a CLOUD provider) a reasoning model that hangs the
    agent loop / the NVIDIA 32K llama-3.3-70b that hard-fails. A LOCAL ollama pick -- even a reasoning one --
    is the operator's own choice and is left alone (the /model picker persists it). Pure."""
    if not model:
        return True
    if provider in CLOUD_PROVIDERS:
        if _BAD_PRIMARY_RE.search(str(model)):
            return True
        if "llama-3.3-70b" in str(model).lower():
            return True
    return False


def enforce_primary(data, changes):
    """VALIDATOR (not pinner): KEEP the operator's picked model so /model switches persist across doctor
    runs; reset to PRIMARY_MODEL only if the primary is BROKEN (empty / cloud-reasoning / cloud-<64K). When
    the provider is ollama, force the local base_url + the ctx floor (harmless for cloud picks)."""
    m = data.get("model")
    if not isinstance(m, dict):
        return
    if _is_broken_primary(m.get("provider"), m.get("default")):
        _set(m, "provider", "ollama", changes, "model")
        _set(m, "default", PRIMARY_MODEL, changes, "model")
    if m.get("provider") == "ollama":
        _localize(m, changes, "model")
        cur = m.get("ollama_num_ctx")
        if not isinstance(cur, int) or cur < PRIMARY_CTX:
            _set(m, "ollama_num_ctx", PRIMARY_CTX, changes, "model")


def enforce_fallback_model(data, changes):
    fm = data.get("fallback_model")
    if not isinstance(fm, dict):
        return
    _set(fm, "provider", "ollama", changes, "fallback_model")
    _set(fm, "model", FALLBACK_MODEL, changes, "fallback_model")
    _localize(fm, changes, "fallback_model")
    if fm.get("context_length") != FALLBACK_CTX:
        _set(fm, "context_length", FALLBACK_CTX, changes, "fallback_model")


def enforce_fallback_providers(data, changes):
    """Replace fallback_providers with the LOCAL-ONLY valid chain iff it currently differs
    or contains any cloud/<64K entry. Removing the NVIDIA llama-3.3-70b@32K entry is THE
    permanent fix for the hard-launch-failure."""
    desired = [
        {"provider": "ollama", "model": e["model"], "base_url": LOCAL_OLLAMA,
         "api_key": LOCAL_KEY, "context_length": e["context_length"]}
        for e in FALLBACK_CHAIN
    ]
    cur = data.get("fallback_providers")
    cur_norm = None
    if isinstance(cur, list):
        cur_norm = [
            {"provider": b.get("provider"), "model": b.get("model"),
             "base_url": b.get("base_url"), "api_key": b.get("api_key"),
             "context_length": b.get("context_length")}
            if isinstance(b, dict) else b
            for b in cur
        ]
    if cur_norm != desired:
        # report WHAT we strip (for the operator-facing log)
        if isinstance(cur, list):
            for b in cur:
                if isinstance(b, dict) and (b.get("provider") in CLOUD_PROVIDERS):
                    changes.append(f"fallback_providers: STRIP cloud {b.get('provider')}/{b.get('model')} "
                                   f"(can hard-fail the <64K gate)")
        data["fallback_providers"] = desired
        changes.append(f"fallback_providers: -> local-only [{', '.join(e['model'] for e in FALLBACK_CHAIN)}]")


def enforce_aux_and_delegation(data, changes):
    aux = data.get("auxiliary")
    if isinstance(aux, dict):
        v = aux.get("vision")
        if isinstance(v, dict):
            _set(v, "provider", "ollama", changes, "auxiliary.vision")
            _set(v, "model", VISION_MODEL, changes, "auxiliary.vision")
            _localize(v, changes, "auxiliary.vision")
        for name, blk in aux.items():
            if isinstance(blk, dict) and blk.get("provider") == "ollama":
                _localize(blk, changes, f"auxiliary.{name}")
    dl = data.get("delegation")
    if isinstance(dl, dict):
        # pin orchestrator children to free-local (echo lesson: avoid invisible cloud spawn)
        if dl.get("provider") not in (None, "ollama") or dl.get("model") != PRIMARY_MODEL:
            _set(dl, "provider", "ollama", changes, "delegation")
            _set(dl, "model", PRIMARY_MODEL, changes, "delegation")
        _localize(dl, changes, "delegation")


def validate(data):
    """Return a list of HARD violations (block reliable launch). Used by --check."""
    bad = []
    m = data.get("model")
    if isinstance(m, dict):
        # validator, not pinner: only a BROKEN primary is a violation (a valid non-default pick is fine)
        if _is_broken_primary(m.get("provider"), m.get("default")):
            bad.append(f"primary broken/unsafe: {m.get('provider')}/{m.get('default')}")
        if m.get("provider") == "ollama" and (not isinstance(m.get("ollama_num_ctx"), int) or m["ollama_num_ctx"] < MIN_CTX):
            bad.append(f"primary ollama_num_ctx < {MIN_CTX}")
    fps = data.get("fallback_providers")
    if isinstance(fps, list):
        for b in fps:
            if isinstance(b, dict):
                if b.get("provider") in CLOUD_PROVIDERS:
                    bad.append(f"cloud auto-fallback {b.get('provider')}/{b.get('model')} (can hard-fail <64K gate)")
                cl = b.get("context_length")
                if isinstance(cl, int) and cl < MIN_CTX:
                    bad.append(f"fallback {b.get('model')} context {cl} < {MIN_CTX}")
    exp = data.get("experimental")
    if isinstance(exp, dict) and (exp.get("model_router_enabled") or exp.get("auto_invocation_router")):
        bad.append("experimental model-router ENABLED (dynamically builds hybrids -> nemo3 reasoning-model hang)")
    return bad


def enforce_router_off(data, changes):
    """Disable the experimental model-router / hybrid-router. It DYNAMICALLY builds hybrid model
    configs and (2026-06-30) set the desktop primary to nvidia/nemotron-3-super-120b -- a REASONING
    model that emits <think> and HANGS the agent loop ('it built a hybrid model... nemo3, stopped
    working'). Determinism > router cleverness: the pinned gpt-oss:120b must be authoritative."""
    exp = data.get("experimental")
    if isinstance(exp, dict):
        for k in ("model_router_enabled", "auto_invocation_router"):
            if exp.get(k) is not False:
                _set(exp, k, False, changes, "experimental")
    hr = data.get("hybrid_router")
    if isinstance(hr, dict) and hr.get("enabled") is not False:
        _set(hr, "enabled", False, changes, "hybrid_router")


def enforce_moa_off(data, changes):
    """Neutralize Mixture-of-Agents presets. The default preset ensembles NVIDIA CLOUD reasoning
    models (nemotron-3-ultra-550b, deepseek-v4-pro, qwen3.5-397b) + a llama-3.3-70b@32K aggregator
    -- a slow/hang/cost path AND the same <64K aggregator that hard-fails. Local-first + reliability:
    keep MOA off (re-enable with LOCAL models later if ensemble reasoning is genuinely wanted)."""
    moa = data.get("moa")
    if not isinstance(moa, dict):
        return
    if moa.get("active_preset"):
        _set(moa, "active_preset", "", changes, "moa")
    presets = moa.get("presets")
    if isinstance(presets, dict):
        for name, p in presets.items():
            if isinstance(p, dict) and p.get("enabled") is not False:
                _set(p, "enabled", False, changes, f"moa.presets.{name}")


def enforce_auto_aux_local(data, changes):
    """Pin every auxiliary role left on provider:auto (empty base_url) to LOCAL ollama. `auto` +
    empty base_url is the null-billing -> dead-Nous / cloud-hang risk (a local model can't hang on
    a dead cloud lane). Deterministic + free. (web_extract/x_search lose web capability -- acceptable
    on a local-first box with no working cloud-web lane; reliability > a hang-prone web tier.)"""
    aux = data.get("auxiliary")
    if not isinstance(aux, dict):
        return
    for name, blk in aux.items():
        if isinstance(blk, dict) and blk.get("provider") == "auto":
            _set(blk, "provider", "ollama", changes, f"auxiliary.{name}")
            if not blk.get("model"):
                _set(blk, "model", AUX_MODEL, changes, f"auxiliary.{name}")
            _localize(blk, changes, f"auxiliary.{name}")


def enforce_mcp_servers(data, changes):
    """Wire the Hermes -> PRISM integration into mcp_servers (idempotent):
      - prism  : the LEAN facade (node prism-mcp-for-hermes.mjs, 6 tools) -- NOT heavy :3100.
      - <fs>   : the filesystem server broadened to the FULL H: drive (was H:/prism/knowledge).
    Adds h-drive if no server-filesystem entry exists. Lean init is preserved (the facade is the
    only PRISM tool-surface Hermes sees at handshake; full dispatcher power is on-demand via
    prism_run_skill -> claude.cmd)."""
    mcp = data.get("mcp_servers")
    if not isinstance(mcp, dict):
        mcp = {}
        data["mcp_servers"] = mcp
    # 1. lean PRISM facade
    cur = mcp.get("prism")
    ok_prism = (isinstance(cur, dict) and cur.get("command") == "node"
                and isinstance(cur.get("args"), list)
                and any(PRISM_FACADE in str(x) for x in cur.get("args")))
    if not ok_prism:
        mcp["prism"] = {"command": "node", "args": [PRISM_FACADE]}
        changes.append("mcp_servers.prism -> lean facade (prism-mcp-for-hermes.mjs, 6 tools)")
    # 2. full H: drive filesystem -- broaden an existing server-filesystem entry, else add h-drive
    fs_key = None
    for k, v in mcp.items():
        if isinstance(v, dict) and isinstance(v.get("args"), list) and any("server-filesystem" in str(x) for x in v["args"]):
            fs_key = k
            break
    if fs_key:
        args = mcp[fs_key]["args"]
        if args and str(args[-1]) != H_DRIVE_ROOT:
            changes.append(f"mcp_servers.{fs_key}: filesystem root {args[-1]} -> {H_DRIVE_ROOT} (full H: drive)")
            args[-1] = H_DRIVE_ROOT
    else:
        mcp["h-drive"] = {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", H_DRIVE_ROOT]}
        changes.append(f"mcp_servers.h-drive -> filesystem @ {H_DRIVE_ROOT} (full H: drive)")


def enforce_checkpoints_on(data, changes):
    """Enable session checkpoints (root config ships them OFF; the zulu profile has them ON -- make it
    consistent). Recovery for long autonomous runs; auto-pruned + size-capped, so no unbounded disk.
    Additive, no behavioral downside (operator 'optimize all settings' 2026-06-30). Absent block -> no-op."""
    cp = data.get("checkpoints")
    if isinstance(cp, dict) and cp.get("enabled") is not True:
        _set(cp, "enabled", True, changes, "checkpoints")


def enforce_force_ipv4(data, changes):
    """Set network.force_ipv4 -- belt-and-suspenders over the OS-level prefixpolicy the doctor asserts, so
    the Nous boot fetch prefers IPv4 even if the OS policy is lost (dead IPv6 on this box was a launch-hang
    root cause). Additive reliability, no downside (operator 'optimize all settings'). Absent block -> no-op."""
    net = data.get("network")
    if isinstance(net, dict) and net.get("force_ipv4") is not True:
        _set(net, "force_ipv4", True, changes, "network")


def enforce_model_providers(data, changes):
    """Populate custom_providers with discover_models:true so Hermes's /model picker + the app UI live-fetch
    + list ALL models from each endpoint (Local Ollama = 17 local models, NVIDIA cloud, the PRISM subscription
    proxy = Claude/Codex). Idempotent: only ADDS a provider whose base_url is not already present (never
    rewrites an operator-tweaked entry). Missing/non-list custom_providers -> created."""
    cur = data.get("custom_providers")
    if not isinstance(cur, list):
        cur = []
        data["custom_providers"] = cur
    have = {p.get("base_url") for p in cur if isinstance(p, dict)}
    for p in DESIRED_PROVIDERS:
        if p["base_url"] in have:
            continue
        cur.append({
            "name": p["name"], "base_url": p["base_url"], "api_key": p.get("api_key", ""),
            "key_env": p.get("key_env", ""), "models": {}, "discover_models": True, "api_mode": "openai_chat",
        })
        changes.append(f"custom_providers += {p['name']} (discover_models @ {p['base_url']})")
    # key-gated frontier providers: added ONLY when the key is present in env (no clutter of dead entries;
    # Grok/OpenAI/Gemini auto-appear the moment the operator sets XAI_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY).
    for p in KEY_GATED_PROVIDERS:
        if p["base_url"] in have or not os.environ.get(p["key_env"]):
            continue
        cur.append({
            "name": p["name"], "base_url": p["base_url"], "api_key": "",
            "key_env": p["key_env"], "models": {}, "discover_models": True, "api_mode": "openai_chat",
        })
        changes.append(f"custom_providers += {p['name']} ({p['key_env']} present, discover_models @ {p['base_url']})")


def enforce_quick_commands(data, changes):
    """One-word /model switch shortcuts (Hermes quick_commands = shell-command text substitutions).
    Idempotent: only sets a key that differs. Missing/non-dict quick_commands -> created."""
    qc = data.get("quick_commands")
    if not isinstance(qc, dict):
        qc = {}
        data["quick_commands"] = qc
    for k, v in DESIRED_QUICK_COMMANDS.items():
        if qc.get(k) != v:
            _set(qc, k, v, changes, "quick_commands")


def process_file(path, yaml, apply):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = yaml.load(fh)
    except Exception as e:
        return {"path": path, "status": "skip", "reason": f"load failed: {e}", "changes": [], "violations": []}
    if not isinstance(data, dict):
        return {"path": path, "status": "skip", "reason": "not a mapping", "changes": [], "violations": []}

    violations = validate(data)
    changes = []
    enforce_primary(data, changes)
    enforce_fallback_model(data, changes)
    enforce_fallback_providers(data, changes)
    enforce_aux_and_delegation(data, changes)
    enforce_router_off(data, changes)
    enforce_moa_off(data, changes)
    enforce_auto_aux_local(data, changes)
    enforce_mcp_servers(data, changes)
    enforce_checkpoints_on(data, changes)
    enforce_force_ipv4(data, changes)
    enforce_model_providers(data, changes)
    enforce_quick_commands(data, changes)

    status = "ok"
    if changes:
        status = "applied" if apply else "drift"
        if apply:
            bak = f"{path}.bak-apply-{int(time.time())}"
            tmp = f"{path}.tmp-{os.getpid()}"
            try:
                with open(path, "r", encoding="utf-8") as fh:
                    orig = fh.read()
                with open(bak, "w", encoding="utf-8") as fh:
                    fh.write(orig)
                # Write to a temp file in the SAME dir, then os.replace -> ATOMIC rename. A crash mid-
                # write can never leave a truncated config.yaml that fails to launch (scrutiny arm C P1).
                with open(tmp, "w", encoding="utf-8") as fh:
                    yaml.dump(data, fh)
                os.replace(tmp, path)
            except Exception as e:
                try:
                    if os.path.exists(tmp):
                        os.remove(tmp)
                except OSError:
                    pass
                return {"path": path, "status": "fail", "reason": f"write failed: {e}",
                        "changes": changes, "violations": violations, "backup": bak}
            violations = validate(data)  # recompute post-fix: an --apply run reports NO residual violations
    return {"path": path, "status": status, "changes": changes, "violations": violations}


def acquire_lock(hdir):
    """Best-effort single-writer lock so the 15-min doctor task, a manual run, and an operator
    hand-edit cannot interleave the read-modify-write (scrutiny arm C P1 -- lost-update guard).
    Returns a (fd, path) handle, or None if a LIVE apply already holds it. Stale (>120s) locks
    from a crashed run are reclaimed."""
    lock = os.path.join(hdir, ".hermes-config-apply.lock")
    def _take():
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        os.write(fd, str(os.getpid()).encode())
        return (fd, lock)
    try:
        return _take()
    except FileExistsError:
        try:
            if (time.time() - os.path.getmtime(lock)) > 120:
                os.remove(lock)
                return _take()  # a racing reclaimer may win first -> _take() re-raises FileExistsError,
                                # which is an OSError subclass (PEP 3151) and is caught just below -> None
        except OSError:
            pass
        return None


def release_lock(handle):
    if not handle:
        return
    fd, lock = handle
    try:
        os.close(fd)
    except OSError:
        pass
    try:
        os.remove(lock)
    except OSError:
        pass


def main():
    args = sys.argv[1:]
    apply = "--apply" in args
    check = "--check" in args
    as_json = "--json" in args
    hdir = DEFAULT_DIR
    if "--dir" in args:
        hdir = args[args.index("--dir") + 1]
    only = None
    if "--only-profile" in args:
        only = args[args.index("--only-profile") + 1]

    targets = []
    root_cfg = os.path.join(hdir, "config.yaml")
    if os.path.exists(root_cfg) and not only:
        targets.append(root_cfg)
    prof_glob = sorted(glob.glob(os.path.join(hdir, "profiles", "*", "config.yaml")))
    if only:
        # CONTRACT: --only-profile <slot> is PROFILE-SCOPED -- the root config.yaml is intentionally
        # NOT touched (the `and not only` guard above). Use it to fix one profile in isolation. The
        # DEFAULT (no --only-profile) is the full desktop fix: root + every profile.
        prof_glob = [p for p in prof_glob if os.path.basename(os.path.dirname(p)) == only]
    targets += prof_glob
    if not targets:
        msg = f"no config.yaml found under {hdir}" + (f" (profile {only})" if only else "")
        print(f"[hermes-config-apply] {msg}", file=sys.stderr)
        sys.exit(2)

    yaml = YAML()
    yaml.preserve_quotes = True
    yaml.width = 4096

    lock_handle = acquire_lock(hdir) if apply else None
    if apply and lock_handle is None:
        print(f"[hermes-config-apply] another apply already holds the lock under {hdir}; skipping (no-op)")
        sys.exit(0)
    try:
        results = [process_file(t, yaml, apply) for t in targets]
    finally:
        release_lock(lock_handle)
    drift = any(r["status"] in ("drift", "applied") for r in results)
    has_violation = any(r["violations"] for r in results)
    failed = any(r["status"] == "fail" for r in results)

    if as_json:
        print(json.dumps({"mode": "apply" if apply else ("check" if check else "dry-run"),
                          "primary": PRIMARY_MODEL, "primary_ctx": PRIMARY_CTX,
                          "drift": drift, "violations": has_violation, "results": results}, indent=2))
    else:
        mode = "APPLY" if apply else ("CHECK" if check else "DRY-RUN")
        print(f"[hermes-config-apply] {mode} | {len(targets)} config(s) | primary={PRIMARY_MODEL}@{PRIMARY_CTX}")
        for r in results:
            print(f"  [{r['status']}] {r['path']}")
            for v in r.get("violations", []):
                print(f"      ! VIOLATION: {v}")
            for c in r.get("changes", []):
                print(f"      - {c}")
            if r.get("reason"):
                print(f"      reason: {r['reason']}")
        print(f"[hermes-config-apply] drift={drift} violations={has_violation} failed={failed}")

    if failed:
        sys.exit(3)
    if check and (drift or has_violation):
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
