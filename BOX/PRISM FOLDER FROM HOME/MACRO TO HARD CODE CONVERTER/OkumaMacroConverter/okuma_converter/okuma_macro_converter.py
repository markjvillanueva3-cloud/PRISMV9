#!/usr/bin/env python3
"""
Okuma OSP Macro Program Converter - GUI Application
Converts macro programs with variables (V1, V2, etc.) to clean hardcoded programs.
Evaluates all conditionals and outputs only the executed code path.
No IF, GOTO, or V variables in output.
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox, scrolledtext
import re
import math
import os


class OkumaMacroInterpreter:
    """Interpreter for Okuma OSP macro programs - evaluates and outputs clean G-code."""
    
    def __init__(self):
        self.variables = {}
        self.errors = []
        self.warnings = []
        self.decimal_places = 4
        
    def reset(self):
        """Reset interpreter state."""
        self.variables = {}
        self.errors = []
        self.warnings = []
    
    def evaluate_expression(self, expr):
        """
        Evaluate a mathematical expression with Okuma syntax.
        Uses brackets [] for grouping instead of parentheses.
        """
        expr = str(expr).strip()
        
        # First, replace all variable references with their values
        def replace_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return str(self.variables[var_num])
            else:
                self.errors.append(f"Undefined variable: V{var_num}")
                return "0"
        
        expr = re.sub(r'V(\d+)', replace_var, expr, flags=re.IGNORECASE)
        
        # Replace brackets with parentheses for evaluation
        expr = expr.replace('[', '(').replace(']', ')')
        
        # Handle TAN function (Okuma uses degrees)
        def replace_tan(match):
            angle_expr = match.group(1)
            try:
                angle = eval(angle_expr)
                return str(math.tan(math.radians(angle)))
            except:
                return "0"
        expr = re.sub(r'TAN\(([^)]+)\)', replace_tan, expr, flags=re.IGNORECASE)
        
        # Handle SIN function
        def replace_sin(match):
            angle_expr = match.group(1)
            try:
                angle = eval(angle_expr)
                return str(math.sin(math.radians(angle)))
            except:
                return "0"
        expr = re.sub(r'SIN\(([^)]+)\)', replace_sin, expr, flags=re.IGNORECASE)
        
        # Handle COS function
        def replace_cos(match):
            angle_expr = match.group(1)
            try:
                angle = eval(angle_expr)
                return str(math.cos(math.radians(angle)))
            except:
                return "0"
        expr = re.sub(r'COS\(([^)]+)\)', replace_cos, expr, flags=re.IGNORECASE)
        
        # Handle SQRT function
        def replace_sqrt(match):
            val_expr = match.group(1)
            try:
                val = eval(val_expr)
                return str(math.sqrt(val))
            except:
                return "0"
        expr = re.sub(r'SQRT\(([^)]+)\)', replace_sqrt, expr, flags=re.IGNORECASE)
        
        # Handle ABS function
        def replace_abs(match):
            val_expr = match.group(1)
            try:
                val = eval(val_expr)
                return str(abs(val))
            except:
                return "0"
        expr = re.sub(r'ABS\(([^)]+)\)', replace_abs, expr, flags=re.IGNORECASE)
        
        # Evaluate the expression
        try:
            result = eval(expr)
            return float(result)
        except Exception as e:
            self.errors.append(f"Error evaluating expression '{expr}': {e}")
            return 0.0
    
    def evaluate_condition(self, condition):
        """
        Evaluate a conditional expression like V80 LT 0.05.
        Returns True or False.
        """
        condition = condition.strip()
        
        # Map Okuma operators to Python
        operators = {
            ' LT ': ' < ',
            ' GT ': ' > ',
            ' EQ ': ' == ',
            ' NE ': ' != ',
            ' LE ': ' <= ',
            ' GE ': ' >= ',
        }
        
        expr = condition
        for okuma_op, python_op in operators.items():
            expr = re.sub(re.escape(okuma_op), python_op, expr, flags=re.IGNORECASE)
        
        # Replace variables with values
        def replace_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return str(self.variables[var_num])
            else:
                self.errors.append(f"Undefined variable in condition: V{var_num}")
                return "0"
        
        expr = re.sub(r'V(\d+)', replace_var, expr, flags=re.IGNORECASE)
        
        # Replace brackets with parentheses
        expr = expr.replace('[', '(').replace(']', ')')
        
        try:
            return bool(eval(expr))
        except Exception as e:
            self.errors.append(f"Error evaluating condition '{condition}': {e}")
            return False
    
    def format_number(self, value):
        """Format a number for G-code output."""
        if value == 0:
            return "0."
        
        # Round to specified decimal places
        rounded = round(value, self.decimal_places)
        
        # Format with appropriate precision
        if rounded == int(rounded):
            return f"{int(rounded)}."
        else:
            formatted = f"{rounded:.{self.decimal_places}f}".rstrip('0')
            if formatted.endswith('.'):
                formatted += '0'
            return formatted
    
    def find_matching_bracket(self, text, start):
        """Find the matching closing bracket for an opening bracket."""
        depth = 1
        i = start + 1
        while i < len(text) and depth > 0:
            if text[i] == '[':
                depth += 1
            elif text[i] == ']':
                depth -= 1
            i += 1
        return i - 1 if depth == 0 else -1
    
    def substitute_values_in_line(self, line):
        """Substitute all variable references and expressions with calculated values."""
        # Process bracket expressions (handle nested brackets)
        result = []
        i = 0
        while i < len(line):
            if line[i] == '[':
                end = self.find_matching_bracket(line, i)
                if end != -1:
                    inner = line[i+1:end]
                    value = self.evaluate_expression(inner)
                    result.append(self.format_number(value))
                    i = end + 1
                else:
                    result.append(line[i])
                    i += 1
            else:
                result.append(line[i])
                i += 1
        
        line = ''.join(result)
        
        # Replace standalone variable references
        def replace_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return self.format_number(self.variables[var_num])
            return match.group(0)
        
        line = re.sub(r'V(\d+)', replace_var, line, flags=re.IGNORECASE)
        
        # Handle -V## (negative variable)
        def replace_neg_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return self.format_number(-self.variables[var_num])
            return match.group(0)
        
        line = re.sub(r'-V(\d+)', replace_neg_var, line, flags=re.IGNORECASE)
        
        return line
    
    def parse_variable_definitions(self, lines):
        """Parse all variable definitions from the program lines."""
        var_definition_lines = set()
        
        for idx, line in enumerate(lines):
            line_clean = re.sub(r'\([^)]*\)\s*$', '', line).strip()
            
            var_match = re.match(r'^V(\d+)\s*=\s*(.+)$', line_clean, re.IGNORECASE)
            if var_match:
                var_num = int(var_match.group(1))
                value_expr = var_match.group(2).strip()
                
                try:
                    value = self.evaluate_expression(value_expr)
                    self.variables[var_num] = value
                except Exception as e:
                    self.errors.append(f"Error parsing V{var_num} = {value_expr}: {e}")
                
                var_definition_lines.add(idx)
        
        return var_definition_lines
    
    def build_label_index(self, lines):
        """Build an index of N-number labels to line indices."""
        labels = {}
        for idx, line in enumerate(lines):
            match = re.match(r'^N(\d+)\b', line.strip())
            if match:
                label_num = int(match.group(1))
                labels[label_num] = idx
        return labels
    
    def is_tool_call_line(self, line):
        """Check if line contains a tool call (T######)."""
        return bool(re.search(r'\bT\d{6}\b', line))
    
    def is_branch_only_label(self, line):
        """Check if a line is ONLY an N-number label used for branching."""
        stripped = line.strip()
        if re.match(r'^N\d+\s*(\(.*\))?\s*$', stripped):
            return True
        return False
    
    def convert(self, program_text):
        """Convert macro program to clean hardcoded G-code."""
        self.reset()
        
        lines = program_text.split('\n')
        
        # First pass: parse all variable definitions
        var_def_lines = self.parse_variable_definitions(lines)
        
        # Build label index for GOTO resolution
        labels = self.build_label_index(lines)
        
        # Second pass: interpret program flow
        output_lines = []
        pending_comments = []
        current_line = 0
        max_iterations = len(lines) * 10
        iteration = 0
        
        while current_line < len(lines) and iteration < max_iterations:
            iteration += 1
            
            line = lines[current_line]
            stripped = line.strip()
            
            # Skip variable definition lines
            if current_line in var_def_lines:
                current_line += 1
                continue
            
            # Handle empty lines
            if not stripped:
                pending_comments.append('')
                current_line += 1
                continue
            
            # Handle pure comment lines
            if stripped.startswith('(') and not re.search(r'^N\d+\s*\(', stripped):
                pending_comments.append(line)
                current_line += 1
                continue
            
            # Handle IF [condition] GOTO N##
            if_match = re.match(r'^.*IF\s*\[([^\]]+)\]\s*GOTO\s*N(\d+)', stripped, re.IGNORECASE)
            if if_match:
                condition = if_match.group(1)
                target_label = int(if_match.group(2))
                
                if self.evaluate_condition(condition):
                    pending_comments = []
                    if target_label in labels:
                        current_line = labels[target_label]
                        continue
                    else:
                        self.errors.append(f"GOTO target N{target_label} not found")
                        current_line += 1
                        continue
                else:
                    current_line += 1
                    continue
            
            # Handle unconditional GOTO N##
            goto_match = re.match(r'^GOTO\s*N(\d+)$', stripped, re.IGNORECASE)
            if goto_match:
                target_label = int(goto_match.group(1))
                pending_comments = []
                if target_label in labels:
                    current_line = labels[target_label]
                    continue
                else:
                    self.errors.append(f"GOTO target N{target_label} not found")
                    current_line += 1
                    continue
            
            # Skip branch-only labels
            if self.is_branch_only_label(line):
                pending_comments = []
                current_line += 1
                continue
            
            # Real code line - output pending comments first
            output_lines.extend(pending_comments)
            pending_comments = []
            
            # Process line - substitute values
            processed_line = self.substitute_values_in_line(line)
            
            # Clean up N-numbers that were only for branching
            if not self.is_tool_call_line(processed_line):
                n_match = re.match(r'^N\d+\s+(.+)$', processed_line.strip())
                if n_match:
                    content_after = n_match.group(1)
                    if not re.match(r'^T\d{6}', content_after) and not content_after.startswith('('):
                        processed_line = content_after
            
            output_lines.append(processed_line)
            current_line += 1
        
        if iteration >= max_iterations:
            self.warnings.append("Maximum iterations reached - possible infinite loop")
        
        # Clean up output
        return self.clean_output(output_lines)
    
    def clean_output(self, lines):
        """Clean up the output - remove documentation, format properly."""
        result = []
        prev_blank = False
        skip_until_program_start = True
        in_reference_section = False
        
        for line in lines:
            stripped = line.strip()
            is_blank = not stripped
            
            if is_blank and prev_blank:
                continue
            
            if stripped.startswith('(='):
                continue
            
            if '=============' in line:
                continue
            if 'ADJUSTABLE PARAMETERS' in line or 'AUTO-CALCULATIONS' in line:
                continue
            if 'PROGRAM START' in line:
                skip_until_program_start = False
                continue
            
            if 'REFERENCE' in stripped.upper() and stripped.startswith('('):
                in_reference_section = True
                continue
            
            if in_reference_section:
                if stripped.startswith('(') and (
                    re.search(r'\d.*=.*\d', stripped) or
                    'MULTIPLY BY' in stripped.upper() or
                    'MATERIAL' in stripped.upper() or
                    re.search(r'\d{2,}/\d{2,}', stripped) or
                    '-' in stripped and re.search(r'[A-Z].*STEEL', stripped.upper())
                ):
                    continue
                else:
                    in_reference_section = False
            
            if stripped.startswith('(') and stripped.endswith(')'):
                upper = stripped.upper()
                if any(x in upper for x in [
                    'OKUMA ANGLES', 'V12=', 'V31=', 'V43=',
                    'SKIP FULL', 'SKIP IF', 'CHECK FOR',
                    'WITH CHAMFER', 'NO CHAMFER', 'WITH RADIUS', 'NO RADIUS',
                    'STRAIGHT DOWN', 'LEAD OUT', 'LEAD IN', 'RETRACT',
                    'COMP ON', 'COMP OFF', 'FINISH CYCLE USING',
                    'X ALREADY', 'X CLEARANCE', 'STOCK TO REMOVE',
                    'MANUAL WITH', 'MANUAL TOOLPATH',
                    'OD CHAMFER', 'OD RADIUS', 'ID CHAMFER', 'ID RADIUS',
                    'CHAMFER OR RADIUS', 'CLEAR CUTOFF', 'FINISH CUTOFF',
                    'OPTIONAL', 'NO PECK', 'CANCEL COMP', 'ENGAGE COMP',
                ]):
                    continue
            
            if skip_until_program_start:
                if stripped.startswith('G') or stripped.startswith('M244') or stripped.startswith('O'):
                    skip_until_program_start = False
                elif stripped.startswith('(T') and 'T0' in stripped:
                    skip_until_program_start = False
                else:
                    continue
            
            result.append(line)
            prev_blank = is_blank
        
        while result and not result[0].strip():
            result.pop(0)
        while result and not result[-1].strip():
            result.pop()
        
        return '\n'.join(result)


class OkumaConverterGUI:
    """GUI Application for Okuma Macro Converter."""
    
    # Dark mode color scheme
    COLORS = {
        'bg_dark': '#1e1e1e',
        'bg_medium': '#252526',
        'bg_light': '#2d2d30',
        'bg_highlight': '#3e3e42',
        'fg_primary': '#d4d4d4',
        'fg_secondary': '#9d9d9d',
        'accent': '#0e639c',
        'accent_hover': '#1177bb',
        'border': '#3e3e42',
        'text_bg': '#1e1e1e',
        'text_fg': '#d4d4d4',
        'select_bg': '#264f78',
        'button_bg': '#0e639c',
        'button_fg': '#ffffff',
    }
    
    def __init__(self, root):
        self.root = root
        self.root.title("Okuma OSP Macro Program Converter")
        self.root.geometry("1200x800")
        self.root.minsize(900, 600)
        
        self.interpreter = OkumaMacroInterpreter()
        self.current_file = None
        self.decimal_places = tk.IntVar(value=4)
        
        self.setup_dark_theme()
        self.setup_ui()
        
    def setup_dark_theme(self):
        """Configure dark mode styling."""
        self.root.configure(bg=self.COLORS['bg_dark'])
        
        style = ttk.Style()
        style.theme_use('clam')
        
        # Configure main frame styles
        style.configure('TFrame', background=self.COLORS['bg_dark'])
        style.configure('TLabelframe', background=self.COLORS['bg_dark'], 
                       foreground=self.COLORS['fg_primary'])
        style.configure('TLabelframe.Label', background=self.COLORS['bg_dark'], 
                       foreground=self.COLORS['fg_primary'], font=('Segoe UI', 10, 'bold'))
        
        # Configure button styles
        style.configure('TButton', 
                       background=self.COLORS['button_bg'],
                       foreground=self.COLORS['button_fg'],
                       borderwidth=0,
                       focuscolor='none',
                       padding=(12, 6))
        style.map('TButton',
                 background=[('active', self.COLORS['accent_hover']), 
                            ('pressed', self.COLORS['accent'])],
                 foreground=[('active', self.COLORS['button_fg'])])
        
        # Configure label styles
        style.configure('TLabel', 
                       background=self.COLORS['bg_dark'], 
                       foreground=self.COLORS['fg_primary'])
        
        # Configure entry/spinbox styles
        style.configure('TSpinbox',
                       fieldbackground=self.COLORS['bg_light'],
                       background=self.COLORS['bg_light'],
                       foreground=self.COLORS['fg_primary'],
                       arrowcolor=self.COLORS['fg_primary'],
                       bordercolor=self.COLORS['border'],
                       lightcolor=self.COLORS['bg_light'],
                       darkcolor=self.COLORS['bg_light'])
        
        # Configure separator
        style.configure('TSeparator', background=self.COLORS['border'])
        
        # Configure panedwindow
        style.configure('TPanedwindow', background=self.COLORS['bg_dark'])
        
        # Configure scrollbar
        style.configure('Vertical.TScrollbar',
                       background=self.COLORS['bg_light'],
                       troughcolor=self.COLORS['bg_dark'],
                       bordercolor=self.COLORS['bg_dark'],
                       arrowcolor=self.COLORS['fg_primary'])
        style.configure('Horizontal.TScrollbar',
                       background=self.COLORS['bg_light'],
                       troughcolor=self.COLORS['bg_dark'],
                       bordercolor=self.COLORS['bg_dark'],
                       arrowcolor=self.COLORS['fg_primary'])
        
        # Status bar style
        style.configure('Status.TLabel',
                       background=self.COLORS['bg_medium'],
                       foreground=self.COLORS['fg_secondary'],
                       padding=(10, 5))
        
        # Treeview style (for variables window)
        style.configure('Treeview',
                       background=self.COLORS['bg_light'],
                       foreground=self.COLORS['fg_primary'],
                       fieldbackground=self.COLORS['bg_light'],
                       borderwidth=0)
        style.configure('Treeview.Heading',
                       background=self.COLORS['bg_highlight'],
                       foreground=self.COLORS['fg_primary'],
                       borderwidth=0)
        style.map('Treeview',
                 background=[('selected', self.COLORS['select_bg'])],
                 foreground=[('selected', self.COLORS['fg_primary'])])
        
    def setup_ui(self):
        """Setup the user interface."""
        self.root.grid_columnconfigure(0, weight=1)
        self.root.grid_rowconfigure(1, weight=1)
        
        # Top frame for controls
        control_frame = ttk.Frame(self.root, padding="10")
        control_frame.grid(row=0, column=0, sticky="ew")
        
        ttk.Button(control_frame, text="📂 Open Macro File", command=self.open_file).pack(side=tk.LEFT, padx=5)
        ttk.Button(control_frame, text="⚡ Convert", command=self.convert).pack(side=tk.LEFT, padx=5)
        ttk.Button(control_frame, text="💾 Save Output", command=self.save_output).pack(side=tk.LEFT, padx=5)
        
        ttk.Separator(control_frame, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=15)
        
        ttk.Label(control_frame, text="Decimal Places:").pack(side=tk.LEFT, padx=5)
        decimal_spinbox = ttk.Spinbox(control_frame, from_=1, to=6, width=5, 
                                       textvariable=self.decimal_places)
        decimal_spinbox.pack(side=tk.LEFT, padx=5)
        
        ttk.Separator(control_frame, orient=tk.VERTICAL).pack(side=tk.LEFT, fill=tk.Y, padx=15)
        
        ttk.Button(control_frame, text="📋 Show Variables", command=self.show_variables).pack(side=tk.LEFT, padx=5)
        
        # Main content frame with paned window
        paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        paned.grid(row=1, column=0, sticky="nsew", padx=10, pady=(0, 5))
        
        # Left frame - Input
        left_frame = ttk.LabelFrame(paned, text=" INPUT (Macro Program) ", padding="5")
        paned.add(left_frame, weight=1)
        
        self.input_text = scrolledtext.ScrolledText(
            left_frame, 
            wrap=tk.NONE, 
            font=("Consolas", 11),
            bg=self.COLORS['text_bg'],
            fg=self.COLORS['text_fg'],
            insertbackground=self.COLORS['fg_primary'],
            selectbackground=self.COLORS['select_bg'],
            selectforeground=self.COLORS['fg_primary'],
            relief=tk.FLAT,
            borderwidth=0,
            padx=10,
            pady=10
        )
        self.input_text.pack(fill=tk.BOTH, expand=True)
        
        input_xscroll = ttk.Scrollbar(left_frame, orient=tk.HORIZONTAL, command=self.input_text.xview)
        input_xscroll.pack(fill=tk.X)
        self.input_text.configure(xscrollcommand=input_xscroll.set)
        
        # Right frame - Output
        right_frame = ttk.LabelFrame(paned, text=" OUTPUT (Clean Hardcoded Program) ", padding="5")
        paned.add(right_frame, weight=1)
        
        self.output_text = scrolledtext.ScrolledText(
            right_frame, 
            wrap=tk.NONE, 
            font=("Consolas", 11),
            bg=self.COLORS['text_bg'],
            fg='#98c379',  # Green tint for output
            insertbackground=self.COLORS['fg_primary'],
            selectbackground=self.COLORS['select_bg'],
            selectforeground=self.COLORS['fg_primary'],
            relief=tk.FLAT,
            borderwidth=0,
            padx=10,
            pady=10
        )
        self.output_text.pack(fill=tk.BOTH, expand=True)
        
        output_xscroll = ttk.Scrollbar(right_frame, orient=tk.HORIZONTAL, command=self.output_text.xview)
        output_xscroll.pack(fill=tk.X)
        self.output_text.configure(xscrollcommand=output_xscroll.set)
        
        # Status bar
        self.status_var = tk.StringVar(value="Ready - Open a macro file to begin")
        status_bar = ttk.Label(self.root, textvariable=self.status_var, style='Status.TLabel')
        status_bar.grid(row=2, column=0, sticky="ew")
        
    def open_file(self):
        """Open a macro program file."""
        filetypes = [
            ("All CNC Files", "*.min *.MIN *.nc *.NC *.txt *.TXT"),
            ("Okuma Files", "*.min *.MIN"),
            ("NC Files", "*.nc *.NC"),
            ("Text Files", "*.txt *.TXT"),
            ("All Files", "*.*")
        ]
        
        filename = filedialog.askopenfilename(
            title="Open Okuma Macro Program",
            filetypes=filetypes
        )
        
        if filename:
            try:
                with open(filename, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                
                self.input_text.delete(1.0, tk.END)
                self.input_text.insert(1.0, content)
                self.current_file = filename
                self.status_var.set(f"Loaded: {os.path.basename(filename)}")
                
                self.output_text.delete(1.0, tk.END)
                
            except Exception as e:
                messagebox.showerror("Error", f"Could not open file:\n{e}")
    
    def convert(self):
        """Convert the macro program to clean hardcoded G-code."""
        input_text = self.input_text.get(1.0, tk.END)
        
        if not input_text.strip():
            messagebox.showwarning("Warning", "No input program to convert.")
            return
        
        try:
            self.interpreter.decimal_places = self.decimal_places.get()
            output = self.interpreter.convert(input_text)
            
            if self.interpreter.errors:
                error_msg = "Parsing warnings:\n" + "\n".join(self.interpreter.errors[:10])
                if len(self.interpreter.errors) > 10:
                    error_msg += f"\n... and {len(self.interpreter.errors) - 10} more"
                messagebox.showwarning("Parsing Warnings", error_msg)
            
            self.output_text.delete(1.0, tk.END)
            self.output_text.insert(1.0, output)
            
            var_count = len(self.interpreter.variables)
            self.status_var.set(f"Conversion complete - {var_count} variables processed, clean G-code generated")
            
        except Exception as e:
            messagebox.showerror("Error", f"Conversion failed:\n{e}")
    
    def save_output(self):
        """Save the converted program to a file."""
        output_text = self.output_text.get(1.0, tk.END)
        
        if not output_text.strip():
            messagebox.showwarning("Warning", "No output to save.")
            return
        
        default_name = "converted_program.MIN"
        if self.current_file:
            base = os.path.splitext(os.path.basename(self.current_file))[0]
            default_name = f"{base}_HARDCODED.MIN"
        
        filetypes = [
            ("Okuma Files", "*.min *.MIN"),
            ("NC Files", "*.nc *.NC"),
            ("Text Files", "*.txt *.TXT"),
            ("All Files", "*.*")
        ]
        
        filename = filedialog.asksaveasfilename(
            title="Save Hardcoded Program",
            defaultextension=".MIN",
            initialfile=default_name,
            filetypes=filetypes
        )
        
        if filename:
            try:
                with open(filename, 'w', encoding='utf-8') as f:
                    f.write(output_text)
                self.status_var.set(f"Saved: {os.path.basename(filename)}")
                messagebox.showinfo("Success", f"File saved successfully:\n{filename}")
            except Exception as e:
                messagebox.showerror("Error", f"Could not save file:\n{e}")
    
    def show_variables(self):
        """Show a window with all parsed variables and their values."""
        input_text = self.input_text.get(1.0, tk.END)
        
        if not input_text.strip():
            messagebox.showwarning("Warning", "No input program to parse.")
            return
        
        # Parse variables
        self.interpreter.reset()
        lines = input_text.split('\n')
        self.interpreter.parse_variable_definitions(lines)
        
        # Create variable display window
        var_window = tk.Toplevel(self.root)
        var_window.title("Variable Values")
        var_window.geometry("550x650")
        var_window.transient(self.root)
        var_window.configure(bg=self.COLORS['bg_dark'])
        
        # Header
        header = tk.Label(var_window, 
                         text="📊 Parsed Variables",
                         font=('Segoe UI', 14, 'bold'),
                         bg=self.COLORS['bg_dark'],
                         fg=self.COLORS['fg_primary'],
                         pady=10)
        header.pack()
        
        frame = ttk.Frame(var_window, padding="10")
        frame.pack(fill=tk.BOTH, expand=True)
        
        columns = ("Variable", "Value")
        tree = ttk.Treeview(frame, columns=columns, show="headings", height=25)
        tree.heading("Variable", text="Variable")
        tree.heading("Value", text="Value")
        tree.column("Variable", width=120, anchor=tk.CENTER)
        tree.column("Value", width=380, anchor=tk.W)
        
        scrollbar = ttk.Scrollbar(frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=scrollbar.set)
        
        tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        for var_num in sorted(self.interpreter.variables.keys()):
            value = self.interpreter.variables[var_num]
            tree.insert("", tk.END, values=(f"V{var_num}", f"{value:.6f}"))
        
        # Bottom frame
        bottom_frame = tk.Frame(var_window, bg=self.COLORS['bg_dark'])
        bottom_frame.pack(fill=tk.X, pady=10)
        
        summary = tk.Label(bottom_frame, 
                          text=f"Total: {len(self.interpreter.variables)} variables",
                          font=('Segoe UI', 10),
                          bg=self.COLORS['bg_dark'],
                          fg=self.COLORS['fg_secondary'])
        summary.pack()
        
        def copy_variables():
            lines = [f"V{k} = {v:.6f}" for k, v in sorted(self.interpreter.variables.items())]
            text = "\n".join(lines)
            var_window.clipboard_clear()
            var_window.clipboard_append(text)
            messagebox.showinfo("Copied", "Variables copied to clipboard")
        
        ttk.Button(bottom_frame, text="📋 Copy to Clipboard", command=copy_variables).pack(pady=10)


def main():
    """Main entry point."""
    root = tk.Tk()
    
    try:
        root.iconbitmap(default='')
    except:
        pass
    
    app = OkumaConverterGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
