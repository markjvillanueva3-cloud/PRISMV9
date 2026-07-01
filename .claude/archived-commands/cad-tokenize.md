# CAD Tokenize — Neural tokenization for CAD programs

Tokenize or detokenize CAD programs across 7 supported CAD formats using
`CADTokenRepresentationEngine` (CADCAM-DAGI-MS0/U-DAGI01). Produces a
deterministic integer token sequence suitable for transformer models
(DeepCAD / SkexGen style) or decodes a sequence back to structured ops.

## Usage
- `/cad-tokenize tokenize <file-path>` — read file, auto-detect format, tokenize
- `/cad-tokenize tokenize --format=cadquery <path>` — explicit format
- `/cad-tokenize detokenize --target=cadquery 1,2,3,...` — decode id list
- `/cad-tokenize vocab` — print vocabulary stats (size, specials, categories)
- `/cad-tokenize coverage <path>` — report coverage % for the JM Die corpus

## Supported Formats
`cadquery` · `freecad` · `fusion360` · `mastercam` · `inventor` · `hypermill` ·
`solidcam` · `structured` (pre-parsed op arrays).

## Steps
1. Parse `$ARGUMENTS` to extract subcommand (tokenize | detokenize | vocab | coverage).
2. For `tokenize`:
   a. Resolve source format (flag, extension, or auto-detect).
   b. Call `prism_cad:tokenize` with `{ program, source_format }`.
   c. Return `{ tokens[], specials: [BOS,...,EOS], coverage, sourceFormat, length }`.
3. For `detokenize`:
   a. Parse comma- or whitespace-separated id list from `$ARGUMENTS`.
   b. Call `prism_cad:detokenize` with `{ tokens, target_format }`.
4. For `vocab`:
   a. Import `cadTokenRepresentationEngine` directly.
   b. Report `vocabularySize()`, special ids, category breakdown.
5. For `coverage`:
   a. Tokenize, compute `coverageOf(program)`, emit pct + missing-op report.

## Invariants
- Token id 0..5 reserved for specials (PAD, BOS, EOS, SEP, MASK, UNK).
- Round-trip identity: `detokenize(tokenize(p)) ≡ p` for the structured format.
- Coverage goal on JM Die synthetic corpus ≥ 95 %.

## Output Format
```
TOKENIZE: <path> (<format>)
  tokens: <n> ids
  coverage: <pct>%
  preview: [BOS, <op>, <op>, ..., EOS]
  round_trip_ok: true|false
```

## Related
- Engine: `src/engines/CADTokenRepresentationEngine.ts`
- Vocabulary: `src/data/cad-token-vocabulary.json`
- Tests: `src/__tests__/CADTokenRepresentationEngine.test.ts`
- Hook: `.claude/hooks/cad-token-vocabulary-guard.mjs`
- Actions: `prism_cad:tokenize`, `prism_cad:detokenize`
