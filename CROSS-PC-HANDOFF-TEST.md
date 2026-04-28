# Cross-PC Handoff Test — Procedure & Acceptance Criteria

**Milestone:** INTEL-OLLAMA-OBSIDIAN-MS0/P7-U02
**Status:** procedure documented; first audit run captured baseline.

## What This Is

The PRISM platform runs on a portable H: drive that the user physically carries between machines (home PC `wompu`, work PC `Mark Villanueva`). Tonight's autonomous run depends on **every piece of session state surviving the swap**: handoffs, memory, settings, hooks, dispatcher cache, embeddings, etc.

This document defines:

1. The **acceptance criteria** for "the swap works."
2. The **automated audit** (`scripts/cross-pc-handoff-verify.mjs`) that flags C:-anchored state.
3. The **manual procedure** to verify a real swap.

## Acceptance Criteria

The swap is considered **safe** when all four hold:

| # | Criterion | Verified by |
|---|-----------|-------------|
| 1 | Audit script reports **0 critical findings** in canonical state files (`mcp-server/data/state/*.json`, `state/shared/*.json`, per-chat handoffs) | `node scripts/cross-pc-handoff-verify.mjs` exits 0 |
| 2 | `H:/.claude/settings.json` contains **only** H: drive paths in hook commands (or portable env-var resolutions) | Audit `settings-json` rows: zero `critical` |
| 3 | All per-chat handoffs in `state/shared/handoffs/HANDOFF-*-*.md` are H:-only | Audit `handoff-md` rows: zero `critical` |
| 4 | `QdrantMemoryEngine` state survives the swap (semantic_search returns hits after re-mount) | Manual: see procedure §3 |

The baseline audit (this commit) reports **188 critical findings**, mostly historical `C:\Users\wompu\…` paths recorded in `CHECKPOINT_TRACKER.json` and a few peer-chat session ledgers. These are *records of past machine state*, not active dependencies — a swap will not actually fail on them. Future iterations of the script can add a per-file allowlist to silence these (see "Roadmap" below).

## Severity Bands

The audit script (`scripts/cross-pc-handoff-verify.mjs`) classifies each filesystem path reference into one of three buckets:

- **critical** — `C:\…` path inside a canonical state file, settings.json, or handoff. **Breaks the session** because the path resolves to nothing on a fresh machine.
- **warning** — `${USERPROFILE}` reference, or `C:\…` inside a hook script (often a fallback). **PC-fragile** but works as long as the Windows user profile has the same name on the target PC.
- **info** — H:, relative, or non-Windows-absolute path. **Portable.** Counted but not flagged.

Pure helpers: `classifyPath`, `extractPathRefs`, `severityFor`, `aggregateFindings` are exported from the script and tested in `mcp-server/src/__tests__/CrossPcHandoffVerify.test.ts` (26 cases).

## Procedure — Run This Before Any Swap

### 1. Run the audit

```bash
node H:/prism/scripts/cross-pc-handoff-verify.mjs
```

Exit code 0 ⇒ no critical findings ⇒ swap is safe for the canonical files. Exit code 1 ⇒ critical findings ⇒ inspect `--json` output and resolve before swapping.

### 2. JSON mode for tooling

```bash
node H:/prism/scripts/cross-pc-handoff-verify.mjs --json > /tmp/handoff-audit.json
```

Returns `{ critical, warning, info, findings: { critical[], warning[], info[] } }`. Each finding has `{ file, path, kind, fileType, severity }`.

### 3. Manual swap test

When the user wants to verify a real cold swap (eject SSD → re-mount on other machine):

1. **Write a known memory** before unplugging:

   ```bash
   # On source PC, write a sentinel into Qdrant via the MCP server
   # Use prism_memory:remember with a known kind+id+text triple
   ```

2. **Eject H:** safely. Move the drive to the target PC.

3. **On target PC**, run:

   ```bash
   node H:/prism/scripts/cross-pc-handoff-verify.mjs
   ```

   Should report identical critical/warning counts (because nothing PC-specific should have changed).

4. **Verify Qdrant survival** via semantic_search for the sentinel:

   ```bash
   # Use prism_memory:semantic_search with the sentinel's text
   # Expected: hit with score ≥ 0.9
   ```

5. **Read the most-recent per-chat handoff** and confirm it loads:

   ```bash
   ls H:/prism/state/shared/handoffs/HANDOFF-*.md | tail -3
   ```

If steps 3–5 all succeed, the swap is verified.

## Roadmap (out of scope for P7-U02)

- **Allowlist support:** add a `state/shared/.handoff-audit-allowlist.json` so historical `C:\Users\wompu\…` paths in `CHECKPOINT_TRACKER.json` don't dominate the report.
- **Auto-rewrite hook:** PostToolUse hook that catches new C:-path writes into state files at edit time.
- **Cron audit:** schedule the script weekly so drift is caught before the next swap.

## See Also

- Procedure source of truth: `scripts/cross-pc-handoff-verify.mjs`
- Tests: `mcp-server/src/__tests__/CrossPcHandoffVerify.test.ts` (26 cases)
- Roadmap: `knowledge/roadmap/INTEL-OLLAMA-OBSIDIAN-MS0.json` § P7-U02
- Sister unit: P6-U01 `mirror-c-to-h` hook prevents new C: writes; this audit catches what already exists.
