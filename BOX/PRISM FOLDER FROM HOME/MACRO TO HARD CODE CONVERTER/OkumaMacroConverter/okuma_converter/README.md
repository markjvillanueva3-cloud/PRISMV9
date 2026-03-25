# Okuma OSP Macro Program Converter

A Windows application that converts Okuma OSP-P300L-R macro programs (with V variables) 
to clean, hardcoded programs ready for the machine. The converter **interprets** the 
program flow, evaluates all conditionals, and outputs only the code that would actually 
execute - no IF, GOTO, or V variables in the output.

## Features

- **Full Program Interpretation**: Evaluates IF/GOTO logic and outputs only executed code paths
- **Variable Calculation**: Handles complex math expressions including:
  - Basic operations: +, -, *, /
  - Bracket notation: [expression]
  - Trigonometric functions: TAN, SIN, COS (in degrees)
  - SQRT, ABS functions
- **Clean Output**: No macro syntax in output - ready for the machine
  - Removes all V variable references
  - Removes all IF statements
  - Removes all GOTO statements
  - Removes branch-only N-number labels
  - Removes documentation comments
- **Smart Skipping**: Automatically excludes:
  - Optional operations (like Drill 2 when V31=0)
  - ID Roughing when disabled (V12=0)
  - Unused tool entries from header
- **Variable Inspector**: View all parsed variables and their calculated values
- **Adjustable Precision**: Control decimal places in output (1-6)

## Quick Start

### Option 1: Run with Python (No Build Required)

If you have Python 3.8+ installed:

1. Double-click `RUN_WITH_PYTHON.bat`
   
   OR open Command Prompt and run:
   ```
   python okuma_macro_converter.py
   ```

### Option 2: Build Windows Executable

1. Make sure Python 3.8+ is installed (https://www.python.org/downloads/)
   - IMPORTANT: Check "Add Python to PATH" during installation
   
2. Double-click `BUILD_WINDOWS_EXE.bat`

3. Wait for the build to complete

4. Find your executable at: `dist\OkumaMacroConverter.exe`

5. Copy `OkumaMacroConverter.exe` anywhere you like and run it!

## How to Use

1. **Open a Macro File**: Click "Open Macro File" and select your .MIN program

2. **Review Input**: The left panel shows your original macro program with V variables

3. **Convert**: Click "Convert" to process all variables and generate clean G-code

4. **Review Output**: The right panel shows the clean, hardcoded program

5. **Verify Variables**: Click "Show Variables" to see all calculated values

6. **Save**: Click "Save Output" to save the hardcoded program

## Example

**Input (Macro):**
```
V1 = 1.85
V2 = 1.755
V31 = 0              (DRILL 2 DISABLED)
...
IF [V31 EQ 0] GOTO N100
(DRILL 2 - T060606)
G0 X0. Z0.
...
N100 (FACE FINISH)
G0 X0. Z0.
```

**Output (Clean G-code):**
```
(FACE FINISH)
G0 X0. Z0.
```
*Note: Drill 2 section is completely removed because V31=0*

## What Gets Removed

| Item | Description |
|------|-------------|
| V## = expressions | All variable definitions |
| IF [...] GOTO N## | All conditional statements |
| GOTO N## | All unconditional jumps |
| N## (branch only) | Labels used only for branching |
| Documentation | Reference tables, helper comments |
| Skipped sections | Code blocks that wouldn't execute |

## What Gets Kept

| Item | Description |
|------|-------------|
| O#### | Program number |
| Tool header | List of used tools only |
| Operation comments | Like (DRILL 1 - T050505) |
| N## T###### | Tool call N-numbers |
| All G/M codes | With calculated values substituted |

## File Types Supported

- **Input**: .MIN, .NC, .TXT, or any text file
- **Output**: .MIN, .NC, .TXT

## Command Line Usage

You can also use the interpreter from command line:

```
python okuma_interpreter.py input.MIN output.MIN [decimal_places]
```

## Troubleshooting

### "Python not found" error
- Install Python from https://www.python.org/downloads/
- During installation, CHECK the box "Add Python to PATH"
- Restart your computer after installation

### Unexpected output
- Use "Show Variables" to verify all calculated values
- Check that conditional variables (V12, V31, etc.) are set correctly
- Verify the macro program runs correctly on the machine first

---
Created for Okuma OSP-P300L-R Control Systems
