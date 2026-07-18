import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
outer_diameter_in = 25.4 / IN  # 1 inch
bore_diameter_in = 11.15 / IN  # 0.439 inch
length_in = 38.1 / IN  # 1.5 inch

# Convert to mm
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN

# Sinker EDM undersize (0.003 total spark gap)
undersize = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2 - undersize / 2)
    .extrude(length)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2 + undersize / 2)
    .cutThruAll()
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)