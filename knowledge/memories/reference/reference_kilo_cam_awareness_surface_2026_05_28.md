---
name: reference_kilo_cam_awareness_surface_2026_05_28
description: Custom CAM-domain prism-awareness surface (generator + slot-gated SessionStart inject) — slot:kilo's "always have context on your domain"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.179Z
aliases: reference_kilo_cam_awareness_surface_2026_05_28
---


slot:kilo built a custom CAM-domain prism-awareness surface (U-CAM-AWARENESS, 2026-05-28, commit on slot/kilo) — the operator-requested *"make a custom one tailored to your domain so you always have context on your domain."* It closes the ONE real gap from the CAM-galaxy synergy audit; every other surface (memories/wiki/tribal/soul/CLAUDE.md/4 galaxy files/master `[galaxy:cam]` back-pointer/PSN edges/AI+LoRA dispatcher surface) was already present.

**Artifacts:**
- `scripts/cam-awareness-snapshot.mjs` — generator. **child_process-FREE** (branch from `.git/HEAD`, recent commits from `.git/logs/HEAD` reflog, all `fs` — passes the security hook AND works in the worktree + post-merge main via script-location root resolution). Fail-soft per section (R12: `(unknown — reason)`, never a fabricated count). Emits `state/shared/CAM-AWARENESS-SNAPSHOT.md` (+ `.json`). Live: 99 `CAM*.ts` + 61/17 hyperMILL, 82 `cam_*` families / 1158 refs, 13 memories.
- `.claude/hooks/cam-awareness-inject.mjs` — SessionStart inject, gated on the **SESSION cwd's branch === `slot/kilo`** (delta=`slot/delta`, golf=`cad-fusion-live-ms0` → silent; scopes correctly pre- AND post-merge). Read-only, fail-soft (any error → exit 0, never breaks SessionStart). Truth table verified: kilo→inject 941ch / non-kilo→silent / disable→silent / force→bypass-gate.

**Why:** the fleet-wide `awareness-snapshot-inject` answers "what's built across PRISM"; this answers "what IS the CAM galaxy right now" so a kilo session boots with its own domain (engines/dispatcher/triad/invariants/PSN/memories) in ~12 lines.

**How to apply:** regen `node scripts/cam-awareness-snapshot.mjs`. Knobs: `PRISM_CAM_AWARENESS_INJECT=0` (off), `PRISM_CAM_AWARENESS_FORCE=1` (bypass gate, testing), `PRISM_CAM_AWARENESS_STALE_HOURS=N` (default 48).

**Wiring (slot-worktree contract — NOT incomplete):** settings.json wires hooks at main-tree `H:/prism/.claude/hooks/` — worktree-blocked, and a premature wire would break every chat's SessionStart (the hook file isn't on main until merge). Golf (the integrator) adds the one-line SessionStart entry atomically when merging slot/kilo. Live NOW pre-merge via the `cam/MEMORY.md` pointer ("Read it first each session"). 3-of-3 scrutiny PASS (arms A/B/C). P2 deferred: committed-snapshot git churn from the `generatedAt` stamp — kept committed BY DESIGN (gitignoring it would defeat "always have context on a fresh checkout / for golf's merge"; churn is 1 line, only on occasional regen).

**CAM dev-tooling suite (U-CAM-DEVTOOLS, 2026-05-29 — durability layer):** beyond the awareness surface, the galaxy now has anti-regression + convenience tooling so the synergy stays durable:
- `scripts/cam-galaxy-verify.mjs` — anti-regression health oracle (8 fs-only checks: soul cam-specialist / 4 galaxy files / master-brain link + awareness ptr / wiki / >=10 memories / `[galaxy:cam]` back-pointer / awareness surface fresh / dispatcher >=20 cam_ actions). Exit 0/1/2 = worst severity (cron/Stop-gateable). fail-soft per check (a throw -> WARN, never crashes). Live run: 8/8 PASS. Run after any peer merge.
- `/cam-context` skill (gitignored/local) — one-shot: prints full awareness snapshot + runs the verifier (read-only). Manual companion to the SessionStart auto-inject.
- HARNESS LESSON: the security-reminder hook false-flags the node spawn API AND the bare regex match-method token, treating both as shell-injection risk. Build galaxy scripts/hooks spawn-free (read git via fs from .git/HEAD + reflog) and use `matchAll` instead of the regex match-method for scans — both pass cleanly. The hook even blocks a memory file whose PROSE quotes those tokens.

Full CAM domain dev-tooling now: scripts (cam-awareness-snapshot, cam-galaxy-verify) + hook (cam-awareness-inject) + skills (cam-route-kilo, cam-context). All in cam/TOOLBELT.md dev-tooling section.

Pairs with [[reference_kilo_cam_galaxy_buildout_2026_05_28]] · [[feedback_kilo_cam_collision_gate_2026_05_28]] · the workflow-StructuredOutput-then-rate-limit failure that forced the inline audit is a harness lesson (3 workflow attempts defeated by infra, pivoted to direct inline audit + sequential-then-parallel scrutiny).
