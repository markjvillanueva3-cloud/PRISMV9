import os
import glob

# Common UTF-8 double-encoded patterns -> correct characters
replacements = {
    # Em dash variants
    '\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00a2\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00ac\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00a2\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00ac\u00c3\u0083\u00c2\u00a2\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00ac\u00c3\u0083\u00e2\u0080\u00a0\u00c3\u0082\u00e2\u0080\u0099': '\u2014',
    '\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00ac\u00c3\u0083\u00c2\u00a2\u00c3\u0083\u00c2\u00a2\u00c3\u00a2\u00e2\u0082\u00ac\u00c5\u00a1\u00c3\u0082\u00c2\u00ac\u00c3\u0083\u00e2\u0080\u00a0\u00c3\u0082\u00e2\u0080\u0099': '\u2019',
}

# Simpler approach: find all garbled byte sequences and map to clean chars
simple_replacements = {
    # These are the actual garbled strings seen in the files
    'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â ': '\u2014 ',  # em dash
    'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"': '\u2014',  # em dash
    'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Âœ': '\u2014',  # em dash  
    'ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢': '\u2192',  # right arrow →
    'ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â¥': '\u2265',  # >=
    'ÃƒÂ¢Ã¢â‚¬Â°Ã‚Â ': '\u2260',  # not equal
    'ÃƒÆ'Ã¢â‚¬â€': '\u00d7',  # multiplication ×
    'Ã…â€œÃ¢â‚¬Å"': '\u2713',  # checkmark
    'ÃƒÅ½Ã‚Â©': '\u03a9',  # omega Ω
    'Ãƒâ€šÃ‚Â§': '\u00a7',  # section §
    'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â': '\u2014',  # em dash (without trailing space)
    'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬': '\u2014',  # another variant
    # Arrow variants
    'u{2192}': '\u2192',  # →
    'u{2014}': '\u2014',  # —
    # BOM
    '\ufeff': '',
}

roadmap_dir = r'C:\PRISM\mcp-server\data\docs\roadmap'
files = glob.glob(os.path.join(roadmap_dir, 'PHASE_R*.md'))
files += glob.glob(os.path.join(roadmap_dir, 'PHASE_DA*.md'))
files += glob.glob(os.path.join(roadmap_dir, 'PHASE_P0*.md'))
files += glob.glob(os.path.join(roadmap_dir, 'PRISM_RECOVERY_CARD.md'))
files += glob.glob(os.path.join(roadmap_dir, 'ROADMAP_INSTRUCTIONS.md'))
files += glob.glob(os.path.join(roadmap_dir, 'PHASE_TEMPLATE.md'))

total_fixes = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    for garbled, clean in simple_replacements.items():
        content = content.replace(garbled, clean)
    
    if content != original:
        fixes = sum(1 for g in simple_replacements if g in original)
        total_fixes += fixes
        with open(filepath, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
        print(f"FIXED: {os.path.basename(filepath)} ({fixes} pattern types)")
    else:
        print(f"CLEAN: {os.path.basename(filepath)}")

print(f"\nTotal files processed: {len(files)}")
print(f"Pattern types fixed: {total_fixes}")
