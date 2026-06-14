---
name: reference_alpha_forge_punchlist_2026_06_04
description: "Verified, ROI-ranked punch list (Workflow w00l0f5c0) of git-conflict + Ollama-token-savings + efficiency improvements across Obsidian/system-viz/galaxies — with lanes. Alpha did discovery; main-tree edits route to golf."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.014Z
aliases: reference_alpha_forge_punchlist_2026_06_04
---


# Alpha forge-find-improve punch list — 2026-06-04 (Workflow w00l0f5c0, 11 agents, adversarially verified)

Discovery sweep for the operator goal: *high-ROI token savings + ZERO git-commit conflicts + no inefficiencies in Obsidian app / system-viz / PSN; the local 32b (qwen2.5-coder:32b on the 96GB RTX PRO 6000 Blackwell) does heavy token-work, Claude reviews.* 5 forge-audit lenses → adversarial Claude verify → ranked. Full output: `C:/Users/wompu/AppData/Local/Temp/claude/H--prism/cda13f4a-ff3e-4b44-886c-371d73fc4c17/tasks/w00l0f5c0.output`.

## Shipped this session (alpha, before the slot/alpha worktree-pin armed the main-tree edit-block)
- `e2cdbe2e86` U-BW-BEST-TIER-REACH — cost-router reaches the 32b `best` tier on Blackwell for `search_synthesis` offload.
- `606424dc12` U-FGC-4+5 — `sweepStaleIndexLock` self-heals a dead orphaned `.git/index.lock` (the 303s freeze) in the mutex + a PreToolUse:Bash hook (`git-index-lock-sweep.mjs`) JIT-clears it before any index-touching git cmd.
- `ae2fbfdff8` U-BW-SYNTH-MODEL-RESOLVE — `scripts/lib/host-aware-synthesis-model.mjs` resolver (synthesis scripts → 32b on Blackwell).

## Ranked punch list (verified KEEP only)
1. **obsidian-memory-sync content-skip** (efficiency, alpha-domain) — SHA-256 no-op-write skip (minus the `synced:` line) before every vault write in `scripts/obsidian-memory-sync.mjs:342,361,474,532`; reuse the hash idiom from `.claude/hooks/h-to-c-obsidian-mirror.mjs:41,110`. Kills full-rewrite churn of ~641 memos×galaxy-copies every 3-min×26 chats. MUST exclude the `synced:` line or it never skips.
2. **EOL→LF before vault writes** (git-conflict) — `obsidian-memory-sync.mjs` + `memory-mirror-to-vault.mjs:425`. 44 EOL-only dirtied files. Self-heals once #1 lands; ship paired.
3. **Root `.gitattributes`** (git-conflict) — `* text=auto eol=lf` + explicit source-ext `eol=lf` + binaries `binary`. None tracked today; `core.autocrlf=false`. Fleet-wide instant. Do NOT bundle `git add --renormalize .` (→ golf, separate commit).
4. **merge-augmentations Set-hoist** (efficiency, alpha+coordinate **sierra**) — `scripts/merge-augmentations.mjs`: 60 node-Sets + 70 edge-Sets → 2 incremental Sets. The unaddressed remainder of the 24GB-heap OOM. sierra owns the system-viz hot-path — check `file-claim-guard`/chat-bus first.
5. **`U-BW-SYNTH-CONSUMERS`: wire `resolveSynthesisModel` into 5 model-hardcoded scripts** (token-savings — the 11%→30% offload gap) — `galaxy-synthesis-refresh.mjs:64,207,261`, `galaxy-reflection-synthesis.mjs:53,…`, `galaxy-meta-synthesis.mjs:31,…`, `ask-ollama.mjs:61,121,543`, `summarize-all-scripts-via-ollama.mjs:45,46`. CAVEAT: detect explicit `--model` from RAW `process.argv` (parseArgs bakes the default in); raise `ask-ollama`/`summarize` 8s timeout (32b cold-load >8s = silent regression). Cron `WeeklySynthesisEngine.ts`/connection-finder resolve model in the `.ts` (bravo-adjacent — file-claim-guard first). Build AFTER standalone scripts prove the pattern.
6. **system-viz-obsidian-bridge-v2 I/O halve** (efficiency) — `scripts/system-viz-obsidian-bridge-v2.mjs:153,193,238,275-279`: single walk+read pass, thread content into countBacklinks. `--full`-gated, not a fleet hot path.
7. **Dedup the 2 T2 memory injectors** (token-savings) — retire `memory-rag-inject.mjs:95-135` cmd.exe+tsx subprocess; call shared `memory-index-search-lib.mjs` from `memory-index-precheck-inject.mjs`.
8. **multi-provider-router reason-string align** (efficiency, bundle with #5) — `scripts/lib/multi-provider-router.mjs:214` inlines "qwen2.5-coder:7b"; threads no `hardware` arg. Doc-vs-reality drift.

## GOLF-lane (main-tree integrator — high value)
- **`git rm --cached` the ~575MB tracked `system-graph.json` + 3 force-added augmentation JSONs** (`.gitignore:128` already ignores; only the `git add -f` from `370b33e1df` keeps it tracked). Single largest cross-chat conflict + unbounded-`.git`-growth surface. ALSO strip any `git add -f` re-force from the regen/commit path.
- **`git add --renormalize .`** follow-up to Rank 3 (deliberate quiet-window commit).
- **post-commit regen entry-debounce** (`PRISM_VIZ_REGEN_DEBOUNCE_S` before `pidFileGuard` in `system-viz-on-commit.mjs`).
- **`[BOOTSTRAP-SLOT-ENFORCE]` marker-bypass tighten** (`slot-commit-worktree-enforce.mjs:179`) — gate on `BOOTSTRAP_MODE.flag active:true` + `slot-enforce-bypasses.jsonl` audit; MUST ship with `PRISM_SLOT_ENFORCE_BYPASS_LEGACY=1` kill switch + fail-OPEN on flag-read error.

## Lane constraint (R7/R12 — surfaced, not hidden)
alpha is hard worktree-pinned to `slot/alpha` (`tw-wt-…` terminal pin); that worktree is **77/2399 diverged** (abandoned migration) so it can't host resolver-dependent work, and `main-tree-write-block` correctly bars alpha from editing the shared tree. The mutex (U-FGC-1 + U-FGC-4) already delivers conflict-free shared-tree commits (`attempts:1` on all 4 commits this session) — the "serialize" arm of FLEET-GIT-CONTENTION-MS0. The ranked items above are therefore **routed to golf** (main-tree integrator) for execution; alpha owns the verified spec. See [[feedback_golf_owns_reaper]] (golf = integrator/hygiene) and FLEET-GIT-CONTENTION-MS0 (U-FGC-2/U-FGC-3 golf-lane).
