# GOLF NIGHT WORKLOAD — compiled into alpha's loop (2026-06-01)

**Operator directive:** "golf is on reaper duty for the night, so compile his workload into your workload for the night." Golf keeps the **fleet-reaper** (auto, scheduled task — runs without a chat). Everything else below is alpha's for the night, worked through the `/loop`.

**Compiled by:** slot alpha (claude-da9aacf5). **Source:** `state/shared/dashboards/patches/*.md` (48 files, ~40 PENDING) + golf-lane hygiene.

## ⚠ Execution rules (load-bearing)
- **R8 — re-validate each patch's target before applying.** Most CLAUDE-MD/MEMORY-MD patches are **12–16 days old**; the target sections have almost certainly drifted or been superseded. Read the live target first; if the patch is already effectively applied or obsolete → mark the patch `SUPERSEDED` and skip (do NOT blind-apply).
- **Apply mechanism:** harness-exec targets (`.claude/hooks/*.mjs`, `settings.json`) are cross-worktree-blocked from a slot worktree → use the operator-authorized raw-FS node writer (or run from a main-tree chat). DOC/coordination targets (CLAUDE.md, MEMORY.md, `state/shared/**`) were relaxed to **advisory** on 2026-05-31 → a slot can Edit them directly.
- **Per-file scrutiny + verify before commit** (these are fleet-wide files). Commit each with `[BOOTSTRAP-SLOT-ENFORCE]`.
- **Context-wall note:** this session is at ctx ~64% with `/compact` rate-limited. The bulk of this queue is for FRESH post-wall loop iterations — this file IS the durable work-queue so any chat (this loop's next tick or a new chat) can pick up where the last left off.

## PRIORITY 1 — alpha-lane + tonight's-goal-aligned (memory/recall/token-savings)
These ARE alpha's domain and serve the goal (memories/wiki/tribal injection + token savings + context retention). Do these first.
- [x] `OBSIDIAN-RECALL-A3-PATCH-2026-05-29.md` (74h) — ✅ ALREADY-DONE (triage): A3 code live in build-memory-index-sidecar.mjs; doc-anchor churned out.
- [x] `OBSIDIAN-RECALL-A6-PATCH-2026-05-29.md` (79h) — ✅ ALREADY-DONE: A6 hybrid recall live in memory-index-search-lib.mjs + wiki/memory; CLAUDE.md section deferred.
- [x] `OBSIDIAN-RECALL-B1-PATCH-2026-05-29.md` (73h) — ✅ ALREADY-DONE: galaxy-reflection-synthesis.mjs live; doc-anchor churned out.
- [x] `OBSIDIAN-RECALL-L2-PATCH-2026-05-29.md` (71h) — ⚠ BLOCKED (R12): patch claims galaxy-meta-synthesis 'landed' but it does NOT exist live; verify before any doc-reflect.
- [x] `OBSIDIAN-RECALL-AMP2-PATCH-2026-05-29.md` (70h) — ✅ ALREADY-DONE: galaxy-synthesis-refresh.mjs live + wiki/memory; doc deferred.
- [~] `MEMORY-MD-PATCH-WPC.md` ✅ ALREADY-DONE (path-ledger live) + `CLAUDE-MD-PATCH-WPC.md` ⏸ DEFERRED (APPLICABLE ≤12-line pointer, but peer-locked 494-line CLAUDE.md → main-tree pass) (44h)

## PRIORITY 2 — GCF harness patches (federation milestone, fresh, harness-exec → bypass-apply)
- [x] `AWARENESS-INJECT-PATCH-U-GCF-AWARENESS.md` (9h) — ✅ CLOSED 2026-06-02: part(1) federation→compact() summary commit `fa86095251`; part(2) 663MB-graph RangeError already fixed by U-GCF-AWARENESS-FAILSOFT 2026-06-01.
- [x] `HOOK-PATCH-GCF-RECALL-FIRST.md` (13h) — ✅ DONE commit `f5d1bda116` (recall-first-advisory.mjs wired into C:+H: settings.json under Read matcher, JSON-verified; master MEMORY.md saves ~5183 tok/read)
- [x] `HOOK-PATCH-GCF-XGALAXY-INJECT.md` (27h) — ✅ WIRE DONE commit `0cb6a94b2c` (selective cross-galaxy card inject into slot-context-bundle-inject; warm top-K per-prompt, similarity-gated, self-excluded, ceremony-prompt silent). Adapted to drifted hook structure + dynamic-import (R8/R7). CLAUDE.md+MEMORY.md doc-reflection pending peer-locked owner apply.
- [x] `HOOK-PATCH-GCF-CAG-REGEN-WIRE.md` (31h) — ✅ Option A DONE commit `355198a474` (SessionStart regen of galaxy-cards bundle before CAG cold-anchor; detached+throttled+fail-soft). gitignore-untrack DEFERRED — R7 conflict with committed `MASTER-DIGEST.md` (surfaced in patch).
- [x] `CLAUDE-MD-PATCH-U-GCF-CARD.md` (32h) — ⏹ SUPERSEDED (triage wq31b7vsz): MS0 advanced past this snapshot; doctrine already in live MEMORY.md feed-up + wiki; do not bloat size-capped CLAUDE.md.
- [x] `HOOK-PATCH-MCP-AUTORECONNECT.md` (29h) — MCP resilience — ✅ Option A WIRE DONE commit `05d920ec3b` (per-turn auto-reconnect wired into mcp-connectivity-check DOWN branch; single-flight O_EXCL across fleet, detached, fail-soft; enforces operator rule "disconnected slots auto-connect each turn"). lib 30/30. CLAUDE.md+MEMORY.md+.mcp-reconnect.lock-gitignore doc-reflection pending peer-locked owner.
- [x] `HOOK-PATCH-PATH-REPLAY-ADVISE.md` (34h) — ✅ WIRED 2026-06-02 commit `378af022e9` (hook placed + UserPromptSubmit C:+H:; token-savings path-replay advisory).

## PRIORITY 3 — CLAUDE.md / MEMORY.md doc patches (advisory-writable; HEAVY re-validate, many likely stale)
~20 `CLAUDE-MD-PATCH-*` (ages 57h–382h) + `MEMORY-MD/INDEX-PATCH-*`. Batch by re-validating each against the live CLAUDE.md/MEMORY.md section. Likely-stale (12–16d): the `-2026-05-17/18/19/20` dated ones, `JULIETT-12CHAT-ALLOCATION` (3), `token-*-audit`, `turning-cascade-bug`, `U-CK15`, `U-CAMP14`, etc. Mark SUPERSEDED if already reflected; apply only genuinely-missing deltas. **Watch MEMORY.md's 24576-byte truncation ceiling** — these patches add lines; if MEMORY.md is near-cap, route detail to a memory file + keep only a ≤140-char index pointer (per the size-discipline doctrine).

## PRIORITY 4 — domain/config patches (other-galaxy; lower priority for alpha)
- [ ] `HYPERMILL-AC-SERVER-CONFIG-LOCALHOST-PIN.md` + `HYPERMILL-AC-SCRIPT-EXECUTOR-MOCK-BRANCHES.md` (309h) — hypermill/CAM config; likely echo/kilo lane + very stale.
- [x] `GALAXY-SYNTH-CLAIM…` ✅ ALREADY-DONE (self-gated section never created) · `BRAIN-REFRESH-MS0…` ✅ Stop-hook DONE commit `e38201b4b8` (CLAUDE.md §3 deferred) · `SLOT-CONTEXT-BUNDLE-SYNTHESIS-LINE…` ✅ APPLIED commit `c47c49a050` (57–69h).

## Golf-hygiene (auto — NO chat action needed tonight)
Fleet-reaper (golf keeps), fleet-memory-monitor, cleanup-orchestrator, hook-janitor, memory-pressure-relief, zombie-reaper, synergy-regression-watch — all **Windows scheduled tasks**, fire without a chat. The `fleet-task-health-watch` Stop hook audits them on the fleet's Stop stream. Nothing to do unless a task is wedged/disabled (check `node scripts/fleet-task-health-watch.mjs` if a crash is suspected).

## Done this compile-session
- Applied/closed already: `HOOK-PATCH-TRIBAL-DOMAIN-MAP-EXPAND` (RESOLVED via U-TRIBAL-SLOT-DOMAIN-WIRE), `HOOK-PATCH-GCF-VIZ-ROOST-WIRE` (DONE). Shipped `U-WIKI-SLOT-DOMAIN-BOOST`.
- **2026-06-02:** `HOOK-PATCH-GCF-RECALL-FIRST` ✅ DONE (P2) — commit `f5d1bda116`. recall-first-advisory.mjs (PreToolUse:Read) wired into BOTH C: and H: settings.json under the Read matcher via a JSON-parse-gated raw-FS splice writer (backup at settings.json.bak-recall-first). Verified: large brain/memory files (master MEMORY.md 21931B) nudge "recall-instead-of-reread" (~5183 tok/read saved); small galaxy brains (<4096B) correctly silent; wiki paths defer to the wiki hooks. Lib recall-first.mjs 21/21 tests green.

_Worked via the `/loop`; each completed patch → check the box + commit + note here. This file is the night's source of truth for golf's compiled workload._

## Triage pass 2026-06-02 (workflow `wq31b7vsz` — 44 patch-siblings R8-revalidated in parallel)
Shipped this iter (slot:alpha): **AWARENESS** federation→summary (`fa86095251`) · **AMP-CONSUME** synthesis-line (`c47c49a050`) · **PATH-REPLAY** hook+wire (`378af022e9`). Plus earlier: recall-first, cag-regen, xgalaxy, mcp-reconnect.
Closed as ALREADY-DONE/SUPERSEDED (triage): GCF-VIZ-ROOST-WIRE, CLAUDE-MD-PATCH-U-GCF-CARD, MEMORY-MD-PATCH-WPC, GALAXY-SYNTH-CLAIM, OBSIDIAN-RECALL-B1, OBSIDIAN-RECALL-A3, TRIBAL-DOMAIN-MAP-EXPAND.
DEFER/BLOCKED: OBSIDIAN-RECALL-L2 (R12 — patch claims unshipped galaxy-meta-synthesis 'landed'; verify before any doc-reflect).
⚠ ~31 of 44 triage agents hit a transient API rate-limit mid-fan-out (cached the error string); the remaining patches (CLAUDE-MD-PATCH-WPC + ~28 mostly 300h+ stale CLAUDE-MD/MEMORY-MD doc-patches + 2 HYPERMILL config) need a re-triage pass next tick (API-recovered). CLAUDE-MD-PATCH-WPC verdict was APPLICABLE (≤12-line `## WORKING-PATH-CAPTURE` pointer) but deferred (peer-locked CLAUDE.md; med-risk).

## Triage pass 2026-06-02 (iter 2 — 3 fresh memory/recall patches)
**BRAIN-REFRESH-MS0** Stop-hook ✅ WIRED (`e38201b4b8`) — auto-fires the 5 refresh pipelines on Stop. **AMP2 + A6** closed ALREADY-DONE (code live in wiki/memory; CLAUDE.md `## OBSIDIAN-BRAIN RECALL` doc-reflections deferred to a main-tree hygiene pass — adding ~40 lines to the 494-line peer-locked doc is net-negative for its own size-discipline). Remaining unverified: ~29 mostly-300h+ stale CLAUDE-MD/MEMORY-MD doc-patches + 2 HYPERMILL (echo/kilo) + CLAUDE-MD-PATCH-WPC (deferred). All durably queued.
