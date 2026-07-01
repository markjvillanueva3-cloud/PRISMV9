import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_diameter_in = 9.53 / IN
bore_diameter_in = 8.13 / IN
length_in = 52.07 / IN

# Convert dimensions to millimeters
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN

# Create the bushing
result = (cq.Workplane("XY")
          .circle(outer_diameter / 2)
          .extrude(length)
          .faces(">Z").workplane()
          .circle(bore_diameter / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)