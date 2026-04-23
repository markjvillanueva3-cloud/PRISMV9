/**
 * BurdenRateEngine — Machine burden rate calculations
 * Stub: original file lost to exFAT corruption (2026-04-10)
 */
class BurdenRateEngine {
  calculateBurdenRate(machineId: string, periodMonths: number) {
    return {
      machineId,
      periodMonths,
      burdenRate: 0,
      currency: "USD",
      status: "stub — original lost to disk corruption",
    };
  }

  getAll(machineIds: string[]) {
    return machineIds.map((id) => this.calculateBurdenRate(id, 3));
  }
}

export const burdenRateEngine = new BurdenRateEngine();
