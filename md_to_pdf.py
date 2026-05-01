#!/usr/bin/env python3
"""Convert PRISM audit markdown to professional PDF with reportlab."""
import re
import textwrap
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, black, grey
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.lib import colors

INPUT = r"H:\PRISM-FINAL-AUDIT-CONTENT.md"
OUTPUT = r"H:\PRISM-Definitive-Audit-v5-FINAL.pdf"

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(grey)
    canvas.drawCentredString(letter[0]/2, letter[1] - 0.4*inch,
        "PRISM Manufacturing Intelligence Platform — Confidential")
    canvas.drawCentredString(letter[0]/2, 0.4*inch,
        f"Page {doc.page}")
    canvas.restoreState()

def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle('DocTitle', parent=styles['Title'], fontSize=22, spaceAfter=6, textColor=HexColor('#1a1a2e')))
    styles.add(ParagraphStyle('DocSubtitle', parent=styles['Normal'], fontSize=14, spaceAfter=12, textColor=HexColor('#16213e'), alignment=TA_CENTER))
    styles.add(ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16, spaceBefore=18, spaceAfter=8, textColor=HexColor('#0f3460')))
    styles.add(ParagraphStyle('H2', parent=styles['Heading2'], fontSize=13, spaceBefore=14, spaceAfter=6, textColor=HexColor('#1a1a2e')))
    styles.add(ParagraphStyle('H3', parent=styles['Heading3'], fontSize=11, spaceBefore=10, spaceAfter=4, textColor=HexColor('#16213e')))
    styles.add(ParagraphStyle('Body', parent=styles['Normal'], fontSize=9, leading=12, spaceAfter=4, alignment=TA_JUSTIFY))
    styles.add(ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=8, leading=10))
    styles.add(ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=8, leading=10, textColor=colors.white))
    styles.add(ParagraphStyle('CodeBlock', parent=styles['Normal'], fontSize=7, leading=9, fontName='Courier', leftIndent=12, spaceAfter=6, backColor=HexColor('#f5f5f5')))
    styles.add(ParagraphStyle('BulletItem', parent=styles['Normal'], fontSize=9, leading=12, leftIndent=18, bulletIndent=6, spaceAfter=2))
    styles.add(ParagraphStyle('MetaInfo', parent=styles['Normal'], fontSize=9, textColor=HexColor('#555555'), alignment=TA_CENTER, spaceAfter=4))
    return styles

def clean_text(t):
    t = t.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    # bold
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    # italic
    t = re.sub(r'\*(.+?)\*', r'<i>\1</i>', t)
    # inline code
    t = re.sub(r'`(.+?)`', r'<font face="Courier" size="8">\1</font>', t)
    return t

def parse_table(lines):
    """Parse markdown table lines into header + rows."""
    rows = []
    for line in lines:
        line = line.strip()
        if line.startswith('|') and line.endswith('|'):
            cells = [c.strip() for c in line.split('|')[1:-1]]
            # Skip separator rows
            if cells and all(re.match(r'^[-:]+$', c) for c in cells):
                continue
            rows.append(cells)
    if len(rows) < 1:
        return None, None
    return rows[0], rows[1:]

def make_table(header, data, styles):
    if not header or not data:
        return None
    ncols = len(header)
    # Normalize rows to same column count
    norm_data = []
    for row in data:
        while len(row) < ncols:
            row.append('')
        norm_data.append(row[:ncols])

    # Build table data with Paragraphs
    tdata = [[Paragraph(clean_text(c), styles['TableHeader']) for c in header]]
    for row in norm_data:
        tdata.append([Paragraph(clean_text(c), styles['TableCell']) for c in row])

    # Column widths - distribute evenly with some intelligence
    avail = 6.5 * inch
    col_widths = [avail / ncols] * ncols

    t = Table(tdata, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), HexColor('#0f3460')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTSIZE', (0,0), (-1,0), 8),
        ('FONTSIZE', (0,1), (-1,-1), 8),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#cccccc')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, HexColor('#f8f9fa')]),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    return t

def convert(input_path, output_path):
    styles = build_styles()

    with open(input_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    story = []
    i = 0
    in_code = False
    code_lines = []
    in_table = False
    table_lines = []

    while i < len(lines):
        line = lines[i].rstrip('\n')

        # Code blocks
        if line.strip().startswith('```'):
            if in_code:
                code_text = '<br/>'.join(clean_text(l) for l in code_lines)
                story.append(Paragraph(code_text, styles['CodeBlock']))
                code_lines = []
                in_code = False
            else:
                # Flush any table
                if in_table:
                    header, data = parse_table(table_lines)
                    tbl = make_table(header, data, styles)
                    if tbl:
                        story.append(tbl)
                        story.append(Spacer(1, 6))
                    table_lines = []
                    in_table = False
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # Table detection
        if line.strip().startswith('|') and '|' in line.strip()[1:]:
            if not in_table:
                in_table = True
                table_lines = []
            table_lines.append(line)
            i += 1
            continue
        elif in_table:
            header, data = parse_table(table_lines)
            tbl = make_table(header, data, styles)
            if tbl:
                story.append(tbl)
                story.append(Spacer(1, 6))
            table_lines = []
            in_table = False

        # Page breaks
        if '<div style="page-break-before: always;"></div>' in line:
            story.append(PageBreak())
            i += 1
            continue

        # Horizontal rules
        if line.strip() == '---':
            story.append(HRFlowable(width="100%", thickness=1, color=HexColor('#cccccc'), spaceAfter=8, spaceBefore=8))
            i += 1
            continue

        # Empty lines
        if not line.strip():
            i += 1
            continue

        # Headers
        if line.startswith('# ') and not line.startswith('## '):
            text = clean_text(line[2:].strip())
            if i < 3:
                story.append(Paragraph(text, styles['DocTitle']))
            else:
                story.append(Paragraph(text, styles['H1']))
            i += 1
            continue

        if line.startswith('## '):
            text = clean_text(line[3:].strip())
            if i < 5:
                story.append(Paragraph(text, styles['DocSubtitle']))
            else:
                story.append(Paragraph(text, styles['H2']))
            i += 1
            continue

        if line.startswith('### '):
            text = clean_text(line[4:].strip())
            story.append(Paragraph(text, styles['H3']))
            i += 1
            continue

        # Bullet points
        if line.strip().startswith('- ') or line.strip().startswith('* '):
            text = clean_text(line.strip()[2:])
            story.append(Paragraph(f"• {text}", styles['BulletItem']))
            i += 1
            continue

        # Numbered lists
        m = re.match(r'^\s*(\d+)\.\s+(.+)', line)
        if m:
            text = clean_text(m.group(2))
            story.append(Paragraph(f"{m.group(1)}. {text}", styles['BulletItem']))
            i += 1
            continue

        # Meta info lines (Classification, Date, etc.)
        if line.startswith('**Classification:') or line.startswith('**Date:') or line.startswith('**Platform'):
            text = clean_text(line.strip())
            story.append(Paragraph(text, styles['MetaInfo']))
            i += 1
            continue

        # Regular paragraph
        text = clean_text(line.strip())
        if text:
            story.append(Paragraph(text, styles['Body']))

        i += 1

    # Flush remaining table
    if in_table:
        header, data = parse_table(table_lines)
        tbl = make_table(header, data, styles)
        if tbl:
            story.append(tbl)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch,
        leftMargin=0.8*inch,
        rightMargin=0.8*inch,
        title="PRISM Manufacturing Intelligence Platform - Comprehensive Audit",
        author="PRISM Development Team"
    )
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"PDF generated: {output_path}")
    print(f"Pages: {doc.page}")

if __name__ == '__main__':
    convert(INPUT, OUTPUT)
