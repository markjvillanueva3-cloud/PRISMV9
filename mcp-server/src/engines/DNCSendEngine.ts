/**
 * DNCSendEngine — DNC Program Transfer
 * =====================================
 *
 * Manages program transfer to CNC machines via serial,
 * ethernet, or network share protocols.
 *
 * L2-P4-MS1/P0-U03 — Batch 5: DNC & Post-Processing
 * SAFETY-CRITICAL: S(x) >= 0.990 required
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const TransferProtocolSchema = z.enum([
  "serial_rs232", "serial_rs422", "ethernet_ftp", "ethernet_cifs", "ethernet_nfs", "usb", "cf_card"
]);

export const TransferStatusSchema = z.enum([
  "pending", "queued", "sending", "verifying", "complete", "failed", "cancelled"
]);

export const MachineConnectionSchema = z.object({
  machineId: z.string(),
  machineName: z.string(),
  protocol: TransferProtocolSchema,
  address: z.string(),
  port: z.number().optional(),
  baudRate: z.number().optional(),
  username: z.string().optional(),
  remotePath: z.string().optional(),
  timeout: z.number().default(30000),
  retryCount: z.number().default(3),
});

export const TransferJobSchema = z.object({
  id: z.string(),
  programId: z.string(),
  programNumber: z.string(),
  machineId: z.string(),
  connection: MachineConnectionSchema,
  status: TransferStatusSchema,
  progress: z.number().min(0).max(100),
  bytesTransferred: z.number(),
  totalBytes: z.number(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  verificationResult: z.object({
    verified: z.boolean(),
    checksumMatch: z.boolean(),
    bytesMatch: z.boolean(),
  }).optional(),
  error: z.string().optional(),
  retryAttempt: z.number().default(0),
  safetyScore: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type TransferProtocol = z.infer<typeof TransferProtocolSchema>;
export type TransferStatus = z.infer<typeof TransferStatusSchema>;
export type MachineConnection = z.infer<typeof MachineConnectionSchema>;
export type TransferJob = z.infer<typeof TransferJobSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const connections: Map<string, MachineConnection> = new Map([
  ["MILL-1", {
    machineId: "MILL-1",
    machineName: "Haas VF-2",
    protocol: "ethernet_cifs",
    address: "192.168.1.101",
    remotePath: "/programs",
    timeout: 30000,
    retryCount: 3,
  }],
  ["LATHE-1", {
    machineId: "LATHE-1",
    machineName: "Okuma LB3000",
    protocol: "serial_rs232",
    address: "COM3",
    baudRate: 9600,
    timeout: 60000,
    retryCount: 3,
  }],
]);

const transferJobs: Map<string, TransferJob> = new Map();
const transferQueue: string[] = [];
let jobCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DNCSendEngine {
  private static readonly SAFETY_THRESHOLD = 0.990;

  /**
   * Queue a program for transfer
   * SAFETY-CRITICAL: validates program before queuing
   */
  static queueTransfer(
    programId: string,
    programNumber: string,
    programContent: string,
    machineId: string,
    safetyScore: number
  ): TransferJob {
    // Safety gate
    if (safetyScore < this.SAFETY_THRESHOLD) {
      throw new Error(`Safety threshold not met: S(x)=${safetyScore.toFixed(3)} < ${this.SAFETY_THRESHOLD}`);
    }

    const connection = connections.get(machineId);
    if (!connection) {
      throw new Error(`No connection configured for machine: ${machineId}`);
    }

    const totalBytes = new TextEncoder().encode(programContent).length;

    const job: TransferJob = {
      id: `TXF-${++jobCounter}`,
      programId,
      programNumber,
      machineId,
      connection,
      status: "queued",
      progress: 0,
      bytesTransferred: 0,
      totalBytes,
      retryAttempt: 0,
      safetyScore,
    };

    transferJobs.set(job.id, job);
    transferQueue.push(job.id);

    return job;
  }

  /**
   * Start transfer for a queued job
   */
  static startTransfer(jobId: string): TransferJob {
    const job = transferJobs.get(jobId);
    if (!job) {
      throw new Error(`Transfer job not found: ${jobId}`);
    }

    if (job.status !== "queued" && job.status !== "failed") {
      throw new Error(`Cannot start transfer in status: ${job.status}`);
    }

    job.status = "sending";
    job.startedAt = new Date().toISOString();
    job.progress = 0;
    transferJobs.set(jobId, job);

    // Simulate transfer progress (in real implementation, this would be async)
    this.simulateTransfer(jobId);

    return job;
  }

  /**
   * Simulate transfer progress
   */
  private static simulateTransfer(jobId: string): void {
    const job = transferJobs.get(jobId);
    if (!job) return;

    // Simulate successful transfer
    job.progress = 100;
    job.bytesTransferred = job.totalBytes;
    job.status = "verifying";
    transferJobs.set(jobId, job);

    // Simulate verification
    job.verificationResult = {
      verified: true,
      checksumMatch: true,
      bytesMatch: true,
    };
    job.status = "complete";
    job.completedAt = new Date().toISOString();
    transferJobs.set(jobId, job);
  }

  /**
   * Cancel a transfer
   */
  static cancelTransfer(jobId: string): TransferJob | undefined {
    const job = transferJobs.get(jobId);
    if (!job) return undefined;

    if (job.status === "complete" || job.status === "cancelled") {
      return job;
    }

    job.status = "cancelled";
    job.completedAt = new Date().toISOString();
    transferJobs.set(jobId, job);

    // Remove from queue
    const idx = transferQueue.indexOf(jobId);
    if (idx > -1) transferQueue.splice(idx, 1);

    return job;
  }

  /**
   * Get transfer job status
   */
  static getJobStatus(jobId: string): TransferJob | undefined {
    return transferJobs.get(jobId);
  }

  /**
   * Get transfer queue
   */
  static getQueue(): TransferJob[] {
    return transferQueue
      .map(id => transferJobs.get(id))
      .filter((j): j is TransferJob => j !== undefined);
  }

  /**
   * Register machine connection
   */
  static registerConnection(connection: MachineConnection): void {
    connections.set(connection.machineId, connection);
  }

  /**
   * Get machine connection
   */
  static getConnection(machineId: string): MachineConnection | undefined {
    return connections.get(machineId);
  }

  /**
   * List all connections
   */
  static listConnections(): MachineConnection[] {
    return Array.from(connections.values());
  }

  /**
   * Test connection to machine
   */
  static testConnection(machineId: string): { success: boolean; latency: number; error?: string } {
    const connection = connections.get(machineId);
    if (!connection) {
      return { success: false, latency: 0, error: "Connection not found" };
    }

    // Simulate connection test
    const latency = Math.floor(Math.random() * 50) + 10;
    return { success: true, latency };
  }

  /**
   * Get transfer history for machine
   */
  static getTransferHistory(machineId: string, limit: number = 50): TransferJob[] {
    return Array.from(transferJobs.values())
      .filter(j => j.machineId === machineId)
      .sort((a, b) => {
        const aTime = a.completedAt || a.startedAt || "";
        const bTime = b.completedAt || b.startedAt || "";
        return bTime.localeCompare(aTime);
      })
      .slice(0, limit);
  }

  /**
   * Get transfer statistics
   */
  static getStats(): {
    totalTransfers: number;
    successful: number;
    failed: number;
    pending: number;
    totalBytesTransferred: number;
  } {
    const jobs = Array.from(transferJobs.values());
    return {
      totalTransfers: jobs.length,
      successful: jobs.filter(j => j.status === "complete").length,
      failed: jobs.filter(j => j.status === "failed").length,
      pending: jobs.filter(j => j.status === "queued" || j.status === "sending").length,
      totalBytesTransferred: jobs
        .filter(j => j.status === "complete")
        .reduce((sum, j) => sum + j.bytesTransferred, 0),
    };
  }

  static getSelfAwareness() {
    return {
      name: "DNCSendEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      safetyCritical: true,
      safetyThreshold: 0.990,
      capabilities: ["queueTransfer", "startTransfer", "cancelTransfer", "getJobStatus", "getQueue", "registerConnection", "testConnection", "getTransferHistory", "getStats"],
      supportedProtocols: ["serial_rs232", "serial_rs422", "ethernet_ftp", "ethernet_cifs", "ethernet_nfs", "usb", "cf_card"],
      dependencies: ["DNCGenerateEngine"],
    };
  }
}

export const dncSendEngine = new DNCSendEngine();
