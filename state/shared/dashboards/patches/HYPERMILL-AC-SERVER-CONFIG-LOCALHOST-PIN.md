# Patch-sibling — HyperMillACServerConfig localhost→127.0.0.1 pinning (P1-3)

> Author: claude-3db3fb3d (slot=echo), 2026-05-20.
> Source: peer-reviewer agent a4553ad14430ed1b4 finding P1-3.

## Finding

`HyperMillACServerConfig.validateACServerConfig` accepts both `"127.0.0.1"`
AND `"localhost"` as valid bind hosts. On some Windows configurations
`localhost` resolves to `::1` (IPv6) while clients connecting to
`127.0.0.1:18365` get ECONNREFUSED. The server claims to be running but is
unreachable from the Python-spawned `prism_ac.ping("127.0.0.1", ...)` call —
silent mismatch.

## Proposed patch

Two options — author's preference is Option A (resolver pin) because it
silently fixes existing callers without breaking the API contract.

### Option A — pin in builder (recommended)

```typescript
// In HyperMillACServerConfig.buildACServerConfig, normalize "localhost" → "127.0.0.1":
export function buildACServerConfig(
  overrides: Partial<ACServerConfig> = {}
): ACServerConfig {
  const requestedHost = overrides.host ?? AC_SERVER_BIND_HOST;
  // Peer-review 2026-05-20 P1-3: "localhost" can resolve to IPv6 ::1 on
  // Windows, mismatching clients that dial 127.0.0.1 explicitly. Pin both
  // canonical loopback strings to the IPv4 literal.
  const host = requestedHost === "localhost" ? "127.0.0.1" : requestedHost;
  return {
    host,
    port:          overrides.port          ?? AC_SERVER_DEFAULT_PORT,
    timeoutMs:     overrides.timeoutMs     ?? AC_SERVER_DEFAULT_TIMEOUT_MS,
    maxConcurrent: overrides.maxConcurrent ?? AC_SERVER_MAX_CONCURRENT,
    cors:          overrides.cors          ?? DEFAULT_AC_CORS_CONFIG,
    mockMode:      overrides.mockMode      ?? false,
    accessLogPath: overrides.accessLogPath ?? null,
  };
}
```

### Option B — reject in validator (breaking change)

Remove `localhost` from the validator's allowed set entirely. Forces callers
to use `127.0.0.1` explicitly. Cleaner but breaks any existing config that
passes `host: "localhost"`.

## Why patch-sibling

- Same multi-chat-peer concerns as the sibling patch
  `HYPERMILL-AC-SCRIPT-EXECUTOR-MOCK-BRANCHES.md`.
- This is a one-line addition + comment in `buildACServerConfig`; minimal risk
  of merge conflict.

## Merge checklist

1. Confirm `HyperMillACServerConfig.ts` is unclaimed.
2. Apply Option A (single-line normalization in `buildACServerConfig`).
3. Add a unit test: `buildACServerConfig({ host: "localhost" }).host === "127.0.0.1"`.
4. Verify: `validateACServerConfig(buildACServerConfig({ host: "localhost" })).length === 0` still passes (the validator still accepts the canonical form).
5. Commit: `[MAIN] [CAD-FUSION-LIVE-MS0]/U-AC-CONFIG-LOCALHOST-PIN: normalize localhost→127.0.0.1`.
6. Delete this patch sibling.

## See also

- Sibling patch: `HYPERMILL-AC-SCRIPT-EXECUTOR-MOCK-BRANCHES.md`
- `mcp-server/src/engines/HyperMillACServerConfig.ts`
- Peer reviewer: agent `a4553ad14430ed1b4`
