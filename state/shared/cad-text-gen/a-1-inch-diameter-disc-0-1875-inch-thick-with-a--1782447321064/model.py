import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
disc_diameter = 1 * IN
disc_thickness = 0.1875 * IN
bore_diameter = 0.375 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize = 2 * 0.0015 * IN

# Create the disc with a central bore
result = (
    cq.Workplane("XY")
    .circle(disc_diameter / 2 - undersize)
    .extrude(disc_thickness)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2 + undersize)
    .cutThruAll()
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)