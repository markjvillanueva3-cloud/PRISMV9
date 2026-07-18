import cadquery as cq
from cadquery import exporters
import os

# Constants for unit conversion
IN = 25.4

# Dimensions in inches, converted to mm
diameter = 0.375 * IN
length = 2 * IN
chamfer_size = 0.03 * IN

# Chamfer undersize for sinker-EDM electrode
burning_undersize = 0.003 * IN
effective_diameter = diameter - burning_undersize

# Create the punch blank with chamfers
result = (cq.Workplane("XY")
          .circle(effective_diameter / 2)
          .extrude(length)
          .edges("|Z").chamfer(chamfer_size))

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)