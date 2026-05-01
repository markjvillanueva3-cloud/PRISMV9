import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  addPartRevision,
  attachPacketFile,
  createPart,
  getFileVersions,
  getPart,
  listPacketAttachments,
  listPartRevisions,
  listParts,
  uploadPacketFile,
  type FileAttachmentRecord,
  type FileVersionRecord,
  type PartRevisionRecord,
  type PartSummaryRecord,
} from '../api/parts';
import { LoadingState } from '../components/LoadingState';
import { buildWorkflowPath, formatWorkflowSourceLabel, parseWorkflowRouteContext } from '../utils/workflowRouteContext';

type PartFormState = {
  part_number: string;
  name: string;
  description: string;
  material_name: string;
  tags: string;
};

type RevisionFormState = {
  revision: string;
  change_description: string;
};

type UploadFormState = {
  file: File | null;
  attachment_type: string;
  notes: string;
};

const EMPTY_PART_FORM: PartFormState = { part_number: '', name: '', description: '', material_name: '', tags: '' };
const EMPTY_REVISION_FORM: RevisionFormState = { revision: '', change_description: '' };
const EMPTY_UPLOAD_FORM: UploadFormState = { file: null, attachment_type: 'cad', notes: '' };

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-50">{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,17,24,0.96)_0%,rgba(5,10,16,0.96)_100%)] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
      <div className="mb-5">
        <div className="text-xl font-semibold text-slate-50">{title}</div>
        {subtitle ? <div className="mt-1 text-sm text-slate-400">{subtitle}</div> : null}
      </div>
      {children}
    </section>
  );
}

async function fileToBase64(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return btoa(binary);
}

export function PartsLibraryPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const workflow = useMemo(() => parseWorkflowRouteContext(location.search), [location.search]);
  const sourceContext = params.get('source') || workflow.origin.source || '';
  const sourceLabel = formatWorkflowSourceLabel(sourceContext);
  const upstreamSource =
    workflow.origin.source && workflow.origin.source !== sourceContext ? workflow.origin.source : '';
  const upstreamSourceLabel = formatWorkflowSourceLabel(upstreamSource);
  const requestedPartId =
    workflow.focus.type === 'part' && workflow.focus.id
      ? workflow.focus.id
      : workflow.origin.recordType === 'Part'
        ? workflow.origin.recordId
        : '';

  const [query, setQuery] = useState('');
  const [parts, setParts] = useState<PartSummaryRecord[]>([]);
  const [selectedPartId, setSelectedPartId] = useState(requestedPartId);
  const [selectedPart, setSelectedPart] = useState<PartSummaryRecord | null>(null);
  const [revisions, setRevisions] = useState<PartRevisionRecord[]>([]);
  const [attachments, setAttachments] = useState<FileAttachmentRecord[]>([]);
  const [versions, setVersions] = useState<FileVersionRecord[]>([]);
  const [partForm, setPartForm] = useState<PartFormState>(EMPTY_PART_FORM);
  const [revisionForm, setRevisionForm] = useState<RevisionFormState>(EMPTY_REVISION_FORM);
  const [uploadForm, setUploadForm] = useState<UploadFormState>(EMPTY_UPLOAD_FORM);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (requestedPartId && requestedPartId !== selectedPartId) {
      setSelectedPartId(requestedPartId);
    }
  }, [requestedPartId, selectedPartId]);

  useEffect(() => {
    let cancelled = false;
    setLoadingList(true);
    setError('');

    void listParts({ query: query || undefined, limit: 24 })
      .then((result) => {
        if (cancelled) return;
        const rows = Array.isArray(result?.parts) ? result.parts : [];
        setParts(rows);
        setSelectedPartId((current) => current || rows[0]?.id || '');
      })
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Unable to load parts library.');
          setParts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    if (!selectedPartId) {
      setSelectedPart(null);
      setRevisions([]);
      setAttachments([]);
      setVersions([]);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);
    setError('');

    void Promise.all([
      getPart(selectedPartId),
      listPartRevisions(selectedPartId),
      listPacketAttachments({ entity_type: 'part', entity_id: selectedPartId }),
    ])
      .then(async ([detail, revisionRows, attachmentRows]) => {
        if (cancelled) return;
        const safeAttachments = Array.isArray(attachmentRows) ? attachmentRows : [];
        const versionRows = safeAttachments[0] ? await getFileVersions(safeAttachments[0].file_id).catch(() => []) : [];
        if (cancelled) return;
        setSelectedPart(detail?.part ?? null);
        setRevisions(Array.isArray(revisionRows) ? revisionRows : []);
        setAttachments(safeAttachments);
        setVersions(Array.isArray(versionRows) ? versionRows : []);
      })
      .catch((issue: unknown) => {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : 'Unable to load selected part.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPartId]);

  async function refreshPart(partId: string) {
    const [detail, revisionRows, attachmentRows] = await Promise.all([
      getPart(partId),
      listPartRevisions(partId),
      listPacketAttachments({ entity_type: 'part', entity_id: partId }),
    ]);
    const safeAttachments = Array.isArray(attachmentRows) ? attachmentRows : [];
    const versionRows = safeAttachments[0] ? await getFileVersions(safeAttachments[0].file_id).catch(() => []) : [];
    setSelectedPart(detail?.part ?? null);
    setRevisions(Array.isArray(revisionRows) ? revisionRows : []);
    setAttachments(safeAttachments);
    setVersions(Array.isArray(versionRows) ? versionRows : []);
  }

  async function handleCreatePart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const created = await createPart({
        part_number: partForm.part_number.trim(),
        name: partForm.name.trim(),
        description: partForm.description.trim() || undefined,
        material_name: partForm.material_name.trim() || undefined,
        tags: partForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
      setPartForm(EMPTY_PART_FORM);
      setMessage(`Registered ${created.part.part_number} and seeded revision ${created.revision.revision}.`);
      setSelectedPartId(created.part.id);
      const refreshed = await listParts({ query: query || undefined, limit: 24 });
      setParts(refreshed.parts);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to register part.');
    }
  }

  async function handleAddRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPartId) return;
    setError('');
    setMessage('');
    try {
      const revision = await addPartRevision(selectedPartId, {
        revision: revisionForm.revision.trim() || undefined,
        change_description: revisionForm.change_description.trim(),
      });
      setRevisionForm(EMPTY_REVISION_FORM);
      setMessage(`Added revision ${revision.revision} to the selected part.`);
      await refreshPart(selectedPartId);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to add revision.');
    }
  }

  async function handleUploadAttachment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPartId || !uploadForm.file) return;
    setError('');
    setMessage('');
    try {
      const uploaded = await uploadPacketFile({
        content: await fileToBase64(uploadForm.file),
        original_name: uploadForm.file.name,
      });
      await attachPacketFile({
        file_id: uploaded.file_id,
        entity_type: 'part',
        entity_id: selectedPartId,
        attachment_type: uploadForm.attachment_type.trim() || 'cad',
        notes: uploadForm.notes.trim() || undefined,
      });
      setUploadForm(EMPTY_UPLOAD_FORM);
      setMessage(`Attached ${uploaded.original_name} to the selected part.`);
      await refreshPart(selectedPartId);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Unable to upload and attach file.');
    }
  }

  const recordId = selectedPart?.id || selectedPartId;
  const links = {
    quote: buildWorkflowPath('/quote-builder', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'parts-library', recordType: 'Part', recordId, customer: workflow.origin.customer, note: '', threadId: workflow.origin.threadId },
      focus: { type: 'part', id: recordId, jobId: workflow.focus.jobId, quoteId: workflow.focus.quoteId, packetId: workflow.focus.packetId },
      extras: { source: 'parts-library', note: 'Carry part lineage and linked files from Parts Library into Quote Builder.' },
    }),
    release: buildWorkflowPath('/print-to-cnc', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'parts-library', recordType: 'Part', recordId, customer: workflow.origin.customer, note: '', threadId: workflow.origin.threadId },
      focus: { type: 'part', id: recordId, jobId: workflow.focus.jobId, quoteId: workflow.focus.quoteId, packetId: workflow.focus.packetId },
      extras: { source: 'parts-library', note: 'Carry revision lineage and linked files from Parts Library into Print to CNC.' },
    }),
    inventory: buildWorkflowPath('/inventory', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'parts-library', recordType: 'Part', recordId, customer: workflow.origin.customer, note: '', threadId: workflow.origin.threadId },
      focus: { type: 'part', id: recordId, jobId: workflow.focus.jobId, quoteId: workflow.focus.quoteId, packetId: workflow.focus.packetId },
      extras: { source: 'parts-library', tab: 'documents', note: 'Carry part-linked documents from Parts Library into Inventory.' },
    }),
    jobs: buildWorkflowPath('/jobs', location.search, {
      origin: workflow.origin.source
        ? workflow.origin
        : { source: 'parts-library', recordType: 'Part', recordId, customer: workflow.origin.customer, note: '', threadId: workflow.origin.threadId },
      focus: { type: 'part', id: recordId, jobId: workflow.focus.jobId, quoteId: workflow.focus.quoteId, packetId: workflow.focus.packetId },
      extras: { source: 'parts-library', note: 'Carry selected part context from Parts Library into the Jobs desk.' },
    }),
  };

  return (
    <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-6 pb-10">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(12,20,28,0.96)_0%,rgba(8,13,19,0.98)_100%)] px-6 py-6 shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <span className="inline-flex rounded-full border border-cyan-300/16 bg-cyan-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Revision + file lineage
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">Parts Library</h1>
              <p className="mt-3 text-base leading-7 text-slate-300">
                Search registered parts, review revision history, attach live files, and carry authoritative part context into quoting, release, inventory, and execution.
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="Loaded parts" value={String(parts.length)} />
            <SummaryTile label="Revisions" value={String(revisions.length)} />
            <SummaryTile label="Linked files" value={String(attachments.length)} />
            <SummaryTile label="Convergence" value="Live routes" />
          </div>
        </div>
      </section>

      {sourceContext ? (
        <section className="rounded-[24px] border border-cyan-300/16 bg-cyan-300/[0.08] px-5 py-4 text-sm text-cyan-50">
          <div className="font-semibold">{sourceLabel} opened Parts Library with workflow context.</div>
          <div className="mt-2 text-cyan-50/80">Keep the selected part and revision attached as you move this record into quoting, release, inventory, or jobs.</div>
          {upstreamSource ? <div className="mt-2 text-cyan-50/80">Upstream commercial origin: <span className="font-semibold text-cyan-50">{upstreamSourceLabel}</span></div> : null}
        </section>
      ) : null}

      {error ? <section className="rounded-[22px] border border-rose-300/18 bg-rose-300/[0.08] px-5 py-4 text-sm text-rose-50">{error}</section> : null}
      {message ? <section className="rounded-[22px] border border-emerald-300/18 bg-emerald-300/[0.08] px-5 py-4 text-sm text-emerald-50">{message}</section> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)]">
        <div className="space-y-6">
          <Panel title="Search and select" subtitle="Use the mounted parts routes as the canonical selection surface for revision-aware downstream work.">
            <label className="block">
              <span className="sr-only">Search parts</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search part number, name, material, or tag"
                aria-label="Search parts"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50"
              />
            </label>
            {loadingList ? <LoadingState label="Loading parts library..." /> : null}
            <div className="grid gap-3">
              {parts.length === 0 && !loadingList ? <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">No parts matched yet. Register the first part below or widen the search.</div> : null}
              {parts.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => setSelectedPartId(part.id)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${selectedPartId === part.id ? 'border-cyan-300/36 bg-cyan-300/[0.08]' : 'border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-50">{part.part_number}</div>
                      <div className="mt-1 text-base text-slate-200">{part.name}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">{part.current_revision ?? 'Seed'}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{part.description || 'No description captured yet.'}</div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Register a part" subtitle="Keep part intake lightweight so new records can enter the live library early.">
            <form className="space-y-4" onSubmit={handleCreatePart}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-300"><span>Part number</span><input value={partForm.part_number} onChange={(event) => setPartForm((current) => ({ ...current, part_number: event.target.value }))} placeholder="PART-2401" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
                <label className="space-y-2 text-sm text-slate-300"><span>Part name</span><input value={partForm.name} onChange={(event) => setPartForm((current) => ({ ...current, name: event.target.value }))} placeholder="Hydraulic manifold body" required className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
                <label className="space-y-2 text-sm text-slate-300"><span>Material</span><input value={partForm.material_name} onChange={(event) => setPartForm((current) => ({ ...current, material_name: event.target.value }))} placeholder="7075-T651" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
                <label className="space-y-2 text-sm text-slate-300"><span>Tags</span><input value={partForm.tags} onChange={(event) => setPartForm((current) => ({ ...current, tags: event.target.value }))} placeholder="5-axis, manifold, aerospace" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              </div>
              <label className="space-y-2 text-sm text-slate-300"><span>Description</span><textarea value={partForm.description} onChange={(event) => setPartForm((current) => ({ ...current, description: event.target.value }))} placeholder="Capture the feature posture or downstream routing note." className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              <button type="submit" className="rounded-full border border-cyan-400/30 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-400/20">Register part</button>
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Selected part" subtitle="Revision lineage, linked files, and handoffs stay attached to the active part.">
            {!selectedPartId ? <div className="rounded-[22px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-5 text-sm text-slate-400">Pick a part from the search results to review revisions and linked files.</div> : loadingDetail ? <LoadingState label="Loading selected part..." /> : selectedPart ? (
              <>
                <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                  <div className="text-sm font-semibold text-cyan-100">{selectedPart.part_number}</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-50">{selectedPart.name}</div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{selectedPart.description || 'No description captured yet.'}</div>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"><div className="text-sm font-semibold text-slate-50">Revision lineage</div><div className="mt-3 space-y-3">{revisions.map((revision) => <div key={revision.id} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3"><div className="text-sm font-semibold text-slate-100">{revision.revision}</div><div className="mt-2 text-sm text-slate-400">{revision.change_description}</div></div>)}</div></div>
                  <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4"><div className="text-sm font-semibold text-slate-50">Linked files</div><div className="mt-3 space-y-3">{attachments.length === 0 ? <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-3 py-3 text-sm text-slate-400">No files are attached yet.</div> : attachments.map((attachment) => <div key={attachment.id} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3"><div className="text-sm font-semibold text-slate-100">{attachment.file.original_name}</div><div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{attachment.attachment_type} · v{attachment.file.version}</div></div>)}</div></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Link to={links.quote} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.08]">Open Quote Builder</Link>
                  <Link to={links.release} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.08]">Open Print to CNC</Link>
                  <Link to={links.inventory} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.08]">Open Inventory follow-up</Link>
                  <Link to={links.jobs} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-300/28 hover:bg-cyan-300/[0.08]">Open Jobs desk</Link>
                </div>
              </>
            ) : null}
          </Panel>

          <Panel title="Revision and file actions" subtitle="Add revisions and attach files without leaving the desk.">
            <form className="space-y-4" onSubmit={handleAddRevision}>
              <label className="space-y-2 text-sm text-slate-300"><span>Revision label</span><input value={revisionForm.revision} onChange={(event) => setRevisionForm((current) => ({ ...current, revision: event.target.value }))} placeholder="Rev C" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              <label className="space-y-2 text-sm text-slate-300"><span>Change description</span><textarea value={revisionForm.change_description} onChange={(event) => setRevisionForm((current) => ({ ...current, change_description: event.target.value }))} placeholder="Document what changed so release and quality can trust the lineage." required className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              <button type="submit" disabled={!selectedPartId} className="rounded-full border border-violet-400/30 bg-violet-400/15 px-4 py-2 text-sm font-semibold text-violet-50 transition hover:bg-violet-400/20 disabled:cursor-not-allowed disabled:opacity-60">Add revision</button>
            </form>

            <form className="space-y-4" onSubmit={handleUploadAttachment}>
              <label className="block space-y-2 text-sm text-slate-300"><span>File</span><input type="file" aria-label="Attach part file" onChange={(event: ChangeEvent<HTMLInputElement>) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100" /></label>
              {uploadForm.file ? <div className="text-sm text-slate-400">{uploadForm.file.name}</div> : null}
              <label className="space-y-2 text-sm text-slate-300"><span>Attachment type</span><input value={uploadForm.attachment_type} onChange={(event) => setUploadForm((current) => ({ ...current, attachment_type: event.target.value }))} placeholder="cad, drawing, setup" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              <label className="space-y-2 text-sm text-slate-300"><span>Attachment notes</span><textarea value={uploadForm.notes} onChange={(event) => setUploadForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400/50" /></label>
              <button type="submit" disabled={!selectedPartId || !uploadForm.file} className="rounded-full border border-amber-400/30 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-50 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-60">Upload and attach</button>
            </form>

            <div className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <div className="text-sm font-semibold text-slate-50">File version history</div>
              <div className="mt-3 space-y-3">
                {versions.length === 0 ? <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-3 py-3 text-sm text-slate-400">Version history will appear after at least one attachment is linked.</div> : versions.map((version) => <div key={`${version.version}-${version.original_name}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-3 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-100">{version.original_name}</span><span className="text-xs uppercase tracking-[0.2em] text-slate-500">v{version.version}</span></div><div className="mt-2 text-sm text-slate-400">{version.change_description || 'No change description captured.'}</div></div>)}
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
