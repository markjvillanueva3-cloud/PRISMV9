"""Document type classification.

Classifies documents into categories based on structural cues and content keywords:
- academic_paper: Has abstract, references, DOI, methodology sections
- technical_manual: Has chapters, procedures, specifications, numbered sections
- handbook: Best practices, procedures, tables, guidelines
- blog_article: Informal tone, short length, personal pronouns
- notes: Bullet points, fragments, shorthand, no formal structure
- specification: Shall/must language, requirement numbering, standards refs
- other: Anything that doesn't match the above
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class DocumentType(str, Enum):
    """Document type classification."""
    ACADEMIC_PAPER = "academic_paper"
    TECHNICAL_MANUAL = "technical_manual"
    HANDBOOK = "handbook"
    BLOG_ARTICLE = "blog_article"
    NOTES = "notes"
    SPECIFICATION = "specification"
    OTHER = "other"


@dataclass
class ClassificationEvidence:
    """A single piece of evidence for classification."""
    cue: str
    weight: float
    doc_type: DocumentType


@dataclass
class DocumentClassification:
    """Result of document type classification."""
    doc_type: DocumentType
    confidence: float
    evidence: list[ClassificationEvidence] = field(default_factory=list)
    secondary_type: DocumentType | None = None

    def to_dict(self) -> dict:
        return {
            "doc_type": self.doc_type.value,
            "confidence": round(self.confidence, 3),
            "secondary_type": self.secondary_type.value if self.secondary_type else None,
            "evidence": [
                {"cue": e.cue, "weight": e.weight, "doc_type": e.doc_type.value}
                for e in self.evidence
            ],
        }


# ---------------------------------------------------------------------------
# Structural cues (presence of specific document structures)
# ---------------------------------------------------------------------------

_STRUCTURAL_CUES: list[tuple[str, float, DocumentType]] = [
    # Academic paper cues
    ("abstract", 2.5, DocumentType.ACADEMIC_PAPER),
    ("references", 1.5, DocumentType.ACADEMIC_PAPER),
    ("methodology", 2.0, DocumentType.ACADEMIC_PAPER),
    ("conclusion", 1.0, DocumentType.ACADEMIC_PAPER),
    ("introduction", 1.0, DocumentType.ACADEMIC_PAPER),
    ("literature review", 2.0, DocumentType.ACADEMIC_PAPER),
    ("experimental setup", 2.0, DocumentType.ACADEMIC_PAPER),
    ("results and discussion", 2.5, DocumentType.ACADEMIC_PAPER),
    ("acknowledgment", 1.5, DocumentType.ACADEMIC_PAPER),
    ("et al.", 2.0, DocumentType.ACADEMIC_PAPER),
    ("fig.", 1.0, DocumentType.ACADEMIC_PAPER),

    # Technical manual cues
    ("table of contents", 2.5, DocumentType.TECHNICAL_MANUAL),
    ("chapter", 1.5, DocumentType.TECHNICAL_MANUAL),
    ("appendix", 1.5, DocumentType.TECHNICAL_MANUAL),
    ("installation procedure", 2.0, DocumentType.TECHNICAL_MANUAL),
    ("maintenance schedule", 2.0, DocumentType.TECHNICAL_MANUAL),
    ("troubleshooting guide", 2.0, DocumentType.TECHNICAL_MANUAL),
    ("safety precautions", 1.5, DocumentType.TECHNICAL_MANUAL),
    ("operating instructions", 2.0, DocumentType.TECHNICAL_MANUAL),
    ("parts list", 1.5, DocumentType.TECHNICAL_MANUAL),

    # Handbook cues
    ("best practice", 2.0, DocumentType.HANDBOOK),
    ("recommended procedure", 2.0, DocumentType.HANDBOOK),
    ("guidelines", 1.5, DocumentType.HANDBOOK),
    ("rule of thumb", 2.0, DocumentType.HANDBOOK),
    ("tips and tricks", 2.0, DocumentType.HANDBOOK),
    ("quick reference", 2.0, DocumentType.HANDBOOK),
    ("do not", 1.0, DocumentType.HANDBOOK),

    # Blog cues
    ("in this post", 2.5, DocumentType.BLOG_ARTICLE),
    ("i found that", 2.0, DocumentType.BLOG_ARTICLE),
    ("my experience", 2.0, DocumentType.BLOG_ARTICLE),
    ("let me share", 2.0, DocumentType.BLOG_ARTICLE),
    ("stay tuned", 1.5, DocumentType.BLOG_ARTICLE),
    ("comments below", 2.0, DocumentType.BLOG_ARTICLE),
    ("subscribe", 1.0, DocumentType.BLOG_ARTICLE),

    # Specification cues
    ("shall", 2.0, DocumentType.SPECIFICATION),
    ("shall not", 2.5, DocumentType.SPECIFICATION),
    ("requirement", 1.5, DocumentType.SPECIFICATION),
    ("compliance", 1.5, DocumentType.SPECIFICATION),
    ("tolerance", 1.0, DocumentType.SPECIFICATION),
    ("iso ", 1.5, DocumentType.SPECIFICATION),
    ("astm ", 1.5, DocumentType.SPECIFICATION),
    ("din ", 1.5, DocumentType.SPECIFICATION),
    ("ansi ", 1.5, DocumentType.SPECIFICATION),
]

# ---------------------------------------------------------------------------
# Structural pattern scoring
# ---------------------------------------------------------------------------


def _score_structural_patterns(text: str, metadata_title: str | None = None) -> dict[DocumentType, float]:
    """Score document type based on structural patterns beyond keywords."""
    scores: dict[DocumentType, float] = {dt: 0.0 for dt in DocumentType}
    text_lower = text.lower()
    lines = text.split("\n")
    non_empty_lines = [l for l in lines if l.strip()]
    total_lines = len(non_empty_lines) or 1

    # Short documents are more likely blogs or notes
    word_count = len(text.split())
    if word_count < 500:
        scores[DocumentType.NOTES] += 2.0
    elif word_count < 2000:
        scores[DocumentType.BLOG_ARTICLE] += 1.0
    elif word_count > 5000:
        scores[DocumentType.ACADEMIC_PAPER] += 1.0
        scores[DocumentType.TECHNICAL_MANUAL] += 1.0

    # Bullet point density → notes
    bullet_lines = sum(1 for l in non_empty_lines if l.strip().startswith(("-", "*", "•", ">")))
    bullet_ratio = bullet_lines / total_lines
    if bullet_ratio > 0.4:
        scores[DocumentType.NOTES] += 3.0
    elif bullet_ratio > 0.2:
        scores[DocumentType.NOTES] += 1.5

    # Numbered sections → manual or specification
    import re
    numbered = sum(1 for l in non_empty_lines if re.match(r'^\d+[\.\)]\s', l.strip()))
    if numbered > 5:
        scores[DocumentType.TECHNICAL_MANUAL] += 2.0
        scores[DocumentType.SPECIFICATION] += 1.0

    # DOI presence → academic
    if "10." in text_lower and "/" in text_lower:
        from .document_ingest import _extract_doi
        if _extract_doi(text):
            scores[DocumentType.ACADEMIC_PAPER] += 3.0

    # Citation patterns [1], [2] → academic
    citation_count = len(re.findall(r'\[\d+\]', text))
    if citation_count > 3:
        scores[DocumentType.ACADEMIC_PAPER] += 2.0

    # Personal pronouns → blog
    personal_count = len(re.findall(r'\b(I|my|me|we|our)\b', text))
    personal_ratio = personal_count / (word_count or 1)
    if personal_ratio > 0.02:
        scores[DocumentType.BLOG_ARTICLE] += 2.0

    return scores


def classify_document(
    text: str,
    title: str | None = None,
    has_doi: bool = False,
    page_count: int = 0,
) -> DocumentClassification:
    """Classify a document into a type based on content and structure.

    Args:
        text: Full document text.
        title: Document title (optional, used as additional signal).
        has_doi: Whether a DOI was found in the document.
        page_count: Number of pages (0 if unknown).

    Returns:
        DocumentClassification with type, confidence, and evidence.
    """
    text_lower = text.lower()
    evidence: list[ClassificationEvidence] = []
    scores: dict[DocumentType, float] = {dt: 0.0 for dt in DocumentType}

    # Score keyword cues
    for cue, weight, doc_type in _STRUCTURAL_CUES:
        if cue.lower() in text_lower:
            scores[doc_type] += weight
            evidence.append(ClassificationEvidence(cue=cue, weight=weight, doc_type=doc_type))

    # Score structural patterns
    structural_scores = _score_structural_patterns(text, title)
    for dt, score in structural_scores.items():
        scores[dt] += score

    # DOI bonus
    if has_doi:
        scores[DocumentType.ACADEMIC_PAPER] += 3.0
        evidence.append(ClassificationEvidence(cue="DOI present", weight=3.0, doc_type=DocumentType.ACADEMIC_PAPER))

    # Page count signals
    if page_count > 20:
        scores[DocumentType.TECHNICAL_MANUAL] += 1.0
        scores[DocumentType.ACADEMIC_PAPER] += 0.5

    # Title signals
    if title:
        title_lower = title.lower()
        if any(w in title_lower for w in ("manual", "guide", "instruction")):
            scores[DocumentType.TECHNICAL_MANUAL] += 2.0
        if any(w in title_lower for w in ("handbook", "reference", "pocket")):
            scores[DocumentType.HANDBOOK] += 2.0
        if any(w in title_lower for w in ("spec", "standard", "requirement")):
            scores[DocumentType.SPECIFICATION] += 2.0
        if any(w in title_lower for w in ("study", "analysis", "investigation", "paper")):
            scores[DocumentType.ACADEMIC_PAPER] += 2.0
        if any(w in title_lower for w in ("blog", "post", "thoughts")):
            scores[DocumentType.BLOG_ARTICLE] += 2.0
        if any(w in title_lower for w in ("notes", "memo", "scratch")):
            scores[DocumentType.NOTES] += 2.0

    # Find top two types
    sorted_types = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    best_type = sorted_types[0][0]
    best_score = sorted_types[0][1]
    second_type = sorted_types[1][0] if len(sorted_types) > 1 else None
    second_score = sorted_types[1][1] if len(sorted_types) > 1 else 0

    # Default to OTHER if no strong signal
    if best_score < 2.0:
        best_type = DocumentType.OTHER
        confidence = 0.3
    elif best_score < 4.0:
        # Weak signal — low confidence
        total_score = sum(s for _, s in sorted_types if s > 0) or 1.0
        confidence = min(0.6, best_score / total_score * 0.5 + 0.2)
    else:
        # Strong signal — confidence based on margin between top two
        total_score = sum(s for _, s in sorted_types if s > 0) or 1.0
        confidence = min(0.95, best_score / total_score + 0.1)

    secondary = second_type if second_score >= 2.0 and second_type != best_type else None

    return DocumentClassification(
        doc_type=best_type,
        confidence=round(confidence, 3),
        evidence=evidence,
        secondary_type=secondary,
    )
