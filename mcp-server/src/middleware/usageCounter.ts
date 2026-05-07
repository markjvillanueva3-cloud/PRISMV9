/**
 * usageCounter — stub (U-EFF25).
 *
 * infraDispatcher pulls this dynamically. All call sites are wrapped in
 * try/catch with `{ mode: "not_initialized" }` fallbacks, so this stub
 * only needs to satisfy TS2307 and return safe defaults.
 */
export interface UsageStats {
  mode: string;
  total_calls: number;
  unique_users: number;
}

class UsageCounter {
  async getStats(): Promise<UsageStats> {
    return { mode: "in-memory-stub", total_calls: 0, unique_users: 0 };
  }

  async getUserUsage(userId: string): Promise<Record<string, unknown>> {
    return { mode: "in-memory-stub", user_id: userId, calls: 0 };
  }
}

let _counter: UsageCounter | null = null;

export async function getUsageCounter(): Promise<UsageCounter> {
  if (!_counter) _counter = new UsageCounter();
  return _counter;
}
