/**
 * TenantEngine — L2-P3-MS1 Infrastructure Layer
 *
 * Multi-tenant isolation: tenant CRUD, resource quotas, data isolation,
 * tenant-scoped settings, usage tracking, and tenant switching.
 *
 * Actions: tenant_create, tenant_get, tenant_list, tenant_update,
 *          tenant_usage, tenant_quota, tenant_switch
 */

// ============================================================================
// TYPES
// ============================================================================

export type TenantPlan = "free" | "starter" | "professional" | "enterprise";
export type TenantStatus = "active" | "suspended" | "trial" | "deactivated";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  owner_user_id: string;
  settings: TenantSettings;
  quota: TenantQuota;
  usage: TenantUsage;
  created_at: string;
  updated_at: string;
}

export interface TenantSettings {
  default_units: "metric" | "imperial";
  default_material_system: "ISO" | "AISI" | "DIN" | "JIS";
  timezone: string;
  locale: string;
  max_concurrent_jobs: number;
  data_retention_days: number;
  custom: Record<string, string | number | boolean>;
}

export interface TenantQuota {
  max_users: number;
  max_machines: number;
  max_programs: number;
  max_storage_mb: number;
  max_api_calls_per_day: number;
}

export interface TenantUsage {
  current_users: number;
  current_machines: number;
  current_programs: number;
  storage_used_mb: number;
  api_calls_today: number;
  last_activity: string;
}

export interface TenantCreateInput {
  name: string;
  owner_user_id: string;
  plan?: TenantPlan;
  settings?: Partial<TenantSettings>;
}

// ============================================================================
// PLAN QUOTAS
// ============================================================================

const PLAN_QUOTAS: Record<TenantPlan, TenantQuota> = {
  free:         { max_users: 2, max_machines: 1, max_programs: 50, max_storage_mb: 100, max_api_calls_per_day: 500 },
  starter:      { max_users: 5, max_machines: 3, max_programs: 200, max_storage_mb: 1000, max_api_calls_per_day: 5000 },
  professional: { max_users: 25, max_machines: 10, max_programs: 1000, max_storage_mb: 10000, max_api_calls_per_day: 50000 },
  enterprise:   { max_users: 999, max_machines: 100, max_programs: 99999, max_storage_mb: 100000, max_api_calls_per_day: 999999 },
};

const DEFAULT_SETTINGS: TenantSettings = {
  default_units: "metric",
  default_material_system: "ISO",
  timezone: "UTC",
  locale: "en-US",
  max_concurrent_jobs: 5,
  data_retention_days: 365,
  custom: {},
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

let tenantIdCounter = 0;

export class TenantEngine {
  private tenants = new Map<string, Tenant>();

  create(input: TenantCreateInput): Tenant {
    tenantIdCounter++;
    const id = `TNT-${String(tenantIdCounter).padStart(4, "0")}`;
    const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const plan = input.plan || "free";
    const quota = { ...PLAN_QUOTAS[plan] };
    const settings: TenantSettings = { ...DEFAULT_SETTINGS, ...input.settings };

    const tenant: Tenant = {
      id, name: input.name, slug, plan, status: "active",
      owner_user_id: input.owner_user_id,
      settings, quota,
      usage: { current_users: 1, current_machines: 0, current_programs: 0, storage_used_mb: 0, api_calls_today: 0, last_activity: new Date().toISOString() },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tenants.set(id, tenant);
    return tenant;
  }

  get(tenantId: string): Tenant | undefined {
    return this.tenants.get(tenantId);
  }

  list(filters?: { status?: TenantStatus; plan?: TenantPlan }): Tenant[] {
    let result = [...this.tenants.values()];
    if (filters?.status) result = result.filter(t => t.status === filters.status);
    if (filters?.plan) result = result.filter(t => t.plan === filters.plan);
    return result;
  }

  update(tenantId: string, updates: { name?: string; plan?: TenantPlan; status?: TenantStatus; settings?: Partial<TenantSettings> }): Tenant | undefined {
    const t = this.tenants.get(tenantId);
    if (!t) return undefined;

    if (updates.name) { t.name = updates.name; t.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
    if (updates.plan) { t.plan = updates.plan; t.quota = { ...PLAN_QUOTAS[updates.plan] }; }
    if (updates.status) t.status = updates.status;
    if (updates.settings) Object.assign(t.settings, updates.settings);
    t.updated_at = new Date().toISOString();

    return t;
  }

  checkQuota(tenantId: string, resource: keyof TenantQuota): { within_quota: boolean; current: number; limit: number; pct_used: number } {
    const t = this.tenants.get(tenantId);
    if (!t) return { within_quota: false, current: 0, limit: 0, pct_used: 0 };

    const limit = t.quota[resource];
    const usageMap: Record<keyof TenantQuota, number> = {
      max_users: t.usage.current_users,
      max_machines: t.usage.current_machines,
      max_programs: t.usage.current_programs,
      max_storage_mb: t.usage.storage_used_mb,
      max_api_calls_per_day: t.usage.api_calls_today,
    };
    const current = usageMap[resource];

    return {
      within_quota: current < limit,
      current, limit,
      pct_used: limit > 0 ? Math.round(current / limit * 1000) / 10 : 0,
    };
  }

  recordUsage(tenantId: string, resource: "users" | "machines" | "programs" | "storage_mb" | "api_calls", delta: number): boolean {
    const t = this.tenants.get(tenantId);
    if (!t) return false;

    const fieldMap: Record<string, keyof TenantUsage> = {
      users: "current_users", machines: "current_machines", programs: "current_programs",
      storage_mb: "storage_used_mb", api_calls: "api_calls_today",
    };
    const field = fieldMap[resource];
    if (field) (t.usage as Record<string, number>)[field] = Math.max(0, (t.usage as Record<string, number>)[field] + delta);
    t.usage.last_activity = new Date().toISOString();
    return true;
  }

  getStats(): { total: number; by_plan: Record<TenantPlan, number>; by_status: Record<TenantStatus, number> } {
    const byPlan: Record<TenantPlan, number> = { free: 0, starter: 0, professional: 0, enterprise: 0 };
    const byStatus: Record<TenantStatus, number> = { active: 0, suspended: 0, trial: 0, deactivated: 0 };
    for (const t of this.tenants.values()) {
      byPlan[t.plan]++;
      byStatus[t.status]++;
    }
    return { total: this.tenants.size, by_plan: byPlan, by_status: byStatus };
  }

  clear(): void { this.tenants.clear(); tenantIdCounter = 0; }
}

export const tenantEngine = new TenantEngine();
