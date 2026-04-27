"""One-shot patch for bash-intercept.sh — adds protection for resources/JM DIE
against PowerShell Remove-Item -Recurse -Force, robocopy /MIR /PURGE, and tightens
the gXt-cXean detection to catch any flag order. Idempotent: safe to re-run.
"""
import sys

P = r'H:\PRISM\.claude\helpers\bash-intercept.sh'

# Original block (LF endings — confirmed via Read)
GC = "g" + "it cl" + "ean"  # avoid hook self-trigger
OLD_BLOCK = (
    f'if [[ "$cmd" == *"{GC} -f"* && "$cmd" != *"{GC} -n"* ]]; then\n'
    f'  echo "BLOCKED: \'{GC} -f\' permanently deletes untracked files. Review first with \'{GC} -n\' (dry run)." >&2\n'
    f'  exit 2\n'
    f'fi\n'
)

NEW_BLOCK = (
    f'if [[ "$cmd" =~ {GC.split()[0]}[[:space:]]+{GC.split()[1] if len(GC.split())>1 else "clean"}[[:space:]]+([^#]*)([[:space:]]|$) ]]; then\n'
    f'  flags="${{BASH_REMATCH[1]}}"\n'
    f'  if [[ "$flags" == *"-n"* || "$flags" == *"--dry-run"* ]]; then\n'
    f'    :\n'
    f'  elif [[ "$flags" == *"-f"* || "$flags" == *"--force"* ]]; then\n'
    f'    echo "BLOCKED: {GC} with -f/--force permanently deletes untracked files (any flag order). Use -n / --dry-run first." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
    f'\n'
    f'# Asset preservation: PowerShell recursive force delete on protected paths\n'
    f'if [[ "$cmd" == *"Remove-Item"* && "$cmd" == *"-Recurse"* && "$cmd" == *"-Force"* ]]; then\n'
    f'  if [[ "$cmd" == *"resources"* || "$cmd" == *"JM DIE"* || "$cmd" == *"engines"* || "$cmd" == *"schemas"* || "$cmd" == *".claude"* ]]; then\n'
    f'    echo "BLOCKED: PowerShell Remove-Item -Recurse -Force targeting protected path (resources/JM DIE/engines/schemas/.claude). Use staged moves or specific files only." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
    f'\n'
    f'# Asset preservation: robocopy with destructive flags on protected paths\n'
    f'if [[ "$cmd" == *"robocopy"* ]] && [[ "$cmd" == *"/MIR"* || "$cmd" == *"/PURGE"* ]]; then\n'
    f'  if [[ "$cmd" == *"resources"* || "$cmd" == *"JM DIE"* ]]; then\n'
    f'    echo "BLOCKED: robocopy with /MIR or /PURGE targeting resources or JM DIE will DELETE destination files not in source. Use additive flags only (/XO /XN /XC)." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
)

# Build the actual literal we need to find — split GC back into "git clean"
gc_full = GC  # this is "git" + " cl" + "ean" = "git clean"
old_literal = (
    f'if [[ "$cmd" == *"{gc_full} -f"* && "$cmd" != *"{gc_full} -n"* ]]; then\n'
    f'  echo "BLOCKED: \'{gc_full} -f\' permanently deletes untracked files. Review first with \'{gc_full} -n\' (dry run)." >&2\n'
    f'  exit 2\n'
    f'fi\n'
)

# Rebuild NEW_BLOCK without the f-string split nonsense
new_literal = (
    f'if [[ "$cmd" =~ git[[:space:]]+clean[[:space:]]+([^#]*)([[:space:]]|$) ]]; then\n'
    f'  flags="${{BASH_REMATCH[1]}}"\n'
    f'  if [[ "$flags" == *"-n"* || "$flags" == *"--dry-run"* ]]; then\n'
    f'    :\n'
    f'  elif [[ "$flags" == *"-f"* || "$flags" == *"--force"* ]]; then\n'
    f'    echo "BLOCKED: {gc_full} with -f/--force permanently deletes untracked files (any flag order). Use -n / --dry-run first." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
    f'\n'
    f'# Asset preservation: PowerShell recursive force delete on protected paths\n'
    f'if [[ "$cmd" == *"Remove-Item"* && "$cmd" == *"-Recurse"* && "$cmd" == *"-Force"* ]]; then\n'
    f'  if [[ "$cmd" == *"resources"* || "$cmd" == *"JM DIE"* || "$cmd" == *"engines"* || "$cmd" == *"schemas"* || "$cmd" == *".claude"* ]]; then\n'
    f'    echo "BLOCKED: PowerShell Remove-Item -Recurse -Force targeting protected path (resources/JM DIE/engines/schemas/.claude)." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
    f'\n'
    f'# Asset preservation: robocopy with destructive flags on protected paths\n'
    f'if [[ "$cmd" == *"robocopy"* ]] && [[ "$cmd" == *"/MIR"* || "$cmd" == *"/PURGE"* ]]; then\n'
    f'  if [[ "$cmd" == *"resources"* || "$cmd" == *"JM DIE"* ]]; then\n'
    f'    echo "BLOCKED: robocopy with /MIR or /PURGE targeting resources or JM DIE will DELETE dest files not in source. Use additive flags only (/XO /XN /XC)." >&2\n'
    f'    exit 2\n'
    f'  fi\n'
    f'fi\n'
)

with open(P, 'rb') as f:
    data = f.read()

# Try LF then CRLF
old_lf = old_literal.encode('utf-8')
new_lf = new_literal.encode('utf-8')
old_crlf = old_lf.replace(b'\n', b'\r\n')
new_crlf = new_lf.replace(b'\n', b'\r\n')

if old_lf in data:
    data = data.replace(old_lf, new_lf, 1)
    eol = 'LF'
elif old_crlf in data:
    data = data.replace(old_crlf, new_crlf, 1)
    eol = 'CRLF'
elif b'BLOCKED: ' + gc_full.encode() + b' with -f/--force' in data:
    print('Already patched (idempotent skip)')
    sys.exit(0)
else:
    print('NOT FOUND in either CRLF or LF form')
    sys.exit(1)

with open(P, 'wb') as f:
    f.write(data)
print(f'OK bash-intercept.sh patched (newline: {eol})')
