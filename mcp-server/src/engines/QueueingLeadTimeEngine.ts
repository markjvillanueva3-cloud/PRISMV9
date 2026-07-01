/**
 * QueueingLeadTimeEngine — honest lead-time prediction via the Kingman (VUT) approximation.
 *
 * Invention E7 (builder-ready spec:
 * knowledge/wiki/architecture/prism-invention-queueing-leadtime-spec.md).
 *
 * The naive `prism_scheduling:lead_time_estimate` multiplies process time by a
 * hardcoded queue_factor (2.5). That ignores the dominant effect: queue time
 * EXPLODES as utilization rho -> 1. Kingman's VUT approximation:
 *
 *   CT_q = ( (Ca^2 + Cs^2) / 2 ) * ( rho / (1 - rho) ) * te
 *
 *   V = variability term (Ca, Cs = coeff of variation of arrivals / service)
 *   U = utilization term rho/(1-rho)  — 0.80 -> 4 ; 0.90 -> 9 ; 0.95 -> 19
 *   T = te = effective process time
 *
 * Pure deterministic math — no material constants, no NN, no randomness.
 * Reference: Hopp & Spearman "Factory Physics"; Kingman (1961).
 */

/** One workstation on a job's routing. */
export interface QueueWorkstation {
  id: string;
  effectiveProcessTime_min: number; // te — process time including detractors
  arrivalCV: number;                // Ca — coefficient of variation of inter-arrival times (>= 0)
  serviceCV: number;                // Cs — coefficient of variation of process time (>= 0)
  utilization: number;              // rho — in (0, 1); >= 1 means over capacity
}

export interface QueueLeadTimeInput {
  workstations: QueueWorkstation[];
  jobRouting: string[]; // ordered workstation ids the job visits
}

export interface QueuePerStation {
  id: string;
  queueTime_min: number;
  processTime_min: number;
  totalTime_min: number;
  utilization: number;
  isHotspot: boolean;
}

export interface QueueBottleneck {
  id: string;
  utilization: number;
  recommendedUtilization: number;
  leadTimeIfBackedOff_min: number;
}

export interface QueueLeadTimeResult {
  perStation: QueuePerStation[];
  totalLeadTime_min: number;
  totalProcessTime_min: number;
  totalQueueTime_min: number;
  queueFraction: number; // queueTime / leadTime — often 0.7-0.9 in a hot shop
  bottleneck: QueueBottleneck | null;
  overCapacityStations: string[];
  rationale: string;
}

/** A safe utilization to back a hot station off to (Factory Physics practical target). */
const RECOMMENDED_BACKOFF_UTILIZATION = 0.85;
/** A station is a "hotspot" when its queue time is >= this fraction of the largest. */
const HOTSPOT_FRACTION = 0.9;

export class QueueingLeadTimeEngine {
  /** Kingman VUT queue time for a single station. Returns Infinity when rho >= 1. */
  private kingmanQueueTime(ws: QueueWorkstation): number {
    const { utilization: rho, arrivalCV: ca, serviceCV: cs, effectiveProcessTime_min: te } = ws;
    if (rho >= 1) return Infinity;
    const variability = (ca * ca + cs * cs) / 2;
    const utilizationTerm = rho / (1 - rho);
    return variability * utilizationTerm * te;
  }

  /** Predict honest lead time across a job's routing. */
  predict(input: QueueLeadTimeInput): QueueLeadTimeResult {
    if (!input || typeof input !== "object") {
      throw new Error("QueueingLeadTimeEngine: input object required");
    }
    const { workstations, jobRouting } = input;
    if (!Array.isArray(workstations) || workstations.length === 0) {
      throw new Error("QueueingLeadTimeEngine: at least one workstation required");
    }
    if (!Array.isArray(jobRouting) || jobRouting.length === 0) {
      throw new Error("QueueingLeadTimeEngine: jobRouting must be a non-empty array");
    }

    // Index + validate every workstation.
    const byId = new Map<string, QueueWorkstation>();
    for (const ws of workstations) {
      if (!ws || typeof ws.id !== "string" || ws.id === "") {
        throw new Error("QueueingLeadTimeEngine: every workstation needs a non-empty string id");
      }
      for (const [field, v] of [
        ["effectiveProcessTime_min", ws.effectiveProcessTime_min],
        ["arrivalCV", ws.arrivalCV],
        ["serviceCV", ws.serviceCV],
        ["utilization", ws.utilization],
      ] as const) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          throw new Error(`QueueingLeadTimeEngine: workstation '${ws.id}' field '${field}' must be a finite number`);
        }
      }
      if (ws.effectiveProcessTime_min < 0) {
        throw new Error(`QueueingLeadTimeEngine: workstation '${ws.id}' effectiveProcessTime_min must be >= 0`);
      }
      if (ws.arrivalCV < 0 || ws.serviceCV < 0) {
        throw new Error(`QueueingLeadTimeEngine: workstation '${ws.id}' CV values must be >= 0`);
      }
      if (ws.utilization <= 0) {
        throw new Error(`QueueingLeadTimeEngine: workstation '${ws.id}' utilization must be > 0`);
      }
      byId.set(ws.id, ws);
    }

    // Walk the routing.
    const perStation: QueuePerStation[] = [];
    const overCapacityStations: string[] = [];
    let totalQueue = 0;
    let totalProcess = 0;
    let anyInfinite = false;

    for (const stationId of jobRouting) {
      const ws = byId.get(stationId);
      if (!ws) {
        throw new Error(`QueueingLeadTimeEngine: jobRouting references unknown workstation '${stationId}'`);
      }
      const qt = this.kingmanQueueTime(ws);
      const pt = ws.effectiveProcessTime_min;
      if (!Number.isFinite(qt)) {
        anyInfinite = true;
        overCapacityStations.push(ws.id);
      } else {
        totalQueue += qt;
      }
      totalProcess += pt;
      perStation.push({
        id: ws.id,
        queueTime_min: qt,
        processTime_min: pt,
        totalTime_min: Number.isFinite(qt) ? qt + pt : Infinity,
        utilization: ws.utilization,
        isHotspot: false, // set below
      });
    }

    // Mark hotspots (relative to the largest finite queue time).
    const finiteQueues = perStation.map((s) => s.queueTime_min).filter((q) => Number.isFinite(q));
    const maxQueue = finiteQueues.length ? Math.max(...finiteQueues) : 0;
    for (const s of perStation) {
      if (Number.isFinite(s.queueTime_min) && maxQueue > 0 && s.queueTime_min >= HOTSPOT_FRACTION * maxQueue) {
        s.isHotspot = true;
      }
    }

    // Over-capacity short-circuit: lead time is unbounded.
    if (anyInfinite) {
      return {
        perStation,
        totalLeadTime_min: Infinity,
        totalProcessTime_min: totalProcess,
        totalQueueTime_min: Infinity,
        queueFraction: 1,
        bottleneck: null,
        overCapacityStations,
        rationale:
          `Lead time is UNBOUNDED — station(s) ${overCapacityStations.join(", ")} have utilization >= 1.0 ` +
          `(arrivals meet or exceed capacity; the queue grows without limit). Add capacity or reduce arrival rate before any lead-time quote is meaningful.`,
      };
    }

    const totalLead = totalQueue + totalProcess;
    const queueFraction = totalLead > 0 ? totalQueue / totalLead : 0;

    // Bottleneck = the station with the largest queue time.
    let bottleneck: QueueBottleneck | null = null;
    if (perStation.length > 0) {
      const worst = perStation.reduce((a, b) => (b.queueTime_min > a.queueTime_min ? b : a));
      const worstWs = byId.get(worst.id)!;
      // Recompute the worst station's queue time at the backed-off utilization.
      const backedOff: QueueWorkstation = {
        ...worstWs,
        utilization: Math.min(worstWs.utilization, RECOMMENDED_BACKOFF_UTILIZATION),
      };
      const backedOffQueue = this.kingmanQueueTime(backedOff);
      const leadIfBackedOff = totalLead - worst.queueTime_min + backedOffQueue;
      bottleneck = {
        id: worst.id,
        utilization: worstWs.utilization,
        recommendedUtilization: Math.min(worstWs.utilization, RECOMMENDED_BACKOFF_UTILIZATION),
        leadTimeIfBackedOff_min: leadIfBackedOff,
      };
    }

    const rationale =
      `Lead time ${totalLead.toFixed(1)} min = ${totalProcess.toFixed(1)} min process ` +
      `+ ${totalQueue.toFixed(1)} min queue (${(queueFraction * 100).toFixed(0)}% of lead time is queue). ` +
      (bottleneck && bottleneck.utilization > RECOMMENDED_BACKOFF_UTILIZATION
        ? `Bottleneck '${bottleneck.id}' runs at ${(bottleneck.utilization * 100).toFixed(0)}% utilization — ` +
          `backing it off to ${(bottleneck.recommendedUtilization * 100).toFixed(0)}% cuts lead time to ` +
          `${bottleneck.leadTimeIfBackedOff_min.toFixed(1)} min (the rho/(1-rho) term drops sharply).`
        : `No station is in the high-utilization danger zone (> ${(RECOMMENDED_BACKOFF_UTILIZATION * 100).toFixed(0)}%).`);

    return {
      perStation,
      totalLeadTime_min: totalLead,
      totalProcessTime_min: totalProcess,
      totalQueueTime_min: totalQueue,
      queueFraction,
      bottleneck,
      overCapacityStations,
      rationale,
    };
  }
}

export const queueingLeadTimeEngine = new QueueingLeadTimeEngine();
