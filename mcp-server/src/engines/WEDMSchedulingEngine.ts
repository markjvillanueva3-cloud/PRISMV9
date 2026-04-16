/**
 * WEDMSchedulingEngine — WEDM Machine Reservation (Book-Ahead)
 *
 * File-based scheduling engine for WEDM machine time-slot reservations.
 * Persists reservations to data/state/wedm-reservations.json using atomic
 * JSON writes. Detects time-overlap conflicts before confirming a booking.
 *
 * Default machine: Mitsubishi FA-10S (JM Die canonical WEDM machine).
 *
 * Conflict rule: two reservations conflict when they share the same machine_id
 * and their time intervals overlap — i.e., starts_at < other.ends_at AND
 * ends_at > other.starts_at — excluding cancelled/completed reservations.
 *
 * @module engines/WEDMSchedulingEngine
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";
import { log } from "../utils/Logger.js";
import { prismIntelligence, type AIReasoningResult } from "./PRISMIntelligenceLayer.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const STATE_FILE = "H:/prism/mcp-server/data/state/wedm-reservations.json";
const STATE_DIR  = "H:/prism/mcp-server/data/state";

const DEFAULT_MACHINE_ID   = "mitsubishi-fa10s";
const DEFAULT_MACHINE_NAME = "Mitsubishi FA-10S";

// ============================================================================
// TYPES
// ============================================================================

export interface WEDMReservation {
  id: string;
  machine_id: string;
  machine_name: string;
  job_id?: string;
  job_name?: string;
  material?: string;
  estimated_hours: number;
  starts_at: string;
  ends_at: string;
  created_by?: string;
  created_at: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

export interface ReserveMachineParams {
  machine_id?: string;
  machine_name?: string;
  job_id?: string;
  job_name?: string;
  material?: string;
  estimated_hours: number;
  starts_at: string;
  ends_at?: string;
  created_by?: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WEDMSchedulingEngine {
  private loadReservations(): WEDMReservation[] {
    if (!existsSync(STATE_FILE)) return [];
    try {
      const raw = readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveReservations(reservations: WEDMReservation[]): void {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(reservations, null, 2), "utf-8");
  }

  private intervalsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const as = new Date(aStart).getTime();
    const ae = new Date(aEnd).getTime();
    const bs = new Date(bStart).getTime();
    const be = new Date(bEnd).getTime();
    return as < be && ae > bs;
  }

  reserveMachine(params: ReserveMachineParams) {
    const machineId = params.machine_id ?? DEFAULT_MACHINE_ID;
    const machineName = params.machine_name ?? DEFAULT_MACHINE_NAME;

    if (!params.starts_at || params.estimated_hours <= 0) {
      return { success: false, error: "Invalid parameters", conflicts: [] };
    }

    const startsAt = params.starts_at;
    const endsAt = params.ends_at ?? new Date(new Date(startsAt).getTime() + params.estimated_hours * 3600000).toISOString();

    const reservations = this.loadReservations();
    const active = reservations.filter(r => r.machine_id === machineId && r.status !== "cancelled" && r.status !== "completed");
    const conflicts = active.filter(r => this.intervalsOverlap(startsAt, endsAt, r.starts_at, r.ends_at));

    if (conflicts.length > 0) {
      return { success: false, error: "Machine has conflicting reservations", conflicts };
    }

    const reservation: WEDMReservation = {
      id: randomUUID(),
      machine_id: machineId,
      machine_name: machineName,
      job_id: params.job_id,
      job_name: params.job_name,
      material: params.material,
      estimated_hours: params.estimated_hours,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: params.created_by,
      created_at: new Date().toISOString(),
      status: "scheduled",
    };

    reservations.push(reservation);
    this.saveReservations(reservations);
    log.info(`[WEDMScheduling] Reserved ${machineId} ${startsAt} → ${endsAt}`);
    return { success: true, reservation };
  }

  checkAvailability(params: { machine_id?: string; starts_at: string; ends_at: string }) {
    const machineId = params.machine_id ?? DEFAULT_MACHINE_ID;
    const reservations = this.loadReservations();
    const active = reservations.filter(r => r.machine_id === machineId && r.status !== "cancelled" && r.status !== "completed");
    const conflicts = active.filter(r => this.intervalsOverlap(params.starts_at, params.ends_at, r.starts_at, r.ends_at));
    return { available: conflicts.length === 0, conflicts, machine_id: machineId };
  }

  listReservations(machineId?: string): WEDMReservation[] {
    const reservations = this.loadReservations();
    const filtered = machineId ? reservations.filter(r => r.machine_id === machineId) : reservations;
    return filtered.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }

  cancelReservation(reservationId: string) {
    const reservations = this.loadReservations();
    const idx = reservations.findIndex(r => r.id === reservationId);
    if (idx === -1) return { success: false, error: "Reservation not found" };
    reservations[idx].status = "cancelled";
    this.saveReservations(reservations);
    return { success: true, reservation: reservations[idx] };
  }

  // AI-powered methods
  async suggestOptimalSlotWithAI(params: {
    estimated_hours: number;
    material?: string;
    priority?: string;
    preferred_shift?: string;
    within_days?: number;
  }): Promise<AIReasoningResult> {
    const reservations = this.loadReservations().filter(r => r.status !== "cancelled" && r.status !== "completed");
    const now = new Date();
    const endDate = new Date(now.getTime() + (params.within_days ?? 7) * 86400000);
    const upcoming = reservations.filter(r => new Date(r.ends_at) > now && new Date(r.starts_at) < endDate);

    return prismIntelligence.reason({
      domain: "wedm_scheduling",
      intent: "Recommend optimal WEDM machine time slot",
      context: {
        estimated_hours: params.estimated_hours,
        material: params.material,
        priority: params.priority,
        upcoming_count: upcoming.length,
        utilization_pct: (upcoming.reduce((s, r) => s + r.estimated_hours, 0) / ((params.within_days ?? 7) * 24)) * 100,
      },
      options: { require_explanation: true, include_alternatives: true },
    });
  }

  async analyzeScheduleWithAI(): Promise<AIReasoningResult> {
    const reservations = this.loadReservations();
    return prismIntelligence.reason({
      domain: "wedm_scheduling",
      intent: "Analyze WEDM schedule for optimization opportunities",
      context: {
        total: reservations.length,
        active: reservations.filter(r => r.status === "scheduled").length,
        completed: reservations.filter(r => r.status === "completed").length,
      },
      options: { require_explanation: true },
    });
  }
}

export const wedmSchedulingEngine = new WEDMSchedulingEngine();
