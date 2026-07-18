# RESUME AT WORK — KNOWLEDGE-WIKI-MS0 Checkpoint

> **Generated:** 2026-04-27 by chat `claude-bad5f10a` after multi-hour session.
> **Audience:** future Claude session resuming on the work machine after H: plug-in.
> **Read this FIRST**, then `state/shared/handoffs/HANDOFF-{your-id}.md`, then the milestone JSON.

---

## 0. Boot Sequence (do exactly this)

```bash
# Plug in H: drive
claude --dangerously-skip-permissions

# Once Claude launches:
/handoff read                    # via per-agent-handoff.mjs (per-chat HANDOFF file)
cat H:/prism/RESUME_AT_WORK.md   # this file
```

If `claude` won't launch with a settings.json error: `~/.claude/settings.json` was already repaired this session, but if it's broken again, see §6.

---

## 1. What Exists (DON'T REBUILD)

### Surviving artifacts from prior session

| File | State | Confidence |
|---|---|---|
| `H:/prism/WIKI_SCHEMA.md` | 226 lines, 11 sections, Karpathy protocol | needs +24 lines + 2 bug fixes (§3) |
| `H:/prism/knowledge/wiki/index.md` | 722 entries (575 engines + 90 dispatchers + 57 memories) | usable; minor cleanup wanted |
| `H:/prism/knowledge/wiki/log.md` | 1 bootstrap entry, grep-format correct | good |
| `H:/prism/knowledge/wiki/{11 categories}/.gitkeep` | full skeleton | good |
| `H:/prism/mcp-server/scripts/wiki-bootstrap.mjs` | 220 lines, idempotent (mostly) | needs claim_file lock + .jsonl sidecar |
| `H:/prism/scripts/audit-stop-hooks.mjs` | 200 lines, working | accurate |
| `H:/prism/state/shared/STOP_HOOK_AUDIT_2026-04-27.md` | full audit report | re-run before trusting it (live state may have drifted) |
| `H:/prism/CLAUDE.md` | WIKI PROTOCOL section added | good |
| `~/.claude/CLAUDE.md` | PRISM WIKI section added | good |
| `H:/prism/mcp-server/data/milestones/KNOWLEDGE-WIKI-MS0.json` | 11 units, full envelope | good — load-bearing |

### Authoritative envelope

`KNOWLEDGE-WIKI-MS0.json` contains **everything** — units, exit conditions, drift defenses, Ollama-Max 15-action plan, build hardening, harvest targets. **It is the single source of truth for the milestone.** Don't re-derive its contents from this file.

---

## 2. What Was REVERTED (must redo)

Another chat (`claude-acda4ff6`) had `~/.claude/settings.json` claimed during the prior session. Their commit/restore overwrote my edits. The wiki artifacts (new files) survived; settings + hook-file edits did not.

### Reversion log

| Lost | Restoration command |
|---|---|
| 12 build-critical Stop hooks (always-build-guard, stop_on_build_error, stop_on_failing_tests, stop_on_missing_tests, stop_on_orphan_engine, stop_on_skill_unwired, stop_on_unwired_assets, stop_on_unregistered_asset, stop_on_dirty_registry, stop_on_circular_deps, stop_on_uncommitted_critical, duplication-guard-stop) | See §4 — Python script |
| 5 PreToolUse correctness hooks (code-completeness-gate, duplication-hard-block, anti-pattern-detector, ban-facade-patterns, test-legitimacy) | See §4 |
| 4 Ollama Phase 1 wirings (ollama-task-offloader, claudemd-ollama-enforcer, ollama-terminal-watcher, ollama-autostart) | See §4 |
| 6 marker-disabled hook re-enables (DISABLED_TOKEN_REDUX_2026_04_23 is BACK on type-safety-checker, api-contract-enforcer, async-pattern-checker, consistent-return-checker, magic-number-detector, reference-value-injector) | See §5 — bash sed/python loop |

### Verify reversion before redoing

```bash
node -e "const j=JSON.parse(require('fs').readFileSync('H:/prism/.claude/settings.json','utf8'));console.log('Stop:', j.hooks.Stop[0].hooks.length, 'PreToolUse-Edit-matcher:', (j.hooks.PreToolUse.find(m=>m.matcher==='Edit|Write|MultiEdit')||{}).hooks?.length)"
# Expected if reverted: Stop=6, PreToolUse-Edit=7
# Expected if my edits survived: Stop=18, PreToolUse-Edit=12
```

---

## 3. Bug Fixes Identified by 4-Agent Scrutiny (apply BEFORE U-WIKI02)

### WIKI_SCHEMA.md

1. **CRITICAL — kebab/snake_case contradiction**: §5 frontmatter shows `code-tribal` (kebab), §8 says `code_tribal` (snake). Pick ONE. Recommend kebab everywhere (matches directory name `wiki/code-tribal/`). Fix §8 lines listing categories.
2. **MAJOR — field-name drift**: §4.1 uses `verified:` in the index entry format; §5 frontmatter uses `last_verified:`. Pick ONE field name. Recommend `last_verified` everywhere (matches frontmatter).
3. **MINOR — line count**: 226 lines, exit_condition wants ≥250. Add explicit `WikiLintEngine field-checklist` enumeration to §5 (covers a real gap and adds lines). Add page-size guidance (500-2000 words) and trajectory retention policy.
4. **AT-RISK — multi-chat rules incomplete**: add stale-lock reaper protocol (lock TTL 60s, but who reaps? after how long?), conflict-winner rule for §6.4 (mtime? content hash?), `verified_by` id format spec, `quote_lineage` schema.

### wiki-bootstrap.mjs

1. **MAJOR — clobber risk**: line 192 unconditional `writeFileSync(indexPath, ...)`. Replace with merge: parse existing, upsert by slug, preserve LLM-added category overrides.
2. **MAJOR — no claim_file lock**: must wrap index.md write in `prism_context:claim_file` per WIKI_SCHEMA §4.1.
3. **MINOR — leaked `name:` prefix**: memory entries say `name: User Profile` instead of `User Profile`. Strip frontmatter prefix in summary parsing.
4. **NEEDS-WORK — HNSW readiness**: emit `index.jsonl` sidecar with `{slug, summary, sources, category}` for `WikiIndexMaintainerEngine` to vectorize without re-parsing markdown.

### Pre-existing (not caused by my session)

- `stop_on_broken_imports.mjs` is `continueOnError:true` but is a correctness gate per `feedback_dont_soften_completeness_gates.md` — flip to `false`.
- `stop_on_unsafe_gcode.mjs` same — flip to `false`.

---

## 4. Settings.json Restoration Script (proven pattern)

```bash
# 1. Claim the file
node -e "/* prism_context:claim_file h:/prism/.claude/settings.json edit 15min */"

# 2. Run the canonical Python script (saved as a comment in handoff for paste-ability)
# - Stop hooks: 12 build-critical with continueOnError:false
# - PreToolUse: 5 correctness gates with continueOnError:false
# - UserPromptSubmit: 2 Ollama hooks (task-offloader, claudemd-enforcer) advisory
# - PostToolUse Bash: 1 (ollama-terminal-watcher) advisory
# - SessionStart: 1 (ollama-autostart) advisory

# Use the Python pattern from prior session (see handoff): json.load → mutate → json.dumps(indent=2) → write with CRLF
```

The exact arrays for the loop are in `KNOWLEDGE-WIKI-MS0.json` under `live_system_bugs_surfaced_by_scrutiny.stop_hook_registration_drift` and the audit report at `state/shared/STOP_HOOK_AUDIT_2026-04-27.md`.

---

## 5. Marker Removal Restoration

```bash
cd H:/prism/.claude/hooks && for f in type-safety-checker api-contract-enforcer async-pattern-checker consistent-return-checker magic-number-detector reference-value-injector; do
  python -c "
import re
fn = '${f}.mjs'
with open(fn,'rb') as fp: data = fp.read()
pattern = rb'// DISABLED_TOKEN_REDUX_2026_04_23:[^\n]*\r?\n// Remove the next 2 lines[^\n]*\r?\nprocess\.stdout\.write[^\n]*process\.exit\(0\);\r?\n'
new = re.sub(pattern, b'// RE-ENABLED 2026-04-27 by user approval (KNOWLEDGE-WIKI-MS0/U-WIKI00).\r\n', data, count=1)
if new != data:
    with open(fn,'wb') as fp: fp.write(new)
    print(f'{fn}: marker removed')
"
done
```

---

## 6. Launch-Blocker Recovery (if needed)

If `claude --dangerously-skip-permissions` shows "Settings Error" again, the pattern is: legacy-format matchers in `~/.claude/settings.json` have top-level `command` instead of `hooks: [{type, command}]`. Backup is at `~/.claude/settings.json.pre-fix-bak`. Repair script exists in chat history of prior session — search for "FIXED PreToolUse: matcher=mcp__prism__".

---

## 7. Day-1-Next-Session Execution Order

1. **Boot + read this file + read handoff** (5 min)
2. **Verify state with the node check from §2** (1 min)
3. **If reverted**: redo §4 + §5 (15 min, atomic)
4. **Fix WIKI_SCHEMA.md** kebab/snake + field-name drift + add 24 lines (§3) (15 min)
5. **Fix wiki-bootstrap.mjs** claim_file + .jsonl sidecar + name: strip + merge-not-clobber (§3) (30 min)
6. **Re-run bootstrap** to regenerate index.md cleanly (`node H:/prism/mcp-server/scripts/wiki-bootstrap.mjs`) (1 min)
7. **Begin U-WIKI02**: `WikiIndexMaintainerEngine` + `WikiLogAppenderEngine` per `KNOWLEDGE-WIKI-MS0.json` exit_conditions (~2 hours)

After U-WIKI02 ships → U-WIKI03 (Lint) → U-WIKI04 (IngestRouter) → U-WIKI04B (Harvest) → /compact → U-WIKI05/06/07 → U-WIKI08 → U-WIKI10.

The `ollama_max_optimization_findings` 15-action plan is independently shippable — Phase 1+2 (~1 hour, ~130K tokens/session saved) can slot in any time after settings.json is stable.

---

## 8. Coordination Hygiene (CRITICAL)

The session got bitten by another chat reverting settings.json. To prevent recurrence:

1. **Always `chat_post` to bus before non-trivial settings.json edits.** Wait 30s for objections.
2. **Acquire `prism_context:claim_file` lock** (15 min TTL) on settings.json + every hook file you'll edit.
3. **After write, verify immediately with `node -e ...`** (don't trust silent success).
4. **Release claims promptly** when done.
5. **If you see another chat's claim on settings.json**, ASK THE USER before forcing through. Auto-mode rule: shared production state needs explicit confirmation.

---

## 9. Live System Bugs (Pre-existing, Surfaced This Session)

Documented in `KNOWLEDGE-WIKI-MS0.json` → `live_system_bugs_surfaced_by_scrutiny`:

- **Stop hook registration drift** (CRITICAL): only 1 of 6 registered Stop hooks actually blocks before my session. After redoing §4, this jumps to 13.
- **Build cache phantom** (MAJOR-now-MINOR): the "BUILD CACHE INVALID: index.cjs" message was misleading — esbuild produces `index.js`, not `.cjs`. The current `build-cache-manager.mjs` correctly tracks `index.js`. Phantom message likely from older state.
- **Memory path divergence** (MINOR): `~/.claude/projects/H--prism/memory/` (Claude auto-memory) vs `H:/prism/knowledge/memories/` (PRISM production set). U-WIKI04B handles reconciliation.
- **3 dispatcher TS errors** (NOT MY TRACK): `shopPracticeDispatcher.ts`, `telemetryDispatcher.ts`, `tenantDispatcher.ts` — owned by SYNC-FIX track (commit `376d56472`). esbuild produces `dist/index.js` despite these (tsc errors don't fail the build chain). Hand off, don't fix here.

---

## 10. Quick-Reference Facts

```
Inventory:        2392 engines · 91 dispatchers · 5685 actions · 314 hooks · 53 algorithms
Wiki seeded:      722 entries (575 engines + 90 dispatchers + 57 memories)
Stop hooks:       6 registered (1 blocking) ← if reverted; should be 18 (13 blocking) after restore
PreToolUse Edit:  7 hooks ← if reverted; should be 12 (10 blocking) after restore
Vault:            H:/prism/knowledge/wiki/{11 categories}
Schema:           H:/prism/WIKI_SCHEMA.md (226 lines, target 250)
Bootstrap:        H:/prism/mcp-server/scripts/wiki-bootstrap.mjs (idempotent, needs lock)
Audit:            state/shared/STOP_HOOK_AUDIT_2026-04-27.md (regenerate from live)
Envelope:         data/milestones/KNOWLEDGE-WIKI-MS0.json (load-bearing single source of truth)
Karpathy ref:     https://x.com/defileo/status/2042241063612502162 (full text in WIKI_SCHEMA.md §11)
Branch:           work/cam-exhaust-ms0 (115 ahead, 1 behind origin — diverged before this session)
```

---

_End of resumption brief. The next session has everything it needs to continue cleanly. Total estimated time to fully restore + advance: 1.5 hours including U-WIKI02 start._
