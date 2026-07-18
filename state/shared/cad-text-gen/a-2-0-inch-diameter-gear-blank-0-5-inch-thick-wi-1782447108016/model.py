import cadquery as cq
from cadquery import exporters
import os

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
diameter = 2.0 * IN
thickness = 0.5 * IN
bore_diameter = 0.625 * IN

# Sinker EDM undersize (0.003 inch total spark gap)
undersize = 0.003 * IN

# Gear blank creation
result = (
    cq.Workplane("XY")
    .circle((diameter - undersize) / 2)
    .extrude(thickness)
    .faces(">Z").workplane()
    .circle(bore_diameter / 2)
    .cutThruAll()
)

# Export to STEP
OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)