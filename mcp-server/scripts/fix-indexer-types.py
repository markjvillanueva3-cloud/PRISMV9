#!/usr/bin/env python3
"""Fix CADFileIndexerEngine type errors - MasterIndex uses 'files' not 'entries'"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# Fix: index.entries -> index.files
raw = raw.replace(b'index.entries.length', b'index.files.length')
raw = raw.replace(b'index.entries)', b'index.files)')

# Fix: index.diff -> index.lastDiff
raw = raw.replace(b'diff: index.diff,', b'diff: index.lastDiff,')

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('Fixed CADFileIndexerEngine type errors')
