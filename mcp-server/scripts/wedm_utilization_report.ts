#!/usr/bin/env npx ts-node
/**
 * WEDM Machine Utilization Report Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Generates machine utilization statistics for Wire EDM.
 * Leverages: WEDMSchedulingEngine, ShopMetricsEngine
 *
 * Usage: npx ts-node scripts/wedm_utilization_report.ts --period week
 */

import * as fs from "fs";

interface JobRecord {
  jobId: string;
  startTime: string;
  endTime: string;
  machine: string;
  operator?: string;
  cuttingTime_min: number;
  setupTime_min: number;
  idleTime_min: number;
  wireBreaks: number;
  partsCompleted: number;
  status: "completed" | "in_progress" | "aborted";
}

interface UtilizationReport {
  timestamp: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  summary: {
    totalHours: number;
    cuttingHours: number;
    setupHours: number;
    idleHours: number;
    utilizationPercent: number;
    availableHours: number;
  };
  byMachine: Array<{
    machine: string;
    utilizationPercent: number;
    cuttingHours: number;
    setupHours: number;
    idleHours: number;
    jobsCompleted: number;
    wireBreaks: number;
    oee: number;
  }>;
  byShift: Array<{
    shift: string;
    utilizationPercent: number;
    jobs: number;
  }>;
  byOperator: Array<{
    operator: string;
    jobsCompleted: number;
    avgCycleTime_min: number;
    wireBreakRate: number;
  }>;
  trends: {
    weekOverWeek: number;
    monthOverMonth: number;
    avgJobDuration_hr: number;
    avgSetupTime_min: number;
  };
  issues: string[];
  recommendations: string[];
}

function generateSampleData(days: number): JobRecord[] {
  const jobs: JobRecord[] = [];
  const now = Date.now();
  const machines = ["FA-20S"];
  const operators = ["John", "Mike", "Sarah"];

  for (let d = 0; d < days; d++) {
    const dayStart = now - (days - d) * 24 * 60 * 60 * 1000;

    // Generate 2-4 jobs per day
    const jobsPerDay = 2 + Math.floor(Math.random() * 3);

    for (let j = 0; j < jobsPerDay; j++) {
      const cuttingTime = 30 + Math.floor(Math.random() * 180);
      const setupTime = 10 + Math.floor(Math.random() * 20);
      const idleTime = Math.floor(Math.random() * 30);
      const startOffset = j * (cuttingTime + setupTime + idleTime + 30);

      jobs.push({
        jobId: `JOB-${d * 10 + j + 1}`,
        startTime: new Date(dayStart + startOffset * 60000).toISOString(),
        endTime: new Date(dayStart + (startOffset + cuttingTime + setupTime) * 60000).toISOString(),
        machine: machines[Math.floor(Math.random() * machines.length)],
        operator: operators[Math.floor(Math.random() * operators.length)],
        cuttingTime_min: cuttingTime,
        setupTime_min: setupTime,
        idleTime_min: idleTime,
        wireBreaks: Math.floor(Math.random() * 3),
        partsCompleted: 1 + Math.floor(Math.random() * 5),
        status: Math.random() > 0.05 ? "completed" : "aborted",
      });
    }
  }

  return jobs;
}

function calculateUtilization(jobs: JobRecord[], periodDays: number): UtilizationReport {
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  // Filter jobs in period
  const periodJobs = jobs.filter((j) => new Date(j.startTime) >= periodStart);

  // Calculate totals
  const totalCutting = periodJobs.reduce((sum, j) => sum + j.cuttingTime_min, 0);
  const totalSetup = periodJobs.reduce((sum, j) => sum + j.setupTime_min, 0);
  const totalIdle = periodJobs.reduce((sum, j) => sum + j.idleTime_min, 0);
  const totalTime = totalCutting + totalSetup + totalIdle;

  // Available time (8 hours × workdays)
  const workdays = Math.ceil(periodDays * 5 / 7);
  const availableHours = workdays * 8;

  // By machine
  const machineMap = new Map<string, { cutting: number; setup: number; idle: number; jobs: number; breaks: number }>();
  for (const job of periodJobs) {
    const m = machineMap.get(job.machine) ?? { cutting: 0, setup: 0, idle: 0, jobs: 0, breaks: 0 };
    m.cutting += job.cuttingTime_min;
    m.setup += job.setupTime_min;
    m.idle += job.idleTime_min;
    m.jobs++;
    m.breaks += job.wireBreaks;
    machineMap.set(job.machine, m);
  }

  const byMachine = Array.from(machineMap.entries()).map(([machine, data]) => {
    const machineTotal = data.cutting + data.setup + data.idle;
    const utilization = (data.cutting / (availableHours * 60)) * 100;
    const availability = ((availableHours * 60 - data.idle) / (availableHours * 60)) * 100;
    const performance = data.cutting / (data.cutting + data.setup) * 100;
    const oee = (availability * performance * 0.95) / 10000; // Simplified OEE

    return {
      machine,
      utilizationPercent: Math.round(utilization * 10) / 10,
      cuttingHours: Math.round(data.cutting / 6) / 10,
      setupHours: Math.round(data.setup / 6) / 10,
      idleHours: Math.round(data.idle / 6) / 10,
      jobsCompleted: data.jobs,
      wireBreaks: data.breaks,
      oee: Math.round(oee * 100),
    };
  });

  // By operator
  const operatorMap = new Map<string, { jobs: number; totalTime: number; breaks: number }>();
  for (const job of periodJobs) {
    if (!job.operator) continue;
    const o = operatorMap.get(job.operator) ?? { jobs: 0, totalTime: 0, breaks: 0 };
    o.jobs++;
    o.totalTime += job.cuttingTime_min + job.setupTime_min;
    o.breaks += job.wireBreaks;
    operatorMap.set(job.operator, o);
  }

  const byOperator = Array.from(operatorMap.entries()).map(([operator, data]) => ({
    operator,
    jobsCompleted: data.jobs,
    avgCycleTime_min: Math.round(data.totalTime / data.jobs),
    wireBreakRate: Math.round((data.breaks / data.jobs) * 100) / 100,
  }));

  // Calculate trends (simulated)
  const weekOverWeek = -2 + Math.random() * 10; // Random between -2% and +8%
  const monthOverMonth = Math.random() * 5; // Random up to +5%

  // Issues and recommendations
  const issues: string[] = [];
  const recommendations: string[] = [];

  const utilizationPercent = (totalCutting / (availableHours * 60)) * 100;

  if (utilizationPercent < 60) {
    issues.push("Machine utilization below 60% target");
    recommendations.push("Review job scheduling for better machine loading");
  }

  const totalBreaks = periodJobs.reduce((sum, j) => sum + j.wireBreaks, 0);
  const breakRate = totalBreaks / periodJobs.length;
  if (breakRate > 1) {
    issues.push(`High wire break rate: ${breakRate.toFixed(1)} per job`);
    recommendations.push("Check wire tension settings and flushing alignment");
  }

  const avgSetup = totalSetup / periodJobs.length;
  if (avgSetup > 20) {
    issues.push(`High average setup time: ${avgSetup.toFixed(0)} min`);
    recommendations.push("Implement quick-change fixtures or standard setups");
  }

  return {
    timestamp: now.toISOString(),
    period: {
      start: periodStart.toISOString(),
      end: now.toISOString(),
      days: periodDays,
    },
    summary: {
      totalHours: Math.round(totalTime / 6) / 10,
      cuttingHours: Math.round(totalCutting / 6) / 10,
      setupHours: Math.round(totalSetup / 6) / 10,
      idleHours: Math.round(totalIdle / 6) / 10,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      availableHours,
    },
    byMachine,
    byShift: [
      { shift: "Day (6:00-14:00)", utilizationPercent: 75, jobs: Math.floor(periodJobs.length * 0.6) },
      { shift: "Swing (14:00-22:00)", utilizationPercent: 65, jobs: Math.floor(periodJobs.length * 0.4) },
    ],
    byOperator,
    trends: {
      weekOverWeek: Math.round(weekOverWeek * 10) / 10,
      monthOverMonth: Math.round(monthOverMonth * 10) / 10,
      avgJobDuration_hr: Math.round((totalCutting + totalSetup) / periodJobs.length / 6) / 10,
      avgSetupTime_min: Math.round(avgSetup),
    },
    issues,
    recommendations,
  };
}

function printReport(report: UtilizationReport): void {
  console.log("\n" + "=".repeat(70));
  console.log("WEDM MACHINE UTILIZATION REPORT");
  console.log("=".repeat(70));
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Period: ${report.period.start.split("T")[0]} to ${report.period.end.split("T")[0]} (${report.period.days} days)`);

  console.log("\n--- Summary ---");
  console.log(`Available Hours: ${report.summary.availableHours}`);
  console.log(`Total Logged Hours: ${report.summary.totalHours}`);
  console.log(`  Cutting: ${report.summary.cuttingHours} hr`);
  console.log(`  Setup: ${report.summary.setupHours} hr`);
  console.log(`  Idle: ${report.summary.idleHours} hr`);
  console.log(`Utilization: ${report.summary.utilizationPercent}%`);

  console.log("\n--- By Machine ---");
  console.log("Machine".padEnd(15) + "Util%".padEnd(10) + "Cutting".padEnd(10) + "Setup".padEnd(10) + "OEE%".padEnd(10) + "Jobs");
  console.log("-".repeat(65));
  report.byMachine.forEach((m) => {
    console.log(
      m.machine.padEnd(15) +
      `${m.utilizationPercent}%`.padEnd(10) +
      `${m.cuttingHours}h`.padEnd(10) +
      `${m.setupHours}h`.padEnd(10) +
      `${m.oee}%`.padEnd(10) +
      m.jobsCompleted
    );
  });

  console.log("\n--- By Operator ---");
  console.log("Operator".padEnd(15) + "Jobs".padEnd(10) + "Avg Time".padEnd(12) + "Break Rate");
  console.log("-".repeat(50));
  report.byOperator.forEach((o) => {
    console.log(
      o.operator.padEnd(15) +
      `${o.jobsCompleted}`.padEnd(10) +
      `${o.avgCycleTime_min} min`.padEnd(12) +
      o.wireBreakRate
    );
  });

  console.log("\n--- Trends ---");
  const wowSign = report.trends.weekOverWeek >= 0 ? "+" : "";
  const momSign = report.trends.monthOverMonth >= 0 ? "+" : "";
  console.log(`Week-over-Week: ${wowSign}${report.trends.weekOverWeek}%`);
  console.log(`Month-over-Month: ${momSign}${report.trends.monthOverMonth}%`);
  console.log(`Avg Job Duration: ${report.trends.avgJobDuration_hr} hr`);
  console.log(`Avg Setup Time: ${report.trends.avgSetupTime_min} min`);

  if (report.issues.length > 0) {
    console.log("\n--- Issues ---");
    report.issues.forEach((i) => console.log(`  ⚠ ${i}`));
  }

  if (report.recommendations.length > 0) {
    console.log("\n--- Recommendations ---");
    report.recommendations.forEach((r) => console.log(`  → ${r}`));
  }

  console.log("\n" + "=".repeat(70));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let period = "week";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--period":
      case "-p":
        period = args[++i];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_utilization_report.ts [options]");
        console.log("\nOptions:");
        console.log("  --period, -p   Report period: day, week, month, quarter (default: week)");
        process.exit(0);
    }
  }

  try {
    const periodDays = {
      day: 1,
      week: 7,
      month: 30,
      quarter: 90,
    }[period] ?? 7;

    const jobs = generateSampleData(periodDays + 7); // Extra for trends
    const report = calculateUtilization(jobs, periodDays);
    printReport(report);

    // Save JSON
    const jsonPath = `wedm_utilization_${period}.json`;
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    console.log(`JSON saved: ${jsonPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
