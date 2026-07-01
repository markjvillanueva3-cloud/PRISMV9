import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches
block_length = 3.0 * IN
block_width = 2.0 * IN
block_height = 0.75 * IN
pocket_depth = 1.0 * IN
pocket_width = 0.75 * IN

# Spark gap for sinker-EDM electrode (0.003 inch total, 0.0015 inch per side)
spark_gap = 0.003 * IN / 2

# Create the block
result = (
    cq.Workplane("XY")
    .rect(block_length, block_width)
    .extrude(block_height)
)

# Create the pocket with spark gap undersize
pocket = (
    cq.Workplane("XY", origin=(0, 0, block_height))
    .rect(pocket_width - spark_gap * 2, pocket_depth - spark_gap * 2)
    .extrude(-block_height)
)

# Cut the pocket from the block
result = result.cut(pocket)

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)