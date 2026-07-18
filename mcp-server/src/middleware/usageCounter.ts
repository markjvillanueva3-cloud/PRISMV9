/**
 * usageCounter -- per-user / per-feature / per-day usage counter (U-COMM-03).
 *
 * Was a stub (returned zeros); upgraded to a real in-memory counter so the
 * daily-cap tier gates (e.g. free = 10 speed/feed calcs/day) actually enforce.
 * Keys roll over by UTC date. In-memory only (process-local) -- adequate for a
 * single-node launch; a persisted/Redis backend can replace the Map later
 * without changing this contract.
 *
 * Preserved (infraDispatcher consumes these): getStats(), getUserUsage().
 * Added (tierGate + attachUserPlan consume these): increment(), getDayCounts().
 */
export interface UsageStats {
  mode: string;
  total_calls: number;
  unique_users: number;
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

class UsageCounter {
  // userId -> day -> feature -> count
  private readonly counts = new Map<string, Map<string, Map<string, number>>>();

  /** Record one use of a feature by a user (today). Returns the new count. */
  increment(userId: string, feature: string, day = dayKey()): number {
    if (!userId || !feature) return 0;
    let byDay = this.counts.get(userId);
    if (!byDay) {
      byDay = new Map();
      this.counts.set(userId, byDay);
    }
    let byFeature = byDay.get(day);
    if (!byFeature) {
      byFeature = new Map();
      byDay.set(day, byFeature);
    }
    const next = (byFeature.get(feature) ?? 0) + 1;
    byFeature.set(feature, next);
    return next;
  }

  /** Today's per-feature counts for a user (the shape tierGate reads as req.user.usage). */
  getDayCounts(userId: string, day = dayKey()): Record<string, number> {
    const byFeature = this.counts.get(userId)?.get(day);
    if (!byFeature) return {};
    return Object.fromEntries(byFeature);
  }

  /** Count for a single feature today. */
  getCount(userId: string, feature: string, day = dayKey()): number {
    return this.counts.get(userId)?.get(day)?.get(feature) ?? 0;
  }

  async getStats(): Promise<UsageStats> {
    const today = dayKey();
    let total = 0;
    let uniqueToday = 0;
    for (const byDay of this.counts.values()) {
      const byFeature = byDay.get(today);
      if (byFeature) {
        uniqueToday++;
        for (const n of byFeature.values()) total += n;
      }
    }
    return { mode: "in-memory", total_calls: total, unique_users: uniqueToday };
  }

  async getUserUsage(userId: string): Promise<Record<string, unknown>> {
    return { mode: "in-memory", user_id: userId, calls: this.getDayCounts(userId) };
  }
}

let _counter: UsageCounter | null = null;

export function getUsageCounterSync(): UsageCounter {
  if (!_counter) _counter = new UsageCounter();
  return _counter;
}

export async function getUsageCounter(): Promise<UsageCounter> {
  return getUsageCounterSync();
}
