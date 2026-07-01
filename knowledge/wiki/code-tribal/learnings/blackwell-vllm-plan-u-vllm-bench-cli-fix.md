# BLACKWELL-VLLM-PLAN/U-VLLM-BENCH-CLI-FIX — [MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-BENCH-CLI-FIX (slot:golf): fix benchmark.mjs Windows CLI-entry guard (main() silently no-op'd)

**Commit:** `f214b3d28685` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T13:33:52-05:00
**Tags:** blackwell-vllm-plan, u-vllm-bench-cli-fix, auto-distilled

## Subject
[MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-BENCH-CLI-FIX (slot:golf): fix benchmark.mjs Windows CLI-entry guard (main() silently no-op'd)

## Body
```
[MAIN] [BLACKWELL-VLLM-PLAN]/U-VLLM-BENCH-CLI-FIX (slot:golf): fix benchmark.mjs Windows CLI-entry guard (main() silently no-op'd)

The entry guard `import.meta.url === \`file://${argv[1].replace(\->/)}\`` builds a
two-slash `file://H:/...` URL, but Node's import.meta.url on Windows is the three-slash
`file:///H:/...` form -> guard always false -> main() never ran -> the VLLM-POC-RUNBOOK
benchmark command produced ZERO output and exit 0 (a silent no-op). Unit tests passed
because they import percentile/aggregate directly, not via the CLI. Fix: canonical
pathToFileURL(argv[1]).href comparison. LIVE-VALIDATED against the running prism-vllm smoke
(Qwen2.5-0.5B on :8020): now emits the [bench] line + JSON, 8/8 ok, 17.2 tok/s.
```

## Files touched (2)
- scripts/vllm-poc/benchmark.mjs | 7 ++++++-
- 1 file changed, 6 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- tile/aggregate directly, not via the CLI. Fix: canonical

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f214b3d28685`
- Milestone envelope: `mcp-server/data/milestones/BLACKWELL-VLLM-PLAN.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._