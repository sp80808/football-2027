# WASM Simulation Architecture

## Isolation
The core football logic is compiled from Rust to WASM using `wasm-pack`. 
The module runs inside a Web Worker. 

## Communication
Communication is via `postMessage`. `SharedArrayBuffer` is the preferred way to share snapshot buffers if cross-origin isolation allows, otherwise standard `ArrayBuffer` transfer is used.
For now, we use a simple message-passing or typed-array transfer.

## Fixed Timestep
The 120Hz fixed timestep update is driven inside the WASM core or the worker wrapper, ensuring deterministic updates independent of main thread stutters.
