#!/usr/bin/env python3
"""
Okuma OSP Macro Parser - Core Logic
Standalone module for parsing and converting macro programs.
"""

import re
import math


class OkumaMacroParser:
    """Parser for Okuma OSP macro programs."""
    
    def __init__(self):
        self.variables = {}
        self.errors = []
        
    def reset(self):
        """Reset parser state."""
        self.variables = {}
        self.errors = []
    
    def parse_value(self, expr):
        """
        Parse and evaluate a value expression.
        Handles numbers, variables, and math expressions.
        """
        expr = str(expr).strip()
        
        # Direct number
        try:
            return float(expr)
        except ValueError:
            pass
        
        # Variable reference (V followed by digits)
        var_match = re.match(r'^V(\d+)$', expr, re.IGNORECASE)
        if var_match:
            var_num = int(var_match.group(1))
            if var_num in self.variables:
                return self.variables[var_num]
            else:
                self.errors.append(f"Undefined variable: V{var_num}")
                return 0.0
        
        # Negative variable reference
        neg_var_match = re.match(r'^-V(\d+)$', expr, re.IGNORECASE)
        if neg_var_match:
            var_num = int(neg_var_match.group(1))
            if var_num in self.variables:
                return -self.variables[var_num]
            else:
                self.errors.append(f"Undefined variable: V{var_num}")
                return 0.0
        
        # Expression with brackets - evaluate recursively
        return self.evaluate_expression(expr)
    
    def evaluate_expression(self, expr):
        """
        Evaluate a mathematical expression with Okuma syntax.
        Uses brackets [] for grouping instead of parentheses.
        """
        expr = str(expr).strip()
        
        # First, replace all variable references with their values
        # This needs to happen before bracket conversion to handle nested expressions
        def replace_var(match):
            var_num = int(match.group(1))
            if var_num in self.variables:
                return str(self.variables[var_num])
            else:
                self.errors.append(f"Undefined variable: V{var_num}")
                return "0"
        
        expr = re.sub(r'V(\d+)', replace_var, expr, flags=re.IGNORECASE)
        
        # Now replace brackets with parentheses for evaluation
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
    
    def parse_variable_definitions(self, program_text):
        """
        Parse all variable definitions from the program.
        Format: V## = value or V## = expression
        """
        self.reset()
        
        lines = program_text.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Remove comments (text in parentheses at end of line)
            line_clean = re.sub(r'\([^)]*\)\s*$', '', line).strip()
            
            # Check for variable assignment
            # Match: V## = value/expression
            var_match = re.match(r'^V(\d+)\s*=\s*(.+)$', line_clean, re.IGNORECASE)
            if var_match:
                var_num = int(var_match.group(1))
                value_expr = var_match.group(2).strip()
                
                try:
                    value = self.parse_value(value_expr)
                    self.variables[var_num] = value
                except Exception as e:
                    self.errors.append(f"Line {line_num}: Error parsing V{var_num} = {value_expr}: {e}")
        
        return self.variables
    
    def format_number(self, value, decimal_places=4):
        """Format a number for G-code output."""
        if value == 0:
            return "0."
        
        # Round to specified decimal places
        rounded = round(value, decimal_places)
        
        # Format with appropriate precision
        if rounded == int(rounded):
            return f"{int(rounded)}."
        else:
            # Remove trailing zeros but keep at least one decimal place
            formatted = f"{rounded:.{decimal_places}f}".rstrip('0')
            if formatted.endswith('.'):
                formatted += '0'
            return formatted
    
    def substitute_in_conditional(self, condition_text, decimal_places=4):
        """
        Substitute variables in a conditional expression like [V80 LT 0.05].
        Preserves the comparison operators (LT, GT, EQ, NE, LE, GE).
        """
        # Split by comparison operators
        operators = ['LT', 'GT', 'EQ', 'NE', 'LE', 'GE']
        
        for op in operators:
            if f' {op} ' in condition_text.upper():
                parts = re.split(rf'\s+{op}\s+', condition_text, flags=re.IGNORECASE)
                if len(parts) == 2:
                    left = self.substitute_single_value(parts[0].strip(), decimal_places)
                    right = self.substitute_single_value(parts[1].strip(), decimal_places)
                    return f'{left} {op} {right}'
        
        # No operator found, just substitute values
        return self.substitute_single_value(condition_text, decimal_places)
    
    def substitute_single_value(self, expr, decimal_places=4):
        """
        Substitute variables in a single value/expression (not a conditional).
        """
        expr = str(expr).strip()
        
        # Check if it's a variable reference
        var_match = re.match(r'^V(\d+)$', expr, re.IGNORECASE)
        if var_match:
            var_num = int(var_match.group(1))
            if var_num in self.variables:
                return self.format_number(self.variables[var_num], decimal_places)
            return expr
        
        # Check if it's a negative variable
        neg_var_match = re.match(r'^-V(\d+)$', expr, re.IGNORECASE)
        if neg_var_match:
            var_num = int(neg_var_match.group(1))
            if var_num in self.variables:
                return self.format_number(-self.variables[var_num], decimal_places)
            return expr
        
        # Check if it's a simple number
        try:
            float(expr)
            return expr
        except:
            pass
        
        # It's an expression - evaluate it
        if re.search(r'V\d+', expr, re.IGNORECASE):
            result = self.evaluate_expression(expr)
            return self.format_number(result, decimal_places)
        
        return expr
    
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
    
    def substitute_variables(self, program_text, decimal_places=4):
        """
        Substitute all variable references with their calculated values.
        """
        lines = program_text.split('\n')
        output_lines = []
        
        for line in lines:
            # Skip variable definition lines
            if re.match(r'^V\d+\s*=', line.strip(), re.IGNORECASE):
                continue
            
            # Skip empty lines or comment-only lines
            stripped = line.strip()
            if not stripped or stripped.startswith('('):
                output_lines.append(line)
                continue
            
            # Process the line
            new_line = line
            
            # Handle IF [condition] GOTO statements specially
            if_match = re.match(r'^(.*IF\s*)\[([^\]]+)\](\s*GOTO.*)$', new_line, re.IGNORECASE)
            if if_match:
                prefix = if_match.group(1)
                condition = if_match.group(2)
                suffix = if_match.group(3)
                substituted_condition = self.substitute_in_conditional(condition, decimal_places)
                new_line = f'{prefix}[{substituted_condition}]{suffix}'
                output_lines.append(new_line)
                continue
            
            # Process bracket expressions (handle nested brackets)
            result = []
            i = 0
            while i < len(new_line):
                if new_line[i] == '[':
                    end = self.find_matching_bracket(new_line, i)
                    if end != -1:
                        inner = new_line[i+1:end]
                        # Check if expression contains any V variables
                        if re.search(r'V\d+', inner, re.IGNORECASE):
                            value = self.evaluate_expression(inner)
                            result.append(self.format_number(value, decimal_places))
                        else:
                            result.append(new_line[i:end+1])
                        i = end + 1
                    else:
                        result.append(new_line[i])
                        i += 1
                else:
                    result.append(new_line[i])
                    i += 1
            
            new_line = ''.join(result)
            
            # Replace standalone variable references (V## not in brackets)
            def replace_var(match):
                full_match = match.group(0)
                var_num = int(match.group(1))
                
                if var_num in self.variables:
                    value = self.variables[var_num]
                    return self.format_number(value, decimal_places)
                return full_match
            
            # Replace V## references not already processed
            new_line = re.sub(r'V(\d+)', replace_var, new_line, flags=re.IGNORECASE)
            
            # Handle -V## (negative variable)
            def replace_neg_var(match):
                var_num = int(match.group(1))
                if var_num in self.variables:
                    value = -self.variables[var_num]
                    return self.format_number(value, decimal_places)
                return match.group(0)
            
            new_line = re.sub(r'-V(\d+)', replace_neg_var, new_line, flags=re.IGNORECASE)
            
            output_lines.append(new_line)
        
        return '\n'.join(output_lines)


def convert_file(input_path, output_path=None, decimal_places=4):
    """
    Convert a macro file to hardcoded values.
    
    Args:
        input_path: Path to input macro file
        output_path: Path for output (default: adds _HARDCODED suffix)
        decimal_places: Number of decimal places (default: 4)
    
    Returns:
        Tuple of (output_text, variables_dict, errors_list)
    """
    import os
    
    # Read input file
    with open(input_path, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    # Parse and convert
    parser = OkumaMacroParser()
    parser.parse_variable_definitions(content)
    output = parser.substitute_variables(content, decimal_places)
    
    # Write output if path provided
    if output_path:
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(output)
    
    return output, parser.variables, parser.errors


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python okuma_parser.py <input_file> [output_file] [decimal_places]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    decimal_places = int(sys.argv[3]) if len(sys.argv) > 3 else 4
    
    output, variables, errors = convert_file(input_file, output_file, decimal_places)
    
    print(f"Parsed {len(variables)} variables")
    if errors:
        print(f"Warnings: {len(errors)}")
        for err in errors[:5]:
            print(f"  - {err}")
    
    if output_file:
        print(f"Output written to: {output_file}")
    else:
        print("\n=== CONVERTED OUTPUT ===")
        print(output)
