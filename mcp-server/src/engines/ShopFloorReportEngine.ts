/**
 * ShopFloorReportEngine — Production Reports & Analytics
 * =======================================================
 *
 * Generates production reports, KPI dashboards, efficiency
 * metrics, and trend analysis for shop floor operations.
 *
 * L2-P4-MS1/P0-U01 — Batch 1: Shop Floor Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const DailyProductionSchema = z.object({
  date: z.string(),
  department: z.string(),
  partsProduced: z.number(),
  partsPlanned: z.number(),
  efficiency: z.number(),
  scrapCount: z.number(),
  scrapRate: z.number(),
  laborHours: z.number(),
  machineHours: z.number(),
  oee: z.number(),
});

export const MachineEfficiencySchema = z.object({
  machineId: z.string(),
  machineName: z.string(),
  uptime: z.number(),
  downtime: z.number(),
  idleTime: z.number(),
  setupTime: z.number(),
  utilizationPercent: z.number(),
  avgCycleTime: z.number(),
  targetCycleTime: z.number(),
  cycleEfficiency: z.number(),
  partsProduced: z.number(),
  oee: z.number(),
});

export const EmployeeProductivitySchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  department: z.string(),
  hoursWorked: z.number(),
  partsProduced: z.number(),
  partsPerHour: z.number(),
  setupEfficiency: z.number(),
  qualityRate: z.number(),
  onTimeDelivery: z.number(),
});

export const ReportPeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  department: z.string().optional(),
  machineId: z.string().optional(),
  reportType: z.enum(["daily", "weekly", "monthly"]),
});

export const ProductionSummarySchema = z.object({
  period: z.object({
    start: z.string(),
    end: z.string(),
  }),
  totalPartsProduced: z.number(),
  totalPartsPlanned: z.number(),
  overallEfficiency: z.number(),
  totalScrap: z.number(),
  scrapRate: z.number(),
  totalLaborHours: z.number(),
  laborCost: z.number(),
  avgOEE: z.number(),
  topPerformingMachine: z.string(),
  topPerformingEmployee: z.string(),
  bottleneckDepartment: z.string(),
  recommendations: z.array(z.string()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type DailyProduction = z.infer<typeof DailyProductionSchema>;
export type MachineEfficiency = z.infer<typeof MachineEfficiencySchema>;
export type EmployeeProductivity = z.infer<typeof EmployeeProductivitySchema>;
export type ReportPeriod = z.infer<typeof ReportPeriodSchema>;
export type ProductionSummary = z.infer<typeof ProductionSummarySchema>;

// ─── Sample Data ──────────────────────────────────────────────────────────────

const dailyData: DailyProduction[] = [
  { date: "2024-12-16", department: "Lathe", partsProduced: 145, partsPlanned: 150, efficiency: 96.7, scrapCount: 3, scrapRate: 2.0, laborHours: 16, machineHours: 15.2, oee: 85.3 },
  { date: "2024-12-16", department: "Mill", partsProduced: 82, partsPlanned: 100, efficiency: 82.0, scrapCount: 5, scrapRate: 5.7, laborHours: 16, machineHours: 14.1, oee: 76.2 },
  { date: "2024-12-16", department: "Wire EDM", partsProduced: 12, partsPlanned: 15, efficiency: 80.0, scrapCount: 0, scrapRate: 0, laborHours: 8, machineHours: 7.5, oee: 72.1 },
  { date: "2024-12-17", department: "Lathe", partsProduced: 152, partsPlanned: 150, efficiency: 101.3, scrapCount: 2, scrapRate: 1.3, laborHours: 16, machineHours: 15.5, oee: 87.1 },
  { date: "2024-12-17", department: "Mill", partsProduced: 95, partsPlanned: 100, efficiency: 95.0, scrapCount: 2, scrapRate: 2.1, laborHours: 16, machineHours: 15.0, oee: 82.4 },
];

const machineData: MachineEfficiency[] = [
  { machineId: "okuma-lb3000-1", machineName: "Okuma LB3000 EX II #1", uptime: 14.5, downtime: 0.5, idleTime: 0.5, setupTime: 0.5, utilizationPercent: 90.6, avgCycleTime: 5.2, targetCycleTime: 5.0, cycleEfficiency: 96.2, partsProduced: 167, oee: 87.5 },
  { machineId: "okuma-lb3000-2", machineName: "Okuma LB3000 EX II #2", uptime: 13.8, downtime: 1.2, idleTime: 0.5, setupTime: 0.5, utilizationPercent: 86.3, avgCycleTime: 5.5, targetCycleTime: 5.0, cycleEfficiency: 90.9, partsProduced: 150, oee: 82.1 },
  { machineId: "haas-vf2ss-1", machineName: "Haas VF-2SS #1", uptime: 13.2, downtime: 1.8, idleTime: 0.5, setupTime: 0.5, utilizationPercent: 82.5, avgCycleTime: 8.3, targetCycleTime: 8.0, cycleEfficiency: 96.4, partsProduced: 95, oee: 78.6 },
];

const employeeData: EmployeeProductivity[] = [
  { employeeId: "EMP-101", employeeName: "John Smith", department: "Lathe", hoursWorked: 40, partsProduced: 420, partsPerHour: 10.5, setupEfficiency: 95.2, qualityRate: 98.5, onTimeDelivery: 100 },
  { employeeId: "EMP-102", employeeName: "Mike Johnson", department: "Lathe", hoursWorked: 40, partsProduced: 385, partsPerHour: 9.6, setupEfficiency: 88.5, qualityRate: 97.2, onTimeDelivery: 95 },
  { employeeId: "EMP-103", employeeName: "Sarah Williams", department: "Mill", hoursWorked: 40, partsProduced: 245, partsPerHour: 6.1, setupEfficiency: 92.3, qualityRate: 99.1, onTimeDelivery: 98 },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class ShopFloorReportEngine {
  /**
   * Get daily production report
   * @param date - Date to report on
   * @param department - Optional department filter
   * @returns Daily production data
   */
  static getDailyProduction(date: string, department?: string): DailyProduction[] {
    let data = dailyData.filter(d => d.date === date);
    if (department) {
      data = data.filter(d => d.department === department);
    }
    return data;
  }

  /**
   * Get machine efficiency report
   * @param machineId - Optional machine filter
   * @returns Machine efficiency data
   */
  static getMachineEfficiency(machineId?: string): MachineEfficiency[] {
    if (machineId) {
      return machineData.filter(m => m.machineId === machineId);
    }
    return [...machineData];
  }

  /**
   * Get employee productivity report
   * @param employeeId - Optional employee filter
   * @param department - Optional department filter
   * @returns Employee productivity data
   */
  static getEmployeeProductivity(employeeId?: string, department?: string): EmployeeProductivity[] {
    let data = [...employeeData];
    if (employeeId) {
      data = data.filter(e => e.employeeId === employeeId);
    }
    if (department) {
      data = data.filter(e => e.department === department);
    }
    return data;
  }

  /**
   * Generate production summary for a period
   * @param period - Report period parameters
   * @returns Production summary with KPIs
   */
  static getProductionSummary(period: ReportPeriod): ProductionSummary {
    ReportPeriodSchema.parse(period);

    const totalPartsProduced = dailyData.reduce((sum, d) => sum + d.partsProduced, 0);
    const totalPartsPlanned = dailyData.reduce((sum, d) => sum + d.partsPlanned, 0);
    const totalScrap = dailyData.reduce((sum, d) => sum + d.scrapCount, 0);
    const totalLaborHours = dailyData.reduce((sum, d) => sum + d.laborHours, 0);
    const avgOEE = dailyData.reduce((sum, d) => sum + d.oee, 0) / dailyData.length;

    const topMachine = [...machineData].sort((a, b) => b.oee - a.oee)[0];
    const topEmployee = [...employeeData].sort((a, b) => b.partsPerHour - a.partsPerHour)[0];

    const deptEfficiency = new Map<string, number[]>();
    dailyData.forEach(d => {
      const arr = deptEfficiency.get(d.department) || [];
      arr.push(d.efficiency);
      deptEfficiency.set(d.department, arr);
    });

    let bottleneck = "None";
    let lowestEff = 100;
    deptEfficiency.forEach((effs, dept) => {
      const avgEff = effs.reduce((a, b) => a + b, 0) / effs.length;
      if (avgEff < lowestEff) {
        lowestEff = avgEff;
        bottleneck = dept;
      }
    });

    const recommendations: string[] = [];
    if (totalScrap / totalPartsProduced > 0.03) {
      recommendations.push("Scrap rate exceeds 3% target - review quality procedures");
    }
    if (avgOEE < 80) {
      recommendations.push("OEE below 80% target - investigate downtime causes");
    }
    if (lowestEff < 85) {
      recommendations.push(`${bottleneck} department efficiency below target - consider capacity adjustment`);
    }
    if (recommendations.length === 0) {
      recommendations.push("All KPIs within acceptable ranges - maintain current practices");
    }

    return {
      period: { start: period.startDate, end: period.endDate },
      totalPartsProduced,
      totalPartsPlanned,
      overallEfficiency: Math.round((totalPartsProduced / totalPartsPlanned) * 1000) / 10,
      totalScrap,
      scrapRate: Math.round((totalScrap / totalPartsProduced) * 1000) / 10,
      totalLaborHours,
      laborCost: Math.round(totalLaborHours * 45 * 100) / 100,
      avgOEE: Math.round(avgOEE * 10) / 10,
      topPerformingMachine: topMachine.machineName,
      topPerformingEmployee: topEmployee.employeeName,
      bottleneckDepartment: bottleneck,
      recommendations,
    };
  }

  /**
   * Get OEE trend over time
   * @param machineId - Optional machine filter
   * @param days - Number of days to include
   * @returns OEE trend data
   */
  static getOEETrend(machineId?: string, days: number = 7): { date: string; oee: number }[] {
    const grouped = new Map<string, number[]>();
    dailyData.forEach(d => {
      const arr = grouped.get(d.date) || [];
      arr.push(d.oee);
      grouped.set(d.date, arr);
    });

    return Array.from(grouped.entries())
      .map(([date, oees]) => ({
        date,
        oee: Math.round((oees.reduce((a, b) => a + b, 0) / oees.length) * 10) / 10,
      }))
      .slice(-days);
  }

  /**
   * Get department comparison
   * @returns Department performance comparison
   */
  static getDepartmentComparison(): { department: string; efficiency: number; oee: number; scrapRate: number }[] {
    const deptStats = new Map<string, { efficiency: number[]; oee: number[]; scrapRate: number[] }>();

    dailyData.forEach(d => {
      const stats = deptStats.get(d.department) || { efficiency: [], oee: [], scrapRate: [] };
      stats.efficiency.push(d.efficiency);
      stats.oee.push(d.oee);
      stats.scrapRate.push(d.scrapRate);
      deptStats.set(d.department, stats);
    });

    return Array.from(deptStats.entries()).map(([dept, stats]) => ({
      department: dept,
      efficiency: Math.round((stats.efficiency.reduce((a, b) => a + b, 0) / stats.efficiency.length) * 10) / 10,
      oee: Math.round((stats.oee.reduce((a, b) => a + b, 0) / stats.oee.length) * 10) / 10,
      scrapRate: Math.round((stats.scrapRate.reduce((a, b) => a + b, 0) / stats.scrapRate.length) * 10) / 10,
    }));
  }

  /**
   * Generate efficiency improvement recommendations
   * @returns Actionable improvement recommendations
   */
  static getImprovementRecommendations(): { area: string; current: number; target: number; action: string; priority: string }[] {
    const recommendations: { area: string; current: number; target: number; action: string; priority: string }[] = [];

    machineData.forEach(m => {
      if (m.cycleEfficiency < 95) {
        recommendations.push({
          area: m.machineName,
          current: m.cycleEfficiency,
          target: 95,
          action: "Review feeds/speeds and tooling to reduce cycle time",
          priority: m.cycleEfficiency < 90 ? "high" : "medium",
        });
      }
      if (m.utilizationPercent < 85) {
        recommendations.push({
          area: m.machineName,
          current: m.utilizationPercent,
          target: 85,
          action: "Reduce changeover time or improve job scheduling",
          priority: m.utilizationPercent < 75 ? "high" : "medium",
        });
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
    });
  }

  static getSelfAwareness() {
    return {
      name: "ShopFloorReportEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["getDailyProduction", "getMachineEfficiency", "getEmployeeProductivity", "getProductionSummary", "getOEETrend", "getDepartmentComparison", "getImprovementRecommendations"],
      dependencies: [],
    };
  }
}

export const shopFloorReportEngine = new ShopFloorReportEngine();
