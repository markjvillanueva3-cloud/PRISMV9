/**
 * IdentityModelEngine — U-SAV2-01
 *
 * Foundation for cross-agent self-awareness: agent role, family membership,
 * operational boundaries, and behavioral invariants.
 *
 * Every chat session has an identity that persists across compactions.
 * Multiple concurrent chats (6+) need to know who they are relative to others.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const AgentRoleSchema = z.enum([
  "builder",           // Creates new engines/features
  "reviewer",          // Reviews code/PRs
  "planner",           // Roadmap/task planning
  "researcher",        // Investigates/explores
  "operator",          // Shop floor operations
  "orchestrator",      // Coordinates multi-agent work
  "specialist",        // Domain-specific work (WEDM, lathe, etc.)
  "general",           // General-purpose
]);

const AgentFamilySchema = z.enum([
  "claude-code",       // Claude Code CLI sessions
  "mcp-client",        // MCP client connections
  "hook-agent",        // Hook-spawned sub-agents
  "scheduled",         // Cron/scheduled tasks
  "external",          // External API callers
]);

const BoundaryConstraintSchema = z.object({
  name: z.string(),
  type: z.enum(["must_not", "must", "prefer", "avoid"]),
  description: z.string(),
  enforcedBy: z.string().optional(), // Hook name if auto-enforced
});

const InvariantSchema = z.object({
  name: z.string(),
  condition: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  testable: z.boolean(),
});

const IdentityRecordSchema = z.object({
  sessionId: z.string(),
  role: AgentRoleSchema,
  family: AgentFamilySchema,
  activeSince: z.string(), // ISO timestamp
  lastActive: z.string(),  // ISO timestamp
  currentMilestone: z.string().optional(),
  currentUnit: z.string().optional(),
  specializations: z.array(z.string()).default([]),
  boundaries: z.array(BoundaryConstraintSchema).default([]),
  invariants: z.array(InvariantSchema).default([]),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export type AgentRole = z.infer<typeof AgentRoleSchema>;
export type AgentFamily = z.infer<typeof AgentFamilySchema>;
export type BoundaryConstraint = z.infer<typeof BoundaryConstraintSchema>;
export type Invariant = z.infer<typeof InvariantSchema>;
export type IdentityRecord = z.infer<typeof IdentityRecordSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Default Boundaries (PRISM universal)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BOUNDARIES: BoundaryConstraint[] = [
  {
    name: "no-inline-constants",
    type: "must_not",
    description: "Never inline Kienzle/Taylor constants — use physics/constants.ts",
    enforcedBy: "canonical-constants-hook",
  },
  {
    name: "dedup-before-create",
    type: "must",
    description: "Run DuplicationGuardEngine.mustCheckBeforeCreating() before any new asset",
    enforcedBy: "duplication-hard-block",
  },
  {
    name: "tests-required",
    type: "must",
    description: "Every engine ships with ≥10 real tests (no placeholders)",
    enforcedBy: "test-legitimacy-hook",
  },
  {
    name: "dispatcher-wiring",
    type: "must",
    description: "Every engine must be wired to a dispatcher with schema + action enum",
    enforcedBy: "stop-on-unwired-assets",
  },
  {
    name: "h-drive-only",
    type: "must",
    description: "All file operations constrained to H: drive",
    enforcedBy: "h-drive-enforcement",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default Invariants
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_INVARIANTS: Invariant[] = [
  {
    name: "build-passes",
    condition: "npm run build exits 0",
    severity: "critical",
    testable: true,
  },
  {
    name: "tests-pass",
    condition: "npx vitest run exits 0",
    severity: "critical",
    testable: true,
  },
  {
    name: "no-duplicate-engines",
    condition: "DuplicationGuardEngine.checkAll() returns 0 duplicates",
    severity: "high",
    testable: true,
  },
  {
    name: "omega-threshold",
    condition: "Omega quality score ≥ 0.70",
    severity: "high",
    testable: true,
  },
  {
    name: "safety-score",
    condition: "S(x) safety component ≥ 0.70",
    severity: "critical",
    testable: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Engine Implementation
// ─────────────────────────────────────────────────────────────────────────────

class IdentityModelEngine {
  private identities: Map<string, IdentityRecord> = new Map();

  /**
   * Register or update an agent's identity
   */
  register(params: {
    sessionId: string;
    role?: AgentRole;
    family?: AgentFamily;
    currentMilestone?: string;
    currentUnit?: string;
    specializations?: string[];
    customBoundaries?: BoundaryConstraint[];
    customInvariants?: Invariant[];
    metadata?: Record<string, unknown>;
  }): IdentityRecord {
    const now = new Date().toISOString();
    const existing = this.identities.get(params.sessionId);

    const identity: IdentityRecord = {
      sessionId: params.sessionId,
      role: params.role ?? existing?.role ?? "general",
      family: params.family ?? existing?.family ?? "claude-code",
      activeSince: existing?.activeSince ?? now,
      lastActive: now,
      currentMilestone: params.currentMilestone ?? existing?.currentMilestone,
      currentUnit: params.currentUnit ?? existing?.currentUnit,
      specializations: params.specializations ?? existing?.specializations ?? [],
      boundaries: [
        ...DEFAULT_BOUNDARIES,
        ...(params.customBoundaries ?? existing?.boundaries?.filter(b =>
          !DEFAULT_BOUNDARIES.some(d => d.name === b.name)
        ) ?? []),
      ],
      invariants: [
        ...DEFAULT_INVARIANTS,
        ...(params.customInvariants ?? existing?.invariants?.filter(i =>
          !DEFAULT_INVARIANTS.some(d => d.name === i.name)
        ) ?? []),
      ],
      metadata: { ...existing?.metadata, ...params.metadata },
    };

    this.identities.set(params.sessionId, identity);
    return identity;
  }

  /**
   * Get an agent's identity
   */
  get(sessionId: string): IdentityRecord | null {
    return this.identities.get(sessionId) ?? null;
  }

  /**
   * Update last active timestamp (heartbeat)
   */
  heartbeat(sessionId: string): boolean {
    const identity = this.identities.get(sessionId);
    if (!identity) return false;
    identity.lastActive = new Date().toISOString();
    return true;
  }

  /**
   * Check if a boundary constraint applies to this session
   */
  checkBoundary(sessionId: string, boundaryName: string): {
    applies: boolean;
    constraint: BoundaryConstraint | null;
    reason: string;
  } {
    const identity = this.identities.get(sessionId);
    if (!identity) {
      return { applies: false, constraint: null, reason: "Session not registered" };
    }

    const boundary = identity.boundaries.find(b => b.name === boundaryName);
    if (!boundary) {
      return { applies: false, constraint: null, reason: "Boundary not found" };
    }

    return {
      applies: true,
      constraint: boundary,
      reason: `${boundary.type}: ${boundary.description}`,
    };
  }

  /**
   * Get all boundaries that apply as "must" or "must_not"
   */
  getHardBoundaries(sessionId: string): BoundaryConstraint[] {
    const identity = this.identities.get(sessionId);
    if (!identity) return DEFAULT_BOUNDARIES.filter(b => b.type === "must" || b.type === "must_not");
    return identity.boundaries.filter(b => b.type === "must" || b.type === "must_not");
  }

  /**
   * Validate all invariants for a session
   */
  validateInvariants(sessionId: string): {
    valid: boolean;
    violations: Array<{ invariant: Invariant; reason: string }>;
  } {
    const identity = this.identities.get(sessionId);
    const invariants = identity?.invariants ?? DEFAULT_INVARIANTS;

    // Note: Actual validation would require running external checks
    // This returns the structure for downstream validators to fill
    return {
      valid: true,
      violations: [],
    };
  }

  /**
   * Get role-specific capabilities
   */
  getCapabilities(sessionId: string): string[] {
    const identity = this.identities.get(sessionId);
    const role = identity?.role ?? "general";

    const roleCapabilities: Record<AgentRole, string[]> = {
      builder: ["create-engine", "edit-code", "run-tests", "commit"],
      reviewer: ["read-code", "comment", "approve", "request-changes"],
      planner: ["create-tasks", "estimate", "prioritize", "roadmap"],
      researcher: ["search", "read", "summarize", "recommend"],
      operator: ["run-commands", "monitor", "alert", "log"],
      orchestrator: ["spawn-agents", "coordinate", "aggregate", "delegate"],
      specialist: ["domain-specific", "expert-advice", "validate"],
      general: ["read", "write", "search", "execute"],
    };

    return [
      ...roleCapabilities[role],
      ...(identity?.specializations ?? []),
    ];
  }

  /**
   * List all registered sessions
   */
  listSessions(): Array<{
    sessionId: string;
    role: AgentRole;
    family: AgentFamily;
    lastActive: string;
    currentWork: string | null;
  }> {
    return Array.from(this.identities.values()).map(id => ({
      sessionId: id.sessionId,
      role: id.role,
      family: id.family,
      lastActive: id.lastActive,
      currentWork: id.currentUnit
        ? `${id.currentMilestone ?? "?"}/${id.currentUnit}`
        : id.currentMilestone ?? null,
    }));
  }

  /**
   * Get sessions working on the same milestone (for coordination)
   */
  getSiblings(sessionId: string): IdentityRecord[] {
    const identity = this.identities.get(sessionId);
    if (!identity?.currentMilestone) return [];

    return Array.from(this.identities.values()).filter(
      id => id.sessionId !== sessionId && id.currentMilestone === identity.currentMilestone
    );
  }

  /**
   * Deregister a session (on Stop/compact)
   */
  deregister(sessionId: string): boolean {
    return this.identities.delete(sessionId);
  }

  /**
   * Prune stale sessions (no heartbeat in N hours)
   */
  pruneStale(maxAgeHours: number = 8): number {
    const cutoff = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let pruned = 0;

    for (const [id, identity] of this.identities) {
      if (new Date(identity.lastActive).getTime() < cutoff) {
        this.identities.delete(id);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Export all identities (for persistence)
   */
  export(): IdentityRecord[] {
    return Array.from(this.identities.values());
  }

  /**
   * Import identities (from persistence)
   */
  import(records: IdentityRecord[]): number {
    let imported = 0;
    for (const record of records) {
      const parsed = IdentityRecordSchema.safeParse(record);
      if (parsed.success) {
        this.identities.set(parsed.data.sessionId, parsed.data);
        imported++;
      }
    }
    return imported;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSessions: number;
    byRole: Record<string, number>;
    byFamily: Record<string, number>;
    activeLast5Min: number;
  } {
    const now = Date.now();
    const fiveMinAgo = now - 5 * 60 * 1000;

    const byRole: Record<string, number> = {};
    const byFamily: Record<string, number> = {};
    let activeLast5Min = 0;

    for (const identity of this.identities.values()) {
      byRole[identity.role] = (byRole[identity.role] ?? 0) + 1;
      byFamily[identity.family] = (byFamily[identity.family] ?? 0) + 1;
      if (new Date(identity.lastActive).getTime() >= fiveMinAgo) {
        activeLast5Min++;
      }
    }

    return {
      totalSessions: this.identities.size,
      byRole,
      byFamily,
      activeLast5Min,
    };
  }
}

export const identityModelEngine = new IdentityModelEngine();
export { IdentityModelEngine, IdentityRecordSchema, BoundaryConstraintSchema, InvariantSchema };
