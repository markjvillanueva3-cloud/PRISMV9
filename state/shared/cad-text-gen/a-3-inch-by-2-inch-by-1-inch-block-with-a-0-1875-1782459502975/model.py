import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = -0.003 * IN  # Total spark gap for sinker-EDM electrode

# Dimensions in inches, converted to mm
block_length = 3 * IN
block_width = 2 * IN
block_height = 1 * IN
chamfer_size = 0.1875 * IN + SPARK_GAP / 2  # Adjusted for spark gap

# Create the block with chamfers
result = (cq.Workplane("XY")
          .rect(block_length, block_width)
          .extrude(block_height)
          .faces(">Z").edges("|X").chamfer(chamfer_size, angle=45)
          .faces(">Z").edges("|Y").chamfer(chamfer_size, angle=45))

# Export the result as STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)