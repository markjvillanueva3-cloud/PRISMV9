---
name: reference-configengine-export-secrets-bug-2026-05-21
description: 2026-05-21 kilo iter 3 — found ConfigEngine.exportConfig(true) is a silent no-op for unredacted secrets; iterates through getAll() which always redacts. Anti-regression test pinned to current (broken) behavior; fix is one-line.
aliases: reference_configengine_export_secrets_bug_2026_05_21
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.070Z
---


# ConfigEngine.exportConfig(includeSecrets=true) — silent no-op for unredacted secrets

**Discovered:** 2026-05-21, slot kilo /loop iter 3 (U-WIRE-CONFIG-ENGINE), while writing the companion test for the prism_infra wiring.

## The bug

`H:/prism/mcp-server/src/engines/ConfigEngine.ts` lines 190-196:

```ts
exportConfig(includeSecrets: boolean = false): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const entry of this.getAll()) {   // ← BUG: getAll() always redacts secrets
    result[entry.key] = entry.secret && !includeSecrets ? "***REDACTED***" : entry.value;
  }
  return result;
}
```

`getAll()` at line 114 already redacts every secret's `value` to `"***REDACTED***"` before pushing into the result:

```ts
result.push(entry.secret ? { ...entry, value: "***REDACTED***" } : entry);
```

So when `exportConfig(true)` is called and tries `entry.value` for a secret entry, it gets the string `"***REDACTED***"` — never the underlying value. The `includeSecrets=true` branch is reachable but does nothing useful.

## Repro

```ts
configEngine.set("DB_PASS", "hunter2", "env", { secret: true });
configEngine.exportConfig(true).DB_PASS;     // → "***REDACTED***" (BUG: expected "hunter2")
configEngine.getWithMeta("DB_PASS")?.value;  // → "hunter2" (write is correct; only export is broken)
```

## Fix (one-line, NOT applied in this iteration per drift discipline)

Iterate `this.entries` directly instead of going through redacting `getAll()`:

```ts
exportConfig(includeSecrets: boolean = false): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of this.entries.keys()) {
    const entry = this.getWithMeta(key);          // returns non-redacted source
    if (!entry) continue;
    result[key] = entry.secret && !includeSecrets ? "***REDACTED***" : entry.value;
  }
  return result;
}
```

`getWithMeta` does NOT redact (returns the raw highest-priority `ConfigEntry`), so this fix correctly honors `includeSecrets`. Anti-regression test for both branches lives in `ConfigEngine.test.ts` under the `exportConfig — secret-handling policy` block.

## Why not fixed in this iteration

The /loop /goal is wiring unwired engines, not engine remediation. Per [[feedback_autonomous_loop_drift_discipline]] ("cap anomaly investigation at ≤1 extra tick, record a memory, return to the loop's stated purpose"), I:
- documented the bug here,
- encoded the current (broken) behavior as a `[BUG-ANTI-REGRESSION]` test so the bug is visible in the suite + tests still pass,
- flagged the fix as one-line so the next chat that does a ConfigEngine-touching unit can land it,
- returned to the wiring task.

## Where to find it

- Engine: `mcp-server/src/engines/ConfigEngine.ts:190-196`
- Test (anti-regression): `mcp-server/src/__tests__/ConfigEngine.test.ts` (search `[BUG-ANTI-REGRESSION]`)
- Wiring (no change required when fixed): `mcp-server/src/tools/dispatchers/infraDispatcher.ts` `case "config_export"` — already passes `include_secrets` through.

## Related

- The wiring exposes `config_export` to MCP clients with `include_secrets: z.boolean().optional()`. Until the engine fix lands, `config_export` with `include_secrets=true` is a silent no-op for secret keys — clients calling it expecting unredacted values will silently get redacted ones. **R12 ambient violation.**
- Worth pairing the fix with a one-line CLAUDE.md `## Recent regressions` entry when shipped.
