import { useState } from "react";
import { Card, Button, Input, Select, Badge, Spinner } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import { useToast } from "../components/ui/Toast";
import { camApi, type ToolpathRequest } from "../api/cam";

const OPERATIONS = [
  "face_milling", "shoulder_milling", "slot_milling", "pocket_milling",
  "drilling", "tapping", "boring", "reaming", "turning_rough", "turning_finish",
  "grooving", "threading", "3d_roughing", "3d_finishing",
];

const MATERIALS = [
  "aluminum_6061", "aluminum_7075", "steel_1018", "steel_4140", "steel_4340",
  "stainless_304", "stainless_316", "titanium_6al4v", "inconel_718",
  "cast_iron_gray", "brass_360", "copper_110",
];

export default function CamStrategyPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState<ToolpathRequest>({
    material: "aluminum_6061",
    operation: "pocket_milling",
    tool_diameter: 12,
    depth_of_cut: 3,
    width_of_cut: 6,
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await camApi.generateToolpath(form);
      setResult(res as Record<string, unknown>);
      toast("Toolpath strategy generated", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Generation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">CAM Strategy</h1>
        <Badge color="blue">Beta</Badge>
      </div>

      <Tabs defaultValue="generate">
        <TabList>
          <Tab value="generate">Strategy Generator</Tab>
          <Tab value="simulate">Simulation</Tab>
          <Tab value="validate">Collision Check</Tab>
        </TabList>

        <TabPanel value="generate">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card title="Parameters" className="lg:col-span-1">
              <div className="space-y-4">
                <Select
                  label="Material"
                  value={form.material}
                  onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
                  options={MATERIALS.map((m) => ({ value: m, label: m.replace(/_/g, " ") }))}
                />
                <Select
                  label="Operation"
                  value={form.operation}
                  onChange={(e) => setForm((f) => ({ ...f, operation: e.target.value }))}
                  options={OPERATIONS.map((o) => ({ value: o, label: o.replace(/_/g, " ") }))}
                />
                <Input
                  label="Tool Diameter"
                  type="number"
                  unit="mm"
                  value={form.tool_diameter ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, tool_diameter: +e.target.value || undefined }))}
                />
                <Input
                  label="Depth of Cut"
                  type="number"
                  unit="mm"
                  value={form.depth_of_cut ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, depth_of_cut: +e.target.value || undefined }))}
                />
                <Input
                  label="Width of Cut"
                  type="number"
                  unit="mm"
                  value={form.width_of_cut ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, width_of_cut: +e.target.value || undefined }))}
                />
                <Button onClick={handleGenerate} disabled={loading} className="w-full">
                  {loading ? <Spinner size="sm" /> : "Generate Strategy"}
                </Button>
              </div>
            </Card>

            <Card title="Results" className="lg:col-span-2">
              {!result && !loading && (
                <p className="text-sm text-slate-500">Configure parameters and click Generate to see recommended CAM strategy.</p>
              )}
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              )}
              {result && !loading && (
                <pre className="max-h-[500px] overflow-auto rounded-md bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(result, null, 2)}
                </pre>
              )}
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="simulate">
          <Card title="Toolpath Simulation">
            <p className="text-sm text-slate-500">Paste G-code or load from post processor to simulate toolpath motion and estimate cycle time.</p>
            <textarea
              className="mt-3 w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              rows={10}
              placeholder="G90 G0 X0 Y0 Z50&#10;G43 H1 Z5&#10;G1 Z-3 F200&#10;..."
            />
            <Button variant="secondary" className="mt-3">Run Simulation</Button>
          </Card>
        </TabPanel>

        <TabPanel value="validate">
          <Card title="Collision Detection">
            <p className="text-sm text-slate-500">Validate toolpath against stock, fixtures, and machine envelope for potential collisions.</p>
            <Button variant="secondary" className="mt-3">Upload Toolpath</Button>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}
