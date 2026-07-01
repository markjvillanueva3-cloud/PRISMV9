# JM CAM Tool Trees -- material->type->brand for Mastercam + hyperMILL

> R15 replication of the Fusion tooling tree to the other tier-1 CAM apps. Source: the PRISM
> tooling database (toolCatalogEngine), bounded to 13238 of 13238 catalog tools
> (cap MAX_TOOLS=50000); 0 tool(s) trimmed by the per-leaf cap MAX_PER_LEAF=100000.

## Organization (per-app, by FORMAT-native material handling)
- **Mastercam** `mastercam/by-type-brand/<ISO>/<type>/<brand>.mcam-tools` -- ISO->TYPE->BRAND;
  each leaf carries that ISO's material-specific SFM (mirrors the Fusion CSV tree).
- **hyperMILL** `hypermill/by-type-brand/<type>/<brand>.hmt` -- TYPE->BRAND; the .hmt Materials
  table already encodes all 6 ISO factors + the per-tool spindle/feed ceiling, so per-ISO is redundant.

## Leaves: 63 (type,brand) -> 63 .hmt + 378 .mcam-tools

| Type | Brand | Tools | hyperMILL | Mastercam (x6 ISO) |
|------|-------|------:|-----------|--------------------|
| back_draft_end_mill | Ingersoll | 5 | hypermill/by-type-brand/back-draft-end-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/back-draft-end-mill/ingersoll.mcam-tools |
| ball_mill | Helical Solutions | 2 | hypermill/by-type-brand/ball-mill/helical-solutions.hmt | mastercam/by-type-brand/<ISO>/ball-mill/helical-solutions.mcam-tools |
| ball_mill | Mitsubishi | 1 | hypermill/by-type-brand/ball-mill/mitsubishi.hmt | mastercam/by-type-brand/<ISO>/ball-mill/mitsubishi.mcam-tools |
| ball_mill | Seco | 4 | hypermill/by-type-brand/ball-mill/seco.hmt | mastercam/by-type-brand/<ISO>/ball-mill/seco.mcam-tools |
| ball_mill | Standard | 17 | hypermill/by-type-brand/ball-mill/standard.hmt | mastercam/by-type-brand/<ISO>/ball-mill/standard.mcam-tools |
| ball_mill | Sumitomo | 1 | hypermill/by-type-brand/ball-mill/sumitomo.hmt | mastercam/by-type-brand/<ISO>/ball-mill/sumitomo.mcam-tools |
| ball_mill | Tungaloy | 146 | hypermill/by-type-brand/ball-mill/tungaloy.hmt | mastercam/by-type-brand/<ISO>/ball-mill/tungaloy.mcam-tools |
| ball_mill | WIDIA | 194 | hypermill/by-type-brand/ball-mill/widia.hmt | mastercam/by-type-brand/<ISO>/ball-mill/widia.mcam-tools |
| ball_nose_end_mill | Ingersoll | 42 | hypermill/by-type-brand/ball-nose-end-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/ball-nose-end-mill/ingersoll.mcam-tools |
| boring_bar | Global CNC | 532 | hypermill/by-type-brand/boring-bar/global-cnc.hmt | mastercam/by-type-brand/<ISO>/boring-bar/global-cnc.mcam-tools |
| boring_bar | Zenit | 6 | hypermill/by-type-brand/boring-bar/zenit.hmt | mastercam/by-type-brand/<ISO>/boring-bar/zenit.mcam-tools |
| button_cutter | Ingersoll | 30 | hypermill/by-type-brand/button-cutter/ingersoll.hmt | mastercam/by-type-brand/<ISO>/button-cutter/ingersoll.mcam-tools |
| chamfer_mill | Ingersoll | 42 | hypermill/by-type-brand/chamfer-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/chamfer-mill/ingersoll.mcam-tools |
| drill | Dormer Pramet | 266 | hypermill/by-type-brand/drill/dormer-pramet.hmt | mastercam/by-type-brand/<ISO>/drill/dormer-pramet.mcam-tools |
| drill | Guhring | 12 | hypermill/by-type-brand/drill/guhring.hmt | mastercam/by-type-brand/<ISO>/drill/guhring.mcam-tools |
| drill | ISCAR | 7 | hypermill/by-type-brand/drill/iscar.hmt | mastercam/by-type-brand/<ISO>/drill/iscar.mcam-tools |
| drill | Mitsubishi | 1080 | hypermill/by-type-brand/drill/mitsubishi.hmt | mastercam/by-type-brand/<ISO>/drill/mitsubishi.mcam-tools |
| drill | OSG | 11 | hypermill/by-type-brand/drill/osg.hmt | mastercam/by-type-brand/<ISO>/drill/osg.mcam-tools |
| drill | Sandvik | 9 | hypermill/by-type-brand/drill/sandvik.hmt | mastercam/by-type-brand/<ISO>/drill/sandvik.mcam-tools |
| drill | Standard | 27 | hypermill/by-type-brand/drill/standard.hmt | mastercam/by-type-brand/<ISO>/drill/standard.mcam-tools |
| drill | Sumitomo | 5 | hypermill/by-type-brand/drill/sumitomo.hmt | mastercam/by-type-brand/<ISO>/drill/sumitomo.mcam-tools |
| drill | Tungaloy | 835 | hypermill/by-type-brand/drill/tungaloy.hmt | mastercam/by-type-brand/<ISO>/drill/tungaloy.mcam-tools |
| drill | WIDIA | 918 | hypermill/by-type-brand/drill/widia.hmt | mastercam/by-type-brand/<ISO>/drill/widia.mcam-tools |
| drill | Walter | 1 | hypermill/by-type-brand/drill/walter.hmt | mastercam/by-type-brand/<ISO>/drill/walter.mcam-tools |
| drill | YG-1 | 2 | hypermill/by-type-brand/drill/yg-1.hmt | mastercam/by-type-brand/<ISO>/drill/yg-1.mcam-tools |
| end_mill | Global CNC | 303 | hypermill/by-type-brand/end-mill/global-cnc.hmt | mastercam/by-type-brand/<ISO>/end-mill/global-cnc.mcam-tools |
| end_mill | Helical Solutions | 6 | hypermill/by-type-brand/end-mill/helical-solutions.hmt | mastercam/by-type-brand/<ISO>/end-mill/helical-solutions.mcam-tools |
| end_mill | Horn | 143 | hypermill/by-type-brand/end-mill/horn.hmt | mastercam/by-type-brand/<ISO>/end-mill/horn.mcam-tools |
| end_mill | ISCAR | 13 | hypermill/by-type-brand/end-mill/iscar.hmt | mastercam/by-type-brand/<ISO>/end-mill/iscar.mcam-tools |
| end_mill | Ingersoll | 829 | hypermill/by-type-brand/end-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/end-mill/ingersoll.mcam-tools |
| end_mill | Kennametal | 3 | hypermill/by-type-brand/end-mill/kennametal.hmt | mastercam/by-type-brand/<ISO>/end-mill/kennametal.mcam-tools |
| end_mill | Korloy | 2 | hypermill/by-type-brand/end-mill/korloy.hmt | mastercam/by-type-brand/<ISO>/end-mill/korloy.mcam-tools |
| end_mill | Mitsubishi | 145 | hypermill/by-type-brand/end-mill/mitsubishi.hmt | mastercam/by-type-brand/<ISO>/end-mill/mitsubishi.mcam-tools |
| end_mill | Niagara | 173 | hypermill/by-type-brand/end-mill/niagara.hmt | mastercam/by-type-brand/<ISO>/end-mill/niagara.mcam-tools |
| end_mill | OSG | 3 | hypermill/by-type-brand/end-mill/osg.hmt | mastercam/by-type-brand/<ISO>/end-mill/osg.mcam-tools |
| end_mill | SGS | 16 | hypermill/by-type-brand/end-mill/sgs.hmt | mastercam/by-type-brand/<ISO>/end-mill/sgs.mcam-tools |
| end_mill | Sandvik | 6 | hypermill/by-type-brand/end-mill/sandvik.hmt | mastercam/by-type-brand/<ISO>/end-mill/sandvik.mcam-tools |
| end_mill | Seco | 1220 | hypermill/by-type-brand/end-mill/seco.hmt | mastercam/by-type-brand/<ISO>/end-mill/seco.mcam-tools |
| end_mill | Standard | 102 | hypermill/by-type-brand/end-mill/standard.hmt | mastercam/by-type-brand/<ISO>/end-mill/standard.mcam-tools |
| end_mill | Sumitomo | 3 | hypermill/by-type-brand/end-mill/sumitomo.hmt | mastercam/by-type-brand/<ISO>/end-mill/sumitomo.mcam-tools |
| end_mill | Tungaloy | 657 | hypermill/by-type-brand/end-mill/tungaloy.hmt | mastercam/by-type-brand/<ISO>/end-mill/tungaloy.mcam-tools |
| end_mill | WIDIA | 1043 | hypermill/by-type-brand/end-mill/widia.hmt | mastercam/by-type-brand/<ISO>/end-mill/widia.mcam-tools |
| end_mill | YG-1 | 3 | hypermill/by-type-brand/end-mill/yg-1.hmt | mastercam/by-type-brand/<ISO>/end-mill/yg-1.mcam-tools |
| end_mill | Zenit | 193 | hypermill/by-type-brand/end-mill/zenit.hmt | mastercam/by-type-brand/<ISO>/end-mill/zenit.mcam-tools |
| face_mill | ISCAR | 4 | hypermill/by-type-brand/face-mill/iscar.hmt | mastercam/by-type-brand/<ISO>/face-mill/iscar.mcam-tools |
| face_mill | Ingersoll | 156 | hypermill/by-type-brand/face-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/face-mill/ingersoll.mcam-tools |
| face_mill | Standard | 4 | hypermill/by-type-brand/face-mill/standard.hmt | mastercam/by-type-brand/<ISO>/face-mill/standard.mcam-tools |
| face_mill | WIDIA | 815 | hypermill/by-type-brand/face-mill/widia.hmt | mastercam/by-type-brand/<ISO>/face-mill/widia.mcam-tools |
| grooving_tool | ISCAR | 5 | hypermill/by-type-brand/grooving-tool/iscar.hmt | mastercam/by-type-brand/<ISO>/grooving-tool/iscar.mcam-tools |
| grooving_tool | WIDIA | 280 | hypermill/by-type-brand/grooving-tool/widia.hmt | mastercam/by-type-brand/<ISO>/grooving-tool/widia.mcam-tools |
| grooving_tool | Zenit | 12 | hypermill/by-type-brand/grooving-tool/zenit.hmt | mastercam/by-type-brand/<ISO>/grooving-tool/zenit.mcam-tools |
| high_speed_router | Ingersoll | 34 | hypermill/by-type-brand/high-speed-router/ingersoll.hmt | mastercam/by-type-brand/<ISO>/high-speed-router/ingersoll.mcam-tools |
| insert | Ingersoll | 1052 | hypermill/by-type-brand/insert/ingersoll.hmt | mastercam/by-type-brand/<ISO>/insert/ingersoll.mcam-tools |
| insert | Mitsubishi | 208 | hypermill/by-type-brand/insert/mitsubishi.hmt | mastercam/by-type-brand/<ISO>/insert/mitsubishi.mcam-tools |
| profile_mill | Ingersoll | 29 | hypermill/by-type-brand/profile-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/profile-mill/ingersoll.mcam-tools |
| slotting_mill | Ingersoll | 42 | hypermill/by-type-brand/slotting-mill/ingersoll.hmt | mastercam/by-type-brand/<ISO>/slotting-mill/ingersoll.mcam-tools |
| threading_tool | WIDIA | 65 | hypermill/by-type-brand/threading-tool/widia.hmt | mastercam/by-type-brand/<ISO>/threading-tool/widia.mcam-tools |
| turning_tool | Global CNC | 299 | hypermill/by-type-brand/turning-tool/global-cnc.hmt | mastercam/by-type-brand/<ISO>/turning-tool/global-cnc.mcam-tools |
| turning_tool | ISCAR | 11 | hypermill/by-type-brand/turning-tool/iscar.hmt | mastercam/by-type-brand/<ISO>/turning-tool/iscar.mcam-tools |
| turning_tool | Ingersoll | 908 | hypermill/by-type-brand/turning-tool/ingersoll.hmt | mastercam/by-type-brand/<ISO>/turning-tool/ingersoll.mcam-tools |
| turning_tool | Korloy | 16 | hypermill/by-type-brand/turning-tool/korloy.hmt | mastercam/by-type-brand/<ISO>/turning-tool/korloy.mcam-tools |
| turning_tool | Mitsubishi | 16 | hypermill/by-type-brand/turning-tool/mitsubishi.hmt | mastercam/by-type-brand/<ISO>/turning-tool/mitsubishi.mcam-tools |
| turning_tool | WIDIA | 224 | hypermill/by-type-brand/turning-tool/widia.hmt | mastercam/by-type-brand/<ISO>/turning-tool/widia.mcam-tools |
