import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
block_length = 4 * IN
block_width = 3 * IN
block_height = 1.5 * IN
pocket_depth = 0.75 * IN
pocket_width = 1.5 * IN

# Spark gap for sinker-EDM electrode (undersize by 0.003 inch total)
spark_gap_total = 0.003 * IN
spark_gap_per_side = spark_gap_total / 2

# Create the block
result = cq.Workplane("XY") \
    .rect(block_length, block_width) \
    .extrude(block_height)

# Create the pocket with undersized dimensions for EDM
pocket_length_undersized = pocket_width - 2 * spark_gap_per_side
pocket_width_undersized = pocket_width - 2 * spark_gap_per_side

# Cut the pocket
result = result.faces(">Z").workplane() \
    .center(0, 0) \
    .rect(pocket_length_undersized, pocket_width_undersized) \
    .cutBlind(-pocket_depth)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)