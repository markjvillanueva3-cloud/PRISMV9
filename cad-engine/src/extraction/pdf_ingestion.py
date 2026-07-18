"""PDF Ingestion Pipeline — CC-EXT-MS1-P0-U01.

Loads PDFs from file paths or URLs, extracts text with layout awareness,
provides OCR fallback for scanned pages, segments pages into regions
(text, table, figure, header/footer), and extracts document metadata.

Primary: PyMuPDF (fitz) for text extraction.
Fallback: pdfplumber for complex layouts.
OCR: Tesseract via pytesseract for scanned pages.
"""

from __future__ import annotations

import io
import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Region types for page segmentation
# ---------------------------------------------------------------------------

class RegionType(str, Enum):
    TEXT = "text"
    TABLE = "table"
    FIGURE = "figure"
    HEADER = "header"
    FOOTER = "footer"


class DocumentType(str, Enum):
    MANUAL = "manual"
    CATALOG = "catalog"
    DATASHEET = "datasheet"
    TECHNICAL_NOTE = "technical_note"
    ACADEMIC_PAPER = "academic_paper"
    UNKNOWN = "unknown"


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class PageRegion:
    """A classified region within a PDF page."""
    region_type: RegionType
    text: str
    page_number: int
    bbox: tuple[float, float, float, float] = (0, 0, 0, 0)  # x0, y0, x1, y1
    confidence: float = 1.0

    def to_dict(self) -> dict:
        return {
            "region_type": self.region_type.value,
            "text": self.text[:200] + "..." if len(self.text) > 200 else self.text,
            "page_number": self.page_number,
            "bbox": list(self.bbox),
            "confidence": round(self.confidence, 4),
        }


@dataclass
class PageContent:
    """Extracted content from a single PDF page."""
    page_number: int
    full_text: str
    regions: list[PageRegion] = field(default_factory=list)
    is_scanned: bool = False
    word_count: int = 0
    has_tables: bool = False
    has_figures: bool = False

    def to_dict(self) -> dict:
        return {
            "page_number": self.page_number,
            "word_count": self.word_count,
            "is_scanned": self.is_scanned,
            "has_tables": self.has_tables,
            "has_figures": self.has_figures,
            "region_count": len(self.regions),
            "regions": [r.to_dict() for r in self.regions],
        }


@dataclass
class DocumentMetadata:
    """Metadata extracted from a PDF document."""
    title: str = ""
    author: str = ""
    subject: str = ""
    creation_date: str = ""
    modification_date: str = ""
    page_count: int = 0
    file_size_bytes: int = 0
    document_type: DocumentType = DocumentType.UNKNOWN
    producer: str = ""
    has_toc: bool = False
    language: str = ""

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "author": self.author,
            "subject": self.subject,
            "creation_date": self.creation_date,
            "modification_date": self.modification_date,
            "page_count": self.page_count,
            "file_size_bytes": self.file_size_bytes,
            "document_type": self.document_type.value,
            "producer": self.producer,
            "has_toc": self.has_toc,
            "language": self.language,
        }


@dataclass
class IngestedDocument:
    """Complete result of ingesting a PDF document."""
    source_path: str
    metadata: DocumentMetadata
    pages: list[PageContent] = field(default_factory=list)
    total_words: int = 0
    total_tables: int = 0
    total_figures: int = 0
    scanned_page_count: int = 0
    extraction_method: str = "pymupdf"
    warnings: list[str] = field(default_factory=list)
    success: bool = True
    error: str = ""

    @property
    def page_count(self) -> int:
        return len(self.pages)

    def get_full_text(self) -> str:
        """Concatenate all page text."""
        return "\n\n".join(p.full_text for p in self.pages if p.full_text)

    def get_regions_by_type(self, region_type: RegionType) -> list[PageRegion]:
        """Get all regions of a specific type across all pages."""
        regions = []
        for page in self.pages:
            regions.extend(r for r in page.regions if r.region_type == region_type)
        return regions

    def to_dict(self) -> dict:
        return {
            "source_path": self.source_path,
            "metadata": self.metadata.to_dict(),
            "page_count": self.page_count,
            "total_words": self.total_words,
            "total_tables": self.total_tables,
            "total_figures": self.total_figures,
            "scanned_page_count": self.scanned_page_count,
            "extraction_method": self.extraction_method,
            "warnings": self.warnings,
            "success": self.success,
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Document type classification
# ---------------------------------------------------------------------------

_DOC_TYPE_SIGNALS: dict[str, list[str]] = {
    "catalog": [
        "catalog", "ordering information", "part number", "product range",
        "insert grade", "tool holder", "order code", "price list",
    ],
    "manual": [
        "operator manual", "user guide", "instruction manual", "maintenance",
        "chapter", "table of contents", "appendix", "glossary",
    ],
    "datasheet": [
        "technical data", "specifications", "data sheet", "datasheet",
        "properties", "typical values", "test conditions",
    ],
    "technical_note": [
        "technical note", "application note", "white paper",
        "machining guide", "best practices", "recommendations",
    ],
    "academic_paper": [
        "abstract", "introduction", "methodology", "results",
        "conclusion", "references", "doi", "journal",
    ],
}


def classify_document_type(text: str, title: str = "") -> DocumentType:
    """Classify document type from content text and title."""
    combined = (title + " " + text[:3000]).lower()
    scores: dict[str, int] = {}
    for doc_type, keywords in _DOC_TYPE_SIGNALS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return DocumentType.UNKNOWN

    best = max(scores, key=scores.get)  # type: ignore[arg-type]
    type_map = {
        "catalog": DocumentType.CATALOG,
        "manual": DocumentType.MANUAL,
        "datasheet": DocumentType.DATASHEET,
        "technical_note": DocumentType.TECHNICAL_NOTE,
        "academic_paper": DocumentType.ACADEMIC_PAPER,
    }
    return type_map.get(best, DocumentType.UNKNOWN)


# ---------------------------------------------------------------------------
# Page segmentation
# ---------------------------------------------------------------------------

# Table detection patterns
_TABLE_PATTERNS = [
    r"\b\d+\s*[|│]\s*\d+",  # Number | Number
    r"[-─]{3,}\s*[+┼]\s*[-─]{3,}",  # Horizontal rules with intersections
    r"\bTable\s+\d+",  # "Table 1", "Table 2"
]

# Figure detection patterns
_FIGURE_PATTERNS = [
    r"\bFig(?:ure)?\.?\s*\d+",
    r"\bDiagram\s+\d+",
    r"\bIllustration\s+\d+",
]


def _is_header_region(text: str, y_position: float, page_height: float) -> bool:
    """Check if text is in the header region (top 10% of page)."""
    if page_height > 0 and y_position < page_height * 0.10:
        return True
    # Common header patterns
    header_patterns = [
        r"^page\s+\d+",
        r"^\d+\s*$",
        r"^chapter\s+\d+",
    ]
    for pat in header_patterns:
        if re.search(pat, text.strip(), re.IGNORECASE):
            return True
    return False


def _is_footer_region(text: str, y_position: float, page_height: float) -> bool:
    """Check if text is in the footer region (bottom 10% of page)."""
    if page_height > 0 and y_position > page_height * 0.90:
        return True
    footer_patterns = [
        r"^\d+\s*$",  # Just a page number
        r"^page\s+\d+\s+of\s+\d+",
        r"©\s*\d{4}",
        r"all rights reserved",
        r"confidential",
    ]
    for pat in footer_patterns:
        if re.search(pat, text.strip(), re.IGNORECASE):
            return True
    return False


def _detect_tables_in_text(text: str) -> bool:
    """Check if text block likely contains a table."""
    for pat in _TABLE_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return True
    # Heuristic: multiple lines with consistent tab/space delimiters
    lines = text.strip().split("\n")
    if len(lines) >= 3:
        tab_lines = sum(1 for line in lines if "\t" in line or "  " in line)
        if tab_lines >= len(lines) * 0.6:
            return True
    return False


def _detect_figures_in_text(text: str) -> bool:
    """Check if text block references a figure."""
    for pat in _FIGURE_PATTERNS:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False


def segment_page(text: str, page_number: int,
                 page_height: float = 792.0) -> list[PageRegion]:
    """Segment a page's text into classified regions.

    Splits text into blocks and classifies each as text, table, figure,
    header, or footer based on position and content heuristics.
    """
    if not text.strip():
        return []

    regions: list[PageRegion] = []
    blocks = _split_into_blocks(text)
    num_blocks = max(len(blocks), 1)

    for i, block in enumerate(blocks):
        block_text = block["text"]
        if not block_text.strip():
            continue

        # Distribute blocks evenly across page height for position-based classification
        y_pos = page_height * (i / num_blocks)

        # Classify region
        if _is_header_region(block_text, y_pos, page_height):
            region_type = RegionType.HEADER
        elif _is_footer_region(block_text, y_pos, page_height):
            region_type = RegionType.FOOTER
        elif _detect_tables_in_text(block_text):
            region_type = RegionType.TABLE
        elif _detect_figures_in_text(block_text):
            region_type = RegionType.FIGURE
        else:
            region_type = RegionType.TEXT

        regions.append(PageRegion(
            region_type=region_type,
            text=block_text.strip(),
            page_number=page_number,
            bbox=(0, y_pos, 0, y_pos + 50),
            confidence=0.8,
        ))

    return regions


def _split_into_blocks(text: str) -> list[dict]:
    """Split text into logical blocks based on blank lines."""
    blocks = []
    current_lines: list[str] = []
    y_pos = 0.0

    for line in text.split("\n"):
        if not line.strip() and current_lines:
            blocks.append({
                "text": "\n".join(current_lines),
                "y": y_pos,
            })
            current_lines = []
            y_pos += 50
        else:
            current_lines.append(line)

    if current_lines:
        blocks.append({
            "text": "\n".join(current_lines),
            "y": y_pos,
        })

    return blocks


# ---------------------------------------------------------------------------
# PDF Ingestion Engine
# ---------------------------------------------------------------------------

class PDFIngestionPipeline:
    """PDF ingestion pipeline: load, extract, segment, classify.

    Supports file paths and URLs. Uses PyMuPDF as primary extractor
    with pdfplumber fallback. OCR via Tesseract for scanned pages.
    """

    def __init__(
        self,
        ocr_enabled: bool = True,
        min_words_for_text: int = 10,
        max_pages: int = 500,
    ):
        self._ocr_enabled = ocr_enabled
        self._min_words_for_text = min_words_for_text
        self._max_pages = max_pages

    def ingest(self, source: str) -> IngestedDocument:
        """Ingest a PDF from a file path or URL.

        Args:
            source: File path or HTTP(S) URL to a PDF.

        Returns:
            IngestedDocument with extracted text, regions, and metadata.
        """
        if source.startswith("http://") or source.startswith("https://"):
            return self._ingest_from_url(source)
        return self._ingest_from_file(source)

    def _ingest_from_file(self, file_path: str) -> IngestedDocument:
        """Ingest from a local file path."""
        path = Path(file_path)
        if not path.exists():
            return IngestedDocument(
                source_path=file_path,
                metadata=DocumentMetadata(),
                success=False,
                error=f"File not found: {file_path}",
            )

        if not path.suffix.lower() == ".pdf":
            return IngestedDocument(
                source_path=file_path,
                metadata=DocumentMetadata(),
                success=False,
                error=f"Not a PDF file: {path.suffix}",
            )

        try:
            pdf_bytes = path.read_bytes()
            return self._process_pdf(pdf_bytes, file_path, path.stat().st_size)
        except Exception as e:
            return IngestedDocument(
                source_path=file_path,
                metadata=DocumentMetadata(),
                success=False,
                error=f"Failed to read file: {e}",
            )

    def _ingest_from_url(self, url: str) -> IngestedDocument:
        """Ingest from a URL. Downloads to memory then processes."""
        try:
            import urllib.request
            with urllib.request.urlopen(url, timeout=30) as resp:
                pdf_bytes = resp.read()
            return self._process_pdf(pdf_bytes, url, len(pdf_bytes))
        except ImportError:
            return IngestedDocument(
                source_path=url,
                metadata=DocumentMetadata(),
                success=False,
                error="urllib not available",
            )
        except Exception as e:
            return IngestedDocument(
                source_path=url,
                metadata=DocumentMetadata(),
                success=False,
                error=f"Failed to download PDF: {e}",
            )

    def _process_pdf(self, pdf_bytes: bytes, source: str,
                     file_size: int) -> IngestedDocument:
        """Process PDF bytes through the extraction pipeline."""
        # Try PyMuPDF first
        doc = self._try_pymupdf(pdf_bytes, source, file_size)
        if doc.success and doc.total_words > 0:
            return doc

        # Fallback to pdfplumber
        doc_fallback = self._try_pdfplumber(pdf_bytes, source, file_size)
        if doc_fallback.success and doc_fallback.total_words > doc.total_words:
            doc_fallback.extraction_method = "pdfplumber"
            return doc_fallback

        # If both extracted some text, return the one with more words
        if doc.total_words > 0:
            return doc

        # OCR fallback for scanned pages
        if self._ocr_enabled:
            doc_ocr = self._try_ocr(pdf_bytes, source, file_size)
            if doc_ocr.success:
                doc_ocr.extraction_method = "tesseract_ocr"
                return doc_ocr

        # Return whatever we have, even if empty
        if not doc.success:
            doc.warnings.append("No text extracted — document may be image-only")
        return doc

    def _try_pymupdf(self, pdf_bytes: bytes, source: str,
                     file_size: int) -> IngestedDocument:
        """Extract using PyMuPDF (fitz)."""
        try:
            import fitz
        except ImportError:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="pymupdf",
                success=False,
                error="PyMuPDF (fitz) not installed",
            )

        try:
            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")

            if pdf.page_count > self._max_pages:
                return IngestedDocument(
                    source_path=source,
                    metadata=DocumentMetadata(
                        page_count=pdf.page_count,
                        file_size_bytes=file_size,
                    ),
                    success=False,
                    error=f"PDF has {pdf.page_count} pages, exceeds max {self._max_pages}",
                )

            # Extract metadata
            meta = self._extract_metadata_fitz(pdf, file_size)

            # Extract pages
            pages: list[PageContent] = []
            total_words = 0
            total_tables = 0
            total_figures = 0
            scanned_count = 0

            for page_num in range(pdf.page_count):
                page = pdf[page_num]
                text = page.get_text("text")
                word_count = len(text.split())

                is_scanned = word_count < self._min_words_for_text
                if is_scanned:
                    scanned_count += 1

                # Segment page
                page_height = page.rect.height
                regions = segment_page(text, page_num + 1, page_height)

                has_tables = any(r.region_type == RegionType.TABLE for r in regions)
                has_figures = any(r.region_type == RegionType.FIGURE for r in regions)

                if has_tables:
                    total_tables += sum(1 for r in regions if r.region_type == RegionType.TABLE)
                if has_figures:
                    total_figures += sum(1 for r in regions if r.region_type == RegionType.FIGURE)

                pages.append(PageContent(
                    page_number=page_num + 1,
                    full_text=text,
                    regions=regions,
                    is_scanned=is_scanned,
                    word_count=word_count,
                    has_tables=has_tables,
                    has_figures=has_figures,
                ))
                total_words += word_count

            # Classify document type
            full_text = "\n".join(p.full_text for p in pages[:5])
            meta.document_type = classify_document_type(full_text, meta.title)
            meta.has_toc = pdf.get_toc() != []

            pdf.close()

            return IngestedDocument(
                source_path=source,
                metadata=meta,
                pages=pages,
                total_words=total_words,
                total_tables=total_tables,
                total_figures=total_figures,
                scanned_page_count=scanned_count,
                extraction_method="pymupdf",
                success=True,
            )
        except Exception as e:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="pymupdf",
                success=False,
                error=f"PyMuPDF extraction failed: {e}",
            )

    def _try_pdfplumber(self, pdf_bytes: bytes, source: str,
                        file_size: int) -> IngestedDocument:
        """Extract using pdfplumber as fallback."""
        try:
            import pdfplumber
        except ImportError:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="pdfplumber",
                success=False,
                error="pdfplumber not installed",
            )

        try:
            pdf = pdfplumber.open(io.BytesIO(pdf_bytes))

            if len(pdf.pages) > self._max_pages:
                return IngestedDocument(
                    source_path=source,
                    metadata=DocumentMetadata(
                        page_count=len(pdf.pages),
                        file_size_bytes=file_size,
                    ),
                    success=False,
                    error=f"PDF has {len(pdf.pages)} pages, exceeds max {self._max_pages}",
                )

            pages: list[PageContent] = []
            total_words = 0

            for i, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                word_count = len(text.split())
                regions = segment_page(text, i + 1)
                pages.append(PageContent(
                    page_number=i + 1,
                    full_text=text,
                    regions=regions,
                    word_count=word_count,
                    has_tables=bool(page.extract_tables()),
                ))
                total_words += word_count

            meta = DocumentMetadata(
                page_count=len(pdf.pages),
                file_size_bytes=file_size,
            )
            if pages:
                meta.document_type = classify_document_type(
                    "\n".join(p.full_text for p in pages[:5])
                )

            pdf.close()

            return IngestedDocument(
                source_path=source,
                metadata=meta,
                pages=pages,
                total_words=total_words,
                extraction_method="pdfplumber",
                success=True,
            )
        except Exception as e:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="pdfplumber",
                success=False,
                error=f"pdfplumber extraction failed: {e}",
            )

    def _try_ocr(self, pdf_bytes: bytes, source: str,
                 file_size: int) -> IngestedDocument:
        """OCR fallback for scanned PDFs using Tesseract."""
        try:
            import fitz
            from PIL import Image
            import pytesseract
        except ImportError:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="tesseract_ocr",
                success=False,
                error="OCR dependencies not installed (fitz + PIL + pytesseract)",
            )

        try:
            pdf = fitz.open(stream=pdf_bytes, filetype="pdf")
            pages: list[PageContent] = []
            total_words = 0

            ocr_page_count = min(pdf.page_count, self._max_pages)
            if pdf.page_count > self._max_pages:
                logger.warning(
                    "OCR truncating %d pages to max %d for %s",
                    pdf.page_count, self._max_pages, source,
                )

            for page_num in range(ocr_page_count):
                page = pdf[page_num]
                # Render page to image at 300 DPI
                mat = fitz.Matrix(300 / 72, 300 / 72)
                pix = page.get_pixmap(matrix=mat)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                # OCR the image with tuned config (OEM 3 = LSTM, PSM 6 = block)
                text = pytesseract.image_to_string(img, config="--oem 3 --psm 6")
                word_count = len(text.split())
                regions = segment_page(text, page_num + 1)

                pages.append(PageContent(
                    page_number=page_num + 1,
                    full_text=text,
                    regions=regions,
                    is_scanned=True,
                    word_count=word_count,
                ))
                total_words += word_count

            pdf.close()

            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(
                    page_count=len(pages),
                    file_size_bytes=file_size,
                ),
                pages=pages,
                total_words=total_words,
                scanned_page_count=len(pages),
                extraction_method="tesseract_ocr",
                success=True,
            )
        except Exception as e:
            return IngestedDocument(
                source_path=source,
                metadata=DocumentMetadata(file_size_bytes=file_size),
                extraction_method="tesseract_ocr",
                success=False,
                error=f"OCR extraction failed: {e}",
            )

    def _extract_metadata_fitz(self, pdf, file_size: int) -> DocumentMetadata:
        """Extract metadata using PyMuPDF document object."""
        meta_dict = pdf.metadata or {}
        return DocumentMetadata(
            title=meta_dict.get("title", "") or "",
            author=meta_dict.get("author", "") or "",
            subject=meta_dict.get("subject", "") or "",
            creation_date=meta_dict.get("creationDate", "") or "",
            modification_date=meta_dict.get("modDate", "") or "",
            page_count=pdf.page_count,
            file_size_bytes=file_size,
            producer=meta_dict.get("producer", "") or "",
        )
