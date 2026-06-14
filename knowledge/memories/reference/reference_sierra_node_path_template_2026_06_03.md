---
name: reference_sierra_node_path_template_2026_06_03
description: Node→path template (resolveCodePath +type/+byCode/+repoPath/+opt-in line) wired into master-index + pre-bash exact-match banners + nav-savings telemetry for compounding nav token savings.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.939Z
aliases: reference_sierra_node_path_template_2026_06_03
---


# Node-path template + token-saving nav wiring (sierra, U-SV-NODE-PATH-TEMPLATE, 2026-06-03)

**What shipped (cad-fusion-live-ms0):** the consumer-side wiring that turns sierra's existing node→path resolver into a fleet-wide token saver. The work order ("plot nodes with higher efficiency via a template for paths to nodes + skills/hooks for compounding token savings") resolved to **EXTEND + WIRE**, not build-new (dedup caught `scripts/lib/code-path-resolver.mjs` already existed).

**Resolver EXTEND** (`scripts/lib/code-path-resolver.mjs`): added `type` (from index `category`), a `byCode` map (DSL shortcode `E0001`→path), an opt-in `{withLine}` declaration-line scan (off the hot path — one source read only for `/nav`), and **`repoPath`** (repo-root-relative = `_meta.root` + path). Still O(1), zero 548MB-graph parse, AMBIGUOUS→null (never a guessed path).

**Wiring (net-new):**
- `scripts/lib/nav-savings-ledger.mjs` — append-only `{kind:"hit", est_tokens:300}` ledger (the exact shape `psn-savings-aggregate.summarizeJsonl` counts). Fail-soft (never throws into a hook).
- `master-index-precheck-inject.mjs` + `pre-bash-graph-inject.mjs` exact-match banners now emit `→ Read <repoPath> (type)` and `recordNavHit()`. pre-bash's exact-match predicate extracted to a shared `exactMatchHit(keys,hits)` export so banner + ledger never drift.
- `stop-psn-savings-aggregate.mjs` SOURCES += `"nav"` → rolls into the SessionStart "PSN savings" headline (E2E proven: `byLedger.nav={hits:1,savedTokens:300}`).
- `/nav` skill (`.claude/commands/nav.md`).

**Scrutiny P1 (caught + fixed in-session):** the banners first emitted the bare index path `src/engines/X.ts`. From the repo-root cwd that opens an **untracked, git-ignored top-level `H:/prism/src/` duplicate** (different inode, divergence-prone) — or 404s on a clean tree. Fix: resolver emits `repoPath` (= `mcp-server/` + path), hooks gate on `np.repoPath`. Regression test asserts `fs.existsSync(repoRoot/repoPath)`. **Lesson (generalizable):** a node→path resolver must emit a path resolvable from the *consumer's* cwd, not the index's root; verify with an existence check, not just shape. See [[feedback_node_path_must_be_repo_root_relative]].

**Discovered hazard (not fixed here):** a stale untracked top-level `H:/prism/src/` tree shadows `mcp-server/src/` (0 tracked vs 9,837 tracked). Bare-`src/` reads from repo root hit it. Worth a golf/hygiene sweep.

47/47 tests. 2-of-2 resolver scrutiny PASS; wiring 2-of-2 = A PASS / B FAIL→fixed. Related: [[reference_sierra_ranked_hybrid_n1_2026_05_29]] · [[reference_master_index_surface]] · [[feedback_sierra_graph_correctness_is_fleet_search]].
