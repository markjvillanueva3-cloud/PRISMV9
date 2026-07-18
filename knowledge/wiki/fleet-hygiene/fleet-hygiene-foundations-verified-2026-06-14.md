---
name: fleet-hygiene-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the fleet-hygiene galaxy. 5 fetched sources. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: fleet-hygiene
  tier: VERIFIED
  verifiedBy: WebFetch
  physicsSafe: true
---

# fleet-hygiene galaxy -- verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Every source below was WebFetched + excerpted (honest `fetched:false` markers for paywalled/unreachable sources). Physics-safe: no numeric cutting constant.

## Synthesis
The POSIX standard (IEEE Std 1003.1-2008) establishes the normative zombie-reaping contract: parents must call wait()/waitpid() to collect child exit status and release zombie process table entries, with SA_NOCLDWAIT or a SIGCHLD handler calling waitpid(-1, WNOHANG) in a loop as the canonical patterns for prevention. Linux extends this with prctl(PR_SET_CHILD_SUBREAPER), allowing fleet supervisors and container runtimes to take ownership of orphaned process subtrees without burdening PID 1, while the /proc/[PID]/status pseudo-filesystem provides zero-overhead per-process monitoring (State=Z for zombie detection, VmRSS for memory anomalies) without ptrace. The process supervision philosophy (daemontools/runit/s6/systemd lineage) replaces fragile PID-file launchers with parent-anchored supervisors that guarantee automatic restart-on-failure, clean process state, and reliable log capture via inherited stdout/stderr. At the fleet level, cgroup v2 enables group-scoped resource accounting and proactive OOM management via memory.current/max/high, PSI pressure stall metrics, and memory.oom.group for atomic workload elimination, with systemd-oomd intervening before the kernel OOM killer fires.

## Verified sources
### [The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2008: wait() and waitpid()](https://pubs.opengroup.org/onlinepubs/9699919799.orig/functions/wait.html) -- standard
> "The Open Group Base Specifications Issue 7 IEEE Std 1003.1-2008, 2016 Edition Copyright 2001-2016 The IEEE and The Open Group"

**Knowledge:** Normative POSIX contract for zombie reaping: wait()/waitpid() collect child exit status and release the zombie process table entry. If a parent terminates without calling wait(), surviving children are reassigned to 'an implementation-defined system process' (init/PID 1). SA_NOCLDWAIT flag and SIG_IGN on SIGCHLD both prevent zombie creation. Canonical reaping pattern: SIGCHLD handler calling waitpid(-1, &status, WNOHANG) in a loop to drain all exited children.

### [Linux Kernel Deep Dive: Zombie Processes and Modern Process Management](https://dev.to/kanywst/linux-kernel-deep-dive-zombie-processes-and-modern-process-management-1p1g) -- article
> "Subreaper (prctl(PR_SET_CHILD_SUBREAPER)): Allows arbitrary processes to 'take custody of orphans under this hierarchy' without burdening PID 1"

**Knowledge:** Documents the full zombie/orphan lifecycle in the Linux kernel. Key mechanism: prctl(PR_SET_CHILD_SUBREAPER) lets container runtimes and fleet supervisors claim orphaned process subtrees without burdening PID 1 — critical for multi-process fleet management. Also documents the Go cmd.Start() zombie trap (process started without cmd.Wait() leaks a zombie entry per child).

### [Process supervision — Wikipedia](https://en.wikipedia.org/wiki/Process_supervision) -- article
> "Process supervision is a type of operating system service management in which some master process remains the parent of the service processes"

**Knowledge:** Defines the process supervision philosophy (daemontools/runit/s6/systemd lineage): a master process remains the parent of all service processes, enabling automatic restart-on-failure, elimination of fragile PID files, clean process state tracking, and reliable log capture via stdout/stderr redirection. Concurrent startup and graceful shutdown are natural consequences of the parent-child hierarchy.

### [proc_pid_status(5) — Linux manual page](https://man7.org/linux/man-pages/man5/proc_pid_status.5.html) -- article
> "VmRSS: 13484 kB"

**Knowledge:** The /proc/[PID]/status pseudo-file exposes per-process memory metrics (VmPeak=peak virtual memory, VmSize=current VM, VmRSS=resident set size) and the State field including Z=zombie detection. This is the canonical low-overhead substrate for fleet-level process monitoring: poll State for zombies, VmRSS for memory anomalies, and signal masks for debugging hung supervisors — all without ptrace or kernel module dependencies.

### [Control Group v2 — The Linux Kernel documentation](https://docs.kernel.org/admin-guide/cgroup-v2.html) -- report
> "memory.current: The total amount of memory currently being used by the cgroup and its descendants."

**Knowledge:** cgroup v2 provides fleet-wide resource accounting and limits per process-group: memory.current (live usage), memory.max (hard OOM kill trigger), memory.high (throttle before OOM), memory.min (protection floor), memory.oom.group (atomic all-or-nothing OOM kill for a cgroup), and PSI pressure stall metrics. systemd-oomd uses PSI + memory.high to intervene proactively before the kernel OOM killer fires. The oom_kill counter tracks kill events for monitoring dashboards.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_74b87263-acb). Ledger: state/shared/galaxy-knowledge-iterations.json._
