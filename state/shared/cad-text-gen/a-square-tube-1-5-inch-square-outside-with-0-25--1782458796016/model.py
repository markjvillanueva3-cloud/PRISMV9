import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches
outer_square_side = 1.5 * IN
wall_thickness = 0.25 * IN
length = 3 * IN

# Sinker-EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN / 2

# Calculate inner square side after undersizing for sinker-EDM
inner_square_side = outer_square_side - 2 * (wall_thickness + undersize)

# Create the outer and inner squares
result = (
    cq.Workplane("XY")
    .rect(outer_square_side, outer_square_side)
    .extrude(length)
    .cut(
        cq.Workplane("XY", origin=(0, 0, length / 2))
        .rect(inner_square_side, inner_square_side)
        .extrude(-length)
    )
)

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)