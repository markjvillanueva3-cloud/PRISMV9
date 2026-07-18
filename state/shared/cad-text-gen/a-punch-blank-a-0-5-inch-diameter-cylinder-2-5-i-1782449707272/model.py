import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
diameter = 0.5 * IN
length = 2.5 * IN
chamfer_size = 0.03 * IN

# Chamfer undersize for sinker-EDM electrode (0.003 total spark gap)
chamfer_undersize = 0.0015 * IN
effective_chamfer_size = chamfer_size - chamfer_undersize

# Create the punch blank
result = (
    cq.Workplane("XY")
    .circle(diameter / 2)
    .extrude(length)
    .edges("|Z").chamfer(effective_chamfer_size)
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)