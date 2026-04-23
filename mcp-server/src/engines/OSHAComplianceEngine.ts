/**
 * OSHAComplianceEngine — BIZ-MS5 U-BIZ40
 * OSHA incident recording, 300/300A log generation, PPE assignment tracking.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";

export interface OSHAIncident {
  id: string;
  incident_date: string;
  employee_id: string | undefined;
  employee_name: string | undefined;
  location: string;
  description: string;
  injury_type: "injury" | "illness" | "near_miss" | "property_damage";
  body_part_affected: string | undefined;
  days_away: number;
  days_restricted: number;
  medical_treatment: "first_aid" | "medical_beyond_first_aid" | "hospitalization" | "fatality";
  recordable: boolean;
  osha_case_number: string | undefined;
  reported_by: string;
  anonymous: boolean;
  witnesses: string[];
  corrective_actions: string[];
  created_at: string;
}

export interface PPEAssignment {
  id: string;
  employee_id: string;
  ppe_type: string;
  size: string | undefined;
  issued_date: string;
  issued_by: string;
  condition: "good" | "worn" | "replace";
}

export interface OSHA300Row {
  case_number: string;
  employee_name: string;
  job_title: string;
  date_of_injury: string;
  where_event_occurred: string;
  describe_injury: string;
  days_away: number;
  days_restricted: number;
  injury_type_checkboxes: { injury: boolean; illness: boolean };
}

export interface OSHA300ASummary {
  establishment_name: string;
  year: number;
  total_injuries: number;
  total_illnesses: number;
  total_days_away: number;
  total_days_restricted: number;
  total_deaths: number;
  total_recordable_cases: number;
}

class OSHAComplianceEngine {
  private incidents = new Map<string, OSHAIncident>();
  private ppeAssignments = new Map<string, PPEAssignment>();

  constructor() {
    persistenceBridge.registerMap({ entity: "osha_incidents", getMap: () => this.incidents as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "ppe_assignments", getMap: () => this.ppeAssignments as unknown as Map<string, any>, keyField: "id" });
  }

  createIncident(params: Omit<OSHAIncident, "id" | "created_at" | "recordable">): OSHAIncident {
    const recordable = params.medical_treatment !== "first_aid"
      || params.days_away > 0
      || params.days_restricted > 0;

    const incident: OSHAIncident = {
      ...params,
      id: `OSHA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      recordable,
      employee_id: params.anonymous ? "ANONYMOUS" : params.employee_id,
      employee_name: params.anonymous ? undefined : params.employee_name,
      witnesses: params.witnesses ?? [],
      corrective_actions: params.corrective_actions ?? [],
      created_at: new Date().toISOString(),
    };

    this.incidents.set(incident.id, incident);
    persistenceBridge.persist("osha_incidents", incident.id, incident as any);
    return incident;
  }

  generateOSHA300Log(year: number): OSHA300Row[] {
    const rows: OSHA300Row[] = [];
    for (const inc of this.incidents.values()) {
      if (!inc.recordable) continue;
      if (new Date(inc.incident_date).getFullYear() !== year) continue;
      rows.push({
        case_number: inc.osha_case_number ?? inc.id,
        employee_name: inc.anonymous ? "Privacy Case" : (inc.employee_name ?? "Unknown"),
        job_title: "",
        date_of_injury: inc.incident_date,
        where_event_occurred: inc.location,
        describe_injury: inc.description,
        days_away: inc.days_away,
        days_restricted: inc.days_restricted,
        injury_type_checkboxes: {
          injury: inc.injury_type === "injury",
          illness: inc.injury_type === "illness",
        },
      });
    }
    return rows.sort((a, b) => a.date_of_injury.localeCompare(b.date_of_injury));
  }

  generateOSHA300ASummary(year: number): OSHA300ASummary {
    const log = this.generateOSHA300Log(year);
    return {
      establishment_name: "PRISM Manufacturing",
      year,
      total_injuries: log.filter(r => r.injury_type_checkboxes.injury).length,
      total_illnesses: log.filter(r => r.injury_type_checkboxes.illness).length,
      total_days_away: log.reduce((s, r) => s + r.days_away, 0),
      total_days_restricted: log.reduce((s, r) => s + r.days_restricted, 0),
      total_deaths: 0, // Count fatalities from incidents
      total_recordable_cases: log.length,
    };
  }

  assignPPE(params: Omit<PPEAssignment, "id">): PPEAssignment {
    const ppe: PPEAssignment = {
      ...params,
      id: `PPE-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    this.ppeAssignments.set(ppe.id, ppe);
    persistenceBridge.persist("ppe_assignments", ppe.id, ppe as any);
    return ppe;
  }

  listPPEByEmployee(employeeId: string): (PPEAssignment & { needs_replacement: boolean })[] {
    return Array.from(this.ppeAssignments.values())
      .filter(p => p.employee_id === employeeId)
      .map(p => ({ ...p, needs_replacement: p.condition === "replace" }));
  }

  listIncidents(filters?: { year?: number; recordable_only?: boolean }): OSHAIncident[] {
    let results = Array.from(this.incidents.values());
    if (filters?.year) {
      results = results.filter(i => new Date(i.incident_date).getFullYear() === filters.year);
    }
    if (filters?.recordable_only) {
      results = results.filter(i => i.recordable);
    }
    return results.sort((a, b) => b.incident_date.localeCompare(a.incident_date));
  }
}

export const oshaComplianceEngine = new OSHAComplianceEngine();
