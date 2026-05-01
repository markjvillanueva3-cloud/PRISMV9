---
name: Docker Desktop WSL recovery
description: When Docker won't launch (Windows + WSL2), check com.docker.service first — it's usually the root cause.
type: feedback
originSessionId: cdbaa00b-11a7-43d2-bb48-42f6aada5fa5
---
When Docker Desktop won't start on Windows and user suspects WSL, the first thing to check is **`sc query com.docker.service`**. If STOPPED with exit code 1077, that's the privileged helper service Docker Desktop needs to provision the WSL2 integration — without it, backend processes (`com.docker.backend.exe`) never spawn and the `docker-desktop` WSL distro stays Stopped.

**Why:** On 2026-04-18, spent ~30 min debugging zombied Docker Desktop UI processes and a stopped `docker-desktop` WSL distro. The UI was running (4 procs) but backend wasn't spawning. Real cause: `com.docker.service` was STOPPED. Exit code 1077 = "Service has not been started since last reboot." WSL itself (wslservice, vmcompute, hns) was fine; the missing link was Docker's own helper service.

**How to apply:** Diagnostic sequence when Docker won't launch:
1. `sc query com.docker.service` — if STOPPED → run `sc start com.docker.service`
2. `sc query wslservice`, `sc query vmcompute`, `sc query hns` — all should be RUNNING (legacy LxssManager can stay stopped)
3. Kill zombie `Docker Desktop.exe` processes (they won't self-recover)
4. `wsl --shutdown` — clean WSL state
5. Relaunch `"C:\Program Files\Docker\Docker\Docker Desktop.exe"` via `cmd //c start ""`
6. Wait ~30s, test `docker version` (should show Server section, not "cannot find the file")
7. Verify `wsl --list --verbose` shows `docker-desktop` as Running

Do NOT suggest destructive recovery (`wsl --unregister docker-desktop`, reset to factory defaults, reinstall) until step 1-6 are exhausted — those destroy images/volumes and waste hours re-pulling.

If wsl-bootstrap crashes with exit status `0xc00000fd` (STATUS_STACK_OVERFLOW) during `cross-distro` service init: kill Docker Desktop + backend, run `wsl --shutdown`, bounce `com.docker.service` (stop then start), then relaunch. This clears transient kernel state and the second bootstrap attempt usually succeeds.
