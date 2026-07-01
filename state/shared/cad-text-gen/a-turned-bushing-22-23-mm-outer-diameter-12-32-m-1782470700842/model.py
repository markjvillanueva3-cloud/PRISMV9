import cadquery as cq
from cadquery import exporters
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in millimeters
outer_diameter = 22.23
bore_diameter = 12.32
length = 1.88

# Undersize for sinker-EDM electrode (0.003 total spark gap)
undersize = 0.003 * IN

# Create the bushing
result = (
    cq.Workplane("XY")
    .circle((outer_diameter - undersize) / 2)
    .extrude(length)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2)
    .cutThruAll()
)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)