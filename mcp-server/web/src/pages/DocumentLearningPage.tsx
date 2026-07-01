import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ApiError, docDelete, docExtract, docGet, docList, docUpload } from '../api/client';
import { SurfaceStatusNotice } from '../components/operating-system/SurfaceStatusNotice';
import { ErrorState, LoadingState } from '../components/LoadingState';
import {
  ActionButton,
  Field,
  Input,
  PanelCard,
  SummaryTile,
  TabButton,
  WorkspaceHero,
} from '../components/workspace/WorkspacePrimitives';
import { useOperatingSystem } from '../features/operating-system/OperatingSystemProvider';
import type { InventoryOperationsWorkspace } from '../features/operating-system/contracts';
import { buildCapturePath } from '../utils/captureRoute';

interface DocRecord {
  id: string;
  file_path: string;
  title: string | null;
  format: string;
  status: 'pending' | 'extracting' | 'complete' | 'failed';
  created_at: string;
  error: string | null;
}

interface DocKnowledge {
  id: string;
  title: string;
  entries: Array<{ type: string; content: string; confidence: number; tags?: string[] }>;
}

type Tab = 'registry' | 'extraction' | 'knowledge';

const TAB_CONFIG: Record<Tab, { label: string; detail: string }> = {
  registry: {
    label: 'Registry',
    detail: 'Register manuals, catalogs, and process documents so the extraction queue starts from a clean intake desk.',
  },
  extraction: {
    label: 'Extraction Queue',
    detail: 'Track pending and complete documents like an operations queue instead of a passive file list.',
  },
  knowledge: {
    label: 'Knowledge View',
    detail: 'Read extracted entries with confidence and tags so the learning desk feels curated instead of raw.',
  },
};

function statusTone(status: DocRecord['status']): string {
  if (status === 'complete') return 'bg-emerald-300/16 text-emerald-100';
  if (status === 'extracting') return 'bg-sky-300/16 text-sky-100';
  if (status === 'failed') return 'bg-rose-300/16 text-rose-100';
  return 'bg-amber-300/16 text-amber-100';
}

export function DocumentLearningPage() {
  const location = useLocation();
  const operatingSystem = useOperatingSystem();
  const [tab, setTab] = useState<Tab>('registry');
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [selected, setSelected] = useState<DocKnowledge | null>(null);
  const [inventoryWorkspace, setInventoryWorkspace] = useState<InventoryOperationsWorkspace | null>(null);
  const [docTemplateId, setDocTemplateId] = useState('purchase-order');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPath, setUploadPath] = useState('C:/Kienzle/CATALOGS/my-catalog.pdf');
  const [uploadTitle, setUploadTitle] = useState('');

  const activeTab = TAB_CONFIG[tab];
  const completedDocs = useMemo(() => docs.filter((doc) => doc.status === 'complete').length, [docs]);
  const pendingDocs = useMemo(() => docs.filter((doc) => doc.status === 'pending' || doc.status === 'extracting').length, [docs]);
  const primaryDocument = docs[0] ?? null;
  const selectedTemplate =
    inventoryWorkspace?.documentTemplates.find((template) => template.id === docTemplateId) ??
    inventoryWorkspace?.documentTemplates[0] ??
    null;
  const documentRecordId = selected?.id ?? primaryDocument?.id ?? selectedTemplate?.id ?? '';
  const inventoryHandoffPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set('tab', 'documents');
    params.set('source', 'document-learning');
    if (documentRecordId) {
      params.set('docId', documentRecordId);
    }
    if (docTemplateId) {
      params.set('templateId', docTemplateId);
    }
    return `/inventory?${params.toString()}`;
  }, [docTemplateId, documentRecordId]);
  const messagesHandoffPath = useMemo(() => {
    const params = new URLSearchParams();
    params.set('source', 'document-learning');
    params.set('recordType', 'Document');
    if (documentRecordId) {
      params.set('recordId', documentRecordId);
    }
    params.set(
      'note',
      `Confirm extracted ${selectedTemplate?.label ?? 'document'} details, part numbers, and inventory ownership before the intake gets promoted.`,
    );
    return `/messages?${params.toString()}`;
  }, [documentRecordId, selectedTemplate?.label]);
  const captureHandoffPath = useMemo(
    () =>
      buildCapturePath(location.pathname, location.search, {
        source: 'document-learning',
        target: 'inventory',
        job: documentRecordId,
        department: selectedTemplate?.label ?? 'Document intake',
        note: `Capture scans, photos, and intake evidence for ${selectedTemplate?.label ?? 'the active document pack'} before extraction advances.`,
      }),
    [documentRecordId, location.pathname, location.search, selectedTemplate?.label],
  );

  const refreshList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await docList();
      const next =
        (response.result as unknown as { documents?: DocRecord[] })?.documents ??
        (response.result as unknown as DocRecord[]) ??
        [];
      setDocs(Array.isArray(next) ? next : []);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    let active = true;
    operatingSystem
      .getInventoryOperationsWorkspace()
      .then((workspace) => {
        if (!active) return;
        setInventoryWorkspace(workspace);
        setDocTemplateId(workspace.documentTemplates[0]?.id ?? 'purchase-order');
      })
      .catch(() => {
        if (active) {
          setInventoryWorkspace(null);
        }
      });

    return () => {
      active = false;
    };
  }, [operatingSystem]);

  async function handleUpload() {
    if (!uploadPath.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await docUpload({ file_path: uploadPath.trim(), title: uploadTitle.trim() || undefined });
      setUploadPath('');
      setUploadTitle('');
      await refreshList();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Upload failed');
      setLoading(false);
    }
  }

  async function handleExtract(docId: string) {
    setLoading(true);
    setError(null);
    try {
      await docExtract({ doc_id: docId });
      await refreshList();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Extraction failed');
      setLoading(false);
    }
  }

  async function handleView(docId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await docGet({ doc_id: docId });
      setSelected((response.result as unknown as DocKnowledge) ?? null);
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Failed to load knowledge');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(docId: string) {
    setLoading(true);
    setError(null);
    try {
      await docDelete({ doc_id: docId });
      if (selected?.id === docId) setSelected(null);
      await refreshList();
    } catch (issue) {
      setError(issue instanceof ApiError ? issue.message : 'Delete failed');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6">
      <WorkspaceHero
        eyebrow="Knowledge intake"
        title="Document Learning"
        description="Register manuals, catalogs, and reference guides, move them through extraction, and review the resulting knowledge in one curated learning desk."
        metrics={
          <>
            <SummaryTile label="Documents" value={String(docs.length)} hint="Registered document records in the current learning desk." />
            <SummaryTile
              label="Queue posture"
              value={`${pendingDocs} active`}
              hint={`${completedDocs} completed extraction${completedDocs === 1 ? '' : 's'} currently available.`}
              accent="from-sky-400/22 via-sky-300/8 to-transparent"
            />
            <SummaryTile
              label="Selected knowledge"
              value={selected?.title ?? 'Standby'}
              hint={activeTab.detail}
              accent="from-violet-400/22 via-violet-300/8 to-transparent"
            />
          </>
        }
        aside={
          <div className="space-y-4">
            <div className="text-sm leading-6 text-slate-300">
              Think of this page as a knowledge receiving desk: register first, extract second, then review the entries with the same discipline you would use for a setup sheet. The same intake should also be able to feed inventory, tooling, and machine records instead of stopping at generic knowledge entries.
            </div>
            <div className="grid gap-2">
              <ActionButton onClick={refreshList}>Refresh registry</ActionButton>
              <ActionButton
                tone="emerald"
                onClick={() => {
                  setTab('extraction');
                  const pending = docs.find((doc) => doc.status === 'pending');
                  if (pending) void handleExtract(pending.id);
                }}
              >
                Run extraction
              </ActionButton>
              <ActionButton
                tone="amber"
                onClick={() => {
                  setTab('knowledge');
                  const complete = docs.find((doc) => doc.status === 'complete');
                  if (complete) void handleView(complete.id);
                }}
              >
                View knowledge
              </ActionButton>
            </div>
            {selectedTemplate ? (
              <div className="rounded-[22px] border border-white/8 bg-white/[0.04] px-4 py-4 text-sm text-slate-300">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inventory target</div>
                <div className="mt-2 font-semibold text-slate-100">{selectedTemplate.label}</div>
                <div className="mt-2 text-slate-400">{selectedTemplate.summary}</div>
              </div>
            ) : null}
          </div>
        }
      />

      <SurfaceStatusNotice
        title="Document intake convergence"
        surfaces={['inventoryOperations']}
      />

      <div className="flex flex-wrap gap-2">
        {(Object.entries(TAB_CONFIG) as Array<[Tab, { label: string; detail: string }]>).map(([key, config]) => (
          <TabButton key={key} active={tab === key} onClick={() => setTab(key)}>
            {config.label}
          </TabButton>
        ))}
      </div>

      {loading ? <LoadingState label="Refreshing document learning..." /> : null}
      {error ? <ErrorState message={error} onRetry={refreshList} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          {tab === 'registry' ? (
            <>
              <PanelCard title="Register document" subtitle="Stage the file path and title here so the learning queue starts from a clean intake.">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px_260px_auto]">
                  <Field label="File path">
                    <Input value={uploadPath} onChange={(event) => setUploadPath(event.target.value)} placeholder="C:/Kienzle/CATALOGS/catalog.pdf" />
                  </Field>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Document type</span>
                    <select
                      aria-label="Document type"
                      value={docTemplateId}
                      onChange={(event) => setDocTemplateId(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 text-sm text-slate-100 outline-none transition focus:border-emerald-300/32"
                    >
                      {(inventoryWorkspace?.documentTemplates ?? []).map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Field label="Title">
                    <Input value={uploadTitle} onChange={(event) => setUploadTitle(event.target.value)} placeholder="Optional display title" />
                  </Field>
                  <div className="md:self-end">
                    <ActionButton onClick={handleUpload} disabled={!uploadPath.trim()}>
                      Register document
                    </ActionButton>
                  </div>
                </div>
                {selectedTemplate ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="rounded-[22px] border border-emerald-300/12 bg-emerald-300/[0.06] px-4 py-4 text-sm leading-6 text-slate-300">
                      <div className="text-sm font-semibold text-emerald-100">Population targets</div>
                      <ul className="mt-3 space-y-2">
                        {selectedTemplate.extractionTargets.map((target) => (
                          <li key={target}>- {target}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm text-slate-300">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Confidence posture</div>
                      <div className="mt-2">{selectedTemplate.confidencePosture}</div>
                      <div className="mt-3 text-xs break-all text-slate-500">{selectedTemplate.samplePath}</div>
                    </div>
                  </div>
                ) : null}
              </PanelCard>

              <PanelCard title="Registered documents" subtitle="Use the registry lane to keep intake clean before you trigger extraction.">
                {docs.length > 0 ? (
                  <div className="space-y-3">
                    {docs.map((doc) => (
                      <div key={doc.id} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-50">{doc.title || doc.file_path.split(/[/\\]/).pop()}</div>
                            <div className="mt-1 truncate text-xs text-slate-500">{doc.file_path}</div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(doc.status)}`}>{doc.status}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {doc.status === 'pending' ? <ActionButton onClick={() => handleExtract(doc.id)}>Extract</ActionButton> : null}
                          {doc.status === 'complete' ? (
                            <ActionButton
                              tone="emerald"
                              onClick={() => {
                                setTab('knowledge');
                                void handleView(doc.id);
                              }}
                            >
                              View knowledge
                            </ActionButton>
                          ) : null}
                          <ActionButton tone="rose" onClick={() => handleDelete(doc.id)}>
                            Delete
                          </ActionButton>
                        </div>
                        {doc.error ? <div className="mt-3 text-sm text-rose-200">{doc.error}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                    No documents are currently registered.
                  </div>
                )}
              </PanelCard>
            </>
          ) : null}

          {tab === 'extraction' ? (
            <PanelCard title="Extraction queue" subtitle="Treat extraction like a production queue: pending, complete, and failed each deserve a clear posture.">
              {docs.length > 0 ? (
                <div className="space-y-3">
                  {docs.map((doc) => (
                    <div key={`${doc.id}-queue`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-50">{doc.title || doc.id}</div>
                          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{doc.format}</div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(doc.status)}`}>{doc.status}</span>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {doc.status === 'pending' ? <ActionButton onClick={() => handleExtract(doc.id)}>Extract</ActionButton> : null}
                        {doc.status === 'complete' ? (
                          <ActionButton
                            tone="emerald"
                            onClick={() => {
                              setTab('knowledge');
                              void handleView(doc.id);
                            }}
                          >
                            Open knowledge
                          </ActionButton>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No extraction queue is currently staged.
                </div>
              )}
            </PanelCard>
          ) : null}

          {tab === 'knowledge' ? (
            <PanelCard title="Extracted knowledge" subtitle="Read the extracted entries with their confidence and tags so the learning desk feels curated.">
              {selected ? (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <div className="text-sm font-semibold text-slate-50">{selected.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">{selected.id}</div>
                  </div>
                  {(selected.entries ?? []).length > 0 ? (
                    selected.entries.map((entry, index) => (
                      <div key={`${entry.type}-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-50">{entry.type}</div>
                          <div className="text-xs text-slate-400">{(entry.confidence * 100).toFixed(0)}% confidence</div>
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{entry.content}</div>
                        {entry.tags && entry.tags.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                      The selected document does not currently have extracted entries.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-sm text-slate-400">
                  No extracted knowledge is currently selected.
                </div>
              )}
            </PanelCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <PanelCard title="Learning brief" subtitle="Keep the intake-to-knowledge workflow visible while moving across the three lanes.">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current lane</div>
                <div className="mt-2 text-lg font-semibold text-slate-50">{activeTab.label}</div>
                <div className="mt-2 leading-6 text-slate-400">{activeTab.detail}</div>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Working order</div>
                <ul className="mt-3 space-y-2">
                  <li>Registry is for intake quality: titles, paths, formats, and document type should be clean before extraction starts.</li>
                  <li>Extraction queue is for operational posture: pending, complete, and failed documents should each have an obvious next move.</li>
                  <li>Knowledge view is for curated review: confidence and tags should help the user decide whether the extract is worth promoting.</li>
                </ul>
              </div>
              {inventoryWorkspace ? (
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Inventory population packs</div>
                  <div className="mt-3 grid gap-3">
                    {inventoryWorkspace.documentTemplates.map((template) => (
                      <div key={template.id} className="rounded-[18px] border border-white/8 bg-black/15 px-3 py-3">
                        <div className="text-sm font-semibold text-slate-100">{template.label}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-400">{template.summary}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workflow handoff</div>
                <div className="mt-3 space-y-3">
                  <Link
                    to={inventoryHandoffPath}
                    className="block rounded-[18px] border border-emerald-300/20 bg-emerald-300/[0.10] px-3 py-3 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-300/[0.16]"
                  >
                    <div>Open Inventory intake</div>
                    <div className="mt-2 text-sm font-normal leading-6 text-emerald-50/80">
                      Hand the document pack into Inventory so receiving and ownership start from the same intake.
                    </div>
                  </Link>
                  <Link
                    to={messagesHandoffPath}
                    className="block rounded-[18px] border border-sky-300/20 bg-sky-300/[0.10] px-3 py-3 text-sm font-semibold text-sky-50 transition hover:bg-sky-300/[0.16]"
                  >
                    <div>Open Messages follow-up</div>
                    <div className="mt-2 text-sm font-normal leading-6 text-sky-50/80">
                      Carry document follow-up context into the inbox instead of turning intake questions into disconnected chat.
                    </div>
                  </Link>
                  <Link
                    to={captureHandoffPath}
                    className="block rounded-[18px] border border-cyan-300/20 bg-cyan-300/[0.10] px-3 py-3 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/[0.16]"
                  >
                    <div>Open Capture Ops</div>
                    <div className="mt-2 text-sm font-normal leading-6 text-cyan-50/80">
                      Capture scans and intake evidence before extraction promotes the document downstream.
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </PanelCard>
        </div>
      </div>
    </div>
  );
}
