import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
plate_length = 2 * IN
plate_width = 2 * IN
plate_thickness = 0.5 * IN
slot_length = 1 * IN - SPARK_GAP  # undersize for EDM spark gap
slot_width = 0.25 * IN - SPARK_GAP  # undersize for EDM spark gap
slot_depth = 0.25 * IN

# Create the plate
result = (cq.Workplane("XY")
          .rect(plate_length, plate_width)
          .extrude(plate_thickness))

# Create and cut the slot
slot = (cq.Workplane("XY", origin=(0, 0, -slot_depth))
        .center(0, 0)
        .rect(slot_length, slot_width)
        .extrude(slot_depth))

result = result.cut(slot)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)