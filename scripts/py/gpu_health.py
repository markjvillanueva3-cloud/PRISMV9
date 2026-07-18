#!/usr/bin/env python3
"""gpu_health.py — BLACKWELL-AI-MS0 / U-PYGPU-HEALTH (fail-loud GPU readiness gate)

The canonical, FAIL-LOUD verifier of "can this host actually train on the GPU
right now." It is the single most dangerous silent-failure mode in the whole
Blackwell training stack: a torch wheel built for an older CUDA arch
(cu117/cu121/cu124) will report ``torch.cuda.is_available() == True`` and then
silently execute every kernel on the CPU at ~1/50th speed. A 45-minute QLoRA
becomes a 36-hour one that nobody notices. This script makes that condition a
LOUD, EARLY, structured refusal (exit 1 + JSON), never a silent slow pass.

WHY THIS IS NOT ``torch.cuda.is_available()``
  ``is_available()`` is necessary but NOT sufficient. We additionally require:
    1. The *device's own* compute-capability tag (e.g. ``sm_120`` for Blackwell
       (12,0), ``sm_89`` for a 4080 (8,9)) is COVERED by ``torch.cuda.get_arch_list()``
       — i.e. the installed wheel was actually compiled with kernels for THIS
       card. This is the cu128/sm_120 check that catches the silent-CPU wheel.
       "Covered" tolerates the arch-specific (``sm_120a``) and PTX
       (``compute_120``) forms a real wheel may list instead of bare ``sm_120``,
       so a correct bleeding-edge wheel is never false-RED'd (the inverse sin).
    2. A REAL GPU op executes: a matmul on a cuda tensor, synchronized, with a
       finite result moved back to CPU. Proves kernels run on-device, not that
       the driver merely reports a GPU.

READINESS LEVELS (a single bool gate would wrongly couple GNN to QLoRA)
  ``torch_ready``  = torch import + cuda_available + device sm covered by arch_list + matmul op.
                     This is the FOUNDATIONAL gate (GNN/PyG training, GPU batch
                     embedding, reward modeling all need only this).
  ``qlora_ready``  = torch_ready AND a real bitsandbytes 4-bit dequant op on GPU.
                     QLoRA/LoRA fine-tuning needs this; the GNN does not.
  Overall ``ready`` (exit 0) == ``torch_ready``. ``bnb_4bit_ok`` is reported as a
  SEPARATE capability so the LoRA unit can gate on ``--require-bnb`` while the GNN
  unit gates on the foundational level. (This resolves the BLACKWELL-AI-UPGRADE
  P0-2 concern both ways: we assert a real GPU op — not is_available() — AND we
  do not let an unbuilt bnb sm_120 wheel make the whole gate permanently red.)

CONTRACT (consumed by GpuStackHealthEngine.ts via the Node bridge)
  - Emits exactly one JSON object on stdout (ALWAYS — every path, including bad
    args and the top-level backstop, emits the FULL report schema).
  - Exit 0 iff ``ready`` (and, with ``--require-bnb``, iff ``qlora_ready``).
  - Exit 1 on any not-ready condition / bad args / internal error, with the JSON
    populated. stdout is reserved for the JSON contract; stderr is human-only.
    Never a bare traceback to stdout, never a non-{0,1} exit, never exit 0 on a
    CPU-only wheel.
  - ``errors[]`` carries machine codes: ``torch_not_importable``, ``cuda_unavailable``,
    ``sm_not_in_arch_list``, ``gpu_matmul_failed``, ``gpu_busy_oom`` (transient —
    a concurrent job holds VRAM; consumer may retry rather than hard-refuse),
    ``qlora_not_ready``, ``bad_args``, ``unexpected``.

USAGE
  python gpu_health.py [--expect-capability 12.0] [--require-bnb] [--matmul-dim 512]
  (golf provisions the dedicated Python 3.13 GPU venv; PRISM_PYTHON_GPU_PATH points
   the Node bridge at it. cp314 CUDA wheels are CPU-only today — hence a 3.13 venv.)

@milestone BLACKWELL-AI-MS0-U-PYGPU-HEALTH
"""

from __future__ import annotations

import argparse
import datetime
import json
import math
import sys

# Single-sourced so the success path and every failure/backstop path can never
# report divergent schema versions (a classic two-emitter drift trap).
_SCHEMA_VERSION = "1.0.0"
# Floor for the real-GPU-op proof matmul — guards against a degenerate
# --matmul-dim 0/1 that would not actually exercise a CUDA kernel.
_MIN_MATMUL_DIM = 64
_DEFAULT_MATMUL_DIM = 512
_BNB_PROBE_DIM = 256


def _iso_now() -> str:
    """UTC ISO-8601 timestamp (no external deps)."""
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def _new_report(expect_capability: str = "12.0", require_bnb: bool = False) -> dict:
    """Build a fully-populated default report so EVERY exit path emits the same
    schema (no partial dicts — partial schemas are how silent mis-gates creep in).
    All gate booleans default to the safe (not-ready) value."""
    report: dict = {
        "schemaVersion": _SCHEMA_VERSION,
        "ready": False,
        "torch_ready": False,
        "qlora_ready": False,
        "torch_version": None,
        "cuda_available": False,
        "device_count": 0,
        "device_name": None,
        "capability": None,            # [major, minor] of cuda:0, or None
        "expected_capability": None,   # [major, minor] parsed from --expect-capability
        "sm_tag": None,                # 'sm_120' for this device
        "arch_list": [],               # torch.cuda.get_arch_list()
        "sm_supported": False,         # device sm covered by arch_list (the no-silent-CPU check)
        "capability_matches_expected": None,
        "gpu_matmul_ok": False,
        "gpu_matmul_detail": "",
        "bnb_4bit_ok": None,           # None = bitsandbytes not installed; bool otherwise (tri-state)
        "bnb_detail": "bitsandbytes not probed",
        "errors": [],
        "warnings": [],
        "require_bnb": bool(require_bnb),
        "python": sys.version.split()[0],
        "python_executable": sys.executable,
        "probed_at": _iso_now(),
    }
    try:
        emaj, emin = str(expect_capability).split(".")
        report["expected_capability"] = [int(emaj), int(emin)]
    except Exception:
        report["warnings"].append(f"could not parse --expect-capability '{expect_capability}'")
    return report


def _emit_and_exit(report: dict, code: int) -> "None":
    """Print the single-line JSON contract to stdout and exit with ``code``.

    stdout is reserved for the JSON contract; nothing else is ever written there.
    ``ensure_ascii`` stays default-True so no raw unicode reaches stdout (a
    PowerShell/cp437 console cannot mangle the machine contract)."""
    sys.stdout.write(json.dumps(report) + "\n")
    sys.stdout.flush()
    sys.exit(code)


def _device_sm_tag(major: int, minor: int) -> str:
    """Compute-capability -> arch tag, e.g. (12,0)->'sm_120', (8,9)->'sm_89'."""
    return f"sm_{major}{minor}"


def _sm_covered(sm_tag: str, arch_list: list) -> bool:
    """True if the device's sm tag is covered by the wheel's arch_list, tolerating
    the forms a real wheel may publish instead of the bare ``sm_120``:
      - exact:            'sm_120'
      - arch-specific:    'sm_120a' (Blackwell/Hopper 'a' variant)
      - PTX forward-JIT:  'compute_120' (JIT-compiles a real kernel at first launch)
    Conservative on the family axis (we do NOT collapse sm_89->sm_86): we only
    accept tags that genuinely run THIS device. This prevents a cutting-edge but
    correct cu128 wheel from being false-RED'd, the inverse of the silent-CPU sin."""
    if not arch_list:
        return False
    suffix = sm_tag.split("_", 1)[1]  # '120' from 'sm_120'
    for a in arch_list:
        if a == sm_tag or a == sm_tag + "a" or a == "compute_" + suffix:
            return True
    return False


class _JsonArgumentParser(argparse.ArgumentParser):
    """ArgumentParser whose error path honors the JSON contract: a bad invocation
    emits the full report (errors:['bad_args: ...']) and exits 1 instead of
    argparse's default usage-to-stderr + exit 2 (which would give a strict Node
    consumer empty stdout and an unexpected exit code)."""

    def error(self, message: str) -> "None":  # type: ignore[override]
        report = _new_report()
        report["errors"].append("bad_args: " + message)
        sys.stderr.write(f"gpu_health: argument error: {message}\n")
        _emit_and_exit(report, 1)


def main() -> "None":
    parser = _JsonArgumentParser(description="PRISM GPU stack health gate (fail-loud)")
    # Informational expectation (this host is Blackwell sm_120). The HARD gate is
    # "the device's own sm is covered by the wheel's arch_list", which is correct
    # for ANY card; expect-capability only flags a mismatch as a warning.
    parser.add_argument("--expect-capability", default="12.0",
                        help="Informational expected compute capability 'major.minor' (default 12.0 = Blackwell).")
    parser.add_argument("--require-bnb", action="store_true",
                        help="Also require a working bitsandbytes 4-bit GPU op for exit 0 (QLoRA gate).")
    parser.add_argument("--matmul-dim", type=int, default=_DEFAULT_MATMUL_DIM,
                        help=f"Square dim of the real-GPU-op matmul proof (default {_DEFAULT_MATMUL_DIM}).")
    args = parser.parse_args()

    report = _new_report(expect_capability=args.expect_capability, require_bnb=args.require_bnb)

    # ── Stage 1: import torch (the cp314-CPU-wheel / not-installed trap) ──
    try:
        import torch  # noqa: PLC0415  (intentional late import — absence is a gate signal)
    except Exception as exc:  # ImportError or a broken native load
        report["errors"].append(
            "torch_not_importable: " + (str(exc) or exc.__class__.__name__)
            + " - golf must install torch (cu128/sm_120) into the Python 3.13 GPU venv"
        )
        sys.stderr.write("gpu_health: torch is not importable - GPU training stack absent.\n")
        _emit_and_exit(report, 1)

    report["torch_version"] = getattr(torch, "__version__", "unknown")

    # ── Stage 2: arch list (which sm kernels the wheel was BUILT with) ──
    try:
        report["arch_list"] = list(torch.cuda.get_arch_list())
    except Exception as exc:
        report["warnings"].append("get_arch_list failed: " + (str(exc) or exc.__class__.__name__))

    # ── Stage 3: cuda availability ──
    try:
        report["cuda_available"] = bool(torch.cuda.is_available())
        report["device_count"] = int(torch.cuda.device_count())
    except Exception as exc:
        report["errors"].append("cuda_is_available raised: " + (str(exc) or exc.__class__.__name__))

    if not report["cuda_available"] or report["device_count"] < 1:
        report["errors"].append(
            "cuda_unavailable: torch imported but no CUDA device is usable - "
            "almost always a CPU-only wheel (cu-less or wrong arch) or CUDA_VISIBLE_DEVICES masking. "
            f"arch_list={report['arch_list']}"
        )
        sys.stderr.write("gpu_health: CUDA not available to torch - refusing (no silent CPU fallback).\n")
        _emit_and_exit(report, 1)

    # ── Stage 4: device capability + sm-covered-by-arch-list (silent-CPU-wheel catch) ──
    try:
        major, minor = torch.cuda.get_device_capability(0)
        report["capability"] = [int(major), int(minor)]
        report["device_name"] = torch.cuda.get_device_name(0)
        sm_tag = _device_sm_tag(int(major), int(minor))
        report["sm_tag"] = sm_tag
        report["sm_supported"] = _sm_covered(sm_tag, report["arch_list"])
        if report["expected_capability"] is not None:
            report["capability_matches_expected"] = (report["capability"] == report["expected_capability"])
            if not report["capability_matches_expected"]:
                report["warnings"].append(
                    f"device capability {report['capability']} != expected {report['expected_capability']} "
                    "(informational - gate uses device's own sm, not the expectation)"
                )
    except Exception as exc:
        report["errors"].append("get_device_capability raised: " + (str(exc) or exc.__class__.__name__))
        _emit_and_exit(report, 1)

    if not report["sm_supported"]:
        report["errors"].append(
            f"sm_not_in_arch_list: device {report['device_name']} needs {report['sm_tag']} but the installed "
            f"torch was built for {report['arch_list']}. This wheel would SILENTLY run on CPU - install the "
            "matching cu128/sm_120 build. THIS is the failure this gate exists to catch."
        )
        sys.stderr.write(
            f"gpu_health: {report['sm_tag']} not covered by torch arch_list {report['arch_list']} - refusing.\n"
        )
        _emit_and_exit(report, 1)

    # ── Stage 5: a REAL GPU op (matmul) — proves kernels execute on-device.
    #             A transient OOM here means a concurrent job holds VRAM (the stack
    #             is healthy, just busy) — report it as a DISTINCT, retryable code,
    #             never conflated with a broken-wheel failure. ──
    dim = max(_MIN_MATMUL_DIM, int(args.matmul_dim))
    try:
        a = torch.randn(dim, dim, device="cuda")
        b = torch.randn(dim, dim, device="cuda")
        c = a @ b
        torch.cuda.synchronize()
        val = float(c.sum().detach().to("cpu").item())
        if not math.isfinite(val):
            raise RuntimeError(f"matmul produced a non-finite sum ({val})")
        report["gpu_matmul_ok"] = True
        report["gpu_matmul_detail"] = f"{dim}x{dim} cuda matmul ok (finite sum)"
        del a, b, c
        torch.cuda.empty_cache()
    except getattr(torch.cuda, "OutOfMemoryError", RuntimeError) as exc:
        # Distinguish "GPU busy" (transient, retryable) from "wheel broken".
        msg = str(exc) or exc.__class__.__name__
        if "out of memory" in msg.lower():
            report["errors"].append(
                "gpu_busy_oom: real GPU op OOM'd - a concurrent training/inference job likely holds VRAM "
                f"(stack may be healthy, just busy): {msg}"
            )
            sys.stderr.write("gpu_health: GPU op OOM (busy, not necessarily broken) - refusing this probe.\n")
            try:
                torch.cuda.empty_cache()
            except Exception:
                pass
            _emit_and_exit(report, 1)
        report["errors"].append("gpu_matmul_failed: " + msg)
        report["gpu_matmul_detail"] = msg
        sys.stderr.write("gpu_health: real GPU matmul failed - refusing (driver reports GPU but kernels fail).\n")
        _emit_and_exit(report, 1)
    except Exception as exc:
        report["errors"].append("gpu_matmul_failed: " + (str(exc) or exc.__class__.__name__))
        report["gpu_matmul_detail"] = str(exc) or exc.__class__.__name__
        sys.stderr.write("gpu_health: real GPU matmul failed - refusing (driver reports GPU but kernels fail).\n")
        _emit_and_exit(report, 1)

    # Foundational gate cleared.
    report["torch_ready"] = True

    # ── Stage 6: bitsandbytes 4-bit op (QLoRA sub-capability; NOT a hard gate
    #             unless --require-bnb). A missing/old bnb must NOT make the whole
    #             gate permanently red for GNN/embed/reward jobs that never use it. ──
    try:
        import bitsandbytes as bnb  # noqa: PLC0415
        try:
            # Minimal real 4-bit round-trip on GPU: quantize a tensor to NF4 and
            # dequantize it back, proving the bnb CUDA kernels load for this arch.
            # Keyword `quant_state=` is drift-proof against future positional inserts.
            from bitsandbytes.functional import quantize_4bit, dequantize_4bit
            w = torch.randn(_BNB_PROBE_DIM, _BNB_PROBE_DIM, device="cuda", dtype=torch.float16)
            q, state = quantize_4bit(w, quant_type="nf4")
            dq = dequantize_4bit(q, quant_state=state)
            torch.cuda.synchronize()
            ok = bool(torch.isfinite(dq).all().item()) and dq.shape == w.shape
            report["bnb_4bit_ok"] = ok
            report["bnb_detail"] = (
                f"bitsandbytes {getattr(bnb, '__version__', '?')} NF4 quantize/dequantize ok"
                if ok else "bnb 4-bit op ran but produced non-finite/shape-mismatch output"
            )
            if not ok:
                report["warnings"].append("bnb 4-bit op degraded - QLoRA may be unsafe")
            try:
                del w, q, dq, state
                torch.cuda.empty_cache()
            except Exception:
                pass
        except Exception as inner:
            report["bnb_4bit_ok"] = False
            report["bnb_detail"] = "bnb imported but 4-bit op failed: " + (str(inner) or inner.__class__.__name__)
            report["warnings"].append(report["bnb_detail"])
    except Exception:
        # bitsandbytes simply not installed yet — expected until golf provisions it.
        report["bnb_4bit_ok"] = None
        report["bnb_detail"] = "bitsandbytes not installed (QLoRA gate pending golf install)"

    report["qlora_ready"] = bool(report["torch_ready"] and report["bnb_4bit_ok"] is True)

    # ── Final verdict ──
    report["ready"] = bool(report["torch_ready"])
    if args.require_bnb and not report["qlora_ready"]:
        report["errors"].append(
            "qlora_not_ready: --require-bnb set but bitsandbytes 4-bit GPU op is not working "
            f"({report['bnb_detail']})"
        )
        _emit_and_exit(report, 1)

    _emit_and_exit(report, 0)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # absolute backstop — never a bare traceback to stdout
        sys.stderr.write("gpu_health: unexpected error: " + repr(exc) + "\n")
        backstop = _new_report()
        backstop["errors"].append("unexpected: " + (str(exc) or exc.__class__.__name__))
        _emit_and_exit(backstop, 1)
