# cad session eca6e8bb (2026-05-22, 25MB, spine 131KB, 2 slice(s), model gpt-oss:20b)

**SHIPPED**  
- `c845cb3551` – removed stale `.js` engines (AutoWiringEngine, QualityScoreEngine, QualityDashboardEngine) to fix esbuild import hijack.  
- `eb3e5db897` – fixed `pickActionableSlots` to use `entry.pid`.  
- `3042551203` – added title‑based HWND resolver (`resolve-hwnd-by-title.mjs`) and updated sweep logic.  
- `e6a6e015eb` – hardened sweep: real git state checks, handoff awareness, single‑instance lockfile; introduced 90 s compact wait (`DEFAULT_COMPACT_WAIT_MS`).  
- `U-ZEBRA-GAP8-COOLDOWN` – per‑slot cooldown helper (`DEFAULT_ACTION_COOLDOWN_MS`) and tests.  
- `3ae6e458d5` – shipped `zebra-context-bundle.mjs` (30/30 tests) with mtime cache & path normalization.  
- `77c2561281` – G10+G12 launcher `zebra-launch.ps1`; registers scheduled task and flips `zebraOptIn=true` for slot *alpha*.  
- Settings edit: `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` changed 80→95 (C:/ & H:/ mirror).  
- Updated `state/shared/specs/ZEBRA-HERMES-GAP-AUDIT-2026-05-20.md` (G1, G1b, G2/3/9, G8 fixed).

**DECISIONS**  
- Adopt title‑based HWND resolver to eliminate PID drift.  
- Introduce per‑slot cooldown (`DEFAULT_ACTION_COOLDOWN_MS`) and single‑instance lockfile guard for sweep.  
- Keep `zebraOptIn` default false; operator must opt‑in via scheduled task or manual edit.  
- Split Zebra into phases: MS0 (read‑only surface bundle), MS1 (action‑ADT suggestions), MS2 (goal‑aware planner).  
- Use 5‑min sweep cadence with `/compact`/`/clear`; `DEFAULT_COMPACT_WAIT_MS=90 s`.  
- Defer deep research deliverable wiring until gaps fixed.

**OPERATOR DIRECTIVES**  
- Set `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=95`, then run `/compact`.  
- Run elevated PowerShell:  
  ```
  powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/zebra-launch.ps1 -RunNow
  ```  
  registers scheduled task and opts‑in slot *alpha*.  
- After burn‑in, enable more slots: `zebra-launch.ps1 -Live -Slots alpha,bravo,charlie`.  
- Use `chat-slots.json` to set `zebraOptIn=true` for any additional slots.  
- Loop: `/loop [5m] /goal "fill all gaps for zebra hermes capability + do deep research on hermes and utilizing obsidian as an automated os | completed tasks and wired"`.

**FINDINGS/BUGS**  
- G1: wrong field parsing → zero actionable slots (fixed by `entry.pid`).  
- G1b: PID→HWND resolution unsound; title‑based resolver added.  
- G3: 5 s stagger too short → now 90 s compact wait (`DEFAULT_COMPACT_WAIT_MS`).  
- G8: missing per‑slot cooldown → added `DEFAULT_ACTION_COOLDOWN_MS`.  
- G11: advisory hook orphaned, not wired into settings (pending).  
- G13: awareness weights trained but unused in decision logic (pending).  
- G2/G9: hard‑coded git state/handoff checks replaced with real checks.  
- esbuild import hijack fixed by removing stale `.js` artifacts.  
- Lockfile contention on shared git index resolved via native PowerShell Git.  
- Installer script mojibake fixed to ASCII.  
- JSON round‑trip for `chat-slots.json` verified non‑destructive.

**DOMAIN SPECIFICS**  
- Engines: `zebra-orchestrator-lib.mjs`, `zebra-orchestrator-sweep.mjs`, `resolve-hwnd-by-title.mjs`.  
- Dispatchers/skills: `chat-slots.mjs`, `per-agent-handoff.mjs`, `precompact-pending-guard.mjs`.  
- Context bundle: `zebra-context-bundle.mjs` (mtime cache, path normalization).  
- Loop state: `loop-state.mjs`; slot claims in `chat-slots.json` (`pid`, `terminalWindowId`).  
- Windows integration: PowerShell Get‑Process MainWindowHandle; Windows Terminal tw‑wt‑<uuid> IDs.  
- PRISM platform: 26‑slot NATO chat fleet; Zebra phases MS0/1/2; Hermes ms0/ms1.  
- Metrics: log‑tail parsing, cooldown timers (`DEFAULT_ACTION_COOLDOWN_MS`), awareness queue length.  
- Paths: `H:/prism/.claude/helpers/`, `scripts/lib/`, `state/shared/specs/`.  
- Testing: Vitest, esbuild, TS‑NodeNext.

**TOOLS USED**  
- Node scripts: `chat-slots.mjs`, `per-agent-handoff.mjs`, `precompact-pending-guard.mjs`.  
- Helpers: `stable-session-id.mjs`, `install-zebra-orchestrator-task.ps1`, `zebra-launch.ps1`.  
- Build tools: esbuild, TS‑NodeNext, Vitest.  
- Version control: Git (native PowerShell to avoid Cygwin fork).

**OPEN THREADS**  
- G13: integrate awareness weights into decision logic.  
- Deep research deliverable HERMES‑OBSIDIAN‑OS‑RESEARCH‑2026‑05‑20.md not wired.  
- Operator opt‑in: register scheduled task and set `zebraOptIn=true` for at least one slot (G10/G12) – pending.  
- U‑ZO‑MS0‑02–06 roadmap, loop‑state reader, token‑awareness zone; MS1 action‑ADT, MS2 goal‑aware planner design phase.  
- Additional slots beyond *alpha* need operator opt‑in (`zebraOptIn=true`).  
- Documentation: wiki entry finalization, CLAUDE.md regressions entry, memory pointer – pending.  
- CI for G10/G12 scheduled task registration on all hosts.
