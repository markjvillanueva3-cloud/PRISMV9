import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
OD = 25.4 * IN  # Outer Diameter
BD = 17.78 * IN  # Bore Diameter
LENGTH = 25.4 * IN  # Length

# Bushing creation
result = (cq.Workplane("XY")
          .circle(OD / 2)
          .extrude(LENGTH)
          .faces(">Z").workplane()
          .circle(BD / 2)
          .cutThruAll())

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)