# SQ2 Batch 2 Primary Candidates

Generated: 2026-03-30
Task anchor: `SQ2-0-CENSUS`
Depends on:
- `H:\PRISM\state\shared\SQ2_DESCRIPTOR_ROWS_archive_resource_pdfs_3.012-fall-2005_2026-03-30.json`
- `H:\PRISM\state\shared\SQ2_DESCRIPTOR_ROWS_box_resource_pdfs_6.046j-spring-2015_2026-03-30.json`
- `H:\PRISM\state\shared\SQ2_BATCH2_PRIMARY_CANDIDATES_2026-03-30.json`

## Purpose

This is the second concrete promotion batch for `SQ2-1`.
It narrows the second Wave B1 pair to `40` promotable primary assets:

- `20` from `archive_resource_pdfs/3.012-fall-2005`
- `20` from `box_resource_pdfs/6.046j-spring-2015`

Selection rule:

- exclude transcript and caption derivatives
- exclude image-only assets
- favor exams, assignments, problem sets, problem-set solutions, lecture notes, and core videos

## Archive 3.012 Top Cluster

The `3.012` batch is a clean materials-science and thermodynamics document queue.

Top examples:

- `f04_q1_sol_t.pdf`
- `f04_q4_sol_t.pdf`
- `f04_quiz1.pdf`
- `f04_quiz2.pdf`
- `f04_quiz2_sol.pdf`
- `f04_quiz3_sol.pdf`
- `quiz2.pdf`
- `quiz2_sol_thermo.pdf`
- `lec0_orientation.pdf`

## Box 6.046J Top Cluster

The `6.046J` batch is a strong algorithms reasoning queue centered on exams and problem-set solutions.

Top examples:

- `Solutions to Final Exam`
- `Solutions to Quiz 1`
- `Solutions to Quiz 2`
- `Final Exam`
- `Quiz 1`
- `Quiz 2`
- `Solutions to Problem Set 1`
- `Solutions to Problem Set 10`
- `Solutions to Problem Set 2`

## Operational Use

1. Treat this as the second promotion queue after Batch 1, not as a replacement for it.
2. Use the JSON batch file as the exact candidate source of truth.
3. Keep transcript and caption derivatives linked to their corresponding video descriptors instead of treating them as standalone primary assets.

## Side-Quest Position

At this point `SQ2` now has:

- census and registry baseline
- registry schema
- manufacturer dedup proof
- starter backlog
- Wave B1 bucket manifests for two bucket pairs
- per-descriptor rows for two bucket pairs
- Batch 1 and Batch 2 primary promotion queues
- handbook exposure map

The next natural `SQ2` move is either:

1. begin actual Batch 1 extraction/promotion work
2. build the handbook consumer-readiness matrix
3. continue the bucket/descriptor/batch pipeline on the next raw reservoirs
