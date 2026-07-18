import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
flats_across = 0.375 * IN
length = 1.0 * IN
hole_diameter = 0.190 * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 2 * 0.0015 * IN

# Adjusted dimensions for sinker EDM
adjusted_hole_diameter = hole_diameter - undersize

# Create the hex standoff
result = (
    cq.Workplane("XY")
    .polygon(6, flats_across)
    .extrude(length)
    .faces(">Z").workplane()
    .hole(adjusted_hole_diameter)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)