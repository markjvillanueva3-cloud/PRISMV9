#!/usr/bin/env python3
"""
PRISM portable-drive safe-eject.

One command to prepare the H: drive for physical removal. Stops Docker
containers that have bind mounts on H:, kills Node/npm/vitest/etc
processes that were launched from H:, asks the Windows Shell to eject the
drive, and reports what's still holding handles if the eject gets refused.

Does NOT kill code editors (VS Code, Notepad++, Sublime etc). If you have
unsaved work in them, save first — then run this script.

Does NOT kill the Claude Code terminal itself (the parent shell). Start
this script from inside a terminal and the terminal will stay up.

Usage:
    python H:\\prism\\scripts\\eject-drive.py              # H: by default
    python H:\\prism\\scripts\\eject-drive.py --drive G    # different letter
    python H:\\prism\\scripts\\eject-drive.py --dry-run    # show, don't kill

Exit codes:
    0 = drive ejected (or already absent)
    1 = drive still busy, see the residual-handles list
    2 = prerequisite missing (docker, powershell, etc)
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

HOME = Path(__file__).resolve().parent.parent  # H:/prism on H: drive
DOCKER_BIN = r"C:\Program Files\Docker\Docker\resources\bin\docker.exe"

# Processes we are willing to kill silently. All command-line matches must
# also reference the target drive — we never kill a process that isn't
# running off the drive. Editors are intentionally NOT in this list.
KILLABLE_IMAGE_NAMES = {
    "node.exe",
    "npm.cmd",
    "npx.cmd",
    "vitest.exe",
    "python.exe",
    "tsserver.exe",
    "eslint.exe",
    "rollup.exe",
    "vite.exe",
    "esbuild.exe",
    "git.exe",  # long-running rebases/merges only; quick gits will finish
    "conhost.exe",
}

# Editor processes — warn, do not kill.
EDITOR_IMAGE_NAMES = {
    "Code.exe",
    "notepad++.exe",
    "sublime_text.exe",
    "Cursor.exe",
    "idea64.exe",
    "pycharm64.exe",
    "webstorm64.exe",
    "notepad.exe",
    "devenv.exe",
}


class C:
    OK = "[OK]   "
    SKIP = "[SKIP] "
    RUN = "[RUN]  "
    WARN = "[WARN] "
    FAIL = "[FAIL] "
    HEAD = "====== "


def log(s: str) -> None:
    print(s, flush=True)


def header(t: str) -> None:
    log("")
    log(C.HEAD + t)


# ---------- docker ----------------------------------------------------------

def docker_cmd() -> str | None:
    if Path(DOCKER_BIN).exists():
        return DOCKER_BIN
    return shutil.which("docker")


def docker_compose_down(drive_letter: str) -> None:
    """Stop all PRISM containers that bind-mount to H:. Idempotent."""
    dc = docker_cmd()
    if not dc:
        log(C.SKIP + "docker CLI not found, skipping compose down")
        return
    compose_file = Path(f"{drive_letter}:/prism/docker-compose.yml")
    if not compose_file.exists():
        log(C.SKIP + f"no docker-compose.yml on {drive_letter}:, skipping")
        return
    # `docker info` to confirm daemon up — if daemon is down, containers
    # can't be holding handles either.
    r = subprocess.run([dc, "info", "--format", "{{.ServerVersion}}"],
                       capture_output=True, text=True)
    if r.returncode != 0:
        log(C.SKIP + "docker daemon not running, nothing to stop")
        return
    log(C.RUN + f"docker compose -f {compose_file} down")
    r = subprocess.run(
        [dc, "compose", "-f", str(compose_file), "down"],
        capture_output=True, text=True, timeout=120,
    )
    if r.returncode == 0:
        log(C.OK + "containers stopped, volumes released")
    else:
        log(C.WARN + f"compose down exit={r.returncode}: {r.stderr[-400:]}")


# ---------- processes -------------------------------------------------------

@dataclass
class Proc:
    pid: int
    name: str
    cmdline: str
    path: str

    def touches_drive(self, drive_letter: str) -> bool:
        """
        True iff the process's exe or command line references an actual path
        on the drive (H:\\ or H:/). Plain 'h:' substring is too loose — it
        matches unrelated text like '--hash:...' in unrelated tooling.
        """
        low = drive_letter.lower()
        hay = f"{self.cmdline} {self.path}".lower()
        return f"{low}:\\" in hay or f"{low}:/" in hay


def enumerate_processes() -> list[Proc]:
    """Ask PowerShell/CIM for every process + its command line + exe path."""
    ps = (
        "Get-CimInstance Win32_Process | "
        "Select-Object ProcessId,Name,CommandLine,ExecutablePath | "
        "ConvertTo-Json -Compress -Depth 2"
    )
    r = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", ps],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
        timeout=60,
    )
    if r.returncode != 0:
        log(C.FAIL + f"PowerShell CIM query failed: {r.stderr[-400:]}")
        return []
    import json as _json
    try:
        raw = _json.loads(r.stdout or "[]")
    except _json.JSONDecodeError:
        log(C.FAIL + "could not parse CIM JSON output")
        return []
    if isinstance(raw, dict):  # single process => single object
        raw = [raw]
    procs: list[Proc] = []
    for o in raw:
        procs.append(Proc(
            pid=int(o.get("ProcessId", 0) or 0),
            name=str(o.get("Name") or ""),
            cmdline=str(o.get("CommandLine") or ""),
            path=str(o.get("ExecutablePath") or ""),
        ))
    return procs


def classify(procs: list[Proc], drive_letter: str) -> tuple[list[Proc], list[Proc], list[Proc]]:
    """Return (killable, editors, other) touching the drive. Excludes self."""
    me = os.getpid()
    kill: list[Proc] = []
    editors: list[Proc] = []
    other: list[Proc] = []
    for p in procs:
        if p.pid == 0 or p.pid == me:
            continue
        if not p.touches_drive(drive_letter):
            continue
        if p.name in KILLABLE_IMAGE_NAMES:
            kill.append(p)
        elif p.name in EDITOR_IMAGE_NAMES:
            editors.append(p)
        else:
            other.append(p)
    return kill, editors, other


def kill_proc(p: Proc) -> bool:
    r = subprocess.run(
        ["taskkill", "/F", "/PID", str(p.pid)],
        capture_output=True, text=True,
    )
    return r.returncode == 0


# ---------- drive eject -----------------------------------------------------

def drive_exists(letter: str) -> bool:
    return Path(f"{letter}:/").exists()


def shell_eject(letter: str) -> bool:
    """
    Ask the Windows Shell to eject the drive. This is the same code path the
    tray icon uses for "Safely Remove Hardware". Works for USB/removable
    volumes; returns False quickly on fixed disks.
    """
    ps = f"""
$shell = New-Object -ComObject Shell.Application
$drive = $shell.Namespace(17).ParseName('{letter}:')
if ($null -eq $drive) {{
    Write-Output 'not-found'
    exit 1
}}
try {{
    $drive.InvokeVerb('Eject')
    Write-Output 'eject-sent'
    exit 0
}} catch {{
    Write-Output ('eject-failed: ' + $_.Exception.Message)
    exit 2
}}
"""
    r = subprocess.run(
        ["powershell.exe", "-NoProfile", "-Command", ps],
        capture_output=True, text=True, timeout=30,
    )
    out = (r.stdout or "").strip()
    if r.returncode == 0 and "eject-sent" in out:
        return True
    log(C.WARN + f"shell eject output: {out}  stderr={r.stderr[:200]}")
    return False


def drive_gone(letter: str, wait_s: int = 10) -> bool:
    deadline = time.time() + wait_s
    while time.time() < deadline:
        if not drive_exists(letter):
            return True
        time.sleep(0.5)
    return False


# ---------- orchestration ---------------------------------------------------

def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description="Safely eject the PRISM H: drive.")
    ap.add_argument("--drive", default="H", help="drive letter (default H)")
    ap.add_argument("--dry-run", action="store_true",
                    help="show what would be killed/stopped but do nothing")
    args = ap.parse_args(argv)
    letter = args.drive.strip().rstrip(":").upper()
    if len(letter) != 1 or not letter.isalpha():
        log(C.FAIL + f"bad drive letter: {args.drive!r}")
        return 2

    header(f"PRISM eject  drive={letter}:  dry_run={args.dry_run}")

    if not drive_exists(letter):
        log(C.OK + f"{letter}: is not mounted — nothing to eject")
        return 0

    # Step 0 — mirror Claude Code state (chat history + settings) to H: so the
    # next PC can /resume these conversations. Done first, while C: state
    # files are still readable and no killable processes have been touched.
    header("Step 0: sync Claude state C: -> H:")
    if args.dry_run:
        log(C.SKIP + "dry-run, not syncing claude state")
    else:
        sync_py = Path(__file__).resolve().parent / "claude_sync.py"
        if sync_py.exists():
            rc = subprocess.call(["py", "-3", str(sync_py), "push"])
            if rc == 0:
                log(C.OK + "claude state mirrored")
            else:
                log(C.WARN + f"claude_sync.py exited {rc} (continuing with eject)")
        else:
            log(C.WARN + "claude_sync.py not found — skipping (no /resume portability)")

    # Step 1 — stop docker containers that bind-mount onto the drive.
    header("Step 1: stop containers")
    if args.dry_run:
        log(C.SKIP + "dry-run, not stopping containers")
    else:
        docker_compose_down(letter)

    # Step 2 — enumerate + classify processes.
    header("Step 2: find processes using the drive")
    procs = enumerate_processes()
    log(f"scanned {len(procs)} processes")
    killable, editors, other = classify(procs, letter)

    for p in killable:
        log(f"  KILLABLE pid={p.pid:>6}  {p.name}  {p.cmdline[:120]}")
    for p in editors:
        log(f"  EDITOR   pid={p.pid:>6}  {p.name}  (kept — save your work)")
    for p in other:
        log(f"  OTHER    pid={p.pid:>6}  {p.name}  {p.cmdline[:120]}")

    if not killable and not editors and not other:
        log(C.OK + "no user processes are touching the drive")

    # Step 3 — kill the ones we're allowed to.
    if killable:
        header("Step 3: terminate processes")
        if args.dry_run:
            log(C.SKIP + "dry-run, not killing")
        else:
            for p in killable:
                ok = kill_proc(p)
                log(f"  {'[OK]' if ok else '[FAIL]'} taskkill pid={p.pid} {p.name}")

    # Step 4 — warn about editor / unknown holds.
    if editors or other:
        header("Step 4: unresolved holders")
        log(C.WARN + "close these yourself before the drive will eject:")
        for p in editors + other:
            log(f"  pid={p.pid:>6}  {p.name}  ({p.path})")

    # Step 5 — ask the shell to eject.
    header("Step 5: ask Windows to eject")
    if args.dry_run:
        log(C.SKIP + "dry-run, not ejecting")
        return 0
    sent = shell_eject(letter)
    if not sent:
        log(C.FAIL + "shell refused to eject — most likely a handle is still open")
        return 1

    if drive_gone(letter, wait_s=10):
        log(C.OK + f"{letter}: ejected cleanly — safe to unplug")
        return 0

    log(C.WARN + f"{letter}: still mounted after 10s — check the system tray for a "
                 "'Problem Ejecting' popup and close whatever process it names")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
