import { useState, useEffect } from "react";
import { Card, Button, Input, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import { useToast } from "../components/ui/Toast";

type Units = "metric" | "imperial";
type Theme = "light" | "dark" | "system";

interface Settings {
  units: Units;
  theme: Theme;
  defaultMaterial: string;
  defaultController: string;
  apiEndpoint: string;
  safetyWarnings: boolean;
  autoSave: boolean;
  decimalPlaces: number;
}

const DEFAULTS: Settings = {
  units: "metric",
  theme: "system",
  defaultMaterial: "aluminum_6061",
  defaultController: "fanuc",
  apiEndpoint: "/api/v1",
  safetyWarnings: true,
  autoSave: true,
  decimalPlaces: 3,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem("prism-settings");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [saved, setSaved] = useState(true);

  useEffect(() => { setSaved(false); }, [settings]);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const handleSave = () => {
    localStorage.setItem("prism-settings", JSON.stringify(settings));
    // Apply theme
    localStorage.setItem("prism-theme", settings.theme);
    const resolved = settings.theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : settings.theme;
    document.documentElement.classList.toggle("dark", resolved === "dark");
    setSaved(true);
    toast("Settings saved", "success");
  };

  const handleReset = () => {
    setSettings(DEFAULTS);
    toast("Settings reset to defaults", "info");
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Settings
        </h1>
        <div className="flex items-center gap-2">
          {!saved && <Badge color="yellow">Unsaved</Badge>}
          <Button size="sm" variant="secondary" onClick={handleReset}>
            Reset
          </Button>
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabList>
          <Tab value="general">General</Tab>
          <Tab value="defaults">Defaults</Tab>
          <Tab value="advanced">Advanced</Tab>
        </TabList>

        <TabPanel value="general">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Display">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700
                    dark:text-slate-300 mb-1">
                    Units
                  </label>
                  <div className="flex rounded-md bg-slate-100
                    dark:bg-slate-700 p-0.5">
                    {(["metric", "imperial"] as Units[]).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => update("units", u)}
                        className={`flex-1 rounded-md py-2 text-sm font-medium
                          transition-colors capitalize ${
                          settings.units === u
                            ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700
                    dark:text-slate-300 mb-1">
                    Theme
                  </label>
                  <div className="flex rounded-md bg-slate-100
                    dark:bg-slate-700 p-0.5">
                    {(["light", "dark", "system"] as Theme[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => update("theme", t)}
                        className={`flex-1 rounded-md py-2 text-sm font-medium
                          transition-colors capitalize ${
                          settings.theme === t
                            ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-white"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Decimal Places"
                  type="number"
                  value={settings.decimalPlaces}
                  onChange={(e) => update("decimalPlaces", +e.target.value)}
                />
              </div>
            </Card>

            <Card title="Behavior">
              <div className="space-y-4">
                <Toggle
                  label="Safety Warnings"
                  description="Show safety alerts for cutting parameters"
                  checked={settings.safetyWarnings}
                  onChange={(v) => update("safetyWarnings", v)}
                />
                <Toggle
                  label="Auto-Save"
                  description="Save calculation presets automatically"
                  checked={settings.autoSave}
                  onChange={(v) => update("autoSave", v)}
                />
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="defaults">
          <Card title="Default Values">
            <div className="grid gap-4 lg:grid-cols-2">
              <Input
                label="Default Material"
                value={settings.defaultMaterial}
                onChange={(e) => update("defaultMaterial", e.target.value)}
              />
              <Input
                label="Default Controller"
                value={settings.defaultController}
                onChange={(e) => update("defaultController", e.target.value)}
              />
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="advanced">
          <Card title="API Configuration">
            <Input
              label="API Endpoint"
              value={settings.apiEndpoint}
              onChange={(e) => update("apiEndpoint", e.target.value)}
            />
            <p className="mt-2 text-xs text-slate-400">
              Base URL for the PRISM API server.
            </p>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer
          rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary-600" : "bg-slate-200 dark:bg-slate-600"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full
            bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
