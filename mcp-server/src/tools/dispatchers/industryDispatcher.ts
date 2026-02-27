/**
 * prism_industry — Industry Compliance Dispatcher
 *
 * 4 actions: aerospace_check, medical_check, automotive_check, oil_gas_check
 *
 * Validates manufacturing parameters against industry-specific requirements
 * (AS9100, ISO 13485, IATF 16949, API specs).
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError } from "../../utils/dispatcherMiddleware.js";

const ACTIONS = [
  "aerospace_check", "medical_check", "automotive_check", "oil_gas_check",
] as const;

export function registerIndustryDispatcher(server: any): void {
  server.tool(
    "prism_industry",
    `Industry Compliance dispatcher — aerospace (AS9100/NADCAP), medical (ISO 13485), automotive (IATF 16949), oil & gas (API) compliance checks.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_industry] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }
        switch (action) {
          case "aerospace_check": {
            const checks: Array<{ item: string; status: string; note: string }> = [];
            checks.push({ item: "Material certification", status: params.material_cert ? "pass" : "fail", note: "Requires dual mill cert per AMS 2750" });
            checks.push({ item: "First article inspection", status: params.fai_complete ? "pass" : "pending", note: "AS9102 FAI required" });
            checks.push({ item: "Special process approval", status: params.nadcap_approved ? "pass" : "fail", note: "NADCAP required for heat treat, NDT, plating" });
            checks.push({ item: "Surface finish verification", status: params.surface_verified ? "pass" : "pending", note: "Per drawing callout" });
            checks.push({ item: "Dimensional report", status: params.cmm_complete ? "pass" : "pending", note: "100% ballooned drawing + CMM data" });
            const passCount = checks.filter(c => c.status === "pass").length;
            result = {
              standard: "AS9100D / NADCAP",
              checks,
              pass_rate: `${passCount}/${checks.length}`,
              compliant: passCount === checks.length,
            };
            break;
          }
          case "medical_check": {
            const checks: Array<{ item: string; status: string; note: string }> = [];
            checks.push({ item: "Biocompatibility", status: params.biocompat_tested ? "pass" : "fail", note: "ISO 10993 required" });
            checks.push({ item: "Traceability", status: params.lot_traceable ? "pass" : "fail", note: "Full lot traceability from raw material" });
            checks.push({ item: "Cleaning validation", status: params.cleaning_validated ? "pass" : "pending", note: "Per device classification" });
            checks.push({ item: "Sterilization compatibility", status: params.sterilization_checked ? "pass" : "pending", note: "EtO, gamma, steam, or plasma" });
            checks.push({ item: "UDI marking", status: params.udi_applied ? "pass" : "pending", note: "FDA UDI regulation" });
            const passCount = checks.filter(c => c.status === "pass").length;
            result = {
              standard: "ISO 13485 / FDA 21 CFR 820",
              checks,
              pass_rate: `${passCount}/${checks.length}`,
              compliant: passCount === checks.length,
            };
            break;
          }
          case "automotive_check": {
            const checks: Array<{ item: string; status: string; note: string }> = [];
            checks.push({ item: "PPAP submission", status: params.ppap_level ? "pass" : "pending", note: `Level ${params.ppap_level || "?"}` });
            checks.push({ item: "Control plan", status: params.control_plan ? "pass" : "fail", note: "Required per IATF 16949" });
            checks.push({ item: "MSA / Gauge R&R", status: params.msa_complete ? "pass" : "pending", note: "AIAG MSA 4th edition" });
            checks.push({ item: "Process capability", status: params.cpk && params.cpk >= 1.33 ? "pass" : "fail", note: `Cpk ${params.cpk || "N/A"} (min 1.33)` });
            checks.push({ item: "FMEA", status: params.fmea_complete ? "pass" : "pending", note: "AIAG/VDA FMEA" });
            const passCount = checks.filter(c => c.status === "pass").length;
            result = {
              standard: "IATF 16949",
              checks,
              pass_rate: `${passCount}/${checks.length}`,
              compliant: passCount === checks.length,
            };
            break;
          }
          case "oil_gas_check": {
            const checks: Array<{ item: string; status: string; note: string }> = [];
            checks.push({ item: "Material traceability", status: params.mtr_available ? "pass" : "fail", note: "MTR per API 5CT / NACE MR0175" });
            checks.push({ item: "Hardness verification", status: params.hardness_verified ? "pass" : "pending", note: "Max HRC 22 for sour service" });
            checks.push({ item: "NDT inspection", status: params.ndt_complete ? "pass" : "pending", note: "UT, MT, PT per API spec" });
            checks.push({ item: "Pressure rating", status: params.pressure_rated ? "pass" : "pending", note: "Per ASME B16.5 / API 6A" });
            const passCount = checks.filter(c => c.status === "pass").length;
            result = {
              standard: "API / NACE / ASME",
              checks,
              pass_rate: `${passCount}/${checks.length}`,
              compliant: passCount === checks.length,
            };
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
      } catch (error) {
        return dispatcherError(error, action, "prism_industry");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
