# CAMX Tool Selection Guide
## Which skills, scripts, hooks, and commands to use at each roadmap task type

Reference this guide at the START of every session to pick the right tools.

---

## BY TASK TYPE

### When BUILDING a new engine:
```
/smart /forge-triple          — sets model + runs engines+skills+hooks pipeline
/forge-engines                — engine discovery to check if similar exists
/prism-review                 — 3-agent review after building
/scrutinize                   — standalone code quality review
/test                         — smart test runner on new engine
```

### When WIRING an engine into a pipeline:
```
/smart                        — set appropriate role
/forge-wiring                 — architecture wiring validator
/trace                        — wiring chain tracer (engine→dispatcher→schema)
/unwired-review               — structured unwired engine triage
/prism-review                 — verify wiring is complete
```

### When WRITING tests:
```
/smart                        — set test engineer role
/forge-tests                  — test gap discovery + generation
/test                         — run tests
/test-speed-feed              — speed/feed gauntlet (if S/F related)
/physics-verify               — cross-pipeline physics consistency
```

### When FIXING physics/formulas:
```
/smart                        — set physics/cutting science role
/physics-verify               — cross-pipeline consistency check
/formula-browse               — browse formula registry
/algorithm-inspect            — inspect algorithm implementation
/calibrate                    — compare to calibration data
/what-if                      — delta analysis across physics models
```

### When AUDITING code quality:
```
/smart                        — set code archaeologist role
/forge-audit                  — codebase quality scan
/forge-drift                  — registry + doc drift detector
/forge-cleanup                — dead code detector
/forge-wiring                 — orphan + phantom detection
/system-audit                 — complete system health check
/forge-types                  — TypeScript type coverage
```

### When TESTING against reference programs:
```
/smart                        — set CNC programmer role for target machine
/print-to-program             — upload print, get program
/program-validate             — G-code verification
/program-gen                  — complete program generator
/cnc-simulate                 — Vericut-class simulation
/auto-speed-feed              — line-by-line S/F optimization
```

### When doing SPEED/FEED work:
```
/smart                        — set cutting science role
/calc                         — quick CNC calculation
/auto-speed-feed              — physics-optimized S/F per line
/test-speed-feed              — exhaustive S/F gauntlet
/spindle-optimize             — harmonic-aware RPM selection
/what-if                      — parameter delta analysis
```

### When doing TOOL SELECTION:
```
/smart                        — set tooling engineer role
/tool-select                  — complete tool selection pipeline
/tool-catalog                 — unified tool database query
/tool-life-max                — squeeze every dollar from tools
/tool-enrich                  — enrich tool database
/wear-analysis                — tool wear + force compensation
```

### When doing MACHINE SELECTION:
```
/smart                        — set process planner role
/machine-check                — validate parameters vs machine limits
/machine-optimize             — full machine utilization analysis
/machine-roi                  — which machine for which jobs
/feasibility-check            — can this part be machined?
```

### When doing QUOTING/COST:
```
/smart                        — set cost analyst role
/quote-job                    — comprehensive manufacturing quote
/estimate                     — quick cost estimate
/cost-optimize                — cost minimization pipeline
/bid-to-win                   — competitive quoting
/roi-analysis                 — upgrade payback calculator
```

### When LEARNING from new sources:
```
/smart                        — set manufacturing researcher role
/pdf-learn                    — document to components pipeline
/video-learn                  — video tutorial to components
/forge-video-watchlist        — process video watchlist batch
/learn-everything             — exhaustive knowledge acquisition
```

### When doing SESSION MANAGEMENT:
```
/startup                      — session initialization
/handoff                      — session continuity
/compact                      — pre-compaction preparation
/roadmap-quality-check        — post-compact quality scrutiny
/checkpoint                   — named context checkpoint
/context                      — context budget inspector
/slim                         — active context optimizer
```

### When doing QUALITY/INSPECTION work:
```
/smart                        — set quality engineer role
/quality-gate                 — full QA pipeline
/quality-check                — shop floor quality workflow
/first-part-right             — zero-scrap first article
/process-health               — instant process physics dashboard
```

---

## ALWAYS APPLY THESE (every session, every task):

```
START:  /startup → /handoff read → /smart /forge-triple
BUILD:  /prism-review after EVERY build (mandatory, no exceptions)
TEST:   /test on affected files after EVERY change
END:    /compact → /roadmap-quality-check (next session)
```

## HOOKS THAT RUN AUTOMATICALLY:
- pretooluse-unified: file routing, safety blocks, output capping
- posttooluse-unified: syntax checks, output compression, build tracking
- auto-approve: read-only + MCP + safe writes
- stop-completion-check: prevent incomplete work
- task-completed-chain: post-completion registration cascade

These fire WITHOUT you calling them. They protect quality silently.
