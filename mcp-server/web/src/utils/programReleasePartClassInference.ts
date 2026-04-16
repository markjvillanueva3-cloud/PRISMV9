function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

export function inferProgramReleasePartClassId(
  ...signals: Array<string | null | undefined>
): string | undefined {
  const evidence = signals
    .map(normalizeText)
    .filter(Boolean)
    .join(' ');

  if (!evidence) {
    return undefined;
  }

  if (/\bmanifold\b/.test(evidence)) return 'hydraulic-manifold';
  if (/\bfixture\b|\bplate\b|\btombstone\b/.test(evidence)) return 'fixture-plate';
  if (/\bshaft\b|\bturn(?:ed|ing)?\b|\blathe\b/.test(evidence)) return 'turned-shaft';
  if (/\bassembly\b|\bkit\b|\bpack\b/.test(evidence)) return 'assembly-pack';
  if (/\bbracket\b|\bhousing\b|\bbody\b|\bvalve\b|\bclamp\b|\bprismatic\b|\bpocket\b/.test(evidence)) {
    return 'prismatic-bracket';
  }
  return undefined;
}
