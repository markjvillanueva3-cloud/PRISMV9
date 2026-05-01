"""Document text extraction module.

Extracts text and metadata from:
- PDF files (via pypdf)
- Markdown files (frontmatter + body)
- Plain text files
- HTML files (tag stripping)

Each format returns a DocumentIngestResult with:
- Full text content
- Page-level chunks (for PDFs) or section-level chunks
- Metadata (title, author, date, DOI, format, page count)
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


@dataclass
class DocumentPage:
    """A single page or section of a document."""
    page_number: int
    text: str
    section_title: str | None = None


@dataclass
class DocumentMetadata:
    """Metadata extracted from a document."""
    title: str | None = None
    author: str | None = None
    publication_date: str | None = None
    doi: str | None = None
    url: str | None = None
    page_count: int = 0
    format: str = "unknown"
    file_path: str | None = None
    file_size_bytes: int = 0


@dataclass
class DocumentIngestResult:
    """Result of document text extraction."""
    text: str
    pages: list[DocumentPage] = field(default_factory=list)
    metadata: DocumentMetadata = field(default_factory=DocumentMetadata)
    errors: list[str] = field(default_factory=list)

    @property
    def is_valid(self) -> bool:
        return len(self.text.strip()) > 0 and not self.errors

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "page_count": len(self.pages),
            "metadata": {
                "title": self.metadata.title,
                "author": self.metadata.author,
                "publication_date": self.metadata.publication_date,
                "doi": self.metadata.doi,
                "url": self.metadata.url,
                "page_count": self.metadata.page_count,
                "format": self.metadata.format,
            },
            "errors": self.errors,
        }


# DOI regex pattern
_DOI_PATTERN = re.compile(r'10\.\d{4,9}/[-._;/:A-Z0-9]+', re.IGNORECASE)

# Markdown frontmatter pattern
_FRONTMATTER_PATTERN = re.compile(r'^---\s*\n(.*?)\n---\s*\n', re.DOTALL)


def _detect_format(file_path: Path) -> str:
    """Detect document format from extension."""
    ext = file_path.suffix.lower()
    format_map = {
        ".pdf": "pdf",
        ".md": "markdown",
        ".markdown": "markdown",
        ".txt": "text",
        ".text": "text",
        ".html": "html",
        ".htm": "html",
    }
    return format_map.get(ext, "unknown")


def _extract_doi(text: str) -> str | None:
    """Extract DOI from text if present."""
    match = _DOI_PATTERN.search(text)
    return match.group(0) if match else None


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Parse YAML-like frontmatter from markdown.

    Returns (metadata_dict, body_text).
    Simple key: value parsing without requiring pyyaml.
    """
    match = _FRONTMATTER_PATTERN.match(text)
    if not match:
        return {}, text

    fm_text = match.group(1)
    body = text[match.end():]
    meta: dict = {}

    for line in fm_text.split("\n"):
        line = line.strip()
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip().lower()
            value = value.strip().strip('"').strip("'")
            if value:
                meta[key] = value

    return meta, body


def _extract_pdf(file_path: Path) -> DocumentIngestResult:
    """Extract text from a PDF file using pypdf."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return DocumentIngestResult(
            text="",
            errors=["pypdf not installed. Run: pip install pypdf"],
        )

    try:
        reader = PdfReader(str(file_path))
    except Exception as e:
        return DocumentIngestResult(
            text="",
            errors=[f"Failed to read PDF: {e}"],
        )

    pages: list[DocumentPage] = []
    all_text_parts: list[str] = []

    for i, page in enumerate(reader.pages):
        page_text = page.extract_text() or ""
        pages.append(DocumentPage(
            page_number=i + 1,
            text=page_text,
        ))
        all_text_parts.append(page_text)

    full_text = "\n\n".join(all_text_parts)

    # Extract metadata from PDF info
    pdf_meta = reader.metadata or {}
    title = pdf_meta.get("/Title") or pdf_meta.get("title")
    author = pdf_meta.get("/Author") or pdf_meta.get("author")
    creation_date = pdf_meta.get("/CreationDate")

    # Try to find DOI in first 2 pages
    first_pages_text = "\n".join(all_text_parts[:2])
    doi = _extract_doi(first_pages_text)

    metadata = DocumentMetadata(
        title=str(title) if title else None,
        author=str(author) if author else None,
        publication_date=str(creation_date) if creation_date else None,
        doi=doi,
        page_count=len(reader.pages),
        format="pdf",
        file_path=str(file_path),
        file_size_bytes=file_path.stat().st_size,
    )

    return DocumentIngestResult(
        text=full_text,
        pages=pages,
        metadata=metadata,
    )


def _extract_markdown(file_path: Path) -> DocumentIngestResult:
    """Extract text from a markdown file."""
    raw = file_path.read_text(encoding="utf-8", errors="replace")
    fm_meta, body = _parse_frontmatter(raw)

    # Split into sections by headings
    pages: list[DocumentPage] = []
    sections = re.split(r'^(#{1,3}\s+.+)$', body, flags=re.MULTILINE)

    if len(sections) <= 1:
        # No headings — treat as single page
        pages.append(DocumentPage(page_number=1, text=body.strip()))
    else:
        page_num = 1
        # sections alternates: [preamble, heading1, content1, heading2, content2, ...]
        if sections[0].strip():
            pages.append(DocumentPage(
                page_number=page_num,
                text=sections[0].strip(),
                section_title="Preamble",
            ))
            page_num += 1

        for i in range(1, len(sections), 2):
            heading = sections[i].strip().lstrip("#").strip()
            content = sections[i + 1].strip() if i + 1 < len(sections) else ""
            if heading or content:
                pages.append(DocumentPage(
                    page_number=page_num,
                    text=f"{sections[i].strip()}\n\n{content}".strip(),
                    section_title=heading,
                ))
                page_num += 1

    metadata = DocumentMetadata(
        title=fm_meta.get("title"),
        author=fm_meta.get("author"),
        publication_date=fm_meta.get("date"),
        doi=_extract_doi(raw),
        page_count=len(pages),
        format="markdown",
        file_path=str(file_path),
        file_size_bytes=file_path.stat().st_size,
    )

    return DocumentIngestResult(
        text=body.strip(),
        pages=pages,
        metadata=metadata,
    )


def _extract_text(file_path: Path) -> DocumentIngestResult:
    """Extract text from a plain text file."""
    raw = file_path.read_text(encoding="utf-8", errors="replace")

    # Split into pages by double newlines or form feeds
    chunks = re.split(r'\f|\n{3,}', raw)
    pages = [
        DocumentPage(page_number=i + 1, text=chunk.strip())
        for i, chunk in enumerate(chunks)
        if chunk.strip()
    ]

    if not pages:
        pages = [DocumentPage(page_number=1, text=raw.strip())]

    metadata = DocumentMetadata(
        page_count=len(pages),
        format="text",
        file_path=str(file_path),
        file_size_bytes=file_path.stat().st_size,
    )

    # Try to extract title from first line
    first_line = raw.strip().split("\n")[0].strip() if raw.strip() else None
    if first_line and len(first_line) < 200:
        metadata.title = first_line

    return DocumentIngestResult(
        text=raw.strip(),
        pages=pages,
        metadata=metadata,
    )


def _strip_html_tags(html: str) -> str:
    """Strip HTML tags, keeping text content."""
    # Remove script and style blocks
    html = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', html, flags=re.DOTALL | re.IGNORECASE)
    # Replace block elements with newlines
    html = re.sub(r'</(p|div|h[1-6]|li|tr|br)[^>]*>', '\n', html, flags=re.IGNORECASE)
    html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
    # Strip remaining tags
    html = re.sub(r'<[^>]+>', '', html)
    # Decode common entities
    html = html.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    html = html.replace("&quot;", '"').replace("&nbsp;", " ")
    # Collapse whitespace
    html = re.sub(r'\n{3,}', '\n\n', html)
    return html.strip()


def _extract_html(file_path: Path) -> DocumentIngestResult:
    """Extract text from an HTML file."""
    raw = file_path.read_text(encoding="utf-8", errors="replace")
    text = _strip_html_tags(raw)

    # Extract title from <title> tag
    title_match = re.search(r'<title[^>]*>(.*?)</title>', raw, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else None

    # Extract author from meta tag
    author_match = re.search(r'<meta\s+name=["\']author["\']\s+content=["\'](.*?)["\']', raw, re.IGNORECASE)
    author = author_match.group(1).strip() if author_match else None

    # Split by headings
    pages: list[DocumentPage] = []
    heading_splits = re.split(r'<h[1-3][^>]*>(.*?)</h[1-3]>', raw, flags=re.IGNORECASE | re.DOTALL)

    if len(heading_splits) <= 1:
        pages.append(DocumentPage(page_number=1, text=text))
    else:
        page_num = 1
        if heading_splits[0].strip():
            preamble = _strip_html_tags(heading_splits[0])
            if preamble:
                pages.append(DocumentPage(page_number=page_num, text=preamble))
                page_num += 1

        for i in range(1, len(heading_splits), 2):
            heading = _strip_html_tags(heading_splits[i]).strip()
            content = _strip_html_tags(heading_splits[i + 1]).strip() if i + 1 < len(heading_splits) else ""
            if heading or content:
                pages.append(DocumentPage(
                    page_number=page_num,
                    text=f"{heading}\n\n{content}".strip(),
                    section_title=heading,
                ))
                page_num += 1

    if not pages:
        pages = [DocumentPage(page_number=1, text=text)]

    metadata = DocumentMetadata(
        title=title,
        author=author,
        doi=_extract_doi(raw),
        page_count=len(pages),
        format="html",
        file_path=str(file_path),
        file_size_bytes=file_path.stat().st_size,
    )

    return DocumentIngestResult(
        text=text,
        pages=pages,
        metadata=metadata,
    )


_EXTRACTORS = {
    "pdf": _extract_pdf,
    "markdown": _extract_markdown,
    "text": _extract_text,
    "html": _extract_html,
}


def ingest_document(
    file_path: str | Path,
    format_override: str | None = None,
) -> DocumentIngestResult:
    """Ingest a document and extract its text content.

    Args:
        file_path: Path to the document file.
        format_override: Force a specific format (pdf, markdown, text, html).

    Returns:
        DocumentIngestResult with extracted text, pages, and metadata.
    """
    path = Path(file_path)

    if not path.exists():
        return DocumentIngestResult(
            text="",
            errors=[f"File not found: {path}"],
        )

    fmt = format_override or _detect_format(path)

    if fmt == "unknown":
        return DocumentIngestResult(
            text="",
            errors=[f"Unsupported file format: {path.suffix}"],
        )

    extractor = _EXTRACTORS.get(fmt)
    if not extractor:
        return DocumentIngestResult(
            text="",
            errors=[f"No extractor for format: {fmt}"],
        )

    return extractor(path)
