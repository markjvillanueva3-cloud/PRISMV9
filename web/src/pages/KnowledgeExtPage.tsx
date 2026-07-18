import { useState, useCallback } from "react";
import { Card, Button, Spinner, Badge, Tabs, TabList, Tab, TabPanel } from "../components/ui";
import { useKnowledgeApprentice, useKnowledgeGenome, useKnowledgeGraph, useKnowledgeFederated } from "../hooks/useKnowledgeExt";

export default function KnowledgeExtPage() {
  // Apprentice state
  const [apprenticeInput, setApprenticeInput] = useState({ topic: "", difficulty: "beginner", material: "" });
  const apprentice = useKnowledgeApprentice();

  // Genome state
  const [genomeInput, setGenomeInput] = useState({ material: "", operation: "", process_id: "" });
  const genome = useKnowledgeGenome();

  // Graph state
  const [graphInput, setGraphInput] = useState({ query: "", node_type: "concept", max_depth: 3 });
  const graph = useKnowledgeGraph();

  // Federated state
  const [federatedInput, setFederatedInput] = useState({ model_type: "", source_count: 3, privacy_budget: 1.0 });
  const federated = useKnowledgeFederated();

  const updateField = useCallback(<T extends Record<string, unknown>>(setter: React.Dispatch<React.SetStateAction<T>>, field: string, value: unknown) => {
    setter(prev => ({ ...prev, [field]: value }));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
      <div className="space-y-3">
        <Card>
          <h2 className="text-lg font-bold mb-3">Knowledge Extension</h2>

          <Tabs defaultValue="apprentice">
            <TabList>
              <Tab value="apprentice">Apprentice</Tab>
              <Tab value="genome">Manufacturing Genome</Tab>
              <Tab value="graph">Knowledge Graph</Tab>
              <Tab value="federated">Federated Learning</Tab>
            </TabList>

            <TabPanel value="apprentice">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Topic</label>
                  <input type="text" value={apprenticeInput.topic} onChange={e => updateField(setApprenticeInput, "topic", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. tool wear, surface finish" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Difficulty</label>
                  <select value={apprenticeInput.difficulty} onChange={e => updateField(setApprenticeInput, "difficulty", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material Context</label>
                  <input type="text" value={apprenticeInput.material} onChange={e => updateField(setApprenticeInput, "material", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="Optional: e.g. Ti-6Al-4V" />
                </div>
                <Button onClick={() => apprentice.execute(apprenticeInput)} disabled={apprentice.loading} className="w-full mt-2">
                  {apprentice.loading ? <><Spinner size="sm" /> Generating...</> : "Generate Lesson"}
                </Button>
                {apprentice.error && <p className="mt-2 text-xs text-red-600">{apprentice.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="genome">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                  <input type="text" value={genomeInput.material} onChange={e => updateField(setGenomeInput, "material", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. AISI 316L" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Operation</label>
                  <input type="text" value={genomeInput.operation} onChange={e => updateField(setGenomeInput, "operation", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. milling, turning" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Process ID</label>
                  <input type="text" value={genomeInput.process_id} onChange={e => updateField(setGenomeInput, "process_id", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="Optional" />
                </div>
                <Button onClick={() => genome.execute(genomeInput)} disabled={genome.loading} className="w-full mt-2">
                  {genome.loading ? <><Spinner size="sm" /> Analyzing...</> : "Analyze Genome"}
                </Button>
                {genome.error && <p className="mt-2 text-xs text-red-600">{genome.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="graph">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Query</label>
                  <input type="text" value={graphInput.query} onChange={e => updateField(setGraphInput, "query", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. Kienzle force model" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Node Type</label>
                  <select value={graphInput.node_type} onChange={e => updateField(setGraphInput, "node_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded">
                    <option value="concept">Concept</option>
                    <option value="engine">Engine</option>
                    <option value="formula">Formula</option>
                    <option value="material">Material</option>
                    <option value="process">Process</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Max Depth</label>
                  <input type="number" value={graphInput.max_depth} onChange={e => updateField(setGraphInput, "max_depth", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" min={1} max={10} />
                </div>
                <Button onClick={() => graph.execute(graphInput)} disabled={graph.loading} className="w-full mt-2">
                  {graph.loading ? <><Spinner size="sm" /> Querying...</> : "Query Graph"}
                </Button>
                {graph.error && <p className="mt-2 text-xs text-red-600">{graph.error}</p>}
              </div>
            </TabPanel>

            <TabPanel value="federated">
              <div className="space-y-2 mt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Model Type</label>
                  <input type="text" value={federatedInput.model_type} onChange={e => updateField(setFederatedInput, "model_type", e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" placeholder="e.g. tool_life, surface_finish" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Source Count</label>
                  <input type="number" value={federatedInput.source_count} onChange={e => updateField(setFederatedInput, "source_count", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" min={1} max={20} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Privacy Budget (epsilon)</label>
                  <input type="number" value={federatedInput.privacy_budget} onChange={e => updateField(setFederatedInput, "privacy_budget", +e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded" step={0.1} min={0.1} />
                </div>
                <Button onClick={() => federated.execute(federatedInput)} disabled={federated.loading} className="w-full mt-2">
                  {federated.loading ? <><Spinner size="sm" /> Training...</> : "Run Federated Learning"}
                </Button>
                {federated.error && <p className="mt-2 text-xs text-red-600">{federated.error}</p>}
              </div>
            </TabPanel>
          </Tabs>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {apprentice.data ? (
          <Card>
            <h3 className="font-bold mb-3">Apprentice Lesson</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="blue">{(apprentice.data as { topic?: string }).topic}</Badge>
              <Badge color="green">{(apprentice.data as { difficulty?: string }).difficulty}</Badge>
              <Badge color="slate">{(apprentice.data as { estimated_time_min?: number }).estimated_time_min} min</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(apprentice.data, null, 2)}</pre>
          </Card>
        ) : genome.data ? (
          <Card>
            <h3 className="font-bold mb-3">Manufacturing Genome Fingerprint</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="blue">{(genome.data as { material?: string }).material}</Badge>
              <Badge color="green">{(genome.data as { operation?: string }).operation}</Badge>
              {(genome.data as { similarity_score?: number }).similarity_score != null && (
                <Badge color="yellow">Similarity: {((genome.data as { similarity_score?: number }).similarity_score! * 100).toFixed(1)}%</Badge>
              )}
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(genome.data, null, 2)}</pre>
          </Card>
        ) : graph.data ? (
          <Card>
            <h3 className="font-bold mb-3">Knowledge Graph Results</h3>
            <Badge color="blue">{Array.isArray(graph.data) ? (graph.data as unknown[]).length : 0} nodes</Badge>
            <pre className="text-xs bg-slate-50 rounded p-3 mt-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(graph.data, null, 2)}</pre>
          </Card>
        ) : federated.data ? (
          <Card>
            <h3 className="font-bold mb-3">Federated Learning Result</h3>
            <div className="flex gap-2 mb-3">
              <Badge color="green">Accuracy: {((federated.data as { accuracy?: number }).accuracy ?? 0 * 100).toFixed(1)}%</Badge>
              <Badge color="blue">{(federated.data as { sample_count?: number }).sample_count} samples</Badge>
            </div>
            <pre className="text-xs bg-slate-50 rounded p-3 overflow-auto max-h-96 whitespace-pre-wrap">{JSON.stringify(federated.data, null, 2)}</pre>
          </Card>
        ) : (
          <Card>
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">Knowledge Extension Hub</p>
              <p className="text-sm">Interactive apprentice lessons, manufacturing genome analysis, knowledge graph exploration, and federated learning across distributed sources.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
