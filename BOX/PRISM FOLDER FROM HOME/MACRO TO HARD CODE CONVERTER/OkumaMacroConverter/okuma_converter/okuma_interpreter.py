#!/usr/bin/env python3
"""
Okuma OSP Macro Program Converter
Converts macro programs with variables (V1, V2, etc.) to clean hardcoded programs.
Evaluates all conditionals and outputs only the executed code path.
No IF, GOTO, or V variables in output.
"""

import re
import math


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
            # Remove trailing zeros but keep at least one decimal place
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
        """
        Substitute all variable references and expressions with calculated values.
        Returns the processed line.
        """
        # Process bracket expressions (handle nested brackets)
        result = []
        i = 0
        while i < len(line):
            if line[i] == '[':
                end = self.find_matching_bracket(line, i)
                if end != -1:
                    inner = line[i+1:end]
                    # Evaluate the expression
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
        
        # Handle -V## (negative variable) - but be careful not to double-negate
        def replace_neg_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return self.format_number(-self.variables[var_num])
            return match.group(0)
        
        line = re.sub(r'-V(\d+)', replace_neg_var, line, flags=re.IGNORECASE)
        
        return line
    
    def parse_variable_definitions(self, lines):
        """
        Parse all variable definitions from the program lines.
        Returns the line indices that are variable definitions.
        """
        var_definition_lines = set()
        
        for idx, line in enumerate(lines):
            # Remove comments at end of line for parsing
            line_clean = re.sub(r'\([^)]*\)\s*$', '', line).strip()
            
            # Check for variable assignment: V## = value/expression
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
        """
        Build an index of N-number labels to line indices.
        """
        labels = {}
        for idx, line in enumerate(lines):
            # Match N## at start of line (with optional content after)
            match = re.match(r'^N(\d+)\b', line.strip())
            if match:
                label_num = int(match.group(1))
                labels[label_num] = idx
        return labels
    
    def is_tool_call_line(self, line):
        """Check if line contains a tool call (T######)."""
        return bool(re.search(r'\bT\d{6}\b', line))
    
    def is_branch_only_label(self, line):
        """
        Check if a line is ONLY an N-number label used for branching.
        Tool calls with N numbers should be kept.
        """
        stripped = line.strip()
        # Match lines that are just N## or N## followed by comment or whitespace
        if re.match(r'^N\d+\s*(\(.*\))?\s*$', stripped):
            return True
        return False
    
    def convert(self, program_text):
        """
        Convert macro program to clean hardcoded G-code.
        Evaluates all conditionals and outputs only executed code.
        """
        self.reset()
        
        lines = program_text.split('\n')
        
        # First pass: parse all variable definitions
        var_def_lines = self.parse_variable_definitions(lines)
        
        # Build label index for GOTO resolution
        labels = self.build_label_index(lines)
        
        # Second pass: interpret program flow
        output_lines = []
        pending_comments = []  # Comments waiting to be confirmed for output
        current_line = 0
        max_iterations = len(lines) * 10  # Safety limit
        iteration = 0
        
        while current_line < len(lines) and iteration < max_iterations:
            iteration += 1
            
            line = lines[current_line]
            stripped = line.strip()
            
            # Skip variable definition lines
            if current_line in var_def_lines:
                current_line += 1
                continue
            
            # Skip empty lines - add to pending (will be confirmed with next real code)
            if not stripped:
                pending_comments.append('')
                current_line += 1
                continue
            
            # Handle pure comment lines - add to pending
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
                    # Condition is true - jump to target (skip section)
                    # Discard pending comments since we're skipping
                    pending_comments = []
                    if target_label in labels:
                        current_line = labels[target_label]
                        continue
                    else:
                        self.errors.append(f"GOTO target N{target_label} not found")
                        current_line += 1
                        continue
                else:
                    # Condition is false - continue to next line (execute section)
                    # Discard this IF line, keep pending comments
                    current_line += 1
                    continue
            
            # Handle unconditional GOTO N##
            goto_match = re.match(r'^GOTO\s*N(\d+)$', stripped, re.IGNORECASE)
            if goto_match:
                target_label = int(goto_match.group(1))
                # Discard pending comments before a GOTO
                pending_comments = []
                if target_label in labels:
                    current_line = labels[target_label]
                    continue
                else:
                    self.errors.append(f"GOTO target N{target_label} not found")
                    current_line += 1
                    continue
            
            # Skip lines that are only branch target labels (not tool calls)
            if self.is_branch_only_label(line):
                # Don't output pending comments for branch-only labels
                pending_comments = []
                current_line += 1
                continue
            
            # This is a real code line - output pending comments first
            output_lines.extend(pending_comments)
            pending_comments = []
            
            # Process normal G-code line - substitute values
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
            self.warnings.append("Maximum iterations reached - possible infinite loop in macro")
        
        # Clean up output
        final_output = self.clean_output(output_lines)
        
        return final_output
    
    def clean_output(self, lines):
        """Clean up the output - remove documentation, excessive blank lines, and format properly."""
        result = []
        prev_blank = False
        skip_until_program_start = True
        in_reference_section = False
        
        for line in lines:
            stripped = line.strip()
            is_blank = not stripped
            
            # Skip multiple consecutive blank lines
            if is_blank and prev_blank:
                continue
            
            # Skip lines that are just section dividers from the parameter area
            if stripped.startswith('(='):
                continue
            
            # Skip parameter section header comments
            if '=============' in line:
                continue
            if 'ADJUSTABLE PARAMETERS' in line or 'AUTO-CALCULATIONS' in line:
                continue
            if 'PROGRAM START' in line:
                skip_until_program_start = False
                continue
            
            # Skip reference tables (DRILL SFM REFERENCE, FEED REFERENCE, etc.)
            if 'REFERENCE' in stripped.upper() and stripped.startswith('('):
                in_reference_section = True
                continue
            
            # Skip lines that are part of reference tables
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
            
            # Skip internal documentation/branch comments
            if stripped.startswith('(') and stripped.endswith(')'):
                upper = stripped.upper()
                # Skip these types of comments entirely
                if any(x in upper for x in [
                    'OKUMA ANGLES',
                    'V12=', 'V31=', 'V43=',  # Variable documentation
                    'SKIP FULL',
                    'SKIP IF',
                    'CHECK FOR',
                    'WITH CHAMFER',
                    'NO CHAMFER',
                    'WITH RADIUS',
                    'NO RADIUS',
                    'STRAIGHT DOWN',
                    'LEAD OUT',
                    'LEAD IN',
                    'RETRACT',
                    'COMP ON',
                    'COMP OFF',
                    'FINISH CYCLE USING',
                    'X ALREADY',
                    'X CLEARANCE',
                    'STOCK TO REMOVE',
                    'MANUAL WITH',
                    'MANUAL TOOLPATH',
                    'OD CHAMFER',
                    'OD RADIUS', 
                    'ID CHAMFER',
                    'ID RADIUS',
                    'CHAMFER OR RADIUS',
                    'CLEAR CUTOFF',
                    'FINISH CUTOFF',
                    'OPTIONAL',  # Skip optional section headers
                    'NO PECK',
                    'PECK',
                    'CANCEL COMP',
                    'ENGAGE COMP',
                ]):
                    continue
            
            # Skip content before G140 (or first G code) if still in header
            if skip_until_program_start:
                if stripped.startswith('G') or stripped.startswith('M244') or stripped.startswith('O'):
                    skip_until_program_start = False
                elif stripped.startswith('(T') and 'T0' in stripped:
                    skip_until_program_start = False
                else:
                    continue
            
            result.append(line)
            prev_blank = is_blank
        
        # Remove leading/trailing blank lines
        while result and not result[0].strip():
            result.pop(0)
        while result and not result[-1].strip():
            result.pop()
        
        return '\n'.join(result)


def convert_file(input_path, output_path=None, decimal_places=4):
    """
    Convert a macro file to hardcoded values.
    """
    with open(input_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    interpreter = OkumaMacroInterpreter()
    interpreter.decimal_places = decimal_places
    output = interpreter.convert(content)
    
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output)
    
    return output, interpreter.variables, interpreter.errors, interpreter.warnings


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python okuma_interpreter.py <input_file> [output_file] [decimal_places]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    decimal_places = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    
    output, variables, errors, warnings = convert_file(input_file, output_file, decimal_places)
    
    print(f"Parsed {len(variables)} variables")
    if errors:
        print(f"Errors: {len(errors)}")
        for err in errors[:5]:
            print(f"  - {err}")
    if warnings:
        print(f"Warnings: {len(warnings)}")
        for warn in warnings:
            print(f"  - {warn}")
    
    if output_file:
        print(f"Output written to: {output_file}")
    else:
        print("\n=== CONVERTED OUTPUT ===")
        print(output)
