import type {
  MachineStatus,
  AdaptiveOverride,
  MaintenanceAlert,
  DigitalTwinState,
} from "../types/machineLive";

const BASE_URL = "/api/v1/machine-live";
const TIMEOUT_MS = 15_000;

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const machineLiveApi = {
  // /list and /maintenance are POST on the backend (createMachineLiveRouter -> machine_list / maint_status).
  // The client previously called them as GET -> 404 (a method mismatch, not a missing route). Reconciled
  // to POST to match the live backend; both take no body.
  listMachines: () => post<MachineStatus[]>("/list", {}),
  getStatus: (params: { machine_id: string }) => post<MachineStatus>("/status", params),
  getAdaptiveStatus: (params: { machine_id: string }) => post<AdaptiveOverride[]>("/adaptive", params),
  getMaintenanceAlerts: () => post<MaintenanceAlert[]>("/maintenance", {}),
  getDigitalTwin: (params: { machine_id: string }) => post<DigitalTwinState>("/twin", params),
  acknowledgeAlert: (params: { alert_id: string }) => post<{ ok: boolean }>("/acknowledge", params),
  connectMachine: (params: { machine_id: string }) => post<{ ok: boolean }>("/connect", params),
};
