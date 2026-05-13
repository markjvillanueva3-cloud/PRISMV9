---
name: close-out-audit
description: Audit roadmap envelopes for units whose deliverables exist on disk but whose status is still "pending" (silent close-out debt). Advisory only — every candidate must be human-verified.
trigger:
  autoSuggest:
    keywords: ["close out", "close-out", "closeout", "envelope drift", "shipped but pending", "audit close", "find shipped", "stale milestones", "unclosed units", "what's done"]
---

# /close-out-audit — Find silent close-out debt across all roadmaps

When a unit's deliverable artifacts exist on disk but the envelope still says `status: "pending"`, the milestone is **shipped but not closed**. This pollutes `MILESTONE_PROGRESS`, `BUILD_STATE`, and the roadmap-index. The audit script flags candidates so you can review + close them properly.

## Usage

```bash
# Scan all 670 envelopes, write reports
node H:/prism/scripts/audit-close-out-candidates.mjs

# Single milestone
node H:/prism/scripts/audit-close-out-candidates.mjs --milestone COORD-MS0

# Higher confidence floor (default 0.75)
node H:/prism/scripts/audit-close-out-candidates.mjs --min-confidence 0.9

# JSON-only to stdout (no file write)
node H:/prism/scripts/audit-close-out-candidates.mjs --json

# Deterministic timestamp (CI-friendly)
node H:/prism/scripts/audit-close-out-candidates.mjs --frozen-time 2026-01-01T00:00:00Z
# or: PRISM_AUDIT_FROZEN_TIME=2026-01-01T00:00:00Z
```

## Outputs

- `state/shared/CLOSE-OUT-CANDIDATES.json` — machine-readable, includes `advisoryOnly: true` + `caveat` fields
- `state/shared/CLOSE-OUT-CANDIDATES.md` — human-readable with per-unit evidence

## Confidence scoring

For each unit in `status: "pending"` (or `"in_progress"`, `"deferred"`, etc):

- Parse `deliverables[]` for path tokens (absolute, relative, bare filename)
- Resolve each token against the filesystem (~25 PRISM search roots, bounded recursive walk depth 2)
- Score = `resolvedCredit / verifiable` where:
  - **resolved** (file exists, no abstract residual) = +1.0 credit
  - **hybrid** (file exists BUT deliverable string also carries abstract intent like "and add tests") = +0.5 credit
  - **abstract** (no parseable path, deliverable is conceptual) = excluded from verifiable count
  - **missing** (parseable path doesn't resolve) = +0 credit
- Default surface threshold: **0.75** (raise to 0.9 for safer auto-close suggestions)

## Close-out protocol (per surfaced candidate)

1. **Read the actual file** — confirm the artifact matches the spec intent. File presence ≠ correctness.
2. **Edit envelope** — `mcp-server/data/milestones/<MS-ID>.json` — set unit `status: "complete"`, add `completed_at` (ISO), `completed_by` (your chat-id), and `ship_notes` listing the verification evidence
3. **Regen surfaces:**
   ```bash
   node H:/prism/scripts/build-milestone-progress.mjs
   node H:/prism/scripts/build-state-snapshot.mjs
   ```
4. **Chat-bus + commit:**
   ```bash
   node H:/prism/.claude/helpers/agent-coordination.mjs post --agent Claude --message "[<SLOT>] Closing <MS>/U-XXX — <reason>"
   git add <changed-files>
   git commit -m "[<MS>]/<U-XXX>: close out <title>"
   ```
5. **Scrutiny:** `node H:/prism/.claude/scripts/scrutiny-3way.mjs` (codex + 2 Claude reviewers)

## Why advisory-only?

False close-outs corrupt downstream:
- `MILESTONE_PROGRESS.json` recounts "shipped" units → falsely high
- `BUILD_STATE.json` recomputes built-vs-pending → tracks dead work as live
- `roadmap-index.json` flips to "complete" → blocks legitimate re-work

The audit can detect file presence but cannot verify the file **satisfies the spec** — a path that resolves doesn't mean the code does what the deliverable says. Always read the artifact end-to-end before flipping status.

## See also

- Memory: `feedback_auto_close_out.md` (the standing rule)
- Wiki: `knowledge/wiki/architecture/close-out-audit.md`
- Doctrine: `H:/prism/CLAUDE.md` §CLOSE-OUT AUTOMATION
- Companion: `/close-out` (one-milestone surface refresh after manual close-out)
- Companion: `/envelope-sync` (proposes status-flip patches for milestones you own)
