---
title: Fleet-Hygiene Resource Atlas — the where-to-REACH hub (canonical repo/standard/book + the galaxy's own local code & stores)
galaxy: fleet-hygiene
owner_slot: golf
status: VERIFIED-PARTIAL
verified_by: "papa-resource-atlas-meta (2026-06-10)"
verification_method: "LOCAL pointers reproduced verbatim from on-disk paths confirmed present in H:/prism this pass (mcp-server/src/engines/fleet-hygiene/ exists with CLAUDE.md+MEMORY.md+PATHS.md+TOOLBELT.md; .claude/helpers/install-fleet-reaper-task.ps1 present; reaper helper scripts golf-slot-reaper-guardian.mjs / alpha-slot-reaper-guardian.mjs / zombie-reaper-daemon.mjs / fleet-reaper-stop.mjs / fleet-reaper-enum-cache.mjs / fleet-reaper-host-presets.mjs / install-zombie-reaper-task.ps1 all listed under .claude/helpers/). ONLINE: every URL below was WebFetch-confirmed live + free + matching its described resource on 2026-06-10 — github.com/systemd/systemd (official 'systemd System and Service Manager', GPL-2.0/LGPL-2.1, 89k+ commits), kernel.org cgroup-v2 admin-guide (authoritative cgroup v2 design/interface doc, Tejun Heo), man7.org cgroups(7) (official Linux man-pages, free), systemd.io (official project portal), pages.cs.wisc.edu/~remzi/OSTEP/ (OSTEP, 'free in PDF form', Process/Process-API/Scheduling chapters). DROPPED from the listing: freedesktop.org systemd.kill man page (HTTP 403 under WebFetch — could not be CONFIRMED this pass, so not listed per R12; reach it via the systemd.io man-pages index instead). No video listed — the MIT 6.824 lecture videos are JS-rendered/unverifiable by fetch and already live in [[fleet-hygiene-source-atlas]]; this atlas does not re-assert them. This page is the where-to-REACH index (canonical repo/standard/book root + local code) and is DISTINCT from [[fleet-hygiene-source-atlas]] (the where-to-LEARN curriculum)."
tags: [fleet-hygiene, golf, resource-atlas, where-to-reach, canonical-source, official-repo, standards, free-textbook, systemd, cgroups-v2, linux-man-pages, OSTEP, process-lifecycle, reaping, zombie, orphan, subtree-kill, local-trove]
---

# Fleet-Hygiene Resource Atlas

The **where-to-REACH hub** for the **fleet-hygiene** galaxy (owner: **golf** — OS process management, cgroups / process-group lifecycle, race-free subtree reaping of the 26-chat fleet). One page that jumps STRAIGHT to the **authoritative source**: the galaxy's own local code + stores, and the canonical upstream repo / standard / free book.

**Distinct from its siblings — do not confuse the two atlases:**
- [[fleet-hygiene-source-atlas]] = the where-to-**LEARN** *curriculum* (courses, lecture channels, the keep-learning directory).
- **This page** = the where-to-**REACH** *index* — the canonical tool repo, the standards page, the seminal free book, and the local PRISM code you actually edit. Reach the authoritative source, don't re-derive.

Read the theory/practice siblings first; this atlas points at roots, it does not repeat their quoted facts (R12: no fact restated here is independently re-asserted — follow the link to the source).

---

## 1. Local code + stores (PRISM's own — the galaxy you edit)

These are golf's own engine directory + the real reaper scripts/stores. Reach these FIRST — they are the live implementation that the upstream sources below inform.

**Engine directory (the galaxy home):**
- `mcp-server/src/engines/fleet-hygiene/` — the fleet-hygiene galaxy engine dir. Carries its own `CLAUDE.md` (galactic-center sentinel, Bibryam cascade), `MEMORY.md` (galaxy brain), `PATHS.md`, `TOOLBELT.md`.

**Reaper task installer + runners (the operational surface):**
- `.claude/helpers/install-fleet-reaper-task.ps1` — registers the durable `PRISM Fleet Reaper` Windows scheduled task (5-min cadence, phase offset). Re-register elevated per CLAUDE.md §FLEET-REAPER.
- `.claude/helpers/golf-slot-reaper-guardian.mjs` — golf's owned reaper-guardian (ownership moved from alpha 2026-05-16; alpha's is preserved-but-unwired).
- `.claude/helpers/alpha-slot-reaper-guardian.mjs` — the preserved legacy alpha guardian (never-delete-only-disable).
- `.claude/helpers/fleet-reaper-stop.mjs` — the Stop-hook reaper runner (global-throttle gated).
- `.claude/helpers/zombie-reaper-daemon.mjs` — the zombie/orphan reaping daemon.
- `.claude/helpers/install-zombie-reaper-task.ps1` — registers the zombie-reaper scheduled task.
- `.claude/helpers/fleet-reaper-enum-cache.mjs` — the process-enumeration cache sidecar (MS2).
- `.claude/helpers/fleet-reaper-host-presets.mjs` — per-host tuning presets.

> Numeric thresholds (confirm-after-N-ticks, pressure gates, RSS ceilings, throttle windows) are NOT reproduced here — they are owner-gated to golf and live in the scripts above / `constants.ts`. See the Owner-gate section.

---

## 2. Canonical repos + papers + standards (verified live + free, 2026-06-10)

Each entry below was WebFetch-confirmed live, free, and matching its described resource during this pass. An unconfirmable candidate was **dropped, not guessed** (R12).

### systemd — the canonical process-supervisor + cgroup-driver reference implementation
- **Official repo:** <https://github.com/systemd/systemd> — "The systemd System and Service Manager." The reference implementation for service lifecycle, process supervision, and cgroup-backed process grouping on Linux (GPL-2.0 / LGPL-2.1). The model for "one owner supervises a subtree, kills the whole group" — exactly fleet-hygiene's subtree-reaping problem. *(Confirmed: official systemd org repo, 89k+ commits.)*
- **Official portal:** <https://systemd.io/> — the project homepage; links to the systemd man-pages index, design docs (boot, kill procedure, cgroup delegation), and coding guidelines. The reach-root when you need the *interface contract* (e.g. how a service's process group is terminated) rather than the source. *(Confirmed: official systemd.io portal.)*

### Linux cgroups — the standard kernel mechanism for grouping + controlling processes
- **Kernel admin guide (cgroup v2):** <https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html> — the **authoritative** documentation on cgroup v2 design, interface, and conventions (hierarchy, controllers, `cgroup.procs`). This is *the* standard for organizing processes into a controlled hierarchy — the kernel substrate under any race-free subtree-reaping design. *(Confirmed: official kernel.org page, "authoritative documentation on the design, interface and conventions of cgroup v2.")*
- **Linux man-pages — `cgroups(7)`:** <https://man7.org/linux/man-pages/man7/cgroups.7.html> — the official user-space interface man page for control groups (v1 + v2), the cgroupfs filesystem, and process movement between groups. The practitioner-facing companion to the kernel admin guide. *(Confirmed: official kernel.org man-pages project, free to read.)*

### Operating-systems foundations — the free seminal text for process/fork/wait
- **OSTEP (Operating Systems: Three Easy Pieces):** <https://pages.cs.wisc.edu/~remzi/OSTEP/> — the seminal **free** OS textbook ("is and will always be free in PDF form"). Chapters 4–7 cover Processes, the Process API (`fork`/`exec`/`wait` — the primitive behind zombie/orphan creation and reaping), and CPU scheduling. The canonical free book to reach when you need the underlying process model right. *(Confirmed: OSTEP homepage, free PDF, Process + Process-API chapters present.)*

---

## 3. Curated video

None listed this pass. The fleet-hygiene lecture-video surfaces (MIT 6.824 distributed-systems videos) are JS-rendered and could not be WebFetch-confirmed; they already live in [[fleet-hygiene-source-atlas]] (flagged there as JS-rendered). This atlas does not re-assert an unverifiable video URL (R12). Add a curated video here only when a specific URL can be WebFetch-confirmed.

---

## 4. Cross-links (sibling wiki layers)

- [[fleet-hygiene-foundations]] — the synthesized theory spine (PID/fork/wait, zombie-vs-orphan, process-state machine, heartbeat/failure-detector, leader-election/split-brain).
- [[fleet-hygiene-source-atlas]] — the where-to-LEARN curriculum (free courses, lecture channels, the keep-learning directory).
- [[fleet-hygiene-applied-practice]] — practitioner gotchas (PID-reuse race, can't-kill-a-zombie, SIGTERM-grace, kill-the-group, double-fork, thundering-herd/jitter).
- [[fleet-hygiene-advanced-techniques]] — the deep techniques layer.
- [[prism-methodology-foundations]] — the cross-galaxy methodology spine (search-first, verify-before-claim, R12 fail-loud).

---

## 5. Keep-fresh cadence

- **Re-verify the online roots quarterly** (or whenever a chat reports a dead link): WebFetch each URL in §2; if one 404s / redirects away / no longer matches, replace it with the live canonical equivalent and DROP the stale one — never leave an unverified URL listed.
- **Re-confirm the local pointers whenever golf refactors the reaper** (renames a helper, moves the engine dir, adds a runner): the §1 list must match `mcp-server/src/engines/fleet-hygiene/` + `.claude/helpers/*reaper*` on disk.
- **systemd / kernel docs track `latest`** — the kernel cgroup-v2 URL pins `/latest/`, so it follows the current kernel; spot-check that the doc still describes the controller you rely on.
- **Promotion path:** a newly-confirmed canonical source → add to §2 with its WebFetch-confirmed date; a new local runner → add to §1; never inline a threshold here (Owner-gate).

---

## Owner-gate (NOT promoted)

The following are deliberately **NOT** surfaced as values on this page — they are owner-gated to **golf** and live only in the reaper scripts / `mcp-server/src/physics/constants.ts`:
- confirm-after-N-ticks reap thresholds, stale-claim windows, heartbeat staleness/crashed thresholds;
- RSS / memory-pressure gate levels, the Stop-hook global throttle window, scheduled-task cadence + phase offsets;
- any SIGTERM-grace duration or kill escalation timing.

This atlas links the **method and the authoritative source** (cgroup hierarchy, kill-the-group, fork/wait); the **numbers** stay where they are enforced. To change a threshold, edit it at its single source under golf's ownership — do not copy it here.

## Sources

Local trove (verified present on disk, H:/prism, 2026-06-10):
- `mcp-server/src/engines/fleet-hygiene/` (engine dir + CLAUDE.md/MEMORY.md/PATHS.md/TOOLBELT.md)
- `.claude/helpers/install-fleet-reaper-task.ps1`
- `.claude/helpers/golf-slot-reaper-guardian.mjs`, `.claude/helpers/alpha-slot-reaper-guardian.mjs`, `.claude/helpers/fleet-reaper-stop.mjs`, `.claude/helpers/zombie-reaper-daemon.mjs`, `.claude/helpers/install-zombie-reaper-task.ps1`, `.claude/helpers/fleet-reaper-enum-cache.mjs`, `.claude/helpers/fleet-reaper-host-presets.mjs`

Online (WebFetch-confirmed live + free + matching, 2026-06-10):
- <https://github.com/systemd/systemd> — official systemd repo (process supervision + cgroup driver)
- <https://systemd.io/> — official systemd project portal (man-pages index, design docs)
- <https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html> — authoritative kernel cgroup v2 admin guide
- <https://man7.org/linux/man-pages/man7/cgroups.7.html> — official Linux man-pages `cgroups(7)`
- <https://pages.cs.wisc.edu/~remzi/OSTEP/> — OSTEP free textbook (Process / Process API / Scheduling)

Dropped this pass (R12 — not confirmable, not listed): freedesktop.org `systemd.kill` man page (HTTP 403 under WebFetch). Not listed: MIT 6.824 lecture videos (JS-rendered/unverifiable by fetch; live in [[fleet-hygiene-source-atlas]]).
