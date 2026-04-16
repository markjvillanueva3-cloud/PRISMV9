import { useState } from "react";
import { Card, Button, Input, Badge, Spinner } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import { Table, Thead, Tbody, Th, Td } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";
import { qualityApi } from "../api/quality";

export default function QualityPage() {
  const { toast } = useToast();

  // SPC tab state
  const [spcData, setSpcData] = useState("");
  const [spcNominal, setSpcNominal] = useState(25);
  const [spcUsl, setSpcUsl] = useState(25.013);
  const [spcLsl, setSpcLsl] = useState(24.987);
  const [spcResult, setSpcResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Cpk tab state
  const [cpkData, setCpkData] = useState("");
  const [cpkUsl, setCpkUsl] = useState(25.013);
  const [cpkLsl, setCpkLsl] = useState(24.987);
  const [cpkResult, setCpkResult] = useState<Record<string, unknown> | null>(null);

  // Tolerance stack state
  const [stackDims, setStackDims] = useState([
    { nominal: 25, tolerance_plus: 0.013, tolerance_minus: -0.013 },
    { nominal: 10, tolerance_plus: 0.01, tolerance_minus: -0.01 },
  ]);
  const [stackMethod, setStackMethod] = useState<"worst_case" | "rss" | "monte_carlo">("rss");
  const [stackResult, setStackResult] = useState<Record<string, unknown> | null>(null);

  const parseMeasurements = (raw: string): number[] =>
    raw.split(/[\n,;\s]+/).map(Number).filter((n) => !isNaN(n));

  const handleSpc = async () => {
    const measurements = parseMeasurements(spcData);
    if (measurements.length < 3) { toast("Need at least 3 measurements", "warning"); return; }
    setLoading(true);
    try {
      const res = await qualityApi.spc({
        measurements, nominal: spcNominal, usl: spcUsl, lsl: spcLsl,
      });
      setSpcResult(res as Record<string, unknown>);
      toast("SPC analysis complete", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "SPC failed", "error");
    } finally { setLoading(false); }
  };

  const handleCpk = async () => {
    const measurements = parseMeasurements(cpkData);
    if (measurements.length < 3) { toast("Need at least 3 measurements", "warning"); return; }
    setLoading(true);
    try {
      const res = await qualityApi.cpk({ measurements, usl: cpkUsl, lsl: cpkLsl });
      setCpkResult(res as Record<string, unknown>);
      toast("Cpk analysis complete", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Cpk failed", "error");
    } finally { setLoading(false); }
  };

  const handleStack = async () => {
    setLoading(true);
    try {
      const res = await qualityApi.toleranceStack({
        dimensions: stackDims, method: stackMethod,
      });
      setStackResult(res as Record<string, unknown>);
      toast("Tolerance stack complete", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Stack failed", "error");
    } finally { setLoading(false); }
  };

  const addDimension = () => {
    setStackDims((d) => [...d, { nominal: 0, tolerance_plus: 0.01, tolerance_minus: -0.01 }]);
  };

  const updateDim = (idx: number, field: string, value: number) => {
    setStackDims((dims) => dims.map((d, i) =>
      i === idx ? { ...d, [field]: value } : d
    ));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Quality Inspection
        </h1>
        <Badge color="green">Active</Badge>
      </div>

      <Tabs defaultValue="spc">
        <TabList>
          <Tab value="spc">SPC Analysis</Tab>
          <Tab value="cpk">Cpk Calculator</Tab>
          <Tab value="stack">Tolerance Stack</Tab>
        </TabList>

        {/* SPC Tab */}
        <TabPanel value="spc">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Measurement Data">
              <div className="space-y-3">
                <textarea
                  className="w-full rounded-md border border-slate-300 bg-white p-3
                    font-mono text-xs dark:border-slate-600 dark:bg-slate-800
                    dark:text-slate-200"
                  rows={6}
                  placeholder="Enter measurements (comma, space, or newline separated)&#10;25.003, 25.001, 24.998, 25.005..."
                  value={spcData}
                  onChange={(e) => setSpcData(e.target.value)}
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Nominal" type="number" unit="mm"
                    value={spcNominal}
                    onChange={(e) => setSpcNominal(+e.target.value)} />
                  <Input label="USL" type="number" unit="mm"
                    value={spcUsl}
                    onChange={(e) => setSpcUsl(+e.target.value)} />
                  <Input label="LSL" type="number" unit="mm"
                    value={spcLsl}
                    onChange={(e) => setSpcLsl(+e.target.value)} />
                </div>
                <Button onClick={handleSpc} disabled={loading} className="w-full">
                  {loading ? <Spinner size="sm" /> : "Run SPC Analysis"}
                </Button>
              </div>
            </Card>
            <Card title="Results">
              {spcResult ? (
                <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-50
                  p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(spcResult, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">
                  Enter measurements and run SPC to see control chart data.
                </p>
              )}
            </Card>
          </div>
        </TabPanel>

        {/* Cpk Tab */}
        <TabPanel value="cpk">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Cpk Input">
              <div className="space-y-3">
                <textarea
                  className="w-full rounded-md border border-slate-300 bg-white p-3
                    font-mono text-xs dark:border-slate-600 dark:bg-slate-800
                    dark:text-slate-200"
                  rows={6}
                  placeholder="Enter measurements..."
                  value={cpkData}
                  onChange={(e) => setCpkData(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="USL" type="number" unit="mm"
                    value={cpkUsl}
                    onChange={(e) => setCpkUsl(+e.target.value)} />
                  <Input label="LSL" type="number" unit="mm"
                    value={cpkLsl}
                    onChange={(e) => setCpkLsl(+e.target.value)} />
                </div>
                <Button onClick={handleCpk} disabled={loading} className="w-full">
                  {loading ? <Spinner size="sm" /> : "Calculate Cpk"}
                </Button>
              </div>
            </Card>
            <Card title="Results">
              {cpkResult ? (
                <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-50
                  p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(cpkResult, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">
                  Enter measurements and spec limits to calculate process capability.
                </p>
              )}
            </Card>
          </div>
        </TabPanel>

        {/* Tolerance Stack Tab */}
        <TabPanel value="stack">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Dimensions">
              <Table>
                <Thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Nominal</Th>
                    <Th>+Tol</Th>
                    <Th>-Tol</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {stackDims.map((d, i) => (
                    <tr key={i}>
                      <Td>{i + 1}</Td>
                      <Td>
                        <input type="number" className="w-20 rounded border px-1 py-0.5
                          text-xs dark:bg-slate-800 dark:border-slate-600"
                          value={d.nominal}
                          onChange={(e) => updateDim(i, "nominal", +e.target.value)} />
                      </Td>
                      <Td>
                        <input type="number" step="0.001" className="w-20 rounded border
                          px-1 py-0.5 text-xs dark:bg-slate-800 dark:border-slate-600"
                          value={d.tolerance_plus}
                          onChange={(e) => updateDim(i, "tolerance_plus", +e.target.value)} />
                      </Td>
                      <Td>
                        <input type="number" step="0.001" className="w-20 rounded border
                          px-1 py-0.5 text-xs dark:bg-slate-800 dark:border-slate-600"
                          value={d.tolerance_minus}
                          onChange={(e) => updateDim(i, "tolerance_minus", +e.target.value)} />
                      </Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" onClick={addDimension}>
                  + Add Dimension
                </Button>
                <select
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs
                    dark:border-slate-600 dark:bg-slate-800"
                  value={stackMethod}
                  onChange={(e) => setStackMethod(e.target.value as typeof stackMethod)}
                >
                  <option value="worst_case">Worst Case</option>
                  <option value="rss">RSS</option>
                  <option value="monte_carlo">Monte Carlo</option>
                </select>
              </div>
              <Button onClick={handleStack} disabled={loading} className="mt-3 w-full">
                {loading ? <Spinner size="sm" /> : "Calculate Stack"}
              </Button>
            </Card>
            <Card title="Stack Result">
              {stackResult ? (
                <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-50
                  p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(stackResult, null, 2)}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">
                  Add dimensions and select method to calculate tolerance stack-up.
                </p>
              )}
            </Card>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
