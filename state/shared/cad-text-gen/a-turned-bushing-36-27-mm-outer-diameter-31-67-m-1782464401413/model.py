import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4

# Dimensions in inches
outer_diameter_in = 36.27 / IN
bore_diameter_in = 31.67 / IN
length_in = 165.1 / IN

# Convert to mm
outer_diameter = outer_diameter_in * IN
bore_diameter = bore_diameter_in * IN
length = length_in * IN

# Sinker-EDM undersize (0.003 total spark gap)
undersize = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle(outer_diameter / 2 - undersize)
    .extrude(length)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2 + undersize)
    .cutThruAll()
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)