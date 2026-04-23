/**
 * ErrorBudgetEngine — U-FORE-17 (Reliability Substrate)
 *
 * Tracks error budget consumption against a target SLO.
 */

export interface ErrorBudgetTarget {
  service: string;
  availabilityTarget: number;
  windowHours: number;
}

export interface ErrorBudgetEvent {
  service: string;
  success: boolean;
  weight?: number;
  at?: number;
}

export interface ErrorBudgetStatus {
  service: string;
  total: number;
  failures: number;
  successRate: number;
  budgetUsed: number;
  budgetRemaining: number;
  burnRatePerHour: number;
  recommendation: "proceed" | "slow_down" | "freeze" | "rollback";
}

const DEFAULT_AVAILABILITY = 0.999;
const DEFAULT_WINDOW_HOURS = 24;
const SLOW_DOWN_THRESHOLD = 0.5;
const FREEZE_THRESHOLD = 0.9;
const ROLLBACK_THRESHOLD = 1.0;

export class ErrorBudgetEngine {
  readonly name = "ErrorBudgetEngine";
  private targets = new Map<string, ErrorBudgetTarget>();
  private events = new Map<string, ErrorBudgetEvent[]>();
  private clock: () => number;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
  }

  setTarget(target: ErrorBudgetTarget): void {
    if (!target || typeof target.service !== "string" || target.service.length === 0) {
      throw new Error("ErrorBudgetEngine.setTarget: service required");
    }
    if (!Number.isFinite(target.availabilityTarget) || target.availabilityTarget <= 0 || target.availabilityTarget >= 1) {
      throw new Error("ErrorBudgetEngine.setTarget: availabilityTarget must be in (0, 1)");
    }
    if (!Number.isFinite(target.windowHours) || target.windowHours <= 0) {
      throw new Error("ErrorBudgetEngine.setTarget: windowHours must be positive");
    }
    this.targets.set(target.service, {
      service: target.service,
      availabilityTarget: target.availabilityTarget,
      windowHours: target.windowHours,
    });
  }

  record(event: ErrorBudgetEvent): void {
    if (!event || typeof event.service !== "string" || event.service.length === 0) {
      throw new Error("ErrorBudgetEngine.record: service required");
    }
    if (typeof event.success !== "boolean") {
      throw new Error("ErrorBudgetEngine.record: success boolean required");
    }
    const at = event.at ?? this.clock();
    const weight = event.weight ?? 1;
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("ErrorBudgetEngine.record: weight must be positive");
    }
    const list = this.events.get(event.service) ?? [];
    list.push({ service: event.service, success: event.success, weight, at });
    this.events.set(event.service, list);
  }

  status(service: string): ErrorBudgetStatus {
    if (!service) throw new Error("ErrorBudgetEngine.status: service required");
    const target = this.targets.get(service) ?? {
      service,
      availabilityTarget: DEFAULT_AVAILABILITY,
      windowHours: DEFAULT_WINDOW_HOURS,
    };
    const now = this.clock();
    const windowMs = target.windowHours * 3_600_000;
    const windowStart = now - windowMs;
    const all = (this.events.get(service) ?? []).filter((e) => (e.at ?? 0) > windowStart);
    this.events.set(service, all);

    let total = 0;
    let failures = 0;
    for (const event of all) {
      const weight = event.weight ?? 1;
      total += weight;
      if (!event.success) failures += weight;
    }
    const successRate = total === 0 ? 1 : (total - failures) / total;
    const errorRate = 1 - successRate;
    const allowedErrorRate = 1 - target.availabilityTarget;
    const budgetUsed = allowedErrorRate === 0 ? (errorRate > 0 ? Infinity : 0) : errorRate / allowedErrorRate;
    const budgetRemaining = Math.max(0, 1 - budgetUsed);
    const burnRatePerHour = total === 0 ? 0 : (failures / total) / (target.windowHours === 0 ? 1 : target.windowHours);

    const recommendation: ErrorBudgetStatus["recommendation"] =
      budgetUsed >= ROLLBACK_THRESHOLD
        ? "rollback"
        : budgetUsed >= FREEZE_THRESHOLD
          ? "freeze"
          : budgetUsed >= SLOW_DOWN_THRESHOLD
            ? "slow_down"
            : "proceed";

    return {
      service,
      total,
      failures,
      successRate,
      budgetUsed,
      budgetRemaining,
      burnRatePerHour,
      recommendation,
    };
  }

  reset(service?: string): void {
    if (!service) {
      this.events.clear();
      return;
    }
    this.events.delete(service);
  }

  listServices(): string[] {
    return Array.from(new Set([...this.targets.keys(), ...this.events.keys()]));
  }
}

export const errorBudgetEngine = new ErrorBudgetEngine();
