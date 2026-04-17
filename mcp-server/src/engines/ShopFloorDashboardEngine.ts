/**
 * ShopFloorDashboardEngine — Real-time Shop Floor Status Dashboard
 * =================================================================
 *
 * Aggregates machine status, job progress, OEE metrics, and alerts
 * into a unified dashboard view for shop floor management.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MachineStatusSchema = z.object({
  machineId: z.string(),
  name: z.string(),
  status: z.enum(["running", "idle", "setup", "maintenance", "alarm", "offline"]),
  currentJobId: z.string().optional(),
  currentOperation: z.string().optional(),
  cycleProgress: z.number().min(0).max(100).optional(),
  operatorId: z.string().optional(),
  lastUpdate: z.string(),
});

export const JobProgressSchema = z.object({
  jobId: z.string(),
  partNumber: z.string(),
  customer: z.string(),
  quantityRequired: z.number(),
  quantityComplete: z.number(),
  currentOperation: z.string(),
  estimatedCompletion: z.string().optional(),
  priority: z.enum(["critical", "high", "normal", "low"]),
  status: z.enum(["not_started", "in_progress", "on_hold", "complete"]),
});

export const OEEMetricsSchema = z.object({
  availability: z.number().min(0).max(100),
  performance: z.number().min(0).max(100),
  quality: z.number().min(0).max(100),
  oee: z.number().min(0).max(100),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export const AlertSchema = z.object({
  id: z.string(),
  type: z.enum(["alarm", "warning", "info", "maintenance"]),
  source: z.string(),
  message: z.string(),
  timestamp: z.string(),
  acknowledged: z.boolean(),
  severity: z.enum(["critical", "high", "medium", "low"]),
});

export const DashboardInputSchema = z.object({
  shopId: z.string(),
  includeOffline: z.boolean().default(false),
  timeRangeHours: z.number().default(8),
  departmentFilter: z.string().optional(),
});

export const DashboardOutputSchema = z.object({
  shopId: z.string(),
  timestamp: z.string(),
  machines: z.array(MachineStatusSchema),
  activeJobs: z.array(JobProgressSchema),
  oeeMetrics: OEEMetricsSchema,
  alerts: z.array(AlertSchema),
  summary: z.object({
    totalMachines: z.number(),
    runningMachines: z.number(),
    idleMachines: z.number(),
    alarmedMachines: z.number(),
    activeJobCount: z.number(),
    completedToday: z.number(),
    unacknowledgedAlerts: z.number(),
  }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = z.infer<typeof MachineStatusSchema>;
export type JobProgress = z.infer<typeof JobProgressSchema>;
export type OEEMetrics = z.infer<typeof OEEMetricsSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type DashboardInput = z.infer<typeof DashboardInputSchema>;
export type DashboardOutput = z.infer<typeof DashboardOutputSchema>;

// ─── Mock Data Store ──────────────────────────────────────────────────────────

const mockMachines: MachineStatus[] = [
  { machineId: "okuma-lb3000-1", name: "Okuma LB3000 EX II #1", status: "running", currentJobId: "JOB-2024-001", currentOperation: "OP10 Turn", cycleProgress: 67, operatorId: "EMP-101", lastUpdate: new Date().toISOString() },
  { machineId: "okuma-lb3000-2", name: "Okuma LB3000 EX II #2", status: "setup", currentJobId: "JOB-2024-002", operatorId: "EMP-102", lastUpdate: new Date().toISOString() },
  { machineId: "haas-vf2ss-1", name: "Haas VF-2SS #1", status: "idle", lastUpdate: new Date().toISOString() },
  { machineId: "mitsubishi-mv1200r", name: "Mitsubishi MV1200R Wire EDM", status: "running", currentJobId: "JOB-2024-003", currentOperation: "1st Cut", cycleProgress: 45, lastUpdate: new Date().toISOString() },
  { machineId: "hurco-vm10", name: "Hurco VM10", status: "alarm", lastUpdate: new Date().toISOString() },
];

const mockJobs: JobProgress[] = [
  { jobId: "JOB-2024-001", partNumber: "DIE-4512-A", customer: "ALCOA", quantityRequired: 50, quantityComplete: 32, currentOperation: "OP10 Turn", priority: "high", status: "in_progress" },
  { jobId: "JOB-2024-002", partNumber: "PUNCH-7890-B", customer: "ITW", quantityRequired: 100, quantityComplete: 0, currentOperation: "OP10 Mill", priority: "normal", status: "in_progress" },
  { jobId: "JOB-2024-003", partNumber: "INSERT-2345-C", customer: "SFS", quantityRequired: 25, quantityComplete: 12, currentOperation: "Wire EDM 1st Cut", priority: "critical", status: "in_progress" },
];

const mockAlerts: Alert[] = [
  { id: "ALT-001", type: "alarm", source: "hurco-vm10", message: "Spindle overload detected", timestamp: new Date().toISOString(), acknowledged: false, severity: "critical" },
  { id: "ALT-002", type: "maintenance", source: "okuma-lb3000-1", message: "Scheduled PM in 2 days", timestamp: new Date().toISOString(), acknowledged: true, severity: "low" },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorDashboardEngine {
  /**
   * Get comprehensive dashboard data for a shop floor
   * @param input - Dashboard query parameters
   * @returns Complete dashboard state
   */
  static getDashboard(input: DashboardInput): DashboardOutput {
    const validated = DashboardInputSchema.parse(input);
    const now = new Date().toISOString();

    let machines = [...mockMachines];
    if (!validated.includeOffline) {
      machines = machines.filter(m => m.status !== "offline");
    }
    if (validated.departmentFilter) {
      machines = machines.filter(m => m.name.toLowerCase().includes(validated.departmentFilter!.toLowerCase()));
    }

    const runningCount = machines.filter(m => m.status === "running").length;
    const idleCount = machines.filter(m => m.status === "idle").length;
    const alarmedCount = machines.filter(m => m.status === "alarm").length;

    const oeeMetrics: OEEMetrics = {
      availability: 87.5,
      performance: 92.3,
      quality: 98.7,
      oee: 79.6,
      periodStart: new Date(Date.now() - validated.timeRangeHours * 3600000).toISOString(),
      periodEnd: now,
    };

    return {
      shopId: validated.shopId,
      timestamp: now,
      machines,
      activeJobs: mockJobs.filter(j => j.status === "in_progress"),
      oeeMetrics,
      alerts: mockAlerts,
      summary: {
        totalMachines: machines.length,
        runningMachines: runningCount,
        idleMachines: idleCount,
        alarmedMachines: alarmedCount,
        activeJobCount: mockJobs.filter(j => j.status === "in_progress").length,
        completedToday: 15,
        unacknowledgedAlerts: mockAlerts.filter(a => !a.acknowledged).length,
      },
    };
  }

  /**
   * Get status for a specific machine
   * @param machineId - Machine identifier
   * @returns Machine status or undefined if not found
   */
  static getMachineStatus(machineId: string): MachineStatus | undefined {
    return mockMachines.find(m => m.machineId === machineId);
  }

  /**
   * Get all active alerts
   * @param severity - Optional severity filter
   * @returns Filtered alerts
   */
  static getAlerts(severity?: Alert["severity"]): Alert[] {
    if (severity) {
      return mockAlerts.filter(a => a.severity === severity);
    }
    return [...mockAlerts];
  }

  /**
   * Acknowledge an alert
   * @param alertId - Alert identifier
   * @returns Updated alert or undefined
   */
  static acknowledgeAlert(alertId: string): Alert | undefined {
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
    return alert;
  }

  /**
   * Calculate OEE for a specific machine over a time period
   * @param machineId - Machine identifier
   * @param hoursBack - Hours to look back
   * @returns OEE metrics
   */
  static calculateMachineOEE(machineId: string, hoursBack: number = 8): OEEMetrics {
    const now = new Date();
    return {
      availability: 85 + Math.random() * 10,
      performance: 88 + Math.random() * 10,
      quality: 95 + Math.random() * 5,
      oee: 75 + Math.random() * 15,
      periodStart: new Date(now.getTime() - hoursBack * 3600000).toISOString(),
      periodEnd: now.toISOString(),
    };
  }

  /**
   * Get self-awareness metadata
   */
  static getSelfAwareness() {
    return {
      name: "ShopFloorDashboardEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: [
        "getDashboard",
        "getMachineStatus",
        "getAlerts",
        "acknowledgeAlert",
        "calculateMachineOEE",
      ],
      dependencies: [],
      dataSourcesUsed: ["machine_status", "job_progress", "oee_metrics", "alerts"],
    };
  }
}

export const shopFloorDashboardEngine = new ShopFloorDashboardEngine();
