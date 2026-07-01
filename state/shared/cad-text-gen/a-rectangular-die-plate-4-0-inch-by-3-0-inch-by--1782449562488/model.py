import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
length = 4.0 * IN
width = 3.0 * IN
height = 1.0 * IN
slot_length = 1.5 * IN
slot_width = 0.75 * IN
spark_gap = 0.003 * IN

# Create the die plate with a through slot
result = (cq.Workplane("XY")
          .rect(length, width)
          .extrude(height)
          .faces(">Z").workplane()
          .center(0, 0)
          .rect(slot_length - spark_gap, slot_width - spark_gap)
          .cutThruAll())

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)