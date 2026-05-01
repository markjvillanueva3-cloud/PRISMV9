#!/usr/bin/env python3
"""
PRISM portable-drive PC bootstrap.

Goal: plug H: drive into any fresh Windows 10/11 PC, run this script once,
end up with a working PRISM stack. Everything that can live on H: is already
on H: (project code, node_modules, Qdrant vector data, Ollama models, npm
cache). This script installs the three things that cannot be portable
(Docker Desktop, Node.js, WSL2 kernel) and then boots the services.

Prerequisites (one manual step on a truly fresh PC — Python is not portable):
  winget install -e --id Python.Python.3.12

Then from this PC:
  python H:\\prism\\scripts\\setup-new-pc.py

The script is idempotent — safe to re-run. It detects what's already done
and skips. The only stop is a mandatory Windows reboot after the WSL2
kernel installs; re-run after reboot to finish phase 2.

Run as Administrator. The script will self-elevate if not already elevated.
"""

from __future__ import annotations

import ctypes
import json
import os
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

HOME = Path(__file__).resolve().parent.parent  # H:/prism
LOG_PATH = HOME / "data" / "bootstrap.log"
DOCKER_BIN = r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"
DOCKER_APP = r"C:\Program Files\Docker\Docker\Docker Desktop.exe"
REQUIRED_MODEL = "nomic-embed-text"
QDRANT_URL = "http://127.0.0.1:6333/healthz"
OLLAMA_URL = "http://127.0.0.1:11434/api/tags"


# ---------- output helpers --------------------------------------------------

class C:
    OK = "[OK]   "
    SKIP = "[SKIP] "
    RUN = "[RUN]  "
    WARN = "[WARN] "
    FAIL = "[FAIL] "
    HEAD = "====== "


def log(line: str) -> None:
    print(line, flush=True)
    try:
        LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass  # log is best-effort


def header(title: str) -> None:
    log("")
    log(C.HEAD + title)
    log("=" * (len(title) + 7))


# ---------- elevation -------------------------------------------------------

def is_admin() -> bool:
    try:
        return bool(ctypes.windll.shell32.IsUserAnAdmin())
    except Exception:
        return False


def relaunch_as_admin() -> None:
    """Re-exec ourselves with a UAC prompt and exit."""
    params = " ".join(f'"{a}"' for a in sys.argv)
    ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, params, None, 1)
    sys.exit(0)


# ---------- subprocess wrappers --------------------------------------------

def run(cmd: list[str] | str, *, check: bool = False, capture: bool = True, shell: bool = False,
        timeout: int | None = None) -> subprocess.CompletedProcess:
    """Standard run wrapper: text mode, cp1252-safe, never throws unless check."""
    if isinstance(cmd, list):
        pretty = " ".join(cmd)
    else:
        pretty = cmd
    log(C.RUN + pretty)
    try:
        r = subprocess.run(
            cmd,
            shell=shell,
            capture_output=capture,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout,
        )
    except subprocess.TimeoutExpired as e:
        log(C.FAIL + f"timeout after {timeout}s: {e}")
        raise
    if check and r.returncode != 0:
        log(C.FAIL + f"exit={r.returncode}\nSTDOUT: {r.stdout}\nSTDERR: {r.stderr}")
        raise subprocess.CalledProcessError(r.returncode, cmd, r.stdout, r.stderr)
    return r


def have(binary: str) -> bool:
    return shutil.which(binary) is not None


def docker_cmd() -> str:
    return DOCKER_BIN if Path(DOCKER_BIN).exists() else "docker"


# ---------- checks ----------------------------------------------------------

@dataclass
class StepResult:
    ok: bool
    needs_reboot: bool = False
    message: str = ""


def ensure_winget() -> StepResult:
    if have("winget"):
        return StepResult(True, message="winget present")
    return StepResult(
        False,
        message="winget not found. Install App Installer from the Microsoft Store, "
                "then re-run this script.",
    )


def winget_install(package_id: str, display: str, test: Callable[[], bool]) -> StepResult:
    if test():
        log(C.SKIP + f"{display} already installed")
        return StepResult(True, message=f"{display} already installed")
    r = run(["winget", "install", "-e", "--id", package_id, "--silent",
             "--accept-package-agreements", "--accept-source-agreements"])
    if r.returncode == 0 or "already installed" in (r.stdout or "").lower():
        log(C.OK + f"{display} installed")
        return StepResult(True, message=f"{display} installed")
    log(C.FAIL + f"winget install failed for {package_id}: {r.stderr}")
    return StepResult(False, message=f"winget install failed for {package_id}")


def ensure_docker_desktop() -> StepResult:
    return winget_install(
        "Docker.DockerDesktop",
        "Docker Desktop",
        test=lambda: Path(DOCKER_APP).exists(),
    )


def ensure_nodejs() -> StepResult:
    return winget_install(
        "OpenJS.NodeJS.LTS",
        "Node.js LTS",
        test=lambda: have("node"),
    )


def wsl_is_ready() -> bool:
    """WSL is considered ready when default version can be set to 2 without complaint."""
    r = run(["wsl", "--status"], capture=True)
    if r.returncode != 0:
        return False
    out = (r.stdout or "") + (r.stderr or "")
    # "Default Version: 2" or equivalent localized — the key signal is that
    # `wsl --status` returned 0 at all. On Windows 11 that means WSL feature
    # is installed AND enabled AND the kernel is present.
    return "2" in out or "WSL2" in out or "Version" in out


def ensure_wsl2() -> StepResult:
    if wsl_is_ready():
        log(C.SKIP + "WSL2 kernel active")
        return StepResult(True, message="WSL2 ready")
    log(C.RUN + "wsl --install --no-distribution (this enables the Windows feature + kernel)")
    r = run(["wsl", "--install", "--no-distribution"], timeout=300)
    if r.returncode != 0:
        log(C.FAIL + f"wsl install exit={r.returncode}: {r.stderr}")
        return StepResult(False, message="wsl install failed")
    # `wsl --install` output itself says the reboot is required. We enforce it.
    reboot_text = (r.stdout or "") + (r.stderr or "")
    if "reboot" in reboot_text.lower() or "restart" in reboot_text.lower():
        log(C.WARN + "WSL2 installed — Windows REBOOT required before Docker can start")
        return StepResult(True, needs_reboot=True, message="WSL2 installed, reboot required")
    return StepResult(True, message="WSL2 installed")


# ---------- phase 2: services ----------------------------------------------

def http_ok(url: str, timeout: float = 2.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            return 200 <= resp.status < 400
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError):
        return False


def docker_daemon_up() -> bool:
    r = run([docker_cmd(), "info", "--format", "{{.ServerVersion}}"], capture=True)
    return r.returncode == 0 and bool((r.stdout or "").strip())


def start_docker_desktop() -> StepResult:
    if docker_daemon_up():
        log(C.SKIP + "Docker daemon already running")
        return StepResult(True, message="daemon up")
    if not Path(DOCKER_APP).exists():
        return StepResult(False, message="Docker Desktop not installed")
    log(C.RUN + f'launching Docker Desktop: "{DOCKER_APP}"')
    subprocess.Popen([DOCKER_APP], close_fds=True)
    log(C.RUN + "waiting up to 180s for daemon...")
    deadline = time.time() + 180
    while time.time() < deadline:
        if docker_daemon_up():
            log(C.OK + "Docker daemon up")
            return StepResult(True, message="daemon started")
        time.sleep(4)
    return StepResult(False, message="docker daemon did not come up in 180s")


def compose_up() -> StepResult:
    compose_file = HOME / "docker-compose.yml"
    if not compose_file.exists():
        return StepResult(False, message=f"docker-compose.yml missing at {compose_file}")
    r = run([docker_cmd(), "compose", "-f", str(compose_file),
             "up", "-d", "qdrant", "ollama"], timeout=600)
    if r.returncode != 0:
        return StepResult(False, message=f"compose up failed: {r.stderr}")
    log(C.RUN + "waiting for qdrant+ollama health...")
    deadline = time.time() + 120
    while time.time() < deadline:
        if http_ok(QDRANT_URL) and http_ok(OLLAMA_URL):
            log(C.OK + "qdrant + ollama healthy")
            return StepResult(True, message="services healthy")
        time.sleep(3)
    return StepResult(False, message="services did not become healthy in 120s")


def ensure_model(tag: str = REQUIRED_MODEL) -> StepResult:
    r = run([docker_cmd(), "exec", "prism-ollama", "ollama", "list"], capture=True)
    if r.returncode == 0 and tag in (r.stdout or ""):
        log(C.SKIP + f"ollama model already present: {tag}")
        return StepResult(True, message="model cached (on H:)")
    log(C.RUN + f"pulling ollama model: {tag}")
    pull = run([docker_cmd(), "exec", "prism-ollama", "ollama", "pull", tag],
               capture=False, timeout=900)
    if pull.returncode != 0:
        return StepResult(False, message=f"ollama pull failed for {tag}")
    return StepResult(True, message=f"{tag} pulled")


def ensure_node_modules() -> StepResult:
    target = HOME / "mcp-server" / "node_modules"
    if target.exists() and any(target.iterdir()):
        log(C.SKIP + "mcp-server/node_modules already on H:")
        return StepResult(True, message="node_modules present")
    if not have("npm"):
        return StepResult(False, message="npm not on PATH (Node.js install broken?)")
    r = run(["npm", "install"], shell=False, timeout=1800,
            capture=False) if False else run(
        ["npm", "install"], shell=True, timeout=1800, capture=True)
    # We run in mcp-server dir via a one-shot cwd subprocess:
    r = subprocess.run(
        "npm install",
        shell=True,
        cwd=str(HOME / "mcp-server"),
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        timeout=1800,
    )
    if r.returncode != 0:
        log(C.FAIL + f"npm install exit={r.returncode}\n{r.stderr[-1000:]}")
        return StepResult(False, message="npm install failed")
    return StepResult(True, message="node_modules installed")


# ---------- orchestration ---------------------------------------------------

def banner() -> None:
    header("PRISM PC Bootstrap")
    log(f"Script:      {Path(__file__)}")
    log(f"PRISM home:  {HOME}")
    log(f"Log file:    {LOG_PATH}")
    log(f"Admin:       {is_admin()}")
    log(f"Python:      {sys.version.split()[0]} ({sys.executable})")


def phase1_installs() -> bool:
    """Return True if all good, False if a fatal step failed. Sets sys.exit on reboot."""
    header("Phase 1: machine-level installs")

    win = ensure_winget()
    if not win.ok:
        log(C.FAIL + win.message)
        return False

    docker = ensure_docker_desktop()
    if not docker.ok:
        log(C.FAIL + "Docker Desktop install failed. Continuing but phase 2 will not succeed.")

    node = ensure_nodejs()
    if not node.ok:
        log(C.WARN + "Node.js install failed. node_modules step will be skipped.")

    wsl = ensure_wsl2()
    if not wsl.ok:
        log(C.FAIL + wsl.message)
        return False
    if wsl.needs_reboot:
        header("REBOOT REQUIRED")
        log("WSL2 kernel was installed and needs a Windows reboot to activate.")
        log("Reboot, then re-run this script. It will detect the post-reboot state and")
        log("boot services. Run from an ADMIN PowerShell:")
        log("")
        log(f"    python {Path(__file__)}")
        log("")
        log("Not rebooting now. Exiting cleanly.")
        sys.exit(0)

    return docker.ok


def phase2_services() -> bool:
    header("Phase 2: boot services + pull models")

    # Step 0 — pull Claude Code state (chat history + settings) from H: into
    # this PC's C: drive so /resume can see sessions started on other PCs.
    sync_py = HOME / "scripts" / "claude_sync.py"
    if sync_py.exists():
        log("syncing claude state H: -> C:")
        rc = subprocess.call(["py", "-3", str(sync_py), "pull"])
        if rc == 0:
            log(C.OK + "claude state hydrated")
        else:
            log(C.WARN + f"claude_sync.py exited {rc} (continuing)")
    else:
        log(C.WARN + "claude_sync.py not found — /resume chats from other PCs will be missing")

    dock = start_docker_desktop()
    if not dock.ok:
        log(C.FAIL + dock.message)
        return False

    up = compose_up()
    if not up.ok:
        log(C.FAIL + up.message)
        return False

    mdl = ensure_model()
    if not mdl.ok:
        log(C.FAIL + mdl.message)
        return False

    nm = ensure_node_modules()
    if not nm.ok:
        log(C.WARN + nm.message)

    return True


def summary(ok: bool) -> None:
    header("Summary")
    if ok:
        log(C.OK + "PRISM stack ready on this PC.")
        log("Services:")
        log("  Qdrant REST:  http://127.0.0.1:6333")
        log("  Qdrant gRPC:  http://127.0.0.1:6334")
        log("  Ollama:       http://127.0.0.1:11434")
        log("Data lives on H:/prism/data/docker-volumes (portable).")
        log("")
        log("Smoke test the full stack:")
        log(f"  cd {HOME / 'mcp-server'}")
        log("  PRISM_INTEGRATION=1 npx vitest run src/__tests__/integration/semantic-stack.integration.test.ts")
    else:
        log(C.FAIL + "Bootstrap did not complete cleanly. See messages above and "
                     f"{LOG_PATH}.")


def main() -> int:
    banner()
    if not is_admin():
        log(C.WARN + "not elevated — relaunching with UAC prompt")
        relaunch_as_admin()
        return 0
    ok = True
    if not phase1_installs():
        ok = False
    if ok and not phase2_services():
        ok = False
    summary(ok)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
