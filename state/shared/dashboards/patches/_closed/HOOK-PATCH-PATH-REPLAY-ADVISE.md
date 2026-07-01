> **✅ WIRED 2026-06-02 (slot:alpha) commit `378af022e9`.** path-replay-advise.mjs hook placed (verbatim Step-1) + UserPromptSubmit entry spliced into C:+H: settings.json (JSON-verified, after tribal-by-domain-inject). 4 core-lib exports verified; node --check + smoke (continue:true, fail-soft). CLOSED.

# HOOK-PATCH — path-replay-advise (WORKING-PATH-CAPTURE-MS0 / U-WPC-REPLAY-WIRE)

> PATCH-SIBLING for **golf** (or any chat working from the main tree `H:/prism`). The hook file
> `.claude/hooks/path-replay-advise.mjs` + `settings.json` are **harness-exec hard-blocked** from a
> slot worktree (hook drift would silently change fleet behavior), so alpha (slot worktree) built the
> tested LOGIC + this exact placement spec; the mechanical placement must happen from the main tree.
> Author: claude-da9aacf5 slot alpha · 2026-05-31.
>
> **What this wires:** the CONSUMPTION side of working-path capture, for ALL domains at once. On a
> domain chat's UserPromptSubmit, it surfaces the PROVEN working-paths already captured for that chat's
> domain (by `path-derive.mjs` from the shared outcome-bus) so the chat REPLAYS a known-good path
> instead of re-deriving. Advisory-only, fail-soft, throttled 1/slot/10min, never blocks. The logic is
> in `scripts/lib/path-replay-advise-core.mjs` (alpha-shipped, 6 hermetic tests PASS, committed).

## Step 1 — create `H:/prism/.claude/hooks/path-replay-advise.mjs` (verbatim)

```js
#!/usr/bin/env node
// tier: T3 (advisory) — WORKING-PATH-CAPTURE-MS0 / U-WPC-REPLAY-WIRE (alpha logic, golf-placed).
// Thin stdin shim over scripts/lib/path-replay-advise-core.mjs (tested). Surfaces proven working-paths
// for the chat's domain so it replays instead of re-deriving. Advisory, fail-soft, throttled, never blocks.
// Knobs: PRISM_PATH_REPLAY_ADVISE_DISABLE=1 · _TOPK (default 3) · _THROTTLE_MS (default 600000).
import { pathToFileURL } from "node:url";
import { resolveSlot, adviseReplay, formatAdvisory, throttled } from "../../scripts/lib/path-replay-advise-core.mjs";

function emit(p) { process.stdout.write(JSON.stringify(p ?? { continue: true })); process.exit(0); }

async function main() {
  if (process.env.PRISM_PATH_REPLAY_ADVISE_DISABLE === "1") return emit({ continue: true });
  let s = "";
  try { for await (const c of process.stdin) s += c; } catch { /* none */ }
  let env = {};
  try { env = s ? JSON.parse(s) : {}; } catch { env = {}; }
  const sid = env.session_id || env.sessionId || "";
  const slot = resolveSlot(sid);
  if (!slot) return emit({ continue: true });
  const topK = Number(process.env.PRISM_PATH_REPLAY_ADVISE_TOPK) || 3;
  const win = Number(process.env.PRISM_PATH_REPLAY_ADVISE_THROTTLE_MS) || 600000;
  if (throttled(slot, { windowMs: win })) return emit({ continue: true });
  const a = adviseReplay({ slot, topK });
  if (!a) return emit({ continue: true });
  return emit({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: formatAdvisory(a) } });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
```

## Step 2 — verify it (from `H:/prism`)
```bash
node --check .claude/hooks/path-replay-advise.mjs
# smoke: a real session_id with captured paths emits additionalContext; an unknown id emits a bare continue
echo '{"session_id":"da9aacf5"}' | "H:/.claude/bin/portable-node" .claude/hooks/path-replay-advise.mjs
# expect: {"continue":true,...}  (additionalContext present iff that slot's domain has captured working-paths)
```

## Step 3 — wire into `settings.json` UserPromptSubmit chain
Add this entry to the `UserPromptSubmit` hooks array in **`C:/Users/wompu/.claude/settings.json`**
(it auto-mirrors to `H:/.claude/settings.json` via `c-to-h-mirror`). Place it AFTER an existing
advisory inject (e.g. near `tribal-by-domain-inject` / `master-index-precheck-inject`), NOT in
`sessionstart-bundle` (high-contention real estate — individual entry survives bundle churn):
```json
{ "type": "command", "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/path-replay-advise.mjs", "timeout": 3000 }
```

## Step 4 — confirm wiring + commit
```bash
grep -c path-replay-advise "H:/.claude/settings.json"   # → ≥1
node scripts/path-ledger-derive.mjs --since 720h --apply # (optional) populate the ledger so advisories have content
git -C H:/prism add .claude/hooks/path-replay-advise.mjs && git -C H:/prism commit .claude/hooks/path-replay-advise.mjs -m "[<scope>]/U-WPC-REPLAY-WIRE: place path-replay-advise hook (alpha logic) + wire UserPromptSubmit"
```

## Safety / why advisory
A surfaced path may be a DERIVED hypothesis (provenance:"derived", score 0.5) — the advisory shows
provenance so a chat never blindly replays an unproven path; actual replay goes through each domain's
own S(x)/operator gate. Disable fleet-wide with `PRISM_PATH_REPLAY_ADVISE_DISABLE=1`.

Logic + tests: `scripts/lib/path-replay-advise-core.mjs` + `.test.mjs`. Wiki: [[working-path-capture]].
Memory: [[feedback_plot_path_capture_working_path]].
