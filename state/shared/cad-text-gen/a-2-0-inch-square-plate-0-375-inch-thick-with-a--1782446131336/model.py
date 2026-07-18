import cadquery as cq
from cadquery import exporters
import os

IN = 25.4

# Dimensions in inches, converted to mm
plate_size_in = 2.0 * IN
plate_thickness_in = 0.375 * IN
hole_diameter_in = 0.5 * IN
inset_distance_in = 0.375 * IN

# Undersize for sinker-EDM electrode
burning_offset_in = 0.0015 * IN
hole_diameter_undersized_in = hole_diameter_in - 2 * burning_offset_in

plate_size = plate_size_in
plate_thickness = plate_thickness_in
hole_diameter = hole_diameter_undersized_in
inset_distance = inset_distance_in

result = (cq.Workplane("XY")
          .rect(plate_size, plate_size)
          .extrude(plate_thickness)
          .faces(">Z").workplane()
          .pushPoints([(inset_distance, inset_distance),
                       (-inset_distance, inset_distance),
                       (-inset_distance, -inset_distance),
                       (inset_distance, -inset_distance)])
          .hole(hole_diameter))

OUTPUT_STEP = os.environ.get('OUTPUT_STEP', 'out.step')
exporters.export(result, OUTPUT_STEP)