import { useState } from "react";
import { Card, Button, Input, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import { Table, Thead, Tbody, Th, Td } from "../components/ui/Table";
import { useToast } from "../components/ui/Toast";
import { dataApi } from "../api/data";

type DataTab = "materials" | "tools" | "machines" | "alarms";

interface SearchResult {
  id: string;
  name: string;
  [key: string]: unknown;
}

export default function DataManagementPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState<DataTab>("materials");

  const searchFn: Record<DataTab, (q: string) => Promise<unknown>> = {
    materials: (q) => dataApi.searchMaterials({ query: q, limit: 25 }),
    tools: (q) => dataApi.searchTools({ query: q, limit: 25 }),
    machines: (q) => dataApi.searchMachines({ query: q, limit: 25 }),
    alarms: (q) => dataApi.decodeAlarm({ code: q }),
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setDetail(null);
    try {
      const res = await searchFn[activeTab](query.trim());
      if (Array.isArray(res)) {
        setResults(res as SearchResult[]);
      } else {
        setResults([]);
        setDetail(res as Record<string, unknown>);
      }
      toast(`Found ${Array.isArray(res) ? (res as unknown[]).length : 1} result(s)`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Search failed", "error");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const fns: Record<string, (id: string) => Promise<unknown>> = {
        materials: dataApi.getMaterial,
        tools: dataApi.getTool,
        machines: dataApi.getMachine,
      };
      const res = await fns[activeTab]?.(id);
      if (res) setDetail(res as Record<string, unknown>);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load details", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Data Management</h1>
        <Badge color="slate">{results.length} results</Badge>
      </div>

      <Tabs defaultValue="materials">
        <TabList>
          <Tab value="materials">Materials</Tab>
          <Tab value="tools">Tools</Tab>
          <Tab value="machines">Machines</Tab>
          <Tab value="alarms">Alarm Decoder</Tab>
        </TabList>

        {(["materials", "tools", "machines", "alarms"] as DataTab[]).map((tab) => (
          <TabPanel key={tab} value={tab}>
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <Input
                  placeholder={tab === "alarms" ? "Enter alarm code (e.g. 1020)" : `Search ${tab}...`}
                  value={activeTab === tab ? query : ""}
                  onChange={(e) => { setActiveTab(tab); setQuery(e.target.value); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setActiveTab(tab); handleSearch(); } }}
                />
              </div>
              <Button onClick={() => { setActiveTab(tab); handleSearch(); }} disabled={loading}>
                {loading && activeTab === tab ? <Spinner size="sm" /> : "Search"}
              </Button>
            </div>

            {results.length > 0 && activeTab === tab && (
              <Table>
                <Thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Name</Th>
                    <Th>Details</Th>
                  </tr>
                </Thead>
                <Tbody>
                  {results.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <Td><code className="text-xs">{r.id}</code></Td>
                      <Td>{r.name ?? "—"}</Td>
                      <Td>
                        <Button size="sm" variant="ghost" onClick={() => handleViewDetail(r.id)}>
                          View
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </Tbody>
              </Table>
            )}

            {detail && activeTab === tab && (
              <Card title="Details" className="mt-4">
                <pre className="max-h-[400px] overflow-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {JSON.stringify(detail, null, 2)}
                </pre>
              </Card>
            )}
          </TabPanel>
        ))}
      </Tabs>
    </div>
  );
}
