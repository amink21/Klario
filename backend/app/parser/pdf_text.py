"""Extract text and table rows from PDF using pdfplumber with PyMuPDF fallback."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import NamedTuple

import pdfplumber

logger = logging.getLogger(__name__)


class PageContent(NamedTuple):
    page_num: int
    text: str
    table_rows: list[list[str]]


def _extract_with_pdfplumber(pdf_path: str) -> list[PageContent]:
    """Extract text and tables per page via pdfplumber."""
    out: list[PageContent] = []
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            text = (page.extract_text() or "").strip()
            tables = page.extract_tables()
            rows: list[list[str]] = []
            for t in (tables or []):
                for row in t:
                    if row and any(cell and str(cell).strip() for cell in row):
                        rows.append([str(c or "").strip() for c in row])
            out.append(PageContent(page_num=i, text=text, table_rows=rows))
    return out


def _extract_with_fitz(pdf_path: str) -> list[PageContent]:
    """Fallback: extract text only via PyMuPDF (fitz)."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        return []
    out: list[PageContent] = []
    doc = fitz.open(pdf_path)
    try:
        for i in range(len(doc)):
            page = doc[i]
            text = page.get_text("text").strip()
            out.append(PageContent(page_num=i + 1, text=text, table_rows=[]))
    finally:
        doc.close()
    return out


def extract_all_content(pdf_path: str) -> list[PageContent]:
    """
    Extract text and table rows from each page. Uses pdfplumber first,
    then PyMuPDF if pdfplumber yields no or very little text.
    """
    content = _extract_with_pdfplumber(pdf_path)
    total_text = sum(len(p.text) for p in content)
    if total_text < 50 and content:
        logger.info("Low text from pdfplumber, trying PyMuPDF fallback")
        fitz_content = _extract_with_fitz(pdf_path)
        if fitz_content and sum(len(p.text) for p in fitz_content) > total_text:
            return fitz_content
    return content


def content_to_lines(content: list[PageContent], source: str = "") -> list[tuple[str, int]]:
    """
    Flatten pages into (line, page_num) pairs. Prefer table rows when present,
    then split page text by newline. Normalize whitespace.
    """
    lines: list[tuple[str, int]] = []
    for page in content:
        seen: set[str] = set()
        for row in page.table_rows:
            line = " ".join(cell for cell in row if cell).strip()
            if line and line not in seen:
                seen.add(line)
                lines.append((line, page.page_num))
        if not page.table_rows and page.text:
            for raw in page.text.splitlines():
                line = " ".join(raw.split()).strip()
                if line and line not in seen:
                    seen.add(line)
                    lines.append((line, page.page_num))
    return lines
