/**
 * LathePrintToProgramPage — Print-to-Program UI
 *
 * U-LTH45: Drag-and-drop PDF → G-code program workflow
 *
 * Pipeline stages:
 * 1. Upload blueprint (PDF/image)
 * 2. Extract dimensions + GD&T
 * 3. Recognize turning features
 * 4. Plan toolpaths
 * 5. Generate G-code
 * 6. Verify program
 * 7. Generate setup sheet
 */

import { useCallback, useMemo, useState } from 'react';
import { ApiError } from '../api/client';
import { GatedError } from '../components/entitlement';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  Select,
  StatusPill,
} from '../components/workspace/WorkspacePrimitives';

type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'ingesting'
  | 'recognizing'
  | 'planning'
  | 'generating'
  | 'verifying'
  | 'complete'
  | 'error';

type ControllerType = 'okuma_osp' | 'fanuc' | 'generic_iso';

interface PipelineResult {
  intake_id?: string;
  recognition_id?: string;
  plan_id?: string;
  program_id?: string;
  gcode?: string;
  verification?: {
    passed: boolean;
    score: number;
    error_count: number;
    warning_count: number;
  };
  setup_sheet?: {
    formatted_text: string;
    tool_list: Array<{ tool_number: number; description: string }>;
  };
  cycle_time_sec?: number;
  line_count?: number;
}

export function LathePrintToProgramPage() {
  // Form state
  const [programNumber, setProgramNumber] = useState('1001');
  const [programName, setProgramName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [controller, setController] = useState<ControllerType>('okuma_osp');
  const [machineId, setMachineId] = useState('');

  // File state
  const [fileName, setFileName] = useState('');
  const [fileData, setFileData] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Pipeline state
  const [stage, setStage] = useState<PipelineStage>('idle');
  const [, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);

  // File drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (!file.name.match(/\.(pdf|png|jpg|jpeg)$/i)) {
      setError('Please upload a PDF or image file');
      return;
    }

    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setFileData(base64);

      // Auto-fill program name from filename
      if (!programName) {
        const name = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '').toUpperCase();
        setProgramName(name.substring(0, 20));
      }
    };
    reader.readAsDataURL(file);
  }, [programName]);

  // Run full pipeline
  const runPipeline = useCallback(async () => {
    setGateError(null);
    if (!fileData) {
      setError('Please upload a blueprint first');
      return;
    }

    setError(null);
    setResult(null);
    setStage('uploading');
    setProgress(0);

    try {
      // Call lathe_print_full action via API
      const response = await fetch('/api/prism', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'lathe_print_full',
          params: {
            blueprint: {
              source_type: fileName.endsWith('.pdf') ? 'pdf' : 'image',
              image_base64: fileData,
              part_type: 'turning',
              part_number: partNumber || undefined,
              customer: customer || undefined,
            },
            program_number: parseInt(programNumber, 10),
            program_name: programName || 'LATHE PART',
            controller,
            machine_id: machineId || undefined,
            include_verification: true,
            include_setup_sheet: true,
          },
        }),
      });

      if (!response.ok) {
        // Throw an ApiError (not a plain Error) carrying the HTTP status so a 403
        // tier-gate is detectable by GatedError -> isEntitlementError (which requires
        // an ApiError instance). Otherwise the gate would be dormant forever here.
        throw new ApiError(response.status, `API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Pipeline failed');
      }

      setResult(data.data);
      setStage('complete');
      setProgress(100);
    } catch (err) {
      setGateError(err);
      setError(err instanceof Error ? err.message : 'Pipeline failed');
      setStage('error');
    }
  }, [fileData, fileName, programNumber, programName, partNumber, customer, controller, machineId]);

  // Download G-code
  const downloadGcode = useCallback(() => {
    if (!result?.gcode) return;

    const blob = new Blob([result.gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `O${programNumber}.nc`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, programNumber]);

  // Download setup sheet
  const downloadSetupSheet = useCallback(() => {
    if (!result?.setup_sheet?.formatted_text) return;

    const blob = new Blob([result.setup_sheet.formatted_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `O${programNumber}_setup.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, programNumber]);

  // Stage display
  const stageLabel = useMemo(() => {
    switch (stage) {
      case 'idle': return 'Ready';
      case 'uploading': return 'Uploading...';
      case 'ingesting': return 'Extracting dimensions...';
      case 'recognizing': return 'Recognizing features...';
      case 'planning': return 'Planning toolpaths...';
      case 'generating': return 'Generating G-code...';
      case 'verifying': return 'Verifying program...';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      default: return stage;
    }
  }, [stage]);

  return (
    <div className="p-4">
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Left panel: Upload + Config */}
        <PanelCard title="Blueprint Input">
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            style={{
              border: `2px dashed ${isDragging ? '#4CAF50' : '#666'}`,
              borderRadius: 8,
              padding: '2rem',
              textAlign: 'center',
              marginBottom: '1rem',
              backgroundColor: isDragging ? 'rgba(76, 175, 80, 0.1)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {fileName ? (
              <div>
                <strong>{fileName}</strong>
                <br />
                <small style={{ color: '#888' }}>Drop a new file to replace</small>
              </div>
            ) : (
              <div>
                <strong>Drop PDF or Image here</strong>
                <br />
                <small style={{ color: '#888' }}>Blueprint with dimensions</small>
              </div>
            )}
          </div>

          {/* Program config */}
          <Field label="Program Number">
            <Input
              value={programNumber}
              onChange={(e) => setProgramNumber(e.target.value)}
              placeholder="1001"
            />
          </Field>

          <Field label="Program Name">
            <Input
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="SHAFT ASSY"
            />
          </Field>

          <Field label="Part Number">
            <Input
              value={partNumber}
              onChange={(e) => setPartNumber(e.target.value)}
              placeholder="JM-12345"
            />
          </Field>

          <Field label="Customer">
            <Input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="ACME Corp"
            />
          </Field>

          <Field label="Controller">
            <Select
              value={controller}
              onChange={(e) => setController(e.target.value as ControllerType)}
            >
              <option value="okuma_osp">Okuma OSP</option>
              <option value="fanuc">Fanuc</option>
              <option value="generic_iso">Generic ISO</option>
            </Select>
          </Field>

          <Field label="Machine ID">
            <Input
              value={machineId}
              onChange={(e) => setMachineId(e.target.value)}
              placeholder="LTH-01"
            />
          </Field>

          <div style={{ marginTop: '1rem' }}>
            <ActionButton
              onClick={runPipeline}
              disabled={!fileData || stage === 'uploading'}
              className="w-full"
            >
              {stage === 'idle' || stage === 'error' || stage === 'complete'
                ? 'Generate Program'
                : stageLabel}
            </ActionButton>
          </div>

          {error && (
            <GatedError error={gateError} feature='print_to_cnc' fallback={
              <div style={{ marginTop: '1rem', color: '#f44336', fontSize: '0.9rem' }}>
                {error}
              </div>
            } />
          )}
        </PanelCard>

        {/* Right panel: Results */}
        <PanelCard title="Results">
          {/* Status */}
          <div style={{ marginBottom: '1rem' }}>
            <StatusPill
              label={stageLabel}
              tone={
                stage === 'complete' ? 'emerald' :
                stage === 'error' ? 'rose' :
                stage === 'idle' ? 'slate' : 'amber'
              }
            />
          </div>

          {result && (
            <>
              {/* Verification */}
              {result.verification && (
                <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: result.verification.passed ? '#1b5e20' : '#b71c1c', borderRadius: 4 }}>
                  <strong>Verification: </strong>
                  {result.verification.passed ? 'PASSED' : 'FAILED'}
                  {' | Score: '}{result.verification.score}
                  {result.verification.error_count > 0 && ` | ${result.verification.error_count} errors`}
                  {result.verification.warning_count > 0 && ` | ${result.verification.warning_count} warnings`}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {result.line_count && (
                  <div style={{ padding: '0.5rem 1rem', backgroundColor: '#333', borderRadius: 4 }}>
                    <small>Lines</small><br /><strong>{result.line_count}</strong>
                  </div>
                )}
                {result.cycle_time_sec && (
                  <div style={{ padding: '0.5rem 1rem', backgroundColor: '#333', borderRadius: 4 }}>
                    <small>Cycle Time</small><br /><strong>{Math.round(result.cycle_time_sec)}s</strong>
                  </div>
                )}
                {result.setup_sheet?.tool_list && (
                  <div style={{ padding: '0.5rem 1rem', backgroundColor: '#333', borderRadius: 4 }}>
                    <small>Tools</small><br /><strong>{result.setup_sheet.tool_list.length}</strong>
                  </div>
                )}
              </div>

              {/* Tool list */}
              {result.setup_sheet?.tool_list && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Tool List:</strong>
                  <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                    {result.setup_sheet.tool_list.slice(0, 6).map((t) => (
                      <li key={t.tool_number}>T{t.tool_number}: {t.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* G-code preview */}
              {result.gcode && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>G-code Preview:</strong>
                  <pre style={{
                    backgroundColor: '#1a1a1a',
                    padding: '0.5rem',
                    borderRadius: 4,
                    maxHeight: 200,
                    overflow: 'auto',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  }}>
                    {result.gcode.split('\n').slice(0, 30).join('\n')}
                    {result.gcode.split('\n').length > 30 && '\n... (truncated)'}
                  </pre>
                </div>
              )}

              {/* Download buttons */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <ActionButton onClick={downloadGcode} disabled={!result.gcode}>
                  Download G-code
                </ActionButton>
                <ActionButton onClick={downloadSetupSheet} disabled={!result.setup_sheet}>
                  Download Setup Sheet
                </ActionButton>
              </div>
            </>
          )}

          {!result && stage === 'idle' && (
            <div style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
              Upload a blueprint and click "Generate Program" to begin
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

export default LathePrintToProgramPage;
