import { useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useEdmWire, useEdmSinker, useEdmLaser } from "../hooks/useEdm";
import { quickGenerate } from "../api/wedmStudio";
import type { WireEdmParams, SinkerEdmParams, LaserParams } from "../types/edm";
import type { WedmStep, ControllerDialect } from "../types/wedmStudio";

// ============================================================================
// QUICK GENERATE CONSTANTS
// ============================================================================

const CONTROLLERS: { value: ControllerDialect; label: string }[] = [
  { value: "fanuc", label: "Fanuc" },
  { value: "sodick", label: "Sodick" },
  { value: "makino", label: "Makino" },
  { value: "mitsubishi", label: "Mitsubishi" },
  { value: "agiecharmilles", label: "AgieCharmilles" },
  { value: "accutex", label: "Accutex" },
];

const STEP_LABELS: Record<WedmStep, string> = {
  import: "Parsing geometry",
  review: "Classifying features",
  wcs: "Planning start holes",
  toolpath: "Generating toolpath",
  optimize: "Optimizing parameters",
  program: "Generating G-code",
};

// ============================================================================
// QUICK GENERATE PANEL
// ============================================================================

function QuickGeneratePanel() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [material, setMaterial] = useState("AISI D2");
  const [controller, setController] = useState<ControllerDialect>("fanuc");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ step: WedmStep; pct: number } | null>(null);
  const [error, setError] = useState<{ message: string; step?: WedmStep } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!file) return;
    setRunning(true);
    setError(null);
    setProgress({ step: "import", pct: 0 });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const dxfContent = await file.text();
      const result = await quickGenerate(
        dxfContent,
        material,
        controller,
        (step, pct) => setProgress({ step, pct }),
        abort.signal,
      );

      if (result.ok) {
        navigate("/wire-edm");
      } else {
        setError({ message: result.error ?? "Quick Generate failed", step: result.step });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError({ message: err.message ?? "Unexpected error" });
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [file, material, controller, navigate]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setRunning(false);
    setProgress(null);
  }, []);

  return (
    <div className="space-y-3 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
      <h4 className="text-xs font-semibold uppercase text-slate-400">Quick Generate</h4>
      <p className="text-xs text-slate-500">Upload a DXF and generate a complete G-code program in one step.</p>

      {/* File input */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".dxf"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Select DXF file for Quick Generate"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={running}
        >
          {file ? file.name : "Select DXF File"}
        </Button>
      </div>

      {/* Material + Controller */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Material</label>
          <input
            type="text"
            value={material}
            onChange={e => setMaterial(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border rounded"
            disabled={running}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Controller</label>
          <select
            value={controller}
            onChange={e => setController(e.target.value as ControllerDialect)}
            className="w-full px-2 py-1.5 text-sm border rounded"
            disabled={running}
          >
            {CONTROLLERS.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress */}
      {running && progress && (
        <div className="space-y-1.5" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">{STEP_LABELS[progress.step]}</span>
            <span className="text-slate-400">{progress.pct}%</span>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 rounded-full"
              style={{ width: `${progress.pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-xs">
          <p className="text-red-700 dark:text-red-300">{error.message}</p>
          {error.step && (
            <Link
              to="/wire-edm"
              className="text-blue-600 hover:underline mt-1 inline-block"
            >
              Open at failing step ({error.step}) &rarr;
            </Link>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={!file || running}
        >
          {running ? (
            <span className="flex items-center gap-2"><Spinner size="sm" /> Generating…</span>
          ) : "Quick Generate"}
        </Button>
        {running && (
          <Button size="sm" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED INPUT FIELD
// ============================================================================

function InputField({ label, value, onChange, type = "number", placeholder }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder={placeholder} />
    </div>
  );
}

export default function EdmPage() {
  // Wire EDM state
  const [wireParams, setWireParams] = useState<Partial<WireEdmParams>>({ material: "", thickness_mm: 0 });
  const wire = useEdmWire();

  // Sinker EDM state
  const [sinkerParams, setSinkerParams] = useState<Partial<SinkerEdmParams>>({ material: "", depth_mm: 0, area_mm2: 0 });
  const sinker = useEdmSinker();

  // Laser state
  const [laserParams, setLaserParams] = useState<Partial<LaserParams>>({ material: "", thickness_mm: 0, power_W: 0 });
  const laser = useEdmLaser();

  const updateWire = useCallback((field: string, value: string) => {
    setWireParams(prev => ({ ...prev, [field]: field === "material" ? value : +value }));
  }, []);

  const updateSinker = useCallback((field: string, value: string) => {
    setSinkerParams(prev => ({ ...prev, [field]: field === "material" || field === "electrode_material" || field === "dielectric" ? value : +value }));
  }, []);

  const updateLaser = useCallback((field: string, value: string) => {
    setLaserParams(prev => ({ ...prev, [field]: field === "material" || field === "laser_type" || field === "assist_gas" ? value : +value }));
  }, []);

  const activeResult = wire.data || sinker.data || laser.data;
  const activeError = wire.error || sinker.error || laser.error;
  const activeLoading = wire.loading || sinker.loading || laser.loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">EDM &amp; Non-Traditional Machining</h2>

          <Tabs defaultValue="wire">
            <TabList>
              <Tab value="wire">Wire EDM</Tab>
              <Tab value="sinker">Sinker EDM</Tab>
              <Tab value="laser">Laser</Tab>
            </TabList>

            <TabPanel value="wire">
              {/* Wire EDM Studio link */}
              <div className="flex items-center justify-between mt-2 mb-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Wire EDM Studio</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Full 6-step wizard: DXF import, toolpath, multi-pass optimization, and G-code generation.</p>
                </div>
                <Link
                  to="/wire-edm"
                  className="flex-shrink-0 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors min-h-[44px] flex items-center"
                >
                  Open Studio &rarr;
                </Link>
              </div>

              {/* Quick Generate */}
              <QuickGeneratePanel />

              <hr className="my-3 border-slate-200 dark:border-slate-700" />

              {/* EDM Calculator */}
              <div className="space-y-2">
                <InputField label="Material" value={wireParams.material ?? ""} onChange={v => updateWire("material", v)} type="text" placeholder="e.g. AISI D2, Ti-6Al-4V" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={wireParams.thickness_mm ?? ""} onChange={v => updateWire("thickness_mm", v)} />
                  <InputField label="Wire Diameter (mm)" value={wireParams.wire_diameter_mm ?? ""} onChange={v => updateWire("wire_diameter_mm", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Discharge Energy (mJ)" value={wireParams.discharge_energy_mJ ?? ""} onChange={v => updateWire("discharge_energy_mJ", v)} />
                  <InputField label="Pulse On (us)" value={wireParams.pulse_on_us ?? ""} onChange={v => updateWire("pulse_on_us", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Pulse Off (us)" value={wireParams.pulse_off_us ?? ""} onChange={v => updateWire("pulse_off_us", v)} />
                  <InputField label="Wire Tension (N)" value={wireParams.wire_tension_N ?? ""} onChange={v => updateWire("wire_tension_N", v)} />
                </div>
                <InputField label="Number of Cuts" value={wireParams.num_cuts ?? ""} onChange={v => updateWire("num_cuts", v)} />
                <Button onClick={() => wire.execute(wireParams as WireEdmParams)} disabled={wire.loading} className="w-full mt-2">
                  {wire.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Wire EDM"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="sinker">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={sinkerParams.material ?? ""} onChange={v => updateSinker("material", v)} type="text" placeholder="e.g. Tool Steel, Inconel 718" />
                <InputField label="Electrode Material" value={sinkerParams.electrode_material ?? ""} onChange={v => updateSinker("electrode_material", v)} type="text" placeholder="e.g. Copper, Graphite" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Depth (mm)" value={sinkerParams.depth_mm ?? ""} onChange={v => updateSinker("depth_mm", v)} />
                  <InputField label="Area (mm2)" value={sinkerParams.area_mm2 ?? ""} onChange={v => updateSinker("area_mm2", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Discharge Energy (mJ)" value={sinkerParams.discharge_energy_mJ ?? ""} onChange={v => updateSinker("discharge_energy_mJ", v)} />
                  <InputField label="Pulse On (us)" value={sinkerParams.pulse_on_us ?? ""} onChange={v => updateSinker("pulse_on_us", v)} />
                </div>
                <InputField label="Pulse Off (us)" value={sinkerParams.pulse_off_us ?? ""} onChange={v => updateSinker("pulse_off_us", v)} />
                <Button onClick={() => sinker.execute(sinkerParams as SinkerEdmParams)} disabled={sinker.loading} className="w-full mt-2">
                  {sinker.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Sinker EDM"}
                </Button>
              </div>
            </TabPanel>

            <TabPanel value="laser">
              <div className="space-y-2 mt-2">
                <InputField label="Material" value={laserParams.material ?? ""} onChange={v => updateLaser("material", v)} type="text" placeholder="e.g. Stainless Steel, Aluminum" />
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Thickness (mm)" value={laserParams.thickness_mm ?? ""} onChange={v => updateLaser("thickness_mm", v)} />
                  <InputField label="Power (W)" value={laserParams.power_W ?? ""} onChange={v => updateLaser("power_W", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Wavelength (nm)" value={laserParams.wavelength_nm ?? ""} onChange={v => updateLaser("wavelength_nm", v)} />
                  <InputField label="Spot Diameter (um)" value={laserParams.spot_diameter_um ?? ""} onChange={v => updateLaser("spot_diameter_um", v)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputField label="Assist Gas" value={laserParams.assist_gas ?? ""} onChange={v => updateLaser("assist_gas", v)} type="text" placeholder="e.g. N2, O2, Ar" />
                  <InputField label="Gas Pressure (bar)" value={laserParams.gas_pressure_bar ?? ""} onChange={v => updateLaser("gas_pressure_bar", v)} />
                </div>
                <Button onClick={() => laser.execute(laserParams as LaserParams)} disabled={laser.loading} className="w-full mt-2">
                  {laser.loading ? <><Spinner size="sm" /> Calculating...</> : "Calculate Laser"}
                </Button>
              </div>
            </TabPanel>
          </Tabs>

          {activeError && <p className="mt-2 text-xs text-red-600">{activeError}</p>}
        </Card>
      </div>

      <div className="lg:col-span-2">
        {activeResult ? (
          <Card>
            <h3 className="font-bold mb-3">Results</h3>
            {"cutting_speed_mm_min" in activeResult && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Cutting Speed</div>
                  <div className="text-lg font-semibold">{activeResult.cutting_speed_mm_min} mm/min</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Surface Finish</div>
                  <div className="text-lg font-semibold">{String((activeResult as unknown as Record<string, unknown>).surface_roughness_Ra ?? (activeResult as unknown as Record<string, unknown>).surface_finish_Ra ?? "")} Ra</div>
                </div>
              </div>
            )}
            {"mrr_mm3_min" in activeResult && (
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">MRR</div>
                  <div className="text-lg font-semibold">{activeResult.mrr_mm3_min} mm3/min</div>
                </div>
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-500">Power</div>
                  <div className="text-lg font-semibold">{activeResult.power_consumption_kW} kW</div>
                </div>
              </div>
            )}
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(activeResult, null, 2)}
            </pre>
            {"recommendations" in activeResult && (activeResult.recommendations as string[]).length > 0 && (
              <div className="mt-3 space-y-1">
                {(activeResult.recommendations as string[]).map((r: string, i: number) => (
                  <div key={i} className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-800">{r}</div>
                ))}
              </div>
            )}
          </Card>
        ) : !activeLoading ? (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">EDM &amp; Non-Traditional Machining</p>
              <p className="text-sm">Configure wire EDM, sinker EDM, or laser machining parameters to calculate cutting speeds, surface finish, MRR, and power consumption.</p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge color="blue">Wire EDM</Badge>
                <Badge color="green">Sinker EDM</Badge>
                <Badge color="yellow">Laser</Badge>
              </div>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
