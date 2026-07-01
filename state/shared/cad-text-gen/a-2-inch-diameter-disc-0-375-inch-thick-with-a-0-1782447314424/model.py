import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
disc_diameter = 2 * IN
disc_thickness = 0.375 * IN
bore_diameter = 0.75 * IN

# Sinker-EDM undersize for burning surfaces (0.003 inch total spark gap)
undersize = 0.003 * IN

# Create the disc with a central bore
result = (
    cq.Workplane("XY")
    .circle(disc_diameter / 2 - undersize / 2)  # Outer circle, undersized
    .extrude(disc_thickness)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2 + undersize / 2)  # Inner bore, oversized to account for undersize
    .cutThruAll()
)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)