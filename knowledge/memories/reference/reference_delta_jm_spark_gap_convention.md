---
name: reference-delta-jm-spark-gap-convention
description: "JM Die sinker-EDM electrode spark gap convention is -.003 inch total (-.0015/side). Apply to electrode geometry so the burned cavity matches print nominal after spark erosion."
type: reference
slot: delta
source: prism-memory
synced: 2026-06-09T14:54:09.085Z
aliases: reference_delta_jm_spark_gap_convention
---


# JM Die sinker-EDM spark gap convention (delta)

For sinker-EDM electrodes (the electrode burns the cavity into the die), JM Die's spark gap convention is **−.003" total = −.0015"/side**.

The electrode must be undersized by the spark gap so that after spark erosion the burned cavity matches the print nominal. Bake this offset into the generated electrode geometry, not into a downstream step. Applied in delta's EJOT P30247750 electrode generator.

Domain: CAD electrode generation → kilo consumes for the sinker-EDM CAM program (orbit/gap-voltage/down-feed). See [[reference_ejot_p30247750_exact_dims_2026_05_27]] · wiki [[cad-electrode-generation]].
