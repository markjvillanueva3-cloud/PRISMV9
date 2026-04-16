# SQ2 Batch 1 Primary Candidates

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Depends on:
- `H:\PRISM\state\shared\SQ2_DESCRIPTOR_ROWS_archive_resource_pdfs_18.03-spring-2010_2026-03-30.json`
- `H:\PRISM\state\shared\SQ2_DESCRIPTOR_ROWS_box_resource_pdfs_6.006-spring-2020_2026-03-30.json`
- `H:\PRISM\state\shared\SQ2_BATCH1_PRIMARY_CANDIDATES_2026-03-30.json`

## Purpose

This is the first concrete promotion batch for `SQ2-1`.
It narrows the first two Wave B1 buckets to `40` promotable primary assets:

- `20` from `archive_resource_pdfs/18.03-spring-2010`
- `20` from `box_resource_pdfs/6.006-spring-2020`

Selection rule:

- exclude transcript and caption derivatives
- exclude image-only assets
- favor exams, exam solutions, problem sets, problem-set solutions, lecture notes, and high-value videos

## Archive 18.03 Top Cluster

The archive `18.03` candidates skew heavily toward exam and problem-set coverage, which makes them a strong first pass for mathematical methods knowledge.

Top examples:

- `MIT18_03S10_ex1s.pdf`
- `MIT18_03S10_ex2s.pdf`
- `MIT18_03S10_ex3s.pdf`
- `MIT18_03S10_ex1.pdf`
- `MIT18_03S10_ex2.pdf`
- `MIT18_03S10_ex3.pdf`
- `MIT18_03S10_final.pdf`
- `MIT18_03S10_ps1s.pdf`
- `MIT18_03S10_ps2s.pdf`

## Box 6.006 Top Cluster

The Box `6.006` candidates skew toward final, quiz, and quiz-review material with solutions, which is strong for algorithmic reasoning and assessment-style extraction.

Top examples:

- `Final Exam Solutions`
- `Quiz 1 Review Solutions`
- `Quiz 1 Solutions`
- `Quiz 2 Review Solutions`
- `Quiz 2 Solutions`
- `Quiz 3 Review Solutions`
- `Quiz 3 Solutions`
- `Final Exam`
- `Quiz 1`
- `Quiz 2`

## Operational Use

1. Treat this as the first `SQ2-1` promotion queue, not just another inventory list.
2. Pull content only from the primary asset rows in the JSON batch file.
3. Preserve transcript and caption derivatives as linkage metadata around the associated video rows rather than ingesting them as standalone primary knowledge objects.

## Recommended Side-Quest Continuation

1. Promote the `40` primary assets in `SQ2_BATCH1_PRIMARY_CANDIDATES_2026-03-30.json`
2. Build the handbook consumer-readiness matrix from `SQ2_MACHINE_HANDBOOK_EXPOSURE_MAP_2026-03-30.md`
3. Repeat the same descriptor-row and batch-candidate pattern for:
   - `archive_resource_pdfs/3.012-fall-2005`
   - `box_resource_pdfs/6.046j-spring-2015`
