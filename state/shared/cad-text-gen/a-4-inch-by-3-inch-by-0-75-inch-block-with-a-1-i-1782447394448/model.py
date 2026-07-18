import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
block_length_in = 4.0
block_width_in = 3.0
block_height_in = 0.75
pocket_depth_in = 1.0
pocket_width_in = 1.5

# Convert dimensions to millimeters
block_length = block_length_in * IN
block_width = block_width_in * IN
block_height = block_height_in * IN
pocket_depth = pocket_depth_in * IN
pocket_width = pocket_width_in * IN

# Sinker-EDM spark gap (0.003 inch total, 0.0015 inch per side)
spark_gap_per_side = 0.0015 * IN
undersized_pocket_width = pocket_width - 2 * spark_gap_per_side

# Create the block
result = cq.Workplane("XY") \
    .rect(block_length, block_width) \
    .extrude(block_height)

# Create and cut the pocket
pocket = cq.Workplane("XY", origin=(0, 0, block_height)) \
    .rect(undersized_pocket_width, pocket_depth) \
    .extrude(-block_height)

result = result.cut(pocket)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)