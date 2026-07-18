# PRISM live NURBS proof v2 (slot:delta, #3 frontier).
# Loft two DISTINCT lobed closed fitted-splines (different lobe counts) so the
# kernel CANNOT fit analytic faces -> must emit free-form NURBS side surfaces.
# Fusion API internal units = CENTIMETERS. Sets `result` (JSON-returned).
result = {"stage": "start"}
try:
    doc = app.activeDocument
    design = adsk.fusion.Design.cast(
        doc.products.itemByProductType("DesignProductType"))
    if design is None:
        design = adsk.fusion.Design.cast(app.activeProduct)
    if design is None:
        raise Exception("no active Fusion Design product")
    root = design.rootComponent

    # Clear any prior scratch bodies for a clean proof.
    for b in list(root.bRepBodies):
        b.deleteMe()

    planes = root.constructionPlanes

    def lobe(rbase, amp, k, n=48):
        pts = []
        for i in range(n):
            th = 2 * math.pi * i / n
            r = rbase + amp * math.cos(k * th)
            pts.append((r * math.cos(th), r * math.sin(th)))
        return pts

    sections = [(0.0, lobe(2.0, 0.5, 3)), (3.0, lobe(2.5, 0.6, 5))]
    profiles = []
    diag = []
    for z, pts in sections:
        if z == 0.0:
            plane = root.xYConstructionPlane
        else:
            pin = planes.createInput()
            pin.setByOffset(root.xYConstructionPlane,
                            adsk.core.ValueInput.createByReal(z))
            plane = planes.add(pin)
        sk = root.sketches.add(plane)
        oc = adsk.core.ObjectCollection.create()
        for (x, y) in pts:
            oc.add(adsk.core.Point3D.create(x, y, 0))
        spl = sk.sketchCurves.sketchFittedSplines.add(oc)
        spl.isClosed = True
        diag.append("z=%.1f profiles=%d" % (z, sk.profiles.count))
        if sk.profiles.count > 0:
            profiles.append(sk.profiles.item(0))

    loftFeats = root.features.loftFeatures
    li = loftFeats.createInput(adsk.fusion.FeatureOperations.NewBodyFeatureOperation)
    for p in profiles:
        li.loftSections.add(p)
    li.isSolid = True
    loftFeats.add(li)

    result["stage"] = "lofted"
    result["section_diag"] = diag
    result["bodies"] = root.bRepBodies.count
    per_body = []
    for bi in range(root.bRepBodies.count):
        b = root.bRepBodies.item(bi)
        st = {}
        for f in b.faces:
            key = str(f.geometry.surfaceType)
            st[key] = st.get(key, 0) + 1
        per_body.append({"faces": b.faces.count,
                         "volume_cm3": round(b.volume, 4),
                         "surface_type_counts": st})
    result["per_body"] = per_body  # SurfaceTypes: 0=Plane 1=Cyl 2=Cone 7=Nurbs
except Exception as e:
    result["stage"] = "error"
    result["error"] = str(e)
