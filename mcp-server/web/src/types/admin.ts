export interface SystemStatus {
  version: string;
  uptime_seconds: number;
  memory_usage_mb: number;
  cpu_usage_pct: number;
  engine_count: number;
  dispatcher_count: number;
  action_count: number;
  build_status: "pass" | "fail";
}

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string;
}

export interface CacheStats {
  total_entries: number;
  hit_rate_pct: number;
  memory_mb: number;
  oldest_entry: string;
}

export interface SystemConfig {
  key: string;
  value: unknown;
  type: string;
  description: string;
}

export interface ApiError { message: string; code?: string; }

// ---------------------------------------------------------------------------
// Per-seat entitlement administration (U-COMM-05 / Q6)
// ---------------------------------------------------------------------------

/** A user's plan + per-feature override map, as returned by GET /admin/entitlements. */
export interface EntitlementUser {
  userId: string;
  plan: string;
  status: string;
  /** plan downgraded to "free" if status is not active/trialing */
  effectivePlan: string;
  /** featureKey -> granted; `false` = admin-revoked below the plan ceiling */
  overrides: Record<string, boolean>;
}

export interface EntitlementListResult {
  users: EntitlementUser[];
  count: number;
}

/**
 * The ONLY feature keys the backend entitlement layer actually enforces
 * (mirrors GATED_FEATURES in mcp-server/src/middleware/tierGate.ts). The admin
 * UI offers only these so a revoke can never be a silent no-op; POST
 * /admin/entitlements 400s `UNENFORCEABLE_FEATURE` on anything else.
 */
export const ENFORCEABLE_FEATURES: readonly { key: string; label: string }[] = [
  { key: "speed_feed", label: "Speed/Feed calc" },
  { key: "program_generate", label: "Program generation" },
  { key: "simulation", label: "Simulation" },
  { key: "dfm", label: "DFM analysis" },
  { key: "stochastic", label: "Stochastic / uncertainty" },
  { key: "api_access", label: "API access" },
  { key: "print_to_program", label: "Print to program" },
  { key: "edm_program", label: "EDM program" },
  { key: "laser_program", label: "Laser program" },
  { key: "waterjet_program", label: "Waterjet program" },
];
