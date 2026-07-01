# /post-diff — Compare Post-Processor Outputs

Compare NC code from different posts or versions for validation.

## Usage
```
/post-diff <file1> <file2> [--semantic] [--motion-only] [--report]
```

## Workflow

1. **Parse Both Files**
   - Load and tokenize G-code
   - Extract motion blocks
   - Identify tool operations
   - Parse comments

2. **Structural Comparison**
   - Line-by-line diff
   - Block-level changes
   - Comment differences
   - Format variations

3. **Semantic Comparison**
   - Motion path equivalence
   - Speed/feed differences
   - Tool change sequences
   - Coolant code variations

4. **Variability Impact**
   - **Compare parameter bounds**
   - Identify adaptive zone differences
   - Check safety margin variations
   - Flag envelope boundary changes

5. **Report Generation**
   - Visual diff output
   - Change summary
   - Impact assessment
   - Recommendations

## Engines Used
- GCodeDiffEngine
- GCodeParserEngine
- SemanticComparisonEngine
- VariabilityEnvelopeEngine (Phase 0.25)

## Example
```
/post-diff H:/nc/v1.nc H:/nc/v2.nc --semantic --report
```
