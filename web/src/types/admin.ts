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
