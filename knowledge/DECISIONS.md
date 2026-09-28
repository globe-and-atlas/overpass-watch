# Decisions

## Initial Decision

- Template profile: `workflow-python`
- Deploy target: `local-only`
- Runtime: `python`

## 2026-09-28 Regional map
Use bundled public-domain Natural Earth 1:110m land outlines, projected on the phone, with a fixed 800 x 500 km north-up watch view. The observer is the prediction location, not continuously tracked GPS. Use orbit-derived local tangent through closest approach and nominal swath width; do not imply exact acquired imagery footprint. Keep a compact polygon/track payload in the existing prediction message to make selection instant and cache coherence straightforward. Live raster tiles were rejected for transfer size and additional network dependence. Projection above 80 degrees latitude is explicitly unavailable.
