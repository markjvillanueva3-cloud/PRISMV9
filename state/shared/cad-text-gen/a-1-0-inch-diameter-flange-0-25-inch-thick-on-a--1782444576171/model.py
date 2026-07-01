import cadquery as cq

# Conversion constant from inches to millimeters
IN = 25.4

# Dimensions in inches, converted to mm
flange_diameter = 1.0 * IN
flange_thickness = 0.25 * IN
hub_diameter = 0.5 * IN
hub_length = 1.0 * IN

# Create the flange
result = (cq.Workplane("XY")
          .circle(flange_diameter / 2)
          .extrude(flange_thickness))

# Create the hub
hub = (cq.Workplane("XY", origin=(0, 0, -hub_length + flange_thickness))
       .circle(hub_diameter / 2)
       .extrude(hub_length))

# Combine the flange and hub
result = result.union(hub)

# Export to STEP file
import os
output_step = os.getenv('OUTPUT_STEP', 'out.step')
cq.exporters.export(result, output_step)