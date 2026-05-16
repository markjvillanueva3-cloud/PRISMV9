/**
 * AtomicClaimBrokerEngine
 *
 * Atomic Compare-And-Swap claim broker for cross-terminal coordination.
 * Extends PRISM's existing coordination system with:
 *   - Atomic CAS claim acquisition using temp+rename
 *   - Optimistic concurrency control via a registry version field (CAS-on-write)
 *   - Read-side checksum verification (drops tampered claims + writes to a JSONL
 *     tamper ledger sibling to the claims file)
 *   - Single-call claim API (fuses duplication-check + claim-acquire)
 *   - Zombie reaper for agents stuck in 'compacting' state >600s
 *   - Deadlock detection via claim-graph cycle check
 *   - Monotonic claim sequence numbers
 *   - Relative-TTL for clock-drift tolerance
 *
 * @unit AI-AWARE-HARDEN/U-AWR25
 * @unit COORD-MS0/U-COORD02 — optimistic locking with version field
 * @unit COORD-MS0/U-COORD12 — checksum verification on read
 * @integrates H:/prism/.claude/helpers/agent-coordination-daemon.mjs
 *
 * // WIRE-EXEMPT: internal coordination broker. Consumed by the JS helper
 * //   layer (H:/prism/.claude/helpers/chat-slots.mjs + agent-coordination.mjs +
 * //   agent-coordination-daemon.mjs) which read/write the same registry file
 * //   (state/shared/ATOMIC_CLAIMS.json) at hook/helper runtime — those mjs
 * //   wrappers are the public surface, not an MCP dispatcher. HONEST RESIDUAL:
 * //   the helpers currently do direct fs.readFileSync/writeFileSync round-trips
 * //   and bypass the CAS shipped in U-COORD02 — closing that is a separate
 * //   COORD-MS0 follow-up unit (route helpers through this engine for CAS
 * //   protection across the chat fleet).
 */

import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// ============================================================================
// Schemas
// ============================================================================

const ClaimSchema = z.object({
  id: z.string(),
  resource: z.string(),
  holder: z.string(),
  holderPid: z.number(),
  acquiredAt: z.string(),
  expiresAt: z.string(),
  ttlMs: z.number(),
  sequenceNumber: z.number(),
  state: z.enum(["active", "compacting", "releasing", "zombie"]),
  checksum: z.string(),
});

const ClaimRegistrySchema = z.object({
  schemaVersion: z.literal(1),
  claims: z.array(ClaimSchema),
  sequenceCounter: z.number(),
  // Optimistic-locking version counter. Optional in the schema so registry
  // files written before U-COORD02 (no `version` key) still parse; readRegistry
  // normalizes a missing/invalid value to 0.
  version: z.number().optional(),
  lastReapedAt: z.string().optional(),
  zombieCount: z.number().optional(),
});

// ============================================================================
// Types
// ============================================================================

interface Claim {
  id: string;
  resource: string;
  holder: string;
  holderPid: number;
  acquiredAt: string;
  expiresAt: string;
  ttlMs: number;
  sequenceNumber: number;
  state: "active" | "compacting" | "releasing" | "zombie";
  checksum: string;
}

interface ClaimRegistry {
  schemaVersion: 1;
  claims: Claim[];
  sequenceCounter: number;
  /** Optimistic-locking version. Always present post-readRegistry normalization. */
  version: number;
  lastReapedAt?: string;
  zombieCount?: number;
}

interface ClaimResult {
  success: boolean;
  claim?: Claim;
  error?: string;
  conflictingHolder?: string;
  suggestedAction?: "wait" | "steal" | "abort";
}

interface ReapResult {
  reaped: number;
  zombiesFound: string[];
  cyclesDetected: string[][];
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CLAIMS_FILE = "H:/prism/state/shared/ATOMIC_CLAIMS.json";
const DEFAULT_TTL_MS = 180000; // 3 minutes
const COMPACTING_ZOMBIE_THRESHOLD_MS = 600000; // 10 minutes
const ACTIVE_ZOMBIE_THRESHOLD_MS = 300000; // 5 minutes
const COMMIT_RETRY_ATTEMPTS = 3;

// ============================================================================
// Optimistic locking (U-COORD02)
// ============================================================================

/**
 * Thrown by atomicWrite when the on-disk registry version no longer matches the
 * version the caller read — i.e. a concurrent writer committed in between. The
 * caller's retry loop catches this, re-reads, recomputes, and re-writes.
 */
export class StaleRegistryError extends Error {
  readonly expectedVersion: number;
  readonly actualVersion: number;

  constructor(expectedVersion: number, actualVersion: number) {
    super(
      `Stale registry write rejected: caller read version ${expectedVersion}, ` +
        `on-disk version is now ${actualVersion} (a concurrent writer won the race)`
    );
    this.name = "StaleRegistryError";
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

/**
 * Pure compare-and-swap decision for the registry version field.
 *
 * A write is permitted only when the version currently on disk equals the
 * version the caller read before computing its update. Any inequality means a
 * concurrent writer committed in between, so the caller's update was computed
 * against stale state and must be rejected (then retried). Callers normalize
 * both versions via normalizeVersion() before this check, so a corrupt
 * non-numeric on-disk version has already been coerced to 0.
 *
 * @param currentVersion  version read from disk at write time
 * @param expectedVersion version the caller read before computing its update
 * @returns `{ ok: true }` to allow the write, `{ ok: false, reason }` to reject
 */
export function casVersionCheck(
  currentVersion: number,
  expectedVersion: number
): { ok: boolean; reason?: string } {
  if (currentVersion !== expectedVersion) {
    return {
      ok: false,
      reason: `stale write: on-disk version ${currentVersion} != expected ${expectedVersion}`,
    };
  }
  return { ok: true };
}

/**
 * Normalize an untrusted version value read from disk to a non-negative integer.
 * Missing (undefined) -> 0; negative or fractional -> floored to a sane integer.
 */
export function normalizeVersion(raw: number | undefined): number {
  const n = Math.trunc(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Resolve the claims-registry file path. Honors the PRISM_ATOMIC_CLAIMS_FILE
 * env override (read per call, after module load) so tests can point the broker
 * at a throwaway temp file instead of unlinking the live fleet registry.
 *
 * The override is gated by defense-in-depth: it is honored only when the
 * process is in a known test runtime (NODE_ENV === "test" OR vitest's VITEST
 * env set) AND the override path resolves under the OS temp directory. A
 * leaked env var from a forgotten shell export, a CI job that bled into a
 * deploy job, or a copy-pasted debug command must NEVER silently redirect the
 * live fleet registry to a stray location.
 */
function resolveClaimsFile(): string {
  const override = process.env.PRISM_ATOMIC_CLAIMS_FILE;
  if (!override || override.length === 0) {
    return DEFAULT_CLAIMS_FILE;
  }
  const inTestRuntime =
    process.env.NODE_ENV === "test" || !!process.env.VITEST;
  if (!inTestRuntime) {
    return DEFAULT_CLAIMS_FILE;
  }
  // Directory-containment check (NOT a bare string-prefix test) — a sibling
  // directory whose name shares the tmp prefix (e.g. ".../Temp-evil/foo") must
  // not slip through. Requires `tmpRoot` itself OR `tmpRoot + path.sep` as a
  // prefix. `path.resolve` already collapses `..` segments, so traversal
  // attacks like "/tmp/../etc/passwd" land outside tmpRoot and are rejected.
  const tmpRoot = path.resolve(os.tmpdir());
  const resolvedOverride = path.resolve(override);
  const insideTmp =
    resolvedOverride === tmpRoot ||
    resolvedOverride.startsWith(tmpRoot + path.sep);
  if (!insideTmp) {
    return DEFAULT_CLAIMS_FILE;
  }
  return override;
}

// ============================================================================
// Checksum integrity (U-COORD12)
// ============================================================================

/**
 * Compute the integrity checksum for a claim. SHA-256 over a deterministic
 * canonical form `id:resource:holder:sequenceNumber`, truncated to 16 hex chars
 * (64 bits). Single source of truth for both generation (when a claim is
 * created) and verification (when the registry is read). Exported for testing —
 * production callers go through the class.
 *
 * NOTE — this is INTEGRITY-against-bit-rot/accidental-corruption, not
 * cryptographic authenticity: no secret is involved, so a motivated attacker
 * who knows the schema can forge a matching checksum trivially. The intent is
 * to detect (a) JSON file corruption, (b) third-party tools mutating fields
 * without re-computing the checksum — e.g. zombie-reaper-daemon.mjs is a known
 * bypass surfaced by verifyChecksum into the tamper log.
 */
export function computeClaimChecksum(
  claim: { id: string; resource: string; holder: string; sequenceNumber: number }
): string {
  const data = `${claim.id}:${claim.resource}:${claim.holder}:${claim.sequenceNumber}`;
  return crypto.createHash("sha256").update(data).digest("hex").slice(0, 16);
}

export interface ChecksumVerifyResult {
  readonly ok: boolean;
  readonly computed: string;
  readonly stored: string;
}

/**
 * Verify a claim's stored checksum matches a fresh recomputation. Pure — does
 * NOT mutate the claim, does NOT do I/O. Safe to call on attacker-controlled
 * input: each field is stringified into the hash input verbatim, and the hash
 * itself is unkeyed, so there is no oracle the input could exploit. Treat
 * `ok=false` as "drop or quarantine this claim, log to tamper ledger".
 *
 * Accepts a structural subtype so tests can pass plain objects without
 * constructing the full Claim type.
 */
export function verifyChecksum(claim: {
  id: string;
  resource: string;
  holder: string;
  sequenceNumber: number;
  checksum: string;
}): ChecksumVerifyResult {
  const computed = computeClaimChecksum(claim);
  const stored = typeof claim.checksum === "string" ? claim.checksum : "";
  return { ok: computed === stored, computed, stored };
}

/**
 * Resolve the JSONL tamper-event ledger path. Derived from resolveClaimsFile()
 * so the test-injection seam from U-COORD02 composes — a test that points the
 * broker at a tmpdir registry gets its tamper log in the same tmpdir.
 */
function resolveTamperLogPath(): string {
  const claimsFile = resolveClaimsFile();
  return path.join(
    path.dirname(claimsFile),
    `${path.basename(claimsFile)}.tamper.jsonl`
  );
}

// ============================================================================
// Engine Class
// ============================================================================

class AtomicClaimBrokerEngine {
  private static instance: AtomicClaimBrokerEngine;
  private readonly hostname: string;
  private readonly pid: number;

  private constructor() {
    this.hostname = os.hostname();
    this.pid = process.pid;
  }

  static getInstance(): AtomicClaimBrokerEngine {
    if (!AtomicClaimBrokerEngine.instance) {
      AtomicClaimBrokerEngine.instance = new AtomicClaimBrokerEngine();
    }
    return AtomicClaimBrokerEngine.instance;
  }

  /**
   * Generate unique holder ID for this terminal
   */
  private getHolderId(): string {
    const sessionId = process.env.CLAUDE_SESSION_ID ?? `session-${this.pid}`;
    return `${sessionId}-${this.hostname}`;
  }

  /**
   * Generate checksum for claim integrity. Delegates to the exported pure
   * helper so generation and verification share one source of truth — any
   * drift would silently invalidate every claim on next read.
   */
  private generateChecksum(claim: Omit<Claim, "checksum">): string {
    return computeClaimChecksum(claim);
  }

  /**
   * Read claims registry with fallback. Post-U-COORD12 every claim's stored
   * checksum is verified against a fresh recomputation; mismatches are DROPPED
   * from the returned registry and appended to the JSONL tamper ledger.
   *
   * Fail-open by design: a corrupted/tampered claim must NOT brick the registry
   * for the rest of the fleet. Operators audit the tamper log out-of-band. The
   * dropped claims are also removed from the persisted state on the first write
   * that follows (atomicWrite serializes whatever readRegistry returned), so
   * detection self-heals — but only for claims read through this engine. The
   * pre-existing zombie-reaper-daemon.mjs bypass (writes that mutate fields
   * without re-computing the checksum) is exactly what verifyChecksum is
   * designed to surface here — every such claim trips a tamper log entry.
   */
  private readRegistry(): ClaimRegistry {
    try {
      const raw = fs.readFileSync(resolveClaimsFile(), "utf-8");
      const parsed = JSON.parse(raw);
      const result = ClaimRegistrySchema.safeParse(parsed);
      if (result.success) {
        // version is optional in the schema (pre-U-COORD02 files lack it) —
        // normalize to a non-negative integer so callers always see a number.
        const normalizedVersion = normalizeVersion(result.data.version);

        // U-COORD12: verify every claim's checksum. Drop mismatches + log.
        const verifiedClaims: Claim[] = [];
        for (const claim of result.data.claims) {
          const v = verifyChecksum(claim);
          if (v.ok) {
            verifiedClaims.push(claim);
          } else {
            this.logTampering(claim, v.computed);
          }
        }

        return {
          ...result.data,
          claims: verifiedClaims,
          version: normalizedVersion,
        };
      }
    } catch {
      // File doesn't exist or is corrupted
    }

    return {
      schemaVersion: 1,
      claims: [],
      sequenceCounter: 0,
      version: 0,
    };
  }

  /**
   * Append a tampering event to the JSONL ledger sibling to the claims file
   * and emit a stderr warning. Best-effort: a write failure is swallowed (with
   * a second stderr warn) because tamper DETECTION must not itself brick a read
   * path — every other broker operation routes through readRegistry, so a
   * thrown error here would cascade into acquireClaim/releaseClaim failures.
   * U-COORD12.
   */
  private logTampering(claim: Claim, computedChecksum: string): void {
    const event = {
      ts: new Date().toISOString(),
      pid: this.pid,
      hostname: this.hostname,
      claimId: claim.id,
      resource: claim.resource,
      holder: claim.holder,
      sequenceNumber: claim.sequenceNumber,
      storedChecksum: claim.checksum,
      computedChecksum,
      reason: "checksum-mismatch",
    };
    console.warn(
      `[AtomicClaimBrokerEngine] checksum mismatch on claim ${claim.id} — dropped (stored=${claim.checksum} computed=${computedChecksum})`
    );
    const logPath = resolveTamperLogPath();
    try {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
      fs.appendFileSync(logPath, JSON.stringify(event) + "\n");
    } catch (err) {
      // Inner-catch context: include logPath + claimId so an operator chasing
      // missing tamper entries has something to grep on (per Arm-B P1 finding).
      console.warn(
        `[AtomicClaimBrokerEngine] tamper-log append failed for claim ${claim.id} -> ${logPath}: ` +
          ((err as Error | undefined)?.message ?? String(err))
      );
    }
  }

  /**
   * Atomic write using temp file + rename (Windows-safe), guarded by an
   * optimistic-locking compare-and-swap (U-COORD02).
   *
   * `registry.version` is the version the caller read before computing this
   * update. Immediately before the temp+rename, the on-disk version is
   * re-read; if it changed, a concurrent writer won the race so this update was
   * computed against stale state and is rejected with StaleRegistryError. The
   * persisted version is `expected + 1`.
   *
   * The re-read -> rename window is not itself a kernel mutex; two writers that
   * both pass the CAS within the same sub-millisecond window still last-writer-
   * wins (neither errors, so nothing retries). For a registry mutated O(10x/min)
   * by the chat fleet that residual race is acceptably rare and tolerated. This
   * converts the COMMON silent last-writer-wins clobber into a detected-and-
   * retried StaleRegistryError.
   *
   * Scope: the CAS protects only writers that route through atomicWrite().
   * External processes that write ATOMIC_CLAIMS.json directly (e.g.
   * .claude/helpers/zombie-reaper-daemon.mjs) bypass it — a pre-existing seam,
   * not closed by U-COORD02.
   */
  private atomicWrite(registry: ClaimRegistry): void {
    const expectedVersion = normalizeVersion(registry.version);
    const onDiskVersion = normalizeVersion(this.readRegistry().version);
    const cas = casVersionCheck(onDiskVersion, expectedVersion);
    if (!cas.ok) {
      throw new StaleRegistryError(expectedVersion, onDiskVersion);
    }

    const toWrite: ClaimRegistry = { ...registry, version: expectedVersion + 1 };
    const claimsFile = resolveClaimsFile();
    const claimsDir = path.dirname(claimsFile);
    const tmpFile = path.join(claimsDir, `.${path.basename(claimsFile)}.${this.pid}.tmp`);

    try {
      fs.mkdirSync(claimsDir, { recursive: true });
      fs.writeFileSync(tmpFile, JSON.stringify(toWrite, null, 2));
      fs.renameSync(tmpFile, claimsFile);
    } catch (err) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // Ignore cleanup errors
      }
      throw err;
    }
  }

  /**
   * Read -> compute -> CAS-write with bounded retry (U-COORD02).
   *
   * `compute` receives a fresh registry read and returns either the updated
   * registry to persist, or `registry: null` to abort without writing (e.g. the
   * target claim was not found — not an error, just nothing to do). On a
   * StaleRegistryError the loop re-reads and recomputes; any other write error
   * aborts immediately. `result` carries the caller's payload (recomputed each
   * attempt) and is returned regardless of whether the commit succeeded.
   */
  private commitWithRetry<T>(
    compute: (registry: ClaimRegistry) => { registry: ClaimRegistry | null; result: T }
  ): { committed: boolean; result: T } {
    let last!: { registry: ClaimRegistry | null; result: T };
    for (let attempt = 0; attempt < COMMIT_RETRY_ATTEMPTS; attempt++) {
      const registry = this.readRegistry();
      last = compute(registry);
      if (last.registry === null) {
        return { committed: false, result: last.result };
      }
      try {
        this.atomicWrite(last.registry);
        return { committed: true, result: last.result };
      } catch (err) {
        if (err instanceof StaleRegistryError) {
          continue; // concurrent writer won — re-read and recompute
        }
        // Real I/O error (EACCES/ENOSPC/etc) — log a forensic breadcrumb
        // before aborting; the boolean caller-contract is preserved, but the
        // operator gets a trail. R12 fail-loud over silent-swallow.
        // eslint-disable-next-line no-console
        console.error(
          "[AtomicClaimBrokerEngine] commitWithRetry aborting on non-stale error: " +
            ((err as Error | undefined)?.message ?? String(err))
        );
        return { committed: false, result: last.result };
      }
    }
    return { committed: false, result: last.result }; // retries exhausted
  }

  /**
   * Check if a claim is expired based on relative TTL
   */
  private isExpired(claim: Claim): boolean {
    const acquiredTime = new Date(claim.acquiredAt).getTime();
    const now = Date.now();
    const elapsed = now - acquiredTime;
    return elapsed > claim.ttlMs;
  }

  /**
   * Check if a claim is a zombie (stuck too long)
   */
  private isZombie(claim: Claim): boolean {
    const acquiredTime = new Date(claim.acquiredAt).getTime();
    const now = Date.now();
    const elapsed = now - acquiredTime;

    if (claim.state === "compacting") {
      return elapsed > COMPACTING_ZOMBIE_THRESHOLD_MS;
    }
    return elapsed > ACTIVE_ZOMBIE_THRESHOLD_MS * 2;
  }

  /**
   * Atomic Compare-And-Swap claim acquisition
   *
   * Fuses duplication-check + claim-acquire into single atomic operation.
   * Returns immediately if resource is already claimed by another holder.
   */
  acquireClaim(resource: string, ttlMs = DEFAULT_TTL_MS): ClaimResult {
    const holder = this.getHolderId();

    // Retry loop for atomic CAS
    for (let attempt = 0; attempt < 3; attempt++) {
      const registry = this.readRegistry();

      // Check for existing claim on this resource
      const existingClaim = registry.claims.find(c => c.resource === resource);

      if (existingClaim) {
        // Same holder - reentrant, extend TTL
        if (existingClaim.holder === holder) {
          const extendedClaim: Claim = {
            ...existingClaim,
            acquiredAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + ttlMs).toISOString(),
            ttlMs,
          };

          const updatedRegistry: ClaimRegistry = {
            ...registry,
            claims: registry.claims.map(c =>
              c.resource === resource ? extendedClaim : c
            ),
          };

          try {
            this.atomicWrite(updatedRegistry);
            return { success: true, claim: extendedClaim };
          } catch {
            continue; // Retry
          }
        }

        // Check if existing claim is expired or zombie
        if (this.isExpired(existingClaim) || this.isZombie(existingClaim)) {
          // Steal the claim
          const stolenClaim = this.createClaim(resource, holder, ttlMs, registry.sequenceCounter + 1);

          const updatedRegistry: ClaimRegistry = {
            ...registry,
            claims: registry.claims.map(c =>
              c.resource === resource ? stolenClaim : c
            ),
            sequenceCounter: registry.sequenceCounter + 1,
          };

          try {
            this.atomicWrite(updatedRegistry);
            return {
              success: true,
              claim: stolenClaim,
            };
          } catch {
            continue; // Retry
          }
        }

        // Claim held by another active holder
        return {
          success: false,
          error: `Resource "${resource}" claimed by ${existingClaim.holder}`,
          conflictingHolder: existingClaim.holder,
          suggestedAction: this.isExpired(existingClaim) ? "steal" : "wait",
        };
      }

      // No existing claim - create new one
      const newClaim = this.createClaim(resource, holder, ttlMs, registry.sequenceCounter + 1);

      const updatedRegistry: ClaimRegistry = {
        ...registry,
        claims: [...registry.claims, newClaim],
        sequenceCounter: registry.sequenceCounter + 1,
      };

      try {
        this.atomicWrite(updatedRegistry);
        return { success: true, claim: newClaim };
      } catch {
        continue; // Retry
      }
    }

    return {
      success: false,
      error: "Failed to acquire claim after 3 attempts (concurrent writes)",
      suggestedAction: "wait",
    };
  }

  /**
   * Create a new claim object
   */
  private createClaim(resource: string, holder: string, ttlMs: number, sequenceNumber: number): Claim {
    const now = new Date();
    const claimWithoutChecksum = {
      id: `claim-${sequenceNumber}-${Date.now()}`,
      resource,
      holder,
      holderPid: this.pid,
      acquiredAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      ttlMs,
      sequenceNumber,
      state: "active" as const,
    };

    return {
      ...claimWithoutChecksum,
      checksum: this.generateChecksum(claimWithoutChecksum),
    };
  }

  /**
   * Release a claim
   */
  releaseClaim(resource: string): boolean {
    const holder = this.getHolderId();
    return this.commitWithRetry<null>((registry) => {
      const claimIndex = registry.claims.findIndex(
        c => c.resource === resource && c.holder === holder
      );
      // Not held by this terminal — abort without writing (not an error).
      if (claimIndex === -1) {
        return { registry: null, result: null };
      }
      return {
        registry: {
          ...registry,
          claims: registry.claims.filter((_, i) => i !== claimIndex),
        },
        result: null,
      };
    }).committed;
  }

  /**
   * Update claim state (e.g., to 'compacting')
   */
  updateClaimState(resource: string, state: Claim["state"]): boolean {
    const holder = this.getHolderId();
    return this.commitWithRetry<null>((registry) => {
      const claimIndex = registry.claims.findIndex(
        c => c.resource === resource && c.holder === holder
      );
      // Not held by this terminal — abort without writing (not an error).
      if (claimIndex === -1) {
        return { registry: null, result: null };
      }
      const updatedClaim: Claim = { ...registry.claims[claimIndex], state };
      return {
        registry: {
          ...registry,
          claims: registry.claims.map((c, i) =>
            i === claimIndex ? updatedClaim : c
          ),
        },
        result: null,
      };
    }).committed;
  }

  /**
   * Reap zombies and detect deadlocks
   */
  reapZombies(): ReapResult {
    // commitWithRetry recomputes the zombie set on each attempt (a concurrent
    // writer may have added/removed claims), and returns the last-computed
    // ReapResult whether or not the write ultimately committed. NOTE: if all
    // retries fail, `reaped` reflects zombies DETECTED this pass, not
    // necessarily zombies PERSISTED as removed — callers must not treat a
    // non-zero `reaped` as proof the registry was mutated.
    return this.commitWithRetry<ReapResult>((registry) => {
      const zombiesFound: string[] = [];
      const survivingClaims: Claim[] = [];

      for (const claim of registry.claims) {
        if (this.isZombie(claim) || this.isExpired(claim)) {
          zombiesFound.push(`${claim.holder}:${claim.resource}`);
        } else {
          survivingClaims.push(claim);
        }
      }

      // Detect cycles (simple: A waits for B waits for A)
      const cyclesDetected = this.detectCycles(survivingClaims);

      return {
        registry: {
          ...registry,
          claims: survivingClaims,
          lastReapedAt: new Date().toISOString(),
          zombieCount: zombiesFound.length,
        },
        result: {
          reaped: zombiesFound.length,
          zombiesFound,
          cyclesDetected,
        },
      };
    }).result;
  }

  /**
   * Detect cycles in claim graph (deadlock detection)
   */
  private detectCycles(claims: Claim[]): string[][] {
    // Simple cycle detection: if same holder has multiple claims
    // and they form a waiting chain
    const holderResources: Record<string, string[]> = {};

    for (const claim of claims) {
      if (!holderResources[claim.holder]) {
        holderResources[claim.holder] = [];
      }
      holderResources[claim.holder].push(claim.resource);
    }

    const cycles: string[][] = [];

    // Check for holders with multiple claims (potential self-deadlock)
    for (const [holder, resources] of Object.entries(holderResources)) {
      if (resources.length > 3) {
        cycles.push([holder, ...resources]);
      }
    }

    return cycles;
  }

  /**
   * Get all active claims
   */
  getActiveClaims(): Claim[] {
    const registry = this.readRegistry();
    return registry.claims.filter(c => !this.isExpired(c) && !this.isZombie(c));
  }

  /**
   * Get claim for a specific resource
   */
  getClaim(resource: string): Claim | undefined {
    const registry = this.readRegistry();
    return registry.claims.find(c => c.resource === resource);
  }

  /**
   * Check if current terminal holds a claim
   */
  holdsClaim(resource: string): boolean {
    const claim = this.getClaim(resource);
    return claim?.holder === this.getHolderId() && !this.isExpired(claim);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalClaims: number;
    activeClaims: number;
    zombieClaims: number;
    expiredClaims: number;
    sequenceCounter: number;
    version: number;
  } {
    const registry = this.readRegistry();
    let activeClaims = 0;
    let zombieClaims = 0;
    let expiredClaims = 0;

    for (const claim of registry.claims) {
      if (this.isZombie(claim)) {
        zombieClaims++;
      } else if (this.isExpired(claim)) {
        expiredClaims++;
      } else {
        activeClaims++;
      }
    }

    return {
      totalClaims: registry.claims.length,
      activeClaims,
      zombieClaims,
      expiredClaims,
      sequenceCounter: registry.sequenceCounter,
      version: registry.version,
    };
  }
}

// ============================================================================
// Export singleton
// ============================================================================

export const atomicClaimBrokerEngine = AtomicClaimBrokerEngine.getInstance();

export type {
  Claim,
  ClaimRegistry,
  ClaimResult,
  ReapResult,
};
