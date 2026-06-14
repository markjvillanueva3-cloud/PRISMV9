# CLAUDE.md patch — HTML-COMPANION activation (2026-05-18, slot kilo)

> Peer-locked surface — operator (or next golf integrator) folds this into `H:/prism/CLAUDE.md` once peer-claims clear. Slot kilo cannot edit CLAUDE.md directly per the conflict-fork rule.

## Target section: `## Recent regressions`

Append the following lines under `## Recent regressions`:

```markdown
- 2026-05-18 | **HTML-COMPANION-MS0 activated** (slot kilo, /checkin-kilo /loop) — closed deferred ghost milestone: bulk-rendered 70 stale spec HTML companions via `node H:/prism/mcp-server/node_modules/.bin/tsx scripts/emit-all-spec-html.ts` (69 in iter-1 closing the backfill, +1 mid-flight peer-add). Per Thariq/Anthropic playbook (already cited in `html-report-render.mjs:6`). Plus standalone HTML for **CLAUDE.html (234KB) + MEMORY.html (35KB) + 10 dashboard patches** via `node scripts/md-to-html.mjs --toc` — extends the playbook's >100-line threshold to the root reference docs. Drift gate green post-emit (`emit-all-spec-html.ts --check-drift` exits 0, 0/130 stale). `html-companion-guard.mjs` PreToolUse:Bash drift+a11y gate confirmed wired in `bundles/bash-bundle.mjs:29`. Audit prompt: `determine if we're properly utilizing the md to html conversion`. | observed-by: claude-e8bb7bd7 slot kilo, /checkin-kilo /loop. | verify: `H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --check-drift` → exit 0; `ls H:/prism/{CLAUDE,MEMORY}.html` → both present.
```

## Doctrine ledger update (optional second hunk)

Under the `## ENFORCEMENT (PRISM-specific gates in project CLAUDE.md)` or a new `## HTML COMPANION SURFACE` pointer:

```markdown
## HTML COMPANION SURFACE
Strategic specs + research → MD canonical, HTML view companion auto-rendered. Scope: `state/shared/specs/**` + `state/shared/research/**` (out-of-scope: handoffs, wiki leaves — by design). Generator: `node H:/prism/mcp-server/node_modules/.bin/tsx scripts/emit-all-spec-html.ts` (`--check-drift` for CI gate, `--force` for full re-render). Guard: `.claude/hooks/html-companion-guard.mjs` (PreToolUse:Bash, wired in `bundles/bash-bundle.mjs`) catches stale `<meta prism-source-hash>` + WAI-ARIA violations on `git commit`; warn-only default, `PRISM_HTML_GUARD_BLOCK=1` for hard block. Extension surface: root `CLAUDE.html` + `MEMORY.html` + `state/shared/dashboards/patches/*.html` rendered via `scripts/md-to-html.mjs` (no source-hash, no a11y gate — out-of-scope of the guard, manually re-render after edits). Wiki: [[milestone-ghost-ms-html-companion-ms0]] · [[html-companion-guard]] · [[spec-html-render]].
```

## Why patch-sibling instead of direct edit

- CLAUDE.md held a fresh peer-claim cluster in the last 12h window (claude-629a6355 / claude-de04081e / claude-0608ab9a touching it for golf/token-savings/OBSIDIAN-BRAIN-FIX MS0 work).
- Conflict-fork rule: a routing hook would block a kilo-slot commit touching CLAUDE.md while peers hold those scopes.
- Patch-sibling pattern (per CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0) is the codified safe path.

## Verify before folding

```bash
H:/prism/mcp-server/node_modules/.bin/tsx H:/prism/scripts/emit-all-spec-html.ts --check-drift
# expect: exit 0, no stale twins listed
ls H:/prism/CLAUDE.html H:/prism/MEMORY.html
# expect: both present, sizes >>0
ls H:/prism/state/shared/dashboards/patches/*.html | wc -l
# expect: 11 (this patch's HTML companion + 10 pre-existing patches)
```
