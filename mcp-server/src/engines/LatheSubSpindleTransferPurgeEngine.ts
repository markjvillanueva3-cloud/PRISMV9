/**
 * LatheSubSpindleTransferPurgeEngine
 * =====================================
 *
 * Computes coolant purge / chip-wash timing for sub-spindle (twin-spindle
 * and Swiss-style) lathes during part transfer between main and sub
 * chucks. During transfer, chips and coolant film on the transfer face
 * can contaminate the sub-chuck jaws or the second-op working zone —
 * causing concentricity errors, coolant drag-out, and jaw wear.
 *
 * Complements PPOkumaSubSpindleSyncEngine (which emits transfer G-code)
 * by providing the physics-based timing inputs — dwell durations, coolant
 * burst pressures, air-blast purge intervals — independent of controller
 * dialect.
 *
 * Timing model:
 *   t_total = t_coolantOff + t_chipBlast + t_spindleBrake + t_approach
 *             + t_chuckRelease + t_transferGrip + t_verify
 *
 * Key rules:
 *   - Coolant OFF ≥ 200 ms before approach (otherwise coolant film on
 *     sub-chuck jaws)
 *   - Air-blast burst 0.3 – 1.0 s aimed at transfer face
 *   - Brake to 0 rpm before engagement (synchronized spindles: rpm match
 *     within 2 rpm)
 *   - For sticky materials (ISO M, N), longer blast: +0.3 s
 *
 * Output includes a time-sequenced plan + G/M-code hints and contamination
 * risk score.
 *
 * References:
 *   - Citizen / Tsugami Swiss-type operator manuals
 *   - Okuma LT-3000 dual-spindle programming guide (OSP-P300L)
 *   - Mazak Multiplex programming manual §Sub-Spindle Transfer
 *
 * @module engines/LatheSubSpindleTransferPurgeEngine
 * @milestone LATHE-PRO-MS7
 */

export interface SubSpindlePurgeInput {
  /** Main spindle rpm at time of transfer request */
  main_rpm: number;
  /** Max spindle deceleration rps² (typical 30-80 for lathes) */
  decel_rps2?: number;
  /** Part length at transfer (mm) */
  transfer_length_mm: number;
  /** Part diameter at transfer face (mm) */
  transfer_diameter_mm: number;
  /** Material ISO group (affects chip stickiness) */
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  /** Coolant pressure during cut (bar) */
  coolant_pressure_bar: number;
  /** Air blast available? */
  air_blast_available: boolean;
  /** Air blast pressure (bar), if available */
  air_blast_pressure_bar?: number;
  /** Synchronous spindle (phase-matched) transfer? */
  synchronous_transfer?: boolean;
  /** Controller family hint (just affects M-code suggestions) */
  controller?: "okuma_osp" | "fanuc" | "mazatrol" | "siemens" | "citizen_l20" | "generic";
}

export interface PurgePhase {
  name: string;
  duration_sec: number;
  action: string;
  mcode_hint?: string;
}

export interface SubSpindlePurgeResult {
  phases: PurgePhase[];
  total_transfer_time_sec: number;
  contamination_risk: "low" | "moderate" | "high";
  contamination_score: number;
  air_blast_duration_sec: number;
  coolant_off_lead_sec: number;
  spindle_decel_sec: number;
  notes: string[];
  recommendations: string[];
}

class LatheSubSpindleTransferPurgeEngineImpl {
  plan(i: SubSpindlePurgeInput): SubSpindlePurgeResult {
    const notes: string[] = [];
    const recs: string[] = [];

    // Spindle deceleration: t = rpm / (60 × decel_rps²) × 2π (approximation
    // assuming constant torque decel; simplification: t = rpm / (decel_rpm_s)).
    // Use decel_rps² as rev/s² → convert rpm→rps: rps = rpm/60
    const decelRps2 = i.decel_rps2 ?? 50;
    const rps = i.main_rpm / 60;
    const decelSec = Math.max(0.1, rps / Math.max(5, decelRps2));

    // Coolant OFF lead time
    const coolantOffLead = 0.2 + (i.coolant_pressure_bar >= 40 ? 0.1 : 0);

    // Air blast duration
    const baseBlast = 0.4;
    const stickyBonus =
      i.material_iso_group === "M" || i.material_iso_group === "N" ? 0.3 : 0;
    const lenBonus = i.transfer_length_mm > 80 ? 0.2 : 0;
    const airBlastSec = i.air_blast_available ? baseBlast + stickyBonus + lenBonus : 0;
    if (!i.air_blast_available) {
      recs.push("Install air blast line — without purge, chips will contaminate sub-chuck");
    }

    // Synchronous vs stopped
    const approachSec = i.synchronous_transfer ? 0.8 : 1.2;
    const chuckReleaseSec = 0.4;
    const transferGripSec = 0.6;
    const verifySec = 0.5;

    const phases: PurgePhase[] = [];
    phases.push({
      name: "coolant_off",
      duration_sec: coolantOffLead,
      action: "Coolant OFF, flush pressure bleed",
      mcode_hint: mcodeHint(i.controller, "coolant_off"),
    });
    if (i.air_blast_available) {
      phases.push({
        name: "chip_blast",
        duration_sec: airBlastSec,
        action: `Air blast at transfer face (${i.air_blast_pressure_bar ?? 6} bar)`,
        mcode_hint: mcodeHint(i.controller, "air_blast"),
      });
    }
    phases.push({
      name: "spindle_brake",
      duration_sec: decelSec,
      action: i.synchronous_transfer
        ? "Engage synchronous mode, match sub-spindle rpm within 2 rpm"
        : "Brake main spindle to 0 rpm",
      mcode_hint: mcodeHint(i.controller, i.synchronous_transfer ? "sync_on" : "spindle_stop"),
    });
    phases.push({
      name: "approach",
      duration_sec: approachSec,
      action: "Sub-spindle rapid to transfer position",
    });
    phases.push({
      name: "chuck_release",
      duration_sec: chuckReleaseSec,
      action: "Main chuck open, part held by sub",
      mcode_hint: mcodeHint(i.controller, "main_chuck_open"),
    });
    phases.push({
      name: "transfer_grip",
      duration_sec: transferGripSec,
      action: "Sub chuck clamp at programmed pressure",
      mcode_hint: mcodeHint(i.controller, "sub_chuck_close"),
    });
    phases.push({
      name: "verify",
      duration_sec: verifySec,
      action: "Part-present probe or proximity sensor check",
    });

    const total = phases.reduce((s, p) => s + p.duration_sec, 0);

    // Contamination score (0..1)
    let score = 0;
    if (!i.air_blast_available) score += 0.5;
    if (coolantOffLead < 0.2) score += 0.2;
    if (i.coolant_pressure_bar >= 70 && coolantOffLead < 0.3) score += 0.15;
    if (i.material_iso_group === "M" || i.material_iso_group === "N") score += 0.15;
    if (i.transfer_length_mm > 100) score += 0.1;
    score = Math.min(1, score);

    let risk: "low" | "moderate" | "high";
    if (score < 0.25) risk = "low";
    else if (score < 0.55) risk = "moderate";
    else risk = "high";

    if (risk === "high") {
      notes.push("HIGH contamination risk — inspect first 5 parts for sub-chuck jaw seating");
      recs.push("Increase air blast duration or add mist coolant wash 0.3 s before grip");
    }
    if (i.synchronous_transfer) notes.push("Synchronous transfer — chip ejection occurs under rotation, shortens total");

    return {
      phases,
      total_transfer_time_sec: round2(total),
      contamination_risk: risk,
      contamination_score: round2(score),
      air_blast_duration_sec: round2(airBlastSec),
      coolant_off_lead_sec: round2(coolantOffLead),
      spindle_decel_sec: round2(decelSec),
      notes,
      recommendations: recs,
    };
  }

  getStats(): { phases_modeled: number; supported_controllers: string[] } {
    return {
      phases_modeled: 7,
      supported_controllers: [
        "okuma_osp",
        "fanuc",
        "mazatrol",
        "siemens",
        "citizen_l20",
        "generic",
      ],
    };
  }
}

function mcodeHint(ctrl: SubSpindlePurgeInput["controller"], phase: string): string | undefined {
  const c = ctrl ?? "generic";
  const map: Record<string, Record<string, string>> = {
    okuma_osp: {
      coolant_off: "M09",
      air_blast: "M12",
      spindle_stop: "M05",
      sync_on: "G145",
      main_chuck_open: "M87",
      sub_chuck_close: "M227",
    },
    fanuc: {
      coolant_off: "M09",
      air_blast: "M52",
      spindle_stop: "M05",
      sync_on: "G114.1",
      main_chuck_open: "M11",
      sub_chuck_close: "M13",
    },
    mazatrol: {
      coolant_off: "M09",
      air_blast: "M51",
      spindle_stop: "M05",
      sync_on: "G814",
      main_chuck_open: "M15",
      sub_chuck_close: "M16",
    },
    siemens: {
      coolant_off: "M09",
      air_blast: "M56",
      spindle_stop: "M05",
      sync_on: "COUPON",
      main_chuck_open: "M21",
      sub_chuck_close: "M23",
    },
    citizen_l20: {
      coolant_off: "M09",
      air_blast: "M12",
      spindle_stop: "M205",
      sync_on: "G814",
      main_chuck_open: "M15",
      sub_chuck_close: "M82",
    },
    generic: {
      coolant_off: "M09",
      air_blast: "M12",
      spindle_stop: "M05",
      main_chuck_open: "M11",
      sub_chuck_close: "M13",
    },
  };
  return map[c]?.[phase];
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const latheSubSpindleTransferPurgeEngine = new LatheSubSpindleTransferPurgeEngineImpl();
export type { LatheSubSpindleTransferPurgeEngineImpl };
