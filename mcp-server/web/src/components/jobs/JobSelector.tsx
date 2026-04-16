/**
 * EMP-MS0 U-CLK3: Job Selector
 * Barcode scan input, process type auto-select, machine dropdown.
 * Touch-friendly for tablet kiosk use.
 */
import { useEffect, useRef, useState } from 'react';
import { jobTimeStart } from '../../api/client';
import type { ProcessType } from '../../api/types';
import { ActionButton, Field, Input, Select } from '../workspace/WorkspacePrimitives';

interface JobSelectorProps {
  employeeId: string;
  clockedIn: boolean;
  onJobStarted?: () => void;
}

const PROCESS_TYPES: { value: ProcessType; label: string }[] = [
  { value: 'setup', label: 'Setup' },
  { value: 'production_run', label: 'Production Run' },
  { value: 'first_article', label: 'First Article' },
  { value: 'rework', label: 'Rework' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'deburring', label: 'Deburring' },
  { value: 'secondary_ops', label: 'Secondary Ops' },
  { value: 'programming', label: 'Programming' },
  { value: 'material_handling', label: 'Material Handling' },
];

export function JobSelector({ employeeId, clockedIn, onJobStarted }: JobSelectorProps) {
  const [jobId, setJobId] = useState('');
  const [operation, setOperation] = useState('');
  const [processType, setProcessType] = useState<ProcessType>('production_run');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const scannerRef = useRef<HTMLInputElement>(null);

  // Auto-focus barcode scanner input
  useEffect(() => {
    if (clockedIn) {
      scannerRef.current?.focus();
    }
  }, [clockedIn]);

  // Barcode scanner emulates keyboard — detect rapid input
  const handleScannerInput = (value: string) => {
    // Barcode scanners typically send 6+ chars rapidly
    if (value.length >= 4) {
      setJobId(value);
      if (scannerRef.current) scannerRef.current.value = '';
    }
  };

  const handleStartJob = async () => {
    if (!jobId.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await jobTimeStart({
        employee_id: employeeId,
        job_id: jobId.trim(),
        operation: operation || undefined,
        process_type: processType,
      });
      setSuccess(`Started ${jobId}`);
      setJobId('');
      setOperation('');
      onJobStarted?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.message ?? 'Failed to start job');
    } finally {
      setLoading(false);
    }
  };

  if (!clockedIn) {
    return (
      <div className="rounded-[22px] border border-white/8 bg-white/[0.02] p-5 text-sm text-slate-400">
        Clock in to start jobs.
      </div>
    );
  }

  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5">
      {/* Hidden barcode scanner input */}
      <input
        ref={scannerRef}
        style={{ position: 'absolute', left: -9999, opacity: 0 }}
        onChange={(e) => handleScannerInput(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
      />

      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Start New Job</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Job ID (or scan barcode)">
          <Input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="JOB-4821"
            style={{ height: 56 }}
          />
        </Field>
        <Field label="Operation (optional)">
          <Input
            type="text"
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            placeholder="Op 20"
            style={{ height: 56 }}
          />
        </Field>
        <Field label="Process type">
          <Select
            value={processType}
            onChange={(e) => setProcessType(e.target.value as ProcessType)}
            style={{ height: 56 }}
          >
            {PROCESS_TYPES.map((pt) => (
              <option key={pt.value} value={pt.value}>{pt.label}</option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <ActionButton
            onClick={() => void handleStartJob()}
            disabled={loading || !jobId.trim()}
            tone="emerald"
            className="w-full"
          >
            {loading ? 'Starting...' : 'Start Job'}
          </ActionButton>
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <div className="mt-3 text-xs text-slate-500">
        Scan a barcode or type a job ID to start tracking time.
      </div>
    </div>
  );
}
