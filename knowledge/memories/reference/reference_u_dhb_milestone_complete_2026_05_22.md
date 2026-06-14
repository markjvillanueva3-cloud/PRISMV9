---
name: reference-u-dhb-milestone-complete-2026-05-22
description: "2026-05-22 hotel post-compact iter — U-DOCKER-HOOK-BROKER milestone COMPLETE (P1-P5 in 5 commits). Broker deployable + migration-ready"
aliases: reference_u_dhb_milestone_complete_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.998Z
---


# U-DOCKER-HOOK-BROKER milestone — COMPLETE (2026-05-22, hotel post-compact)

5 commits in one /yolo-mode /loop iteration shipped every phase of the original spec at `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`.

## Phase ledger

| Phase | Commit | Files | Tests |
|---|---|---|---|
| P1 — classifier + survey | `d5f3ac82b1` | scripts/lib/hook-broker-classifier.{mjs,test.mjs}, scripts/classify-hooks-for-broker.{mjs,test.mjs}, state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md} | 59/59 |
| P2 — broker HTTP server | (in P3..P5 sequence) | docker/hook-broker/server.{mjs,test.mjs} | 20/20 |
| P3 — Dockerfile + compose | (commit chain) | docker/hook-broker/Dockerfile, docker-compose.yml | compose validates |
| P4 — _rpc-shim.mjs | `d30286be32` | .claude/hooks/_rpc-shim.{mjs,test.mjs} | 11/11 |
| P5 — migration script | `972e7f79e7` | scripts/migrate-hooks-to-rpc.{mjs,test.mjs}, state/shared/HOOK-MIGRATION-LOG.json | 17/17 |

**Total: 107/107 hermetic tests pass across the 5 phases.**

## Key empirical findings

P1 classifier ran against 602 real hooks:
- **78 (13.0%)** module-safe → broker can share in-process
- **372 (61.8%)** mutates-process → MUST spawn-isolate
- **146 (24.3%)** unknown → default spawn-isolate
- **5 (0.8%)** imports-only → ignore
- **1 (0.2%)** empty → ignore
- **0** cli-safe-stdin-stdout (none found)

The original spec assumed broker would amortize cold-start across most hooks. Real measurement says ~13% — broker's actual savings ceiling. This materially shapes the operator-side expectation: migrating 78 hooks gives 13% cold-start savings × the hook-event volume, not 100%. The remaining 87% need per-event spawn for safety; the broker doesn't help them.

## Per-file scrutiny gate ran on every file

P1 lib (FAIL on initial review): 2 P0s + 3 P1s, all fixed before next file.
P1 CLI: 3 P1s preemptively fixed (size cap, atomic writes, freeze consistency).
P2 server: 1 P0 + 4 P1s + 2 P2s found by Reviewer B. P0 (loaded-clear race) fixed with atomic Map swap. P1-A (cache-bust collision) fixed with per-file counter + randomBytes. P1-B (path-injection allowlist) fixed with strict regex + 5 new negative tests. P1-C (timer leak) fixed with always-clear. P1-D (ready flag not reset) fixed. P2 (body-cap leak) fixed.

## Operator cutover sequence (when ready to migrate)

```bash
# 1. Refresh the compat report (run after any .claude/hooks/ change)
node scripts/classify-hooks-for-broker.mjs

# 2. Dry-run the migration to verify candidate count
node scripts/migrate-hooks-to-rpc.mjs

# 3. Build + start the broker container
docker compose up -d --build prism-hooks
curl -s http://127.0.0.1:9876/healthz   # expect {"ready":true,"loaded":78,...}

# 4. Cutover — actually rewrite the hooks
node scripts/migrate-hooks-to-rpc.mjs --apply

# 5. Exercise Claude Code; verify hooks fire correctly (UserPromptSubmit,
#    PreToolUse, Stop, etc — all should pass through the broker)

# 6. (only if anything is off) Roll back
node scripts/migrate-hooks-to-rpc.mjs --undo --apply
docker compose stop prism-hooks
```

The zero-rollback fallback path means even with the broker stopped and migrated hooks in place, the system keeps working (every shim auto-falls back to dynamic-importing its `.original.mjs` peer).

## What was NOT done

- **Operator-side cutover NOT executed.** Migration script ships in dry-run mode. The production migration is an operator-driven step.
- **U-OE-L3 (Ollama L3 agent loop) still pending.** Different milestone, also multi-phase. Did not touch.
- **Broker not load-tested under real Claude Code traffic.** Tests are hermetic — production hardening (concurrent load, memory under sustained reload, multi-day uptime) is a separate validation.

## Doctrine confirmed

- **Decompose milestone-scale work into bite-sized phased units** — P1-P5 in one autonomous loop iteration worked because each phase was 1-4 files with clear scrutiny gates.
- **Per-file scrutiny + 2 parallel reviewers > end-of-task scrutiny.** P0 #1 on the classifier (missing fs.promises/exec/network mutation detection) is the exact silent-corruption class the spec warned about — single-reviewer would have shipped a broker that corrupted state across chats.
- **YOLO ≠ skip scrutiny.** Even in /yolo-mode, per-file gate stayed load-bearing — found 1 P0 + 4 P1s on the broker server that would have been production fires.

## Refs

- Parent spec: `state/shared/specs/2026-05-09-U-DOCKER-HOOK-BROKER.md`
- Survey artifact: `state/shared/HOOK-BROKER-COMPAT-REPORT.{json,md}`
- Migration log: `state/shared/HOOK-MIGRATION-LOG.json`
- Sibling memory: [[reference_u_dhb_p1_hook_broker_classifier_2026_05_22]]
- Commits: `d5f3ac82b1` (P1), `d30286be32` (P4), `972e7f79e7` (P5)
