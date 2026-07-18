> **✅ Option A DONE 2026-06-02 (commit `355198a474`, slot:alpha — golf-night workload).** The regen-if-stale block is wired into `.claude/hooks/cag-cold-cache-anchor.mjs` at the top of `main()` (after the sid guard, before `snapshotColdSources()`): mtime-throttled (>6h on `INDEX.json`), detached fire-and-forget spawn of `scripts/galaxy-context-card.mjs build`, fail-soft (never blocks the anchor), knob `PRISM_GCF_CAG_REGEN_DISABLE=1`. Verified: `node --check` clean; hook still emits the CAG anchor block; `galaxy-context-card.mjs build` → "built 34 card(s)" (regen target is real, not a no-op).
>
> **⚠ gitignore-untrack DEFERRED (R7 conflict surfaced — NOT applied).** The "gitignore `state/shared/galaxy-cards/`" recommendation conflicts with a committed artifact: `galaxy-cards/MASTER-DIGEST.md` is referenced in MEMORY.md as the federation feed-up ("inject 1 vs 34 brains"), and 38 files in this dir are currently tracked. A blanket `git rm --cached` + gitignore would untrack MASTER-DIGEST (an intentional commit). Owner decision needed: gitignore only the regenerable churn files (ALL-CARDS.md, INDEX.json, DEDUP-REPORT.json, KNOWS-MAP.json, MEMORY-WATCH.*, PUSH-QUEUE.json) while keeping MASTER-DIGEST tracked — NOT the whole dir. Until decided, the regen wire above already prevents the staleness symptom the untrack was meant to address.

# HOOK-PATCH — galaxy-cards SessionStart regen (GALAXY-CONTEXT-FEDERATION-MS0 / U-GCF-CAG-REGEN-WIRE)

> PATCH-SIBLING for **golf**/integrator. The `.claude/hooks/cag-cold-cache-anchor.mjs` SessionStart hook is
> harness-exec HARD-blocked from a slot worktree, so alpha shipped the cold-source registration + the bundle
> generator (commit `.../U-GCF-CAG-CARDS`) and this placement spec; the hook edit must happen from the main tree.
> Author: claude-da9aacf5 slot alpha · 2026-05-31.
>
> **Why:** `U-GCF-CAG-CARDS` registered `galaxy-cards` (`state/shared/galaxy-cards/ALL-CARDS.md`) as a CAG
> cold source, but that bundle is a **regenerable build artifact** (not committed). On a fresh slot worktree /
> after galaxy MEMORY.md churn, the cold-anchor shows `[✗] galaxy-cards ((missing))` or anchors a stale bundle.
> This wire regenerates it at SessionStart (cheap, ~1 s, fail-soft) so the anchor reads a fresh bundle.

## Option A (recommended) — regen-if-stale INSIDE `cag-cold-cache-anchor.mjs`, before it snapshots COLD_SOURCES

Near the top of the hook's main path (before it stats/reads the cold sources), add a throttled, fail-soft regen
of just the galaxy-cards bundle. It must NEVER block or throw the hook:

```js
// U-GCF-CAG-REGEN-WIRE: keep the galaxy-cards bundle fresh before anchoring (fail-soft, throttled by mtime).
try {
  const idxPath = "H:/prism/state/shared/galaxy-cards/INDEX.json";
  let stale = true;
  try { stale = (Date.now() - fs.statSync(idxPath).mtimeMs) > 6 * 3600 * 1000; } catch { stale = true; } // missing → stale
  if (stale && process.env.PRISM_GCF_CAG_REGEN_DISABLE !== "1") {
    const { spawn } = await import("node:child_process");
    spawn(process.execPath, ["H:/prism/scripts/galaxy-context-card.mjs", "build"],
      { detached: true, stdio: "ignore" }).unref(); // fire-and-forget; next session reads the fresh bundle
  }
} catch { /* never block the anchor */ }
```

Note: detached spawn means THIS session may still anchor the previous bundle (acceptable — the bundle is
intra-session stable); the regen lands for the NEXT session. For same-session freshness use a synchronous
`execFileSync(... , {timeout: 5000})` instead, but that adds ~1 s to SessionStart — prefer the detached form.

## Option B — standalone SessionStart hook
Create `.claude/hooks/gcf-cards-regen.mjs` (T3, detached `galaxy-context-card build`, mtime-throttled, fail-soft)
and wire it in `settings.json` SessionStart BEFORE `cag-cold-cache-anchor.mjs`. More moving parts than A.

## Also recommended — gitignore the artifacts
Add `state/shared/galaxy-cards/` to `H:/prism/.gitignore` so the regenerable cards/bundle/INDEX are never
accidentally committed (they churn as galaxy MEMORY.md files change — committing them = merge noise).

## Verify
- `node H:/prism/scripts/galaxy-context-card.mjs build` → "built N card(s)"; `ALL-CARDS.md` present.
- Start a fresh session → the `🧊 CAG cold-cache anchor` banner shows `[✓] galaxy-cards (~34KB)`.
- Knob: `PRISM_GCF_CAG_REGEN_DISABLE=1` disables the regen.

Logic shipped: `scripts/lib/galaxy-context-card.mjs` (bundle) + `scripts/lib/cag-router.mjs` (COLD_SOURCES entry).
Wiki: [[galaxy-context-federation]]. Memory: [[reference_galaxy_context_federation_card_2026_05_31]].
