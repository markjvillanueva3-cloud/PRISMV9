import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
outer_diameter_mm = 4.27
bore_diameter_mm = 1.75
length_mm = 15.8

# Create the bushing
result = (cq.Workplane("XY")
          .circle(outer_diameter_mm / 2)
          .extrude(length_mm)
          .faces(">Z").workplane()
          .circle(bore_diameter_mm / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)