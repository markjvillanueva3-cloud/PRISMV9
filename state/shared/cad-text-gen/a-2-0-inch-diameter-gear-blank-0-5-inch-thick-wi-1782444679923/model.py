import cadquery as cq

# Constants
IN = 25.4  # mm/inch

# Dimensions in inches, converted to mm
diameter = 2.0 * IN
thickness = 0.5 * IN
bore_diameter = 0.625 * IN

# Gear blank creation
result = (cq.Workplane("XY")
          .circle(diameter / 2)
          .extrude(thickness)
          .faces(">Z").workplane()
          .circle(bore_diameter / 2)
          .cutThruAll())

# Export to STEP
import os
output_path = os.getenv('OUTPUT_STEP', 'out.step')
result.exportStep(output_path)