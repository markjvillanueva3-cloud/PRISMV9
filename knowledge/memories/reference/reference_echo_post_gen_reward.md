---
name: reference_echo_post_gen_reward
description: "scripts/post-gen-reward.mjs — non-circular scored reward fn for post-gen / HurcoV11 fine-tuning (lint+structure+alarm+golden, completeness-gated). Commit 5f4575abcb. Closes closed-loop P0#4 de-circularize + P1 scored-harness; P0#3 golden PARTIAL."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.562Z
aliases: reference_echo_post_gen_reward
---


slot:echo built `H:/prism/scripts/post-gen-reward.mjs` — the **non-circular scored reward function** the closed-loop audit ([[reference_echo_closed_loop_training_readiness]]) named as the keystone for measuring + fine-tuning HurcoV11 output. Commit `5f4575abcb` (`[MAIN]…/U-ECHO-POST-REWARD`). 12 `node:test` cases (`post-gen-reward.test.mjs`), all pass.

**API:** `import { scorePost } from scripts/post-gen-reward.mjs` → `await scorePost(nc, {dialect, golden?, filename?})` → `{reward, components:{lint,structure,alarm,golden?}, detail, dialect, schemaVersion:"1.0.0"}`. **CLI:** `node scripts/post-gen-reward.mjs <file> --dialect <name> [--golden <ref.nc>] [--json]`; exit **0** reward≥0.6 / **3** below / **2** bad invocation.

**Why non-circular (closes P0#4):** scores up to FOUR orthogonal signals, never the engine's own `quality_score` (the circular trap the audit flagged). Base weights — no-golden `{lint:0.45, structure:0.35, alarm:0.2}`; with golden `{golden:0.5, lint:0.25, structure:0.15, alarm:0.1}` — a null component is DROPPED and its weight renormalized onto the rest. (1) **dialect-lint** reuses `lintNc` from [[reference_echo_nc_dialect_lint]]; (2) **structure-completeness** = units/spindle+speed/retract/program-end/tool-or-CSS *presence* (order is lint's job; turning-adaptive); (3) **alarm-association** data-driven from `controller-alarm-database.json`; (4) **golden** = line-set Jaccard vs `--golden` reference (fuzzy — right shape for an RL reward).

**ALARM FIX (commit `6277f9a45d`, 3-of-3 convergent reviewer finding):** the first cut treated "G/M code named in a HIGH/CRITICAL alarm description" as a fault → two harms: (a) it was a **dead +0.2 constant for HURCO** (the fine-tune target — zero code-bearing alarms → always returned 1), and (b) where it fired it was **anti-correlated** — penalizing legitimate universal codes (M06/G41/G42/G43/G99). Fix: a `UNIVERSAL_SAFE_CODES` allowlist removes universal codes at index-build time, and `alarmScore` returns `null` (component EXCLUDED + weights renormalized) for any family without *non-universal* code-bearing alarms. In the shipped 2,588-alarm DB that leaves **SIEMENS (G25/G26) as the only family with real alarm signal**; HURCO/FANUC reward is now pure lint+structure(+golden). Verified: clean Hurco `reward=1 alarm=n/a`; Siemens+G25 `reward=0.98 alarm=0.900`. (Also: `pathToFileURL` for cross-platform import + `main().catch()`.) Test count 12→13 (added a real Siemens-G25 signal test + universal-codes-not-penalized assertion).

**KEY DESIGN FIX (R9 caught it):** lint+alarm reward *absence of problems*, which an empty/trivial NC trivially satisfies → empty program scored 0.628 (above the 0.6 PASS threshold). Fixed with a **completeness gate**: `const STRUCT_GATE=0.6; if (struct.score < STRUCT_GATE) reward *= struct.score;` (applied on BOTH golden + non-golden paths, after the weighted add). After fix: clean Hurco NC `reward=1.0`, empty/`G01 X1` `reward=0`. Did NOT weaken the failing test — fixed the reward design.

**What it closes** (vs the audit): P0#4 de-circularize ✅ · P1 "one scored CI reward harness" ✅ · P0#3 golden **PARTIAL ⚠** (consumes a golden fuzzily; a *strict byte-equivalence* gate + the verified **golden-NC archive** are still ABSENT). Spec updated in `POST-GEN-CLOSED-LOOP-TRAINING-READINESS-2026-05-29-echo.md` (readiness ~22%→~30%: measurement half unblocked, learning half still open).

**Wired:** galaxy `PATHS.md §Quality-gate + reward scripts` + KB `post-processor-knowledge-base.md §Quality gates`. Fine-tune target = `HurcoV11MillMasterPostEngine.generateProgram()` → wired `master_post_hurco_v11` (camDispatcher:6713). **Immediate next:** generate a real Hurco NC → score it → record the baseline reward; then build the golden archive + strict byte-equiv gate (closed-loop Phase 1). See [[reference_echo_post_gen_coverage_audit]].
