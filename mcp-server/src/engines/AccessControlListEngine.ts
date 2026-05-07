/**
 * AccessControlListEngine — U-LPR-SEC03
 *
 * File-level Access Control Lists with:
 * - Tenant-scoped resource permissions
 * - Subject-based (user/role/group) ACLs
 * - Permission inheritance from parent resources
 * - Explicit deny with audit logging
 * - Wildcard resource patterns
 *
 * @milestone LATHE-PROD-READY-MS0
 * @unit U-LPR-SEC03
 * @phase PHASE-9 (Security + Compliance)
 */

import * as crypto from 'crypto';
import { log } from '../utils/Logger.js';

// ============================================================================
// TYPES
// ============================================================================

export type Permission = 'read' | 'write' | 'delete' | 'execute' | 'admin' | '*';
export type SubjectType = 'user' | 'role' | 'group' | 'service';
export type Decision = 'allow' | 'deny';

export interface ACLEntry {
  id: string;
  resourcePattern: string;
  subjectType: SubjectType;
  subjectId: string;
  tenantId: string;
  permissions: Permission[];
  decision: Decision;
  priority: number;
  createdAt: number;
  createdBy: string;
  expiresAt?: number;
  conditions?: ACLCondition[];
}

export interface ACLCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains' | 'regex';
  value: string | number | string[];
}

export interface AccessRequest {
  subjectId: string;
  subjectType: SubjectType;
  subjectRoles?: string[];
  subjectGroups?: string[];
  tenantId: string;
  resourcePath: string;
  permission: Permission;
  context?: Record<string, unknown>;
}

export interface AccessDecision {
  allowed: boolean;
  decision: Decision;
  matchedRule?: string;
  deniedReason?: string;
  evaluatedRules: number;
  evaluationTimeMs: number;
}

export interface DenyAuditEntry {
  id: string;
  timestamp: number;
  tenantId: string;
  subjectId: string;
  subjectType: SubjectType;
  resourcePath: string;
  permission: Permission;
  matchedRuleId?: string;
  reason: string;
  context?: Record<string, unknown>;
}

export interface ACLStats {
  totalRules: number;
  rulesByTenant: Record<string, number>;
  rulesByDecision: Record<string, number>;
  denyAuditCount: number;
  evaluationCount: number;
  avgEvaluationTimeMs: number;
}

// ============================================================================
// ENGINE
// ============================================================================

export class AccessControlListEngine {
  private rules: Map<string, ACLEntry> = new Map();
  private denyAuditLog: DenyAuditEntry[] = [];
  private evaluationCount = 0;
  private totalEvaluationTimeMs = 0;
  private defaultDeny = true;

  /**
   * Creates a new ACL rule.
   */
  createRule(entry: Omit<ACLEntry, 'id' | 'createdAt'>): ACLEntry {
    const rule: ACLEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };

    this.rules.set(rule.id, rule);
    log.info(`[ACL] Rule created: ${rule.id} for ${rule.resourcePattern}`);
    return rule;
  }

  /**
   * Updates an existing ACL rule.
   */
  updateRule(id: string, updates: Partial<Omit<ACLEntry, 'id' | 'createdAt'>>): ACLEntry | null {
    const existing = this.rules.get(id);
    if (!existing) return null;

    const updated: ACLEntry = { ...existing, ...updates };
    this.rules.set(id, updated);
    return updated;
  }

  /**
   * Deletes an ACL rule.
   */
  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Gets a specific rule by ID.
   */
  getRule(id: string): ACLEntry | null {
    return this.rules.get(id) || null;
  }

  /**
   * Lists rules for a tenant, optionally filtered by resource pattern.
   */
  listRules(tenantId: string, resourcePattern?: string): ACLEntry[] {
    let rules = [...this.rules.values()].filter(r => r.tenantId === tenantId);
    if (resourcePattern) {
      rules = rules.filter(r => this.matchPattern(resourcePattern, r.resourcePattern));
    }
    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluates an access request against ACL rules.
   * Returns allow/deny decision with audit logging for denies.
   */
  checkAccess(request: AccessRequest): AccessDecision {
    const startTime = Date.now();
    this.evaluationCount++;

    // Get all applicable rules for this tenant
    const applicableRules = [...this.rules.values()]
      .filter(r => r.tenantId === request.tenantId)
      .filter(r => !r.expiresAt || r.expiresAt > Date.now())
      .filter(r => this.matchPattern(request.resourcePath, r.resourcePattern))
      .filter(r => this.matchSubject(request, r))
      .filter(r => this.matchPermission(request.permission, r.permissions))
      .filter(r => this.evaluateConditions(r.conditions, request.context))
      .sort((a, b) => b.priority - a.priority);

    const evaluationTimeMs = Date.now() - startTime;
    this.totalEvaluationTimeMs += evaluationTimeMs;

    // No rules match
    if (applicableRules.length === 0) {
      if (this.defaultDeny) {
        this.logDeny(request, undefined, 'No matching rules (default deny)');
        return {
          allowed: false,
          decision: 'deny',
          deniedReason: 'No matching rules (default deny)',
          evaluatedRules: 0,
          evaluationTimeMs,
        };
      }
      return {
        allowed: true,
        decision: 'allow',
        evaluatedRules: 0,
        evaluationTimeMs,
      };
    }

    // First matching rule wins (highest priority)
    const matchedRule = applicableRules[0];

    if (matchedRule.decision === 'deny') {
      this.logDeny(request, matchedRule.id, `Explicit deny rule: ${matchedRule.id}`);
      return {
        allowed: false,
        decision: 'deny',
        matchedRule: matchedRule.id,
        deniedReason: `Explicit deny by rule ${matchedRule.id}`,
        evaluatedRules: applicableRules.length,
        evaluationTimeMs,
      };
    }

    return {
      allowed: true,
      decision: 'allow',
      matchedRule: matchedRule.id,
      evaluatedRules: applicableRules.length,
      evaluationTimeMs,
    };
  }

  /**
   * Batch check multiple permissions.
   */
  checkMultiplePermissions(
    request: Omit<AccessRequest, 'permission'>,
    permissions: Permission[]
  ): Record<Permission, AccessDecision> {
    const results: Record<string, AccessDecision> = {};
    for (const permission of permissions) {
      results[permission] = this.checkAccess({ ...request, permission });
    }
    return results as Record<Permission, AccessDecision>;
  }

  /**
   * Gets effective permissions for a subject on a resource.
   */
  getEffectivePermissions(
    tenantId: string,
    subjectId: string,
    subjectType: SubjectType,
    resourcePath: string,
    subjectRoles?: string[],
    subjectGroups?: string[]
  ): { allowed: Permission[]; denied: Permission[] } {
    const allPermissions: Permission[] = ['read', 'write', 'delete', 'execute', 'admin'];
    const allowed: Permission[] = [];
    const denied: Permission[] = [];

    for (const permission of allPermissions) {
      const decision = this.checkAccess({
        subjectId,
        subjectType,
        subjectRoles,
        subjectGroups,
        tenantId,
        resourcePath,
        permission,
      });

      if (decision.allowed) {
        allowed.push(permission);
      } else {
        denied.push(permission);
      }
    }

    return { allowed, denied };
  }

  /**
   * Creates common ACL patterns for a resource hierarchy.
   */
  createResourceHierarchyRules(
    tenantId: string,
    basePath: string,
    ownerUserId: string,
    createdBy: string
  ): ACLEntry[] {
    const rules: ACLEntry[] = [];

    // Owner has full access
    rules.push(this.createRule({
      resourcePattern: `${basePath}/**`,
      subjectType: 'user',
      subjectId: ownerUserId,
      tenantId,
      permissions: ['*'],
      decision: 'allow',
      priority: 100,
      createdBy,
    }));

    // Admins have full access
    rules.push(this.createRule({
      resourcePattern: `${basePath}/**`,
      subjectType: 'role',
      subjectId: 'admin',
      tenantId,
      permissions: ['*'],
      decision: 'allow',
      priority: 90,
      createdBy,
    }));

    // Operators can read and execute
    rules.push(this.createRule({
      resourcePattern: `${basePath}/**`,
      subjectType: 'role',
      subjectId: 'operator',
      tenantId,
      permissions: ['read', 'execute'],
      decision: 'allow',
      priority: 50,
      createdBy,
    }));

    return rules;
  }

  /**
   * Gets deny audit log entries.
   */
  getDenyAuditLog(tenantId?: string, limit: number = 100): DenyAuditEntry[] {
    let entries = this.denyAuditLog;
    if (tenantId) {
      entries = entries.filter(e => e.tenantId === tenantId);
    }
    return entries.slice(-limit);
  }

  /**
   * Gets ACL statistics.
   */
  getStats(): ACLStats {
    const rules = [...this.rules.values()];
    const rulesByTenant: Record<string, number> = {};
    const rulesByDecision: Record<string, number> = { allow: 0, deny: 0 };

    for (const rule of rules) {
      rulesByTenant[rule.tenantId] = (rulesByTenant[rule.tenantId] || 0) + 1;
      rulesByDecision[rule.decision]++;
    }

    return {
      totalRules: rules.length,
      rulesByTenant,
      rulesByDecision,
      denyAuditCount: this.denyAuditLog.length,
      evaluationCount: this.evaluationCount,
      avgEvaluationTimeMs: this.evaluationCount > 0
        ? this.totalEvaluationTimeMs / this.evaluationCount
        : 0,
    };
  }

  /**
   * Sets default deny policy.
   */
  setDefaultDeny(enabled: boolean): void {
    this.defaultDeny = enabled;
  }

  /**
   * Clears all rules and audit log (for testing).
   */
  clear(): void {
    this.rules.clear();
    this.denyAuditLog = [];
    this.evaluationCount = 0;
    this.totalEvaluationTimeMs = 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private matchPattern(path: string, pattern: string): boolean {
    // Handle exact match
    if (pattern === path) return true;

    // Handle wildcard patterns
    const regexPattern = pattern
      .replace(/\*\*/g, '<<<GLOBSTAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<GLOBSTAR>>>/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  private matchSubject(request: AccessRequest, rule: ACLEntry): boolean {
    // Direct match
    if (rule.subjectType === request.subjectType && rule.subjectId === request.subjectId) {
      return true;
    }

    // Role match
    if (rule.subjectType === 'role' && request.subjectRoles?.includes(rule.subjectId)) {
      return true;
    }

    // Group match
    if (rule.subjectType === 'group' && request.subjectGroups?.includes(rule.subjectId)) {
      return true;
    }

    // Wildcard subject
    if (rule.subjectId === '*') {
      return true;
    }

    return false;
  }

  private matchPermission(requested: Permission, allowed: Permission[]): boolean {
    if (allowed.includes('*')) return true;
    if (allowed.includes(requested)) return true;

    // Admin implies all
    if (allowed.includes('admin')) return true;

    return false;
  }

  private evaluateConditions(
    conditions: ACLCondition[] | undefined,
    context: Record<string, unknown> | undefined
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    if (!context) return false;

    for (const condition of conditions) {
      const value = context[condition.field];
      if (!this.evaluateCondition(condition, value)) {
        return false;
      }
    }

    return true;
  }

  private evaluateCondition(condition: ACLCondition, value: unknown): boolean {
    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'ne':
        return value !== condition.value;
      case 'gt':
        return typeof value === 'number' && value > (condition.value as number);
      case 'lt':
        return typeof value === 'number' && value < (condition.value as number);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value as string);
      case 'contains':
        return typeof value === 'string' && value.includes(condition.value as string);
      case 'regex':
        return typeof value === 'string' && new RegExp(condition.value as string).test(value);
      default:
        return false;
    }
  }

  private logDeny(request: AccessRequest, ruleId: string | undefined, reason: string): void {
    const entry: DenyAuditEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      tenantId: request.tenantId,
      subjectId: request.subjectId,
      subjectType: request.subjectType,
      resourcePath: request.resourcePath,
      permission: request.permission,
      matchedRuleId: ruleId,
      reason,
      context: request.context,
    };

    this.denyAuditLog.push(entry);
    log.warn(`[ACL] DENY: ${request.subjectId} → ${request.resourcePath} (${request.permission}): ${reason}`);

    // Keep audit log bounded
    if (this.denyAuditLog.length > 10000) {
      this.denyAuditLog = this.denyAuditLog.slice(-5000);
    }
  }
}

export const accessControlListEngine = new AccessControlListEngine();
