import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
plate_length = 4.0 * IN
plate_width = 3.0 * IN
plate_thickness = 0.75 * IN
slot_length = 2.0 * IN
slot_width = 0.5 * IN
slot_depth = 0.375 * IN

# Spark gap for sinker-EDM electrode
spark_gap_total = 0.003 * IN
spark_gap_per_side = spark_gap_total / 2

# Adjusted slot dimensions for EDM
adjusted_slot_length = slot_length - 2 * spark_gap_per_side
adjusted_slot_width = slot_width - 2 * spark_gap_per_side
adjusted_slot_depth = slot_depth - spark_gap_per_side

# Create the plate
result = (cq.Workplane("XY")
          .rect(plate_length, plate_width)
          .extrude(plate_thickness))

# Create and cut the slot
slot = (cq.Workplane("XY")
        .center(0, 0)
        .rect(adjusted_slot_length, adjusted_slot_width)
        .extrude(-adjusted_slot_depth))

result = result.cut(slot)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)