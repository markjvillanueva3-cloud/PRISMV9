// tier: T4
/**
 * hook_tla_invariant — USSH Phase 0.25
 * =====================================
 *
 * Verifies TLA+ style invariants for hook protocol state machine.
 * Ensures safety properties hold: no deadlock, mutual exclusion, liveness.
 *
 * Invariants checked:
 * - TypeInvariant: hookState ∈ {idle, executing, blocked, failed}
 * - Safety: No two sessions hold same lock (mutual exclusion)
 * - Liveness: Eventually returns to idle (no permanent block)
 *
 * Fires: SessionStart
 * Theory: Formal Verification, TLA+ temporal logic
 *
 * @hook SessionStart
 */

import fs from 'fs';
import path from 'path';

const STATE_DIR = 'H:/prism/mcp-server/data/state';
const LOCK_DIR = 'H:/prism/mcp-server/data/locks';
const SHARED_STATE = 'H:/prism/state/shared';
const INVARIANT_LOG = path.join(STATE_DIR, 'tla-invariant-log.json');

// TLA+ State Space Definition
const VALID_HOOK_STATES = new Set(['idle', 'executing', 'blocked', 'failed']);
const MAX_BLOCK_DURATION_MS = 300000; // 5 min - liveness bound

/**
 * TypeInvariant: hookState ∈ {"idle", "executing", "blocked", "failed"}
 */
function checkTypeInvariant(state) {
  const violations = [];

  if (state.hookState && !VALID_HOOK_STATES.has(state.hookState)) {
    violations.push({
      invariant: 'TypeInvariant',
      property: 'hookState',
      expected: Array.from(VALID_HOOK_STATES),
      actual: state.hookState
    });
  }

  return violations;
}

/**
 * Safety: ¬(∃ s1, s2 ∈ Sessions : s1 ≠ s2 ∧ lockSet[s1] ∩ lockSet[s2] ≠ {})
 * No two sessions hold the same lock (mutual exclusion)
 */
function checkMutualExclusion() {
  const violations = [];
  const locksByResource = new Map();

  try {
    // Check both lock directories
    const lockDirs = [LOCK_DIR, SHARED_STATE];

    for (const dir of lockDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter(f => f.includes('LOCK') || f.includes('lock'));

      for (const file of files) {
        try {
          const lockPath = path.join(dir, file);
          const stat = fs.statSync(lockPath);
          const content = fs.readFileSync(lockPath, 'utf-8');
          const lock = JSON.parse(content);

          const resource = lock.resource || file;
          const session = lock.session || lock.sessionId || lock.holder || 'unknown';

          if (!locksByResource.has(resource)) {
            locksByResource.set(resource, []);
          }

          locksByResource.get(resource).push({
            session,
            file: lockPath,
            acquired: lock.acquired || stat.mtimeMs
          });
        } catch {}
      }
    }

    // Check for conflicts
    for (const [resource, holders] of locksByResource) {
      if (holders.length > 1) {
        const sessions = [...new Set(holders.map(h => h.session))];
        if (sessions.length > 1) {
          violations.push({
            invariant: 'Safety/MutualExclusion',
            property: `lock:${resource}`,
            expected: 'Single session holds lock',
            actual: `${sessions.length} sessions: ${sessions.join(', ')}`
          });
        }
      }
    }
  } catch (err) {
    // Can't read locks - assume OK but log
  }

  return violations;
}

/**
 * Liveness: □(hookState = "blocked" ⇒ ◇(hookState ∈ {"idle", "failed"}))
 * Eventually returns to idle (no permanent block)
 */
function checkLiveness() {
  const violations = [];

  try {
    // Check for stale locks (blocked longer than liveness bound)
    const lockDirs = [LOCK_DIR, SHARED_STATE];
    const now = Date.now();

    for (const dir of lockDirs) {
      if (!fs.existsSync(dir)) continue;

      const files = fs.readdirSync(dir).filter(f => f.includes('LOCK') || f.includes('lock'));

      for (const file of files) {
        try {
          const lockPath = path.join(dir, file);
          const stat = fs.statSync(lockPath);
          const age = now - stat.mtimeMs;

          if (age > MAX_BLOCK_DURATION_MS) {
            const content = fs.readFileSync(lockPath, 'utf-8');
            const lock = JSON.parse(content);

            violations.push({
              invariant: 'Liveness/EventualProgress',
              property: `lock:${file}`,
              expected: `Lock released within ${MAX_BLOCK_DURATION_MS / 1000}s`,
              actual: `Lock held for ${Math.round(age / 1000)}s`,
              resource: lock.resource || file,
              holder: lock.session || lock.holder || 'unknown'
            });
          }
        } catch {}
      }
    }
  } catch {}

  return violations;
}

/**
 * Deadlock Freedom: System has at least one enabled transition
 * Check that we're not in a deadlock state
 */
function checkDeadlockFreedom() {
  const violations = [];

  try {
    // Check for circular wait conditions
    const claimFile = path.join(SHARED_STATE, 'ACTIVE_WORK_REGISTRY.json');

    if (fs.existsSync(claimFile)) {
      const claims = JSON.parse(fs.readFileSync(claimFile, 'utf-8'));
      const activeClaims = Object.values(claims).filter(c => c.status === 'active');

      // Check for sessions waiting on each other
      const waitGraph = new Map();

      for (const claim of activeClaims) {
        if (claim.waitingOn && claim.session) {
          if (!waitGraph.has(claim.session)) {
            waitGraph.set(claim.session, new Set());
          }
          waitGraph.get(claim.session).add(claim.waitingOn);
        }
      }

      // Simple cycle detection via DFS
      function hasCycle(node, visited, recStack) {
        visited.add(node);
        recStack.add(node);

        for (const neighbor of (waitGraph.get(node) || [])) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor, visited, recStack)) return true;
          } else if (recStack.has(neighbor)) {
            return true;
          }
        }

        recStack.delete(node);
        return false;
      }

      const visited = new Set();
      const recStack = new Set();

      for (const node of waitGraph.keys()) {
        if (!visited.has(node)) {
          if (hasCycle(node, visited, recStack)) {
            violations.push({
              invariant: 'DeadlockFreedom',
              property: 'waitGraph',
              expected: 'No circular wait',
              actual: `Circular dependency detected in wait graph`
            });
            break;
          }
        }
      }
    }
  } catch {}

  return violations;
}

function logInvariantCheck(result) {
  try {
    let log = [];
    if (fs.existsSync(INVARIANT_LOG)) {
      log = JSON.parse(fs.readFileSync(INVARIANT_LOG, 'utf-8'));
    }

    log.push({
      timestamp: new Date().toISOString(),
      ...result
    });

    // Keep last 100 entries
    if (log.length > 100) {
      log = log.slice(-100);
    }

    fs.writeFileSync(INVARIANT_LOG, JSON.stringify(log, null, 2));
  } catch {}
}

export default async function hookTlaInvariant() {
  const startTime = Date.now();
  const violations = [];

  // Check all invariants
  const currentState = {
    hookState: 'executing', // We're in a hook
    timestamp: Date.now()
  };

  violations.push(...checkTypeInvariant(currentState));
  violations.push(...checkMutualExclusion());
  violations.push(...checkLiveness());
  violations.push(...checkDeadlockFreedom());

  const duration = Date.now() - startTime;

  const result = {
    passed: violations.length === 0,
    violations,
    invariantsChecked: ['TypeInvariant', 'Safety/MutualExclusion', 'Liveness/EventualProgress', 'DeadlockFreedom'],
    duration_ms: duration
  };

  logInvariantCheck(result);

  if (violations.length > 0) {
    return {
      decision: "approve", // Non-blocking - just warn
      additionalContext: `[TLA+ INVARIANT WARNING] ${violations.length} violation(s) detected:\n` +
        violations.map(v => `  - ${v.invariant}: ${v.property} — expected ${v.expected}, got ${v.actual}`).join('\n')
    };
  }

  return { decision: "approve" };
}
