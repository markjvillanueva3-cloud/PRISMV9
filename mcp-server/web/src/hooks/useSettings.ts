import { useCallback, useEffect, useState } from "react";
import { settingsApi } from "../api/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, unknown>>(() => {
    try { return JSON.parse(localStorage.getItem("prism-settings") ?? "{}"); } catch { return {}; }
  });
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    settingsApi.get().then(s => { if (s && Object.keys(s).length) { setSettings(s); setSynced(true); } }).catch(() => {});
  }, []);

  const update = useCallback((key: string, value: unknown) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("prism-settings", JSON.stringify(next));
      settingsApi.save(next).catch(() => {});
      return next;
    });
  }, []);

  return { settings, update, synced };
}
