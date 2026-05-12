/**
 * Tests for IncrementalLearningEngine (PP-0.19-U-LLM6)
 *
 * Uses scratch tmp dirs + an injected runner so we never spawn Python.
 * Covers the full prepare → run lifecycle: windowing, kind filter,
 * minExamples threshold, manifest shape, status transitions, runner
 * success/failure, dry run, job listing, and not-found handling.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { IncrementalLearningEngine } from "../engines/IncrementalLearningEngine.js";
import { OutcomeTrackingEngine } from "../engines/OutcomeTrackingEngine.js";

async function seedOutcomes(
  tracker: OutcomeTrackingEngine,
  n: number,
  kind: "good" | "scrap" | "adjusted" | "aborted" = "good",
): Promise<void> {
  for (let i = 0; i < n; i++) {
    await tracker.log({ programId: `P-${i}`, outcome: kind });
  }
}

describe("IncrementalLearningEngine", () => {
  let dir: string;
  let tracker: OutcomeTrackingEngine;
  let engine: IncrementalLearningEngine;
  let runnerCalls: Array<{ cmd: string; args: string[]; timeoutMs: number }>;

  const fixedNow = new Date("2026-04-16T17:00:00.000Z");

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "prism-lora-"));
    tracker = new OutcomeTrackingEngine(dir);
    runnerCalls = [];
    engine = new IncrementalLearningEngine({
      tracker,
      dataDir: path.join(dir, "lora-training"),
      clock: () => fixedNow,
      runner: async (cmd, args, timeoutMs) => {
        runnerCalls.push({ cmd, args, timeoutMs });
        return { code: 0, stdout: "trained", stderr: "", durationMs: 42 };
      },
    });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("prepareJob skips when fewer than minExamples outcomes", async () => {
    await seedOutcomes(tracker, 3, "good");
    const r = await engine.prepareJob({ minExamples: 10 });
    expect(r.ok).toBe(true);
    expect(r.job).toBeNull();
    expect(r.manifest).toBeNull();
    expect(r.skipped).toBe("too-few-examples");
  });

  it("prepareJob writes manifest + job record when threshold met", async () => {
    await seedOutcomes(tracker, 12, "good");
    const r = await engine.prepareJob({ minExamples: 10 });
    expect(r.ok).toBe(true);
    expect(r.job).not.toBeNull();
    expect(r.manifest).not.toBeNull();
    expect(r.manifest?.examples.length).toBe(12);
    expect(r.manifest?.schemaVersion).toBe(1);
    expect(r.manifest?.baseModel).toBe("qwen2.5-coder:7b");
    expect(r.job?.status).toBe("pending");
    expect(existsSync(r.job?.manifestPath ?? "")).toBe(true);
  });

  it("prepareJob filters by outcomeKinds — scraps excluded by default", async () => {
    await seedOutcomes(tracker, 6, "good");
    await seedOutcomes(tracker, 6, "scrap");
    const r = await engine.prepareJob({ minExamples: 5 });
    expect(r.manifest?.examples.every((e) => e.outcome === "good")).toBe(true);
  });

  it("prepareJob honors sinceIso window", async () => {
    await seedOutcomes(tracker, 5, "good");
    await new Promise((r) => setTimeout(r, 10));
    const cut = new Date().toISOString();
    await new Promise((r) => setTimeout(r, 10));
    await seedOutcomes(tracker, 6, "good");
    const r = await engine.prepareJob({ sinceIso: cut, minExamples: 5 });
    expect(r.manifest?.examples.length).toBe(6);
  });

  it("runJob walks pending → running → succeeded and invokes runner", async () => {
    await seedOutcomes(tracker, 12, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    expect(prep.job).not.toBeNull();
    const run = await engine.runJob(prep.job!.jobId);
    expect(run.ok).toBe(true);
    expect(run.job.status).toBe("succeeded");
    expect(run.job.trainerExitCode).toBe(0);
    expect(runnerCalls.length).toBe(1);
    expect(runnerCalls[0].cmd).toBe("python");
  });

  it("runJob surfaces trainer failure as status=failed", async () => {
    engine = new IncrementalLearningEngine({
      tracker,
      dataDir: path.join(dir, "lora-training2"),
      clock: () => fixedNow,
      runner: async () => ({
        code: 1,
        stdout: "",
        stderr: "cuda oom",
        durationMs: 10,
      }),
    });
    await seedOutcomes(tracker, 12, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    const run = await engine.runJob(prep.job!.jobId);
    expect(run.ok).toBe(false);
    expect(run.job.status).toBe("failed");
    expect(run.job.error).toMatch(/cuda oom/);
  });

  it("runJob dryRun marks succeeded without invoking runner", async () => {
    await seedOutcomes(tracker, 12, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    const run = await engine.runJob(prep.job!.jobId, { dryRun: true });
    expect(run.ok).toBe(true);
    expect(run.job.status).toBe("succeeded");
    expect(runnerCalls.length).toBe(0);
  });

  it("runJob refuses to re-run already-completed job", async () => {
    await seedOutcomes(tracker, 12, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    await engine.runJob(prep.job!.jobId);
    const second = await engine.runJob(prep.job!.jobId);
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/already/);
  });

  it("runJob reports not-found when job id doesn't exist", async () => {
    const r = await engine.runJob("lora-nope");
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not found/);
  });

  it("nightly() composes prepare + run in one call", async () => {
    await seedOutcomes(tracker, 12, "good");
    const result = await engine.nightly(
      { minExamples: 10 },
      { dryRun: true },
    );
    expect(result.prepare.ok).toBe(true);
    expect(result.run?.ok).toBe(true);
    expect(result.run?.job.status).toBe("succeeded");
  });

  it("nightly() returns null run when prepare skips", async () => {
    await seedOutcomes(tracker, 2, "good");
    const result = await engine.nightly({ minExamples: 10 });
    expect(result.prepare.skipped).toBe("too-few-examples");
    expect(result.run).toBeNull();
  });

  it("listJobs returns all jobs newest-first", async () => {
    await seedOutcomes(tracker, 12, "good");
    await engine.prepareJob({ minExamples: 10 });
    // fudge the clock to produce a distinct jobId
    const later = new Date(fixedNow.getTime() + 1000);
    const engine2 = new IncrementalLearningEngine({
      tracker,
      dataDir: path.join(dir, "lora-training"),
      clock: () => later,
      runner: async () => ({ code: 0, stdout: "", stderr: "", durationMs: 1 }),
    });
    await engine2.prepareJob({ minExamples: 10 });
    const jobs = await engine.listJobs();
    expect(jobs.length).toBe(2);
    expect(jobs[0].createdAt >= jobs[1].createdAt).toBe(true);
  });

  it("readManifest round-trips the manifest we wrote", async () => {
    await seedOutcomes(tracker, 10, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    const m = await engine.readManifest(prep.job!.jobId);
    expect(m).not.toBeNull();
    expect(m?.examples.length).toBe(10);
  });

  it("runner exception bubbles to job.status=failed with error text", async () => {
    engine = new IncrementalLearningEngine({
      tracker,
      dataDir: path.join(dir, "lora-training-e"),
      clock: () => fixedNow,
      runner: async () => {
        throw new Error("python not installed");
      },
    });
    await seedOutcomes(tracker, 10, "good");
    const prep = await engine.prepareJob({ minExamples: 10 });
    const run = await engine.runJob(prep.job!.jobId);
    expect(run.ok).toBe(false);
    expect(run.job.status).toBe("failed");
    expect(run.job.error).toMatch(/python/);
  });
});
