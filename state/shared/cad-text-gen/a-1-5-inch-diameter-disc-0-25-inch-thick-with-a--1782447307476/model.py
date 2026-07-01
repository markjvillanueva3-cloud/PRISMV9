import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
disc_diameter = 1.5 * IN
disc_thickness = 0.25 * IN
bore_diameter = 0.5 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the disc with a central bore
result = (
    cq.Workplane("XY")
    .circle(disc_diameter / 2 - undersize / 2)  # Undersize for EDM
    .extrude(disc_thickness)
    .faces(">Z").workplane()
    .hole(bore_diameter - undersize)  # Undersize for EDM
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)