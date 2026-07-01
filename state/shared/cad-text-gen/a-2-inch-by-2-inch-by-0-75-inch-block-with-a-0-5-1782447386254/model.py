import cadquery as cq
import os

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
block_length = 2 * IN
block_width = 2 * IN
block_height = 0.75 * IN
pocket_depth = 0.5 * IN
pocket_width = 0.75 * IN

# Spark gap for sinker-EDM electrode (total 0.003 inch, 0.0015 per side)
spark_gap = 0.0015 * IN

# Create the block
result = cq.Workplane("XY") \
    .rect(block_length, block_width) \
    .extrude(block_height)

# Create the pocket with spark gap undersize
pocket = cq.Workplane("XY") \
    .center(0, 0) \
    .rect(pocket_width - 2 * spark_gap, pocket_width - 2 * spark_gap) \
    .extrude(-pocket_depth)

# Cut the pocket from the block
result = result.cut(pocket)

# Export the result as a STEP file
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)