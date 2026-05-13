---
name: big-blob-hunt
title: Big Blob Hunt — Git History Blob Size Audit
description: Scan git history for blobs above a size threshold; emit a candidates table with filter-repo / lfs-migrate / gc recommendations. Feeds U-GC-02 (history rewrite) decision-making and the GIT-TREE-DECISIONS ledger blast-radius section.
type: skill
model: sonnet
effort: low
context: development
allowed-tools:
  - Bash
  - Read

# ── Auto-trigger frontmatter (forward-compat for Phase D orchestrator) ──
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "git size|repo bloat|lfs migrate|filter-repo|big blob|history rewrite|U-GC-02|.git directory"
    score: 0.85
    action: suggest

pipeline_integrations:
  - pipeline: rgs               # /rgs propose-phase
    phase: propose
    trigger: "before proposing a U-GC-02-class history-rewrite unit"
    action: invoke
  - pipeline: forge-audit       # /forge-audit, /forge-audit-v2
    phase: layer-3-size
    trigger: "audit of repo bloat / large-file accidents"
    action: invoke
  - pipeline: git-tree-decisions # CLAUDE.md doctrine for GIT-TREE-DECISIONS.md
    phase: blast-radius-population
    trigger: "before locking in U-GC-02 cleanup level (light gc / lfs migrate / filter-repo)"
    action: invoke

loop_contract:
  max_iterations: 5
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: converged          # converged = no blobs above threshold
  state_signal: blob_list
  rollback_on_runaway: false     # analysis only; no mutations
  done_signals:
    - '{"done": true, "verdict": "CLEAN"}'
    - '{"done": true, "verdict": "FOUND", "count": <N>, "total_mb": <M>}'

impact:
  upstream:
    - U-GC-02 prep doctrine (GIT-TREE-DECISIONS.md blast-radius section)
    - /rgs propose-phase
    - /forge-audit layer-3
    - operator manual invocation
  downstream:
    - state/shared/GIT-TREE-DECISIONS.md (blast-radius section appended)
    - state/shared/BIG-BLOB-CANDIDATES.json (machine-readable list for downstream tools)
    - informs: U-GC-02 cleanup-level decision (light gc / lfs migrate / filter-repo)
  bounded: true
  reversible: true  # analysis only; no file mutations
---

# /big-blob-hunt — Git History Blob Size Audit

> **Goal:** turn `git rev-list --objects --all | git cat-file --batch-check | sort -k3 -n -r` into a one-command operator-facing skill. Surface top-N blobs above a size threshold with one-line filter-repo / lfs-migrate / gc recommendations per blob.
>
> **Built for:** U-GC-02 (history rewrite) prep. The 2.9 GB Whisper model + 6 copies of system-graph.json snapshots in this repo were found via the raw `git rev-list` pipeline earlier in this session; this skill makes that lookup repeatable.

## When to use

- Before deciding the U-GC-02 cleanup level (light gc / lfs migrate / filter-repo) — need to know which blobs are the big wins
- After ingesting large data (`models/*.bin`, `state/shared/system-viz/*.json`) — verify nothing was accidentally committed
- During `/rgs propose-phase` when considering history-rewrite units
- During `/forge-audit` layer-3 (size audit)

## When NOT to use

- For BLOB-FREE inspection (just file sizes in working tree) — use `du -sh` or `git ls-files --large-files`
- For RUNNING the cleanup — this skill is read-only analysis; cleanup is U-GC-02 execution which needs operator approval per GIT-TREE-DECISIONS

## Usage

```
/big-blob-hunt                                  # default: top 20 blobs, threshold 10MB
/big-blob-hunt --threshold=<size>               # e.g. --threshold=50M (alternative units: K, M, G)
/big-blob-hunt --top=<N>                        # top-N blobs (default 20)
/big-blob-hunt --include-deleted                # include blobs no longer referenced (true history audit)
/big-blob-hunt --output-json                    # emit BIG-BLOB-CANDIDATES.json for downstream tools
/big-blob-hunt --append-decisions               # also append a blast-radius row to GIT-TREE-DECISIONS.md
```

## Protocol

### Step 0 — Resolve parameters
- Default threshold: 10 MB (`10485760` bytes)
- Default top-N: 20
- Validate `--threshold` parses as `<integer><K|M|G>?`; reject invalid

### Step 1 — Enumerate blobs
```bash
git -C H:/prism rev-list --objects --all 2>&1 \
  | git -C H:/prism cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' 2>&1 \
  | grep '^blob' \
  | awk -v T=<threshold-bytes> '$3 >= T { print }' \
  | sort -k3 -n -r \
  | head -<N>
```

Each row: `blob <sha> <size> <path>`.

### Step 2 — Compute size totals + dedupe by path
Some blobs are the SAME file at different commits (e.g. `state/shared/system-viz/system-graph.json` has 6+ historical versions, each a distinct SHA). Group by path; surface both the largest individual blob AND the total bytes across versions for that path.

### Step 3 — Classify each blob
- **MODEL_BINARY** (`models/*.bin`, `*.gguf`, `*.safetensors`) → recommendation: `lfs-migrate` (or `gitignore + delete`)
- **AUTO_GEN_STATE** (`state/shared/system-viz/*.json`, large `_embeddings.jsonl`) → recommendation: `gitignore + commit-once-via-cron`
- **LEGACY_DUMP** (extracted monolith / archived corpus) → recommendation: `filter-repo --strip-blobs-bigger-than`
- **TEST_FIXTURE** (`tests/fixtures/*`, large) → recommendation: `lfs-migrate`
- **OTHER** (unclassified) → recommendation: review manually

### Step 4 — Surface results table
```
┌─ /big-blob-hunt ──────────────────────────────────────
│ Threshold: <N> MB    Top: <K>
│ Total blobs above threshold: <count>
│ Total size: <X> MiB
├──────────────────────────────────────────────────────
│ Rank | Size      | Path                          | Versions | Class       | Recommendation
│   1  | 2,951 MB  | models/ggml-large-v3.bin      | 1        | MODEL       | lfs-migrate OR gitignore+delete
│   2  |   174 MB  | state/shared/system-viz/system-graph.json | 6 | AUTO_GEN | gitignore + commit-once-via-cron
│ ...
└──────────────────────────────────────────────────────
```

### Step 5 — Persist results (if --output-json)
Write `state/shared/BIG-BLOB-CANDIDATES.json`:
```json
{
  "timestamp": "<ISO>",
  "threshold_bytes": <N>,
  "blobs": [
    { "rank": 1, "size_bytes": <S>, "path": "<p>", "versions": <V>, "class": "<C>", "recommendation": "<R>" },
    ...
  ],
  "total_size_bytes": <T>
}
```

### Step 6 — Append to GIT-TREE-DECISIONS (if --append-decisions)
Append a timestamped row to the "Blast-Radius Snapshot" section in `state/shared/GIT-TREE-DECISIONS.md` summarizing:
- Threshold used
- Number of blobs above
- Total size
- Top-3 paths with recommendations

### Step 7 — Emit terminal verdict JSON
- If 0 blobs above threshold → `{"done": true, "verdict": "CLEAN"}`
- Else → `{"done": true, "verdict": "FOUND", "count": <N>, "total_mb": <M>}`

## Implementation notes

- **Performance:** `git rev-list --objects --all` walks every commit's tree; for the 41 GiB PRISM repo this takes ~30-60s. Acceptable for a manual audit; not appropriate for a per-prompt hook.
- **`--include-deleted`:** without this, the rev-list only sees blobs reachable from current refs. Deleted-then-committed-over files won't surface. Add `--all` keeps everything from the reflog; `--include-deleted` enables a richer scan via `git fsck --unreachable`.
- **Multi-chat safety:** read-only; safe to run concurrently. The JSON output write is atomic (single overwrite).
- **No mutations:** this skill ANALYZES. It never runs `git filter-repo`, `git lfs migrate`, or `git gc`. Those are U-GC-02 execution units that require operator approval per the GIT-TREE-DECISIONS doctrine.

## What this skill does NOT do

- Does NOT execute the cleanup (that's U-GC-02 execution)
- Does NOT touch the working tree or git index
- Does NOT modify `.gitignore` (it may RECOMMEND additions; operator applies)
- Does NOT estimate the actual disk reclaim of each cleanup option — that's GIT-TREE-DECISIONS §U-GC-02 "Size win estimate" job, populated separately

## Examples

### Example 1 — default scan (top 20, threshold 10MB)
```
/big-blob-hunt
```
Shows the ~10-15 candidates in this repo (Whisper models + system-viz snapshots).

### Example 2 — aggressive scan with JSON output
```
/big-blob-hunt --threshold=5M --top=50 --output-json
```
Writes machine-readable BIG-BLOB-CANDIDATES.json for downstream filter-repo tooling.

### Example 3 — feed GIT-TREE-DECISIONS
```
/big-blob-hunt --threshold=50M --append-decisions
```
Surfaces only the giants AND appends to the decision ledger. Use before locking in U-GC-02 cleanup level.

## See also

- `state/shared/GIT-TREE-DECISIONS.md` — U-GC-02 decision ledger (this skill feeds the blast-radius section)
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` Phase A.4 — this skill's milestone
- HS-06 session-end snapshot: 41 GiB .git on disk; 2.9 GB Whisper model + 6× system-graph snapshots ≈ 700 MB are the dominant offenders
- `git rev-list` man page — the underlying primitive
- `git filter-repo` — the heavy cleanup tool (NOT invoked by this skill)
- `git lfs migrate import` — the lighter alternative (NOT invoked by this skill)
