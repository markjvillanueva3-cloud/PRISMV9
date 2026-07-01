import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
block_length = 2 * IN
block_width = 2 * IN
block_height = 0.75 * IN
pocket_depth = 0.4 * IN
pocket_width = 0.75 * IN

# Sinker-EDM spark gap undersize (0.003 total, 0.0015 per side)
spark_gap_per_side = 0.0015 * IN
undersized_pocket_width = pocket_width - 2 * spark_gap_per_side

# Create the block
result = (
    cq.Workplane("XY")
    .rect(block_length, block_width)
    .extrude(block_height)
)

# Create and cut the pocket
pocket = (
    cq.Workplane("XY", origin=(0, 0, block_height))
    .rect(undersized_pocket_width, undersized_pocket_width)
    .extrude(-pocket_depth)
)

result = result.cut(pocket)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)