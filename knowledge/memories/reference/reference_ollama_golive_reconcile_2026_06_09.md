---
name: reference_ollama_golive_reconcile_2026_06_09
description: "GO-LIVE of slot/bravo OLLAMA-AUTORUN-BUILD revealed the active branch cad-fusion-live-ms0 had concurrently fixed the same files (U1/U2 superseded) — verify slot commits against the TARGET branch, never pristine main."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.677Z
aliases: reference_ollama_golive_reconcile_2026_06_09
---


# Ollama go-live reconciliation finding (slot:bravo, 2026-06-09)

Operator greenlit go-live (#14) of the 6 OLLAMA-AUTORUN-BUILD commits on slot/bravo. Pre-merge verification against the REAL target branch (`cad-fusion-live-ms0`, the fleet's active "main"; pristine `main` is disjoint from everything) revealed the slot commits were built on a ~2783-behind base and the active branch concurrently evolved the same files.

## Topology (verified)
- `main` (pristine) is DISJOINT from both `cad-fusion-live-ms0` and `slot/bravo` (no merge-base). "merge to main" = land on `cad-fusion-live-ms0`.
- `cad-fusion-live-ms0` <-> `slot/bravo` share base `d6fe412399` (slot branched from it) -> normal cherry-pick mechanics, NOT disjoint.
- An earlier ultracode plan checked against pristine `main` and concluded "10/11 files net-new, safe cherry-pick" -- WRONG branch. Against the real target, 3 of 6 commits conflict.

## Per-commit go-live status (vs cad-fusion-live-ms0)
- U9 ollama-coresidency.mjs (7771ca7f86) -- NET-NEW, novel -> SAFE to land.
- U4 ollama-compress-output.mjs (612418fde7) -- NET-NEW, novel -> SAFE.
- U6 ollama-codegen.mjs (a59f35221e, create) + U-OAB-120B (3904b5e7b0, 120b default) -- file NET-NEW -> SAFE 2-commit chain (U6 then U-OAB-120B). This is the operator's "120b default coding model" ask; needs PRISM_CODEGEN_MODEL=gpt-oss:120b in settings.json for the settings-wide activation.
- U1 OllamaTaskOffloaderEngine roster (2340a2e699) -- SUPERSEDED. The branch engine ALREADY has gpt-oss:120b+20b in OLLAMA_MODELS (it still carries retired codellama:7b/deepseek-coder:6.7b that U1 dropped + lacks U1's tier field). Cherry-pick CONFLICTS + would revert the branch's roster. Port only the delta (drop the 2 retired entries) by hand if worth it.
- U2 ollama-route-pretooluse default (a2756779c2) -- SUPERSEDED. Branch route hook already defaults to resident `qwen2.5-coder:32b` (line ~427); U2 set it to gpt-oss:20b. The absent-default bug is ALREADY FIXED on the branch (differently). R7: operator picks qwen-32b (branch, stronger summarizer) vs gpt-oss:20b (U2, faster) -- do NOT clobber.
- U3 route-savings take-rate (a60d7ba0bf) -- branch version diverged; verify whether the offload-subset honesty fix exists on the branch before porting.

## LESSON (reusable)
A long-lived slot worktree (2783 commits behind) accumulates "fixes" for problems the ACTIVE branch may have already solved differently. ALWAYS verify slot commits against the TARGET branch (`cad-fusion-live-ms0`), not pristine `main`, BEFORE go-live. Cherry-pick only genuinely net-new/novel units; for files the active branch co-evolved, RECONCILE the intent by hand (or accept supersession) -- never blind-cherry-pick (it reverts concurrent fleet work). [[reference_bravo_verify_against_main_not_worktree_2026_05_29]] is the sibling lesson (verify against canonical, not stale worktree).

## Safe go-live path (for a fresh integration pass / golf integrator)
Land ONLY U9 + U4 + (U6 -> U-OAB-120B) onto cad-fusion-live-ms0 (clean cherry-picks, net-new files); add PRISM_CODEGEN_MODEL=gpt-oss:120b to C:/Users/wompu/.claude/settings.json env (settings-wide 120b coding default). Reconcile U1/U2/U3 deliberately against the branch's concurrent versions (or mark superseded).

## GO-LIVE EXECUTED 2026-06-09 (slot:bravo, operator greenlit "do 3")
DONE. Merge commit `5a91ba1862` on cad-fusion-live-ms0 (--no-ff of golive/ollama-autorun, a throwaway worktree off the live HEAD). diff-stat vs first parent = EXACTLY the 6 net-new files / 726+ / 0- (nothing clobbered); 36/36 node:test green; U1/U2/U3 EXCLUDED (superseded, confirmed). First merge attempt returned exit-4 (transient index.lock collision with a concurrent india peer commit) -- a clean refusal, no MERGE_HEAD; immediate retry = EXIT 0. Worktree + golive branch removed after (R14). `PRISM_CODEGEN_MODEL=gpt-oss:120b` added to C:/settings.json env (line ~11, mirrored to H:; both parse-valid) -> 120b is now the settings-wide default coding-offload model. RACE LESSON: a 3-way merge of disjoint net-new files is far more contention-robust than rebase+ff on an actively-advancing shared branch (cad advanced 835df->2c766->17f3e->ef39d in ~15 min) -- only the sub-second index.lock matters, and a single retry clears it.

## U5 RTK config.toml DONE 2026-06-09 (the "upgrade RTK with the hardware leap")
RTK v0.40.0 DOES read a config.toml ([limits] section verified live via `rtk config`, default path C:/Users/wompu/AppData/Roaming/rtk/config.toml). Created via `rtk config --create` (canonical schema, no hand-author drift) + backed up to config.toml.default-bak; tightened [limits]: grep_max_results 200->80, grep_max_per_file 25->10, status_max_files 15->12, status_max_untracked 10->8, passthrough_max_chars 2000->1200 (NOT 800 -- preserve command tails; tee mode="failures" + the U4 LLM compressor + Ollama re-read are the backstops for any over-trim). VALIDATED: `rtk config` echoes the tightened values + a live `rtk grep "export " mcp-server/src` capped at 80 with "[+44726 more]". Outside .claude (AppData) so NOT c-to-h-mirrored, but it IS the live path RTK reads. RTK can't be LLM-upgraded internally (heuristic Rust binary, no LLM mode through dev-0.43.0-rc) -- the U4 compressor is the LLM companion, U5 is the hardware-leap-enabled tightening.

## Kimi K2.6 cloud -- VERDICT: do NOT wire (current-verified 2026-06-09)
Operator asked twice "look into utilizing cloud Kimi K2.6 for free." Current state: K2.6 API $0.95/$4.00 per M, NO permanent free PRODUCTION tier; FREE routes exist (OpenRouter `moonshotai/kimi-k2.6:free` $0, NVIDIA NIM free -- PRISM already has NIM_URL wired, self-host open weights). BUT data residency = SINGAPORE (MOONSHOT AI PTE LTD); the API help-center says API I/O "not used to train" while the OpenPlatform ToS says Moonshot MAY use "content" to "develop and improve services" -- a documented conflict; independent analysis says get a written DPA before sensitive data. Free tiers (OpenRouter/NIM) typically have WORSE data terms than paid. => FAILS PRISM data-sovereignty + the safety-output-never-to-non-Claude boundary. RECOMMENDATION: NOT worth wiring -- the resident gpt-oss:120b is a strong, free, fully-private in-house model that makes a Singapore-hosted cloud voice low-marginal-value + high-risk. The ONLY acceptable channel would be a redaction-gated (`scripts/lib/redact-secrets.mjs`), NON-safety octopus consensus voice -- and even there, local models are the better default.

## REMAINING system-upgrade targets (task #11, NOT loop-tick-safe -- need deliberate builds)
The RTK sweep (the goal's named deliverable) is COMPLETE. Remaining "upgrade existing systems for the 96GB box" targets each need care + an Ollama-SERVER restart (affects ~17 live peers -- coordinate, don't rush in a /loop tick): (1) apply U9 RECOMMENDED_ENV (OLLAMA_MAX_LOADED_MODELS=3, NUM_PARALLEL=1, KV q8_0, FLASH_ATTENTION=1, KEEP_ALIVE=30m) to the Ollama SERVER launch env -- NOT Claude's settings.json (those are server-side vars; a client-env edit is a silent no-op, R12 trap); (2) octopus/MultiModelConsensus -> 3 strong diverse resident voices (bigger deliberate build). VLM/OCR ensemble already shipped by xray (vision-ensemble-fuse.mjs). NOTE (verified 2026-06-09): the scrutiny-3way Ollama advisory arm is ALREADY on a resident model -- `PREFLIGHT_MODEL ?? "qwen2.5-coder:32b"` (.claude/scripts/scrutiny-3way.mjs:151); a peer already migrated it off retired deepseek-r1:14b. Only stale deepseek-r1 COMMENTS remain (lines 152, 509) -- cosmetic doc-drift owned by the alpha/papa/india/xray model-ref fleet campaign per state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md (explicitly "NOT bulk-executed in a single context"), NOT bravo's lane. The model-ref cleanup is a per-owning-slot campaign, not a solo bravo unit.
