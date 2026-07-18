---
name: reference-hook-wiring-yolo-25-2026-05-16
description: YOLO session 2026-05-16 wired 25 orphan dev-tool hooks across 5 events (SessionStart UserPromptSubmit PreToolUse PostToolUse Stop) — slot delta claude-6d0595bf
aliases: reference_hook_wiring_yolo_25_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.608Z
---


# YOLO hook-wiring session — 25 dev-tool hooks wired

**Shipped:** 2026-05-16 slot delta claude-6d0595bf, /loop iter1-iter7 of "wire all hooks high-ROI combos slot delta — /goal".

**Starting state:** 245 truly-orphan dev-tool hooks (after filtering 504 source hooks for machining/CAD/CAM/lathe/mill/edm/turning skip-domain + subtracting wired-via-settings + wired-via-bundle + wired-via-router-dispatch).

**Wired in this session (25 hooks across 5 event types):**

| Event | Hook | Tier | Purpose |
|-------|------|------|---------|
| Stop | bash-orphan-cleaner | T4 | Kill orphan bash.exe leaves of this session (peer-safe ppid ancestry) |
| Stop | document-preserve-guard | T0 | Block content REMOVAL from JSON/MD docs (allow disable-via-flag) |
| Stop | enforce-roadmap-closeout | T0 | Block when envelope=completed but roadmap-index=not_completed (CLOSEOUT_GATE_BYPASS knob + auto-pass after N) |
| Stop | chat-cleanup-on-stop | T3 | Per-Stop chat-bus cleanup |
| Stop | compact-interval-warning | T3 | Warn if too many units since last /compact |
| Stop | error-pattern-promote | T3 | Promote captured patterns to permanent rules at session end |
| UserPromptSubmit | claudemd-ollama-enforcer | T4 | Ollama-selected 3-5 relevant CLAUDE.md rules (85% token savings vs 2000-token static) |
| UserPromptSubmit | cog-bridge-context-auto-compact | T2 | Advisory compaction at 80% context pressure |
| UserPromptSubmit | context-priority-coordinator | T4 | Classify task + set env flags for token-relevance filtering |
| UserPromptSubmit | claude-brief-staleness-check | T2 | Tiered nudge if CLAUDE-BRIEF.md drifts from PRISM state |
| UserPromptSubmit | archived-skill-suggest | T3 | Surface relevant archived skills (HS-06 smart-recall) |
| UserPromptSubmit | cross-chat-directive-detector | T3 | Detect cross-chat directives in user prompts |
| SessionStart | doc-freshness-check | T2 | Check managed-doc staleness at session start |
| PreToolUse Bash | bash-result-cache | T1 | Cache read-only Bash duplicates by sessionId+cmd+cwd |
| PreToolUse Edit\|Write\|MultiEdit | engine-digest-precheck | T2 | Pre-check ENGINE_DIGEST before creating new engine |
| PostToolUse mcp__prism__prism_.* | cog-bridge-ai-memory-capture | T3 | Auto-capture cognitive_* outcomes to memory graph |
| PostToolUse Bash\|Read | coordination-update-reminder | T3 | Remind to update coordination surfaces after git commit |
| PostToolUse Bash\|Read | commit-format-validator | T2 | Validate `[SCOPE]/U-ID: title` commit format |
| PostToolUse Bash\|Read | error-pattern-capture | T2 | Capture HOOK_BLOCK/TOOL_ERROR + 6 detectors (fork-storm, rg-timeout, git-lock, edit-mismatch, tsc-error, test-fail) |
| PostToolUse Bash\|Read | dev-outcome-tracker | T3 | Track dev outcomes from Bash invocations |
| PostToolUse Bash\|Read | compaction-survival-auto | T2 | Track critical-fact survival rate across compactions |
| PostToolUse Edit\|Write\|MultiEdit | embed-vault-on-save | T3 | Pre-warm Obsidian embed cache (cold daily-brief ~30s → ~1s) |
| PostToolUse Edit\|Write\|MultiEdit | dispatcher-digest-regen | T3 | Auto-regen DISPATCHER_DIGEST.md on engine edits |
| PostToolUse Edit\|Write\|MultiEdit | error-pattern-learner | T3 | MODE A capture phase of error-learn loop |
| PostToolUse Edit\|Write\|MultiEdit | claudemd-section-update | T3 | Auto-update CLAUDE.md sections on relevant code changes |

**Error-learn loop now COMPLETE** (3-stage): error-pattern-capture (PostToolUse) → error-pattern-learner (PostToolUse) → error-pattern-promote (Stop).

**Vetting protocol used per hook (HIGH-CONFIDENCE filter — applied to all 25):**
1. File exists on disk + has clear docstring + tier marker
2. No `DISABLED_*` / `DEPRECATED_*` / `TODO` short-circuits
3. NOT already invoked by bundles or router hooks (filtered via cross-ref grep)
4. Smoke-tests `{continue:true}` OR clean exit-0 on empty stdin
5. Event marker (FIRES ON: / @hook / docstring header) clearly identifies UserPromptSubmit / Stop / etc.
6. Domain in dev-tool scope (skip machining/CAD/CAM/blueprint/lathe/mill/edm/turning/grinder/swiss/hyper/fanuc/mastercam)
7. Insertion adjacent to thematically-related existing hooks (cleanup neighborhood for reapers, error-learn cluster for capture/learner/promote, etc.)

**Skipped (failed vetting):**
- dead-pixel-guard — emits non-JSON stdout `"✓ dead-pixel-guard: 0/146 L1 pages..."` (could break Claude Code's hook-result parser)
- appdata-junction-guard — smoke fails `"✗ AppData junction guard FA..."` (Windows env-dependent)
- embedder-inject-qdrant — emits non-protocol JSON `{"ts":"..."}` (telemetry, not hook directive)
- complexity-gate — has explicit `DISABLED_TOKEN_REDUX_2026_04_23` short-circuit
- discipline-expert-inject, chat-bus-inject — FALSE POSITIVES in orphan list (dispatched by ollama-unified-semantic-router.mjs)
- agi-safety-envelope-guard — machining domain (lathe Vc/fz envelope check)
- extraction-log-drift, auto-learn-budget-guard — PreTool BLOCKING with insufficient verification of internal action-name filter

**Settings.json files OUTSIDE git tree** — no git commits; all 25 wirings are live the moment c-to-h-mirror replicates C: → H: (PostToolUse hook confirms each Edit).

**Lock-then-retry pattern in use** — claude-549c9f4f held settings.json claim early in session (~2m TTL). Per [[reference_bash_orphan_cleaner_wired_2026_05_16]] and conflict-fork rule, never bypassed file-claim guard. Waited + retried.

**Tool-batch ceiling discipline:** session hit 162/60min after ~25 hook wirings. Stopping cleanly + writing this memory + handoff before exhaustion.

**Remaining orphan-hook surface:** 245 - 25 = ~220 dev-tool orphans still unwired. Future iterations should continue the same vetting protocol. Skip-domain filter caught machining hooks (out-of-scope per user constraint).

**Sister memories:** [[reference_bash_orphan_cleaner_wired_2026_05_16]] · [[reference_settings_wiring_drift_2026_05_16]] (always grep both settings.json after edit) · [[reference_stop_advisory_wiring_cluster_2026_05_15]] (Stop chain cluster pattern) · [[feedback_roadmap_close_out]] (the rule enforce-roadmap-closeout now enforces at Stop).
