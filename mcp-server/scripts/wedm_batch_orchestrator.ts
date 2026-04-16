#!/usr/bin/env npx ts-node
/**
 * WEDM Batch Orchestrator Script
 * Phase 0.2 - WEDM AGI Roadmap
 *
 * Orchestrates batch Wire EDM jobs with optimal sequencing.
 * Leverages: WEDMSchedulingEngine, WEDMBatchProgramAnalyzerEngine
 *
 * Usage: npx ts-node scripts/wedm_batch_orchestrator.ts --jobs-dir ./jobs/
 */

import { wedmSchedulingEngine } from "../src/engines/WEDMSchedulingEngine.js";
import { wedmBatchProgramAnalyzerEngine } from "../src/engines/WEDMBatchProgramAnalyzerEngine.js";
import * as fs from "fs";
import * as path from "path";

interface Job {
  id: string;
  file: string;
  material: string;
  thickness: number;
  perimeter: number;
  passes: number;
  estimatedTime_min: number;
  wireType: string;
  wireDiameter: number;
  priority: "low" | "normal" | "high" | "rush";
  customer?: string;
  dueDate?: string;
}

interface BatchPlan {
  timestamp: string;
  totalJobs: number;
  totalTime_hr: number;
  groups: Array<{
    name: string;
    jobs: string[];
    wireType: string;
    wireDiameter: number;
    estimatedTime_min: number;
    setupTime_min: number;
    sequence: number;
  }>;
  schedule: {
    start: string;
    end: string;
    machine: string;
    shifts: Array<{
      date: string;
      shift: string;
      jobs: string[];
      utilization: number;
    }>;
  };
  savings: {
    timeWithoutOptimization_min: number;
    timeWithOptimization_min: number;
    timeSaved_min: number;
    wireChangesAvoided: number;
    changeoversAvoided: number;
  };
  warnings: string[];
}

async function loadJobs(jobsDir: string): Promise<Job[]> {
  const jobs: Job[] = [];
  const files = fs.readdirSync(jobsDir);

  for (const file of files) {
    if (file.endsWith(".json")) {
      const content = fs.readFileSync(path.join(jobsDir, file), "utf-8");
      const job = JSON.parse(content) as Job;
      job.id = job.id ?? path.basename(file, ".json");
      jobs.push(job);
    } else if (file.endsWith(".nc") || file.endsWith(".NC")) {
      // Analyze NC file to extract job info
      const analysis = await wedmBatchProgramAnalyzerEngine.analyze({
        filePath: path.join(jobsDir, file),
      });
      jobs.push({
        id: path.basename(file, path.extname(file)),
        file,
        material: analysis.material ?? "D2",
        thickness: analysis.thickness ?? 25,
        perimeter: analysis.perimeter ?? 500,
        passes: analysis.passes ?? 4,
        estimatedTime_min: analysis.estimatedTime ?? 60,
        wireType: analysis.wireType ?? "brass",
        wireDiameter: analysis.wireDiameter ?? 0.25,
        priority: "normal",
      });
    }
  }

  return jobs;
}

async function orchestrateBatch(jobs: Job[], machine: string): Promise<BatchPlan> {
  console.log(`\nOrchestrating ${jobs.length} jobs for ${machine}...`);

  // Group by wire type and diameter to minimize changes
  const groups = new Map<string, Job[]>();
  for (const job of jobs) {
    const key = `${job.wireType}_${job.wireDiameter}mm`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(job);
  }

  // Sort within groups by material (thermal stability) and thickness
  for (const [, groupJobs] of groups) {
    groupJobs.sort((a, b) => {
      // Rush jobs first
      const priorityOrder = { rush: 0, high: 1, normal: 2, low: 3 };
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pDiff !== 0) return pDiff;

      // Then by material
      if (a.material !== b.material) return a.material.localeCompare(b.material);

      // Then by thickness (ascending for thermal stability)
      return a.thickness - b.thickness;
    });
  }

  // Sort groups by total time (longest first for better utilization)
  const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
    const timeA = a[1].reduce((sum, j) => sum + j.estimatedTime_min, 0);
    const timeB = b[1].reduce((sum, j) => sum + j.estimatedTime_min, 0);
    return timeB - timeA;
  });

  // Build execution plan
  const batchGroups = sortedGroups.map(([key, groupJobs], index) => {
    const [wireType, diameter] = key.split("_");
    return {
      name: key,
      jobs: groupJobs.map((j) => j.id),
      wireType,
      wireDiameter: parseFloat(diameter),
      estimatedTime_min: groupJobs.reduce((sum, j) => sum + j.estimatedTime_min, 0),
      setupTime_min: index === 0 ? 15 : 10, // First setup is longer
      sequence: index + 1,
    };
  });

  // Calculate schedule
  const totalTime_min = batchGroups.reduce(
    (sum, g) => sum + g.estimatedTime_min + g.setupTime_min, 0
  );
  const startTime = new Date();
  startTime.setHours(8, 0, 0, 0); // Start at 8 AM
  const endTime = new Date(startTime.getTime() + totalTime_min * 60000);

  // Calculate savings
  const timeWithoutOptimization = jobs.reduce((sum, j) => sum + j.estimatedTime_min, 0) +
    jobs.length * 15; // 15 min setup each
  const wireChangesWithout = jobs.length - 1;
  const wireChangesWith = batchGroups.length - 1;

  const warnings: string[] = [];
  if (totalTime_min > 8 * 60) {
    warnings.push("Batch exceeds single shift — consider splitting");
  }
  const rushJobs = jobs.filter((j) => j.priority === "rush");
  if (rushJobs.length > 0 && batchGroups[0].jobs[0] !== rushJobs[0].id) {
    warnings.push(`Rush job ${rushJobs[0].id} not first in sequence — wire type conflict`);
  }

  return {
    timestamp: new Date().toISOString(),
    totalJobs: jobs.length,
    totalTime_hr: totalTime_min / 60,
    groups: batchGroups,
    schedule: {
      start: startTime.toISOString(),
      end: endTime.toISOString(),
      machine,
      shifts: [
        {
          date: startTime.toISOString().split("T")[0],
          shift: "Day",
          jobs: jobs.map((j) => j.id),
          utilization: Math.min(totalTime_min / (8 * 60), 1),
        },
      ],
    },
    savings: {
      timeWithoutOptimization_min: timeWithoutOptimization,
      timeWithOptimization_min: totalTime_min,
      timeSaved_min: timeWithoutOptimization - totalTime_min,
      wireChangesAvoided: wireChangesWithout - wireChangesWith,
      changeoversAvoided: jobs.length - batchGroups.length,
    },
    warnings,
  };
}

function printPlan(plan: BatchPlan): void {
  console.log("\n" + "=".repeat(70));
  console.log("WEDM BATCH EXECUTION PLAN");
  console.log("=".repeat(70));
  console.log(`Generated: ${plan.timestamp}`);
  console.log(`Total Jobs: ${plan.totalJobs}`);
  console.log(`Total Time: ${plan.totalTime_hr.toFixed(1)} hours`);
  console.log(`Machine: ${plan.schedule.machine}`);

  console.log("\n--- Execution Groups ---");
  plan.groups.forEach((g) => {
    console.log(`\n[${g.sequence}] ${g.name}`);
    console.log(`    Wire: ${g.wireType} ${g.wireDiameter}mm`);
    console.log(`    Jobs: ${g.jobs.join(", ")}`);
    console.log(`    Time: ${g.estimatedTime_min} min + ${g.setupTime_min} min setup`);
  });

  console.log("\n--- Schedule ---");
  console.log(`Start: ${plan.schedule.start}`);
  console.log(`End: ${plan.schedule.end}`);
  plan.schedule.shifts.forEach((s) => {
    console.log(`  ${s.date} ${s.shift}: ${(s.utilization * 100).toFixed(0)}% utilization`);
  });

  console.log("\n--- Savings ---");
  console.log(`Time Without Optimization: ${plan.savings.timeWithoutOptimization_min} min`);
  console.log(`Time With Optimization: ${plan.savings.timeWithOptimization_min} min`);
  console.log(`Time Saved: ${plan.savings.timeSaved_min} min (${((plan.savings.timeSaved_min / plan.savings.timeWithoutOptimization_min) * 100).toFixed(0)}%)`);
  console.log(`Wire Changes Avoided: ${plan.savings.wireChangesAvoided}`);
  console.log(`Changeovers Avoided: ${plan.savings.changeoversAvoided}`);

  if (plan.warnings.length > 0) {
    console.log("\n--- Warnings ---");
    plan.warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  }

  console.log("\n" + "=".repeat(70));
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  let jobsDir = "./jobs/";
  let machine = "FA-20S";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--jobs-dir":
      case "-d":
        jobsDir = args[++i];
        break;
      case "--machine":
      case "-m":
        machine = args[++i];
        break;
      case "--help":
      case "-h":
        console.log("Usage: npx ts-node scripts/wedm_batch_orchestrator.ts [options]");
        console.log("\nOptions:");
        console.log("  --jobs-dir, -d   Directory containing job files (.json or .nc)");
        console.log("  --machine, -m    Target machine (default: FA-20S)");
        process.exit(0);
    }
  }

  try {
    if (!fs.existsSync(jobsDir)) {
      // Create sample jobs for demo
      fs.mkdirSync(jobsDir, { recursive: true });
      const sampleJobs: Job[] = [
        { id: "JOB001", file: "part1.nc", material: "D2", thickness: 25, perimeter: 500, passes: 4, estimatedTime_min: 45, wireType: "brass", wireDiameter: 0.25, priority: "normal" },
        { id: "JOB002", file: "part2.nc", material: "D2", thickness: 30, perimeter: 800, passes: 4, estimatedTime_min: 72, wireType: "brass", wireDiameter: 0.25, priority: "high" },
        { id: "JOB003", file: "part3.nc", material: "A2", thickness: 20, perimeter: 300, passes: 3, estimatedTime_min: 27, wireType: "brass", wireDiameter: 0.20, priority: "normal" },
        { id: "JOB004", file: "part4.nc", material: "carbide", thickness: 15, perimeter: 200, passes: 5, estimatedTime_min: 50, wireType: "zinc", wireDiameter: 0.25, priority: "rush" },
        { id: "JOB005", file: "part5.nc", material: "D2", thickness: 25, perimeter: 600, passes: 4, estimatedTime_min: 54, wireType: "brass", wireDiameter: 0.25, priority: "normal" },
      ];
      for (const job of sampleJobs) {
        fs.writeFileSync(path.join(jobsDir, `${job.id}.json`), JSON.stringify(job, null, 2));
      }
      console.log("Created sample jobs in", jobsDir);
    }

    const jobs = await loadJobs(jobsDir);
    const plan = await orchestrateBatch(jobs, machine);
    printPlan(plan);

    // Save plan
    const planPath = `wedm_batch_plan_${new Date().toISOString().split("T")[0]}.json`;
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    console.log(`Plan saved: ${planPath}`);

    process.exit(0);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
