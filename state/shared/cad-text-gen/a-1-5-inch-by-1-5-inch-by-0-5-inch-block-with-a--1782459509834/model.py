import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
block_length = 1.5 * IN
block_width = 1.5 * IN
block_height = 0.5 * IN
chamfer_size = 0.0625 * IN - SPARK_GAP / 2  # undersize for spark gap

# Create the block
result = (cq.Workplane("XY")
          .rect(block_length, block_width)
          .extrude(block_height))

# Chamfer the top edges
result = result.faces(">Z").edges("|X").chamfer(chamfer_size, angle=45)
result = result.faces(">Z").edges("|Y").chamfer(chamfer_size, angle=45)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)