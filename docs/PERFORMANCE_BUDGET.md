# Performance Budget

## Simulation
- Target: 120Hz fixed timestep.
- Tick Time: < 1ms average, < 2ms worst-case.
- GC: No per-tick allocation or JSON serialization.

## Rendering
- Target: 60 FPS (aspirational 120 FPS).
- Polygons: TBD, keep low-poly for prototype.
- Draw Calls: < 100 per frame if possible using instancing and merged geometries.
