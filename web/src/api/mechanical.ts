import type { MechanicalInput, MechanicalCategory } from "../types/mechanical";

const BASE_URL = "/api/v1/mechanical";
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

async function get<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, { signal: controller.signal });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? res.statusText);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const mechanicalApi = {
  calculate: (category: string, input: MechanicalInput) => post(`/${category}`, input),
  calculateAction: (category: string, action: string, input: MechanicalInput) => post(`/${category}/${action}`, input),
  getActions: () => get<{ categories: MechanicalCategory[] }>("/actions"),
  // Shorthand per category
  gear: (input: MechanicalInput) => post("/gear", input),
  bearing: (input: MechanicalInput) => post("/bearing", input),
  spring: (input: MechanicalInput) => post("/spring", input),
  shaft: (input: MechanicalInput) => post("/shaft", input),
  fastener: (input: MechanicalInput) => post("/fastener", input),
  coupling: (input: MechanicalInput) => post("/coupling", input),
  brake: (input: MechanicalInput) => post("/brake", input),
  drivetrain: (input: MechanicalInput) => post("/drivetrain", input),
  structural: (input: MechanicalInput) => post("/structural", input),
};
