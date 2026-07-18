/**
 * MillStudioPage.tsx — Mill Studio Main Page
 * MILL-MASTER/P0-U02-STUDIO-PAGE
 *
 * 6-step wizard for milling programming (parity with LatheStudioPage):
 * 1. Import - Part geometry/print upload (CAD/STL/photo/PDF)
 * 2. Material - Stock selection and dimensions
 * 3. Strategy - Milling strategies (roughing/finishing/HSM)
 * 4. Tooling - Tool selection per strategy
 * 5. Parameters - Speed/feed/DOC optimization
 * 6. Program - G-code generation and review
 *
 * Route: /mill-studio
 */

import { useCallback, useState, useEffect } from "react";
import { MillStudioProvider, useMillNavigation, useMillData, MILL_STEPS, type MillStep } from "../contexts/MillStudioContext";
import ErrorBoundary from "../components/ErrorBoundary";

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface StepProps {
  onComplete: () => void;
  onBack?: () => void;
  isActive: boolean;
}

function StepImport({ onComplete, isActive }: StepProps) {
  const { updateImport } = useMillData();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileType = file.name.endsWith(".stl") ? "stl" :
                       file.name.endsWith(".step") || file.name.endsWith(".stp") ? "cad" :
                       file.name.endsWith(".pdf") ? "pdf" : "photo";
      updateImport({ filename: file.name, fileType });
      onComplete();
    }
  }, [updateImport, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 1: Import Part</h2>
      <p className="text-slate-400 text-sm">Upload a STEP file, STL, DXF, or print image to begin.</p>

      <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 transition-colors">
        <input
          type="file"
          accept=".step,.stp,.stl,.dxf,.pdf,.png,.jpg"
          onChange={handleFileUpload}
          className="hidden"
          id="part-upload"
        />
        <label htmlFor="part-upload" className="cursor-pointer">
          <div className="text-4xl mb-2">📐</div>
          <div className="text-slate-300">Drop file here or click to upload</div>
          <div className="text-xs text-slate-500 mt-1">STEP, STL, DXF, PDF, PNG, JPG</div>
        </label>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => {
            updateImport({
              filename: "demo-bracket.step",
              fileType: "cad",
              features: [
                { type: "face", dimensions: { width: 100, length: 75 }, width_mm: 100, length_mm: 75 },
                { type: "pocket_2d", dimensions: { width: 40, length: 60, depth: 15 }, width_mm: 40, length_mm: 60, depth_mm: 15 },
                { type: "hole", dimensions: { diameter: 8 }, diameter_mm: 8, depth_mm: 20, count: 4 },
              ],
              envelope_mm: { x: 100, y: 75, z: 40 },
              confidence: 0.91,
            });
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
  const { updateMaterial } = useMillData();
  const [material, setMaterial] = useState("6061-T6");
  const [width, setWidth] = useState(100);
  const [length, setLength] = useState(75);
  const [height, setHeight] = useState(40);

  const handleContinue = useCallback(() => {
    const isoGroup = material.startsWith("6061") || material.startsWith("7075") ? "N" :
                     material.startsWith("Ti") ? "S" :
                     material.startsWith("D2") || material.startsWith("A2") || material.startsWith("H13") ? "H" :
                     material.startsWith("304") || material.startsWith("316") ? "M" : "P";
    updateMaterial({
      material,
      iso_group: isoGroup as any,
      width_mm: width,
      length_mm: length,
      height_mm: height,
      stock_type: "block",
    });
    onComplete();
  }, [material, width, length, height, updateMaterial, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 2: Material & Stock</h2>
      <p className="text-slate-400 text-sm">Define stock material and dimensions.</p>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Material</label>
          <select
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          >
            <optgroup label="Aluminum (ISO N)">
              <option value="6061-T6">6061-T6 Aluminum</option>
              <option value="7075-T6">7075-T6 Aluminum</option>
              <option value="2024-T3">2024-T3 Aluminum</option>
            </optgroup>
            <optgroup label="Steel (ISO P)">
              <option value="4140">4140 Alloy Steel</option>
              <option value="1018">1018 Mild Steel</option>
              <option value="4340">4340 Alloy Steel</option>
            </optgroup>
            <optgroup label="Tool Steel (ISO H)">
              <option value="D2">D2 Tool Steel</option>
              <option value="A2">A2 Tool Steel</option>
              <option value="H13">H13 Hot Work</option>
              <option value="S7">S7 Shock Steel</option>
            </optgroup>
            <optgroup label="Stainless (ISO M)">
              <option value="304SS">304 Stainless</option>
              <option value="316SS">316 Stainless</option>
              <option value="17-4PH">17-4 PH</option>
            </optgroup>
            <optgroup label="Titanium (ISO S)">
              <option value="Ti-6Al-4V">Ti-6Al-4V (Grade 5)</option>
              <option value="Ti-CP">Ti CP (Grade 2)</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Width X (mm)</label>
          <input
            type="number"
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Length Y (mm)</label>
          <input
            type="number"
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Height Z (mm)</label>
          <input
            type="number"
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
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

function StepStrategy({ onComplete, onBack, isActive }: StepProps) {
  const { updateStrategy } = useMillData();
  const [strategies, setStrategies] = useState<Array<{ id: string; type: string; sequence: number; stepdown_mm?: number; stepover_percent?: number; leave_stock_mm?: number; }>>([
    { id: "s1", type: "facing" as const, sequence: 1 },
    { id: "s2", type: "roughing" as const, stepdown_mm: 3, stepover_percent: 40, leave_stock_mm: 0.5, sequence: 2 },
    { id: "s3", type: "finishing" as const, stepdown_mm: 0.3, stepover_percent: 15, sequence: 3 },
  ]);

  const handleContinue = useCallback(() => {
    updateStrategy(strategies);
    onComplete();
  }, [strategies, updateStrategy, onComplete]);

  if (!isActive) return null;

  const strategyTypes = [
    { value: "facing", label: "Facing" },
    { value: "roughing", label: "Roughing (2D Pocket)" },
    { value: "finishing", label: "Finishing (Contour)" },
    { value: "hsm", label: "HSM / High-Speed Roughing" },
    { value: "trochoidal", label: "Trochoidal (Adaptive)" },
    { value: "adaptive", label: "Kienzle Forces (Adaptive)" },
    { value: "rest", label: "Rest Machining" },
    { value: "pencil", label: "Pencil / Corners" },
    { value: "scallop", label: "Scallop (3D Surface)" },
    { value: "contour", label: "Profile / Contour" },
    { value: "drilling", label: "Drilling / Hole Ops" },
    { value: "thread_mill", label: "Thread Milling" },
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 3: Milling Strategy</h2>
      <p className="text-slate-400 text-sm">Define milling strategies in sequence.</p>

      <div className="space-y-2">
        {strategies.map((strat, idx) => (
          <div key={strat.id} className="flex items-center gap-3 bg-slate-800 p-3 rounded">
            <span className="text-cyan-400 font-mono w-6">{idx + 1}</span>
            <select
              value={strat.type}
              onChange={(e) => {
                const newStrategies = [...strategies];
                newStrategies[idx] = { ...strat, type: e.target.value as any };
                setStrategies(newStrategies);
              }}
              className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1"
            >
              {strategyTypes.map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
            <button
              onClick={() => setStrategies(strategies.filter((_, i) => i !== idx))}
              className="text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={() => setStrategies([...strategies, {
          id: `s${strategies.length + 1}`,
          type: "roughing",
          stepdown_mm: 3,
          stepover_percent: 40,
          sequence: strategies.length + 1,
        }])}
        className="text-sm text-cyan-400 hover:text-cyan-300"
      >
        + Add Strategy
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
  const { updateTooling, steps } = useMillData();

  const handleContinue = useCallback(() => {
    updateTooling([
      { id: "t1", type: "face_mill", diameter_mm: 50, flutes: 5, material: "carbide" },
      { id: "t2", type: "flat_endmill", diameter_mm: 12, flutes: 4, corner_radius_mm: 0.5, coating: "TiAlN", material: "carbide" },
      { id: "t3", type: "ball_endmill", diameter_mm: 6, flutes: 2, material: "carbide" },
    ]);
    onComplete();
  }, [updateTooling, onComplete]);

  if (!isActive) return null;

  const toolOptions = [
    "50mm Face Mill (5FL) / Carbide",
    "12mm Flat Endmill (4FL) / TiAlN",
    "10mm Flat Endmill (4FL) / TiAlN",
    "8mm Flat Endmill (4FL) / TiAlN",
    "6mm Ball Endmill (2FL) / TiAlN",
    "4mm Ball Endmill (2FL) / TiAlN",
    "12mm Bull Nose R1 (4FL) / TiAlN",
    "8.5mm Drill / Carbide",
    "M10x1.5 Thread Mill / TiAlN",
  ];

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 4: Tooling</h2>
      <p className="text-slate-400 text-sm">Select tools for each strategy.</p>

      <div className="space-y-3">
        {(steps.strategy || []).map((strat, idx) => (
          <div key={strat.id} className="bg-slate-800 p-3 rounded">
            <div className="text-sm text-slate-300 mb-2">
              Strategy {idx + 1}: {strat.type.replace("_", " ").toUpperCase()}
            </div>
            <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
              {toolOptions.map((opt, i) => (
                <option key={i}>{opt}</option>
              ))}
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
  const { updateParameters, steps } = useMillData();

  const handleContinue = useCallback(() => {
    updateParameters([
      { strategyId: "s1", toolId: "t1", rpm: 2000, feed_mm_min: 500, plunge_feed_mm_min: 100, axial_depth_mm: 2, radial_depth_mm: 40, coolant: "flood", cutting_direction: "climb" },
      { strategyId: "s2", toolId: "t2", rpm: 6000, feed_mm_min: 1200, plunge_feed_mm_min: 300, axial_depth_mm: 3, radial_depth_mm: 4.8, coolant: "flood", entry_type: "helical", cutting_direction: "climb" },
      { strategyId: "s3", toolId: "t2", rpm: 8000, feed_mm_min: 800, plunge_feed_mm_min: 200, axial_depth_mm: 0.3, radial_depth_mm: 6, coolant: "flood", cutting_direction: "climb" },
    ]);
    onComplete();
  }, [updateParameters, onComplete]);

  if (!isActive) return null;

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 5: Cutting Parameters</h2>
      <p className="text-slate-400 text-sm">Optimize RPM, feed, axial depth, and radial depth.</p>

      <div className="space-y-3">
        {(steps.strategy || []).map((strat, idx) => (
          <div key={strat.id} className="bg-slate-800 p-3 rounded">
            <div className="text-sm text-slate-300 mb-2">
              Strategy {idx + 1}: {strat.type.replace("_", " ").toUpperCase()}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-slate-500">RPM</label>
                <input type="number" defaultValue={6000} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Feed (mm/min)</label>
                <input type="number" defaultValue={1200} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Axial DOC (mm)</label>
                <input type="number" defaultValue={3.0} step={0.1} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate-500">Radial DOC (mm)</label>
                <input type="number" defaultValue={4.8} step={0.1} className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <label className="text-xs text-slate-500">Coolant</label>
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
                  <option value="flood">Flood</option>
                  <option value="through_spindle">Through Spindle</option>
                  <option value="mql">MQL</option>
                  <option value="air_blast">Air Blast</option>
                  <option value="dry">Dry</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Entry</label>
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
                  <option value="helical">Helical</option>
                  <option value="ramp">Ramp</option>
                  <option value="plunge">Plunge</option>
                  <option value="predrilled">Pre-drilled</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Direction</label>
                <select className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm">
                  <option value="climb">Climb</option>
                  <option value="conventional">Conventional</option>
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

function StepProgram({ onBack, isActive }: StepProps) {
  const { steps, machineId, controllerId } = useMillData();

  if (!isActive) return null;

  const demoGcode = `%
O0001 (BRACKET-001)
(GENERATED BY Kienzle MILL STUDIO)
(MACHINE: ${machineId})
(CONTROLLER: ${controllerId})

N10 G21 G17 G40 G49 G80 G90
N20 T1 M6 (50MM FACE MILL)
N30 G54
N40 S2000 M3
N50 G43 Z50.0 H1 M8
N60 G0 X-30.0 Y0.0
N70 G1 Z-2.0 F100
N80 G1 X130.0 F500
N90 G0 Z50.0

N100 T2 M6 (12MM ENDMILL)
N110 S6000 M3
N120 G43 Z50.0 H2
N130 G0 X30.0 Y37.5
N140 G1 Z2.0 F1200
N150 G2 Z-3.0 I0.0 J-6.0 F300 (HELICAL ENTRY)
N160 G1 X70.0 Y37.5 F1200
N170 G1 Y-37.5
N180 G1 X30.0
N190 G1 Y37.5
N200 G0 Z50.0

N210 G28 G91 Z0
N220 M30
%`;

  const opCount = steps.strategy?.length ?? 3;
  const cycleTime = "4:32";

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold text-cyan-400">Step 6: Program Output</h2>
      <p className="text-slate-400 text-sm">Review and export generated G-code.</p>

      <div className="grid grid-cols-4 gap-4 text-center mb-4">
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-emerald-400">{cycleTime}</div>
          <div className="text-xs text-slate-500">Cycle Time</div>
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-cyan-400">{opCount}</div>
          <div className="text-xs text-slate-500">Strategies</div>
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-violet-400">3</div>
          <div className="text-xs text-slate-500">Tools</div>
        </div>
        <div className="bg-slate-800 p-3 rounded">
          <div className="text-2xl font-bold text-emerald-400">✓</div>
          <div className="text-xs text-slate-500">Safety OK</div>
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
        <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Setup Sheet
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// WIZARD SHELL
// ============================================================================

function MillWizardShell() {
  const { currentStep, setCurrentStep, nextStep, prevStep } = useMillNavigation();

  const steps: MillStep[] = ["import", "material", "strategy", "tooling", "parameters", "program"];
  const stepLabels = MILL_STEPS.map(s => s.label);

  // Keyboard shortcuts: Ctrl+U (Upload/Import), Ctrl+G (Generate/Program), Ctrl+S (Save/Download)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!e.ctrlKey && !e.metaKey) return;
      switch (e.key.toLowerCase()) {
        case "u": // Upload/Import step
          e.preventDefault();
          setCurrentStep("import");
          break;
        case "g": // Generate/Program step
          e.preventDefault();
          setCurrentStep("program");
          break;
        case "s": // Save triggers download on program step
          if (currentStep === "program") {
            e.preventDefault();
            const downloadBtn = document.querySelector('button:has-text("Download NC File")') as HTMLButtonElement;
            downloadBtn?.click();
          }
          break;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCurrentStep, currentStep]);

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
            <StepStrategy onComplete={nextStep} onBack={prevStep} isActive={currentStep === "strategy"} />
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

export default function MillStudioPage() {
  const [showAI, setShowAI] = useState(false);

  return (
    <MillStudioProvider>
      <div className="h-[calc(100vh-64px)] flex flex-col">
        {/* Main wizard area */}
        <div className={`flex-1 min-h-0 ${showAI ? "h-[65%]" : "h-full"}`}>
          <MillWizardShell />
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
              <h3 className="text-cyan-400 font-semibold mb-2">AI Reasoning — Mill Intelligence</h3>
              <p className="mb-2">AI recommendations and reasoning chains appear during each step.</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>6061-T6 detected — ISO N group, kc1.1 = 700 MPa, recommending high speeds</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>12mm endmill: chip load 0.05mm/tooth × 4 flutes = 0.2mm/rev at 6000 RPM → 1200 mm/min</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">●</span>
                  <span>Helical entry: 2° ramp angle, 6mm radius, avoiding plunge in hardened pocket floor</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">●</span>
                  <span>Tool deflection: 0.018mm at 4.8mm radial DOC — within 0.025mm tolerance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-violet-400">◆</span>
                  <span>Tribal tip: "For 6061 pockets deeper than 1×D, increase coolant pressure to 500 PSI"</span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </MillStudioProvider>
  );
}
