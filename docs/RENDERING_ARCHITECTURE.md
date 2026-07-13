# WebGPU Rendering Architecture

## RendererFactory
Attempts to initialize `THREE.WebGPURenderer`. If it fails (due to unsupported browser/hardware), it falls back to `THREE.WebGLRenderer`.

## Snapshot Interpolation
The simulation outputs discrete snapshots at 120Hz.
The `RendererHost` interpolates between the `previous` and `current` snapshots using the alpha factor `accumulator / dt` to smoothly position 3D visuals.
