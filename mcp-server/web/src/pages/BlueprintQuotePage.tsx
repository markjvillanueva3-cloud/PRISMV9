import { useMemo, useRef, useState } from 'react';
import { ApiError, blueprintToQuote, blueprintRedact } from '../api/client';
import { ErrorState, LoadingState } from '../components/LoadingState';
import { GatedError } from '../components/entitlement';
import type { BlueprintQuoteResult } from '../api/types';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';

export function BlueprintQuotePage() {
  const [result, setResult] = useState<BlueprintQuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateError, setGateError] = useState<unknown>(null);
  const [form, setForm] = useState({
    material: '6061-T6',
    quantity: '25',
    features: 'pocket, holes, chamfer',
    tolerance_mm: '0.05',
    surface_finish_um: '1.6',
    part_length_mm: '150',
    part_width_mm: '80',
    part_height_mm: '30',
  });

  const featureCount = useMemo(
    () => form.features.split(',').map((feature) => feature.trim()).filter(Boolean).length,
    [form.features],
  );
  const partEnvelope = `${Number(form.part_length_mm || 0).toFixed(0)} × ${Number(form.part_width_mm || 0).toFixed(0)} × ${Number(form.part_height_mm || 0).toFixed(0)} mm`;

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  // === CAD/print drop-box + auto-redaction (U-3VIEW-REDACT-WIRE) ===
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [redacting, setRedacting] = useState(false);
  const [redactError, setRedactError] = useState<string | null>(null);
  // Redacted preview + summary (mirrors the operating-system intake redaction contract).
  const [redacted, setRedacted] = useState<{
    text: string;
    replacementCount: number;
    note: string;
  } | null>(null);

  async function ingestPrintFile(file: File) {
    setRedactError(null);
    setUploadName(file.name);
    // Only text-extractable inputs are auto-redacted client-side. Binary CAD (STEP/
    // DXF) carries no customer-identity text layer the way a scanned print does; a
    // full OCR path is the xray pipeline, out of scope for this drop-box.
    const isTextish = /\.(txt|dxf|nc|csv|json|md)$/i.test(file.name) || file.type.startsWith('text/');
    if (!isTextish) {
      setRedacted(null);
      setRedactError(
        `${file.name} stored. Auto-redaction runs on text-extractable prints (.txt/.dxf/.nc) or scanned-print OCR; ` +
          `binary CAD has no title-block text layer to redact here.`,
      );
      return;
    }
    setRedacting(true);
    try {
      const raw = await file.text();
      // aggressive=true: opt into the 118-name customer list for a print intake (a
      // false negative here leaks a JM customer identity -- privacy-critical).
      const response = await blueprintRedact({ text: raw, aggressive: true, auditCleartext: false });
      // blueprint_redact returns { data: { text: { text, redactions[] } } } -- redactText
      // yields a RedactTextResult, so the redacted string is data.text.text and the
      // applied-mask count is data.text.redactions.length (authoritative, not a token scan).
      const textResult = (response.result as unknown as {
        data?: { text?: { text?: string; redactions?: unknown[] } };
      })?.data?.text;
      const out = textResult?.text ?? '';
      const replacementCount = Array.isArray(textResult?.redactions) ? textResult.redactions.length : 0;
      setRedacted({
        text: out,
        replacementCount,
        note:
          replacementCount > 0
            ? `Customer identity and title-block details were auto-redacted (${replacementCount} field(s)) before this print was stored.`
            : 'No customer-identity fields were detected in this print.',
      });
    } catch (issue) {
      setRedacted(null);
      setRedactError(issue instanceof ApiError ? issue.message : 'Redaction failed -- print not stored.');
    } finally {
      setRedacting(false);
    }
  }

  async function handleQuote() {
    setLoading(true);
    setError(null);
    try {
      const response = await blueprintToQuote({
        material: form.material,
        quantity: parseInt(form.quantity, 10) || 25,
        features: form.features
          .split(',')
          .map((feature) => feature.trim())
          .filter(Boolean),
        tolerance_mm: parseFloat(form.tolerance_mm) || 0.05,
        surface_finish_um: parseFloat(form.surface_finish_um) || 1.6,
        part_length_mm: parseFloat(form.part_length_mm) || 150,
        part_width_mm: parseFloat(form.part_width_mm) || 80,
        part_height_mm: parseFloat(form.part_height_mm) || 30,
      });
      setResult((response.result as unknown as BlueprintQuoteResult) ?? null);
    } catch (issue) {
      setGateError(issue);
      setError(issue instanceof ApiError ? issue.message : 'Failed to generate quote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Drawing to commercial review"
        title="Blueprint to Quote"
        description="Translate drawing intent into a structured quote desk with part envelope, operation cost, and lead-time posture all visible in one place."
        metrics={
          <>
            <SummaryTile label="Part envelope" value={partEnvelope} hint={`${form.material} · qty ${form.quantity}`} />
            <SummaryTile
              label="Feature load"
              value={String(featureCount)}
              hint="Named feature groups currently driving the operation plan."
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
            <SummaryTile
              label="Quote posture"
              value={result ? 'Prepared' : 'Standby'}
              hint="Result desk stays empty until the drawing assumptions are staged."
              accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Use this as the first quoting pass after blueprint analysis: confirm envelope, feature stack, and finish demand before handing the part off to a fuller routing review.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
            </div>
          </div>
        }
      />

      {loading ? <LoadingState label="Analyzing blueprint..." /> : null}
      {error ? <GatedError error={gateError} feature='quoting' fallback={<ErrorState message={error} onRetry={handleQuote} />} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-6">
          <PanelCard
            title="Drop a print or CAD file"
            subtitle="Drag a drawing, print, or CAD file here. Customer identity and title-block details are auto-redacted before the file is stored or quoted."
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragActive(false);
                const file = event.dataTransfer.files?.[0];
                if (file) void ingestPrintFile(file);
              }}
              className={`flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed px-6 py-8 text-center transition-colors ${
                dragActive
                  ? 'border-cyan-300/60 bg-cyan-300/[0.08]'
                  : 'border-white/15 bg-black/15 hover:border-white/25'
              }`}
            >
              <div className="text-sm font-semibold text-slate-100">
                {uploadName ? uploadName : 'Drop a print / CAD file, or click to browse'}
              </div>
              <div className="text-xs leading-5 text-slate-400">
                Text prints (.txt/.dxf/.nc) are auto-redacted on upload. Scanned-print OCR runs server-side.
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.dxf,.nc,.csv,.json,.md,.pdf,.step,.stp,.iges,.igs,image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void ingestPrintFile(file);
                }}
              />
            </div>

            {redacting ? (
              <div className="mt-3 text-sm text-cyan-200">Redacting customer identity...</div>
            ) : null}

            {redacted ? (
              <div className="mt-3 rounded-[18px] border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                    Redacted
                  </span>
                  <span className="font-semibold">{redacted.replacementCount} field(s) masked</span>
                </div>
                <div className="mt-1 opacity-90">{redacted.note}</div>
                {redacted.text ? (
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-[12px] border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs text-slate-200">
                    {redacted.text.slice(0, 1200)}
                    {redacted.text.length > 1200 ? '\n...' : ''}
                  </pre>
                ) : null}
              </div>
            ) : null}

            {redactError ? (
              <div className="mt-3 rounded-[18px] border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">
                {redactError}
              </div>
            ) : null}
          </PanelCard>

          <PanelCard title="Part specifications" subtitle="Keep the quote basis readable so engineering and commercial teams can challenge the same assumptions.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Material">
                <Input value={form.material} onChange={(event) => updateField('material', event.target.value)} />
              </Field>
              <Field label="Quantity">
                <Input type="number" value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
              </Field>
              <Field label="Tolerance (mm)">
                <Input type="number" value={form.tolerance_mm} onChange={(event) => updateField('tolerance_mm', event.target.value)} />
              </Field>
              <Field label="Surface finish (µm)">
                <Input type="number" value={form.surface_finish_um} onChange={(event) => updateField('surface_finish_um', event.target.value)} />
              </Field>
              <Field label="Length (mm)">
                <Input type="number" value={form.part_length_mm} onChange={(event) => updateField('part_length_mm', event.target.value)} />
              </Field>
              <Field label="Width (mm)">
                <Input type="number" value={form.part_width_mm} onChange={(event) => updateField('part_width_mm', event.target.value)} />
              </Field>
              <Field label="Height (mm)">
                <Input type="number" value={form.part_height_mm} onChange={(event) => updateField('part_height_mm', event.target.value)} />
              </Field>
              <Field label="Features">
                <Input
                  value={form.features}
                  onChange={(event) => updateField('features', event.target.value)}
                  placeholder="pocket, holes, chamfer"
                />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton onClick={handleQuote}>Generate Quote</ActionButton>
            </div>
          </PanelCard>

          {result ? (
            <>
              <PanelCard title="Commercial summary" subtitle="Keep headline numbers visible before going deeper into the operation breakdown.">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Material" value={result.material} hint="Quoted material family for this run." />
                  <SummaryTile
                    label="Unit price"
                    value={`$${result.unit_price.toFixed(2)}`}
                    hint="Commercial unit value from the staged route."
                    accent="from-emerald-400/22 via-emerald-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Total cost"
                    value={`$${result.total_cost.toFixed(2)}`}
                    hint="Aggregate cost across the staged operation plan."
                    accent="from-sky-400/22 via-sky-300/8 to-transparent"
                  />
                  <SummaryTile
                    label="Lead time"
                    value={`${result.lead_time_days} days`}
                    hint="Current promise posture for the part."
                    accent="from-amber-300/22 via-amber-200/8 to-transparent"
                  />
                </div>
              </PanelCard>

              <PanelCard title="Operation ladder" subtitle="Use the operation stack to see what is actually driving cycle time and cost.">
                {result.operations.length > 0 ? (
                  <div className="space-y-3">
                    {result.operations.map((operation, index) => (
                      <div key={`${operation.type}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold capitalize text-slate-50">{operation.type}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">Sequence {index + 1}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-mono text-slate-100">${operation.cost.toFixed(2)}</div>
                            <div className="mt-1 text-xs text-slate-500">{operation.time_min.toFixed(1)} min</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No operations are currently staged for this drawing.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Quote desk brief" subtitle="Keep the intended use of this page clear while the inputs and route are still moving.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">When to use this page</div>
                <div className="mt-2 leading-6 text-slate-400">
                  Use this for structured blueprint-led quoting before the work splits into deeper process-specific desks like sheet metal, additive, or injection tooling.
                </div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Review cues</div>
                <ul className="mt-3 space-y-2">
                  <li>Keep feature naming specific enough that the operation plan tells a real manufacturing story.</li>
                  <li>Use tolerance and finish to challenge whether the default route is still commercial enough.</li>
                  <li>If the part becomes highly specialized, hand off into the process-specific quote workspace next.</li>
                </ul>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
