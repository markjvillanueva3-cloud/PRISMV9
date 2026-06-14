---
name: jsonl-ledger-conventions
category: software-engineering
domain: backend-dev
tags: [jsonl, json, ledger, telemetry, state-store, append-only, rotation, schema-version, prism-development]
last_updated: 2026-05-19
---

# JSONL Ledger Conventions — append vs replace, rotation, multi-host

PRISM persists durable state in two file shapes: **JSONL ledgers** (one JSON object per line, append-only event logs) and **JSON state files** (single object, replace-on-write). The two have different concurrency, rotation, and read patterns. Picking the wrong one is how you get corrupt state mid-write or telemetry files that grow without bound. This wiki names the decision rule, the schema-version convention, the canonical 512 KB rotation threshold, the per-host suffix pattern, the atomic-write requirement for JSON-replace files, and the reader-while-writer concurrency patterns.

## The picking rule — one sentence

**Use JSONL when adding a new event leaves prior events untouched; use JSON when the file is the current state of something singular.**

- `AGENT_CHAT.jsonl` — every chat message is its own event. Past messages don't change. JSONL.
- `loop-state/loop-<sid>.json` — there's one loop state per session; updating it means replacing the whole object. JSON.
- `fleet-memory-history.jsonl` — every sweep produces an event. JSONL.
- `slot-task-claims.json` — there's one current claim map. JSON.

When in doubt, ask: *"do I want to append a NEW thing, or update the SINGLE existing thing?"*

## JSONL ledgers — the canonical conventions

### Format

```jsonl
{"schemaVersion":"1.0.0","createdAt":"2026-05-19T00:00:00Z","hostId":"DESKTOP-X"}
{"ts":"2026-05-19T00:00:05Z","actor":"claude-396bc735","event":"sweep_started","details":{...}}
{"ts":"2026-05-19T00:00:08Z","actor":"claude-396bc735","event":"sweep_completed","details":{...}}
```

- **One JSON object per line.** No multi-line objects. No nested newlines (escape as `\n`).
- **First line is the header** with `schemaVersion` + `createdAt` (+ optional `hostId`, `purpose`, `rotatedFrom` if applicable).
- **Every event line carries `ts`** (ISO 8601 UTC) so consumers can window-filter without re-parsing for time.
- **Append-only.** Never overwrite or edit existing lines; emit a tombstone event if you need to mark something invalid.

### Append semantics

```javascript
// Atomic-ish append — single fs.appendFileSync call
import { appendFileSync } from "node:fs";
appendFileSync(
  "state/shared/.my-ledger.jsonl",
  JSON.stringify(event) + "\n"
);
```

Single-write append is atomic at the OS level on Windows + POSIX (for writes under PIPE_BUF, typically 4 KB). Larger events: write to a temp file + concat OR accept the race (rare for JSONL events).

**Don't `readFile → mutate array → writeFile`.** That's the JSON-replace pattern in disguise; it loses every event that landed between read and write.

### Rotation — the 512 KB canonical

When a JSONL ledger crosses **512 KB**, rotate it:

```
my-ledger.jsonl          → my-ledger.jsonl.rotated-<timestamp>
                       (new empty my-ledger.jsonl with fresh header)
```

512 KB is the PRISM convention (used by `fleet-memory-history.jsonl` per CLAUDE.md §FLEET-MEMORY-MONITOR-MS0). Tune up for events that need long retention (a 5 MB ledger covers ~50K compact events at 100B each). Tune down only when storage is genuinely scarce.

Rotation pattern: rename atomically (file becomes invisible to active readers tracking the old inode briefly, but most consumers scan freshly each read). The rotated archives can be gzipped after a week.

### Per-host suffix — multi-PC fleets

When a ledger may be written by processes on multiple PCs sharing a path (e.g. via cloud-synced drive), append a host suffix:

```
.fleet-reaper-enum-cache-<hostname>.json
fleet-memory-history-<hostname>.jsonl
```

Without the suffix, two PCs ping-pong overwriting each other's writes. CLAUDE.md §FLEET-REAPER-MS2 (U-FR-S2) shipped the canonical pattern.

If the ledger is per-machine-only (Windows scheduled tasks each writing locally), no suffix needed. If ANY chance of cross-machine writes — suffix.

### Schema migration

Bump `schemaVersion` on the header line when fields change. Reader pattern:

```javascript
const header = JSON.parse(firstLine);
if (header.schemaVersion === "1.0.0") { /* original shape */ }
else if (header.schemaVersion === "2.0.0") { /* new shape */ }
else throw new Error(`Unknown schemaVersion: ${header.schemaVersion}`);
```

Back-compat: support N-1 versions per CLAUDE.md §SCHEMA VERSIONING. When you must break, write a one-shot migration script that reads the old ledger and emits a new one with the bumped schema header.

### Reading patterns

- **Tail-N** (most recent events): `tail -n N file.jsonl | jq -s .`
- **Window-by-time**: stream, parse line-by-line, filter by `ts`. Don't `readFile` for large ledgers.
- **Full scan + aggregate**: same streaming pattern; close the file handle.
- **Watch-for-new**: `tail -f` semantics + line buffer. The PRISM Monitor tool does this.

For ledgers > 5 MB, always stream — `JSON.parse(readFileSync(path))` is wrong shape anyway (it's not an array), and `readFileSync` of a large file blocks the event loop.

## JSON state files — the replace-on-write convention

When the file is one current object (config, claim map, dashboard snapshot), replace atomically:

### Atomic write pattern

```javascript
import { writeFileSync, renameSync } from "node:fs";
import { randomBytes } from "node:crypto";

const tmp = `${path}.tmp-${process.pid}-${randomBytes(4).toString("hex")}`;
writeFileSync(tmp, JSON.stringify(state, null, 2));
renameSync(tmp, path);  // atomic on POSIX + Windows NTFS
```

The `<tmp>` suffix is **per-PID + random** (NOT a fixed `.tmp` suffix). Reason: two concurrent writers using `.tmp` clobber each other's temp file → one rename succeeds, the other writes its temp on top, and the rename loses one writer's data ([[reference_roadmap_index_writer_consolidate_2026_05_19]] — five writers hit this with a fixed `.tmp` suffix, fix shipped via `scripts/lib/atomic-json.mjs`).

Use the shared lib:

```javascript
import { atomicWriteJson } from "scripts/lib/atomic-json.mjs";
atomicWriteJson(path, state);  // throws-before-write + orphan-temp cleanup
```

### Lockfile coordination — concurrent RMW

When multiple processes may read-modify-write the same JSON state simultaneously (slot-task-claims, chat-slots, etc.), wrap with a lockfile:

```javascript
import { withLock } from "scripts/lib/lockfile.mjs";

await withLock(`${path}.lock`, async () => {
  const current = readJsonOr(path, defaultState);
  const next = mutate(current);
  atomicWriteJson(path, next);
});
```

Lockfile pattern: try to create `<path>.lock` with `O_EXCL`; if it exists, sleep + retry with timeout. Unlock by deleting. Stale-lock cleanup: a lock owned by a dead PID can be reaped after N seconds.

### When NOT to use a lockfile

- Single-writer file (a script that runs only from a scheduled task with PID lockfile already) → no inner lock needed.
- Append-only JSONL → use `appendFileSync` not lockfile (lockfile is for RMW).
- Read-only consumers → no lock needed (atomic rename ensures consistent reads).

### Pretty-print vs compact

```javascript
// ❌ Pretty-print on a ~MB+ object on a memory-pressured host
writeFileSync(path, JSON.stringify(state, null, 2));  // 2x size, slow

// ✓ Compact for large structures
writeFileSync(path, JSON.stringify(state));
```

Past ~10 MB, pretty-print crosses V8's `Invalid string length` cap (~512 MB max string). The U-SEED-GHOST-COMPACT fix ([[reference_seed_ghost_v8_string_cap]]) shipped this for the ~390 MB system-graph.json: pretty-print was OOM-blinding the regen pipeline.

Rule: pretty-print only when the file is small (<1 MB) AND meant to be human-readable (config, manifest). State files used by code path get compact.

## The decision rule — JSON or JSONL — worked examples

| File | Shape | Why |
|---|---|---|
| `AGENT_CHAT.jsonl` | JSONL | events accumulate |
| `state/shared/MILESTONE_PROGRESS.json` | JSON | one current state |
| `state/shared/.fleet-reaper-actions.jsonl` | JSONL | every action is an event |
| `state/shared/chat-slots.json` | JSON | one current map |
| `mcp-server/data/state/error-memory.jsonl` | JSONL | every error is an event |
| `state/shared/slot-task-claims.json` | JSON | one current claim map |
| `state/shared/loop-state/loop-<sid>.json` | JSON | one state per loop session |
| `state/shared/high-roi-skill-history.jsonl` | JSONL | every audit run is an event |
| `state/shared/system-viz/system-graph.json` | JSON | the current graph snapshot |
| `mcp-server/data/state/ollama-offload-stats.json` | JSON | one totals + last-N events |

The ollama-offload-stats is an interesting hybrid — it's JSON (current totals snapshot) but holds a recent-events array internally. Pattern: when you need *both* "current totals" and "last N events," use JSON with a bounded events array (slice to N on every update). Don't try to make JSONL store totals.

## Anti-patterns

- **JSON file with `readFile → push → writeFile`** without a lockfile → concurrent writers lose events. Convert to JSONL append OR add a lockfile.
- **Fixed `.tmp` suffix for atomic-write JSON** → two concurrent writers clobber. Use per-PID + random suffix or `scripts/lib/atomic-json.mjs`.
- **JSONL with no schemaVersion header** → can't migrate when shape changes; readers have to guess.
- **JSONL with multi-line JSON objects** → breaks line-by-line streaming; entire file becomes one parse-or-fail unit.
- **Pretty-printed JSON at multi-MB scale** → 2x storage, slow writes, possible V8 string-cap crash at ~400 MB.
- **No size-rotation on append-only JSONL** → unbounded growth; eventual reader OOM on full scan.
- **Per-event schemaVersion on every line** → 90% wasted bytes vs header convention. The header carries it once.
- **JSON file shared across PCs without per-host suffix** → cross-PC ping-pong overwriting.
- **Editing past JSONL events to "fix" them** → corrupts the audit trail. Append a tombstone or correction event instead.
- **Tail-N pattern via `JSON.parse(readFileSync(...))`** → tries to parse JSONL as one JSON; throws SyntaxError on line 2.

## Checklist — every new state/ledger file

- [ ] Right shape: JSONL (events accumulate) vs JSON (current single state)?
- [ ] If JSONL: header line with `schemaVersion` + `createdAt`?
- [ ] If JSONL: every event line has a `ts`?
- [ ] If JSONL: size-rotation at 512 KB (or justified other threshold)?
- [ ] If JSON: atomic write via `atomicWriteJson()` or per-PID `.tmp` suffix?
- [ ] If JSON + concurrent writers: lockfile wrap?
- [ ] If multi-PC: per-host suffix?
- [ ] Pretty-print only if small + human-readable; compact otherwise?
- [ ] Reader pattern documented (tail-N, window-by-time, full-scan)?
- [ ] Schema bump rule documented for future migrations?

## Verification — diagnose a corrupt-state issue

```bash
# Is the file JSONL or JSON?
head -1 path/to/file | jq -e .schemaVersion >/dev/null && echo "JSONL header" || echo "not JSONL header"

# Validate every JSONL line:
awk 'NR>0 {print NR, $0}' path/to/file.jsonl | while read n line; do
  echo "$line" | jq -e . >/dev/null || echo "INVALID line $n"
done

# Find writers of a contested path:
grep -lE "writeFileSync.*<filename>" scripts/**/*.mjs scripts/lib/*.mjs

# Find which writers use atomicWriteJson vs raw writeFileSync:
grep -l "atomicWriteJson" scripts/**/*.mjs
```

A path with >2 raw `writeFileSync` callers AND no lockfile coordination is the canonical race-corruption recipe (per [[reference_roadmap_index_writer_consolidate_2026_05_19]] — 5 writers, 3 with fixed `.tmp` suffix).

## Related

- [[atomic-write-idempotency-patterns]] — the broader atomic-write doctrine
- [[fleet-coordination-discipline]] — cross-process state coordination (the runtime layer)
- [[reference_roadmap_index_writer_consolidate_2026_05_19]] — 5-writer `.tmp`-clobber lesson + `scripts/lib/atomic-json.mjs`
- [[reference_seed_ghost_v8_string_cap]] — pretty-print at multi-MB hits V8 string cap
- [[reference_fleet_reaper_ms2_2026_05_18]] — per-host enum-cache suffix (U-FR-S2)
- [[fail-loud-r12-patterns]] — what to do when state-write fails (NOT swallow)
- CLAUDE.md §SCHEMA VERSIONING — back-compat N-1 promise
- `scripts/lib/atomic-json.mjs` — the canonical atomic-write helper
- `scripts/lib/lockfile.mjs` — the canonical lockfile wrapper
