const BASE = "/api/v1/settings";

export const settingsApi = {
  get: async () => {
    const r = await fetch(BASE);
    return r.ok ? (await r.json()).settings : {};
  },
  save: async (settings: Record<string, unknown>) => {
    const r = await fetch(BASE, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
    return r.ok ? (await r.json()).settings : null;
  },
};
