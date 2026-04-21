/**
 * TurningComplianceCheckEngine
 * ============================
 *
 * AS9100 / ISO 13485 / 21 CFR Part 11 compliance orchestrator for turning
 * programs (MS9 U-LPR05/06). Aggregates 4 independent compliance checks
 * into one verdict that the `material-traceability-gate` hook consumes:
 *
 *   1. Material cert (CMTR) on file                      (U-LPR01)
 *   2. Digital-thread linkage complete                   (U-LPR01)
 *   3. Device History Record (DHR) structure valid       (U-LPR02)
 *   4. Process validation IQ/OQ/PQ current (not expired) (U-LPR04)
 *
 * The engine does NOT re-implement domain logic. It reads caller-supplied
 * results from the existing engines (MaterialCertTraceabilityEngine,
 * DigitalThreadEngine, ProcessValidationIQOQPQEngine) and the DHR payload
 * below, aggregates pass/fail flags, and returns a single
 * `is_compliant` verdict plus a `blocking_issues` list.
 *
 * Device History Record (DHR) structure — 21 CFR Part 11 compliant:
 *   - Per-part / batch parameter traceability (S, F, T with source).
 *   - Tool traceability: insert lot, holder serial, edge number.
 *   - Electronic-signature fields (signer, role, timestamp, manifest_hash).
 *   - Immutable append-only log flag (required for Part 11 §11.10(e)).
 *
 * Validated-mode vs optimization-mode toggle (U-LPR04):
 *   - When `process_validation.validated_mode === true`, no parameter
 *     change is allowed without a re-validation event. The engine flags
 *     any deviation between current program parameters and the validated
 *     parameter set as a BLOCKING issue.
 *
 * References:
 *   - AS9100 Rev D §8.4.3 Control of externally provided processes
 *   - ISO 13485:2016 §7.5.1 Control of production
 *   - 21 CFR Part 11 Electronic records; electronic signatures
 *   - 21 CFR 820.184 Device history record
 *
 * @module engines/TurningComplianceCheckEngine
 * @milestone LATHE-PRO-MS9 / U-LPR05-06
 */

export type ComplianceRegime = "aerospace" | "medical" | "safety_critical" | "none";

export interface CertStatus {
  /** Heat lot number recorded on the CMTR. */
  heat_lot: string;
  /** True when the CMTR validates against the material spec (AMS / ASTM). */
  validated: boolean;
  /** True when CMTR is on file in the vault (not missing). */
  on_file: boolean;
  /** Expiry date, if any (ISO 8601). */
  expires_at?: string;
}

export interface DigitalThreadStatus {
  /** True when heat_lot → program → part_serial linkage is complete. */
  linkage_complete: boolean;
  /** Missing link node, if any. */
  missing_node?: string;
}

export interface DHRField {
  name: string;
  value: string | number;
  source: "operator_entry" | "machine_telemetry" | "parameter_file" | "cam_bridge";
}

export interface DHRPayload {
  part_id: string;
  batch_id?: string;
  /** Every S/F/T parameter recorded with its source. */
  parameters: DHRField[];
  /** Tool traceability records. */
  tool_records: Array<{
    tool_number: number;
    insert_lot: string;
    holder_serial: string;
    edge_number: number;
  }>;
  /** Electronic signatures per 21 CFR Part 11 §11.200. */
  signatures: Array<{
    signer: string;
    role: "operator" | "inspector" | "engineer" | "supervisor";
    timestamp: string;
    manifest_hash: string;
  }>;
  /** True when the underlying log is append-only. */
  immutable_log: boolean;
}

export interface ProcessValidationStatus {
  /** True when operating under validated mode (no optimization allowed). */
  validated_mode: boolean;
  /** IQ/OQ/PQ validation completion flags. */
  iq_complete: boolean;
  oq_complete: boolean;
  pq_complete: boolean;
  /** Expiry ISO date for the validation. */
  expires_at?: string;
  /** List of current parameter deviations from the validated set. */
  deviations?: string[];
}

export interface ComplianceCheckInput {
  part_id: string;
  regime: ComplianceRegime;
  cert: CertStatus;
  thread: DigitalThreadStatus;
  dhr?: DHRPayload;      // required for medical + safety_critical
  validation?: ProcessValidationStatus; // required for medical + safety_critical
}

export interface ComplianceArtefact {
  name: "cmtr" | "digital_thread" | "dhr" | "process_validation";
  required: boolean;
  passed: boolean;
  detail: string;
}

export interface ComplianceCheckResult {
  part_id: string;
  regime: ComplianceRegime;
  is_compliant: boolean;
  artefacts: ComplianceArtefact[];
  blocking_issues: string[];
  warnings: string[];
}

function isExpired(iso?: string, nowMs?: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t < (nowMs ?? Date.now());
}

export class TurningComplianceCheckEngine {
  /**
   * Aggregate 4 compliance checks into a single verdict.
   */
  check(input: ComplianceCheckInput, nowMs?: number): ComplianceCheckResult {
    const warnings: string[] = [];
    const blocking: string[] = [];
    const artefacts: ComplianceArtefact[] = [];

    // 1. CMTR
    const cmtrRequired = input.regime !== "none";
    const cmtrOK =
      input.cert.on_file && input.cert.validated && !isExpired(input.cert.expires_at, nowMs);
    artefacts.push({
      name: "cmtr",
      required: cmtrRequired,
      passed: cmtrOK,
      detail: cmtrOK
        ? `CMTR for heat lot ${input.cert.heat_lot} validated.`
        : !input.cert.on_file
          ? "CMTR NOT on file — block machining per AS9100 §8.4.3."
          : !input.cert.validated
            ? "CMTR on file but fails spec validation."
            : "CMTR expired — re-request from vendor before machining.",
    });
    if (cmtrRequired && !cmtrOK) {
      blocking.push(artefacts[0]!.detail);
    }

    // 2. Digital thread linkage
    const threadRequired = input.regime !== "none";
    const threadOK = input.thread.linkage_complete;
    artefacts.push({
      name: "digital_thread",
      required: threadRequired,
      passed: threadOK,
      detail: threadOK
        ? "Digital-thread linkage complete (heat_lot → program → part_serial)."
        : `Digital-thread missing node: ${input.thread.missing_node ?? "unspecified"}.`,
    });
    if (threadRequired && !threadOK) {
      blocking.push(artefacts[1]!.detail);
    }

    // 3. DHR (medical + safety_critical)
    const dhrRequired = input.regime === "medical" || input.regime === "safety_critical";
    let dhrOK = false;
    let dhrDetail = "";
    if (!dhrRequired) {
      dhrDetail = `DHR not required for regime=${input.regime}.`;
      dhrOK = true;
    } else if (!input.dhr) {
      dhrDetail = "DHR payload missing — required for medical / safety_critical.";
    } else {
      const d = input.dhr;
      const haveParams = d.parameters.length > 0;
      const haveTools = d.tool_records.length > 0;
      const haveSig = d.signatures.length > 0;
      const immutable = d.immutable_log === true;
      dhrOK = haveParams && haveTools && haveSig && immutable;
      if (!haveParams) dhrDetail = "DHR has no parameter records.";
      else if (!haveTools) dhrDetail = "DHR missing tool traceability records.";
      else if (!haveSig) dhrDetail = "DHR missing electronic signatures (21 CFR Part 11 §11.200).";
      else if (!immutable) dhrDetail = "DHR log is not append-only — violates 21 CFR §11.10(e).";
      else dhrDetail = `DHR complete: ${d.parameters.length} params, ${d.tool_records.length} tools, ${d.signatures.length} signatures.`;
    }
    artefacts.push({
      name: "dhr",
      required: dhrRequired,
      passed: dhrOK,
      detail: dhrDetail,
    });
    if (dhrRequired && !dhrOK) blocking.push(dhrDetail);

    // 4. Process validation IQ/OQ/PQ (medical + safety_critical)
    const pvRequired = input.regime === "medical" || input.regime === "safety_critical";
    let pvOK = false;
    let pvDetail = "";
    if (!pvRequired) {
      pvDetail = `IQ/OQ/PQ not required for regime=${input.regime}.`;
      pvOK = true;
    } else if (!input.validation) {
      pvDetail = "Process validation status missing.";
    } else {
      const v = input.validation;
      if (isExpired(v.expires_at, nowMs)) {
        pvDetail = "Process validation expired — revalidate before medical production.";
      } else if (!(v.iq_complete && v.oq_complete && v.pq_complete)) {
        pvDetail = `Process validation incomplete: IQ=${v.iq_complete} OQ=${v.oq_complete} PQ=${v.pq_complete}.`;
      } else if (v.validated_mode && v.deviations && v.deviations.length > 0) {
        pvDetail = `Validated-mode deviations detected: ${v.deviations.slice(0, 3).join("; ")}.`;
      } else {
        pvOK = true;
        pvDetail = `IQ/OQ/PQ current (validated_mode=${v.validated_mode}).`;
      }
    }
    artefacts.push({
      name: "process_validation",
      required: pvRequired,
      passed: pvOK,
      detail: pvDetail,
    });
    if (pvRequired && !pvOK) blocking.push(pvDetail);

    const is_compliant = blocking.length === 0 && artefacts.filter(a => a.required).every(a => a.passed);

    return {
      part_id: input.part_id,
      regime: input.regime,
      is_compliant,
      artefacts,
      blocking_issues: blocking,
      warnings,
    };
  }
}

/** Singleton instance. */
export const turningComplianceCheckEngine = new TurningComplianceCheckEngine();
