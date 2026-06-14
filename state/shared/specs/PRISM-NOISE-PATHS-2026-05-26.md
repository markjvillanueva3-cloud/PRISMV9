# PRISM Noise-Paths Catalog (Bibryam #3 Noise Filter — doc-only first pass, 2026-05-26, slot:alpha iter12)

**Trigger:** during this iter's `Glob "mcp-server/src/engines/{mill,lathe,wedm,quoting,business,erp}/CLAUDE.md"` the ripgrep call **timed out at 20s** — direct, repeatable evidence of Bibryam pattern #3's diagnosis: untracked + vendor + extracted-archive paths dominate every Glob/Grep latency budget. This file enumerates the high-confidence exclusion globs PRISM should adopt fleet-wide.

**Doc-only**: NOT writing into `.claude/settings.json` this iter. Risk: untested `permissions.deny` syntax + bypassPermissions mode interaction = blast radius too high to ship mid-loop. Operator-touch shipment: copy the snippet below into `C:\Users\wompu\.claude\settings.json permissions.deny` once validated against one slot, then mirror to H:.

---

## High-confidence noise paths (NEVER need ad-hoc search)

These paths are accessed via specific loaders/profiles/APIs — never via Glob/Grep. Excluding them costs nothing and saves ~all multi-thousand-file-tree scan latency.

| Path glob | Why exclude | Size estimate | Access pattern |
|-----------|-------------|---------------|----------------|
| `H:/prism/extracted_modules/**` | vendor-extracted database snapshots (databases/, postprocessors/, controllers/) | thousands of .js files | Read via specific loader scripts (e.g. `scripts/lib/extracted-module-loader.mjs`); never Grep-searched |
| `H:/prism/JM DIE/**` | JM Die customer corpus (24,545 files) | 24,545 files | Accessed via `jm-die-profile.ts` API only (`prismSelfAwarenessEngine.getJMDieCustomerPath()`); never Grep-searched |
| `H:/prism/data/extracted_*/**` | extracted-data archives (pdf-corpora, video-corpora, training-snapshots) | thousands | Read via specific extractor pipelines (extract-jm-die-corpus-page-by-page.py etc.) |
| `H:/prism/state/shared/system-viz/staging/**` | auto-regen viz staging artifacts (rebuilt every regen-viz tick) | ~50 large JSON files | Never grep-searched; consumers read named files only |
| `H:/prism/node_modules/**` | npm dependency tree | tens of thousands | Module system handles resolution; never Grep-searched |
| `H:/prism/mcp-server/node_modules/**` | sub-package npm tree | same | same |
| `H:/prism/**/dist/**` | tsc + esbuild build output | mirror of src/ | Build artifact; source is canonical, never search the dist |
| `H:/prism/.git/**` | git internals | huge | Read via git CLI only |
| `H:/prism/**/.next/**` | Next.js build cache | per-app | Build artifact |
| `H:/prism/**/coverage/**` | test coverage reports | per-run | Read via reporter |
| `H:/prism/**/*.bak-*` | backup files (per CLAUDE.md `feedback_never_delete_only_disable`) | scattered | Reference-only, never searched |
| `H:/prism/**/*.tmp` | transient | scattered | n/a |
| `H:/prism/.claude/cache/**` | hook caches (rate-limit, ollama-prewarm, regen-viz-staging) | per-machine | Hook owns its own cache reads |

---

## Conservative-exclude paths (case-by-case)

Should NOT be unconditionally excluded — sometimes legitimate to search — but a per-tool `--exclude` is the right pattern:

- `H:/prism/state/shared/handoffs/consolidated/**` — 13 chat consolidated handoffs, large. Sometimes searched for cross-chat history.
- `H:/prism/state/shared/system-viz/system-graph.json` — large but periodically queried.
- `H:/prism/knowledge/memories/**` — 641 memory files. Indexed via `memory_search` MCP; only fall back to Grep if MCP unavailable.

---

## Suggested `.claude/settings.json permissions.deny` snippet (operator-touch — DO NOT auto-apply)

```jsonc
{
  "permissions": {
    "defaultMode": "bypassPermissions",
    "deny": [
      "Glob(H:/prism/extracted_modules/**)",
      "Glob(H:/prism/JM DIE/**)",
      "Glob(H:/prism/data/extracted_*/**)",
      "Glob(H:/prism/state/shared/system-viz/staging/**)",
      "Glob(H:/prism/node_modules/**)",
      "Glob(H:/prism/mcp-server/node_modules/**)",
      "Glob(H:/prism/**/dist/**)",
      "Glob(H:/prism/.git/**)",
      "Glob(H:/prism/**/.next/**)",
      "Glob(H:/prism/**/coverage/**)",
      "Glob(H:/prism/.claude/cache/**)",
      "Grep(H:/prism/extracted_modules/**)",
      "Grep(H:/prism/JM DIE/**)",
      "Grep(H:/prism/data/extracted_*/**)",
      "Grep(H:/prism/state/shared/system-viz/staging/**)",
      "Grep(H:/prism/node_modules/**)",
      "Grep(H:/prism/mcp-server/node_modules/**)",
      "Grep(H:/prism/**/dist/**)",
      "Grep(H:/prism/.git/**)",
      "Grep(H:/prism/**/.next/**)",
      "Grep(H:/prism/**/coverage/**)",
      "Grep(H:/prism/.claude/cache/**)"
    ]
  }
}
```

**Mirror discipline:** edit `C:\Users\wompu\.claude\settings.json` first (per CLAUDE.md preamble); the `c-to-h-mirror` hook auto-copies to `H:/.claude/settings.json`. Edit H: directly does NOT replicate back.

**Validation procedure (operator-touch):**
1. Snapshot current settings.json (`copy settings.json settings.json.bak-pre-noise-deny`).
2. Apply snippet to ONE slot (alpha) by setting `PRISM_NOISE_DENY_TEST_SLOT=alpha` env (proposed knob — not yet wired) before the deny merge.
3. Run a representative Glob/Grep that previously hit a noise path; verify it now errors with a clear deny message (not a silent miss).
4. Time a `Glob "**/CLAUDE.md"` over the full tree before/after. Bibryam claim: ~2x speedup.
5. If validated → roll out to fleet; if not → restore from .bak-pre-noise-deny.

---

## Quantified ROI estimate (Bibryam #3)

- **Current pain (this iter, observed):** `Glob "mcp-server/src/engines/{mill,lathe,wedm,quoting,business,erp}/CLAUDE.md"` timed out at 20s. The glob would have returned 0 results in <100ms if extracted_modules + node_modules + JM DIE were excluded.
- **Per-call savings:** ~5-15s wall-clock per Glob/Grep × ~10 calls per build chat × 26 fleet slots × 4-8 chats/day = ~3-15 hours of compounded latency/day across the fleet.
- **Token savings:** indirect — when Glob/Grep are fast and complete, chats use them more (vs falling back to expensive Agent dispatches). Estimated 5-10% reduction in Agent-tool spend.

---

## Cross-refs

- Parent doctrine: `state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md` (P2 Asteroid Belt pillar)
- Bibryam analysis: `state/shared/specs/BIBRYAM-LARGE-CODEBASE-PATTERNS-APPLIED-2026-05-26.md` §3
- Empirical evidence: this iter's Glob timeout on the 6 per-domain CLAUDE.md paths.
- CLAUDE.md §SCRUTINY GATE — exclusion hides bugs from reviewers, so the deny block must be auditable in code review (visible in settings.json diff).
- `feedback_never_delete_only_disable` — the deny rule is reversible (delete from settings.json) and doesn't modify the noise paths themselves.

## Next-iter action items

1. **Operator** validates the deny-rule syntax once against one Glob+Grep call (no code change needed; trial-and-error in settings.json copy).
2. If syntax works → apply the snippet, commit settings.json.
3. If syntax fails (e.g. only "Read(...)" rules are honored) → file `U-BIBRYAM-3-DENY-SYNTAX-FALLBACK` to either (a) write a `.claudeignore` if the harness honors it, or (b) ship `pre-glob-noise-warn.mjs` PreToolUse advisory hook listing the noise-path matches.
4. Once shipped → re-run `Glob "**/*.md"` benchmarks and record the speedup in `state/shared/dashboards/noise-filter-speedup.json`.
