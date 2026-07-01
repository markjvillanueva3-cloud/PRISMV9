# Session-continuity + token-efficiency + conflict backlog (2026-06-11, slot:alpha)

> Operator /goal (ultracode): exhaust token-saving measures (savings WITHOUT quality loss),
> exhaust system-efficiency upgrades + gap fills, NO hook/system/context conflicts, exhaust
> precompaction/compaction/handoff/self-startup gap fills + full functionality (chats keep
> working until auto-compaction, which auto-writes a handoff just before), apply the two
> X-article patterns to all slot CLAUDE.md.
>
> This is the evidence-backed backlog from a 4-agent discovery workflow (wf_2a577030-7a4,
> 577K tok). Each item is file:line-cited. Pick from here in ROI order on the next iteration;
> do NOT re-run the discovery. The two X articles (login-walled bodies; titles+summaries read
> via Playwright): (1) darkzodchi "Stop Claude From Agreeing With Everything" -> honesty rules
> in CLAUDE.md + a critic agent (PRISM already has §HONESTY RULES + fact-checker + 3-of-3); (2)
> Hamza Khalid "4 Engineers Just Told You to Stop Prompting" (cites Peter Steinberger) ->
> stop ad-hoc prompting, build SYSTEMS (specs/hooks/sub-agents).

## SHIPPED this session (slot:alpha, branch cad-fusion-live-ms0)
- **1e25893b31** AUTO-COMPACTION-MODEL-HANDOFF-MS0 U1+U2 -- restored the 90-95% precompact
  trigger fleet-wide (was env-disabled by the stale `PRECOMPACT_{SOFT,HARD}_TOKENS=99000000`
  OS var; `resolveThreshold()` neutralizes any threshold > CONTEXT_CAP back to the default;
  clean `PRECOMPACT_DISABLE=1` knob added) + made SOFT/HARD messages instruct the MODEL to
  author its own handoff via per-agent-handoff (NOT the banned stub skill) + HARD handoff-write
  exemption arms the pending marker (no deadlock). 20/20 node:test, 2-reviewer PASS.
- **6a394d47ce** U-CIC-KNOB -- compact-interval-warning honors `PRISM_TASK_BOUNDARY_COMPACT_DISABLE`
  (the operator set it but the hook never read it -- the LIVE pushback-to-compact source) +
  new `PRISM_COMPACT_INTERVAL_WARN_DISABLE` + R6-aligned message. 3/3 node:test.

## REMAINING -- W4 session-continuity (highest operator value)
- **U3 (precompact-handoff helper defers to model handoff)** [P1] -- `precompact-handoff.mjs`
  PreCompact hook still synthesizes a stub via `generateSmartResume()`+`padFileToBytes()`. Per
  the MS0 spec U3: before writing, detect a FRESH model-authored handoff (per-agent-handoff
  read, mtime this session, SHORT-chatId match) and SKIP entirely; only synthesize as a true
  last-resort. Closes the reviewer-B "false-armed-on-failed-write" P2. Edit: H:/prism/.claude/helpers/.
- **stop-force-loop-continue RESUME_LOOP append dead** [P1] -- `stop-force-loop-continue.mjs:115-118`
  `findHandoff()` matches `f.includes(sid)` where sid is the FULL UUID but handoffs are keyed by
  SHORT chatId -> always false (CLAUDE.md regression log already flagged this latent). Fix:
  `const shortId = sid.replace(/^claude-/,'').slice(0,8); f.includes('claude-'+shortId)`. Mirrors
  the shipped fix in stop-task-boundary-compact-nudge.mjs (9fcda446a1). $CLAUDE_PROJECT_DIR hook.
- **R6 doctrine absent from project H:/prism/CLAUDE.md** [P2] -- only in global CLAUDE.md. Add a
  4-line R6 forward-ref to §SESSION CONTINUITY STACK so post-compact sessions see it first.
  (CLAUDE.md is high-contention/peer-locked -> use PATCH-SIBLING if blocked.)
- **precompact-handoff silent no-op on <30-char RESUME** [P2] -- `precompact-handoff.mjs:604-608`
  lower floor 30->15 OR guard on PLACEHOLDER not length (subsumed by U3).
- **project settings.json has NO SessionStart auto-resume arms** [P3] -- belt-and-suspenders;
  user-global has all 4 (compact/clear/startup/resume). Idempotent hook -> safe to duplicate.

## REMAINING -- W3 hook/system/context conflicts
- **Duplicate hook wirings** [P2, settings.json C: edit] -- `pre-tool-savings-multi.mjs` wired on
  Glob[10]+Grep[23]+Write[24]+Bash[25] (consolidate to ONE matcher 'Glob|Grep|Write|Bash');
  `token-awareness-sidecar.mjs` on Stop[34]+UserPromptSubmit[27]+PostToolUse[0] (Stop write
  undocumented -- verify before removing). Real per-turn redundant IO. ALSO a token saving (W1).
- **Lane-var redundancy** [P2->downgraded] -- settings.json 44-46 set BOTH `*_ENABLE=1` AND
  `*_DISABLE=1` for MAINTREE_WRITE_BLOCK + GIT_ADD_LANE. NOTE: main-tree-write-block.mjs docstring
  says DISABLE is a kill-switch that "always wins" -> effect is deterministic-OFF, NOT
  non-deterministic (the discovery agent overstated). Cosmetic. Safe cleanup = remove the ENABLE
  keys (keep OFF, matches fleet reality: peers edit shared tree; harness-exec files are separately
  firewalled by hook-cross-worktree-block which IS active). Do NOT remove DISABLE (would re-arm +
  block 8 live peers).
- **compact-interval-warning bypassed knobs** -- DONE (6a394d47ce).
- **stop-close-own-bg-tasks flags Workflow-spawned agent bash as orphans** [P2, NEW] -- observed
  live this session: the Stop hook counted a background Workflow's agent bash processes as
  un-closed orphans and blocked Stop. Real hook-vs-system conflict (Stop hook vs Workflow bg-task
  system). Fix: exempt PIDs whose ancestry is a live Workflow run, or whitelist workflow agent bash.
- **error-memory.json 3 orphan writers** [P2] -- doc-guard (WIRE-EXEMPT comment) until canonical-writer unit.

## REMAINING -- W1 token-savings (savings WITHOUT quality loss)
- **advisory-decay NOT wired to mcp-route-suggest** [P1] -- `backendAuditChain` 4108 fires / 0.07%
  take; `doctrineSurface` 4360 / 0.48%. Wire `decayDecision()` (pattern: ollama-route-pretooluse.mjs:526).
  Verify `PRISM_MCP_ROUTE_SUPPRESS_LOW_TAKE` not 0. Quality-safe (keeps 1-in-20 epsilon probe).
- **advisory-decay NOT wired to grep-index-first** [P2] -- 2121 fires / 0.8% take. Same wire.
- **rtk-adoption-measure** 2872 fires / 0 hits [P2] -- decay-wire or convert to session-start summary.
- **prompt-rewrites dead route** 527 / 0 [P2] -- locate prompt-rewriter-ollama hook; repair or remove the dead suggestion.
- **ollama offload 7.7% vs 30%** -- root cause was qwen2.5-coder:7b deleted (now :32b in route-config);
  classifier is correct for the orchestration-heavy workload. To lift: add inventory/status patterns. Quality risk: conservative word-boundary anchors only.
- **read-auto-limit savedTokens=0** [P3] -- accounting fix in stop-psn-savings-aggregate.mjs.

## REMAINING -- W5 apply X-stanza to all 34 galaxy CLAUDE.md
- 34 files: `H:/prism/mcp-server/src/engines/*/CLAUDE.md`. ALL lack both (A) anti-sycophancy/critic
  stanza and (B) keep-working-until-autocompact stanza. **CORRECT approach (DRY, anti-rot): find the
  galaxy-enrichment generator that injects the shared cross-cutting methodology block into each file
  and add a POINTER stanza THERE, then re-run -> propagates to all 34 from one source.** Do NOT hand-
  append 34 copies (rots). Stanza must be a POINTER to global doctrine (§HONESTY RULES, fact-checker,
  3-of-3 SCRUTINY GATE, R6) -- not a duplicate (engines/CLAUDE.md says "pointers only"). ~8-10 lines.

## REMAINING -- W2 system-efficiency
- SessionStart injector audit (CLAUDE-BRIEF/PSN/BUILD_STATE/CAG-anchor/wiki-tribal x2) -- fires once/session, lower per-turn impact; queued in the MS0 spec.

## Method notes (for the next iteration)
- Harness-exec hooks (`.claude/hooks/*.mjs`) are firewalled from slot worktrees by
  `hook-cross-worktree-block.mjs` (active; bypass = PRISM_CROSS_WORKTREE_BYPASS=1). Edit them from
  the MAIN tree via a node fs patch script (the guard's own "make the change from the main tree"
  path), then commit scoped via `node .claude/helpers/git-commit-mutex.mjs commit --message <m> -- <paths>`.
- ascii-guard blocks non-ASCII in code files -> use `--` not em-dash, `String.fromCharCode(0x2014/0x2013)`
  only to MATCH existing non-ASCII lines. completeness-gate blocks `console.log` in scripts -> use process.stdout.write.
