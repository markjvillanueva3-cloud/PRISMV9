import cadquery as cq
from cadquery import exporters
import os

# Constants for unit conversion
IN = 25.4

# Dimensions in inches, converted to mm
diameter = 0.25 * IN
length = 1.5 * IN
chamfer_size = 0.03 * IN

# Sinker-EDM undersize by 0.003 inch total spark gap (0.0015 per side)
undersize = 0.003 * IN
diameter_undersized = diameter - undersize

# Create the punch blank
result = (
    cq.Workplane("XY")
    .circle(diameter_undersized / 2)
    .extrude(length)
    .edges("|Z").chamfer(chamfer_size / 2)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)