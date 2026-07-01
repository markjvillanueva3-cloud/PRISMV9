import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch
SPARK_GAP = 0.003 * IN  # Total spark gap in mm

# Dimensions
cube_size_in = 2.0  # inches
hole_diameter_in = 0.5  # inches

# Convert dimensions to millimeters
cube_size = cube_size_in * IN
hole_diameter = hole_diameter_in * IN - SPARK_GAP  # Undersize for spark gap

# Create the cube and the hole
result = (cq.Workplane("XY")
          .rect(cube_size, cube_size)
          .extrude(cube_size)
          .faces(">Z").workplane()
          .hole(hole_diameter))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)