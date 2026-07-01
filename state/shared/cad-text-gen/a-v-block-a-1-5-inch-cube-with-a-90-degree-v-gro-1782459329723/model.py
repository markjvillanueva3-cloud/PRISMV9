import cadquery as cq
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # total spark gap for EDM electrode

# Dimensions in inches, converted to mm
cube_size = 1.5 * IN
groove_depth = 0.5 * IN

# Undersize for EDM spark gap
effective_cube_size = cube_size - SPARK_GAP
effective_groove_depth = groove_depth - SPARK_GAP / 2

# Create the v-block
result = (cq.Workplane("XY")
          .rect(effective_cube_size, effective_cube_size)
          .extrude(effective_cube_size)
          .faces(">Z").workplane()
          .center(0, 0)
          .polyline([(effective_cube_size / 2, -effective_groove_depth),
                     (0, 0),
                     (-effective_cube_size / 2, -effective_groove_depth)])
          .close()
          .cutBlind(-effective_groove_depth))

# Export the result to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
from cadquery import exporters
exporters.export(result, OUTPUT_STEP)