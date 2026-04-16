import type { FileAttachmentRecord, PartRevisionRecord, PartSummaryRecord } from '../api/parts';

export type PartsLibraryReleaseSeed = {
  partClassId?: string;
  cadSourceId?: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function collectEvidence(input: {
  part: PartSummaryRecord | null;
  revisions: PartRevisionRecord[];
  attachments: FileAttachmentRecord[];
}) {
  const { part, revisions, attachments } = input;
  return [
    part?.part_number,
    part?.name,
    part?.description,
    part?.material_name,
    ...(part?.tags ?? []),
    ...revisions.flatMap((revision) => [revision.revision, revision.change_description]),
    ...attachments.flatMap((attachment) => [
      attachment.attachment_type,
      attachment.notes,
      attachment.file?.original_name,
      attachment.file?.mime_type,
    ]),
  ]
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');
}

function inferPartClassId(evidence: string) {
  if (!evidence) {
    return undefined;
  }

  if (/\bmanifold\b/.test(evidence)) return 'hydraulic-manifold';
  if (/\bfixture\b|\bplate\b|\btombstone\b/.test(evidence)) return 'fixture-plate';
  if (/\bshaft\b|\bturn(?:ed|ing)?\b|\blathe\b/.test(evidence)) return 'turned-shaft';
  if (/\bassembly\b|\bkit\b|\bpack\b/.test(evidence)) return 'assembly-pack';
  if (/\bbracket\b|\bprismatic\b|\bpocket\b/.test(evidence)) return 'prismatic-bracket';
  return undefined;
}

function inferCadSourceId(attachments: FileAttachmentRecord[]) {
  const fileEvidence = attachments
    .flatMap((attachment) => [attachment.file?.original_name, attachment.file?.mime_type, attachment.attachment_type])
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');

  if (!fileEvidence) {
    return undefined;
  }

  if (/\.(f3d|f3z)\b|\bfusion\b/.test(fileEvidence)) return 'fusion-master';
  if (/\.(step|stp|iges|igs|x_t|x_b)\b|\bparasolid\b|\bstep\b|\biges\b/.test(fileEvidence)) return 'neutral-compare';
  return undefined;
}

export function buildPartsLibraryReleaseSeed(input: {
  part: PartSummaryRecord | null;
  revisions: PartRevisionRecord[];
  attachments: FileAttachmentRecord[];
}): PartsLibraryReleaseSeed {
  const evidence = collectEvidence(input);
  return {
    partClassId: inferPartClassId(evidence),
    cadSourceId: inferCadSourceId(input.attachments),
  };
}
