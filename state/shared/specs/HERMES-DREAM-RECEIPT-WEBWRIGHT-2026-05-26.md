# HERMES-DREAM-RECEIPT + WEBWRIGHT-SKILL-PROMOTION — Spec (2026-05-26, slot:bravo)

**Trigger:** /goal `/loop` reading of two X articles (2026-05-25):
- Tony Simons — *Hermes Dreaming v0.1.0* (https://x.com/tonysimons_/status/2059119768662065523)
- mr-r0b0t — *Microsoft Webwright* (https://x.com/mr_r0b0t/status/2059026191646945515, https://microsoft.github.io/Webwright/)

**Memory:** [[reference_hermes_dreaming_and_webwright_2026_05_26]]

**Bravo prior arc:** HZP-DASH-MS0 → HZP-DASH-PSN-MS0/U-HZD-PSN-01 (PSNHealthCheckEngine + 11-leg PSN strip on Hermes-Zebra dashboard). This spec is the natural next milestone in the Hermes-Zebra-PSN line.

---

## DREAM-RECEIPT-MS0 (proposed; bravo-owned)

**Owner:** bravo slot (Hermes-Zebra-PSN domain).
**Predecessor:** SOUL-DREAM-WIRE-MS0/U-HZP05 (already shipped — 4 dispatcher actions wired in `prism_session`: `dream_propose` `dream_batch_render` `dream_consolidate` `dream_queue_render`).
**Gap closed:** Existing dream_consolidate is *direct mutation*. Hermes Dreaming v0.1.0 splits this into `diff → validate → apply (with backup) → discard (archive)` over a receipt-bundle artifact. The receipt is the product.

### Receipt-bundle format (locked, copies Hermes Dreaming verbatim for interop)

```
state/shared/dream-artifacts/<artifact-id>/
  manifest.json       # run identification, schemaVersion, parent-trace, by:claude-<id>
  REPORT.md           # human-readable summary (renders in /system-viz)
  sources.jsonl       # what got scanned (handoffs, memories, wiki, transcript, ...)
  proposals.jsonl     # proposed mutations, one per line
```

Each proposal carries: `target_path`, `mutation_type` (write|patch|append|delete), `before_sha256` (live state at scan time), `after_content` (or patch hunks), `provenance` (which source line generated it), `risk_class` (memory|skill|hook|engine|other).

### Units

| ID | Title | Effort | Notes |
|----|-------|--------|-------|
| U-DR01 | DreamArtifactBundleEngine — pure-core writer/reader for the 4-file bundle | S | New engine at `mcp-server/src/engines/DreamArtifactBundleEngine.ts` + 20+ vitest cases |
| U-DR02 | `prism_session:dream_diff` action — compare artifact `after_content` vs live state, render unified diff per proposal | S | Pure; no live writes |
| U-DR03 | `prism_session:dream_validate` action — schema + invariants (no inline physics constants, no peer-claimed files, no soft-gate weakening) | M | Reuses existing duplicationGuard + pre-write-gate logic |
| U-DR04 | `prism_session:dream_apply` action — backup-then-write with `--approve all\|<id-list>` and `--backup-root` | M | Live mutation; must be slot-owned + idempotent |
| U-DR05 | `prism_session:dream_discard` action — archive bundle to `state/shared/dream-archive/` without touching live | S | Pure file move + index update |
| U-DR06 | `prism_session:dream_status` action — list artifacts by status (`staged\|validated\|applied\|discarded`) | XS | Index reader |
| U-DR07 | DREAM:-marker source scanner — parse `DREAM: memory|user|fact|skill: ...` lines from handoffs + transcript tail into proposals.jsonl | S | Closes the "offline-first" leg from the article |
| U-DR08 | Stop-hook integration — re-route `stop-obsidian-memory-feed.mjs` writes through the dream-receipt path when `PRISM_DREAM_STAGE_MEMORY=1` (default off; opt-in) | M | Backward-compat; the existing direct-write path is still default until the receipt path proves out |
| U-DR09 | /system-viz ghost roost `ghost.dream_artifacts` rendering each staged/validated/applied/discarded artifact as a node | S | Existing pattern (see priority_queue + bridge_synergy roosts) |
| U-DR10 | Skill `/dream-review` — operator entry point: list staged, show diff for one, approve/discard | S | New `.claude/commands/dream-review.md` |

Total: **10 units (3 XS/S + 4 S + 3 M)**. Target: same arc as HZP-DASH-PSN-MS0 (~5-7 commits, single bravo slot, 1-2 days).

### Safety properties

- **Apply is always slot-owned.** Bundle creator slot ≠ applier slot → BLOCKED unless `--operator-override`.
- **Apply writes backup first.** Backup root defaults to `state/shared/dream-backups/<artifact-id>/` mirroring `target_path` tree.
- **Discard never mutates live.** Archive is move-only on the bundle directory.
- **Schema-versioned.** `manifest.schemaVersion = "1.0.0"` from day 1; bump on any field rename.
- **No silent skip.** Per R12, `dream_apply` returns per-proposal `{status:applied|skipped|failed, reason, target_sha256_after}` — never reports success on partial.

---

## WEBWRIGHT-SKILL-PROMOTION-MS0 (proposed; bravo or kilo slot)

**Owner:** bravo (Hermes-Zebra-PSN line of sight, dashboard-friendly) OR kilo (print-to-program slot — strong fit for the JM-Die / vendor-catalog scrape use-case). Operator picks; this spec is slot-agnostic.
**Predecessor:** [[feedback_playwright_for_online_sources]] — already the routing rule. Webwright extends the *next* layer.
**Gap closed:** PRISM uses Playwright MCP today for one-shot fetches (this very session: X article fetches via Chrome devtools MCP fallback). Sessions are ephemeral. Webwright's claim is that *every successful session should become a reusable workflow*. This milestone makes that claim true for PRISM.

### Workspace format

```
state/shared/web-workspaces/<run-id>/
  task.md               # the original ask (operator prompt or /goal text)
  scripts/
    explore_<n>.py      # incremental scripts the agent wrote (Playwright-backed)
    final_script.py     # parameterized final program (the deliverable)
  logs/
    <script>.stdout
    <script>.stderr
  screenshots/
    <step>_<topic>.png  # critical-point screenshots only (not every action)
  observations.jsonl    # one observation per agent step (terminal/log/screenshot/error)
  self_reflect_result.json   # gate verdict — status: success|partial|failed, critical_points: [...]
  manifest.json         # schemaVersion, by:claude-<id>, parent-trace, prompt, model, started/ended
```

### Units

| ID | Title | Effort | Notes |
|----|-------|--------|-------|
| U-WW01 | WebworkspaceEngine — pure-core writer for the workspace layout above | S | Mirror DreamArtifactBundleEngine pattern; 20+ vitest cases |
| U-WW02 | Playwright wrapper hook — every `mcp__plugin_playwright_*` (and `mcp__plugin_chrome-devtools-mcp_*`) call records into the active workspace when one exists | M | PostToolUse hook; opt-in via `PRISM_WEBWORKSPACE_ENABLE=1` initially |
| U-WW03 | `prism_session:webworkspace_start` + `webworkspace_finish` actions — bracket a web task; runId returned | S | Plus `webworkspace_list` for /system-viz integration |
| U-WW04 | Self-reflection gate — at `webworkspace_finish`, dispatch a `reviewer` Agent to grade the run (success/partial/failed + critical points) | M | Same pattern as 3-of-3 scrutiny; runs once, not 3× |
| U-WW05 | Skill-stub auto-generator — on `success` verdict, render a `.claude/commands/web-tasks/<slug>.md` stub with the parameterized final_script.py contents + trigger keywords | M | Skill is *staged* (drops as a Dream artifact for operator review) — composes with DREAM-RECEIPT-MS0 if both ship |
| U-WW06 | /system-viz ghost roost `ghost.web_workspaces` — each run as a node + screenshot thumbnail | S | Existing roost pattern |
| U-WW07 | First-target run-through: JM-Die customer-portal scrape | M | Live integration; surfaces edge cases the harness must handle |
| U-WW08 | Second-target run-through: vendor catalog harvest (Sandvik or Kennametal speed-feed update sweep) | M | Confirms the parameterization generalizes |

Total: **8 units (1 XS + 3 S + 4 M)**. Larger than DREAM-RECEIPT-MS0 — Webwright is a bigger surface area.

### Why both together

- Webwright generates new skills + scripts + observations; without Dream-Receipt, those land in `.claude/commands/` directly = silent mutation of the operator surface. **U-WW05 explicitly composes with DREAM-RECEIPT** so promoted skills arrive as reviewable artifacts.
- Dream-Receipt without Webwright is governance with no new capability flowing through it. Webwright keeps the artifact pipeline fed with real work.

---

## Risk / non-goals

- **Not a multi-agent orchestrator.** Webwright's value is the single-loop terminal harness, not parallel browser-agents. PRISM already has the fleet for parallelism.
- **Not a replacement for `/system-viz` or PSN.** This is a new *artifact channel* feeding both surfaces, not a replacement.
- **Backwards-compatible.** Existing direct-write paths (`stop-obsidian-memory-feed.mjs`, direct Playwright calls) keep working; receipt path is opt-in until proved out.
- **No new dispatchers.** All 11 new actions land on existing `prism_session`. Keeps the per-chat action-discovery cost flat.

---

## Decision needed (next iter)

- [ ] Operator approves DREAM-RECEIPT-MS0 → bravo writes milestone envelope + picks U-DR01.
- [ ] Operator picks owner for WEBWRIGHT-SKILL-PROMOTION-MS0 (bravo / kilo / parallel).
- [ ] Operator confirms initial first-target list for U-WW07/U-WW08 (JM-Die customer-portal + vendor catalog OR alternatives — DocuStrata customer scrape is another strong candidate).
