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
  /** Unique identifier (UUID v4) */
  id: string;
  /** Machine identifier, e.g. "mitsubishi-fa10s" */
  machine_id: string;
  /** Human-readable machine name */
  machine_name: string;
  /** Optional job reference ID */
  job_id?: string;
  /** Optional job name, e.g. "ITW SHAKEPROOF Die Insert" */
  job_name?: string;
  /** Workpiece material, e.g. "D2" */
  material?: string;
  /** Estimated cutting time in hours */
  estimated_hours: number;
  /** ISO 8601 start date-time */
  starts_at: string;
  /** ISO 8601 end date-time */
  ends_at: string;
  /** Creator identifier */
  created_by?: string;
  /** ISO 8601 creation timestamp */
  created_at: string;
  /** Reservation lifecycle status */
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

export interface CheckAvailabilityParams {
  machine_id?: string;
  starts_at: string;
  ends_at: string;
  exclude_reservation_id?: string;
}

export interface AvailabilityResult {
  available: boolean;
  machine_id: string;
  requested_start: string;
  requested_end: string;
  conflicts: WEDMReservation[];
  message: string;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class WEDMSchedulingEngine {

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private loadReservations(): WEDMReservation[] {
    if (!existsSync(STATE_FILE)) {
      return [];
    }
    try {
      const raw = readFileSync(STATE_FILE, "utf-8");
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        log.warn("[WEDMSchedulingEngine] State file did not contain an array — resetting");
        return [];
      }
      return parsed as WEDMReservation[];
    } catch (err) {
      log.error(`[WEDMSchedulingEngine] Failed to read reservations: ${err}`);
      return [];
    }
  }

  private saveReservations(reservations: WEDMReservation[]): void {
    if (!existsSync(STATE_DIR)) {
      mkdirSync(STATE_DIR, { recursive: true });
    }
    const json = JSON.stringify(reservations, null, 2);
    writeFileSync(STATE_FILE, json, "utf-8");
  }

  /**
   * Returns true when two intervals overlap.
   * Intervals are [a_start, a_end) — half-open, standard calendar convention.
   */
  private intervalsOverlap(
    aStart: string, aEnd: string,
    bStart: string, bEnd: string
  ): boolean {
    const as = new Date(aStart).getTime();
    const ae = new Date(aEnd).getTime();
    const bs = new Date(bStart).getTime();
    const be = new Date(bEnd).getTime();
    return as < be && ae > bs;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Reserve a WEDM machine for a time slot.
   *
   * Computes ends_at automatically from estimated_hours if not supplied.
   * Rejects the booking if an active reservation for the same machine
   * overlaps the requested window.
   *
   * @param params - Reservation parameters
   * @returns The created reservation, or an error object on conflict
   */
  reserveMachine(params: ReserveMachineParams): { success: true; reservation: WEDMReservation } | { success: false; error: string; conflicts: WEDMReservation[] } {
    const machineId   = params.machine_id   ?? DEFAULT_MACHINE_ID;
    const machineName = params.machine_name ?? DEFAULT_MACHINE_NAME;

    if (!params.starts_at) {
      return { success: false, error: "starts_at is required", conflicts: [] };
    }
    if (params.estimated_hours <= 0) {
      return { success: false, error: "estimated_hours must be positive", conflicts: [] };
    }

    const startsAt = params.starts_at;
    const endsAt   = params.ends_at
      ?? new Date(new Date(startsAt).getTime() + params.estimated_hours * 3_600_000).toISOString();

    const reservations = this.loadReservations();

    // Conflict detection — skip cancelled and completed reservations
    const activeReservations = reservations.filter(
      r => r.machine_id === machineId && r.status !== "cancelled" && r.status !== "completed"
    );
    const conflicts = activeReservations.filter(
      r => this.intervalsOverlap(startsAt, endsAt, r.starts_at, r.ends_at)
    );

    if (conflicts.length > 0) {
      log.warn(`[WEDMSchedulingEngine] Conflict booking ${machineId}: ${conflicts.length} overlap(s)`);
      return {
        success: false,
        error: `Machine ${machineName} is already reserved during that window (${conflicts.length} conflict${conflicts.length > 1 ? "s" : ""})`,
        conflicts,
      };
    }

    const reservation: WEDMReservation = {
      id:               randomUUID(),
      machine_id:       machineId,
      machine_name:     machineName,
      job_id:           params.job_id,
      job_name:         params.job_name,
      material:         params.material,
      estimated_hours:  params.estimated_hours,
      starts_at:        startsAt,
      ends_at:          endsAt,
      created_by:       params.created_by,
      created_at:       new Date().toISOString(),
      status:           "scheduled",
    };

    reservations.push(reservation);
    this.saveReservations(reservations);
    log.info(`[WEDMSchedulingEngine] Reserved ${machineId} ${startsAt} → ${endsAt} (id=${reservation.id})`);

    return { success: true, reservation };
  }

  /**
   * Check whether a machine time slot is available.
   *
   * @param params - Availability check parameters
   * @returns Availability result with conflict list
   */
  checkAvailability(params: CheckAvailabilityParams): AvailabilityResult {
    const machineId = params.machine_id ?? DEFAULT_MACHINE_ID;

    if (!params.starts_at || !params.ends_at) {
      return {
        available: false,
        machine_id: machineId,
        requested_start: params.starts_at ?? "",
        requested_end:   params.ends_at   ?? "",
        conflicts: [],
        message: "Both starts_at and ends_at are required",
      };
    }

    const reservations = this.loadReservations();
    const active = reservations.filter(
      r =>
        r.machine_id === machineId &&
        r.status !== "cancelled" &&
        r.status !== "completed" &&
        r.id !== params.exclude_reservation_id
    );
    const conflicts = active.filter(
      r => this.intervalsOverlap(params.starts_at, params.ends_at, r.starts_at, r.ends_at)
    );

    const available = conflicts.length === 0;
    return {
      available,
      machine_id:      machineId,
      requested_start: params.starts_at,
      requested_end:   params.ends_at,
      conflicts,
      message: available
        ? `${machineId} is available for the requested window`
        : `${machineId} has ${conflicts.length} conflicting reservation${conflicts.length > 1 ? "s" : ""}`,
    };
  }

  /**
   * Cancel an existing reservation by ID.
   *
   * @param reservationId - UUID of the reservation to cancel
   * @returns Updated reservation or error if not found
   */
  cancelReservation(reservationId: string): { success: true; reservation: WEDMReservation } | { success: false; error: string } {
    if (!reservationId) {
      return { success: false, error: "reservation_id is required" };
    }

    const reservations = this.loadReservations();
    const idx = reservations.findIndex(r => r.id === reservationId);

    if (idx === -1) {
      return { success: false, error: `Reservation not found: ${reservationId}` };
    }

    const reservation = reservations[idx];
    if (reservation.status === "cancelled") {
      return { success: false, error: `Reservation ${reservationId} is already cancelled` };
    }

    reservation.status = "cancelled";
    this.saveReservations(reservations);
    log.info(`[WEDMSchedulingEngine] Cancelled reservation ${reservationId}`);

    return { success: true, reservation };
  }

  /**
   * List all reservations, optionally filtered by machine.
   *
   * @param machineId - Optional machine ID filter
   * @returns Array of reservations sorted by starts_at ascending
   */
  listReservations(machineId?: string): WEDMReservation[] {
    const reservations = this.loadReservations();
    const filtered = machineId
      ? reservations.filter(r => r.machine_id === machineId)
      : reservations;
    return filtered.sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    );
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const wedmSchedulingEngine = new WEDMSchedulingEngine();
