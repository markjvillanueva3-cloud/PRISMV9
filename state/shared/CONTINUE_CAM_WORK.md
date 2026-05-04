# CONTINUE CAM WORK — Topic-Pinned Resume

**Purpose**: When a fresh chat receives the prompt "continue cam work", read this file FIRST to pick up where the prior session ended. Survives session-ID rotation (per-agent handoffs are session-pinned and unreachable across days).

**Last Updated**: 2026-05-04T19:43Z by `claude-b93f4e4d`
**Branch**: `work/cam-exhaust-ms0`
**Milestone**: CAM-EXHAUST-MS0
**Last Commit**: `ecd554570` — U-CAM-HM-AC-TESTS-01 (ACConnectionManager + ACScriptExecutor — 37 GREEN)

---

## STATE

- HyperMill engine test coverage: **62 of 62 testable HM engines tested** (100%). All in-scope HM engines now have strict-legitimacy vitest coverage. Only HyperMillEDMBridge remains untested — DEFERRED because the engine itself is broken and needs a fix first (see DEFERRED list below). HyperMillSecondaryOpsSequencer was already covered earlier in the milestone (verify: `comm` against `__tests__/HyperMillSecondaryOpsSequencer.test.ts`).
- Latest session shipped: 4 commits, 7 test files, 167 GREEN tests (vitest 4.1.2).
  - `acd48122a` — DataExtractionPipeline + Orchestrator (45 GREEN)
  - `4373e7184` — MillTurnBridge + SchemaUnifier (49 GREEN)
  - `34bd4e311` — PPPBridgeHooks (36 GREEN)
  - `ecd554570` — ACConnectionManager + ACScriptExecutor (37 GREEN)
  - All 4 reviewer PASS, all 4 scrutiny-marked blockCount=0.
- New patterns surfaced this session:
  - **Real TCP probes in tests**: spin up `net.createServer().listen(0, "127.0.0.1")` for happy path; close server before connect for ECONNREFUSED; RFC 5737 `198.51.100.1` for guaranteed-timeout adversarial. No mocks for the network path.
  - **Real subprocess spawn**: use `H:/Tools/python/python.exe` (portable, present per SessionStart hook) gated by `describe.runIf(fs.existsSync(PYTHON_BIN))`. Don't substitute node — `node -c` is syntax-check, not eval (use `-e` instead). Python's `-c` is true script execution, matching the engine's CLI shape.
  - **Timeout SIGTERM tests**: use Python busy-wait (`while time.time() < end: pass`), NOT `time.sleep()` — sleep can absorb signals on Windows.
- Engine quirk surfaced: HyperMillACStandardToolDBEngine §15-16 ships built-in seed catalog when DB path is missing (returns 13 tools, 5 macros). Tests must use `Number.isInteger(x) && x >= 0` structural assertions, NOT `.toBe(0)`, on missing-paths totals.
- New mock pattern: SchemaUnifier composes 6 extractors via Promise.allSettled — vi.mock each singleton's `.extractAll()`/`.extract()` to return realistic shapes; use `mockImplementationOnce(() => Promise.reject(...))` to test individual rejection without aborting the pipeline.
- Prior session shipped: 1 commit, 4 test files, 85 GREEN tests (Metric.cfg + DemoDb + IMDb + DeepLearning).
- Prior session shipped: 1 commit, 4 test files, 127 GREEN tests (AIOrchestration/MultiAxisPhysics/JobMonitor/XmlExtractor)
- Build: PASS as of `780fa4c09`
- Branch is in sync with `origin/work/cam-exhaust-ms0`

---

## RESUME DIRECTIVE

Continue HyperMill test backfill on CAM-EXHAUST-MS0. Pick the **next 3-4 engines** from the queue below, write strict-legitimacy vitest tests, commit as `[CAM-EXHAUST-MS0]/U-CAM-HM-<TOPIC>-TESTS-01: <description>`.

### Procedure

1. **Confirm the queue** — re-run untested-engine diff:
   ```bash
   cd H:/prism/mcp-server
   ls src/engines/HyperMill*.ts | sed 's|src/engines/||;s|.ts$||' | sort > /tmp/eng.txt
   ls src/__tests__/HyperMill*.test.ts | sed 's|src/__tests__/||;s|.test.ts$||' | sort > /tmp/tst.txt
   comm -23 /tmp/eng.txt /tmp/tst.txt
   ```

2. **Check chat bus** — peer claims rotate; some engines below may be claimed by another chat. Look at the system reminder under "Files claimed by OTHER chats" before opening any engine. **NEVER edit a peer-claimed file.** If a target is claimed, drop it and pick the next one.

3. **Claim your files** before writing:
   ```typescript
   prism_context.claim_file({ path: "...", mode: "write", ttlSec: 900, reason: "CAM-EXHAUST-MS0 test backfill" })
   ```

4. **Read each engine fully** (one parallel `Read` per engine in the same message) — capture: class shape, named constants, public API, internal quirks, transitive deps.

5. **Write strict-legitimacy tests** (see RULES below).

6. **Run tests** via portable node (Bash `npx` is unavailable):
   ```bash
   cd H:/prism/mcp-server && "/h/Tools/nodejs/node.exe" "./node_modules/vitest/vitest.mjs" run src/__tests__/<File>.test.ts
   ```

7. **Stage only your test files** (do NOT `git add .` — branch has 6951+ noise changes from peers):
   ```bash
   cd H:/prism && git add mcp-server/src/__tests__/<File1>.test.ts mcp-server/src/__tests__/<File2>.test.ts
   ```

8. **Commit** with conventional message + cumulative coverage line.

9. **Mark scrutiny** (Stop hook will block otherwise):
   - Spawn `Agent({ subagent_type: "reviewer", description: "Review test commit", prompt: "<review prompt>" })`
   - Run `node H:/prism/.claude/scripts/scrutiny-mark.mjs --session-id <session-id> --self --agent --notes "<one-line>"`

10. **Update this file** with the new last-commit hash + coverage stats before `/handoff`.

---

## NEXT BATCH CANDIDATES (priority order — re-check chat bus before opening)

Run the case-sensitive-aware engine-vs-test diff before picking:
```bash
ls src/engines/HyperMill*.ts src/engines/HyperMILL*.ts | sed 's|src/engines/||;s|.ts$||' | sort -u > /tmp/eng.txt
ls src/__tests__/HyperMill*.test.ts src/__tests__/HyperMILL*.test.ts | sed 's|src/__tests__/||;s|.test.ts$||' | sort -u > /tmp/tst.txt
comm -23 /tmp/eng.txt /tmp/tst.txt
```
(Pure `HyperMill*` glob misses `HyperMILL*` files — verified `HyperMILLAutomationBridge.test.ts` was hidden this way.)

Already covered as of `acd48122a` (this session):
- HyperMillDataExtractionPipeline (26 tests)
- HyperMillDataExtractionOrchestrator (19 tests)

Already covered earlier (do NOT re-test):
- HyperMILLAutomationBridge (pre-existing Apr 19 test, uses legacy `.toBeDefined()` — leave alone)
- HyperMillDeepLearningEngine, HyperMillDemoDbExtractor, HyperMillIMDbExtractor, HyperMillMetricCfgExtractorEngine

---

## DEFERRED / AVOID

| Engine | Reason |
|---|---|
| HyperMillACConnectionManager | Peer claimed (rotating) |
| HyperMillACScriptExecutor | Peer claimed (rotating) |
| HyperMillPPPBridgeHooks | Peer claimed (rotating) |
| HyperMillEDMBridge | Engine broken — needs eng fix first |
| HyperMillMillTurnBridge | Transitive tungaloy ENOENT — `vi.mock("../engines/ToolCatalogEngine.js", () => ({ toolCatalogEngine: { search: () => [] } }))` works as workaround |
| HyperMillSecondaryOpsSequencer | Peer-claimed in prior sessions |
| HyperMillSchemaUnifier | Depends on 5 extractors — defer until extractors are tested |

---

## STRICT LEGITIMACY RULES (test-legitimacy.mjs hook enforces)

**These are hard blocks** — the Write tool will reject the test file if violated.

1. **NO `toBeDefined()` or `toBeUndefined()`** — both flagged as "weak presence-only assertion".
   - For undefined: `expect(x).toBe(undefined)`
   - For defined: assert a concrete property: `expect(x.field).toBe(...)` (TS non-null assertion handles unwrapping)
2. **NO `expect(typeof x).toBe("string")`** alone — pair with substring/regex matcher.
3. **NO `.skip()` or `.skipIf()`** — fix the test or delete it.
4. **NO magic numbers in assertions** — extract to named constants at top of file:
   ```typescript
   const BUILTIN_TOOL_COUNT = 8;
   const SUPPORTED_GEOMETRY_CLASSES = 29;
   ```
5. **Coverage shape per file**:
   - Class shape (constructor + singleton + prototype methods)
   - Happy path (concrete values asserted)
   - **≥3 failure modes** (bad input, boundary, resource exhaustion)
   - **≥2 adversarial inputs** (NaN, Infinity, empty, oversize, special chars)
6. **Real fs round-trips** — use `os.tmpdir() + fs.mkdtempSync` in `beforeEach`, recursive cleanup in `afterEach` with try/catch.
7. **Real assertions on engine output** — never `expect(result).toEqual({})` against a stub.

## BUILD ENFORCEMENT (auto-injected on every prompt)

- **Coverage floor**: happy + ≥3 failure + ≥2 adversarial
- **Variability floor**: if domain has N configs (materials, dialects, etc.), exercise ≥3
- **Wiring verification**: confirm dispatcher schema/enum/lazy-import all match
- **Round-trip**: a test must invoke through the dispatcher, not only the engine singleton (when wired)

---

## ENGINE QUIRKS DOCUMENTED FROM PRIOR TESTS (DO NOT RE-DERIVE)

| Quirk | Workaround |
|---|---|
| Empty/whitespace queries fuzzy-match material catalog | Assert structural shape regardless of `found`; document in test comment |
| `ToolCatalogEngine` import fails on missing tungaloy-turning.json | `vi.mock("../engines/ToolCatalogEngine.js", () => ({ toolCatalogEngine: { search: () => [] } }))` |
| Truncation cuts at first space, not at boundary | Regex must match `X+` only, not `X+ Y+` |
| Material aliases `co-cr` not handled | Engine only matches contiguous `cocr` or `cobalt_chrome`; assert null for hyphenated |
| NL controller hint precedence | `op.post_name` wins over `params.post_processor` in batch ops |
| `0.0.0.0` ACServerConfig host triggers security violation | Validation message: "host must be 127.0.0.1 (loopback only)" |
| G43.4 → `5axis_rtcp` motion type (NOT dwell) | Critical PPP classification |
| TRAORI Siemens 840D is passthrough block | Excluded from rpm/feed/RTCP validation |
| HyperMill sub-program markers: `% SUB-PROGRAM-START: <name>` | Regex split, dialect-specific LBL handling not yet implemented |

---

## PEER-CLAIM AVOIDANCE (active at session end 2026-05-04T02:05Z)

These chats run in their own worktrees — generally safe but cross-claims happen:

- `claude-12483457` — Hurco / WEDM seal work (`HurcoV11MillMasterPostEngine`, `prism-wedm-seal/` worktree)
- `claude-3d60920a` — Cross-process speed/feed bridge (`prism-cad-sw-fidx/` worktree)
- `claude-a051d8e9` — HyperMill turning + camDispatcher (Wedm-OmCycles tests landed today)
- `claude-8a05e2b0` — Drift detection (`prism-iooms0/` worktree)
- `claude-0913e8cf` — TurningProfileEngine (`prism-lathe-prod-ready/` worktree)

**Always re-check the chat bus "Files claimed by OTHER chats" section before editing.**

---

## REFERENCE — PRIOR COMMITS (today, work/cam-exhaust-ms0)

```
780fa4c09  Metric.cfg + DemoDb + IMDb + DeepLearning (85 GREEN)                     [latest]
eae9cc998  AIOrchestration + MultiAxisPhysics + JobMonitor + XmlExtractor (127 GREEN)
e13b1107b  PPPFileWriter + ACStandardToolDBEngine tests (89 GREEN)
920f082b4  OmCyclesExtractor wiring + 20-test suite                        [peer]
e818affe7  TurningConfigIngesterEngine wiring + 7 dispatcher tests         [peer]
1de57e6fd  SkillsBatchEngine dispatcher wiring                             [peer]
43cfeca42  config/skills/KB/PPP test coverage (4 engines, 149 tests)       [prior]
68c426862  pipeline/macro/codegen test coverage (3 engines, 115 tests)     [prior]
6f675958a  registry/medical/PPP engines (4 engines, 117 tests)             [prior]
4b16738de  cycle/export/physics engines (4 engines, 123 tests)             [prior]
fffcedba6  4 catalog/hook engines (110 tests)                              [prior]
3776e5f45  SafetyHooks + MultiAxisEngine (2 engines, 82 tests)             [prior]
fc8d232ca  FAIBridge + SPCBridge (2 engines, 78 tests)                     [prior]
```

---

## ESCAPE HATCH

If everything in the queue is peer-claimed or blocked, pivot to:
1. Run `prism_dev:capability_census` to find dark engines elsewhere
2. Check `state/shared/AGENT_WORKBOARD.md` for explicit asks from user/other agents
3. Run `prism_dev:quality_dashboard` and target any engines below Q=0.70

If unsure, do NOT make up work — ask the user.
