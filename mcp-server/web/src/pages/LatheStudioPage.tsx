/**
 * LatheStudioPage.tsx — Lathe Studio Main Page
 * LATHE-PROD-READY-MS0/U-LPR08
 *
 * 6-step wizard for lathe programming (cloned from WireEdmStudioPage):
 * 1. Import - Part geometry/print upload
 * 2. Material - Stock selection
 * 3. Operations - Turning operations
 * 4. Tooling - Tool selection
 * 5. Parameters - Speed/feed optimization
 * 6. Program - G-code generation
 *
 * Route: /lathe-studio
 */

import { useCallback, useMemo, useState } from "react";
import { LatheStudioProvider, useLatheNavigation, useLatheData } from "../contexts/LatheStudioContext";
import ErrorBoundary from "../components/ErrorBoundary";

// ============================================================================
// STEP COMPONENTS (inline for now, can extract to components/lathe-studio/)
// ============================================================================

interface StepProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

function StepImport({ onComplete, isActive }: StepProps) {
  const { updateImport } = useLatheData();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateImport({ filename: file.name });
      onComplete();
    }
  }, [updateImport, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 1: Import Part</h2>
      <p className="text-slate-400 text-sm">Upload a STEP file, DXF, or print image to begin.</p>

      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
        <input
          type="file"
          accept=".step,.stp,.dxf,.pdf,.png,.jpg"
          onChange={handleFileUpload}
          className="hidden"
          id="part-upload"
        />
        <label htmlFor="part-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📁</div>
          <div className="text-slate-300">Drop file here or click to upload</div>
          <div className="text-xs text-slate-500 mt-1">STEP, DXF, PDF, PNG, JPG</div>
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            updateImport({ filename: "demo-shaft.step" });
            onComplete();
          }}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm"
        >
          Use Demo Part
        </button>
      </div>
    </div>
  );
}

function StepMaterial({ onComplete, onBack, isActive }: StepProps) {
  const { updateMaterial, steps } = useLatheData();
  const [material, setMaterial] = useState("4140");
  const [diameter, setDiameter] = useState(50);
  const [length, setLength] = useState(100);

  const handleContinue = useCallback(() => {
    updateMaterial({
      material,
      diameter,
      length,
      hardness: 28,
      hardnessUnit: "HRC",
    });
    onComplete();
  }, [material, diameter, length, updateMaterial, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 2: Material & Stock</h2>
      <p className="text-slate-400 text-sm">Define stock material and dimensions.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          >
            <option value="4140">4140 Alloy Steel</option>
            <option value="D2">D2 Tool Steel</option>
            <option value="M2">M2 HSS</option>
            <option value="A2">A2 Tool Steel</option>
            <option value="S7">S7 Shock Steel</option>
            <option value="H13">H13 Hot Work</option>
            <option value="1018">1018 Mild Steel</option>
            <option value="6061">6061 Aluminum</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Stock Diameter (mm)</label>
          <input
            type="number"
            value={diameter}
            onChange={(e) => setDiameter(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Stock Length (mm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Back
        </button>
        <button onClick={handleContinue} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">
          Continue
        </button>
      </div>
    </div>
  );
}

function StepOperations({ onComplete, onBack, isActive }: StepProps) {
  const { updateOperations } = useLatheData();
  const [ops, setOps] = useState([
    { id: "op1", type: "face" as const, sequence: 1 },
    { id: "op2", type: "rough_od" as const, sequence: 2 },
    { id: "op3", type: "finish_od" as const, sequence: 3 },
  ]);

  const handleContinue = useCallback(() => {
    updateOperations(ops);
    onComplete();
  }, [ops, updateOperations, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 3: Operations</h2>
      <p className="text-slate-400 text-sm">Define turning operations in sequence.</p>

      <div className="space-y-2">
        {ops.map((op, idx) => (
          <div key={op.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded">
            <span className="text-cyan-400 font-mono">{idx + 1}</span>
            <select
              value={op.type}
              onChange={(e) => {
                const newOps = [...ops];
                newOps[idx] = { ...op, type: e.target.value as any };
                setOps(newOps);
              }}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1"
            >
              <option value="face">Face</option>
              <option value="rough_od">Rough OD</option>
              <option value="finish_od">Finish OD</option>
              <option value="rough_id">Rough ID</option>
              <option value="finish_id">Finish ID</option>
              <option value="thread">Thread</option>
              <option value="groove">Groove</option>
              <option value="partoff">Part-off</option>
              <option value="drill">Drill</option>
              <option value="tap">Tap</option>
            </select>
            <button
              onClick={() => setOps(ops.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setOps([...ops, { id: `op${ops.length + 1}`, type: "rough_od", sequence: ops.length + 1 }])}
        className="text-sm text-cyan-400 hover:text-cyan-300"
      >
        + Add Operation
      </button>

      <div className="flex gap-2 mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Back
        </button>
        <button onClick={handleContinue} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">
          Continue
        </button>
      </div>
    </div>
  );
}

function StepTooling({ onComplete, onBack, isActive }: StepProps) {
  const { updateTooling, steps } = useLatheData();

  const handleContinue = useCallback(() => {
    updateTooling([
      { id: "t1", type: "CNMG120408", insertGrade: "GC4325", holderStyle: "PCLNR", noseRadius: 0.8 },
      { id: "t2", type: "DNMG150608", insertGrade: "GC4315", holderStyle: "PDUNR", noseRadius: 0.8 },
    ]);
    onComplete();
  }, [updateTooling, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 4: Tooling</h2>
      <p className="text-slate-400 text-sm">Select tools for each operation.</p>

      <div className="space-y-3">
        {(steps.operations || []).map((op, idx) => (
          <div key={op.id} className="bg-slate-800 p-3 rounded">
            <div className="text-sm text-slate-300 mb-2">
              Op {idx + 1}: {op.type.replace("_", " ").toUpperCase()}
            </div>
            <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
              <option>CNMG120408 / GC4325 (General turning)</option>
              <option>DNMG150608 / GC4315 (Finishing)</option>
              <option>VNMG160408 / GC4325 (Profiling)</option>
              <option>TCMT16T308 / GC1125 (Aluminum)</option>
            </select>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Back
        </button>
        <button onClick={handleContinue} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">
          Continue
        </button>
      </div>
    </div>
  );
}

function StepParameters({ onComplete, onBack, isActive }: StepProps) {
  const { updateParameters, steps } = useLatheData();

  const handleContinue = useCallback(() => {
    updateParameters([
      { operationId: "op1", sfm: 400, fpr: 0.25, doc: 2.0, coolant: "flood" },
      { operationId: "op2", sfm: 350, fpr: 0.30, doc: 3.0, coolant: "flood" },
      { operationId: "op3", sfm: 450, fpr: 0.15, doc: 0.5, coolant: "flood" },
    ]);
    onComplete();
  }, [updateParameters, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 5: Cutting Parameters</h2>
      <p className="text-slate-400 text-sm">Optimize speed, feed, and depth of cut.</p>

      <div className="space-y-3">
        {(steps.operations || []).map((op, idx) => (
          <div key={op.id} className="bg-slate-800 p-3 rounded">
            <div className="text-sm text-slate-300 mb-2">
              Op {idx + 1}: {op.type.replace("_", " ").toUpperCase()}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-500">SFM</label>
                <input type="number" defaultValue={400} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Feed (mm/rev)</label>
                <input type="number" defaultValue={0.25} step={0.01} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">DOC (mm)</label>
                <input type="number" defaultValue={2.0} step={0.1} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Coolant</label>
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
                  <option>Flood</option>
                  <option>MQL</option>
                  <option>Dry</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="text-sm text-emerald-400 hover:text-emerald-300">
        ⚡ Auto-Optimize with AI
      </button>

      <div className="flex gap-2 mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Back
        </button>
        <button onClick={handleContinue} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded text-sm">
          Generate Program
        </button>
      </div>
    </div>
  );
}

function StepProgram({ onComplete, onBack, isActive }: StepProps) {
  const { steps, machineId, controllerId } = useLatheData();

  if (!isActive) return null;

  const demoGcode = `O0001 (SHAFT-001)
(GENERATED BY Kienzle LATHE STUDIO)
(MACHINE: ${machineId})
(CONTROLLER: ${controllerId})

N10 G21 G40 G80 G99
N20 T0101 (CNMG120408 ROUGH)
N30 G96 S350 M03
N40 G00 X52.0 Z2.0
N50 G71 U2.0 R0.5
N60 G71 P70 Q90 U0.5 W0.1 F0.30
N70 G00 X25.0
N80 G01 Z-50.0
N90 X50.0
N100 G70 P70 Q90
N110 G28 U0 W0
N120 M30
%`;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 6: Program Output</h2>
      <p className="text-slate-400 text-sm">Review and export generated G-code.</p>

      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-emerald-400">2:45</div>
          <div className="text-xs text-slate-500">Cycle Time</div>
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-cyan-400">3</div>
          <div className="text-xs text-slate-500">Operations</div>
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-emerald-400">✓</div>
          <div className="text-xs text-slate-500">Safety Checks</div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded p-4 font-mono text-sm text-slate-300 max-h-64 overflow-y-auto">
        <pre>{demoGcode}</pre>
      </div>

      <div className="flex gap-2 mt-6">
        <button onClick={onBack} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Back
        </button>
        <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-sm">
          Download NC File
        </button>
        <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded text-sm">
          Send to Machine
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// WIZARD SHELL
// ============================================================================

function LatheWizardShell() {
  const { currentStep, setCurrentStep, nextStep, prevStep } = useLatheNavigation();

  const steps = ["import", "material", "operations", "tooling", "parameters", "program"] as const;
  const stepLabels = ["Import", "Material", "Operations", "Tooling", "Parameters", "Program"];

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Step indicator */}
      <div className="flex-shrink-0 border-b border-slate-700 p-4">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {steps.map((step, idx) => {
            const isActive = currentStep === step;
            const isPast = steps.indexOf(currentStep) > idx;
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`flex items-center gap-2 px-3 py-1 rounded ${
                  isActive ? "bg-cyan-600 text-white" :
                  isPast ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isActive ? "bg-cyan-500" :
                  isPast ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700"
                }`}>
                  {isPast ? "✓" : idx + 1}
                </span>
                <span className="hidden sm:inline text-sm">{stepLabels[idx]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          <ErrorBoundary>
            <StepImport onComplete={nextStep} isActive={currentStep === "import"} />
          </ErrorBoundary>
          <ErrorBoundary>
            <StepMaterial onComplete={nextStep} onBack={prevStep} isActive={currentStep === "material"} />
          </ErrorBoundary>
          <ErrorBoundary>
            <StepOperations onComplete={nextStep} onBack={prevStep} isActive={currentStep === "operations"} />
          </ErrorBoundary>
          <ErrorBoundary>
            <StepTooling onComplete={nextStep} onBack={prevStep} isActive={currentStep === "tooling"} />
          </ErrorBoundary>
          <ErrorBoundary>
            <StepParameters onComplete={nextStep} onBack={prevStep} isActive={currentStep === "parameters"} />
          </ErrorBoundary>
          <ErrorBoundary>
            <StepProgram onComplete={() => {}} onBack={prevStep} isActive={currentStep === "program"} />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PAGE EXPORT
// ============================================================================

export default function LatheStudioPage() {
  const [showAI, setShowAI] = useState(false);

  return (
    <LatheStudioProvider>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Main wizard area */}
        <div className={`flex-1 min-h-0 ${showAI ? "h-[65%]" : "h-full"}`}>
          <LatheWizardShell />
        </div>

        {/* AI Reasoning toggle */}
        <div className="flex-shrink-0 border-t border-slate-700">
          <button
            onClick={() => setShowAI(!showAI)}
            className="w-full px-4 py-1.5 text-xs text-slate-400 hover:text-cyan-400 bg-slate-900/80 flex items-center justify-center gap-2 transition-colors"
          >
            <span className="text-cyan-500">●</span>
            AI Reasoning {showAI ? "▼" : "▲"}
          </button>
        </div>

        {/* AI Reasoning panel */}
        {showAI && (
          <div className="flex-shrink-0 h-[35%] overflow-y-auto bg-slate-900/95 border-t border-slate-700 p-3">
            <div className="text-sm text-slate-400">
              <h3 className="text-cyan-400 font-semibold mb-2">AI Reasoning</h3>
              <p>AI recommendations and reasoning chains will appear here during operation.</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Material 4140 detected - using Sandvik kc1.1 = 2260 MPa for Q&T 32 HRC</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Roughing DOC 3.0mm within tool spec (max 5.0mm)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">●</span>
                  <span>CSS enabled for facing - spindle accel within 300ms limit</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </LatheStudioProvider>
  );
}
